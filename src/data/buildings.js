// 마을 건물. 빈터(PLOTS)에 짓고, 금화로 단계를 올린다. 생산은 실제 시간으로 흐른다 (꺼 둔 동안에도)
// 집터 7곳: 마을 가운데(차원문 · NPC)를 둘러싼 고리 (반지름 20, 건물 하나가 가로 약 9칸)
export const PLOTS = [
  { id: 'p1', x: 0.0, z: -18.0, name: '북쪽 집터' },
  { id: 'p2', x: 15.6, z: -11.2, name: '북동쪽 집터' },
  { id: 'p3', x: 19.5, z: 4.0, name: '동쪽 집터' },
  { id: 'p4', x: 8.7, z: 16.2, name: '남동쪽 집터' },
  { id: 'p5', x: -8.7, z: 16.2, name: '남서쪽 집터' },
  { id: 'p6', x: -19.5, z: 4.0, name: '서쪽 집터' },
  { id: 'p7', x: -15.6, z: -11.2, name: '북서쪽 집터' },
];

// cost(lv): 다음 단계 금화 · max: 최고 단계 · need: 짓는 데 필요한 각성 · up: 2~5단계로 올리는 데 필요한 각성
export const BUILDINGS = {
  smithy: {
    name: '대장간', up: [5, 15, 30, 50], need: 0, desc: '장비 강화 (+1 ~ +10)', max: 5, cost: (lv) => [300, 1200, 4000, 12000, 30000][lv] ?? null,
    // 단계마다 강화 상한
    cap: (lv) => [0, 4, 6, 8, 9, 10][lv],
    look: [['grassland', 103, 0, 0], ['grassland', 100, 1.6, 0.8], ['dungeon', 151, -1.4, 0.6]],
  },
  mine: {
    name: '광산', up: [10, 22, 38, 55], need: 6, desc: '강화석 생산', max: 5, cost: (lv) => [200, 900, 3000, 9000, 24000][lv] ?? null,
    rate: (lv) => [0, 6, 12, 20, 32, 50][lv],      // 시간당 강화석
    store: (lv) => [0, 30, 60, 120, 200, 320][lv], // 쌓아 둘 수 있는 양
    look: [['cave', 130, 0, 0], ['cave', 131, 1.5, 0.4], ['cave', 151, -1.4, 0.6]],
  },
  herb: {
    name: '약초밭', up: [3, 10, 25, 45], need: 0, desc: '물약 생산', max: 5, cost: (lv) => [150, 700, 2500, 8000, 20000][lv] ?? null,
    rate: (lv) => [0, 4, 7, 11, 16, 24][lv],
    store: (lv) => [0, 20, 40, 70, 110, 160][lv],
    look: [['grassland', 120, -1, 0], ['grassland', 121, 0.4, 0.6], ['grassland', 122, 1.4, -0.2], ['grassland', 123, -0.2, -0.9]],
  },
  workshop: {
    name: '제작소', up: [15, 28, 42, 58], need: 10, desc: '지역 재료로 세트 장비 제작', max: 5, cost: (lv) => [400, 1500, 5000, 14000, 35000][lv] ?? null,
    zones: (lv) => [0, 2, 4, 6, 8, 12][lv], // 만들 수 있는 지역 수
    look: [['grassland', 100, 0, 0], ['grassland', 120, 1.4, 0.6]],
  },
  lab: {
    name: '연구소', up: [20, 32, 46, 60], need: 15, desc: '금화 · 시간으로 영구 능력', max: 5, cost: (lv) => [800, 3000, 9000, 22000, 50000][lv] ?? null,
    slots: (lv) => lv, // 연구 단계 상한
    look: [['ruins', 278, 0, 0], ['ruins', 279, 1.4, 0.4], ['ruins', 283, -1.2, 0.8]],
  },
  house: {
    name: '숙소', up: [8, 18, 32, 50], need: 3, desc: '용병이 묵는 곳 (고용 한도)', max: 5, cost: (lv) => [300, 1500, 5000, 14000, 32000][lv] ?? null,
    beds: (lv) => [0, 3, 5, 7, 10, 14][lv],
    look: [],
  },
  inn: {
    name: '여관', up: [8, 20, 35, 55], need: 3, desc: '매 시간 용병이 찾아옴 · 사냥 파견', max: 5, cost: (lv) => [500, 2000, 6000, 16000, 40000][lv] ?? null,
    slots: (lv) => [0, 1, 2, 3, 4, 5][lv],      // 용병 수
    look: [['grassland', 296, -7, 1]],
  },
};

// 강화: +n 확률 · 금화 · 강화석
export const ENHANCE = {
  chance: (n) => [1, 1, 0.9, 0.7, 0.5, 0.35, 0.25, 0.15, 0.1, 0.05][n] ?? 0.05,   // n → n+1 (+5 50%, +10 5%)
  gold: (n, ilvl) => Math.round((60 + ilvl * 15) * Math.pow(1.6, n)),
  ore: (n) => 3 + n * 3,
  power: 0.08, // 단계마다 피해 · 방어 +8%
};

// 용병 파견: 분 · 보상 배율
export const EXPEDITIONS = [
  { id: 'short', name: '짧은 사냥', min: 10, mult: 1 },
  { id: 'mid', name: '반나절 사냥', min: 60, mult: 7 },
  { id: 'long', name: '긴 원정', min: 240, mult: 32 },
];
// 연구: 단계마다 효과 · 금화 · 걸리는 시간(분)
export const RESEARCH = {
  potion: { name: '물약 정제', text: (lv) => `물약 회복량 +${lv * 10}%`, k: 0.1 },
  merc: { name: '원정 지도', text: (lv) => `원정 시간 -${lv * 8}%`, k: 0.08 },
  mats: { name: '채집 요령', text: (lv) => `재료 얻을 확률 +${lv * 10}%`, k: 0.1 },
  gold: { name: '흥정술', text: (lv) => `금화 획득 +${lv * 6}%`, k: 0.06 },
  bag: { name: '큰 배낭', text: (lv) => `가방 +${lv * 8}칸`, k: 0 },
};
export const researchCost = (lv) => ({ gold: 500 * (lv + 1) ** 2, min: 20 * (lv + 1) ** 2 });
// 건물 단계마다 늘어나는 꾸밈 (상자 · 통 · 횃불 · 석상)
export const LEVEL_DECOR = [[], [], [['grassland', 96, 1.8, -1.2], ['ruins', 287, -1.8, -1.0]], [['dungeon', 167, 2.2, 1.6], ['dungeon', 167, -2.2, 1.6]], [['ruins', 241, 0, -2.2]], [['grassland', 98, 2.4, -0.4], ['ruins', 289, -2.6, -0.2]]];
// 일꾼: 광산 · 약초밭은 일꾼이 있어야 생산 (단계만큼 자리, 자리를 다 채우면 온전히)
export const workerCost = (n) => Math.round(300 * Math.pow(n + 1, 1.5));
export const WORKER_MAX = 12;
export const MERC_NAMES = ['브란', '셀마', '오덴', '이라', '케일', '도르', '미라', '하스', '유나', '바크'];
export const mercCost = (n) => 400 * Math.pow(2.5, n);

// 다음 단계로 올리는 데 필요한 각성 (최고 단계면 null)
export const upNeed = (type, lv) => BUILDINGS[type]?.up?.[lv - 1] ?? null;
