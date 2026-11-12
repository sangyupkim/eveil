// 지도 그림: 위에서 본 지형(1칸 = 세계 1) + 탐험 안개(4칸 = 세계 4). 미니맵 · 월드맵이 같이 쓴다
import { WORLD_SIZE } from '../data/world.js';
import { mapColor } from '../engine2d/stage.js';

export const MAP_R = WORLD_SIZE + 10, MAP_W = MAP_R * 2;
export const FOG_C = 4, FOG_N = Math.ceil(MAP_W / FOG_C);
export const terrain = document.createElement('canvas');
terrain.width = terrain.height = MAP_W;
export const fogCan = document.createElement('canvas');
fogCan.width = fogCan.height = FOG_N;
const fctx = fogCan.getContext('2d');
let fog = new Uint8Array(FOG_N * FOG_N);

// 지형은 조금씩 나눠 그린다 (시작이 멈추지 않게)
let row = 0;
const tctx = terrain.getContext('2d'), img = tctx.createImageData(MAP_W, 1);
function step() {
  const t0 = performance.now();
  while (row < MAP_W && performance.now() - t0 < 8) {
    for (let x = 0; x < MAP_W; x++) {
      const c = mapColor(x - MAP_R, row - MAP_R), q = x * 4;
      if (c) { img.data[q] = c[0]; img.data[q + 1] = c[1]; img.data[q + 2] = c[2]; img.data[q + 3] = 255; } else img.data[q + 3] = 0;
    }
    tctx.putImageData(img, 0, row++);
  }
  if (row < MAP_W) setTimeout(step, 0);
}
setTimeout(step, 500);
// 새 세상이면 지형 그림을 처음부터 다시
export function rebuildTerrain() { const go = row >= MAP_W; row = 0; tctx.clearRect(0, 0, MAP_W, MAP_W); if (go) setTimeout(step, 0); }

// 안개: 1 = 밝힘. 저장은 문자열 (8칸씩 묶어 한 글자)
export function loadFog(st) {
  fog = new Uint8Array(FOG_N * FOG_N);
  const s = st.fog || '';
  for (let i = 0; i < s.length; i++) { const v = s.charCodeAt(i) - 48; for (let b = 0; b < 6; b++) if (v & (1 << b)) fog[i * 6 + b] = 1; }
  fctx.fillStyle = 'rgb(10,9,16)'; fctx.fillRect(0, 0, FOG_N, FOG_N);
  for (let k = 0; k < fog.length; k++) if (fog[k]) fctx.clearRect(k % FOG_N, Math.floor(k / FOG_N), 1, 1);
}
export function saveFog(st) {
  let s = '';
  for (let i = 0; i < fog.length; i += 6) { let v = 0; for (let b = 0; b < 6; b++) if (fog[i + b]) v |= 1 << b; s += String.fromCharCode(48 + v); }
  st.fog = s.replace(/0+$/, '');
}
// 둘레 r을 밝힌다. 새로 밝힌 칸이 있으면 true
export function reveal(x, z, r = 15) {
  let any = false;
  const ci = Math.floor((x + MAP_R) / FOG_C), cj = Math.floor((z + MAP_R) / FOG_C), R = Math.ceil(r / FOG_C);
  for (let j = cj - R; j <= cj + R; j++) for (let i = ci - R; i <= ci + R; i++) {
    if (i < 0 || j < 0 || i >= FOG_N || j >= FOG_N || (i - ci) ** 2 + (j - cj) ** 2 > R * R) continue;
    const k = j * FOG_N + i;
    if (!fog[k]) { fog[k] = 1; fctx.clearRect(i, j, 1, 1); any = true; }
  }
  return any;
}
export const seen = (x, z) => !!fog[Math.floor((z + MAP_R) / FOG_C) * FOG_N + Math.floor((x + MAP_R) / FOG_C)];
