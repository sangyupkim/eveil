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
  // v0.37 딜탱 둘: 한손 무기 + 보조 (방패 · 보주)
  mace: { name: '둔기', kind: 'melee', ap: 'vit', side: 'str', range: 2.0 },        // 맞으면서 버티는 탱커 — 체력으로 피해
  scepter: { name: '홀', kind: 'magic', ap: 'wis', side: 'int', range: 6.5 },       // 마나로 버티고 마나로 때리는 딜탱 — 정신으로 피해
  dagger: { name: '단검', kind: 'melee', ap: 'dex', side: 'str', range: 1.9 },      // v0.44.37 민첩 한손 근접 (보조 칸과 함께)
  // v0.49.38 한손 + 보조 ↔ 양손: 지능 한손 완드 · 정신 양손 대홀 · 체력 양손 대방패
  wand: { name: '완드', kind: 'magic', ap: 'int', side: 'wis', range: 9 },                       // 빠른 단일 대상, 마도서 · 보주와 함께
  gscepter: { name: '대홀', kind: 'magic', ap: 'wis', side: 'int', range: 7, two: true },       // 대량의 마나
  tshield: { name: '대방패', kind: 'melee', ap: 'vit', side: 'str', range: 2.0, two: true },    // 방어력 · 막기를 크게
};

// minLvl: 이 아이템 레벨부터 드랍된다. shop: 상점 판매 여부
// model: 손에 드는 모델 · icon: 가방 그림(없으면 model)
// wear: 입었을 때 끼우는 KayKit 조각의 캐릭터 (knight · mage · barbarian) · hat: [캐릭터, 'Hat'|'Helmet'] · tint: 조각 색
export const BASES = {
  ore: { name: '강화석', type: 'mat', price: 0, stack: true, icon: 71 },
  // v0.42 높은 강화석 (제작소에서 만든다) · 정수 (레벨 100 · 200 · 300 · 400 넘는 몬스터가 떨어뜨리는 2 ~ 5단계 재료)
  ore2: { name: '상급 강화석', type: 'mat', price: 0, stack: true, icon: 71 }, ore3: { name: '최상급 강화석', type: 'mat', price: 0, stack: true, icon: 71 },
  ess2: { name: '빛바랜 정수', type: 'mat', price: 0, stack: true, icon: 42, grade: 2 }, ess3: { name: '응축된 정수', type: 'mat', price: 0, stack: true, icon: 42, grade: 3 },
  ess4: { name: '심연의 정수', type: 'mat', price: 0, stack: true, icon: 42, grade: 4 }, ess5: { name: '혼돈의 정수', type: 'mat', price: 0, stack: true, icon: 42, grade: 5 }, // 가방 · 창고 어디에 있든 강화 · 건물에 쓴다
  shard: { name: '능력치 파편', type: 'shard', price: 120 },
  rusty_sword: { name: '낡은 검', slot: 'weapon', cls: 'sword', model: 'w_sword', mtint: 0x9a8a7a, dmg: [4, 7], speed: 1.1, price: 5, minLvl: 1, noDrop: true },
  short_sword: { name: '장검', slot: 'weapon', cls: 'sword', model: 'w_sword', dmg: [6, 10], speed: 1.15, price: 90, shop: true },
  broad_sword: { name: '넓은날 검', slot: 'weapon', cls: 'sword', model: 'w_sword', mtint: 0xc8d0e0, dmg: [9, 14], speed: 1.1, req: { str: 16 }, minLvl: 3 },
  greatsword: { name: '대검', slot: 'weapon', cls: 'sword', model: 'w_greatsword', two: true, dmg: [13, 21], speed: 0.82, req: { str: 20 }, minLvl: 4 },
  claymore: { name: '클레이모어', slot: 'weapon', cls: 'sword', model: 'w_greatsword', mtint: 0x8a7aa0, two: true, dmg: [17, 27], speed: 0.78, req: { str: 28 }, minLvl: 8 },
  // ── v0.44.37 단검 (민첩 · 한손, 빠르다) ──
  worn_dagger: { name: '낡은 단검', slot: 'weapon', cls: 'dagger', model: 'w_sword', dmg: [3, 6], speed: 1.35, price: 5, minLvl: 1, noDrop: true },
  dagger: { name: '단검', slot: 'weapon', cls: 'dagger', model: 'w_sword', dmg: [5, 8], speed: 1.4, price: 90, shop: true },
  stiletto: { name: '스틸레토', slot: 'weapon', cls: 'dagger', model: 'w_sword', dmg: [7, 11], speed: 1.4, req: { dex: 16 }, minLvl: 3 },
  kris: { name: '크리스', slot: 'weapon', cls: 'dagger', model: 'w_sword', dmg: [10, 15], speed: 1.4, req: { dex: 24 }, minLvl: 7 },
  shadow_dagger: { name: '그림자 단검', slot: 'weapon', cls: 'dagger', model: 'w_sword', dmg: [12, 19], speed: 1.45, req: { dex: 34 }, minLvl: 12 },
  frost_dagger: { name: '서리 단검', slot: 'weapon', cls: 'dagger', model: 'w_sword', dmg: [19, 27], speed: 1.45, req: { dex: 42 }, minLvl: 20 },
  void_fang: { name: '공허의 송곳니', slot: 'weapon', cls: 'dagger', model: 'w_sword', dmg: [26, 38], speed: 1.45, req: { dex: 52 }, minLvl: 28 },
  dragon_fang: { name: '용의 송곳니', slot: 'weapon', cls: 'dagger', model: 'w_sword', dmg: [36, 51], speed: 1.45, req: { dex: 62 }, minLvl: 36 },
  golden_sword: { name: '금빛 검', slot: 'weapon', cls: 'sword', model: 'w_sword', mtint: 0xffd36a, dmg: [14, 22], speed: 1.15, req: { str: 34 }, minLvl: 12 },
  old_bow: { name: '낡은 활', slot: 'weapon', cls: 'bow', model: 'q_bow', dmg: [4, 7], speed: 0.95, price: 5, minLvl: 1, noDrop: true },
  short_bow: { name: '단궁', slot: 'weapon', cls: 'bow', model: 'q_bow', dmg: [7, 11], speed: 1.0, price: 110, shop: true },
  long_bow: { name: '장궁', slot: 'weapon', cls: 'bow', model: 'q_bow2', dmg: [11, 17], speed: 0.9, req: { dex: 18 }, minLvl: 4 },
  gilded_bow: { name: '금장 활', slot: 'weapon', cls: 'bow', model: 'q_bow_gold', dmg: [15, 23], speed: 0.95, req: { dex: 26 }, minLvl: 8 },
  fiend_bow: { name: '마궁', slot: 'weapon', cls: 'bow', model: 'q_bow_evil', dmg: [20, 30], speed: 0.9, req: { dex: 36 }, minLvl: 12 },
  novice_staff: { name: '견습 지팡이', slot: 'weapon', cls: 'staff', model: 'w_wand', dmg: [4, 7], speed: 0.95, price: 5, minLvl: 1, noDrop: true, mods: { maxMp: 5 } },
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
  ...Object.fromEntries(Object.entries(GEMS).flatMap(([g, x]) => GEM_GRADES.map((gr, k) => [gemId(g, k), { name: `${gr.pre ? gr.pre + ' ' : ''}${x.name}`, type: 'gem', gem: g, grade: k, stack: true, price: 250 * (k + 1) ** 2, shop: false }]))),
  dungeon_key: { name: '던전 열쇠', type: 'key', price: 1500, stack: true },
  odd_map: { name: '알 수 없는 지도 조각', type: 'mat', price: 0, stack: true, icon: 2300 }, // v0.46 연구소에서 분석 → 미지의 땅 조각 · 소문
  map_piece: { name: '미지의 땅 조각', type: 'mat', price: 0, stack: true, icon: 2322 }, // v0.44.47 미지의 땅
  unknown_gate: { name: '열린 미지의 길', type: 'map', price: 0, icon: 2339 }, // v0.44.50 24시간 안 다시 들어가기 (it.zi · it.until)
  unknown_map: { name: '미지의 지도', type: 'map', price: 0, stack: true, icon: 2328 },
  myth_mark: { name: '신화의 흔적', type: 'mat', price: 0, stack: true, icon: 1011 },
  // v0.50 왕좌 원정: 원정 문장 · 문장 상점 물건 (data/raid.js RAID_SHOP)
  raid_emblem: { name: '원정 문장', type: 'raid', price: 0, stack: true, icon: 2081 },
  whetstone: { name: '왕좌의 숫돌', type: 'raid', price: 0, stack: true, icon: 2041, text: '초월 강화(+21~) 한 번 성공 확률 +5%' },
  t_reroll: { name: '옵션 다시 굴림권', type: 'raid', price: 0, stack: true, icon: 2034, text: '장비 옵션 한 줄을 다시 굴립니다' },
  t_socket: { name: '구멍 뚫기권', type: 'raid', price: 0, stack: true, icon: 2101, text: '장비에 보석 구멍 하나 (최대 3)' },
  t_engx: { name: '각인 추출권', type: 'raid', price: 0, stack: true, icon: 2084, text: '신화 장비의 각인을 각인석으로 뗍니다' },
  t_shardx: { name: '장비 파편 추출권', type: 'raid', price: 0, stack: true, icon: 2095, text: '장비의 옵션 한 줄을 파편으로 뽑습니다 (장비는 사라짐)' },
  t_engrave: { name: '군주의 각인', type: 'raid', price: 0, stack: true, icon: 2086, text: '신화 장비에 원정 군주의 각인을 새깁니다' },
  eng_stone: { name: '각인석', type: 'raid', price: 0, icon: 2085, text: '신화 장비에 새길 수 있는 각인' },
  box_gear: { name: '군주의 장비 상자', type: 'raid', price: 0, icon: 2042, text: '내 무기 · 갈래에 맞는 장비 (신화 · 전설 · 영웅)' },
  box_shard: { name: '군주의 파편 상자', type: 'raid', price: 0, icon: 2014, text: '좋은 능력치 파편 3 ~ 5개' },
  t_inherit: { name: '계승권', type: 'raid', price: 0, stack: true, icon: 2035, text: '대장간 강화 계승에 하나 (강화 단계 50 ~ 80%를 넘김)' },
  t_inherit2: { name: '계승 축복석', type: 'raid', price: 0, stack: true, icon: 2036, text: '계승권과 함께 쓰면 80 ~ 95%를 넘김' },
  // v0.49.92 신화의 흔적으로 만드는 권 (제작소 「흔적 교환」 · 대장간 「손질」)
  t_qpolish: { name: '품질 다듬기권', type: 'raid', price: 0, stack: true, icon: 2076, text: '장비의 기본 피해 · 방어 품질을 다시 굴립니다 (낮게 나오면 그대로)' },
  t_mythroll: { name: '신화 옵션 다시 굴림권', type: 'raid', price: 0, stack: true, icon: 2124, text: '신화 전용 옵션 한 줄을 다시 굴립니다' },
  t_greatslot: { name: '탁월 칸 확장권', type: 'raid', price: 0, stack: true, icon: 2080, text: '장비의 탁월 칸을 늘립니다 (최대 5)' },
  t_book: { name: '상급 스킬북 고르기권', type: 'raid', price: 0, stack: true, icon: 2087, text: '지금 차수의 상품 스킬북 하나를 고릅니다' }, // v0.42.10 강화 · 극한 돌파마다 1개, 100개로 신화 장비
  dungeon_key2: { name: '강화 던전 열쇠', type: 'key', price: 6000, stack: true }, dungeon_key3: { name: '극한 던전 열쇠', type: 'key', price: 20000, stack: true }, // v0.42 제작소에서 // 상점에서 팔지 않는다: 오늘의 의뢰 · 보스에게서만
  pet_egg: { name: '강아지', type: 'pet', pet: 'pet_dog', price: 3000, stack: true, shop: true },
  pet_cat: { name: '고양이', type: 'pet', pet: 'pet_cat', price: 3000, stack: true, shop: true },
  hp_potion: { name: '체력 물약', type: 'potion', restore: { hp: 70 }, price: 15, shop: true, stack: true, icon: 'i_potion_hp', itint: 0xff3040 },
  mp_potion: { name: '마나 물약', type: 'potion', restore: { mp: 45 }, price: 15, shop: true, stack: true, icon: 'i_potion_mp', itint: 0x3a78ff },
  hp_potion_l: { name: '큰 체력 물약', type: 'potion', restore: { hp: 220 }, price: 50, shop: true, stack: true, icon: 'i_potion_hp_l', itint: 0xff3040 },
  mp_potion_l: { name: '큰 마나 물약', type: 'potion', restore: { mp: 140 }, price: 50, shop: true, stack: true, icon: 'i_potion_mp_l', itint: 0x3a78ff },
  // v0.44.30 제작소 높은 물약 (5 · 7 · 9 · 10단계)
  hp_potion_2: { name: '진한 체력 물약', type: 'potion', restore: { hp: 500 }, price: 120, stack: true, icon: 'i_potion_hp_l', itint: 0xff3040 },
  mp_potion_2: { name: '진한 마나 물약', type: 'potion', restore: { mp: 300 }, price: 120, stack: true, icon: 'i_potion_mp_l', itint: 0x3a78ff },
  hp_potion_3: { name: '고급 체력 물약', type: 'potion', restore: { hp: 1200 }, price: 300, stack: true, icon: 'i_potion_hp_l', itint: 0xff3040 },
  mp_potion_3: { name: '고급 마나 물약', type: 'potion', restore: { mp: 700 }, price: 300, stack: true, icon: 'i_potion_mp_l', itint: 0x3a78ff },
  hp_potion_4: { name: '최상급 체력 물약', type: 'potion', restore: { hp: 2800 }, price: 700, stack: true, icon: 'i_potion_hp_l', itint: 0xff3040 },
  mp_potion_4: { name: '최상급 마나 물약', type: 'potion', restore: { mp: 1500 }, price: 700, stack: true, icon: 'i_potion_mp_l', itint: 0x3a78ff },
  hp_potion_5: { name: '세계수 체력 물약', type: 'potion', restore: { hp: 6000 }, price: 1500, stack: true, icon: 'i_potion_hp_l', itint: 0xff3040 },
  mp_potion_5: { name: '세계수 마나 물약', type: 'potion', restore: { mp: 3000 }, price: 1500, stack: true, icon: 'i_potion_mp_l', itint: 0x3a78ff },
  // v0.49.73 제작소 11 ~ 15단계 물약 (높은 약초 · 만년 약초)
  hp_potion_6: { name: '만년 체력 물약', type: 'potion', restore: { hp: 12000 }, price: 3000, stack: true, icon: 'i_potion_hp_l', itint: 0xff3040 },
  mp_potion_6: { name: '만년 마나 물약', type: 'potion', restore: { mp: 6000 }, price: 3000, stack: true, icon: 'i_potion_mp_l', itint: 0x3a78ff },
  hp_potion_7: { name: '천년 체력 물약', type: 'potion', restore: { hp: 20000 }, price: 5000, stack: true, icon: 'i_potion_hp_l', itint: 0xff3040 },
  mp_potion_7: { name: '천년 마나 물약', type: 'potion', restore: { mp: 10000 }, price: 5000, stack: true, icon: 'i_potion_mp_l', itint: 0x3a78ff },
  hp_potion_8: { name: '영겁의 체력 물약', type: 'potion', restore: { hp: 30000 }, price: 8000, stack: true, icon: 'i_potion_hp_l', itint: 0xff3040 },
  mp_potion_8: { name: '영겁의 마나 물약', type: 'potion', restore: { mp: 15000 }, price: 8000, stack: true, icon: 'i_potion_mp_l', itint: 0x3a78ff },
  hp_potion_9: { name: '태초의 체력 물약', type: 'potion', restore: { hp: 44000 }, price: 12000, stack: true, icon: 'i_potion_hp_l', itint: 0xff3040 },
  mp_potion_9: { name: '태초의 마나 물약', type: 'potion', restore: { mp: 22000 }, price: 12000, stack: true, icon: 'i_potion_mp_l', itint: 0x3a78ff },
  hp_potion_10: { name: '창세의 체력 물약', type: 'potion', restore: { hp: 60000 }, price: 18000, stack: true, icon: 'i_potion_hp_l', itint: 0xff3040 },
  mp_potion_10: { name: '창세의 마나 물약', type: 'potion', restore: { mp: 30000 }, price: 18000, stack: true, icon: 'i_potion_mp_l', itint: 0x3a78ff },
  // v0.49.73 농축 주문서 (1시간, 효과 70%) · 용병 식량 · 공사 촉진제 · 정련 숫돌 · 보호 주문서
  el_c_might: { name: '농축 분노 주문서', type: 'elixir', price: 300, stack: true },
  el_c_haste: { name: '농축 신속 주문서', type: 'elixir', price: 300, stack: true },
  el_c_focus: { name: '농축 매의 눈 주문서', type: 'elixir', price: 300, stack: true },
  el_c_armor: { name: '농축 강철 피부 주문서', type: 'elixir', price: 300, stack: true },
  el_c_swift: { name: '농축 바람걸음 주문서', type: 'elixir', price: 300, stack: true },
  el_c_luck: { name: '농축 행운 주문서', type: 'elixir', price: 300, stack: true },
  ration: { name: '용병 식량', type: 'food', price: 30, stack: true, text: '파견 때 챙기면 체력 소모 -40% · 사망 -25% (용병마다 짧은 사냥 1 ~ 깊은 원정 10개)' },
  build_rush: { name: '공사 촉진제', type: 'tool', price: 500, stack: true, text: '공사 중인 건물의 남은 시간 절반' },
  whet2: { name: '정련 숫돌', type: 'tool', price: 500, stack: true, text: '+11 ~ +20 강화 한 번 성공 확률 +3%' },
  ward_scroll: { name: '보호 주문서', type: 'tool', price: 500, stack: true, text: '초월 강화(+21~) 실패 때 장인의 기운이 두 배로 쌓임' },

  // 영약: 제작소에서 약초로만 만든다 (상점 판매 없음)
  el_str: { name: '힘의 주문서', type: 'elixir', price: 80, stack: true },
  el_armor2: { name: '금강 주문서', type: 'elixir', price: 400, stack: true },
  el_might2: { name: '광폭의 주문서', type: 'elixir', price: 400, stack: true },
  el_swift2: { name: '질풍걸음 주문서', type: 'elixir', price: 600, stack: true },
  el_haste2: { name: '폭풍 주문서', type: 'elixir', price: 900, stack: true },
  el_focus2: { name: '독수리 눈 주문서', type: 'elixir', price: 900, stack: true },
  el_luck2: { name: '대행운의 주문서', type: 'elixir', price: 1500, stack: true },
  el_dex: { name: '민첩의 주문서', type: 'elixir', price: 80, stack: true },
  el_int: { name: '지능의 주문서', type: 'elixir', price: 80, stack: true },
  el_wis: { name: '정신의 주문서', type: 'elixir', price: 80, stack: true },
  el_vit: { name: '체력의 주문서', type: 'elixir', price: 80, stack: true },
  el_armor: { name: '강철 피부 주문서', type: 'elixir', price: 80, stack: true },
  el_might: { name: '분노의 주문서', type: 'elixir', price: 80, stack: true },
  el_haste: { name: '신속의 주문서', type: 'elixir', price: 80, stack: true },
  el_swift: { name: '바람걸음 주문서', type: 'elixir', price: 80, stack: true },
  el_focus: { name: '매의 눈 주문서', type: 'elixir', price: 80, stack: true },
  el_luck: { name: '행운의 주문서', type: 'elixir', price: 80, stack: true },
  // ── v0.37 둔기 · 도끼 (체력, 한손 — 방패와 함께) ──
  rusty_club: { name: '낡은 몽둥이', slot: 'weapon', cls: 'mace', model: 'w_axe', dmg: [4, 7], speed: 1.0, price: 5, minLvl: 1, noDrop: true, mods: { maxHp: 10 } },
  oak_club: { name: '참나무 곤봉', slot: 'weapon', cls: 'mace', model: 'w_axe', dmg: [6, 10], speed: 1.0, price: 90, shop: true, mods: { maxHp: 15 } },
  iron_mace: { name: '철퇴', slot: 'weapon', cls: 'mace', model: 'w_axe', dmg: [10, 15], speed: 0.95, req: { vit: 16 }, minLvl: 4, mods: { maxHp: 25 } },
  war_hammer: { name: '전투 망치', slot: 'weapon', cls: 'mace', model: 'w_axe', dmg: [15, 23], speed: 0.9, req: { vit: 26 }, minLvl: 9, mods: { maxHp: 40, armorPct: 5 } },
  spiked_mace: { name: '가시 철퇴', slot: 'weapon', cls: 'mace', model: 'w_axe', dmg: [20, 30], speed: 0.95, req: { vit: 34 }, minLvl: 14, mods: { maxHp: 60, armorPct: 8 } },
  knight_axe: { name: '기사의 손도끼', slot: 'weapon', cls: 'mace', model: 'w_axe', dmg: [27, 40], speed: 1.0, req: { vit: 44 }, minLvl: 22, mods: { maxHp: 90, armorPct: 10 } },
  dragon_mace: { name: '용뼈 철퇴', slot: 'weapon', cls: 'mace', model: 'w_axe', dmg: [38, 56], speed: 0.95, req: { vit: 58 }, minLvl: 36, mods: { maxHp: 150, armorPct: 14 } },
  // ── v0.37 홀 (정신, 한손 — 보주와 함께) ──
  novice_scepter: { name: '견습 홀', slot: 'weapon', cls: 'scepter', model: 'w_wand', dmg: [4, 7], speed: 1.0, price: 5, minLvl: 1, noDrop: true, mods: { maxMp: 10 } },
  oak_scepter: { name: '참나무 홀', slot: 'weapon', cls: 'scepter', model: 'w_wand', dmg: [6, 10], speed: 1.0, price: 100, shop: true, mods: { maxMp: 20 } },
  moon_scepter: { name: '달빛 홀', slot: 'weapon', cls: 'scepter', model: 'w_wand', dmg: [10, 15], speed: 1.0, req: { wis: 16 }, minLvl: 4, mods: { maxMp: 35, mpRegen: 1 } },
  sage_scepter: { name: '현자의 홀', slot: 'weapon', cls: 'scepter', model: 'w_wand', dmg: [15, 23], speed: 1.0, req: { wis: 26 }, minLvl: 9, mods: { maxMp: 55, mpRegen: 2 } },
  rune_scepter: { name: '룬 홀', slot: 'weapon', cls: 'scepter', model: 'w_wand', dmg: [20, 30], speed: 1.0, req: { wis: 34 }, minLvl: 14, mods: { maxMp: 80, mpRegen: 3 } },
  astral_scepter: { name: '성좌의 홀', slot: 'weapon', cls: 'scepter', model: 'w_wand', dmg: [27, 40], speed: 1.05, req: { wis: 44 }, minLvl: 22, mods: { maxMp: 120, mpRegen: 4 } },
  void_scepter: { name: '공허의 홀', slot: 'weapon', cls: 'scepter', model: 'w_wand', dmg: [38, 56], speed: 1.05, req: { wis: 58 }, minLvl: 36, mods: { maxMp: 180, mpRegen: 6 } },
  // ── v0.37 보주 (보조 칸, 홀과 함께): MP · MP 회복 · 조금의 방어 ──
  glass_orb: { name: '유리 보주', slot: 'offhand', armor: 2, price: 80, shop: true, mods: { maxMp: 20, matk: 2 } },
  moon_orb: { name: '달빛 보주', slot: 'offhand', armor: 5, req: { wis: 20 }, minLvl: 5, mods: { maxMp: 45, mpRegen: 1, matk: 5 } },
  rune_orb: { name: '룬 보주', slot: 'offhand', armor: 9, req: { wis: 32 }, minLvl: 14, mods: { maxMp: 80, mpRegen: 2, matk: 9 } },
  void_orb: { name: '공허의 보주', slot: 'offhand', armor: 16, req: { wis: 56 }, minLvl: 32, mods: { maxMp: 150, mpRegen: 4, matk: 18 } },
  // ── v0.44.37 마도서 (보조 칸): 마법 공격력 — 한손 무기 + 마도서 = 물리 · 마법을 함께 (마검사 등) ──
  apprentice_tome: { name: '견습 마도서', slot: 'offhand', armor: 1, price: 90, shop: true, mods: { matk: 5 } },
  rune_tome: { name: '룬 마도서', slot: 'offhand', armor: 2, req: { int: 20 }, minLvl: 6, mods: { matk: 12, int: 2 } },
  storm_tome: { name: '폭풍 마도서', slot: 'offhand', armor: 3, req: { int: 26 }, minLvl: 12, mods: { matk: 18, int: 3 } },
  arcane_tome: { name: '비전 마도서', slot: 'offhand', armor: 4, req: { int: 34 }, minLvl: 20, mods: { matk: 26, int: 4 } },
  flame_tome: { name: '화염 마도서', slot: 'offhand', armor: 5, req: { int: 44 }, minLvl: 26, mods: { matk: 38, int: 6 } },
  abyss_tome: { name: '심연의 마도서', slot: 'offhand', armor: 7, req: { int: 56 }, minLvl: 34, mods: { matk: 52, int: 8 } },
};
export const isTwoHandedBase = (b) => !!(b.two ?? WEAPON_CLASSES[b.cls]?.two);
// v0.49.58 화살통: 활 전용 보조 장비. 활은 양손이지만 화살통은 함께 낄 수 있다 (다른 양손 무기 · 다른 보조 장비는 그대로 막힌다)
export const isQuiverBase = (b) => !!b && b.slot === 'offhand' && /화살통/.test(b.name || '');
export const isBowBase = (b) => b?.cls === 'bow';
// 무기 · 보조 장비를 같이 낄 수 있나
export const handsOk = (wb, ob) => !wb || !ob ? true : isQuiverBase(ob) ? isBowBase(wb) : !isTwoHandedBase(wb);

export const RARITY = {
  common: { name: '일반', color: '#d8d2c4', affix: [0, 0], mult: 1, value: 1 },
  magic: { name: '마법', color: '#6c8cff', affix: [1, 2], mult: 1, value: 2.5 },
  rare: { name: '희귀', color: '#ffd84a', affix: [3, 4], mult: 1.1, value: 6 },
  hero: { name: '영웅', color: '#ff9a3c', affix: [4, 5], mult: 1.2, value: 12 },
  legend: { name: '전설', color: '#41e07a', affix: [5, 6], mult: 1.4, value: 25 },
  myth: { name: '신화', color: '#ff4a8a', affix: [6, 7], mult: 1.7, value: 60 }, // v0.42 강화 던전 보스 전용 (신화 옵션 2개)
};
export const RARITY_ORDER = ['common', 'magic', 'rare', 'hero', 'legend', 'myth'];

const ARMORS = ['helm', 'armor', 'gloves', 'boots', 'belt', 'offhand'];
const JEWEL = ['amulet', 'ring'];
// slots: 붙을 수 있는 부위 (없으면 전부). max(l): 아이템 레벨 l에서의 최대값
// v0.42 % 옵션은 레벨 120 넘으면 천천히 (예전엔 레벨에 비례해 300레벨 무기가 피해 +1000%를 넘었다) · 치명타 · 공격 속도 · 흡혈은 상한
const lk = (l) => (l <= 120 ? l : 120 + (l - 120) * 0.35);
export const AFFIXES = {
  str: { text: '힘 +{v}', min: 1, max: (l) => 2 + l * 0.5 },
  dex: { text: '민첩 +{v}', min: 1, max: (l) => 2 + l * 0.5 },
  int: { text: '지능 +{v}', min: 1, max: (l) => 2 + l * 0.5 },
  wis: { text: '정신 +{v}', min: 1, max: (l) => 2 + l * 0.5 },
  vit: { text: '체력 +{v}', min: 1, max: (l) => 2 + l * 0.5 },
  maxHp: { text: '최대 HP +{v}', min: 5, max: (l) => 12 + l * 5 },
  maxMp: { text: '최대 MP +{v}', min: 4, max: (l) => 8 + l * 3 },
  armorPct: { text: '방어력 +{v}%', min: 5, max: (l) => 15 + lk(l), slots: ARMORS },
  dmgPct: { text: '피해 +{v}%', min: 5, max: (l) => 15 + lk(l) * 2, slots: ['weapon'] },
  spellPct: { text: '주문 피해 +{v}%', min: 5, max: (l) => 12 + lk(l) * 1.5, slots: ['weapon', 'helm', ...JEWEL], retired: true }, // v0.44.37 폐지 → 마법 공격력으로 바뀐다 (spellToMatk)
  // v0.44.37 물리 · 마법 공격력 (지팡이 · 홀이 아닌 무기는 마법 공격력 0 → 이 옵션으로)
  // v0.50 공격력 옵션은 자기 공격 종류만: 마법 무기 · 마도서 · 보주 → 마법 공격력, 물리 무기 · 화살통 · 방패 → 물리 공격력 (예전엔 반대로 붙어 완드에 물리 공격력만 떴다). 장신구는 둘 다
  matk: { text: '마법 공격력 +{v}', min: 2, max: (l) => 3 + lk(l) * 1.1, slots: ['weapon', 'offhand', ...JEWEL], atkKind: 'magic' },
  patk: { text: '물리 공격력 +{v}', min: 2, max: (l) => 3 + lk(l) * 0.9, slots: ['weapon', 'offhand', ...JEWEL], atkKind: 'phys' },
  atkSpd: { text: '공격 속도 +{v}%', min: 3, max: (l) => Math.min(30, 8 + l * 0.5), slots: ['weapon', 'gloves', ...JEWEL] },
  crit: { text: '치명타 확률 +{v}%', min: 1, max: (l) => Math.min(20, 3 + l * 0.25), slots: ['weapon', 'gloves', 'helm', ...JEWEL] },
  hpRegen: { text: '초당 HP 회복 +{v}', min: 1, max: (l) => 2 + l * 0.4, slots: ['armor', 'belt', 'helm', ...JEWEL] },
  mpRegen: { text: '초당 MP 회복 +{v}', min: 1, max: (l) => 1 + l * 0.25, slots: ['helm', 'weapon', ...JEWEL] },
  moveSpd: { text: '이동 속도 +{v}%', min: 3, max: () => 12, slots: ['boots'] },
  lifeSteal: { text: '생명력 흡수 {v}%', min: 1, max: (l) => Math.min(10, 2 + l * 0.15), slots: ['weapon', ...JEWEL] },
  skillExp: { text: '스킬 숙련 획득 +{v}%', min: 5, max: (l) => 15 + lk(l), slots: ['helm', ...JEWEL] },
  goldFind: { text: '골드 획득 +{v}%', min: 5, max: (l) => 20 + lk(l) * 2, slots: ['gloves', 'boots', 'belt', ...JEWEL] },
  magicFind: { text: '좋은 아이템 발견 +{v}%', min: 3, max: (l) => 10 + lk(l), slots: ['helm', ...JEWEL] },
  allStats: { text: '모든 스탯 +{v}', min: 1, max: (l) => 1 + l * 0.25, slots: JEWEL, legendOnly: true },
  // v0.42 신화 전용 옵션 (강화 던전 보스에서만 나오는 신화 장비)
  finalDmg: { text: '최종 피해 +{v}%', min: 4, max: (l) => 6 + l * 0.035, mythOnly: true },
  bossDmg: { text: '보스 · 네임드에게 주는 피해 +{v}%', min: 6, max: (l) => 10 + l * 0.06, mythOnly: true },
  cdr: { text: '재사용 대기 -{v}%', min: 3, max: (l) => 5 + l * 0.02, slots: ['helm', 'gloves', ...JEWEL], mythOnly: true },
  dmgReduce: { text: '받는 피해 -{v}%', min: 3, max: (l) => 5 + l * 0.02, slots: ['armor', 'offhand', 'belt', 'helm'], mythOnly: true },
};

// 이름 앞에 붙는 수식어 (가장 큰 옵션 기준)
export const AFFIX_PREFIX = {
  str: '거인의', dex: '날렵한', int: '현자의', wis: '고요한', vit: '강건한', maxHp: '생명의', maxMp: '마력의',
  armorPct: '단단한', dmgPct: '잔혹한', spellPct: '불타는', matk: '비술의', patk: '묵직한', atkSpd: '재빠른', crit: '예리한', hpRegen: '재생의',
  mpRegen: '샘솟는', moveSpd: '바람의', lifeSteal: '흡혈의', skillExp: '수련자의', goldFind: '탐욕의',
  magicFind: '행운의', allStats: '고대의', finalDmg: '종언의', bossDmg: '왕살해자의', cdr: '시간을 잊은', dmgReduce: '불괴의',
};
export const MYTH_NAMES = ['종언을 고하는', '태초의 신이 남긴', '별을 삼킨', '세계수의 심장', '심연을 걷는 자의', '혼돈을 길들인', '신을 벤', '영겁의 왕관'];
export const LEGEND_NAMES = ['잠든 왕의', '망자의', '서리 군주의', '타락한 성기사의', '피의 서약', '그림자 군단의', '잊힌 신의'];

// 처음 고르는 무기 — 무기 + 주 스탯 +2 + 첫 스킬북(안내 보상)
export const STARTS = {
  sword: { base: 'rusty_sword', stat: 'str', book: 'power_strike', line: '가까이서 묵직하게' },
  bow: { base: 'old_bow', stat: 'dex', book: 'aimed_shot', line: '멀리서 정확하게' },
  staff: { base: 'novice_wand', off: 'apprentice_tome', stat: 'int', book: 'fire_bolt', line: '주문으로 태운다' }, // v0.49.38 완드 + 마도서로 시작
  mace: { base: 'rusty_club', off: 'round_shield', stat: 'vit', book: 'shield_slam', line: '맞으면서 버틴다' },
  scepter: { base: 'novice_scepter', off: 'glass_orb', stat: 'wis', book: 'mana_shield', line: '마나로 막고 마나로 친다' },
};
export const START_BONUS = 2;

// ───── 높은 단계 장비 (레벨 44 ~ 499, 세계 단계 악몽 · 지옥 · 혼돈용) ─────
// 종류마다 본보기 장비를 단계별 이름 · 수치로 늘린다. 그림(ITEM_LOOK)은 flareWorld.js에서 본보기 그림에 단계 색을 입힌다
export const HIGH_TIERS = [
  [44, '흑철'], [57, '청은'], [70, '강철'], [83, '미스릴'], [96, '룬'], [109, '용린'], [122, '성흔'], [135, '공허'], [148, '천공'], [161, '태초'], [174, '영겁'], [187, '신령'], [200, '초월'], [213, '심연'], [226, '원초'], [239, '황혼'], [252, '성좌'], [265, '혼돈'], [278, '절멸'], [291, '여명'], [304, '천명'], [317, '태고'], [330, '무한'], [343, '종언'], [356, '불멸'], [369, '창세'], [382, '신좌'],
  // v0.42 세계 단계 혼돈 (각성 380 ~ 500)
  [395, '심판'], [408, '극광'], [421, '천벌'], [434, '파멸'], [447, '명계'], [460, '무극'], [473, '천상'], [486, '절대'], [499, '종극'],
];
// ───── 스탯별 장비 줄 (v0.42.3): 어느 스탯으로 키워도 모든 부위에 낄 장비가 있게 ─────
// [id, 부위, 요구 스탯, 본보기(수치 · 그림), 이름 4단계, 높은 단계 이름]. 레벨 3 · 12 · 22 · 34, 그 위는 HIGH_TIERS로 499까지
const LINE_LV = [3, 12, 22, 34];
const PRE = { str: ['투사의', '전사의', '용사의', '패자의'], dex: ['사냥꾼', '추적자', '바람의', '매의'], int: ['견습 마도', '마도사의', '룬', '대마도사의'], wis: ['수련자', '순례자', '현자의', '성자의'], vit: ['강건한', '수호자의', '철벽의', '불괴의'] };
export const STAT_LINES = [
  ['l_vit_helm', 'helm', 'vit', 'iron_helm', '투구'], ['l_wis_helm', 'helm', 'wis', 'wizard_hat', '관'], ['l_dex_helm', 'helm', 'dex', 'leather_hood', '두건'], ['l_int_helm', 'helm', 'int', 'sage_hat', '모자'],
  ['l_vit_armor', 'armor', 'vit', 'chain_mail', '갑주'], ['l_wis_armor', 'armor', 'wis', 'arcane_robe', '로브'], ['l_dex_armor', 'armor', 'dex', 'leather_armor', '가죽옷'], ['l_int_armor', 'armor', 'int', 'cloth_robe', '법의'],
  ['l_vit_gloves', 'gloves', 'vit', 'gauntlets', '건틀릿'], ['l_wis_gloves', 'gloves', 'wis', 'mage_sleeves', '소매'], ['l_dex_gloves', 'gloves', 'dex', 'leather_gloves', '장갑'], ['l_int_gloves', 'gloves', 'int', 'cloth_wraps', '손싸개'],
  ['l_vit_boots', 'boots', 'vit', 'war_boots', '장화'], ['l_wis_boots', 'boots', 'wis', 'mage_boots', '신'], ['l_dex_boots', 'boots', 'dex', 'leather_boots', '가죽 장화'], ['l_int_boots', 'boots', 'int', 'cloth_shoes', '신발'],
  ['l_str_belt', 'belt', 'str', 'chain_belt', '허리띠'], ['l_dex_belt', 'belt', 'dex', 'leather_belt', '띠'], ['l_wis_belt', 'belt', 'wis', 'cloth_sash', '띠'], ['l_vit_belt', 'belt', 'vit', 'warden_belt', '허리띠'],
  ['l_str_amulet', 'amulet', 'str', 'bone_amulet', '목걸이'], ['l_dex_amulet', 'amulet', 'dex', 'bone_amulet', '목걸이'], ['l_int_amulet', 'amulet', 'int', 'bone_amulet', '목걸이'], ['l_vit_amulet', 'amulet', 'vit', 'bone_amulet', '목걸이'],
  ['l_wis_ring', 'ring', 'wis', 'silver_ring', '반지'], ['l_vit_ring', 'ring', 'vit', 'silver_ring', '반지'], ['l_str_ring', 'ring', 'str', 'silver_ring', '반지'],
  ['l_dex_off', 'offhand', 'dex', 'glass_orb', '화살통'], ['l_int_off', 'offhand', 'int', 'glass_orb', '마도서'], ['l_vit_off', 'offhand', 'vit', 'round_shield', '방패'],
  ['l_int_wand', 'weapon', 'int', 'bone_staff', '완드'], ['l_str_hammer', 'weapon', 'str', 'war_axe', '전투 망치'],
  // v0.42.4 빈칸 채우기: 힘 갑옷 · 장갑 · 신발, 민첩 · 지능 반지, 지능 허리띠, 정신 보조 장비
  ['l_str_armor', 'armor', 'str', 'chain_mail', '흉갑'], ['l_str_gloves', 'gloves', 'str', 'gauntlets', '손갑'], ['l_str_boots', 'boots', 'str', 'war_boots', '전투화'],
  ['l_dex_ring', 'ring', 'dex', 'silver_ring', '반지'], ['l_int_ring', 'ring', 'int', 'silver_ring', '반지'], ['l_int_belt', 'belt', 'int', 'rune_sash', '허리끈'], ['l_wis_off', 'offhand', 'wis', 'moon_orb', '보주'],
];
for (const [id, slot, stat, tpl, noun] of STAT_LINES) LINE_LV.forEach((lv, i) => {
  const b = BASES[tpl], g = Math.max(0.6, 1 + (lv - (b.minLvl || 1)) / 30);
  const o = { ...b, name: `${PRE[stat][i]} ${noun}`, minLvl: lv, req: { [stat]: Math.round(6 + lv * 1.6) }, shop: false, line: stat, ltpl: tpl };
  delete o.price; delete o.noDrop;
  if (b.dmg) o.dmg = b.dmg.map((v) => Math.max(1, Math.round(v * g)));
  if (b.armor) o.armor = Math.max(1, Math.round(b.armor * g));
  o.mods = { ...(b.mods ? Object.fromEntries(Object.entries(b.mods).map(([a, v]) => [a, Math.round(v * g)])) : {}), [stat]: 1 + Math.round(lv / 6) }; // 그 스탯이 조금 붙는다
  BASES[`${id}${i + 1}`] = o;
});
// v0.49.59 화살통: 마법 구슬을 본떠 최대 MP · 마법 공격력이 붙어 있던 것 → 궁수용 물리 공격력 · 공격 속도 · 민첩
for (let i = 1; i <= 4; i++) { const b = BASES['l_dex_off' + i]; if (b) b.mods = { patk: 2 + i * 2, atkSpd: 2 + i, dex: b.mods?.dex || 1 + i }; }
// v0.49.38 완드는 한손 지능 무기: 지팡이보다 공격력 0.75배 · 빠르게
for (let i = 1; i <= 4; i++) { const b = BASES['l_int_wand' + i]; if (b) Object.assign(b, { cls: 'wand', dmg: b.dmg.map((v) => Math.max(1, Math.round(v * 0.75))), speed: 1.1 }); }
Object.assign(BASES, {
  novice_wand: { name: '견습 완드', slot: 'weapon', cls: 'wand', model: 'w_wand', dmg: [3, 5], speed: 1.1, price: 5, minLvl: 1, noDrop: true, mods: { maxMp: 5 } },
  oak_wand: { name: '참나무 완드', slot: 'weapon', cls: 'wand', model: 'w_wand', dmg: [5, 8], speed: 1.1, price: 100, shop: true, mods: { maxMp: 10 } },
});
// 대홀: 홀마다 공격력 1.3배 · 최대 MP 2배 (양손) / 대방패: 둔기마다 공격력 0.8배 + 비슷한 단계 방패의 방어력 1.5배 · 막기
{
  const SH = [[1, 5, 0.12], [5, 11, 0.18], [11, 17, 0.22], [20, 26, 0.24], [32, 36, 0.27]], shAt = (lv) => [...SH].reverse().find((x) => (lv || 1) >= x[0]) || SH[0];
  const GS = { oak_scepter: '참나무 대홀', moon_scepter: '달빛 대홀', sage_scepter: '현자의 대홀', rune_scepter: '룬 대홀', astral_scepter: '성좌의 대홀', void_scepter: '공허의 대홀' };
  for (const [id, nm] of Object.entries(GS)) { const b = BASES[id]; BASES['g_' + id] = { ...b, name: nm, cls: 'gscepter', shop: false, dmg: b.dmg.map((v) => Math.round(v * 1.3)), speed: b.speed * 0.92, mods: Object.fromEntries(Object.entries(b.mods || {}).map(([k, v]) => [k, k === 'maxMp' ? v * 2 : v])), minLvl: b.minLvl ?? 2 }; delete BASES['g_' + id].price; }
  const TS = { oak_club: '나무 대방패', iron_mace: '철 대방패', war_hammer: '강철 대방패', spiked_mace: '가시 대방패', knight_axe: '기사의 대방패', dragon_mace: '용비늘 대방패' };
  for (const [id, nm] of Object.entries(TS)) { const b = BASES[id], s = shAt(b.minLvl); BASES['t_' + id] = { ...b, name: nm, cls: 'tshield', shop: false, dmg: b.dmg.map((v) => Math.max(1, Math.round(v * 0.8))), armor: Math.round(s[1] * 1.5), block: +(s[2] + 0.08).toFixed(2), minLvl: b.minLvl ?? 2 }; delete BASES['t_' + id].price; }
}
export const HIGH_TEMPLATES = {
  sword: ['inferno_sword', '검'], greatsword: ['rune_blade', '대검'], axe: ['dragon_cleaver', '도끼'], bow: ['dragon_bow', '활'], staff: ['archmage_staff', '지팡이'],
  shield: ['dragon_shield', '방패'], mace: ['dragon_mace', '철퇴'], gscepter: ['g_void_scepter', '대홀'], tshield: ['t_dragon_mace', '대방패'], dagger: ['dragon_fang', '단검'], tome: ['abyss_tome', '마도서'], scepter: ['void_scepter', '홀'], orb: ['void_orb', '보주'], plate: ['dragon_plate', '판금'], leather: ['shadow_leather', '가죽 갑옷'], robe: ['inferno_robe', '로브'],
  helm: ['dragon_helm', '투구'], hood: ['shadow_hood', '두건'], hat: ['archmage_hat', '모자'],
  gaunt: ['dragon_gauntlets', '건틀릿'], lglove: ['shadow_gloves', '장갑'], sleeve: ['ember_sleeves', '소매'],
  boot: ['dragon_boots', '장화'], lboot: ['shadow_boots', '가죽 장화'], mboot: ['ember_boots', '신'],
  belt: ['dragon_belt', '허리띠'], sash: ['rune_sash', '띠'], amulet: ['star_amulet', '목걸이'], ring: ['ruby_ring', '반지'],
  ...Object.fromEntries(STAT_LINES.map(([id, , stat, , noun]) => [id, [`${id}4`, `${({ str: '힘의', dex: '민첩의', int: '지능의', wis: '정신의', vit: '체력의' })[stat]} ${noun}`]])),
};
for (const [lv, tn] of HIGH_TIERS) for (const [k, [tpl, nm]] of Object.entries(HIGH_TEMPLATES)) {
  const b = BASES[tpl], g = 1 + (lv - (b.minLvl || 36)) / 90;
  const o = { ...b, name: `${tn} ${nm}`, minLvl: lv, tpl, shop: false };
  if (b.dmg) o.dmg = b.dmg.map((v) => Math.round(v * g));
  if (b.armor) o.armor = Math.round(b.armor * g);
  if (b.mods) o.mods = Object.fromEntries(Object.entries(b.mods).map(([a, v]) => [a, Math.round(v * g)]));
  if (b.req) o.req = Object.fromEntries(Object.entries(b.req).map(([a, v]) => [a, Math.round(v * (1 + (lv - (b.minLvl || 36)) / 55))]));
  BASES[`h${lv}_${k}`] = o;
}

// 지역 재료도 쌓이는 아이템 (mat_지역). 건물 단계 올리기 · 세트 제작에 쓴다
import { MATERIALS as _MATS } from './crafting.js';
for (const [k, m] of Object.entries(_MATS)) BASES['mat_' + k] = { name: m.name, type: 'mat', price: 0, stack: true, icon: m.icon, mat: k };

// 필요 능력치가 없는 장비에 붙인다 (v0.33.4): 장비 단계(minLvl)에 맞춰 — 다른 장비의 곡선(레벨 44 → 63, 96 → 115, 187 → 221)과 비슷하게
{
  const need = (lv) => Math.round(12 + lv * 1.1);
  const ringStat = ['str', 'dex', 'int'];
  let h = 0;
  for (const [id, b] of Object.entries(BASES)) {
    if (!b.slot || b.req || (b.minLvl ?? 1) < 3 || b.noDrop) continue;
    h = (h * 31 + id.length) % 997;
    const stat = b.slot === 'belt' ? 'vit' : b.slot === 'amulet' ? 'wis' : b.slot === 'ring' ? ringStat[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 3]
      : b.cls ? { sword: 'str', axe: 'str', bow: 'dex', staff: 'int', wand: 'int', gscepter: 'wis', tshield: 'vit', mace: 'vit', scepter: 'wis' }[b.cls] || 'str' : 'vit';
    b.req = { [stat]: need(b.minLvl ?? 1) };
  }
}

// v0.44.37 예전 「주문 피해 %」 → 마법 공격력 (그 옵션이 최대치의 몇 %였는지 그대로)
export const spellToMatk = (v, l = 1) => Math.round((v / (12 + lk(l) * 1.5)) * (3 + lk(l) * 1.1) * 0.8);
// v0.50 장비의 공격 종류 (무기 · 보조): 'magic' | 'phys' | null(장신구 · 방어구)
export const offKind = (b) => { const n = b?.tpl || b?.ltpl || ''; const id = String(b?.name || '') + n; return /화살통/.test(b?.name || '') ? 'phys' : /orb|tome|보주|마도서/.test(id) ? 'magic' : /shield|방패/.test(id) ? 'phys' : null; };
export const atkKindOf = (b) => (!b ? null : b.slot === 'weapon' ? (WEAPON_CLASSES[b.cls]?.kind === 'magic' ? 'magic' : 'phys') : b.slot === 'offhand' ? offKind(b) : null);
export const affixFits = (a, base) => (!a.slots || a.slots.includes(base.slot)) && (!a.notCls || !a.notCls.includes(base.cls)) && (!a.onlyCls || a.onlyCls.includes(base.cls))
  && (!a.atkKind || !['weapon', 'offhand'].includes(base.slot) || atkKindOf(base) === a.atkKind);
// v0.50 스탯 옵션 가중: 그 장비의 주 · 보조 스탯이 잘 붙는다 (주 ×3 · 보조 ×2 · 나머지 ×0.5). 장신구는 고르게
const MAT = [[/iron|knight|great_helm|plate|chain|gauntlet|war_boots|heavy|warden|dragon_(helm|plate|gauntlets|boots|belt)|frost_(helm|plate|gauntlets|boots)|투구|갑주|건틀릿|장화|흉갑|손갑|전투화/, ['str', 'vit']],
  [/leather|hunter|scout|shadow|hood|두건|가죽|장갑/, ['dex', 'str']], [/cloth|wizard|sage|arcane|frost_robe|inferno|mage|ember|rune_sash|모자|로브|법의|소매|신발|허리끈|관$|신$/, ['int', 'wis']]];
export function statPref(b) {
  if (!b) return null;
  if (b.line) { const side = { str: 'vit', dex: 'str', int: 'wis', wis: 'int', vit: 'str' }[b.line]; return [b.line, side]; }
  if (b.slot === 'weapon') { const c = WEAPON_CLASSES[b.cls]; return c ? [c.ap, c.side || c.ap] : null; }
  if (b.slot === 'offhand') { const n = b.name || ''; return /화살통/.test(n) ? ['dex', 'str'] : offKind(b) === 'magic' ? (/보주|orb/.test(n + (b.tpl || '')) ? ['wis', 'int'] : ['int', 'wis']) : ['vit', 'str']; }
  if (['ring', 'amulet'].includes(b.slot)) return null;
  const id = (b.tpl || '') + ' ' + (b.ltpl || '') + ' ' + Object.keys(BASES).find((k) => BASES[k] === b) + ' ' + (b.name || '');
  for (const [re, st] of MAT) if (re.test(id)) return st;
  return null;
}
// v0.50 무기 · 보조마다 잘 붙는 옵션 (×2)
export const FAV_AFFIX = { sword: ['patk', 'atkSpd', 'crit'], dagger: ['atkSpd', 'crit', 'patk'], bow: ['patk', 'crit', 'atkSpd'], mace: ['patk', 'maxHp', 'lifeSteal'], tshield: ['maxHp', 'patk', 'dmgPct'],
  wand: ['matk', 'atkSpd', 'crit'], staff: ['matk', 'dmgPct', 'maxMp'], scepter: ['matk', 'maxMp', 'mpRegen'], gscepter: ['matk', 'maxMp', 'dmgPct'],
  quiver: ['patk', 'crit', 'atkSpd'], tome: ['matk', 'maxMp', 'mpRegen'], orb: ['maxMp', 'mpRegen', 'matk'], shield: ['armorPct', 'maxHp', 'patk'] };
export const favOf = (b) => (!b ? null : b.slot === 'weapon' ? FAV_AFFIX[b.cls] : b.slot === 'offhand' ? FAV_AFFIX[/화살통/.test(b.name || '') ? 'quiver' : offKind(b) === 'magic' ? (/보주|orb/.test((b.name || '') + (b.tpl || '')) ? 'orb' : 'tome') : 'shield'] : null);
export const UTILITY_AFFIX = new Set(['goldFind', 'magicFind', 'skillExp']); // 잡옵션: 장비 하나에 한 줄까지
