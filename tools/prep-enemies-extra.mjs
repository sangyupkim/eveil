// 추가 몬스터 그림 (OpenGameArt Flare 몬스터 · flare-mod-noname 묶음, CC-BY-SA 3.0)을 enemies.json에 넣는다.
// node tools/prep-enemies-extra.mjs <flare-mod-noname/new_game_mod 경로>
// 옛 격자 형식(render_size · position)과 새 형식(frame=…) 둘 다 읽는다.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const SRC = process.argv[2];
const OUT = 'assets/flare', J = path.join(OUT, 'enemies.json');
const NAMES = ['orc_regular', 'orc_archer', 'orc_heavy', 'orc_elite', 'spider', 'spider_large', 'spider_giant', 'troll', 'werebear', 'werewolf',
  'demon', 'demon_statue', 'shadow', 'assassin', 'skeleton_knight', 'skeleton_mage_high', 'skeleton_occultist', 'pirate_ghost_captain', 'pirate_ghost_crewman'];
const enemies = JSON.parse(fs.readFileSync(J, 'utf8'));
for (const name of NAMES) {
  const text = fs.readFileSync(path.join(SRC, 'animations/enemies', name + '.txt'), 'utf8');
  const a = { images: {}, anims: {} };
  let cur = null, size = null, off = null, img = null;
  for (const raw of text.split('\n')) {
    const l = raw.trim();
    if (!l || l.startsWith('#')) continue;
    if (l.startsWith('image=')) img = l.slice(6).split(',')[0];
    else if (l.startsWith('render_size=')) size = l.slice(12).split(',').map(Number);
    else if (l.startsWith('render_offset=')) off = l.slice(14).split(',').map(Number);
    else if (l.startsWith('[')) { cur = l.slice(1, -1); a.anims[cur] = { frames: 1, dur: 500, type: 'looped', f: {}, pos: 0 }; }
    else if (cur) {
      const [k, v] = l.split('='), an = a.anims[cur];
      if (k === 'frames') an.frames = +v;
      else if (k === 'position') an.pos = +v;
      else if (k === 'duration') an.dur = parseInt(v) * (v.endsWith('s') && !v.endsWith('ms') ? 1000 : 1);
      else if (k === 'type') an.type = v;
      else if (k === 'frame') { const [i, d, x, y, w, h, ox, oy] = v.split(',').map(Number); (an.f[d] ||= [])[i] = [x, y, w, h, ox, oy]; }
    }
  }
  // 격자 형식: 줄 = 방향(8), 칸 = 프레임
  if (size) for (const an of Object.values(a.anims)) for (let d = 0; d < 8; d++) an.f[d] = Array.from({ length: an.frames }, (_, i) => [(an.pos + i) * size[0], d * size[1], size[0], size[1], off[0], off[1]]);
  for (const an of Object.values(a.anims)) delete an.pos;
  const src = path.join(SRC, img), meta = await sharp(src).metadata();
  const k2 = (size?.[0] || 128) >= 256 || meta.width > 6000 ? 0.4 : 0.6;
  const dst = `enemies/x_${name}.webp`;
  await sharp(src).resize(Math.round(meta.width * k2)).webp({ quality: 72, alphaQuality: 85 }).toFile(path.join(OUT, dst));
  a.images.default = dst; a.px = 1 / k2;
  for (const an of Object.values(a.anims)) for (const d in an.f) an.f[d] = an.f[d].map((r) => r && r.map((v) => Math.round(v * k2)));
  enemies['x_' + name] = a;
  console.log(name, Object.keys(a.anims).join(','), meta.width + 'x' + meta.height, '→', k2);
}
fs.writeFileSync(J, JSON.stringify(enemies));
