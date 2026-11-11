// 아이템 정의. 상점은 일반(흰색) 기본 장비와 소모품만 판다.

export const SLOTS = ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'ring2'];
export const SLOT_NAMES = {
  weapon: '무기', offhand: '보조', helm: '투구', armor: '갑옷', gloves: '장갑',
  boots: '신발', belt: '허리띠', amulet: '목걸이', ring1: '반지', ring2: '반지', ring: '반지',
};

// 무기 계열은 셋: 검(힘) · 활(민첩) · 지팡이(지능). 계열이 곧 성장 방향이다.
export const WEAPON_CLASSES = {
  unarmed: { name: '맨손', kind: 'melee', ap: 'str', side: 'dex', range: 1.9 },
  sword: { name: '검', kind: 'melee', ap: 'str', side: 'dex', range: 2.2 },
  bow: { name: '활', kind: 'ranged', ap: 'dex', side: 'str', range: 12, two: true },
  staff: { name: '지팡이', kind: 'magic', ap: 'int', side: null, range: 10, two: true },
};

// minLvl: 이 아이템 레벨부터 드랍된다. shop: 상점 판매 여부
// model: 손에 드는 모델 · icon: 가방 그림(없으면 model) · look: 입었을 때 겉모습 · tint: 옷 색
export const BASES = {
  rusty_sword: { name: '낡은 검', slot: 'weapon', cls: 'sword', model: 'q_sword', dmg: [4, 7], speed: 1.1, price: 5, minLvl: 99 },
  short_sword: { name: '장검', slot: 'weapon', cls: 'sword', model: 'q_sword', dmg: [6, 10], speed: 1.15, price: 90, shop: true },
  broad_sword: { name: '넓은날 검', slot: 'weapon', cls: 'sword', model: 'q_sword2', dmg: [9, 14], speed: 1.1, req: { str: 16 }, minLvl: 3 },
  greatsword: { name: '대검', slot: 'weapon', cls: 'sword', model: 'q_sword_big', two: true, dmg: [13, 21], speed: 0.82, req: { str: 20 }, minLvl: 4 },
  claymore: { name: '클레이모어', slot: 'weapon', cls: 'sword', model: 'q_claymore', two: true, dmg: [17, 27], speed: 0.78, req: { str: 28 }, minLvl: 8 },
  golden_sword: { name: '금빛 검', slot: 'weapon', cls: 'sword', model: 'q_sword_gold', dmg: [14, 22], speed: 1.15, req: { str: 34 }, minLvl: 12 },
  old_bow: { name: '낡은 활', slot: 'weapon', cls: 'bow', model: 'q_bow', dmg: [4, 7], speed: 0.95, price: 5, minLvl: 99 },
  short_bow: { name: '단궁', slot: 'weapon', cls: 'bow', model: 'q_bow', dmg: [7, 11], speed: 1.0, price: 110, shop: true },
  long_bow: { name: '장궁', slot: 'weapon', cls: 'bow', model: 'q_bow2', dmg: [11, 17], speed: 0.9, req: { dex: 18 }, minLvl: 4 },
  gilded_bow: { name: '금장 활', slot: 'weapon', cls: 'bow', model: 'q_bow_gold', dmg: [15, 23], speed: 0.95, req: { dex: 26 }, minLvl: 8 },
  fiend_bow: { name: '마궁', slot: 'weapon', cls: 'bow', model: 'q_bow_evil', dmg: [20, 30], speed: 0.9, req: { dex: 36 }, minLvl: 12 },
  novice_staff: { name: '견습 지팡이', slot: 'weapon', cls: 'staff', model: 'w_wand', len: 1.2, dmg: [4, 7], speed: 0.95, price: 5, minLvl: 99, mods: { maxMp: 5 } },
  oak_staff: { name: '참나무 지팡이', slot: 'weapon', cls: 'staff', model: 'w_staff', dmg: [7, 11], speed: 0.9, price: 100, shop: true, mods: { maxMp: 10 } },
  bone_staff: { name: '뼈 지팡이', slot: 'weapon', cls: 'staff', model: 'ws_staff', dmg: [11, 17], speed: 0.88, req: { int: 18 }, minLvl: 4, mods: { maxMp: 20 } },
  sage_staff: { name: '현자의 지팡이', slot: 'weapon', cls: 'staff', model: 'w_staff', mtint: 0x8fb0ff, dmg: [16, 25], speed: 0.9, req: { int: 28 }, minLvl: 9, mods: { maxMp: 35 } },
  round_shield: { name: '원형 방패', slot: 'offhand', armor: 5, block: 0.12, model: 'q_shield', price: 80, shop: true },
  heater_shield: { name: '연 방패', slot: 'offhand', armor: 11, block: 0.18, req: { str: 22 }, model: 'q_shield2', minLvl: 5 },
  golden_shield: { name: '금장 방패', slot: 'offhand', armor: 17, block: 0.22, req: { str: 32 }, model: 'q_shield3', minLvl: 11 },
  leather_cap: { name: '가죽 두건', slot: 'helm', armor: 3, price: 40, shop: true, look: 'hood', tint: 0xb89a78 },
  iron_helm: { name: '철 투구', slot: 'helm', armor: 7, req: { str: 16 }, minLvl: 4, look: 'q_helm1', icon: 'q_helm1' },
  knight_helm: { name: '기사 투구', slot: 'helm', armor: 12, req: { str: 26 }, minLvl: 9, look: 'q_helm2', icon: 'q_helm2' },
  great_helm: { name: '뿔 투구', slot: 'helm', armor: 16, req: { str: 34 }, minLvl: 13, look: 'q_helm3', icon: 'q_helm3' },
  cloth_robe: { name: '천 로브', slot: 'armor', armor: 4, price: 60, shop: true, mods: { maxMp: 10 }, tint: 0x9aa4d8, icon: 'i_armor_leather', itint: 0x8a94d0 },
  leather_armor: { name: '가죽 갑옷', slot: 'armor', armor: 9, price: 90, shop: true, tint: 0xffffff, icon: 'i_armor_leather' },
  chain_mail: { name: '사슬 갑옷', slot: 'armor', armor: 17, req: { str: 20 }, minLvl: 4, tint: 0xb4bcc8, pauldron: true, icon: 'i_armor_metal' },
  plate_armor: { name: '판금 갑옷', slot: 'armor', armor: 28, req: { str: 30, vit: 20 }, minLvl: 10, tint: 0xd8dce6, pauldron: true, icon: 'i_armor_metal2' },
  dark_plate: { name: '흑철 갑옷', slot: 'armor', armor: 36, req: { str: 38, vit: 26 }, minLvl: 14, tint: 0x6a6478, pauldron: true, icon: 'i_armor_black' },
  leather_gloves: { name: '가죽 장갑', slot: 'gloves', armor: 2, price: 35, shop: true, icon: 'i_glove' },
  gauntlets: { name: '강철 건틀릿', slot: 'gloves', armor: 5, req: { str: 16 }, minLvl: 4, icon: 'i_glove', itint: 0xb4bcc8, tint: 0xb4bcc8 },
  leather_boots: { name: '가죽 장화', slot: 'boots', armor: 2, price: 35, shop: true },
  war_boots: { name: '전투 장화', slot: 'boots', armor: 5, req: { str: 15 }, minLvl: 4, tint: 0xb4bcc8 },
  leather_belt: { name: '가죽 허리띠', slot: 'belt', armor: 2, price: 30, shop: true },
  heavy_belt: { name: '두꺼운 허리띠', slot: 'belt', armor: 5, req: { str: 18 }, minLvl: 5, heavy: true },
  amulet: { name: '목걸이', slot: 'amulet', minLvl: 1, icon: 'i_necklace' },
  ring: { name: '반지', slot: 'ring', minLvl: 1, icon: 'i_ring' },

  hp_potion: { name: '체력 물약', type: 'potion', restore: { hp: 70 }, price: 15, shop: true, stack: true, icon: 'i_potion_hp', itint: 0xff3040 },
  mp_potion: { name: '마나 물약', type: 'potion', restore: { mp: 45 }, price: 15, shop: true, stack: true, icon: 'i_potion_mp', itint: 0x3a78ff },
  hp_potion_l: { name: '큰 체력 물약', type: 'potion', restore: { hp: 220 }, price: 50, shop: true, stack: true, icon: 'i_potion_hp_l', itint: 0xff3040 },
  mp_potion_l: { name: '큰 마나 물약', type: 'potion', restore: { mp: 140 }, price: 50, shop: true, stack: true, icon: 'i_potion_mp_l', itint: 0x3a78ff },
};
export const isTwoHandedBase = (b) => !!(b.two ?? WEAPON_CLASSES[b.cls]?.two);

export const RARITY = {
  common: { name: '일반', color: '#d8d2c4', affix: [0, 0], mult: 1, value: 1 },
  magic: { name: '마법', color: '#6c8cff', affix: [1, 2], mult: 1, value: 2.5 },
  rare: { name: '희귀', color: '#ffd84a', affix: [3, 4], mult: 1.1, value: 6 },
  hero: { name: '영웅', color: '#ff9a3c', affix: [4, 5], mult: 1.3, value: 12 },
  legend: { name: '전설', color: '#41e07a', affix: [5, 6], mult: 1.6, value: 25 },
};
export const RARITY_ORDER = ['common', 'magic', 'rare', 'hero', 'legend'];

const ARMORS = ['helm', 'armor', 'gloves', 'boots', 'belt', 'offhand'];
const JEWEL = ['amulet', 'ring'];
// slots: 붙을 수 있는 부위 (없으면 전부). max(l): 아이템 레벨 l에서의 최대값
export const AFFIXES = {
  str: { text: '힘 +{v}', min: 1, max: (l) => 2 + l * 0.5 },
  dex: { text: '민첩 +{v}', min: 1, max: (l) => 2 + l * 0.5 },
  int: { text: '지능 +{v}', min: 1, max: (l) => 2 + l * 0.5 },
  wis: { text: '정신 +{v}', min: 1, max: (l) => 2 + l * 0.5 },
  vit: { text: '체력 +{v}', min: 1, max: (l) => 2 + l * 0.5 },
  maxHp: { text: '최대 HP +{v}', min: 5, max: (l) => 12 + l * 5 },
  maxMp: { text: '최대 MP +{v}', min: 4, max: (l) => 8 + l * 3 },
  armorPct: { text: '방어력 +{v}%', min: 5, max: (l) => 15 + l, slots: ARMORS },
  dmgPct: { text: '피해 +{v}%', min: 5, max: (l) => 15 + l * 2, slots: ['weapon'] },
  spellPct: { text: '주문 피해 +{v}%', min: 5, max: (l) => 12 + l * 1.5, slots: ['weapon', 'helm', ...JEWEL] },
  atkSpd: { text: '공격 속도 +{v}%', min: 3, max: (l) => 8 + l * 0.5, slots: ['weapon', 'gloves', ...JEWEL] },
  crit: { text: '치명타 확률 +{v}%', min: 1, max: (l) => 3 + l * 0.25, slots: ['weapon', 'gloves', 'helm', ...JEWEL] },
  hpRegen: { text: '초당 HP 회복 +{v}', min: 1, max: (l) => 2 + l * 0.4, slots: ['armor', 'belt', 'helm', ...JEWEL] },
  mpRegen: { text: '초당 MP 회복 +{v}', min: 1, max: (l) => 1 + l * 0.25, slots: ['helm', 'weapon', ...JEWEL] },
  moveSpd: { text: '이동 속도 +{v}%', min: 3, max: () => 12, slots: ['boots'] },
  lifeSteal: { text: '생명력 흡수 {v}%', min: 1, max: (l) => 2 + l * 0.15, slots: ['weapon', ...JEWEL] },
  skillExp: { text: '스킬 숙련 획득 +{v}%', min: 5, max: (l) => 15 + l, slots: ['helm', ...JEWEL] },
  goldFind: { text: '골드 획득 +{v}%', min: 5, max: (l) => 20 + l * 2, slots: ['gloves', 'boots', 'belt', ...JEWEL] },
  magicFind: { text: '좋은 아이템 발견 +{v}%', min: 3, max: (l) => 10 + l, slots: ['helm', ...JEWEL] },
  allStats: { text: '모든 스탯 +{v}', min: 1, max: (l) => 1 + l * 0.25, slots: JEWEL, legendOnly: true },
};

// 이름 앞에 붙는 수식어 (가장 큰 옵션 기준)
export const AFFIX_PREFIX = {
  str: '거인의', dex: '날렵한', int: '현자의', wis: '고요한', vit: '강건한', maxHp: '생명의', maxMp: '마력의',
  armorPct: '단단한', dmgPct: '잔혹한', spellPct: '불타는', atkSpd: '재빠른', crit: '예리한', hpRegen: '재생의',
  mpRegen: '샘솟는', moveSpd: '바람의', lifeSteal: '흡혈의', skillExp: '수련자의', goldFind: '탐욕의',
  magicFind: '행운의', allStats: '고대의',
};
export const LEGEND_NAMES = ['잿빛 왕의', '망자의', '서리 군주의', '타락한 성기사의', '피의 서약', '그림자 군단의', '잊힌 신의'];

// 처음 고르는 무기 — 무기 + 주 스탯 +2 + 첫 스킬북(안내 보상)
export const STARTS = {
  sword: { base: 'rusty_sword', stat: 'str', book: 'power_strike', line: '가까이서 묵직하게' },
  bow: { base: 'old_bow', stat: 'dex', book: 'aimed_shot', line: '멀리서 정확하게' },
  staff: { base: 'novice_staff', stat: 'int', book: 'fire_bolt', line: '주문으로 태운다' },
};
export const START_BONUS = 2;
