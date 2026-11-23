// v0.50 세계 단계 곡선: 악몽 · 지옥 · 혼돈의 지역은 「평온 종말의 왕좌」에 이어 지역마다
//   몬스터 체력 ×1.12 · 공격 ×1.035 · 경험치 ×1.15 (목표값). 지역마다 몬스터 원래 체력이 20배까지 달라 배율이 아니라 목표값으로 맞춘다.
// 예전: 악몽 푸리에 들판 몬스터 체력이 평온 끝의 1% · 경험치 0.04% (지역 배율이 1번 지역 값으로 다시 시작해서)
import { ZONES, MONSTERS, TIER_STEP } from './world.js';
import { CHAPTER } from './chapters.js';
import { expNeeded } from '../game/growth.js';
import { muganHp, muganDmg } from './mugan.js';
// v0.49.74 경험치는 복리(×1.15)가 아니라 「각성 1당 처치 수」 목표에서 거꾸로 (높은 각성일수록 더 오래 걸린다는 대전제)
//   자동 사냥(경험치 ×0.45) 기준, 지역 끝 레벨에서 레벨 120 → 1,000마리 · 500 → 1,500마리
export const killsPerAwaken = (L) => (L <= 500 ? 1000 * (1 + Math.max(0, L - 120) / 760) : 1500 * Math.pow(1 + (L - 500) / 100, 0.8)); // 무간 n층(레벨 500 + 10n): 1,500 × (1 + n/10)^0.8
const AUTO_EXP = 0.45;
export const CURVE = { hp: 1.12, dmg: 1.035, exp: 1.15 }; // v0.49.72 공격 1.10 → 1.035 (1.10은 60지역에 ×304라 혼돈에서 고스펙도 한 방에 죽었다 — tools/sim/survive · farm)
const OFF = { 1: 0, 2: TIER_STEP, 3: TIER_STEP * 2, 4: 380 };
const lvHp = (L) => 1 + 0.4 * (L - 1), lvDmg = (L) => 1 + 0.27 * (L - 1), lvExp = (L) => 1 + 0.3 * (L - 1);
const avg = (zn) => { const ts = Object.keys(zn.spawns); let h = 0, d = 0, e = 0; for (const t of ts) { const m = MONSTERS[t]; h += m.hp; d += (m.dmg[0] + m.dmg[1]) / 2; e += m.exp; } return { hp: h / ts.length, dmg: d / ts.length, exp: e / ts.length }; };
let END = null;
const end = () => { if (END) return END; const zi = ZONES.length - 1, zn = ZONES[zi], a = avg(zn), L = zn.levels[1], C = CHAPTER[zi]; return (END = { hp: a.hp * lvHp(L) * C.hp, dmg: a.dmg * lvDmg(L) * C.dmg, exp: a.exp * lvExp(L) * C.exp }); };
const cache = new Map();
// 세계 단계 wt(2~4) · 지역 zi의 일반 몬스터 배율 { hp, dmg, exp } (평온은 null → chapters.js 그대로)
// v0.49.75 무간지옥(wt 5) n층: 혼돈의 그 지역 값에서 체력 · 공격만 층 배율 (지역 레벨은 + 10n), 경험치는 목표 처치 수
export function muganCurveK(zi, n) {
  const k4 = tierCurveK(zi, 4); if (!k4) return null;
  const zn = ZONES[zi], L4 = zn.levels[1] + 380, L = L4 + 10 * n, a = avg(zn);
  return { hp: (k4.hp * lvHp(L4) * muganHp(n)) / lvHp(L), dmg: (k4.dmg * lvDmg(L4) * muganDmg(n)) / lvDmg(L), exp: expNeeded(Math.max(0, L - 1)) / (killsPerAwaken(L) * a.exp * lvExp(L) * AUTO_EXP) };
}
export function tierCurveK(zi, wt) {
  if (wt <= 1 || zi < 0 || !ZONES[zi]) return null;
  const key = zi * 10 + wt; if (cache.has(key)) return cache.get(key);
  const zn = ZONES[zi], a = avg(zn), L = zn.levels[1] + OFF[wt], n = zi + 1 + ZONES.length * (wt - 2), E = end();
  const k = { hp: (E.hp * CURVE.hp ** n) / (a.hp * lvHp(L)), dmg: (E.dmg * CURVE.dmg ** n) / (a.dmg * lvDmg(L)), exp: expNeeded(Math.max(0, L - 1)) / (killsPerAwaken(L) * a.exp * lvExp(L) * AUTO_EXP) };
  cache.set(key, k); return k;
}
