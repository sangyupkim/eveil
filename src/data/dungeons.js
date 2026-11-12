// 던전: 지역마다 하나. 같은 지도 먼 곳(x 600~)에 칸 격자로 만든다. 들어가면 탐험하며 가장 먼 곳의 우두머리까지.
// v0.24부터 모두 넓은 길 몇 갈래 + 넓은 우두머리 터 (caves는 가장자리가 울퉁불퉁). 들어가려면 열쇠 하나 (네임드 · 보스).
import { ZONES } from './world.js';
import { seeded } from '../game/rng.js';

export const DUNGEON_X = 600, DUNGEON_GAP = 100, MAX_STAGE = 10;
export const T = 2.6, N = 31; // 칸 크기 · 한 변 칸 수 (약 80 단위)
const STYLE = { field: 'halls', forest: 'caves', grave: 'maze', ruins: 'halls', swamp: 'caves', frost: 'caves', valley: 'caves', inferno: 'maze', orcfort: 'halls', webwood: 'caves', harbor: 'maze', demongate: 'halls' };
export const styleOf = (zi) => STYLE[ZONES[zi]?.id] || 'maze';

const cache = new Map();
let DSEED = 0;
export const setDungeonSeed = (s) => { DSEED = s; cache.clear(); };
// 격자: 1 = 바닥. start · boss = 칸 좌표, dist = 시작에서 걸음 수
export function layout(zi) {
  if (cache.has(zi)) return cache.get(zi);
  // v0.24: 미로 대신 넓은 길(3칸) 몇 갈래 + 갈림목마다 작은 터 + 끝에 넓은 우두머리 터
  const rng = seeded(5000 + zi * 17 + DSEED * 131), style = styleOf(zi);
  const g = new Uint8Array(N * N), at = (i, j) => i >= 0 && j >= 0 && i < N && j < N ? g[j * N + i] : 0, set = (i, j, v = 1) => { if (i > 0 && j > 0 && i < N - 1 && j < N - 1) g[j * N + i] = v; };
  const box = (ci, cj, r) => { for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) set(ci + a, cj + b); };
  // 갈림목 4×4 (7칸 간격). 아래 가운데에서 시작해 위로 올라가는 큰길 + 짧은 샛길
  const P = [4, 11, 18, 25], node = (a, b) => [P[a], P[b]];
  const road = (a, b) => { const [i0, j0] = node(...a), [i1, j1] = node(...b); for (let i = Math.min(i0, i1); i <= Math.max(i0, i1); i++) for (let w = -1; w <= 1; w++) set(i, j0 + w); for (let j = Math.min(j0, j1); j <= Math.max(j0, j1); j++) for (let w = -1; w <= 1; w++) set(i1 + w, j); };
  let cur = [1 + Math.floor(rng() * 2), 3];
  const main = [cur];
  while (cur[1] > 0) {
    const side = rng() < 0.45 ? (rng() < 0.5 ? -1 : 1) : 0;
    const nxt = side && cur[0] + side >= 0 && cur[0] + side <= 3 ? [cur[0] + side, cur[1]] : [cur[0], cur[1] - 1];
    road(cur, nxt); main.push(nxt); cur = nxt;
  }
  // 샛길 2~3개 (막다른 터에는 보물 · 무리)
  const nb = 3 + (rng() < 0.5 ? 1 : 0);
  for (let k = 0; k < nb; k++) {
    const from = main[1 + Math.floor(rng() * (main.length - 2))];
    const dirs = [[1, 0], [-1, 0], [0, 1]].filter(([a, b]) => from[0] + a >= 0 && from[0] + a <= 3 && from[1] + b <= 3);
    if (!dirs.length) continue;
    const [a, b] = dirs[Math.floor(rng() * dirs.length)];
    road(from, [from[0] + a, from[1] + b]);
    box(...node(from[0] + a, from[1] + b), 2);
  }
  for (const n of main) box(...node(...n), 2); // 갈림목 터
  if (style === 'caves') for (let k = 0; k < N * 2; k++) { const i = 2 + Math.floor(rng() * (N - 4)), j = 2 + Math.floor(rng() * (N - 4)); if (at(i, j) && at(i + 2, j) && at(i - 2, j)) set(i, j + (rng() < 0.5 ? 2 : -2)); } // 동굴은 가장자리를 울퉁불퉁하게
  // 우두머리 터: 큰길 끝(맨 위)에 넓게
  const bossN = node(...main[main.length - 1]), boss = [bossN[0], Math.max(6, bossN[1] + 1)];
  box(boss[0], boss[1], 5);
  const start = node(...main[0]);
  const dist = new Int16Array(N * N).fill(-1), q = [start]; dist[start[1] * N + start[0]] = 0;
  while (q.length) { const [i, j] = q.shift(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(i + a, j + b) && dist[(j + b) * N + i + a] < 0) { dist[(j + b) * N + i + a] = dist[j * N + i] + 1; q.push([i + a, j + b]); } }
  for (let k = 0; k < N * N; k++) if (dist[k] < 0) g[k] = 0;
  const far = dist[boss[1] * N + boss[0]];
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
