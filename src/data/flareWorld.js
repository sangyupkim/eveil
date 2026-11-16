import { GEMS, GEM_GRADES, gemId } from './legends.js';
import { ICONS2 } from './icons2.js';
// 2D(Flare) 그림 연결: 지역마다 땅 타일 · 배경 물건, 몬스터 그림, 장비 겹그림 · 아이콘

// ───── 땅 · 배경 ─────
// 지역 → 타일 묶음과 땅 타일 번호, 덧입힐 색(화면 색감)
export const ZONE_LOOK = {
  town: { set: 'grassland', ground: [32, 47] },
  wild: { set: 'grassland', ground: [16, 31] },
  field: { set: 'grassland', ground: [16, 31] },
  forest: { set: 'grassland', ground: [16, 31], grade: 'rgba(10,30,10,0.18)' },
  grave: { set: 'grassland', ground: [16, 31], patch: [32, 47], grade: 'rgba(30,30,50,0.28)' },
  orcfort: { set: 'ruins', ground: [105, 119], patch: [24, 31], grade: 'rgba(60,30,10,0.18)' },
  webwood: { set: 'grassland', ground: [16, 31], grade: 'rgba(10,20,30,0.42)' },
  harbor: { set: 'grassland', ground: [32, 47], patch: [16, 31], grade: 'rgba(20,40,60,0.35)' },
  demongate: { set: 'cave', ground: [16, 31], patch: [48, 55], grade: 'rgba(120,10,10,0.35)' },
  ruins: { set: 'ruins', ground: [105, 119], patch: [24, 31], grade: 'rgba(40,30,20,0.16)' },
  swamp: { set: 'grassland', ground: [16, 31], water: [176, 191], grade: 'rgba(20,40,20,0.3)' },
  frost: { set: 'snowplains', ground: [16, 31], patch: [569, 583], grade: 'rgba(20,40,80,0.18)' },
  valley: { set: 'desert', ground: [24, 39], grade: 'rgba(60,40,10,0.1)' },
  inferno: { set: 'cave', ground: [16, 31], patch: [48, 55], grade: 'rgba(110,20,0,0.32)' },
};

// 배경 물건: [타일 묶음, 번호 목록, 개수, 부딪치는 반경]
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const ZONE_PROPS = {
  field: [['grassland', range(252, 255), 26, 0.9], ['grassland', range(240, 243), 10, 0.8], ['grassland', [112, 113], 30, 0], ['grassland', range(116, 123), 60, 0],
    ['grassland', range(124, 127), 60, 0], ['grassland', [118, 119], 24, 0], ['grassland', range(128, 131), 16, 1], ['grassland', [136, 137], 8, 0.8], ['grassland', [100, 101], 4, 1]],
  forest: [['grassland', range(248, 251), 60, 0.8], ['grassland', range(244, 247), 24, 0.6], ['grassland', range(252, 255), 14, 0.9], ['grassland', [114, 115, 116, 117], 50, 0],
    ['grassland', range(120, 127), 60, 0], ['grassland', range(128, 131), 14, 1], ['grassland', [136, 137], 12, 0.8], ['grassland', [100, 101], 6, 1]],
  grave: [['grassland', range(140, 143), 70, 0.6], ['grassland', range(244, 247), 30, 0.6], ['grassland', range(248, 251), 10, 0.8], ['dungeon', range(176, 183), 20, 0],
    ['dungeon', range(128, 131), 5, 0.8], ['dungeon', range(144, 147), 6, 0.8], ['grassland', range(124, 127), 30, 0], ['grassland', [138, 139], 4, 0.3]],
  orcfort: [['ruins', range(187, 194), 40, 0.6], ['ruins', range(223, 233), 22, 0.9], ['ruins', [234, 186], 10, 1], ['ruins', range(241, 246), 8, 0.7],
    ['ruins', [137, 141, 144, 145, 152, 169, 171, 177, 182, 185], 12, 1.1], ['ruins', [268, 269, 287, 288], 14, 0.4], ['ruins', [289, 290, 291, 292], 4, 0.9],
    ['ruins', range(312, 317), 40, 0], ['grassland', range(124, 127), 20, 0]],
  webwood: [['grassland', range(248, 251), 60, 0.8], ['grassland', range(244, 247), 24, 0.6], ['grassland', range(252, 255), 14, 0.9], ['grassland', [114, 115, 116, 117], 50, 0],
    ['grassland', range(120, 127), 60, 0], ['grassland', range(128, 131), 14, 1], ['grassland', [136, 137], 12, 0.8], ['grassland', [100, 101], 6, 1]],
  harbor: [['grassland', range(240, 243), 44, 0.8], ['grassland', range(244, 247), 18, 0.6], ['grassland', [114, 115], 60, 0], ['grassland', [116, 117], 30, 0],
    ['grassland', range(124, 127), 40, 0], ['grassland', [136, 137], 10, 0.8], ['cave', range(132, 135), 14, 0]],
  demongate: [['cave', range(144, 149), 30, 1], ['cave', range(150, 153), 26, 1], ['dungeon', range(176, 183), 26, 0], ['cave', range(132, 135), 10, 0], ['dungeon', [178], 6, 0]],
  ruins: [['ruins', range(187, 194), 40, 0.6], ['ruins', range(223, 233), 22, 0.9], ['ruins', [234, 186], 10, 1], ['ruins', range(241, 246), 8, 0.7],
    ['ruins', [137, 141, 144, 145, 152, 169, 171, 177, 182, 185], 12, 1.1], ['ruins', [268, 269, 287, 288], 14, 0.4], ['ruins', [289, 290, 291, 292], 4, 0.9],
    ['ruins', range(312, 317), 40, 0], ['grassland', range(124, 127), 20, 0]],
  swamp: [['grassland', range(240, 243), 44, 0.8], ['grassland', range(244, 247), 18, 0.6], ['grassland', [114, 115], 60, 0], ['grassland', [116, 117], 30, 0],
    ['grassland', range(124, 127), 40, 0], ['grassland', [136, 137], 10, 0.8], ['cave', range(132, 135), 14, 0]],
  frost: [['snowplains', range(244, 247), 36, 0.6], ['snowplains', range(552, 567), 36, 1], ['snowplains', range(112, 127), 40, 0], ['snowplains', range(532, 534), 4, 0.7],
    ['snowplains', range(132, 135), 12, 1], ['snowplains', range(535, 538), 8, 0.8], ['snowplains', range(128, 131), 12, 1]],
  valley: [['desert', range(120, 127), 40, 0.7], ['desert', range(104, 119), 50, 0], ['desert', [201, 202, 203], 26, 0.5], ['desert', [200], 10, 0], ['desert', range(56, 63), 0, 1], ['grassland', range(132, 135), 14, 1]],
  inferno: [['cave', range(144, 149), 30, 1], ['cave', range(150, 153), 26, 1], ['dungeon', range(176, 183), 26, 0], ['cave', range(132, 135), 10, 0], ['dungeon', [178], 6, 0]],
  wild: [['grassland', range(252, 255), 1, 0.9], ['grassland', range(248, 251), 1, 0.8], ['grassland', range(244, 247), 1, 0.6], ['grassland', range(124, 127), 2, 0], ['grassland', range(128, 131), 1, 1], ['grassland', range(112, 123), 3, 0]],
};
// 바닥에 눕는 물건 (앞뒤 정렬 없이 땅과 함께 그린다)
export const FLAT = new Set(['grassland|264', 'grassland|265', 'cave|264', 'cave|265', ...range(176, 183).map((i) => 'dungeon|' + i)]);

// ───── 몬스터 그림 ─────
// sprite: Flare 몬스터 이름 · tint: 색 · size: 크기 배율 · fly: 떠 있음
export const MONSTER_LOOK = {
  // 새 그림 (OpenGameArt Flare 몬스터, CC-BY-SA)
  orc_grunt2: { sprite: 'x_orc_regular', size: 2.85 }, orc_archer2: { sprite: 'x_orc_archer', size: 2.75 }, orc_brute: { sprite: 'x_orc_heavy', size: 3.1 }, orc_raider: { sprite: 'x_orc_elite', size: 2.9 },
  // v0.43 사용자가 받은 16방향 렌더 캐릭터 (오크 · 중갑 오크 · 야수 전사)
  orc_warlord: { sprite: 'x_orc_brute', size: 3.6 }, troll_king: { sprite: 'x_heavy_orc', size: 3.6 },
  web_spider: { sprite: 'x_spider', size: 2.2 }, poison_spider: { sprite: 'x_spider_large', tint: 0xa0e080, size: 2.6 }, cave_spider: { sprite: 'x_spider_large', size: 2.8 }, shade: { sprite: 'x_shadow', size: 1.9 },
  brood_mother: { sprite: 'x_spider_giant', size: 3.0 }, spider_queen: { sprite: 'x_spider_giant', tint: 0xd0a0ff, size: 4.2 },
  ghost_crew: { sprite: 'x_pirate_ghost_crewman', size: 3.2 }, bone_knight: { sprite: 'x_skeleton_knight', size: 3.1 }, occultist: { sprite: 'x_skeleton_occultist', size: 3.0 }, dock_assassin: { sprite: 'x_assassin', size: 3.4 },
  high_mage: { sprite: 'x_necromancer', size: 4.0 }, ghost_captain: { sprite: 'x_pirate_ghost_captain', size: 4.8 },
  hell_hound: { sprite: 'x_werewolf', tint: 0xff9070, size: 3.3 }, dread_bear: { sprite: 'x_werebear', tint: 0xc08080, size: 2.8 }, void_shade: { sprite: 'x_shadow', tint: 0xd090ff, size: 2.0 }, gargoyle: { sprite: 'x_demon_statue', size: 1.5 },
  pit_lord: { sprite: 'x_beast_warrior', size: 3.4 }, arch_demon: { sprite: 'x_demon', tint: 0xff8060, size: 2.5 },
  slime: { sprite: 'antlion_small', size: 0.9 },
  rat: { sprite: 'x_goblin_charger', size: 2.5 }, // v0.41.3 Short-Ribs 고블린 (CC-BY)
  mushnub: { sprite: 'skeleton_weak' },
  slime_spiky: { sprite: 'antlion' },
  mushking: { sprite: 'x_goblin_spearman_elite', size: 3.3 },
  wolf: { sprite: 'x_goblin_spearman', size: 2.5 }, // v0.41 고블린 창병 정예 (Short-Ribs, CC-BY 3.0)
  spider: { sprite: 'antlion', tint: 0x90b070 },
  wasp: { sprite: 'hobgoblin_archer' },
  orc_grunt: { sprite: 'hobgoblin' },
  tribal: { sprite: 'x_goblin_shaman', size: 2.5 },
  orc: { sprite: 'minotaur', size: 0.95 },
  skel_minion: { sprite: 'skeleton_weak' },
  skel_rogue: { sprite: 'skeleton' },
  skel_archer: { sprite: 'skeleton_archer' },
  skel_warrior: { sprite: 'skeleton', tint: 0xd8c8a8, size: 1.1 },
  skel_mage: { sprite: 'skeleton_mage' },
  ghost: { sprite: 'zombie', tint: 0x9fb0ff },
  ghost_skull: { sprite: 'zombie_dark' },
  raider: { sprite: 'x_leather_brute', size: 2.9 },
  fallen_knight: { sprite: 'x_plate_brute', size: 3.0 },
  imp: { sprite: 'fire_ant' },
  blue_demon: { sprite: 'zombie_dark', tint: 0x8090ff, size: 1.2 },
  goleling: { sprite: 'cursed_grave', size: 0.9 },
  dragon: { sprite: 'x_centipede', size: 2.8 },
  frog: { sprite: 'x_fishman_mace', size: 3.3 },
  bog_slime: { sprite: 'x_slime', size: 1.6 }, // Slime Flare sprite sheets (CC-BY-SA)
  snake: { sprite: 'x_snake', size: 2.4 },
  squidle: { sprite: 'x_fishman_blade', tint: 0xd0a8ff, size: 3.3 },
  mushnub_evo: { sprite: 'x_zombie', tint: 0xa0c090, size: 2.6 }, // Zombie Sprites (CC-BY)
  bog_witch: { sprite: 'x_scathelocke', size: 3.9 },
  bog_king: { sprite: 'x_fishman', size: 2.8 },
  yeti: { sprite: 'x_werebear', tint: 0xd8e8ff, size: 2.7 },
  ice_wolf: { sprite: 'ice_ant' },
  snow_fox: { sprite: 'ice_ant', size: 0.8 },
  frost_wraith: { sprite: 'skeleton_mage', tint: 0xa8d8ff },
  ice_golem: { sprite: 'x_troll', tint: 0xb0d8ff, size: 2.15 },
  frost_stag: { sprite: 'x_ice_mummy', size: 2.2 },
  yeti_king: { sprite: 'x_tusk_beast', tint: 0xd8e8ff, size: 3.0 },
  raptor: { sprite: 'antlion', tint: 0xd8b070 },
  tricer: { sprite: 'antlion_armored' },
  stego: { sprite: 'antlion_armored', tint: 0xb0a080, size: 1.15 },
  paraso: { sprite: 'x_orc_heavy', tint: 0xd8b080, size: 3.0 },
  bison: { sprite: 'minotaur', size: 0.95 },
  apato: { sprite: 'minotaur', tint: 0x8a9a70, size: 1.25 },
  trex: { sprite: 'minotaur', tint: 0xff9a60, size: 1.4 },
  flame_imp: { sprite: 'fire_ant' },
  fiend: { sprite: 'x_demon', size: 1.5 },
  magma_golem: { sprite: 'x_golem', tint: 0xff9a60, size: 2.8 }, // Golem (CC-BY)
  ember_skull: { sprite: 'skeleton', tint: 0xff9a60 },
  drake: { sprite: 'x_snake', tint: 0xff8060, size: 2.8 },
  flame_lord: { sprite: 'x_vesuvvio', size: 4.6 },
};
// 게임 동작 이름 → Flare 동작 이름
export const ANIM_MAP = {
  idle: 'stance', run: 'run', walk: 'run', attack: 'swing', attack2: 'swing', attack3: 'swing', heavy: 'swing', slash2: 'swing', spin: 'swing', punch: 'swing', punch2: 'swing',
  cast: 'cast', castUp: 'cast', channel: 'cast', shoot: 'shoot', hit: 'hit', death: 'die', block: 'block', drink: 'cast', spawn: null,
};

// ───── 장비 → 겹그림 · 아이콘 ─────
// layers: 입었을 때 끼우는 겹 { chest, legs, hands, feet, head, main, off } · tint: 색 · icon: 아이콘 번호
const C = { ice: 0xa8d8ff, red: 0xff8a70, vio: 0xb8a0ff, grn: 0xa0d090, gold: 0xffd880, dark: 0x8a8898, brown: 0xc0a090 };
export const ITEM_LOOK = {
  // v0.37 둔기 · 홀 · 보주 (보주는 손에 그리지 않고 아이콘만) · v0.40 둔기는 Flare 몽둥이 · 철퇴 · 망치 그림
  rusty_club: { layers: { main: 'club' }, icon: 117, tint: 0x8a6a4a }, oak_club: { layers: { main: 'club' }, icon: 117, tint: 0x9a7a52 }, iron_mace: { layers: { main: 'mace' }, icon: 117 },
  war_hammer: { layers: { main: 'war_hammer' }, icon: 117 }, spiked_mace: { layers: { main: 'reinforced_club' }, icon: 117 }, knight_axe: { layers: { main: 'infantry_axe' }, icon: 117, tint: 0xd8c070 }, dragon_mace: { layers: { main: 'maul' }, icon: 117, tint: 0xff7a5a },
  novice_scepter: { layers: { main: 'wand' }, icon: 104, tint: 0x9a8aa0 }, oak_scepter: { layers: { main: 'wand' }, icon: 104 }, moon_scepter: { layers: { main: 'rod' }, icon: 105, tint: 0xb8d8ff },
  sage_scepter: { layers: { main: 'rod' }, icon: 105, tint: 0x9ad0ff }, rune_scepter: { layers: { main: 'rod' }, icon: 105, tint: 0x8ab0ff }, astral_scepter: { layers: { main: 'rod' }, icon: 105, tint: 0xd0b0ff }, void_scepter: { layers: { main: 'rod' }, icon: 105, tint: 0xb07aff },
  glass_orb: { icon: 68, tint: 0xd0e8ff }, moon_orb: { icon: 68 }, rune_orb: { icon: 68, tint: 0x8ab0ff }, void_orb: { icon: 68, tint: 0xb07aff },
  rusty_sword: { layers: { main: 'shortsword' }, icon: 97, tint: C.brown }, short_sword: { layers: { main: 'shortsword' }, icon: 97 }, broad_sword: { layers: { main: 'longsword' }, icon: 98 },
  greatsword: { layers: { main: 'greatsword' }, icon: 99 }, claymore: { layers: { main: 'zweihander' }, icon: 100 }, golden_sword: { layers: { main: 'longsword' }, icon: 98, tint: C.gold },
  war_axe: { layers: { main: 'hand_axe' }, icon: 117 }, great_axe: { layers: { main: 'battle_axe' }, icon: 119 }, frost_blade: { layers: { main: 'longsword' }, icon: 98, tint: C.ice },
  rune_blade: { layers: { main: 'greatsword' }, icon: 99, tint: C.vio }, dragon_cleaver: { layers: { main: 'battle_axe' }, icon: 119, tint: C.red }, inferno_sword: { layers: { main: 'longsword' }, icon: 98, tint: C.red },
  old_bow: { layers: { main: 'shortbow' }, icon: 113, tint: C.brown }, short_bow: { layers: { main: 'shortbow' }, icon: 113 }, long_bow: { layers: { main: 'longbow' }, icon: 114 },
  gilded_bow: { layers: { main: 'greatbow' }, icon: 115, tint: C.gold }, fiend_bow: { layers: { main: 'longbow' }, icon: 114, tint: C.red }, hunter_bow: { layers: { main: 'longbow' }, icon: 114, tint: C.grn },
  frost_bow: { layers: { main: 'longbow' }, icon: 114, tint: C.ice }, wind_bow: { layers: { main: 'greatbow' }, icon: 115, tint: C.grn }, dragon_bow: { layers: { main: 'greatbow' }, icon: 115, tint: C.red },
  novice_staff: { layers: { main: 'wand' }, icon: 104 }, oak_staff: { layers: { main: 'staff' }, icon: 106 }, bone_staff: { layers: { main: 'rod' }, icon: 105 },
  sage_staff: { layers: { main: 'greatstaff' }, icon: 107 }, ember_staff: { layers: { main: 'greatstaff' }, icon: 105, tint: C.red }, frost_staff: { layers: { main: 'staff' }, icon: 107, tint: C.ice },
  storm_staff: { layers: { main: 'greatstaff' }, icon: 107, tint: C.vio }, archmage_staff: { layers: { main: 'greatstaff' }, icon: 107, tint: C.gold },
  round_shield: { layers: { off: 'buckler' }, icon: 120 }, heater_shield: { layers: { off: 'shield' }, icon: 121 }, golden_shield: { layers: { off: 'kite_shield' }, icon: 122, tint: C.gold },
  tower_shield: { layers: { off: 'kite_shield' }, icon: 122, tint: C.dark }, dragon_shield: { layers: { off: 'iron_buckler' }, icon: 123, tint: C.red },
  leather_cap: { layers: { head: 'leather_hood' }, icon: 144 }, wizard_hat: { layers: { head: 'mage_hood' }, icon: 136 }, iron_helm: { layers: { head: 'chain_coif' }, icon: 152 },
  sage_hat: { layers: { head: 'mage_hood_alt1' }, icon: 184 }, knight_helm: { layers: { head: 'plate_helm' }, icon: 160 }, great_helm: { layers: { head: 'plate_helm' }, icon: 160, tint: C.gold },
  hunter_cap: { layers: { head: 'leather_hood' }, icon: 144, tint: C.grn }, frost_helm: { layers: { head: 'plate_helm' }, icon: 160, tint: C.ice },
  archmage_hat: { layers: { head: 'mage_hood_alt2' }, icon: 184 }, dragon_helm: { layers: { head: 'plate_helm' }, icon: 160, tint: C.red },
  cloth_robe: { layers: { chest: 'mage_vest', legs: 'mage_skirt' }, icon: 137 }, leather_armor: { layers: { chest: 'leather_chest', legs: 'leather_pants' }, icon: 145 },
  chain_mail: { layers: { chest: 'chain_cuirass', legs: 'chain_greaves' }, icon: 153 }, plate_armor: { layers: { chest: 'plate_cuirass', legs: 'plate_greaves' }, icon: 161 },
  arcane_robe: { layers: { chest: 'mage_vest_alt2', legs: 'mage_skirt_alt2' }, icon: 185 }, dark_plate: { layers: { chest: 'plate_cuirass', legs: 'plate_greaves' }, icon: 161, tint: C.dark },
  hard_leather: { layers: { chest: 'leather_chest', legs: 'leather_pants' }, icon: 145, tint: C.brown }, scout_armor: { layers: { chest: 'leather_chest', legs: 'leather_pants' }, icon: 145, tint: C.grn },
  frost_robe: { layers: { chest: 'mage_vest', legs: 'mage_skirt' }, icon: 137, tint: C.ice }, frost_plate: { layers: { chest: 'plate_cuirass', legs: 'plate_greaves' }, icon: 161, tint: C.ice },
  shadow_leather: { layers: { chest: 'leather_chest', legs: 'leather_pants' }, icon: 145, tint: C.vio }, inferno_robe: { layers: { chest: 'mage_vest_alt1', legs: 'mage_skirt_alt1' }, icon: 185, tint: C.red },
  dragon_plate: { layers: { chest: 'plate_cuirass', legs: 'plate_greaves' }, icon: 161, tint: C.red },
  leather_gloves: { layers: { hands: 'leather_gloves' }, icon: 146 }, gauntlets: { layers: { hands: 'plate_gauntlets' }, icon: 162 }, hunter_gloves: { layers: { hands: 'leather_gloves' }, icon: 146, tint: C.grn },
  frost_gauntlets: { layers: { hands: 'plate_gauntlets' }, icon: 162, tint: C.ice }, dragon_gauntlets: { layers: { hands: 'plate_gauntlets' }, icon: 162, tint: C.red },
  leather_boots: { layers: { feet: 'leather_boots' }, icon: 148 }, war_boots: { layers: { feet: 'plate_boots' }, icon: 164 }, hunter_boots: { layers: { feet: 'leather_boots' }, icon: 148, tint: C.grn },
  frost_boots: { layers: { feet: 'plate_boots' }, icon: 164, tint: C.ice }, dragon_boots: { layers: { feet: 'plate_boots' }, icon: 164, tint: C.red },
  leather_belt: { icon: 208 }, heavy_belt: { icon: 208 }, warden_belt: { icon: 208 }, dragon_belt: { icon: 208 },
  amulet: { icon: 212 }, amulet2: { icon: 213 }, ring: { icon: 198 }, ring2: { icon: 204 },
  cloth_wraps: { layers: { hands: 'cloth_gloves' }, icon: 186 }, chain_gloves: { layers: { hands: 'chain_gloves' }, icon: 154 }, mage_sleeves: { layers: { hands: 'mage_sleeves' }, icon: 138 }, shadow_gloves: { layers: { hands: 'leather_gloves' }, icon: 146, tint: C.vio }, ember_sleeves: { layers: { hands: 'mage_sleeves_alt1' }, icon: 138, tint: C.red }, cloth_shoes: { layers: { feet: 'cloth_sandals' }, icon: 132 }, chain_boots: { layers: { feet: 'chain_boots' }, icon: 156 }, mage_boots: { layers: { feet: 'mage_boots' }, icon: 140 }, shadow_boots: { layers: { feet: 'leather_boots' }, icon: 148, tint: C.vio }, ember_boots: { layers: { feet: 'mage_boots_alt1' }, icon: 140, tint: C.red }, cloth_sash: { icon: 208, tint: C.vio }, chain_belt: { icon: 208, tint: C.dark }, rune_sash: { icon: 208, tint: C.gold }, leather_hood: { layers: { head: 'leather_hood' }, icon: 144, tint: C.grn }, chain_coif: { layers: { head: 'chain_coif' }, icon: 152, tint: C.dark }, plate_helm: { layers: { head: 'plate_helm' }, icon: 160 }, shadow_hood: { layers: { head: 'leather_hood' }, icon: 144, tint: C.vio }, ember_hood: { layers: { head: 'mage_hood_alt1' }, icon: 136, tint: C.red }, bone_amulet: { icon: 214 }, jade_amulet: { icon: 212, tint: C.grn }, sun_amulet: { icon: 213, tint: C.gold }, star_amulet: { icon: 215 }, copper_ring: { icon: 199 }, silver_ring: { icon: 200 }, jade_ring: { icon: 205 }, sapphire_ring: { icon: 204 }, ruby_ring: { icon: 207 },
  ...Object.fromEntries(Object.entries(GEMS).flatMap(([g, x]) => GEM_GRADES.map((gr, k) => [gemId(g, k), { icon: x.icon }]))),
  myth_mark: { icon: 1011 }, dungeon_key: { icon: 1005 }, dungeon_key2: { icon: 1006 }, dungeon_key3: { icon: 1007 }, shard: { icon: 46 }, el_str: { icon: 1020 }, el_dex: { icon: 1021 }, el_int: { icon: 1022 }, el_wis: { icon: 1023 }, el_vit: { icon: 1024 }, el_armor: { icon: 1025 }, el_might: { icon: 1026 }, el_haste: { icon: 1027 }, el_swift: { icon: 1028 }, el_focus: { icon: 1029 }, el_luck: { icon: 1030 }, pet_egg: { icon: 234 }, pet_cat: { icon: 234 }, hp_potion: { icon: 64 }, mp_potion: { icon: 65 }, hp_potion_l: { icon: 84 }, mp_potion_l: { icon: 86 },
};
// 강화석 · 지역 재료 (가방 아이템, v0.30)
Object.assign(ITEM_LOOK, { ore2: { icon: 71 }, ore3: { icon: 71 }, ess2: { icon: 42 }, ess3: { icon: 42 }, ess4: { icon: 42 }, ess5: { icon: 42 }, ore: { icon: 71 }, mat_field: { icon: 72 }, mat_forest: { icon: 73 }, mat_grave: { icon: 74 }, mat_ruins: { icon: 75 }, mat_swamp: { icon: 76 }, mat_frost: { icon: 77 }, mat_valley: { icon: 78 }, mat_inferno: { icon: 79 } });

// 처음 복장 (안 입은 부위)
export const BASE_CLOTHES = { chest: 'cloth_shirt', legs: 'cloth_pants', feet: 'cloth_sandals', hands: 'default_hands' };
// 떨어진 아이템 그림 (Flare loot 동작)
export const LOOT_LOOK = { weapon: { sword: 'longsword', bow: 'longbow', staff: 'staff' }, offhand: 'shield', helm: 'leather_armor', armor: 'leather_armor', gloves: 'leather_armor', boots: 'boots', belt: 'belt', amulet: 'ring', ring: 'ring', potion_hp: 'hp_potion', potion_mp: 'mp_potion', book: 'book', gold: 'coins25' };

// 스킬 아이콘 번호
export const SKILL_ICON = {
  aw_str1: 5, aw_str2: 46, aw_str3: 39, aw_str4a: 44, aw_str4b: 33, aw_dex1: 8, aw_dex2: 23, aw_dex3: 41, aw_dex4a: 13, aw_dex4b: 35, aw_int1: 34, aw_int2: 37, aw_int3: 24, aw_int4a: 7, aw_int4b: 18, aw_wis1: 10, aw_wis2: 42, aw_wis3: 23, aw_wis4a: 29, aw_wis4b: 24, aw_vit1: 4, aw_vit2: 39, aw_vit3: 40, aw_vit4a: 15, aw_vit4b: 5,
  shield_slam: 4, bulwark_wave: 39, iron_quake: 39, titan_crush: 5, mana_shield: 26, arcane_surge: 10, mana_burst: 42, overload: 23, arcane_storm: 24,
  power_strike: 5, whirlwind: 46, earth_cleave: 39, judgement: 45, berserk: 31, dash_strike: 9, war_cry: 10, blade_storm: 44,
  aimed_shot: 16, multishot: 8, piercing_arrow: 23, arrow_rain: 41, eagle_eye: 6, storm_volley: 35, phantom_arrow: 13,
  fire_bolt: 18, fireball: 34, chain_lightning: 7, meteor: 37, absolute_zero: 20, frost_bolt: 38, flame_wave: 21, blizzard: 24,
  iron_skin: 4, divine_shield: 26,
  counter_slash: 32, shield_bash: 4, execute: 33, leap_slam: 13, flurry: 44, snipe: 16, scatter_shot: 8, trap_arrow: 41, hail_of_arrows: 35, ricochet: 23,
  fire_pillar: 37, flame_burst: 34, inferno_field: 18, ember_spray: 21, ice_lance: 38, frost_ring: 24, frozen_orb: 20, ice_armor: 15, cold_snap: 24,
  spark: 7, thunder_strike: 36, static_field: 10, thunderstorm: 39, storm_god: 45, holy_ward: 26, smite: 22, consecrate: 42, sanctuary: 15, focus_mind: 29,
  taunt_roar: 31, stand_fast: 4, thorn_mail: 40, earth_stomp: 39, smoke_step: 12, poison_edge: 27, shadow_step: 14, fan_of_knives: 46,
  flame_blade: 5, frost_blade: 38, thunder_cleave: 44, holy_strike: 22, judgement_wave: 45, iron_charge: 9, quake_blow: 39, blade_dance: 46,
  elemental_arrow: 34, frost_arrow_rain: 41, star_arrow: 13, spirit_arrow: 42, wind_volley: 35, ranger_shot: 16, arcane_shield: 26, mind_blast: 10,
  battle_mage: 31, iron_monk: 15, swift_fury: 19, hunters_mark: 6,
};
// 얼굴 (초상화 + 머리 겹)
export const FACES = [
  ['m01', 'male01', 'm', 'head_short'], ['m02', 'male05', 'm', 'head_short'], ['m03', 'male09', 'm', 'head_bald'], ['m04', 'male14', 'm', 'head_bald'],
  ['f01', 'female01', 'f', 'head_long'], ['f02', 'female05', 'f', 'head_long'], ['f03', 'female09', 'f', 'head_long'], ['f04', 'female13', 'f', 'head_long'],
];
export const faceOf = (id) => FACES.find((f) => f[0] === id) || FACES[0];

// 높은 단계 장비 그림: 본보기 그림 + 단계 색
import { BASES as _B, HIGH_TIERS as _HT } from './items.js';
const _TC = [0x8a8a96, 0xc0d8e8, 0xc8ccd8, 0xa8e0ff, 0xb08aff, 0x7fd08a, 0xffe08a, 0x9a7aff, 0x8af0ff, 0xffb070, 0xff8ac0, 0xffd040, 0xffffff, 0xff5a5a, 0x60ffd0];
// 스탯별 장비 줄 (v0.42.3): 본보기 그림 + 스탯 색 (화살통 · 마도서는 아이콘만)
const _SC = { str: 0xff9a7a, dex: 0x9ae0a0, int: 0x9ac0ff, wis: 0xd0a8ff, vit: 0xf0d090 };
for (const [id, b] of Object.entries(_B)) if (b.ltpl && !b.tpl && ITEM_LOOK[b.ltpl]) ITEM_LOOK[id] = { ...ITEM_LOOK[b.ltpl], tint: _SC[b.line] };
for (let i = 1; i <= 4; i++) { ITEM_LOOK['l_dex_off' + i] = { icon: 8 }; ITEM_LOOK['l_int_off' + i] = { icon: 225 }; ITEM_LOOK['l_int_wand' + i] = { layers: { main: 'wand' }, icon: 104, tint: _SC.int }; ITEM_LOOK['l_str_hammer' + i] = { layers: { main: 'war_hammer' }, icon: ICONS2.warhammer, tint: _SC.str }; }
for (const [id, b] of Object.entries(_B)) if (b.tpl && ITEM_LOOK[b.tpl]) { const i = _HT.findIndex((t) => t[0] === b.minLvl); ITEM_LOOK[id] = { ...ITEM_LOOK[b.tpl], tint: _TC[i % _TC.length] }; }

// ── 지역 13~20 · 변종 몬스터 (v0.33): 기존 지역의 땅 · 물건을 바탕으로 색만 바꾼다 ──
import { VARIANTS as _VAR } from './world.js';
Object.assign(ZONE_LOOK, {
  ashland: { ...ZONE_LOOK.valley, grade: 'rgba(60,60,60,0.35)' },
  crypt: { ...ZONE_LOOK.frost, grade: 'rgba(30,50,90,0.35)' },
  crystal: { ...ZONE_LOOK.demongate, grade: 'rgba(70,30,110,0.35)' },
  bloodmire: { ...ZONE_LOOK.swamp, grade: 'rgba(90,10,10,0.35)' },
  stormpeak: { ...ZONE_LOOK.frost, grade: 'rgba(20,30,90,0.3)' },
  temple: { ...ZONE_LOOK.ruins, grade: 'rgba(80,60,20,0.25)' },
  abyss: { ...ZONE_LOOK.inferno, grade: 'rgba(60,10,90,0.42)' },
  throne: { ...ZONE_LOOK.demongate, grade: 'rgba(40,0,0,0.5)' },
});
// v0.41 폐허 조각 (OpenGameArt "Old ruins tileset", CC-BY-SA): tiles.props 100~117 = 돌무더기 5 · 기둥 5 · 벽감 2 · 석상 6, 200~217 = 얼어붙은 것, 151~157 · 251~257 = 아치 문
const RUBBLE = range(100, 104), PILLAR = range(105, 109), NICHE = [110, 111], STATUE = range(112, 117), GATE = [151, 153, 155, 157];
const frozen = (ids) => ids.map((i) => i + 100);
const ARCH = range(20, 25), DARK = range(30, 35); // v0.41 고딕 아치 · 다크 판타지 바위 · 빛나는 수정
ZONE_PROPS.ruins = [...ZONE_PROPS.ruins, ['props', RUBBLE, 16, 0.5], ['props', PILLAR, 10, 0.7], ['props', STATUE, 4, 0.6], ['props', GATE, 2, 1.4]];
ZONE_PROPS.frost = [...ZONE_PROPS.frost, ['props', frozen(RUBBLE), 12, 0.5], ['props', frozen(PILLAR), 6, 0.7]];
ZONE_PROPS.harbor = [...ZONE_PROPS.harbor, ['props', [2, 3, 9, 10], 3, 3.0], ['props', RUBBLE, 8, 0.5]];
ZONE_PROPS.orcfort = [...ZONE_PROPS.orcfort, ['props', RUBBLE, 10, 0.5], ['props', [8], 1, 2.6]];
Object.assign(ZONE_PROPS, { ashland: ZONE_PROPS.valley, crypt: [...ZONE_PROPS.frost, ['props', frozen(STATUE), 8, 0.6], ['props', frozen(NICHE), 4, 1.0], ['props', frozen(GATE), 3, 1.4]], crystal: [...ZONE_PROPS.demongate, ['props', [34, 35], 14, 0.8]], bloodmire: ZONE_PROPS.swamp,
  stormpeak: [...ZONE_PROPS.frost, ['props', frozen(PILLAR), 6, 0.7]], temple: [...ZONE_PROPS.ruins, ['props', ARCH, 8, 1.2], ['props', STATUE, 12, 0.6], ['props', NICHE, 6, 1.0], ['props', PILLAR, 12, 0.7], ['props', GATE, 3, 1.4]], abyss: [...ZONE_PROPS.inferno, ['props', DARK, 18, 0.8]],
  throne: [...ZONE_PROPS.demongate, ['props', ARCH, 8, 1.2], ['props', DARK, 8, 0.8], ['props', PILLAR, 12, 0.7], ['props', STATUE, 6, 0.6], ['props', GATE, 3, 1.4]] });
for (const [id, base, , tint] of _VAR) if (MONSTER_LOOK[base]) MONSTER_LOOK[id] = { ...MONSTER_LOOK[base], tint, size: (MONSTER_LOOK[base].size || 1) * (id === 'doom_king' ? 1.25 : 1) };
// v0.40 새 그림 (skeleton_quest 사람 적 · Flare 원본 고유 적, CC-BY-SA): 변종 일부는 바탕과 다른 몸
const VAR_SPRITE = { crystal_lord: ['x_spider_horror', 3.4], ash_king: ['x_spearman', 3.0], crypt_mage: ['x_chainmail_mage', 2.9], temple_priest: ['x_plate_mage', 2.9], blood_witch: ['x_leather_mage', 2.9], storm_wraith: ['x_shadow_wyvern', 3.0],
  crystal_bat: ['x_shadow_wyvern', 3.0], crystal_golem: ['x_golem', 3.0], temple_king: ['x_troll', 3.5], storm_brute: ['x_chainmail_brute', 3.0], ash_shade: ['x_thug_slinger', 2.9], temple_lord: ['x_grisbon', 4.4], doom_knight: ['x_plate_brute', 3.1],
  crypt_ghoul: ['x_cloth_brute', 2.9], blood_snake: ['x_leather_archer', 2.9], temple_shade: ['x_plate_archer', 2.9], abyss_eye: ['x_chainmail_archer', 2.9], doom_shade: ['x_cloth_archer', 2.9] };
for (const [id, [sprite, size]] of Object.entries(VAR_SPRITE)) if (MONSTER_LOOK[id]) MONSTER_LOOK[id] = { ...MONSTER_LOOK[id], sprite, size };
// v0.44.3 작은 원본을 너무 크게 늘려 흐리던 보스 · 네임드: 확대를 줄인다 (휴대폰에서 원본 1픽셀이 5~5.5픽셀 이하로)
// v0.44.5 원래 모습이 나았던 것은 되돌림
MONSTER_LOOK.blood_frog = {sprite: 'antlion', tint: 13647936, size: 1};
const SHARP_SIZE = { mushking: 1.6, wolf: 1.9 };
for (const [id, size] of Object.entries(SHARP_SIZE)) if (MONSTER_LOOK[id]) MONSTER_LOOK[id] = { ...MONSTER_LOOK[id], size };
// v0.44.4 그래도 흐리던 보스 · 네임드는 큰 원본으로 만든 몬스터로 바꾼다 [그림, 크기, 색]
const SHARP_SWAP = {
  spider_queen: ['x_spider_horror', 3.9, 0xd0a0ff], crystal_king: ['x_spider_horror', 3.9, 0xe8b8ff], brood_mother: ['x_spider_horror', 3.7, 0xa0ffa0],
  ghost_captain: ['x_fishman_blade', 3.0, 0xb0f0e0], bog_witch: ['x_fishman_blade', 2.9, 0x90e090], blood_lord: ['x_fishman_blade', 2.9, 0xff7070],
  crypt_king: ['x_ice_mummy', 1.8, 0xc8e8ff], high_mage: ['x_ice_mummy', 1.75, 0xd0d0e0], crypt_lord: ['x_ice_mummy', 1.75, 0x80b0ff],
  flame_lord: ['x_spearman', 3.3, 0xff9060], abyss_king: ['x_spearman', 3.3, 0xa070e0], temple_lord: ['x_knight', 2.5, 0xf0d080],
  temple_king: ['x_tusk_beast', 3.2, 0xd8d0b0], doom_king: ['x_tusk_beast', 3.2, 0x904050],
};
for (const [id, [sprite, size, tint]] of Object.entries(SHARP_SWAP)) if (MONSTER_LOOK[id]) MONSTER_LOOK[id] = { ...MONSTER_LOOK[id], sprite, size, tint };

// v0.41 둘째 아이콘 묶음: 둔기 · 보주는 Flare 무기 아이콘 · 보주 그림, 스킬은 Painterly 주문 아이콘 (스킬마다 하나씩)
Object.assign(ITEM_LOOK.rusty_club, { icon: ICONS2.club }); Object.assign(ITEM_LOOK.oak_club, { icon: ICONS2.club }); Object.assign(ITEM_LOOK.iron_mace, { icon: ICONS2.mace });
Object.assign(ITEM_LOOK.war_hammer, { icon: ICONS2.warhammer }); Object.assign(ITEM_LOOK.spiked_mace, { icon: ICONS2.reinforced_club }); Object.assign(ITEM_LOOK.knight_axe, { icon: ICONS2.infantry_axe }); Object.assign(ITEM_LOOK.dragon_mace, { icon: ICONS2.maul });
Object.assign(ITEM_LOOK.glass_orb, { icon: ICONS2.orb_cyan, tint: undefined }); Object.assign(ITEM_LOOK.moon_orb, { icon: ICONS2.orb_blue }); Object.assign(ITEM_LOOK.rune_orb, { icon: ICONS2.orb_rune, tint: undefined }); Object.assign(ITEM_LOOK.void_orb, { icon: ICONS2.orb_void, tint: undefined });
for (const [k, n] of Object.entries(ICONS2)) if (k.startsWith('sk:')) SKILL_ICON[k.slice(3)] = n;
