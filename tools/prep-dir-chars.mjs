// 16방향 3D 렌더 캐릭터(사용자가 받은 묶음: 「2D Directional」 오크 · 야수 전사)를 enemies.json 몬스터로 바꾼다 (v0.43)
// node tools/prep-dir-chars.mjs <푼 폴더 루트>
//  - 16방향 중 8방향만 (각도 000 = 아래, 090 = 오른쪽, 180 = 위, 270 = 왼쪽 → Flare 방향 0 왼 · 2 위 · 4 오 · 6 아래)
//  - 동작마다 프레임은 10장까지 고르게 뽑고, 투명 테두리를 잘라 한 장(가로 2048)에 선반식으로 담는다. 기준점 = 발밑
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const ROOT = process.argv[2], OUT = 'assets/flare', J = path.join(OUT, 'enemies.json');
const SPECS = [
  { name: 'x_beast_warrior', k: 0.8, sheet: { dir: 'opt/x180p_Spritesheets', cell: 180 },
    anims: { stance: ['Idle_Simple', 1000, 'looped'], run: ['Run', 560, 'looped'], swing: ['Attack_01', 650, 'play_once'], cast: ['Attack_03', 800, 'play_once'], hit: ['Hit', 300, 'play_once'], die: ['Death_from_Idle', 900, 'play_once'], block: ['Block_Idle', 600, 'looped'] } },
  { name: 'x_heavy_orc', k: 0.6, sheet: { dir: 'heavy/x240p_Spritesheets', cell: 240 },
    anims: { stance: ['Idle_Armed', 1000, 'looped'], run: ['Run_Armed', 600, 'looped'], swing: ['Attack_01', 700, 'play_once'], cast: ['Roar', 1000, 'play_once'], hit: ['Hit_Armed', 300, 'play_once'], die: ['Death_Armed', 1000, 'play_once'], block: ['Idle_Block', 600, 'looped'] } },
  { name: 'x_orc_brute', k: 0.56, frames: { dir: 'noarm/256x256', cell: 256 },
    anims: { stance: ['Idle_Armed', 1000, 'looped'], run: ['Run_Armed', 600, 'looped'], swing: ['Attack_01', 700, 'play_once'], cast: ['Roar', 1000, 'play_once'], hit: ['Hit_Armed', 300, 'play_once'], die: ['Death_Armed', 1000, 'play_once'] } },
];
const ang = (d) => String(((6 - d + 8) % 8) * 45).padStart(3, '0');
const pickN = (arr, n = 10) => (arr.length <= n ? arr : Array.from({ length: n }, (_, i) => arr[Math.round((i * (arr.length - 1)) / (n - 1))]));
async function sheetFrames(file, cell) {
  const img = sharp(file), m = await img.metadata(), cols = Math.floor(m.width / cell), rows = Math.floor(m.height / cell), out = [];
  const raw = await sharp(file).ensureAlpha().raw().toBuffer();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let any = false;
    for (let y = r * cell; y < (r + 1) * cell && !any; y += 3) for (let x = c * cell; x < (c + 1) * cell; x += 3) if (raw[(y * m.width + x) * 4 + 3] > 20) { any = true; break; }
    if (any) out.push({ file, left: c * cell, top: r * cell });
  }
  return out;
}
const enemies = JSON.parse(fs.readFileSync(J, 'utf8'));
for (const S of SPECS) {
  const cell = (S.sheet || S.frames).cell, cs = Math.round(cell * S.k), pieces = [];
  for (const [an, [src]] of Object.entries(S.anims)) for (let d = 0; d < 8; d++) {
    let fr;
    if (S.sheet) fr = await sheetFrames(path.join(ROOT, S.sheet.dir, src, `${src}_Body_${ang(d)}.png`), cell);
    else { const dir = path.join(ROOT, S.frames.dir, src, 'Body', ang(d)); fr = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort().map((f) => ({ file: path.join(dir, f) })); }
    pickN(fr).forEach((f, i) => pieces.push({ an, d, i, ...f }));
  }
  // 자르기 · 줄이기
  for (const p of pieces) {
    let img = sharp(p.file);
    if (p.left != null) img = img.extract({ left: p.left, top: p.top, width: cell, height: cell });
    const buf = await img.resize(cs, cs).png().toBuffer();
    const t = await sharp(buf).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true }).catch(() => null);
    if (!t) { p.skip = true; continue; }
    p.buf = t.data; p.w = t.info.width; p.h = t.info.height; p.tx = -(t.info.trimOffsetLeft || 0); p.ty = -(t.info.trimOffsetTop || 0);
  }
  const ref = pieces.find((p) => p.an === 'stance' && p.d === 6 && !p.skip), ax = cs / 2, ay = ref.ty + ref.h - 2; // 발밑 = 서 있는 정면 그림의 아래 끝
  // 선반식 담기
  const W = 2048; let x = 0, y = 0, rowH = 0;
  for (const p of pieces) { if (p.skip) continue; if (x + p.w > W) { x = 0; y += rowH + 1; rowH = 0; } p.x = x; p.y = y; x += p.w + 1; rowH = Math.max(rowH, p.h); }
  const H = y + rowH;
  const dst = `enemies/${S.name}.webp`;
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(pieces.filter((p) => !p.skip).map((p) => ({ input: p.buf, left: p.x, top: p.y }))).webp({ quality: 80, alphaQuality: 85, effort: 5 }).toFile(path.join(OUT, dst));
  const a = { images: { default: dst }, anims: {}, px: 1 };
  for (const [an, [, dur, type]] of Object.entries(S.anims)) {
    const f = {}; let n = 0;
    for (let d = 0; d < 8; d++) { f[d] = pieces.filter((p) => p.an === an && p.d === d && !p.skip).map((p) => [p.x, p.y, p.w, p.h, Math.round(ax - p.tx), Math.round(ay - p.ty)]); n = Math.max(n, f[d].length); }
    for (let d = 0; d < 8; d++) while (f[d].length < n) f[d].push(f[d][f[d].length - 1]);
    a.anims[an] = { frames: n, dur, type, f };
  }
  enemies[S.name] = a;
  console.log(S.name, `${W}x${H}`, Object.entries(a.anims).map(([k, v]) => `${k}:${v.frames}`).join(' '));
}
fs.writeFileSync(J, JSON.stringify(enemies));
