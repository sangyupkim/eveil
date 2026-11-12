// 마을 규칙 (화면과 무관): 짓기 · 단계 올리기 · 생산 쌓기 · 강화 · 용병 파견
import { BUILDINGS, PLOTS, ENHANCE, EXPEDITIONS, RESEARCH, researchCost } from '../data/buildings.js';
import { ZONES } from '../data/world.js';
import { rollLoot } from './loot.js';
import { addItem } from './inventory.js';
import { makeItem } from './items.js';
import { MATERIALS, MAT_DROP, SETS, SET_SLOTS, craftCost, upgradeMats } from '../data/crafting.js';
import { BASES } from '../data/items.js';

export function townOf(st, now = Date.now()) {
  st.town ||= { plots: {}, ore: 0, mercs: [], last: now };
  st.town.mats ||= {};
  migrateMercs(st.town);
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

// 시간이 흘러 생산이 쌓인다 (꺼 둔 동안 포함). 일하는 용병만큼 · 솜씨만큼, 체력이 닳으면 쉰다
export function tick(st, now = Date.now()) {
  const t = townOf(st, now);
  const hours = Math.max(0, (now - (t.last || now)) / 3600000);
  t.last = now;
  let left = Math.min(hours, 72);
  while (left > 1e-9) {
    const h = Math.min(0.25, left); left -= h;
    for (const [pid, b] of Object.entries(t.plots)) {
      const def = BUILDINGS[b.type];
      if (!def.rate) continue;
      const crew = t.mercs.filter((m) => m.work === pid && !m.tired && !m.job);
      const eff = crew.reduce((a, m) => a + workEff(m, b.type), 0) / b.lv;
      b.stock = Math.min(def.store(b.lv), (b.stock || 0) + def.rate(b.lv) * Math.min(2, eff) * h);
      for (const m of crew) { m.sta -= MERC.workSta * h; growSkill(m, SKILL_OF[b.type], h); gainExp(m, MERC.workExp * h); if (m.sta <= 0) { m.sta = 0; m.tired = true; } }
    }
    for (const m of t.mercs) if (!m.job && (m.tired || !m.work)) { m.sta = Math.min(staMax(m), m.sta + MERC.restSta * h); if (m.sta >= staMax(m)) m.tired = false; }
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

// ── 용병 (일꾼 겸 모험가) ──
// 여관에 매 시간 무작위 용병이 찾아온다. 솜씨: 채광(광산) · 재배(약초밭) · 탐험(파견). 체력이 닳으면 쉰다.
// 시킨 일의 솜씨가 오르고, 레벨 20에서 각성(최대 10). 파견을 나가면 죽을 수도 있다.
export const MERC = { workSta: 8, restSta: 12, workExp: 3, lvMax: 20, awMax: 10 };
export const SKILL_OF = { mine: 'mine', herb: 'herb' };
export const SKILL_NAMES = { mine: '채광', herb: '재배', hunt: '탐험' };
export const GRADES = [{ name: '평범', color: '#c8c0b0', k: 1 }, { name: '숙련', color: '#6aa8ff', k: 1.5 }, { name: '정예', color: '#d080ff', k: 2.2 }, { name: '전설', color: '#ffb040', k: 3.2 }];
const NA = ['브', '셀', '오', '이', '케', '도', '미', '하', '유', '바', '로', '카', '테', '루', '자', '에', '실', '아', '고', '네'], NB = ['란', '마', '덴', '라', '일', '르', '나', '스', '크', '린', '온', '벨', '렌', '드', '아', '토'];
export const staMax = (m) => 40 + m.lv * 2 + (m.aw || 0) * 8 + (m.vit || 0);
export const workEff = (m, type) => (m[SKILL_OF[type]] || 0) / 10;  // 솜씨 10 = 한 자리 몫
const growSkill = (m, k, h) => { const cap = 30 + (m.aw || 0) * 6; m[k] = Math.min(cap, m[k] + 0.12 * h * (1 - m[k] / (cap + 5))); };
function gainExp(m, n) {
  if (m.lv >= MERC.lvMax) { m.exp = 0; return; }
  m.exp += n;
  while (m.lv < MERC.lvMax && m.exp >= m.lv * 25) { m.exp -= m.lv * 25; m.lv++; }
}
let uidN = 0;
export function rollMerc(rng = Math.random, innLv = 1) {
  const r = rng(), gi = r < 0.02 * innLv ? 3 : r < 0.1 + 0.03 * innLv ? 2 : r < 0.4 + 0.04 * innLv ? 1 : 0, g = GRADES[gi];
  // 셋 중 하나는 뛰어나게 (일 잘하는 용병 · 탐험 잘하는 용병)
  const main = ['mine', 'herb', 'hunt'][Math.floor(rng() * 3)], sk = (k) => Math.round((k === main ? 7 + rng() * 6 : 1 + rng() * 5) * g.k * 10) / 10;
  const m = { id: `m${Date.now().toString(36)}${(uidN++).toString(36)}${Math.floor(rng() * 1e4)}`, name: NA[Math.floor(rng() * NA.length)] + NB[Math.floor(rng() * NB.length)], grade: gi, lv: 1, exp: 0, aw: 0,
    mine: sk('mine'), herb: sk('herb'), hunt: sk('hunt'), vit: Math.round(rng() * 20 * g.k), work: null, job: null, tired: false };
  m.sta = staMax(m);
  m.cost = Math.round((m.mine + m.herb + m.hunt * 1.5 + m.vit) * 25 * g.k);
  return m;
}
export const mercSlots = (st) => { const inn = findBuilding(st, 'inn'); return inn ? 2 + inn.lv * 2 : 0; };
// 이번 시간에 찾아온 용병 (여관 단계만큼 더 많이 · 좋게)
export function recruits(st, now = Date.now(), rng = Math.random) {
  const t = townOf(st), inn = findBuilding(st, 'inn'), hr = Math.floor(now / 3600000);
  if (!inn) return [];
  if (!t.rec || t.rec.hr !== hr) t.rec = { hr, list: Array.from({ length: 2 + inn.lv }, () => rollMerc(rng, inn.lv)) };
  return t.rec.list;
}
export function hire(st, id, now = Date.now()) {
  const t = townOf(st), list = recruits(st, now), m = id ? list.find((x) => x.id === id) : list[0];
  if (!m) return { ok: false, why: '찾아온 용병이 없습니다' };
  if (t.mercs.length >= mercSlots(st)) return { ok: false, why: '여관 단계를 올려야 합니다' };
  if (st.gold < m.cost) return { ok: false, why: '금화가 모자랍니다' };
  st.gold -= m.cost; list.splice(list.indexOf(m), 1); t.mercs.push(m);
  return { ok: true, m };
}
export const mercById = (st, id) => townOf(st).mercs.find((m) => m.id === id) || null;
export function dismiss(st, id) { const t = townOf(st), i = t.mercs.findIndex((m) => m.id === id); if (i < 0 || t.mercs[i].job) return { ok: false }; t.mercs.splice(i, 1); return { ok: true }; }
// 일 맡기기: 광산 · 약초밭 (건물 단계만큼 자리). plot = null이면 쉬게
export function assignMerc(st, id, plot) {
  const t = townOf(st), m = mercById(st, id);
  if (!m || m.job) return { ok: false, why: '파견 중입니다' };
  if (plot) {
    const b = t.plots[plot];
    if (!b || !BUILDINGS[b.type].rate) return { ok: false };
    if (t.mercs.filter((x) => x.work === plot && x !== m).length >= b.lv) return { ok: false, why: '자리가 없습니다 (단계를 올리세요)' };
  }
  m.work = plot || null;
  return { ok: true };
}
// 각성: 레벨 20에서 레벨 1로, 솜씨 +15% · 체력 · 솜씨 상한이 오른다 (최대 10번)
export const awakenCost = (m) => 2000 * ((m.aw || 0) + 1) ** 2;
export function awakenMerc(st, id) {
  const m = mercById(st, id);
  if (!m || m.lv < MERC.lvMax) return { ok: false, why: `레벨 ${MERC.lvMax}이 되어야 합니다` };
  if ((m.aw || 0) >= MERC.awMax) return { ok: false, why: '더 각성할 수 없습니다' };
  const c = awakenCost(m);
  if (st.gold < c) return { ok: false, why: '금화가 모자랍니다' };
  st.gold -= c; m.aw = (m.aw || 0) + 1; m.lv = 1; m.exp = 0;
  for (const k of ['mine', 'herb', 'hunt']) m[k] = Math.round(m[k] * 1.15 * 10) / 10;
  return { ok: true };
}
// 예전 저장: 일꾼 수 · 이름만 있던 용병을 새 용병으로
function migrateMercs(t) {
  t.mercs ||= [];
  for (const m of t.mercs) if (!m.id) { Object.assign(m, { ...rollMerc(Math.random, 1), name: m.name, lv: m.lv || 1, exp: 0, job: m.job, gear: m.gear, cost: 0 }); m.hunt = Math.max(m.hunt, 8); }
  if (t.workers) {
    const want = Object.entries(t.plots).flatMap(([pid, b]) => Array(b.workers || 0).fill(pid));
    for (let i = 0; i < t.workers; i++) { const m = rollMerc(Math.random, 1); m.mine = m.herb = 10; m.work = want[i] || null; t.mercs.push(m); }
    for (const b of Object.values(t.plots)) delete b.workers;
    delete t.workers;
  }
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
// 파견: 해방한 지역에만. 체력을 쓰고, 약하면 죽을 수도 있다
export const EXP_STA = { short: 12, mid: 35, long: 70 };
export const EXP_RISK = { short: 0.02, mid: 0.05, long: 0.1 };
const zoneLvl = (zn) => Math.round((zn.levels[0] + zn.levels[1]) / 2);
export function mercPower(m, zn) {
  const gearK = m.gear ? 1 + m.gear.ilvl * 0.012 * ({ magic: 1, rare: 1.3, hero: 1.6, legend: 2 }[m.gear.rarity] || 0.8) : 1;
  return Math.max(0.25, Math.min(1.8, (m.lv * 2 + (m.aw || 0) * 6 + m.hunt * 1.5) / Math.max(1, zoneLvl(zn)))) * gearK;
}
export const deathChance = (m, zn, expId) => Math.min(0.5, EXP_RISK[expId] * Math.max(0.2, 1 / mercPower(m, zn)) ** 2);
export function dispatch(st, id, zoneId, expId, now = Date.now()) {
  const m = typeof id === 'number' ? townOf(st).mercs[id] : mercById(st, id), ex = EXPEDITIONS.find((e) => e.id === expId), zn = ZONES.find((z) => z.id === zoneId);
  if (!m || m.job || !ex || !zn) return { ok: false };
  if (!isLiberated(st, zoneId)) return { ok: false, why: '해방한 지역에만 보낼 수 있습니다' };
  if (m.sta < EXP_STA[expId]) return { ok: false, why: '체력이 모자랍니다' };
  m.sta -= EXP_STA[expId]; m.work = null;
  m.job = { zone: zoneId, exp: expId, until: now + ex.min * 60000 * (1 - researchK(st, 'merc')) };
  return { ok: true };
}
// 돌아온 용병의 전리품을 받는다 (죽었으면 dead: true, 전리품 없음)
export function claim(st, id, now = Date.now(), rng = Math.random) {
  const t = townOf(st), m = typeof id === 'number' ? t.mercs[id] : mercById(st, id);
  if (!m?.job || now < m.job.until) return null;
  const ex = EXPEDITIONS.find((e) => e.id === m.job.exp), zn = ZONES.find((z) => z.id === m.job.zone);
  const lvl = zoneLvl(zn), eff = mercPower(m, zn);
  if (rng() < deathChance(m, zn, ex.id)) { t.mercs.splice(t.mercs.indexOf(m), 1); return { dead: true, name: m.name, gold: 0, ore: 0, mats: 0, items: [] }; }
  const out = { gold: Math.round(lvl * 25 * ex.mult * eff), ore: Math.round(2 * ex.mult * eff), items: [] };
  const rolls = Math.round(ex.mult * eff * 1.5);
  for (let k = 0; k < rolls; k++) for (const d of rollLoot({ tier: k % 6 === 5 ? 'elite' : 'normal', level: lvl }, {}, st, rng)) if (d.kind === 'item' && d.item.base && !d.item.book) out.items.push(d.item);
  out.mats = Math.round(ex.mult * 3 * eff);
  t.mats ||= {}; t.mats[zn.id] = (t.mats[zn.id] || 0) + out.mats;
  st.gold += out.gold; t.ore += out.ore;
  out.items = out.items.filter((it) => addItem(st, it));
  gainExp(m, ex.mult * 10);
  growSkill(m, 'hunt', ex.mult * 1.5);
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
export function mercGear(st, id) {
  const m = mercById(st, id);
  const it = st.inv.filter((x) => BASES[x.base]?.slot && !x.book && x.ilvl).sort((a, b) => b.ilvl - a.ilvl)[0];
  if (!m || !it) return { ok: false, why: '맡길 장비가 없습니다' };
  st.inv.splice(st.inv.indexOf(it), 1);
  m.gear = { ilvl: it.ilvl, rarity: it.rarity, name: it.base };
  return { ok: true };
}
export { PLOTS, BUILDINGS, EXPEDITIONS };
