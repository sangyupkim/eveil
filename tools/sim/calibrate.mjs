// 챕터 목표에 맞춰 src/data/chapters.js의 배율을 계산해 쓴다 (검 · 활 · 지팡이 평균). node tools/sim/calibrate.mjs
import { writeFileSync } from 'node:fs';
import { ZONES } from '../../src/data/world.js';
import { CHAPTER } from '../../src/data/chapters.js';
import { chapterRow, setClass } from './chapter.mjs';
const lerp = (pts, i) => { const k = Object.keys(pts).map(Number).sort((a, b) => a - b); for (let j = 0; j < k.length - 1; j++) if (i <= k[j + 1]) { const t = (i - k[j]) / (k[j + 1] - k[j]); return pts[k[j]] + t * (pts[k[j + 1]] - pts[k[j]]); } return pts[k[k.length - 1]]; };
const T = {
  minutes: (i) => [15, 20, 25, 35][i - 1] ?? 35 + 5 * (i - 4) + (i >= 20 ? 5 : 0),
  ttkIn: (i) => lerp({ 1: 1.5, 3: 2.5, 5: 3, 10: 4, 20: 5 }, i),
  ttdIn: (i) => lerp({ 1: 150, 2: 70, 3: 40, 5: 30, 10: 22, 20: 16 }, i), // 처음 두 챕터는 새로 시작한 사람을 위해 넉넉히
  bossOut: (i) => (i === 20 ? 240 : lerp({ 1: 30, 5: 45, 10: 60, 19: 90 }, i)), // 최종 보스는 4분
  bossTtd: (i) => (i === 20 ? 10 : lerp({ 1: 40, 5: 25, 10: 20, 19: 15 }, i)),
};
const avgRows = () => ZONES.map((_, zi) => { const rs = ['sword', 'bow', 'staff'].map((c) => { setClass(c); return chapterRow(zi); }); const o = {}; for (const k of Object.keys(rs[0])) o[k] = typeof rs[0][k] === 'number' ? rs.reduce((a, r) => a + r[k], 0) / 3 : rs[0][k]; return o; });
CHAPTER.length = 0;
const base = avgRows();
const r2 = (v) => Math.round(v * 100) / 100;
ZONES.forEach((_, zi) => { const i = zi + 1, b = base[zi]; const hp = T.ttkIn(i) / b.ttkIn, dmg = b.ttdIn / T.ttdIn(i); CHAPTER[zi] = { hp: r2(hp), dmg: r2(dmg), boss: r2(T.bossOut(i) / (b.bossOut * hp)), bossDmg: r2(b.bossTtdOut / (dmg * T.bossTtd(i))), exp: 1 }; });
const mid = avgRows();
ZONES.forEach((_, zi) => { CHAPTER[zi].exp = r2(mid[zi].minutes / T.minutes(zi + 1)); });
const out = `// 챕터(지역)별 난이도 보정: 몬스터 체력 · 공격 · 보스 체력 · 보스 공격 · 경험치 배율.
// tools/sim/calibrate.mjs가 목표(챕터 시간 · 처치 시간 · 버티는 시간 · 보스)에 맞춰 계산해 쓴 값. 손으로 고치지 말고 목표를 고쳐 다시 돌린다.
export const CHAPTER = [
${CHAPTER.map((c, zi) => `  { hp: ${c.hp}, dmg: ${c.dmg}, boss: ${c.boss}, bossDmg: ${c.bossDmg}, exp: ${c.exp} }, // ${zi + 1} ${ZONES[zi].name}`).join('\n')}
];
export const chapterK = (zi, tier = 'normal') => {
  const c = CHAPTER[zi] || {};
  return { hp: (c.hp || 1) * (tier === 'boss' ? c.boss || 1 : 1), dmg: (c.dmg || 1) * (tier === 'boss' ? c.bossDmg || 1 : 1), exp: c.exp || 1 };
};
`;
writeFileSync(new URL('../../src/data/chapters.js', import.meta.url), out);
console.log(out);
