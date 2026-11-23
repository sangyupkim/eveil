// 강화 계승 시뮬레이션: +N 장비를 새 장비에 녹일 때 넘어가는 단계 — 방식별로 남는 투자(금화 · 시도 수)와 괴로움(크게 잃을 확률)
import { ENHANCE } from '../../src/data/buildings.js';
const ILVL = 600, RUNS = 4000;
// 한 단계(n → n+1)를 올리는 데 드는 시도 수 (게임 공식: 확률 · 실패 보정 · 장인의 기운)
function triesAt(n, rng = Math.random) {
  const hk = Math.max(0.5, 1 - ILVL / 750), base = n < 2 ? ENHANCE.chance(n) : ENHANCE.chance(n) * hk;
  let fails = 0, jang = 0, t = 0;
  for (;;) { t++; const ch = jang >= 1 ? 1 : Math.min(1, base + Math.min(base, base * 0.1 * fails)); if (rng() < ch) return t; fails++; jang = Math.min(1, jang + ch * 0.465); }
}
const MAX = 60, avgT = [], gold = [];
for (let n = 0; n < MAX; n++) { let s = 0; for (let i = 0; i < 2000; i++) s += triesAt(n); avgT[n] = s / 2000; gold[n] = avgT[n] * ENHANCE.gold(n, ILVL); }
const cumT = [0], cumG = [0]; for (let n = 0; n < MAX; n++) { cumT.push(cumT[n] + avgT[n]); cumG.push(cumG[n] + gold[n]); }
console.log('단계당 평균 시도: +1~10', avgT.slice(0, 10).map((x) => x.toFixed(1)).join(' '), '| +11~20', avgT.slice(10, 20).map((x) => x.toFixed(1)).join(' '), '| +21~', avgT[20].toFixed(1));
console.log('누적 시도 +10', cumT[10].toFixed(0), '+20', cumT[20].toFixed(0), '+30', cumT[30].toFixed(0), '+40', cumT[40].toFixed(0));
// 방식: 넘어가는 단계 M = floor(N × 비율) — 실패면 실패 비율
const WAYS = {
  '고정 80%': () => 0.8,
  '50~80% 무작위': (r) => 0.5 + r() * 0.3,
  '50~80% + 실패 10%(30%만)': (r) => (r() < 0.1 ? 0.3 : 0.5 + r() * 0.3),
  '50~80% + 실패 10%(0)': (r) => (r() < 0.1 ? 0 : 0.5 + r() * 0.3),
  '50~80% + 장인의 기운(실패 없음, 3번째 계승은 80%)': null, // 아래에서 따로
};
const rows = [];
for (const N of [15, 20, 30, 40]) for (const [nm, f] of Object.entries(WAYS)) {
  let sumG = 0, sumT = 0, bad = 0, worst = 1, lv = 0;
  for (let i = 0; i < RUNS; i++) {
    const k = f ? f(Math.random) : (i % 3 === 2 ? 0.8 : 0.5 + Math.random() * 0.3);
    const M = Math.floor(N * k), keepG = cumG[M] / cumG[N], keepT = cumT[M] / cumT[N];
    sumG += keepG; sumT += keepT; lv += M; if (keepT < 0.4) bad++; worst = Math.min(worst, keepT);
  }
  rows.push({ '+N': N, 방식: nm, '넘어간 단계(평균)': '+' + (lv / RUNS).toFixed(1), '남는 시도': (sumT / RUNS * 100).toFixed(0) + '%', '남는 금화': (sumG / RUNS * 100).toFixed(0) + '%', '시도 40% 미만 확률': (bad / RUNS * 100).toFixed(1) + '%', '최악': (worst * 100).toFixed(0) + '%' });
}
console.table(rows);
// 투자량(시도 수) 기준 50 ~ 80%: 남길 시도 수를 정하고 그만큼의 단계로
const lvOfT = (T) => { let n = 0; while (n < MAX && cumT[n + 1] <= T) n++; return n; };
const rows2 = [];
for (const N of [15, 20, 30, 40]) { let lv = 0, sG = 0, sT = 0, bad = 0; for (let i = 0; i < RUNS; i++) { const k = 0.5 + Math.random() * 0.3, M = lvOfT(cumT[N] * k); lv += M; sT += cumT[M] / cumT[N]; sG += cumG[M] / cumG[N]; if (cumT[M] / cumT[N] < 0.4) bad++; } rows2.push({ '+N': N, '넘어간 단계(평균)': '+' + (lv / RUNS).toFixed(1), 범위: `+${lvOfT(cumT[N] * 0.5)} ~ +${lvOfT(cumT[N] * 0.8)}`, '남는 시도': (sT / RUNS * 100).toFixed(0) + '%', '남는 금화': (sG / RUNS * 100).toFixed(0) + '%', '시도 40% 미만': (bad / RUNS * 100).toFixed(1) + '%' }); }
console.log('투자량 기준 50 ~ 80%'); console.table(rows2);
