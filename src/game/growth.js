// 행동 기반 성장 — "각성".
// 행동마다 해당 스탯의 행동 포인트(AP)를 쌓고, EXP가 다 차면 AP 비율대로 스탯을 나눠 준다.
import { CONFIG, STATS } from '../data/config.js';
import { R } from './rng.js';

export const expNeeded = (n) => Math.floor(CONFIG.expBase * Math.pow(CONFIG.expGrowth, n));

// 레벨 대신 내부적으로 쓰는 강함 지표 (몬스터 레벨과 비교용)
export const powerLevel = (st) => 1 + st.awakenings * 0.5;

// 몬스터 레벨에 따른 보상 배율: 너무 약한 적은 AP 0, EXP 20%
export function rewardFactor(st, monLevel) {
  if (monLevel < powerLevel(st) - CONFIG.weakMonsterGap) return { exp: CONFIG.weakMonsterExp, ap: 0 };
  return { exp: 1, ap: 1 };
}

// 높은 스탯일수록 같은 행동의 AP가 덜 쌓인다 (한 스탯 무한 성장 방지)
export function softCap(value) {
  const over = Math.max(0, value - CONFIG.apSoftCapStart);
  return CONFIG.apSoftCapScale / (CONFIG.apSoftCapScale + over);
}

export function addAP(st, stat, amount, mult = 1) {
  if (!stat || !(amount > 0) || !(mult > 0)) return 0;
  const v = amount * mult * softCap(st.stats[stat]);
  st.ap[stat] += v;
  st.apTotal[stat] += v;
  return v;
}

// AP 비율대로 points를 정수로 나눈다 (최대 나머지 방식, 동률은 무작위)
export function distribute(ap, points, rng = R) {
  const gains = Object.fromEntries(STATS.map((s) => [s, 0]));
  const total = STATS.reduce((a, s) => a + Math.max(0, ap[s]), 0);
  if (total <= 0) {
    // 아무 행동도 없었다면 고르게
    for (let i = 0; i < points; i++) gains[STATS[Math.floor(rng() * STATS.length)]]++;
    return gains;
  }
  const rest = [];
  let given = 0;
  for (const s of STATS) {
    const share = (points * Math.max(0, ap[s])) / total;
    gains[s] = Math.floor(share);
    given += gains[s];
    rest.push([s, share - gains[s] + rng() * 1e-6]);
  }
  rest.sort((a, b) => b[1] - a[1]);
  for (let i = 0; given < points; i++, given++) gains[rest[i % rest.length][0]]++;
  return gains;
}

// EXP를 더하고, 일어난 각성 목록을 돌려준다
export function gainExp(st, amount, rng = R) {
  const results = [];
  if (!(amount > 0)) return results;
  st.exp += amount;
  while (st.exp >= expNeeded(st.awakenings)) {
    st.exp -= expNeeded(st.awakenings);
    const total = STATS.reduce((a, s) => a + st.ap[s], 0);
    const shares = Object.fromEntries(STATS.map((s) => [s, total > 0 ? st.ap[s] / total : 0]));
    const gains = distribute(st.ap, CONFIG.awakenPoints, rng);
    for (const s of STATS) {
      st.stats[s] += gains[s];
      st.ap[s] *= CONFIG.apKeepAfterAwaken;
    }
    st.awakenings++;
    results.push({ n: st.awakenings, gains, shares });
  }
  return results;
}

export const expRatio = (st) => st.exp / expNeeded(st.awakenings);
