// 오늘의 의뢰 (하루) · 이번 주 의뢰 (월요일마다). 날짜로 정해지고, 내 각성 · 지은 건물에 맞춰 고른다 (v0.44.27)
// kind: kill(그 지역 몬스터) · elite(정예 이상) · boss(네임드 · 보스) · dungeon(그 지역 던전) · dungeonAny(아무 던전)
//       harvest(광산 · 약초밭 거두기) · brew(제작소 물건 완성) · make(강화석 · 열쇠 · 정수 제작) · enhance(강화 시도) · expedition(파견 귀환)
import { ZONES, TIER_STEP } from '../data/world.js';
import { seeded } from './rng.js';
import { gemId, gemGradeFor, GEMS } from '../data/legends.js';
import { BASES } from '../data/items.js';

export const dayKey = (now = Date.now()) => new Date(now + 9 * 3600e3).toISOString().slice(0, 10); // 한국 시간 날짜
// 주: 한국 시간 월요일 0시부터
export const weekKey = (now = Date.now()) => { const d = new Date(now + 9 * 3600e3); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return 'w' + d.toISOString().slice(0, 10); };

const has = (st, type) => Object.values(st.town?.plots || {}).some((b) => b.type === type && !(b.bld?.to === 1));
// 내 각성에 맞는 지역: 갈 수 있는 지역 중 가장 깊은 세 곳 (너무 쉬운 곳은 고르지 않는다)
function fitZones(st) {
  const aw = st.awakenings || 0, open = ZONES.filter((z) => aw >= Math.max(0, z.levels[0] - 1));
  return open.length ? open.slice(-3) : [ZONES[0]];
}
// 생산 · 제작 의뢰: 그 건물이 있을 때만
function lifePool(st) {
  const p = [];
  if (has(st, 'mine') || has(st, 'herb')) p.push('harvest');
  if (has(st, 'workshop')) p.push('brew', 'make');
  if (has(st, 'smithy')) p.push('enhance');
  if (has(st, 'guild') && (st.town?.mercs || []).length) p.push('expedition');
  return p;
}
const NEED = { // [하루, 한 주]
  harvest: [3, 15], brew: [5, 40], make: [2, 12], enhance: [5, 30], expedition: [3, 20],
};

export function dailyOf(st, now = Date.now()) {
  const day = dayKey(now);
  if (st.daily?.day === day) return st.daily;
  const rng = seeded([...day].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  const fz = fitZones(st), zn = fz[Math.floor(rng() * fz.length)], zn2 = fz[Math.floor(rng() * fz.length)];
  const aw = st.awakenings || 0;
  const list = [
    { kind: 'kill', zone: zn.id, need: 40 + Math.floor(rng() * 4) * 10 + Math.min(60, Math.floor(aw / 10) * 5) },
    { kind: 'elite', need: 5 + Math.floor(rng() * 4) + Math.min(10, Math.floor(aw / 40)) },
    { kind: 'dungeon', zone: zn2.id, need: 1 },
  ];
  const life = lifePool(st);
  if (life.length) { const k = life[Math.floor(rng() * life.length)]; list.push({ kind: k, need: NEED[k][0] }); }
  st.daily = { day, list: list.map((q) => ({ ...q, have: 0, done: false })) };
  return st.daily;
}

// 이번 주 의뢰: 양이 많다. 전투 넷 + 생산 · 제작 (있는 건물만) 최대 셋
export function weeklyOf(st, now = Date.now()) {
  const wk = weekKey(now);
  if (st.weekly?.wk === wk) return st.weekly;
  const rng = seeded([...wk].reduce((a, c) => a * 37 + c.charCodeAt(0), 11) >>> 0);
  const aw = st.awakenings || 0, fz = fitZones(st), zn = fz[Math.floor(rng() * fz.length)];
  const list = [
    { kind: 'kill', zone: zn.id, need: 500 + Math.min(500, Math.floor(aw / 5) * 10) },
    { kind: 'elite', need: 60 + Math.min(60, Math.floor(aw / 10)) },
    { kind: 'boss', need: 15 },
    { kind: 'dungeonAny', need: 10 },
  ];
  const life = lifePool(st).sort(() => rng() - 0.5).slice(0, 3);
  for (const k of life) list.push({ kind: k, need: NEED[k][1] });
  st.weekly = { wk, list: list.map((q) => ({ ...q, weekly: true, have: 0, done: false })) };
  return st.weekly;
}

export function dailyText(q) {
  const zn = ZONES.find((z) => z.id === q.zone);
  return ({
    kill: () => `${zn?.name}의 몬스터 ${q.need}마리`,
    elite: () => `정예 · 네임드 · 보스 ${q.need}마리`,
    boss: () => `네임드 · 보스 ${q.need}마리`,
    dungeon: () => `${zn?.name} 던전 돌파`,
    dungeonAny: () => `던전 ${q.need}번 돌파`,
    harvest: () => `광산 · 약초밭 거두기 ${q.need}번`,
    brew: () => `제작소에서 물건 ${q.need}번 완성`,
    make: () => `강화석 · 열쇠 · 정수 제작 ${q.need}번`,
    enhance: () => `장비 강화 ${q.need}번 시도`,
    expedition: () => `파견 용병 ${q.need}명 귀환`,
  }[q.kind] || (() => q.kind))();
}
// 세계 단계만큼 더하는 레벨 (world.tierOffset과 같은 셈 — 마을 · 의뢰에서 쓴다)
export const worldOffset = (st) => { const wt = Math.min(5, Math.max(1, st.worldTier || 1)), fl = Math.max(1, Math.min(st.muganMax || 1, st.mugan || 1)); return wt >= 5 ? 380 + 10 * fl : [0, TIER_STEP, TIER_STEP * 2, 380][wt - 1]; };
// v0.52.2 의뢰 보상 레벨: 내 각성에 맞는 가장 깊은 지역 + 세계 단계
export const rewardLevel = (st) => { const fz = fitZones(st); return fz[fz.length - 1].levels[1] + worldOffset(st); };
// 그 레벨에 필요한 물건 (장비 말고): [id, 개수, 무게]
function rewardPool(st, L, box = false) {
  const aw = st.awakenings || 0, g = Math.min(5, 1 + Math.floor(aw / 100)), GK = Object.keys(GEMS);
  const P = [['dungeon_key', 2, 3], ['gem', 1, 3], ['ore2', 3 + Math.floor(L / 60), 2], ['odd_map', 1, 1]];
  if (L >= 60) P.push(['dungeon_key2', 1, 2]);
  if (L >= 150) P.push(['dungeon_key3', 1, 1.5]);
  if (g >= 2) P.push(['ess' + g, 2, 2]);
  if (L >= 240) P.push(['myth_mark', 1, 1.5]);
  if (box) P.push(['gem', 2, 2], ['t_socket', 1, L >= 240 ? 0.8 : 0.3]);
  return { P, gem: (rng) => gemId(GK[Math.floor(rng() * GK.length)], gemGradeFor(L, rng)) };
}
function pickReward(st, L, rng, box = false) {
  const { P, gem } = rewardPool(st, L, box), tot = P.reduce((a, x) => a + x[2], 0);
  let r = rng() * tot; for (const [id, n, w] of P) { if ((r -= w) <= 0) return id === 'gem' ? { id: gem(rng), n } : { id, n }; }
  return { id: 'dungeon_key', n: 2 };
}
// 의뢰 하나 보상: 금화 + 그 레벨에 필요한 물건 (하루 1개 · 한 주 3개). 의뢰마다 정해져 있어 미리 보인다
export const dailyReward = (q, st) => {
  const L = rewardLevel(st), rng = seeded([...(q.weekly ? 'w' : 'd') + q.kind + (q.zone || '') + (st.daily?.day || '') + (st.weekly?.wk || '')].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 3)); rng(); rng(); // 32비트 안에서 섞기 (긴 글은 소수 자릿수가 넘쳐 의뢰마다 같은 보상이 나왔다)
  const items = Array.from({ length: q.weekly ? 3 : 1 }, () => pickReward(st, L, rng));
  return { gold: Math.round(L * (q.weekly ? 600 : 120)), items };
};
// 다 깨면 상자: 무작위로 더 (오늘 3개 · 이번 주 6개, 구멍 뚫기권도 나올 수 있다)
export const boxReward = (st, weekly, rng = Math.random) => {
  const L = rewardLevel(st);
  return { gold: Math.round(L * (weekly ? 1500 : 250)), items: Array.from({ length: weekly ? 6 : 3 }, () => pickReward(st, L, rng, true)) };
};
export const rewardName = (x) => `${BASES[x.id]?.name || x.id}${x.n > 1 ? ' ×' + x.n : ''}`;

// 진행: 끝난 의뢰를 돌려준다 (오늘 · 이번 주 둘 다)
export function dailyProgress(st, ev, n = 1) {
  const out = [];
  for (const d of [dailyOf(st), weeklyOf(st)]) for (const q of d.list) {
    if (q.done) continue;
    const hit = (q.kind === 'kill' && ev.kind === 'kill' && ev.zone === q.zone)
      || (q.kind === 'elite' && ev.kind === 'kill' && ev.tier && ev.tier !== 'normal')
      || (q.kind === 'boss' && ev.kind === 'kill' && (ev.tier === 'named' || ev.tier === 'boss'))
      || (q.kind === 'dungeon' && ev.kind === 'dungeon' && ev.zone === q.zone)
      || (q.kind === 'dungeonAny' && ev.kind === 'dungeon')
      || (q.kind === ev.kind && NEED[q.kind]);
    if (!hit) continue;
    q.have = Math.min(q.need, q.have + n);
    if (q.have >= q.need) { q.done = true; out.push(q); }
  }
  return out;
}
// 마을 쪽 진행 (생산 · 제작 · 파견): 끝난 것은 알림 줄에 쌓아 두고 world가 알린다
export function lifeProgress(st, kind, n = 1) {
  const done = dailyProgress(st, { kind }, n);
  if (done.length) (st.dailyNew ||= []).push(...done);
}
