// 아이콘: Flare 아이콘 묶음(icons.webp, 64×64 칸 8줄)에서 잘라 쓴다. 초상화는 Flare 초상화 그림
import { BASES } from '../data/items.js';
import { SKILLS, BOOK_TIERS } from '../data/skills.js';
import { ITEM_LOOK, SKILL_ICON, faceOf } from '../data/flareWorld.js';
import { SCHOOL_ICON } from '../data/skills_more.js';
import { image } from '../engine2d/sprites.js';

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
