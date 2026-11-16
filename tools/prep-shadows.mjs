// 몬스터마다 그림자 너비(sw)를 enemies.json에 적는다 (v0.44.4): 서 있는 정면 그림에서 실제로 칠해진 아래쪽 너비
// node tools/prep-shadows.mjs
import fs from 'node:fs';
import sharp from 'sharp';
const J = 'assets/flare/enemies.json', E = JSON.parse(fs.readFileSync(J, 'utf8'));
const BAKED = new Set(['x_knight']); // 그림 안에 그림자가 있는 것
const cache = {};
for (const [k, d] of Object.entries(E)) {
  if (BAKED.has(k)) { d.noShadow = true; delete d.sw; continue; }
  if (!k.startsWith('x_')) { delete d.sw; continue; } // 예전 Flare 몬스터는 원래 타원(52) 그대로
  const f = d.anims?.stance?.f?.[6]?.[0] || d.anims?.stance?.f?.[0]?.[0], img = d.images?.default;
  if (!f || !img) continue;
  try {
    const raw = cache[img] ||= await sharp('assets/flare/' + img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const [x, y, w, h] = f, W = raw.info.width;
    // 아래쪽 1/3에서 칠해진 가로 범위 (발 · 몸 아래)
    let L = w, R = -1;
    for (let yy = y + Math.floor(h * 0.6); yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (raw.data[(yy * W + xx) * 4 + 3] > 60) { if (xx - x < L) L = xx - x; if (xx - x > R) R = xx - x; }
    if (R < 0) continue;
    d.sw = Math.round(Math.max(24, Math.min(90, (R - L + 1) * (d.px || 1) * 0.9)));
  } catch { /* 그림 없음 */ }
}
fs.writeFileSync(J, JSON.stringify(E));
console.log(Object.entries(E).filter(([, d]) => d.sw).map(([k, d]) => k + ':' + d.sw).join(' '));
