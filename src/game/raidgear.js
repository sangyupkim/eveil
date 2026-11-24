// v0.50 왕좌 원정 상점 물건으로 장비 손질 (대장간 「손질」 탭): 옵션 다시 굴림 · 구멍 뚫기 · 각인 새기기 · 각인 추출 · 장비 파편 추출
import { BASES, AFFIXES, RARITY, affixFits, UTILITY_AFFIX } from '../data/items.js';
import { ENGRAVE } from '../data/raid.js';
import { makeShard, keepSlots, greatSlots } from './shards.js';
import { makeItem } from './items.js';
import { countOf, takeOne, addItem } from './inventory.js';
import { R } from './rng.js';
import { resCount, resTake } from './town.js';

const fits = (it, id) => { const a = AFFIXES[id], b = BASES[it.base]; if (!a || a.retired) return false; if (a.mythOnly) return it.rarity === 'myth' && (!a.slots || a.slots.includes(b.slot)); if (a.legendOnly && it.rarity !== 'legend' && it.rarity !== 'myth') return false; return affixFits(a, b); };
// 옵션 한 줄 다시 굴리기: 같은 장비에 붙을 수 있는 다른 옵션(이미 있는 옵션 · 잡옵션 둘째 줄 제외), 값은 그 장비 레벨 · 등급 범위 안
export function rerollAffix(st, it, idx, rng = R) {
  const cur = it.affixes?.[idx]; if (!cur) return { ok: false, why: '옵션이 없습니다' };
  if (countOf(st, 't_reroll') < 1) return { ok: false, why: '옵션 다시 굴림권이 없습니다' };
  const have = new Set(it.affixes.map((a) => a.id)), hasUtil = it.affixes.some((a, i) => i !== idx && UTILITY_AFFIX.has(a.id));
  const mythLine = AFFIXES[cur.id]?.mythOnly; // 신화 옵션 줄은 신화 옵션끼리
  const pool = Object.keys(AFFIXES).filter((id) => !have.has(id) && fits(it, id) && !!AFFIXES[id].mythOnly === !!mythLine && !(hasUtil && UTILITY_AFFIX.has(id)));
  if (!pool.length && mythLine) pool.push(cur.id); // 신화 줄은 바꿀 다른 신화 옵션이 없으면 값만 다시
  if (!pool.length) return { ok: false, why: '바꿀 옵션이 없습니다' };
  takeOne(st, 't_reroll');
  const id = pool[Math.floor(rng() * pool.length)], a = AFFIXES[id], mult = RARITY[it.rarity]?.mult || 1, max = Math.max(a.min, a.max(it.ilvl || 1) * mult);
  const v = Math.max(a.min, Math.round(a.min + (it.rarity === 'myth' ? 0.5 + rng() * 0.5 : rng()) * (max - a.min)));
  const before = { ...cur }; keepSlots(it); it.affixes[idx] = mythLine ? { id, v, myth: true } : { id, v };
  return { ok: true, before, after: it.affixes[idx] };
}
// 구멍 뚫기 (장비마다 최대 3)
export function addSocket(st, it) {
  if (!BASES[it.base]?.slot) return { ok: false, why: '장비가 아닙니다' };
  if ((it.sockets || 0) >= 3) return { ok: false, why: '구멍이 이미 셋입니다' };
  if (countOf(st, 't_socket') < 1) return { ok: false, why: '구멍 뚫기권이 없습니다' };
  takeOne(st, 't_socket'); it.sockets = (it.sockets || 0) + 1; it.gems ||= []; st.raidSock = (st.raidSock || 0) + 1;
  return { ok: true };
}
// 각인 새기기: 신화 장비에 원정 군주 각인 (군주의 각인 한 장, 또는 각인석이면 공짜) — 다시 새기면 바뀐다
export function engrave(st, it, lord, stoneUid = null) {
  if (it.rarity !== 'myth') return { ok: false, why: '신화 장비에만 새길 수 있습니다' };
  if (stoneUid != null) { const i = st.inv.findIndex((x) => x.uid === stoneUid && x.base === 'eng_stone'); if (i < 0) return { ok: false, why: '각인석이 없습니다' }; lord = st.inv[i].eng; st.inv.splice(i, 1); }
  else { if (!ENGRAVE[lord]) return { ok: false }; if (!(st.raidLords || {})[lord]) return { ok: false, why: '그 군주를 쓰러뜨려야 합니다' }; if (countOf(st, 't_engrave') < 1) return { ok: false, why: '군주의 각인이 없습니다' }; takeOne(st, 't_engrave'); }
  it.eng = lord;
  return { ok: true, lord };
}
// 각인 추출: 각인을 떼어 각인석으로 (장비는 남는다)
export function extractEngrave(st, it) {
  if (!it.eng) return { ok: false, why: '각인이 없습니다' };
  if (countOf(st, 't_engx') < 1) return { ok: false, why: '각인 추출권이 없습니다' };
  const stone = makeItem('eng_stone', {}, st); stone.eng = it.eng;
  if (!addItem(st, stone)) return { ok: false, why: '가방이 가득 찼습니다' };
  takeOne(st, 't_engx'); delete it.eng;
  return { ok: true, stone };
}
// 장비 파편 추출: 고른 옵션 한 줄을 그 값 그대로 파편으로, 장비는 사라진다
export function extractShard(st, it, idx, remove) {
  const a = it.affixes?.[idx]; if (!a) return { ok: false, why: '옵션이 없습니다' };
  if (it.lock) return { ok: false, why: '잠근 장비입니다' };
  if (countOf(st, 't_shardx') < 1) return { ok: false, why: '장비 파편 추출권이 없습니다' };
  const sh = makeShard({ id: a.id, v: a.v, great: !!a.great }, st); // v0.49.84 탁월 줄은 탁월 파편
  takeOne(st, 't_shardx'); remove(); if (!addItem(st, sh)) st.inv.push(sh);
  return { ok: true, shard: sh };
}
// 끼고 있는 장비의 각인 (효과 계산용)
export const engraves = (st) => { const o = {}; for (const it of Object.values(st.equip || {})) if (it?.eng) o[it.eng] = (o[it.eng] || 0) + 1; return o; };

// v0.49.75 강화 계승: 계승권 하나로 녹일 장비(src)의 강화 단계 50 ~ 80%를 같은 부위 장비(dst)에 넘긴다 (계승 축복석을 함께 쓰면 80 ~ 95%). 실패 없음. 녹인 장비는 사라진다
export const slotKind = (it) => { const s = BASES[it?.base]?.slot; return s === 'ring1' || s === 'ring2' ? 'ring' : s; };
export const inheritRange = (src, boost = false) => { const n = src?.plus || 0; return boost ? [Math.floor(n * 0.8), Math.floor(n * 0.95)] : [Math.floor(n * 0.5), Math.floor(n * 0.8)]; };
export function inheritCheck(st, src, dst, boost = false) {
  if (!src || !dst || src === dst) return { ok: false, why: '장비 둘을 고르세요' };
  if (!BASES[src.base]?.slot || !BASES[dst.base]?.slot) return { ok: false, why: '장비만 계승할 수 있습니다' };
  if (slotKind(src) !== slotKind(dst)) return { ok: false, why: '같은 부위끼리만 계승합니다' };
  if (src.lock) return { ok: false, why: '잠근 장비는 녹일 수 없습니다' };
  if ((src.plus || 0) < 2) return { ok: false, why: '녹일 장비가 +2 이상이어야 합니다' };
  if (inheritRange(src, boost)[1] <= (dst.plus || 0)) return { ok: false, why: '받을 장비가 이미 그보다 높습니다' };
  if (countOf(st, 't_inherit') < 1) return { ok: false, why: '계승권이 필요합니다' };
  if (boost && countOf(st, 't_inherit2') < 1) return { ok: false, why: '계승 축복석이 없습니다' };
  return { ok: true };
}
export function inherit(st, src, dst, boost, remove, rng = R) {
  const c = inheritCheck(st, src, dst, boost); if (!c.ok) return c;
  const [lo, hi] = inheritRange(src, boost), m = lo + Math.floor(rng() * (hi - lo + 1)), before = dst.plus || 0;
  takeOne(st, 't_inherit'); if (boost) takeOne(st, 't_inherit2');
  remove();
  dst.plus = Math.max(before, m); dst.jang = 0; dst.fails = 0;
  return { ok: true, from: src.plus || 0, before, plus: dst.plus };
}

// ── v0.49.92 신화의 흔적 권 (신화 교환을 없애고) ──
// 제작소에서 흔적으로 만든다: 품질 다듬기권 50 · 신화 옵션 다시 굴림권 150 · 탁월 칸 확장권 250
export const MARK_TICKETS = [{ id: 't_qpolish', marks: 50 }, { id: 't_mythroll', marks: 150 }, { id: 't_greatslot', marks: 250 }];
export function craftTicket(st, id, n = 1) {
  const T = MARK_TICKETS.find((x) => x.id === id); if (!T) return { ok: false };
  const need = T.marks * n; if (resCount(st, 'myth_mark') < need) return { ok: false, why: `신화의 흔적 ${need}개가 필요합니다` };
  const it = makeItem(id, { qty: n }, st); if (!addItem(st, it)) return { ok: false, why: '가방이 가득 찼습니다' };
  resTake(st, 'myth_mark', need);
  return { ok: true };
}
// 품질 범위 (makeItem과 같다): 신화 115 ~ 130%, 나머지 85 ~ 115%
export const qRange = (it) => (it.rarity === 'myth' ? [1.15, 1.3] : [0.85, 1.15]);
export function polishQuality(st, it, rng = R) {
  if (it?.q == null) return { ok: false, why: '품질이 있는 장비가 아닙니다' };
  const [lo, hi] = qRange(it); if (it.q >= hi) return { ok: false, why: '이미 최고 품질입니다' };
  if (countOf(st, 't_qpolish') < 1) return { ok: false, why: '품질 다듬기권이 없습니다' };
  takeOne(st, 't_qpolish');
  const before = it.q, q = Math.round((lo + rng() * (hi - lo)) * 100) / 100;
  if (q > it.q) it.q = q;
  return { ok: true, before, after: it.q, rolled: q, up: it.q > before };
}
// 신화 옵션 한 줄 다시 굴림: 부위에 맞는 다른 신화 옵션 (없으면 값만), 값은 신화 범위 위쪽 절반
export function rerollMyth(st, it, idx, rng = R) {
  const cur = it?.affixes?.[idx]; if (!cur || !AFFIXES[cur.id]?.mythOnly) return { ok: false, why: '신화 옵션이 아닙니다' };
  if (countOf(st, 't_mythroll') < 1) return { ok: false, why: '신화 옵션 다시 굴림권이 없습니다' };
  const slot = BASES[it.base]?.slot, have = new Set(it.affixes.map((a) => a.id));
  const pool = Object.keys(AFFIXES).filter((id) => AFFIXES[id].mythOnly && !have.has(id) && (!AFFIXES[id].slots || AFFIXES[id].slots.includes(slot)));
  const id = pool.length ? pool[Math.floor(rng() * pool.length)] : cur.id, a = AFFIXES[id], mx = a.max(it.ilvl || 1) * RARITY.myth.mult;
  takeOne(st, 't_mythroll');
  const before = { ...cur }; it.affixes[idx] = { id, v: Math.max(a.min, Math.round(a.min + (0.5 + rng() * 0.5) * (mx - a.min))), myth: true };
  return { ok: true, before, after: it.affixes[idx] };
}
// 탁월 칸 확장: 2칸 1장 · 3칸 1장 · 4칸 2장 · 5칸 3장
export const slotTickets = (cur) => [0, 0, 1, 1, 2, 3][cur + 1] || 0;
export function expandGreat(st, it) {
  if (!it?.affixes?.length) return { ok: false, why: '옵션이 있는 장비가 아닙니다' };
  const cur = greatSlots(it); if (cur >= 5) return { ok: false, why: '탁월 칸이 이미 5칸입니다' };
  const need = slotTickets(cur); if (countOf(st, 't_greatslot') < need) return { ok: false, why: `탁월 칸 확장권 ${need}장이 필요합니다` };
  for (let i = 0; i < need; i++) takeOne(st, 't_greatslot');
  it.gs = cur + 1;
  return { ok: true, slots: it.gs };
}
