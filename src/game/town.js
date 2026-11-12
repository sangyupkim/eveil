// 마을 규칙 (화면과 무관): 짓기 · 단계 올리기 · 생산 쌓기 · 강화 · 용병 파견
import { BUILDINGS, PLOTS, ENHANCE, EXPEDITIONS, MERC_NAMES, mercCost } from '../data/buildings.js';
import { ZONES } from '../data/world.js';
import { rollLoot } from './loot.js';
import { addItem } from './inventory.js';
import { makeItem } from './items.js';
import { MATERIALS, MAT_DROP, SETS, SET_SLOTS, craftCost, upgradeMats } from '../data/crafting.js';
import { BASES } from '../data/items.js';

export function townOf(st, now = Date.now()) {
  st.town ||= { plots: {}, ore: 0, mercs: [], last: now };
  st.town.mats ||= {};
  return st.town;
}
export const buildingAt = (st, plot) => townOf(st).plots[plot] || null;
export const findBuilding = (st, type) => Object.values(townOf(st).plots).find((b) => b.type === type) || null;

export function build(st, plot, type) {
  const t = townOf(st);
  if (t.plots[plot] || !BUILDINGS[type] || findBuilding(st, type)) return { ok: false, why: '지을 수 없습니다' };
  const cost = BUILDINGS[type].cost(0);
  if (st.gold < cost) return { ok: false, why: '금화가 모자랍니다' };
  st.gold -= cost;
  t.plots[plot] = { type, lv: 1, stock: 0, since: Date.now() };
  return { ok: true };
}

export function upgrade(st, plot) {
  const b = buildingAt(st, plot);
  if (!b) return { ok: false };
  const def = BUILDINGS[b.type], cost = def.cost(b.lv);
  if (b.lv >= def.max || cost == null) return { ok: false, why: '최고 단계입니다' };
  if (st.gold < cost) return { ok: false, why: '금화가 모자랍니다' };
  const um = upgradeMats(b.lv), mats = townOf(st).mats;
  if (um && (mats[um.zone] || 0) < um.n) return { ok: false, why: `${MATERIALS[um.zone].name} ${um.n}개가 필요합니다` };
  st.gold -= cost;
  if (um) mats[um.zone] -= um.n;
  b.lv++;
  return { ok: true };
}

// 시간이 흘러 생산이 쌓인다 (꺼 둔 동안 포함). 반환: 이번에 쌓인 양
export function tick(st, now = Date.now()) {
  const t = townOf(st, now);
  const hours = Math.max(0, (now - (t.last || now)) / 3600000);
  t.last = now;
  for (const b of Object.values(t.plots)) {
    const def = BUILDINGS[b.type];
    if (!def.rate) continue;
    b.stock = Math.min(def.store(b.lv), (b.stock || 0) + def.rate(b.lv) * hours);
  }
  return hours;
}

// 거두기: 광산 → 강화석, 약초밭 → 물약
export function collect(st, plot) {
  const b = buildingAt(st, plot);
  if (!b) return null;
  const n = Math.floor(b.stock || 0);
  if (n <= 0) return { n: 0 };
  if (b.type === 'mine') { townOf(st).ore += n; b.stock -= n; return { n, what: '강화석' }; }
  if (b.type === 'herb') {
    const hp = Math.ceil(n * 0.6), mp = n - hp;
    const big = b.lv >= 3;
    addItem(st, makeItem(big ? 'hp_potion_l' : 'hp_potion', { qty: hp }, st));
    if (mp) addItem(st, makeItem(big ? 'mp_potion_l' : 'mp_potion', { qty: mp }, st));
    b.stock -= n;
    return { n, what: '물약' };
  }
  return null;
}

// ── 강화 ──
export const enhanceCap = (st) => { const s = findBuilding(st, 'smithy'); return s ? BUILDINGS.smithy.cap(s.lv) : 0; };
export function enhanceCost(it) { const n = it.plus || 0; return { gold: ENHANCE.gold(n, it.ilvl || 1), ore: ENHANCE.ore(n), chance: ENHANCE.chance(n) }; }
// rng: 0~1. 실패해도 단계가 떨어지지는 않는다 (재료만 사라진다)
export function enhance(st, it, rng = Math.random) {
  const n = it.plus || 0;
  if (n >= enhanceCap(st)) return { ok: false, why: '대장간 단계를 올려야 합니다' };
  const c = enhanceCost(it), t = townOf(st);
  if (st.gold < c.gold) return { ok: false, why: '금화가 모자랍니다' };
  if (t.ore < c.ore) return { ok: false, why: '강화석이 모자랍니다' };
  st.gold -= c.gold; t.ore -= c.ore;
  if (rng() < c.chance) { it.plus = n + 1; return { ok: true, success: true, plus: it.plus }; }
  return { ok: true, success: false, plus: n };
}

// ── 용병 ──
export const mercSlots = (st) => { const inn = findBuilding(st, 'inn'); return inn ? BUILDINGS.inn.slots(inn.lv) : 0; };
export function hire(st) {
  const t = townOf(st);
  if (t.mercs.length >= mercSlots(st)) return { ok: false, why: '여관 단계를 올려야 합니다' };
  const cost = Math.round(mercCost(t.mercs.length));
  if (st.gold < cost) return { ok: false, why: '금화가 모자랍니다' };
  st.gold -= cost;
  t.mercs.push({ name: MERC_NAMES[t.mercs.length % MERC_NAMES.length], lv: 1, exp: 0, job: null });
  return { ok: true };
}
// ── 지역 해방 ── 직접 잡아 오염을 걷어 내면 해방 → 그곳에만 용병을 보낼 수 있다
export const LIBERATE_NEED = 400;
export const LIBERATE_PTS = { normal: 1, elite: 5, named: 30, boss: 80 };
export function liberateAdd(st, zoneId, tier) {
  const L = (st.liberate ||= {});
  if (!ZONES.some((z) => z.id === zoneId) || L[zoneId] >= LIBERATE_NEED) return false;
  L[zoneId] = Math.min(LIBERATE_NEED, (L[zoneId] || 0) + (LIBERATE_PTS[tier] || 1));
  return L[zoneId] >= LIBERATE_NEED; // 이번에 해방됐나
}
export const isLiberated = (st, zoneId) => (st.liberate?.[zoneId] || 0) >= LIBERATE_NEED;
// 파견: 해방한 지역에만
export function dispatch(st, i, zoneId, expId, now = Date.now()) {
  const m = townOf(st).mercs[i], ex = EXPEDITIONS.find((e) => e.id === expId), zn = ZONES.find((z) => z.id === zoneId);
  if (!m || m.job || !ex || !zn) return { ok: false };
  if (!isLiberated(st, zoneId)) return { ok: false, why: '해방한 지역에만 보낼 수 있습니다' };
  m.job = { zone: zoneId, exp: expId, until: now + ex.min * 60000 };
  return { ok: true };
}
// 돌아온 용병의 전리품을 받는다
export function claim(st, i, now = Date.now(), rng = Math.random) {
  const t = townOf(st), m = t.mercs[i];
  if (!m?.job || now < m.job.until) return null;
  const ex = EXPEDITIONS.find((e) => e.id === m.job.exp), zn = ZONES.find((z) => z.id === m.job.zone);
  const lvl = Math.round((zn.levels[0] + zn.levels[1]) / 2);
  // 용병 강함: 레벨이 지역보다 낮으면 성과가 줄어든다
  const eff = Math.max(0.25, Math.min(1.5, (m.lv * 3) / Math.max(1, lvl)));
  const out = { gold: Math.round(lvl * 25 * ex.mult * eff), ore: Math.round(2 * ex.mult * eff), items: [] };
  const rolls = Math.round(ex.mult * eff * 1.5);
  for (let k = 0; k < rolls; k++) for (const d of rollLoot({ tier: k % 6 === 5 ? 'elite' : 'normal', level: lvl }, {}, st, rng)) if (d.kind === 'item' && d.item.base && !d.item.book) out.items.push(d.item);
  // 그 지역 재료도 가져온다
  out.mats = Math.round(ex.mult * 3 * eff);
  t.mats ||= {}; t.mats[zn.id] = (t.mats[zn.id] || 0) + out.mats;
  st.gold += out.gold; t.ore += out.ore;
  const kept = out.items.filter((it) => addItem(st, it));
  out.items = kept;
  m.exp += ex.mult * 10;
  while (m.exp >= m.lv * 20) { m.exp -= m.lv * 20; m.lv++; }
  m.job = null;
  return out;
}
// ── 재료 · 제작 ──
// 몬스터를 잡으면 재료가 마을 창고로 바로 (가방을 쓰지 않는다)
export function dropMats(st, zoneId, tier, rng = Math.random) {
  const d = MAT_DROP[tier] || MAT_DROP.normal;
  if (!MATERIALS[zoneId] || rng() >= d[0]) return 0;
  const m = townOf(st).mats;
  m[zoneId] = (m[zoneId] || 0) + d[1];
  return d[1];
}
export const craftZones = (st) => { const w = findBuilding(st, 'workshop'); return w ? ZONES.slice(0, BUILDINGS.workshop.zones(w.lv)) : []; };
// 그 지역 레벨에 맞는 가장 좋은 부위 기본 아이템
export function setBase(zi, slot) {
  const lvl = ZONES[zi].levels[1];
  const ids = Object.keys(BASES).filter((id) => BASES[id].slot === slot && (BASES[id].minLvl ?? 1) <= lvl && (BASES[id].minLvl ?? 1) < 99);
  return ids.sort((a, b) => (BASES[b].minLvl ?? 1) - (BASES[a].minLvl ?? 1) || (BASES[b].armor || 0) - (BASES[a].armor || 0))[0];
}
export function craft(st, zoneId, slot, rng = Math.random) {
  const zi = ZONES.findIndex((z) => z.id === zoneId);
  if (!craftZones(st).some((z) => z.id === zoneId) || !SET_SLOTS.includes(slot)) return { ok: false, why: '제작소 단계를 올려야 합니다' };
  const c = craftCost(zi), m = townOf(st).mats;
  if ((m[zoneId] || 0) < c.mats) return { ok: false, why: `${MATERIALS[zoneId].name}이(가) 모자랍니다` };
  if (st.gold < c.gold) return { ok: false, why: '금화가 모자랍니다' };
  const it = makeItem(setBase(zi, slot), { rarity: 'rare', ilvl: ZONES[zi].levels[1] }, st, rng);
  it.set = zoneId;
  if (!addItem(st, it)) return { ok: false, why: '가방이 가득 찼습니다' };
  m[zoneId] -= c.mats; st.gold -= c.gold;
  return { ok: true, item: it };
}
// 입은 세트 부위 수 → 효과
export function setCounts(equip) {
  const n = {};
  for (const it of Object.values(equip || {})) if (it?.set) n[it.set] = (n[it.set] || 0) + 1;
  return n;
}
export function setBonus(equip) {
  const g = {};
  for (const [id, n] of Object.entries(setCounts(equip))) {
    const s = SETS[id];
    for (const b of [n >= 2 && s.b2, n >= 4 && s.b4]) if (b) for (const k in b) g[k] = (g[k] || 0) + b[k];
  }
  return g;
}
export { PLOTS, BUILDINGS, EXPEDITIONS };
