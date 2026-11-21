import { relicBonus } from '../data/relics.js';
import { spellToMatk } from '../data/items.js';
import { GEMS, GEM_GRADES } from '../data/legends.js';
import { setBonus } from './town.js';
// 플레이어 상태(저장되는 값)와 거기서 계산되는 능력치.
import { CONFIG, STATS } from '../data/config.js';
import { BASES, WEAPON_CLASSES, SLOTS, STARTS, START_BONUS, isTwoHandedBase } from '../data/items.js';
import { makeItem } from './items.js';

// start: 처음 무기 (null이면 맨손 — 튜토리얼에서 고른다)
export function newPlayer(name = '방랑자', look = { face: 'rogue_plain' }, start = 'sword') {
  const st = {
    v: 2,
    name, look: { face: typeof look === 'object' && look.face ? look.face : 'rogue_plain' },
    stats: Object.fromEntries(STATS.map((s) => [s, CONFIG.startStat])),
    ap: Object.fromEntries(STATS.map((s) => [s, 0])),
    apTotal: Object.fromEntries(STATS.map((s) => [s, 0])), // 지금까지의 누적 (기록용)
    exp: 0,
    awakenings: 0,
    hp: 0, mp: 0,
    gold: 50,
    skills: {},              // id → { rank, exp }
    quick: Array(CONFIG.quickSlots).fill(null),
    relics: { bag: [], on: [] }, // v0.44.47 유물
    inv: [],                 // 아이템 배열
    equip: Object.fromEntries(SLOTS.map((s) => [s, null])),
    nextUid: 1,
    pos: { x: 0, z: 4 },
    lastZone: 'field',
    ground: [],              // 사망으로 떨어뜨린 아이템 { item, x, z, expires }
    settings: { autoPotion: 0.4, autoBuy: true, shadows: true, music: 0.6, sfx: 0.8, shake: true },
    playTime: 0,
    kills: 0,
    tut: start ? 99 : 0,     // 튜토리얼 단계 (0 = 무기 고르기, 99 = 끝)
    start: null,
    quest: null,             // 진행 중인 퀘스트 { id, n }
    questsDone: [],
    savedAt: 0,
  };
  st.inv.push(makeItem('hp_potion', { qty: 10 }, st));
  st.inv.push(makeItem('mp_potion', { qty: 5 }, st));
  if (start) chooseStart(st, start);
  const d = derive(st);
  st.hp = d.maxHp;
  st.mp = d.maxMp;
  return st;
}

export function chooseStart(st, id) {
  const k = STARTS[id];
  st.start = id;
  st.equip.weapon = makeItem(k.base, { rarity: 'common', ilvl: 1 }, st);
  if (k.off) { st.equip.offhand = makeItem(k.off, { rarity: 'common', ilvl: 1 }, st); st.equip.offhand.noDrop = true; }
  st.stats[k.stat] += START_BONUS;
}

// 장비 옵션 합계
export function gearSum(st) {
  const g = { armor: 0, block: 0, maxMp: 0 };
  for (const slot of SLOTS) {
    const it = st.equip[slot];
    if (!it) continue;
    const base = BASES[it.base];
    if (base.armor) g.armor += scaledArmor(it);
    if (base.block) g.block += base.block;
    for (const [k, v] of Object.entries(baseMods(it))) { if (k === 'spellPct') g.matk = (g.matk || 0) + spellToMatk(v, it.ilvl); else g[k] = (g[k] || 0) + v; } // v0.49.34 기본 효과는 강화만큼
    for (const a of it.affixes || []) { const v = affixV(it, a); if (a.id === 'spellPct') g.matk = (g.matk || 0) + spellToMatk(v, it.ilvl); else g[a.id] = (g[a.id] || 0) + v; } // v0.44.37 주문 피해 % → 마법 공격력 · v0.49.59 장신구 옵션은 강화만큼
    for (const gm of it.gems || []) { const b = BASES[gm]; if (b) g[GEMS[b.gem].stat] = (g[GEMS[b.gem].stat] || 0) + GEM_GRADES[b.grade].v; }
  }
  const sb = setBonus(st.equip);
  for (const k in sb) g[k] = (g[k] || 0) + sb[k];
  return g;
}

// 강화(+n)는 기본 효과(공격력 · 방어력 · 기본 옵션 · 장신구 기본 효과)를 단계마다 +8%, +5 · +10 · +15 · +20을 넘을 때마다 +5% 더 (v0.49.34)
// v0.49.59 반지 · 목걸이는 기본 효과가 작아 강화해도 거의 오르지 않았다 → 붙은 옵션도 단계마다 +5% (+10 = 1.5배 · +20 = 2배)
export const JEWEL_SLOTS = new Set(['ring', 'amulet']);
export const affixK = (it) => (JEWEL_SLOTS.has(BASES[it.base]?.slot) ? 1 + 0.05 * (it.plus || 0) : 1);
export const affixV = (it, a) => { const k = affixK(it); if (k === 1) return a.v; const v = a.v * k; return Number.isInteger(a.v) ? Math.round(v) : Math.round(v * 10) / 10; };
export const plusK = (it) => 1 + 0.08 * (it.plus || 0) + 0.05 * Math.floor((it.plus || 0) / 5);
// v0.49.34 기본 옵션이 없던 반지 · 목걸이의 기본 효과 (아이템 레벨만큼). 구리 · 은 반지와 그냥 반지는 장비마다 다섯 스탯 중 하나
const STAT5 = ['str', 'dex', 'int', 'wis', 'vit'], FLAT = new Set([...STAT5, 'allStats', 'maxHp', 'maxMp', 'matk', 'patk']);
const JEWEL = {
  ruby_ring: 'str', jade_ring: 'dex', sapphire_ring: 'int', ring2: 'wis', ring: null, copper_ring: null, silver_ring: null,
  amulet: 'allStats', amulet2: 'allStats', bone_amulet: 'maxHp', jade_amulet: 'maxMp', sun_amulet: 'dmgPct', star_amulet: 'spellPct',
};
export function jewelImplicit(it) {
  const b = BASES[it.base], id = b?.tpl && JEWEL[b.tpl] !== undefined ? b.tpl : it.base;
  if (!b || b.mods || !(id in JEWEL)) return null;
  const L = it.ilvl || 1, k = JEWEL[id] ?? STAT5[(Number(it.uid) || 0) % 5];
  const v = k === 'allStats' ? Math.max(1, Math.round(L * 0.04)) : k === 'maxHp' ? Math.round(10 + L * 1.2) : k === 'maxMp' ? Math.round(10 + L) : k === 'dmgPct' || k === 'spellPct' ? Math.round(3 + L * 0.02) : Math.max(2, Math.round(L * 0.09));
  return { [k]: v };
}
// 장비의 기본 효과 (기본 옵션 · 장신구 기본 효과) — 강화 배율을 곱한 값
export function baseMods(it) {
  const m = BASES[it.base]?.mods || jewelImplicit(it), out = {};
  if (!m) return out;
  const k = plusK(it);
  for (const [s, v] of Object.entries(m)) out[s] = FLAT.has(s) ? Math.round(v * k) : Math.round(v * k * 10) / 10; // 능력치 · HP · MP는 정수, % · 회복은 소수 한 자리
  return out;
}
export const scaledArmor = (it) => Math.round(BASES[it.base].armor * (1 + 0.1 * (it.ilvl - 1)) * plusK(it) * (it.q || 1));
export const scaledDmg = (it) => {
  const b = BASES[it.base];
  const m = (1 + 0.1 * (it.ilvl - 1)) * plusK(it) * (it.q || 1);
  return [Math.round(b.dmg[0] * m), Math.round(b.dmg[1] * m)];
};

// 최종 스탯 (기본 + 장비)
export function totalStats(st, g = gearSum(st)) {
  const out = {};
  for (const s of STATS) out[s] = st.stats[s] + (g[s] || 0) + (g.allStats || 0);
  return out;
}

// v0.44.37 스킬 피해 배율은 스킬 자기 스탯으로 (무기 종류와 상관없음). 혼합 스킬 = 높은 쪽 70% + 낮은 쪽 30%
export const STAT_RATE = { str: 0.03, dex: 0.03, int: 0.03, wis: 0.025, vit: 0.015 };
const MAGIC = new Set(['int', 'wis']);
export function skillStats(sk) { const l = sk.lines || Object.keys(sk.req || {}); return l.length ? l : [sk.ap === 'int' ? 'int' : sk.ap === 'wis' ? 'wis' : 'str']; }
export function skillScale(sk, stats) {
  const ls = skillStats(sk).slice().sort((a, b) => (stats[b] || 0) * STAT_RATE[b] - (stats[a] || 0) * STAT_RATE[a]);
  const f = (k) => (stats[k] || 0) * STAT_RATE[k];
  // v0.44.40 혼합: 높은 쪽 100% + 둘째 50% (+ 셋째 25%) — 두 스탯을 키운 만큼 혼합 스킬이 자기 단일 스킬보다 세다
  const statF = 1 + f(ls[0]) + (ls[1] ? 0.5 * f(ls[1]) : 0) + (ls[2] ? 0.25 * f(ls[2]) : 0);
  // 공격력: 물리 스탯 스킬 = 물리, 마법 스탯 스킬 = 마법, 섞이면 필요 스탯 비율대로
  const req = sk.req || {}, tot = ls.reduce((a, k) => a + (req[k] || 1), 0);
  const mag = ls.reduce((a, k) => a + (MAGIC.has(k) ? (req[k] || 1) : 0), 0) / tot;
  return { statF, mag, phys: 1 - mag };
}

// buffs: { armorPct, berserk, might(피해%), focus(치명%) } — 전투 중 일시 효과
export function derive(st, buffs = {}) {
  const g = gearSum(st);
  const s = totalStats(st, g);
  for (const k of ['str', 'dex', 'int', 'wis', 'vit']) if (buffs[k]) s[k] += buffs[k]; // 영약
  const weapon = st.equip.weapon;
  const cls = WEAPON_CLASSES[weapon ? BASES[weapon.base].cls : 'unarmed'];
  const wd = weapon ? scaledDmg(weapon) : [2, 4];
  const speed = weapon ? BASES[weapon.base].speed : 1.2;
  // 체력 · 정신은 HP · 방어 · MP도 함께 주므로 피해 배율을 조금 낮춘다 (딜탱 균형)
  const statMult = 1 + s[cls.ap] * (cls.ap === 'vit' ? 0.02 : cls.ap === 'wis' ? 0.025 : 0.03);
  const berserk = buffs.berserk || 0;
  const fin = 1 + (g.finalDmg || 0) / 100; // 신화 옵션: 최종 피해
  const dmgMult = fin * statMult * (1 + ((g.dmgPct || 0) + (buffs.might || 0)) / 100) * (1 + berserk / 100);
  // 자원 보너스 1 ~ 2배: 능력치만으로 생기는 양보다 장비로 더 늘린 HP · MP, 레벨 대비 방어력 (철벽 · 비전 스킬, 둔기 · 홀 평타)
  // v0.44.36 HP 보너스는 전체 최대 HP로 (체력 스탯을 올리면 보너스가 줄던 것): 각성 단계마다 기준 HP가 오른다
  const hpRef = 100 + 8 * (st.awakenings || 0), hpK = 1 + 0.5 * Math.min(2, Math.max(0, (60 + s.vit * 6 + (g.maxHp || 0)) / hpRef - 1));
  // v0.44.37 MP 보너스도 전체 최대 MP로 (정신을 올리면 줄던 것)
  const mpRef = 40 + 5 * (st.awakenings || 0), mpK = 1 + 0.5 * Math.min(2, Math.max(0, (15 + s.wis * 4.5 + (g.maxMp || 0)) / mpRef - 1));
  // v0.44.37 물리 · 마법 공격력: 지팡이 · 홀은 마법(물리는 절반), 그 밖 무기는 물리. 옵션 · 보주 · 마도서가 더한다. 마법은 아주 작은 기본값
  const magicW = cls.kind === 'magic', atkMult = fin * (1 + ((g.dmgPct || 0) + (buffs.might || 0)) / 100) * (1 + berserk / 100) * (1 + relicBonus(st, 'dmg') / 100);
  const patk = magicW ? [wd[0] * 0.5, wd[1] * 0.5] : [wd[0], wd[1]], mBase = 2 + (st.awakenings || 0) * 0.3;
  patk[0] += g.patk || 0; patk[1] += g.patk || 0;
  // v0.44.40 힘 = 물리 공격력 +0.06% · 지능 = 마법 공격력 +0.06% (막기는 힘에서 뺐다)
  const physK = 1 + s.str * 0.0006, magK = 1 + s.int * 0.0006; patk[0] *= physK; patk[1] *= physK;
  const matk = magicW ? [wd[0] + mBase, wd[1] + mBase] : [mBase, mBase]; matk[0] += g.matk || 0; matk[1] += g.matk || 0; matk[0] *= magK; matk[1] *= magK;
  const armorK0 = (g.armor + s.vit * 0.4), armK = 1 + armorK0 / (armorK0 + 40 + 8 * (1 + (st.awakenings || 0)));
  const basicK = cls.ap === 'vit' ? 1 + 0.25 * (hpK - 1) : cls.ap === 'wis' ? 1 + 0.25 * (mpK - 1) : 1;
  const armor = (g.armor + s.vit * 0.4) * (1 + ((g.armorPct || 0) + (buffs.armorPct || 0)) / 100);
  return {
    bossDmg: g.bossDmg || 0, cdr: Math.min(40, (g.cdr || 0) + s.int * 0.01), // v0.44.40 지능 = 재사용 대기 감소 0.01% dmgReduce: Math.min(40, g.dmgReduce || 0), // v0.42 신화 옵션
    stats: s,
    gear: g,
    cls,
    two: weapon ? isTwoHandedBase(BASES[weapon.base]) : false,
    maxHp: Math.round(60 + s.vit * 6 + (g.maxHp || 0)),
    maxMp: Math.round(15 + s.wis * 4.5 + (g.maxMp || 0)),
    // 둔기 평타는 HP 보너스, 홀 평타는 MP 보너스를 조금 받는다 (딜탱)
    dmg: [wd[0] * dmgMult * basicK * (magicW ? magK : physK), wd[1] * dmgMult * basicK * (magicW ? magK : physK)],
    resK: { hp: hpK, mp: mpK, armor: armK }, statMult, patk, matk, atkMult,
    atkRate: Math.min(2.2, speed * (1 + s.dex * 0.004 + (g.atkSpd || 0) / 100 + berserk / 100 + (buffs.haste || 0) / 100)),
    range: cls.range,
    crit: Math.min(0.75, 0.05 + s.dex * 0.001 + ((g.crit || 0) + (buffs.focus || 0)) / 100), // v0.44.40 민첩 치명타 0.15% → 0.1%
    critMult: 1.6,
    dodge: Math.min(0.5, (g.dodge || 0) / 100 + (buffs.dodgeUp || 0) / 100), // v0.44.40 민첩에서 회피를 뺐다 (연막 · 구르기 · 장비만)
    block: g.block ? Math.min(0.5, g.block) : 0, // v0.44.40 힘에서 막기를 뺐다
    armor,
    spellMult: 1 + s.int * 0.035,
    // 주문 기준 피해: 무기 평균 피해 × 지능 배율 × 피해% × 주문 피해% (주문 스킬 = 이 값 × 계수)
    spellBase: ((matk[0] + matk[1]) / 2) * (1 + s.int * 0.03) * atkMult, // 주문 기준 피해 (v0.44.37 마법 공격력)
    healMult: 1 + s.wis * 0.035,
    hpRegen: 0.5 + s.vit * 0.04 + (g.hpRegen || 0),
    mpRegen: 0.6 + s.wis * 0.07 + (g.mpRegen || 0),
    moveSpeed: 6.2 * (1 + ((g.moveSpd || 0) + (buffs.swift || 0) + relicBonus(st, 'move')) / 100),
    lifeSteal: (g.lifeSteal || 0) / 100,
    skillExp: 1 + (g.skillExp || 0) / 100,
    goldFind: 1 + ((g.goldFind || 0) + relicBonus(st, 'gold')) / 100,
    magicFind: (g.magicFind || 0) + (buffs.luck || 0) + relicBonus(st, 'mf'),
  };
}

// 몬스터에게 받는 피해 감소율
// v0.44.62 몬스터 레벨 계수: 120까지 8 → 400에서 40 (높은 레벨에서 방어가 거의 무적이 되던 것)
export const armorK = (L) => 8 + 32 * Math.min(1, Math.max(0, (L - 120) / 280));
export const damageReduction = (armor, monLevel) => armor / (armor + 40 + armorK(monLevel) * monLevel);
