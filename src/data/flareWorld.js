import { GEMS, GEM_GRADES, gemId } from './legends.js';
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
  orc_warlord: { sprite: 'x_orc_elite', tint: 0xffb080, size: 3.8 }, troll_king: { sprite: 'x_troll', size: 2.8 },
  web_spider: { sprite: 'x_spider', size: 2.2 }, poison_spider: { sprite: 'x_spider_large', tint: 0xa0e080, size: 2.6 }, cave_spider: { sprite: 'x_spider_large', size: 2.8 }, shade: { sprite: 'x_shadow', size: 1.9 },
  brood_mother: { sprite: 'x_spider_giant', size: 3.0 }, spider_queen: { sprite: 'x_spider_giant', tint: 0xd0a0ff, size: 4.2 },
  ghost_crew: { sprite: 'x_pirate_ghost_crewman', size: 3.2 }, bone_knight: { sprite: 'x_skeleton_knight', size: 3.1 }, occultist: { sprite: 'x_skeleton_occultist', size: 3.0 }, dock_assassin: { sprite: 'x_assassin', size: 3.4 },
  high_mage: { sprite: 'x_skeleton_mage_high', size: 3.6 }, ghost_captain: { sprite: 'x_pirate_ghost_captain', size: 4.8 },
  hell_hound: { sprite: 'x_werewolf', tint: 0xff9070, size: 3.3 }, dread_bear: { sprite: 'x_werebear', tint: 0xc08080, size: 2.8 }, void_shade: { sprite: 'x_shadow', tint: 0xd090ff, size: 2.0 }, gargoyle: { sprite: 'x_demon_statue', size: 1.5 },
  pit_lord: { sprite: 'x_demon', size: 1.9 }, arch_demon: { sprite: 'x_demon', tint: 0xff8060, size: 2.5 },
  slime: { sprite: 'antlion_small', size: 0.9 },
  rat: { sprite: 'goblin', size: 0.9 },
  mushnub: { sprite: 'skeleton_weak' },
  slime_spiky: { sprite: 'antlion' },
  mushking: { sprite: 'goblin_elite', size: 1.3 },
  wolf: { sprite: 'goblin_elite', tint: 0xc8d0a0 },
  spider: { sprite: 'antlion', tint: 0x90b070 },
  wasp: { sprite: 'hobgoblin_archer' },
  orc_grunt: { sprite: 'hobgoblin' },
  tribal: { sprite: 'skeleton_mage', tint: 0x9ad070 },
  orc: { sprite: 'minotaur', size: 0.95 },
  skel_minion: { sprite: 'skeleton_weak' },
  skel_rogue: { sprite: 'skeleton' },
  skel_archer: { sprite: 'skeleton_archer' },
  skel_warrior: { sprite: 'skeleton', tint: 0xd8c8a8, size: 1.1 },
  skel_mage: { sprite: 'skeleton_mage' },
  ghost: { sprite: 'zombie', tint: 0x9fb0ff },
  ghost_skull: { sprite: 'zombie_dark' },
  raider: { sprite: 'hobgoblin', tint: 0xc08070, size: 1.15 },
  fallen_knight: { sprite: 'skeleton_knight_boss', size: 0.9 },
  imp: { sprite: 'fire_ant' },
  blue_demon: { sprite: 'zombie_dark', tint: 0x8090ff, size: 1.2 },
  goleling: { sprite: 'cursed_grave', size: 0.9 },
  dragon: { sprite: 'wyvern' },
  frog: { sprite: 'antlion', tint: 0x80c070 },
  bog_slime: { sprite: 'antlion_small', tint: 0xa0d070 },
  snake: { sprite: 'x_spider_large', tint: 0x90b070, size: 2.5 },
  squidle: { sprite: 'skeleton_mage', tint: 0x80d0a0 },
  mushnub_evo: { sprite: 'zombie', tint: 0x90c080 },
  bog_witch: { sprite: 'skeleton_mage_boss', tint: 0xa0e090 },
  bog_king: { sprite: 'wyvern_water', size: 1.1 },
  yeti: { sprite: 'x_werebear', tint: 0xd8e8ff, size: 2.7 },
  ice_wolf: { sprite: 'ice_ant' },
  snow_fox: { sprite: 'ice_ant', size: 0.8 },
  frost_wraith: { sprite: 'skeleton_mage', tint: 0xa8d8ff },
  ice_golem: { sprite: 'x_troll', tint: 0xb0d8ff, size: 2.15 },
  frost_stag: { sprite: 'wyvern_air' },
  yeti_king: { sprite: 'wyvern_air_boss' },
  raptor: { sprite: 'antlion', tint: 0xd8b070 },
  tricer: { sprite: 'antlion_armored' },
  stego: { sprite: 'antlion_armored', tint: 0xb0a080, size: 1.15 },
  paraso: { sprite: 'x_orc_heavy', tint: 0xd8b080, size: 3.0 },
  bison: { sprite: 'minotaur', size: 0.95 },
  apato: { sprite: 'minotaur', tint: 0x8a9a70, size: 1.25 },
  trex: { sprite: 'minotaur', tint: 0xff9a60, size: 1.4 },
  flame_imp: { sprite: 'fire_ant' },
  fiend: { sprite: 'x_demon', size: 1.5 },
  magma_golem: { sprite: 'x_demon_statue', tint: 0xff9a60, size: 1.35 },
  ember_skull: { sprite: 'skeleton', tint: 0xff9a60 },
  drake: { sprite: 'wyvern_fire' },
  flame_lord: { sprite: 'skeleton_mage_high_boss', tint: 0xff7a50, size: 1.3 },
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
  archmage_hat: { layers: { head: 'mage_hood_alt1' }, icon: 184, tint: C.gold }, dragon_helm: { layers: { head: 'plate_helm' }, icon: 160, tint: C.red },
  cloth_robe: { layers: { chest: 'mage_vest', legs: 'mage_skirt' }, icon: 137 }, leather_armor: { layers: { chest: 'leather_chest', legs: 'leather_pants' }, icon: 145 },
  chain_mail: { layers: { chest: 'chain_cuirass', legs: 'chain_greaves' }, icon: 153 }, plate_armor: { layers: { chest: 'plate_cuirass', legs: 'plate_greaves' }, icon: 161 },
  arcane_robe: { layers: { chest: 'mage_vest_alt1', legs: 'mage_skirt_alt1' }, icon: 185 }, dark_plate: { layers: { chest: 'plate_cuirass', legs: 'plate_greaves' }, icon: 161, tint: C.dark },
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
  dungeon_key: { icon: 226 }, hp_potion: { icon: 64 }, mp_potion: { icon: 65 }, hp_potion_l: { icon: 84 }, mp_potion_l: { icon: 86 },
};
// 처음 복장 (안 입은 부위)
export const BASE_CLOTHES = { chest: 'cloth_shirt', legs: 'cloth_pants', feet: 'cloth_sandals', hands: 'default_hands' };
// 떨어진 아이템 그림 (Flare loot 동작)
export const LOOT_LOOK = { weapon: { sword: 'longsword', bow: 'longbow', staff: 'staff' }, offhand: 'shield', helm: 'leather_armor', armor: 'leather_armor', gloves: 'leather_armor', boots: 'boots', belt: 'belt', amulet: 'ring', ring: 'ring', potion_hp: 'hp_potion', potion_mp: 'mp_potion', book: 'book', gold: 'coins25' };

// 스킬 아이콘 번호
export const SKILL_ICON = {
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
