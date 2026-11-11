// 게임 월드: 플레이어 조작 · 몬스터 AI · 전투 · 스킬 · 드랍 · 사망 · 자동 사냥
import * as THREE from 'three';
import { CONFIG, TIERS, AP_TABLE } from '../data/config.js';
import { SKILLS } from '../data/skills.js';
import { BASES, WEAPON_CLASSES, RARITY_ORDER } from '../data/items.js';
import { MONSTERS, ZONES, TOWN } from '../data/world.js';
import { derive, damageReduction } from '../game/player.js';
import { addAP, gainExp, rewardFactor } from '../game/growth.js';
import { addSkillExp, skillValues, meetsReq, canLearn, learn, bookAbsorbExp } from '../game/skills.js';
import { rollLoot, rollDeathDrop } from '../game/loot.js';
import { addItem, takeOne, countOf, equip as equipItem, unequip as unequipItem } from '../game/inventory.js';
import { itemName, itemColor, isBook, makeItem } from '../game/items.js';
import { seeded, randInt, randRange } from '../game/rng.js';
import { Actor, makeHero } from '../engine2d/actor.js';
import { FX } from '../engine2d/fx.js';
import { resolveCollision, zoneAt } from '../engine2d/stage.js';
import { DATA, image, animImage, drawRect, frameIndex } from '../engine2d/sprites.js';
import { MONSTER_LOOK, ITEM_LOOK, LOOT_LOOK } from '../data/flareWorld.js';
import { audio } from '../engine/audio.js';
const sfx = (n, k) => audio.play(n, k);

const ACTIVE_RADIUS = 58;
const SPAWN_NEAR = 72;   // 이 안의 자리에만 몬스터를 만든다
const DESPAWN_FAR = 92;  // 이보다 멀어진 한가한 몬스터는 치운다 (다시 오면 새로 만든다)
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class World {
  constructor(stage, st, ui) {
    this.stage = stage;
    this.scene = stage;
    this.st = st;
    this.ui = ui;
    this.fx = new FX(stage, ui.fxLayer);
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
  }

  // ───────── 플레이어 ─────────

  makePlayer() {
    const st = this.st;
    this.player = new Actor(this.scene, makeHero(st.look));
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
    st.hp = Math.min(st.hp, this.d.maxHp);
    st.mp = Math.min(st.mp, this.d.maxMp);
    this.ui.dirty();
  }

  buffValues() {
    const b = {};
    for (const k in this.buffs) if (this.buffs[k].t > 0) b[k] = this.buffs[k].v;
    return b;
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
  }

  get inTown() {
    return dist2(this.player.pos, TOWN) < TOWN.r;
  }

  // ───────── 몬스터 ─────────

  makeSpawners() {
    const rng = seeded(777);
    for (const zn of ZONES) {
      const near = Math.hypot(zn.x, zn.z) - zn.r;
      const lv = (x, z) => {
        const t = Math.max(0, Math.min(1, (Math.hypot(x, z) - near) / (zn.r * 2)));
        return Math.round(zn.levels[0] + (zn.levels[1] - zn.levels[0]) * t);
      };
      for (let i = 0; i < zn.count; i++) {
        let x, z, tries = 0;
        do {
          const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * zn.r * 0.95;
          x = zn.x + Math.cos(a) * r; z = zn.z + Math.sin(a) * r;
        } while (++tries < 20 && Math.hypot(x, z) < TOWN.r + 8);
        this.spawners.push({ zone: zn, x, z, level: lv(x, z), tier: 'normal', timer: 0, mon: null });
      }
      // 네임드: 지역 한가운데 / 보스: 마을에서 가장 먼 곳
      const ux = zn.x / Math.hypot(zn.x, zn.z), uz = zn.z / Math.hypot(zn.x, zn.z);
      this.spawners.push({ zone: zn, x: zn.x - uz * 12, z: zn.z + ux * 12, level: zn.levels[1], tier: 'named', timer: 0, mon: null, fixed: zn.named });
      this.spawners.push({ zone: zn, x: zn.x + ux * zn.r * 0.75, z: zn.z + uz * zn.r * 0.75, level: zn.levels[1] + 1, tier: 'boss', timer: 0, mon: null, fixed: zn.boss });
    }
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
    const L = sp.level;
    const look = MONSTER_LOOK[type] || { sprite: 'goblin' };
    const actor = new Actor(this.scene, { enemy: look.sprite }, { tint: tint ?? look.tint ?? null, scale: T.scale, size: look.size || 1 });
    if (tier === 'elite') actor.setGlow(0x0a1a40);
    if (tier === 'named') actor.setGlow(0x302000);
    if (tier === 'boss') actor.setGlow(0x400800);
    const a = Math.random() * Math.PI * 2;
    actor.pos.set(sp.x + Math.cos(a) * 1.5, 0, sp.z + Math.sin(a) * 1.5);
    actor.facing = Math.random() * 6.28;
    actor.root.rotation.y = actor.facing;
    const m = {
      id: actor.id, def, type, tier, level: L, actor, sp,
      name: name || (tier === 'elite' ? `정예 ${def.name}` : def.name),
      maxHp: Math.round(def.hp * (1 + 0.32 * (L - 1)) * T.hp),
      dmg: def.dmg.map((v) => v * (1 + 0.22 * (L - 1)) * T.dmg),
      armor: L * 2,
      exp: def.exp * (1 + 0.3 * (L - 1)) * T.exp,
      speed: def.speed * (tier === 'boss' ? 1.1 : 1),
      state: 'idle', atkT: 1, wanderT: Math.random() * 4, deadT: 0, slowT: 0, showHp: 0,
      home: { x: sp.x, z: sp.z },
    };
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
    const valid = !this.dead && !this.inTown;
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
      else if (d > m.def.range) {
        if (a.lock <= 0) { this.stepToward(m.pos, p, spd * dt); a.face(p.x, p.z); moving = 2; }
      } else {
        a.face(p.x, p.z);
        if (m.atkT <= 0 && a.lock <= 0) this.monsterAttack(m);
      }
      if (m.tier === 'boss' && m.def.patterns && valid && d < 16) {
        m.patT = (m.patT ?? 5) - dt * (m.hp < m.maxHp * 0.3 ? 1.6 : 1);
        if (m.patT <= 0 && a.lock <= 0) { m.patT = 6.5; this.bossPattern(m, m.def.patterns[(m.patI = (m.patI || 0) + 1) % m.def.patterns.length]); }
      }
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
    sfx(m.def.attack === 'melee' ? 'mattack' : 'mshoot', 0.8);
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

  bossPattern(m, name) {
    const a = m.actor, p = this.player.pos;
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
        add.owner = m; add.state = 'chase'; add.exp *= 0.3; add.noLoot = true;
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
      return;
    }
    let dmg = raw * (1 - damageReduction(d.armor, m.level));
    if (d.block && Math.random() < d.block) {
      dmg *= 0.3;
      this.fx.text(head, '막기', 'miss');
      sfx('block');
      addAP(st, 'vit', AP_TABLE.blockVit, apMult);
      addAP(st, 'str', AP_TABLE.blockStr, apMult);
    }
    const sh = this.buffs.shield;
    if (sh && sh.t > 0 && sh.v > 0) {
      const ab = Math.min(sh.v, dmg);
      sh.v -= ab; dmg -= ab;
      if (sh.v <= 0) sh.t = 0;
    }
    dmg = Math.max(1, Math.round(dmg));
    st.hp -= dmg;
    addAP(st, 'vit', (dmg / d.maxHp) * AP_TABLE.hurtScale, apMult);
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
    const st = this.st, d = this.d;
    const rf = rewardFactor(st, m.level);
    const apMult = rf.ap * this.autoMult;
    const red = m.armor / (m.armor + 60) * (1 - pierce);
    const dmg = Math.max(1, Math.round(raw * (1 - red)));
    m.hp -= dmg;
    m.showHp = 4;
    if (m.state !== 'return') m.state = 'chase';
    m.actor.hitFlash(crit ? 0xffd040 : 0xffffff);
    const head = m.pos.clone().setY(2.3 * m.actor.scale);
    this.fx.text(head, crit ? `${dmg}!` : String(dmg), crit ? 'crit' : '');
    sfx(crit ? 'crit' : 'hit');
    this.fx.hit(m.pos.x, 1.1 * m.actor.scale, m.pos.z, ctx ? new THREE.Color(SKILLS[ctx.id].color).getHex() : crit ? 0xffd040 : 0xffa060, crit);
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
      if (sk.ap === 'int' && !ctx.apGiven) { addAP(st, 'int', ctx.mp * AP_TABLE.spellPerMp, apMult); ctx.apGiven = true; }
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
    m.hp = 0;
    const st = this.st, d = this.d;
    st.kills = (st.kills || 0) + 1;
    const apMult = rf.ap * this.autoMult;
    m.dash = null;
    m.actor.play('death', { once: true, force: true, fade: 0.1 });
    sfx(m.def.rig === 'human' ? 'hurt' : 'mdie');
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
    const exp = m.exp * rf.exp * this.autoMult;
    const results = gainExp(st, exp);
    for (const r of results) this.onAwaken(r);

    // 드랍
    const drops = m.noLoot ? [] : rollLoot(m, { auto: this.auto, magicFind: d.magicFind, goldFind: d.goldFind }, st);
    drops.forEach((dr, i) => {
      const a = (i / Math.max(1, drops.length)) * Math.PI * 2 + Math.random();
      const r = drops.length > 1 ? 1.2 + Math.random() : 0.6;
      this.dropGround(dr, m.pos.x + Math.cos(a) * r, m.pos.z + Math.sin(a) * r);
    });
    if (m.tier !== 'normal') this.ui.log(`${m.name} 처치!`, TIERS[m.tier].color);
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
    const g = { gid: this.nextGid++, kind: dr.kind, amount: dr.amount, item: dr.item, x, z, expires, born: this.time };
    let look = LOOT_LOOK.gold, color = 0xffd040, beam = false;
    if (dr.kind === 'item') {
      const it = dr.item, b = BASES[it.base];
      color = new THREE.Color(itemColor(it)).getHex();
      if (isBook(it)) { look = LOOT_LOOK.book; beam = true; }
      else if (b.type === 'potion') look = b.restore.hp ? LOOT_LOOK.potion_hp : LOOT_LOOK.potion_mp;
      else if (b.slot === 'weapon') look = LOOT_LOOK.weapon[b.cls] || 'longsword';
      else look = LOOT_LOOK[b.slot] || 'leather_armor';
      if (it.rarity && RARITY_ORDER.indexOf(it.rarity) >= 2) beam = true;
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
      ctx.globalAlpha = pulse * 0.55;
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, (beam ? 46 : 30) * k);
      gr.addColorStop(0, css); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(p.x, p.y, (beam ? 46 : 30) * k, (beam ? 23 : 15) * k, 0, 0, 7); ctx.fill();
      if (beam) {
        const h = 150 * k, lg = ctx.createLinearGradient(0, p.y, 0, p.y - h);
        lg.addColorStop(0, css); lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = pulse * 0.6; ctx.fillStyle = lg; ctx.fillRect(p.x - 5 * k, p.y - h, 10 * k, h);
      }
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
    this.st.hp = 0;
    this.target = null; this.moveTo = null; this.pendingSkill = null; this.recallT = 0;
    this.player.play('death', { once: true, force: true, fade: 0.1 });
    sfx('death');
    this.player.lock = 99;
    const lost = rollDeathDrop(this.st);
    if (lost) {
      const g = this.dropGround({ kind: 'item', item: lost }, this.player.pos.x + 0.8, this.player.pos.z, Date.now() + CONFIG.deathItemLifetime * 1000);
      g.deathDrop = true;
      this.refreshGear();
    }
    this.saveGround();
    this.ui.death(lost ? itemName(lost) : null, lost ? itemColor(lost) : null);
  }

  revive() {
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
    this.target = null;
    this.pendingSkill = null;
    this.cancelRecall();
  }

  cmdAttack(m) {
    if (this.dead || !m || m.dead) return;
    this.target = m;
    this.moveTo = null;
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

  nearestMonster(range, from = this.player.pos, exclude = null) {
    let best = null, bd = range;
    for (const m of this.monsters) {
      if (m.dead || m === exclude || !m.near || m.ignoreUntil > this.time) continue;
      if (dist2(m.pos, TOWN) < TOWN.r) continue;
      const d = dist2(m.pos, from);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  monstersNear(pos, r) {
    return this.monsters.filter((m) => !m.dead && dist2(m.pos, pos) <= r);
  }

  usePotion(kind) {
    if (this.dead || this.potionCd > 0) return false;
    const st = this.st;
    const ids = kind === 'hp' ? ['hp_potion_l', 'hp_potion'] : ['mp_potion_l', 'mp_potion'];
    const missing = kind === 'hp' ? this.d.maxHp - st.hp : this.d.maxMp - st.mp;
    // 부족한 양에 맞는 물약을 먼저
    const order = missing > 150 ? ids : [...ids].reverse();
    const id = order.find((i) => countOf(st, i) > 0);
    if (!id) { this.ui.toast(kind === 'hp' ? '체력 물약이 없습니다' : '마나 물약이 없습니다'); return false; }
    takeOne(st, id);
    const r = BASES[id].restore;
    if (r.hp) this.healPlayer(r.hp);
    if (r.mp) { this.gainMp(r.mp); this.fx.text(this.player.pos.clone().setY(2.6), `+${r.mp}`, 'mana'); }
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
    this.ui.toast('마을로 귀환합니다…');
    sfx('recall');
  }

  cancelRecall() {
    if (this.recallT > 0) { this.recallT = 0; this.ui.toast('귀환 취소'); }
  }

  toggleAuto(on = !this.auto) {
    this.auto = on;
    this.autoPause = 0;
    this.ui.dirty();
  }

  // ───────── 스킬 ─────────

  skillReady(id) {
    const s = this.st.skills[id];
    if (!s) return { ok: false, why: '배우지 않은 스킬' };
    const sk = SKILLS[id];
    const v = skillValues(id, s.rank);
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
    if (this.player.lock > 0.15 && this.swing <= 0) { this.pendingSkill = id; return true; }
    this.castSkill(id, r.v);
    return true;
  }

  castSkill(id, v) {
    const st = this.st, d = this.d, sk = SKILLS[id];
    const P = this.player;
    this.pendingSkill = null;
    this.skillUsed = true;
    st.mp -= v.mp;
    this.cds[id] = v.cd;
    this.skillExp(id, 1);
    const ctx = { id, mp: v.mp, hits: 0, apGiven: false };
    const t = this.target;
    if (t) P.face(t.pos.x, t.pos.z);
    const pw = v.power;
    const spell = () => randRange(0.9, 1.1) * pw * d.spellMult;
    const spellCrit = () => Math.random() < d.crit * 0.5;
    const weaponHit = () => { const w = this.rollWeapon(); return { v: w.v * pw, crit: w.crit }; };
    const color = new THREE.Color(sk.color).getHex();
    if (sk.ap === 'int' || sk.type === 'buff') this.fx.circle(P.pos.x, P.pos.z, sk.type === 'buff' ? 2.6 : 1.8, color, 0.9);

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
            from: { x: P.pos.x, y: 1.6, z: P.pos.z }, target: t, color, size: sk.splash ? 1.5 : 0.9, speed: 20,
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
              from: { x: P.pos.x, y: 1.5, z: P.pos.z }, target: tg, color, size: 0.7, speed: 32, bolt: true,
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
          this.fx.projectile({ from: { x: P.pos.x, y: 1.4, z: P.pos.z }, target: { pos: new THREE.Vector3(end.x, 1.4, end.z) }, color, size: sk.width > 2 ? 2 : 1, speed: 40, bolt: true, onHit: () => {} });
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
        this.fx.ring(P.pos.x, P.pos.z, 2.5, color, 0.8);
        this.d = derive(st, this.buffValues());
        break;
      }
    }
    this.ui.dirty();
  }

  // ───────── 기본 공격 ─────────

  basicAttack(t) {
    const d = this.d, P = this.player;
    const interval = 1 / d.atkRate;
    this.atkCd = interval;
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
    sfx(cls.kind === 'ranged' ? 'shoot' : cls.kind === 'magic' ? 'magic' : d.two ? 'heavy' : 'swing', 0.8);
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
          from: { x: P.pos.x, y: 1.5, z: P.pos.z }, target: t, color: magic ? 0x80b0ff : 0xe0d0a0, size: magic ? 0.7 : 0.6,
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
      if (st.hp / d.maxHp < 0.95) { this.moveTo = null; this.target = null; return; }
    }
    if (st.mp / d.maxMp < 0.2) this.usePotion('mp');
    // 가까운 전리품 먼저 (싸우는 중이 아닐 때)
    const fighting = this.monsters.some((m) => !m.dead && m.state === 'chase' && dist2(m.pos, P) < 6);
    if (!fighting) {
      const g = this.ground.filter((x) => dist2(x, P) < 12).sort((a, b) => dist2(a, P) - dist2(b, P))[0];
      if (g && !(g.kind === 'item' && st.inv.length >= CONFIG.inventorySize && !BASES[g.item.base]?.stack)) {
        this.moveTo = { x: g.x, z: g.z }; this.target = null; return;
      }
    }
    if (!this.target || this.target.dead) {
      this.target = this.nearestMonster(18);
      if (!this.target) {
        // 사냥터로 이동
        const zn = ZONES.find((z) => z.id === st.lastZone) || ZONES[0];
        if (!this.moveTo || dist2(P, this.moveTo) < 2) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * zn.r * 0.6;
          this.moveTo = { x: zn.x + Math.cos(a) * r, z: zn.z + Math.sin(a) * r };
        }
        return;
      }
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
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); }
    }
    // 버프 · 쿨타임 · 회복
    let buffChanged = false;
    for (const k in this.buffs) { const b = this.buffs[k]; if (b.t > 0) { b.t -= dt; if (b.t <= 0) buffChanged = true; } }
    if (buffChanged) this.d = derive(st, this.buffValues());
    for (const k in this.cds) if (this.cds[k] > 0) this.cds[k] -= dt;
    this.potionCd -= dt; this.atkCd -= dt; this.swing -= dt;
    if (!this.dead) {
      st.hp = Math.min(this.d.maxHp, st.hp + this.d.hpRegen * dt * (this.inTown ? 6 : 1));
      this.gainMp(this.d.mpRegen * dt * (this.inTown ? 6 : 1));
    }
    this.updatePlayer(dt);
    this.player.update(dt);
    this.npc.update(dt);
    this.guard.update(dt);
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
  }

  updatePlayer(dt) {
    const st = this.st, P = this.player, d = this.d;
    if (this.dead) return;
    if (this.recallT > 0) {
      this.recallT -= dt;
      if (this.recallT <= 0) {
        this.fx.pillar(P.pos.x, P.pos.z, 0x80a0ff, 0.8);
        P.pos.set(0, 0, 4);
        this.fx.pillar(0, 4, 0x80a0ff, 0.8);
        P.play('idle', { force: true });
        this.ui.toast('잿빛 초소에 도착했습니다');
      }
      return;
    }
    this.autoPause -= dt;
    if (this.auto && this.autoPause <= 0) {
      this.autoThink -= dt;
      if (this.autoThink <= 0) { this.autoThink = 0.2; this.autoBrain(); }
    }
    let moving = false;
    const speed = d.moveSpeed;
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
        if (P.lock <= 0) { const g = this.goal(t.pos); this.stepToward(P.pos, g, speed * dt); P.face(g.x, g.z); moving = true; }
      } else if (this.pendingSkill) {
        if (P.lock <= 0 || this.swing <= 0) {
          const r = this.skillReady(this.pendingSkill);
          if (r.ok) this.castSkill(this.pendingSkill, r.v); else this.pendingSkill = null;
        }
      } else if (this.atkCd <= 0 && (P.lock <= 0 || this.swing <= 0)) {
        this.basicAttack(t);
      }
    } else {
      if (this.target?.dead) this.target = null;
      if (this.pendingSkill && !this.needsTarget(this.pendingSkill)) {
        const r = this.skillReady(this.pendingSkill);
        if (r.ok && (P.lock <= 0 || this.swing <= 0)) this.castSkill(this.pendingSkill, r.v);
      }
      if (this.moveTo && P.lock <= 0) {
        const wp = this.goal(this.waypoint(P.pos, this.moveTo));
        const left = this.stepToward(P.pos, wp, speed * dt);
        P.face(wp.x, wp.z);
        moving = left > 0.15 || wp !== this.moveTo;
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
    if (P.lock <= 0) P.play(moving ? 'run' : 'idle', { speed: moving ? speed / 7 : 1 });

    // 줍기
    for (const g of [...this.ground]) if (dist2(g, P.pos) < 1.4) this.pickup(g);

    // 지역
    const zn = zoneAt(P.pos.x, P.pos.z);
    const id = this.inTown ? 'town' : zn?.id || 'wild';
    if (id !== this.zone) {
      this.zone = id;
      if (zn) st.lastZone = zn.id;
      this.ui.zone(id === 'town' ? TOWN : zn);
    }
    this.musicT = (this.musicT || 0) - dt;
    if (this.musicT <= 0) {
      this.musicT = 0.5;
      const boss = this.monsters.some((m) => !m.dead && m.tier === 'boss' && m.state === 'chase' && dist2(m.pos, P.pos) < 26);
      audio.setMusic(boss ? 'boss' : ZONES.find((z) => z.id === this.zone)?.music || this.zone);
    }
    st.pos = { x: P.pos.x, z: P.pos.z };
  }

  // ───────── 가방 조작 (UI에서 호출) ─────────

  useItem(uid) {
    const st = this.st;
    const it = st.inv.find((x) => x.uid === uid);
    if (!it) return;
    this.d = derive(st, this.buffValues());
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
    } else if (BASES[it.base].type === 'potion') {
      this.usePotion(BASES[it.base].restore.hp ? 'hp' : 'mp');
    } else {
      const r = equipItem(st, uid);
      if (!r.ok) this.ui.toast(r.why);
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
