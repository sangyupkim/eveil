// 셋째 아이콘 묶음 (v0.44.8): icons3.webp (64×64 칸 8줄). 게임에서는 번호 1000부터 (ui/icons.js iconUrl)
// node tools/prep-icons3.mjs <사용자가 받은 아이콘 묶음을 푼 폴더>
//  - dark fantasy currency & chests vol05 · Free RPG Dragon Loot Icons (craftpix) · 256x256 gemstones — 사용자가 사용 조건 확인
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const SC = (n) => [`scrolls1/sprite/96px_studio/${n}_nopalette.png`, 96]; // 두루마리: 돌아가는 그림 8×4칸 중 첫 칸
const SRC = process.argv[2], C = 'currency/dark_fantasy_currency_and_chests/', DR = 'dragon/PNG/without background/', G = 'gems/256x256_gemstones_icon_pack/256x256_gems_color_outline/';
const LIST = [
  ['gem_ruby', C + 'ruby.png'], ['gem_emerald', C + 'emerald.png'], ['gem_sapphire', C + 'sapphire.png'], ['gem_amethyst', C + 'purple_crystal.png'], ['gem_diamond', G + 'tile010.png'],
  ['key_gold', C + 'golden_magic_key.png'], ['key_iron', C + 'iron_key.png'], ['key_skull', C + 'skeleton_key.png'],
  ['coin', C + 'gold_coin.png'], ['chest', C + 'wooden_chest.png'], ['orb', C + 'magic_orb.png'], ['myth', DR + '37.png'],
  ['mat_field', DR + '15.png'], ['mat_forest', DR + '14.png'], ['mat_grave', DR + '1.png'], ['mat_ruins', DR + '38.png'],
  ['mat_swamp', DR + '11.png'], ['mat_frost', DR + '13.png'], ['mat_valley', DR + '12.png'], ['mat_inferno', DR + '10.png'],
  // v0.44.9 강화 주문서 (예전 영약 · 물약): "Scrolls" 묶음
  ['sc_str', SC('26_rolled-scroll_blood-oath')], ['sc_dex', SC('45_rolled-scroll_emerald-dragon')], ['sc_int', SC('28_rolled-scroll_navy-inkstorm')], ['sc_wis', SC('30_rolled-scroll_dream-weaver')],
  ['sc_vit', SC('27_rolled-scroll_amber-memory')], ['sc_armor', SC('54_rolled-scroll_salt-banishment')], ['sc_might', SC('8_rolled-scroll_charred-ember')], ['sc_haste', SC('43_rolled-scroll_aurora-borealis')],
  ['sc_swift', SC('17_rolled-scroll_crystal-prism')], ['sc_focus', SC('21_rolled-scroll_golden-harvest')], ['sc_luck', SC('57_rolled-scroll_lantern-festival')],
];
const S = 64, W = 8, H = Math.ceil(LIST.length / W);
const parts = await Promise.all(LIST.map(async ([, f], i) => {
  const [file, cell] = Array.isArray(f) ? f : [f, 0];
  let im = sharp(path.join(SRC, file));
  if (cell) im = sharp(await im.extract({ left: 0, top: 0, width: cell, height: cell }).png().toBuffer());
  const t = await im.trim({ threshold: 1 }).toBuffer();
  return { input: await sharp(t).resize(S - 6, S - 6, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: Array.isArray(f) ? 'nearest' : 'lanczos3' }).png().toBuffer(), left: (i % W) * S + 3, top: Math.floor(i / W) * S + 3 };
}));
await sharp({ create: { width: W * S, height: H * S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(parts).webp({ quality: 88, alphaQuality: 90 }).toFile('assets/flare/icons3.webp');
fs.writeFileSync('src/data/icons3.js', '// tools/prep-icons3.mjs가 만든다 — 셋째 아이콘 묶음(icons3.webp)의 번호 (1000부터)\nexport const ICONS3 = ' + JSON.stringify(Object.fromEntries(LIST.map(([k], i) => [k, 1000 + i]))) + ';\n');
console.log(LIST.length);
