// 큰 소품 · 건물 그림 (v0.41)을 tiles.json의 'props' 묶음으로 넣는다 — 기존 tile() · big() · 꾸밈 목록이 그대로 그린다.
// node tools/prep-props.mjs <내려받아 푼 폴더>  (OpenGameArt 묶음들을 푼 폴더, 출처는 assets/LICENSES.md)
//  건물: 투명 테두리를 잘라 가로 W(px, 땅 한 칸 = 64)로 줄이고, 기준점은 아래 가운데에서 바닥 마름모 가운데(가로의 1/4 위)
//  폐허 조각: Flare 128×64 타일 기준 그림이라 0.5배, 기준점은 (가로/2, 세로 - 16)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const SRC = process.argv[2], OUT = 'assets/flare';
const R = 'old_ruins_tileset_0/origin_render_output';
// [번호, 파일, 가로(px) 또는 0(폐허 0.5배)]
const LIST = [
  [1, 'Hut/Hut/hut.png', 420], [2, 'Medieval_Building_01/Normal/sprite0.png', 470], [3, 'Medieval_Building_02/Medieval_Building_02/Normal/sprite0.png', 460],
  [4, 'Medieval%20Building%2003/Medieval Building 03/Building_04_Normal.png', 560], [5, 'Medieval_Building_06/Medieval_Building_06.png', 520], [6, 'Watermill/Watermill/normal.png', 470],
  [7, '../dl/stable.png', 430], [8, '../dl/archery_range.png', 420], [9, '../dl/house1_0.png', 330], [10, '../dl/mhouse.png', 470],
  [11, 'Medieval_Building_01/Snow/sprite0.png', 470], [12, 'Medieval_Building_02/Medieval_Building_02/Snow/sprite0.png', 460], [13, 'Watermill/Watermill/snow.png', 470],
];
// v0.41 고딕 아치 (Of Far Different Nature "Isometric Tileset: Gothic Archways", CC-BY 4.0) · 다크 판타지 타일 (같은 작가, CC-BY 4.0)
const GA = 'GothicArchways.Images/GothicArchways.Images/', DF = 'dark_fantasy_isometric_tiles_cc-by_4.0_-_of_far_different_nature/Dark Fantasy Isometric Tiles (CC-BY 4.0 - Of Far Different Nature)/OFDN Isometric Tile ';
LIST.push([20, GA + 'BarredArch.001.png', 130], [21, GA + 'Door.001.png', 130], [22, GA + 'DoubleArch.001.png', 130], [23, GA + 'OpenArch.001.png', 130], [24, GA + 'OpenArchCentered.003.png', 140], [25, GA + 'OpenArchCentered.004.png', 140]);
LIST.push([30, DF + '06.png', 120], [31, DF + '07.png', 120], [32, DF + '08.png', 110], [33, DF + '09.png', 110], [34, DF + '10.png', 110], [35, DF + '11.png', 110]);
const ex = (n) => `ruin_extra_${String(n).padStart(4, '0')}.png`;
const RUINS = [18, 19, 20, 22, 23, 56, 60, 64, 66, 67, 70, 71, 74, 75, 76, 77, 78, 79];
RUINS.forEach((n, i) => { LIST.push([100 + i, `${R}/basic/${ex(n)}`, 0]); LIST.push([200 + i, `${R}/basic_frozen/${ex(n).replace("extra_", "extra_frozen_")}`, 0]); });
for (let g = 1; g <= 8; g += 2) { LIST.push([150 + g, `${R}/gate/ruin_gate_000${g}.png`, 0]); LIST.push([250 + g, `${R}/gate_frozen/ruin_gate_000${g}.png`, 0]); }
const J = path.join(OUT, 'tiles.json'), tiles = JSON.parse(fs.readFileSync(J, 'utf8'));
const def = { imgs: [], tiles: {} };
fs.mkdirSync(path.join(OUT, 'props'), { recursive: true });
for (const [id, file, W] of LIST) {
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) { console.warn('없음', file); continue; }
  let img = sharp(src);
  if (W) { const t = await img.trim().toBuffer({ resolveWithObject: true }); img = sharp(t.data).resize(W); }
  else { const m = await sharp(src).metadata(); img = sharp(src).resize(Math.round(m.width / 2)); }
  const dst = `props/p${id}.webp`, info = await img.webp({ quality: 78, alphaQuality: 85, effort: 5 }).toFile(path.join(OUT, dst));
  const w = info.width, h = info.height;
  def.imgs.push(dst);
  def.tiles[id] = [def.imgs.length - 1, 0, 0, w, h, Math.round(w / 2), W ? Math.round(h - w * 0.25) : h - 16];
}
tiles.props = def;
fs.writeFileSync(J, JSON.stringify(tiles));
console.log('props', Object.keys(def.tiles).length);
