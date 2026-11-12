// 던전: 지역마다 하나. 같은 지도 먼 곳(x 600~)에 칸 격자로 만든다. 들어가면 탐험하며 가장 먼 곳의 우두머리까지.
// 모양 3가지: maze(좁은 미로) · halls(방과 복도) · caves(울퉁불퉁한 동굴). 들어가려면 열쇠 하나 (네임드 · 보스).
import { ZONES } from './world.js';
import { seeded } from '../game/rng.js';

export const DUNGEON_X = 600, DUNGEON_GAP = 100, MAX_STAGE = 10;
export const T = 2.6, N = 27; // 칸 크기 · 한 변 칸 수 (약 70 단위)
const STYLE = { field: 'halls', forest: 'caves', grave: 'maze', ruins: 'halls', swamp: 'caves', frost: 'caves', valley: 'caves', inferno: 'maze', orcfort: 'halls', webwood: 'caves', harbor: 'maze', demongate: 'halls' };
export const styleOf = (zi) => STYLE[ZONES[zi]?.id] || 'maze';

const cache = new Map();
let DSEED = 0;
export const setDungeonSeed = (s) => { DSEED = s; cache.clear(); };
// 격자: 1 = 바닥. start · boss = 칸 좌표, dist = 시작에서 걸음 수
export function layout(zi) {
  if (cache.has(zi)) return cache.get(zi);
  const rng = seeded(5000 + zi * 17 + DSEED * 131), style = styleOf(zi);
  const g = new Uint8Array(N * N), at = (i, j) => i >= 0 && j >= 0 && i < N && j < N ? g[j * N + i] : 0, set = (i, j, v = 1) => { if (i > 0 && j > 0 && i < N - 1 && j < N - 1) g[j * N + i] = v; };
  if (style === 'caves') {
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) g[j * N + i] = rng() < 0.56 ? 1 : 0;
    for (let k = 0; k < 4; k++) { const h = g.slice(); for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) { let n = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) n += h[(j + b) * N + i + a]; g[j * N + i] = n >= 5 ? 1 : 0; } }
  } else {
    // 미로: 홀수 칸을 이어 판다 (되돌아가기)
    const stack = [[1, 1]]; set(1, 1);
    while (stack.length) {
      const [i, j] = stack[stack.length - 1];
      const nb = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([a, b]) => i + a > 0 && j + b > 0 && i + a < N - 1 && j + b < N - 1 && !at(i + a, j + b));
      if (!nb.length) { stack.pop(); continue; }
      const [a, b] = nb[Math.floor(rng() * nb.length)];
      set(i + a / 2, j + b / 2); set(i + a, j + b); stack.push([i + a, j + b]);
    }
    // 고리 (막다른 길만 있으면 지루하다)
    for (let k = 0; k < (style === 'maze' ? 25 : 45); k++) { const i = 1 + Math.floor(rng() * (N - 2)), j = 1 + Math.floor(rng() * (N - 2)); if (!at(i, j) && ((at(i - 1, j) && at(i + 1, j)) || (at(i, j - 1) && at(i, j + 1)))) set(i, j); }
    // 방
    const rooms = style === 'halls' ? 9 : 3;
    for (let k = 0; k < rooms; k++) { const w = 2 + Math.floor(rng() * 3), h = 2 + Math.floor(rng() * 3), i0 = 1 + Math.floor(rng() * (N - w - 2)), j0 = 1 + Math.floor(rng() * (N - h - 2)); for (let j = j0; j <= j0 + h; j++) for (let i = i0; i <= i0 + w; i++) set(i, j); }
  }
  // 시작: 바닥 중 아래쪽 가운데에 가장 가까운 곳. 이어진 곳만 남긴다
  let start = null, bd = 1e9;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (at(i, j)) { const d = Math.abs(i - N / 2) + Math.abs(j - (N - 2)) * 1.5; if (d < bd) { bd = d; start = [i, j]; } }
  set(start[0], start[1]);
  const dist = new Int16Array(N * N).fill(-1), q = [start]; dist[start[1] * N + start[0]] = 0;
  while (q.length) { const [i, j] = q.shift(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(i + a, j + b) && dist[(j + b) * N + i + a] < 0) { dist[(j + b) * N + i + a] = dist[j * N + i] + 1; q.push([i + a, j + b]); } }
  for (let k = 0; k < N * N; k++) if (dist[k] < 0) g[k] = 0;
  let boss = start, far = 0;
  for (let k = 0; k < N * N; k++) if (dist[k] > far) { far = dist[k]; boss = [k % N, Math.floor(k / N)]; }
  // 우두머리 방
  for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) set(boss[0] + a, boss[1] + b);
  const L = { zi, style, g, start, boss, dist, far, at };
  cache.set(zi, L);
  return L;
}
export const originOf = (zi) => ({ x: DUNGEON_X + zi * DUNGEON_GAP, z: 0 });
export const cellPos = (zi, i, j) => { const o = originOf(zi); return { x: o.x + (i - N / 2) * T, z: o.z + (j - N / 2) * T }; };
export function cellOf(zi, x, z) { const o = originOf(zi); return [Math.round((x - o.x) / T + N / 2), Math.round((z - o.z) / T + N / 2)]; }
// 던전 바닥인가 → 지역 번호, 아니면 -1
export function dungeonAt(x, z) {
  if (x < DUNGEON_X - 60) return -1;
  const zi = Math.round((x - DUNGEON_X) / DUNGEON_GAP);
  if (zi < 0 || zi >= ZONES.length) return -1;
  const [i, j] = cellOf(zi, x, z);
  return layout(zi).at(i, j) ? zi : -1;
}
// 지역 안 입구 자리 (문 앞)
export const entranceOf = (zn) => ({ x: zn.x + (zn.x >= 0 ? -1 : 1) * zn.r * 0.45, z: zn.z + (zn.z >= 0 ? -1 : 1) * zn.r * 0.45 });

// 단계마다: 몬스터 강함 · 보상
export const stageMods = (stage) => ({ level: Math.ceil(stage / 2), hp: 1 + 0.12 * stage, dmg: 1 + 0.06 * stage });
