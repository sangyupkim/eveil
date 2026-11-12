// 추가 지형 타일 묶음을 tiles.json에 넣는다 (Flare 옛 64×32 타일은 3배로 키워 192×96에 맞춘다)
// node tools/prep-extra.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const OUT = 'assets/flare', J = path.join(OUT, 'tiles.json');
const tiles = JSON.parse(fs.readFileSync(J, 'utf8'));
const SETS = [
  // 이름 · 타일 정의 · 배율 — 사막: Stefan Beller, CC-BY-SA 3.0 (OpenGameArt "Desert Tileset")
  { name: 'desert', def: 'tools/extra/desert/tileset_desert.txt', dir: 'tools/extra/desert', k: 3 },
  // 폐허: Flare empyrean campaign (CC-BY-SA 3.0), 원래 크기
  { name: 'ruins', def: 'tools/extra/ruins/tileset_ruins.txt', dir: 'tools/extra/ruins', k: 1 },
];
for (const S of SETS) {
  const def = { imgs: [], tiles: {} };
  for (const raw of fs.readFileSync(S.def, 'utf8').split('\n')) {
    const l = raw.trim();
    if (l.startsWith('img=')) {
      const src = path.join(S.dir, path.basename(l.slice(4))), name = S.name + '_' + path.basename(l.slice(4), '.png') + '.webp';
      const meta = await sharp(src).metadata();
      await sharp(src).resize(meta.width * S.k, meta.height * S.k, { kernel: 'lanczos3' }).webp({ quality: 80, alphaQuality: 90 }).toFile(path.join(OUT, 'tiles', name));
      def.imgs.push('tiles/' + name);
    } else if (l.startsWith('tile=')) {
      const [id, x, y, w, h, ox, oy] = l.slice(5).split(',').map(Number);
      def.tiles[id] = [def.imgs.length - 1, x * S.k, y * S.k, w * S.k, h * S.k, ox * S.k, oy * S.k];
    }
  }
  tiles[S.name] = def;
  console.log(S.name, Object.keys(def.tiles).length);
}
fs.writeFileSync(J, JSON.stringify(tiles));
