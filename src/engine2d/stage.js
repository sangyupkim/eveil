// 2D 쿼터뷰 화면: 카메라 · 땅 타일 · 배경 물건 · 앞뒤 정렬 · 조명. 게임 규칙의 좌표(x, z)는 그대로 쓴다
// 투영: 화면 x = x·48, 화면 y = z·24 − 높이·48 (Flare 타일 192×96 하나 = 세계 (2, 2) 대각)
import { ZONES, TOWN, WORLD_SIZE } from '../data/world.js';
import { setDungeonSeed, dungeonAt, dungeonBox, DUNGEON_X, entranceOf, layout, cellPos, N, T } from '../data/dungeons.js';
const farSide = (x) => x > DUNGEON_X - 80;
import { ZONE_LOOK, ZONE_PROPS, FLAT, DRIVE_TREES, DRIVE_ROCKS } from '../data/flareWorld.js';
import { DATA, image, drawRect } from './sprites.js';
import { seeded } from '../game/rng.js';

export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
export const PX = 64, PZ = 32, PY = 64;
// 땅 타일(192×96) 한 칸 = 세계 STEP칸 대각
const STEP = 96 / PX;

// 지역 반지름은 방향마다 다르다 (둥근 원이 아니라 들쭉날쭉한 땅)
export const zoneRadius = (zn, a) => { const s = zn.x * 0.013 + zn.z * 0.021; return zn.r * (1 + 0.13 * Math.sin(3 * a + s) + 0.08 * Math.sin(5 * a + s * 2.3) + 0.05 * Math.sin(8 * a + s * 4.1)); };
export function zoneAt(x, z) {
  for (const zn of ZONES) if (Math.hypot(x - zn.x, z - zn.z) < zoneRadius(zn, Math.atan2(z - zn.z, x - zn.x))) return zn;
  return null;
}
function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const noise = (x, z) => (Math.sin(x * 0.11 + Math.cos(z * 0.07) * 2) + Math.sin(z * 0.09 + Math.sin(x * 0.05) * 2)) / 4 + 0.5;

// 이 칸(타일 i, j)의 땅: [타일 묶음, 번호]
function groundAt(i, j) {
  const x = (i - j) * STEP, z = (i + j) * STEP;
  const h = hash(i, j);
  if (farSide(x)) { const di = dungeonBox(x, z); return di >= 0 ? pick(ZONES[di].id, h) : ['void']; } // 던전 바닥은 그 지역 땅 그대로
  const dT = Math.hypot(x, z);
  if (dT < TOWN.r * 0.75) return pick('town', h);
  // 지역 경계는 들쭉날쭉하게
  let zn = null;
  for (const z0 of ZONES) if (Math.hypot(x - z0.x, z - z0.z) < zoneRadius(z0, Math.atan2(z - z0.z, x - z0.x)) * (1.02 + (noise(x * 2, z * 2) - 0.5) * 0.08)) { zn = z0; break; }
  let L = ZONE_LOOK[zn ? zn.id : 'wild'];
  // v0.44.20 지역 바로 밖 황야는 그 지역 땅이 조금 더 이어진다 (눈 지역 경계에서 갑자기 네모난 풀밭이 되던 것)
  if (!zn) { let best = null, bd = 1e9; for (const q of ZONES) { const d = Math.hypot(x - q.x, z - q.z) - zoneRadius(q, Math.atan2(z - q.z, x - q.x)); if (d < bd) { bd = d; best = q; } }
    if (best && ZONE_LOOK[best.id].set !== 'grassland' && bd < 9 + noise(x * 0.12, z * 0.12) * 6) L = { ...ZONE_LOOK[best.id], patch: null }; }
  // v0.44.20 언덕 위는 그 언덕을 만든 지역의 땅 (눈 지역 둘레 언덕 위가 풀밭이던 것)
  { const me = inMesa(x, z); if (me?.gr && me.floor) return [me.floor[0], me.gr[0] + Math.floor(h * (me.gr[1] - me.gr[0] + 1))]; }
  // 길: 풀밭 지역 밖(눈 · 사막 · 동굴 · 폐허)에서는 그 지역 땅의 길 무늬로 (v0.44.20 눈밭을 가로지르던 풀 돌길)
  for (const q of ZONES) if (distToSeg(x, z, 0, 0, q.x * 0.72, q.z * 0.72) < 2.6 + noise(x, z) * 1.5) {
    if (!zn || L.set === 'grassland') return pick('town', h);
    const R = L.patch || L.ground; return [L.set, R[0] + Math.floor(h * (R[1] - R[0] + 1))];
  }
  const lake = lakeCell(i, j);
  if (lake) {
    const k = edgeKind((a, b) => !!lakeCell(a, b), i, j);
    if (!k) return [lake.set, wb(lake.set)[1] + Math.floor(h * 16), true, lake];
    if (k === 'bad') return [L.set, L.ground[0]];
    return [lake.set, bankId(lake.set, k, h), false, lake];
  }
  if (L.patch && noise(x * 1.3 + 9, z * 1.3) > 0.68) return [L.set, L.patch[0] + Math.floor(h * (L.patch[1] - L.patch[0] + 1))];
  return [L.set, L.ground[0] + Math.floor(h * (L.ground[1] - L.ground[0] + 1))];
}
// ───── 지형: 호수(물가 절벽) · 언덕(못 올라가는 고원) — Flare 맵의 타일 잇기 규칙 그대로 ─────
const roadDist = (x, z) => Math.min(Math.hypot(x, z) - TOWN.r, ...ZONES.map((zn) => distToSeg(x, z, 0, 0, zn.x * 0.72, zn.z * 0.72)));
export const LAKES = [], MESAS = [];
// 필드 보스 자리 (지역에서 마을 반대쪽 끝) — 둘레를 넓게 비워 보스전을 쉽게
export const bossSpot = (zn) => { const d = Math.hypot(zn.x, zn.z) || 1; return { x: zn.x + (zn.x / d) * zn.r * 0.75, z: zn.z + (zn.z / d) * zn.r * 0.75 }; };
export const BOSS_CLEAR = 15;
const nearBoss = (x, z, pad = 0) => ZONES.some((zn) => { const b = bossSpot(zn); return Math.hypot(b.x - x, b.z - z) < BOSS_CLEAR + pad; });
// 야영지(포탈): 지역마다 하나, 마을 쪽 안쪽. 둘레 7은 지형 · 몬스터가 없는 안전지대
export const CAMPS = [];
export const inCamp = (x, z, pad = 0) => { const r = 7 + pad, r2 = r * r; for (let i = 0; i < CAMPS.length; i++) { const c = CAMPS[i], dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < r2) return c; } return null; }; // v0.49.56 매 프레임 불려 가볍게
const HAS_BANKS = new Set(['grassland', 'snowplains', 'desert']);
const LAVA_ZONES = new Set(['inferno', 'demongate', 'abyss', 'throne']);
function genTerrain(rng) {
  LAKES.length = 0; MESAS.length = 0;
  const clear = (x, z, r) => !nearBoss(x, z, r) && roadDist(x, z) > r + 5 && !inCamp(x, z, r + 3) && !ZONES.some((zn) => { const e = entranceOf(zn); return Math.hypot(e.x - x, e.z - z) < r + 4; }) && ![...LAKES, ...MESAS].some((q) => Math.hypot(q.x - x, q.z - z) < q.r + r + (q.ring ? 3 : 6));
  // ① 지역 경계: 언덕(물 많은 지역은 물)을 고리처럼 두르고, 길목(마을 쪽 길) · 샛길 두세 군데만 뚫는다
  const nearGate = (x, z, r) => roadDist(x, z) < r + 3.5 || !!inCamp(x, z, r + 2) || ZONES.some((zn) => { const e = entranceOf(zn); return Math.hypot(e.x - x, e.z - z) < r + 5; }) || Math.hypot(x, z) < TOWN.r + r + 3;
  for (const zn of ZONES) {
    const L = ZONE_LOOK[zn.id], wet = ['swamp', 'harbor', 'webwood', 'frost', 'bloodmire', 'crypt'].includes(zn.id) || LAVA_ZONES.has(zn.id);
    const bs = HAS_BANKS.has(L.set) ? L.set : 'grassland', top = bs !== L.set ? [L.set, L.ground[0]] : null;
    const base = { set: bs, top, lava: LAVA_ZONES.has(zn.id), chasm: L.set === 'ruins', floor: [L.set, L.ground[0]], gr: L.ground, ring: true, look: zn.id };
    const road = Math.atan2(-zn.z, -zn.x), gaps = [road, road + 1.6 + rng() * 1.2, road - 1.8 - rng() * 1.4];
    if (rng() < 0.5) gaps.pop();
    const circ = 2 * Math.PI * zn.r * 1.05;
    for (let k = 0, n = Math.round(circ / 5.2); k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (rng() - 0.5) * 0.05;
      if (gaps.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.2)) continue;
      const rr = zoneRadius(zn, a) * (1.02 + (rng() - 0.5) * 0.06), r = 3.4 + rng() * 1.6;
      const x = zn.x + Math.cos(a) * rr, z = zn.z + Math.sin(a) * rr;
      if (nearGate(x, z, r)) continue;
      (wet && rng() < 0.75 ? LAKES : MESAS).push({ x, z, r, ...base, lava: wet && base.lava });
    }
  }
  // ② 지역 사이 황야: 크고 작은 호수 · 언덕을 사슬처럼 이어 불규칙하게
  for (let k = 0, tries = 0; k < 34 && tries < 600; tries++) {
    const a = rng() * Math.PI * 2, d = TOWN.r + 12 + rng() * (WORLD_SIZE - TOWN.r - 20), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (zoneAt(x, z) || nearGate(x, z, 6)) continue;
    // v0.44.20 지역 가까운 황야 언덕 · 호수는 그 지역 땅으로 (눈밭 옆 풀 언덕이 어색하던 것)
    const nz = ZONES.reduce((b, q) => { const d = Math.hypot(x - q.x, z - q.z) - q.r; return d < b.d ? { q, d } : b; }, { q: null, d: 1e9 });
    // v0.44.33 땅 이어짐(지역 밖 9~15)과 같은 거리로 판단 · 동굴 · 폐허처럼 물가 타일이 없는 땅은 윗면만 그 땅으로 덮는다
    const NL0 = nz.q && nz.d < 12 ? ZONE_LOOK[nz.q.id] : null, NL = NL0 && NL0.set !== 'grassland' ? NL0 : null;
    const ws = NL && HAS_BANKS.has(NL.set) ? NL.set : 'grassland', wtop = NL && !HAS_BANKS.has(NL.set) ? [NL.set, NL.ground[0]] : null;
    const isLake = rng() < 0.45, base = { set: ws, top: wtop, lava: false, chasm: false, floor: NL ? [NL.set, NL.ground[0]] : ['grassland', 16], gr: NL ? NL.ground : null, look: NL ? nz.q.id : null };
    let px = x, pz = z, dir = rng() * Math.PI * 2;
    for (let c = 0, len = 2 + Math.floor(rng() * 4); c < len; c++) {
      const r = 3.5 + rng() * 3;
      if (zoneAt(px, pz) || nearGate(px, pz, r) || Math.hypot(px, pz) > WORLD_SIZE - 8) break;
      (isLake ? LAKES : MESAS).push({ x: px, z: pz, r, ...base, wild: true });
      dir += (rng() - 0.5) * 1.4; px += Math.cos(dir) * r * 1.3; pz += Math.sin(dir) * r * 1.3;
    }
    k++;
  }
  for (const zn of ZONES) {
    const L = ZONE_LOOK[zn.id];
    const bs = HAS_BANKS.has(L.set) ? L.set : 'grassland', top = bs !== L.set ? [L.set, L.ground[0]] : null, lava = LAVA_ZONES.has(zn.id);
    const chasm = L.set === 'ruins'; // 폐허는 물 대신 밑이 안 보이는 낭떠러지
    const base = { set: bs, top, lava, chasm, floor: [L.set, L.ground[0]], gr: L.ground, look: zn.id };
    const lakes = zn.id === 'swamp' ? 4 : L.set === 'ruins' ? 2 : LAVA_ZONES.has(zn.id) ? 3 : zn.id === 'harbor' ? 4 : 1 + (rng() < 0.6 ? 1 : 0);
    for (let k = 0, tries = 0; k < lakes && tries < 80; tries++) {
      const a = rng() * 6.28, d = rng() * zn.r * 0.75, r = 6.5 + rng() * 4;
      const x = zn.x + Math.cos(a) * d, z = zn.z + Math.sin(a) * d;
      if (clear(x, z, r)) { LAKES.push({ x, z, r, ...base }); k++; }
    }
    for (let k = 0, tries = 0; k < 2 && tries < 80; tries++) { // 언덕: 물가 타일의 물을 땅으로 바꿔 한 단 올린다
      const a = rng() * 6.28, d = zn.r * (0.25 + rng() * 0.55), r = 5 + rng() * 3.5;
      const x = zn.x + Math.cos(a) * d, z = zn.z + Math.sin(a) * d;
      if (clear(x, z, r)) { MESAS.push({ x, z, r, ...base, lava: false }); k++; }
    }
  }
}
// 던전 벽: 기둥 대신 그 지역 언덕(필드와 같은 절벽)을 길 둘레에 두른다
export let HILL_BACK = 1.3, HILL_R = 0.7; export const setHill = (b, r) => { HILL_BACK = b; HILL_R = r; };
function dungeonHills() {
  ZONES.forEach((zn, zi) => {
    const L = layout(zi), Z = ZONE_LOOK[zn.id];
    const bs = HAS_BANKS.has(Z.set) ? Z.set : 'grassland', top = bs !== Z.set ? [Z.set, Z.ground[0]] : null;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (L.at(i, j)) continue;
      let edge = false;
      for (let b = -1; b <= 1 && !edge; b++) for (let a = -1; a <= 1; a++) if (L.at(i + a, j + b)) { edge = true; break; }
      if (!edge) continue;
      // 언덕은 길에서 바깥쪽으로 물려 세운다 (언덕 둘레 절벽까지 길을 덮어 막던 문제)
      let ox = 0, oz = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (L.at(i + a, j + b)) { ox -= a; oz -= b; }
      const ol = Math.hypot(ox, oz) || 1, p = cellPos(zi, i + (ox / ol) * HILL_BACK, j + (oz / ol) * HILL_BACK);
      MESAS.push({ x: p.x, z: p.z, r: T * HILL_R, set: bs, top, lava: false, chasm: false, floor: [Z.set, Z.ground[0]], look: zn.id, dungeon: true });
    }
  });
}
const BK = 16, buckets = new Map();
function makeBuckets() { buckets.clear(); for (const list of [LAKES, MESAS]) { const m = new Map(); buckets.set(list, m); for (const q of list) { const R2 = q.r * 1.3 + 3; for (let bx = Math.floor((q.x - R2) / BK); bx <= Math.floor((q.x + R2) / BK); bx++) for (let bz = Math.floor((q.z - R2) / BK); bz <= Math.floor((q.z + R2) / BK); bz++) { const key = bx * 1000 + bz; if (!m.has(key)) m.set(key, []); m.get(key).push(q); } } } }
const blob = (list, x, z, k, pad = 0) => { const b = buckets.get(list).get(Math.floor(x / BK) * 1000 + Math.floor(z / BK)); if (b) for (const q of b) if (Math.hypot(x - q.x, z - q.z) < q.r * (1 + (noise(x * k, z * k + 31) - 0.5) * 0.45) + pad) return q; return null; };
// 칸(i, j) 단위로 판정해야 물가 · 절벽 타일이 맞물린다
const cellXZ = (i, j) => [(i - j) * STEP, (i + j) * STEP];
const lakeRaw = (i, j) => blob(LAKES, ...cellXZ(i, j), 0.9);
// 물가 타일로 못 그리는 모양(가는 목 · 마주 보는 땅)은 땅으로 메운다 — 두 번 다듬기
const lakeTrim1 = (i, j) => { const q = lakeRaw(i, j); return q && edgeKind((a, b) => !!lakeRaw(a, b), i, j) !== 'bad' ? q : null; };
const lakeMemo = new Map();
// 새 세상 만들기 (캐릭터마다 씨앗이 달라 지역 자리 · 크기 · 호수 · 언덕이 매번 다르다)
export let WORLD_SEED = 1;
export function generateWorld(seed) {
  WORLD_SEED = seed;
  const rng = seeded(seed);
  for (const zn of ZONES) {
    zn.bx ??= zn.x; zn.bz ??= zn.z;
    const a = Math.atan2(zn.bz, zn.bx) + (rng() - 0.5) * 0.32, d = Math.hypot(zn.bx, zn.bz) * 1.55 * (1 + (rng() - 0.5) * 0.08);
    zn.x = Math.cos(a) * d; zn.z = Math.sin(a) * d; zn.r = 55 + rng() * 8;
  }
  CAMPS.length = 0;
  for (const zn of ZONES) {
    let a = Math.atan2(-zn.z, -zn.x); const d = zoneRadius(zn, a) * 0.55, e = entranceOf(zn);
    // v0.44.20 던전 입구와 겹치지 않게: 10 안이면 둘레를 따라 비켜 놓는다
    for (let k = 0; k < 8 && Math.hypot(zn.x + Math.cos(a) * d - e.x, zn.z + Math.sin(a) * d - e.z) < 10; k++) a += 0.35 * (k % 2 ? -(k + 1) : k + 1);
    CAMPS.push({ zone: zn.id, x: zn.x + Math.cos(a) * d, z: zn.z + Math.sin(a) * d });
  }
  setDungeonSeed(seed);
  genTerrain(rng);
  dungeonHills();
  makeBuckets();
  lakeMemo.clear(); mesaMemo.clear(); tileCache.clear(); groundVer++;
}
const lakeCell = (i, j) => {
  const key = i * 100003 + j;
  if (lakeMemo.has(key)) return lakeMemo.get(key);
  const q = lakeTrim1(i, j), v = q && edgeKind((a, b) => !!lakeTrim1(a, b), i, j) !== 'bad' ? q : null;
  lakeMemo.set(key, v);
  return v;
};
const mesaRaw = (i, j) => blob(MESAS, ...cellXZ(i, j), 0.8);
const nearMesa = (i, j) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const q = mesaRaw(i + a, j + b); if (q) return q; } return null; };
const mesaFill1 = (i, j) => mesaRaw(i, j) || (nearMesa(i, j) && edgeKind((a, b) => !mesaRaw(a, b), i, j) === 'bad' ? nearMesa(i, j) : null);
const mesaMemo = new Map();
const mesaCell = (i, j) => {
  const key = i * 100003 + j;
  if (mesaMemo.has(key)) return mesaMemo.get(key);
  let v = mesaFill1(i, j);
  if (!v) { const q = nearMesa(i, j); if (q && edgeKind((a, b) => !mesaFill1(a, b), i, j) === 'bad') v = q; }
  mesaMemo.set(key, v);
  return v;
};
// 언덕 둘레(낮은 쪽) 칸
const mesaRing = (i, j) => { if (mesaCell(i, j)) return null; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const q = mesaCell(i + a, j + b); if (q) return q; } return null; };
export function inLake(x, z, pad = 0) {
  const i = Math.round((x + z) / (2 * STEP)), j = Math.round((z - x) / (2 * STEP));
  return lakeCell(i, j) || (pad > 0 ? blob(LAKES, x, z, 0.9, pad + 1.5) : null);
}
export const inMesa = (x, z) => { const i = Math.round((x + z) / (2 * STEP)), j = Math.round((z - x) / (2 * STEP)); return mesaCell(i, j) || mesaRing(i, j); };
// 테두리 칸 종류: 네 방향(북 j-1 · 동 i+1 · 남 j+1 · 서 i-1) 중 바깥(땅)인 쪽으로 고른다
const N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]], D4 = [[1, -1], [1, 1], [-1, 1], [-1, -1]]; // 북동 · 남동 · 남서 · 북서
function edgeKind(inside, i, j) {
  const o = N4.map(([a, b]) => !inside(i + a, j + b)), d = D4.map(([a, b]) => !inside(i + a, j + b));
  const n = o.filter(Boolean).length, key = o.map((v) => (v ? 1 : 0)).join('');
  if (n === 0) { const k = d.findIndex(Boolean); return k < 0 ? null : ['iNE', 'iSE', 'iSW', 'iNW'][k]; }
  if (n === 1) return ['N', 'E', 'S', 'W'][o.indexOf(true)];
  return { '1100': 'NE', '0110': 'ES', '0011': 'SW', '1001': 'NW' }[key] || 'bad';
}
// 물가: 물 안쪽 테두리 칸 (땅 쪽 방향 → 타일 두 벌)
// 묶음마다 물가 · 물 첫 번호 (사막은 옛 Flare 번호라 8 앞선다)
const WATER_BASE = { desert: [136, 168] }, wb = (set) => WATER_BASE[set] || [144, 176];
const bankId = (set, k, h) => BANK[k][h < 0.5 ? 0 : 1] - 144 + wb(set)[0];
const BANK = { W: [144, 148], N: [145, 149], E: [146, 150], S: [147, 151], NW: [152, 156], NE: [153, 157], ES: [154, 158], SW: [155, 159], iNW: [160, 164], iNE: [161, 165], iSE: [162, 166], iSW: [163, 167] };
// 절벽: 고원 안쪽 테두리 칸 (물건 층)
const CLIFF = { E: [48, 52], S: [49, 53], W: [50, 54], N: [51, 55], iSE: [56, 60], iSW: [57, 61], iNW: [58, 62], iNE: [59, 63], ES: [64, 68], SW: [65, 69], NW: [66, 70], NE: [67, 71] };
export const HILL_LIFT = 96; // 언덕 높이 = 물가 절벽 한 단 (화면 px)

function pick(look, h) { const L = ZONE_LOOK[look]; return [L.set, L.ground[0] + Math.floor(h * (L.ground[1] - L.ground[0] + 1))]; }

export function createStage(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const stage = {
    canvas, ctx, zoom: 1, userZoom: 1, cam: { x: 0, z: 0 }, W: 0, H: 0, pr: Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2),
    colliders: [], props: new Map(), flats: [], drawables: new Set(), groundLayers: [], topLayers: [], shakeK: 0, time: 0,
    light: true,
  };
  stage.resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * stage.pr); canvas.height = Math.round(h * stage.pr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    stage.W = w; stage.H = h;
    stage.baseZoom = Math.max(0.55, Math.min(1, h / 1000)); // 세로 1000px에서 Flare 원래 크기, 휴대폰은 0.5
  };
  stage.resize();
  window.addEventListener('resize', stage.resize);
  stage.setPixelRatio = (pr) => { stage.pr = pr; stage.resize(); };
  const Z = () => stage.baseZoom * stage.userZoom;
  stage.scale = Z;
  stage.toScreen = (x, z, y = 0) => ({ x: (x - stage.cam.x) * PX * Z() + stage.W / 2, y: (z - stage.cam.z) * PZ * Z() - y * PY * Z() + stage.H / 2 });
  stage.toWorld = (sx, sy) => ({ x: (sx - stage.W / 2) / (PX * Z()) + stage.cam.x, z: (sy - stage.H / 2) / (PZ * Z()) + stage.cam.z });
  stage.onScreen = (x, z, r = 3) => {
    const s = stage.toScreen(x, z), m = r * PX * Z();
    return s.x > -m && s.x < stage.W + m && s.y > -m * 1.5 && s.y < stage.H + m;
  };
  stage.shake = (k) => { stage.shakeK = Math.min(1, Math.max(stage.shakeK, k)); };
  stage.follow = (x, z, dt = 1) => {
    const k = Math.min(1, dt * 8);
    stage.cam.x += (x - stage.cam.x) * k;
    stage.cam.z += (z - stage.cam.z) * k;
    stage.shakeK = Math.max(0, stage.shakeK - dt * 2.5);
  };
  stage.add = (d) => stage.drawables.add(d);
  stage.remove = (d) => stage.drawables.delete(d?.drawable || d); // 캐릭터(Actor)를 넘겨도 그 그림을 지운다 (예전엔 몬스터 잔상이 남았다)
  stage.scene = { add: stage.add, remove: stage.remove }; // 예전 코드와 맞춤
  stage.render = (dt) => render(stage, dt);
  stage.debugColliders = false;
  return stage;
}

// ───── 배경 물건 ─────
const CHUNK = 16;
// v0.46 숨은 던전 입구: 지역 던전 입구와 같은 문 · 동굴 + 횃불 (게임 중에 생기고 없어진다)
export function addGateProps(stage, zn, x, z) {
  const set = ZONE_LOOK[zn.id]?.set;
  const [ds, di] = set === 'ruins' ? ['ruins', 250] : set === 'desert' ? ['desert', 184] : set === 'cave' ? ['dungeon', 116] : ['dungeon', 113];
  return [addProp(stage, ds, di, x, z - 1.2, 0), addProp(stage, 'dungeon', 167, x - 1.8, z - 0.6, 0), addProp(stage, 'dungeon', 167, x + 1.8, z - 0.6, 0)].filter(Boolean);
}
export function removeProps(stage, list) {
  for (const p of list || []) { const key = Math.floor(p.x / CHUNK) + ',' + Math.floor(p.z / CHUNK), arr = stage.props.get(key); if (arr) { const i = arr.indexOf(p); if (i >= 0) arr.splice(i, 1); } const f = stage.flats.indexOf(p); if (f >= 0) stage.flats.splice(f, 1); }
}
function addProp(stage, set, id, x, z, r, lift = 0) {
  const t = DATA.tiles[set]?.tiles[id];
  if (!t) return;
  const p = { set, id, x, z, t, lift };
  if (FLAT.has(set + '|' + id)) stage.flats.push(p);
  else {
    const key = Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);
    if (!stage.props.has(key)) stage.props.set(key, []);
    stage.props.get(key).push(p);
  }
  if (r > 0) stage.colliders.push({ x, z, r });
  return p;
}

export function buildWorldProps(stage) {
  const rng = seeded(1234);
  // v0.49.24 드라이브 나무: 나무마다 그림 한 장 (칸 = [그림 번호, 0, 0, 가로, 세로, 기준 x, 기준 y, 배율])
  DATA.tiles.dtrees ||= { imgs: Object.keys(DRIVE_TREES).map((k) => `../drive/trees/tree${String(k).padStart(2, '0')}_0.webp`),
    tiles: Object.fromEntries(Object.entries(DRIVE_TREES).map(([k, [w, ax, ay]], i) => [k, [i, 0, 0, w, 360, ax, ay, 1.35]])) };
  DATA.tiles.drocks ||= { imgs: Object.keys(DRIVE_ROCKS).map((k) => `../drive/props/rock${String(k).padStart(2, '0')}.webp`),
    tiles: Object.fromEntries(Object.entries(DRIVE_ROCKS).map(([k, [w, h, ax, ay]], i) => [k, [i, 0, 0, w, h, ax, ay, 1]])) }; // v0.50.1 동굴 바위
  const roadClear = (x, z) => {
    if (Math.hypot(x, z) < TOWN.r + 8) return false;
    for (const zn of ZONES) if (distToSeg(x, z, 0, 0, zn.x * 0.72, zn.z * 0.72) < 4.5) return false;
    return true;
  };
  // 호수 · 고원: 칸마다 판정, 고원 테두리는 절벽 타일, 안쪽은 들어 올린 땅
  const cells = (list, inside) => {
    const out = [];
    for (const q of list) {
      const ci = Math.round((q.x + q.z) / (2 * STEP)), cj = Math.round((q.z - q.x) / (2 * STEP)), R = Math.ceil(q.r * 1.4 / STEP);
      for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) if (inside(i, j) === q) out.push([i, j, q]);
    }
    return out;
  };
  for (const [i, j] of cells(LAKES, lakeCell)) { const [x, z] = cellXZ(i, j); stage.colliders.push({ x, z, r: 1.15 }); }
  // 언덕: 윗면은 땅 타일을 한 단 올리고, 둘레는 '바닥이 땅인 물가 타일'을 한 단 올려 절벽을 만든다
  for (const [i, j, q] of cells(MESAS, (a, b) => mesaCell(a, b) || mesaRing(a, b))) {
    const [x, z] = cellXZ(i, j), h = hash(i, j), set = q.set;
    const L = ZONE_LOOK[q.look || zoneAt(x, z)?.id || 'wild'], floor = L.ground;
    // 던전 바닥 위에는 언덕 충돌을 두지 않는다 (바닥 밖은 dungeonAt이 막는다)
    const solid = !(q.dungeon && dungeonAt(x, z) >= 0);
    if (mesaCell(i, j)) {
      if (solid) stage.colliders.push({ x, z, r: 1.15 });
      addProp(stage, L.set, floor[0] + Math.floor(h * (floor[1] - floor[0] + 1)), x, z, 0, HILL_LIFT);
    } else {
      const k = edgeKind((a, b) => !mesaCell(a, b), i, j);
      if (!k || k === 'bad') continue;
      if (solid) stage.colliders.push({ x, z, r: 0.95 });
      const id = bankId(set, k, h), p = { set, id, x, z, t: DATA.tiles[set].tiles[id], lift: HILL_LIFT, bank: [L.set, floor[0]], top: q.top };
      const key = Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);
      if (!stage.props.has(key)) stage.props.set(key, []);
      stage.props.get(key).push(p);
    }
  }
  // 물가 둘레에 갈대 · 바위
  for (const q of LAKES) for (let i = 0; i < (q.ring || q.wild ? 5 : 22); i++) {
    const a = rng() * 6.28, d = q.r * (1.1 + rng() * 0.25), x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d;
    if (inLake(x, z, 0.6) || inMesa(x, z) || inMesa(x + 1.5, z + 1.5) || inMesa(x - 1.5, z + 1.5)) continue;
    if (q.top) continue; // 폐허 · 동굴은 지역 소품으로 충분
    const shore = q.set === 'snowplains' ? [[552, 567, 0], [112, 115, 0]] : q.set === 'desert' ? [[104, 119, 0], [120, 127, 0.6]] : [[114, 115, 0], [124, 127, 0], [128, 131, 0.6]];
    const [a0, a1, rr] = shore[Math.floor(rng() * shore.length)];
    addProp(stage, q.set, a0 + Math.floor(rng() * (a1 - a0 + 1)), x, z, rr);
  }
  // 던전: 바닥 군데군데 뼈 · 횃불 (벽은 dungeonHills의 언덕), 우두머리 터 네 귀퉁이에 석상
  for (let zi = 0; zi < ZONES.length; zi++) {
    const L = layout(zi), rr = seeded(900 + zi);
    for (let j2 = 0; j2 < N; j2++) for (let i2 = 0; i2 < N; i2++) {
      if (!L.at(i2, j2)) continue;
      const p = cellPos(zi, i2, j2);
      if (rr() < 0.03) addProp(stage, 'dungeon', 176 + Math.floor(rr() * 8), p.x + (rr() - 0.5), p.z + (rr() - 0.5), 0);
      else if (rr() < 0.012 && L.dist[j2 * N + i2] > 3) addProp(stage, 'dungeon', 167, p.x, p.z, 0.4);
    }
    const bp = cellPos(zi, L.boss[0], L.boss[1]);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addProp(stage, 'dungeon', 128 + Math.floor(rr() * 4), bp.x + a * T * 4.5, bp.z + b * T * 4.5, 0.6);
  }
  DATA.tiles.portalNG ||= { imgs: DATA.tiles.grassland.imgs, tiles: { 265: DATA.tiles.grassland.tiles[265] } };
  for (const c of CAMPS) {
    addProp(stage, ZONE_LOOK[c.zone]?.set === 'grassland' ? 'grassland' : 'portalNG', 265, c.x, c.z, 0);
    // v0.44.20 포탈 둘레 화로는 없앴다 (비대칭 · 멈춘 불이라 어색)
  }
  // 지역마다 던전 입구: 지형에 맞는 문 · 동굴 입구 + 양옆 횃불 (문 자체는 막혀 있고, 바로 앞에 서면 들어갈지 묻는다)
  for (const zn of ZONES) {
    const e = entranceOf(zn), set = ZONE_LOOK[zn.id].set;
    const [ds, di] = set === 'ruins' ? ['ruins', 250] : set === 'desert' ? ['desert', 184] : set === 'cave' ? ['dungeon', 116] : ['dungeon', 113];
    addProp(stage, ds, di, e.x, e.z - 1.2, 1.1);
    addProp(stage, 'dungeon', 167, e.x - 1.8, e.z - 0.6, 0.3); addProp(stage, 'dungeon', 167, e.x + 1.8, e.z - 0.6, 0.3);
  }
  const free = (x, z) => !inLake(x, z, 1.5) && !inLake(x + 1.5, z) && !inLake(x - 1.5, z) && !inMesa(x, z) && !inMesa(x + 1.5, z + 1.5) && !inMesa(x - 1.5, z);
  for (const zn of ZONES) {
    for (const [set, ids, n, r] of ZONE_PROPS[zn.id] || []) {
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * zn.r * 1.05;
        const x = zn.x + Math.cos(a) * d, z = zn.z + Math.sin(a) * d;
        if (!roadClear(x, z) || !free(x, z) || nearBoss(x, z, -3)) continue;
        addProp(stage, set, ids[Math.floor(rng() * ids.length)], x, z, r);
      }
    }
  }
  // 지역 사이 들판
  for (let i = 0; i < 1400; i++) {
    const x = (rng() * 2 - 1) * WORLD_SIZE, z = (rng() * 2 - 1) * WORLD_SIZE;
    if (Math.hypot(x, z) > WORLD_SIZE - 4 || zoneAt(x, z) || !roadClear(x, z)) continue;
    const list = ZONE_PROPS.wild.flatMap(([set, ids, w, r]) => Array(w).fill([set, ids, r]));
    const [set, ids, r] = list[Math.floor(rng() * list.length)];
    addProp(stage, set, ids[Math.floor(rng() * ids.length)], x, z, r);
  }
  // 맵 테두리: 빽빽한 숲
  for (let k = 0; k < 2; k++) for (let i = 0; i < 520; i++) {
    const a = (i / 520) * Math.PI * 2 + rng() * 0.01, r = WORLD_SIZE + 1.5 + k * 3 + rng() * 2;
    addProp(stage, 'grassland', [248, 249, 250, 251, 244, 245, 252][Math.floor(rng() * 7)], Math.cos(a) * r, Math.sin(a) * r, 0);
  }
  buildTown(stage, rng);
}

// 여명 초소: 귀환 차원문만 (v0.49.55 흩어진 상자 · 통 · 표지판은 치웠다). 둘레를 나무로 두르고, 사냥터로 가는 길만 비운다
function buildTown(stage, rng) {
  addProp(stage, 'grassland', 265, 0, -2, 0);
  const R = TOWN.r, onRoad = (x, z) => ZONES.some((zn) => distToSeg(x, z, 0, 0, zn.x * 0.72, zn.z * 0.72) < 4.2);
  const IDS = [1, 2, 8, 9, 11, 12, 13];
  for (let row = 0; row < 3; row++) {
    const r = R + 1.2 + row * 2.4, n = Math.round((Math.PI * 2 * r) / 2.3);
    for (let i = 0; i < n; i++) {
      const a = ((i + (row % 2) * 0.5) / n) * Math.PI * 2, front = Math.max(0, Math.cos(a) + Math.sin(a)) / Math.SQRT2, rr = r + front * 4 + (rng() - 0.5) * 0.8, x = Math.cos(a) * rr, z = Math.sin(a) * rr; // 화면 아래쪽(앞) 나무는 건물을 가리지 않게 더 바깥에
      if (onRoad(x, z) || inLake(x, z, 1) || inMesa(x, z)) continue;
      addProp(stage, 'dtrees', IDS[Math.floor(rng() * IDS.length)], x, z, row === 0 ? 1.1 : 0.9);
    }
  }
}
export function buildTerrain() {}

// 지도 색: 위에서 본 지형 한 점
export function mapColor(x, z) {
  if (Math.hypot(x, z) > WORLD_SIZE) return null;
  if (Math.hypot(x, z) < TOWN.r) return [120, 96, 62];
  const lk = inLake(x, z);
  if (lk) return lk.lava ? [200, 80, 20] : lk.chasm ? [8, 8, 12] : [40, 90, 140];
  const zn = zoneAt(x, z), base = zn ? zn.ground.map((v) => Math.round(v * 255 * 0.9 + 20)) : [62, 60, 44];
  if (inMesa(x, z)) return base.map((v) => Math.round(v * 0.55 + 40));
  if (ZONES.some((q) => distToSeg(x, z, 0, 0, q.x * 0.72, q.z * 0.72) < 2.4)) return [150, 128, 90];
  return base;
}

// ───── 충돌 (칸 격자로 가까운 것만) ─────
const CELL = 8;
function grid(stage) {
  if (stage.grid && stage.gridN === stage.colliders.length) return stage.grid;
  const g = new Map();
  for (const c of stage.colliders) {
    const r = c.r + 1;
    for (let gx = Math.floor((c.x - r) / CELL); gx <= Math.floor((c.x + r) / CELL); gx++)
      for (let gz = Math.floor((c.z - r) / CELL); gz <= Math.floor((c.z + r) / CELL); gz++) {
        const k = gx * 10007 + gz;
        if (!g.has(k)) g.set(k, []);
        g.get(k).push(c);
      }
  }
  stage.grid = g; stage.gridN = stage.colliders.length;
  return g;
}
export function resolveCollision(stage, p, radius = 0.5) {
  const list = grid(stage).get(Math.floor(p.x / CELL) * 10007 + Math.floor(p.z / CELL)) || [];
  for (const c of list) {
    const dx = p.x - c.x, dz = p.z - c.z;
    const min = c.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      p.x = c.x + (dx / d) * min;
      p.z = c.z + (dz / d) * min;
    }
  }
  if (farSide(p.x)) return;
  const d = Math.hypot(p.x, p.z);
  if (d > WORLD_SIZE) { p.x *= WORLD_SIZE / d; p.z *= WORLD_SIZE / d; }
}

// ───── 그리기 ─────
const tileCache = new Map();
function tileAt(i, j) {
  const k = i * 100003 + j;
  let t = tileCache.get(k);
  if (!t) { t = groundAt(i, j); tileCache.set(k, t); if (tileCache.size > 60000) tileCache.clear(); }
  return t;
}
// v0.44.20 풀밭이 아닌 지역의 포탈: 마법진 그림에 붙은 풀 바닥을 지운 사본 (눈 · 사막 · 동굴에 풀 네모가 보이던 것)
const nograssCache = new Map();
function nograss(set, id) {
  const key = set + id; let c = nograssCache.get(key);
  if (c !== undefined) return c;
  const def = DATA.tiles[set], t = def?.tiles[id], src = t && image(def.imgs[t[0]]);
  if (!src?.ok) return null;
  c = document.createElement('canvas'); c.width = t[3]; c.height = t[4];
  const g = c.getContext('2d'); g.drawImage(src.im, t[1], t[2], t[3], t[4], 0, 0, t[3], t[4]);
  const im = g.getImageData(0, 0, t[3], t[4]), d = im.data;
  for (let q = 0; q < d.length; q += 4) { const r = d[q], gg = d[q + 1], b = d[q + 2]; if (gg > b + 6 && gg >= r - 4 && Math.max(r, gg, b) - Math.min(r, gg, b) > 10) d[q + 3] = 0; } // 풀빛(녹 · 황록) 픽셀만
  g.putImageData(im, 0, 0); nograssCache.set(key, c); return c;
}
function drawTile(stage, ctx, set, id, sx, sy, s) {
  if (set === 'portalNG') { const c = nograss('grassland', id), t = DATA.tiles.grassland?.tiles[id]; if (c) drawRect(ctx, c, [0, 0, t[3], t[4], t[5], t[6]], sx, sy, s); return; }
  const def = DATA.tiles[set];
  const t = def?.tiles[id];
  if (!t) return;
  const src = image(def.imgs[t[0]]);
  if (!src.ok) return;
  if (set === 'drocks' || CAST_SHADOW.has(set + '|' + id)) castShadow(ctx, set, id, src.im, t, sx, sy, s * (t[7] || 1));
  drawRect(ctx, src.im, t._r || (t._r = t.slice(1)), sx, sy, s * (t[7] || 1)); // t[7]: 그림 배율 (드라이브 나무) · v0.49.56 잘라 둔 칸을 다시 쓴다
}
// v0.50.2 그림에 그림자가 없는 바위 · 돌기둥: 검은 실루엣을 땅에 눕혀 나무 그림자와 같은 쪽(오른쪽 아래)으로 드리운다
const CAST_SHADOW = new Set(['desert|120', 'desert|121', 'desert|122', 'desert|123', 'desert|124', 'desert|125', 'desert|126', 'desert|127']);
const shadowCache = new Map();
function castShadow(ctx, set, id, im, t, sx, sy, s) {
  const key = set + '|' + id;
  let c = shadowCache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = t[3]; c.height = t[4];
    const g = c.getContext('2d'); g.drawImage(im, t[1], t[2], t[3], t[4], 0, 0, t[3], t[4]);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = '#000'; g.fillRect(0, 0, t[3], t[4]);
    shadowCache.set(key, c);
  }
  // 그림 안 점 (x, y; 기준점 아래 0, 위로 음수) → 땅: 오른쪽으로 0.75, 아래로 0.2만큼 눕는다
  ctx.save(); ctx.globalAlpha = 0.32;
  ctx.translate(sx, sy); ctx.transform(s, 0, -0.75 * s, -0.2 * s, 0, 0); // 기존 변환(화면 배율) 위에 더한다
  ctx.drawImage(c, -t[5], -t[6]);
  ctx.restore();
}

// 물 타일: Flare 물은 거의 검어서 푸르게 물들인 사본을 한 번 만들어 쓴다
const waterCache = new Map();
function drawWater(ctx, set, id, sx, sy, s) {
  const key = set + id;
  let c = waterCache.get(key);
  if (!c) {
    const def = DATA.tiles[set], t = def?.tiles[id], src = t && image(def.imgs[t[0]]);
    if (!src?.ok) return;
    c = document.createElement('canvas'); c.width = t[3]; c.height = t[4];
    const g = c.getContext('2d');
    g.drawImage(src.im, t[1], t[2], t[3], t[4], 0, 0, t[3], t[4]);
    // 물 빛깔: 어두운 물 픽셀만 (물가 바위 · 풀 · 그늘의 순수한 검정은 그대로)
    const im = g.getImageData(0, 0, t[3], t[4]), d = im.data, [tr, tg, tb] = set === 'snowplains' ? [120, 170, 210] : [40, 115, 140];
    for (let q = 0; q < d.length; q += 4) {
      if (!d[q + 3]) continue;
      const r = d[q], gg = d[q + 1], b = d[q + 2], lum = (r + gg + b) / 3;
      if (lum > 50 || lum < 2 || r > b + 7 || r > gg + 7) continue; // 물은 푸르스름한 어둠: 붉은 · 갈색 바위 그늘은 두기
      const k = 0.5;
      d[q] = r + (tr - r) * k * 0.9; d[q + 1] = gg + (tg - gg) * k * 0.9; d[q + 2] = b + (tb - b) * k;
    }
    g.putImageData(im, 0, 0);
    c.t = t; waterCache.set(key, c);
  }
  const t = c.t;
  ctx.drawImage(c, sx - t[5] * s, sy - t[6] * s, t[3] * s, t[4] * s);
}

// 호수 · 언덕 테두리 타일을 미리 만들어 둔다 (처음 보일 때 픽셀을 고치느라 멈추지 않게). 조금씩 나눠서
export async function warmTerrain() {
  const jobs = [];
  for (const q of LAKES) for (let id = 0; id < 24; id++) jobs.push(() => {
    const set = q.set, bid = wb(set)[0] + id;
    if (q.lava || q.top) drawBank(warmCtx(), set, bid, q.lava ? 'lava' : null, q.top, 0, 0, 1); else drawWater(warmCtx(), set, bid, 0, 0, 1);
  });
  for (const q of LAKES) for (let id = 0; id < 16; id++) jobs.push(() => { const set = q.set; if (q.lava || q.top) drawBank(warmCtx(), set, wb(set)[1] + id, q.lava ? 'lava' : null, q.top, 0, 0, 1); else drawWater(warmCtx(), set, wb(set)[1] + id, 0, 0, 1); });
  for (const q of MESAS) for (let id = 0; id < 24; id++) jobs.push(() => { const L = ZONE_LOOK[q.look || zoneAt(q.x, q.z)?.id || 'wild']; drawBank(warmCtx(), q.set, wb(q.set)[0] + id, [L.set, L.ground[0]], q.top, 0, 0, 1); });
  for (const j of jobs) { j(); await new Promise((r) => setTimeout(r, 0)); }
}
let wc = null;
const warmCtx = () => (wc ||= document.createElement('canvas').getContext('2d'));

// 물가 타일 고쳐 그리기: 물 픽셀(low) → 땅 무늬 · 용암 · 물빛, 윗면 풀(top) → 그 지역 땅 무늬. 격자에 맞춰 이어진다
// 무늬 판: 칸 중심이 (96 + 96m, 48 + 48n), m + n 짝수 — 그림의 칸 중심은 판의 (288, 144)에 맞춘다
const patternCache = new Map();
function pattern(set, id, lava) {
  const key = set + id + (lava ? String(lava) : '');
  if (patternCache.has(key)) return patternCache.get(key);
  const def = DATA.tiles[set], ft = def?.tiles[id], fsrc = ft && image(def.imgs[ft[0]]);
  if (!fsrc?.ok) return null;
  const F = document.createElement('canvas'); F.width = 576; F.height = 384;
  const fg = F.getContext('2d');
  // 물 타일은 한 칸 아래에 그려지는 그림이라 한 칸 올려 깐다
  const dy = ft[6] < 0 ? -96 : 0;
  for (let m = -1; m <= 6; m++) for (let n = -2; n <= 9; n++) if ((m + n) % 2 === 0) fg.drawImage(fsrc.im, ft[1], ft[2], ft[3], ft[4], 96 + 96 * m - ft[5], 48 + 48 * n - ft[6] + dy, ft[3], ft[4]);
  const im = fg.getImageData(0, 0, 576, 384);
  if (lava === 'chasm') { // 낭떠러지: 밑이 안 보이게 검게, 물 무늬를 옅은 안개처럼만 남긴다
    const d = im.data;
    for (let q = 0; q < d.length; q += 4) {
      const px = (q / 4) % 576, py = Math.floor(q / 4 / 576);
      const fog = 0.5 + 0.5 * Math.sin(px * 0.021 + Math.sin(py * 0.05) * 2) * Math.sin(py * 0.033);
      const l = ((d[q] + d[q + 1] + d[q + 2]) / 3) / 60;
      const v = 4 + fog * 14 + l * 6;
      d[q] = v * 0.8; d[q + 1] = v * 0.8; d[q + 2] = v * 1.05; d[q + 3] = 255;
    }
  } else if (lava) { // 용암: 물 무늬의 밝기를 붉은 · 주황 · 노랑으로
    const d = im.data;
    for (let q = 0; q < d.length; q += 4) {
      const l = Math.min(1, ((d[q] + d[q + 1] + d[q + 2]) / 3) / 45), w = 0.5 + 0.5 * Math.sin((q / 4 % 576) * 0.05 + Math.floor(q / 4 / 576) * 0.08);
      const k = Math.min(1, l * 0.8 + w * 0.35);
      d[q] = 150 + 105 * k; d[q + 1] = 30 + 150 * k * k; d[q + 2] = 10 + 40 * k * k * k; d[q + 3] = 255;
    }
  }
  patternCache.set(key, im.data);
  return im.data;
}
const bankCache = new Map();
function drawBank(ctx, set, id, low, top, sx, sy, s) {
  const key = set + id + '|' + low + '|' + top;
  let c = bankCache.get(key);
  if (!c) {
    const def = DATA.tiles[set], t = def?.tiles[id], src = t && image(def.imgs[t[0]]);
    if (!src?.ok) return;
    const lowP = low === 'lava' ? pattern(set, wb(set)[1], true) : low === 'chasm' ? pattern(set, wb(set)[1], 'chasm') : low ? pattern(low[0], low[1]) : null;
    const topP = top ? pattern(top[0], top[1]) : null;
    if ((low && !lowP) || (top && !topP)) return;
    c = document.createElement('canvas'); c.width = t[3]; c.height = t[4];
    const g = c.getContext('2d');
    g.drawImage(src.im, t[1], t[2], t[3], t[4], 0, 0, t[3], t[4]);
    const im = g.getImageData(0, 0, t[3], t[4]), d = im.data, W = t[3];
    const ox = 288 - t[5], oy = 144 - t[6];
    for (let q = 0; q < d.length; q += 4) {
      if (!d[q + 3]) continue;
      const r = d[q], gg = d[q + 1], b = d[q + 2], lum = (r + gg + b) / 3;
      const water = !(lum > 50 || lum < 2 || r > b + 7 || r > gg + 7);
      const grass = !water && gg > b + 12 && r < gg + 6; // 풀: 초록 ~ 누런 풀 (바위는 붉어서 빠진다)
      const P = water ? lowP : grass ? topP : null;
      if (!P) continue;
      const px = (q / 4) % W, py = Math.floor(q / 4 / W), f = ((py + oy) * 576 + px + ox) * 4;
      if (f < 0 || f >= P.length) continue;
      d[q] = P[f]; d[q + 1] = P[f + 1]; d[q + 2] = P[f + 2]; d[q + 3] = 255;
    }
    if (low === 'chasm') { // 절벽 아랫부분은 아래로 갈수록 어둠 속으로 흐리게
      const H = t[4];
      for (let q = 0; q < d.length; q += 4) {
        const py = Math.floor(q / 4 / W), k = (py - t[6] - 10) / (H - t[6] - 10);
        if (k <= 0 || !d[q + 3]) continue;
        const f = Math.max(0, 1 - k * 1.6);
        d[q] *= f; d[q + 1] *= f; d[q + 2] *= f * 1.05;
      }
    }
    g.putImageData(im, 0, 0);
    c.t = t; bankCache.set(key, c);
  }
  const t = c.t;
  ctx.drawImage(c, sx - t[5] * s, sy - t[6] * s, t[3] * s, t[4] * s);
}

export let groundVer = 1; // 세상이 바뀌면 올려 땅 판을 다시 그린다
export const groundDirty = () => { groundVer++; };
// 땅 타일 그리기 (판에 한 번)
function drawGround(stage, ctx, W, H, s, M) {
  const c0 = stage.toWorld(-100 - M, -100 - M), c1 = stage.toWorld(W + 100 + M, H + 160 + M);
  const ti = (x, z) => [(x + z) / (2 * STEP), (z - x) / (2 * STEP)];
  const pts = [ti(c0.x, c0.z), ti(c1.x, c0.z), ti(c0.x, c1.z), ti(c1.x, c1.z)];
  const i0 = Math.floor(Math.min(...pts.map((p) => p[0]))), i1 = Math.ceil(Math.max(...pts.map((p) => p[0])));
  const j0 = Math.floor(Math.min(...pts.map((p) => p[1]))), j1 = Math.ceil(Math.max(...pts.map((p) => p[1])));
  const wets = [];
  for (let dd = i0 + j0; dd <= i1 + j1; dd++) for (let i = Math.max(i0, dd - j1); i <= Math.min(i1, dd - j0); i++) {
    const j = dd - i;
    const x = (i - j) * STEP, z = (i + j) * STEP;
    if (x < c0.x - 4 || x > c1.x + 4 || z < c0.z - 4 || z > c1.z + 4) continue;
    if (!farSide(x) && Math.hypot(x, z) > WORLD_SIZE + 12) continue;
    const [set, id, wet, lake] = tileAt(i, j);
    if (set === 'void') continue;
    const p = stage.toScreen(x, z);
    if (lake && (lake.lava || lake.top)) drawBank(ctx, set, id, lake.lava ? 'lava' : lake.chasm ? 'chasm' : null, lake.top, p.x, p.y, s);
    else if (wet || (set !== 'cave' && id >= wb(set)[0] && id < wb(set)[0] + 24)) drawWater(ctx, set, id, p.x, p.y, s); else drawTile(stage, ctx, set, id, p.x, p.y, s);
    if (false) {
      const w = 97 * s, h = 48.5 * s, k = 0.5 + 0.5 * Math.sin(stage.time * 1.6 + x * 0.7 + z * 0.9);
      ctx.fillStyle = set === 'snowplains' ? `rgba(120,170,210,${0.32 + k * 0.08})` : `rgba(40,110,140,${0.36 + k * 0.1})`;
      const wy = p.y + 96 * s;
      ctx.beginPath(); ctx.moveTo(p.x - w, wy); ctx.lineTo(p.x, wy - h); ctx.lineTo(p.x + w, wy); ctx.lineTo(p.x, wy + h); ctx.fill();
      if (k > 0.85) { ctx.fillStyle = 'rgba(200,235,255,0.12)'; ctx.fillRect(p.x - w * 0.3, wy - 2 * s, w * 0.5, 2 * s); }
    }
  }
}

const drawList = [];
const byZ = (a, b) => (a.z < b.z ? -1 : a.z > b.z ? 1 : 0); // v0.49.56 빼기(소수)를 돌려주면 정렬 비교마다 숫자 객체가 생겼다
const pushVisible = (d) => { if (d.visible !== false) drawList.push(d); };
// 덩어리 이름 문자열 (매 프레임 새로 만들지 않게 기억)
const CK = new Map();
const chunkKey = (a, b) => { const n = (a + 2048) * 4096 + (b + 2048); let k = CK.get(n); if (k === undefined) { k = a + ',' + b; CK.set(n, k); } return k; };
function render(stage, dt) {
  stage.time += dt;
  const { ctx, W, H } = stage;
  const s = stage.scale();
  ctx.setTransform(stage.pr, 0, 0, stage.pr, 0, 0);
  // 흔들림
  if (stage.shakeK > 0.001) { const k = stage.shakeK * stage.shakeK * 10; ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k); }
  ctx.fillStyle = '#0d0c0b';
  ctx.fillRect(-20, -20, W + 40, H + 40);
  // 땅: 미리 그려 둔 판(화면 + 둘레 GM px)을 카메라만큼 밀어 붙인다. 판 밖으로 벗어나거나 확대가 바뀌면 다시 그린다
  const GM = 220, Zs = s;
  let gc = stage.gcache;
  const camPx = (c) => ({ x: c.x * PX * s, y: c.z * PZ * s });
  const now = camPx(stage.cam);
  if (!gc || gc.ver !== groundVer || gc.s !== Zs || gc.W !== W || gc.H !== H || Math.abs(now.x - gc.px.x) > GM - 20 || Math.abs(now.y - gc.px.y) > GM - 20) {
    gc = stage.gcache ||= { c: document.createElement('canvas') };
    gc.c.width = Math.ceil((W + GM * 2) * stage.pr); gc.c.height = Math.ceil((H + GM * 2) * stage.pr);
    gc.ver = groundVer; gc.s = Zs; gc.W = W; gc.H = H; gc.px = now;
    const g = gc.c.getContext('2d');
    g.setTransform(stage.pr, 0, 0, stage.pr, GM * stage.pr, GM * stage.pr);
    drawGround(stage, g, W, H, s, GM);
  }
  ctx.drawImage(gc.c, 0, 0, gc.c.width, gc.c.height, -GM + (gc.px.x - now.x), -GM + (gc.px.y - now.y), W + GM * 2, H + GM * 2);
  const c0 = stage.toWorld(-100, -100), c1 = stage.toWorld(W + 100, H + 160);
  for (const f of stage.flats) {
    if (!stage.onScreen(f.x, f.z, 3)) continue;
    const p = stage.toScreen(f.x, f.z);
    drawTile(stage, ctx, f.set, f.id, p.x, p.y, s);
  }
  for (const g of stage.groundLayers) g(ctx, stage);
  // 서 있는 것들: 배경 물건 + 인물 + 효과를 z(화면 아래쪽)로 정렬
  const list = drawList; list.length = 0; // v0.49.56 그릴 목록 배열을 매 프레임 새로 만들지 않는다
  const cx0 = Math.floor(c0.x / CHUNK) - 1, cx1 = Math.floor(c1.x / CHUNK) + 1, cz0 = Math.floor(c0.z / CHUNK) - 1, cz1 = Math.floor(c1.z / CHUNK) + 2;
  for (let a = cx0; a <= cx1; a++) for (let b = cz0; b <= cz1; b++) {
    const arr = stage.props.get(chunkKey(a, b));
    if (arr) for (let i = 0; i < arr.length; i++) list.push(arr[i]);
  }
  stage.drawables.forEach(pushVisible); // Set: forEach는 반복자 객체를 만들지 않는다
  list.sort(byZ);
  // 화면 밖 타일 물건은 건너뛴다 (덩어리 단위로만 고르면 화면 몇 배를 그렸다)
  const offX0 = -260, offX1 = W + 260, offY0 = -60, offY1 = H + 420;
  for (const o of list) {
    if (o.t) { const p = stage.toScreen(o.x, o.z); if (p.x < offX0 || p.x > offX1 || p.y < offY0 || p.y > offY1) continue; }
    if (o.t && o.bank) { const p = stage.toScreen(o.x, o.z); drawBank(ctx, o.set, o.id, o.bank, o.top, p.x, p.y - o.lift * s, s); }
    else if (o.t && o.lift) { const p = stage.toScreen(o.x, o.z); drawTile(stage, ctx, o.set, o.id, p.x, p.y - o.lift * s, s * 1.02); }
    else if (o.t && o.wall && o.z > stage.cam.z && Math.abs(o.x - stage.cam.x) + (o.z - stage.cam.z) < 7) { // 앞을 가리는 던전 벽은 비쳐 보이게
      const p = stage.toScreen(o.x, o.z); ctx.globalAlpha = 0.3; drawTile(stage, ctx, o.set, o.id, p.x, p.y, s); ctx.globalAlpha = 1;
    } else if (o.t) { const p = stage.toScreen(o.x, o.z); drawTile(stage, ctx, o.set, o.id, p.x, p.y, s); }
    else o.draw(ctx, stage);
  }
  for (const g of stage.topLayers) g(ctx, stage);
  if (stage.debugColliders) { ctx.strokeStyle = '#f0f'; for (const c of stage.colliders) { if (!stage.onScreen(c.x, c.z, c.r + 2)) continue; const p = stage.toScreen(c.x, c.z); ctx.beginPath(); ctx.ellipse(p.x, p.y, c.r * PX * s, c.r * PZ * s, 0, 0, 7); ctx.stroke(); } }
  // 조명: 지역 색감 + 플레이어 둘레만 밝은 어둠 (디아블로식)
  const zn = zoneAt(stage.cam.x, stage.cam.z);
  const grade = ZONE_LOOK[zn ? zn.id : Math.hypot(stage.cam.x, stage.cam.z) < TOWN.r ? 'town' : 'wild']?.grade;
  if (grade) { const a = +(grade.match(/,\s*([\d.]+)\)$/)?.[1] || 0.2); ctx.globalAlpha = Math.min(1, 0.16 / a); ctx.fillStyle = grade; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; } // v0.44.67 지역 색감은 빛깔만 (너무 어두워지던 것: 최대 0.16)
  // v0.44.44 범람지: 어둡고 붉게 (stage.flooded = 범람한 지역 id 목록, world가 채운다)
  if (zn && stage.flooded?.includes(zn.id)) { ctx.fillStyle = 'rgba(40,0,6,0.38)'; ctx.fillRect(0, 0, W, H); }
  // 밤: 푸르스름하게 어둡게
  if (stage.night > 0.02) { ctx.fillStyle = `rgba(4,8,30,${0.25 * stage.night})`; ctx.fillRect(0, 0, W, H); }
  // 비: 빗줄기 (화면 좌표, 가볍게)
  if (stage.rain > 0.02) {
    ctx.strokeStyle = `rgba(170,190,220,${0.35 * stage.rain})`; ctx.lineWidth = 1; ctx.beginPath();
    const n = Math.round(140 * stage.rain), t = stage.time;
    for (let i = 0; i < n; i++) { const x = ((i * 97.3 + t * 260) % (W + 60)) - 30, y = ((i * 57.1 + t * 900 + i * i * 0.3) % (H + 40)) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16); }
    ctx.stroke();
    ctx.fillStyle = `rgba(30,40,60,${0.15 * stage.rain})`; ctx.fillRect(0, 0, W, H);
  }
  if (stage.light) {
    const p = stage.toScreen(stage.cam.x, stage.cam.z, 1);
    const r = Math.max(W, H) * 0.62;
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.18, p.x, p.y, r);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

// 이 자리가 장애물에 막혔나 (반경 r)
export function blockedAt(stage, x, z, r = 0.5) {
  const list = grid(stage).get(Math.floor(x / CELL) * 10007 + Math.floor(z / CELL)) || [];
  for (const c of list) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + r) ** 2) return true;
  return farSide(x) ? dungeonAt(x, z) < 0 : Math.hypot(x, z) > WORLD_SIZE;
}
// 두 점 사이 직선이 트였나
export function clearLine(stage, a, b, r = 0.5) {
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.6);
  for (let i = 1; i < n; i++) if (blockedAt(stage, a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n, r)) return false;
  return true;
}
// 격자 길찾기 (A*, 칸 1). 막힌 길을 돌아가는 꺾인 점들을 돌려준다 (못 찾으면 null)
// A* 길찾기 (1칸 격자, 8방향, 모서리 끼기 금지). 우선순위 큐로 넓은 범위도 빠르게
export function findPath(stage, from, to, r = 0.5, maxNodes = 4000) {
  const S = 1, key = (i, j) => (i + 32768) * 65536 + (j + 32768);
  const si = Math.round(from.x / S), sj = Math.round(from.z / S), ti = Math.round(to.x / S), tj = Math.round(to.z / S);
  const H = (i, j) => { const dx = Math.abs(ti - i), dz = Math.abs(tj - j); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  // 이진 힙 [f, i, j, g]
  const heap = [], push = (n) => { heap.push(n); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= n[0]) break; heap[k] = heap[p]; k = p; } heap[k] = n; };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let k = 0; for (;;) { const l = k * 2 + 1, rr = l + 1; let m = k; if (l < heap.length && heap[l][0] < (m === k ? last[0] : heap[m][0])) m = l; if (rr < heap.length && heap[rr][0] < (m === k ? last[0] : heap[m][0])) m = rr; if (m === k) break; heap[k] = heap[m]; k = m; } heap[k] = last; } return top; };
  const came = new Map(), gs = new Map([[key(si, sj), 0]]), closed = new Set(), free = new Map();
  const ok = (i, j) => { const k = key(i, j); let v = free.get(k); if (v === undefined) { v = !blockedAt(stage, i * S, j * S, r); free.set(k, v); } return v; };
  push([H(si, sj), si, sj, 0]);
  let seen = 0, best = null, bestH = Infinity;
  while (heap.length && seen++ < maxNodes) {
    const [, i, j, g] = pop(), k0 = key(i, j);
    if (closed.has(k0)) continue;
    closed.add(k0);
    const h = H(i, j);
    if (h < bestH) { bestH = h; best = [i, j]; }
    if (Math.abs(i - ti) <= 1 && Math.abs(j - tj) <= 1) { best = [i, j]; bestH = 0; break; }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = i + di, nj = j + dj, nk = key(ni, nj);
      if (closed.has(nk) || !ok(ni, nj)) continue;
      if (di && dj && (!ok(i + di, j) || !ok(i, j + dj))) continue; // 모서리를 비집고 지나가지 않는다
      const ng = g + (di && dj ? 1.414 : 1);
      if (ng >= (gs.get(nk) ?? Infinity)) continue;
      gs.set(nk, ng); came.set(nk, [i, j]);
      push([ng + H(ni, nj), ni, nj, ng]);
    }
  }
  if (!best || bestH > 0) return null; // 닿지 못하면 길 없음 (멀거나 막힘) — 부르는 쪽은 곧장 간다
  const pts = bestH === 0 ? [{ x: to.x, z: to.z }] : [];
  let k = key(best[0], best[1]);
  if (bestH > 0) pts.push({ x: best[0] * S, z: best[1] * S });
  while (came.has(k)) { const [a, b2] = came.get(k); pts.push({ x: a * S, z: b2 * S }); k = key(a, b2); }
  pts.reverse();
  // 직선으로 갈 수 있는 점은 건너뛴다
  const out = []; let cur = from;
  for (let n = 0; n < pts.length; n++) {
    const next = pts[n + 1];
    if (!next || !clearLine(stage, cur, next, r)) { out.push(pts[n]); cur = pts[n]; }
  }
  return out;
}

// 처음(시작 화면)은 정해진 세상
generateWorld(1);
// 개발용 점검: 언덕 둘레 칸의 절벽 바닥 땅과 바로 바깥 땅의 종류가 다른 곳 세기 (지역별)
export function terrainAudit() {
  const bad = {}, cnt = {};
  const seen = new Set();
  for (const q0 of MESAS) { if (q0.dungeon) continue; const ci = Math.round((q0.x + q0.z) / (2 * STEP)), cj = Math.round((q0.z - q0.x) / (2 * STEP)), R = Math.ceil(q0.r * 1.6 / STEP) + 2;
  for (let j = cj - R; j <= cj + R; j++) for (let i = ci - R; i <= ci + R; i++) {
    const k0 = i + ',' + j; if (seen.has(k0)) continue; seen.add(k0);
    const q = mesaRing(i, j); if (!q || q.dungeon) continue;
    const [x, z] = cellXZ(i, j), L = ZONE_LOOK[q.look || zoneAt(x, z)?.id || 'wild'];
    const g = groundAt(i + 1, j + 1)[0], key = q.look || zoneAt(x, z)?.id || 'wild';
    cnt[key] = (cnt[key] || 0) + 1;
    if (g !== L.set && !inMesa(...cellXZ(i + 1, j + 1)) && !lakeCell(i + 1, j + 1)) bad[key] = (bad[key] || 0) + 1;
  } }
  return { bad, cnt };
}
