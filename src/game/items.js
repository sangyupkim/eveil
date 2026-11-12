// 아이템 생성: 등급 · 랜덤 옵션 · 이름 · 가격
import { BASES, AFFIXES, RARITY, RARITY_ORDER, AFFIX_PREFIX, LEGEND_NAMES, WEAPON_CLASSES } from '../data/items.js';
import { SKILLS, BOOK_TIERS } from '../data/skills.js';
import { R, randInt, pick, weighted } from './rng.js';
import { UNIQUES } from '../data/titles.js';
import { NAMED_LEGENDS, socketRoll } from '../data/legends.js';
// 이름 있는 전설 (정해진 옵션 · 고유 효과)
export function makeNamed(def, st = null) {
  return { uid: uid(st), base: def.base, rarity: 'legend', ilvl: def.ilvl, named: def.id, title: def.name, unique: def.unique, affixes: def.affixes.map(([id, v]) => ({ id, v })), sockets: 2, gems: [] };
}
export const namedOf = (zoneId) => NAMED_LEGENDS[zoneId] || [];

const uid = (st) => (st ? st.nextUid++ : Math.floor(Math.random() * 1e9));

export function makeItem(baseId, { rarity = 'common', ilvl = 1, qty = 1 } = {}, st = null, rng = R) {
  const base = BASES[baseId];
  if (!base) throw new Error('없는 아이템: ' + baseId);
  if (base.type === 'potion' || base.stack) return { uid: uid(st), base: baseId, qty };
  const it = { uid: uid(st), base: baseId, rarity, ilvl, affixes: [] };
  const r = RARITY[rarity];
  const n = randInt(r.affix[0], r.affix[1], rng);
  const slot = base.slot;
  const pool = Object.keys(AFFIXES).filter((id) => {
    const a = AFFIXES[id];
    if (a.legendOnly && rarity !== 'legend') return false;
    return !a.slots || a.slots.includes(slot);
  });
  for (let i = 0; i < n && pool.length; i++) {
    const id = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const a = AFFIXES[id];
    const max = Math.max(a.min, a.max(ilvl) * r.mult);
    const v = Math.max(a.min, Math.round(a.min + rng() * (max - a.min)));
    it.affixes.push({ id, v });
  }
  if (rarity === 'legend') { it.title = pick(LEGEND_NAMES, rng); it.unique = Math.floor(rng() * UNIQUES.length); }
  const sk = socketRoll(rarity, rng);
  if (sk) { it.sockets = sk; it.gems = []; }
  return it;
}

export function makeBook(skillId, st = null) {
  return { uid: uid(st), book: skillId };
}

export const isStack = (it) => !!BASES[it.base]?.stack;
export const isBook = (it) => !!it.book;
export const isEquip = (it) => !it.book && !!BASES[it.base]?.slot;

export function itemName(it) {
  const n = baseName(it);
  return it.plus ? `+${it.plus} ${n}` : n;
}
function baseName(it) {
  if (it.book) return `스킬북: ${SKILLS[it.book].name}`;
  const base = BASES[it.base];
  if (base.type === 'potion') return base.name;
  if (it.named) return it.title;
  if (it.rarity === 'legend') return `${it.title} ${base.name}`;
  if (it.rarity === 'common' || !it.affixes.length) return base.name;
  const top = [...it.affixes].sort((a, b) => b.v / AFFIXES[b.id].max(it.ilvl) - a.v / AFFIXES[a.id].max(it.ilvl))[0];
  return `${AFFIX_PREFIX[top.id]} ${base.name}`;
}

export function itemColor(it) {
  if (it.book) return BOOK_TIERS[SKILLS[it.book].tier].color;
  if (!it.rarity) return '#e8e2d4';
  return RARITY[it.rarity].color;
}

export function itemValue(it) {
  if (it.book) return 40 * SKILLS[it.book].tier ** 2;
  const base = BASES[it.base];
  if (base.type === 'potion') return Math.max(1, Math.floor(base.price / 4)) * (it.qty || 1);
  const v = (base.price || 30) * (1 + 0.15 * (it.ilvl - 1)) * RARITY[it.rarity].value;
  return Math.max(1, Math.floor(v / 4));
}

export const affixText = (a) => AFFIXES[a.id].text.replace('{v}', a.v);

// 드랍할 기본 아이템 고르기 (아이템 레벨에 맞는 것)
export function rollBase(ilvl, rng = R) {
  const ids = Object.keys(BASES).filter((id) => {
    const b = BASES[id];
    if (!b.slot) return false;
    const lv = b.minLvl ?? 1;
    // 너무 낮은 단계는 높은 곳에서 나오지 않는다 (장신구는 제외)
    return lv <= ilvl && (lv > ilvl - 16 || b.slot === 'amulet' || b.slot === 'ring');
  });
  return pick(ids, rng);
}

export function rollRarity(table, magicFind = 0, rng = R) {
  const t = {};
  for (const k of RARITY_ORDER) t[k] = (table[k] || 0) * (k === 'common' ? 1 : 1 + magicFind / 100);
  return weighted(t, rng);
}

export function weaponClass(it) {
  return WEAPON_CLASSES[it ? BASES[it.base].cls : 'unarmed'];
}
