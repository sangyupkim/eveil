// Flare 그림 불러오기 · 동작 프레임 고르기 · 그리기 (그림은 필요할 때만 받는다)
const ROOT = 'assets/flare/';
const imgs = new Map();
const jsons = new Map();

export function image(path) {
  if (!imgs.has(path)) {
    const im = new Image();
    im.decoding = 'async';
    const p = new Promise((res) => { im.onload = () => res(im); im.onerror = () => { console.warn('그림 없음', path); res(null); }; });
    im.src = ROOT + path;
    imgs.set(path, { im, p, ok: false });
    p.then((x) => { imgs.get(path).ok = !!x; });
  }
  return imgs.get(path);
}
export const ready = (path) => image(path).ok;
export const waitImage = (path) => image(path).p;

export async function loadJson(name) {
  if (!jsons.has(name)) jsons.set(name, fetch(ROOT + name + '.json').then((r) => r.json()));
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
const tints = new Map();
export function tinted(path, color) {
  const key = path + '|' + color;
  if (tints.has(key)) return tints.get(key);
  const src = image(path);
  if (!src.ok) return null;
  const im = src.im;
  const c = document.createElement('canvas');
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

// rect = [x, y, w, h, ox, oy] — (sx, sy)가 발끝(기준점)
export function drawRect(ctx, src, rect, sx, sy, s = 1) {
  if (!src || !rect) return;
  const [x, y, w, h, ox, oy] = rect;
  if (w <= 1 || h <= 1) return;
  ctx.drawImage(src, x, y, w, h, sx - ox * s, sy - oy * s, w * s, h * s);
}

// 화면에서의 진행 방향(dx, dy) → Flare 방향 번호 (0 왼쪽 · 2 위 · 4 오른쪽 · 6 아래, 45°씩)
export function dirIndex(dx, dy) {
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return ((Math.round((deg - 180) / 45) % 8) + 8) % 8;
}
