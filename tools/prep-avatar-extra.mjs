// 주인공 겹그림 더하기 (v0.40): flare-game fantasycore의 둔기 · 망치 · 마법사 옷 alt2 (CC-BY-SA 3.0)를 avatar_m/f.json에 넣는다.
// node tools/prep-avatar-extra.mjs <fantasycore 폴더>  — 기존 겹은 그대로 두고 아래 겹만 더한다 (prep-flare.mjs와 같은 0.75배).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const SRC = process.argv[2], OUT = 'assets/flare', K = 0.75;
const LAYERS = ['club', 'mace', 'reinforced_club', 'war_hammer', 'maul', 'infantry_axe', 'smith_hammer',
  'mage_vest_alt2', 'mage_skirt_alt2', 'mage_boots_alt2', 'mage_sleeves_alt2', 'mage_hood_alt2'];
function parseAnim(file) {
  const out = { images: {}, anims: {} };
  let cur = null;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const l = raw.trim();
    if (!l || l.startsWith('#')) continue;
    if (l.startsWith('image=')) { const [p, name] = l.slice(6).split(','); out.images[name || 'default'] = p; }
    else if (l.startsWith('[')) { cur = l.slice(1, -1); out.anims[cur] = { frames: 1, dur: 500, type: 'looped', f: {} }; }
    else if (cur) {
      const [k, v] = l.split('='), a = out.anims[cur];
      if (k === 'frames') a.frames = +v;
      else if (k === 'duration') a.dur = parseInt(v) * (v.endsWith('s') && !v.endsWith('ms') ? 1000 : 1);
      else if (k === 'type') a.type = v;
      else if (k === 'frame') { const [i, d, x, y, w, h, ox, oy] = v.split(',').map(Number); (a.f[d] ||= [])[i] = [x, y, w, h, ox, oy]; }
    }
  }
  return out;
}
for (const [sex, dir] of [['m', 'male'], ['f', 'female']]) {
  const J = path.join(OUT, `avatar_${sex}.json`), json = JSON.parse(fs.readFileSync(J, 'utf8'));
  for (const layer of LAYERS) {
    const a = parseAnim(path.join(SRC, `animations/avatar/${dir}/${layer}.txt`));
    for (const [k, p] of Object.entries(a.images)) {
      const rel = `avatar/${sex}/${layer}${k === 'default' ? '' : '_' + k}.webp`, src = path.join(SRC, p), m = await sharp(src).metadata();
      await sharp(src).resize(Math.round(m.width * K)).webp({ quality: 76, alphaQuality: 85, effort: 5 }).toFile(path.join(OUT, rel));
      a.images[k] = rel;
    }
    a.px = 1 / K;
    for (const an of Object.values(a.anims)) for (const d in an.f) an.f[d] = an.f[d].map((r) => r && r.map((v) => Math.round(v * K)));
    json[layer] = a;
  }
  fs.writeFileSync(J, JSON.stringify(json));
  console.log(sex, Object.keys(json).length);
}
// NPC 더하기 (v0.40): 마을 주민 · 귀환 오벨리스크 · 고블린 행상 · 쓰러진 해골
const npcJ = path.join(OUT, 'npcs.json'), npcs = JSON.parse(fs.readFileSync(npcJ, 'utf8'));
for (const name of ['peasant_man2', 'peasant_woman2', 'return_obelisk1', 'dead_skeleton', 'peddler_goblin']) {
  const f = path.join(SRC, `animations/npcs/${name}.txt`);
  if (!fs.existsSync(f)) continue;
  const a = parseAnim(f);
  for (const [k, p] of Object.entries(a.images)) {
    const rel = `npcs/${name}${k === 'default' ? '' : '_' + k}.webp`, src = path.join(SRC, p), m = await sharp(src).metadata();
    await sharp(src).resize(Math.round(m.width * K)).webp({ quality: 76, alphaQuality: 85, effort: 5 }).toFile(path.join(OUT, rel));
    a.images[k] = rel;
  }
  a.px = 1 / K;
  for (const an of Object.values(a.anims)) for (const d in an.f) an.f[d] = an.f[d].map((r) => r && r.map((v) => Math.round(v * K)));
  npcs[name] = a;
}
fs.writeFileSync(npcJ, JSON.stringify(npcs));
console.log('npcs', Object.keys(npcs).join(','));
