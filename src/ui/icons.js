// 아이콘: Flare 아이콘 묶음(icons.webp, 64×64 칸 8줄)에서 잘라 쓴다. 초상화는 Flare 초상화 그림
import { BASES } from '../data/items.js';
import { SKILLS, BOOK_TIERS } from '../data/skills.js';
import { ITEM_LOOK, SKILL_ICON, faceOf } from '../data/flareWorld.js';
import { SCHOOL_ICON } from '../data/skills_more.js';
import { image, DATA, animImage } from '../engine2d/sprites.js';
import { ELIXIRS, HERBS } from '../data/potions.js';
export const herbIcon = (id) => iconUrl(HERBS[id].icon, HERBS[id].color);

const SHEET = 'icons.webp', S = 64;
const cache = new Map();
export const iconsReady = () => image(SHEET).p;

// 아이콘 번호 → 그림 주소 (frame: 테두리 색, 없으면 테두리 없음)
export function iconUrl(index, frame = null) {
  const key = index + '|' + frame;
  if (cache.has(key)) return cache.get(key);
  const src = image(SHEET);
  if (!src.ok) return '';
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.drawImage(src.im, (index % 8) * S, Math.floor(index / 8) * S, S, S, 0, 0, S, S);
  if (frame) { g.strokeStyle = frame; g.lineWidth = 4; g.globalAlpha = 0.9; g.strokeRect(2, 2, S - 4, S - 4); }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function itemIcon(it) {
  if (it.book) return iconUrl(225, BOOK_TIERS[SKILLS[it.book].tier].color);
  if (it.shard) return iconUrl(68, '#c58cff');
  if (BASES[it.base]?.type === 'pet') return petIcon(BASES[it.base].pet);
  if (ELIXIRS[it.base]) return iconUrl(ITEM_LOOK[it.base]?.icon ?? 84, ELIXIRS[it.base].color);
  if (BASES[it.base]?.type === 'mat') return iconUrl(BASES[it.base].icon, it.base === 'ore' ? null : '#9ad06a');
  const L = ITEM_LOOK[it.base];
  if (L) return iconUrl(L.icon);
  const b = BASES[it.base];
  return iconUrl(b?.type === 'potion' ? 64 : 0);
}
export const skillIcon = (id) => iconUrl(SKILL_ICON[id] ?? SCHOOL_ICON[SKILLS[id]?.school] ?? 0);
export const portrait = (look) => 'assets/flare/portraits/' + faceOf(look?.face)[1] + '.webp';
export const chestIcon = () => iconUrl(30);
export const bookIcon = () => iconUrl(28);
export const coinIcon = () => iconUrl(88);
export const scrollIcon = () => iconUrl(224);
export const homeIcon = () => iconUrl(19);
export const duelIcon = () => iconUrl(1);
export const swordIcon = () => iconUrl(1);
export const townIcon = () => iconUrl(103);
export const oreIcon = () => iconUrl(71);

// 펫 아이콘: 펫 그림(서 있는 모습, 오른쪽 아래 방향)을 칸에 맞춰 찍는다
export function petIcon(kind) {
  const key = 'pet|' + kind;
  if (cache.has(key)) return cache.get(key);
  const def = DATA.enemies?.[kind], a = def?.anims?.stance;
  if (!a) return '';
  const src = image(animImage(def, 'stance'));
  // 그림을 아직 못 받았으면 받은 뒤 창을 다시 그린다 (예전엔 펫을 사기 전까지 빈 칸)
  if (!src.ok) { src.p?.then(() => globalThis.__game?.windows.refresh()); return iconUrl(0); }
  const r = (a.f[5] || a.f[0])[0], [x, y, w, h] = r, k = Math.min(56 / w, 56 / h);
  const c = document.createElement('canvas'); c.width = c.height = S;
  c.getContext('2d').drawImage(src.im, x, y, w, h, (S - w * k) / 2, (S - h * k) / 2, w * k, h * k);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

// 검은 뒷배경을 지운 아이콘: 가장자리에서 이어진 아주 어두운 칸만 투명하게 (퀵슬롯 물약처럼 그림만 보여야 할 때)
export function iconCut(index) {
  const key = 'cut|' + index;
  if (cache.has(key)) return cache.get(key);
  const src = image(SHEET);
  if (!src.ok) return '';
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.drawImage(src.im, (index % 8) * S, Math.floor(index / 8) * S, S, S, 0, 0, S, S);
  const im = g.getImageData(0, 0, S, S), d = im.data, seen = new Uint8Array(S * S), q = [];
  const dark = (k) => d[k + 3] < 20 || d[k] + d[k + 1] + d[k + 2] < 48;
  for (let i = 0; i < S; i++) q.push([i, 0], [i, S - 1], [0, i], [S - 1, i]);
  while (q.length) {
    const [x, y] = q.pop();
    if (x < 0 || y < 0 || x >= S || y >= S || seen[y * S + x]) continue;
    seen[y * S + x] = 1;
    const k = (y * S + x) * 4;
    if (!dark(k)) continue;
    d[k + 3] = 0;
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  g.putImageData(im, 0, 0);
  const url = c.toDataURL(); cache.set(key, url); return url;
}
export const itemIconCut = (base) => iconCut(ITEM_LOOK[base]?.icon ?? 64);
