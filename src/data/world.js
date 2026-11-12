// 몬스터와 지역.
// model: assets/models 이름 · weapon/offhand: 손에 쥐는 모델 (해골 · 사람만)
// attack: melee · ranged(화살) · spell(마법)

// rig: skel(KayKit 해골, 동작 공유) · human(KayKit 사람) · 없으면 모델에 든 자기 동작
// h: 키(월드 단위) · atk: 공격 동작(attack · attack2 · shoot · cast · heavy) · fly: 떠다님
export const MONSTERS = {
  // 푸리에 들판
  slime: { name: '새끼 개미귀신', model: 'm_slime', h: 1.3, attack: 'melee', hp: 24, dmg: [2, 4], speed: 2.4, interval: 1.8, range: 1.8, aggro: 6, exp: 7 },
  rat: { behave: 'charge', name: '들판 고블린', model: 'm_rat', h: 1.0, attack: 'melee', hp: 20, dmg: [3, 4], speed: 3.8, interval: 1.3, range: 1.7, aggro: 7, exp: 8 },
  mushnub: { name: '약한 해골', model: 'm_mushnub', h: 1.5, attack: 'melee', hp: 34, dmg: [3, 6], speed: 2.6, interval: 1.7, range: 1.8, aggro: 7, exp: 10 },
  slime_spiky: { name: '가시 개미귀신', model: 'm_slime_spiky', h: 1.6, attack: 'melee', hp: 46, dmg: [5, 8], speed: 2.6, interval: 1.6, range: 1.9, aggro: 8, exp: 14 },
  mushking: { name: '고블린 두목', model: 'm_mushking', h: 2.6, attack: 'melee', atk: 'attack2', hp: 30, dmg: [5, 8], speed: 2.5, interval: 1.9, range: 2.4, aggro: 11, exp: 16,
    patterns: ['spores', 'summon', 'slam'], minion: 'mushnub' },
  // 썩은 숲
  wolf: { behave: 'charge', name: '고블린 정찰병', model: 'm_wolf', h: 1.5, attack: 'melee', hp: 40, dmg: [5, 8], speed: 4.2, interval: 1.3, range: 2.0, aggro: 10, exp: 13 },
  spider: { name: '숲 개미귀신', model: 'm_spider', h: 1.1, attack: 'melee', hp: 34, dmg: [5, 7], speed: 3.4, interval: 1.4, range: 1.8, aggro: 8, exp: 12 },
  wasp: { name: '호브고블린 궁수', model: 'm_wasp', h: 1.2, attack: 'ranged', fly: 1.0, hp: 28, dmg: [6, 9], speed: 3.2, interval: 2.0, range: 8, aggro: 11, exp: 13 },
  orc_grunt: { behave: 'shield', name: '호브고블린', model: 'm_orc_grunt', h: 1.7, attack: 'melee', hp: 52, dmg: [6, 9], speed: 2.8, interval: 1.7, range: 1.9, aggro: 9, exp: 14 },
  tribal: { behave: 'charge', name: '고블린 주술사', model: 'm_tribal', h: 1.7, attack: 'spell', atk: 'attack2', hp: 38, dmg: [8, 11], speed: 2.6, interval: 2.3, range: 9, aggro: 11, exp: 15 },
  orc: { name: '숲의 미노타우로스', model: 'm_orc', h: 2.4, attack: 'melee', atk: 'attack2', hp: 70, dmg: [8, 12], speed: 2.9, interval: 1.8, range: 2.4, aggro: 11, exp: 18,
    patterns: ['charge', 'slam', 'summon'], minion: 'orc_grunt' },
  // 망자의 묘지
  skel_minion: { name: '해골 졸개', model: 'skel_minion', rig: 'skel', weapon: 'ws_blade', attack: 'melee', hp: 42, dmg: [6, 9], speed: 2.8, interval: 1.7, range: 1.9, aggro: 8, exp: 12 },
  skel_rogue: { name: '해골 전사', model: 'skel_rogue', rig: 'skel', weapon: 'ws_blade', attack: 'melee', hp: 46, dmg: [6, 9], speed: 3.4, interval: 1.25, range: 1.9, aggro: 8, exp: 13 },
  skel_archer: { name: '해골 궁수', model: 'skel_rogue', rig: 'skel', weapon: 'ws_crossbow', attack: 'ranged', atk: 'shoot', tint: 0xb8c0a0, hp: 36, dmg: [7, 10], speed: 2.7, interval: 2.0, range: 10, aggro: 12, exp: 13 },
  skel_warrior: { behave: 'shield', name: '해골 기사', model: 'skel_warrior', rig: 'skel', weapon: 'ws_axe', offhand: 'ws_shield', attack: 'melee', hp: 60, dmg: [7, 10], speed: 2.5, interval: 1.8, range: 2.1, aggro: 9, exp: 15 },
  skel_mage: { name: '해골 주술사', model: 'skel_mage', rig: 'skel', weapon: 'ws_staff', attack: 'spell', atk: 'cast', hp: 38, dmg: [9, 13], speed: 2.4, interval: 2.4, range: 10, aggro: 12, exp: 16,
    patterns: ['volley', 'summon', 'spores'], minion: 'skel_minion' },
  ghost: { name: '떠도는 망자', model: 'm_ghost', h: 1.7, attack: 'spell', hp: 34, dmg: [8, 12], speed: 2.8, interval: 2.2, range: 8, aggro: 11, exp: 15 },
  ghost_skull: { name: '검은 좀비', model: 'm_ghost_skull', h: 1.8, attack: 'melee', hp: 48, dmg: [9, 12], speed: 3.2, interval: 1.6, range: 2.0, aggro: 10, exp: 16 },
  // 무너진 성채
  raider: { behave: 'shield', name: '호브고블린 약탈자', model: 'barbarian', rig: 'human', weapon: 'w_greataxe', attack: 'melee', atk: 'heavy', tint: 0x8a6a60, hp: 60, dmg: [7, 11], speed: 3.0, interval: 1.9, range: 2.4, aggro: 10, exp: 18 },
  fallen_knight: { behave: 'shield', name: '타락한 해골 기사', model: 'knight', rig: 'human', weapon: 'w_sword', offhand: 'w_shield_sq', attack: 'melee', tint: 0x6a6070, hp: 76, dmg: [9, 13], speed: 2.7, interval: 1.7, range: 2.2, aggro: 10, exp: 24 },
  imp: { name: '불개미', model: 'm_demon', h: 1.6, attack: 'spell', atk: 'attack2', hp: 42, dmg: [10, 14], speed: 3.2, interval: 2.2, range: 9, aggro: 12, exp: 20 },
  blue_demon: { name: '저주받은 좀비', model: 'm_blue_demon', h: 2.3, attack: 'melee', atk: 'attack2', hp: 81, dmg: [10, 14], speed: 2.9, interval: 1.8, range: 2.3, aggro: 10, exp: 24 },
  goleling: { behave: 'shield', name: '저주받은 무덤', model: 'm_goleling', h: 1.9, attack: 'melee', hp: 102, dmg: [9, 13], speed: 2.2, interval: 2.0, range: 2.1, aggro: 9, exp: 24 },
  dragon: { name: '황혼 비룡', model: 'm_dragon', h: 3.0, attack: 'spell', atk: 'attack2', hp: 110, dmg: [13, 18], speed: 3.0, interval: 2.0, range: 9, aggro: 14, exp: 30,
    patterns: ['volley', 'spores', 'charge', 'summon'], minion: 'imp' },
  // 안개 늪
  frog: { behave: 'charge', name: '늪 개미귀신', model: 'm_frog', h: 1.6, attack: 'melee', hp: 99, dmg: [12, 16], speed: 2.8, interval: 1.7, range: 2.0, aggro: 9, exp: 28 },
  bog_slime: { name: '늪 새끼 개미귀신', model: 'm_slime_pink', h: 1.5, tint: 0xa0d070, attack: 'melee', hp: 86, dmg: [11, 15], speed: 2.5, interval: 1.6, range: 1.9, aggro: 8, exp: 26 },
  snake: { name: '늪 독거미', model: 'm_snake', h: 1.1, attack: 'melee', hp: 76, dmg: [14, 18], speed: 3.6, interval: 1.3, range: 2.0, aggro: 10, exp: 27 },
  squidle: { name: '늪 해골 주술사', model: 'm_squidle', h: 1.8, attack: 'spell', hp: 81, dmg: [14, 20], speed: 2.6, interval: 2.2, range: 9, aggro: 11, exp: 30 },
  mushnub_evo: { behave: 'shield', name: '늪 좀비', model: 'm_mushnub_evo', h: 1.8, attack: 'melee', hp: 117, dmg: [13, 17], speed: 2.4, interval: 1.8, range: 2.0, aggro: 8, exp: 30 },
  bog_witch: { name: '늪의 대주술사', model: 'm_wizard', h: 2.2, attack: 'spell', hp: 120, dmg: [18, 24], speed: 2.4, interval: 2.0, range: 10, aggro: 12, exp: 34,
    patterns: ['volley', 'spores', 'summon'], minion: 'bog_slime' },
  bog_king: { name: '물 비룡', model: 'm_frog', h: 2.0, tint: 0x9ab070, attack: 'melee', atk: 'attack2', hp: 140, dmg: [18, 24], speed: 2.8, interval: 1.8, range: 2.6, aggro: 12, exp: 36,
    patterns: ['slam', 'spores', 'charge', 'summon'], minion: 'frog' },
  // 서리 고원
  yeti: { name: '설원 곰인간', model: 'm_yeti', h: 1.9, attack: 'melee', hp: 144, dmg: [14, 18], speed: 2.6, interval: 1.8, range: 2.1, aggro: 9, exp: 38 },
  ice_wolf: { behave: 'charge', name: '얼음 개미', model: 'm_husky', h: 1.5, tint: 0xc8d8ff, attack: 'melee', hp: 119, dmg: [14, 19], speed: 4.4, interval: 1.3, range: 2.0, aggro: 11, exp: 37 },
  snow_fox: { behave: 'charge', name: '작은 얼음 개미', model: 'm_fox', h: 1.2, tint: 0xf0f4ff, attack: 'melee', hp: 98, dmg: [13, 16], speed: 4.6, interval: 1.2, range: 1.9, aggro: 10, exp: 34 },
  frost_wraith: { name: '서리 해골 주술사', model: 'm_ghost', h: 1.8, tint: 0x9fd0ff, attack: 'spell', hp: 102, dmg: [16, 21], speed: 3.0, interval: 2.1, range: 9, aggro: 12, exp: 40 },
  ice_golem: { behave: 'shield', name: '서리 트롤', model: 'm_goleling', h: 2.0, tint: 0xa8d8ff, attack: 'melee', hp: 204, dmg: [15, 20], speed: 2.1, interval: 2.0, range: 2.2, aggro: 9, exp: 44 },
  frost_stag: { name: '바람 비룡', model: 'm_stag', h: 2.4, tint: 0xd8e8ff, attack: 'melee', hp: 200, dmg: [24, 30], speed: 4.0, interval: 1.6, range: 2.4, aggro: 12, exp: 46,
    patterns: ['charge', 'slam'] },
  yeti_king: { name: '폭풍 비룡 우두머리', model: 'm_yeti', h: 2.8, tint: 0xe0eaff, attack: 'melee', hp: 220, dmg: [24, 31], speed: 2.8, interval: 1.9, range: 2.8, aggro: 13, exp: 48,
    patterns: ['slam', 'charge', 'summon', 'spores'], minion: 'yeti' },
  // 고대 협곡
  raptor: { behave: 'charge', name: '협곡 개미귀신', model: 'm_raptor', h: 1.6, attack: 'melee', hp: 122, dmg: [14, 17], speed: 4.8, interval: 1.2, range: 2.0, aggro: 12, exp: 50 },
  tricer: { behave: 'charge', name: '갑각 개미귀신', model: 'm_tricer', h: 2.0, attack: 'melee', hp: 205, dmg: [14, 18], speed: 2.8, interval: 2.0, range: 2.6, aggro: 9, exp: 56 },
  stego: { behave: 'shield', name: '거대 갑각 개미귀신', model: 'm_stego', h: 2.2, attack: 'melee', hp: 230, dmg: [14, 18], speed: 2.4, interval: 2.1, range: 2.6, aggro: 8, exp: 58 },
  paraso: { name: '협곡 오크 약탈자', model: 'm_paraso', h: 2.4, attack: 'melee', hp: 166, dmg: [14, 18], speed: 3.4, interval: 1.7, range: 2.4, aggro: 10, exp: 54 },
  bison: { behave: 'charge', name: '뿔 미노타우로스', model: 'm_bison', h: 2.0, tint: 0x9a7a5a, attack: 'melee', hp: 179, dmg: [14, 18], speed: 3.6, interval: 1.8, range: 2.4, aggro: 10, exp: 54 },
  apato: { name: '늙은 미노타우로스', model: 'm_apato', h: 3.4, attack: 'melee', hp: 400, dmg: [32, 40], speed: 2.4, interval: 2.2, range: 3.2, aggro: 12, exp: 62,
    patterns: ['slam', 'charge'] },
  trex: { name: '미노타우로스 왕', model: 'm_trex', h: 3.4, attack: 'melee', hp: 380, dmg: [34, 43], speed: 3.4, interval: 1.9, range: 3.2, aggro: 14, exp: 66,
    patterns: ['charge', 'slam', 'summon', 'charge'], minion: 'raptor' },
  // 화염 균열
  flame_imp: { name: '화염 불개미', model: 'm_demon', h: 1.6, tint: 0xff8a60, attack: 'spell', hp: 196, dmg: [27, 34], speed: 3.4, interval: 2.0, range: 9, aggro: 12, exp: 64 },
  fiend: { name: '불꽃 악마', model: 'm_blue_demon', h: 2.3, tint: 0xff6a4a, attack: 'melee', atk: 'attack2', hp: 357, dmg: [29, 36], speed: 3.0, interval: 1.8, range: 2.4, aggro: 10, exp: 72 },
  magma_golem: { behave: 'shield', name: '용암 석상', model: 'm_goleling', h: 2.2, tint: 0xff7a40, attack: 'melee', hp: 442, dmg: [27, 35], speed: 2.2, interval: 2.0, range: 2.3, aggro: 9, exp: 74 },
  ember_skull: { name: '잿불 해골', model: 'm_ghost_skull', h: 1.9, tint: 0xff9a50, attack: 'melee', hp: 255, dmg: [30, 37], speed: 3.6, interval: 1.5, range: 2.0, aggro: 11, exp: 70 },
  drake: { behave: 'charge', name: '불 비룡', model: 'm_dragon', h: 2.4, tint: 0xff7050, attack: 'spell', atk: 'attack2', hp: 289, dmg: [32, 40], speed: 3.2, interval: 2.0, range: 9, aggro: 13, exp: 76 },
  flame_lord: { name: '화염의 대주술사', model: 'm_blue_demon', h: 3.0, tint: 0xff4a2a, attack: 'melee', atk: 'attack2', hp: 500, dmg: [44, 55], speed: 3.0, interval: 1.8, range: 3.0, aggro: 14, exp: 90,
    patterns: ['slam', 'volley', 'charge', 'summon', 'spores'], minion: 'flame_imp' },
  // ── 9 오크 요새 ──
  orc_grunt2: { name: '오크 전사', model: 'm_orc', h: 2.0, attack: 'melee', hp: 260, dmg: [31, 38], speed: 3.4, interval: 1.6, range: 2.2, aggro: 11, exp: 80 },
  orc_archer2: { name: '오크 궁수', model: 'm_orc', h: 2.0, attack: 'ranged', hp: 200, dmg: [30, 37], speed: 3.2, interval: 1.9, range: 10, aggro: 13, exp: 80 },
  orc_brute: { behave: 'shield', name: '오크 중갑병', model: 'm_orc', h: 2.2, attack: 'melee', hp: 380, dmg: [32, 40], speed: 2.6, interval: 1.9, range: 2.3, aggro: 10, exp: 86 },
  orc_raider: { behave: 'charge', name: '오크 돌격병', model: 'm_orc', h: 2.0, attack: 'melee', hp: 240, dmg: [33, 40], speed: 4.2, interval: 1.5, range: 2.2, aggro: 12, exp: 84 },
  orc_warlord: { name: '오크 군주', model: 'm_orc', h: 2.6, attack: 'melee', hp: 560, dmg: [48, 58], speed: 3.2, interval: 1.7, range: 2.6, aggro: 13, exp: 96, patterns: ['charge', 'slam'] },
  troll_king: { name: '바위 트롤 왕', model: 'm_troll', h: 3.2, attack: 'melee', hp: 620, dmg: [52, 64], speed: 2.8, interval: 2.0, range: 3.2, aggro: 14, exp: 110, patterns: ['slam', 'charge', 'summon', 'slam'], minion: 'orc_grunt2' },
  // ── 10 거미 숲 ──
  web_spider: { name: '그물 거미', model: 'm_spider', h: 1.2, attack: 'melee', hp: 230, dmg: [34, 41], speed: 4.4, interval: 1.2, range: 1.8, aggro: 12, exp: 86 },
  poison_spider: { name: '독거미', model: 'm_spider', h: 1.4, attack: 'spell', hp: 250, dmg: [33, 40], speed: 3.6, interval: 1.9, range: 8, aggro: 12, exp: 88 },
  cave_spider: { behave: 'charge', name: '굴 거미', model: 'm_spider', h: 1.6, attack: 'melee', hp: 330, dmg: [36, 44], speed: 4.0, interval: 1.5, range: 2.0, aggro: 11, exp: 92 },
  shade: { name: '숲 그림자', model: 'm_shadow', h: 2.0, attack: 'spell', hp: 270, dmg: [36, 44], speed: 3.4, interval: 1.8, range: 9, aggro: 12, exp: 92 },
  brood_mother: { name: '거미 여왕의 딸', model: 'm_spider', h: 2.2, attack: 'melee', hp: 600, dmg: [52, 62], speed: 3.4, interval: 1.6, range: 2.6, aggro: 13, exp: 104, patterns: ['spores', 'charge'] },
  spider_queen: { name: '거미 여왕 아라크네', model: 'm_spider', h: 3.0, attack: 'melee', hp: 700, dmg: [56, 68], speed: 3.2, interval: 1.7, range: 3.0, aggro: 14, exp: 120, patterns: ['spores', 'summon', 'charge', 'volley'], minion: 'web_spider' },
  // ── 11 망령의 항구 ──
  ghost_crew: { name: '망령 선원', model: 'm_ghost', h: 2.0, attack: 'melee', hp: 300, dmg: [38, 46], speed: 3.6, interval: 1.5, range: 2.2, aggro: 12, exp: 96 },
  bone_knight: { behave: 'shield', name: '해골 기사단', model: 'm_skel', h: 2.1, attack: 'melee', hp: 420, dmg: [40, 48], speed: 2.8, interval: 1.8, range: 2.3, aggro: 11, exp: 102 },
  occultist: { name: '해골 사교도', model: 'm_skel', h: 2.0, attack: 'spell', hp: 280, dmg: [40, 48], speed: 3.0, interval: 2.0, range: 9, aggro: 13, exp: 100 },
  dock_assassin: { behave: 'charge', name: '부두 암살자', model: 'm_human', h: 1.9, attack: 'melee', hp: 290, dmg: [42, 50], speed: 4.6, interval: 1.2, range: 2.0, aggro: 13, exp: 100 },
  high_mage: { name: '고위 해골 마법사', model: 'm_skel', h: 2.4, attack: 'spell', hp: 640, dmg: [58, 70], speed: 3.0, interval: 1.8, range: 10, aggro: 14, exp: 112, patterns: ['volley', 'spores'] },
  ghost_captain: { name: '유령 선장 모르간', model: 'm_ghost', h: 2.8, attack: 'melee', hp: 760, dmg: [62, 74], speed: 3.4, interval: 1.6, range: 3.0, aggro: 15, exp: 130, patterns: ['charge', 'summon', 'slam', 'volley'], minion: 'ghost_crew' },
  // ── 12 악마의 관문 ──
  hell_hound: { behave: 'charge', name: '지옥 늑대인간', model: 'm_wolf', h: 2.0, attack: 'melee', hp: 330, dmg: [44, 52], speed: 4.6, interval: 1.3, range: 2.2, aggro: 13, exp: 106 },
  dread_bear: { behave: 'shield', name: '저주받은 곰인간', model: 'm_bear', h: 2.4, attack: 'melee', hp: 520, dmg: [46, 56], speed: 3.0, interval: 1.8, range: 2.6, aggro: 11, exp: 112 },
  void_shade: { name: '공허의 그림자', model: 'm_shadow', h: 2.0, attack: 'spell', hp: 340, dmg: [46, 54], speed: 3.6, interval: 1.8, range: 10, aggro: 13, exp: 110 },
  gargoyle: { behave: 'shield', name: '악마 석상', model: 'm_statue', h: 2.6, attack: 'spell', hp: 600, dmg: [48, 58], speed: 1.6, interval: 2.2, range: 9, aggro: 10, exp: 116 },
  pit_lord: { name: '구덩이 군주', model: 'm_demon', h: 2.8, attack: 'melee', hp: 800, dmg: [66, 80], speed: 3.2, interval: 1.7, range: 3.0, aggro: 14, exp: 124, patterns: ['slam', 'charge'] },
  arch_demon: { name: '대악마 벨가로스', model: 'm_demon', h: 3.4, attack: 'melee', hp: 900, dmg: [72, 88], speed: 3.2, interval: 1.6, range: 3.4, aggro: 16, exp: 150, patterns: ['slam', 'volley', 'charge', 'summon', 'spores'], minion: 'hell_hound' },
};

// 지역: 마을은 원점. levels: 마을에서 가까운 쪽 → 먼 쪽 몬스터 레벨
export const TOWN = { id: 'town', name: '여명 초소', x: 0, z: 0, r: 24 };

export const ZONES = [
  {
    id: 'field', name: '푸리에 들판', x: 0, z: 62, r: 40, levels: [1, 3], count: 17, ground: [0.30, 0.33, 0.17],
    spawns: { slime: 45, rat: 20, mushnub: 35 },
    named: { type: 'slime_spiky', name: '가시 개미귀신 군주' },
    boss: { type: 'mushking', name: '고블린 대두목 무르크' },
    props: { tree: 16, trees: 12, n_tree1: 16, n_tree2: 12, n_tree3: 10, n_birch: 10, n_bush: 22, n_bush2: 16, n_berries: 10, n_flowers: 36, n_grass: 30, rock: 14, n_moss1: 10, n_stump: 8, n_log: 6, fence_broken: 6, bone: 6 },
  },
  {
    id: 'forest', name: '썩은 숲', x: -72, z: -2, r: 40, levels: [4, 7], count: 18, ground: [0.16, 0.22, 0.13],
    spawns: { wolf: 30, spider: 22, orc_grunt: 22, wasp: 14, tribal: 12 },
    named: { type: 'wolf', name: '정찰대장 송곳니' },
    boss: { type: 'orc', name: '미노타우로스 그라쉬' },
    props: { tree_dead_l: 20, tree_dead_m: 18, tree_pine: 16, n_pine1: 20, n_pine2: 18, n_birch2: 10, n_dead2: 10, n_moss1: 14, n_moss2: 12, n_stump_moss: 10, n_log_moss: 10, n_plant: 20, n_bush2: 14, bone: 8 },
  },
  {
    id: 'grave', name: '망자의 묘지', x: 0, z: -76, r: 40, levels: [8, 12], count: 20, ground: [0.20, 0.22, 0.19],
    spawns: { skel_minion: 18, skel_rogue: 16, skel_warrior: 22, skel_archer: 14, ghost: 16, ghost_skull: 14 },
    named: { type: 'skel_mage', name: '저주받은 사제' },
    boss: { type: 'skel_mage', name: '묘지기 리치', tint: 0x9080c0 },
    props: { grave: 40, gravestone: 40, gravemarker: 30, crypt: 3, coffin: 8, fence_pillar: 20, tree_dead_m: 18, skull_candle: 12, post: 10 },
  },
  {
    id: 'ruins', name: '무너진 성채', x: 74, z: -4, r: 40, levels: [13, 18], count: 20, ground: [0.25, 0.19, 0.15],
    spawns: { raider: 22, fallen_knight: 18, imp: 22, blue_demon: 20, goleling: 18 },
    named: { type: 'blue_demon', name: '약탈단장 하르겐' },
    boss: { type: 'dragon', name: '황혼 비룡 베르크' },
    props: { ruin: 14, rubble: 10, pillar: 18, barrel: 14, crates: 10, banner: 8, tree_dead_l: 14, rock: 20 },
  },
  {
    id: 'swamp', name: '안개 늪', x: -102, z: 102, r: 40, levels: [19, 24], count: 20, ground: [0.17, 0.22, 0.15], music: 'forest',
    spawns: { frog: 25, bog_slime: 20, snake: 22, squidle: 15, mushnub_evo: 18 },
    named: { type: 'bog_witch', name: '늪의 대주술사 모르가' },
    boss: { type: 'bog_king', name: '물 비룡 그루글' },
    props: { n_willow: 26, n_willow2: 18, n_willow_dead: 14, n_lily: 30, n_moss1: 16, n_moss2: 12, n_log_moss: 10, n_stump_moss: 10, n_plant: 24, n_plant2: 20, n_grass2: 30 },
  },
  {
    id: 'frost', name: '서리 고원', x: -102, z: -102, r: 40, levels: [25, 30], count: 20, ground: [0.62, 0.66, 0.72], music: 'grave',
    spawns: { yeti: 24, ice_wolf: 22, snow_fox: 18, frost_wraith: 18, ice_golem: 18 },
    named: { type: 'frost_stag', name: '바람 비룡 하얀서리' },
    boss: { type: 'yeti_king', name: '폭풍 비룡 우르가' },
    props: { n_snow_pine: 34, n_snow_pine2: 28, n_snow_tree: 16, n_snow_birch: 16, n_snow_dead: 12, n_rock_snow: 20, n_rock_snow2: 14, n_bush_snow: 20, n_log_snow: 10 },
  },
  {
    id: 'valley', name: '고대 협곡', x: 102, z: -102, r: 40, levels: [31, 36], count: 20, ground: [0.38, 0.3, 0.18], music: 'field',
    spawns: { raptor: 30, tricer: 18, stego: 16, paraso: 18, bison: 18 },
    named: { type: 'apato', name: '늙은 미노타우로스 브론' },
    boss: { type: 'trex', name: '미노타우로스 왕 렉스' },
    props: { n_pine_au: 18, n_tree_au: 16, n_tree_au2: 14, n_rock1: 26, n_rock2: 22, n_cactus: 12, n_cactus2: 10, n_bush: 20, n_wheat: 20, n_dead1: 10 },
  },
  {
    id: 'inferno', name: '화염 균열', x: 102, z: 102, r: 40, levels: [37, 42], count: 21, ground: [0.24, 0.1, 0.07], music: 'ruins',
    spawns: { flame_imp: 22, fiend: 20, magma_golem: 18, ember_skull: 22, drake: 18 },
    named: { type: 'drake', name: '불 비룡 이그니스' },
    boss: { type: 'flame_lord', name: '화염의 대주술사 바르곤' },
    props: { n_dead1: 20, n_dead2: 18, n_birch_dead: 14, n_rock1: 26, n_rock2: 22, rubble: 10, pillar: 8, skull_candle: 12, bone: 14 },
  },
  {
    id: 'orcfort', name: '오크 요새', x: 0, z: 172, r: 40, levels: [43, 48], count: 20, ground: [0.30, 0.24, 0.16], music: 'battle',
    spawns: { orc_grunt2: 30, orc_archer2: 22, orc_brute: 20, orc_raider: 20 },
    named: { type: 'orc_warlord', name: '오크 군주 그롬마쉬' },
    boss: { type: 'troll_king', name: '바위 트롤 왕 구르크' },
    props: {},
  },
  {
    id: 'webwood', name: '거미줄 숲', x: -172, z: 0, r: 40, levels: [49, 54], count: 21, ground: [0.12, 0.16, 0.12], music: 'forest',
    spawns: { web_spider: 30, poison_spider: 22, cave_spider: 20, shade: 18 },
    named: { type: 'brood_mother', name: '거미 여왕의 딸 실크' },
    boss: { type: 'spider_queen', name: '거미 여왕 아라크네' },
    props: {},
  },
  {
    id: 'harbor', name: '망령의 항구', x: 0, z: -172, r: 40, levels: [55, 60], count: 21, ground: [0.18, 0.22, 0.26], music: 'unrest',
    spawns: { ghost_crew: 30, bone_knight: 20, occultist: 22, dock_assassin: 18 },
    named: { type: 'high_mage', name: '고위 해골 마법사 네크로스' },
    boss: { type: 'ghost_captain', name: '유령 선장 모르간' },
    props: {},
  },
  {
    id: 'demongate', name: '악마의 관문', x: 172, z: 0, r: 40, levels: [61, 66], count: 22, ground: [0.26, 0.08, 0.08], music: 'boss',
    spawns: { hell_hound: 28, dread_bear: 20, void_shade: 22, gargoyle: 14 },
    named: { type: 'pit_lord', name: '구덩이 군주 모르독' },
    boss: { type: 'arch_demon', name: '대악마 벨가로스' },
    props: {},
  },
];

export const WORLD_SIZE = 218; // 맵 반경 (지역 9~12가 바깥 고리)
