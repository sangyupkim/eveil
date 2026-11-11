// 몬스터와 지역.
// model: assets/models 이름 · weapon/offhand: 손에 쥐는 모델 (해골 · 사람만)
// attack: melee · ranged(화살) · spell(마법)

// rig: skel(KayKit 해골, 동작 공유) · human(KayKit 사람) · 없으면 모델에 든 자기 동작
// h: 키(월드 단위) · atk: 공격 동작(attack · attack2 · shoot · cast · heavy) · fly: 떠다님
export const MONSTERS = {
  // 푸리에 들판
  slime: { name: '풀빛 슬라임', model: 'm_slime', h: 1.3, attack: 'melee', hp: 24, dmg: [2, 4], speed: 2.4, interval: 1.8, range: 1.8, aggro: 6, exp: 7 },
  rat: { name: '들쥐', model: 'm_rat', h: 1.0, attack: 'melee', hp: 20, dmg: [3, 4], speed: 3.8, interval: 1.3, range: 1.7, aggro: 7, exp: 8 },
  mushnub: { name: '머쉬넙', model: 'm_mushnub', h: 1.5, attack: 'melee', hp: 34, dmg: [3, 6], speed: 2.6, interval: 1.7, range: 1.8, aggro: 7, exp: 10 },
  slime_spiky: { name: '가시 슬라임', model: 'm_slime_spiky', h: 1.6, attack: 'melee', hp: 46, dmg: [5, 8], speed: 2.6, interval: 1.6, range: 1.9, aggro: 8, exp: 14 },
  mushking: { name: '버섯 왕', model: 'm_mushking', h: 2.6, attack: 'melee', atk: 'attack2', hp: 30, dmg: [5, 8], speed: 2.5, interval: 1.9, range: 2.4, aggro: 11, exp: 16,
    patterns: ['spores', 'summon', 'slam'], minion: 'mushnub' },
  // 썩은 숲
  wolf: { name: '잿빛 늑대', model: 'm_wolf', h: 1.5, attack: 'melee', hp: 40, dmg: [5, 8], speed: 4.2, interval: 1.3, range: 2.0, aggro: 10, exp: 13 },
  spider: { name: '숲거미', model: 'm_spider', h: 1.1, attack: 'melee', hp: 34, dmg: [5, 7], speed: 3.4, interval: 1.4, range: 1.8, aggro: 8, exp: 12 },
  wasp: { name: '독침벌', model: 'm_wasp', h: 1.2, attack: 'ranged', fly: 1.0, hp: 28, dmg: [6, 9], speed: 3.2, interval: 2.0, range: 8, aggro: 11, exp: 13 },
  orc_grunt: { name: '오크 졸병', model: 'm_orc_grunt', h: 1.7, attack: 'melee', hp: 52, dmg: [6, 9], speed: 2.8, interval: 1.7, range: 1.9, aggro: 9, exp: 14 },
  tribal: { name: '부족 주술사', model: 'm_tribal', h: 1.7, attack: 'spell', atk: 'attack2', hp: 38, dmg: [8, 11], speed: 2.6, interval: 2.3, range: 9, aggro: 11, exp: 15 },
  orc: { name: '오크 전사', model: 'm_orc', h: 2.4, attack: 'melee', atk: 'attack2', hp: 70, dmg: [8, 12], speed: 2.9, interval: 1.8, range: 2.4, aggro: 11, exp: 18,
    patterns: ['charge', 'slam', 'summon'], minion: 'orc_grunt' },
  // 망자의 묘지
  skel_minion: { name: '해골 졸개', model: 'skel_minion', rig: 'skel', weapon: 'ws_blade', attack: 'melee', hp: 42, dmg: [6, 9], speed: 2.8, interval: 1.7, range: 1.9, aggro: 8, exp: 12 },
  skel_rogue: { name: '해골 도적', model: 'skel_rogue', rig: 'skel', weapon: 'ws_blade', attack: 'melee', hp: 46, dmg: [6, 9], speed: 3.4, interval: 1.25, range: 1.9, aggro: 8, exp: 13 },
  skel_archer: { name: '해골 석궁병', model: 'skel_rogue', rig: 'skel', weapon: 'ws_crossbow', attack: 'ranged', atk: 'shoot', tint: 0xb8c0a0, hp: 36, dmg: [7, 10], speed: 2.7, interval: 2.0, range: 10, aggro: 12, exp: 13 },
  skel_warrior: { name: '해골 전사', model: 'skel_warrior', rig: 'skel', weapon: 'ws_axe', offhand: 'ws_shield', attack: 'melee', hp: 60, dmg: [7, 10], speed: 2.5, interval: 1.8, range: 2.1, aggro: 9, exp: 15 },
  skel_mage: { name: '해골 주술사', model: 'skel_mage', rig: 'skel', weapon: 'ws_staff', attack: 'spell', atk: 'cast', hp: 38, dmg: [9, 13], speed: 2.4, interval: 2.4, range: 10, aggro: 12, exp: 16,
    patterns: ['volley', 'summon', 'spores'], minion: 'skel_minion' },
  ghost: { name: '떠도는 혼령', model: 'm_ghost', h: 1.7, attack: 'spell', hp: 34, dmg: [8, 12], speed: 2.8, interval: 2.2, range: 8, aggro: 11, exp: 15 },
  ghost_skull: { name: '해골 망령', model: 'm_ghost_skull', h: 1.8, attack: 'melee', hp: 48, dmg: [9, 12], speed: 3.2, interval: 1.6, range: 2.0, aggro: 10, exp: 16 },
  // 무너진 성채
  raider: { name: '잿빛 약탈자', model: 'barbarian', rig: 'human', weapon: 'w_greataxe', attack: 'melee', atk: 'heavy', tint: 0x8a6a60, hp: 70, dmg: [8, 12], speed: 3.0, interval: 1.9, range: 2.4, aggro: 10, exp: 18 },
  fallen_knight: { name: '타락한 기사', model: 'knight', rig: 'human', weapon: 'w_sword', offhand: 'w_shield_sq', attack: 'melee', tint: 0x6a6070, hp: 90, dmg: [10, 14], speed: 2.7, interval: 1.7, range: 2.2, aggro: 10, exp: 24 },
  imp: { name: '잿불 임프', model: 'm_demon', h: 1.6, attack: 'spell', atk: 'attack2', hp: 50, dmg: [11, 15], speed: 3.2, interval: 2.2, range: 9, aggro: 12, exp: 20 },
  blue_demon: { name: '푸른 악마', model: 'm_blue_demon', h: 2.3, attack: 'melee', atk: 'attack2', hp: 95, dmg: [11, 16], speed: 2.9, interval: 1.8, range: 2.3, aggro: 10, exp: 24 },
  goleling: { name: '돌 골렘', model: 'm_goleling', h: 1.9, attack: 'melee', hp: 120, dmg: [10, 14], speed: 2.2, interval: 2.0, range: 2.1, aggro: 9, exp: 24 },
  dragon: { name: '잿빛 용', model: 'm_dragon', h: 3.0, attack: 'spell', atk: 'attack2', hp: 110, dmg: [13, 18], speed: 3.0, interval: 2.0, range: 9, aggro: 14, exp: 30,
    patterns: ['volley', 'spores', 'charge', 'summon'], minion: 'imp' },
};

// 지역: 마을은 원점. levels: 마을에서 가까운 쪽 → 먼 쪽 몬스터 레벨
export const TOWN = { id: 'town', name: '잿빛 초소', x: 0, z: 0, r: 24 };

export const ZONES = [
  {
    id: 'field', name: '푸리에 들판', x: 0, z: 62, r: 40, levels: [1, 3], count: 26, ground: [0.30, 0.33, 0.17],
    spawns: { slime: 45, rat: 20, mushnub: 35 },
    named: { type: 'slime_spiky', name: '가시 군주 글롭' },
    boss: { type: 'mushking', name: '버섯 왕 무르크' },
    props: { tree: 30, trees: 22, rock: 30, fence_broken: 6, tree_dead_s: 10, bone: 12 },
  },
  {
    id: 'forest', name: '썩은 숲', x: -72, z: -2, r: 40, levels: [4, 7], count: 28, ground: [0.16, 0.22, 0.13],
    spawns: { wolf: 30, spider: 22, orc_grunt: 22, wasp: 14, tribal: 12 },
    named: { type: 'wolf', name: '잿빛 송곳니' },
    boss: { type: 'orc', name: '오크 족장 그라쉬' },
    props: { tree_dead_l: 40, tree_dead_m: 40, tree_pine: 30, trees: 25, rock: 25, bone: 10 },
  },
  {
    id: 'grave', name: '망자의 묘지', x: 0, z: -76, r: 40, levels: [8, 12], count: 30, ground: [0.20, 0.22, 0.19],
    spawns: { skel_minion: 18, skel_rogue: 16, skel_warrior: 22, skel_archer: 14, ghost: 16, ghost_skull: 14 },
    named: { type: 'skel_mage', name: '저주받은 사제' },
    boss: { type: 'skel_mage', name: '묘지기 리치', tint: 0x9080c0 },
    props: { grave: 40, gravestone: 40, gravemarker: 30, crypt: 3, coffin: 8, fence_pillar: 20, tree_dead_m: 18, skull_candle: 12, post: 10 },
  },
  {
    id: 'ruins', name: '무너진 성채', x: 74, z: -4, r: 40, levels: [13, 18], count: 30, ground: [0.25, 0.19, 0.15],
    spawns: { raider: 22, fallen_knight: 18, imp: 22, blue_demon: 20, goleling: 18 },
    named: { type: 'blue_demon', name: '약탈단장 하르겐' },
    boss: { type: 'dragon', name: '잿빛 용 베르크' },
    props: { ruin: 14, rubble: 10, pillar: 18, barrel: 14, crates: 10, banner: 8, tree_dead_l: 14, rock: 20 },
  },
];

export const WORLD_SIZE = 125; // 맵 반경
