// 능력치 파편: 장비를 갈아 끼울 때 낮은 확률로, 보스가 가끔 장비 대신 떨어뜨린다.
// 파편 하나 = 옵션 하나(기본 피해 · 방어력은 나오지 않는다). 대장간에서 장비 옵션 하나를 무작위로 파편 옵션과 바꾼다.
// 대장간 단계가 오르면 옵션을 최대 3개까지 잠가 바뀌지 않게 할 수 있다.
import { AFFIXES, BASES, RARITY } from '../data/items.js';
import { R, pick } from './rng.js';

export const SHARD = {
  swapChance: 0.1,    // 장비를 갈아 끼울 때 빠진 장비에서 파편이 나올 확률
  bossChance: 0.2,    // 보스 장비 드랍 하나가 파편으로 바뀔 확률
};
export const SHARD_COLOR = '#c58cff';
// 잠글 수 있는 옵션 수: 대장간 3단계 1개 · 4단계 2개 · 5단계 3개
export const lockMax = (smithLv) => Math.max(0, Math.min(3, (smithLv || 0) - 2));
export const shardCost = (it) => ({ gold: Math.round(300 * (1 + (it.ilvl || 1) / 5)), ore: 3 + Math.round((it.ilvl || 1) / 6) });

export const makeShard = (a, st = null) => ({ uid: st ? st.nextUid++ : Math.floor(Math.random() * 1e9), base: 'shard', shard: { id: a.id, v: a.v } });
export const isShard = (it) => !!it?.shard;

// 장비의 옵션 중 하나로 파편 만들기 (옵션이 없으면 null)
export function shardFrom(it, st = null, rng = R) {
  if (!it?.affixes?.length) return null;
  return makeShard(pick(it.affixes, rng), st);
}
// 보스가 떨어뜨리는 파편: 몬스터 레벨에 맞는 무작위 옵션 (희귀 등급 세기)
export function rollShard(level, st = null, rng = R) {
  const ids = Object.keys(AFFIXES).filter((id) => !AFFIXES[id].legendOnly);
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
  const same = it.affixes.findIndex((x) => x.id === sh.id);
  if (same >= 0 && locks.includes(same)) return { ok: false, why: '잠근 옵션과 같은 옵션입니다' };
  if (same < 0 && it.affixes.every((_, i) => locks.includes(i))) return { ok: false, why: '모든 옵션이 잠겨 있습니다' };
  return { ok: true, same };
}

// 파편 쓰기: 잠그지 않은 옵션 하나를 무작위로 파편 옵션과 바꾼다 (같은 옵션이 있으면 그것을 바꾼다)
export function applyShard(st, it, shardUid, locks = [], smithLv = 0, rng = R) {
  const i = st.inv.findIndex((x) => x.uid === shardUid);
  const sh = st.inv[i]?.shard;
  if (!sh) return { ok: false, why: '파편이 없습니다' };
  if (locks.length > lockMax(smithLv)) return { ok: false, why: '대장간 단계를 올려야 더 잠글 수 있습니다' };
  const c = canApply(it, sh, locks);
  if (!c.ok) return c;
  const cost = shardCost(it), t = st.town;
  if (st.gold < cost.gold) return { ok: false, why: '금화가 모자랍니다' };
  if ((t?.ore || 0) < cost.ore) return { ok: false, why: '강화석이 모자랍니다' };
  st.gold -= cost.gold; t.ore -= cost.ore;
  const free = it.affixes.map((_, k) => k).filter((k) => !locks.includes(k));
  const k = c.same >= 0 ? c.same : pick(free, rng);
  const old = it.affixes[k];
  it.affixes[k] = { id: sh.id, v: sh.v };
  st.inv.splice(i, 1);
  return { ok: true, old, now: it.affixes[k] };
}
