// 지역마다: 일반 몬스터 평균 한 대(방어 전) 새 곡선 vs 예전(TIER_K) · 고스펙 체력 캐릭터 체력 · 방어 뒤 한 대 / 체력
import '../../src/data/skill_fx.js';
import { ZONES, MONSTERS, TIER_STEP } from '../../src/data/world.js';
import { chapterK as chapterK0 } from '../../src/data/chapters.js';
import { tierCurveK } from '../../src/data/tiercurve.js';
const TIER_K = { 1: 1, 2: 1.45, 3: 2, 4: 3.6 }, OFF = [0, TIER_STEP, TIER_STEP * 2, 380];
const out = [];
for (const wt of [1, 2, 3, 4]) for (let zi = 0; zi < ZONES.length; zi += 1) {
  const zn = ZONES[zi], L = zn.levels[1] + OFF[wt - 1], ts = Object.keys(zn.spawns);
  const avg = ts.reduce((a, t) => a + (MONSTERS[t].dmg[0] + MONSTERS[t].dmg[1]) / 2, 0) / ts.length, lv = 1 + 0.27 * (L - 1);
  const old = avg * lv * chapterK0(zi, 'normal').dmg * TIER_K[wt], t = tierCurveK(zi, wt), now = t ? avg * lv * t.dmg : old;
  if (zi % 4 === 3 || zi === 19 || zi === 0) out.push({ wt, zi, zone: zn.name, L, old: Math.round(old), now: Math.round(now), ratio: (now / old).toFixed(2) });
}
console.table(out);
