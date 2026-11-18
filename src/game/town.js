import { relicBonus } from '../data/relics.js';
import { floodPenalty } from '../data/flood.js';
// 마을 규칙 (화면과 무관): 짓기 · 단계 올리기 · 생산 쌓기 · 강화 · 용병 파견
import { BUILDINGS, PLOTS, ENHANCE, EXPEDITIONS, RESEARCH, RESEARCH_MAX, SHELTER, researchCost } from '../data/buildings.js';
import { HERBS, herbsAt, RECIPES } from '../data/potions.js';
import { ZONES } from '../data/world.js';
import { rollLoot } from './loot.js';
import { addItem, bagSize } from './inventory.js';
import { makeItem, rollBase } from './items.js';
import { MATERIALS, MAT_DROP, SETS, SET_SLOTS, craftCost, upgradeMats } from '../data/crafting.js';
import { BASES } from '../data/items.js';
import { vault, vaultAdd, vaultSave, vaultSize } from './vault.js';
import { lifeProgress } from './daily.js';
import { shardFrom, rollShard } from './shards.js';

export function townOf(st, now = Date.now()) {
  st.town ||= { plots: {}, mercs: [], last: now };
  st.town.herbs ||= {};
  migrateMercs(st.town);
  if (!st.town.__res) resources(st);
  return st.town;
}

// ── 강화석 · 재료는 가방 · 창고의 아이템 (v0.30) ──
// t.ore · t.mats[지역]은 예전 코드 그대로 쓰도록 남긴 통로: 읽으면 가방 + 창고의 개수, 빼면 가방부터 꺼내 쓴다
export const resCount = (st, base) => st.inv.filter((x) => x.base === base).reduce((a, x) => a + (x.qty || 1), 0) + vault().items.filter((x) => x.base === base).reduce((a, x) => a + (x.qty || 1), 0);
export function resAdd(st, base, n) {
  if (n <= 0) return;
  const it = makeItem(base, { qty: n }, st);
  if (addItem(st, it)) return;
  if (vaultAdd(st, it)) return;
  st.inv.push(it); // 둘 다 가득이면 가방에 넘쳐 담는다 (잃지 않게)
}
export function resTake(st, base, n) {
  for (const list of [st.inv, vault().items]) {
    for (let i = list.length - 1; i >= 0 && n > 0; i--) {
      const x = list[i]; if (x.base !== base) continue;
      const k = Math.min(n, x.qty || 1); x.qty = (x.qty || 1) - k; n -= k;
      if (x.qty <= 0) list.splice(i, 1);
    }
    if (list !== st.inv) vaultSave();
  }
}
function resources(st) {
  const t = st.town;
  // 예전 저장: 숫자로 있던 강화석 · 재료를 아이템으로 옮긴다
  const oldOre = Object.getOwnPropertyDescriptor(t, 'ore')?.value, oldMats = Object.getOwnPropertyDescriptor(t, 'mats')?.value;
  delete t.ore; delete t.mats;
  const set = (base, v) => { const c = resCount(st, base); if (v > c) resAdd(st, base, Math.round(v - c)); else if (v < c) resTake(st, base, Math.round(c - v)); };
  Object.defineProperty(t, 'ore', { configurable: true, enumerable: false, get: () => resCount(st, 'ore'), set: (v) => set('ore', v) });
  const mats = new Proxy({}, {
    get: (_, k) => (typeof k === 'string' && MATERIALS[k] ? resCount(st, 'mat_' + k) : undefined),
    set: (_, k, v) => { if (MATERIALS[k]) set('mat_' + k, v); return true; },
    has: (_, k) => !!MATERIALS[k],
    ownKeys: () => Object.keys(MATERIALS),
    getOwnPropertyDescriptor: (_, k) => (MATERIALS[k] ? { configurable: true, enumerable: true, value: resCount(st, 'mat_' + k) } : undefined),
  });
  Object.defineProperty(t, 'mats', { configurable: true, enumerable: false, get: () => mats, set: () => {} });
  Object.defineProperty(t, '__res', { configurable: true, enumerable: false, value: true });
  if (oldOre > 0) resAdd(st, 'ore', Math.round(oldOre));
  if (oldMats) for (const [k, n] of Object.entries(oldMats)) if (n > 0 && MATERIALS[k]) resAdd(st, 'mat_' + k, Math.round(n));
}
export const buildingAt = (st, plot) => townOf(st).plots[plot] || null;
export const findBuilding = (st, type) => Object.values(townOf(st).plots).find((b) => b.type === type) || null;

export function build(st, plot, type) {
  const t = townOf(st);
  if (t.plots[plot] || !BUILDINGS[type] || findBuilding(st, type)) return { ok: false, why: '지을 수 없습니다' };
  if ((st.awakenings || 0) < (BUILDINGS[type].need || 0)) return { ok: false, why: `각성 ${BUILDINGS[type].need} 필요` };
  const cost = BUILDINGS[type].cost(0);
  if (st.gold < cost) return { ok: false, why: '금화가 모자랍니다' };
  st.gold -= cost;
  const now = Date.now();
  t.plots[plot] = { type, lv: 1, stock: 0, since: now, bld: { to: 1, from: now, until: now + buildTime(1) } };
  return { ok: true };
}
// 짓기 · 단계 올리기에 드는 시간 (목표 단계마다)
export const buildTime = (to) => [0, 60, 300, 900, 1800, 3600][to] * 1000 || 3600000 * (to - 4);
export const building = (b) => !!b?.bld; // 공사 중
// 다 된 공사 마치기
export function finishBuilds(st, now = Date.now()) {
  for (const b of Object.values(townOf(st).plots)) if (b.bld && now >= b.bld.until) { b.lv = b.bld.to; b.bld = null; }
}

export function upgrade(st, plot) {
  const b = buildingAt(st, plot);
  if (!b) return { ok: false };
  if (b.bld) return { ok: false, why: '공사 중입니다' };
  const def = BUILDINGS[b.type], cost = def.cost(b.lv);
  if (b.lv >= def.max || cost == null) return { ok: false, why: '최고 단계입니다' };
  const an = def.up?.[b.lv - 1] ?? 0;
  if ((st.awakenings || 0) < an) return { ok: false, why: `각성 ${an} 필요` };
  if (st.gold < cost) return { ok: false, why: '금화가 모자랍니다' };
  const um = upgradeMats(b.lv);
  if (um && resCount(st, um.base) < um.n) return { ok: false, why: `${BASES[um.base].name} ${um.n}개가 필요합니다` };
  st.gold -= cost;
  if (um) resTake(st, um.base, um.n);
  const now = Date.now();
  b.bld = { to: b.lv + 1, from: now, until: now + buildTime(b.lv + 1) };
  return { ok: true };
}

// 시간이 흘러 생산이 쌓인다 (꺼 둔 동안 포함). 일하는 용병만큼 · 솜씨만큼, 체력이 닳으면 쉰다
export function tick(st, now = Date.now()) {
  const t = townOf(st, now);
  const hours = Math.max(0, (now - (t.last || now)) / 3600000);
  t.last = now;
  finishBuilds(st, now);
  payWages(st, now);
  let left = Math.min(hours, 72);
  while (left > 1e-9) {
    const h = Math.min(0.25, left); left -= h;
    const save = 1 - bonusOf(st, 'house'), rest = 1 + bonusOf(st, 'inn');
    for (const [pid, b] of Object.entries(t.plots)) {
      const def = BUILDINGS[b.type];
      if (b.bld?.to === 1) continue; // 새로 짓는 중이면 아직 일하지 않는다
      const crew = t.mercs.filter((m) => m.work === pid && !m.tired && !m.job);
      if (def.rate) {
        const eff = crew.reduce((a, m) => a + workEff(m, b.type), 0) / b.lv;
        const rk = (b.type === 'herb' ? 1 + researchK(st, 'herb') : b.type === 'mine' ? 1 + researchK(st, 'mine') : 1) * floodPenalty(st).prod * (1 + relicBonus(st, 'prod') / 100); // v0.44.43 범람 불이익 · v0.44.47 유물
        b.stock = Math.min(def.store(b.lv), (b.stock || 0) + def.rate(b.lv) * rk * Math.min(2, eff) * h);
      }
      for (const m of crew) { m.sta -= MERC.workSta * save * h; growSkill(m, SKILL_OF[b.type], h); gainExp(m, MERC.workExp * h); if (m.sta <= 0) { m.sta = 0; m.tired = true; } }
    }
    restAssign(st);
    const innK = innRestK(st);
    for (const m of t.mercs) if (!m.job && (m.tired || !m.work || m.rest)) { m.sta = Math.min(staMax(m), m.sta + MERC.restSta * rest * (m.rest ? innK : 1) * h); if (m.sta >= staMax(m)) { if (m.rest) freshen(st, m); m.tired = false; m.rest = false; } }
  }
  return hours;
}

// 거두기: 광산 → 강화석, 약초밭 → 약초(단계마다 새 약초가 자란다, 마을 창고로)
export function collect(st, plot) {
  const b = buildingAt(st, plot);
  if (!b) return null;
  const n = Math.floor(b.stock || 0);
  if (n <= 0) return { n: 0 };
  lifeProgress(st, 'harvest');
  if (b.type === 'mine') {
    // v0.44.27 높은 광산은 가끔 상위 강화석: 6단계부터 상급 (단계마다 0.4%p, 10단계 2%) · 9단계부터 최상급 (0.15%p, 10단계 0.3%) + 연구 「광맥 감별」
    const p2 = b.lv >= 6 ? (b.lv - 5) * 0.004 + researchK(st, 'oreUp') : 0, p3 = b.lv >= 9 ? (b.lv - 8) * 0.0015 + researchK(st, 'oreUp') / 6 : 0;
    let o2 = 0, o3 = 0; for (let i = 0; i < n; i++) { const r = Math.random(); if (r < p3) o3++; else if (r < p3 + p2) o2++; }
    townOf(st).ore += n - o2 - o3; if (o2) resAdd(st, 'ore2', o2); if (o3) resAdd(st, 'ore3', o3); b.stock -= n;
    return { n, what: '강화석', o2, o3 };
  }
  if (b.type === 'herb') {
    const ids = herbsAt(b.lv), tw = ids.reduce((a, id) => a + HERBS[id].w, 0), hs = townOf(st).herbs, got = {};
    let left = n;
    ids.forEach((id, i) => { const k = i === ids.length - 1 ? left : Math.round((n * HERBS[id].w) / tw); const q = Math.min(left, k); left -= q; if (q > 0) { hs[id] = (hs[id] || 0) + q; got[id] = q; } });
    b.stock -= n;
    return { n, what: '약초', got };
  }
  return null;
}

// ── 강화 ──
export const enhanceCap = (st) => { const s = findBuilding(st, 'smithy'); return s ? BUILDINGS.smithy.cap(s.lv) : 0; };
// 장인의 기운: 실패할 때마다 (그 시도 확률 × 0.465)만큼 쌓이고 100%면 다음은 반드시 성공.
// 실패마다 기본 확률의 10%씩 올라 최대 2배 (성공하면 둘 다 0으로)
export const jangOf = (it) => it.jang || 0;
export function enhanceCost(it, st = null) {
  const n = it.plus || 0, hk = Math.max(0.5, 1 - (it.ilvl || 1) / 750), base = n < 2 ? ENHANCE.chance(n) : ENHANCE.chance(n) * hk, up = Math.min(base, base * 0.1 * (it.fails || 0)); // 높은 장비는 성공률이 낮다 (레벨 200 ×0.56)
  const chance = jangOf(it) >= 1 ? 1 : Math.min(1, base + up + (st ? researchK(st, 'enh') : 0));
  const oreId = ENHANCE.oreId(n), oreK = oreId === 'ore' ? 1 + (it.ilvl || 1) / 130 : 1 + (it.ilvl || 1) / 400;
  return { gold: Math.round(ENHANCE.gold(n, it.ilvl || 1) * (1 - (st ? bonusOf(st, 'smithy') : 0))), ore: Math.round(ENHANCE.ore(n) * oreK), oreId, oreName: BASES[oreId].name, chance, base, jang: jangOf(it) }; // 강화석도 높은 장비일수록 많이
}
// rng: 0~1. 실패해도 단계가 떨어지지는 않는다 (재료만 사라진다)
export function enhance(st, it, rng = Math.random) {
  const n = it.plus || 0;
  if (n >= enhanceCap(st)) return { ok: false, why: '대장간 단계를 올려야 합니다' };
  const c = enhanceCost(it, st), t = townOf(st);
  if (st.gold < c.gold) return { ok: false, why: '금화가 모자랍니다' };
  if (resCount(st, c.oreId) < c.ore) return { ok: false, why: `${c.oreName}이 모자랍니다` };
  st.gold -= c.gold; resTake(st, c.oreId, c.ore); lifeProgress(st, 'enhance');
  if (rng() < c.chance) { it.plus = n + 1; it.jang = 0; it.fails = 0; return { ok: true, success: true, plus: it.plus }; }
  it.fails = (it.fails || 0) + 1;
  it.jang = Math.min(1, jangOf(it) + c.chance * 0.465);
  return { ok: true, success: false, plus: n, jang: it.jang };
}

// ── 분해 · 재련 ──
// 분해: 가방의 장비 → 강화석(등급 · 아이템 레벨만큼) + 그 레벨 지역 재료
const RK = { common: 1, magic: 2, rare: 4, hero: 8, legend: 16 };
export function salvageValue(it) {
  const ore = Math.max(0, Math.floor((RK[it.rarity] || 1) * (1 + it.ilvl / 10) / 3)); // 분해 강화석은 적게 (일반 · 마법 낮은 레벨은 0)
  const withMat = ZONES.filter((z) => MATERIALS[z.id]); // 재료가 없는 지역(오크 요새 등)은 건너뛴다 — 높은 레벨 장비에서 대장간 창이 비던 문제
  const zn = withMat.find((z) => it.ilvl <= z.levels[1]) || withMat[withMat.length - 1];
  return { ore, mat: zn.id, matN: Math.max(1, Math.round((RK[it.rarity] || 1) / 2)) };
}
// 분해 파편 확률: 마법 8% · 희귀 15% · 영웅 25% · 전설 35%
export const SALVAGE_SHARD = { common: 0, magic: 0.08, rare: 0.15, hero: 0.25, legend: 0.35 };
export function salvage(st, uid, fromVault = false) {
  const L = fromVault ? vault().items : st.inv, i = L.findIndex((x) => x?.uid === uid);
  const it = L[i];
  if (it?.lock) return { ok: false, why: '잠근 아이템입니다' };
  if (!it || it.book || !BASES[it.base]?.slot || it.named) return { ok: false, why: '분해할 수 없습니다' };
  const v = salvageValue(it), t = townOf(st);
  L.splice(i, 1); if (fromVault) vaultSave(); t.ore += v.ore; t.mats[v.mat] = (t.mats[v.mat] || 0) + v.matN;
  // 분해하면 그 장비의 옵션 하나가 능력치 파편으로 나올 수 있다 (등급이 높을수록 자주)
  let shard = null;
  if (it.affixes?.length && Math.random() < SALVAGE_SHARD[it.rarity] * (1 + 0.2 * (t.research?.shard || 0))) { shard = shardFrom(it, st); if (shard) st.inv.push(shard); }
  return { ok: true, ...v, shard };
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
// 여관에 매 시간 무작위 용병이 찾아온다. 솜씨: 채광(광산) · 재배(약초밭) · 손재주(대장간 · 제작소) · 학식(연구소) · 살림(숙소) · 탐험(여관 · 파견). 체력이 닳으면 쉰다.
// 시킨 일의 솜씨가 오르고, 레벨 20에서 각성(최대 10). 파견을 나가면 죽을 수도 있다.
export const MERC = { workSta: 8, restSta: 12, workExp: 3, lvMax: 20, awMax: 10 };
// 건물마다 쓰는 솜씨. 광산 · 약초밭은 생산, 나머지는 건물 효과(BONUS)를 올린다
export const SKILL_OF = { mine: 'mine', herb: 'herb', smithy: 'craft', workshop: 'craft', lab: 'lore', inn: 'care', house: 'care', guild: 'hunt' };
export const SKILL_NAMES = { mine: '채광', herb: '재배', craft: '손재주', lore: '학식', hunt: '탐험', care: '살림' };
export const SKILLS_ALL = ['mine', 'herb', 'craft', 'lore', 'hunt', 'care'];
// 일하는 용병 솜씨 합(10 = 한 사람 몫)마다 효과, 최대치
export const BONUS = {
  smithy: { k: 0.05, max: 0.3, text: (v) => `강화 금화 -${Math.round(v * 100)}%` },
  workshop: { k: 0.05, max: 0.3, text: (v) => `제작 금화 -${Math.round(v * 100)}%` },
  lab: { k: 0.08, max: 0.5, text: (v) => `연구 시간 -${Math.round(v * 100)}%` },
  inn: { k: 0.2, max: 1, text: (v) => `용병 휴식 회복 +${Math.round(v * 100)}%` },
  house: { k: 0.15, max: 0.6, text: (v) => `용병 체력 소모 -${Math.round(v * 100)}%` },
  guild: { k: 0.05, max: 0.3, text: (v) => `파견 시간 -${Math.round(v * 100)}%` },
};
// v0.44.28 숙소: 여관에서 푹 쉬고 나온 용병은 한동안 기운이 넘친다 (숙소 단계마다 힘 +3% · 2시간, 다음 파견에 실려 간다)
export const FRESH = { k: 0.03, ms: 2 * 3600e3 };
function freshen(st, m) { const h = findBuilding(st, 'house'); if (h) m.fresh = { k: FRESH.k * h.lv, until: Date.now() + FRESH.ms }; }
export const freshK = (m, now = Date.now()) => (m.fresh && m.fresh.until > now ? m.fresh.k : 0);
// 파견소 8단계: 죽어도 챙긴 물약은 돌아온다 · 10단계: 죽을 확률 -30% · 전리품 +10%
const guildLv = (st) => findBuilding(st, 'guild')?.lv || 0;
export function bonusOf(st, type) {
  const t = townOf(st), e = Object.entries(t.plots).find(([, b]) => b.type === type);
  if (!e || !BONUS[type]) return 0;
  const sum = t.mercs.filter((m) => m.work === e[0] && !m.tired && !m.job).reduce((a, m) => a + workEff(m, type) * (1 + freshK(m)), 0);
  return Math.min(BONUS[type].max, sum * BONUS[type].k);
}
export const GRADES = [{ name: '평범', color: '#c8c0b0', k: 1 }, { name: '숙련', color: '#6aa8ff', k: 1.5 }, { name: '정예', color: '#d080ff', k: 2.2 }, { name: '전설', color: '#ffb040', k: 3.2 }, { name: '신화', color: '#ff4a6a', k: 4.6 }];
// v0.44.55 신화 용병: 여관 7단계부터 가끔 (7 1% · 8 2% · 9 3% · 10 5%)
export const MYTH_CHANCE = (lv) => [0, 0, 0, 0, 0, 0, 0, 0.01, 0.02, 0.03, 0.05][lv] || 0;
// 용병 값: 고용비 = 값 × 10, 하루 품삯 = 값 × 1.2 × (1 + 레벨당 4%)
export const mercValue = (m) => (m.mine + m.herb + m.craft + m.lore + (m.care || 0) + m.hunt * 1.5 + (m.vit || 0)) * 20 * (GRADES[m.grade || 0]?.k || 1);
export const mercWage = (m) => Math.round(mercValue(m) * 1.2 * (1 + 0.04 * ((m.lv || 1) - 1)));
export const wageTotal = (st) => townOf(st).mercs.reduce((a, m) => a + mercWage(m), 0);
const NA = ['브', '셀', '오', '이', '케', '도', '미', '하', '유', '바', '로', '카', '테', '루', '자', '에', '실', '아', '고', '네'], NB = ['란', '마', '덴', '라', '일', '르', '나', '스', '크', '린', '온', '벨', '렌', '드', '아', '토'];
// v0.44.15 여관에서 쉬기: 지친(또는 체력이 반 아래인) 놀거나 지친 용병이 여관 침대에 눕는다. 여관 단계 = 침대 수 · 회복 속도
export const INN_BEDS = (lv) => [0, 2, 3, 4, 6, 8, 10, 12, 14, 16, 20][lv] || 0;
export const innRestK = (st) => { const b = findBuilding(st, 'inn'); return b ? 3 * (1 + 0.25 * b.lv) : 1; }; // 밖에서 쉬는 것의 3.75 ~ 10.5배
export function restAssign(st) {
  const t = townOf(st), b = findBuilding(st, 'inn'), beds = b && !(b.bld?.to === 1) ? INN_BEDS(b.lv) : 0;
  const want = t.mercs.filter((m) => !m.job && (m.tired || m.rest || (!m.work && m.sta < staMax(m) * 0.5)) && m.sta < staMax(m))
    .sort((x, y) => (y.tired ? 1 : 0) - (x.tired ? 1 : 0) || x.sta / staMax(x) - y.sta / staMax(y));
  const inBed = new Set(want.slice(0, beds));
  for (const m of t.mercs) m.rest = inBed.has(m);
}
export const staMax = (m) => 50 + m.lv * 2 + (m.aw || 0) * 8 + (m.vit || 0);
// v0.44.29 베테랑: 최고 레벨(20)까지 키운 용병은 일 · 파견 보상 +5% (죽지 않게 아껴 키울 이유)
export const VETERAN = 0.05;
export const isVet = (m) => (m.lv || 1) >= MERC.lvMax;
export const workEff = (m, type) => (m[SKILL_OF[type]] || 0) / 10 * (isVet(m) ? 1 + VETERAN : 1);  // 솜씨 10 = 한 자리 몫
// v0.49.9 상한보다 이미 높은 솜씨(등급 · 각성으로 받은 값)는 깎지 않는다 (예전엔 일하면 상한 30으로 깎였다)
const growSkill = (m, k, h) => { m[k] ??= 1; const cap = 30 + (m.aw || 0) * 6; if (m[k] >= cap) return; m[k] = Math.min(cap, m[k] + 0.12 * h * (1 - m[k] / (cap + 5))); };
function gainExp(m, n) {
  if (m.lv >= MERC.lvMax) { m.exp = 0; return; }
  m.exp += n;
  while (m.lv < MERC.lvMax && m.exp >= m.lv * 25) { m.exp -= m.lv * 25; m.lv++; }
}
let uidN = 0;
export function rollMerc(rng = Math.random, innLv = 1) {
  // 등급 비율은 여관 단계에 따라 (낮은 단계에는 전설 · 정예가 아예 오지 않는다)
  const gw = BUILDINGS.inn.grades(Math.max(1, Math.min(5, innLv))), gr = rng() * gw.reduce((a, v) => a + v, 0);
  let gi = 0; for (let acc = 0; gi < 4; gi++) { acc += gw[gi]; if (gr < acc) break; }
  gi = Math.min(3, gi); if (rng() < MYTH_CHANCE(innLv)) gi = 4; const g = GRADES[gi];
  // 셋 중 하나는 뛰어나게 (일 잘하는 용병 · 탐험 잘하는 용병)
  const main = SKILLS_ALL[Math.floor(rng() * SKILLS_ALL.length)], sk = (k) => Math.round((k === main ? 7 + rng() * 6 : 1 + rng() * 5) * g.k * 10) / 10;
  const m = { id: `m${Date.now().toString(36)}${(uidN++).toString(36)}${Math.floor(rng() * 1e4)}`, name: NA[Math.floor(rng() * NA.length)] + NB[Math.floor(rng() * NB.length)], grade: gi, lv: 1, exp: 0, aw: 0,
    mine: sk('mine'), herb: sk('herb'), craft: sk('craft'), lore: sk('lore'), hunt: sk('hunt'), face: ['m01', 'm02', 'm03', 'm04', 'f01', 'f02', 'f03', 'f04'][Math.floor(rng() * 8)], vit: Math.round(rng() * 20 * g.k), work: null, job: null, tired: false };
  m.care = sk('care');
  m.sta = staMax(m);
  m.cost = Math.round(mercValue(m) * 10); // v0.44.55 고용비 10배
  return m;
}
// 고용 한도: 숙소 침대 수 (숙소가 없으면 1명)
export const mercSlots = (st) => { const h = findBuilding(st, 'house'); return 1 + (h ? BUILDINGS.house.beds(h.lv) : 0); };
// 이번 시간에 찾아온 용병 (여관 단계만큼 더 많이 · 좋게)
export function recruits(st, now = Date.now(), rng = Math.random) {
  const t = townOf(st), inn = findBuilding(st, 'inn'), hr = Math.floor(now / 3600000);
  if (!inn) return [];
  if (!t.rec || t.rec.hr !== hr) t.rec = { hr, list: Array.from({ length: Math.max(1, 2 + inn.lv - floodPenalty(st).recruits) }, () => rollMerc(rng, Math.min(10, inn.lv + Math.round(relicBonus(st, 'inn'))))) }; // v0.44.52 나그네의 등불
  return t.rec.list;
}
export function hire(st, id, now = Date.now()) {
  const t = townOf(st), list = recruits(st, now), m = id ? list.find((x) => x.id === id) : list[0];
  if (!m) return { ok: false, why: '찾아온 용병이 없습니다' };
  if (t.mercs.length >= mercSlots(st)) return { ok: false, why: '숙소 단계를 올려야 합니다' };
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
    if (!b || !SKILL_OF[b.type]) return { ok: false };
    if (t.mercs.filter((x) => x.work === plot && x !== m).length >= b.lv) return { ok: false, why: '자리가 없습니다' };
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
  for (const k of SKILLS_ALL) m[k] = Math.round((m[k] || 1) * 1.15 * 10) / 10;
  return { ok: true };
}
// 예전 저장: 일꾼 수 · 이름만 있던 용병을 새 용병으로
function migrateMercs(t) {
  t.mercs ||= [];
  // 숙소 솜씨 「살림」이 생기기 전 용병: 재배와 비슷한 값으로 채운다
  for (const m of t.mercs) if (m.id && m.care == null) m.care = Math.max(1, Math.round((m.herb || 3) * 0.8 * 10) / 10);
  for (const m of t.mercs) if (m.id && m.craft == null) { m.craft = 1 + Math.round(Math.random() * 40) / 10; m.lore = 1 + Math.round(Math.random() * 40) / 10; m.face ||= 'm01'; }
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
export const EXP_STA = { short: 10, mid: 25, long: 45, siege: 65, deep: 85 }; // 1레벨 용병(최대 52)도 긴 원정까지 갈 수 있게
export const EXP_RISK = { short: 0.02, mid: 0.05, long: 0.1, siege: 0.14, deep: 0.18 };
// 개척지 쉼터 단계 (그 지역 야영지)
export const shelterLv = (st, zoneId) => st.camps?.[zoneId]?.rest || 0;
export function shelterUp(st, zoneId) {
  const k = st.camps?.[zoneId];
  if (!k) return { ok: false, why: '야영지를 먼저 찾아야 합니다' };
  const lv = k.rest || 0, c = SHELTER.cost(lv);
  if (lv >= SHELTER.max || c == null) return { ok: false, why: '최고 단계입니다' };
  if (st.gold < c) return { ok: false, why: '금화가 모자랍니다' };
  st.gold -= c; k.rest = lv + 1;
  return { ok: true, lv: k.rest };
}
// 챙겨 보낸 물건의 효과: 체력 물약은 안전, 영약은 힘
export function packBoost(pack = []) {
  let safe = 0, pow = 0;
  for (const p of pack) {
    const b = BASES[p.base]; if (!b) continue;
    if (b.restore?.hp) safe += (b.restore.hp >= 200 ? 0.12 : 0.06) * p.qty;
    else if (b.restore?.mp) pow += 0.02 * p.qty;
    else if (b.type === 'elixir') pow += 0.06 * p.qty;
  }
  return { safe: Math.min(0.6, safe), pow: Math.min(0.5, pow) };
}
export const partyMax = (st) => { const g = findBuilding(st, 'guild'); return g ? BUILDINGS.guild.party(g.lv) : 0; };
export const packMax = (st) => { const g = findBuilding(st, 'guild'); return g ? BUILDINGS.guild.packs(g.lv) : 0; };
const zoneLvl = (zn) => Math.round((zn.levels[0] + zn.levels[1]) / 2);
export function mercPower(m, zn) {
  const gearK = m.gear ? 1 + m.gear.ilvl * 0.012 * ({ magic: 1, rare: 1.3, hero: 1.6, legend: 2 }[m.gear.rarity] || 0.8) : 1;
  return Math.max(0.25, Math.min(1.8, (m.lv * 2 + (m.aw || 0) * 6 + m.hunt * 1.5) / Math.max(1, zoneLvl(zn)))) * gearK;
}
// 파견 힘: 용병 힘 × 연구 × 쉼터 × 챙긴 영약
export const partyPower = (st, m, zn, boost = {}) => mercPower(m, zn) * (1 + (st ? researchK(st, 'mercPow') : 0)) * (1 + SHELTER.power * (st ? shelterLv(st, zn.id) : 0)) * (1 + (boost.pow || 0));
export const deathChance = (m, zn, expId, st = null, boost = {}) => Math.min(0.5, EXP_RISK[expId] * Math.max(0.2, 1 / partyPower(st, m, zn, boost)) ** 2 * (1 - Math.min(0.6, SHELTER.safe * (st ? shelterLv(st, zn.id) : 0))) * (1 - (boost.safe || 0)) * (st && guildLv(st) >= 10 ? 0.7 : 1) * (st ? floodPenalty(st).death * (1 - relicBonus(st, 'safe') / 100) : 1));
// 여러 명을 한 번에: 파견소 단계만큼 인원 · 챙길 물건. pack = [{ base, qty }] (물약 · 영약)
export function dispatchParty(st, ids, zoneId, expId, pack = [], now = Date.now(), opt = {}) {
  const t = townOf(st), ex = EXPEDITIONS.find((e) => e.id === expId), zn = ZONES.find((z) => z.id === zoneId);
  if (!findBuilding(st, 'guild')) return { ok: false, why: '파견소가 필요합니다' };
  if (!ex || !zn || !ids?.length) return { ok: false, why: '보낼 용병을 고르세요' };
  if (!isLiberated(st, zoneId)) return { ok: false, why: '해방한 지역에만 보낼 수 있습니다' };
  if (ex.rest && shelterLv(st, zoneId) < ex.rest) return { ok: false, why: `그 지역 쉼터 ${ex.rest}단계가 필요합니다` };
  if (ids.length > partyMax(st)) return { ok: false, why: `한 번에 ${partyMax(st)}명까지` };
  const total = pack.reduce((a, p) => a + p.qty, 0);
  if (total > packMax(st)) return { ok: false, why: `물건은 ${packMax(st)}개까지` };
  for (const p of pack) if (!BASES[p.base] || !['potion', 'elixir'].includes(BASES[p.base].type) || resCount(st, p.base) < p.qty) return { ok: false, why: '챙길 물건이 모자랍니다' };
  const ms = ids.map((id) => mercById(st, id));
  const staNeed = Math.round(EXP_STA[expId] * (1 - SHELTER.sta * shelterLv(st, zoneId)));
  for (const m of ms) {
    if (!m || m.job) return { ok: false, why: '이미 파견 중인 용병이 있습니다' };
    if (m.work) return { ok: false, why: `${m.name}은(는) 건물에서 일하는 중입니다` };
  } // v0.44.15 체력이 모자라도 보낼 수 있다 (모자란 만큼 죽을 확률이 오른다)
  for (const p of pack) resTake(st, p.base, p.qty); // 가방 · 창고 (v0.41.3)
  const boost = packBoost(pack), share = { safe: boost.safe, pow: boost.pow }; // 함께 간 모두가 나눠 쓴다
  const party = `pt${now.toString(36)}`;
  const until = now + ex.min * 60000 * (1 - researchK(st, 'merc')) * (1 - bonusOf(st, 'guild'));
  for (const m of ms) { const weak = Math.max(0, 1 - m.sta / Math.max(1, staNeed)); m.sta = Math.max(0, m.sta - staNeed); m.work = null; m.rest = false; m.job = { zone: zoneId, exp: expId, from: now, until, party, boost: { ...share, pow: (share.pow || 0) + freshK(m, now) }, weak, pack: pack.map((p) => ({ base: p.base, qty: Math.floor(p.qty / ms.length) })).filter((p) => p.qty) }; m.fresh = null; m.repeat = opt.repeat ? { key: ids.slice().sort().join(','), zone: zoneId, exp: expId, pack } : null; }
  return { ok: true, n: ms.length };
}
function takeOneItem(st, base) { const it = st.inv.find((x) => x.base === base); if (!it) return; it.qty--; if (it.qty <= 0) st.inv.splice(st.inv.indexOf(it), 1); }
const countOf = (st, base) => st.inv.filter((x) => x.base === base).reduce((a, x) => a + (x.qty || 1), 0);
// 예전 한 명 보내기 (파견소 없이도 되던 것) — 테스트 · 옛 코드용
export function dispatch(st, id, zoneId, expId, now = Date.now()) {
  const m = typeof id === 'number' ? townOf(st).mercs[id] : mercById(st, id), ex = EXPEDITIONS.find((e) => e.id === expId), zn = ZONES.find((z) => z.id === zoneId);
  if (!m || m.job || !ex || !zn) return { ok: false };
  if (m.work) return { ok: false, why: '건물에서 일하는 중입니다' };
  if (!isLiberated(st, zoneId)) return { ok: false, why: '해방한 지역에만 보낼 수 있습니다' };
  if (m.sta < EXP_STA[expId]) return { ok: false, why: '체력이 모자랍니다' };
  m.sta -= EXP_STA[expId]; m.work = null;
  m.job = { zone: zoneId, exp: expId, from: now, until: now + ex.min * 60000 * (1 - researchK(st, 'merc')) };
  return { ok: true };
}
// 돌아온 용병의 전리품을 받는다 (죽었으면 dead: true, 전리품 없음)
// v0.45 쌓인 물건 정리: 가방 · 창고에서 고른 등급의 장비(잠금 · 이름 있는 전설 · 착용 제외)와 물약을 버린다
export const RARITY_IDS = ['common', 'magic', 'rare', 'hero', 'legend', 'myth'];
export function junkCount(st, list, rarity) { return list.filter((x) => x && !x.lock && !x.named && !x.book && BASES[x.base]?.slot && x.rarity === rarity).length; }
export function discardJunk(st, rarity, where = 'both') {
  let n = 0; const ok = (x) => !(x && !x.lock && !x.named && !x.book && (rarity === 'potion' ? BASES[x.base]?.type === 'potion' : BASES[x.base]?.slot && x.rarity === rarity));
  if (where !== 'vault') { const a = st.inv.length; st.inv = st.inv.filter(ok); n += a - st.inv.length; }
  if (where !== 'bag') { const V = vault().items, a = V.length; const keep = V.filter(ok); V.length = 0; V.push(...keep); n += a - keep.length; if (n) vaultSave(); }
  for (const m of townOf(st).mercs) if (m.held?.length) { const a = m.held.length; m.held = m.held.filter(ok); n += a - m.held.length; }
  return n;
}
// v0.44.66 가방 · 창고가 모두 꽉 차 있으면 돌아온 용병의 전리품을 받지 않고 기다린다 (자리가 나면 받는다)
export const lootRoomFull = (st) => st.inv.length >= bagSize(st) && vault().items.length >= vaultSize(st);
export function claim(st, id, now = Date.now(), rng = Math.random, put = null) {
  const t = townOf(st), m = typeof id === 'number' ? t.mercs[id] : mercById(st, id);
  if (!m?.job || now < m.job.until) return null;
  const ex = EXPEDITIONS.find((e) => e.id === m.job.exp), zn = ZONES.find((z) => z.id === m.job.zone);
  const boost = m.job.boost || {}, sh = shelterLv(st, zn.id);
  const lvl = zoneLvl(zn), eff = partyPower(st, m, zn, boost) * (1 + SHELTER.stay * sh);
  const gl = guildLv(st), safeK = 1, lootK = (gl >= 10 ? 1.1 : 1) * (isVet(m) ? 1 + VETERAN : 1) * floodPenalty(st).loot;
  if (rng() < Math.min(0.75, deathChance(m, zn, ex.id, st, boost) * (1 + 2 * (m.job.weak || 0)) * safeK)) { /* 지친 채로 가면 더 위험 */
    t.mercs.splice(t.mercs.indexOf(m), 1);
    let back = 0; if (gl >= 8) for (const p of m.job.pack || []) { resAdd(st, p.base, p.qty); back += p.qty; }
    return { dead: true, name: m.name, gold: 0, ore: 0, mats: 0, items: [], back };
  }
  const out = { gold: Math.round(lvl * 25 * ex.mult * eff * lootK), ore: Math.round(0.8 * ex.mult * eff * lootK), items: [] };
  const rolls = Math.round(ex.mult * eff * 1.5 * (1 + SHELTER.loot * sh) * lootK);
  // v0.45 파견 전리품: 장비 · 보석 · 능력치 파편 · 열쇠만 (물약은 나오지 않는다). 버리기로 한 등급의 장비는 받지 않는다
  const drop = t.expDrop || {};
  for (let k = 0; k < rolls; k++) for (const d of rollLoot({ tier: k % 6 === 5 ? 'elite' : 'normal', level: lvl }, {}, st, rng)) {
    if (d.kind !== 'item' || !d.item.base || d.item.book) continue;
    const b = BASES[d.item.base];
    if (b?.slot) { if (!drop[d.item.rarity] || d.item.named) out.items.push(d.item); } else if (b?.type === 'gem') out.items.push(d.item);
  }
  { const nSh = Math.min(4, Math.floor(rolls * 0.0004 + rng())); for (let k = 0; k < nSh; k++) out.items.push(rollShard(lvl, st, rng)); }
  { const nKey = Math.min(3, Math.floor(rolls * 0.0003 + rng())); if (nKey > 0) out.items.push(makeItem('dungeon_key', { qty: nKey }, st)); }
  out.mats = Math.round(ex.mult * 3 * eff * (1 + SHELTER.mats * sh));
  t.mats[zn.id] = (t.mats[zn.id] || 0) + out.mats;
  st.gold += out.gold;
  t.ore += out.ore;
  const got = [], held = []; for (const it of out.items) (put ? put(st, it) : addItem(st, it)) ? got.push(it) : held.push(it);
  out.items = got; out.held = held; out.lost = 0; // v0.44.68 자리가 없어 못 받은 것은 용병이 들고 기다린다 (넘쳐 담지 않는다)
  gainExp(m, ex.mult * 10); lifeProgress(st, 'expedition');
  // v0.44.47 파견소 4단계부터 긴 파견은 지도 조각을 가져온다 (긴 원정 30% · 야영 토벌 1 · 깊은 원정 1~2)
  if (gl >= 4) { const mp = ex.id === 'deep' ? 1 + (rng() < 0.5 ? 1 : 0) : ex.id === 'siege' ? 1 : ex.id === 'long' && rng() < 0.3 ? 1 : 0; if (mp) { resAdd(st, 'odd_map', mp); out.mapPiece = mp; } }
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
// ── 제작소: 약초로 물약 · 영약 ──
export const recipesOpen = (st) => { const w = findBuilding(st, 'workshop'); return w ? RECIPES.filter((r) => r.lv <= w.lv) : []; };
export const brewGold = (st, r) => Math.round(r.gold * (1 - bonusOf(st, 'workshop')));
// 제작에는 시간이 든다: 한 번에 하나씩 차례로 (t.brew 줄, 끝나면 [받기])
export const brewTime = (r) => (20 + 15 * r.lv) * 1000; // 한 번 만드는 데 드는 시간
export const BREW_QUEUE = 5;
export function brew(st, id, times = 1, now = Date.now()) {
  const r = RECIPES.find((x) => x.id === id), t = townOf(st);
  if (!r || !recipesOpen(st).includes(r)) return { ok: false, why: '제작소 단계를 올려야 합니다' };
  times = Math.max(1, Math.floor(times));
  t.brew ||= [];
  if (t.brew.length >= BREW_QUEUE) return { ok: false, why: '제작 줄이 가득 찼습니다' };
  for (const [h, q] of Object.entries(r.herbs)) if ((t.herbs[h] || 0) < q * times) return { ok: false, why: `${HERBS[h].name}이(가) 모자랍니다` };
  for (const [id, q] of Object.entries(r.mats || {})) if (resCount(st, id) < q * times) return { ok: false, why: `${BASES[id].name}이(가) 모자랍니다` };
  const g = brewGold(st, r) * times;
  if (st.gold < g) return { ok: false, why: '금화가 모자랍니다' };
  for (const [h, q] of Object.entries(r.herbs)) t.herbs[h] -= q * times;
  for (const [id, q] of Object.entries(r.mats || {})) resTake(st, id, q * times);
  st.gold -= g;
  const from = Math.max(now, t.brew.length ? t.brew[t.brew.length - 1].until : now);
  t.brew.push({ id, n: r.n * times, from, until: from + brewTime(r) * times * (1 - researchK(st, 'brew')) * floodPenalty(st).brew });
  return { ok: true, n: r.n * times, queued: true };
}
// 다 된 것을 가방으로
// to = 'bag' | 'vault' (vault는 창고에 바로 넣는 함수)
export function brewCollect(st, now = Date.now(), put = null) {
  const t = townOf(st); let n = 0;
  while (t.brew?.length && t.brew[0].until <= now) {
    const b = t.brew[0], it = makeItem(b.id, { qty: b.n }, st);
    if (!(put ? put(st, it) : addItem(st, it))) return { ok: n > 0, n, why: put ? '창고가 가득 찼습니다' : '가방이 가득 찼습니다' };
    n += b.n; t.brew.shift(); lifeProgress(st, 'brew');
  }
  return { ok: n > 0, n };
}
// 예전 세트 제작 (지금은 쓰지 않는다 — 이미 만든 세트 장비 효과는 그대로)
// 세트 · 재료가 있는 지역만 (v0.42.12: 제작소 6단계부터 지역 수가 재료 있는 지역(8)을 넘어 창이 깨지던 문제)
export const craftZones = (st) => { const w = findBuilding(st, 'workshop'); return w ? ZONES.filter((z) => SETS[z.id] && MATERIALS[z.id]).slice(0, BUILDINGS.workshop.zones(w.lv)) : []; };
// 그 지역 레벨에 맞는 가장 좋은 부위 기본 아이템
export function setBase(zi, slot) {
  const lvl = ZONES[zi].levels[1];
  const ids = Object.keys(BASES).filter((id) => BASES[id].slot === slot && (BASES[id].minLvl ?? 1) <= lvl && (BASES[id].minLvl ?? 1) < 99 && !BASES[id].line && !BASES[id].tpl?.startsWith('l_'));
  return ids.sort((a, b) => (BASES[b].minLvl ?? 1) - (BASES[a].minLvl ?? 1) || (BASES[b].armor || 0) - (BASES[a].armor || 0))[0];
}
export function craft(st, zoneId, slot, rng = Math.random) {
  const zi = ZONES.findIndex((z) => z.id === zoneId);
  if (!craftZones(st).some((z) => z.id === zoneId) || !SET_SLOTS.includes(slot)) return { ok: false, why: '제작소 단계를 올려야 합니다' };
  const c0 = craftCost(zi), c = { ...c0, gold: Math.round(c0.gold * (1 - bonusOf(st, 'workshop'))) }, m = townOf(st).mats;
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
  const lv = researchLv(st, id), R = RESEARCH[id];
  if (!R || lab.lv < R.lab) return { ok: false, why: `연구소 ${R?.lab}단계에서 열립니다` };
  if (lv >= RESEARCH_MAX) return { ok: false, why: '최고 단계입니다' };
  const c = researchCost(lv, id);
  if (st.gold < c.gold) return { ok: false, why: '금화가 모자랍니다' };
  if (zoneMatTotal(st) < c.mats) return { ok: false, why: '지역 재료가 모자랍니다' };
  if (c.ess && resCount(st, c.ess.id) < c.ess.n) return { ok: false, why: `${BASES[c.ess.id].name}가 모자랍니다` };
  takeZoneMats(st, c.mats); if (c.ess) resTake(st, c.ess.id, c.ess.n);
  st.gold -= c.gold; t.lab = { id, from: now, until: now + c.min * 60000 * (1 - bonusOf(st, 'lab')) * (1 - relicBonus(st, 'lab') / 100) };
  return { ok: true };
}
export function researchTick(st, now = Date.now()) {
  const t = townOf(st);
  if (!t.lab || now < t.lab.until) return null;
  const id = t.lab.id; (t.research ||= {})[id] = (t.research[id] || 0) + 1; t.lab = null;
  return id;
}
// 용병 장비: 가방에서 가장 좋은 (끼지 않은) 장비 하나를 맡긴다 (돌려받지 않는다)
// 용병 장비: 가방(from 'inv', key = uid)이나 창고(from 'vault', key = 칸 번호)에서 골라 입힌다.
// 입고 있던 장비는 가방으로(가득하면 창고로) 돌려준다. 예전 저장의 요약만 있는 장비는 돌려줄 수 없어 사라진다
export function mercGear(st, id, from, key) {
  const m = mercById(st, id);
  if (!m) return { ok: false };
  let it = null;
  if (from === 'vault') { const V = vault().items; it = V[key]; if (!it || !BASES[it.base]?.slot || it.book) return { ok: false, why: '입힐 수 없는 물건입니다' }; V.splice(key, 1); vaultSave(); it = { ...it, uid: st.nextUid++ }; }
  else { const i = st.inv.findIndex((x) => x.uid === key); it = st.inv[i]; if (!it || !BASES[it.base]?.slot || it.book) return { ok: false, why: '입힐 수 없는 물건입니다' }; st.inv.splice(i, 1); }
  const back = mercUngear(st, id).item;
  m.gearItem = it;
  m.gear = { ilvl: it.ilvl || 1, rarity: it.rarity, name: it.base };
  return { ok: true, back };
}
export function mercUngear(st, id) {
  const m = mercById(st, id);
  if (!m?.gearItem) { if (m) m.gear = null; return { ok: !!m }; }
  const it = m.gearItem;
  m.gearItem = null; m.gear = null;
  it.worn = true; delete it.loot;
  if (!addItem(st, it)) vaultAdd(st, it);
  return { ok: true, item: it };
}
export { PLOTS, BUILDINGS, EXPEDITIONS };

// ── v0.42 높은 강화석 · 강화 열쇠 제작 (제작소) ──
// 상급 강화석(+11 ~ 15) · 최상급 강화석(+16 ~ 20): 강화석 · 지역 재료(가장 많은 것부터) · 정수를 섞는다
export const ORE_RECIPES = [
  { id: 'ore2', lv: 6, gold: 20000, need: { ore: 25, ess3: 2 }, zoneMats: 10 }, // v0.44.12 단계마다 그 단계 정수: 상급 = 응축된
  { id: 'ore3', lv: 8, gold: 80000, need: { ore2: 4, ess5: 2 }, zoneMats: 20 }, // 최상급 = 혼돈의
  { id: 'unknown_map', lv: 1, gold: 5000, need: { map_piece: 5 }, zoneMats: 0 }, // v0.44.47 지도 조각 5 → 미지의 지도
];
const zoneMatTotal = (st) => Object.keys(MATERIALS).reduce((a, k) => a + resCount(st, 'mat_' + k), 0);
function takeZoneMats(st, n) { for (const k of Object.keys(MATERIALS).sort((a, b) => resCount(st, 'mat_' + b) - resCount(st, 'mat_' + a))) { if (n <= 0) break; const c = Math.min(n, resCount(st, 'mat_' + k)); resTake(st, 'mat_' + k, c); n -= c; } }
export function oreRecipeOk(st, r, times = 1) {
  const w = findBuilding(st, 'workshop');
  if (!w || w.lv < r.lv) return { ok: false, why: `제작소 ${r.lv}단계 필요` };
  if (st.gold < r.gold * times) return { ok: false, why: '금화가 모자랍니다' };
  for (const [id, q] of Object.entries(r.need)) if (resCount(st, id) < q * times) return { ok: false, why: `${BASES[id].name}이 모자랍니다` };
  if (zoneMatTotal(st) < r.zoneMats * times) return { ok: false, why: '지역 재료가 모자랍니다' };
  return { ok: true };
}
export function craftOre(st, id, times = 1) {
  const r = ORE_RECIPES.find((x) => x.id === id), ok = r && oreRecipeOk(st, r, times);
  if (!ok?.ok) return ok || { ok: false };
  st.gold -= r.gold * times;
  for (const [k, q] of Object.entries(r.need)) resTake(st, k, q * times);
  takeZoneMats(st, r.zoneMats * times);
  resAdd(st, r.id, times);
  lifeProgress(st, 'make', times);
  return { ok: true, n: times };
}
// 정수: 몬스터 레벨 100 · 200 · 300 · 400부터 2 · 3 · 4 · 5단계
export const essGrade = (level) => Math.min(5, 1 + Math.floor(level / 100));
export function dropEss(st, level, tier, mult = 1, rng = Math.random) {
  let g = essGrade(level);
  if (g < 2) return null;
  const p = ({ normal: 0.04, elite: 0.25, named: 0.6, boss: 1 }[tier] || 0) * mult * (1 + researchK(st, 'ess')) * (1 + relicBonus(st, 'ess') / 100);
  if (rng() >= p) return null;
  let n = tier === 'boss' ? 2 + Math.floor(rng() * 3) : tier === 'named' ? 1 + Math.floor(rng() * 2) : 1;
  // v0.44.11 높은 곳에서도 아래 단계 정수가 나온다 (35%는 한 단계 아래 · 2배): 빛바랜 정수가 100 ~ 199레벨에서만 나오던 것
  if (g >= 3 && rng() < 0.35) { g -= 1; n *= 2; }
  resAdd(st, 'ess' + g, n);
  return { id: 'ess' + g, n };
}
// v0.44.11 정수 교환 (제작소 2단계~): 아래 5개 → 위 1개, 위 1개 → 아래 3개. v0.44.13 금화 소모처로 값을 올림 (올리기 2 · 4.5 · 8만, 내리기 0.8 · 1.8 · 3.2만)
export const ESS_RECIPES = [2, 3, 4].flatMap((g) => [
  { rid: `up${g + 1}`, id: `ess${g + 1}`, lv: 2, gold: 5000 * g * g, need: { [`ess${g}`]: 5 }, zoneMats: 0, out: 1 },
  { rid: `dn${g}`, id: `ess${g}`, lv: 2, gold: 2000 * g * g, need: { [`ess${g + 1}`]: 1 }, zoneMats: 0, out: 3 },
]);
export function craftEss(st, rid, times = 1) {
  const r = ESS_RECIPES.find((x) => x.rid === rid), ok = r && oreRecipeOk(st, r, times);
  if (!ok?.ok) return ok || { ok: false };
  st.gold -= r.gold * times;
  for (const [k, q] of Object.entries(r.need)) resTake(st, k, q * times);
  resAdd(st, r.id, r.out * times);
  lifeProgress(st, 'make', times);
  return { ok: true, n: r.out * times, id: r.id };
}

// 강화 · 극한 던전 열쇠 (제작소 3 · 6단계): 아래 단계 열쇠 + 강화석 + 정수 + 지역 재료
export const KEY_RECIPES = [
  { id: 'dungeon_key2', lv: 3, gold: 8000, need: { dungeon_key: 1, ore: 30, ess2: 3 }, zoneMats: 15 },
  { id: 'dungeon_key3', lv: 6, gold: 40000, need: { dungeon_key2: 1, ore2: 3, ess4: 2 }, zoneMats: 30 }, // 극한 = 심연의
];
export function craftKey(st, id, times = 1) {
  const r = KEY_RECIPES.find((x) => x.id === id), ok = r && oreRecipeOk(st, r, times);
  if (!ok?.ok) return ok || { ok: false };
  st.gold -= r.gold * times;
  for (const [k, q] of Object.entries(r.need)) resTake(st, k, q * times);
  takeZoneMats(st, r.zoneMats * times);
  resAdd(st, r.id, times);
  lifeProgress(st, 'make', times);
  return { ok: true, n: times };
}

// 신화 교환 (v0.42.10): 신화의 흔적 100개 → 지금 각성에 맞는 레벨의 신화 장비 하나 (불운 보정)
// v0.44.16 각성이 높을수록 신화 교환에 흔적이 더 든다: 100 + 각성 25마다 10 (각성 100 → 140 · 300 → 220 · 500 → 300)
export const mythMarks = (st, lv = st?.awakenings || 0) => 100 + 10 * Math.floor(Math.max(0, lv) / 25); // v0.44.18 고른 레벨 기준
export const mythLvMax = (st) => Math.max(10, Math.min(500, st.awakenings || 1));
export const MYTH_MARKS = 100;
export function craftMyth(st, rng = Math.random, pickLv = null) {
  const lv0 = Math.max(10, Math.min(mythLvMax(st), Math.round(pickLv ?? mythLvMax(st)))); // 내가 고른 레벨 (내 각성보다 높게는 안 된다)
  const need = mythMarks(st, lv0);
  if (resCount(st, 'myth_mark') < need) return { ok: false, why: `신화의 흔적 ${need}개가 필요합니다` };
  const lv = lv0;
  const it = makeItem(rollBase(lv, rng), { rarity: 'myth', ilvl: lv }, st, rng);
  if (!addItem(st, it)) return { ok: false, why: '가방이 가득 찼습니다' };
  resTake(st, 'myth_mark', need);
  return { ok: true, item: it };
}

// ── v0.44.15 자동화: 반복 파견 · 반복 제작 ──
// 반복 파견: 같은 무리가 모두 돌아와 체력이 찼으면(필요 체력 이상) 같은 지역 · 기간으로 다시 보낸다. 챙길 물건은 남은 만큼
export function repeatTick(st, now = Date.now()) {
  const t = townOf(st), groups = {}, sent = [];
  for (const m of t.mercs) if (m.repeat && !m.job) (groups[m.repeat.key] ||= []).push(m);
  for (const [key, ms] of Object.entries(groups)) {
    const r = ms[0].repeat, ids = key.split(',');
    if (ms.length !== ids.length && ids.some((id) => mercById(st, id)?.job)) continue; // 아직 덜 돌아왔다
    const live = ms.filter((m) => ids.includes(m.id));
    const sh = shelterLv(st, r.zone), need = Math.round(EXP_STA[r.exp] * (1 - SHELTER.sta * sh));
    if (live.some((m) => m.work || m.sta < need)) continue; // 쉬는 중 (일을 맡기면 반복은 멈춘다)
    const pack = (r.pack || []).map((p) => ({ base: p.base, qty: Math.min(p.qty, resCount(st, p.base)) })).filter((p) => p.qty > 0);
    const res = dispatchParty(st, live.map((m) => m.id), r.zone, r.exp, pack, now, { repeat: true });
    if (res.ok) sent.push(live.map((m) => m.name).join(' · '));
    else for (const m of live) m.repeat = null; // 더 갈 수 없으면 반복을 끝낸다
  }
  return sent;
}
export const stopRepeat = (st, key) => { for (const m of townOf(st).mercs) if (m.repeat?.key === key) m.repeat = null; };
// 반복 제작: 고른 물건을 줄이 빌 때마다 하나씩 (약초 · 금화가 있는 만큼)
export function autoBrewTick(st, now = Date.now()) {
  const t = townOf(st);
  if (!t.autoBrew) return 0;
  let n = 0;
  while ((t.brew?.length || 0) < BREW_QUEUE && brew(st, t.autoBrew, 1, now).ok) n++;
  return n;
}

// v0.44.29 약초 교환 (제작소): 다른 약초 3개 → 원하는 약초 1개 + 금화. 가장 많이 남은 약초부터 쓴다
export const herbSwapGold = (to) => 20 * HERBS[to].lv ** 2;
export function herbSwap(st, to, n = 1) {
  const t = townOf(st);
  if (!findBuilding(st, 'workshop')) return { ok: false };
  let done = 0;
  for (; done < n; done++) {
    const from = Object.keys(HERBS).filter((h) => h !== to).sort((a, b) => (t.herbs[b] || 0) - (t.herbs[a] || 0))[0];
    if ((t.herbs[from] || 0) < 3) break;
    if (st.gold < herbSwapGold(to)) break;
    t.herbs[from] -= 3; st.gold -= herbSwapGold(to); t.herbs[to] = (t.herbs[to] || 0) + 1;
  }
  return done ? { ok: true, n: done } : { ok: false, why: st.gold < herbSwapGold(to) ? '금화가 모자랍니다' : '바꿀 약초가 모자랍니다' };
}

// v0.44.55 하루 품삯: 한국 시간 날짜가 바뀌면 고용한 용병 모두의 품삯을 낸다. 모자라면 낸 만큼만, 못 받은 용병은 그날 지쳐서 쉰다
export function payWages(st, now = Date.now()) {
  const t = townOf(st, now), day = Math.floor((now + 9 * 3600e3) / 86400e3);
  if (t.wageDay == null) { t.wageDay = day; return null; }
  if (day <= t.wageDay || !t.mercs.length) { t.wageDay = Math.max(t.wageDay, day); return null; }
  const days = Math.min(3, day - t.wageDay); t.wageDay = day; // 오래 비워도 사흘치까지만
  let paid = 0, unpaid = 0;
  for (const m of [...t.mercs].sort((a, b) => (b.grade || 0) - (a.grade || 0))) {
    const w = mercWage(m) * days;
    if (st.gold >= w) { st.gold -= w; paid += w; } else { unpaid++; m.sta = 0; m.tired = true; }
  }
  t.wageLog = { day, paid, unpaid };
  return t.wageLog;
}
