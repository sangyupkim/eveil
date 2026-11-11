// 난수 도우미. 테스트에서 rng를 바꿔 끼울 수 있게 모두 rng 인자를 받는다.
export const R = Math.random;
export const randInt = (a, b, rng = R) => a + Math.floor(rng() * (b - a + 1));
export const randRange = (a, b, rng = R) => a + rng() * (b - a);
export const pick = (arr, rng = R) => arr[Math.floor(rng() * arr.length)];
export const chance = (p, rng = R) => rng() < p;

// { key: weight } 또는 [[key, weight]] 에서 하나 고른다
export function weighted(table, rng = R) {
  const entries = Array.isArray(table) ? table : Object.entries(table);
  let total = 0;
  for (const [, w] of entries) total += Math.max(0, w);
  if (total <= 0) return entries[0]?.[0];
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= Math.max(0, w);
    if (r < 0) return k;
  }
  return entries[entries.length - 1][0];
}

// 시드 고정 난수 (맵 배치처럼 매번 같아야 하는 것)
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
