// v0.44.26 16방향 렌더 몬스터의 발 기준점 맞추기: 정면 한 장으로 잡은 기준점 때문에 옆 · 뒤 모습이 땅에서 떠 보였다.
// 서 있는 모습 8방향의 (그림자를 뺀) 가장 아래 점 평균에 기준점을 둔다. node tools/fix-anchor.mjs x_이름 ...
import fs from 'node:fs';
import sharp from 'sharp';
const J = 'assets/flare/enemies.json', E = JSON.parse(fs.readFileSync(J, 'utf8'));
for (const n of process.argv.slice(2)) {
  const e = E[n]; if (!e) continue;
  const { data, info } = await sharp('assets/flare/' + e.images.default).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const gaps = [];
  for (let d = 0; d < 8; d++) {
    const [x, y, w, h, , oy] = e.anims.stance.f[d][0]; let B = -1;
    for (let yy = y + h - 1; yy >= y && B < 0; yy--) for (let xx = x; xx < x + w; xx++) { const k = (yy * info.width + xx) * 4; if (data[k + 3] > 200 && data[k] + data[k + 1] + data[k + 2] > 90) { B = yy - y; break; } }
    if (B >= 0) gaps.push(oy - B);
  }
  const g = Math.round(gaps.reduce((a, v) => a + v, 0) / gaps.length) + 4; // 그림자 위에 발이 닿게 조금 더 묻는다
  if (g <= 0) { console.log(n, 'ok', gaps.join(' ')); continue; }
  for (const an of Object.values(e.anims)) for (const d in an.f) an.f[d] = an.f[d].map((r) => r && [r[0], r[1], r[2], r[3], r[4], r[5] - g]);
  console.log(n, '-' + g, gaps.join(' '));
}
fs.writeFileSync(J, JSON.stringify(E));
