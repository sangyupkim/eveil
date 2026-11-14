import { bagSize } from '../game/inventory.js';
import { ZONES as ALL_ZONES } from '../data/world.js';
import { DUNGEON_X, entranceOf, MAX_STAGE, stageMods, dungeonLevel, layout as dungeonLayout, cellPos, N } from '../data/dungeons.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { gemGradeFor } from '../data/legends.js';
export const TIER_NAMES = ['평온', '악몽', '지옥'];
import { TITLE_AT, titleKey, titleName, perkChoices, UNIQUES } from '../data/titles.js';
// 게임 월드: 플레이어 조작 · 몬스터 AI · 전투 · 스킬 · 드랍 · 사망 · 자동 사냥
import * as THREE from 'three';
import { CONFIG, TIERS, AP_TABLE } from '../data/config.js';
import { SKILLS } from '../data/skills.js';
import { BASES, WEAPON_CLASSES, RARITY_ORDER } from '../data/items.js';
import { MONSTERS, ZONES, TOWN } from '../data/world.js';
import { derive, damageReduction, totalStats } from '../game/player.js';
import { ELIXIRS, ELIXIR_TIME } from '../data/potions.js';
import { addAP, gainExp, rewardFactor } from '../game/growth.js';
import { addSkillExp, skillValues, skillEff, modsOf, meetsReq, canLearn, learn, bookAbsorbExp } from '../game/skills.js';
import { rollLoot, rollDeathDrop } from '../game/loot.js';
import { dropMats, liberateAdd } from '../game/town.js';
import { dailyProgress, dailyReward, dailyText, dayKey, dailyOf } from '../game/daily.js';
import { MATERIALS } from '../data/crafting.js';
import { addItem, takeOne, countOf, equip as equipItem, unequip as unequipItem } from '../game/inventory.js';
import { itemName, itemColor, isBook, makeItem, makeBook, rollBase, itemValue } from '../game/items.js';
import { seeded, randInt, randRange } from '../game/rng.js';
import { Actor, makeHero } from '../engine2d/actor.js';
import { FX, drawPowerFrame } from '../engine2d/fx.js';
import { resolveCollision, zoneAt, clearLine, findPath, blockedAt, LAKES, MESAS, CAMPS, inCamp, bossSpot } from '../engine2d/stage.js';
import { reveal, saveFog, loadFog } from '../ui/mapimg.js';
import { DATA, image, animImage, drawRect, frameIndex } from '../engine2d/sprites.js';
import { MONSTER_LOOK, ITEM_LOOK, LOOT_LOOK } from '../data/flareWorld.js';
import { PLOTS, BUILDINGS, VAULT_SPOT } from '../data/buildings.js';
import { townOf, tick as townTick, researchK, researchTick, researchLv } from '../game/town.js';
import { RESEARCH, LEVEL_DECOR } from '../data/buildings.js';
import { audio, familyOf } from '../engine/audio.js';
const sfx = (n, k, fam) => audio.play(n, k, fam);

const ACTIVE_RADIUS = 58;
// 후딜(초): 공격 뒤 · 스킬 뒤 다음 행동까지
const RECOVER = { attack: 0.42, skill: 0.55 };
const SPAWN_NEAR = 72;   // 이 안의 자리에만 몬스터를 만든다
const DESPAWN_FAR = 92;  // 이보다 멀어진 한가한 몬스터는 치운다 (다시 오면 새로 만든다)
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// 보스 전용 패턴 (보스끼리 겹치지 않는다)
const BOSS_SIG = { // 첫째 = 그 보스만 쓰는 패턴, 둘째 = 결이 맞는 다른 패턴 하나 (조합은 모두 다르다)
  mushking: ['sporering', 'webtrail'], orc: ['tricharge', 'fissure'], skel_mage: ['bonespiral', 'grid'], dragon: ['breath', 'meteors'],
  bog_witch: ['mines', 'sporering'], bog_king: ['tongue', 'quakerings'], frost_stag: ['icelines', 'tricharge'], yeti_king: ['avalanche', 'boulder'],
  apato: ['quakerings', 'tailsweep'], trex: ['tailsweep', 'tricharge'], flame_lord: ['meteors', 'fissure'], orc_warlord: ['cross', 'tricharge'],
  troll_king: ['boulder', 'quakerings'], brood_mother: ['webtrail', 'mines'], spider_queen: ['xcross', 'webtrail'], high_mage: ['grid', 'bonespiral'],
  ghost_captain: ['cannons', 'cross'], pit_lord: ['fissure', 'meteors'], arch_demon: ['hellnova', 'xcross'],
};
// 멀리 있는 플레이어를 노리는 패턴 (보스마다 둘)
const FAR = ['leap', 'snipe', 'fan', 'hail', 'pull'];
const farOf = (id) => { let h = 0; for (const c of id || '') h = (h * 31 + c.charCodeAt(0)) >>> 0; const i = h % FAR.length; return [FAR[i], FAR[(i + 1 + (h >> 4) % (FAR.length - 1)) % FAR.length]]; };

// 세계 단계 배율 (레벨 보정 위에 더): 악몽 · 지옥은 몬스터가 확실히 더 세다
const TIER_K = { 1: { hp: 1, dmg: 1, pat: 1 }, 2: { hp: 1.8, dmg: 1.45, pat: 1.25 }, 3: { hp: 3, dmg: 2, pat: 1.5 } };

export class World {
  constructor(stage, st, ui) {
    this.stage = stage;
    this.scene = stage;
    this.st = st;
    this.ui = ui;
    this.fx = new FX(stage, ui.fxLayer);
    // 고정한 타겟 발밑 표시
    stage.groundLayers.push((ctx, st) => {
      const t = this.target && !this.target.dead ? this.target : this.locked && !this.locked.dead ? this.locked : null;
      if (!t || !st.onScreen(t.pos.x, t.pos.z, 3)) return;
      const p = st.toScreen(t.pos.x, t.pos.z), k = st.scale() * t.actor.scale, a = 0.6 + Math.sin(this.time * 6) * 0.25;
      // 도형 고리 대신 붉은 룬 그림
      drawPowerFrame(ctx, st, 'runes', t.pos.x, t.pos.z, { scale: 0.55 * t.actor.scale, tint: this.target === t ? 0xff5a3c : 0xffc878, t: this.time, alpha: a });
    });
    this.fx.onShake = (k) => { if (this.st.settings.shake !== false) stage.shake(k); };
    this.timers = [];
    this.monsters = [];
    this.ground = [];
    this.spawners = [];
    this.time = 0;
    this.nextGid = 1;
    this.auto = false;
    this.autoPause = 0;
    this.autoThink = 0;
    this.cds = {};
    this.buffs = {};
    this.potionCd = 0;
    this.atkCd = 0;
    this.actCd = 0;   // 후딜: 공격 · 스킬 뒤 다음 행동까지
    this.swing = 0;
    this.target = null;
    this.moveTo = null;
    this.joy = new THREE.Vector2();
    this.pendingSkill = null;
    this.recallT = 0;
    this.dead = false;
    this.zone = null;
    this.makePlayer();
    this.makeNpc();
    this.makeSpawners();
    this.restoreGround();
    this.townDraw = [];
    this.refreshTown();
    this.makeChests();
    this.makePet();
    loadFog(this.st);
    this.refreshCamps();
    // 자리를 비운 동안 쌓인 것 알려 주기
    const away = townTick(st);
    if (away > 0.05 && Object.keys(townOf(st).plots).length) setTimeout(() => this.ui.log(`자리를 비운 ${away >= 1 ? Math.floor(away) + '시간' : Math.round(away * 60) + '분'} 동안 마을이 일했습니다`, '#ffd84a'), 500);
  }

  // 마을 건물 그리기 (빈터는 팻말 + 바닥 표시)
  refreshTown() {
    for (const d of this.townDraw) this.stage.remove(d);
    this.townDraw = [];
    this.workerSig = null; setTimeout(() => this.syncWorkers(), 0);
    // 건물 부딪힘 판정도 다시 깐다
    const C = this.stage.colliders;
    for (const c of this.townCols || []) { const i = C.indexOf(c); if (i >= 0) C.splice(i, 1); }
    this.townCols = [];
    const col = (x, z, r) => { const c = { x, z, r }; C.push(c); this.townCols.push(c); };
    const t = townOf(this.st);
    const tile = (set, id, x, z) => {
      const def = DATA.tiles[set], tt = def?.tiles[id];
      if (!tt) return;
      image(def.imgs[tt[0]]);
      const d = { z, draw: (ctx, st) => { const src = image(def.imgs[tt[0]]); if (!src.ok || !st.onScreen(x, z, 6)) return; const p = st.toScreen(x, z); drawRect(ctx, src.im, tt.slice(1), p.x, p.y, st.scale()); } };
      this.stage.add(d); this.townDraw.push(d);
    };
    // 큰 그림 하나를 집터 가운데에 (기준점 보정 ax · az, 크기 k, 색 필터)
    let cur = null;
    const big = (set, id, dx, dz, k, ox, oz, filter, r = 4.2) => {
      const x = cur.x + dx, z = cur.z + dz;
      const def = DATA.tiles[set], tt = def.tiles[id];
      if (!tt) return;
      image(def.imgs[tt[0]]);
      const d = { z: z + 2 * k, draw: (ctx, stg) => { const src = image(def.imgs[tt[0]]); if (!src.ok || !stg.onScreen(x, z, 8)) return; const p = stg.toScreen(x + ox * k, z + oz * k);
        if (filter) { ctx.save(); ctx.filter = filter; } drawRect(ctx, src.im, tt.slice(1), p.x, p.y, stg.scale() * k); if (filter) ctx.restore(); } };
      this.stage.add(d); this.townDraw.push(d);
      for (let u = -r; u <= r; u += 1.2) for (let v = -r; v <= r; v += 1.2) if (Math.abs(u) + Math.abs(v) <= r) col(x + u, z + v, 0.8);
    };
    // 통나무집: Flare 오두막은 화면 세로 띠 네 장으로 잘려 있다. 띠 기준점(px)을 이음매 색이 맞는 자리로 잇는다
    // A = 창문 집(208 · 209 · 210 · 211), B = 문 집(212 · 213 · 214 · 215). 1 세계 칸 = 가로 64px · 세로 32px
    const CABIN = { A: [[208, 0, 0], [209, 96, 48], [210, 192, 0], [211, 288, -48]], B: [[212, 0, 0], [213, 96, 48], [214, 192, 96], [215, 288, 48]] };
    const cabin = (kind, dx, dz, filter) => {
      const def = DATA.tiles.grassland, cx = 146 / 64, cz = kind === 'B' ? 1.5 : 0;
      for (const [id, px, py] of CABIN[kind]) {
        const tt = def.tiles[id]; if (!tt) continue;
        image(def.imgs[tt[0]]);
        const x = cur.x + dx + px / 64 - cx, z = cur.z + dz + py / 32 - cz;
        const d = { z: cur.z + dz + 1.6, draw: (ctx, stg) => { const src = image(def.imgs[tt[0]]); if (!src.ok || !stg.onScreen(x, z, 10)) return; const p = stg.toScreen(x, z); if (filter) { ctx.save(); ctx.filter = filter; } drawRect(ctx, src.im, tt.slice(1), p.x, p.y, stg.scale()); if (filter) ctx.restore(); } };
        this.stage.add(d); this.townDraw.push(d);
      }
      // 바닥 차지: 가로 약 7.4칸 · 세로 약 3칸 (지붕 아래 벽 안쪽)
      for (let u = -3.2; u <= 3.2; u += 0.9) for (let v = -1.6; v <= 1.4; v += 0.9) col(cur.x + dx + u, cur.z + dz + v, 0.6);
    };
    // 천막: Flare 천막은 두 조각(72+73, 74+75)으로 잘려 있다. 이음매를 맞춰(기준점 px) 한 채로 붙인다
    const TENT = { A: [[72, 0, 0], [73, 96, -48]], B: [[74, 0, 0], [75, 96, 48]] };
    const tent = (kind, dx, dz, k, filter) => {
      const def = DATA.tiles.grassland, x0 = cur.x + dx - 0.75 * k, z0 = cur.z + dz;
      for (const [id, px, py] of TENT[kind]) {
        const tt = def.tiles[id]; if (!tt) continue;
        image(def.imgs[tt[0]]);
        const x = x0 + (px / 64) * k, z = z0 + (py / 32) * k;
        const d = { z: z0 + 1.2, draw: (ctx, stg) => { const src = image(def.imgs[tt[0]]); if (!src.ok || !stg.onScreen(x, z, 8)) return; const p = stg.toScreen(x, z); if (filter) { ctx.save(); ctx.filter = filter; } drawRect(ctx, src.im, tt.slice(1), p.x, p.y, stg.scale() * k); if (filter) ctx.restore(); } };
        this.stage.add(d); this.townDraw.push(d);
      }
      for (let u = -1.8; u <= 1.8; u += 0.9) for (let v = -1; v <= 1; v += 0.9) col(x0 + 0.75 * k + u * k, z0 + v * k, 0.6);
    };
    // 건물 설계: 그림 · 바닥 크기(가로 반 w, 세로 반 h)는 그림 크기에서 잰 값. 소품은 바닥 밖 앞쪽에
    //  대장간 = 그을린 돌오두막(가로 7.6) + 화로 · 모루    여관 = 큰 돌오두막(가로 8.6) + 통 · 상자 · 횃불
    //  광산 = 땅속 갱도 계단(가로 9) + 바위 · 종유석      연구소 = 마법진(가로 6) + 돌기둥 넷 · 석상
    //  제작소 = 창문 통나무집(가로 7.4) + 통나무 · 모루     숙소 = 문 통나무집, 3단계부터 한 채 더
    //  약초밭 = 작물 7 × 4 줄
    const LOOK = {
      smithy: (b) => { big('grassland', 296, 0, 0, 0.55, -7.3, 2.2, 'brightness(0.78) sepia(0.35) saturate(1.2)', 3.6); return [['dungeon', 167, 3.6, 3.4], ['grassland', 103, -3.4, 3.6], ['dungeon', 167, -1.2, 4.4], ['grassland', 100, 4.4, 1.0]]; },
      inn: (b) => { big('grassland', 296, 0, 0, 0.62, -7.3, 2.2, 'saturate(1.35) hue-rotate(-12deg) brightness(1.08)', 4.2); return [['grassland', 98, 4.2, 3.6], ['grassland', 96, -4.2, 3.4], ['dungeon', 167, -1.4, 4.8], ['dungeon', 167, 1.4, 4.8]]; },
      mine: (b) => { big('dungeon', 286, 0, -0.6, 0.75, 0, 0, 'sepia(0.4) brightness(0.9)', 2.8); return [['cave', 148, 4.6, -1.8], ['cave', 130, -4.4, 1.2], ['cave', 131, 3.8, 3.2], ['cave', 151, -3.6, -2.8], ['grassland', 100, -4.6, 3.6]]; },
      lab: (b) => { big('ruins', 380, 0, 0.4, 1.0, 0, 0, '', 0); return [['ruins', 243, 0.0, -3.0], ['ruins', 223, -3.6, -1.6], ['ruins', 231, 3.6, -1.6], ['ruins', 152, -3.8, 2.8], ['ruins', 223, 3.8, 2.8], ['ruins', 241, 0.0, 4.2], ['dungeon', 167, -1.8, 4.0], ['dungeon', 167, 1.8, 4.0]]; },
      workshop: (b) => { cabin('A', 0, -0.6, 'brightness(0.86) sepia(0.2)'); return [['grassland', 76, 4.6, 2.2], ['grassland', 103, -4.2, 2.8], ['grassland', 100, 2.2, 3.8], ['grassland', 101, -1.8, 4.0]]; },
      // 파견소 = 천막 야영 (단계마다 천막이 늘어난다) + 횃불
      guild: (b) => { tent('A', -2.0, -0.8, 0.95, 'brightness(0.92) sepia(0.15)'); tent('B', 2.6, 0.4, 0.85, 'saturate(1.2) hue-rotate(-10deg)'); if (b.lv >= 3) tent('A', 0.2, -3.4, 0.8, 'brightness(0.85)'); return [['dungeon', 167, 4.2, 3.4], ['dungeon', 167, -4.2, 3.4], ['grassland', 96, 0.4, 4.0], ['grassland', 98, -3.0, 4.2]]; },
      house: (b) => { cabin('B', b.lv >= 3 ? -2.2 : 0, -0.6, 'saturate(1.15) brightness(1.08)'); if (b.lv >= 3) cabin('A', 3.4, -3.6, 'saturate(1.1) brightness(1.04)'); return [['grassland', 98, 4.4, 2.8], ['grassland', 122, -4.4, 2.8], ['grassland', 121, -3.4, 3.8]]; },
    };
    // 공용 창고 상자
    tile('grassland', 76, VAULT_SPOT.x, VAULT_SPOT.z); col(VAULT_SPOT.x, VAULT_SPOT.z, 0.7);
    for (const pl of PLOTS) {
      const b = t.plots[pl.id];
      if (!b) { tile('grassland', 138, pl.x, pl.z); continue; }
      cur = pl;
      if (b.type === 'herb') { // 밭: 작물 7 × 4 줄 (울타리 없음)
        for (let u = -3; u <= 3; u++) for (let v = -1.5; v <= 1.5; v++) tile('grassland', 120 + ((u + Math.round(v + 1.5) + 4) % 4), pl.x + u * 1.5, pl.z + v * 1.7);
      } else {
        for (const [set, id, dx, dz] of (LOOK[b.type] || LOOK.smithy)(b)) { tile(set, id, pl.x + dx, pl.z + dz); col(pl.x + dx, pl.z + dz, 0.7); }
      }
      for (let lv = 2; lv <= b.lv; lv++) for (const [set, id, dx, dz] of LEVEL_DECOR[lv] || []) tile(set, id, pl.x + dx * 2.0, pl.z + dz + 4.8);
    }
  }

  // ───────── 일하는 용병 ─────────
  // 일을 맡은 용병을 그 건물 앞에 세우고 일하는 몸짓(연장 휘두르기 · 주문)을 되풀이한다
  syncWorkers() {
    const t = townOf(this.st), want = t.mercs.filter((m) => m.work && t.plots[m.work] && !m.job);
    const sig = want.map((m) => m.id + m.work + (m.tired ? 1 : 0)).join(',');
    if (sig === this.workerSig) return;
    this.workerSig = sig;
    for (const w of this.workers || []) w.a.dispose();
    this.workers = [];
    const TOOL = { mine: 'hand_axe', herb: 'dagger', smithy: 'hand_axe', workshop: 'hand_axe', lab: 'rod', inn: null, house: null };
    const SPOT = { herb: (i) => [(i % 3 - 1) * 3.0, (Math.floor(i / 3) - 0.5) * 2.2], mine: (i) => [-2.0 + i * 1.6, 4.6], lab: (i) => [-1.2 + i * 1.2, 2.2], smithy: (i) => [5.2 + (i % 2) * 1.2, 2.4 + i * 1.0], inn: (i) => [5.6 + (i % 2) * 1.2, 2.6 + i * 1.0] };
    const count = {};
    for (const m of want) {
      const b = t.plots[m.work], pl = PLOTS.find((q) => q.id === m.work); if (!pl) continue;
      const i = (count[m.work] = (count[m.work] ?? -1) + 1);
      const [dx, dz] = (SPOT[b.type] || ((k) => [-2.4 + k * 1.6, 5.6]))(i);
      const a = new Actor(this.scene, makeHero({ face: m.face }));
      const tool = TOOL[b.type];
      a.setLook({ layers: { ...(tool ? { main: tool } : {}), ...(b.type === 'lab' ? { chest: 'mage_vest', legs: 'mage_skirt' } : b.type === 'smithy' || b.type === 'mine' ? { chest: 'leather_chest' } : {}) } });
      a.pos.set(pl.x + dx, 0, pl.z + dz);
      a.facing = b.type === 'herb' ? Math.PI * (0.25 + (i % 2) * 0.5) : Math.PI; // 밭은 이리저리, 나머지는 건물 쪽
      a.name = m.name;
      a.play('idle');
      this.workers.push({ a, m, kind: b.type, t: Math.random() * 1.5 });
    }
  }
  updateWorkers(dt) {
    for (const w of this.workers || []) {
      w.a.update(dt);
      if (w.m.tired) { if (w.a.current !== 'idle') w.a.play('idle'); continue; }
      w.t -= dt;
      if (w.back > 0 && (w.back -= dt) <= 0) w.a.play('idle');
      if (w.t > 0) continue;
      w.back = 0.75;
      // 밭: 낫질하고 한 걸음 옆으로 · 연구소: 주문 · 나머지: 연장질
      const act = w.kind === 'lab' ? 'cast' : 'swing';
      w.a.act ? w.a.act(act) : w.a.play(act, { once: true, force: true });
      w.t = w.kind === 'herb' ? 1.1 + Math.random() * 0.6 : w.kind === 'lab' ? 2.4 : w.kind === 'inn' || w.kind === 'house' ? 9 : 0.9 + Math.random() * 0.3;
      if (w.kind === 'herb' && Math.random() < 0.35) w.a.facing += (Math.random() - 0.5) * 1.2;
      if ((w.kind === 'smithy' || w.kind === 'mine') && this.fx?.spark && Math.random() < 0.5) this.fx.spark(w.a.pos.x, w.a.pos.z);
    }
  }

  // ───────── 플레이어 ─────────

  makePlayer() {
    const st = this.st;
    this.player = new Actor(this.scene, makeHero(st.look));
    audio.female = this.player.spec.sex === 'f';
    this.player.pos.set(st.pos.x, 0, st.pos.z);
    this.player.play('idle');
    this.refreshGear();
  }

  // 장비가 바뀌면 능력치와 손에 든 모델을 다시 계산
  refreshGear() {
    const st = this.st;
    this.d = derive(st, this.buffValues());
    const e = st.equip;
    this.player.setLook(heroLook(st));
    const plus = e.weapon?.plus || 0;
    this.player.setGlow(plus >= 9 ? 0x402008 : plus >= 7 ? 0x281808 : null);
    st.hp = Math.min(st.hp, this.d.maxHp);
    st.mp = Math.min(st.mp, this.d.maxMp);
    this.ui.dirty();
  }

  buffValues() {
    const b = {};
    for (const k in this.buffs) if (this.buffs[k].t > 0) b[k] = this.buffs[k].v;
    // 칭호 특성으로 생긴 잠깐 효과 (피해 · 공격 속도 · 받는 피해 감소)
    for (const k in this.pbuffs || {}) if (this.pbuffs[k].t > 0) b[k] = (b[k] || 0) + this.pbuffs[k].v;
    // 영약 (마신 뒤 5분)
    for (const k in this.st.elix || {}) { const e = this.st.elix[k]; if (e.t > 0) b[e.buff] = (b[e.buff] || 0) + e.v; }
    return b;
  }

  // ───────── 칭호 특성 ─────────
  // trig: meleeHit · rangedHit · crit · kill · spell · buff · dodge · hurt · block
  perk(trig, at = null) {
    // 칭호 특성 + 끼고 있는 전설 장비의 고유 효과
    const list = [...(this.st.titles || [])];
    for (const it of Object.values(this.st.equip)) if (it?.unique != null) list.push({ name: it.title, perk: UNIQUES[it.unique] });
    if (!list.length || this.dead) return;
    for (const t of list) {
      const k = t.perk;
      if (k.trig !== trig || Math.random() >= k.p) continue;
      const P = this.player.pos, d = this.d, wd = (d.dmg[0] + d.dmg[1]) / 2;
      const near = (r) => this.monsters.filter((m) => !m.dead && dist2(m.pos, P) < r * r);
      const tag = (txt) => this.fx.text(P.clone().setY(3), txt, 'heal');
      const timed = (key, v) => { (this.pbuffs ||= {})[key] = { v, t: 3 }; this.d = derive(this.st, this.buffValues()); };
      if (k.eff === 'might') { timed('might', k.v); tag(t.name); }
      else if (k.eff === 'haste') { timed('haste', k.v); tag(t.name); }
      else if (k.eff === 'ward') { timed('ward', k.v); tag(t.name); }
      else if (k.eff === 'mp') this.gainMp(k.v);
      else if (k.eff === 'shock' || k.eff === 'thorns') {
        const r = k.eff === 'shock' ? 3 : 2.5;
        this.fx.decal(0, P.x, P.z, r, 0xffc070, 0.35);
        for (const m of near(r)) this.hitMonster(m, wd * k.v / 100, { src: 'perk' });
      } else if (k.eff === 'blast') {
        const c = at || P;
        this.fx.burst(c.x, 1, c.z, 0xff8040, 14, 5, 0.4); this.fx.decal(0, c.x, c.z, 2.5, 0xff8040, 0.35);
        for (const m of this.monsters) if (!m.dead && dist2(m.pos, c) < 6.25) this.hitMonster(m, k.v * d.spellMult, { src: 'perk' });
      } else if (k.eff === 'chill') {
        for (const m of near(4)) m.slowT = k.v / 10;
        this.fx.decal(0, P.x, P.z, 4, 0x9fd8ff, 0.4);
      } else if (k.eff === 'arrow') {
        const m = near(10).sort((a, b) => dist2(a.pos, P) - dist2(b.pos, P))[0];
        if (m) this.fx.projectile({ from: { x: P.x, y: 1.3, z: P.z }, target: m.actor, color: 0xd0e0ff, size: 0.6, speed: 26, bolt: true, onHit: () => this.hitMonster(m, wd * k.v / 100, { src: 'perk' }) });
      }
    }
  }

  // 업적: 새로 이룬 것을 알리고 금화
  checkAchievements() {
    const st = this.st, got = (st.ach ||= []);
    for (const a of ACHIEVEMENTS) {
      if (got.includes(a.id) || !a.check(st)) continue;
      got.push(a.id); st.gold += a.gold;
      this.ui.toast(`업적: ${a.name} — ${a.text} (+${a.gold.toLocaleString()}G)`, '#ffd84a'); sfx('rankup');
    }
  }

  // 오늘의 의뢰 끝: 보상은 경비대장 하겐에게 보고해서 받는다 (claimDaily)
  dailyDone(list) {
    for (const q of list) { this.ui.toast(`오늘의 의뢰 완료: ${dailyText(q)}`, '#ffd84a'); sfx('coin'); }
  }
  claimDaily() {
    const st = this.st; let n = 0, g = 0;
    for (const q of dailyOf(st).list) {
      if (!q.done || q.got) continue;
      const r = dailyReward(q, st);
      if (r.key && !addItem(st, makeItem('dungeon_key', { qty: r.key }, st))) { this.ui.toast('가방이 가득 찼습니다'); break; }
      st.gold += r.gold; g += r.gold; if (r.ore) townOf(st).ore += r.ore;
      q.got = true; n++; (st.rec ||= {}).daily = (st.rec.daily || 0) + 1;
    }
    if (n) { this.ui.toast(`의뢰 보상 ${n}개 — ${g.toLocaleString()}G`, '#ffd84a'); sfx('coin'); this.ui.dirty(); }
    return n;
  }

  // 막힌 곳(언덕 · 물 · 바위 · 벽)이면 가까운 빈자리로
  freeSpot(x, z, r = 0.6) {
    if (!blockedAt(this.stage, x, z, r)) return { x, z };
    for (let d = 0.75; d <= 10; d += 0.75) for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + d, nx = x + Math.cos(a) * d, nz = z + Math.sin(a) * d;
      if (!blockedAt(this.stage, nx, nz, r)) return { x: nx, z: nz };
    }
    return { x, z };
  }

  // ───────── 야영지 · 포탈 · 지도 안개 ─────────
  campStep(dt) {
    const st = this.st, P = this.player.pos;
    this.fogT = (this.fogT || 0) - dt;
    if (this.fogT <= 0 && !this.dungeon) { this.fogT = 0.3; if (reveal(P.x, P.z) && (this.fogSaveT = (this.fogSaveT || 0) - 0.3) <= 0) { this.fogSaveT = 5; saveFog(st); } }
    if (this.dungeon || this.dead) return;
    const c = inCamp(P.x, P.z, 1), camps = (st.camps ||= {});
    if (c && !camps[c.zone]) { camps[c.zone] = {}; this.ui.toast(`야영지 발견! 포탈로 오갈 수 있습니다`, '#80c0ff'); sfx('rankup'); this.refreshCamps(); }
    // 모닥불이 있는 야영지에서는 빨리 회복
    if (c && camps[c.zone]?.fire && !this.dead) { st.hp = Math.min(this.d.maxHp, st.hp + this.d.maxHp * 0.08 * dt); st.mp = Math.min(this.d.maxMp, st.mp + this.d.maxMp * 0.08 * dt); }
    // 포탈 위에 서면 지도 (마을 포탈 · 야영지 포탈)
    const pt = [{ x: 0, z: -2, zone: 'town' }, ...CAMPS].find((q) => Math.hypot(P.x - q.x, P.z - q.z) < 1.3);
    // 밟기만 해서는 열리지 않는다 — 포탈 앞에서 [포탈] 버튼으로 (input.js interactTarget)
    if (pt && this.portalAway !== pt.zone) this.portalAway = pt.zone;
    else if (!pt && this.portalAway) { const q = [{ x: 0, z: -2, zone: 'town' }, ...CAMPS].find((x) => x.zone === this.portalAway); if (!q || Math.hypot(P.x - q.x, P.z - q.z) > 3) this.portalAway = null; }
  }
  // 포탈로 이동 (발견한 야영지 · 마을)
  travel(zone) {
    const q = zone === 'town' ? { x: 0, z: -2 } : CAMPS.find((c) => c.zone === zone);
    if (!q || (zone !== 'town' && !this.st.camps?.[zone])) return;
    this.portalAway = zone; this.cancelRecall?.();
    this.player.pos.set(q.x, 0, q.z + 2); this.stage.cam.x = q.x; this.stage.cam.z = q.z + 2;
    this.fx.arrive(q.x, q.z + 2); sfx('cast'); this.moveTo = null; this.target = null;
  }
  // 야영지 시설: 상인 · 모닥불 (금화로 짓는다)
  refreshCamps() {
    for (const a of this.campNpcs || []) this.stage.remove(a);
    for (const d of this.campDraw || []) this.stage.remove(d);
    this.campNpcs = []; this.campDraw = [];
    for (const c of CAMPS) {
      const k = this.st.camps?.[c.zone]; if (!k) continue;
      if (k.merchant) { const a = new Actor(this.scene, { npc: 'wandering_trader' }); a.pos.set(c.x + 3, 0, c.z - 1); a.facing = -0.5; a.play('idle'); a.name = '떠돌이 상인'; this.campNpcs.push(a); }
      if (k.rest) { // 용병 쉼터: 단계마다 천막 하나씩
        const tt = DATA.tiles.grassland.tiles[72], spots = [[-5, -2], [5, -3], [-6, 3], [6, 2.5], [0, -5]];
        for (let i = 0; i < Math.min(5, k.rest); i++) { const [dx, dz] = spots[i], x = c.x + dx, z = c.z + dz; const d = { z: z + 1.5, draw: (ctx, stg) => { const src = image(DATA.tiles.grassland.imgs[tt[0]]); if (!src.ok || !stg.onScreen(x, z, 5)) return; const p = stg.toScreen(x, z); drawRect(ctx, src.im, tt.slice(1), p.x, p.y, stg.scale() * 0.8); } }; this.stage.add(d); this.campDraw.push(d); }
      }
      if (k.fire) { const tt = DATA.tiles.grassland.tiles[100]; const d = { z: c.z + 1.5, draw: (ctx, stg) => { const src = image(DATA.tiles.grassland.imgs[tt[0]]); if (!src.ok || !stg.onScreen(c.x, c.z, 4)) return; const s2 = stg.toScreen(c.x - 3, c.z + 1.5); drawRect(ctx, src.im, tt.slice(1), s2.x, s2.y, stg.scale()); } }; this.stage.add(d); this.campDraw.push(d); }
    }
  }
  buildCamp(zone, what) {
    const st = this.st, k = st.camps?.[zone], cost = { merchant: 5000, fire: 2000 }[what];
    if (!k || k[what]) return { ok: false };
    if (st.gold < cost) return { ok: false, why: '금화가 모자랍니다' };
    st.gold -= cost; k[what] = true; this.refreshCamps(); sfx('rankup');
    return { ok: true };
  }

  // ───────── 펫: 따라다니며 물건을 줍고, 가끔 함께 문다 ─────────
  makePet() {
    if (this.pet) { this.stage.remove(this.pet); this.pet = null; }
    if (!this.st.pet) return;
    if (!this.st.pet.kind.startsWith('pet_')) this.st.pet = { kind: 'pet_dog', name: '강아지' }; // 예전 개미귀신 펫
    this.pet = new Actor(this.scene, { enemy: this.st.pet.kind }, { size: 0.62 });
    this.pet.pos.set(this.player.pos.x + 1, 0, this.player.pos.z + 1);
    this.pet.name = this.st.pet.name;
  }
  petStep(dt) {
    const pet = this.pet; if (!pet) return;
    const P = this.player.pos, st = this.st;
    this.petT = (this.petT || 0) - dt;
    let goal = { x: P.x - 1.2, z: P.z + 0.8 };
    const g = this.dead ? null : this.ground.filter((x) => !x.deathDrop && dist2(x, P) < 9 && !(x.kind === 'item' && st.inv.length >= bagSize(st) && !BASES[x.item.base]?.stack)).sort((a, b) => dist2(a, pet.pos) - dist2(b, pet.pos))[0];
    if (g) { goal = g; if (dist2(pet.pos, g) < 0.8) this.pickup(g); }
    const d = dist2(pet.pos, goal);
    if (d > 0.4) { this.stepToward(pet.pos, goal, Math.min(14, 5 + d) * dt); pet.face(goal.x, goal.z); pet.play('run', { speed: 1.4 }); } else pet.play('idle');
    if (d > 25) pet.pos.set(P.x - 1, 0, P.z + 1);
    const t = this.target;
    if (t && !t.dead && this.petT <= 0 && dist2(t.pos, pet.pos) < 36) { this.petT = 2.5; const wd = (this.d.dmg[0] + this.d.dmg[1]) / 2; pet.act?.('attack', 1); this.hitMonster(t, wd * 0.15, { src: 'perk' }); }
    pet.update(dt);
  }
  // 낮 · 밤 (20분에 한 바퀴, 마지막 4분이 밤) · 비 (풀밭 · 숲 · 늪 · 항구에서 가끔)
  skyStep(dt) {
    const c = (this.st.playTime % 1200) / 1200;
    const target = c > 0.8 ? 1 : 0;
    this.night = (this.night || 0) + (target - (this.night || 0)) * Math.min(1, dt * 0.3);
    this.stage.night = this.inTown || this.dungeon ? this.night * 0.4 : this.night;
    this.rainT = (this.rainT ?? 120) - dt;
    if (this.rainT <= 0) { this.rainT = 120 + Math.random() * 240; this.raining = Math.random() < 0.3; }
    const wet = ['field', 'forest', 'swamp', 'harbor', 'webwood'].includes(zoneAt(this.player.pos.x, this.player.pos.z)?.id);
    this.stage.rain = (this.stage.rain || 0) + (((this.raining && wet && !this.dungeon) ? 1 : 0) - (this.stage.rain || 0)) * Math.min(1, dt * 0.5);
  }

  // ───────── 숨은 보물 상자 ─────────
  // 언덕 · 호수 뒤쪽(화면 위쪽, 잘 안 보이는 곳)에 하나씩. 날마다 다시 찬다
  makeChests() {
    this.chests = [];
    const day = dayKey();
    const opened = (this.st.chests?.day === day ? this.st.chests.ids : []);
    [...LAKES, ...MESAS].forEach((q, i) => {
      if (q.x > 500 || q.ring || q.wild || i % 3) return; // 보물 상자는 드물게
      const p = this.freeSpot(q.x + (i % 2 ? 2 : -2), q.z - q.r - 2.2, 0.8);
      const c = { id: i, x: p.x, z: p.z, open: opened.includes(i) };
      c.draw = { z: p.z, draw: (ctx, stg) => { const def = DATA.tiles.dungeon, tt = def.tiles[c.open ? 160 : 144], src = image(def.imgs[tt[0]]); if (!src.ok || !stg.onScreen(c.x, c.z, 3)) return; const s2 = stg.toScreen(c.x, c.z); drawRect(ctx, src.im, tt.slice(1), s2.x, s2.y, stg.scale()); } };
      this.stage.add(c.draw); this.chests.push(c);
    });
  }
  checkChests() {
    const P = this.player.pos, st = this.st;
    for (const c of this.chests || []) {
      if (c.open || Math.hypot(P.x - c.x, P.z - c.z) > 1.6) continue;
      c.open = true;
      const day = dayKey(); if (st.chests?.day !== day) st.chests = { day, ids: [] }; st.chests.ids.push(c.id);
      const zn = zoneAt(c.x, c.z) || ALL_ZONES[0], lv = zn.levels[1] + this.tierOffset; // 세계 단계만큼 높은 장비
      const rr = Math.random(), rar = rr < 0.03 ? 'hero' : rr < 0.25 ? 'rare' : 'magic'; // 대부분 마법, 가끔 희귀
      if (Math.random() < 0.6) this.dropGround({ kind: 'item', item: makeItem(rollBase(lv), { rarity: rar, ilvl: lv }, st) }, c.x + 1, c.z + 0.5);
      this.dropGround({ kind: 'gold', amount: lv * 12 }, c.x - 1, c.z + 0.5);
      if (Math.random() < 0.15) this.dropGround({ kind: 'item', item: makeItem(`gem_${['ruby', 'emerald', 'sapphire', 'amethyst', 'diamond'][Math.floor(Math.random() * 5)]}_${gemGradeFor(lv)}`, { qty: 1 }, st) }, c.x, c.z + 1.2);
      this.fx.pillar(c.x, c.z, 0xffd060, 1.4, 5, 1.5); sfx('rare'); this.ui.toast('숨은 보물 상자!', '#ffd84a');
    }
  }

  // ───────── 떠돌이 상인 (사냥터에 가끔 나타나 4분 머문다) ─────────
  merchantStep(dt) {
    return; // 떠돌이 상인은 없앴다 (야영지 포탈 상인으로 충분, 0.28.0)
    const P = this.player.pos;
    if (this.eventNpc) {
      this.eventNpc.update(dt);
      if ((this.eventT -= dt) <= 0 || this.dungeon) { this.stage.remove(this.eventNpc); this.eventNpc = null; this.ui.log('떠돌이 상인이 떠났다', '#9a917f'); }
      return;
    }
    this.merchT = (this.merchT ?? 300 + Math.random() * 240) - dt;
    if (this.merchT > 0 || this.dungeon || this.inTown || !zoneAt(P.x, P.z)) return;
    this.merchT = 420 + Math.random() * 300;
    const a = Math.random() * 6.28, sp = this.freeSpot(P.x + Math.cos(a) * 10, P.z + Math.sin(a) * 10, 1);
    const n = new Actor(this.scene, { npc: 'wandering_trader' }); n.pos.set(sp.x, 0, sp.z); n.play('idle'); n.name = '떠돌이 상인';
    this.eventNpc = n; this.eventT = 240;
    this.fx.pillar(sp.x, sp.z, 0xffd060, 1.2, 5, 1); this.ui.toast('떠돌이 상인이 나타났습니다', '#ffd84a'); sfx('coin');
  }

  // ───────── 지역 습격 ─────────
  // 사냥터에 10~15분마다 무리가 몰려온다. 90초 안에 다 잡으면 보상
  raidStep(dt) {
    const st = this.st, P = this.player.pos;
    if (this.raid) {
      this.raid.t -= dt;
      const left = this.raid.mons.filter((m) => !m.dead).length;
      if (!left) { const lv = this.raid.zone.levels[1] + this.tierOffset; this.dropGround({ kind: 'item', item: makeItem(rollBase(lv), { rarity: Math.random() < 0.3 ? 'hero' : 'rare', ilvl: lv }, st) }, P.x + 1, P.z); this.dropGround({ kind: 'gold', amount: lv * 60 }, P.x - 1, P.z); this.ui.toast('습격을 막아 냈습니다!', '#ffd84a'); sfx('rankup'); this.raid = null; }
      else if (this.raid.t <= 0) { this.ui.toast('습격 무리가 물러갔습니다'); for (const m of this.raid.mons) if (!m.dead) m.state = 'return'; this.raid = null; }
      return;
    }
    this.raidT = (this.raidT ?? 600 + Math.random() * 300) - dt;
    const zn = zoneAt(P.x, P.z);
    if (this.raidT > 0 || !zn || this.dungeon || this.dead || this.inTown) return;
    this.raidT = 600 + Math.random() * 300;
    const mons = [];
    const a0 = Math.random() * 6.28;
    for (let i = 0; i < 10; i++) {
      const a = a0 + (i - 5) * 0.12, x = P.x + Math.cos(a) * 11, z = P.z + Math.sin(a) * 11;
      const m = this.spawn({ zone: zn, x, z, level: zn.levels[1], tier: i < 2 ? 'elite' : 'normal', timer: 0, mon: null });
      m.state = 'chase'; m.noLoot = i >= 2; mons.push(m);
    }
    this.raid = { zone: zn, mons, t: 90 };
    this.fx.shake(0.3); sfx('buff'); this.ui.toast(`${zn.name}에 습격! 90초 안에 막아 내세요`, '#ff9a6a');
  }

  // ───────── 던전 ─────────
  // 던전 입구: 밟기만 해서는 열리지 않는다 — 입구 앞에서 [던전] 버튼으로 (input.js). 자동 사냥이 입구를 지나다 멈추던 문제
  checkDungeonGate() {}
  dungeonNear(r = 3) {
    if (this.dungeon || this.dead) return -1;
    const P = this.player.pos;
    for (let zi = 0; zi < ALL_ZONES.length; zi++) { const e = entranceOf(ALL_ZONES[zi]); if (Math.hypot(P.x - e.x, P.z - e.z) < r) return zi; }
    return -1;
  }
  askDungeon(zi) {
    if (this.asking || zi < 0) return;
    const zn = ALL_ZONES[zi], stage = Math.min(MAX_STAGE, (this.st.dungeons?.[zn.id] || 0) + 1), keys = countOf(this.st, 'dungeon_key');
    this.asking = true; this.moveTo = null; this.target = null; this.toggleAuto(false);
      this.ui.ask(`${zn.name} 던전 ${stage}단계`, keys ? `던전 열쇠 1개를 써서 들어갈까요? · 열쇠 ${keys}` : '던전 열쇠가 필요합니다', keys ? '들어가기' : null, (yes) => { this.asking = false; if (yes) this.enterDungeon(zi); });
  }
  enterDungeon(zi) {
    const st = this.st, zn = ALL_ZONES[zi];
    if (!takeOne(st, 'dungeon_key')) return;
    const stage = Math.min(MAX_STAGE, ((st.dungeons ||= {})[zn.id] || 0) + 1);
    this.leaveDungeon(true);
    this.dungeon = { zi, stage, zone: zn };
    this.toggleAuto(false);
    const Ld = dungeonLayout(zi), sp0 = cellPos(zi, Ld.start[0], Ld.start[1]);
    this.player.pos.set(sp0.x, 0, sp0.z); this.moveTo = null; this.target = null;
    this.stage.cam.x = sp0.x; this.stage.cam.z = sp0.z;
    this.fx.arrive(sp0.x, sp0.z);
    const mod = stageMods(stage), L = dungeonLevel(zn, stage); // 1단계는 지역 중간 레벨부터 (필드 → 던전 격차를 줄였다)
    // 세계 단계 보정은 spawn에서 더한다 (예전엔 두 번 더해 지옥 던전이 283레벨이 됐다)
    // 몬스터: 시작에서 먼 칸일수록 많이 · 정예는 깊은 곳, 우두머리는 가장 먼 방
    const cells = [];
    for (let k = 0; k < Ld.g.length; k++) if (Ld.g[k] && Ld.dist[k] > 5 && Ld.dist[k] < Ld.far - 2) cells.push(k);
    const pick = () => cells.splice(Math.floor(Math.random() * cells.length), 1)[0];
    const put = (k, tier, fixed) => {
      const p = cellPos(zi, k % N, Math.floor(k / N));
      const m = this.spawn({ zone: zn, x: p.x, z: p.z, level: L, tier, timer: 0, mon: null, fixed });
      m.maxHp = m.hp = Math.round(m.maxHp * mod.hp); m.dmg = m.dmg.map((v) => v * mod.dmg); m.dungeon = true; m.exp *= 1.5;
      m.home = { x: p.x, z: p.z };
    };
    for (let n = 0; n < 14 + Math.min(8, stage) && cells.length; n++) put(pick(), 'normal'); // 낮은 단계는 몬스터가 적다
    cells.sort((a, b) => Ld.dist[b] - Ld.dist[a]);
    for (let n = 0; n < 4 && cells.length; n++) put(cells.splice(Math.floor(Math.random() * Math.min(12, cells.length)), 1)[0], 'elite');
    put(Ld.boss[1] * N + Ld.boss[0], 'boss', { type: zn.boss.type, name: `${zn.name} 던전 우두머리` });
    { const bm = this.monsters[this.monsters.length - 1]; if (bm?.tier === 'boss') { const k = 0.55 + 0.09 * stage; bm.maxHp = bm.hp = Math.round(bm.maxHp * k); } } // 우두머리: 1단계 0.64배 → 10단계 1.45배
    this.ui.toast(`${zn.name} 던전 ${stage}단계 — 가장 깊은 곳의 우두머리를 찾으세요`, '#ffd84a');
    this.ui.dirty();
  }
  leaveDungeon(silent = false) {
    if (!this.dungeon) return;
    if (this.autoArea?.dungeon != null) this.autoArea = { zone: ALL_ZONES[this.dungeon.zi] }; // 던전에서 켠 자동 사냥은 나오면 그 지역에서
    // 던전 몬스터는 쓰러진 중이던 것 · 보스가 부른 졸개까지 그림째 모두 치운다 (남으면 다시 들어갈 때 잔상이 보였다)
    const inDg = (m) => m.dungeon || m.owner?.dungeon || m.pos.x > DUNGEON_X - 80;
    for (const m of this.monsters) if (inDg(m)) { m.dead = true; m.noLoot = true; this.stage.remove(m.actor); }
    this.monsters = this.monsters.filter((m) => !inDg(m));
    // 던전 바닥에 남은 것: 죽으며 떨어뜨린 장비는 던전 입구로 옮기고, 나머지는 치운다
    const ent = entranceOf(this.dungeon.zone);
    for (const g of [...this.ground]) if (g.x > DUNGEON_X - 80) { if (g.deathDrop) { this.removeGround(g); const n = this.dropGround({ kind: 'item', item: g.item }, ent.x + 1, ent.z + 1, g.expires); n.deathDrop = true; } else this.removeGround(g); }
    this.target = null; this.chasePath = null;
    const zn = this.dungeon.zone;
    this.dungeon = null;
    if (!silent) { const e = entranceOf(zn); this.player.pos.set(e.x + 2, 0, e.z + 2); this.gateCd = 4; this.fx.arrive(e.x + 2, e.z + 2); }
  }
  // 던전 나가기: 묻고 나간다
  askLeave() {
    if (!this.dungeon) return;
    const left = this.ground.filter((g) => !g.deathDrop && dist2(g, this.player.pos) < 400).length;
    this.ui.ask('던전 나가기', left ? `주변에 줍지 않은 물건이 ${left}개 있습니다. 나갈까요?` : '밖으로 나갈까요?', '나가기', (yes) => { if (yes) this.leaveDungeon(); });
  }
  dungeonCleared(m) {
    const st = this.st, dg = this.dungeon, zn = dg.zone;
    st.dungeons[zn.id] = Math.max(st.dungeons[zn.id] || 0, dg.stage);
    this.dailyDone(dailyProgress(st, { kind: 'dungeon', zone: zn.id }));
    // 보상: 영웅 이상 2개 (단계가 높을수록 전설), 상급 스킬북 하나, 금화
    const lv = dungeonLevel(zn, dg.stage) + this.tierOffset;
    for (let i = 0; i < 2; i++) {
      const rarity = Math.random() < 0.08 + dg.stage * 0.035 ? 'legend' : 'hero';
      this.dropGround({ kind: 'item', item: makeItem(rollBase(lv), { rarity, ilvl: lv }, st) }, m.pos.x + i * 1.2, m.pos.z + 1);
    }
    const tier = dg.stage >= 7 ? 5 : dg.stage >= 4 ? 4 : 3, pool = Object.keys(SKILLS).filter((id) => SKILLS[id].tier === tier);
    this.dropGround({ kind: 'item', item: makeBook(pool[Math.floor(Math.random() * pool.length)], st) }, m.pos.x - 1.2, m.pos.z + 1);
    this.dropGround({ kind: 'gold', amount: Math.round(lv * 60 * (1 + dg.stage * 0.2)) }, m.pos.x, m.pos.z - 1);
    this.ui.toast(`던전 ${dg.stage}단계 돌파!`, '#ffd84a');
    sfx('awaken');
    dg.cleared = true; // 공격 버튼이 「나가기」로 바뀐다 (input.js). 전리품을 다 줍고 나간다
  }

  // 각성 20 · 40 · 60: 키운 스탯으로 칭호를 받고 특성 하나를 고른다
  offerTitle(tier) {
    const st = this.st, key = titleKey(st.stats, CONFIG.startStat);
    if ((st.titles ||= []).some((t) => t.tier === tier)) return;
    this.ui.titlePick({ tier, key, name: titleName(key, tier), choices: perkChoices(key, tier) }, (perk) => {
      st.titles.push({ tier, key, name: titleName(key, tier), perk });
      const seen = (st.titleSeen ||= []); if (!seen.includes(key + tier)) seen.push(key + tier);
      sfx('awaken'); this.fx.pillar(this.player.pos.x, this.player.pos.z, 0xffe080, 1.4);
      this.ui.log(`칭호: ${titleName(key, tier)} — ${perk.text}`, '#ffd860');
      this.ui.dirty();
    });
  }

  makeNpc() {
    this.npc = new Actor(this.scene, { npc: 'wandering_trader' });
    this.npc.pos.set(3.5, 0, -8.5);
    this.npc.facing = 0.3;
    this.npc.play('idle');
    this.npc.name = '상인 오르텐';
    // 퀘스트를 주는 경비대장
    this.guard = new Actor(this.scene, { npc: 'knight' });
    this.guard.pos.set(-4.5, 0, 9);
    this.guard.facing = 0.4;
    this.guard.play('idle');
    this.guard.name = '경비대장 하겐';
    // 보석상 (보석 조각 · 열쇠 상점) · 현자 (도감 · 칭호)
    this.gemNpc = new Actor(this.scene, { npc: 'guild_man' }); this.gemNpc.pos.set(9, 0, -4); this.gemNpc.facing = -0.4; this.gemNpc.play('idle'); this.gemNpc.name = '보석상 리엔';
    this.sage = new Actor(this.scene, { npc: 'peasant_woman1' }); this.sage.pos.set(-10, 0, -3); this.sage.facing = 0.6; this.sage.play('idle'); this.sage.name = '현자 에라';
  }

  get canShop() { const P = this.player.pos, c = inCamp(P.x, P.z); return this.inTown || !!(c && this.st.camps?.[c.zone]?.merchant) || !!(this.eventNpc && dist2(this.eventNpc.pos, P) < 6); }
  // 세계 단계: 마지막 보스를 잡으면 다음 단계가 열린다. 단계마다 모든 몬스터 레벨 +66 (드랍 장비 · 보석 등급도 따라 오른다)
  get wt() { return Math.min(3, Math.max(1, this.st.worldTier || 1)); }
  get tierOffset() { return ((this.st.worldTier || 1) - 1) * 66; }
  setTier(t) {
    const st = this.st;
    if (t < 1 || t > (st.maxTier || 1) || t === (st.worldTier || 1) || this.dungeon) return;
    st.worldTier = t;
    for (const m of this.monsters) { m.dead = true; this.stage.remove(m.actor); }
    this.monsters = []; this.raid = null;
    for (const sp of this.spawners) { sp.mon = null; sp.timer = 0; }
    this.zone = null;
    this.ui.toast(`세계 ${TIER_NAMES[t - 1]} — 모든 몬스터가 강해졌습니다`, '#ff9a6a'); sfx('awaken'); this.ui.dirty();
  }
  get inTown() {
    return dist2(this.player.pos, TOWN) < TOWN.r;
  }

  // ───────── 몬스터 ─────────

  makeSpawners() {
    const rng = seeded(777 + (this.st.worldSeed || 0));
    for (const zn of ZONES) {
      const near = Math.hypot(zn.x, zn.z) - zn.r;
      const lv = (x, z) => {
        const t = Math.max(0, Math.min(1, (Math.hypot(x, z) - near) / (zn.r * 2)));
        return Math.round(zn.levels[0] + (zn.levels[1] - zn.levels[0]) * t);
      };
      // 무리: 넓은 땅에 띄엄띄엄 무리 지어 (무리마다 3~7마리, 무리 사이는 비어 있다)
      const packs = [], total = Math.round(zn.count * 1.4);
      for (let n = 0, tries = 0; n < total && tries < 400; tries++) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * zn.r * 0.88;
        const cx = zn.x + Math.cos(a) * r, cz = zn.z + Math.sin(a) * r;
        // 베이스캠프 둘레(마을 + 25칸)와 보스 터에는 무리를 두지 않는다
        const bs = bossSpot(zn);
        if (Math.hypot(cx, cz) < TOWN.r + 30 || Math.hypot(bs.x - cx, bs.z - cz) < 20 || blockedAt(this.stage, cx, cz, 2) || packs.some((q) => Math.hypot(q[0] - cx, q[1] - cz) < 16)) continue;
        packs.push([cx, cz]);
        const k = Math.min(total - n, 3 + Math.floor(rng() * 5));
        for (let i = 0; i < k; i++) {
          const x = cx + (rng() - 0.5) * 7, z = cz + (rng() - 0.5) * 7;
          if (blockedAt(this.stage, x, z, 1) || Math.hypot(x, z) < TOWN.r + 25) continue;
          this.spawners.push({ zone: zn, x, z, level: lv(x, z), tier: 'normal', timer: 0, mon: null }); n++;
        }
      }
      // 네임드: 지역 한가운데 / 보스: 마을에서 가장 먼 곳
      const ux = zn.x / Math.hypot(zn.x, zn.z), uz = zn.z / Math.hypot(zn.x, zn.z);
      this.spawners.push({ zone: zn, x: zn.x - uz * 12, z: zn.z + ux * 12, level: zn.levels[1], tier: 'named', timer: 0, mon: null, fixed: zn.named });
      const bsp = bossSpot(zn);
      this.spawners.push({ zone: zn, x: bsp.x, z: bsp.z, level: zn.levels[1] + 1, tier: 'boss', timer: 0, mon: null, fixed: zn.boss });
    }
    this.spawners = this.spawners.filter((sp) => !inCamp(sp.x, sp.z, 4));
  }

  spawn(sp) {
    let type, tier = sp.tier, name, tint = null;
    if (sp.fixed) {
      type = sp.fixed.type; name = sp.fixed.name; tint = sp.fixed.tint ?? null;
    } else if (sp.forceType) {
      type = sp.forceType;
    } else {
      type = weightedPick(sp.zone.spawns);
      if (Math.random() < CONFIG.eliteChance) tier = 'elite';
    }
    const def = MONSTERS[type];
    const T = TIERS[tier];
    const L = sp.level + this.tierOffset;
    const look = MONSTER_LOOK[type] || { sprite: 'goblin' };
    const fam = familyOf(look.sprite);
    const actor = new Actor(this.scene, { enemy: look.sprite }, { tint: tint ?? look.tint ?? null, scale: T.scale, size: look.size || 1 });
    if (tier === 'elite') actor.setGlow(0x0a1a40);
    if (tier === 'named') actor.setGlow(0x302000);
    if (tier === 'boss') actor.setGlow(0x400800);
    const a = Math.random() * Math.PI * 2;
    const fp = this.freeSpot(sp.x + Math.cos(a) * 1.5, sp.z + Math.sin(a) * 1.5, 0.9);
    actor.pos.set(fp.x, 0, fp.z);
    actor.facing = Math.random() * 6.28;
    actor.root.rotation.y = actor.facing;
    const m = {
      id: actor.id, def, type, tier, level: L, actor, sp, fam,
      name: name || (tier === 'elite' ? `정예 ${def.name}` : def.name),
      maxHp: Math.round(def.hp * (1 + 0.4 * (L - 1)) * T.hp * TIER_K[this.wt].hp),
      dmg: def.dmg.map((v) => v * (1 + 0.27 * (L - 1)) * T.dmg * TIER_K[this.wt].dmg),
      armor: L * 2,
      exp: def.exp * (1 + 0.3 * (L - 1)) * T.exp,
      speed: def.speed * (tier === 'boss' ? 1.1 : 1),
      state: 'idle', atkT: 1, wanderT: Math.random() * 4, deadT: 0, slowT: 0, showHp: 0,
      home: { x: sp.x, z: sp.z },
    };
    if (tier === 'normal' && !sp.forceType && Math.random() < (this.night > 0.5 ? 1 / 120 : 1 / 250)) {
      m.golden = true; m.name = '황금 ' + m.name; m.maxHp *= 3; m.exp *= 3; actor.setGlow(0x5a4400);
    }
    m.hp = m.maxHp;
    m.pos = actor.pos;
    actor.play('idle');
    sp.mon = m;
    this.monsters.push(m);
    return m;
  }

  updateSpawners(dt) {
    const p = this.player.pos;
    for (const sp of this.spawners) {
      if (sp.mon) continue;
      sp.timer -= dt;
      // 플레이어 바로 앞에서 튀어나오지 않게 · 먼 곳은 가까워질 때 만든다 (몬스터 수 · 메모리 절약)
      const d = Math.hypot(sp.x - p.x, sp.z - p.z);
      if (sp.timer <= 0 && d > 14 && d < SPAWN_NEAR) this.spawn(sp);
    }
  }

  monsterAI(m, dt) {
    const a = m.actor;
    const p = this.player.pos;
    if (m.dash) { this.dashStep(m, dt); return; }
    const d = dist2(m.pos, p);
    const valid = !this.dead && !this.inTown && !inCamp(p.x, p.z);
    const fromHome = dist2(m.pos, m.home);
    const spd = m.speed * (m.slowT > 0 ? 0.5 : 1);
    if (m.slowT > 0) m.slowT -= dt;
    m.atkT -= dt;
    if (m.showHp > 0) m.showHp -= dt;
    let moving = 0;

    if (m.state === 'idle') {
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 3 + Math.random() * 5;
        const ang = Math.random() * Math.PI * 2;
        m.wander = { x: m.home.x + Math.cos(ang) * 5, z: m.home.z + Math.sin(ang) * 5 };
      }
      if (m.wander && a.lock <= 0) {
        if (dist2(m.pos, m.wander) > 0.5) { this.stepToward(m.pos, m.wander, spd * 0.35 * dt); a.face(m.wander.x, m.wander.z); moving = 1; }
        else m.wander = null;
      }
      if (valid && d < m.def.aggro * (m.tier === 'boss' ? 1.3 : 1)) m.state = 'chase';
    } else if (m.state === 'chase') {
      if (!valid || fromHome > 32) { m.state = 'return'; }
      else if (m.def.behave === 'charge' && m.tier !== 'boss' && d > 4 && d < 10 && (m.chargeCd = (m.chargeCd ?? 3) - dt) <= 0 && a.lock <= 0) {
        // 돌진형: 선을 그어 알린 뒤 곧게 달려든다
        m.chargeCd = 5 + Math.random() * 3;
        a.face(p.x, p.z); a.lock = 0.7;
        const dx = p.x - m.pos.x, dz = p.z - m.pos.z, l = Math.hypot(dx, dz) || 1;
        const to = { x: m.pos.x + (dx / l) * (l + 2.5), z: m.pos.z + (dz / l) * (l + 2.5) };
        this.fx.lane(m.pos.x, m.pos.z, to.x, to.z, 1.8 * a.scale, 0.7, 0xff4020);
        this.later(0.7, () => { if (!m.dead) { m.dash = { to, t: 0.45, hit: false }; a.lock = 0; a.play('run', { force: true, speed: 1.6 }); } });
      } else if (m.def.attack !== 'melee' && d < m.def.range * 0.45 && a.lock <= 0 && m.tier !== 'boss') {
        // 원거리형: 너무 가까우면 물러선다
        const away = { x: m.pos.x * 2 - p.x, z: m.pos.z * 2 - p.z };
        this.stepToward(m.pos, away, spd * 0.8 * dt); a.face(p.x, p.z); moving = 2;
        if (m.atkT <= 0) this.monsterAttack(m);
      } else if (d > m.def.range) {
        if (a.lock <= 0) {
          // 앞이 막혔으면 길을 찾아 돌아온다 (0.6초마다 다시 본다)
          m.pathT = (m.pathT || 0) - dt;
          if (m.pathT <= 0) {
            m.pathT = 0.6 + Math.random() * 0.3;
            m.path = clearLine(this.stage, m.pos, p, 0.45) ? null : findPath(this.stage, m.pos, p, 0.45, 1800);
          }
          let goal = p;
          if (m.path?.length) {
            goal = m.path[0];
            if (dist2(m.pos, goal) < 0.6) { m.path.shift(); goal = m.path[0] || p; }
          }
          this.stepToward(m.pos, goal, spd * dt); a.face(goal.x, goal.z); moving = 2;
        }
      } else {
        a.face(p.x, p.z);
        if (m.atkT <= 0 && a.lock <= 0) this.monsterAttack(m);
      }
      const pats = m.tier === 'boss' ? m.def.patterns : m.tier === 'named' ? ['slam', 'charge'] : null;
      if (pats && valid && d < 16) {
        // 기본 패턴 + 보스 전용 패턴을 번갈아
        const all = m.tier === 'boss' ? [...pats, ...(BOSS_SIG[m.type] || [])] : pats;
        m.patT = (m.patT ?? 5) - dt * (m.hp < m.maxHp * 0.3 ? 1.6 : 1);
        if (m.patT <= 0 && a.lock <= 0) { m.patT = (m.tier === 'boss' ? 5.5 : 8.5) / TIER_K[this.wt].pat; this.bossPattern(m, all[(m.patI = (m.patI || 0) + 1) % all.length]); }
      }
      // 멀리서 맴돌며 치면 원거리 응징 패턴
      if (m.tier === 'boss' && valid && d > 7.5 && d < 24 && !m.dash) {
        m.farT = (m.farT ?? 2.5) - dt;
        if (m.farT <= 0 && a.lock <= 0) { m.farT = 3.2 / TIER_K[this.wt].pat; const f = farOf(m.type); this.bossPattern(m, f[(m.farI = (m.farI || 0) + 1) % f.length]); }
      } else if (m.farT != null && m.farT < 1.2) m.farT = 1.2;
    } else if (m.state === 'return') {
      this.stepToward(m.pos, m.home, spd * 1.3 * dt);
      a.face(m.home.x, m.home.z);
      moving = 2;
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.25 * dt);
      if (fromHome < 1.5) { m.state = 'idle'; m.hp = m.maxHp; }
    }
    // 서로 겹치지 않게
    for (const o of this.monsters) {
      if (o === m || o.dead) continue;
      const dx = m.pos.x - o.pos.x, dz = m.pos.z - o.pos.z;
      const dd = dx * dx + dz * dz;
      const min = 1.1 * Math.max(m.actor.scale, o.actor.scale);
      if (dd < min * min && dd > 1e-6) {
        const k = (min - Math.sqrt(dd)) * 0.5 / Math.sqrt(dd);
        m.pos.x += dx * k; m.pos.z += dz * k;
      }
    }
    if (moving) resolveCollision(this.stage, m.pos, 0.5 * m.actor.scale);
    if (a.lock <= 0) {
      const kay = !!m.def.rig;
      if (moving === 2) a.play('run', { speed: spd / 7 });
      else if (moving === 1) a.play('walk', { speed: Math.max(0.35, spd * 0.35 / 4.5) });
      else a.play('idle');
    }
  }

  monsterAttack(m) {
    m.atkT = m.def.interval * randRange(0.9, 1.15);
    const dur = m.actor.act(m.def.atk || 'attack', 1.15) || 0.8;
    sfx(m.def.attack === 'melee' ? 'mattack' : 'mshoot', 0.8, m.fam);
    const windup = Math.min(0.5, dur * 0.45);
    this.later(windup, () => {
      if (m.dead || this.dead) return;
      const dmg = randRange(m.dmg[0], m.dmg[1]);
      if (m.def.attack === 'melee') {
        if (dist2(m.pos, this.player.pos) <= m.def.range + 1.3) this.hurtPlayer(dmg, m);
      } else {
        const spell = m.def.attack === 'spell';
        this.fx.projectile({
          from: { x: m.pos.x, y: 1.5 * m.actor.scale, z: m.pos.z }, target: this.player,
          color: spell ? 0xa060ff : 0xd0c090, size: spell ? 0.9 : 0.6, speed: spell ? 15 : 24, bolt: !spell,
          onHit: () => { if (!m.dead || spell) this.hurtPlayer(dmg, m); },
        });
      }
    });
  }

  // ───────── 보스 패턴: 바닥 예고를 보고 피한다 ─────────

  // 예고 원 → 시간이 지나면 그 안에 있을 때만 맞는다
  danger(m, x, z, r, delay, mult, color = 0xff4020) {
    this.fx.telegraph(x, z, r, delay, color);
    this.later(delay, () => {
      if (m.dead) return;
      this.fx.ring(x, z, r * 1.15, color, 0.5);
      this.fx.pillar(x, z, color, 0.45, 4, r * 0.55);
      this.fx.burst(x, 0.6, z, color, 18, 6, 0.55);
      this.fx.shake(Math.min(0.6, r * 0.08));
      sfx('boom', 0.6);
      if (!this.dead && Math.hypot(this.player.pos.x - x, this.player.pos.z - z) < r) this.hurtPlayer(randRange(m.dmg[0], m.dmg[1]) * mult, m);
    });
  }

  // 직선 위험 지대: 선분에서 w/2 안이면 맞는다
  dangerLane(m, x1, z1, x2, z2, w, delay, mult, color = 0xff4020) {
    this.fx.lane(x1, z1, x2, z2, w, delay, color);
    this.later(delay, () => {
      if (m.dead) return;
      const n = Math.max(2, Math.round(Math.hypot(x2 - x1, z2 - z1) / 2.5));
      for (let i = 0; i <= n; i++) this.fx.burst(x1 + (x2 - x1) * i / n, 0.6, z1 + (z2 - z1) * i / n, color, 5, 4, 0.4);
      sfx('boom', 0.5); this.fx.shake(0.25);
      const P = this.player.pos, dx = x2 - x1, dz = z2 - z1, L = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((P.x - x1) * dx + (P.z - z1) * dz) / L));
      if (!this.dead && Math.hypot(P.x - (x1 + dx * t), P.z - (z1 + dz * t)) < w / 2) this.hurtPlayer(randRange(m.dmg[0], m.dmg[1]) * mult, m);
    });
  }

  bossPattern(m, name) {
    const a = m.actor, p = this.player.pos;
    if (this.bossPattern2(m, name)) return;
    const color = { spores: 0x9ad04a, slam: 0xff6a2a, volley: 0xa060ff, charge: 0xff4020 }[name];
    if (name === 'slam') {
      // 제자리에서 크게 내리친다
      a.act('attack2', 0.7);
      a.lock = 1.3;
      this.danger(m, m.pos.x, m.pos.z, 5.5, 1.2, 1.9, color);
    } else if (name === 'spores') {
      // 발밑과 둘레에 차례로 터진다
      a.act('attack', 0.8);
      for (let i = 0; i < 5; i++) {
        const ang = Math.random() * 6.28, r = i ? 2 + Math.random() * 4.5 : 0;
        this.later(i * 0.28, () => this.danger(m, this.player.pos.x + Math.cos(ang) * r, this.player.pos.z + Math.sin(ang) * r, 2.6, 1.1, 1.3, color));
      }
    } else if (name === 'summon') {
      const mine = this.monsters.filter((x) => !x.dead && x.owner === m).length;
      a.act('attack2', 0.8);
      sfx('cast');
      for (let i = mine; i < Math.min(4, mine + 2); i++) {
        const ang = Math.random() * 6.28;
        const x = m.pos.x + Math.cos(ang) * 3.5, z = m.pos.z + Math.sin(ang) * 3.5;
        this.fx.pillar(x, z, 0xc0a0ff, 0.6, 4, 1);
        const add = this.spawn({ zone: m.sp.zone, x, z, level: Math.max(1, m.level - 1), tier: 'normal', timer: 0, mon: null, forceType: m.def.minion });
        add.owner = m; add.state = 'chase'; add.exp *= 0.3; add.noLoot = true; if (m.dungeon) add.dungeon = true;
      }
    } else if (name === 'charge') {
      // 돌진: 잠깐 움츠렸다가 곧게 달려든다
      a.face(p.x, p.z);
      a.lock = 0.9;
      const dx = p.x - m.pos.x, dz = p.z - m.pos.z, l = Math.hypot(dx, dz) || 1;
      const to = { x: m.pos.x + (dx / l) * (l + 4), z: m.pos.z + (dz / l) * (l + 4) };
      this.fx.lane(m.pos.x, m.pos.z, to.x, to.z, 3.2, 0.9, color);
      this.later(0.9, () => { if (!m.dead) { m.dash = { to, t: 0.55, hit: false }; a.lock = 0; a.play('run', { force: true, speed: 1.6 }); } });
    } else if (name === 'volley') {
      a.act(m.def.atk || 'attack', 0.9);
      for (let i = 0; i < 5; i++) {
        this.later(0.35 + i * 0.22, () => {
          if (m.dead || this.dead) return;
          sfx('mshoot', 0.6);
          this.fx.projectile({ from: { x: m.pos.x, y: 1.6 * a.scale, z: m.pos.z }, target: this.player, color, size: 0.8, speed: 17,
            onHit: () => this.hurtPlayer(randRange(m.dmg[0], m.dmg[1]) * 0.6, m) });
        });
      }
    }
  }

  // 보스 전용 · 원거리 응징 패턴. 처리했으면 true
  bossPattern2(m, name) {
    const a = m.actor, P = () => this.player.pos, M = m.pos, C = 0xff5030;
    const toP = () => { const dx = P().x - M.x, dz = P().z - M.z, l = Math.hypot(dx, dz) || 1; return { x: dx / l, z: dz / l, l }; };
    const D = (x, z, r, t, k, c = C) => this.danger(m, x, z, r, t, k, c);
    const L = (x1, z1, x2, z2, w, t, k, c = C) => this.dangerLane(m, x1, z1, x2, z2, w, t, k, c);
    const at = (t, fn) => this.later(t, () => { if (!m.dead && !this.dead) fn(); });
    const cast = (anim = 'attack2', lock = 1) => { a.act(anim, 0.8); a.lock = lock; a.face(P().x, P().z); };
    switch (name) {
      // ── 원거리 응징 (멀리 있을 때) ──
      case 'leap': { // 플레이어 자리로 뛰어올라 내려찍기
        cast('attack2', 1.3); const x = P().x, z = P().z;
        D(x, z, 4.2, 1.1, 1.6, 0xff7a20);
        at(1.05, () => { M.x = x; M.z = z; this.fx.smoke.add({ x, y: 0.4, z, vy: 0.6, color: 0x4a3c30, size: 2, size1: 5, life: 0.9, cell: 'smoke', alpha: 0.5 }); });
        return true;
      }
      case 'snipe': { // 플레이어를 노리는 빠른 직선 셋
        cast('attack', 1.4);
        for (let i = 0; i < 3; i++) at(i * 0.45, () => { const v = toP(); L(M.x, M.z, M.x + v.x * (v.l + 6), M.z + v.z * (v.l + 6), 2, 0.75, 0.9, 0xff3a3a); });
        return true;
      }
      case 'fan': { // 부채꼴로 퍼지는 화살 다섯 줄
        cast(m.def.atk || 'attack', 1.0);
        const v = toP(), base = Math.atan2(v.x, v.z), R = v.l + 6;
        for (let i = -2; i <= 2; i++) { const g = base + i * 0.22; L(M.x, M.z, M.x + Math.sin(g) * R, M.z + Math.cos(g) * R, 1.5, 0.8, 0.8, 0xb070ff); }
        return true;
      }
      case 'hail': { // 플레이어 둘레에 쏟아지는 우박
        cast('attack2', 0.8);
        for (let i = 0; i < 8; i++) at(i * 0.18, () => { const ang = Math.random() * 6.28, r = i % 3 === 0 ? 0 : 1.5 + Math.random() * 3.5; D(P().x + Math.cos(ang) * r, P().z + Math.sin(ang) * r, 2.2, 0.9, 0.8, 0x80c8ff); });
        return true;
      }
      case 'pull': { // 끌어당긴 뒤 둘레를 내려친다
        cast('attack2', 1.6); const v = toP();
        this.fx.lane(M.x, M.z, P().x, P().z, 1.6, 0.6, 0x9a60ff);
        at(0.6, () => { const w = toP(), k = Math.max(0, w.l - 3); P().x -= w.x * k; P().z -= w.z * k; resolveCollision(this.stage, P(), 0.4); this.fx.shake(0.3); D(M.x, M.z, 4.5, 0.8, 1.3, 0xff6a2a); });
        return true;
      }
      // ── 보스 전용 ──
      case 'sporering': { cast(); const x = P().x, z = P().z; for (let i = 0; i < 8; i++) { const g = i / 8 * 6.28; D(x + Math.cos(g) * 4, z + Math.sin(g) * 4, 2.3, 1.2, 1.1, 0x9ad04a); } return true; }
      case 'tricharge': { for (let i = 0; i < 3; i++) at(i * 1.25, () => this.bossPattern(m, 'charge')); a.lock = 0.5; return true; }
      case 'bonespiral': { cast(); for (let i = 0; i < 14; i++) { const g = i * 0.9, r = 1.5 + i * 0.6; at(i * 0.09, () => D(M.x + Math.cos(g) * r, M.z + Math.sin(g) * r, 1.9, 0.9, 0.9, 0xd0d0ff)); } return true; }
      case 'breath': { cast('attack', 1.5); const v = toP(), b = Math.atan2(v.x, v.z); for (const o of [-0.45, 0, 0.45]) L(M.x, M.z, M.x + Math.sin(b + o) * 11, M.z + Math.cos(b + o) * 11, 2.6, 1.0, 1.2, 0xff6a20); return true; }
      case 'mines': { cast(); for (let w = 0; w < 2; w++) for (let i = 0; i < 6; i++) at(w * 1.1, () => { const g = Math.random() * 6.28, r = 2 + Math.random() * 7; D(P().x + Math.cos(g) * r * 0.6, P().z + Math.sin(g) * r * 0.6, 2, 1.4, 0.9, 0x60c070); }); return true; }
      case 'tongue': return this.bossPattern2(m, 'pull');
      case 'icelines': { cast('attack', 1.2); const v = toP(), nx = -v.z, nz = v.x; for (let i = -2; i <= 2; i++) at(Math.abs(i) * 0.25, () => L(M.x + nx * i * 3, M.z + nz * i * 3, M.x + nx * i * 3 + v.x * 14, M.z + nz * i * 3 + v.z * 14, 2, 0.9, 1, 0x80d8ff)); return true; }
      case 'avalanche': { cast(); const v = toP(), nx = -v.z, nz = v.x; for (let row = 1; row <= 6; row++) at(row * 0.22, () => { for (let j = -3; j <= 3; j++) { if ((j + 3) === (row * 5) % 7) continue; D(M.x + v.x * row * 2.2 + nx * j * 2, M.z + v.z * row * 2.2 + nz * j * 2, 1.3, 0.8, 1, 0xd0f0ff); } }); return true; }
      case 'quakerings': { cast('attack2', 1.4); for (let k = 0; k < 3; k++) { const r = 3 + k * 3, n = 6 + k * 4; at(k * 0.5, () => { for (let i = 0; i < n; i++) { const g = i / n * 6.28; D(M.x + Math.cos(g) * r, M.z + Math.sin(g) * r, 1.8, 0.9, 1.1, 0xc08040); } }); } return true; }
      case 'tailsweep': { cast('attack2', 1.1); for (let i = 0; i < 12; i++) { const g = i / 12 * 6.28; D(M.x + Math.cos(g) * 5.5, M.z + Math.sin(g) * 5.5, 2.4, 1.0, 1.3, 0xff8040); } return true; }
      case 'meteors': { cast(); for (let i = 0; i < 14; i++) at(i * 0.14, () => { const g = Math.random() * 6.28, r = Math.random() * 7; D(P().x + Math.cos(g) * r, P().z + Math.sin(g) * r, 2.2, 1.0, 1, 0xff4010); }); return true; }
      case 'cross': { cast('attack2', 1.2); for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L(M.x, M.z, M.x + x * 13, M.z + z * 13, 2.6, 1.0, 1.2, 0xff6040); return true; }
      case 'boulder': { cast('attack', 1); const x = P().x, z = P().z; D(x, z, 3.2, 1.2, 1.5, 0xa08060); at(1.2, () => { for (let i = 0; i < 4; i++) { const g = i * 1.57 + 0.78; D(x + Math.cos(g) * 4, z + Math.sin(g) * 4, 2.2, 0.7, 0.8, 0xa08060); } }); return true; }
      case 'webtrail': { cast(); for (let i = 0; i < 6; i++) at(i * 0.35, () => D(P().x, P().z, 2.1, 0.8, 0.9, 0xd0d0d0)); return true; }
      case 'xcross': { cast('attack2', 1.8); const d = [[1, 1], [-1, 1], [1, -1], [-1, -1]]; for (const [x, z] of d) L(M.x, M.z, M.x + x * 9, M.z + z * 9, 2.4, 0.9, 1.1, 0xa0ff60); at(1.0, () => { for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L(M.x, M.z, M.x + x * 13, M.z + z * 13, 2.4, 0.9, 1.1, 0xa0ff60); }); return true; }
      case 'grid': { cast(); const x0 = P().x, z0 = P().z; for (let w = 0; w < 2; w++) at(w * 1.1, () => { for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if ((i + j + w) % 2 === 0) D(x0 + i * 2.6, z0 + j * 2.6, 1.4, 0.9, 1, 0x8080ff); }); return true; }
      case 'cannons': { cast('attack', 1); for (let i = 0; i < 3; i++) at(i * 0.5, () => { const g = Math.random() * 6.28, x = P().x, z = P().z; L(x - Math.cos(g) * 12, z - Math.sin(g) * 12, x + Math.cos(g) * 12, z + Math.sin(g) * 12, 2.4, 1.0, 1.1, 0x60e0d0); }); return true; }
      case 'fissure': { cast('attack2', 1.2); const v = toP(); for (let i = 1; i <= 9; i++) at(i * 0.1, () => D(M.x + v.x * i * 1.8, M.z + v.z * i * 1.8, 1.8, 0.8, 1.2, 0xff5010)); return true; }
      case 'hellnova': { cast('attack2', 2.0); D(M.x, M.z, 9.5, 2.0, 1.8, 0xff2020); return true; }
    }
    return false;
  }

  dashStep(m, dt) {
    const ds = m.dash, p = this.player.pos;
    ds.t -= dt;
    this.stepToward(m.pos, ds.to, 26 * dt);
    m.actor.face(ds.to.x, ds.to.z);
    this.fx.smoke.add({ x: m.pos.x, y: 0.4, z: m.pos.z, vy: 0.6, color: 0x4a3c30, size: 1.6, size1: 3.4, life: 0.8, cell: 'smoke', alpha: 0.4 });
    if (!ds.hit && dist2(m.pos, p) < 2.2) { ds.hit = true; this.fx.shake(0.45); this.hurtPlayer(randRange(m.dmg[0], m.dmg[1]) * 1.7, m); }
    resolveCollision(this.stage, m.pos, 0.5 * m.actor.scale);
    if (ds.t <= 0 || dist2(m.pos, ds.to) < 0.6) { m.dash = null; m.atkT = 0.8; }
    m.actor.update(0);
  }

  hurtPlayer(raw, m) {
    if (this.dead) return;
    const st = this.st, d = this.d;
    const rf = rewardFactor(st, m.level);
    const apMult = rf.ap * this.autoMult;
    const head = this.player.pos.clone().setY(2.4);
    if (Math.random() < d.dodge) {
      this.fx.text(head, '회피', 'miss');
      sfx('dodge');
      addAP(st, 'dex', AP_TABLE.dodge, apMult);
      this.perk('dodge');
      return;
    }
    let dmg = raw * (1 - damageReduction(d.armor, m.level));
    if (d.block && Math.random() < d.block) {
      dmg *= 0.3;
      this.fx.text(head, '막기', 'miss');
      sfx('block');
      addAP(st, 'vit', AP_TABLE.blockVit, apMult);
      addAP(st, 'str', AP_TABLE.blockStr, apMult);
      this.perk('block');
    }
    if (this.pbuffs?.ward?.t > 0) dmg *= 1 - this.pbuffs.ward.v / 100;
    const sh = this.buffs.shield;
    if (sh && sh.t > 0 && sh.v > 0) {
      const ab = Math.min(sh.v, dmg);
      sh.v -= ab; dmg -= ab;
      if (sh.v <= 0) sh.t = 0;
    }
    dmg = Math.max(1, Math.round(dmg));
    st.hp -= dmg;
    addAP(st, 'vit', (dmg / d.maxHp) * AP_TABLE.hurtScale, apMult);
    this.perk('hurt');
    this.player.hitFlash(0xff2000);
    this.fx.burst(this.player.pos.x, 1.2, this.player.pos.z, 0xff3020, 5, 2.5, 0.3);
    if (dmg > d.maxHp * 0.15) this.fx.shake(0.35);
    sfx('hurt');
    this.fx.text(head, `-${dmg}`, 'hurt');
    if (st.hp <= 0) this.die();
  }

  // ───────── 플레이어가 주는 피해 ─────────

  get autoMult() { return this.auto ? CONFIG.autoPenalty : 1; }

  rollWeapon() {
    const d = this.d;
    let v = randRange(d.dmg[0], d.dmg[1]);
    const crit = Math.random() < d.crit;
    if (crit) v *= d.critMult;
    return { v, crit };
  }

  // src: melee · ranged · magic(완드 기본공격) · skill
  hitMonster(m, raw, { crit = false, src = 'melee', ctx = null, pierce = 0 } = {}) {
    if (!m || m.dead) return;
    if (ctx?.slow) m.slowT = Math.max(m.slowT || 0, ctx.slow);
    const kind = this.d.cls.kind;
    if (src === 'melee' && !ctx && kind === 'melee') this.perk('meleeHit');
    if ((src === 'ranged' || (src === 'melee' && kind === 'ranged')) && !ctx) this.perk('rangedHit');
    if (crit) this.perk('crit');
    const st = this.st, d = this.d;
    const rf = rewardFactor(st, m.level);
    const apMult = rf.ap * this.autoMult;
    if (m.tier === 'boss' && m.fightStart == null) m.fightStart = this.time;
    const dexN = st.dex?.[m.type] || 0; raw *= 1 + (dexN >= 500 ? 0.06 : dexN >= 200 ? 0.04 : dexN >= 50 ? 0.02 : 0);
    let red = m.armor / (m.armor + 60) * (1 - pierce);
    if (m.def.behave === 'shield' && !ctx?.spell) {
      const P = this.player.pos, f = m.actor.facing, ang = Math.atan2(P.x - m.pos.x, P.z - m.pos.z);
      if (Math.abs(Math.atan2(Math.sin(ang - f), Math.cos(ang - f))) < 1.0) { red = 1 - (1 - red) * 0.4; if (Math.random() < 0.3) this.fx.text(m.pos.clone().setY(2.2), '막음', 'miss'); }
    }
    const dmg = Math.max(1, Math.round(raw * (1 - red)));
    m.hp -= dmg;
    m.showHp = 6;
    this.lastHit = m;
    if (m.state !== 'return') m.state = 'chase';
    m.actor.hitFlash(crit ? 0xffd040 : 0xffffff);
    const head = m.pos.clone().setY(2.3 * m.actor.scale);
    this.fx.text(head, crit ? `${dmg}!` : String(dmg), crit ? 'crit' : '');
    sfx('hit', 1, m.fam);
    if (crit) sfx('crit', 0.8);
    const hc = ctx ? new THREE.Color(SKILLS[ctx.id].color).getHex() : crit ? 0xffd040 : 0xffa060;
    this.fx.hit(m.pos.x, 1.1 * m.actor.scale, m.pos.z, hc, crit);
    if (ctx) { this.fx.burst(m.pos.x, 1.1 * m.actor.scale, m.pos.z, hc, 10, 4, 0.45); this.fx.decal(0, m.pos.x, m.pos.z, 1.6 * m.actor.scale, hc, 0.3); }
    if (d.lifeSteal) this.healPlayer(dmg * d.lifeSteal, false);
    if (crit) addAP(st, 'dex', AP_TABLE.crit, apMult);

    // 행동 기록
    const cls = d.cls;
    if (src === 'melee' || (ctx && SKILLS[ctx.id].ap === 'weapon')) {
      if (cls.kind === 'ranged') { addAP(st, 'dex', AP_TABLE.rangedHit, apMult); addAP(st, 'str', AP_TABLE.rangedHitSide, apMult); }
      else if (cls.kind === 'magic') addAP(st, 'int', AP_TABLE.magicBasicHit, apMult);
      else { addAP(st, cls.ap, AP_TABLE.meleeHit, apMult); addAP(st, cls.side, AP_TABLE.meleeHitSide, apMult); }
    } else if (src === 'ranged') {
      addAP(st, 'dex', AP_TABLE.rangedHit, apMult); addAP(st, 'str', AP_TABLE.rangedHitSide, apMult);
    } else if (src === 'magic') {
      addAP(st, 'int', AP_TABLE.magicBasicHit, apMult);
    }
    if (ctx) {
      const sk = SKILLS[ctx.id];
      if (sk.ap === 'int' && !ctx.apGiven) { addAP(st, sk.apStat || 'int', ctx.mp * AP_TABLE.spellPerMp, apMult); ctx.apGiven = true; }
      if (ctx.hits++ < 3) this.skillExp(ctx.id, 1, rf);
    }
    if (m.hp <= 0) this.killMonster(m, src, ctx, rf);
    else if (m.actor.lock <= 0 && !m.dash && m.tier !== 'boss' && Math.random() < 0.35) m.actor.act('hit', 1.4, 0.6);
  }

  skillExp(id, amount, rf = { ap: 1 }) {
    const mult = this.d.skillExp * this.autoMult * (rf.ap > 0 ? 1 : 0.2);
    const ups = addSkillExp(this.st, id, amount * mult);
    if (ups) {
      const s = this.st.skills[id];
      this.ui.toast(`${SKILLS[id].name} 숙련 상승! 랭크 ${s.rank}`, '#ffd84a');
      sfx('rankup');
      this.fx.ring(this.player.pos.x, this.player.pos.z, 3, 0xffd84a, 0.7);
      this.ui.dirty();
    }
  }

  killMonster(m, src, ctx, rf) {
    m.dead = true;
    if (src !== 'perk') this.perk('kill');
    m.hp = 0;
    const st = this.st, d = this.d;
    st.kills = (st.kills || 0) + 1;
    const apMult = rf.ap * this.autoMult;
    m.dash = null;
    m.actor.play('death', { once: true, force: true, fade: 0.1 });
    sfx('mdie', 1, m.fam);
    this.onKill?.(m);
    // 보스가 쓰러지면 불러낸 무리도 사라진다
    if (m.tier === 'boss') for (const x of this.monsters) if (x.owner === m && !x.dead) { x.noLoot = true; x.exp = 0; this.later(0.3, () => { if (!x.dead) this.hitMonster(x, 99999, { src: 'none' }); }); }
    m.actor.lock = 99;
    m.deadT = 3.2;
    this.fx.burst(m.pos.x, 0.8 * m.actor.scale, m.pos.z, m.tier === 'boss' ? 0xffd060 : 0xb0a0ff, m.tier === 'normal' ? 6 : 24, 3, 0.35);
    if (m.tier === 'boss') { this.fx.pillar(m.pos.x, m.pos.z, 0xffd060, 1.6, 10, 2); this.fx.shake(0.6); }
    m.sp.mon = null;
    m.sp.timer = m.tier === 'boss' ? CONFIG.bossRespawn : m.tier === 'named' ? CONFIG.namedRespawn : CONFIG.respawnTime;
    if (this.target === m) this.target = null;

    // AP: 처치
    if (src === 'melee' || (ctx && SKILLS[ctx.id].ap === 'weapon')) addAP(st, d.cls.kind === 'melee' ? d.cls.ap : d.cls.ap, AP_TABLE.meleeKill, apMult);
    if (st.hp / d.maxHp < 0.3) addAP(st, 'vit', AP_TABLE.lowHpKill, apMult);
    if (ctx) this.skillExp(ctx.id, 2, rf);

    // EXP → 각성
    // 처치 연쇄: 2.5초 안에 이어 잡으면 쌓이고, 쌓일수록 경험 +2% (최대 +40%), 10연쇄마다 잠깐 빨라진다
    this.chain = this.time - (this.lastKillT ?? -9) < 2.5 ? (this.chain || 0) + 1 : 1;
    (st.dex ||= {})[m.type] = (st.dex[m.type] || 0) + 1;
    if (m.golden) {
      const lv = m.level;
      for (let i = 0; i < 3; i++) this.dropGround({ kind: 'item', item: makeItem(`gem_${['ruby', 'emerald', 'sapphire', 'amethyst', 'diamond'][Math.floor(Math.random() * 5)]}_${gemGradeFor(lv)}`, { qty: 1 }, st) }, m.pos.x + i - 1, m.pos.z + 1);
      this.dropGround({ kind: 'gold', amount: lv * 120 }, m.pos.x, m.pos.z - 1);
      this.dropGround({ kind: 'item', item: makeItem(rollBase(lv), { rarity: 'rare', ilvl: lv }, st) }, m.pos.x + 1, m.pos.z - 1);
      this.fx.pillar(m.pos.x, m.pos.z, 0xffd040, 1.8, 6, 1.5); this.ui.toast(`${m.name} 처치!`, '#ffd040');
    }
    if (m.tier === 'boss' && m.fightStart != null && !m.dungeon && m.sp?.zone) {
      const secs = Math.max(1, Math.round(this.time - m.fightStart)), br = ((st.bossRec ||= {})[m.sp.zone.id] ||= { first: Date.now(), best: null, kills: 0 });
      br.kills++;
      if (!br.best || secs < br.best) { br.best = secs; this.ui.toast(`${m.name} 최단 기록 ${secs}초!`, '#ffd84a'); }
    }
    const rec = (st.rec ||= {}); rec.kills = (rec.kills || 0) + 1; rec.chain = Math.max(rec.chain || 0, this.chain);
    this.lastKillT = this.time;
    if (this.chain >= 3) this.fx.text(this.player.pos.clone().setY(3.2), `연쇄 ${this.chain}`, this.chain >= 10 ? 'crit' : 'heal');
    if (this.chain % 10 === 0) { this.chainSpdT = 5; sfx('buff', 0.6); }
    const exp = m.exp * rf.exp * this.autoMult * (1 + Math.min(20, this.chain) * 0.02) * (this.night > 0.5 ? 1.2 : 1);
    const results = gainExp(st, exp * (1 + researchK(st, 'exp')));
    for (const r of results) this.onAwaken(r);

    // 드랍
    const drops = m.noLoot ? [] : rollLoot(m, { auto: this.auto, magicFind: d.magicFind + researchK(st, 'luck'), goldFind: d.goldFind * (1 + researchK(st, 'gold')) }, st);
    drops.forEach((dr, i) => {
      const a = (i / Math.max(1, drops.length)) * Math.PI * 2 + Math.random();
      const r = drops.length > 1 ? 1.2 + Math.random() : 0.6;
      this.dropGround(dr, m.pos.x + Math.cos(a) * r, m.pos.z + Math.sin(a) * r);
    });
    // 득템 연출: 영웅은 소리, 전설은 화면이 울리고 알림
    const best = drops.map((dr) => dr.item?.rarity).find((r) => r === 'legend') || drops.map((dr) => dr.item?.rarity).find((r) => r === 'hero');
    if (best === 'legend') (st.rec ||= {}).legends = (st.rec.legends || 0) + 1;
    if (best === 'legend') { this.fx.shake(0.4); this.fx.pillar(m.pos.x, m.pos.z, 0x41e07a, 2.2, 6, 2); sfx('rare'); this.ui.toast('전설 장비!', '#41e07a'); }
    else if (best === 'hero') { sfx('rare', 0.8); this.fx.pillar(m.pos.x, m.pos.z, 0xff9a3c, 1.2, 4, 1); }
    if (m.tier !== 'normal') this.ui.log(`${m.name} 처치!`, TIERS[m.tier].color);
    if (!m.dungeon && m.tier === 'boss') (st.rec ||= {}).bosses = (st.rec.bosses || 0) + 1;
    if (!m.dungeon && m.tier === 'boss' && m.sp?.zone?.id === 'demongate' && (st.worldTier || 1) < 3 && (st.maxTier || 1) <= (st.worldTier || 1) && (st.dungeons?.demongate || 0) >= 3 * (st.worldTier || 1)) { // 악마의 관문 던전 3 · 6단계를 돌파해야
      st.maxTier = (st.worldTier || 1) + 1; this.ui.toast(`세계 ${TIER_NAMES[st.maxTier - 1]} 단계가 열렸습니다`, '#ff9a6a'); sfx('awaken');
    }
    if (!m.dungeon && !m.noLoot && m.tier === 'boss' && Math.random() < 0.3) { // 보스가 가끔 열쇠
      if (addItem(st, makeItem('dungeon_key', { qty: 1 }, st))) { this.ui.toast('던전 열쇠를 얻었습니다', '#ffd84a'); sfx('rare', 0.7); }
    }
    if (m.dungeon && m.tier === 'boss' && this.dungeon) this.dungeonCleared(m);
    if (!m.noLoot) this.dailyDone(dailyProgress(st, { kind: 'kill', zone: m.dungeon ? null : m.sp?.zone?.id, tier: m.tier }));
    // 강화석: 강한 몬스터는 가끔, 일반 몬스터는 아주 가끔
    if (!m.noLoot) {
      const oc = { normal: 0.015, elite: 0.12, named: 0.3, boss: 0.6 }[m.tier] || 0;
      if (Math.random() < oc * this.autoMult) {
        const n = (m.tier === 'boss' ? 3 : m.tier === 'named' ? 2 : 1) + Math.floor(Math.random() * (1 + m.level / 15));
        townOf(st).ore += n; this.fx.text(m.pos.clone().setY(2.6), `+${n} 강화석`, 'gold'); this.ui.log(`강화석 +${n}`, '#d8e8ff'); this.ui.dirty();
      }
    }
    const zid = m.sp?.zone?.id, got = zid && !m.noLoot ? dropMats(st, zid, m.tier) : 0;
    if (zid && !m.dungeon && !m.noLoot && liberateAdd(st, zid, m.tier)) {
      const zn = ALL_ZONES.find((z) => z.id === zid);
      this.ui.toast(`${zn.name} 해방! 여관에서 용병을 보낼 수 있습니다`, '#7fe07a'); sfx('awaken');
      this.fx.pillar(this.player.pos.x, this.player.pos.z, 0x7fe07a, 2, 6, 2);
    }
    if (got) { this.matLog = (this.matLog || 0) + got; this.fx.text(m.pos.clone().setY(2.2), `+${got} ${MATERIALS[zid].name}`, 'heal'); if (m.tier !== 'normal') this.ui.log(`${MATERIALS[zid].name} +${got}`, '#c8e08a'); }
    this.ui.dirty();
  }

  onAwaken(r) {
    const d0 = this.d;
    this.d = derive(this.st, this.buffValues());
    // 각성하면 늘어난 만큼 회복
    this.st.hp = Math.min(this.d.maxHp, this.st.hp + (this.d.maxHp - d0.maxHp) + this.d.maxHp * 0.3);
    this.gainMp(this.d.maxMp * 0.3, false);
    this.fx.pillar(this.player.pos.x, this.player.pos.z, 0xffd060, 1.6);
    this.fx.burst(this.player.pos.x, 1.5, this.player.pos.z, 0xffe080, 30, 7, 0.5);
    this.ui.awaken(r);
    const ti = TITLE_AT.indexOf(r.n);
    if (ti >= 0) this.later(1.2, () => this.offerTitle(ti));
    sfx('awaken');
  }

  healPlayer(v, show = true) {
    const st = this.st;
    const before = st.hp;
    st.hp = Math.min(this.d.maxHp, st.hp + v);
    if (show && st.hp - before >= 1) this.fx.text(this.player.pos.clone().setY(2.6), `+${Math.round(st.hp - before)}`, 'heal');
  }

  // ───────── 바닥 아이템 ─────────

  dropGround(dr, x, z, expires = null) {
    ({ x, z } = this.freeSpot(x, z, 0.5)); // 언덕 · 물 · 벽 위에는 떨어뜨리지 않는다
    const g = { gid: this.nextGid++, kind: dr.kind, amount: dr.amount, item: dr.item, x, z, expires, born: this.time };
    let look = LOOT_LOOK.gold, color = 0xffd040, beam = false, rank = 0;
    if (dr.kind === 'item') {
      const it = dr.item, b = BASES[it.base];
      color = new THREE.Color(itemColor(it)).getHex();
      if (isBook(it) || it.shard) { look = LOOT_LOOK.book; beam = true; }
      else if (b.type === 'potion') look = b.restore.hp ? LOOT_LOOK.potion_hp : LOOT_LOOK.potion_mp;
      else if (b.slot === 'weapon') look = LOOT_LOOK.weapon[b.cls] || 'longsword';
      else look = LOOT_LOOK[b.slot] || 'leather_armor';
      rank = it.rarity ? RARITY_ORDER.indexOf(it.rarity) : isBook(it) || it.shard ? 3 : 0;
      if (rank >= 2) beam = true;
      if (rank >= 1) this.fx.decal(0, x, z, 1.2 + rank * 0.6, color, 0.6);
    } else if (dr.amount > 60) look = 'coins100';
    if (beam && !expires) setTimeout(() => sfx('rare'), 250);
    const def = DATA.loot[look] || DATA.loot.coins25;
    if (def) image(animImage(def, 'power'));
    const css = '#' + new THREE.Color(color).getHexString();
    // 바닥에 떨어지는 Flare 아이템 그림 + 빛 + 좋은 것은 빛기둥
    g.drawable = { z, draw: (ctx, st) => {
      const p = st.toScreen(x, z), k = st.scale();
      const pulse = 0.55 + Math.sin(this.time * 4 + g.gid) * 0.2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = pulse * (0.4 + rank * 0.15);
      // 좋은 것일수록 크고 밝게 · 전설은 반짝이는 알갱이가 오른다
      if (rank >= 3 && Math.random() < 0.08 + rank * 0.03) this.fx.add.add({ x: x + (Math.random() - 0.5), y: 0.2, z: z + (Math.random() - 0.5) * 0.5, vy: 1.5 + Math.random(), color, size: 0.35, size1: 0.05, life: 0.9, cell: 'spark' });
      // 바닥 빛: 도형 대신 빛무리 그림 (좋은 것일수록 크게)
      if (rank >= 1 || beam) drawPowerFrame(ctx, st, 'sparkle', x, z, { scale: 0.45 + rank * 0.12, tint: color, t: this.time + g.gid, alpha: Math.min(1, pulse * 1.3) });
      if (beam) drawPowerFrame(ctx, st, 'immunity', x, z, { scale: 0.6 + rank * 0.1, tint: color, t: this.time * 0.6 + g.gid, alpha: pulse * 0.8 }); // 좋은 것: 빛 소용돌이
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (!def) return;
      const a = def.anims.power || Object.values(def.anims)[0];
      const src = image(animImage(def, 'power'));
      if (src.ok) drawRect(ctx, src.im, a.f[0]?.[frameIndex(a, this.time - g.born, true)], p.x, p.y, k * 0.75);
    } };
    this.scene.add(g.drawable);
    g.label = dr.kind === 'gold' ? `${dr.amount} 골드` : itemName(dr.item) + (dr.item.qty > 1 ? ` ×${dr.item.qty}` : '');
    g.color = dr.kind === 'gold' ? '#ffd040' : itemColor(dr.item);
    this.ground.push(g);
    return g;
  }

  pickup(g) {
    const st = this.st;
    if (g.kind === 'gold') {
      st.gold += g.amount;
      this.fx.text(this.player.pos.clone().setY(2.4), `+${g.amount}G`, 'gold');
      sfx('coin');
    } else {
      if (!addItem(st, g.item)) {
        if (this.time - (this.fullMsgT || -9) > 3) { this.ui.toast('가방이 가득 찼습니다'); this.fullMsgT = this.time; }
        return false;
      }
      this.ui.log(`획득: ${g.label}`, g.color);
      sfx('pickup');
      if (isBook(g.item)) this.ui.toast(`스킬북 획득! 가방에서 배울 수 있습니다 — ${SKILLS[g.item.book].name}`, g.color);
    }
    this.removeGround(g);
    this.ui.dirty();
    return true;
  }

  removeGround(g) {
    this.scene.remove(g.drawable);
    this.ground.splice(this.ground.indexOf(g), 1);
  }

  restoreGround() {
    const now = Date.now();
    this.st.ground = (this.st.ground || []).filter((g) => g.expires > now);
    for (const g of this.st.ground) this.dropGround({ kind: 'item', item: g.item }, g.x, g.z, g.expires);
  }

  saveGround() {
    this.st.ground = this.ground.filter((g) => g.expires).map((g) => ({ item: g.item, x: g.x, z: g.z, expires: g.expires }));
  }

  // ───────── 사망 ─────────

  die() {
    if (this.dead) return;
    this.dead = true;
    if (this.auto) { const zn = zoneAt(this.player.pos.x, this.player.pos.z); if (zn) (this.autoDeaths ||= []).push({ t: this.time, z: zn.id }); }
    this.st.hp = 0;
    this.target = null; this.moveTo = null; this.pendingSkill = null; this.recallT = 0;
    this.player.play('death', { once: true, force: true, fade: 0.1 });
    sfx('death');
    this.player.lock = 99;
    const lost = rollDeathDrop(this.st);
    if (lost) {
      const g = this.dropGround({ kind: 'item', item: lost }, this.player.pos.x + 1.8, this.player.pos.z, Date.now() + CONFIG.deathItemLifetime * 1000);
      g.deathDrop = true;
      this.refreshGear();
    }
    this.saveGround();
    this.ui.death(lost ? itemName(lost) : null, lost ? itemColor(lost) : null);
  }

  revive() {
    this.leaveDungeon(true);
    this.dead = false;
    this.player.lock = 0;
    this.player.pos.set(0, 0, 4);
    this.d = derive(this.st, this.buffValues());
    this.st.hp = this.d.maxHp;
    this.st.mp = this.d.maxMp;
    this.player.play('idle', { force: true });
    for (const m of this.monsters) if (m.state === 'chase') m.state = 'return';
    this.ui.dirty();
  }

  // ───────── 명령 (입력 · 자동 사냥에서 호출) ─────────

  manual() { this.autoPause = 1.6; }

  cmdMove(x, z) {
    if (this.dead) return;
    this.moveTo = { x, z };
    // 막혀 있으면 돌아가는 길 (가까운 곳만)
    const P = this.player.pos;
    this.movePath = dist2(P, this.moveTo) < 45 && !clearLine(this.stage, P, this.moveTo, 0.5) ? findPath(this.stage, P, this.moveTo, 0.5, 2500) : null;
    this.target = null;
    this.pendingSkill = null;
    this.cancelRecall();
  }

  cmdAttack(m) {
    if (this.dead || !m || m.dead) return;
    this.target = m;
    this.locked = m;
    this.moveTo = null;
  }

  // 공격 단추: 타겟 고정이 켜져 있으면 이동해도 공격하던 대상을 다시 잡는다
  attackButton() {
    const lock = this.st.settings.targetLock !== false;
    const t = this.target && !this.target.dead ? this.target
      : lock && this.locked && !this.locked.dead && dist2(this.locked.pos, this.player.pos) < 20 ? this.locked : null;
    if (t) this.cmdAttack(t); else this.cmdAttackNearest();
  }

  cmdAttackNearest() {
    const m = this.nearestMonster(14);
    if (m) this.cmdAttack(m);
    else this.ui.toast('주변에 적이 없습니다');
  }

  setJoy(x, y) {
    this.joy.set(x, y);
    if (this.joy.lengthSq() > 0.01) { this.moveTo = null; this.target = null; this.pendingSkill = null; this.cancelRecall(); this.manual(); }
  }

  nearestMonster(range, from = this.player.pos, exclude = null, filter = null) {
    let best = null, bd = range;
    for (const m of this.monsters) {
      if (m.dead || m === exclude || !m.near || m.ignoreUntil > this.time || (filter && !filter(m))) continue;
      if (dist2(m.pos, TOWN) < TOWN.r) continue;
      const d = dist2(m.pos, from);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  monstersNear(pos, r) {
    return this.monsters.filter((m) => !m.dead && dist2(m.pos, pos) <= r);
  }

  usePotion(kind, quiet = false) {
    if (this.dead || this.potionCd > 0) return false;
    const st = this.st;
    const ids = kind === 'hp' ? ['hp_potion_l', 'hp_potion'] : ['mp_potion_l', 'mp_potion'];
    const missing = kind === 'hp' ? this.d.maxHp - st.hp : this.d.maxMp - st.mp;
    // 가방에서 정해 둔 물약이 있으면 그것, 없으면 부족한 양에 맞는 물약을 먼저
    const pick = st.potSlot?.[kind];
    const order = pick ? [pick] : missing > 150 ? ids : [...ids].reverse();
    const id = order.find((i) => countOf(st, i) > 0);
    if (!id) { if (!quiet) this.ui.toast(kind === 'hp' ? '체력 물약이 없습니다' : '마나 물약이 없습니다'); else this.potionCd = 3; return false; }
    takeOne(st, id);
    const r = BASES[id].restore;
    const rk = 1 + researchK(st, 'potion');
    if (r.hp) this.healPlayer(r.hp * rk);
    if (r.mp) { this.gainMp(r.mp * rk); this.fx.text(this.player.pos.clone().setY(2.6), `+${r.mp}`, 'mana'); }
    this.fx.burst(this.player.pos.x, 1.2, this.player.pos.z, r.hp ? 0xff4050 : 0x4080ff, 8, 2);
    sfx('potion');
    this.potionCd = 0.8;
    this.ui.dirty();
    return true;
  }

  // MP를 회복하면 정신이 오른다 (마을 안 회복은 세지 않는다)
  gainMp(v, count = true) {
    const st = this.st;
    const got = Math.min(this.d.maxMp - st.mp, v);
    if (got <= 0) return;
    st.mp += got;
    if (count && !this.inTown) addAP(st, 'wis', got * AP_TABLE.mpRecover, this.autoMult);
  }

  recall() {
    if (this.dead || this.inTown) return;
    this.target = null; this.moveTo = null; this.pendingSkill = null;
    this.recallT = 1.6;
    this.player.play('channel', { force: true });
    // 옆에 귀환 포탈이 열린다
    const P = this.player.pos, a = this.player.facing + Math.PI / 2;
    this.recallPortal = this.fx.portal(P.x + Math.sin(a) * 1.6, P.z + Math.cos(a) * 1.6, 1.9);
    this.ui.toast('마을로 귀환합니다…');
    sfx('recall');
  }

  cancelRecall() {
    if (this.recallT > 0) { this.recallT = 0; this.ui.toast('귀환 취소'); if (this.recallPortal) this.recallPortal.t = this.recallPortal.dur - 0.3; }
  }

  // 자동 사냥 지역: 권장 각성((최저 위험도 - 1) × 2)을 넘긴 가장 깊은 곳, 최근 10분에 그곳에서 3번 넘게 죽었으면 한 칸 아래
  // 자동 사냥 구역 안인가
  inAutoArea(p) {
    const A = this.autoArea;
    if (!A) return true;
    if (A.dungeon != null) return !!this.dungeon;
    return zoneAt(p.x, p.z)?.id === A.zone.id;
  }
  // 자동 사냥 이동: 막혀 있으면 길을 찾아 따라간다
  autoGo(dest) {
    const P = this.player.pos;
    this.moveTo = dest; this.target = null;
    this.movePath = clearLine(this.stage, P, dest, 0.5) ? null : findPath(this.stage, P, dest, 0.5, 4000);
  }
  autoZone() {
    const st = this.st, ok = ZONES.filter((z) => st.awakenings >= (z.levels[0] + this.tierOffset - 1) * 2);
    let i = Math.max(0, ok.length - 1);
    this.autoDeaths = (this.autoDeaths || []).filter((x) => this.time - x.t < 600);
    while (i > 0 && this.autoDeaths.filter((x) => x.z === ZONES[i].id).length >= 3) i--;
    return ZONES[i];
  }
  // 마을에서 가방 정리: 스킬북 · 물약 · 세트 장비 · 착용 장비보다 좋을 수 있는 영웅 이상은 남기고 판다
  autoSell() {
    const st = this.st;
    let g = 0, n = 0;
    st.inv = st.inv.filter((it) => {
      if (it.book || !BASES[it.base]?.slot || it.set || it.rarity === 'hero' || it.rarity === 'legend') return true;
      g += itemValue(it); n++; return false;
    });
    if (n) { st.gold += g; this.ui.log(`자동 판매: 장비 ${n}개 +${g.toLocaleString()}G`, '#ffd84a'); sfx('coin'); this.ui.dirty(); }
  }

  toggleAuto(on = !this.auto) {
    this.auto = on;
    this.autoPause = 0;
    // 자동 사냥은 켠 곳(지역 · 던전) 안에서만. 마을 · 황야에서 켜면 알맞은 사냥터
    if (on) { const P = this.player.pos, zn = zoneAt(P.x, P.z); this.autoArea = this.dungeon ? { dungeon: this.dungeon.zi } : zn ? { zone: zn } : { zone: this.autoZone() }; this.ui.log(`자동 사냥: ${this.dungeon ? '이 던전' : this.autoArea.zone.name}`, '#9a917f'); }
    this.ui.dirty();
  }

  // ───────── 스킬 ─────────

  skillReady(id) {
    const s = this.st.skills[id];
    if (!s) return { ok: false, why: '배우지 않은 스킬' };
    const sk = SKILLS[id];
    const v = skillValues(id, s.rank, modsOf(s));
    if ((this.cds[id] || 0) > 0) return { ok: false, why: '재사용 대기 중' };
    if (this.st.mp < v.mp) return { ok: false, why: 'MP가 부족합니다' };
    const kind = this.d.cls.kind;
    if (sk.needs === 'melee' && kind !== 'melee') return { ok: false, why: '검이 필요합니다' };
    if (sk.needs === 'melee' && !this.st.equip.weapon) return { ok: false, why: '검이 필요합니다' };
    if (sk.needs === 'bow' && kind !== 'ranged') return { ok: false, why: '활이 필요합니다' };
    if (!meetsReq(this.st, sk.req, this.d.stats)) return { ok: false, why: '스탯 조건이 부족합니다' };
    return { ok: true, v };
  }

  skillRange(id) {
    const sk = SKILLS[id];
    return sk.type === 'melee' ? this.d.range : sk.type === 'cone' ? sk.radius * 0.8 : sk.range || 0;
  }

  needsTarget(id) {
    return ['melee', 'bolt', 'arrow', 'chain', 'meteor', 'dash', 'line', 'rain', 'cone'].includes(SKILLS[id].type);
  }

  useSkill(id, silent = false) {
    if (this.dead || !id) return false;
    const r = this.skillReady(id);
    if (!r.ok) { if (!silent) { this.ui.toast(r.why); sfx('error'); } return false; }
    if (this.needsTarget(id)) {
      let t = this.target && !this.target.dead ? this.target : this.nearestMonster(this.skillRange(id) + 6);
      if (!t) { if (!silent) this.ui.toast('대상이 없습니다'); return false; }
      this.target = t;
      this.moveTo = null;
      if (dist2(t.pos, this.player.pos) > this.skillRange(id)) { this.pendingSkill = id; return true; }
    }
    if (this.actCd > 0 || (this.player.lock > 0.15 && this.swing <= 0)) { this.pendingSkill = id; return true; }
    this.castSkill(id, r.v);
    return true;
  }

  castSkill(id, v) {
    const st = this.st, d = this.d, sk = skillEff(id, modsOf(st.skills[id]));
    const P = this.player;
    this.pendingSkill = null;
    this.skillUsed = true;
    this.actCd = RECOVER.skill;
    st.mp -= v.mp;
    this.perk(sk.type === 'buff' ? 'buff' : sk.ap === 'int' ? 'spell' : 'skill', this.target?.pos);
    this.cds[id] = v.cd;
    if (!v.echoed) this.skillExp(id, 1);
    const ctx = { id, mp: v.mp, hits: 0, apGiven: false, slow: sk.slow };
    // 변형 「메아리」: 잠시 뒤 약하게 한 번 더
    if (sk.echo && !v.echoed) this.later(0.6, () => { if (!this.dead) this.castSkill(id, { ...v, mp: 0, power: v.power * sk.echo, echoed: true, cd: this.cds[id] }); });
    const t = this.target;
    if (t) P.face(t.pos.x, t.pos.z);
    // 혼합 기술: 둘째 스탯 1점당 피해 +1.2%, 쓸 때 그 스탯 행동 기록
    const mixK = sk.mix ? 1 + d.stats[sk.mix] * 0.012 : 1;
    if (sk.mix) addAP(st, sk.mix, v.mp * AP_TABLE.supportPerMp, this.autoMult);
    if (sk.apStat && sk.ap === 'weapon') addAP(st, sk.apStat, v.mp * AP_TABLE.supportPerMp, this.autoMult);
    const pw = v.power * mixK;
    const spell = () => randRange(0.9, 1.1) * pw * d.spellMult;
    const spellCrit = () => Math.random() < d.crit * 0.5;
    const weaponHit = () => { const w = this.rollWeapon(); return { v: w.v * pw, crit: w.crit }; };
    const color = new THREE.Color(sk.color).getHex();
    if (sk.type !== 'buff') this.fx.circle(P.pos.x, P.pos.z, 1.8, color, 0.9); // 버프는 따로 (보호막 · 오라)
    this.fx.castFlash(P.pos.x, P.pos.z, color);

    switch (sk.type) {
      case 'melee': {
        const dur = P.act(sk.anim === 'heavy' ? 'heavy' : 'attack2', 1.3);
        this.swing = dur * 0.8;
        sfx('heavy');
        this.later(dur * 0.4, () => {
          if (t && !t.dead && dist2(t.pos, P.pos) < d.range + 1.5) {
            const w = weaponHit();
            this.fx.slash(P.pos.x, P.pos.z, P.facing, color, d.range + 1.2, { tilt: 0.6, dur: 0.3 });
            this.fx.burst(t.pos.x, 1, t.pos.z, color, 16, 5, 0.5);
            this.fx.shake(0.2);
            this.hitMonster(t, w.v, { crit: w.crit, src: 'skill', ctx });
          }
        });
        break;
      }
      case 'spin': {
        const dur = P.act('spin', 1.6);
        this.swing = dur * 0.8;
        this.later(dur * 0.35, () => {
          sfx('spin');
          this.fx.slash(P.pos.x, P.pos.z, P.facing, color, sk.radius, { all: true, y: 0.9, dur: 0.35, tilt: 0 });
          this.fx.ring(P.pos.x, P.pos.z, sk.radius, color, 0.45);
          for (const m of this.monstersNear(P.pos, sk.radius)) { const w = weaponHit(); this.hitMonster(m, w.v, { crit: w.crit, src: 'skill', ctx }); }
          for (let h = 1; h < (sk.hits || 1); h++) this.later(h * 0.35, () => {
            sfx('spin');
            this.fx.slash(P.pos.x, P.pos.z, P.facing + h * 2, color, sk.radius, { all: true, y: 0.9, dur: 0.3, tilt: 0 });
            for (const m of this.monstersNear(P.pos, sk.radius)) { const w = weaponHit(); this.hitMonster(m, w.v, { crit: w.crit, src: 'skill', ctx }); }
          });
        });
        break;
      }
      case 'cleave': {
        const dur = P.act('heavy', 1.1);
        this.swing = dur * 0.8;
        this.later(dur * 0.45, () => {
          const ang = P.facing;
          sfx('slam');
          this.fx.cone(P.pos.x, P.pos.z, ang, sk.radius, color);
          this.fx.ring(P.pos.x + Math.sin(ang) * 2, P.pos.z + Math.cos(ang) * 2, 3, color, 0.4);
          this.fx.burst(P.pos.x + Math.sin(ang) * 2, 0.5, P.pos.z + Math.cos(ang) * 2, color, 16, 6, 0.5);
          this.fx.shake(0.3);
          for (const m of this.monstersNear(P.pos, sk.radius)) {
            const a = Math.atan2(m.pos.x - P.pos.x, m.pos.z - P.pos.z);
            if (Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang))) < 0.75) { const w = weaponHit(); this.hitMonster(m, w.v, { crit: w.crit, src: 'skill', ctx }); }
          }
        });
        break;
      }
      case 'bolt': {
        const dur = P.act('cast', 1.6);
        this.swing = dur * 0.7;
        sfx('cast', 0.7);
        this.later(dur * 0.35, () => {
          if (!t) return;
          sfx('fire', 0.7);
          this.fx.projectile({
            from: this.muzzle(), target: t, color, size: sk.splash ? 1.5 : 0.9, speed: 20,
            onHit: (tg) => {
              const at = tg.pos || tg;
              if (sk.splash) {
                sfx('boom', 0.7);
                this.fx.ring(at.x, at.z, sk.splash, color, 0.4);
                this.fx.burst(at.x, 1, at.z, color, 18, 6, 0.6);
                for (const m of this.monstersNear(at, sk.splash)) this.hitMonster(m, spell(), { crit: spellCrit(), src: 'skill', ctx, pierce: 0.5 });
              } else if (!tg.dead) { if (sk.slow) tg.slowT = sk.slow; this.hitMonster(tg, spell(), { crit: spellCrit(), src: 'skill', ctx, pierce: 0.5 }); }
            },
          });
        });
        break;
      }
      case 'arrow': {
        const dur = P.act('shoot', 1.5);
        this.swing = dur * 0.7;
        this.later(dur * 0.35, () => {
          sfx('shoot', 1.2);
          const targets = sk.count ? [t, ...this.monstersNear(P.pos, sk.range).filter((m) => m !== t)].filter(Boolean).slice(0, sk.count) : [t];
          for (const tg of targets) {
            if (!tg) continue;
            this.fx.projectile({
              from: this.muzzle(), target: tg, color, size: 0.7, speed: 32, bolt: true,
              onHit: (x) => { if (!x.dead) { const w = weaponHit(); this.hitMonster(x, w.v, { crit: w.crit, src: 'skill', ctx }); } },
            });
          }
        });
        break;
      }
      case 'chain': {
        const dur = P.act('cast', 1.6);
        this.swing = dur * 0.7;
        this.later(dur * 0.35, () => {
          if (!t || t.dead) return;
          const chain = [t];
          let cur = t;
          for (let i = 0; i < sk.jumps + Math.floor((st.skills[id].rank - 1) / 3); i++) {
            const n = this.monsters.filter((m) => !m.dead && !chain.includes(m) && dist2(m.pos, cur.pos) < 7).sort((a, b) => dist2(a.pos, cur.pos) - dist2(b.pos, cur.pos))[0];
            if (!n) break;
            chain.push(n); cur = n;
          }
          sfx('zap');
          this.fx.lightning([P.pos, ...chain.map((m) => m.pos)], color);
          chain.forEach((m, i) => this.hitMonster(m, spell() * Math.pow(0.85, i), { crit: spellCrit(), src: 'skill', ctx, pierce: 0.5 }));
        });
        break;
      }
      case 'meteor': {
        const dur = P.act('castUp', 1.2);
        this.swing = dur * 0.6;
        const at = { x: t.pos.x, z: t.pos.z };
        sfx('cast');
        this.fx.meteor(at.x, at.z, sk.radius, 1.0, () => {
          sfx('boom');
          for (const m of this.monstersNear(at, sk.radius)) this.hitMonster(m, spell(), { crit: spellCrit(), src: 'skill', ctx, pierce: 0.5 });
        });
        break;
      }
      case 'nova': {
        const dur = P.act('castUp', 1.2);
        this.swing = dur * 0.6;
        this.later(dur * 0.4, () => {
          sfx('ice');
          this.fx.ring(P.pos.x, P.pos.z, sk.radius, color, 0.7);
          this.fx.decal(0, P.pos.x, P.pos.z, sk.radius * 1.2, 0xffffff, 0.5, { grow: true });
          this.fx.burst(P.pos.x, 1, P.pos.z, color, 40, 12, 0.7);
          this.fx.shake(0.35);
          for (const m of this.monstersNear(P.pos, sk.radius)) { m.slowT = 4; this.hitMonster(m, spell(), { crit: spellCrit(), src: 'skill', ctx, pierce: 0.5 }); }
        });
        break;
      }
      case 'dash': {
        // 대상 바로 앞까지 미끄러지듯 달려가 벤다
        if (!t) break;
        const dx = t.pos.x - P.pos.x, dz = t.pos.z - P.pos.z, l = Math.hypot(dx, dz) || 1;
        const to = { x: t.pos.x - (dx / l) * 1.4, z: t.pos.z - (dz / l) * 1.4 };
        const from = { x: P.pos.x, z: P.pos.z };
        for (let i = 1; i <= 5; i++) this.later(i * 0.03, () => { P.pos.x = from.x + (to.x - from.x) * i / 5; P.pos.z = from.z + (to.z - from.z) * i / 5; this.fx.burst(P.pos.x, 0.6, P.pos.z, color, 2, 1, 0.3); });
        const dur = P.act('heavy', 1.5);
        this.swing = dur * 0.8;
        sfx('heavy');
        this.later(0.2, () => {
          this.fx.slash(P.pos.x, P.pos.z, P.facing, color, 3, { tilt: 0.5, dur: 0.3 });
          if (!t.dead) { const w = weaponHit(); this.fx.burst(t.pos.x, 1, t.pos.z, color, 14, 4, 0.5); this.hitMonster(t, w.v, { crit: w.crit, src: 'skill', ctx }); }
          for (const m of this.monstersNear(t.pos, 2.2)) if (m !== t) { const w = weaponHit(); this.hitMonster(m, w.v * 0.5, { crit: w.crit, src: 'skill', ctx }); }
        });
        break;
      }
      case 'line': {
        const dur = P.act('shoot', 1.5);
        this.swing = dur * 0.7;
        this.later(dur * 0.35, () => {
          if (t) P.face(t.pos.x, t.pos.z);
          const ang = P.facing, ux = Math.sin(ang), uz = Math.cos(ang);
          sfx('shoot', 1.3);
          const end = { x: P.pos.x + ux * sk.range, z: P.pos.z + uz * sk.range };
          this.fx.projectile({ from: this.muzzle(), target: { pos: new THREE.Vector3(end.x, 1.4, end.z) }, color, size: sk.width > 2 ? 2 : 1, speed: 40, bolt: true, onHit: () => {} });
          for (const m of this.monsters) {
            if (m.dead) continue;
            const px = m.pos.x - P.pos.x, pz = m.pos.z - P.pos.z;
            const along = px * ux + pz * uz, side = Math.abs(px * uz - pz * ux);
            if (along > 0 && along < sk.range && side < sk.width * 0.5 + 0.5 * m.actor.scale) {
              const w = weaponHit();
              this.later(along / 40, () => this.hitMonster(m, w.v, { crit: w.crit, src: 'skill', ctx }));
            }
          }
        });
        break;
      }
      case 'rain': {
        // 정한 자리에 몇 번 나눠 떨어진다
        const at = { x: t.pos.x, z: t.pos.z };
        this.fx.circle(at.x, at.z, sk.radius, color, 0.35 + sk.waves * 0.45);
        const dur = P.act(sk.ap === 'int' ? 'castUp' : 'shoot', 1.3);
        this.swing = dur * 0.6;
        sfx(sk.ap === 'int' ? 'cast' : 'shoot');
        for (let i = 0; i < sk.waves; i++) {
          this.later(0.35 + i * 0.45, () => {
            this.fx.ring(at.x, at.z, sk.radius, color, 0.35);
            for (let k = 0; k < 8; k++) {
              const a = Math.random() * 6.28, r = Math.random() * sk.radius, x = at.x + Math.cos(a) * r, z = at.z + Math.sin(a) * r;
              this.fx.projectile({ from: { x: x - 1, y: 9, z: z - 1 }, target: { x, z, pos: new THREE.Vector3(x, -1.1, z) }, color, size: 0.5, speed: 40, bolt: sk.ap !== 'int', trail: true, onHit: () => {} });
            }
            sfx(sk.ap === 'int' ? 'ice' : 'hit', 0.5);
            for (const m of this.monstersNear(at, sk.radius)) {
              if (sk.slow) m.slowT = sk.slow;
              if (sk.ap === 'int') this.hitMonster(m, spell(), { crit: spellCrit(), src: 'skill', ctx, pierce: 0.5 });
              else { const w = weaponHit(); this.hitMonster(m, w.v, { crit: w.crit, src: 'skill', ctx }); }
            }
          });
        }
        break;
      }
      case 'cone': {
        const dur = P.act('cast', 1.5);
        this.swing = dur * 0.7;
        this.later(dur * 0.35, () => {
          if (t) P.face(t.pos.x, t.pos.z);
          const ang = P.facing;
          sfx('fire');
          this.fx.cone(P.pos.x, P.pos.z, ang, sk.radius, color);
          for (const m of this.monstersNear(P.pos, sk.radius)) {
            const a = Math.atan2(m.pos.x - P.pos.x, m.pos.z - P.pos.z);
            if (Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang))) < 0.75) this.hitMonster(m, spell(), { crit: spellCrit(), src: 'skill', ctx, pierce: 0.5 });
          }
        });
        break;
      }
      case 'buff': {
        P.act('castUp', 1.4);
        this.swing = 0.3;
        addAP(st, sk.ap === 'weapon' ? d.cls.ap : sk.ap, v.mp * AP_TABLE.supportPerMp, this.autoMult);
        const val = sk.buff === 'shield' ? pw * d.healMult : pw;
        this.buffs[sk.buff] = { v: val, t: sk.duration, max: sk.duration, id };
        sfx('buff');
        // 쓸 때: 몸을 감싸는 빛 (폭발처럼 보이던 고리 대신). 지속 중에는 발밑 오라가 따라다닌다 (auraStep)
        { const q = this.fx.play('immunity', P.pos.x, P.pos.z, { y: 0.05, scale: 0.75, tint: color, alpha: 0.9, fade: true, dur: 0.9 }); if (q) q.follow = P.pos; }
        { const q = this.fx.play('sparkle', P.pos.x, P.pos.z, { y: 0.6, scale: 0.9, alpha: 1, dur: 0.8 }); if (q) q.follow = P.pos; }
        this.d = derive(st, this.buffValues());
        break;
      }
    }
    this.ui.dirty();
  }

  // 버프 오라: 걸린 버프가 있으면 발밑에 은은한 빛이 돌며 따라다닌다 (가장 오래 남은 버프 색)
  auraStep() {
    const P = this.player.pos, act = Object.values(this.buffs).filter((b) => b.t > 0 && b.id).sort((a, b) => b.t - a.t)[0];
    const key = act ? act.id : null;
    if (this.aura && (this.aura.key !== key || this.dead)) { this.aura.it.dur = 0; this.aura = null; }
    if (!act || this.dead) return;
    if (!this.aura) {
      const sk = SKILLS[act.id], c = new THREE.Color(sk.color), warm = c.r > c.b; // 따뜻한 색 = 주황 고리, 차가운 색 = 파란 고리
      const it = this.fx.play(warm ? 'shield_orange' : 'shield', P.x, P.z, { y: 0, scale: 0.5, loop: true, dur: 9999, alpha: 0.8 });
      if (!it) return;
      this.aura = { key, it };
    }
    const it = this.aura.it; it.x = P.x; it.z = P.z; it.drawable.z = P.z + 0.05;
    it.alpha = act.t < 2 ? 0.8 * (0.5 + 0.5 * Math.sin(this.time * 12)) : 0.8; // 끝나 갈 때 깜빡
  }

  // 쏘는 자리: 바라보는 쪽으로 몸 앞 (활 · 지팡이 끝)
  muzzle() {
    const P = this.player;
    return { x: P.pos.x + Math.sin(P.facing) * 0.75, y: 1.25, z: P.pos.z + Math.cos(P.facing) * 0.75 };
  }

  // ───────── 기본 공격 ─────────

  basicAttack(t) {
    const d = this.d, P = this.player;
    const interval = 1 / d.atkRate;
    this.atkCd = interval;
    this.actCd = Math.min(RECOVER.attack, interval * 0.7);
    P.face(t.pos.x, t.pos.z);
    const cls = d.cls;
    let anim;
    this.combo = (this.combo || 0) + 1;
    if (cls.kind === 'ranged') anim = 'shoot';
    else if (cls.kind === 'magic') anim = 'cast';
    else if (!this.st.equip.weapon) anim = this.combo % 2 ? 'punch' : 'punch2';
    else if (d.two) anim = this.combo % 2 ? 'heavy' : 'slash2';
    else anim = ['attack', 'attack2', 'attack3'][this.combo % 3];
    const clipDur = P.action(anim)?.getClip().duration || 1;
    const speed = Math.max(0.9, Math.min(2.6, clipDur / (interval * 0.92)));
    P.act(anim, speed, 0.9);
    sfx(cls.kind === 'ranged' ? 'shoot' : cls.kind === 'magic' ? 'magic' : d.two ? 'heavy' : 'swing', cls.kind === 'magic' ? 0.6 : 0.8);
    this.swing = interval * 0.5;
    this.later(interval * 0.42, () => {
      if (this.dead || t.dead) return;
      const w = this.rollWeapon();
      if (cls.kind === 'melee') {
        if (dist2(t.pos, P.pos) <= d.range + 1.2) {
          this.fx.slash(P.pos.x, P.pos.z, P.facing, w.crit ? 0xffe080 : 0xfff4e0, d.range + 0.4, { tilt: (this.combo % 2 ? 0.35 : -0.35) });
          this.hitMonster(t, w.v, { crit: w.crit, src: 'melee' });
        }
      } else {
        const magic = cls.kind === 'magic';
        this.fx.projectile({
          from: this.muzzle(), target: t, color: magic ? 0x80b0ff : 0xe0d0a0, size: magic ? 0.7 : 0.6,
          speed: magic ? 22 : 32, bolt: !magic,
          onHit: (x) => { if (!x.dead) this.hitMonster(x, w.v, { crit: w.crit, src: magic ? 'magic' : 'ranged' }); },
        });
      }
    });
  }

  // ───────── 자동 사냥 ─────────

  autoBrain() {
    const st = this.st, d = this.d, P = this.player.pos;
    if (st.hp / d.maxHp < st.settings.autoPotion) {
      // 물약이 떨어졌는데 위험하면 마을로 귀환
      if (!this.usePotion('hp') && countOf(st, 'hp_potion') + countOf(st, 'hp_potion_l') === 0 && st.hp / d.maxHp < 0.3 && this.recallT <= 0 && !this.inTown) {
        this.ui.log('물약이 없어 귀환합니다', '#ff9a6a');
        this.recall();
        return;
      }
    }
    if (this.recallT > 0) return;
    // 마을에선 쉬고, 물약이 모자라면 산다
    if (this.inTown) {
      if (st.settings.autoBuy !== false) for (const id of ['hp_potion', 'mp_potion']) {
        const want = id === 'hp_potion' ? 15 : 8;
        const have = countOf(st, id);
        const n = Math.min(want - have, Math.floor(st.gold / BASES[id].price));
        if (have < want && n > 0) {
          if (addItem(st, makeItem(id, { qty: n }, st))) { st.gold -= n * BASES[id].price; this.ui.log(`자동 구매: ${BASES[id].name} ×${n}`, '#9a917f'); this.ui.dirty(); }
        }
      }
      if (st.settings.autoSell !== false) this.autoSell();
      if (st.hp / d.maxHp < 0.95) { this.moveTo = null; this.target = null; return; }
    }
    if (st.mp / d.maxMp < 0.2) this.usePotion('mp');
    if (!this.inTown && st.inv.length >= bagSize(st) && st.settings.autoSell !== false && this.recallT <= 0) {
      this.ui.log('가방이 가득 차 귀환합니다', '#9a917f'); this.recall(); return;
    }
    // 가까운 전리품 먼저 (싸우는 중이 아닐 때)
    const fighting = this.monsters.some((m) => !m.dead && m.state === 'chase' && dist2(m.pos, P) < 6);
    if (!fighting) {
      const g = this.ground.filter((x) => !x.deathDrop && dist2(x, P) < 12).sort((a, b) => dist2(a, P) - dist2(b, P))[0];
      if (g && !(g.kind === 'item' && st.inv.length >= bagSize(st) && !BASES[g.item.base]?.stack)) {
        if (!this.moveTo || dist2(this.moveTo, g) > 0.5) this.autoGo({ x: g.x, z: g.z }); else this.target = null;
        return;
      }
    }
    if (this.target && !this.target.dead && !this.inAutoArea(this.target.pos)) this.target = null; // 구역 밖 몬스터는 쫓지 않는다
    if (!this.target || this.target.dead) {
      this.target = this.nearestMonster(18, P, null, (m) => this.inAutoArea(m.pos));
      if (!this.target) {
        // 가까이 없으면: 구역 안에서 가장 가까운 몬스터 쪽으로 (빈 곳만 돌아다니지 않게)
        const far = this.monsters.filter((m) => !m.dead && !(m.ignoreUntil > this.time) && m.tier !== 'boss' && this.inAutoArea(m.pos) && !(dist2(m.pos, TOWN) < TOWN.r)).sort((a, b) => dist2(a.pos, P) - dist2(b.pos, P))[0];
        const sp = !far && this.spawners.filter((q) => !q.mon && q.tier !== 'boss' && this.inAutoArea(q)).sort((a, b) => dist2(a, P) - dist2(b, P))[0]; // 다 잡았으면 곧 다시 나올 자리로
        const goal = far ? far.pos : sp;
        if (goal && (this.autoArea?.dungeon == null || far)) {
          if (!this.moveTo || dist2(this.moveTo, goal) > 4 || dist2(P, this.moveTo) < 2) this.autoGo({ x: goal.x, z: goal.z });
          return;
        }
        // 구역 안을 돌아다닌다 (구역 밖이면 먼저 돌아간다)
        if (!this.moveTo || dist2(P, this.moveTo) < 2 || (!this.movePath?.length && this.stuckT > 1)) {
          let dest;
          if (this.autoArea?.dungeon != null) {
            const Ld = dungeonLayout(this.dungeon.zi), cells = []; for (let k = 0; k < Ld.g.length; k++) if (Ld.g[k]) cells.push(k);
            const k = cells[Math.floor(Math.random() * cells.length)]; dest = cellPos(this.dungeon.zi, k % N, Math.floor(k / N));
          } else {
            const zn = this.autoArea?.zone || this.autoZone(), near = this.inAutoArea(P);
            for (let t = 0; t < 12; t++) {
              const a = Math.random() * Math.PI * 2, r = near ? 6 + Math.random() * 14 : Math.random() * zn.r * 0.5, c = near ? P : zn;
              dest = { x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r };
              if (zoneAt(dest.x, dest.z)?.id === zn.id && !blockedAt(this.stage, dest.x, dest.z, 0.6)) break;
            }
          }
          this.autoGo(dest);
        }
        return;
      }
      this.chasePath = null; this.chaseT = 0;
    }
    this.moveTo = null;
    // 스킬: 퀵슬롯 순서대로 쓸 수 있는 것
    for (const id of st.quick) {
      if (!id || !st.skills[id]) continue;
      const sk = SKILLS[id];
      const r = this.skillReady(id);
      if (!r.ok) continue;
      if (st.mp - r.v.mp < d.maxMp * 0.1) continue;
      if (sk.type === 'buff' && this.buffs[sk.buff]?.t > 0) continue;
      if ((sk.type === 'spin' || sk.type === 'nova') && this.monstersNear(P, sk.radius).length < 2 && !['named', 'boss'].includes(this.target.tier)) continue;
      if (sk.type === 'buff' && !this.monsters.some((m) => !m.dead && m.state === 'chase')) continue;
      if (this.useSkill(id, true)) return;
    }
  }

  // ───────── 매 프레임 ─────────

  later(t, fn) { this.timers.push({ t, fn }); }

  // 마을 울타리를 드나들 때는 가까운 문을 거친다
  waypoint(p, dest) {
    return dest; // 울타리를 없애서 문을 거칠 필요가 없다
    const R = TOWN.r;
    const inside = Math.hypot(p.x, p.z) < R;
    if (inside === Math.hypot(dest.x, dest.z) < R) return dest;
    const ref = inside ? dest : p;
    const ang = Math.atan2(ref.z, ref.x);
    const ga = [0, Math.PI / 2, Math.PI, -Math.PI / 2].sort((a, b) => angDiff(a, ang) - angDiff(b, ang))[0];
    const gi = { x: Math.cos(ga) * (R - 3), z: Math.sin(ga) * (R - 3) };
    const go = { x: Math.cos(ga) * (R + 3), z: Math.sin(ga) * (R + 3) };
    const [first, second] = inside ? [gi, go] : [go, gi];
    // 문 통로 안이면 건너편으로, 아니면 이쪽 문 앞으로
    const along = distToSeg(p, gi, go);
    return along < 1.2 ? second : first;
  }

  goal(to) { return this.detourT > 0 ? this.detour : to; }

  stepToward(p, to, step) {
    const dx = to.x - p.x, dz = to.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-4) return 0;
    const k = Math.min(1, step / d);
    p.x += dx * k; p.z += dz * k;
    return d;
  }

  update(dt) {
    this.time += dt;
    const st = this.st;
    st.playTime += dt;
    this.checkDungeonGate(dt);
    this.checkChests();
    this.raidStep(dt);
    this.merchantStep(dt);
    this.petStep(dt);
    this.skyStep(dt);
    this.campStep(dt);
    // 자동 사냥 중 죽으면 잠시 뒤 마을에서 일어나 다시 사냥
    if (this.dead && this.auto) { this.autoReviveT = (this.autoReviveT ?? 6) - dt; if (this.autoReviveT <= 0) { this.autoReviveT = null; this.revive(); this.ui.closeDeath?.(); this.ui.log('자동 사냥: 마을에서 다시 출발합니다', '#9a917f'); } }
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); }
    }
    // 버프 · 쿨타임 · 회복
    let buffChanged = false;
    for (const k in this.buffs) { const b = this.buffs[k]; if (b.t > 0) { b.t -= dt; if (b.t <= 0) buffChanged = true; } }
    this.auraStep();
    for (const k in this.st.elix || {}) { const e = this.st.elix[k]; e.t -= dt; if (e.t <= 0) { delete this.st.elix[k]; buffChanged = true; this.ui.dirty(); } }
    for (const k in this.pbuffs || {}) { const b = this.pbuffs[k]; if (b.t > 0) { b.t -= dt; if (b.t <= 0) buffChanged = true; } }
    if (buffChanged) this.d = derive(st, this.buffValues());
    for (const k in this.cds) if (this.cds[k] > 0) this.cds[k] -= dt;
    this.potionCd -= dt; this.atkCd -= dt; this.swing -= dt; this.actCd -= dt;
    if (!this.dead) {
      st.hp = Math.min(this.d.maxHp, st.hp + this.d.hpRegen * dt * (this.inTown ? 6 : 1));
      this.gainMp(this.d.mpRegen * dt * (this.inTown ? 6 : 1));
    }
    this.updatePlayer(dt);
    this.player.update(dt);
    this.npc.update(dt);
    this.guard.update(dt);
    this.gemNpc?.update(dt); this.sage?.update(dt);
    for (const a of this.campNpcs || []) a.update(dt);
    this.updateWorkers(dt);
    this.updateSpawners(dt);
    const P = this.player.pos;
    // 화면에 보이는 몬스터만 그린다 (뼈대 모델은 스스로 화면 밖을 거르지 못한다)
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      const near = dist2(m.pos, P) < ACTIVE_RADIUS;
      m.near = near;
      m.actor.root.visible = near && this.stage.onScreen(m.pos.x, m.pos.z, 3 * m.actor.scale);
      if (m.dead) {
        m.deadT -= dt;
        m.actor.update(dt);
        if (m.deadT < 1) m.actor.root.position.y = -(1 - m.deadT) * 1.2;
        if (m.deadT <= 0) { m.actor.dispose(); this.monsters.splice(i, 1); }
        continue;
      }
      if (!near && m.state === 'idle') {
        if (!m.owner && dist2(m.pos, P) > DESPAWN_FAR) { m.actor.dispose(); this.monsters.splice(i, 1); m.sp.mon = null; m.sp.timer = 0; if (this.target === m) this.target = null; }
        continue;
      }
      this.monsterAI(m, dt);
      m.actor.update(dt);
    }
    // 오래된 전리품 정리 (사망 드랍은 정해진 시간까지)
    const now = Date.now();
    for (const g of [...this.ground]) {
      if (g.expires ? g.expires < now : this.time - g.born > 300) this.removeGround(g);
    }
    this.fx.update(dt);
    // 마을 생산 · 용병: 5초마다 실제 시간으로
    this.townT = (this.townT || 0) - dt;
    if (this.townT <= 0) {
      this.townT = 5;
      const bl = Object.values(townOf(st).plots).filter((b) => b.bld).length;
      const br = (townOf(st).brew || []).filter((b) => b.until <= Date.now()).length;
      if (br > (this.brewReady || 0)) { this.ui.toast('제작소: 다 만든 물건이 있습니다', '#7fe07a'); sfx('coin'); }
      this.brewReady = br;
      townTick(st);
      if (Object.values(townOf(st).plots).filter((b) => b.bld).length < bl) { this.refreshTown(); this.ui.toast('공사가 끝났습니다', '#ffd84a'); sfx('rankup'); }
      this.syncWorkers();
      const done = researchTick(st);
      if (done) this.ui.toast(`연구 완료: ${RESEARCH[done].name} ${researchLv(st, done)}단계`, '#7fe07a');
      this.checkAchievements();
      const back = townOf(st).mercs.filter((m) => m.job && Date.now() >= m.job.until && !m.job.told);
      for (const m of back) { m.job.told = true; this.ui.toast(`용병 ${m.name}이(가) 사냥에서 돌아왔습니다`, '#ffd84a'); }
    }
  }

  updatePlayer(dt) {
    const st = this.st, P = this.player, d = this.d;
    if (this.dead) return;
    if (this.recallT > 0) {
      this.recallT -= dt;
      if (this.recallT <= 0) {
        this.fx.burst(P.pos.x, 1, P.pos.z, 0x80b0ff, 18, 4, 0.4);
        this.leaveDungeon(true);
        P.pos.set(0, 0, 4);
        this.stage.cam.x = 0; this.stage.cam.z = 4;
        this.fx.portal(0, 2.2, 1.2);
        this.fx.arrive(0, 4);
        P.play('idle', { force: true });
        this.ui.toast('여명 초소에 도착했습니다');
      }
      return;
    }
    this.autoPause -= dt;
    // 자동 물약: 직접 조작 중(autoPause)에도 자동 사냥이 켜져 있으면 늘 확인한다
    if (this.auto && !this.dead) {
      const st2 = this.st, d2 = this.d;
      if (st2.hp / d2.maxHp < (st2.settings.autoPotion ?? 0.4) && this.potionCd <= 0) this.usePotion('hp', true);
      if (st2.mp / d2.maxMp < 0.2 && this.potionCd <= 0) this.usePotion('mp', true);
    }
    if (this.auto && this.autoPause <= 0) {
      this.autoThink -= dt;
      if (this.autoThink <= 0) { this.autoThink = 0.2; this.autoBrain(); }
    }
    let moving = false;
    const speed = d.moveSpeed * ((this.chainSpdT || 0) > 0 ? 1.15 : 1);
    if (this.chainSpdT > 0) this.chainSpdT -= dt;
    if (this.joy.lengthSq() > 0.01) {
      // 조이스틱은 공격 동작도 끊는다
      if (P.lock > 0 && this.swing <= 0) P.lock = 0;
      if (P.lock <= 0) {
        const j = this.joy;
        const k = Math.min(1, j.length());
        P.pos.x += (j.x / j.length()) * speed * k * dt;
        P.pos.z += (j.y / j.length()) * speed * k * dt;
        P.facing = Math.atan2(j.x, j.y);
        moving = true;
      }
    } else if (this.target && !this.target.dead) {
      const t = this.target;
      const range = this.pendingSkill ? this.skillRange(this.pendingSkill) : d.range;
      const dd = dist2(t.pos, P.pos);
      if (dd > range) {
        if (P.lock <= 0) {
          // 자동 사냥: 몬스터까지 막혀 있으면 길을 찾아 돌아간다 (0.5초마다 다시)
          let to = t.pos;
          if (this.auto) {
            this.chaseT = (this.chaseT || 0) - dt;
            if (this.chaseT <= 0) {
              this.chaseT = 0.6;
              const moved = !this.chaseAt || Math.hypot(t.pos.x - this.chaseAt.x, t.pos.z - this.chaseAt.z) > 1.5;
              if (clearLine(this.stage, P.pos, t.pos, 0.5)) this.chasePath = null;
              else if (moved || !this.chasePath?.length) {
                this.chaseAt = { x: t.pos.x, z: t.pos.z };
                this.chasePath = findPath(this.stage, P.pos, t.pos, 0.5, 2500);
                if (!this.chasePath) { t.ignoreUntil = this.time + 12; this.target = null; this.chaseAt = null; } // 닿을 수 없으면 다른 몬스터로 (계속 찾으며 끊기지 않게)
              }
            }
            if (this.chasePath?.length) { if (dist2(P.pos, this.chasePath[0]) < 0.6) this.chasePath.shift(); if (this.chasePath.length) to = this.chasePath[0]; }
          }
          const g = this.goal(to); this.stepToward(P.pos, g, speed * dt); P.face(g.x, g.z); moving = true;
        }
      } else if (this.pendingSkill) {
        if (this.actCd <= 0 && (P.lock <= 0 || this.swing <= 0)) {
          const r = this.skillReady(this.pendingSkill);
          if (r.ok) this.castSkill(this.pendingSkill, r.v); else this.pendingSkill = null;
        }
      } else if (this.atkCd <= 0 && this.actCd <= 0 && (P.lock <= 0 || this.swing <= 0)) {
        this.basicAttack(t);
      }
    } else {
      if (this.target?.dead) this.target = null;
      if (this.pendingSkill && !this.needsTarget(this.pendingSkill)) {
        const r = this.skillReady(this.pendingSkill);
        if (r.ok && this.actCd <= 0 && (P.lock <= 0 || this.swing <= 0)) this.castSkill(this.pendingSkill, r.v);
      }
      if (this.moveTo && P.lock <= 0) {
        let dest = this.moveTo;
        if (this.movePath?.length) { dest = this.movePath[0]; if (dist2(P.pos, dest) < 0.6) { this.movePath.shift(); dest = this.movePath[0] || this.moveTo; } }
        const wp = this.goal(this.waypoint(P.pos, dest));
        const left = this.stepToward(P.pos, wp, speed * dt);
        P.face(wp.x, wp.z);
        moving = left > 0.15 || wp !== this.moveTo || !!this.movePath?.length;
        if (!moving) this.moveTo = null;
      }
    }
    if (moving) {
      const bx = P.pos.x, bz = P.pos.z;
      resolveCollision(this.stage, P.pos, 0.55);
      // 장애물에 막혀 제자리걸음이면 옆으로 돌아간다
      const moved = Math.hypot(P.pos.x - (this.lastPos?.x ?? bx), P.pos.z - (this.lastPos?.z ?? bz));
      if (moved < speed * dt * 0.3) this.stuckT = (this.stuckT || 0) + dt; else this.stuckT = Math.max(0, (this.stuckT || 0) - dt);
      if (this.stuckT > 0.5 && !(this.detourT > 0)) {
        const a = P.facing + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
        this.detour = { x: P.pos.x + Math.sin(a) * 3, z: P.pos.z + Math.cos(a) * 3 };
        this.detourT = 0.7;
      }
      if (this.auto && this.stuckT > 3) {
        if (this.target) this.target.ignoreUntil = this.time + 15;
        this.target = null; this.moveTo = null; this.stuckT = 0;
      }
    } else this.stuckT = 0;
    if (this.detourT > 0) this.detourT -= dt;
    this.lastPos = { x: P.pos.x, z: P.pos.z };
    // Flare 달리기 한 바퀴(0.53초)에 약 2.4칸 나아가는 걸음 — 이동 속도에 맞춰 재생
    if (moving) { this.stepT = (this.stepT || 0) - dt; if (this.stepT <= 0) { this.stepT = 0.33; sfx('step', 0.35); } }
    if (P.lock <= 0) P.play(moving ? 'run' : 'idle', { speed: moving ? speed / 7 : 1 });

    // 줍기
    if (!this.dead) for (const g of [...this.ground]) if (dist2(g, P.pos) < 1.4) this.pickup(g);

    // 지역
    const zn = zoneAt(P.pos.x, P.pos.z);
    const dg = this.dungeon;
    const id = dg ? 'dg' + dg.zi + '_' + dg.stage : this.inTown ? 'town' : zn?.id || 'wild';
    if (id !== this.zone) {
      this.zone = id;
      if (zn) st.lastZone = zn.id;
      this.ui.zone(dg ? { name: `${dg.zone.name} 던전 ${dg.stage}단계`, levels: [dungeonLevel(dg.zone, dg.stage) + this.tierOffset, dungeonLevel(dg.zone, dg.stage) + this.tierOffset] } : id === 'town' ? TOWN : zn);
    }
    this.musicT = (this.musicT || 0) - dt;
    if (this.musicT <= 0) {
      this.musicT = 0.5;
      const boss = this.monsters.some((m) => !m.dead && m.tier === 'boss' && m.state === 'chase' && dist2(m.pos, P.pos) < 26);
      audio.setMusic(boss ? 'boss' : this.zone);
    }
    st.pos = { x: P.pos.x, z: P.pos.z };
  }

  // ───────── 가방 조작 (UI에서 호출) ─────────

  useItem(uid) {
    const st = this.st;
    const it = st.inv.find((x) => x.uid === uid);
    if (!it) return;
    this.d = derive(st, this.buffValues());
    if (BASES[it.base]?.type === 'pet') { takeOne(st, it.base); const cat = BASES[it.base].pet === 'pet_cat'; st.pet = { kind: cat ? 'pet_cat' : 'pet_dog', name: cat ? '고양이' : '강아지' }; this.makePet(); this.ui.toast(`${st.pet.name}가 함께합니다! 물건을 주워 오고 함께 싸웁니다`, '#7fe07a'); sfx('learn'); this.ui.dirty(); return; }
    if (isBook(it)) {
      const c = canLearn(st, it.book, this.d.stats);
      if (c.ok) {
        learn(st, it.book);
        st.inv.splice(st.inv.indexOf(it), 1);
        this.ui.toast(`새 스킬을 배웠습니다: ${SKILLS[it.book].name}`, '#ffd84a');
        sfx('learn');
        this.fx.pillar(this.player.pos.x, this.player.pos.z, 0x80c0ff, 1.2);
      } else if (c.known) {
        st.inv.splice(st.inv.indexOf(it), 1);
        this.skillExp(it.book, bookAbsorbExp(it.book) / this.d.skillExp / this.autoMult);
        this.ui.toast(`${SKILLS[it.book].name} 숙련도를 흡수했습니다`);
      } else {
        const req = Object.entries(SKILLS[it.book].req).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ');
        this.ui.toast(`스탯이 부족합니다 (${req})`);
      }
    } else if (BASES[it.base].type === 'elixir') {
      const E = ELIXIRS[it.base], base = totalStats(st);
      const v = E.stat ? Math.max(5, Math.round(base[E.buff] * 0.1)) : E.v;
      takeOne(st, it.base);
      (st.elix ||= {})[it.base] = { buff: E.buff, v, t: ELIXIR_TIME };
      this.d = derive(st, this.buffValues());
      this.ui.toast(`${E.name}: ${E.stat ? `${E.text.split(' ')[0]} +${v}` : E.text} · 5분`, E.color);
      sfx('buff');
      this.fx.ring(this.player.pos.x, this.player.pos.z, 2.2, new THREE.Color(E.color).getHex(), 0.7);
    } else if (BASES[it.base].type === 'potion') {
      this.usePotion(BASES[it.base].restore.hp ? 'hp' : 'mp');
    } else {
      const r = equipItem(st, uid);
      if (!r.ok) this.ui.toast(r.why);
      for (const sh of r.shards || []) { this.ui.toast(`벗은 장비에서 ${itemName(sh)}을(를) 얻었습니다`, '#c58cff'); sfx('rare'); }
      this.refreshGear();
    }
    this.ui.dirty();
  }

  unequip(slot) {
    const r = unequipItem(this.st, slot);
    if (!r.ok && r.why) this.ui.toast(r.why);
    this.refreshGear();
  }

  dropItem(uid) {
    const st = this.st;
    const i = st.inv.findIndex((x) => x.uid === uid);
    if (i < 0) return;
    const it = st.inv.splice(i, 1)[0];
    const g = this.dropGround({ kind: 'item', item: it }, this.player.pos.x + 1.6, this.player.pos.z + 0.4);
    g.born = this.time + 600; // 직접 버린 건 오래 남긴다
    this.ui.dirty();
  }
}

// 입은 장비 → 겹그림 (Flare). 안 입은 부위는 기본 옷
export function heroLook(st) {
  const layers = {}, tints = {};
  for (const slot of ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'boots']) {
    const it = st.equip[slot];
    const L = it && ITEM_LOOK[it.base];
    if (!L?.layers) continue;
    for (const [type, layer] of Object.entries(L.layers)) { layers[type] = layer; if (L.tint != null) tints[type] = L.tint; }
  }
  return { layers, tints };
}

const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
function distToSeg(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

function weightedPick(table) {
  let total = 0;
  for (const k in table) total += table[k];
  let r = Math.random() * total;
  for (const k in table) { r -= table[k]; if (r < 0) return k; }
  return Object.keys(table)[0];
}

export { randInt };
