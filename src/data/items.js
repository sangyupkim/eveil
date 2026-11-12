import { GEMS, GEM_GRADES, gemId } from './legends.js';
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
// model: 손에 드는 모델 · icon: 가방 그림(없으면 model)
// wear: 입었을 때 끼우는 KayKit 조각의 캐릭터 (knight · mage · barbarian) · hat: [캐릭터, 'Hat'|'Helmet'] · tint: 조각 색
export const BASES = {
  rusty_sword: { name: '낡은 검', slot: 'weapon', cls: 'sword', model: 'w_sword', mtint: 0x9a8a7a, dmg: [4, 7], speed: 1.1, price: 5, minLvl: 99 },
  short_sword: { name: '장검', slot: 'weapon', cls: 'sword', model: 'w_sword', dmg: [6, 10], speed: 1.15, price: 90, shop: true },
  broad_sword: { name: '넓은날 검', slot: 'weapon', cls: 'sword', model: 'w_sword', mtint: 0xc8d0e0, dmg: [9, 14], speed: 1.1, req: { str: 16 }, minLvl: 3 },
  greatsword: { name: '대검', slot: 'weapon', cls: 'sword', model: 'w_greatsword', two: true, dmg: [13, 21], speed: 0.82, req: { str: 20 }, minLvl: 4 },
  claymore: { name: '클레이모어', slot: 'weapon', cls: 'sword', model: 'w_greatsword', mtint: 0x8a7aa0, two: true, dmg: [17, 27], speed: 0.78, req: { str: 28 }, minLvl: 8 },
  golden_sword: { name: '금빛 검', slot: 'weapon', cls: 'sword', model: 'w_sword', mtint: 0xffd36a, dmg: [14, 22], speed: 1.15, req: { str: 34 }, minLvl: 12 },
  old_bow: { name: '낡은 활', slot: 'weapon', cls: 'bow', model: 'q_bow', dmg: [4, 7], speed: 0.95, price: 5, minLvl: 99 },
  short_bow: { name: '단궁', slot: 'weapon', cls: 'bow', model: 'q_bow', dmg: [7, 11], speed: 1.0, price: 110, shop: true },
  long_bow: { name: '장궁', slot: 'weapon', cls: 'bow', model: 'q_bow2', dmg: [11, 17], speed: 0.9, req: { dex: 18 }, minLvl: 4 },
  gilded_bow: { name: '금장 활', slot: 'weapon', cls: 'bow', model: 'q_bow_gold', dmg: [15, 23], speed: 0.95, req: { dex: 26 }, minLvl: 8 },
  fiend_bow: { name: '마궁', slot: 'weapon', cls: 'bow', model: 'q_bow_evil', dmg: [20, 30], speed: 0.9, req: { dex: 36 }, minLvl: 12 },
  novice_staff: { name: '견습 지팡이', slot: 'weapon', cls: 'staff', model: 'w_wand', dmg: [4, 7], speed: 0.95, price: 5, minLvl: 99, mods: { maxMp: 5 } },
  oak_staff: { name: '참나무 지팡이', slot: 'weapon', cls: 'staff', model: 'w_staff', dmg: [7, 11], speed: 0.9, price: 100, shop: true, mods: { maxMp: 10 } },
  bone_staff: { name: '뼈 지팡이', slot: 'weapon', cls: 'staff', model: 'ws_staff', dmg: [11, 17], speed: 0.88, req: { int: 18 }, minLvl: 4, mods: { maxMp: 20 } },
  sage_staff: { name: '현자의 지팡이', slot: 'weapon', cls: 'staff', model: 'w_staff', mtint: 0x8fb0ff, dmg: [16, 25], speed: 0.9, req: { int: 28 }, minLvl: 9, mods: { maxMp: 35 } },
  round_shield: { name: '원형 방패', slot: 'offhand', armor: 5, block: 0.12, model: 'w_shield', price: 80, shop: true },
  heater_shield: { name: '연 방패', slot: 'offhand', armor: 11, block: 0.18, req: { str: 22 }, model: 'w_shield_sq', minLvl: 5 },
  golden_shield: { name: '금장 방패', slot: 'offhand', armor: 17, block: 0.22, req: { str: 32 }, model: 'w_shield_sq', mtint: 0xffd36a, minLvl: 11 },
  leather_cap: { name: '가죽 모자', slot: 'helm', armor: 3, price: 40, shop: true, hat: ['barbarian', 'Hat'] },
  wizard_hat: { name: '마법사 모자', slot: 'helm', armor: 2, price: 60, shop: true, mods: { maxMp: 8 }, hat: ['mage', 'Hat'] },
  iron_helm: { name: '철 투구', slot: 'helm', armor: 7, req: { str: 16 }, minLvl: 4, hat: ['knight', 'Helmet'], tint: 0x8a8a96 },
  sage_hat: { name: '현자의 모자', slot: 'helm', armor: 6, req: { int: 20 }, minLvl: 6, mods: { maxMp: 25 }, hat: ['mage', 'Hat'], tint: 0x7a9aff },
  knight_helm: { name: '기사 투구', slot: 'helm', armor: 12, req: { str: 26 }, minLvl: 9, hat: ['knight', 'Helmet'] },
  great_helm: { name: '금장 투구', slot: 'helm', armor: 16, req: { str: 34 }, minLvl: 13, hat: ['knight', 'Helmet'], tint: 0xffd36a },
  cloth_robe: { name: '천 로브', slot: 'armor', armor: 4, price: 60, shop: true, mods: { maxMp: 10 }, wear: 'mage' },
  leather_armor: { name: '가죽 갑옷', slot: 'armor', armor: 9, price: 90, shop: true, wear: 'barbarian' },
  chain_mail: { name: '사슬 갑옷', slot: 'armor', armor: 17, req: { str: 20 }, minLvl: 4, wear: 'knight', tint: 0xa8acb8 },
  plate_armor: { name: '판금 갑옷', slot: 'armor', armor: 28, req: { str: 30, vit: 20 }, minLvl: 10, wear: 'knight', cape: true },
  arcane_robe: { name: '비전 로브', slot: 'armor', armor: 14, req: { int: 26 }, minLvl: 9, mods: { maxMp: 40 }, wear: 'mage', tint: 0x8aa0ff, cape: true },
  dark_plate: { name: '흑철 갑옷', slot: 'armor', armor: 36, req: { str: 38, vit: 26 }, minLvl: 14, wear: 'knight', tint: 0x5a5868, cape: true },
  leather_gloves: { name: '가죽 장갑', slot: 'gloves', armor: 2, price: 35, shop: true, wear: 'barbarian' },
  gauntlets: { name: '강철 건틀릿', slot: 'gloves', armor: 5, req: { str: 16 }, minLvl: 4, wear: 'knight' },
  leather_boots: { name: '가죽 장화', slot: 'boots', armor: 2, price: 35, shop: true, wear: 'barbarian' },
  war_boots: { name: '전투 장화', slot: 'boots', armor: 5, req: { str: 15 }, minLvl: 4, wear: 'knight' },
  leather_belt: { name: '가죽 허리띠', slot: 'belt', armor: 2, price: 30, shop: true },
  heavy_belt: { name: '두꺼운 허리띠', slot: 'belt', armor: 5, req: { str: 18 }, minLvl: 5, heavy: true },
  amulet: { name: '목걸이', slot: 'amulet', minLvl: 1, icon: 'i_necklace' },
  ring: { name: '반지', slot: 'ring', minLvl: 1, icon: 'i_ring' },

  // ───── 높은 단계 (새 지역) ─────
  war_axe: { name: '전투 도끼', slot: 'weapon', cls: 'sword', model: 'w_axe', dmg: [12, 18], speed: 1.0, req: { str: 22 }, minLvl: 6 },
  great_axe: { name: '대도끼', slot: 'weapon', cls: 'sword', model: 'w_greataxe', two: true, dmg: [22, 34], speed: 0.75, req: { str: 30 }, minLvl: 10 },
  frost_blade: { name: '서리검', slot: 'weapon', cls: 'sword', model: 'w_sword', mtint: 0xa8d8ff, dmg: [22, 32], speed: 1.15, req: { str: 42 }, minLvl: 20 },
  rune_blade: { name: '룬 대검', slot: 'weapon', cls: 'sword', model: 'w_greatsword', mtint: 0xb08aff, two: true, dmg: [38, 56], speed: 0.8, req: { str: 48 }, minLvl: 24 },
  dragon_cleaver: { name: '용살 도끼', slot: 'weapon', cls: 'sword', model: 'w_greataxe', mtint: 0xff6a4a, two: true, dmg: [48, 72], speed: 0.75, req: { str: 58 }, minLvl: 32 },
  inferno_sword: { name: '화염검', slot: 'weapon', cls: 'sword', model: 'w_sword', mtint: 0xff9a50, dmg: [42, 60], speed: 1.15, req: { str: 62 }, minLvl: 36 },
  hunter_bow: { name: '사냥꾼 활', slot: 'weapon', cls: 'bow', model: 'q_bow2', mtint: 0x8ad08a, dmg: [18, 27], speed: 1.0, req: { dex: 32 }, minLvl: 14 },
  frost_bow: { name: '서리 활', slot: 'weapon', cls: 'bow', model: 'q_bow', mtint: 0xa8d8ff, dmg: [25, 37], speed: 1.0, req: { dex: 42 }, minLvl: 20 },
  wind_bow: { name: '바람 활', slot: 'weapon', cls: 'bow', model: 'q_bow_gold', mtint: 0x8ad08a, dmg: [31, 47], speed: 1.05, req: { dex: 52 }, minLvl: 28 },
  dragon_bow: { name: '용뼈 활', slot: 'weapon', cls: 'bow', model: 'q_bow_evil', mtint: 0xff6a4a, dmg: [40, 60], speed: 1.0, req: { dex: 62 }, minLvl: 36 },
  ember_staff: { name: '잿불 지팡이', slot: 'weapon', cls: 'staff', model: 'w_staff', mtint: 0xff9a50, dmg: [20, 30], speed: 0.9, req: { int: 34 }, minLvl: 14, mods: { maxMp: 45 } },
  frost_staff: { name: '서리 지팡이', slot: 'weapon', cls: 'staff', model: 'ws_staff', mtint: 0xa8d8ff, dmg: [26, 38], speed: 0.9, req: { int: 42 }, minLvl: 20, mods: { maxMp: 60 } },
  storm_staff: { name: '폭풍 지팡이', slot: 'weapon', cls: 'staff', model: 'w_staff', mtint: 0xb08aff, dmg: [32, 48], speed: 0.9, req: { int: 52 }, minLvl: 28, mods: { maxMp: 80 } },
  archmage_staff: { name: '대마법사 지팡이', slot: 'weapon', cls: 'staff', model: 'w_staff', mtint: 0xffd36a, dmg: [40, 60], speed: 0.95, req: { int: 62 }, minLvl: 36, mods: { maxMp: 100 } },
  tower_shield: { name: '탑 방패', slot: 'offhand', armor: 26, block: 0.24, req: { str: 44 }, model: 'w_shield_sq', mtint: 0x5a5868, minLvl: 20 },
  dragon_shield: { name: '용비늘 방패', slot: 'offhand', armor: 36, block: 0.27, req: { str: 56 }, model: 'w_shield', mtint: 0xff6a4a, minLvl: 32 },
  hard_leather: { name: '단단한 가죽 갑옷', slot: 'armor', armor: 13, minLvl: 6, wear: 'barbarian', tint: 0x8a7060 },
  scout_armor: { name: '정찰병 갑옷', slot: 'armor', armor: 22, req: { dex: 30 }, minLvl: 16, wear: 'barbarian', tint: 0x8ad08a },
  frost_robe: { name: '서리 로브', slot: 'armor', armor: 20, req: { int: 40 }, minLvl: 20, mods: { maxMp: 60 }, wear: 'mage', tint: 0xa8d8ff, cape: true },
  frost_plate: { name: '서리 판금', slot: 'armor', armor: 46, req: { str: 46, vit: 30 }, minLvl: 22, wear: 'knight', tint: 0xa8d8ff, cape: true },
  shadow_leather: { name: '그림자 가죽', slot: 'armor', armor: 34, req: { dex: 48 }, minLvl: 28, wear: 'barbarian', tint: 0x6a5a8a, cape: true },
  inferno_robe: { name: '화염 로브', slot: 'armor', armor: 30, req: { int: 56 }, minLvl: 32, mods: { maxMp: 90 }, wear: 'mage', tint: 0xff6a4a, cape: true },
  dragon_plate: { name: '용비늘 판금', slot: 'armor', armor: 60, req: { str: 58, vit: 40 }, minLvl: 34, wear: 'knight', tint: 0xff6a4a, cape: true },
  hunter_cap: { name: '사냥꾼 모자', slot: 'helm', armor: 9, req: { dex: 28 }, minLvl: 14, hat: ['barbarian', 'Hat'], tint: 0x8ad08a },
  frost_helm: { name: '서리 투구', slot: 'helm', armor: 22, req: { str: 44 }, minLvl: 22, hat: ['knight', 'Helmet'], tint: 0xa8d8ff },
  archmage_hat: { name: '대마법사 모자', slot: 'helm', armor: 14, req: { int: 50 }, minLvl: 30, mods: { maxMp: 50 }, hat: ['mage', 'Hat'], tint: 0xffd36a },
  dragon_helm: { name: '용비늘 투구', slot: 'helm', armor: 30, req: { str: 56 }, minLvl: 34, hat: ['knight', 'Helmet'], tint: 0xff6a4a },
  hunter_gloves: { name: '사냥꾼 장갑', slot: 'gloves', armor: 8, req: { dex: 28 }, minLvl: 14, wear: 'barbarian', tint: 0x8ad08a },
  frost_gauntlets: { name: '서리 건틀릿', slot: 'gloves', armor: 12, req: { str: 40 }, minLvl: 22, wear: 'knight', tint: 0xa8d8ff },
  dragon_gauntlets: { name: '용비늘 건틀릿', slot: 'gloves', armor: 18, req: { str: 54 }, minLvl: 34, wear: 'knight', tint: 0xff6a4a },
  hunter_boots: { name: '사냥꾼 장화', slot: 'boots', armor: 8, req: { dex: 28 }, minLvl: 14, wear: 'barbarian', tint: 0x8ad08a },
  frost_boots: { name: '서리 장화', slot: 'boots', armor: 12, req: { str: 40 }, minLvl: 22, wear: 'knight', tint: 0xa8d8ff },
  dragon_boots: { name: '용비늘 장화', slot: 'boots', armor: 18, req: { str: 54 }, minLvl: 34, wear: 'knight', tint: 0xff6a4a },
  warden_belt: { name: '파수꾼 허리띠', slot: 'belt', armor: 9, minLvl: 14 },
  dragon_belt: { name: '용가죽 허리띠', slot: 'belt', armor: 14, minLvl: 28, heavy: true },
  amulet2: { name: '고대 목걸이', slot: 'amulet', minLvl: 20, icon: 'i_necklace', mtint: 0xffd36a },
  ring2: { name: '룬 반지', slot: 'ring', minLvl: 20, icon: 'i_ring2', mtint: 0xb08aff },

  // ───── 장비 늘리기 (방어구 · 장신구) ─────
  cloth_wraps: { name: '천 손싸개', slot: 'gloves', armor: 1, minLvl: 1, mods: { maxMp: 6 } },
  chain_gloves: { name: '사슬 장갑', slot: 'gloves', armor: 4, req: { str: 14 }, minLvl: 7 },
  mage_sleeves: { name: '마법사 소매', slot: 'gloves', armor: 5, req: { int: 30 }, minLvl: 16, mods: { maxMp: 20 } },
  shadow_gloves: { name: '그림자 장갑', slot: 'gloves', armor: 12, req: { dex: 46 }, minLvl: 28 },
  ember_sleeves: { name: '불꽃 소매', slot: 'gloves', armor: 10, req: { int: 54 }, minLvl: 32, mods: { maxMp: 40 } },
  cloth_shoes: { name: '천 신', slot: 'boots', armor: 1, minLvl: 1, mods: { maxMp: 6 } },
  chain_boots: { name: '사슬 장화', slot: 'boots', armor: 4, req: { str: 14 }, minLvl: 7 },
  mage_boots: { name: '마법사 신', slot: 'boots', armor: 5, req: { int: 30 }, minLvl: 16, mods: { maxMp: 20 } },
  shadow_boots: { name: '그림자 장화', slot: 'boots', armor: 12, req: { dex: 46 }, minLvl: 28 },
  ember_boots: { name: '불꽃 신', slot: 'boots', armor: 10, req: { int: 54 }, minLvl: 32, mods: { maxMp: 40 } },
  cloth_sash: { name: '천 띠', slot: 'belt', armor: 1, minLvl: 1, mods: { maxMp: 6 } },
  chain_belt: { name: '사슬 허리띠', slot: 'belt', armor: 6, req: { str: 16 }, minLvl: 9 },
  rune_sash: { name: '룬 띠', slot: 'belt', armor: 7, req: { int: 36 }, minLvl: 20, mods: { maxMp: 30 } },
  leather_hood: { name: '가죽 두건', slot: 'helm', armor: 5, req: { dex: 16 }, minLvl: 5 },
  chain_coif: { name: '사슬 두건', slot: 'helm', armor: 9, req: { str: 18 }, minLvl: 8 },
  plate_helm: { name: '판금 투구', slot: 'helm', armor: 18, req: { str: 36 }, minLvl: 18 },
  shadow_hood: { name: '그림자 두건', slot: 'helm', armor: 16, req: { dex: 46 }, minLvl: 28 },
  ember_hood: { name: '불꽃 두건', slot: 'helm', armor: 12, req: { int: 54 }, minLvl: 32, mods: { maxMp: 45 } },
  bone_amulet: { name: '뼈 목걸이', slot: 'amulet', minLvl: 8 },
  jade_amulet: { name: '비취 목걸이', slot: 'amulet', minLvl: 14 },
  sun_amulet: { name: '태양 목걸이', slot: 'amulet', minLvl: 28 },
  star_amulet: { name: '별 목걸이', slot: 'amulet', minLvl: 36 },
  copper_ring: { name: '구리 반지', slot: 'ring', minLvl: 1 },
  silver_ring: { name: '은 반지', slot: 'ring', minLvl: 8 },
  jade_ring: { name: '비취 반지', slot: 'ring', minLvl: 14 },
  sapphire_ring: { name: '청옥 반지', slot: 'ring', minLvl: 22 },
  ruby_ring: { name: '홍옥 반지', slot: 'ring', minLvl: 30 },
  ...Object.fromEntries(Object.entries(GEMS).flatMap(([g, x]) => GEM_GRADES.map((gr, k) => [gemId(g, k), { name: `${gr.pre ? gr.pre + ' ' : ''}${x.name}`, type: 'gem', gem: g, grade: k, stack: true, price: 250 * (k + 1) ** 2, shop: k === 0 }]))),
  dungeon_key: { name: '던전 열쇠', type: 'key', price: 1500, stack: true, shop: true },
  pet_egg: { name: '강아지 (펫)', type: 'pet', pet: 'pet_dog', price: 3000, stack: true, shop: true },
  pet_cat: { name: '고양이 (펫)', type: 'pet', pet: 'pet_cat', price: 3000, stack: true, shop: true },
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
export const LEGEND_NAMES = ['잠든 왕의', '망자의', '서리 군주의', '타락한 성기사의', '피의 서약', '그림자 군단의', '잊힌 신의'];

// 처음 고르는 무기 — 무기 + 주 스탯 +2 + 첫 스킬북(안내 보상)
export const STARTS = {
  sword: { base: 'rusty_sword', stat: 'str', book: 'power_strike', line: '가까이서 묵직하게' },
  bow: { base: 'old_bow', stat: 'dex', book: 'aimed_shot', line: '멀리서 정확하게' },
  staff: { base: 'novice_staff', stat: 'int', book: 'fire_bolt', line: '주문으로 태운다' },
};
export const START_BONUS = 2;
