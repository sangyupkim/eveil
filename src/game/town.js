// 마을 규칙 (화면과 무관): 짓기 · 단계 올리기 · 생산 쌓기 · 강화 · 용병 파견
import { BUILDINGS, PLOTS, ENHANCE, EXPEDITIONS, MERC_NAMES, mercCost, RESEARCH, researchCost, workerCost, WORKER_MAX } from '../data/buildings.js';
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
    b.stock = Math.min(def.store(b.lv), (b.stock || 0) + def.rate(b.lv) * Math.min(1, (b.workers || 0) / b.lv) * hours);
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
// 장인의 기운: 실패할 때마다 (그 시도 확률 × 0.465)만큼 쌓이고 100%면 다음은 반드시 성공.
// 실패마다 기본 확률의 10%씩 올라 최대 2배 (성공하면 둘 다 0으로)
export const jangOf = (it) => it.jang || 0;
export function enhanceCost(it) {
  const n = it.plus || 0, base = ENHANCE.chance(n), up = Math.min(base, base * 0.1 * (it.fails || 0));
  const chance = jangOf(it) >= 1 ? 1 : Math.min(1, base + up);
  return { gold: ENHANCE.gold(n, it.ilvl || 1), ore: ENHANCE.ore(n), chance, base, jang: jangOf(it) };
}
// rng: 0~1. 실패해도 단계가 떨어지지는 않는다 (재료만 사라진다)
export function enhance(st, it, rng = Math.random) {
  const n = it.plus || 0;
  if (n >= enhanceCap(st)) return { ok: false, why: '대장간 단계를 올려야 합니다' };
  const c = enhanceCost(it), t = townOf(st);
  if (st.gold < c.gold) return { ok: false, why: '금화가 모자랍니다' };
  if (t.ore < c.ore) return { ok: false, why: '강화석이 모자랍니다' };
  st.gold -= c.gold; t.ore -= c.ore;
  if (rng() < c.chance) { it.plus = n + 1; it.jang = 0; it.fails = 0; return { ok: true, success: true, plus: it.plus }; }
  it.fails = (it.fails || 0) + 1;
  it.jang = Math.min(1, jangOf(it) + c.chance * 0.465);
  return { ok: true, success: false, plus: n, jang: it.jang };
}

// ── 분해 · 재련 ──
// 분해: 가방의 장비 → 강화석(등급 · 아이템 레벨만큼) + 그 레벨 지역 재료
const RK = { common: 1, magic: 2, rare: 4, hero: 8, legend: 16 };
export function salvageValue(it) {
  const ore = Math.max(1, Math.round((RK[it.rarity] || 1) * (1 + it.ilvl / 10)));
  const zn = ZONES.find((z) => it.ilvl <= z.levels[1]) || ZONES[ZONES.length - 1];
  return { ore, mat: zn.id, matN: Math.max(1, Math.round((RK[it.rarity] || 1) / 2)) };
}
export function salvage(st, uid) {
  const i = st.inv.findIndex((x) => x.uid === uid);
  const it = st.inv[i];
  if (!it || it.book || !BASES[it.base]?.slot || it.named) return { ok: false, why: '분해할 수 없습니다' };
  const v = salvageValue(it), t = townOf(st);
  st.inv.splice(i, 1); t.ore += v.ore; t.mats[v.mat] = (t.mats[v.mat] || 0) + v.matN;
  return { ok: true, ...v };
}
// 재련: 옵션 하나(가장 약한 것)를 다시 굴린다
export const reforgeCost = (it) => ({ gold: Math.round(200 * (1 + it.ilvl / 5) * (RK[it.rarity] || 1)), ore: 4 + Math.round(it.ilvl / 4) });
export function reforge(st, it, rng = Math.random) {
  if (!it?.affixes?.length || !findBuilding(st, 'smithy')) return { ok: false, why: '다시 굴릴 옵션이 없습니다' };
  const c = reforgeCost(it), t = townOf(st);
  if (st.gold < c.gold) return { ok: false, why: '금화가 모자랍니다' };
  if (t.ore < c.ore) return { ok: false, why: '강화석이 모자랍니다' };
  st.gold -= c.gold; t.ore -= c.ore;
  const fresh = makeItem(it.base, { rarity: it.rarity === 'common' ? 'magic' : it.rarity, ilvl: it.ilvl }, null, rng);
  const k = it.affixes.reduce((m, a, i, arr) => (a.v < arr[m].v ? i : m), 0), old = it.affixes[k];
  const pick = fresh.affixes.find((a) => !it.affixes.some((b) => b.id === a.id)) || fresh.affixes[0];
  if (pick) it.affixes[k] = pick;
  return { ok: true, old, now: it.affixes[k] };
}

// ── 일꾼 ──
export const freeWorkers = (st) => { const t = townOf(st); return (t.workers || 0) - Object.values(t.plots).reduce((a, b) => a + (b.workers || 0), 0); };
export function hireWorker(st) {
  const t = townOf(st), n = t.workers || 0;
  if (n >= WORKER_MAX) return { ok: false, why: '더 고용할 수 없습니다' };
  const c = workerCost(n);
  if (st.gold < c) return { ok: false, why: '금화가 모자랍니다' };
  st.gold -= c; t.workers = n + 1;
  return { ok: true };
}
export function assignWorker(st, plot, d) {
  const b = buildingAt(st, plot);
  if (!b || !BUILDINGS[b.type].rate) return { ok: false };
  const v = (b.workers || 0) + d;
  if (v < 0 || v > b.lv || (d > 0 && freeWorkers(st) <= 0)) return { ok: false, why: d > 0 ? (v > b.lv ? '자리가 없습니다 (단계를 올리세요)' : '쉬는 일꾼이 없습니다') : '' };
  b.workers = v;
  return { ok: true };
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
  m.job = { zone: zoneId, exp: expId, until: now + ex.min * 60000 * (1 - researchK(st, 'merc')) };
  return { ok: true };
}
// 돌아온 용병의 전리품을 받는다
export function claim(st, i, now = Date.now(), rng = Math.random) {
  const t = townOf(st), m = t.mercs[i];
  if (!m?.job || now < m.job.until) return null;
  const ex = EXPEDITIONS.find((e) => e.id === m.job.exp), zn = ZONES.find((z) => z.id === m.job.zone);
  const lvl = Math.round((zn.levels[0] + zn.levels[1]) / 2);
  // 용병 강함: 레벨이 지역보다 낮으면 성과가 줄어든다
  // 맡긴 장비가 좋을수록 성과가 오른다
  const gearK = m.gear ? 1 + m.gear.ilvl * 0.012 * ({ magic: 1, rare: 1.3, hero: 1.6, legend: 2 }[m.gear.rarity] || 0.8) : 1;
  const eff = Math.max(0.25, Math.min(1.5, (m.lv * 3) / Math.max(1, lvl))) * gearK;
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
  if (!MATERIALS[zoneId] || rng() >= d[0] * (1 + researchK(st, 'mats'))) return 0;
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
// ── 연구소 ── 한 번에 하나, 끝나는 시각으로 흐른다 (꺼 둔 동안에도)
export const researchLv = (st, id) => townOf(st).research?.[id] || 0;
export const researchK = (st, id) => researchLv(st, id) * RESEARCH[id].k;
export function researchStart(st, id, now = Date.now()) {
  const t = townOf(st), lab = findBuilding(st, 'lab');
  if (!lab || t.lab) return { ok: false, why: t.lab ? '이미 연구 중입니다' : '연구소가 없습니다' };
  const lv = researchLv(st, id);
  if (lv >= BUILDINGS.lab.slots(lab.lv)) return { ok: false, why: '연구소 단계를 올려야 합니다' };
  const c = researchCost(lv);
  if (st.gold < c.gold) return { ok: false, why: '금화가 모자랍니다' };
  st.gold -= c.gold; t.lab = { id, until: now + c.min * 60000 };
  return { ok: true };
}
export function researchTick(st, now = Date.now()) {
  const t = townOf(st);
  if (!t.lab || now < t.lab.until) return null;
  const id = t.lab.id; (t.research ||= {})[id] = (t.research[id] || 0) + 1; t.lab = null;
  return id;
}
// 용병 장비: 가방에서 가장 좋은 (끼지 않은) 장비 하나를 맡긴다 (돌려받지 않는다)
export function mercGear(st, i) {
  const m = townOf(st).mercs[i];
  const it = st.inv.filter((x) => BASES[x.base]?.slot && !x.book && x.ilvl).sort((a, b) => b.ilvl - a.ilvl)[0];
  if (!m || !it) return { ok: false, why: '맡길 장비가 없습니다' };
  st.inv.splice(st.inv.indexOf(it), 1);
  m.gear = { ilvl: it.ilvl, rarity: it.rarity, name: it.base };
  return { ok: true };
}
export { PLOTS, BUILDINGS, EXPEDITIONS };
