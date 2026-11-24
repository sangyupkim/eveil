// 능력치 파편: 장비를 갈아 끼울 때 낮은 확률로, 보스가 가끔 장비 대신 떨어뜨린다.
// 파편 하나 = 옵션 하나(기본 피해 · 방어력은 나오지 않는다). 대장간에서 장비 옵션 하나를 무작위로 파편 옵션과 바꾼다.
// 대장간 단계가 오르면 옵션을 최대 3개까지 잠가 바뀌지 않게 할 수 있다.
import { AFFIXES, BASES, RARITY } from '../data/items.js';
import { R, pick } from './rng.js';
import { capAffixes } from './items.js';
import { vault, vaultSave } from './vault.js';
import { MUGAN_FLAT, muganK } from '../data/mugan.js';

export const SHARD = {
  swapChance: 0.1,    // 장비를 갈아 끼울 때 빠진 장비에서 파편이 나올 확률
  bossChance: 0.12,   // 보스 장비 드랍 하나가 파편으로 바뀔 확률
};
export const SHARD_COLOR = '#c58cff';
// 잠글 수 있는 옵션 수: 대장간 3단계 1개 · 4단계 2개 · 5단계 3개
export const lockMax = (smithLv) => Math.max(0, Math.min(3, (smithLv || 0) - 2));
export const shardCost = (it) => ({ gold: Math.round(300 * (1 + (it.ilvl || 1) / 5)), ore: 3 + Math.round((it.ilvl || 1) / 6) });

// v0.49.11 같은 옵션 파편은 한 칸에 묶는다: it.vals = 값 목록(큰 순), it.shard.v = 가장 큰 값
export const shardVals = (it) => (it?.vals?.length ? it.vals : it?.shard ? [it.shard.v] : []);
const setVals = (it, vs) => { vs.sort((a, b) => b - a); if (vs.length > 1) it.vals = vs; else delete it.vals; it.shard.v = vs[0]; };
// list 안에 같은 옵션 묶음이 있으면 거기에 더한다 (더했으면 true)
// v0.49.84 같은 묶음 = 같은 옵션 · 같은 탁월 여부 (탁월 파편은 따로)
export const sameShard = (a, b) => !!a?.shard && !!b?.shard && a.shard.id === b.shard.id && !!a.shard.great === !!b.shard.great;
export function mergeShard(list, it) {
  if (!it?.shard) return false;
  const same = list.find((x) => x && x !== it && sameShard(x, it));
  if (!same) return false;
  setVals(same, [...shardVals(same), ...shardVals(it)]);
  return true;
}
// 예전 저장: 흩어진 파편을 옵션마다 한 칸으로 (바뀌었으면 true)
export function packShards(list) {
  let ch = false;
  for (let i = list.length - 1; i >= 0; i--) { const it = list[i]; if (it?.shard && list.slice(0, i).some((x) => sameShard(x, it))) { mergeShard(list.slice(0, i), it); list.splice(i, 1); ch = true; } }
  return ch;
}
// 묶음에서 값 하나 빼기 (vi번째) · 다 쓰면 칸을 비운다
export function takeShardVal(list, it, vi = 0) {
  const vs = [...shardVals(it)]; vs.splice(vi, 1);
  if (!vs.length) { const i = list.indexOf(it); if (i >= 0) list.splice(i, 1); } else setVals(it, vs);
}
export const makeShard = (a, st = null) => ({ uid: st ? st.nextUid++ : Math.floor(Math.random() * 1e9), base: 'shard', shard: a.great ? { id: a.id, v: a.v, great: true } : { id: a.id, v: a.v } }); // v0.49.84 탁월 줄 → 탁월 파편
// v0.49.84 탁월 칸: 떨어질 때 붙은 탁월 수(없으면 1). 바꾸기 전에 it.gs로 남겨 둔다 (예전 장비는 지금 붙은 탁월 수)
export const greatCount = (it) => (it?.affixes || []).filter((a) => a.great).length;
export const greatSlots = (it) => Math.max(1, it?.gs || 0, greatCount(it));
export const keepSlots = (it) => { const n = greatSlots(it); if (n > 1) it.gs = n; };
export const isShard = (it) => !!it?.shard;

// 장비의 옵션 중 하나로 파편 만들기 (옵션이 없으면 null)
export function shardFrom(it, st = null, rng = R) {
  if (!it?.affixes?.length) return null;
  return makeShard(pick(it.affixes, rng), st);
}
// 보스가 떨어뜨리는 파편: 몬스터 레벨에 맞는 무작위 옵션 (희귀 등급 세기)
export function rollShard(level, st = null, rng = R) {
  const ids = Object.keys(AFFIXES).filter((id) => !AFFIXES[id].legendOnly && !AFFIXES[id].retired);
  const id = pick(ids, rng), a = AFFIXES[id];
  const max = Math.max(a.min, a.max(level) * RARITY.rare.mult);
  return makeShard({ id, v: Math.max(a.min, Math.round(a.min + rng() * (max - a.min))) }, st);
}

// 이 장비에 이 파편을 쓸 수 있나
export function canApply(it, sh, locks = []) {
  const b = BASES[it?.base];
  if (!b?.slot) return { ok: false, why: '장비가 아닙니다' };
  if (!it.affixes?.length) return { ok: false, why: '바꿀 옵션이 없습니다' };
  const a = AFFIXES[sh.id], slot = b.slot;
  if (a.slots && !a.slots.includes(slot)) return { ok: false, why: '이 부위에는 붙지 않는 옵션입니다' };
  if ((a.notCls && a.notCls.includes(b.cls)) || (a.onlyCls && !a.onlyCls.includes(b.cls))) return { ok: false, why: '이 무기에는 붙지 않는 옵션입니다' };
  const same = it.affixes.findIndex((x) => x.id === sh.id);
  if (same >= 0 && locks.includes(same)) return { ok: false, why: '잠근 옵션과 같은 옵션입니다' };
  if (same < 0 && it.affixes.every((_, i) => locks.includes(i))) return { ok: false, why: '모든 옵션이 잠겨 있습니다' };
  // v0.49.84 탁월 파편: 탁월 칸이 남았거나, 바꿀 탁월 줄이 있어야 (같은 옵션 줄이 탁월이면 그 줄)
  if (sh.great && !(same >= 0 && it.affixes[same].great) && greatCount(it) >= greatSlots(it)) {
    if (same >= 0 || !it.affixes.some((a, i) => a.great && !locks.includes(i))) return { ok: false, why: '탁월 칸이 가득 찼습니다' };
    return { ok: true, same, greatOnly: true };
  }
  return { ok: true, same };
}

// 파편 쓰기: 잠그지 않은 옵션 하나를 무작위로 파편 옵션과 바꾼다 (같은 옵션이 있으면 그것을 바꾼다)
export function applyShard(st, it, shardUid, locks = [], smithLv = 0, rng = R, vi = 0) {
  // 가방 · 창고 어디의 파편이든 (v0.41.3)
  const V = vault().items, inInv = st.inv.some((x) => x.uid === shardUid), list = inInv ? st.inv : V;
  const i = list.findIndex((x) => x?.uid === shardUid);
  const item = list[i], vals = shardVals(item), sh = item?.shard && vals[vi] != null ? { id: item.shard.id, v: vals[vi], great: !!item.shard.great } : null;
  if (!sh) return { ok: false, why: '파편이 없습니다' };
  if (locks.length > lockMax(smithLv)) return { ok: false, why: '대장간 단계를 올려야 더 잠글 수 있습니다' };
  const c = canApply(it, sh, locks);
  if (!c.ok) return c;
  if (shardGrade(sh.id, sh.v, sh.great) > useGrade(st)) return { ok: false, why: `${gradeName(shardGrade(sh.id, sh.v, sh.great))} 등급은 아직 쓸 수 없습니다` }; // v0.49.83
  const cost = shardCost(it), t = st.town;
  if (st.gold < cost.gold) return { ok: false, why: '금화가 모자랍니다' };
  if ((t?.ore || 0) < cost.ore) return { ok: false, why: '강화석이 모자랍니다' };
  st.gold -= cost.gold; t.ore -= cost.ore;
  const free = it.affixes.map((_, k) => k).filter((k) => !locks.includes(k) && (!c.greatOnly || it.affixes[k].great));
  const k = c.same >= 0 ? c.same : pick(free, rng);
  const old = it.affixes[k];
  keepSlots(it);
  it.affixes[k] = sh.great ? { id: sh.id, v: sh.v, great: true } : { id: sh.id, v: sh.v };
  capAffixes(it); // v0.44.62 예전 파편도 지금 상한까지
  takeShardVal(list, item, vi); if (!inInv) vaultSave();
  return { ok: true, old, now: it.affixes[k] };
}

// ── v0.49.83 파편 등급 · 현자 에라 「파편」 (갈기 · 합치기 · 뽑기) ──
// 등급 = 그 수치가 처음 자연스럽게 나오는 세계 단계: 평온(레벨 120) · 악몽(240) · 지옥(360) · 혼돈(500) · 무간 n층(500 + 10n)
//  등급은 저장하지 않고 수치로 계산한다 (예전 파편도 그대로 등급이 붙는다).
//  일찍 끝나는 % 옵션(치명타 · 공격 속도 · 흡혈 · 이동 속도)은 레벨이 아니라 최고치의 45 · 65 · 85%로 나눈다 (혼돈이 끝).
export const SG_LV = [120, 240, 360, 500];
export const SG_NAMES = ['평온', '악몽', '지옥', '혼돈'];
const SG_FRAC = [0.45, 0.65, 0.85];
export const SG_CAPPED = new Set(Object.keys(AFFIXES).filter((id) => AFFIXES[id].max(2000) <= AFFIXES[id].max(150)));
export const gradeLv = (g) => (g < 4 ? SG_LV[g] : 500 + 10 * (g - 3));
// 그 등급의 수치 상한 (신화 장비가 그 레벨에서 낼 수 있는 값)
export function gradeCap(id, g) {
  const a = AFFIXES[id]; if (!a || g < 0) return a ? a.min - 1 : 0;
  if (SG_CAPPED.has(id)) return g >= 3 ? Infinity : Math.round(a.max(500) * RARITY.myth.mult * SG_FRAC[g]);
  const L = gradeLv(g);
  return Math.round(a.max(L) * RARITY.myth.mult * (MUGAN_FLAT.has(id) ? muganK(L) : 1));
}
export function shardGrade(id, v, great = false) { if (great) v = v / 1.3; /* v0.49.84 탁월은 최대치 130%까지라 그만큼 덜어 같은 레벨대 등급 */ for (let g = 0; g < 2000; g++) if (v <= gradeCap(id, g)) return g; return 2000; }
export const gradeName = (g) => (g < 4 ? SG_NAMES[g] : `무간 ${g - 3}층`);
const SG_COLOR = ['#a8d880', '#6cb0ff', '#c58cff', '#ffa84a', '#ff5a6a'];
export const gradeColor = (g) => SG_COLOR[Math.min(4, Math.max(0, g))];
// 쓸 수 있는 등급: 연 세계 단계 (무간은 연 층까지)
export const useGrade = (st) => ((st.maxTier || 1) >= 5 ? 3 + (st.muganMax || 1) : Math.max(0, (st.maxTier || 1) - 1));
// 뽑을 수 있는 등급: 연구 「파편 연성」 1 평온 · 2 악몽 · 3 지옥 · 4 혼돈 · 5 무간 — 그리고 쓸 수 있는 등급까지 (낮은 쪽)
export const pullResearch = (st) => st.town?.research?.shardLab || 0;
export const pullGrade = (st) => { const r = pullResearch(st); return r ? Math.min(useGrade(st), r >= 5 ? Infinity : r - 1) : -1; };
// 내 레벨(각성)에서 뽑기 · 합치기로 나올 수 있는 최고 수치 (전설 장비가 그 레벨에서 내는 값) — 등급이 열려도 레벨을 넘는 수치는 나오지 않는다
export function levelCap(id, st) {
  const a = AFFIXES[id], L = Math.max(1, st.awakenings || 0);
  return Math.max(a.min, Math.round(a.max(L) * RARITY.legend.mult * (MUGAN_FLAT.has(id) ? muganK(L) : 1)));
}
// 가루: 갈면 나오는 양 · 뽑기 값
export const dustOf = (g, great = false) => (g < 4 ? [2, 5, 12, 30][g] : Math.round(30 * Math.pow(1.25, g - 3))) * (great ? 2 : 1); // 탁월은 2배
export const pullCost = (g) => dustOf(g) * 4;
export const SHARD_PULL_IDS = Object.keys(AFFIXES).filter((id) => { const a = AFFIXES[id]; return !a.retired && !a.legendOnly && !a.mythOnly; });
// 이 등급에서 뽑을 수 있는 옵션과 수치 범위 [lo, hi]
export function pullRange(st, id, g) {
  const a = AFFIXES[id], lo = Math.max(a.min, gradeCap(id, g - 1) + 1), hi = Math.min(gradeCap(id, g), levelCap(id, st));
  return hi >= lo ? [lo, hi] : null;
}
export const pullPool = (st, g) => SHARD_PULL_IDS.filter((id) => pullRange(st, id, g));

// 파편 찾기 (가방 · 창고): uid → { list, item }
function findShard(st, uid) {
  for (const list of [st.inv, vault().items]) { const item = list.find((x) => x?.uid === uid && x.shard); if (item) return { list, item, inVault: list !== st.inv }; }
  return null;
}
function putShard(st, sh) { if (mergeShard(st.inv, sh)) return; if (mergeShard(vault().items, sh)) { vaultSave(); return; } st.inv.push(sh); }

// 갈기: 고른 값들(vis)을 가루로
export function grindShard(st, uid, vis) {
  const f = findShard(st, uid); if (!f || !vis?.length) return { ok: false, why: '파편을 고르세요' };
  const vs = shardVals(f.item), id = f.item.shard.id;
  const sel = [...new Set(vis)].filter((i) => vs[i] != null).sort((a, b) => b - a);
  if (!sel.length) return { ok: false, why: '파편을 고르세요' };
  let dust = 0;
  const gr = !!f.item.shard.great;
  for (const i of sel) { dust += dustOf(shardGrade(id, shardVals(f.item)[i], gr), gr); takeShardVal(f.list, f.item, i); }
  st.shardDust = (st.shardDust || 0) + dust; if (f.inVault) vaultSave();
  return { ok: true, dust, n: sel.length };
}
// 합치기: 같은 옵션 셋 → 하나. 셋의 평균 기준 — 60% 평균 ±10% · 25% 평균 ~ 가장 높은 값 · 10% 가장 높은 값 +5 ~ 15% · 5% 가장 낮은 값 아래
//  결과는 쓸 수 있는 등급 · 내 레벨 상한을 넘지 않는다 (넣은 값보다 낮게 자르지는 않는다)
// 합치기 셈: 같은 옵션 값 셋 → 새 값
function fuseValue(st, id, great, xs, rng) {
  const a = AFFIXES[id], avg = xs.reduce((s, x) => s + x, 0) / 3, mx = Math.max(...xs), mn = Math.min(...xs), r = rng(), u = rng();
  const v = r < 0.6 ? avg * (0.9 + 0.2 * u) : r < 0.85 ? avg + (mx - avg) * u : r < 0.95 ? mx * (1.05 + 0.1 * u) : mn * (0.75 + 0.25 * u);
  const cap = Math.max(mx, Math.round(Math.min(gradeCap(id, useGrade(st)), levelCap(id, st)) * (great ? 1.3 : 1))); // 탁월끼리 합치면 탁월
  return Math.max(a.min, Math.min(cap, Math.round(v)));
}
export function fuseShard(st, uid, vis, rng = R) {
  const f = findShard(st, uid), sel = [...new Set(vis || [])];
  if (!f || sel.length !== 3) return { ok: false, why: '같은 옵션 셋을 고르세요' };
  const vs = shardVals(f.item), id = f.item.shard.id, xs = sel.map((i) => vs[i]);
  if (xs.some((x) => x == null)) return { ok: false, why: '같은 옵션 셋을 고르세요' };
  const gr = !!f.item.shard.great, v = fuseValue(st, id, gr, xs, rng);
  for (const i of sel.sort((x, y) => y - x)) takeShardVal(f.list, f.item, i);
  if (f.inVault) vaultSave();
  const sh = makeShard({ id, v, great: gr }, st); putShard(st, sh);
  return { ok: true, v, id, great: gr, grade: shardGrade(id, v, gr), from: xs };
}

// v0.49.87 고른 값들을 한 번에 합치기: 같은 등급끼리 낮은 값부터 셋씩 (남는 한두 개는 그대로)
function dropPicks(st, picks) {
  const by = new Map(); for (const x of picks) { if (!by.has(x.p.item)) by.set(x.p.item, { p: x.p, idx: new Set() }); by.get(x.p.item).idx.add(x.i); }
  let vch = false;
  for (const { p, idx } of by.values()) {
    const rest = shardVals(p.item).filter((_, i) => !idx.has(i));
    if (!rest.length) { const j = p.list.indexOf(p.item); if (j >= 0) p.list.splice(j, 1); } else setVals(p.item, rest);
    if (p.list !== st.inv) vch = true;
  }
  if (vch) vaultSave();
}
export function fuseMany(st, uid, vis, rng = R) {
  const f = findShard(st, uid); if (!f) return { ok: false, why: '파편을 고르세요' };
  const vs = shardVals(f.item), id = f.item.shard.id, gr = !!f.item.shard.great, p = { list: f.list, item: f.item };
  const byG = new Map();
  for (const i of new Set(vis || [])) { if (vs[i] == null) continue; const g = shardGrade(id, vs[i], gr); if (!byG.has(g)) byG.set(g, []); byG.get(g).push({ p, i, v: vs[i] }); }
  const take = [], made = [];
  for (const xs of byG.values()) { xs.sort((a, b) => a.v - b.v); for (let k = 0; k + 3 <= xs.length; k += 3) { const t = xs.slice(k, k + 3); take.push(...t); made.push(fuseValue(st, id, gr, t.map((x) => x.v), rng)); } }
  if (!made.length) return { ok: false, why: '같은 등급 셋이 필요합니다' };
  dropPicks(st, take);
  for (const v of made) putShard(st, makeShard({ id, v, great: gr }, st));
  return { ok: true, id, great: gr, fuses: made.length, used: take.length, best: Math.max(...made) };
}
// 고른 수 중 합쳐지는 수 (같은 등급 셋씩)
export function fuseCount(id, great, vals) { const c = new Map(); for (const v of vals) { const g = shardGrade(id, v, great); c.set(g, (c.get(g) || 0) + 1); } let n = 0; for (const x of c.values()) n += Math.floor(x / 3); return n; }
// 뽑기: 가루로 고른 등급의 무작위 옵션 파편 (등급 범위 안, 낮은 값이 더 잘 나온다)
export function pullShard(st, g, rng = R) {
  if (g > pullGrade(st)) return { ok: false, why: pullResearch(st) ? '아직 뽑을 수 없는 등급입니다' : '연구소 「파편 연성」이 필요합니다' };
  const cost = pullCost(g); if ((st.shardDust || 0) < cost) return { ok: false, why: '가루가 모자랍니다' };
  const pool = pullPool(st, g); if (!pool.length) return { ok: false, why: '각성을 더 올려야 이 등급이 나옵니다' };
  const id = pool[Math.floor(rng() * pool.length)], [lo, hi] = pullRange(st, id, g);
  const v = Math.min(hi, Math.round(lo + (hi - lo) * Math.pow(rng(), 1.6)));
  st.shardDust -= cost;
  const sh = makeShard({ id, v }, st); putShard(st, sh);
  return { ok: true, id, v, grade: g };
}
