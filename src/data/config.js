// 게임 전체 수치. 밸런스는 여기서 조정한다.

export const STATS = ['str', 'dex', 'int', 'wis', 'vit'];
export const STAT_NAMES = { str: '힘', dex: '민첩', int: '지능', wis: '정신', vit: '체력' };
export const STAT_COLORS = { str: '#e0644a', dex: '#5fd08a', int: '#5f9bff', wis: '#c58cff', vit: '#f0b552' };
export const STAT_DESC = {
  str: '힘 스킬 피해 · 물리 공격력 · 무거운 장비',
  dex: '민첩 스킬 피해 · 공격 속도 · 치명타',
  int: '지능 스킬 피해 · 마법 공격력 · 재사용 대기 감소',
  wis: '최대 MP · MP 회복 · 보호막',
  vit: '최대 HP · HP 회복 · 방어',
};

export const CONFIG = {
  startStat: 10,
  // 각성(스탯 성장)
  awakenPoints: 5,          // 각성 1회에 오르는 스탯 총량
  expBase: 220,             // v0.42: 모든 구간 필요 경험치 증가 (예전 150)
  expGrowth: 1.17,
  expLatePow: 2.8,
  expEndPow: 0.5,           // 각성 300 뒤 더 가파르게: × (1 + (n - 300) / 50)^expEndPow          // 각성 40 뒤 필요 경험치 곡선 지수 (클수록 가파름, 관리 페이지에서 조절)          // (옛날 게임처럼 느리게, v2 기본 방향)          // 필요 EXP = expBase × expGrowth^각성횟수
  apKeepAfterAwaken: 0.5,   // 각성 후 남기는 행동 기록 비율
  apSoftCapStart: 10,       // 이 값을 넘는 스탯은 같은 행동의 AP 효율이 떨어진다
  apSoftCapScale: 60,
  weakMonsterGap: 5,        // 내 강함보다 이만큼 낮은 몬스터 → AP 0, EXP 20%
  weakMonsterExp: 0.2,

  // 자동 사냥 불이익 (EXP · 행동 기록 · 스킬 숙련 · 드랍 확률에 곱한다)
  autoPenalty: 0.8,
  autoDrop: 0.3,            // 자동 사냥 드랍(장비 · 책 · 물약 · 금화 · 강화석 · 재료 · 열쇠) 배율 (v0.42, 수동 사냥 이득)
  autoExpPenalty: 0.45,     // 자동 사냥 각성 경험치는 더 크게 깎는다 (v0.37)
  bookDrop: 0.4,            // 스킬북 드랍 배율 (v0.37: 너무 잘 떨어져서)

  // 사망 불이익: 확률적으로 아이템 1개를 그 자리에 떨어뜨린다
  deathDropChance: 0.35,
  deathDropEquippedWeight: 1,   // 착용 중인 장비가 뽑힐 가중치
  deathDropBagWeight: 1,        // 가방 속 장비 · 스킬북이 뽑힐 가중치
  deathItemLifetime: 15 * 60,   // 떨어뜨린 아이템이 남아 있는 시간(초)

  inventorySize: 40,
  quickSlots: 6,
  skillMaxRank: 10,
  respawnTime: 35,          // 일반 몬스터 재생성(초)
  namedRespawn: 180,
  bossRespawn: 360,
  eliteChance: 0.08,
  autosaveInterval: 10,
};

// 행동 → 행동 포인트(AP). "어떤 행동이 어떤 스탯을 키우는가"
export const AP_TABLE = {
  meleeHit: 1.0,      // + 무기 주 스탯 (검 · 맨손은 힘)
  meleeHitSide: 0.2,  // 보조로 민첩(또는 힘)
  meleeKill: 2.0,
  rangedHit: 1.0,     // 민첩
  rangedHitSide: 0.2, // 힘
  magicBasicHit: 0.6, // 지팡이 기본 공격 → 지능
  crit: 0.5,          // 민첩
  dodge: 0.8,         // 민첩
  spellPerMp: 0.2,    // 공격 주문: 소모 MP ÷ 5 → 지능
  supportPerMp: 0.2,  // 보조 주문: 소모 MP ÷ 5 → 그 스킬의 스탯
  mpRecover: 0.06,    // 회복한 MP 1마다 정신 (마을 밖 자연 회복 · 마나 물약)
  hurtScale: 10,
  hurtHit: 0.3,       // 맞을 때마다 체력 (v0.37: 맞은 횟수도)      // 받은 피해 ÷ 최대 HP × 10 → 체력
  lowHpKill: 1.5,     // HP 30% 이하에서 처치 → 체력
  blockVit: 0.5,
  blockStr: 0.3,
  skillUse: 1.5,      // 스킬을 쓸 때마다 그 스킬의 필요 스탯에 (필요량 비율대로, 높은 등급일수록 더) — v0.37
};

export const TIERS = {
  normal: { name: '일반', color: '#e8e2d4', hp: 1, dmg: 1, exp: 1, scale: 1 },
  elite: { name: '정예', color: '#6fa8ff', hp: 3, dmg: 1.4, exp: 4, scale: 1.15 },
  named: { name: '네임드', color: '#ffd84a', hp: 8, dmg: 1.8, exp: 12, scale: 1.35 },
  boss: { name: '보스', color: '#ff5a4a', hp: 25, dmg: 2.2, exp: 50, scale: 1.6 },
};

// 몬스터 등급별 드랍
// 드랍: 장비는 드물게 — 천천히 잡아 가며 하나씩 얻고 강화한다 (v2 기본 방향)
export const LOOT = {
  // v0.32 밸런스: 장비 드랍 · 영웅 · 전설을 크게 줄였다 (하루 만에 끝나지 않게)
  normal: { itemChance: 0.004, items: [1, 1], gold: [0.5, 1], potion: 0.03, book: 0.004, bookTiers: { 1: 1 },
    rarity: { common: 78, magic: 20.5, rare: 1.45, hero: 0.05, legend: 0 } },
  elite: { itemChance: 0.035, items: [1, 1], gold: [1, 3], potion: 0.25, book: 0.03, bookTiers: { 1: 70, 2: 30 },
    rarity: { common: 25, magic: 60, rare: 13.85, hero: 1.1, legend: 0 } },
  // v0.42.8 네임드 · 보스는 장비 확정, 대신 낮은 · 중간 등급이 대부분 (좋은 장비는 드물게)
  named: { itemChance: 1, items: [1, 1], gold: [1, 8], potion: 0.5, book: 0.15, bookTiers: { 2: 60, 3: 40 }, shard: 0.08,
    rarity: { common: 30, magic: 42, rare: 23.8, hero: 4, legend: 0.2 } },
  boss: { itemChance: 1, items: [1, 2], gold: [1, 20], potion: 1, book: 0.6, bookTiers: { 3: 60, 4: 35, 5: 5 }, shard: 0.15,
    rarity: { common: 15, magic: 40, rare: 36, hero: 8.4, legend: 0.6 } },
};
