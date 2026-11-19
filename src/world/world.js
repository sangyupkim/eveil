import '../data/skill_fx.js';
import { bagSize } from '../game/inventory.js';
import { ZONES as ALL_ZONES } from '../data/world.js';
import { chapterK } from '../data/chapters.js';
import { awakenOk } from '../data/awaken_skills.js';
import { DUNGEON_X, entranceOf, MAX_STAGE, stageMods, dungeonLevel, layout as dungeonLayout, cellPos, N, DUNGEON_DIFFS } from '../data/dungeons.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { gemGradeFor } from '../data/legends.js';
export const TIER_NAMES = ['평온', '악몽', '지옥', '혼돈']; // v0.42 혼돈 = 각성 380 ~ 500
import { TITLE_AT, titleKey, titleName, perkChoices, UNIQUES } from '../data/titles.js';
// 게임 월드: 플레이어 조작 · 몬스터 AI · 전투 · 스킬 · 드랍 · 사망 · 자동 사냥
import * as THREE from 'three';
import { CONFIG, TIERS, AP_TABLE, STAT_NAMES } from '../data/config.js';
import { SKILLS } from '../data/skills.js';
import { BASES, WEAPON_CLASSES, RARITY_ORDER } from '../data/items.js';
import { MONSTERS, ZONES, TOWN, TIER_STEP, FINAL_ZONE } from '../data/world.js';
import { derive, damageReduction, totalStats, skillScale } from '../game/player.js';
import { monsterRes, mixFxOf } from '../data/resist.js';
import { ARTS } from '../data/arts.js';
import { relicBonus, rollRelic, RELIC, RELIC_GRADES } from '../data/relics.js';
import { nextFloodAt, FLOOD, FLOOD_AFFIX, FLOOD_AFFIX_IDS } from '../data/flood.js';
import { ELIXIRS, ELIXIR_TIME, HERBS, HP_POTIONS, MP_POTIONS } from '../data/potions.js';
import { addAP, gainExp, rewardFactor, recAwaken } from '../game/growth.js';
import { addSkillExp, skillValues, skillEff, modsOf, meetsReq, canLearn, learn, bookAbsorbExp } from '../game/skills.js';
import { rollLoot, rollDeathDrop } from '../game/loot.js';
import { dropMats, liberateAdd, dropEss, resAdd, resCount, claim as claimMerc, lootRoomFull, brewCollect, collect as collectPlot, repeatTick, autoBrewTick } from '../game/town.js';
import { vaultAdd } from '../game/vault.js';
import { itemIcon, iconUrl, coinIcon, oreIcon, herbIcon, townIcon, bookIcon } from '../ui/icons.js';
import { dailyProgress, dailyReward, dailyText, dayKey, dailyOf, weeklyOf, weekKey } from '../game/daily.js';
import { MATERIALS } from '../data/crafting.js';
import { addItem, takeOne, countOf, equip as equipItem, unequip as unequipItem } from '../game/inventory.js';
import { itemName, itemColor, isBook, makeItem, makeBook, rollBase, itemValue } from '../game/items.js';
import { seeded, randInt, randRange } from '../game/rng.js';
import { Actor, makeHero } from '../engine2d/actor.js';
import { FX, drawPowerFrame } from '../engine2d/fx.js';
import { zoneRadius, resolveCollision, zoneAt, clearLine, findPath, blockedAt, LAKES, MESAS, CAMPS, inCamp, bossSpot, addGateProps, removeProps } from '../engine2d/stage.js';
import { rumorsOf, analyzeDone, rumorName, PLUS } from '../game/rumor.js';
import { CHAMP, rollChamp } from '../data/champions.js';
import { combatPower } from '../game/power.js';
import { MUTS, MUT_AFFIX, MUT_RESIST, COLLAPSE_SEC, mutCount, rollMuts, mutBonus } from '../data/mutators.js';
import { rollShard } from '../game/shards.js';
import { reveal, saveFog, loadFog } from '../ui/mapimg.js';
import { DATA, image, animImage, drawRect, frameIndex, filteredRect } from '../engine2d/sprites.js';
import { MONSTER_LOOK, ITEM_LOOK, LOOT_LOOK, ZONE_LOOK as ZONE_LOOK_W } from '../data/flareWorld.js';
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
  ash_king: ['hellnova', 'meteors', 'fissure'], crypt_king: ['cannons', 'icelines', 'grid'], crystal_king: ['xcross', 'webtrail', 'bonespiral'], blood_king: ['tongue', 'mines', 'quakerings'],
  storm_king: ['avalanche', 'icelines', 'cross'], temple_king: ['boulder', 'quakerings', 'grid'], abyss_king: ['meteors', 'bonespiral', 'xcross', 'fissure'],
  doom_king: ['hellnova', 'xcross', 'meteors', 'avalanche', 'cannons', 'tricharge'], // 마지막 보스: 패턴이 많다
};
// 멀리 있는 플레이어를 노리는 패턴 (보스마다 둘)
const FAR = ['leap', 'snipe', 'fan', 'hail', 'pull'];
const farOf = (id) => { let h = 0; for (const c of id || '') h = (h * 31 + c.charCodeAt(0)) >>> 0; const i = h % FAR.length; return [FAR[i], FAR[(i + 1 + (h >> 4) % (FAR.length - 1)) % FAR.length]]; };

// 세계 단계 배율 (레벨 보정 위에 더): 악몽 · 지옥은 몬스터가 확실히 더 세다
const TIER_K = { 1: { hp: 1, dmg: 1, pat: 1 }, 2: { hp: 1.8, dmg: 1.45, pat: 1.25 }, 3: { hp: 3, dmg: 2, pat: 1.5 }, 4: { hp: 7, dmg: 3.6, pat: 1.8 } };

export class World {
  constructor(stage, st, ui) {
    this.stage = stage;
    this.scene = stage;
    this.st = st;
    // v0.42 전직 단계가 20 · 60 · 150 · 300 · 500으로 바뀜: 각성이 모자란 칭호는 내린다 (닿으면 다시 고른다)
    if (st.titles) st.titles = st.titles.filter((t) => (st.awakenings || 0) >= (TITLE_AT[t.tier] ?? 1e9));
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
      if (set === 'props') r *= k; // 새 건물 그림은 키운 만큼 바닥도 넓게
      const x = cur.x + dx, z = cur.z + dz;
      const def = DATA.tiles[set], tt = def.tiles[id];
      if (!tt) return;
      image(def.imgs[tt[0]]);
      const d = { z: z + 2 * k, draw: (ctx, stg) => { const src = image(def.imgs[tt[0]]); if (!src.ok || !stg.onScreen(x, z, 8)) return; const p = stg.toScreen(x + ox * k, z + oz * k);
        const F = filter && filteredRect(src.im, tt.slice(1), filter); drawRect(ctx, F ? F.im : src.im, F ? F.rect : tt.slice(1), p.x, p.y, stg.scale() * k); } };
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
        const d = { z: cur.z + dz + 1.6, draw: (ctx, stg) => { const src = image(def.imgs[tt[0]]); if (!src.ok || !stg.onScreen(x, z, 10)) return; const p = stg.toScreen(x, z); const F = filter && filteredRect(src.im, tt.slice(1), filter); drawRect(ctx, F ? F.im : src.im, F ? F.rect : tt.slice(1), p.x, p.y, stg.scale()); } };
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
        const d = { z: z0 + 1.2, draw: (ctx, stg) => { const src = image(def.imgs[tt[0]]); if (!src.ok || !stg.onScreen(x, z, 8)) return; const p = stg.toScreen(x, z); const F = filter && filteredRect(src.im, tt.slice(1), filter); drawRect(ctx, F ? F.im : src.im, F ? F.rect : tt.slice(1), p.x, p.y, stg.scale() * k); } };
        this.stage.add(d); this.townDraw.push(d);
      }
      for (let u = -1.8; u <= 1.8; u += 0.9) for (let v = -1; v <= 1; v += 0.9) col(x0 + 0.75 * k + u * k, z0 + v * k, 0.6);
    };
    // 건물 설계: 그림 · 바닥 크기(가로 반 w, 세로 반 h)는 그림 크기에서 잰 값. 소품은 바닥 밖 앞쪽에
    //  v0.41: 대장간 · 여관 · 제작소 · 숙소 · 파견소는 Bleed's Game Art 등 중세 건물 그림 (tiles.props)
//  대장간 = 그을린 돌오두막(가로 7.6) + 화로 · 모루    여관 = 큰 돌오두막(가로 8.6) + 통 · 상자 · 횃불
    //  광산 = 땅속 갱도 계단(가로 9) + 바위 · 종유석      연구소 = 마법진(가로 6) + 돌기둥 넷 · 석상
    //  제작소 = 창문 통나무집(가로 7.4) + 통나무 · 모루     숙소 = 문 통나무집, 3단계부터 한 채 더
    //  약초밭 = 작물 7 × 4 줄
    const LOOK = {
      altar: () => [['dungeon', 128, 0, -0.4], ['dungeon', 129, -2.2, 0.2], ['dungeon', 130, 2.2, 0.2], ['dungeon', 167, -1.3, 1.8], ['dungeon', 167, 1.3, 1.8]], // v0.44.52 유물 제단: 가운데 석상 + 양옆 석상 + 앞 화로 둘
      smithy: (b) => { big('grassland', 296, 0, 0, 0.75, -7.3, 2.2, 'brightness(0.78) sepia(0.35) saturate(1.2)', 4.8); return [['dungeon', 167, 3.6, 3.4], ['grassland', 103, -3.4, 3.6], ['dungeon', 167, -1.2, 4.4], ['grassland', 100, 4.4, 1.0]]; },
      inn: (b) => { big('props', 4, 0, -0.8, 1.45, 0, 0, 'brightness(0.82) saturate(0.85)', 4.2); return [['grassland', 98, 4.2, 3.6], ['grassland', 96, -4.2, 3.4], ['dungeon', 167, -1.4, 4.8], ['dungeon', 167, 1.4, 4.8]]; },
      mine: (b) => { big('dungeon', 286, 0, -0.6, 0.75, 0, 0, 'sepia(0.4) brightness(0.9)', 2.8); return [['cave', 148, 4.6, -1.8], ['cave', 130, -4.4, 1.2], ['cave', 131, 3.8, 3.2], ['cave', 151, -3.6, -2.8], ['grassland', 100, -4.6, 3.6]]; },
      lab: (b) => { big('ruins', 380, 0, 0.4, 1.0, 0, 0, '', 0); return [['ruins', 243, 0.0, -3.0], ['ruins', 223, -3.6, -1.6], ['ruins', 231, 3.6, -1.6], ['ruins', 152, -3.8, 2.8], ['ruins', 223, 3.8, 2.8], ['ruins', 241, 0.0, 4.2], ['dungeon', 167, -1.8, 4.0], ['dungeon', 167, 1.8, 4.0]]; },
      workshop: (b) => { big('props', 3, 0, -0.9, 1.4, 0, 0, 'brightness(0.82) saturate(0.85)', 3.6); return [['grassland', 76, 4.6, 2.2], ['grassland', 103, -4.2, 2.8], ['grassland', 100, 2.2, 3.8], ['grassland', 101, -1.8, 4.0]]; },
      // 파견소 = 천막 야영 (단계마다 천막이 늘어난다) + 횃불
      guild: (b) => { big('props', 7, -0.8, -0.9, 1.4, 0, 0, 'brightness(0.82) saturate(0.85)', 3.6); if (b.lv >= 3) tent('B', 3.4, -2.6, 0.8, 'brightness(0.85)'); return [['dungeon', 167, 4.2, 3.4], ['dungeon', 167, -4.2, 3.4], ['grassland', 96, 0.4, 4.0], ['grassland', 98, -3.0, 4.2]]; },
      house: (b) => { big('props', 1, b.lv >= 3 ? -2.4 : 0, -0.9, 1.35, 0, 0, 'brightness(0.82) saturate(0.85)', 3.4); if (b.lv >= 3) big('props', 9, 4.6, -4.4, 1.35, 0, 0, 'brightness(0.82) saturate(0.85)', 2.2); return [['grassland', 98, 4.4, 2.8], ['grassland', 122, -4.4, 2.8], ['grassland', 121, -3.4, 3.8]]; },
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
        const K = ['inn', 'workshop', 'guild', 'house', 'smithy'].includes(b.type) ? 1.35 : 1; // v0.41.3 건물을 키워서 둘레 소품도 밖으로
        for (const [set, id, dx, dz] of (LOOK[b.type] || LOOK.smithy)(b)) { tile(set, id, pl.x + dx * K, pl.z + dz * K); col(pl.x + dx * K, pl.z + dz * K, 0.7); }
      }
      for (let lv = 2; lv <= b.lv; lv++) for (const [set, id, dx, dz] of LEVEL_DECOR[lv] || []) tile(set, id, pl.x + dx * 2.6, pl.z + dz + 6.4); // 단계 꾸밈: 건물 앞 양옆 (건물을 가리지 않게)
    }
  }

  // ───────── 일하는 용병 ─────────
  // 일을 맡은 용병을 그 건물 앞에 세우고 일하는 몸짓(연장 휘두르기 · 주문)을 되풀이한다
  // v0.49.24 용병 그림: 여자 얼굴 용병은 「여성 모험가」(드라이브 에셋) — 통짜 그림이라 연장은 들지 않는다
  mercActor(m) { return new Actor(this.scene, makeHero({ face: m.face })); }
  syncWorkers() {
    const t = townOf(this.st), want = t.mercs.filter((m) => m.work && t.plots[m.work] && !m.job && !m.rest);
    // v0.44.15 여관에서 쉬는 용병: 있던 자리에서 여관 앞까지 걸어가 눕는다
    const innE = Object.entries(t.plots).find(([, b]) => b.type === 'inn'), innPl = innE && PLOTS.find((q) => q.id === innE[0]);
    const resting = innPl ? t.mercs.filter((m) => m.rest && !m.job) : [];
    const sig = want.map((m) => m.id + m.work + (m.tired ? 1 : 0)).join(',') + '|' + resting.map((m) => m.id).join(',');
    if (sig === this.workerSig) return;
    this.workerSig = sig;
    const was = new Map((this.workers || []).map((w) => [w.m.id, { x: w.a.pos.x, z: w.a.pos.z, kind: w.kind, lying: w.lying }]));
    for (const w of this.workers || []) w.a.dispose();
    this.workers = [];
    resting.forEach((m, i) => {
      const a = this.mercActor(m), to = { x: innPl.x - 3 + (i % 4) * 1.6, z: innPl.z + 4.6 + Math.floor(i / 4) * 1.4 };
      const from = was.get(m.id) || (m.work && PLOTS.find((q) => q.id === m.work)) || { x: 0, z: 6 };
      a.pos.set(from.x, 0, from.z); a.name = m.name;
      const lying = from.kind === 'rest' && from.lying;
      if (lying) { a.pos.set(to.x, 0, to.z); a.play('die', { once: true, force: true }); } else a.play('run');
      this.workers.push({ a, m, kind: 'rest', to, lying, t: 2 + Math.random() * 3 });
    });
    const TOOL = { mine: 'hand_axe', herb: 'dagger', smithy: 'smith_hammer', workshop: 'smith_hammer', lab: 'rod', inn: null, house: null };
    const SPOT = { herb: (i) => [(i % 3 - 1) * 3.0, (Math.floor(i / 3) - 0.5) * 2.2], mine: (i) => [-2.0 + i * 1.6, 4.6], lab: (i) => [-1.2 + i * 1.2, 2.2], smithy: (i) => [5.2 + (i % 2) * 1.2, 2.4 + i * 1.0], inn: (i) => [5.6 + (i % 2) * 1.2, 2.6 + i * 1.0] };
    const count = {};
    for (const m of want) {
      const b = t.plots[m.work], pl = PLOTS.find((q) => q.id === m.work); if (!pl) continue;
      const i = (count[m.work] = (count[m.work] ?? -1) + 1);
      const [dx, dz] = (SPOT[b.type] || ((k) => [-2.4 + k * 1.6, 5.6]))(i);
      const a = this.mercActor(m);
      const tool = TOOL[b.type];
      if (a.setLook) a.setLook({ layers: { ...(tool ? { main: tool } : {}), ...(b.type === 'lab' ? { chest: 'mage_vest', legs: 'mage_skirt' } : b.type === 'smithy' || b.type === 'mine' ? { chest: 'leather_chest' } : {}) } });
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
      if (w.kind === 'rest') { // 여관으로 걸어가 눕고, 가끔 졸음
        if (!w.lying) {
          const dx = w.to.x - w.a.pos.x, dz = w.to.z - w.a.pos.z, l = Math.hypot(dx, dz);
          if (l < 0.15) { w.lying = true; w.a.play('die', { once: true, force: true }); }
          else { const k = Math.min(1, (3.2 * dt) / l); w.a.pos.x += dx * k; w.a.pos.z += dz * k; w.a.face(w.to.x, w.to.z); if (w.a.current !== 'run') w.a.play('run'); }
        } else if ((w.t -= dt) <= 0) { w.t = 3 + Math.random() * 2; this.fx.text(new THREE.Vector3(w.a.pos.x, 1.4, w.a.pos.z), 'z z', 'heal'); }
        continue;
      }
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
      const P = this.player.pos, d = this.d, wd = (d.dmg[0] + d.dmg[1]) / 2, sb = Math.max(d.spellBase || 0, wd); // v0.49.22 원소 폭발 · 파동 · 번개: 주문 기준 · 무기 피해 중 큰 쪽의 % (예전 고정 숫자는 레벨이 오르면 거의 안 들어갔다)
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
        for (const m of this.monsters) if (!m.dead && dist2(m.pos, c) < 6.25) this.hitMonster(m, sb * k.v / 100, { src: 'perk' });
      } else if (k.eff === 'chill') {
        for (const m of near(4)) m.slowT = k.v / 10;
        this.fx.decal(0, P.x, P.z, 4, 0x9fd8ff, 0.4);
      } else if (k.eff === 'crit') { timed('focus', k.v); tag(t.name); } // v0.49.21 새 특성 효과
      else if (k.eff === 'swift') { timed('swift', k.v); tag(t.name); }
      else if (k.eff === 'nova') { this.fx.play?.('sparkle', P.x, P.z, { scale: 1.6, dur: 0.6 }); for (const m of near(4)) this.hitMonster(m, sb * k.v / 100, { src: 'perk' }); }
      else if (k.eff === 'chain') { near(9).sort((a, b) => dist2(a.pos, P) - dist2(b.pos, P)).slice(0, 3).forEach((m, i) => this.later(i * 0.12, () => { if (m.dead) return; this.fx.projectile({ from: { x: P.x, y: 1.3, z: P.z }, target: m.actor, color: 0xa0c8ff, size: 0.6, speed: 30, bolt: true, onHit: () => this.hitMonster(m, sb * k.v / 100, { src: 'perk' }) }); })); }
      else if (k.eff === 'mark') { for (const m of near(4)) { m.markT = this.time + 4; m.markV = k.v; } tag(t.name); }
      else if (k.eff === 'barrier') { const add = d.maxHp * k.v / 100, cap = d.maxHp * 0.3, sh = this.buffs.shield; if (sh && sh.t > 0) sh.v = Math.min(cap, sh.v + add); else this.buffs.shield = { v: Math.min(cap, add), t: 4, max: 4 }; tag(t.name); }
      else if (k.eff === 'arrow') {
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
    for (const q of list) { this.ui.toast(`${q.weekly ? '이번 주' : '오늘의'} 의뢰 완료: ${dailyText(q)}`, '#ffd84a'); sfx('coin'); }
  }
  claimDaily() {
    const st = this.st; let n = 0, g = 0;
    for (const q of [...dailyOf(st).list, ...weeklyOf(st).list]) {
      if (!q.done || q.got) continue;
      const r = dailyReward(q, st);
      if (r.key && !addItem(st, makeItem('dungeon_key', { qty: r.key }, st))) { this.ui.toast('가방이 가득 찼습니다'); break; }
      st.gold += r.gold; g += r.gold; if (r.ore) townOf(st).ore += r.ore; if (r.ess) resAdd(st, r.ess.id, r.ess.n);
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
    if (this.st.flood?.list?.some((f) => f.zone === zone)) { this.ui.toast('범람지는 포탈로 갈 수 없습니다', '#ff6a5a'); sfx('error'); return; } // v0.44.45 걸어서
    this.portalAway = zone; this.cancelRecall?.();
    this.player.pos.set(q.x, 0, q.z + 2); this.stage.cam.x = q.x; this.stage.cam.z = q.z + 2;
    this.fx.arrive(q.x, q.z + 2); sfx('cast'); this.moveTo = null; this.target = null;
  }
  // 야영지 시설: 상인 · 모닥불 (금화로 짓는다)
  refreshCamps() {
    for (const a of this.campNpcs || []) this.stage.remove(a);
    for (const d of this.campDraw || []) this.stage.remove(d);
    for (const f of this.campFire || []) f.t = f.dur; this.campFire = []; // 모닥불 불꽃 (v0.44.20 움직이는 불)
    this.campNpcs = []; this.campDraw = [];
    for (const c of CAMPS) {
      const k = this.st.camps?.[c.zone]; if (!k) continue;
      if (k.merchant) { const a = new Actor(this.scene, { npc: 'peddler_goblin' }); a.pos.set(c.x + 3, 0, c.z - 1); a.facing = -0.5; a.play('idle'); a.name = '떠돌이 상인'; this.campNpcs.push(a); }
      if (k.rest) { // 용병 쉼터: 단계마다 천막 하나씩
        const tt = DATA.tiles.grassland.tiles[72], spots = [[-5, -2], [5, -3], [-6, 3], [6, 2.5], [0, -5]];
        for (let i = 0; i < Math.min(5, k.rest); i++) { const [dx, dz] = spots[i], x = c.x + dx, z = c.z + dz; const d = { z: z + 1.5, draw: (ctx, stg) => { const src = image(DATA.tiles.grassland.imgs[tt[0]]); if (!src.ok || !stg.onScreen(x, z, 5)) return; const p = stg.toScreen(x, z); drawRect(ctx, src.im, tt.slice(1), p.x, p.y, stg.scale() * 0.8); } }; this.stage.add(d); this.campDraw.push(d); }
      }
      if (k.fire) { const tt = DATA.tiles.grassland.tiles[100]; const d = { z: c.z + 1.5, draw: (ctx, stg) => { const src = image(DATA.tiles.grassland.imgs[tt[0]]); if (!src.ok || !stg.onScreen(c.x, c.z, 4)) return; const s2 = stg.toScreen(c.x - 3, c.z + 1.5); drawRect(ctx, src.im, tt.slice(1), s2.x, s2.y, stg.scale()); } }; this.stage.add(d); this.campDraw.push(d); }
      if (k.fire) this.campFire.push(this.fx.play('p_burning', c.x - 3, c.z + 1.4, { y: 0.1, loop: true, dur: 1e9, scale: 0.85 }));
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
    const g = this.dead ? null : this.ground.filter((x) => !x.deathDrop && dist2(x, P) < 9 && (!this.auto || this.autoWants(x)) && !(x.kind === 'item' && st.inv.length >= bagSize(st) && !BASES[x.item.base]?.stack)).sort((a, b) => dist2(a, pet.pos) - dist2(b, pet.pos))[0];
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
    this.stage.night = this.mut('dark') ? 1 : this.inTown || this.dungeon ? this.night * 0.4 : this.night;
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

  // ───────── v0.46 소문 · 숨은 던전 ─────────
  // 1초마다: 연구소 지도 분석이 끝났나 · 소문 지역에 들어오면 입구 자리를 정한다 · 입구 그림을 맞춘다
  rumorStep(dt) {
    if ((this.rumorT = (this.rumorT || 0) - dt) > 0) return;
    this.rumorT = 1;
    this.st.power = combatPower(this.d, this.st); // v0.49 랭킹 전투력 (저장에 실려 서버로)
    const st = this.st, cleared = ALL_ZONES.map((z, i) => (this.bossCleared(z) ? i : -1)).filter((i) => i >= 0);
    const done = analyzeDone(st, cleared);
    if (done) {
      sfx('rankup');
      this.ui.toast(`지도 분석 완료 · 미지의 땅 조각 ${done.pieces}${done.rumors.length ? ` · 소문 ${done.rumors.length}` : ''}`, '#ffd060');
      for (const zi of done.rumors) this.ui.log(`${ALL_ZONES[zi].name} 어딘가에 숨은 던전이 있다는 소문`, '#ffd060');
      this.ui.dirty();
    }
    const R = rumorsOf(st), G = (this.gateProps ||= {});
    for (const id of Object.keys(G)) if (!R.some((x) => x.id === id && x.x != null)) { removeProps(this.stage, G[id]); delete G[id]; }
    const P = this.player.pos;
    if (!this.dungeon && !this.inTown) {
      const zn = zoneAt(P.x, P.z), zi = zn ? ALL_ZONES.indexOf(zn) : -1;
      for (const r of R) {
        if (r.zi === zi && r.x == null) { // 그 지역 어딘가 (입구 · 들어온 자리에서 떨어진 곳)
          const e = entranceOf(zn);
          for (let k = 0; k < 40; k++) {
            const a = Math.random() * 6.283, d = (0.3 + 0.55 * Math.random()) * zn.r, x = zn.x + Math.cos(a) * d, z = zn.z + Math.sin(a) * d;
            if (zoneAt(x, z) !== zn || Math.hypot(x - e.x, z - e.z) < 12 || Math.hypot(x - P.x, z - P.z) < 14 || blockedAt(this.stage, x, z, 2) || blockedAt(this.stage, x, z - 1.5, 2)) continue;
            r.x = x; r.z = z; break;
          }
          if (r.x != null) this.ui.toast(`${zn.name} 어딘가에서 숨은 던전의 기운이 느껴집니다`, '#ffd060');
        }
        if (r.x != null && !r.found && Math.hypot(r.x - P.x, r.z - P.z) < 9) { r.found = true; this.ui.toast(`숨은 던전을 발견했습니다 · ${rumorName(r)}`, '#ffd060'); sfx('rare'); this.fx.pillar(r.x, r.z, 0xffd060, 1.4, 6, 1.2); this.ui.dirty(); }
      }
    }
    for (const r of R) if (r.x != null && !G[r.id]) G[r.id] = addGateProps(this.stage, ALL_ZONES[r.zi], r.x, r.z);
  }
  // v0.48 강화 몬스터: 난이도 단계 r만큼 능력을 붙인다 (몸 · 이름 · 보상)
  champion(m, r) {
    if (!m || m.flood || m.child || m.golden) return;
    const ids = rollChamp(m.tier, r).filter((x) => !(m.affix || []).includes(x)); if (!ids.length) return;
    m.affix = [...(m.affix || []), ...ids]; m.champ = (m.champ || 0) + ids.length;
    if (ids.includes('frenzy')) { m.speed *= 1.3; m.def = { ...m.def, interval: m.def.interval / 1.3 }; }
    if (ids.includes('strong')) m.dmg = m.dmg.map((v) => v * 1.4);
    if (ids.includes('giant')) { m.maxHp *= 1.8; m.actor.scale *= 1.2; m.actor.drawScale *= 1.2; }
    m.maxHp = Math.round(m.maxHp * (1 + 0.15 * ids.length)); m.hp = m.maxHp; m.exp *= 1 + 0.5 * ids.length;
    m.baseName ||= m.name; m.name = `${m.baseName} [${m.affix.filter((x) => CHAMP[x]).map((x) => CHAMP[x].name).join('·')}]`;
    if (m.tier === 'normal') m.actor.setGlow(0x2a2400);
    if (ids.includes('horde')) for (let i = 0; i < 3; i++) { const a = i * 2.1, zn = m.sp?.zone || this.dungeon?.zone; if (!zn) break; const c = this.spawn({ zone: zn, x: m.pos.x + Math.cos(a) * 1.8, z: m.pos.z + Math.sin(a) * 1.8, level: m.level - this.tierOffset, tier: 'normal', timer: 0, mon: null, forceType: m.type }); if (c) { c.child = true; c.dungeon = m.dungeon; c.home = { x: c.pos.x, z: c.pos.z }; c.name = `${c.name} 졸개`; } }
  }
  // 강화 몬스터가 때렸을 때
  champHit(m, dmg) {
    const A = m.affix, st = this.st, D = (this.pdeb ||= {});
    if (A.includes('fire')) D.burn = { t: 3, v: this.d.maxHp * 0.01, lv: m.level };
    if (A.includes('cold')) D.slow = Math.max(D.slow || 0, 2);
    if (A.includes('curse')) D.vuln = 4;
    if (A.includes('manaburn')) st.mp = Math.max(0, st.mp - this.d.maxMp * 0.05);
    if (A.includes('vamp')) m.hp = Math.min(m.maxHp, m.hp + dmg * 0.3);
  }
  // 몬스터 없이 받는 피해 (화상 · 낙뢰): 그 자리 레벨로 방어력 계산
  envHurt(v, lv) { this.hurtPlayer(v, { level: lv ?? (this.dungeon ? this.dungeon.zone.levels[1] + this.tierOffset : zoneAt(this.player.pos.x, this.player.pos.z)?.levels?.[1] + this.tierOffset || 1), dead: true }, { sure: true }); }
  // 플레이어 상태 이상 · 강화 몬스터의 순간이동 · 속박
  debuffStep(dt) {
    const D = this.pdeb; if (D) {
      for (const k of ['slow', 'vuln', 'root']) if (D[k] > 0) D[k] -= dt;
      if (D.burn) { D.burn.t -= dt; D.burn.tick = (D.burn.tick ?? 1) - dt; if (D.burn.tick <= 0) { D.burn.tick = 1; if (!this.dead) this.envHurt(D.burn.v, D.burn.lv); } if (D.burn.t <= 0) D.burn = null; }
    }
    if (this.dead || this.inTown) return;
    const P = this.player.pos;
    for (const m of this.monsters) {
      if (m.dead || !m.affix || m.state !== 'chase' || (m.dungeon && this.dungeon && !this.dungeon.started)) continue;
      const dd = Math.hypot(m.pos.x - P.x, m.pos.z - P.z);
      if (m.affix.includes('teleport') && dd > 9 && dd < 30 && !(m.tpT > this.time)) { m.tpT = this.time + 6; const a = Math.random() * 6.28, q = this.freeSpot(P.x + Math.cos(a) * 2, P.z + Math.sin(a) * 2, 0.8); this.fx.play?.('sparkle', m.pos.x, m.pos.z, { scale: 0.8, dur: 0.4 }); m.pos.x = q.x; m.pos.z = q.z; this.fx.play?.('sparkle', q.x, q.z, { scale: 0.8, dur: 0.4 }); }
      if (m.affix.includes('jailer') && dd < 8 && !(m.jailT > this.time)) { m.jailT = this.time + 9; (this.pdeb ||= {}).root = 1; this.fx.text(P.clone().setY(2.6), '속박', 'miss'); }
    }
  }
  // v0.47 던전 변이: 지금 던전에 그 변이가 있나
  mut(id) { return !!this.dungeon?.muts?.includes(id); }
  // 들어간 뒤 변이를 보고 [시작] (그전엔 몬스터가 움직이지 않는다) · 무너지는 던전 시간 · 화상 · 낙뢰 · 위쪽 띠
  dungeonStep(dt) {
    const dg = this.dungeon; let el = document.getElementById('dgMuts');
    if (!dg || !dg.muts?.length || dg.cleared) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'dgMuts'; document.body.appendChild(el); el.onclick = () => this.showMuts(true); }
    if (!dg.started) { if (!dg.asked) { dg.asked = true; this.showMuts(false); } el.innerHTML = ''; return; }
    const left = dg.muts.includes('collapse') ? Math.max(0, COLLAPSE_SEC - (this.time - dg.t0)) : null;
    const key = dg.muts.join() + '|' + (left == null ? '' : Math.ceil(left));
    if (el.dataset.k !== key) { el.dataset.k = key; el.innerHTML = (left != null ? `<b class="${left < 60 ? 'low' : ''}">${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</b>` : '') + dg.muts.map((id) => `<span>${MUTS[id].name}</span>`).join(''); }
    if (left === 0) { this.ui.toast('던전이 무너졌습니다', '#ff7060'); sfx('error'); this.leaveDungeon(); return; }
    if (this.dead) return;
    if (this.mut('burning') && (dg.burnT = (dg.burnT ?? 3) - dt) <= 0) { dg.burnT = 3; this.envHurt(this.d.maxHp * 0.015); this.fx.play?.('fire', this.player.pos.x, this.player.pos.z, { scale: 0.6, dur: 0.6 }); }
    if (this.mut('storm') && (dg.stormT = (dg.stormT ?? 6) - dt) <= 0) {
      dg.stormT = 6 + Math.random() * 3; const P = { x: this.player.pos.x, z: this.player.pos.z };
      this.fx.telegraph?.(P.x, P.z, 2.2, 1.2, 0x80c0ff);
      this.later(1.2, () => { if (!this.dungeon) return; this.fx.play?.('lightning', P.x, P.z, { scale: 1.2, dur: 0.5 }); if (Math.hypot(this.player.pos.x - P.x, this.player.pos.z - P.z) < 2.2) this.envHurt(this.d.maxHp * 0.08); });
    }
  }
  // 변이 보기: 들어갔을 때는 [시작] (나가기도 고를 수 있다), 그 뒤엔 보기만
  showMuts(again) {
    const dg = this.dungeon; if (!dg?.muts?.length) return;
    const b = mutBonus(dg.muts.length), html = dg.muts.map((id) => `<div style="margin:.35em 0"><b style="color:#ffb060">${MUTS[id].name}</b><br><small>${MUTS[id].text}</small></div>`).join('') + `<div style="margin-top:.6em;color:#7fe07a">보상: 장비 레벨 +${b.lv} · 전설 ×${b.legend.toFixed(2)} · 금화 · 보석 +${Math.round((b.gold - 1) * 100)}%</div>`;
    if (again) { this.ui.ask('던전 변이', html, null, () => {}); return; }
    this.toggleAuto(false);
    this.ui.choose('던전 변이', html, [{ label: '시작' }, { label: '나가기' }], (i) => {
      if (!this.dungeon) return;
      if (i === 1) { this.leaveDungeon(); return; }
      dg.started = true; dg.t0 = this.time; this.ui.toast('던전 시작', '#ffd84a');
    });
  }
  rumorNear(rad = 3) {
    if (this.dungeon) return null;
    const P = this.player.pos;
    return rumorsOf(this.st).find((r) => r.x != null && Math.hypot(r.x - P.x, r.z - P.z) < rad) || null;
  }
  askRumor(r) {
    if (this.asking) return;
    const pl = PLUS[r.plus || 0], zn = ALL_ZONES[r.zi];
    this.asking = true; this.moveTo = null; this.target = null; this.toggleAuto(false);
    this.ui.ask(rumorName(r), `몬스터 Lv ${zn.levels[1] + 5 + this.tierOffset} · 체력 ×${pl.hp} · 공격력 ×${pl.dmg}<br>한 번만 들어갈 수 있습니다 (나오면 다시 들어갈 수 있고, 깨면 사라집니다)`, '들어가기', (yes) => { this.asking = false; if (yes) this.enterDungeon(r.zi, 1, { hidden: r }); });
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
  // 지역 보스를 잡았나 (예전 저장은 도감의 보스 처치 수로)
  bossCleared(zn) { return !!this.st.bossDone?.[zn.id] || (this.st.dex?.[zn.boss.type] || 0) > 0; }
  askDungeon(zi) {
    if (this.asking || zi < 0) return;
    if (!this.bossCleared(ALL_ZONES[zi])) { this.ui.toast(`${ALL_ZONES[zi].boss.name}을(를) 쓰러뜨려야 던전이 열립니다`); sfx('error'); return; }
    const zn = ALL_ZONES[zi], stage = Math.min(MAX_STAGE, (this.st.dungeons?.[zn.id] || 0) + 1);
    this.asking = true; this.moveTo = null; this.target = null; this.toggleAuto(false);
    // v0.42 난이도 셋 중 하나 (열쇠가 있는 것만)
    const opts = DUNGEON_DIFFS.map((d) => { const n = countOf(this.st, d.key); return { label: d.name, sub: `${BASES[d.key].name} ${n}`, off: !n }; });
    this.ui.choose(`${zn.name} 던전 ${stage}단계`, '난이도', opts, (i) => { this.asking = false; if (i >= 0) this.enterDungeon(zi, i + 1); });
  }
  // v0.44.47 미지의 땅: 미지의 지도를 쓰면 보스를 잡은 지역 중 하나의 던전 길을 함정 · 매복으로 채워 돌파 (끝의 유물 수호자 = 유물)
  enterUnknown() {
    const ok = ALL_ZONES.map((z, i) => [z, i]).filter(([z]) => this.bossCleared(z));
    if (!ok.length) { this.ui.toast('보스를 잡은 지역이 있어야 합니다'); return; }
    if (countOf(this.st, 'unknown_map') <= 0) return;
    const [, zi] = ok[Math.floor(Math.random() * ok.length)];
    this.enterDungeon(zi, 1, { unknown: true });
  }
  enterDungeon(zi, diff = 1, opt = {}) {
    const st = this.st, zn = ALL_ZONES[zi], D = DUNGEON_DIFFS[diff - 1] || DUNGEON_DIFFS[0];
    if (opt.gate) { const i = st.inv.indexOf(opt.gate); if (i < 0) return; st.inv.splice(i, 1); } // v0.44.50 열린 미지의 길로 다시
    else if (!opt.hidden && !takeOne(st, opt.unknown ? 'unknown_map' : D.key)) return;
    const stage = opt.unknown ? 5 : opt.hidden ? 1 : Math.min(MAX_STAGE, ((st.dungeons ||= {})[zn.id] || 0) + 1);
    this.leaveDungeon(true);
    this.dungeon = { zi, stage, zone: zn, diff, unknown: !!opt.unknown, until: opt.gate?.until || Date.now() + 86400e3 };
    const HP = opt.hidden ? PLUS[opt.hidden.plus || 0] : null; // v0.46 숨은 던전: 지역보다 세게 (지도 강화만큼 더)
    if (HP) Object.assign(this.dungeon, { hidden: opt.hidden.id, plus: opt.hidden.plus || 0 });
    { const dg0 = this.dungeon; // v0.47 변이 (숨은 던전은 소문에 저장해 다시 들어가도 같다) · 기록(시간 · 피해 · 처치 · 주운 것)
      dg0.muts = opt.unknown ? [] : opt.hidden ? (opt.hidden.muts ||= rollMuts(mutCount({ hidden: true, plus: opt.hidden.plus || 0 }))) : rollMuts(mutCount({ diff }));
      dg0.started = !dg0.muts.length; dg0.t0 = this.time; dg0.dmg = 0; dg0.kills = 0; dg0.got = []; }
    this.toggleAuto(false);
    const Ld = dungeonLayout(zi), sp0 = cellPos(zi, Ld.start[0], Ld.start[1]);
    this.player.pos.set(sp0.x, 0, sp0.z); this.moveTo = null; this.target = null;
    this.stage.cam.x = sp0.x; this.stage.cam.z = sp0.z;
    this.fx.arrive(sp0.x, sp0.z);
    const mod = stageMods(stage), L = opt.unknown ? (st.bossTop ? Math.max(1, Math.round(st.bossTop * 1.05) - this.tierOffset) : Math.round(Math.max(...ALL_ZONES.filter((z) => this.bossCleared(z)).map((z) => z.levels[1])) * 1.1)) : HP ? zn.levels[1] + 5 : dungeonLevel(zn, stage); // v0.44.62 잡은 보스 기준 (spawn이 세계 단계를 더한다)
    if (opt.unknown) this.dungeon.L = L; // 1단계는 지역 중간 레벨부터 (필드 → 던전 격차를 줄였다)
    // 세계 단계 보정은 spawn에서 더한다 (예전엔 두 번 더해 지옥 던전이 283레벨이 됐다)
    // 몬스터: 시작에서 먼 칸일수록 많이 · 정예는 깊은 곳, 우두머리는 가장 먼 방
    const cells = [];
    for (let k = 0; k < Ld.g.length; k++) if (Ld.g[k] && Ld.dist[k] > 5 && Ld.dist[k] < Ld.far - 2) cells.push(k);
    const pick = () => cells.splice(Math.floor(Math.random() * cells.length), 1)[0];
    const put = (k, tier, fixed) => {
      const p = cellPos(zi, k % N, Math.floor(k / N));
      const m = this.spawn({ zone: zn, x: p.x, z: p.z, level: L, tier, timer: 0, mon: null, fixed });
      m.maxHp = m.hp = Math.round(m.maxHp * mod.hp * D.hp * (HP?.hp || 1)); m.dmg = m.dmg.map((v) => v * mod.dmg * D.dmg * (HP?.dmg || 1)); m.dungeon = true; m.exp *= 1.5 * D.loot;
      m.home = { x: p.x, z: p.z };
      const MA = (this.dungeon.muts || []).filter((x) => MUT_AFFIX.includes(x)); // v0.47 몬스터 변이
      if (MA.length) { m.affix = [...new Set([...(m.affix || []), ...MA])]; if (MA.includes('frenzy')) { m.speed *= 1.3; m.def = { ...m.def, interval: m.def.interval / 1.3 }; } }
      if (!opt.unknown) this.champion(m, this.wt - 1 + (HP ? 1 + Math.floor((opt.hidden.plus || 0) / 2) : diff - 1)); // v0.48 던전이 어려울수록 강화 몬스터
    };
    for (let n = 0; n < (opt.unknown ? 30 : HP ? 16 : 14 + Math.min(8, stage)) && cells.length; n++) put(pick(), 'normal'); // 낮은 단계는 몬스터가 적다
    cells.sort((a, b) => Ld.dist[b] - Ld.dist[a]);
    for (let n = 0; n < (opt.unknown ? 10 : HP ? 6 : 4) * (this.mut('elite') ? 2 : 1) && cells.length; n++) put(cells.splice(Math.floor(Math.random() * Math.min(opt.unknown ? 30 : 12, cells.length)), 1)[0], 'elite');
    put(Ld.boss[1] * N + Ld.boss[0], 'boss', { type: opt.unknown ? zn.named.type : zn.boss.type, name: opt.unknown ? '유물 수호자' : HP ? `${zn.name}의 숨은 주인` : `${zn.name} 던전 우두머리` });
    { const bm = this.monsters[this.monsters.length - 1]; if (bm?.tier === 'boss') { const k = HP ? 1.6 : 0.55 + 0.09 * stage; bm.maxHp = bm.hp = Math.round(bm.maxHp * k); } } // 우두머리: 1단계 0.64배 → 10단계 1.45배
    if (opt.unknown) { for (const m of this.monsters) if (m.dungeon) m.noLoot = true; this.trapT = 3; this.ui.toast('미지의 땅 — 끝에 유물이 있습니다', '#ffd060'); }
    else if (HP) this.ui.toast(`${rumorName(opt.hidden)} — 가장 깊은 곳의 숨은 주인을 찾으세요`, '#ffd060');
    else this.ui.toast(`${zn.name} 던전 ${stage}단계 · ${D.name} — 가장 깊은 곳의 우두머리를 찾으세요`, diff > 1 ? '#ff7a9a' : '#ffd84a');
    this.ui.dirty();
  }
  leaveDungeon(silent = false) {
    if (!this.dungeon) return;
    // v0.44.50 미지의 땅을 다 못 깨고 나오면 24시간 안에 다시 들어갈 「열린 미지의 길」 (다시 들어가면 처음부터)
    { const dg = this.dungeon; if (dg.unknown && !dg.cleared && Date.now() < dg.until) { const g = makeItem('unknown_gate', { qty: 1 }, this.st); Object.assign(g, { zi: dg.zi, until: dg.until }); delete g.qty; addItem(this.st, g) || this.st.inv.push(g); } }
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
  // 세계 단계 열기: 지금 단계에서 종말의 왕좌 보스를 잡았고(순서 상관없음) + 그 던전을 3 · 6단계까지 돌파
  checkTierUnlock() {
    const st = this.st, t = st.worldTier || 1;
    if (t >= TIER_NAMES.length || (st.maxTier || 1) > t) return;
    if (t === 3 && (st.awakenings || 0) < 300) return; // 혼돈은 4차 전직(300) 뒤에
    const boss = (st.finalBoss || 0) >= t || (t === 1 && (st.bossDone?.[FINAL_ZONE] || 0)); // 예전 저장: 1단계 보스 기록
    if (!boss || (st.dungeons?.[FINAL_ZONE] || 0) < 3 * t) return;
    st.maxTier = t + 1; this.ui.toast(`세계 ${TIER_NAMES[st.maxTier - 1]} 단계가 열렸습니다`, '#ff9a6a'); sfx('awaken');
  }

  dungeonCleared(m) {
    const st = this.st, dg = this.dungeon, zn = dg.zone;
    if (dg.unknown) { dg.cleared = true; // 미지의 땅: 유물 하나 (등급은 유물 제단 단계로) + 금화
      const al = Object.values(st.town?.plots || {}).find((b) => b.type === 'altar'), r = rollRelic(al?.lv || 0);
      ((st.relics ||= { bag: [], on: [] }).bag ||= []).push(r); st.gold += dg.L * 300;
      this.ui.toast(`유물 「${RELIC[r.id].name}」 (${RELIC_GRADES[r.g].name})`, RELIC_GRADES[r.g].color); sfx('rankup');
      this.fx.pillar(m.pos.x, m.pos.z, 0xffd060, 1.8, 6, 1.5); this.ui.dirty(); return;
    }
    if (dg.hidden) { this.hiddenCleared(m); return; }
    st.dungeons[zn.id] = Math.max(st.dungeons[zn.id] || 0, dg.stage);
    this.checkTierUnlock();
    this.dailyDone(dailyProgress(st, { kind: 'dungeon', zone: zn.id }));
    // 보상: 영웅 이상 2개 (단계가 높을수록 전설), 상급 스킬북 하나, 금화
    const MB = mutBonus(dg.muts?.length || 0), gMark = this.ground.length; // v0.47 변이 보상 · 결과 창에 보일 보상
    const lv = dungeonLevel(zn, dg.stage) + this.tierOffset + MB.lv;
    const D = DUNGEON_DIFFS[(dg.diff || 1) - 1];
    // 신화: 강화 · 극한 던전 우두머리에서만, 한 번 돌파에 한 번 굴린다 (극한 10단계도 3%) · 못 나오면 신화의 흔적이 쌓인다
    // v0.44.18 좋은 아이템 발견: 신화 100%마다 +0.1%p (최대 3%), 전설 100%마다 +0.3%p (최대 +5%p)
    const mf = Math.max(0, this.d.magicFind + researchK(st, 'luck'));
    const mythP = Math.min(0.03, D.myth(dg.stage) + (mf / 100) * 0.001), legendP = (D.legend(dg.stage) + Math.min(0.05, (mf / 100) * 0.003)) * MB.legend;
    let myth = dg.diff > 1 && Math.random() < mythP ? 1 : 0;
    // v0.44.16 신화의 흔적은 내 수준에 맞는 던전에서만 (던전 레벨이 각성보다 20 넘게 낮으면 없음)
    if (dg.diff > 1) { if (lv >= (st.awakenings || 0) - 20) { resAdd(st, 'myth_mark', 1); this.ui.log(`신화의 흔적 +1 (${resCount(st, 'myth_mark')})`, '#ff7aa8'); } else this.ui.log('너무 쉬운 던전이라 신화의 흔적이 나오지 않았습니다', '#a09080'); }
    // 전설: 돌파에 한 번만 굴린다 — 보통 1 → 4%, 강화 2 → 6%, 극한 3 → 9% (v0.42.11, 최대 10% 미만). 나머지는 영웅 35% · 희귀
    const legend = !myth && Math.random() < legendP;
    for (let i = 0; i < D.items; i++) {
      const rarity = i === 0 && myth ? 'myth' : i === 0 && legend ? 'legend' : Math.random() < 0.35 ? 'hero' : 'rare';
      // 절반은 내 무기 종류(무기 · 보조 칸)로 — 장비 줄이 많아져 지팡이 등이 묻히지 않게 (v0.39.6)
      let base = rollBase(lv);
      // (예전: 첫 장비는 내 무기 종류로 — 디아블로식으로 완전히 무작위가 되게 없앰)
      this.dropGround({ kind: 'item', item: makeItem(base, { rarity, ilvl: lv }, st) }, m.pos.x + i * 1.2, m.pos.z + 1);
    }
    const tier = dg.stage >= 7 ? 5 : dg.stage >= 4 ? 4 : 3, pool = Object.keys(SKILLS).filter((id) => SKILLS[id].tier === tier && !SKILLS[id].awaken); // 각성 등급이 정해진 스킬은 몬스터 레벨로만
    this.dropGround({ kind: 'item', item: makeBook(pool[Math.floor(Math.random() * pool.length)], st) }, m.pos.x - 1.2, m.pos.z + 1);
    this.dropGround({ kind: 'gold', amount: Math.round(lv * 60 * (1 + dg.stage * 0.2) * D.loot * MB.gold) }, m.pos.x, m.pos.z - 1);
    if (dg.diff > 1) { const e = dropEss(st, lv, 'boss', D.loot); if (e) this.ui.log(`${BASES[e.id].name} +${e.n}`, '#c8b0ff'); }
    if (myth) { this.fx.shake(0.6); this.fx.pillar(m.pos.x, m.pos.z, 0xff4a8a, 3, 8, 2.5); sfx('rare'); this.ui.toast('신화 장비!', '#ff4a8a'); (st.rec ||= {}).myths = (st.rec.myths || 0) + myth; }
    this.ui.toast(`던전 ${dg.stage}단계 · ${D.name} 돌파!`, '#ffd84a');
    sfx('awaken');
    this.showClear(`${zn.name} 던전 ${dg.stage}단계 · ${D.name} 돌파`, dg, this.ground.slice(gMark));
    dg.cleared = true; // 공격 버튼이 「나가기」로 바뀐다 (input.js). 전리품을 다 줍고 나간다
  }

  // v0.47 돌파 결과 창: 걸린 시간 · 준 피해 · 초당 피해 · 처치 · 보상(바닥에 떨어진 것 + 재료) · 주운 장비
  showClear(title, run, drops = [], mats = []) {
    const sec = Math.max(1, this.time - (run.t0 ?? this.time)), dmg = run.dmg || 0;
    const fmtT = `${Math.floor(sec / 60)}분 ${Math.floor(sec % 60)}초`, big = (v) => (v >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : v >= 1e4 ? `${(v / 1e4).toFixed(1)}만` : Math.round(v).toLocaleString());
    const rows = [];
    for (const g of drops) { if (g.kind === 'gold') rows.push({ img: coinIcon(), name: `금화 ${g.amount.toLocaleString()}`, color: '#ffd84a' }); else if (g.item) rows.push({ img: itemIcon(g.item), name: itemName(g.item) + (g.item.qty > 1 ? ` ×${g.item.qty}` : ''), color: itemColor(g.item) }); }
    for (const [n, q] of mats) rows.push({ name: `${n} ×${q}`, color: '#c8c0b0' });
    const got = (run.got || []).filter((it) => it.rarity && ['rare', 'hero', 'legend', 'myth'].includes(it.rarity));
    const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const row = (r) => `<div class="ntcRow">${r.img ? `<img src="${r.img}" alt="" />` : ''}<span style="color:${r.color}">${esc(r.name)}</span></div>`;
    const html = `<div class="clearBox"><div class="clearStats"><div class="kv tight"><span>걸린 시간</span><b>${fmtT}</b><span>준 피해</span><b>${big(dmg)}</b><span>초당 피해</span><b>${big(dmg / sec)}</b><span>처치</span><b>${run.kills || 0}</b>${run.muts?.length ? `<span>변이</span><b>${run.muts.length}개</b>` : ''}</div>${run.muts?.length ? `<div class="note" style="margin-top:6px">${run.muts.map((id) => MUTS[id].name).join(' · ')}</div>` : ''}</div>`
      + `<div class="clearLoot"><h3>보상</h3><div class="ntcRows">${rows.map(row).join('') || '<div class="note">없음</div>'}</div>${got.length ? `<h3>주운 장비 ${got.length}</h3><div class="ntcRows">${got.slice(0, 12).map((it) => row({ img: itemIcon(it), name: itemName(it), color: itemColor(it) })).join('')}</div>` : ''}</div></div>`;
    globalThis.__game?.windows?.popup?.(title, html, true, true); // 닫기를 눌러야만 사라진다
  }
  // v0.46 숨은 던전 돌파: 소문이 사라지고, 보물 상자 셋(부위) 중 하나를 고른다. 지역보다 한 단계 높은 장비 · 희귀 이상
  hiddenCleared(m) {
    const st = this.st, dg = this.dungeon, zn = dg.zone, pl = PLUS[dg.plus || 0];
    dg.cleared = true;
    const R = rumorsOf(st), i = R.findIndex((r) => r.id === dg.hidden); if (i >= 0) R.splice(i, 1);
    const MB = mutBonus(dg.muts?.length || 0), gMark = this.ground.length;
    const lv = zn.levels[1] + 6 + pl.lv + this.tierOffset + MB.lv, mf = Math.max(0, this.d.magicFind + researchK(st, 'luck'));
    const myth = Math.random() < Math.min(0.05, pl.myth + (pl.myth ? (mf / 100) * 0.001 : 0)), legend = !myth && Math.random() < (pl.legend + Math.min(0.05, (mf / 100) * 0.003)) * MB.legend;
    const rarity = myth ? 'myth' : legend ? 'legend' : Math.random() < 0.4 ? 'hero' : 'rare';
    if (dg.plus >= 2 && lv >= (st.awakenings || 0) - 20) { resAdd(st, 'myth_mark', 1); this.ui.log(`신화의 흔적 +1 (${resCount(st, 'myth_mark')})`, '#ff7aa8'); }
    // 금화 · 보석 둘 · 능력치 파편 하나는 바로 떨어진다
    this.dropGround({ kind: 'gold', amount: Math.round(lv * 120 * (1 + dg.plus * 0.5) * MB.gold) }, m.pos.x, m.pos.z - 1);
    for (let k = 0; k < Math.round((2 + Math.floor(dg.plus / 2)) * MB.gold); k++) this.dropGround({ kind: 'item', item: makeItem(`gem_${['ruby', 'emerald', 'sapphire', 'amethyst', 'diamond'][Math.floor(Math.random() * 5)]}_${gemGradeFor(lv)}`, { qty: 1 }, st) }, m.pos.x - 1.2 + k * 0.6, m.pos.z - 0.4);
    this.dropGround({ kind: 'item', item: rollShard(lv, st) }, m.pos.x + 1.2, m.pos.z - 0.4);
    // 상자 셋 = 부위 셋
    const groups = [['무기', ['weapon']], ['보조 장비', ['offhand']], ['투구', ['helm']], ['갑옷', ['armor']], ['장갑', ['gloves']], ['허리띠', ['belt']], ['신발', ['boots']], ['목걸이', ['amulet']], ['반지', ['ring']]];
    const three = []; while (three.length < 3) { const g = groups[Math.floor(Math.random() * groups.length)]; if (!three.includes(g)) three.push(g); }
    const give = (slots) => {
      let base = null; for (let k = 0; k < 80 && !base; k++) { const b = rollBase(lv); if (slots.includes(BASES[b]?.slot)) base = b; }
      if (!base) { const ids = Object.keys(BASES).filter((id) => slots.includes(BASES[id].slot) && !BASES[id].noDrop && (BASES[id].minLvl ?? 1) <= lv); base = ids.sort((a, b) => (BASES[b].minLvl ?? 1) - (BASES[a].minLvl ?? 1))[0] || rollBase(lv); }
      this.dropGround({ kind: 'item', item: makeItem(base, { rarity, ilvl: lv }, st) }, m.pos.x, m.pos.z + 1);
      if (myth) { this.fx.shake(0.6); this.fx.pillar(m.pos.x, m.pos.z, 0xff4a8a, 3, 8, 2.5); sfx('rare'); this.ui.toast('신화 장비!', '#ff4a8a'); (st.rec ||= {}).myths = (st.rec.myths || 0) + 1; }
      this.showClear(`${rumorName({ zi: dg.zi, plus: dg.plus })} 돌파`, dg, this.ground.slice(gMark));
      this.ui.dirty();
    };
    sfx('awaken'); this.ui.toast('숨은 던전 돌파! 보물 상자 하나를 고르세요', '#ffd060');
    this.ui.choose('보물 상자', '하나를 고르면 그 부위의 장비가 나옵니다', three.map(([n]) => ({ label: n })), (k) => give(three[k >= 0 ? k : 0][1]));
    this.ui.dirty();
  }

  // 각성 20 · 40 · 60: 키운 스탯으로 칭호를 받고 특성 하나를 고른다
  offerTitle(tier) {
    const st = this.st, key = titleKey(st.stats, CONFIG.startStat, tier);
    if ((st.titles ||= []).some((t) => t.tier === tier) || this.titleOpen) return;
    this.titleOpen = true;
    this.ui.titlePick({ tier, key, name: titleName(key, tier), choices: perkChoices(key, tier, (st.titles || []).map((x) => x.perk?.eff)) }, (perk) => {
      this.titleOpen = false;
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
    // 마을 꾸밈 (v0.40): 주민 둘 · 귀환 오벨리스크
    for (const [npc, x, z, f] of [['peasant_man2', 6, 7, -0.8], ['peasant_woman2', 7.2, 6.2, 2.2], ['return_obelisk1', 5.5, 1.5, 0]]) {
      const a = new Actor(this.scene, { npc }); a.pos.set(x, 0, z); a.facing = f; a.play('idle');
    }
  }

  get canShop() { const P = this.player.pos, c = inCamp(P.x, P.z); return this.inTown || !!(c && this.st.camps?.[c.zone]?.merchant) || !!(this.eventNpc && dist2(this.eventNpc.pos, P) < 6); }
  // 세계 단계: 마지막 보스를 잡으면 다음 단계가 열린다. 단계마다 모든 몬스터 레벨 +66 (드랍 장비 · 보석 등급도 따라 오른다)
  get wt() { return Math.min(4, Math.max(1, this.st.worldTier || 1)); }
  get tierOffset() { return [0, TIER_STEP, TIER_STEP * 2, 380][this.wt - 1]; } // 세계 단계 한 칸 = 평온 마지막 지역 레벨 (120)
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
    this.spawners = this.spawners.filter((sp) => !inCamp(sp.x, sp.z, 6)); // v0.49.14 포탈 둘레 넉넉히
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
    // 챕터(지역) 보정: 지역마다 머무는 시간 · 처치 시간 · 보스 세기를 맞춘다 (data/chapters.js, 던전도 그 지역 값)
    const czn = sp.zone || this.dungeon?.zone, CK = chapterK(czn ? ALL_ZONES.indexOf(czn) : -1, tier);
    const L = sp.level + this.tierOffset;
    const look = MONSTER_LOOK[type] || { sprite: 'goblin' };
    const fam = familyOf(look.sprite);
    const actor = new Actor(this.scene, { enemy: look.sprite }, { tint: tint ?? look.tint ?? null, scale: T.scale, size: look.size || 1 });
    if (tier === 'elite') actor.setGlow(0x0a1a40);
    if (tier === 'named') actor.setGlow(0x302000);
    if (tier === 'boss') actor.setGlow(0x400800);
    const a = Math.random() * Math.PI * 2;
    const fp = this.freeSpot(sp.x + Math.cos(a) * 1.5, sp.z + Math.sin(a) * 1.5, 0.9);
    // v0.49.14 포탈(야영지) 둘레는 몬스터가 공격하지 않는 곳이라 거기서는 나지 않는다 — 범람 · 습격 · 졸개 등 모든 생성에서 둘레 밖으로 밀어낸다
    { const c = inCamp(fp.x, fp.z, 5); if (c) { let ang = Math.atan2(fp.z - c.z, fp.x - c.x); if (!isFinite(ang)) ang = Math.random() * 6.28; for (let k = 0; k < 8; k++) { const q = this.freeSpot(c.x + Math.cos(ang) * 13, c.z + Math.sin(ang) * 13, 0.9); if (!inCamp(q.x, q.z, 5)) { fp.x = q.x; fp.z = q.z; fp.moved = true; break; } ang += 0.8; } } }
    actor.pos.set(fp.x, 0, fp.z);
    actor.facing = Math.random() * 6.28;
    actor.root.rotation.y = actor.facing;
    const m = {
      id: actor.id, def, type, tier, level: L, actor, sp, fam,
      name: name || (tier === 'elite' ? `정예 ${def.name}` : def.name),
      maxHp: Math.round(def.hp * (1 + 0.4 * (L - 1)) * T.hp * TIER_K[this.wt].hp * CK.hp),
      dmg: def.dmg.map((v) => v * (1 + 0.27 * (L - 1)) * T.dmg * TIER_K[this.wt].dmg * CK.dmg),
      armor: L * 2,
      exp: def.exp * (1 + 0.3 * (L - 1)) * T.exp * CK.exp,
      speed: def.speed * (tier === 'boss' ? 1.1 : 1),
      state: 'idle', atkT: 1, wanderT: Math.random() * 4, deadT: 0, slowT: 0, showHp: 0,
      home: fp.moved ? { x: fp.x, z: fp.z } : { x: sp.x, z: sp.z }, // 포탈 둘레에서 밀려났으면 그 자리가 집
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
    const fl = this.st.flood?.list;
    for (const sp of this.spawners) {
      if (sp.mon) continue;
      if (fl?.length && sp.zone && fl.some((f) => f.zone === sp.zone.id)) continue; // v0.44.45 범람지는 범람 몬스터만 (다시 나지 않는다)
      sp.timer -= dt;
      // 플레이어 바로 앞에서 튀어나오지 않게 · 먼 곳은 가까워질 때 만든다 (몬스터 수 · 메모리 절약)
      const d = Math.hypot(sp.x - p.x, sp.z - p.z);
      if (sp.timer <= 0 && d > 14 && d < SPAWN_NEAR) { const nm = this.spawn(sp); if (nm) this.champion(nm, this.wt - 1); } // v0.48 세계 단계가 높을수록 강화 몬스터
    }
  }

  monsterAI(m, dt) {
    const a = m.actor;
    const p = this.player.pos;
    if (m.dash) { this.dashStep(m, dt); return; }
    const d = dist2(m.pos, p);
    const valid = !this.dead && !this.inTown && !inCamp(p.x, p.z);
    const fromHome = dist2(m.pos, m.home);
    const spd = m.rootT > 0 ? 0 : m.speed * (m.slowT > 0 ? 0.5 : 1); // v0.44.38 얼음 감옥: 묶임
    if (m.slowT > 0) m.slowT -= dt;
    if (m.rootT > 0) m.rootT -= dt;
    if (m.vulnT > 0) m.vulnT -= dt;
    // 출혈 · 연소 · 화상: 1초마다
    if (m.dotT > 0) { m.dotT -= dt; m.dotAcc = (m.dotAcc || 0) + dt; if (m.dotAcc >= 1) { m.dotAcc -= 1; this.hitMonster(m, m.dotV / 0.9, { src: 'dot' }); } }
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
        if (m.patT <= 0 && a.lock <= 0) { m.patT = (m.tier === 'boss' ? (m.def.final ? 3.2 : 5.5) : 8.5) / TIER_K[this.wt].pat; this.bossPattern(m, all[(m.patI = (m.patI || 0) + 1) % all.length]); }
      }
      // v0.44.14 낙인: 보스가 오래(60초, 마지막 보스 45초) 한 대도 노리지 못하면 피할 수 없는 일격 — 원거리로 끝없이 맴돌며 잡는 것을 막는다
      if (m.tier === 'boss' && valid && m.fightStart != null && !m.doom && a.lock <= 0 && this.time - (m.lastHit ?? m.fightStart) > (m.def.final ? 45 : 60)) this.bossPattern(m, 'doom');
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
  danger(m, x, z, r, delay, mult, color = 0xff4020, img = null) {
    this.fx.telegraph(x, z, r, delay, color);
    this.later(delay, () => {
      if (m.dead) return;
      this.fx.ring(x, z, r * 1.15, color, 0.5);
      this.fx.pillar(x, z, color, 0.45, 4, r * 0.55);
      if (img) { this.fx.play(img, x, z, { scale: Math.min(1.8, Math.max(0.7, r / 2.2)) }); if (r > 2.6) for (let i = 0; i < 4; i++) { const g = i * 1.57 + 0.4; this.fx.play(img, x + Math.cos(g) * r * 0.55, z + Math.sin(g) * r * 0.55, { scale: 0.8 }); } }
      this.fx.burst(x, 0.6, z, color, 18, 6, 0.55);
      this.fx.shake(Math.min(0.6, r * 0.08));
      sfx('boom', 0.6);
      if (!this.dead && Math.hypot(this.player.pos.x - x, this.player.pos.z - z) < r) this.hurtPlayer(randRange(m.dmg[0], m.dmg[1]) * mult, m);
    });
  }

  // 직선 위험 지대: 선분에서 w/2 안이면 맞는다
  dangerLane(m, x1, z1, x2, z2, w, delay, mult, color = 0xff4020, img = null) {
    this.fx.lane(x1, z1, x2, z2, w, delay, color);
    this.later(delay, () => {
      if (m.dead) return;
      const n = Math.max(2, Math.round(Math.hypot(x2 - x1, z2 - z1) / 2.5));
      for (let i = 0; i <= n; i++) { this.fx.burst(x1 + (x2 - x1) * i / n, 0.6, z1 + (z2 - z1) * i / n, color, 5, 4, 0.4); if (img) this.fx.play(img, x1 + (x2 - x1) * i / n, z1 + (z2 - z1) * i / n, { scale: Math.max(0.7, w / 2.6) }); }
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
    // v0.41 패턴마다 터지는 자리의 효과 그림 (powers.json)
    const IMG = { icelines: 'c_icetacle', avalanche: 'c_icespike', hail: 'c_icemultispike', quakerings: 'c_earthspike', fissure: 'c_earthmultispike', tailsweep: 'c_earthspike', leap: 'c_earthmultispike', boulder: 'c_earthpost',
      meteors: 'c_firepost', hellnova: 'c_firepost', cannons: 'c_firepost', breath: 'c_firepost', webtrail: 'spit', sporering: 'spit', mines: 'caltrops', cross: 'c_lightningclaw', xcross: 'c_lightningclaw', grid: 'c_lightningclaw',
      bonespiral: 'dark_mist_alt', pull: 'c_torrentacle', tongue: 'c_torrentacle' }[name] || null;
    const D = (x, z, r, t, k, c = C) => this.danger(m, x, z, r, t, k, c, IMG);
    const L = (x1, z1, x2, z2, w, t, k, c = C) => this.dangerLane(m, x1, z1, x2, z2, w, t, k, c, IMG);
    const at = (t, fn) => this.later(t, () => { if (!m.dead && !this.dead) fn(); });
    const cast = (anim = 'attack2', lock = 1) => { a.act(anim, 0.8); a.lock = lock; a.face(P().x, P().z); };
    switch (name) {
      case 'doom': { // 낙인: 4초 동안 힘을 모은 뒤 어디에 있든 맞는다 (회피 불가 · 방어력 · 막기 · 보호막은 적용). 그 전에 잡으면 넘어간다
        m.doom = true; cast('attack2', 1.2); sfx('cast');
        this.ui.toast(`${m.name}이(가) 낙인을 새깁니다!`, '#ff5a4a');
        for (let i = 0; i < 4; i++) at(i, () => { const q = P(); this.fx.telegraph(q.x, q.z, 1.6 + i * 0.3, 1, 0xb01020); this.fx.pillar(M.x, M.z, 0xff3030, 0.5, 5, 1.4); });
        at(4, () => {
          const q = P(); this.fx.ring(q.x, q.z, 3, 0xff2020, 0.6); this.fx.pillar(q.x, q.z, 0xff2020, 0.6, 6, 1.6); this.fx.shake(0.6); sfx('boom');
          this.hurtPlayer(this.d.maxHp * 0.6, m, { sure: true }); // 방어력에 따라 대략 HP 30 ~ 50%
          m.doom = false; m.lastHit = this.time - (m.def.final ? 20 : 25); // 그래도 계속 못 맞히면 다음 낙인은 더 빨리 (20 ~ 35초 뒤)
        });
        return true;
      }
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

  hurtPlayer(raw, m, opt = {}) {
    if (this.dead) return;
    const st = this.st, d = this.d;
    if (d.dmgReduce) raw *= 1 - d.dmgReduce / 100;
    const rf = rewardFactor(st, m.level);
    const apMult = rf.ap * this.autoMult;
    const head = this.player.pos.clone().setY(2.4);
    if (m) m.lastHit = this.time; // v0.44.14 보스가 마지막으로 노린 때 (낙인 패턴)
    if (!opt.sure && Math.random() < d.dodge) {
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
    if (this.buffs.taunt?.t > 0) dmg *= 1 - Math.min(40, this.buffs.taunt.v) / 100; // 도발의 포효
    if (this.buffs.guard?.t > 0) dmg *= 1 - Math.min(40, this.buffs.guard.v) / 100; // 투지
    if (this.art('toughbody')) dmg *= 0.95;
    dmg *= 1 - relicBonus(st, 'dr') / 100; // v0.44.47 유물
    if (this.art('provoker') && this.buffs.taunt?.t > 0) dmg *= 0.9;
    if (this.art('spellwall') && this.time - (this.lastSpellT || -9) < 1) dmg *= 0.9;
    this.artEv('dmgTaken', dmg); if (this.time - (this.lastSpellT || -9) < 1) this.artEv('spellHurt', dmg);
    this.lastHurtT = this.time; if (this.art('wild')) { this.pbuffs ||= {}; this.pbuffs.haste = { v: 20, t: 2 }; }
    const pre = dmg; // 가시 갑옷 · 인내의 폭발은 보호막 전 피해로
    const sh = this.buffs.shield;
    if (sh && sh.t > 0 && sh.v > 0) {
      const ab = Math.min(sh.v, dmg);
      sh.v -= ab; dmg -= ab; this.artEv('shieldAbsorb', ab);
      if (sh.v <= 0) { sh.t = 0; if (this.art('diamond')) { const P = this.player.pos, w = ((d.patk[0] + d.patk[1]) / 2) * d.atkMult; this.fx.ring(P.x, P.z, 4, 0xffe8b0, 0.5); for (const mm of this.monstersNear(P, 4)) this.hitMonster(mm, w, { src: 'skill' }); } }
    }
    // 마나 방패: 남은 피해를 MP로 막는다 (MP 1당 피해 1/비율). 막은 만큼 정신
    const ms = this.buffs.manaShield;
    if (ms && ms.t > 0 && st.mp > 0 && dmg > 0) {
      const ratio = Math.max(0.6, ms.v || 1), ab = Math.min(dmg, st.mp / ratio);
      st.mp -= ab * ratio; dmg -= ab;
      addAP(st, 'wis', (ab / d.maxHp) * AP_TABLE.hurtScale, apMult);
      if (dmg <= 0.5) { this.fx.text(head, '마나 방패', 'miss'); this.perk('hurt'); return; }
    }
    if ((this.pdeb?.vuln || 0) > 0) dmg *= 1.2; // v0.48 저주
    dmg = Math.max(1, Math.round(dmg));
    st.hp -= dmg;
    if (m?.affix && !m.dead && m.def) this.champHit(m, dmg);
    // v0.44.35 가시 갑옷: 때린 적에게 되돌려 준다 (무기 한 방의 3배까지) · 인내의 폭발: 모아 둔다
    const th = this.buffs.thorns;
    if (th?.t > 0 && m && !m.dead && m.pos && Math.hypot(m.pos.x - this.player.pos.x, m.pos.z - this.player.pos.z) < 8) { this.artEv('vengeHit'); } if (th?.t > 0 && m && !m.dead && m.pos && Math.hypot(m.pos.x - this.player.pos.x, m.pos.z - this.player.pos.z) < 8) this.hitMonster(m, Math.min(pre * (th.v + (this.art('retribution') ? 10 : 0)) / 100, ((this.d.patk[0] + this.d.patk[1]) / 2) * this.d.atkMult * (1 + (this.d.stats.vit || 0) * 0.015) * 3), { src: 'skill' });
    if (this.buffs.venge?.t > 0) this.buffs.venge.store = (this.buffs.venge.store || 0) + pre;
    // 체력 (v0.44.26): 실제로 받은 피해로, HP가 넉넉하면 적게(70%↑ ×0.3) · 위기일수록 많이(30%↓ ×1.5).
    //  최근 10초에 준 피해가 받은 피해의 3배를 넘으면 체력은 절반, 나머지 절반은 주 스탯으로 (멀리서 맞으며 녹이는 마법사 등)
    const shieldK = BASES[st.equip.offhand?.base]?.block ? 1.5 : 1, hpF = st.hp / d.maxHp;
    let vk = hpF >= 0.7 ? 0.3 : hpF >= 0.3 ? 1 : 1.5;
    const T = this.time - 10; this.takenLog = (this.takenLog || []).filter((x) => x[0] > T); this.takenLog.push([this.time, dmg]); this.dealtLog = (this.dealtLog || []).filter((x) => x[0] > T);
    const tk = this.takenLog.reduce((a, x) => a + x[1], 0), dl = this.dealtLog.reduce((a, x) => a + x[1], 0);
    const gain = (AP_TABLE.hurtHit + (dmg / d.maxHp) * AP_TABLE.hurtScale) * shieldK * vk;
    if (dl > tk * 3) { addAP(st, 'vit', gain * 0.5, apMult); addAP(st, this.d.cls?.ap || 'str', gain * 0.5, apMult); }
    else addAP(st, 'vit', gain, apMult);
    this.perk('hurt');
    this.player.hitFlash(0xff2000);
    this.fx.burst(this.player.pos.x, 1.2, this.player.pos.z, 0xff3020, 5, 2.5, 0.3);
    if (dmg > d.maxHp * 0.15) this.fx.shake(0.35);
    sfx('hurt');
    this.fx.text(head, `-${dmg}`, 'hurt');
    if (st.hp <= 0) this.die();
  }

  // ───────── 플레이어가 주는 피해 ─────────

  // 자동 사냥이 주울 물건 (설정 → 자동 사냥 줍기). 금화는 늘 줍는다
  autoWants(g) {
    if (g.kind !== 'item' || !g.item) return true;
    const f = this.st.settings.autoPick || {}, it = g.item, b = BASES[it.base] || {};
    const cat = it.book ? 'book' : b.type === 'potion' || b.type === 'elixir' ? 'potion' : b.type === 'gem' ? 'gem' : b.type === 'mat' || it.shard ? 'mat' : b.slot ? (it.rarity || 'common') : 'etc';
    if (cat === 'book') return f['book' + (SKILLS[it.book]?.tier || 1)] ?? f.book !== false; // v0.49.25 스킬북은 등급마다
    return f[cat] !== false;
  }
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
    const ccK = this.art('iceheart') ? 1.5 : 1;
    if (ctx?.slow) m.slowT = Math.max(m.slowT || 0, ctx.slow * ccK);
    if (ctx?.root && m.tier !== 'boss') m.rootT = Math.max(m.rootT || 0, ctx.root * ccK);
    const kind = this.d.cls.kind;
    if (src === 'melee' && !ctx && kind === 'melee') this.perk('meleeHit');
    if ((src === 'ranged' || (src === 'melee' && kind === 'ranged')) && !ctx) this.perk('rangedHit');
    if (crit) this.perk('crit');
    const st = this.st, d = this.d;
    const rf = rewardFactor(st, m.level);
    const apMult = rf.ap * this.autoMult;
    if (m.tier === 'boss' && m.fightStart == null) m.fightStart = this.time;
    if ((m.tier === 'boss' || m.tier === 'named') && d.bossDmg) raw *= 1 + d.bossDmg / 100;
    const dexN = st.dex?.[m.type] || 0; raw *= 1 + (dexN >= 500 ? 0.06 : dexN >= 200 ? 0.04 : dexN >= 50 ? 0.02 : 0);
    // v0.44.41 저항 (물리 · 마법 비율대로) · 약화(표식 · 원소 상처) · 상태 이상 조합(느려지거나 묶인 적에게 혼합 스킬 +20%)
    { const R = monsterRes(m.type), mag = ctx?.mag ?? (src === 'magic' ? 1 : 0), A = m.affix || [];
      raw *= 1 - ((R.phys + (A.includes('hard') ? 0.3 : 0)) * (1 - mag) + (R.mag + (A.includes('ward') ? 0.3 : 0)) * mag);
      if (A.includes('shield') && !m.shieldUsed && m.hp < m.maxHp * 0.5) { m.shieldUsed = true; m.fshield = m.maxHp * 0.2; this.fx.text(m.pos.clone().setY(2.4), '보호막', 'miss'); }
      if (m.fshield > 0) { const ab = Math.min(m.fshield, raw); m.fshield -= ab; raw -= ab; }
      if (A.includes('shock') && src !== 'dot' && !(m.shockT > this.time) && Math.random() < 0.25) { m.shockT = this.time + 1; this.fx.play?.('lightning', this.player.pos.x, this.player.pos.z, { scale: 0.7, dur: 0.4 }); this.hurtPlayer(this.d.maxHp * 0.03, m, { sure: true }); }
      if (A.includes('reflect') && src !== 'dot' && raw > 0 && !(m.reflT > this.time)) { m.reflT = this.time + 0.5; this.hurtPlayer(Math.min(raw * 0.1, this.d.maxHp * 0.04), m, { sure: true }); } } // 반사: 받은 피해의 10%, 한 번에 최대 HP 4%까지 · 0.5초에 한 번 (강한 캐릭터가 한 방에 죽던 것)
    if (m.dungeon && this.dungeon?.muts && ctx?.id) { const sc = SKILLS[ctx.id]?.school; if (Object.entries(MUT_RESIST).some(([k, v]) => v === sc && this.mut(k))) raw *= 0.5; } // v0.47 원소 변이
    if (m.vulnT > 0) raw *= this.art('soulmark') ? 1.25 : 1.15;
    if (m.markT > this.time) raw *= 1 + (m.markV || 0) / 100; // v0.49.21 칭호 특성 「약점 표시」
    if (this.art('sniper') && (src === 'ranged' || ctx) && Math.hypot(m.pos.x - this.player.pos.x, m.pos.z - this.player.pos.z) > 8) raw *= 1.15;
    if (this.art('huntertrap') && m.rootT > 0) raw *= 1.1;
    if (this.art('frostarrow') && m.slowT > 0 && !crit && Math.random() < 0.2) { crit = true; raw *= d.critMult; }
    if (this.art('eleblade') && src === 'melee') raw += ((d.matk[0] + d.matk[1]) / 2) * d.atkMult * 0.3;
    if (ctx?.mixed && (m.slowT > 0 || m.rootT > 0)) raw *= 1.2;
    let red = m.armor / (m.armor + 60) * (1 - pierce);
    if (m.def.behave === 'shield' && !ctx?.spell) {
      const P = this.player.pos, f = m.actor.facing, ang = Math.atan2(P.x - m.pos.x, P.z - m.pos.z);
      if (Math.abs(Math.atan2(Math.sin(ang - f), Math.cos(ang - f))) < 1.0) { red = 1 - (1 - red) * 0.4; if (Math.random() < 0.3) this.fx.text(m.pos.clone().setY(2.2), '막음', 'miss'); }
    }
    const dmg = Math.max(1, Math.round(raw * (1 - red)));
    m.hp -= dmg;
    if (ctx?.mixFx) for (const f of ctx.mixFx) {
      this.artEv('fx:' + f.name);
      if (f.id === 'bleed') { const bk = (this.art('gale') && f.name === '출혈') || (this.art('burn') && f.name === '화상') ? 1.5 : 1; m.dotV = Math.max(m.dotV || 0, dmg * 0.1 * bk); m.dotT = 3; if (this.art('truth') && f.name === '마력 연소') { const o = this.monstersNear(m.pos, 4).find((x) => x !== m && !x.dotT); if (o) { o.dotV = m.dotV; o.dotT = 3; } } }
      else if (f.id === 'vuln') m.vulnT = 4;
      else if (f.id === 'root' && m.tier !== 'boss') m.rootT = Math.max(m.rootT || 0, f.name === '덫' ? 1 + (this.art('huntertrap') ? 0.5 : 0) : 0.8 + (this.art('ironblood') ? 0.4 : 0));
      else if (f.id === 'slow') m.slowT = Math.max(m.slowT || 0, 2);
      else if (f.id === 'shield') { const sh = this.buffs.shield; const add = dmg * 0.06 * (this.art('brand') ? 1.5 : 1) * (this.art('shieldsmith') ? 1.25 : 1), cap = this.d.maxHp * 0.3, dur = 6 + (this.art('unbreak') ? 3 : 0); this.artEv('shieldGain', add); if (sh && sh.t > 0) sh.v = Math.min(cap, sh.v + add); else this.buffs.shield = { v: Math.min(cap, add), t: dur, max: dur }; }
    }
    (this.dealtLog ||= []).push([this.time, dmg]);
    if (m.dungeon && this.dungeon) this.dungeon.dmg = (this.dungeon.dmg || 0) + dmg; else if (m.flood) { if (this.floodRun && this.time - this.floodRun.last > 300) this.floodRun = null; const fr = (this.floodRun ||= { t0: this.time, dmg: 0, kills: 0 }); fr.dmg += dmg; fr.last = this.time; } // 5분 넘게 범람과 안 싸우면 새로 잰다 // v0.44.26 최근 준 피해 (체력 · 주 스탯 나누기)
    m.showHp = 6;
    this.lastHit = m;
    if (m.state !== 'return') m.state = 'chase';
    else if (!this.inTown && !inCamp(this.player.pos.x, this.player.pos.z) && dist2(m.pos, m.home) < 26) m.state = 'chase'; // 돌아가던 몬스터도 맞으면 다시 쫓아온다 (v0.41.6: 멀리서 쏘면 피만 차던 문제)
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
      else if (cls.kind === 'magic') addAP(st, cls.ap === 'wis' ? 'wis' : 'int', AP_TABLE.magicBasicHit, apMult);
      else { addAP(st, cls.ap, AP_TABLE.meleeHit, apMult); addAP(st, cls.side, AP_TABLE.meleeHitSide, apMult); }
    } else if (src === 'ranged') {
      addAP(st, 'dex', AP_TABLE.rangedHit, apMult); addAP(st, 'str', AP_TABLE.rangedHitSide, apMult);
    } else if (src === 'magic') {
      addAP(st, cls.ap === 'wis' ? 'wis' : 'int', AP_TABLE.magicBasicHit, apMult); // 홀은 정신
    }
    if (ctx) {
      const sk = SKILLS[ctx.id];
      if (sk.ap === 'int' && !ctx.apGiven) { addAP(st, sk.apStat || 'int', ctx.mp * AP_TABLE.spellPerMp, apMult); ctx.apGiven = true; }
      if (ctx.hits++ < 3) this.skillExp(ctx.id, 1, rf);
    }
    // 비전 행동 기록 (수동만)
    if (crit) { if (src === 'melee' || (ctx && ['melee', 'spin', 'cleave', 'dash'].includes(ctx.type))) { this.artEv('meleeCrit'); if (this.art('crush') && ctx && m.tier !== 'boss') m.rootT = Math.max(m.rootT || 0, 0.5); } if (src === 'ranged' || ctx?.type === 'arrow' || ctx?.type === 'line') this.artEv('rangedCrit'); if (d.cls?.name === '단검') this.artEv('daggerCrit'); }
    if (ctx && (ctx.artHits = (ctx.artHits || 0) + 1) === 3) this.artEv('multiHit');
    if (m.hp <= 0) {
      const ev = this.artEv.bind(this), P = this.player.pos;
      if (this.st.hp < this.d.maxHp * 0.3) ev('lowHpKill');
      if (this.time < (this.evadeT || 0)) ev('evadeKill');
      if (ctx?.type === 'arrow') ev('arrowKill');
      if (m.slowT > 0 || m.rootT > 0) ev('ccKill');
      if (m.rootT > 0) ev('stunKill');
      if (m.vulnT > 0) ev('vulnKill');
      if (this.buffs.shield?.t > 0) ev('shieldKill');
      if (this.buffs.taunt?.t > 0) ev('tauntKill');
      if (this.time - (this.lastHurtT || -9) < 2) ev('hurtKill');
      if (src === 'ranged' || ctx?.type === 'arrow' || ctx?.type === 'line') { ev('rangedKill'); if (this.art('soulhunt') && this.time - (this.soulT || -9) >= 1) { this.soulT = this.time; this.st.mp = Math.min(this.d.maxMp, this.st.mp + this.d.maxMp * 0.02); } }
      if (ctx && (ctx.mag || 0) >= 0.5) { ev('spellKill'); if (this.art('chainblast') && !ctx.chain) for (const o of this.monstersNear(m.pos, 3)) if (o !== m) this.hitMonster(o, dmg * 0.3, { src: 'skill', ctx: { ...ctx, chain: true, mixFx: null } }); }
      this.killMonster(m, src, ctx, rf);
    }
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
    if (m.dungeon && this.dungeon) this.dungeon.kills = (this.dungeon.kills || 0) + 1; else if (m.flood) { const fr = (this.floodRun ||= { t0: this.time, dmg: 0, kills: 0 }); fr.kills++; }
    if (m.sp?.zone) (this.st.zoneHunt ||= {})[m.sp.zone.id] = Date.now(); // v0.44.43 범람지: 지역별 마지막 사냥
    if (m.tier === 'boss' && !m.flood && !this.dungeon?.unknown && m.level >= (this.st.bossTop || 0)) { this.st.bossTop = m.level; const zi = ALL_ZONES.indexOf(m.sp?.zone || this.dungeon?.zone); if (zi >= 0) this.st.bossTopZi = zi; } // v0.49.12 그 보스의 지역도 (범람 세기 보정) // v0.44.62 이번 패치 뒤 잡은 가장 높은 보스 (범람 · 미지의 땅 기준)
    if (m.flood) this.floodDeath(m);
    else if (m.tier === 'boss' && !m.dungeon && m.sp?.zone && Math.random() < 0.1) { resAdd(this.st, 'odd_map', 1); this.ui.toast('알 수 없는 지도 조각', '#ffd060'); } // v0.44.49 필드 보스 10%
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
    const exp = m.exp * rf.exp * (this.autoKill ? CONFIG.autoExpPenalty ?? CONFIG.autoPenalty : 1) * (1 + Math.min(20, this.chain) * 0.02) * (this.night > 0.5 ? 1.2 : 1);
    const results = gainExp(st, m.flood ? 0 : exp * (1 + researchK(st, 'exp')) * (1 + relicBonus(st, 'exp') / 100)); // 범람 몬스터는 경험치 없음
    for (const r of results) this.onAwaken(r);

    // 드랍
    const drops = m.noLoot ? [] : rollLoot(m, { auto: this.autoKill, magicFind: d.magicFind + researchK(st, 'luck'), goldFind: d.goldFind * (1 + researchK(st, 'gold')) }, st);
    if (m.champ && !m.noLoot && !m.child) for (let k = 0; k < m.champ; k++) if (Math.random() < 0.35) drops.push(...rollLoot(m, { auto: this.autoKill, magicFind: d.magicFind + researchK(st, 'luck') + 50, goldFind: d.goldFind }, st)); // v0.48 강화 몬스터는 더 준다
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
    if (!m.dungeon && m.tier === 'boss') { (st.rec ||= {}).bosses = (st.rec.bosses || 0) + 1; if (m.sp?.zone?.id) (st.bossDone ||= {})[m.sp.zone.id] = 1; } // 지역 보스를 잡으면 그 지역 던전이 열린다
    if (!m.dungeon && m.tier === 'boss' && m.sp?.zone?.id === FINAL_ZONE) { st.finalBoss = Math.max(st.finalBoss || 0, st.worldTier || 1); this.checkTierUnlock(); }
    if (!m.dungeon && !m.noLoot && m.tier === 'boss' && Math.random() < 0.3 * (this.autoKill ? CONFIG.autoDrop ?? 0.3 : 1)) { // 보스가 가끔 열쇠
      if (addItem(st, makeItem('dungeon_key', { qty: 1 }, st))) { this.ui.toast('던전 열쇠를 얻었습니다', '#ffd84a'); sfx('rare', 0.7); }
    }
    if (m.dungeon && m.tier === 'boss' && this.dungeon) this.dungeonCleared(m);
    if (!m.noLoot) this.dailyDone(dailyProgress(st, { kind: 'kill', zone: m.dungeon ? null : m.sp?.zone?.id, tier: m.tier }));
    // 강화석: 강한 몬스터는 가끔, 일반 몬스터는 아주 가끔
    if (!m.noLoot) {
      const oc = { normal: 0.015, elite: 0.12, named: 0.3, boss: 0.6 }[m.tier] || 0;
      if (Math.random() < oc * (this.autoKill ? CONFIG.autoDrop ?? 0.3 : 1)) {
        const n = (m.tier === 'boss' ? 3 : m.tier === 'named' ? 2 : 1) + Math.floor(Math.random() * (1 + m.level / 15));
        townOf(st).ore += n; this.fx.text(m.pos.clone().setY(2.6), `+${n} 강화석`, 'gold'); this.ui.log(`강화석 +${n}`, '#d8e8ff'); this.ui.dirty();
      }
    }
    // v0.42 정수 (몬스터 레벨 100 · 200 · 300 · 400부터 2 ~ 5단계, 던전 2배)
    if (!m.noLoot) { const e = dropEss(st, m.level, m.tier, (this.autoKill ? CONFIG.autoDrop ?? 0.3 : 1) * (m.dungeon ? 2 : 1)); if (e) { this.fx.text(m.pos.clone().setY(2.9), `+${e.n} ${BASES[e.id].name}`, 'gold'); if (m.tier !== 'normal') this.ui.log(`${BASES[e.id].name} +${e.n}`, '#c8b0ff'); } }
    const zid = m.sp?.zone?.id, got = zid && !m.noLoot && (!this.autoKill || Math.random() < (CONFIG.autoDrop ?? 0.3)) ? dropMats(st, zid, m.tier) : 0;
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
    if (this.mut('wound')) v *= 0.5; // v0.47 상처 입는 던전
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
    if (this.dungeon && !this.dungeon.cleared && g.kind === 'item' && g.item) (this.dungeon.got ||= []).push(g.item); // v0.47 결과 창
    const st = this.st;
    if (g.kind === 'gold') {
      st.gold += g.amount;
      this.fx.text(this.player.pos.clone().setY(2.4), `+${g.amount}G`, 'gold');
      sfx('coin');
    } else {
      if (g.item && BASES[g.item.base]?.slot && !g.item.worn) g.item.loot = true; // 자동 판매 대상 표시
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
    if (g.expires) this.saveGround(); // 주운 아이템이 다음 접속 때 다시 생기지 않게
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
    this.floodLock = null; // 죽으면 결계에서 풀려 마을로 (범람은 남은 몬스터 그대로 남는다)
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

  manual() { this.autoPause = 1.6; this.lastManual = this.time; }
  // 처치 보상에서 자동 사냥으로 볼까: 자동이 켜져 있어도 10초 안에 직접 조작했으면 직접 사냥 (v0.42.8: 자동을 켠 채 손으로 잡은 보스가 자동으로 계산되던 문제)
  get autoKill() { return this.auto && this.time - (this.lastManual ?? -99) > 10; }

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
    // 이동 중(조이스틱)에 누르면: 사거리 안 적에게 평타 한 번을 예약해 걸으면서 섞어 쓴다 (v0.41.6)
    if (this.joy.lengthSq() > 0.01) {
      const R0 = this.d.range + 0.8, cand = [this.target, this.locked].find((m) => m && !m.dead && dist2(m.pos, this.player.pos) < R0) || this.nearestMonster(R0);
      if (cand) { this.atkQueue = { m: cand, until: this.time + 0.6 }; if (lock) this.locked = cand; return; }
    }
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

  // ───── v0.44.43 범람지 ─────
  floodZones() { return ALL_ZONES.filter((z) => this.bossCleared(z)); }
  floodTick() {
    const st = this.st, now = Date.now(), cleared = this.floodZones();
    const F = (st.flood ||= { list: [], next: 0 });
    // 매일 저녁 7시(한국 시간)에 하나. 처음이거나 예전 3일 간격 저장이면 오늘 저녁 7시로 맞춘다
    if (!F.daily) { F.daily = 1; const t = nextFloodAt(now); F.next = t - 86400e3 <= now && new Date(now + 9 * 3600e3).getUTCHours() >= FLOOD.hourKST ? now : t; }
    if (cleared.length < FLOOD.minCleared || F.list.length >= FLOOD.max || now < (F.next || 0)) return;
    const hunt = st.zoneHunt || {}, free = cleared.filter((z) => !F.list.some((x) => x.zone === z.id));
    const idle = free.filter((z) => now - (hunt[z.id] || 0) > FLOOD.idleMs), cand = idle.length ? idle : free; // 오래 안 간 곳 먼저
    F.next = nextFloodAt(now);
    if (!cand.length) return;
    const z = cand[Math.floor(Math.random() * cand.length)];
    F.list.push({ zone: z.id, at: now });
    this.ui.toast(`${z.name}에 몬스터가 넘쳐났습니다`, '#ff6a5a'); sfx('error');
  }
  // 범람 지역에 들어가면 범람 몬스터 · 범람 보스가 나타난다 (그 지역 몬스터, 보스 잡은 지역 중 가장 높은 위험도 × 1.2)
  floodStep() {
    const F = this.st.flood; this.stage.flooded = F?.list?.map((x) => x.zone) || [];
    if (!F?.list?.length || this.dungeon || this.inTown) { this.floodHere = null; return; }
    const P = this.player.pos, zn = zoneAt(P.x, P.z);
    const f = zn && F.list.find((x) => x.zone === zn.id);
    if (!f) { this.floodHere = null; return; }
    if (this.floodHere !== zn.id && !this.dead) this.floodLock = { zone: zn.id, x: P.x, z: P.z }; // 결계: 모두 잡거나 귀환할 때까지 지역 밖으로 못 나간다
    if (this.floodHere !== zn.id) { this.floodHere = zn.id; this.ui.banner?.(`범람지 · ${zn.name}`, '#ff6a5a') ?? this.ui.toast(`범람지 · ${zn.name}`, '#ff6a5a'); sfx('error'); }
    this.floodOn ||= {};
    const left = this.monsters.filter((m) => !m.dead && m.flood === zn.id).length;
    { const el = document.querySelector('.zoneName'); if (el && this.floodOn[zn.id]) el.textContent = `범람지 · ${zn.name} · 남은 몬스터 ${left}`; }
    // 결계 밖으로 나간 범람 몬스터는 제자리로
    for (const m of this.monsters) if (!m.dead && m.flood === zn.id && zoneAt(m.pos.x, m.pos.z)?.id !== zn.id && m.home) { m.pos.x = m.home.x; m.pos.z = m.home.z; m.state = 'idle'; }
    { const L0 = f.left, sum = L0 ? L0.normal + L0.elite + L0.named + L0.boss : -1;
      if (sum === 0) { this.floodClear(zn.id, P, this.floodLevel(zn)); return; } // 다 잡았는데 남아 있던 범람 정리
      if (this.floodOn[zn.id] && left === 0 && sum > 0) delete this.floodOn[zn.id]; // 몬스터가 사라졌으면 남은 수만큼 다시
    }
    if (this.floodOn[zn.id]) return; // 한 번만 (다시 나지 않는다 · 나갔다 들어와도 남은 몬스터 그대로)
    this.floodOn[zn.id] = this.time;
    for (const m of this.monsters) if (!m.dead && !m.flood && m.sp?.zone?.id === zn.id) { m.dead = true; m.deadT = 0; if (m.sp) m.sp.mon = null; } // 원래 몬스터는 걷어낸다
    const L = this.floodLevel(zn);
    const pick = () => FLOOD_AFFIX_IDS[Math.floor(Math.random() * FLOOD_AFFIX_IDS.length)];
    const mk = (tier, fixed, k) => {
      // 결계(지역 모양) 안쪽, 막히지 않은 자리만
      let sp = null;
      for (let t = 0; t < 30 && !sp; t++) {
        const a = Math.random() * 6.28, r = (0.1 + Math.random() * 0.72) * zoneRadius(zn, a), q = this.freeSpot(zn.x + Math.cos(a) * r, zn.z + Math.sin(a) * r, 0.8);
        if (zoneAt(q.x, q.z)?.id === zn.id && !blockedAt(this.stage, q.x, q.z, 0.8) && Math.hypot(q.x - zn.x, q.z - zn.z) < zoneRadius(zn, Math.atan2(q.z - zn.z, q.x - zn.x)) - 3) sp = q;
      }
      sp ||= this.freeSpot(zn.x, zn.z, 0.8);
      const m = this.spawn({ zone: zn, x: sp.x, z: sp.z, level: L - this.tierOffset, tier, timer: 0, mon: null, fixed });
      if (!m) return null;
      m.floodTier = tier; if (m.tier !== tier) { m.tier = tier; } // 일반이 정예로 바뀌어 남은 수가 어긋나던 것
      m.flood = zn.id; m.home = { x: m.pos.x, z: m.pos.z }; m.noLoot = true; // v0.44.46 범람 몬스터는 보상 없음 (해소 보상만)
      m.affix = tier === 'boss' ? [pick(), pick()] : tier === 'elite' ? [pick(), pick()] : [pick()];
      if (m.affix.includes('frenzy')) { m.speed *= 1.3; m.def = { ...m.def, interval: m.def.interval / 1.3 }; }
      m.name = `${tier === 'boss' ? '범람한 ' : ''}${m.name} [${m.affix.map((x) => FLOOD_AFFIX[x].name).join('·')}]`;
      // v0.49.12 지역 세기 보정은 범람 난 지역이 아니라 가장 높은 보스를 잡은 지역 것으로 (낮은 지역 범람이 레벨만 높고 약했다)
      { const fz = this.floodRefZi(), cz = ALL_ZONES.indexOf(zn); if (fz >= 0 && cz >= 0 && fz !== cz) { const A = chapterK(fz, tier), B = chapterK(cz, tier); m.maxHp = Math.round(m.maxHp * A.hp / B.hp); m.hp = m.maxHp; m.dmg = m.dmg.map((v) => v * A.dmg / B.dmg); } }
      if (k) { m.maxHp *= k; m.hp = m.maxHp; }
      m.actor.setGlow(0x400010);
      return m;
    };
    // v0.44.46 진행 저장: 남은 수(f.left)대로만 띄운다 (껐다 켜도 이어서)
    if (!f.left) { const n = Math.round((zn.count || 18) * FLOOD.mobK); f.left = { normal: n - Math.floor(n / 5), elite: Math.floor(n / 5), named: 1, boss: 1 }; }
    for (let i = 0; i < f.left.normal; i++) mk('normal');
    for (let i = 0; i < f.left.elite; i++) mk('elite');
    if (f.left.named) mk('named', zn.named);
    if (f.left.boss) { const b = mk('boss', zn.boss, FLOOD.bossHp); if (b) { b.floodBoss = true; const c = this.freeSpot(zn.x, zn.z, 1.2); b.pos.set(c.x, 0, c.z); b.home = { x: c.x, z: c.z }; } }
    this.ui.toast(`범람한 ${zn.name}`, '#ff6a5a');
  }
  // 범람 몬스터 레벨: 보스를 잡은 지역 · 깬 던전 단계 중 가장 높은 곳(세계 단계 포함) × 1.1
  // 범람 세기 기준 지역: 가장 높은 보스를 잡은 지역 (예전 저장은 보스를 잡은 지역 중 가장 높은 곳)
  floodRefZi() {
    if (this.st.bossTopZi != null) return this.st.bossTopZi;
    let best = -1; ALL_ZONES.forEach((z, i) => { if (this.bossCleared(z)) best = i; }); return best;
  }
  floodLevel(zn) {
    // v0.44.62 이번 패치 뒤 잡은 가장 높은 보스 레벨 기준 (아직 없으면 그 지역 레벨)
    const top = this.st.bossTop || (zn.levels[1] + this.tierOffset);
    return Math.round(top * FLOOD.levelK);
  }
  // 정화: 붉은 화면이 걷히고 보상
  floodClear(zid, P, lv) {
    const F = this.st.flood; if (!F?.list?.some((x) => x.zone === zid)) return;
    F.list = F.list.filter((x) => x.zone !== zid);
    (this.st.zoneHunt ||= {})[zid] = Date.now();
    if (this.floodOn) delete this.floodOn[zid];
    if (this.floodLock?.zone === zid) this.floodLock = null;
    this.stage.flooded = F.list.map((x) => x.zone);
    const gMark = this.ground.length, fr = this.floodRun || { t0: this.time, dmg: 0, kills: 0 }; this.floodRun = null;
    this.dropGround({ kind: 'gold', amount: lv * 400 }, P.x, P.z);
    this.dropGround({ kind: 'item', item: makeItem(rollBase(lv), { rarity: Math.random() < 0.15 ? 'legend' : 'hero', ilvl: lv }, this.st) }, P.x + 1, P.z);
    resAdd(this.st, 'ore2', 2 + Math.floor(lv / 40));
    resAdd(this.st, 'odd_map', 1); // 범람 해소 = 알 수 없는 지도 조각 (v0.46) (유물은 주지 않는다)
    { const wk = weekKey(), FW = (this.st.floodWeek ||= {}); if (FW[zid] !== wk) { FW[zid] = wk; const g = Math.min(5, 2 + Math.floor(lv / 120)); resAdd(this.st, 'ess' + g, 3); this.ui.toast('이번 주 첫 정화 · 정수 3개', '#c0a0ff'); } }
    const zn = ALL_ZONES.find((z) => z.id === zid);
    this.ui.banner?.(`${zn?.name || ''} 정화 완료`, '#7fe07a'); this.ui.toast(`범람이 정화되었습니다 · 금화 · 장비 · 상급 강화석 · 알 수 없는 지도 조각`, '#7fe07a'); sfx('rankup');
    this.fx.play('sparkle', P.x, P.z, { scale: 2, dur: 1.2 });
    this.showClear(`${zn?.name || ''} 범람 정화`, fr, this.ground.slice(gMark), [['상급 강화석', 2 + Math.floor(lv / 40)], ['알 수 없는 지도 조각', 1]]);
    this.ui.dirty();
  }
  // 결계 불꽃: 갇힌 동안 지역 경계를 따라 가까운 곳에 불꽃이 탄다 (벽 대신 효과 그림)
  floodFlames(P) {
    const F = (this.flames ||= new Map()), L = this.floodLock, zn = L && ALL_ZONES.find((z) => z.id === L.zone);
    const want = new Set();
    if (zn && !this.dead) {
      const N0 = 320;
      for (let i = 0; i < N0; i++) {
        const a = (i / N0) * 6.283, r = zoneRadius(zn, a) - 0.6, x = zn.x + Math.cos(a) * r, z = zn.z + Math.sin(a) * r;
        if (Math.hypot(x - P.x, z - P.z) > 22) continue;
        want.add(i);
        if (!F.has(i)) { // 위로 타오르는 불꽃 (불덩이 그림의 위쪽 방향) + 셋에 하나는 불티
          const it = this.fx.play(i % 3 ? 'fireball' : 'spark_orange', x, z, { y: 0.9, dir: 2, scale: i % 3 ? 0.6 + (i % 5) * 0.06 : 0.9, loop: true, dur: 1e9, alpha: 1, tint: 0xff6a20 });
          if (it) { it.t = Math.random(); F.set(i, it); }
        }
      }
    }
    for (const [i, it] of F) if (!want.has(i)) { it.dur = 0; F.delete(i); }
  }
  floodDeath(m) {
    const P = m.pos;
    const f0 = this.st.flood?.list?.find((x) => x.zone === m.flood), k0 = m.floodTier || m.tier;
    if (f0?.left && !m.child && f0.left[k0] > 0) f0.left[k0]--;
    if (m.affix?.includes('burst')) { this.fx.telegraph?.(P.x, P.z, 2.6, 1, 0xff4020); this.later(1, () => { if (Math.hypot(this.player.pos.x - P.x, this.player.pos.z - P.z) < 2.6) this.hurtPlayer(this.d.maxHp * 0.12, m, { sure: true }); this.fx.ring(P.x, P.z, 2.6, 0xff6020, 0.4); }); }
    if (m.affix?.includes('split') && !m.child) for (let i = 0; i < 2; i++) { const c = this.spawn({ zone: m.sp.zone, x: P.x + (i ? 1 : -1), z: P.z, level: m.level - this.tierOffset, tier: 'normal', timer: 0, mon: null }); if (c) { c.flood = m.flood; c.child = true; c.maxHp *= 0.4; c.hp = c.maxHp; c.state = 'chase'; if (c.actor.root?.scale?.multiplyScalar) c.actor.root.scale.multiplyScalar(0.7); else c.actor.scale = (c.actor.scale || 1) * 0.7; } }
    if (f0?.left && f0.left.normal + f0.left.elite + f0.left.named + f0.left.boss <= 0) this.floodClear(m.flood, P, m.level); // 범람 보스까지 모두 잡으면 정화
  }
  // v0.44.42 수련 비전: 수동 사냥 중 행동만 센다 · 장착한 비전인지
  art(id) { return !!this.st.arts?.equip?.includes(id); }
  artEv(ev, n = 1) {
    if (this.auto || this.inTown || !(n > 0)) return;
    const A = (this.st.arts ||= { prog: {}, open: {}, equip: [] });
    A.prog[ev] = (A.prog[ev] || 0) + n;
    for (const a of ARTS) if (a.ev === ev && !A.open[a.id] && A.prog[ev] >= a.n) { A.open[a.id] = true; this.ui.toast(`수련 비전 「${a.name}」을(를) 깨우쳤습니다`, '#e0b0ff'); sfx('rankup'); }
  }
  // v0.44.41 도감용: 그 지역 · 지금 세계 단계에서 이 몬스터의 체력 · 공격력 (spawn과 같은 식)
  monStats(type, tier, zn) {
    const def = MONSTERS[type], T = TIERS[tier], L = zn.levels[1] + this.tierOffset, CK = chapterK(ALL_ZONES.indexOf(zn), tier);
    return { level: L, hp: Math.round(def.hp * (1 + 0.4 * (L - 1)) * T.hp * TIER_K[this.wt].hp * CK.hp), dmg: def.dmg.map((v) => Math.round(v * (1 + 0.27 * (L - 1)) * T.dmg * TIER_K[this.wt].dmg * CK.dmg)), armor: L * 2, speed: def.speed, attack: def.attack };
  }
  // v0.44.35 인내의 폭발: 모은 피해 × 계수(%)를 둘레로. 탱커가 딜러가 되지 않게 무기 한 방의 1.5 ~ 8배 사이로
  vengeRelease(b) {
    if (!b || b.done) return; b.done = true; b.t = 0;
    const P = this.player.pos, w = ((this.d.patk[0] + this.d.patk[1]) / 2) * this.d.atkMult * (1 + (this.d.stats.vit || 0) * 0.015), v = Math.max(w * 1.5, Math.min((b.store || 0) * b.v / 100, w * (this.art('retribution') ? 12 : 8))), r = b.radius || 6;
    this.fx.ring(P.x, P.z, r, 0xe0a050, 0.6); this.fx.play('v_dust', P.x, P.z, { scale: 1.6 }); this.fx.shake?.(0.3); sfx('boom', 0.8);
    for (const m of this.monstersNear(P, r)) { this.hitMonster(m, v, { src: 'skill' }); this.artEv('vengeHit'); }
    this.d = derive(this.st, this.buffValues());
  }
  // 주문서 읽기: 같은 효과의 주문서가 이미 있으면 그것을 바꾼다 (겹치지 않는다)
  readScroll(id, quiet = false) {
    const st = this.st, E = ELIXIRS[id], base = totalStats(st);
    if (!E || countOf(st, id) <= 0) return false;
    const v = E.stat ? Math.max(5, Math.round(base[E.buff] * 0.1)) : E.v;
    takeOne(st, id);
    st.elix ||= {};
    for (const k of Object.keys(st.elix)) if (st.elix[k].buff === E.buff) delete st.elix[k]; // 같은 효과는 겹치지 않고 바뀐다
    st.elix[id] = { buff: E.buff, v, t: ELIXIR_TIME };
    this.d = derive(st, this.buffValues());
    this.ui.toast(`${E.name}${quiet ? ' (자동)' : ''}: ${E.stat ? `${E.text.split(' ')[0]} +${v}` : E.text} · 5분`, E.color);
    sfx('buff');
    this.fx.ring(this.player.pos.x, this.player.pos.z, 2.2, new THREE.Color(E.color).getHex(), 0.7);
    this.ui.dirty();
    return true;
  }
  // v0.44.30 자동 주문서: 골라 둔 주문서는 효과가 끝나면 (마을 밖에서) 다시 읽는다. 같은 효과면 높은 것을 쓰는 중이면 건너뛴다
  autoScrolls() {
    const st = this.st, on = st.settings?.autoScroll;
    if (!on || this.inTown || this.dead) return;
    // 효과마다 하나: 켜 둔 것 중 가진 가장 센 주문서 (다른 효과는 모두 함께)
    const best = {};
    for (const id of Object.keys(on)) {
      const E = ELIXIRS[id];
      if (!on[id] || !E || countOf(st, id) <= 0) continue;
      if (!best[E.buff] || (E.v || 0) > (ELIXIRS[best[E.buff]].v || 0)) best[E.buff] = id;
    }
    for (const [buff, id] of Object.entries(best)) if (!Object.values(st.elix || {}).some((e) => e.buff === buff && e.t > 3)) this.readScroll(id, true);
  }
  usePotion(kind, quiet = false) {
    if (this.dead || this.potionCd > 0) return false;
    const st = this.st;
    const ids = kind === 'hp' ? HP_POTIONS : MP_POTIONS;
    const missing = kind === 'hp' ? this.d.maxHp - st.hp : this.d.maxMp - st.mp;
    // 가방에서 정해 둔 물약이 있으면 그것, 없으면 모자란 양을 채우는 가장 작은 물약 → 없으면 큰 것부터
    const pick = st.potSlot?.[kind], amt = (i) => BASES[i].restore[kind];
    const fit = ids.filter((i) => amt(i) >= missing * 0.8).reverse();
    const order = pick ? [pick] : [...fit, ...ids.filter((i) => !fit.includes(i))];
    const id = order.find((i) => countOf(st, i) > 0);
    if (!id) { if (!quiet) this.ui.toast(kind === 'hp' ? '체력 물약이 없습니다' : '마나 물약이 없습니다'); else this.potionCd = 3; return false; }
    takeOne(st, id);
    const r = BASES[id].restore;
    const rk = 1 + researchK(st, 'potion');
    if (r.hp) this.healPlayer(r.hp * rk);
    if (r.mp) { this.gainMp(r.mp * rk * (this.mut('drain') ? 0.5 : 1)); this.fx.text(this.player.pos.clone().setY(2.6), `+${r.mp}`, 'mana'); }
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
    // 귀환 빛이 캐릭터 발밑에서 감싼다 (v0.44.6: 옆으로 비껴 열려 어긋나 보였다)
    const P = this.player.pos;
    this.recallPortal = this.fx.portal(P.x, P.z, 1.9);
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
    const st = this.st, ok = ZONES.filter((z) => st.awakenings >= recAwaken(z.levels[0] + this.tierOffset));
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
      // 땅에서 막 주운 장비만 판다 — 한 번이라도 입었던 것 · 벗은 것 · 창고에서 꺼낸 것은 절대 팔지 않는다
      const upTo = ['common', 'magic', 'rare'].indexOf(st.settings.autoSellTo || 'rare'), rk = ['common', 'magic', 'rare'].indexOf(it.rarity); // 설정한 등급까지만 판다
      if (it.lock || !it.loot || it.worn || it.book || !BASES[it.base]?.slot || it.set || it.named || rk < 0 || rk > upTo) return true;
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
    if (sk.mpPct) v.mp = Math.max(v.mp, Math.ceil(this.d.maxMp * sk.mpPct * (modsOf(s).includes('frugal') ? 0.55 : 1))); // 비전: 최대 MP의 %
    if ((this.cds[id] || 0) > 0) return { ok: false, why: '재사용 대기 중' };
    if (this.st.mp < v.mp) return { ok: false, why: 'MP가 부족합니다' };
    const kind = this.d.cls.kind;
    if (sk.needs === 'melee' && kind !== 'melee') return { ok: false, why: '검이 필요합니다' };
    if (sk.needs === 'melee' && !this.st.equip.weapon) return { ok: false, why: '검이 필요합니다' };
    if (sk.needs === 'bow' && kind !== 'ranged') return { ok: false, why: '활이 필요합니다' };
    if (!meetsReq(this.st, sk.req, this.d.stats)) return { ok: false, why: '스탯 조건이 부족합니다' };
    if (sk.awaken) { const a = awakenOk(this.st, sk); if (!a.ok) return a; } // awaken 등급이 정해진 스킬은 쓸 때도 차수 · 4차 갈래 (책 단계로 정한 등급은 배울 때만 — 이미 배운 스킬은 그대로)
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
    const st = this.st, d = this.d, sk = { ...skillEff(id, modsOf(st.skills[id])) };
    // v0.44.42 비전: 범위 · 발 수
    if (this.art('quake') && (sk.type === 'spin' || sk.type === 'cleave') && sk.radius) sk.radius *= 1.2;
    if (sk.type === 'arrow' && sk.count) sk.count += (this.art('volley') ? 2 : 0) + (this.art('constellation') && this.time < (this.constT || 0) ? 1 : 0);
    const P = this.player;
    this.pendingSkill = null;
    this.skillUsed = true;
    this.actCd = RECOVER.skill;
    st.mp -= v.mp;
    this.perk(sk.type === 'buff' ? 'buff' : sk.ap === 'int' ? 'spell' : 'skill', this.target?.pos);
    this.cds[id] = v.cd * (1 - (this.d.cdr || 0) / 100) * (this.art('vanguard') && sk.type === 'dash' ? 0.7 : 1) * (this.mut('slowcd') ? 1.3 : 1);
    if (!v.echoed) {
      if (v.mp > 0) { this.artEv('mpSpent', v.mp); if (this.art('manaflow')) st.mp = Math.min(this.d.maxMp, st.mp + v.mp * 0.05); }
      if (st.mp < this.d.maxMp * 0.2) this.artEv('lowMpSkill');
      if (sk.type === 'dash') this.artEv('dashUse');
      if (sk.ap === 'int' || sk.ap === 'wis') this.lastSpellT = this.time;
    }
    // 쓴 횟수도 성장에: 스킬의 필요 스탯에 필요량 비율대로 (각성 때 그 스탯으로 나뉜다)
    if (!v.echoed && sk.req) { const tot = Object.values(sk.req).reduce((a, b) => a + b, 0) || 1; for (const [k, n] of Object.entries(sk.req)) addAP(st, k, AP_TABLE.skillUse * (1 + 0.5 * ((sk.tier || 1) - 1)) * (n / tot), this.autoMult); }
    if (!v.echoed) this.skillExp(id, 1);
    const ctx = { id, mp: v.mp, hits: 0, apGiven: false, slow: sk.slow, root: sk.root };
    // v0.44.41 연계: 서로 다른 스탯의 단일 스킬을 번갈아 쓰면 「연계」가 쌓이고 (5초 안, 최대 3), 혼합 스킬이 쌓인 만큼 +15%씩 세진다
    const lines = sk.lines || Object.keys(sk.req || {});
    let comboK = 1;
    if (sk.type !== 'buff' && !v.echoed) {
      if (lines.length === 1) {
        if (this.comboLine && this.comboLine !== lines[0] && this.time - (this.comboT || 0) < 5) { this.comboN = Math.min(this.art('bladedance') ? 4 : 3, (this.comboN || 0) + 1); this.fx.text(P.pos.clone().setY(2.8), `연계 ${this.comboN}`, 'crit'); }
        this.comboLine = lines[0]; this.comboT = this.time;
      } else if (lines.length >= 2) {
        if (this.comboN && this.time - (this.comboT || 0) < 5) { this.artEv('comboBurst'); if (this.art('spellsword')) this.matkUpT = this.time + 2; if (this.art('constellation')) this.constT = this.time + 3; if (this.art('sage')) st.mp = Math.min(this.d.maxMp, st.mp + this.d.maxMp * 0.1); comboK = 1 + 0.15 * this.comboN; this.fx.text(P.pos.clone().setY(2.8), `연계 폭발 +${Math.round((comboK - 1) * 100)}%`, 'crit'); }
        this.comboN = 0; this.comboLine = null;
        ctx.mixFx = mixFxOf(lines); ctx.mixed = true;
      }
    }
    // 변형 「메아리」: 잠시 뒤 약하게 한 번 더
    if (sk.echo && !v.echoed) this.later(0.6, () => { if (!this.dead) this.castSkill(id, { ...v, mp: 0, power: v.power * sk.echo, echoed: true, cd: this.cds[id] }); });
    const t = this.target;
    if (t) P.face(t.pos.x, t.pos.z);
    // 쓸 때 그 스탯 행동 기록 (보조 스탯)
    if (sk.mix) addAP(st, sk.mix, v.mp * AP_TABLE.supportPerMp, this.autoMult);
    if (sk.apStat && sk.ap === 'weapon') addAP(st, sk.apStat, v.mp * AP_TABLE.supportPerMp, this.autoMult);
    let artK = 1;
    if (sk.ap === 'int' && sk.elem) { if (this.lastElem && this.lastElem !== sk.elem) { this.artEv('elemSwitch'); if (this.art('resonance')) artK *= 1.2; } this.lastElem = sk.elem; }
    if (this.art('brink') && lines.includes('str') && st.hp < this.d.maxHp * 0.3) artK *= 1.25;
    if (this.art('manarush') && lines.includes('wis') && st.mp < this.d.maxMp * 0.2) artK *= 1.3;
    if (this.art('judge') && lines.includes('str') && this.buffs.shield?.t > 0) artK *= 1.15;
    const sureCrit = this.art('shadowfoot') && this.time < (this.tumbleT || 0); if (sureCrit) this.tumbleT = 0;
    const pw = v.power * comboK * artK;
    // v0.44.37 스킬 피해 = 공격력(물리 · 마법, 필요 스탯 비율대로) × 계수 × 스킬 스탯 배율(무기 무관) × 장비 보정 × 자원 보너스
    //  치명타는 평타와 같은 확률 · 배율. spell()과 weaponHit()은 같은 값 (spell 다음에 spellCrit()으로 치명 여부)
    const sc = skillScale(sk, d.stats), rk = sk.scale ? d.resK?.[sk.scale] || 1 : 1;
    ctx.mag = sc.mag; ctx.type = sk.type; // 저항 계산용 (마법 비율) · 비전
    let lastCrit = false;
    const roll = () => {
      lastCrit = sureCrit || Math.random() < d.crit;
      const base = (sc.phys > 0 ? randRange(d.patk[0], d.patk[1]) * sc.phys : 0) + (sc.mag > 0 ? randRange(d.matk[0], d.matk[1]) * sc.mag * (this.time < (this.matkUpT || 0) ? 1.2 : 1) : 0);
      return base * d.atkMult * sc.statF * rk * pw * (lastCrit ? d.critMult + (this.art('vital') && d.cls?.name === '단검' ? 0.3 : 0) : 1);
    };
    const spell = roll, spellCrit = () => lastCrit;
    const weaponHit = () => { const v0 = roll(); return { v: v0, crit: lastCrit }; };
    if (sk.hpCost) st.hp = Math.max(1, st.hp - d.maxHp * sk.hpCost); // HP도 쓴다
    if (sk.ap === 'wis' && v.mp > 0) addAP(st, 'wis', v.mp * AP_TABLE.supportPerMp, this.autoMult); // 정신: 쓴 MP만큼
    const color = new THREE.Color(sk.color).getHex();
    if (sk.type !== 'buff') this.fx.circle(P.pos.x, P.pos.z, 1.8, color, 0.9); // 버프는 따로 (보호막 · 오라)
    // v0.41 스킬마다 고유 효과 그림 (sk.fx: powers.json 이름) — 맞은 자리 · 범위 안에 찍는다
    const FX = (x, z, s = 1) => { if (sk.fx) this.fx.play(sk.fx, x, z, { scale: s * (sk.fxScale || 1) }); };
    const FXarea = (x, z, r, n = 6) => { if (!sk.fx) return; FX(x, z, Math.min(1.6, r / 3)); for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + Math.random() * 0.5, q = r * (0.45 + Math.random() * 0.4); FX(x + Math.cos(a) * q, z + Math.sin(a) * q, 0.8); } };
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
            this.fx.shake(0.2); FX(t.pos.x, t.pos.z, 1.1);
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
          this.fx.ring(P.pos.x, P.pos.z, sk.radius, color, 0.45); FXarea(P.pos.x, P.pos.z, sk.radius);
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
          if (sk.fx) for (let i = 1; i <= 3; i++) for (const o of [-0.4, 0, 0.4]) FX(P.pos.x + Math.sin(ang + o) * sk.radius * i / 3.4, P.pos.z + Math.cos(ang + o) * sk.radius * i / 3.4, 0.6 + i * 0.15);
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
          this.fx.projectile({ elem: sk.elem,
            from: this.muzzle(), target: t, color, size: sk.splash ? 1.5 : 0.9, speed: 20,
            onHit: (tg) => {
              const at = tg.pos || tg;
              FX(at.x, at.z, sk.splash ? Math.min(1.6, sk.splash / 2.5) : 0.9);
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
            this.fx.projectile({ elem: sk.elem,
              from: this.muzzle(), target: tg, color, size: 0.7, speed: 32, bolt: true,
              onHit: (x) => { if (x.pos) FX(x.pos.x, x.pos.z, 0.8); if (!x.dead) { const w = weaponHit(); this.hitMonster(x, w.v, { crit: w.crit, src: 'skill', ctx }); } },
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
          chain.forEach((m, i) => FX(m.pos.x, m.pos.z, 0.9)); chain.forEach((m, i) => this.hitMonster(m, spell() * Math.pow(0.85, i), { crit: spellCrit(), src: 'skill', ctx, pierce: 0.5 }));
        });
        break;
      }
      case 'meteor': {
        const dur = P.act('castUp', 1.2);
        this.swing = dur * 0.6;
        const at = { x: t.pos.x, z: t.pos.z };
        sfx('cast');
        this.fx.meteor(at.x, at.z, sk.radius, 1.0, () => {
          sfx('boom'); FXarea(at.x, at.z, sk.radius, 4);
          for (const m of this.monstersNear(at, sk.radius)) this.hitMonster(m, spell(), { crit: spellCrit(), src: 'skill', ctx, pierce: 0.5 });
        }, sk.elem || 'fire');
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
          this.fx.shake(0.35); FXarea(P.pos.x, P.pos.z, sk.radius, 8);
          for (const m of this.monstersNear(P.pos, sk.radius)) { m.slowT = 4; this.hitMonster(m, spell(), { crit: spellCrit(), src: 'skill', ctx, pierce: 0.5 }); }
        });
        break;
      }
      case 'evade': {
        // v0.44.38 구르기: 대상(없으면 바라보는 쪽) 반대로 굴러 거리를 벌리고 잠시 회피가 오른다
        const ang = t ? Math.atan2(P.pos.x - t.pos.x, P.pos.z - t.pos.z) : P.facing + Math.PI;
        const dist = sk.range || 5, from = { x: P.pos.x, z: P.pos.z }, to0 = { x: from.x + Math.sin(ang) * dist, z: from.z + Math.cos(ang) * dist }, to = this.freeSpot(to0.x, to0.z);
        for (let i = 1; i <= 6; i++) this.later(i * 0.035, () => { P.pos.x = from.x + (to.x - from.x) * i / 6; P.pos.z = from.z + (to.z - from.z) * i / 6; this.fx.burst(P.pos.x, 0.3, P.pos.z, color, 2, 1, 0.3); });
        P.act('run', 0.3); this.moveTo = null; sfx('dodge');
        this.buffs.dodgeUp = { v: pw, t: sk.duration || 2, max: sk.duration || 2, id }; this.tumbleT = this.time + 3; this.evadeT = this.time + 2;
        this.d = derive(st, this.buffValues());
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
          if (sk.fx) for (let k = 2; k < sk.range; k += 2.2) this.later(k / 40, () => FX(P.pos.x + ux * k, P.pos.z + uz * k, 0.8));
          this.fx.projectile({ elem: sk.elem, from: this.muzzle(), target: { pos: new THREE.Vector3(end.x, 1.4, end.z) }, color, size: sk.width > 2 ? 2 : 1, speed: 40, bolt: true, onHit: () => {} });
          for (const m of this.monsters) {
            if (m.dead) continue;
            const px = m.pos.x - P.pos.x, pz = m.pos.z - P.pos.z;
            const along = px * ux + pz * uz, side = Math.abs(px * uz - pz * ux);
            if (along > 0 && along < sk.range && side < sk.width * 0.5 + 0.5 * m.actor.scale) {
              // 주문(얼음 창 등)은 주문 공식, 활 스킬은 무기 공식
              const w = sk.ap === 'int' ? { v: spell(), crit: spellCrit(), pierce: 0.5 } : weaponHit();
              this.later(along / 40, () => this.hitMonster(m, w.v, { crit: w.crit, src: 'skill', ctx, pierce: w.pierce || 0 }));
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
            if (sk.fx) for (let k = 0; k < 3; k++) { const a = Math.random() * 6.28, r = Math.random() * sk.radius; FX(at.x + Math.cos(a) * r, at.z + Math.sin(a) * r, 0.8); }
            for (let k = 0; k < 8; k++) {
              const a = Math.random() * 6.28, r = Math.random() * sk.radius, x = at.x + Math.cos(a) * r, z = at.z + Math.sin(a) * r;
              this.fx.projectile({ elem: sk.elem, from: { x: x - 1, y: 9, z: z - 1 }, target: { x, z, pos: new THREE.Vector3(x, -1.1, z) }, color, size: 0.5, speed: 40, bolt: sk.ap !== 'int', trail: true, onHit: () => {} });
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
          if (sk.fx) for (let i = 1; i <= 3; i++) FX(P.pos.x + Math.sin(ang) * sk.radius * i / 3.4, P.pos.z + Math.cos(ang) * sk.radius * i / 3.4, 0.6 + i * 0.15);
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
        if (this.buffs.venge?.t > 0 && sk.buff === 'venge') this.vengeRelease(this.buffs.venge); // 다시 쓰면 바로 터뜨린다
        this.buffs[sk.buff] = { v: val, t: sk.duration, max: sk.duration, id, store: 0, radius: sk.venge?.radius };
        // 도발: 둘레 적을 나에게 끌어오고 나를 노리게
        if (sk.taunt) for (const m of this.monstersNear(P.pos, sk.taunt)) {
          if (m.tier === 'boss') continue;
          const dx = P.pos.x - m.pos.x, dz = P.pos.z - m.pos.z, l = Math.hypot(dx, dz) || 1, k = Math.min(l - 1.5, 3) / l;
          if (k > 0) { m.pos.x += dx * k; m.pos.z += dz * k; }
          m.state = 'chase';
        }
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
      const it = this.fx.play(sk.aura || (warm ? 'shield_orange' : 'shield'), P.x, P.z, { y: 0, scale: sk.aura ? 0.9 : 0.5, loop: true, dur: 9999, alpha: 0.8 }); // v0.41 sk.aura: 고유 오라 그림
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
      if (!this.usePotion('hp') && HP_POTIONS.every((i) => countOf(st, i) === 0) && st.hp / d.maxHp < 0.3 && this.recallT <= 0 && !this.inTown) {
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
      // v0.49.15 둘레 약 10칸 안의 전리품을 줍는다 (예전엔 3.5칸이라 조금 먼 것은 지나쳤다). 6초 넘게 못 닿으면(막힌 곳) 그것은 건너뛴다
      const full = st.inv.length >= bagSize(st);
      const g = this.ground.filter((x) => !x.deathDrop && dist2(x, P) < 100 && this.autoWants(x) && !(x.autoGiveUp > this.time) && this.inAutoArea(x) && !(x.kind === 'item' && full && !BASES[x.item.base]?.stack && !x.item.shard)).sort((a, b) => dist2(a, P) - dist2(b, P))[0];
      if (g) {
        if (this.autoLootG !== g) { this.autoLootG = g; this.autoLootT = this.time; }
        if (this.time - this.autoLootT > 6) { g.autoGiveUp = this.time + 60; this.autoLootG = null; }
        else { if (!this.moveTo || dist2(this.moveTo, g) > 0.5) this.autoGo({ x: g.x, z: g.z }); this.target = null; return; }
      }
    }
    if (this.target && !this.target.dead && !this.inAutoArea(this.target.pos)) this.target = null; // 구역 밖 몬스터는 쫓지 않는다
    if (!this.target || this.target.dead) {
      const bossOk = !!st.settings.autoBoss; // v0.44.24 설정 「자동 사냥 필드 보스」
      this.target = this.nearestMonster(18, P, null, (m) => this.inAutoArea(m.pos) && (bossOk || m.tier !== 'boss'));
      if (!this.target) {
        // 가까이 없으면: 구역 안에서 가장 가까운 몬스터 쪽으로 (빈 곳만 돌아다니지 않게)
        const far = this.monsters.filter((m) => !m.dead && !(m.ignoreUntil > this.time) && (bossOk || m.tier !== 'boss') && this.inAutoArea(m.pos) && !(dist2(m.pos, TOWN) < TOWN.r)).sort((a, b) => dist2(a.pos, P) - dist2(b.pos, P))[0];
        const sp = !far && this.spawners.filter((q) => !q.mon && (bossOk || q.tier !== 'boss') && this.inAutoArea(q)).sort((a, b) => dist2(a, P) - dist2(b, P))[0]; // 다 잡았으면 곧 다시 나올 자리로
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

  // v0.44.24 지역 그림 미리 받기: 몬스터 그림 · 땅 타일. 처음 들어가는 지역은 받을 때까지 잠깐 「불러오는 중」 (들어가자마자 끊기던 것)
  zoneImages(zn) {
    const out = new Set(), sp = (t) => { const e = DATA.enemies?.[MONSTER_LOOK[t]?.sprite]; if (e?.images) for (const v of Object.values(e.images)) out.add(v); };
    for (const t of [...Object.keys(zn.spawns || {}), zn.named?.type, zn.boss?.type]) if (t) sp(t);
    const set = DATA.tiles?.[ZONE_LOOK_W[zn.id]?.set]; if (set?.imgs) for (const v of set.imgs) out.add(v);
    return [...out];
  }
  preloadZone(zn) { (this.zonePre ||= new Set()); if (this.zonePre.has(zn.id)) return; this.zonePre.add(zn.id); for (const p of this.zoneImages(zn)) image(p); }
  zoneGate(zn) {
    const need = this.zoneImages(zn).filter((p) => !image(p).ok);
    if (!need.length) return;
    this.loadingZone = true; const el = document.getElementById('zoneLoad'); if (el) { el.hidden = false; el.querySelector('b').textContent = zn.name; }
    const done = () => { this.loadingZone = false; if (el) el.hidden = true; };
    Promise.race([Promise.all(need.map((p) => image(p).p)), new Promise((r) => setTimeout(r, 8000))]).then(() => requestAnimationFrame(done));
  }
  update(dt) {
    if (this.loadingZone) return; // 지역 그림을 받는 동안 멈춘다
    this.time += dt;
    const st = this.st;
    st.playTime += dt;
    this.checkDungeonGate(dt);
    this.checkChests();
    this.raidStep(dt);
    this.merchantStep(dt);
    this.rumorStep(dt);
    this.dungeonStep(dt);
    this.debuffStep(dt);
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
    for (const k in this.buffs) { const b = this.buffs[k]; if (b.t > 0) { b.t -= dt; if (b.t <= 0) { buffChanged = true; if (k === 'venge') this.vengeRelease(b); } } }
    this.auraStep();
    globalThis.__game?.windows?.talkCheck?.();
    // v0.44.50 봉인 결계 안에 가둔다
    if (this.seal) {
      const S = this.seal, P = this.player.pos, dd = Math.hypot(P.x - S.x, P.z - S.z);
      if (!this.dungeon?.unknown || S.ms.every((m) => m.dead)) { this.seal = null; if (this.dungeon) this.ui.toast('결계가 풀렸습니다', '#7fe07a'); }
      else { if (dd > S.r) { P.x = S.x + (P.x - S.x) * S.r / dd; P.z = S.z + (P.z - S.z) * S.r / dd; } S.t = (S.t || 0) - dt; if (S.t <= 0) { S.t = 0.8; this.fx.telegraph(S.x, S.z, S.r, 0.8, 0xff4060); } }
    }
    // v0.44.47 미지의 땅 함정: 낙석 (예고 원 1초 뒤 최대 HP 10%) · 깊이 갈수록 자주 · 가끔 줄지은 셋
    if (this.dungeon?.unknown && !this.dead) {
      this.trapT = (this.trapT ?? 3) - dt;
      if (this.trapT <= 0) {
        const P = this.player.pos, Ld = dungeonLayout(this.dungeon.zi), deep = Math.min(1, (this.monsters.filter((m) => m.dungeon && m.dead).length) / 30);
        this.trapT = 2.4 - deep * 1.2;
        const pm = { level: this.dungeon?.L || 1 }, hit = (k) => this.hurtPlayer(this.d.maxHp * k, pm, { sure: true });
        let kind = ['rock', 'rock', 'spike', 'arrow', 'fire', 'boulder', 'poison', 'ambush'][Math.floor(Math.random() * (deep > 0.3 ? 8 : 5))];
        if (deep > 0.5 && !this.dungeon.sealDone && !this.seal) kind = 'seal';
        const circ = (spots, r, k, col = 0xff5020, fxn = 'quake') => { for (const q of spots) { this.fx.telegraph(q.x, q.z, r, 1, col); this.later(1, () => { this.fx.play(fxn, q.x, q.z, { scale: r / 2 }); if (Math.hypot(this.player.pos.x - q.x, this.player.pos.z - q.z) < r) hit(k); }); } };
        const lane = (len, wdt, k, col, fxn) => { // 플레이어를 가로지르는 줄 (화살 덫 · 화염 분사구 · 굴러오는 바위)
          const a = Math.random() * 6.28, ux = Math.cos(a), uz = Math.sin(a), x1 = P.x - ux * len / 2, z1 = P.z - uz * len / 2, x2 = P.x + ux * len / 2, z2 = P.z + uz * len / 2;
          this.fx.lane(x1, z1, x2, z2, wdt, 1, col);
          this.later(1, () => { const Q = this.player.pos, t = Math.max(0, Math.min(1, ((Q.x - x1) * (x2 - x1) + (Q.z - z1) * (z2 - z1)) / (len * len))); for (let i = 0; i <= 4; i++) this.fx.play(fxn, x1 + (x2 - x1) * i / 4, z1 + (z2 - z1) * i / 4, { scale: 0.8 }); if (Math.hypot(Q.x - (x1 + (x2 - x1) * t), Q.z - (z1 + (z2 - z1) * t)) < wdt / 2) hit(k); });
        };
        if (kind === 'rock') { const line = Math.random() < 0.35, a = Math.random() * 6.28; circ(line ? [-2.4, 0, 2.4].map((o) => ({ x: P.x + Math.cos(a) * o, z: P.z + Math.sin(a) * o })) : [{ x: P.x + (Math.random() - 0.5) * 3, z: P.z + (Math.random() - 0.5) * 3 }], line ? 1.4 : 2.2, 0.1); }
        else if (kind === 'spike') circ([0, 1, 2, 3].map((i) => ({ x: P.x + Math.cos(i * 1.57 + 0.4) * 2.2, z: P.z + Math.sin(i * 1.57 + 0.4) * 2.2 })).concat([{ x: P.x, z: P.z }]), 1.2, 0.08, 0xff3030, 'c_earthspike'); // 가시 발판
        else if (kind === 'arrow') lane(16, 1.2, 0.08, 0xffd040, 'v_dust'); // 화살 덫
        else if (kind === 'fire') lane(12, 2.4, 0.12, 0xff6a20, 'p_burning'); // 화염 분사구
        else if (kind === 'boulder') lane(22, 3, 0.15, 0xa08050, 'quake'); // 굴러오는 바위
        else if (kind === 'poison') { const q = { x: P.x, z: P.z }; this.fx.telegraph(q.x, q.z, 3, 1, 0x60d040); for (let i = 1; i <= 4; i++) this.later(i, () => { this.fx.play('h_necrotic', q.x, q.z, { scale: 1 }); if (Math.hypot(this.player.pos.x - q.x, this.player.pos.z - q.z) < 3) hit(0.04); }); } // 독 늪
        else if (kind === 'seal') { // v0.44.50 봉인 결계: 둘레가 닫히고, 쏟아지는 무리를 다 잡아야 풀린다 (한 번)
          this.dungeon.sealDone = true; this.ui.toast('봉인 결계!', '#ff6a5a');
          const ms = [];
          for (let i = 0; i < 6; i++) { const a = i * 1.05, m = this.spawn({ zone: this.dungeon.zone, x: P.x + Math.cos(a) * 4.5, z: P.z + Math.sin(a) * 4.5, level: this.dungeon.L - this.tierOffset, tier: i < 2 ? 'elite' : 'normal', timer: 0, mon: null }); if (m) { m.dungeon = true; m.noLoot = true; m.state = 'chase'; m.home = { x: m.pos.x, z: m.pos.z }; ms.push(m); } }
          this.seal = { x: P.x, z: P.z, r: 7, ms };
        }
        else if (kind === 'ambush' && (this.dungeon.amb = (this.dungeon.amb || 0) + 1) <= 5) { // 매복: 숨어 있던 무리
          this.ui.toast('매복!', '#ff6a5a');
          for (let i = 0; i < 3; i++) { const a = i * 2.1, m = this.spawn({ zone: this.dungeon.zone, x: P.x + Math.cos(a) * 4, z: P.z + Math.sin(a) * 4, level: this.dungeon.L - this.tierOffset, tier: i ? 'normal' : 'elite', timer: 0, mon: null }); if (m) { m.dungeon = true; m.noLoot = true; m.state = 'chase'; m.home = { x: m.pos.x, z: m.pos.z }; } }
        }
      }
    }
    this.scrollT = (this.scrollT || 0) - dt; if (this.scrollT <= 0) { this.scrollT = 1; this.autoScrolls(); this.floodStep(); }
    for (const k in this.st.elix || {}) { const e = this.st.elix[k]; e.t -= dt; if (e.t <= 0) { delete this.st.elix[k]; buffChanged = true; this.ui.dirty(); } }
    for (const k in this.pbuffs || {}) { const b = this.pbuffs[k]; if (b.t > 0) { b.t -= dt; if (b.t <= 0) buffChanged = true; } }
    if (buffChanged) this.d = derive(st, this.buffValues());
    for (const k in this.cds) if (this.cds[k] > 0) this.cds[k] -= dt;
    this.potionCd -= dt; this.atkCd -= dt; this.swing -= dt; this.actCd -= dt;
    if (!this.dead) {
      st.hp = Math.min(this.d.maxHp, st.hp + this.d.hpRegen * dt * (this.inTown ? 6 : 1) * (this.mut('wound') ? 0.5 : 1));
      this.gainMp(this.d.mpRegen * dt * (this.inTown ? 6 : 1) * (this.mut('drain') ? 0.5 : 1));
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
        if (!m.owner && !m.flood && dist2(m.pos, P) > DESPAWN_FAR) { m.actor.dispose(); this.monsters.splice(i, 1); m.sp.mon = null; m.sp.timer = 0; if (this.target === m) this.target = null; }
        continue;
      }
      if (m.dungeon && this.dungeon && !this.dungeon.started) { m.actor.update(dt); continue; } // v0.47 변이를 보고 시작하기 전
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
      const T0 = townOf(st), building = Object.entries(T0.plots).filter(([, b]) => b.bld).map(([k, b]) => [k, b.type, b.bld.to]);
      const wl = townOf(st).wageLog?.day;
      townTick(st);
      { const W = townOf(st).wageLog; if (W && W.day !== wl) this.ui.toast(`용병 품삯 ${W.paid.toLocaleString()} G${W.unpaid ? ` · ${W.unpaid}명은 못 받아 쉽니다` : ''}`, W.unpaid ? '#ff7060' : '#ffd84a'); }
      const secs = [];
      // 공사 끝 (v0.44.15 알림 팝업)
      const built = building.filter(([k]) => !T0.plots[k]?.bld);
      if (built.length) { this.refreshTown(); sfx('rankup'); secs.push({ title: '공사 완료', rows: built.map(([, ty, to]) => ({ img: townIcon(), name: `${BUILDINGS[ty].name} ${to}단계` })) }); }
      this.syncWorkers();
      const done = researchTick(st);
      if (done) secs.push({ title: '연구 완료', rows: [{ img: bookIcon(), name: `${RESEARCH[done].name} ${researchLv(st, done)}단계` }] });
      secs.push(...this.townAuto());
      this.floodTick();
      if (st.dailyNew?.length) { this.dailyDone(st.dailyNew); st.dailyNew = []; }
      if (secs.length) { sfx('coin'); if (globalThis.__game?.windows) globalThis.__game.windows.notice(secs); else for (const x of secs) this.ui.toast(x.title, '#7fe07a'); }
      this.checkAchievements();
      this.checkTierUnlock(); // 예전 저장도 조건을 채웠으면 열린다
      { const ti = TITLE_AT.findIndex((n, i) => st.awakenings >= n && !(st.titles || []).some((t) => t.tier === i)); if (ti >= 0 && !this.dead) this.offerTitle(ti); } // 4차 각성이 새로 생겨 이미 넘긴 캐릭터도 받는다

    }
  }

  // v0.44.15 마을 자동화: 돌아온 용병 전리품 받기 · 다 만든 물건 꺼내기 · 가득 찬 광산 · 약초밭 거두기 → 알림 줄
  townAuto() {
    const st = this.st, t = townOf(st), now = Date.now(), secs = [];
    const put = (s2, it) => addItem(s2, it) || vaultAdd(s2, it); // 가방이 차면 창고로
    // v0.44.68 들고 기다리던 전리품: 자리가 나면 받는다
    let gotHeld = 0;
    // v0.44.66에서 가방 칸을 넘겨 담긴 것: 넘친 만큼 떼어 용병 짐으로 (가방이 수천 칸으로 불어나 멈칫했다)
    { const B = bagSize(st); if (st.inv.length > B && t.mercs.length) { const extra = st.inv.splice(B); const m0 = t.mercs[0]; m0.held = [...(m0.held || []), ...extra]; } }
    for (const m of t.mercs) if (m.held?.length && !lootRoomFull(st)) { const left = []; for (const it of m.held) (put(st, it) ? gotHeld++ : left.push(it)); m.held = left.length ? left : undefined; }
    if (gotHeld) secs.push({ title: '용병이 들고 있던 전리품', rows: [{ name: `장비 ${gotHeld}개를 받았습니다`, color: '#7fe07a' }] });
    const full = lootRoomFull(st);
    if (full && t.mercs.some((m) => (m.job && now >= m.job.until) || m.held?.length) && !(this.lootWaitT > now)) { this.lootWaitT = now + 60e3; this.ui.toast('가방 · 창고가 꽉 차 용병이 전리품을 들고 기다립니다', '#ff9a5a'); }
    const back = full ? [] : t.mercs.filter((m) => m.job && now >= m.job.until); // v0.44.66 꽉 차 있으면 받지 않고 기다린다
    if (back.length) {
      const rows = [], tot = { gold: 0, ore: 0, mats: 0 };
      for (const m of back) {
        const r = claimMerc(st, m.id, now, Math.random, put);
        if (!r) continue;
        if (r.dead) { rows.push({ name: `${r.name} 돌아오지 못함${r.back ? ` · 물약 ${r.back}개 회수` : ''}`, color: '#ff6a5a' }); continue; }
        tot.gold += r.gold; tot.ore += r.ore; tot.mats += r.mats;
        if (r.held?.length) { const mm = t.mercs.find((x) => x.id === m.id); if (mm) mm.held = [...(mm.held || []), ...r.held]; }
        for (const it of r.items) { if (rows.filter((x) => x.item).length >= 40) { tot.more = (tot.more || 0) + 1; continue; } rows.push({ img: itemIcon(it), name: itemName(it), color: itemColor(it), item: it }); } // v0.44.68 알림 줄은 40개까지 (수천 줄이 쌓여 화면이 멈칫했다)
        if (r.held?.length) rows.push({ name: `자리가 없어 ${r.held.length}개는 용병이 들고 기다림`, color: '#ff9a5a' });
        if (r.mapPiece) rows.push({ name: `알 수 없는 지도 조각 ${r.mapPiece}`, color: '#ffd060' });
      }
      if (tot.more) rows.push({ name: `그 밖의 장비 ${tot.more}개`, color: '#c8c0b0' });
      rows.unshift({ img: coinIcon(), name: '금화', qty: tot.gold }, { img: oreIcon(), name: '강화석', qty: tot.ore }, { img: iconUrl(1012), name: '지역 재료', qty: tot.mats });
      secs.push({ title: `파견 귀환 · ${back.map((m) => m.name).join(' · ')}`, rows });
    }
    // v0.49.23 광산 · 약초밭 · 제작소는 직접 건물에서 거둔다 (자동으로 가방에 넣지 않는다). 다 찼거나 완성되면 기록에 한 줄만
    const ntf = (this.townFullNote ||= {});
    const readyN = (t.brew || []).filter((b) => b.until <= now).length;
    if (readyN && !ntf.brew) this.ui.log(`제작소 · 완성품 ${readyN}개를 받을 수 있습니다`, '#7fe07a');
    ntf.brew = readyN > 0;
    autoBrewTick(st, now);
    for (const names of repeatTick(st, now)) this.ui.toast(`반복 파견 출발: ${names}`, '#ffc860');
    for (const [pid, b] of Object.entries(t.plots)) {
      const def = BUILDINGS[b.type];
      if (!def?.store || b.bld?.to === 1) continue;
      const full = (b.stock || 0) >= def.store(b.lv);
      if (full && !ntf[pid]) this.ui.log(`${def.name}이 가득 찼습니다 · 거두어야 다시 쌓입니다`, '#ffc860');
      ntf[pid] = full;
    }
    return secs;
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
    const speed = d.moveSpeed * ((this.chainSpdT || 0) > 0 ? 1.15 : 1) * (this.mut('frozen') ? 0.8 : 1) * ((this.pdeb?.root || 0) > 0 ? 0 : (this.pdeb?.slow || 0) > 0 ? 0.6 : 1);
    if (this.chainSpdT > 0) this.chainSpdT -= dt;
    const aq = this.atkQueue;
    if (aq && (aq.m.dead || this.time > aq.until)) this.atkQueue = null;
    if (this.joy.lengthSq() > 0.01 && this.atkQueue && this.atkCd <= 0 && this.actCd <= 0 && dist2(this.atkQueue.m.pos, P.pos) < d.range + 0.8) {
      // 이동 중 평타: 예약한 한 번을 바로 친다 (스킬처럼 걸음 사이에 섞인다)
      const m = this.atkQueue.m; this.atkQueue = null; this.basicAttack(m);
    } else if (this.joy.lengthSq() > 0.01) {
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
      // 자동 사냥: 집으로 돌아가며 피를 채우는 몬스터(쫓아오지 않는 상태)는 버리고 다른 몬스터로 (헛손질 방지)
      if (this.auto && t.state === 'return' && (dist2(t.pos, t.home) >= 26 || inCamp(P.pos.x, P.pos.z) || this.inTown)) { t.ignoreUntil = this.time + 8; this.target = null; this.atkQueue = null; }
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
    // 자동 사냥 중에는 설정한 것만 밟아서 줍는다 (지나가며 줍기 · 펫도 같은 규칙)
    this.floodFlames(P.pos);
    // 범람 결계: 지역 밖으로 나가려 하면 안으로 되돌린다 (귀환 · 사망 · 범람 보스 처치로만 풀림)
    if (this.floodLock && !this.dead) {
      const L = this.floodLock, zn = zoneAt(P.pos.x, P.pos.z);
      if (this.inTown || this.dungeon || !this.st.flood?.list?.some((x) => x.zone === L.zone)) this.floodLock = null;
      else if (zn?.id === L.zone) { L.x = P.pos.x; L.z = P.pos.z; }
      else { P.pos.x = L.x; P.pos.z = L.z; this.moveTo = null; if (!(this.sealMsgT > this.time)) { this.sealMsgT = this.time + 2; this.ui.toast('범람의 결계에 막혔습니다', '#ff6a5a'); this.fx.play('shield_orange', P.pos.x, P.pos.z, { scale: 0.8, fade: true, dur: 0.6, tint: 0xff4040 }); } }
    }
    if (!this.dead) for (const g of [...this.ground]) if (dist2(g, P.pos) < 1.4 && (!this.auto || this.autoWants(g))) this.pickup(g);

    // 지역
    const zn = zoneAt(P.pos.x, P.pos.z);
    const dg = this.dungeon;
    const id = dg ? 'dg' + dg.zi + '_' + dg.stage : this.inTown ? 'town' : zn?.id || 'wild';
    // 가까운 지역은 미리 받아 둔다 (경계 25 안)
    this.preT = (this.preT || 0) - dt;
    if (this.preT <= 0) { this.preT = 2; for (const q of ZONES) if (Math.hypot(P.pos.x - q.x, P.pos.z - q.z) < q.r + 25) this.preloadZone(q); }
    if (id !== this.zone) {
      this.zone = id;
      if (zn && !dg) this.zoneGate(zn);
      if (zn) st.lastZone = zn.id;
      this.ui.zone(dg?.hidden ? { name: `${dg.zone.name} 숨은 던전${dg.plus ? ` +${dg.plus}` : ''}`, levels: [dg.zone.levels[1] + 5 + this.tierOffset, dg.zone.levels[1] + 5 + this.tierOffset] } : dg ? { name: `${dg.zone.name} 던전 ${dg.stage}단계`, levels: [dungeonLevel(dg.zone, dg.stage) + this.tierOffset, dungeonLevel(dg.zone, dg.stage) + this.tierOffset] } : id === 'town' ? TOWN : zn);
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

  useItem(uid, { all = false } = {}) {
    const st = this.st;
    const it = st.inv.find((x) => x.uid === uid);
    if (!it) return;
    if (it.base === 'unknown_gate') { if (this.dungeon) { this.ui.toast('던전 밖에서 쓸 수 있습니다'); return; } if (Date.now() > (it.until || 0)) { st.inv.splice(st.inv.indexOf(it), 1); this.ui.toast('길이 닫혔습니다'); this.ui.dirty(); return; } this.enterDungeon(it.zi, 1, { unknown: true, gate: it }); globalThis.__game?.windows?.close?.(); return; }
    if (it.base === 'unknown_map') { if (this.dungeon) { this.ui.toast('던전 밖에서 펼칠 수 있습니다'); return; } this.enterUnknown(); globalThis.__game?.windows?.close?.(); return; } // v0.44.47
    this.d = derive(st, this.buffValues());
    if (BASES[it.base]?.type === 'pet') { takeOne(st, it.base); const cat = BASES[it.base].pet === 'pet_cat'; st.pet = { kind: cat ? 'pet_cat' : 'pet_dog', name: cat ? '고양이' : '강아지' }; this.makePet(); this.ui.toast(`${st.pet.name}가 함께합니다! 물건을 주워 오고 함께 싸웁니다`, '#7fe07a'); sfx('learn'); this.ui.dirty(); return; }
    if (isBook(it)) {
      // v0.49.25 같은 스킬북은 겹쳐 쌓인다: 하나만 쓰거나(all=false) 모두 쓴다 — 이미 아는 스킬이면 권마다 숙련 EXP
      const c = canLearn(st, it.book, this.d.stats), have = it.qty || 1;
      const use = (n) => { it.qty = have - n; if (it.qty <= 0) st.inv.splice(st.inv.indexOf(it), 1); };
      if (c.ok) {
        learn(st, it.book);
        const n = all ? have : 1, rest = n - 1;
        use(n);
        if (rest > 0) this.skillExp(it.book, (rest * bookAbsorbExp(it.book)) / this.d.skillExp / this.autoMult);
        this.ui.toast(`새 스킬을 배웠습니다: ${SKILLS[it.book].name}${rest > 0 ? ` (+${rest}권 흡수)` : ''}`, '#ffd84a');
        sfx('learn');
        this.fx.pillar(this.player.pos.x, this.player.pos.z, 0x80c0ff, 1.2);
      } else if (c.known) {
        const n = all ? have : 1;
        use(n);
        this.skillExp(it.book, (n * bookAbsorbExp(it.book)) / this.d.skillExp / this.autoMult);
        this.ui.toast(`${SKILLS[it.book].name} 숙련도를 흡수했습니다${n > 1 ? ` (${n}권)` : ''}`);
      } else {
        const req = Object.entries(SKILLS[it.book].req).map(([k, v]) => `${STAT_NAMES[k] || k} ${v}`).join(', ');
        this.ui.toast(`스탯이 부족합니다 (${req})`);
      }
    } else if (BASES[it.base].type === 'elixir') {
      this.readScroll(it.base);
    } else if (BASES[it.base].type === 'potion') {
      this.usePotion(BASES[it.base].restore.hp ? 'hp' : 'mp');
    } else {
      const r = equipItem(st, uid, Math.random, globalThis.__game?.windows?.ringSlot?.(st) || null); // v0.49.33 반지는 비교 중인 칸에
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
