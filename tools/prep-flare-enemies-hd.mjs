// v0.44.20 기본 Flare 몬스터(고블린 · 해골 · 개미귀신 · 미노타우로스 · 비룡 …)를 원본 크기로 다시 담는다.
// 예전 prep-flare.mjs는 0.5 · 0.6배로 줄여 담고(px) 늘려 그려 뭉개졌다. enemies.json의 그 몬스터 항목만 바꾼다.
// node tools/prep-flare-enemies-hd.mjs <flare-game 폴더>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const SRC = process.argv[2], FC = path.join(SRC, 'mods/fantasycore'), EC = path.join(SRC, 'mods/empyrean_campaign');
const OUT = 'assets/flare', J = path.join(OUT, 'enemies.json'), E = JSON.parse(fs.readFileSync(J, 'utf8'));
const ENEMIES = {
  goblin: FC, goblin_elite: FC, hobgoblin: EC, hobgoblin_archer: EC, antlion: FC, antlion_small: FC, fire_ant: FC, ice_ant: FC,
  skeleton: FC, skeleton_weak: FC, skeleton_archer: FC, skeleton_mage: FC, zombie: FC, cursed_grave: FC, minotaur: FC,
  wyvern: FC, wyvern_air: FC, wyvern_fire: FC, wyvern_water: FC,
  zombie_dark: EC, antlion_armored: EC, skeleton_knight_boss: EC, skeleton_mage_boss: EC, skeleton_mage_high_boss: EC, wyvern_air_boss: EC,
};
function parseAnim(file) {
  const out = { images: {}, anims: {} }; let cur = null, dflt = null;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const l = raw.trim(); if (!l || l.startsWith('#')) continue;
    if (l.startsWith('image=')) { const [p, name] = l.slice(6).split(','); if (name) out.images[name] = p; else dflt = p; }
    else if (l.startsWith('[')) { cur = l.slice(1, -1); out.anims[cur] = { frames: 1, dur: 500, type: 'looped', f: {} }; }
    else if (cur) {
      const [k, v] = l.split('='), a = out.anims[cur];
      if (k === 'frames') a.frames = +v; else if (k === 'duration') a.dur = parseInt(v) * (v.endsWith('s') && !v.endsWith('ms') ? 1000 : 1); else if (k === 'type') a.type = v;
      else if (k === 'frame') { const p = v.split(','), [i, d, x, y, w, h, ox, oy] = p.map(Number); (a.f[d] ||= [])[i] = [x, y, w, h, ox, oy]; if (p[8]) (out.refs ||= {})[cur] = p[8].trim(); }
    }
  }
  if (dflt) out.images.default = dflt;
  return out;
}
for (const [name, root] of Object.entries(ENEMIES)) {
  let file = path.join(root, `animations/enemies/${name}.txt`);
  if (!fs.existsSync(file)) file = path.join(FC, `animations/enemies/${name}.txt`);
  if (!fs.existsSync(file)) { console.warn('없음', name); continue; }
  const a = parseAnim(file); let k2 = 1;
  for (const [k, p] of Object.entries(a.images)) {
    const src = [path.join(root, p), path.join(FC, p), path.join(EC, p)].find((f) => fs.existsSync(f)), m = await sharp(src).metadata();
    k2 = Math.min(k2, 4096 / m.width); // 그림마다 같은 배율이어야 해서 가장 넓은 것에 맞춘다
  }
  for (const [k, p] of Object.entries(a.images)) {
    const src = [path.join(root, p), path.join(FC, p), path.join(EC, p)].find((f) => fs.existsSync(f)), m = await sharp(src).metadata();
    const dst = `enemies/${name}${k === 'default' ? '' : '_' + k}.webp`;
    await sharp(src).resize(Math.round(m.width * k2)).webp({ quality: 74, alphaQuality: 85, effort: 5 }).toFile(path.join(OUT, dst));
    a.images[k] = dst;
  }
  if (k2 < 1) { a.px = Math.round((1 / k2) * 1000) / 1000; for (const an of Object.values(a.anims)) for (const d in an.f) an.f[d] = an.f[d].map((r) => r && r.map((v) => Math.round(v * k2))); }
  // 프레임이 다른 동작의 그림을 쓰는 경우 (frame=…,die 같은 9번째 값): 그 동작 그림을 이어 준다 (v0.44.26 맞을 때 깜빡이던 미노타우로스)
  for (const [an, img] of Object.entries(a.refs || {})) if (!a.images[an] && a.images[img]) a.images[an] = a.images[img];
  // 죽는 동작은 한 번만 (v0.44.1)
  for (const n of ['die', 'critdie']) if (a.anims[n]) a.anims[n].type = 'play_once';
  E[name] = { ...E[name], ...a, px: a.px };
  if (!a.px) delete E[name].px;
  console.log(name, k2.toFixed(2));
}
fs.writeFileSync(J, JSON.stringify(E));
