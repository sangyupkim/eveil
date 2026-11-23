// v0.50 세계 단계 곡선: 악몽 · 지옥 · 혼돈의 지역은 「평온 종말의 왕좌」에 이어 지역마다
//   몬스터 체력 ×1.12 · 공격 ×1.10 · 경험치 ×1.15 (목표값). 지역마다 몬스터 원래 체력이 20배까지 달라 배율이 아니라 목표값으로 맞춘다.
// 예전: 악몽 푸리에 들판 몬스터 체력이 평온 끝의 1% · 경험치 0.04% (지역 배율이 1번 지역 값으로 다시 시작해서)
import { ZONES, MONSTERS, TIER_STEP } from './world.js';
import { CHAPTER } from './chapters.js';
export const CURVE = { hp: 1.12, dmg: 1.1, exp: 1.15 };
const OFF = { 1: 0, 2: TIER_STEP, 3: TIER_STEP * 2, 4: 380 };
const lvHp = (L) => 1 + 0.4 * (L - 1), lvDmg = (L) => 1 + 0.27 * (L - 1), lvExp = (L) => 1 + 0.3 * (L - 1);
const avg = (zn) => { const ts = Object.keys(zn.spawns); let h = 0, d = 0, e = 0; for (const t of ts) { const m = MONSTERS[t]; h += m.hp; d += (m.dmg[0] + m.dmg[1]) / 2; e += m.exp; } return { hp: h / ts.length, dmg: d / ts.length, exp: e / ts.length }; };
let END = null;
const end = () => { if (END) return END; const zi = ZONES.length - 1, zn = ZONES[zi], a = avg(zn), L = zn.levels[1], C = CHAPTER[zi]; return (END = { hp: a.hp * lvHp(L) * C.hp, dmg: a.dmg * lvDmg(L) * C.dmg, exp: a.exp * lvExp(L) * C.exp }); };
const cache = new Map();
// 세계 단계 wt(2~4) · 지역 zi의 일반 몬스터 배율 { hp, dmg, exp } (평온은 null → chapters.js 그대로)
export function tierCurveK(zi, wt) {
  if (wt <= 1 || zi < 0 || !ZONES[zi]) return null;
  const key = zi * 10 + wt; if (cache.has(key)) return cache.get(key);
  const zn = ZONES[zi], a = avg(zn), L = zn.levels[1] + OFF[wt], n = zi + 1 + ZONES.length * (wt - 2), E = end();
  const k = { hp: (E.hp * CURVE.hp ** n) / (a.hp * lvHp(L)), dmg: (E.dmg * CURVE.dmg ** n) / (a.dmg * lvDmg(L)), exp: (E.exp * CURVE.exp ** n) / (a.exp * lvExp(L)) };
  cache.set(key, k); return k;
}
