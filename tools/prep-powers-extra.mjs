// 효과 그림 더하기 (v0.41): Flare 모드들의 powers 동작(CC-BY-SA 3.0)을 powers.json에 넣는다.
// node tools/prep-powers-extra.mjs <폴더>...  (폴더 이름 = 효과 이름, 안에 animations/powers/<이름>.txt와 그림)
// 옛 격자 형식(render_size · render_offset, 줄 = 방향)과 새 형식(frame=…) 둘 다 읽는다.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const OUT = 'assets/flare', J = path.join(OUT, 'powers.json');
const powers = JSON.parse(fs.readFileSync(J, 'utf8'));
for (const dir of process.argv.slice(2)) {
  const name = path.basename(dir), text = fs.readFileSync(path.join(dir, 'animations/powers', name + '.txt'), 'utf8');
  const a = { images: {}, anims: {} };
  let cur = null, size = null, off = null;
  for (const raw of text.split('\n')) {
    const l = raw.trim();
    if (!l || l.startsWith('#')) continue;
    if (l.startsWith('image=')) { const [p, k] = l.slice(6).split(','); a.images[k || 'default'] = p; }
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
  for (const [k, p] of Object.entries(a.images)) {
    const src = path.join(dir, p), m = await sharp(src).metadata(), rel = `powers/${name}${k === 'default' ? '' : '_' + k}.webp`;
    if (size) { const rows = Math.max(1, Math.floor(m.height / size[1])); for (const an of Object.values(a.anims)) for (let d = 0; d < 8; d++) an.f[d] = Array.from({ length: an.frames }, (_, i) => [(an.pos + i) * size[0], Math.min(d, rows - 1) * size[1], size[0], size[1], off[0], off[1]]); }
    await sharp(src).webp({ quality: 76, alphaQuality: 85, effort: 5 }).toFile(path.join(OUT, rel));
    a.images[k] = rel;
  }
  for (const an of Object.values(a.anims)) delete an.pos;
  powers[name] = a;
  console.log(name, Object.keys(a.anims).join(','));
}
fs.writeFileSync(J, JSON.stringify(powers));
