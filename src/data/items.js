// 아이템 정의. 상점은 일반(흰색) 기본 장비와 소모품만 판다.

export const SLOTS = ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'ring2'];
export const SLOT_NAMES = {
  weapon: '무기', offhand: '보조', helm: '투구', armor: '갑옷', gloves: '장갑',
  boots: '신발', belt: '허리띠', amulet: '목걸이', ring1: '반지', ring2: '반지', ring: '반지',
};

// 무기 계열: 공격 방식 · 어떤 스탯이 피해를 키우고 AP가 쌓이는지 · 모델
export const WEAPON_CLASSES = {
  unarmed: { name: '맨손', kind: 'melee', ap: 'str', side: 'dex', range: 1.9, hands: 1, model: null },
  dagger: { name: '단검', kind: 'melee', ap: 'dex', side: 'str', range: 1.9, hands: 1, model: 'w_dagger' },
  sword: { name: '한손검', kind: 'melee', ap: 'str', side: 'dex', range: 2.1, hands: 1, model: 'w_sword' },
  axe: { name: '한손도끼', kind: 'melee', ap: 'str', side: 'dex', range: 2.1, hands: 1, model: 'w_axe' },
  greatsword: { name: '양손검', kind: 'melee', ap: 'str', side: 'dex', range: 2.5, hands: 2, model: 'w_greatsword' },
  greataxe: { name: '양손도끼', kind: 'melee', ap: 'str', side: 'dex', range: 2.5, hands: 2, model: 'w_greataxe' },
  crossbow: { name: '석궁', kind: 'ranged', ap: 'dex', side: 'str', range: 12, hands: 2, model: 'w_crossbow' },
  wand: { name: '완드', kind: 'magic', ap: 'int', side: null, range: 10, hands: 1, model: 'w_wand' },
  staff: { name: '지팡이', kind: 'magic', ap: 'int', side: null, range: 10, hands: 2, model: 'w_staff' },
};

// minLvl: 이 아이템 레벨부터 드랍된다. shop: 상점 판매 여부
export const BASES = {
  rusty_sword: { name: '낡은 장검', slot: 'weapon', cls: 'sword', dmg: [4, 7], speed: 1.1, price: 5, minLvl: 99 },
  old_crossbow: { name: '낡은 석궁', slot: 'weapon', cls: 'crossbow', dmg: [4, 7], speed: 0.95, price: 5, minLvl: 99 },
  old_wand: { name: '낡은 완드', slot: 'weapon', cls: 'wand', dmg: [3, 6], speed: 1.0, price: 5, minLvl: 99, mods: { maxMp: 5 } },
  novice_staff: { name: '견습 지팡이', slot: 'weapon', cls: 'staff', dmg: [4, 7], speed: 0.9, price: 5, minLvl: 99, mods: { maxMp: 10 } },
  dagger: { name: '단검', slot: 'weapon', cls: 'dagger', dmg: [4, 7], speed: 1.45, price: 60, shop: true },
  short_sword: { name: '장검', slot: 'weapon', cls: 'sword', dmg: [6, 10], speed: 1.15, price: 90, shop: true },
  hand_axe: { name: '손도끼', slot: 'weapon', cls: 'axe', dmg: [7, 12], speed: 1.0, price: 100, shop: true },
  greatsword: { name: '대검', slot: 'weapon', cls: 'greatsword', dmg: [13, 21], speed: 0.82, req: { str: 20 }, minLvl: 3 },
  greataxe: { name: '전투 대도끼', slot: 'weapon', cls: 'greataxe', dmg: [15, 25], speed: 0.75, req: { str: 26 }, minLvl: 6 },
  crossbow: { name: '석궁', slot: 'weapon', cls: 'crossbow', dmg: [7, 12], speed: 0.95, price: 110, shop: true },
  heavy_crossbow: { name: '중석궁', slot: 'weapon', cls: 'crossbow', dmg: [12, 20], speed: 0.8, req: { dex: 22 }, minLvl: 5 },
  wand: { name: '완드', slot: 'weapon', cls: 'wand', dmg: [5, 8], speed: 1.0, price: 100, shop: true, mods: { maxMp: 5 } },
  staff: { name: '참나무 지팡이', slot: 'weapon', cls: 'staff', dmg: [9, 15], speed: 0.85, req: { int: 18 }, minLvl: 3, mods: { maxMp: 20 } },
  round_shield: { name: '원형 방패', slot: 'offhand', armor: 5, block: 0.12, model: 'w_shield', price: 80, shop: true },
  tower_shield: { name: '사각 방패', slot: 'offhand', armor: 11, block: 0.18, req: { str: 22 }, model: 'w_shield_sq', minLvl: 5 },
  leather_cap: { name: '가죽 모자', slot: 'helm', armor: 3, price: 40, shop: true },
  iron_helm: { name: '철 투구', slot: 'helm', armor: 7, req: { str: 16 }, minLvl: 4 },
  cloth_robe: { name: '천 로브', slot: 'armor', armor: 4, price: 60, shop: true, mods: { maxMp: 10 } },
  leather_armor: { name: '가죽 갑옷', slot: 'armor', armor: 9, price: 90, shop: true },
  chain_mail: { name: '사슬 갑옷', slot: 'armor', armor: 17, req: { str: 20 }, minLvl: 4 },
  plate_armor: { name: '판금 갑옷', slot: 'armor', armor: 28, req: { str: 30, vit: 20 }, minLvl: 10 },
  leather_gloves: { name: '가죽 장갑', slot: 'gloves', armor: 2, price: 35, shop: true },
  gauntlets: { name: '강철 건틀릿', slot: 'gloves', armor: 5, req: { str: 16 }, minLvl: 4 },
  leather_boots: { name: '가죽 장화', slot: 'boots', armor: 2, price: 35, shop: true },
  war_boots: { name: '전투 장화', slot: 'boots', armor: 5, req: { str: 15 }, minLvl: 4 },
  leather_belt: { name: '가죽 허리띠', slot: 'belt', armor: 2, price: 30, shop: true },
  heavy_belt: { name: '두꺼운 허리띠', slot: 'belt', armor: 5, req: { str: 18 }, minLvl: 5 },
  amulet: { name: '목걸이', slot: 'amulet', minLvl: 1 },
  ring: { name: '반지', slot: 'ring', minLvl: 1 },

  hp_potion: { name: '체력 물약', type: 'potion', restore: { hp: 70 }, price: 15, shop: true, stack: true },
  mp_potion: { name: '마나 물약', type: 'potion', restore: { mp: 45 }, price: 15, shop: true, stack: true },
  hp_potion_l: { name: '큰 체력 물약', type: 'potion', restore: { hp: 220 }, price: 50, shop: true, stack: true },
  mp_potion_l: { name: '큰 마나 물약', type: 'potion', restore: { mp: 140 }, price: 50, shop: true, stack: true },
};

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

// 처음 고르는 무기 — 무기 + 주 스탯 +2 + 첫 스킬북(튜토리얼 보상)
export const STARTS = {
  sword: { base: 'rusty_sword', stat: 'str', book: 'power_strike', line: '가까이서 묵직하게' },
  crossbow: { base: 'old_crossbow', stat: 'dex', book: 'aimed_shot', line: '멀리서 정확하게' },
  wand: { base: 'old_wand', stat: 'int', book: 'fire_bolt', line: '주문으로 태운다' },
  staff: { base: 'novice_staff', stat: 'wis', book: 'first_aid', line: '버티며 회복한다' },
};
export const START_BONUS = 2;
