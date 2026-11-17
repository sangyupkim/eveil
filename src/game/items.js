// 아이템 생성: 등급 · 랜덤 옵션 · 이름 · 가격
import { MIX_ITEM, mixUnique } from '../data/resist.js';
import { BASES, AFFIXES, RARITY, RARITY_ORDER, AFFIX_PREFIX, LEGEND_NAMES, MYTH_NAMES, WEAPON_CLASSES, affixFits } from '../data/items.js';
import { SKILLS, BOOK_TIERS } from '../data/skills.js';
import { R, randInt, pick, weighted } from './rng.js';
import { UNIQUES, UNIQUE_BASE } from '../data/titles.js';
import { NAMED_LEGENDS, socketRoll } from '../data/legends.js';
// 이름 있는 전설 (정해진 옵션 · 고유 효과)
// 이름 있는 전설: 떨어뜨린 몬스터 레벨에 맞춰 레벨 · 기본템 단계 · 옵션 수치가 오른다 (예전엔 고정이라 지옥에서도 66레벨로 나왔다)
export function makeNamed(def, st = null, level = def.ilvl) {
  const L = Math.max(def.ilvl, Math.round(level)), b0 = BASES[def.base];
  // 같은 부위 · 같은 무기 종류에서 그 레벨에 맞는 가장 높은 단계 (같은 본보기면 우선)
  const cands = Object.entries(BASES).filter(([, b]) => b.slot === b0.slot && (b0.cls ? b.cls === b0.cls : true) && (b.minLvl ?? 1) <= L && (b.minLvl ?? 1) >= (b0.minLvl ?? 1));
  cands.sort((a, b) => (b[1].minLvl ?? 1) - (a[1].minLvl ?? 1) || (b[1].tpl === def.base) - (a[1].tpl === def.base));
  const base = cands.length ? cands[0][0] : def.base;
  const k = (id) => { const A = AFFIXES[id]; return A ? A.max(L) / A.max(def.ilvl) : 1; };
  return { uid: uid(st), base, rarity: 'legend', ilvl: L, named: def.id, title: def.name, unique: def.unique, affixes: def.affixes.map(([id, v]) => ({ id, v: Math.round(v * k(id)) })), sockets: 2, gems: [] };
}
export const namedOf = (zoneId) => NAMED_LEGENDS[zoneId] || [];

const uid = (st) => (st ? st.nextUid++ : Math.floor(Math.random() * 1e9));

export function makeItem(baseId, { rarity = 'common', ilvl = 1, qty = 1 } = {}, st = null, rng = R) {
  const base = BASES[baseId];
  if (!base) throw new Error('없는 아이템: ' + baseId);
  if (base.type === 'potion' || base.stack) return { uid: uid(st), base: baseId, qty };
  const it = { uid: uid(st), base: baseId, rarity, ilvl, affixes: [] };
  if (base.slot && (base.dmg || base.armor)) it.q = Math.round((rarity === 'myth' ? 1.15 + rng() * 0.15 : 0.85 + rng() * 0.3) * 100) / 100; // 품질: 기본 피해 · 방어력 85~115% (신화는 115~130%, v0.44.18)
  const r = RARITY[rarity];
  const n = randInt(r.affix[0], r.affix[1], rng);
  const slot = base.slot;
  const pool = Object.keys(AFFIXES).filter((id) => {
    const a = AFFIXES[id];
    if (a.legendOnly && rarity !== 'legend' && rarity !== 'myth') return false;
    if (a.mythOnly || a.retired) return false; // 신화 옵션은 아래에서 따로 두 개
    return affixFits(a, base);
  });
  // 신화: 신화 전용 옵션 세 개를 먼저 (v0.44.18 두 개 → 세 개) (부위에 맞는 것 중)
  if (rarity === 'myth') { const mp = Object.keys(AFFIXES).filter((id) => AFFIXES[id].mythOnly && (!AFFIXES[id].slots || AFFIXES[id].slots.includes(slot))); for (let i = 0; i < 3 && mp.length; i++) { const id = mp.splice(Math.floor(rng() * mp.length), 1)[0], a = AFFIXES[id], mx = a.max(ilvl); it.affixes.push({ id, v: Math.max(a.min, Math.round(mx * (0.7 + rng() * 0.3))), myth: true }); } }
  for (let i = 0; i < n - (rarity === 'myth' ? it.affixes.length : 0) && pool.length; i++) {
    const id = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const a = AFFIXES[id];
    const max = Math.max(a.min, a.max(ilvl) * r.mult);
    let v = Math.max(a.min, Math.round(a.min + (rarity === 'myth' ? 0.5 + rng() * 0.5 : rng()) * (max - a.min))); // 신화는 옵션이 범위의 위쪽 절반에서만
    // 탁월한 옵션 (영웅 · 전설, 옵션마다 8%): 최대치의 110 ~ 130% — 같은 전설이라도 눈에 띄는 장비가 나오게 (v0.39.6)
    const great = (rarity === 'hero' || rarity === 'legend' || rarity === 'myth') && rng() < (rarity === 'myth' ? 0.2 : 0.08);
    if (great) v = Math.max(v + 1, Math.round(max * (1.1 + rng() * 0.2)));
    it.affixes.push(great ? { id, v, great: true } : { id, v });
  }
  if (rarity === 'legend' || rarity === 'myth') { it.title = pick(rarity === 'myth' ? MYTH_NAMES : LEGEND_NAMES, rng); it.unique = Math.floor(rng() * UNIQUE_BASE); }
  // v0.44.41 혼합 전용 장비: 무기 · 보조 · 장신구 전설 · 신화의 20%는 두 스탯 전용 (두 스탯 조건 · 두 스탯 옵션 · 조합 고유 효과)
  if ((rarity === 'legend' || rarity === 'myth') && ['weapon', 'offhand', 'amulet', 'ring'].includes(slot) && rng() < 0.2) {
    const keys = Object.keys(MIX_ITEM), key = keys[Math.floor(rng() * keys.length)], [a, b] = key.split('+');
    const need = Math.round(6 + ilvl * 1.3);
    it.mix = key; it.mixReq = { [a]: need, [b]: Math.round(need * 0.6) };
    it.title = `${MIX_ITEM[key].name} ${it.title}`; it.unique = mixUnique(key);
    const sv = Math.max(2, Math.round(AFFIXES.str.max(ilvl) * r.mult));
    it.affixes = it.affixes.filter((x) => x.id !== a && x.id !== b).slice(0, Math.max(0, it.affixes.length - 1));
    it.affixes.unshift({ id: a, v: sv }, { id: b, v: Math.round(sv * 0.7) });
  }
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
  if (it.shard) return `능력치 파편: ${AFFIXES[it.shard.id].text.replace('{v}', it.shard.v)}`;
  if (it.book) return `스킬북: ${SKILLS[it.book].name}`;
  const base = BASES[it.base];
  if (base.type === 'potion' || base.stack) return base.name;
  if (it.named) return it.title;
  if (it.rarity === 'legend' || it.rarity === 'myth') return `${it.title} ${base.name}`;
  if (it.rarity === 'common' || !it.affixes.length) return base.name;
  const top = [...it.affixes].sort((a, b) => b.v / AFFIXES[b.id].max(it.ilvl) - a.v / AFFIXES[a.id].max(it.ilvl))[0];
  return `${AFFIX_PREFIX[top.id]} ${base.name}`;
}

export function itemColor(it) {
  if (it.shard) return '#c58cff';
  if (it.book) return BOOK_TIERS[SKILLS[it.book].tier].color;
  if (!it.rarity) return '#e8e2d4';
  return RARITY[it.rarity].color;
}

export function itemValue(it) {
  if (it.shard) return 120;
  if (it.book) return 40 * SKILLS[it.book].tier ** 2;
  const base = BASES[it.base];
  if (base.type === 'potion' || base.stack) return Math.max(1, Math.floor((base.price || 0) / 4)) * (it.qty || 1);
  const v = (base.price || 30) * (1 + 0.15 * (it.ilvl - 1)) * RARITY[it.rarity].value;
  return Math.max(1, Math.floor(v / 4));
}

export const affixText = (a) => AFFIXES[a.id].text.replace('{v}', a.v);

// 드랍할 기본 아이템 고르기 (아이템 레벨에 맞는 것)
export function rollBase(ilvl, rng = R) {
  // 그 레벨에서 나올 장비: 무기 · 방어구는 16레벨 안, 장신구는 40레벨 안의 단계 (낮은 반지가 높은 곳에서 섞이지 않게)
  const ok = (b, span) => (b.minLvl ?? 1) <= ilvl && (b.minLvl ?? 1) > ilvl - span;
  let ids = Object.keys(BASES).filter((id) => { const b = BASES[id]; if (!b.slot || b.noDrop) return false; return ok(b, b.slot === 'amulet' || b.slot === 'ring' ? 40 : 16); });
  if (!ids.some((id) => !['amulet', 'ring'].includes(BASES[id].slot))) {
    // 가장 높은 단계보다 높으면 가장 높은 단계 장비
    const top = Math.max(...Object.values(BASES).filter((b) => b.slot && (b.minLvl ?? 1) <= ilvl).map((b) => b.minLvl ?? 1));
    ids = Object.keys(BASES).filter((id) => BASES[id].slot && !BASES[id].noDrop && (BASES[id].minLvl ?? 1) > top - 16 && (BASES[id].minLvl ?? 1) <= ilvl);
  }
  return pick(ids, rng);
}

export function rollRarity(table, magicFind = 0, rng = R, legendCap = 0.05) {
  const t = {};
  for (const k of RARITY_ORDER) t[k] = (table[k] || 0) * (k === 'common' || k === 'legend' ? 1 : 1 + magicFind / 100);
  // v0.44.18 전설: 나올 수 있는 몬스터라면 좋은 아이템 발견 100%마다 전설 비율 +0.3%p (최대 +5%p). 예전엔 1/3만 반영돼 높일수록 전설 비율이 줄었다
  if (t.legend > 0 && magicFind > 0) { const T = Object.values(t).reduce((a, v) => a + v, 0), rest = T - t.legend, T0 = RARITY_ORDER.reduce((a, k) => a + (table[k] || 0), 0), p = Math.min(0.95, (table.legend || 0) / T0 + Math.min(legendCap, magicFind * 0.00003)); t.legend = (p * rest) / (1 - p); }
  return weighted(t, rng);
}

export function weaponClass(it) {
  return WEAPON_CLASSES[it ? BASES[it.base].cls : 'unarmed'];
}
