// 둘째 아이콘 묶음 (v0.41): icons2.webp (64×64 칸 8줄). 게임에서는 번호 256부터 (ui/icons.js iconUrl)
// node tools/prep-icons2.mjs <OpenGameArt 아이콘 묶음을 푼 폴더>
//  - "Flare weapon icons 2" (CC0) 둔기 · 망치 · 도끼   - "Orbs Collection" (CC0) 보주
//  - "Painterly Spell Icons" 1 ~ 4 (J. W. Bjerk / Lorc 원안, CC-BY 3.0) 스킬
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const SRC = process.argv[2];
const W = 'Flare_weapon_icons_2/flare weapon icons 2/';
const pa = fs.readFileSync(path.join(SRC, '../painterly.txt'), 'utf8').trim().split('\n'); // 정렬한 목록 (1부 = 0~239, 2부 = 240~)
const P1 = (i) => pa[i], P2 = (i) => pa[240 + i];
// [이름, 파일] — 순서가 곧 번호 (256 + 순서)
export const LIST = [
  ['club', W + '1club.png'], ['reinforced_club', W + '2reinforced_club.png'], ['mace', W + '3mace.png'], ['smith_hammer', W + '4smith_hammer.png'], ['warhammer', W + '5warhammer.png'],
  ['maul', W + '6maul.png'], ['infantry_axe', W + '8infantry_axe.png'], ['orb_cyan', 'Orbs_Collection/Orb_04.png'], ['orb_blue', 'Orbs_Collection/Orb_05.png'], ['orb_rune', 'Orbs_Collection/Orb_12.png'], ['orb_void', 'Orbs_Collection/Orb_06.png'],
  ...Object.entries({
    fire_bolt: P1(39), fireball: P1(41), meteor: P1(158), fire_pillar: P2(63), flame_burst: P1(188), inferno_field: P2(168), ember_spray: P2(62), flame_wave: P2(90),
    frost_bolt: P1(117), ice_lance: P1(119), frozen_orb: P2(102), absolute_zero: P1(194), frost_ring: P2(15), blizzard: P2(48), cold_snap: P2(93),
    chain_lightning: P1(140), spark: P1(129), thunder_strike: P1(143), static_field: P1(131), thunderstorm: P1(142), storm_god: P1(137),
    smite: P1(107), consecrate: P2(99), arcane_surge: P1(85), mana_burst: P1(182), overload: P2(135), arcane_storm: P2(70), mind_blast: P1(29),
    flame_blade: P1(20), frost_blade: P1(5), thunder_cleave: P1(26), holy_strike: P1(23), judgement_wave: P2(117), blade_dance: P2(181), elemental_arrow: P2(138), frost_arrow_rain: P2(134),
    star_arrow: P2(140), spirit_arrow: P2(66), wind_volley: P2(39), ranger_shot: P2(132), iron_charge: P2(196), quake_blow: P1(163), shadow_step: P2(197), fan_of_knives: P2(143),
    shield_slam: P1(80), bulwark_wave: P1(58), iron_quake: P1(167), titan_crush: P1(161),
    aw_int1: P2(114), aw_int2: P1(157), aw_int3: P2(45), aw_int4a: P1(136), aw_int4b: P1(185), aw_wis1: P1(86), aw_wis2: P1(181), aw_wis3: P2(84), aw_wis4a: P2(18), aw_wis4b: P2(72),
    aw_vit1: P1(79), aw_vit2: P1(64), aw_vit3: P1(166), aw_vit4a: P1(74), aw_vit4b: P1(164),
    aw_str1: P2(177), aw_str2: P2(147), aw_str3: P2(180), aw_str4a: P2(183), aw_str4b: P2(179), aw_dex1: P2(137), aw_dex2: P2(144), aw_dex3: P2(74), aw_dex4a: P2(141), aw_dex4b: P2(131),
  }).map(([k, f]) => ['sk:' + k, f]),
];
const S = 64, COLS = 8, rows = Math.ceil(LIST.length / COLS), parts = [], index = {};
for (let i = 0; i < LIST.length; i++) {
  const [name, f] = LIST[i];
  const buf = await sharp(path.join(SRC, f)).resize(S, S, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  parts.push({ input: buf, left: (i % COLS) * S, top: Math.floor(i / COLS) * S });
  index[name] = 256 + i;
}
await sharp({ create: { width: COLS * S, height: rows * S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(parts).webp({ quality: 85, alphaQuality: 90 }).toFile('assets/flare/icons2.webp');
fs.writeFileSync('src/data/icons2.js', `// tools/prep-icons2.mjs가 만든다 — 둘째 아이콘 묶음(icons2.webp)의 번호 (256부터)\nexport const ICONS2 = ${JSON.stringify(index)};\n`);
console.log('icons2', LIST.length);
