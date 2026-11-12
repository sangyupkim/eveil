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
    if (base.mods) for (const k in base.mods) g[k] = (g[k] || 0) + base.mods[k];
    for (const a of it.affixes || []) g[a.id] = (g[a.id] || 0) + a.v;
  }
  const sb = setBonus(st.equip);
  for (const k in sb) g[k] = (g[k] || 0) + sb[k];
  return g;
}

// 강화(+n)는 단계마다 +8%
const plusK = (it) => 1 + 0.08 * (it.plus || 0);
export const scaledArmor = (it) => Math.round(BASES[it.base].armor * (1 + 0.1 * (it.ilvl - 1)) * plusK(it));
export const scaledDmg = (it) => {
  const b = BASES[it.base];
  const m = (1 + 0.1 * (it.ilvl - 1)) * plusK(it);
  return [Math.round(b.dmg[0] * m), Math.round(b.dmg[1] * m)];
};

// 최종 스탯 (기본 + 장비)
export function totalStats(st, g = gearSum(st)) {
  const out = {};
  for (const s of STATS) out[s] = st.stats[s] + (g[s] || 0) + (g.allStats || 0);
  return out;
}

// buffs: { armorPct, berserk, might(피해%), focus(치명%) } — 전투 중 일시 효과
export function derive(st, buffs = {}) {
  const g = gearSum(st);
  const s = totalStats(st, g);
  const weapon = st.equip.weapon;
  const cls = WEAPON_CLASSES[weapon ? BASES[weapon.base].cls : 'unarmed'];
  const wd = weapon ? scaledDmg(weapon) : [2, 4];
  const speed = weapon ? BASES[weapon.base].speed : 1.2;
  const statMult = 1 + s[cls.ap] * 0.03;
  const berserk = buffs.berserk || 0;
  const dmgMult = statMult * (1 + ((g.dmgPct || 0) + (buffs.might || 0)) / 100) * (1 + berserk / 100);
  const armor = (g.armor + s.vit * 0.4) * (1 + ((g.armorPct || 0) + (buffs.armorPct || 0)) / 100);
  return {
    stats: s,
    gear: g,
    cls,
    two: weapon ? isTwoHandedBase(BASES[weapon.base]) : false,
    maxHp: Math.round(60 + s.vit * 6 + (g.maxHp || 0)),
    maxMp: Math.round(15 + s.wis * 4.5 + (g.maxMp || 0)),
    dmg: [wd[0] * dmgMult, wd[1] * dmgMult],
    atkRate: Math.min(2.2, speed * (1 + s.dex * 0.004 + (g.atkSpd || 0) / 100 + berserk / 100 + (buffs.haste || 0) / 100)),
    range: cls.range,
    crit: Math.min(0.75, 0.05 + s.dex * 0.0015 + ((g.crit || 0) + (buffs.focus || 0)) / 100),
    critMult: 1.6,
    dodge: Math.min(0.3, s.dex * 0.0012),
    block: g.block ? Math.min(0.5, g.block + s.str * 0.0008) : 0,
    armor,
    spellMult: (1 + s.int * 0.035) * (1 + (g.spellPct || 0) / 100),
    healMult: 1 + s.wis * 0.035,
    hpRegen: 0.5 + s.vit * 0.04 + (g.hpRegen || 0),
    mpRegen: 0.6 + s.wis * 0.07 + (g.mpRegen || 0),
    moveSpeed: 6.2 * (1 + (g.moveSpd || 0) / 100),
    lifeSteal: (g.lifeSteal || 0) / 100,
    skillExp: 1 + (g.skillExp || 0) / 100,
    goldFind: 1 + (g.goldFind || 0) / 100,
    magicFind: g.magicFind || 0,
  };
}

// 몬스터에게 받는 피해 감소율
export const damageReduction = (armor, monLevel) => armor / (armor + 40 + 8 * monLevel);
