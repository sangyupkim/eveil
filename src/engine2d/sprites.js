// Flare 그림 불러오기 · 동작 프레임 고르기 · 그리기 (그림은 필요할 때만 받는다)
import { GAME_VERSION } from '../data/patchnotes.js';
const ROOT = 'assets/flare/';
// v0.44.14 버전마다 새 주소: 설치본(sw.js)이 예전 그림을 먼저 내주면 새로 더한 아이콘 · 몬스터가 빈칸으로 보였다
const VQ = '?v=' + GAME_VERSION;
const imgs = new Map();
const jsons = new Map();

export function image(path) {
  if (!imgs.has(path)) {
    const im = new Image();
    im.decoding = 'async';
    const rec = { im, p: null, ok: false };
    // 받은 뒤 미리 풀어 둔다 (ImageBitmap) — 처음 그릴 때 멈추지 않고, 휴대폰이 다시 풀지 않게
    rec.p = new Promise((res) => { im.onload = () => res(im); im.onerror = () => { console.warn('그림 없음', path); res(null); }; })
      .then(async (x) => {
        if (!x) return null;
        try { if (window.createImageBitmap) rec.im = await createImageBitmap(x); } catch { /* 그대로 Image */ }
        rec.ok = true;
        return rec.im;
      });
    im.src = ROOT + path + VQ;
    imgs.set(path, rec);
  }
  return imgs.get(path);
}
export const ready = (path) => image(path).ok;
export const waitImage = (path) => image(path).p;

export async function loadJson(name) {
  if (!jsons.has(name)) jsons.set(name, fetch(ROOT + name + '.json' + VQ).then((r) => r.json()));
  return jsons.get(name);
}
// 미리 받아 둔 정의 (main에서 한 번 채운다)
export const DATA = { avatar_m: null, avatar_f: null, enemies: null, npcs: null, tiles: null, powers: null, loot: null };
export async function loadAllJson() {
  await Promise.all(Object.keys(DATA).map(async (k) => { DATA[k] = await loadJson(k); }));
}

// 동작 a에서 t초 때의 프레임 번호. once면 끝에서 멈춘다
export function frameIndex(a, t, once = false) {
  const n = a.frames, dur = a.dur / 1000;
  if (n <= 1) return 0;
  if (once && a.type !== 'play_once') return Math.min(n - 1, Math.floor((t / dur) * n)); // 죽음 등 한 번만: 왕복 · 반복 그림도 끝에서 멈춘다
  if (a.type === 'back_forth') {
    const span = (n * 2 - 2);
    const k = Math.floor((t / dur) * span) % span;
    return k < n ? k : span - k;
  }
  const k = Math.floor((t / dur) * n);
  if (once || a.type === 'play_once') return Math.min(n - 1, k);
  return k % n;
}
export const animDuration = (a) => (a ? a.dur / 1000 : 0);

// 그 동작이 쓰는 그림 경로 (동작별 그림이 따로 있는 몬스터도 있다)
export const animImage = (def, name) => def.images[name] || def.images.default;

// 색 입힌 그림 (같은 그림 · 색이면 한 번만 만든다)
// 색 입힌 동작 칸 하나 (그림 전체를 칠하면 몬스터가 처음 나올 때 멈칫하고 메모리를 크게 먹었다)
const tintRects = new Map();
export function tintedRect(path, color, rect) {
  if (!rect) return null;
  const key = path + '|' + color + '|' + rect[0] + ',' + rect[1];
  let v = tintRects.get(key);
  if (v) return v;
  const src = image(path);
  if (!src.ok) return null;
  const [x, y, w, h, ox, oy] = rect;
  if (w <= 1 || h <= 1) return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(src.im, x, y, w, h, 0, 0, w, h);
  if (color == null) { v = [c, [0, 0, w, h, ox, oy]]; if (tintRects.size > 3000) tintRects.clear(); tintRects.set(key, v); return v; }
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = '#' + color.toString(16).padStart(6, '0');
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(src.im, x, y, w, h, 0, 0, w, h);
  v = [c, [0, 0, w, h, ox, oy]];
  if (tintRects.size > 4000) tintRects.clear();
  tintRects.set(key, v);
  return v;
}
const tints = new Map();
export function tinted(path, color) {
  const key = path + '|' + color;
  if (tints.has(key)) return tints.get(key);
  const src = image(path);
  if (!src.ok) return null;
  const im = src.im;
  const c = document.createElement('canvas'); // 색 입힌 판도 받은 크기(줄인 그림) 그대로
  c.width = im.width; c.height = im.height;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = '#' + color.toString(16).padStart(6, '0');
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(im, 0, 0);
  tints.set(key, c);
  return c;
}

// v0.49.16 색 필터를 건 조각을 한 번만 만들어 둔다 (매 프레임 ctx.filter로 그리면 휴대폰에서 주기적으로 멈칫했다)
const filtered = new WeakMap();
export function filteredRect(src, rect, filter) {
  if (!src || !rect || !filter) return null;
  let m = filtered.get(src); if (!m) { m = new Map(); filtered.set(src, m); }
  const key = rect.slice(0, 4).join(',') + '|' + filter;
  let hit = m.get(key);
  if (!hit) {
    const [x, y, w, h, ox, oy] = rect, c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
    const g = c.getContext('2d'); g.filter = filter; g.drawImage(src, x, y, w, h, 0, 0, w, h);
    hit = { im: c, rect: [0, 0, w, h, ox, oy] }; m.set(key, hit);
  }
  return hit;
}
// rect = [x, y, w, h, ox, oy] — (sx, sy)가 발끝(기준점)
export function drawRect(ctx, src, rect, sx, sy, s = 1) {
  if (!src || !rect) return;
  const x = rect[0], y = rect[1], w = rect[2], h = rect[3], ox = rect[4], oy = rect[5]; // v0.49.56 배열 분해는 매번 반복자를 만들었다
  if (w <= 1 || h <= 1) return;
  ctx.drawImage(src, x, y, w, h, sx - ox * s, sy - oy * s, w * s, h * s);
}

// 화면에서의 진행 방향(dx, dy) → Flare 방향 번호 (0 왼쪽 · 2 위 · 4 오른쪽 · 6 아래, 45°씩)
export function dirIndex(dx, dy) {
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return ((Math.round((deg - 180) / 45) % 8) + 8) % 8;
}
