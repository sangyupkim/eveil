// 몬스터와 지역.
// model: assets/models 이름 · weapon/offhand: 손에 쥐는 모델
// attack: melee · ranged(석궁) · spell(마법)

export const MONSTERS = {
  skel_minion: {
    name: '해골 졸개', model: 'skel_minion', weapon: 'ws_blade', attack: 'melee',
    hp: 28, dmg: [3, 5], speed: 2.8, interval: 1.7, range: 1.9, aggro: 7, exp: 8,
    anims: { attack: '1H_Melee_Attack_Chop' },
  },
  skel_rogue: {
    name: '해골 도적', model: 'skel_rogue', weapon: 'ws_blade', attack: 'melee',
    hp: 38, dmg: [4, 6], speed: 3.4, interval: 1.25, range: 1.9, aggro: 8, exp: 12,
    anims: { attack: '1H_Melee_Attack_Chop' },
  },
  skel_archer: {
    name: '해골 석궁병', model: 'skel_rogue', weapon: 'ws_crossbow', attack: 'ranged', tint: 0xb8c0a0,
    hp: 32, dmg: [6, 9], speed: 2.7, interval: 2.0, range: 10, aggro: 12, exp: 12,
    anims: { attack: '2H_Ranged_Shoot' },
  },
  skel_warrior: {
    name: '해골 전사', model: 'skel_warrior', weapon: 'ws_axe', offhand: 'ws_shield', attack: 'melee',
    hp: 55, dmg: [7, 10], speed: 2.5, interval: 1.8, range: 2.1, aggro: 9, exp: 14,
    anims: { attack: '1H_Melee_Attack_Chop' },
  },
  skel_mage: {
    name: '해골 주술사', model: 'skel_mage', weapon: 'ws_staff', attack: 'spell',
    hp: 35, dmg: [9, 13], speed: 2.4, interval: 2.4, range: 10, aggro: 12, exp: 15,
    anims: { attack: 'Spellcast_Shoot' },
  },
  raider: {
    name: '잿빛 약탈자', model: 'barbarian', weapon: 'w_greataxe', attack: 'melee', tint: 0x8a6a60, human: true,
    hp: 70, dmg: [8, 12], speed: 3.0, interval: 1.9, range: 2.4, aggro: 10, exp: 18,
    anims: { attack: '2H_Melee_Attack_Chop' },
  },
  fallen_knight: {
    name: '타락한 기사', model: 'knight', weapon: 'w_sword', offhand: 'w_shield_sq', attack: 'melee', tint: 0x6a6070, human: true,
    hp: 90, dmg: [10, 14], speed: 2.7, interval: 1.7, range: 2.2, aggro: 10, exp: 24,
    anims: { attack: '1H_Melee_Attack_Slice_Diagonal' },
  },
};

// 지역: 마을은 원점. levels: 마을에서 가까운 쪽 → 먼 쪽 몬스터 레벨
export const TOWN = { id: 'town', name: '잿빛 초소', x: 0, z: 0, r: 24 };

export const ZONES = [
  {
    id: 'field', name: '푸리에 들판', x: 0, z: 62, r: 40, levels: [1, 3], count: 26, ground: [0.30, 0.33, 0.17],
    spawns: { skel_minion: 75, skel_rogue: 25 },
    named: { type: 'skel_warrior', name: '썩은 이빨 그룰' },
    boss: { type: 'skel_warrior', name: '들판의 해골 대장', tint: 0xc0a080 },
    props: { tree: 30, trees: 22, rock: 30, fence_broken: 6, tree_dead_s: 10, bone: 12 },
  },
  {
    id: 'forest', name: '썩은 숲', x: -72, z: -2, r: 40, levels: [4, 7], count: 28, ground: [0.16, 0.22, 0.13],
    spawns: { skel_rogue: 40, skel_archer: 35, skel_minion: 25 },
    named: { type: 'skel_rogue', name: '그림자 추적자' },
    boss: { type: 'skel_archer', name: '숲의 사냥꾼 벨크', tint: 0x80a070 },
    props: { tree_dead_l: 40, tree_dead_m: 40, tree_pine: 30, trees: 25, rock: 25, bone: 10 },
  },
  {
    id: 'grave', name: '망자의 묘지', x: 0, z: -76, r: 40, levels: [8, 12], count: 30, ground: [0.20, 0.22, 0.19],
    spawns: { skel_warrior: 40, skel_mage: 30, skel_archer: 15, skel_minion: 15 },
    named: { type: 'skel_mage', name: '저주받은 사제' },
    boss: { type: 'skel_mage', name: '묘지기 리치', tint: 0x9080c0 },
    props: { grave: 40, gravestone: 40, gravemarker: 30, crypt: 3, coffin: 8, fence_pillar: 20, tree_dead_m: 18, skull_candle: 12, post: 10 },
  },
  {
    id: 'ruins', name: '무너진 성채', x: 74, z: -4, r: 40, levels: [13, 18], count: 30, ground: [0.25, 0.19, 0.15],
    spawns: { raider: 35, fallen_knight: 25, skel_warrior: 25, skel_mage: 15 },
    named: { type: 'raider', name: '약탈단장 하르겐' },
    boss: { type: 'fallen_knight', name: '타락한 기사단장', tint: 0x403848 },
    props: { ruin: 14, rubble: 10, pillar: 18, barrel: 14, crates: 10, banner: 8, tree_dead_l: 14, rock: 20 },
  },
];

export const WORLD_SIZE = 125; // 맵 반경
