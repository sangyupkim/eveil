// 아이콘: Flare 아이콘 묶음(icons.webp, 64×64 칸 8줄)에서 잘라 쓴다. 초상화는 Flare 초상화 그림
import { BASES } from '../data/items.js';
import { SKILLS, BOOK_TIERS } from '../data/skills.js';
import { ITEM_LOOK, SKILL_ICON, faceOf } from '../data/flareWorld.js';
import { SCHOOL_ICON } from '../data/skills_more.js';
import { image, DATA, animImage } from '../engine2d/sprites.js';
import { ELIXIRS, HERBS } from '../data/potions.js';
export const herbIcon = (id) => iconUrl(40, HERBS[id].color); // v0.40.1 약초는 모두 풀 그림 + 색 테두리 (보석과 구분)

const SHEET = 'icons.webp', S = 64;
export const ESS_COLOR = { 2: '#8ab0ff', 3: '#c58cff', 4: '#ff9a4a', 5: '#ff4a6a' };
const cache = new Map();
export const iconsReady = () => Promise.all([image(SHEET).p, image('icons2.webp').p, image('icons3.webp').p, image('icons4.webp').p]); // 넷째 (2000번부터, v0.49.24) · 둘째 묶음 (256번부터, v0.41) · 셋째 (1000번부터, v0.44.8)
// 번호 → [묶음 그림, 그 안 번호]
const sheetOf = (i) => (i >= 2000 ? ['icons4.webp', i - 2000] : i >= 1000 ? ['icons3.webp', i - 1000] : i >= 256 ? ['icons2.webp', i - 256] : [SHEET, i]);

// 아이콘 번호 → 그림 주소 (frame: 테두리 색, 없으면 테두리 없음)
export function iconUrl(index, frame = null, filter = '') {
  const key = index + '|' + frame + '|' + filter;
  if (cache.has(key)) return cache.get(key);
  const [sheet, at] = sheetOf(index), src = image(sheet);
  if (!src.ok) return '';
  index = at;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  if (filter) g.filter = filter;
  g.drawImage(src.im, (index % 8) * S, Math.floor(index / 8) * S, S, S, 0, 0, S, S);
  g.filter = 'none';
  if (frame) { g.strokeStyle = frame; g.lineWidth = 4; g.globalAlpha = 0.9; g.strokeRect(2, 2, S - 4, S - 4); }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function itemIcon(it) {
  if (it.book) return iconUrl(SKILL_ICON[it.book] ?? SCHOOL_ICON[SKILLS[it.book]?.school] ?? 225, BOOK_TIERS[SKILLS[it.book].tier].color); // v0.41 책은 그 스킬 아이콘 + 단계 색 테두리
  if (it.shard) return iconUrl(2285, '#c58cff'); // 능력치 파편: 보랏빛 수정 (v0.49.24, 예전엔 문양) · 모두 같은 그림 + 칸 아래 옵션 글 (cellTag)
  if (BASES[it.base]?.type === 'pet') return petIcon(BASES[it.base].pet);
  if (ELIXIRS[it.base]) return iconUrl(ITEM_LOOK[it.base]?.icon ?? 84, ELIXIRS[it.base].color);
  if (it.base === 'myth_mark') return iconUrl(1011, '#ff4a8a'); // 신화의 흔적: 분홍 테두리
  if (it.base === 'dungeon_key2') return iconUrl(1006, '#5aa8ff'); // 강화 열쇠: 푸른 테두리
  if (it.base === 'dungeon_key3') return iconUrl(1007, '#ff4a6a'); // 극한 열쇠: 붉은 테두리
  if (it.base === 'ore') return oreIcon();
  if (it.base === 'ore2') return iconUrl(71, '#5aa8ff', 'grayscale(1) sepia(1) hue-rotate(170deg) saturate(2.4) brightness(0.8)'); // 상급: 푸른 돌
  if (it.base === 'ore3') return iconUrl(71, '#c070ff', 'grayscale(1) sepia(1) hue-rotate(230deg) saturate(2.6) brightness(0.8)'); // 최상급: 보랏빛 돌
  if (/^ess\d$/.test(it.base)) return iconUrl(1010, ESS_COLOR[BASES[it.base].grade]); // 정수: 마력 구슬 그림 + 단계 색 테두리
  if (BASES[it.base]?.type === 'mat') return iconUrl(BASES[it.base].icon, '#9ad06a');
  const L = ITEM_LOOK[it.base];
  if (L) return iconUrl(L.icon);
  const b = BASES[it.base];
  return iconUrl(b?.type === 'potion' ? 64 : 0);
}
export const skillIcon = (id) => iconUrl(SKILL_ICON[id] ?? SCHOOL_ICON[SKILLS[id]?.school] ?? 0);
export const portrait = (look) => 'assets/flare/portraits/' + faceOf(look?.face)[1] + '.webp';
export const chestIcon = () => iconUrl(1009);
export const bookIcon = () => iconUrl(28);
export const coinIcon = () => iconUrl(1008);
export const scrollIcon = () => iconUrl(224);
export const homeIcon = () => iconUrl(19);
export const duelIcon = () => iconUrl(1);
export const swordIcon = () => iconUrl(1);
export const townIcon = () => iconUrl(103);
// 강화석: 금강석(보석)과 헷갈리지 않게 잿빛 돌 + 주황 테두리
export const oreIcon = () => iconUrl(71, '#e0903a', 'grayscale(1) sepia(.6) brightness(.62) contrast(1.3)');

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
  const [sheet, at] = sheetOf(index), src = image(sheet);
  if (!src.ok) return '';
  index = at;
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
// v0.49.8 문양 아이콘: 돌판 위 흰 문양(0~46번)에서 문양만 뽑아 한 색으로 (HUD 단추를 같은 모양으로 맞춘다)
export function glyphIcon(index, color = '#f2dc9a') {
  const key = 'glyph|' + index + '|' + color;
  if (cache.has(key)) return cache.get(key);
  const [sheet, at] = sheetOf(index), src = image(sheet);
  if (!src.ok) return '';
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.drawImage(src.im, (at % 8) * S, Math.floor(at / 8) * S, S, S, 0, 0, S, S);
  const im = g.getImageData(0, 0, S, S), d = im.data, r = parseInt(color.slice(1, 3), 16), gg = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
  for (let k = 0; k < d.length; k += 4) { const lum = (d[k] + d[k + 1] + d[k + 2]) / 3, a = Math.max(0, Math.min(1, (lum - 168) / 52)); d[k] = r; d[k + 1] = gg; d[k + 2] = b; d[k + 3] = Math.round(a * d[k + 3]); }
  g.putImageData(im, 0, 0);
  const url = c.toDataURL(); cache.set(key, url); return url;
}
export const itemIconCut = (base) => iconCut(ITEM_LOOK[base]?.icon ?? 64);

// v0.44.41 도감 초상: 몬스터 서 있는 모습(정면) 한 장. 그림이 아직 없으면 받는 중에 '' (onReady로 다시 그린다)
import { MONSTER_LOOK } from '../data/flareWorld.js';
import { tintedRect } from '../engine2d/sprites.js';
const monCache = new Map();
export function monPortrait(type, onReady) {
  if (monCache.has(type)) return monCache.get(type);
  const look = MONSTER_LOOK[type] || { sprite: 'goblin' }, def = DATA.enemies?.[look.sprite];
  if (!def) return '';
  const a = def.anims.stance || Object.values(def.anims)[0], path = animImage(def, def.anims.stance ? 'stance' : Object.keys(def.anims)[0]);
  const rect = (a.f['6'] || a.f[6] || Object.values(a.f)[0])?.[0];
  const img = image(path);
  if (!img.ok) { img.p?.then(() => onReady?.()); return ''; }
  const tr = tintedRect(path, look.tint ?? null, rect);
  if (!tr) return '';
  const [src, r] = tr, c = document.createElement('canvas'), S2 = 160; c.width = S2; c.height = S2;
  const g = c.getContext('2d'), k = Math.min(S2 * 0.9 / r[2], S2 * 0.9 / r[3]);
  g.drawImage(src, r[0], r[1], r[2], r[3], (S2 - r[2] * k) / 2, (S2 - r[3] * k) / 2, r[2] * k, r[3] * k);
  const url = c.toDataURL(); monCache.set(type, url); return url;
}
