// 무한 강화 시뮬레이션: 지금 공식을 +20 뒤로 늘렸을 때
const P = JSON.parse(process.argv[2] || '{}');
const chanceOf = (n) => (n >= 20 && P.c20 ? P.c20 : [1, 1, 0.9, 0.7, 0.5, 0.35, 0.25, 0.15, 0.1, 0.05][n] ?? (P.floor ?? 0.05));
const goldOf = (n, ilvl) => (60 + ilvl * 15) * Math.pow(1.6, Math.min(n, 10)) * Math.pow(P.g ?? 1.25, Math.max(0, n - 10)) * (n >= 20 && P.g2 ? Math.pow(P.g2 / (P.g ?? 1.25), n - 20) : 1);
const plusK = (n) => { const a = Math.min(n, 20), b = Math.max(0, n - 20); return 1 + 0.08 * a + 0.05 * Math.floor(a / 5) + (P.per2 ?? 0.08) * b + (P.per2 ? 0 : 0.05 * (Math.floor(n / 5) - Math.floor(a / 5))); };
const hk = (ilvl) => Math.max(0.5, 1 - ilvl / 750);
// 한 단계 올리는 기대 시도 수 (실패마다 +10% 기본, 장인의 기운 = 시도 확률 × 0.465씩 쌓여 1이면 확정)
function tries(n, ilvl, runs = 4000) {
  let tot = 0;
  for (let r = 0; r < runs; r++) { let f = 0, jang = 0, k = 0; for (;;) { k++; const base = n < 2 || (n >= 20 && P.c20) ? chanceOf(n) : chanceOf(n) * hk(ilvl), up = Math.min(base, base * 0.1 * f), c = jang >= 1 ? 1 : Math.min(1, base + up); if (Math.random() < c) break; f++; jang = Math.min(1, jang + c * 0.465); } tot += k; }
  return tot / runs;
}
const ilvl = P.ilvl ?? 500, gph0 = P.gph ?? 1.5e6; // 시간당 금화 (혼돈 자동 사냥 · 판매 · 파견 합쳐 대략)
let gold = 0, hours = 0;
const rows = [];
for (let n = 0; n < (P.max ?? 100); n++) {
  const t = tries(n, ilvl, 800), g = (n >= 20 && P.flat20 ? goldOf(19, ilvl) * P.flat20 * Math.pow(P.g2 ?? 1.05, n - 20) : goldOf(n, ilvl)) * t; gold += g;
  const gph = gph0 * (1 + (P.incGrowth ?? 0) * hours / 100); hours += g / gph;
  if ([10, 15, 20, 25, 30, 40, 50, 60, 75, 100].includes(n + 1)) rows.push(`+${n + 1}: 위력 ×${plusK(n + 1).toFixed(1)} (+20 대비 ×${(plusK(n + 1) / plusK(20)).toFixed(2)}) · 한 단계 ${t.toFixed(0)}번 시도 ${(g / 1e6).toFixed(1)}M · 누적 ${(gold / 1e6).toFixed(0)}M = ${hours < 48 ? hours.toFixed(0) + '시간' : (hours / 24).toFixed(0) + '일'} (하루 4시간이면 ${(hours / 4).toFixed(0)}일)`);
}
console.log(`── ${P.note || ''} · 장비 레벨 ${ilvl} · 시간당 금화 ${(gph0 / 1e6).toFixed(1)}M`);
console.log(rows.join('\n'));
