// 낱장 프레임 효과(사용자가 받은 묶음: Painted Spells · Free VFX Sampler · Haunted Effects)를 powers.json 효과로 바꾼다 (v0.44)
// node tools/prep-powers-frames.mjs <푼 폴더 루트>
//  - 프레임은 최대 n장 고르게, 모든 프레임의 겹친 테두리로 잘라 같은 크기 칸에 담는다. 8방향 모두 같은 그림.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const ROOT = process.argv[2], OUT = 'assets/flare', J = path.join(OUT, 'powers.json');
const PS = 'painted/Painted Spells Free Sample 2';
// name, 폴더, 크기(px, 긴 변), 프레임 수, 길이(ms), 기준점 높이(0 위 ~ 1 아래)
const SPECS = [
  ['p_burning', `${PS}/04_Burning/PNG/half`, 200, 16, 900, 0.85],
  ['p_dharma', `${PS}/01_DharmaAvatar/PNG/half`, 220, 16, 1100, 0.8],
  ['p_mirror', `${PS}/02_TruthMirror/PNG/half`, 200, 16, 1000, 0.75],
  ['p_wolf', `${PS}/03_SilverWolfRun/PNG/half`, 220, 16, 1000, 0.75],
  ['v_slash', 'vfx/04_slash_arc/steel_white/loose_256', 170, 12, 450, 0.6],
  ['v_flame_aura', 'vfx/08_flame_aura/ember_red/loose_256', 150, 16, 1000, 0.8],
  ['v_stunned', 'vfx/07_stunned/daze_yellow/loose_256', 90, 16, 900, 0.5],
  ['v_ember', 'vfx/03_ember_puff/inferno/loose_256', 140, 12, 600, 0.7],
  ['v_splash', 'vfx/02_water_splash/ocean_blue/loose_256', 150, 12, 600, 0.8],
  ['v_dust', 'vfx/01_landing_dust/sandstone/loose_256', 160, 12, 600, 0.8],
  ['v_fireburst', 'vfx/05_fireball/pyro_orange/loose_256', 150, 12, 600, 0.7],
  ['h_necrotic', 'haunted/effects/necrotic/frames/impact', 150, 8, 500, 0.7],
  ['h_soul_orbit', 'haunted/effects/soul_orbit/frames/effect', 150, 16, 1000, 0.75],
  ['h_ghost_mist', 'haunted/effects/ghost_mist/frames/effect', 170, 12, 900, 0.8],
  ['h_spectral', 'haunted/effects/spectral_spawn/frames/effect', 150, 6, 500, 0.85],
];
const powers = JSON.parse(fs.readFileSync(J, 'utf8'));
const pickN = (a, n) => (a.length <= n ? a : Array.from({ length: n }, (_, i) => a[Math.round((i * (a.length - 1)) / (n - 1))]));
for (const [name, dir, px, n, dur, ay] of SPECS) {
  const files = pickN(fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.png')).sort().map((f) => path.join(ROOT, dir, f)), n);
  const m = await sharp(files[0]).metadata();
  // 겹친 테두리
  let L = m.width, T = m.height, R = 0, B = 0;
  for (const f of files) {
    const t = await sharp(f).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true }).catch(() => null);
    if (!t) continue;
    const l = -(t.info.trimOffsetLeft || 0), tp = -(t.info.trimOffsetTop || 0);
    L = Math.min(L, l); T = Math.min(T, tp); R = Math.max(R, l + t.info.width); B = Math.max(B, tp + t.info.height);
  }
  const cw = R - L, ch = B - T, k = px / Math.max(cw, ch), w = Math.max(1, Math.round(cw * k)), h = Math.max(1, Math.round(ch * k));
  const cols = Math.floor(2048 / (w + 1)), frames = [];
  const comp = await Promise.all(files.map(async (f, i) => {
    const x = (i % cols) * (w + 1), y = Math.floor(i / cols) * (h + 1);
    frames.push([x, y, w, h, Math.round(w / 2), Math.round(h * ay)]);
    return { input: await sharp(f).extract({ left: L, top: T, width: cw, height: ch }).resize(w, h).png().toBuffer(), left: x, top: y };
  }));
  const W = Math.min(files.length, cols) * (w + 1), H = Math.ceil(files.length / cols) * (h + 1), rel = `powers/${name}.webp`;
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp).webp({ quality: 78, alphaQuality: 85, effort: 5 }).toFile(path.join(OUT, rel));
  const f = {}; for (let d = 0; d < 8; d++) f[d] = frames;
  powers[name] = { images: { default: rel }, anims: { power: { frames: frames.length, dur, type: 'play_once', f } } };
  console.log(name, `${W}x${H}`, frames.length);
}
fs.writeFileSync(J, JSON.stringify(powers));
