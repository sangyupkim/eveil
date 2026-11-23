// 마을 건물. 빈터(PLOTS)에 짓고, 금화로 단계를 올린다. 생산은 실제 시간으로 흐른다 (꺼 둔 동안에도)
// 집터 7곳: 마을 가운데(차원문 · NPC)를 둘러싼 고리 (반지름 20, 건물 하나가 가로 약 9칸)
// v0.22: 집터 8곳 (파견소가 생겨 하나 더). 고리를 따라 고르게
// 공용 창고 상자 자리 (상인 옆)
export const VAULT_SPOT = { x: 8.2, z: -11.4 };
export const PLOTS = [
  { id: 'p1', x: 0.0, z: -19.0, name: '북쪽 집터' },
  { id: 'p2', x: 14.6, z: -13.0, name: '북동쪽 집터' },
  { id: 'p3', x: 20.0, z: 2.0, name: '동쪽 집터' },
  { id: 'p4', x: 13.0, z: 16.0, name: '남동쪽 집터' },
  { id: 'p5', x: -13.0, z: 16.0, name: '남서쪽 집터' },
  { id: 'p6', x: -20.0, z: 2.0, name: '서쪽 집터' },
  { id: 'p7', x: -14.6, z: -13.0, name: '북서쪽 집터' },
  { id: 'p8', x: 0.0, z: 20.5, name: '남쪽 집터' },
  { id: 'p9', x: -19.5, z: 10.0, name: '서남쪽 제단 터' }, // v0.44.47 유물 제단 자리
];

// v0.42: 모든 건물 10단계까지 (6 ~ 10단계는 정수가 든다, crafting.js UP_ESS)
const ext = (a, n = 10, k = 2.2) => { const r = [...a]; while (r.length < n) r.push(Math.round(r[r.length - 1] * k)); return r; };
const UP_MORE = [70, 100, 150, 220, 300]; // 6 ~ 10단계로 올리는 데 필요한 각성
// cost(lv): 다음 단계 금화 · max: 최고 단계 · need: 짓는 데 필요한 각성 · up: 2~5단계로 올리는 데 필요한 각성
export const BUILDINGS = {
  smithy: {
    name: '대장간', up: [...[5, 15, 30, 50], ...UP_MORE], need: 0, desc: '장비 강화', max: 10, cost: (lv) => ext([1800, 7200, 24000, 72000, 180000])[lv] ?? null,
    // 단계마다 강화 상한
    cap: (lv) => [0, 4, 6, 8, 9, 10, 12, 14, 16, 18, Infinity][lv], // v0.50 10단계 = 초월 강화(상한 없음)
    look: [['grassland', 103, 0, 0], ['grassland', 100, 1.6, 0.8], ['dungeon', 151, -1.4, 0.6]],
  },
  mine: {
    name: '광산', up: [...[10, 22, 38, 55], ...UP_MORE], need: 6, desc: '강화석 생산', max: 10, cost: (lv) => ext([1200, 5400, 18000, 54000, 144000])[lv] ?? null,
    rate: (lv) => [0, 2, 4, 7, 11, 16, 22, 30, 40, 52, 66][lv],      // 시간당 강화석
    store: (lv) => [0, 24, 48, 84, 132, 192, 264, 360, 480, 624, 792][lv], // 쌓아 둘 수 있는 양 (v0.44.27 시간당 생산 × 12시간)
    look: [['cave', 130, 0, 0], ['cave', 131, 1.5, 0.4], ['cave', 151, -1.4, 0.6]],
  },
  herb: {
    name: '약초밭', up: [...[3, 10, 25, 45], ...UP_MORE], need: 0, desc: '약초 재배', max: 10, cost: (lv) => ext([900, 4200, 15000, 48000, 120000])[lv] ?? null,
    rate: (lv) => [0, 6, 10, 15, 22, 32, 44, 58, 74, 92, 112][lv],      // 시간당 약초
    store: (lv) => [0, 30, 60, 100, 160, 240, 320, 420, 540, 680, 840][lv],
    look: [['grassland', 120, -1, 0], ['grassland', 121, 0.4, 0.6], ['grassland', 122, 1.4, -0.2], ['grassland', 123, -0.2, -0.9]],
  },
  workshop: {
    name: '제작소', up: [...[15, 28, 42, 58], ...UP_MORE], need: 10, desc: '약초로 물약 · 주문서 제조', max: 10, cost: (lv) => ext([2400, 9000, 30000, 84000, 210000])[lv] ?? null,
    zones: (lv) => [0, 2, 4, 6, 8, 12, 14, 16, 18, 20, 20][lv], // 만들 수 있는 지역 수
    look: [['grassland', 100, 0, 0], ['grassland', 120, 1.4, 0.6]],
  },
  lab: {
    name: '연구소', up: [...[20, 32, 46, 60], ...UP_MORE], need: 15, desc: '금화 · 시간으로 영구 능력', max: 10, cost: (lv) => ext([4800, 18000, 54000, 132000, 300000])[lv] ?? null,
    slots: (lv) => lv, // 연구 단계 상한
    look: [['ruins', 278, 0, 0], ['ruins', 279, 1.4, 0.4], ['ruins', 283, -1.2, 0.8]],
  },
  house: {
    name: '숙소', up: [...[8, 18, 32, 50], ...UP_MORE], need: 3, desc: '용병이 묵는 곳', max: 10, cost: (lv) => ext([1800, 9000, 30000, 84000, 192000])[lv] ?? null,
    beds: (lv) => [0, 7, 15, 25, 36, 49, 64, 81, 100, 121, 144][lv],      // + 기본 1명 = 8 · 16 · 26 · 37 · 50명
    look: [],
  },
  guild: {
    name: '파견소', up: [...[12, 25, 40, 55], ...UP_MORE], need: 5, desc: '용병을 지역으로 파견', max: 10, cost: (lv) => ext([3600, 15000, 42000, 108000, 252000])[lv] ?? null,
    party: (lv) => [0, 1, 2, 3, 4, 5, 6, 6, 7, 7, 8][lv],    // 한 번에 보내는 용병 수
    packs: (lv) => [0, 2, 3, 5, 7, 10, 12, 14, 16, 18, 20][lv],   // 챙겨 보내는 물약 · 영약 수
    look: [],
  },
  altar: {
    name: '유물 제단', up: [...[10, 25, 40, 60], ...UP_MORE], need: 10, desc: '유물을 올려 버프', max: 10, cost: (lv) => ext([3000, 12000, 36000, 96000, 240000])[lv] ?? null,
    look: [],
  },
  inn: {
    name: '여관', up: [...[8, 20, 35, 55], ...UP_MORE], need: 3, desc: '매 시간 용병이 찾아옴', max: 10, cost: (lv) => ext([3000, 12000, 36000, 96000, 240000])[lv] ?? null,
    slots: (lv) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10][lv],      // 용병 수
    // 찾아오는 용병 등급 비율 [평범, 숙련, 정예, 전설] — 전설은 4단계부터, 정예는 2단계부터
    grades: (lv) => [[0, 0, 0, 0], [85, 15, 0, 0], [60, 33, 7, 0], [40, 42, 18, 0], [22, 40, 32, 6], [8, 32, 44, 16], [5, 28, 45, 22], [3, 24, 45, 28], [2, 20, 44, 34], [1, 16, 43, 40], [0, 12, 40, 48]][lv],
    look: [['grassland', 296, -7, 1]],
  },
};

// 강화: +n 확률 · 금화 · 강화석
export const ENHANCE = {
  chance: (n) => [1, 1, 0.9, 0.7, 0.5, 0.35, 0.25, 0.15, 0.1, 0.05][n] ?? 0.05,   // +11 ~ +20도 5% (더 낮추지 않는다, 대신 강화석이 많이 든다)   // n → n+1 (+5 50%, +10 5%)
  // v0.50 초월 강화(+21~, n ≥ 20): 한 번 = +20 한 번 값 × 1.1 × 1.02^(n − 20) · 최상급 강화석 +20 값 + 10단계마다 1 (어느 단계도 +20보다 싸지 않다)
  gold: (n, ilvl) => n >= 20 ? Math.round(ENHANCE.gold(19, ilvl) * 1.1 * Math.pow(1.02, n - 20)) : Math.round((60 + ilvl * 15) * Math.pow(1.6, Math.min(n, 10)) * Math.pow(1.25, Math.max(0, n - 10))),
  ore: (n) => (n >= 20 ? ENHANCE.ore(19) + Math.floor((n - 20) / 10) : n < 10 ? 8 + n * 8 : 2 + ((n - 10) % 5) * 2),   // +1 ~ +10: 강화석 8 ~ 80 · +11 ~ +15: 상급 2 ~ 10 · +16 ~ +20: 최상급 2 ~ 10
  oreId: (n) => (n < 10 ? 'ore' : n < 15 ? 'ore2' : 'ore3'),
  power: 0.08, // 단계마다 피해 · 방어 +8%
};

// 용병 파견: 분 · 보상 배율
export const EXPEDITIONS = [
  { id: 'short', name: '짧은 사냥', min: 10, mult: 1 },
  { id: 'mid', name: '반나절 사냥', min: 60, mult: 7 },
  { id: 'long', name: '긴 원정', min: 240, mult: 32 },
  { id: 'siege', name: '야영 토벌', min: 480, mult: 70, rest: 3 },   // 그 지역 쉼터 3단계부터
  { id: 'deep', name: '깊은 원정', min: 720, mult: 115, rest: 5 },   // 쉼터 5단계부터
];
// 개척지(야영지) 용병 쉼터: 파견 온 용병이 쉬고 회복한다. 그 지역으로 보낸 파견만 좋아진다
export const SHELTER = {
  max: 5,
  cost: (lv) => [9000, 24000, 60000, 135000, 270000][lv] ?? null,   // lv → lv+1
  stay: 0.15,   // 단계마다 머무는 시간(보상) +15%
  power: 0.1,   // 힘 +10%
  safe: 0.12,   // 죽을 확률 -12% (상대)
  loot: 0.2,    // 아이템 굴림 +20%
  mats: 0.2,    // 재료 +20%
  sta: 0.1,     // 체력 소모 -10%
  text: (lv) => lv ? `보상 +${Math.round(lv * 15)}% · 힘 +${lv * 10}% · 사망 -${lv * 12}% · 아이템 +${lv * 20}% · 재료 +${lv * 20}% · 체력 소모 -${lv * 10}%` : '없음',
};
// 연구: 단계마다 효과 · 금화 · 걸리는 시간(분)
// lab: 연구소 몇 단계에서 열리나 (단계가 오를수록 더 좋은 연구). 연구마다 최고 5단계
export const RESEARCH_MAX = 5;
export const RESEARCH = {
  potion: { lab: 1, name: '물약 정제', text: (lv) => `물약 회복량 +${lv * 10}%`, k: 0.1 },
  mats: { lab: 1, name: '채집 요령', text: (lv) => `재료 얻을 확률 +${lv * 10}%`, k: 0.1 },
  gold: { lab: 1, name: '흥정술', text: (lv) => `금화 획득 +${lv * 6}%`, k: 0.06 },
  bag: { lab: 1, name: '큰 배낭', text: (lv) => `가방 +${lv * 8}칸`, k: 0 },
  vault: { lab: 1, name: '큰 창고', text: (lv) => `창고 ${100 + lv * 20}칸`, k: 0 },
  merc: { lab: 2, name: '원정 지도', text: (lv) => `파견 시간 -${lv * 8}%`, k: 0.08 },
  herb: { lab: 3, name: '약초학', text: (lv) => `약초 생산 +${lv * 15}%`, k: 0.15 },
  mercPow: { lab: 3, name: '용병 훈련', text: (lv) => `파견 용병 힘 +${lv * 8}%`, k: 0.08 },
  luck: { lab: 4, name: '보물 감각', text: (lv) => `좋은 아이템 발견 +${lv * 8}%`, k: 8 },
  enh: { lab: 4, name: '장인의 손', text: (lv) => `강화 확률 +${lv * 2}%p`, k: 0.02 },
  exp: { lab: 5, name: '전장의 지혜', text: (lv) => `경험치 +${lv * 6}%`, k: 0.06 },
  shard: { lab: 5, name: '파편 감정', text: (lv) => `능력치 파편 나올 확률 +${lv * 20}%`, k: 0.2 },
  // v0.44.27 더한 연구
  mine: { lab: 2, name: '갱도 확장', text: (lv) => `광산 생산 +${lv * 10}%`, k: 0.1 },
  brew: { lab: 3, name: '숙련 공정', text: (lv) => `제작 시간 -${lv * 8}%`, k: 0.08 },
  ess: { lab: 6, name: '정수 응축', text: (lv) => `정수 얻을 확률 +${lv * 10}%`, k: 0.1 },
  oreUp: { lab: 7, name: '광맥 감별', text: (lv) => `광산 상위 강화석 확률 +${(lv * 0.3).toFixed(1)}%p`, k: 0.003 },
};
// 비싼 연구(늦게 열리는 것)일수록 금화 · 시간이 더 든다
// v0.44.27 재료도 든다: 지역 재료(가장 많은 것부터) + 연구소 4단계 연구부터 정수 (늦게 열리는 연구일수록 높은 정수)
export const researchCost = (lv, id) => {
  const L = RESEARCH[id]?.lab || 1, k = 1 + (L - 1) * 0.6;
  const ess = L >= 4 ? { id: L >= 8 ? 'ess4' : L >= 6 ? 'ess3' : 'ess2', n: 2 * (lv + 1) } : null;
  return { gold: Math.round(500 * (lv + 1) ** 2 * k), min: Math.round(20 * (lv + 1) ** 2 * k), mats: Math.round(8 * (lv + 1) * k), ess };
};
// 건물 단계마다 늘어나는 꾸밈 (상자 · 통 · 횃불 · 석상)
export const LEVEL_DECOR = [[], [], [['grassland', 96, 1.8, -1.2], ['ruins', 287, -1.8, -1.0]], [['dungeon', 167, 2.2, 1.6], ['dungeon', 167, -2.2, 1.6]], [['ruins', 241, -2.4, 0.4]], [['grassland', 98, 2.4, -0.4], ['ruins', 289, -2.6, -0.2]]];
// 일꾼: 광산 · 약초밭은 일꾼이 있어야 생산 (단계만큼 자리, 자리를 다 채우면 온전히)
export const workerCost = (n) => Math.round(300 * Math.pow(n + 1, 1.5));
export const WORKER_MAX = 12;
export const MERC_NAMES = ['브란', '셀마', '오덴', '이라', '케일', '도르', '미라', '하스', '유나', '바크'];
export const mercCost = (n) => 400 * Math.pow(2.5, n);

// 다음 단계로 올리는 데 필요한 각성 (최고 단계면 null)
export const upNeed = (type, lv) => BUILDINGS[type]?.up?.[lv - 1] ?? null;
