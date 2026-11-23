// v0.50 주간 「왕좌 원정」 (docs/기획_밸런스_v0.50.md 8장)
//  평온 종말의 왕좌 보스를 잡으면 열린다. 마을 차원문 옆 「왕좌의 문」.
//  주마다(월요일 0시 한국 시간) 모든 이용자가 같은 구성: 지역 보스 셋 → 원정 군주 하나 · 던전 변이 둘 + 원정 규칙 하나.
//  보스 사이 20초 정비에 축복 셋 중 하나(이번 원정 동안). 회복 축복은 없다. 15분 · 쓰러지면 실패.
import { weekKey } from '../game/daily.js';
import { seeded } from '../game/rng.js';
import { ZONES } from './world.js';
import { MUTS } from './mutators.js';

export const RAID_SPOT = { x: -4.6, z: -5.2 };
export const RAID = {
  limit: 15 * 60,        // 초
  rest: 20,              // 보스 사이 정비 (초)
  claims: 3,             // 주마다 보상 횟수
  bossHp: 0.6,           // 원정 보스 체력 (왕좌 보스 기준 ×, 보스마다 기본 체력이 달라 맞춘다) — 첫 수치: 등급 I 전체 ≈ 왕좌 필드 보스 3마리
  lordHp: 1.2,           // 원정 군주 체력
  arena: 'throne',       // 싸우는 곳: 이 지역 던전의 우두머리 터
};
// 등급 I ~ V: 보스 체력 · 공격, 원정 문장
export const RAID_GRADES = [
  { name: 'I', hp: 1, dmg: 1, emb: 10 },
  { name: 'II', hp: 1.4, dmg: 1.4, emb: 20 },
  { name: 'III', hp: 2, dmg: 2, emb: 30 },
  { name: 'IV', hp: 2.8, dmg: 2.8, emb: 40 },
  { name: 'V', hp: 4, dmg: 4, emb: 50 },
];
// 원정 군주 6종 (몸은 지역 보스 모습을 빌린다)
export const LORDS = [
  { id: 'twins', name: '쌍둥이 왕', type: 'crystal_king', tint: 0x9ad0ff, text: '둘의 체력 차이가 15%를 넘으면 둘 다 회복합니다' },
  { id: 'mirror', name: '거울 군주', type: 'temple_king', tint: 0xd8d8ff, text: '내 퀵슬롯의 스킬을 베껴 씁니다' },
  { id: 'maw', name: '심연의 입', type: 'abyss_king', tint: 0x9a6aff, text: '전장이 점점 줄어듭니다 · 졸개를 잡으면 넓어집니다' },
  { id: 'time', name: '시간의 군주', type: 'storm_king', tint: 0xffe08a, text: '30초마다 체력을 되감습니다 · 직전에 큰 피해로 끊습니다' },
  { id: 'chain', name: '사슬 왕', type: 'crypt_king', tint: 0xb0b0b0, text: '사슬로 묶어 끌어당깁니다 · 보조기로 끊습니다' },
  { id: 'colossus', name: '종말의 거신', type: 'troll_king', tint: 0xff9a7a, text: '무력화 게이지를 채우면 쓰러져 받는 피해가 2배가 됩니다' },
];
// 원정 규칙 (주마다 하나)
export const RAID_RULES = {
  utilcd: { name: '흐르는 시간', text: '보조기 재사용 대기 −30%' },
  nocrit: { name: '무딘 칼날', text: '치명타가 터지지 않는 대신 피해 +40%' },
  quake: { name: '무너지는 왕좌', text: '10초마다 바닥이 무너집니다' },
  glass: { name: '유리 대포', text: '주는 피해 · 받는 피해 +30%' },
};
// 원정에 쓰는 던전 변이 (시간 제한 · 졸개 변이 · 정예는 빼고)
export const RAID_MUTS = ['frozen', 'burning', 'storm', 'frenzy', 'hard', 'ward', 'dark', 'wound', 'drain', 'slowcd'].filter((k) => MUTS[k]);
// 축복 (보스 사이 정비에 셋 중 하나) — buff: 플레이어 버프 키 (player.js derive), 나머지는 원정 전용
export const BLESS = {
  might: { name: '전투의 축복', text: '피해 +12%', buff: 'might', v: 12 },
  haste: { name: '질풍의 축복', text: '공격 속도 +15%', buff: 'haste', v: 15 },
  focus: { name: '매의 축복', text: '치명타 확률 +10%', buff: 'focus', v: 10 },
  swift: { name: '바람의 축복', text: '이동 속도 +15%', buff: 'swift', v: 15 },
  bossSk: { name: '처형의 축복', text: '보스기 피해 +25%' },
  guard: { name: '수호의 축복', text: '받는 피해 −15%' },
  cdr: { name: '흐름의 축복', text: '재사용 대기 −10%' },
};
export const BLESS_IDS = Object.keys(BLESS);

const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// 이번 주 구성 (모든 이용자 같음)
export function raidWeek(wk = weekKey()) {
  const rng = seeded(hash('raid' + wk));
  const lord = LORDS[Math.floor(rng() * LORDS.length)];
  const pool = ZONES.filter((z) => z.id !== RAID.arena && z.boss?.type && z.boss.type !== lord.type);
  const bosses = [];
  while (bosses.length < 3) { const z = pool.splice(Math.floor(rng() * pool.length), 1)[0]; bosses.push(z.id); }
  const mp = [...RAID_MUTS], muts = [];
  while (muts.length < 2 && mp.length) { const id = mp.splice(Math.floor(rng() * mp.length), 1)[0]; if (MUTS[id].group && muts.some((x) => MUTS[x].group === MUTS[id].group)) continue; muts.push(id); }
  const rk = Object.keys(RAID_RULES), rule = rk[Math.floor(rng() * rk.length)];
  return { wk, lord, bosses, muts, rule };
}
// 이번 주 내 기록 (주가 바뀌면 새로)
export function raidOf(st, wk = weekKey()) {
  if (!st.raid || st.raid.wk !== wk) st.raid = { wk, claims: 0, best: {}, buys: {} };
  st.raid.best ||= {}; st.raid.buys ||= {};
  return st.raid;
}
export const raidOpen = (st) => (st.finalBoss || 0) >= 1 || !!st.bossDone?.throne;
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// 원정 문장 상점 (상인 오르텐 「원정」 탭): 값 · 주 한도 (group: 한도를 함께 쓰는 묶음)
//  구멍 뚫기권은 지금까지 뚫은 구멍 수에 따라 40 · 80 · 150
export const RAID_SHOP = [
  { id: 'whetstone', price: 15, lim: 5 },
  { id: 't_reroll', price: 30, lim: 3 },
  { id: 't_socket', price: (st) => [40, 80, 150][Math.min(2, st.raidSock || 0)], lim: 1 },
  { id: 't_engx', price: 50, lim: 1 },
  { id: 't_shardx', price: 60, lim: 2 },
  { id: 't_engrave', price: 80, lim: 1 },
  { id: 'box_shard', price: 50, lim: 2, group: 'box' },
  { id: 'box_gear', price: 70, lim: 2, group: 'box' },
  { id: 't_inherit', price: 20, lim: 5 }, { id: 't_inherit2', price: 60, lim: 1 }, // v0.49.75 계승권 · 계승 축복석
  { id: 't_book', price: 100, lim: 1 },
  ...LORDS.map((L) => ({ id: 'title_' + L.id, title: L.id, price: 200, lim: 1, once: true })),
];
export const shopPrice = (g, st) => (typeof g.price === 'function' ? g.price(st) : g.price);
// 이번 주 산 수 (묶음은 합쳐서)
export const shopBought = (rd, g) => (g.group ? RAID_SHOP.filter((x) => x.group === g.group).reduce((a, x) => a + (rd.buys[x.id] || 0), 0) : rd.buys[g.id] || 0);
// 원정 군주 각인 (신화 장비 한 줄)
export const ENGRAVE = {
  twins: { text: '보스기 피해 +15%' },
  mirror: { text: '스킬 세트를 바꾸면 5초 동안 피해 +20%' },
  maw: { text: '사냥기 피해 +12%' },
  time: { text: '보조기를 쓰면 다른 스킬 재사용 대기 −1초' },
  chain: { text: '보조기를 쓰면 2초 동안 받는 피해 −30%' },
  colossus: { text: '보스 · 네임드에게 주는 피해 +10%' },
};
export const lordName = (id) => LORDS.find((L) => L.id === id)?.name || id;
