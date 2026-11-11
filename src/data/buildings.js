// 마을 건물. 빈터(PLOTS)에 짓고, 금화로 단계를 올린다. 생산은 실제 시간으로 흐른다 (꺼 둔 동안에도)
export const PLOTS = [
  { id: 'p1', x: -14, z: 8, name: '서쪽 빈터' },
  { id: 'p2', x: 14, z: 8, name: '동쪽 빈터' },
  { id: 'p3', x: -8, z: 16, name: '남서 빈터' },
  { id: 'p4', x: 9, z: 16, name: '남동 빈터' },
];

// cost(lv): 다음 단계 금화 · max: 최고 단계
export const BUILDINGS = {
  smithy: {
    name: '대장간', desc: '장비 강화 (+1 ~ +10)', max: 5, cost: (lv) => [300, 1200, 4000, 12000, 30000][lv] ?? null,
    // 단계마다 강화 상한
    cap: (lv) => [0, 4, 6, 8, 9, 10][lv],
    look: [['grassland', 103, 0, 0], ['grassland', 100, 1.6, 0.8], ['dungeon', 151, -1.4, 0.6]],
  },
  mine: {
    name: '광산', desc: '강화석 생산', max: 5, cost: (lv) => [200, 900, 3000, 9000, 24000][lv] ?? null,
    rate: (lv) => [0, 6, 12, 20, 32, 50][lv],      // 시간당 강화석
    store: (lv) => [0, 30, 60, 120, 200, 320][lv], // 쌓아 둘 수 있는 양
    look: [['cave', 130, 0, 0], ['cave', 131, 1.5, 0.4], ['cave', 151, -1.4, 0.6]],
  },
  herb: {
    name: '약초밭', desc: '물약 생산', max: 5, cost: (lv) => [150, 700, 2500, 8000, 20000][lv] ?? null,
    rate: (lv) => [0, 4, 7, 11, 16, 24][lv],
    store: (lv) => [0, 20, 40, 70, 110, 160][lv],
    look: [['grassland', 120, -1, 0], ['grassland', 121, 0.4, 0.6], ['grassland', 122, 1.4, -0.2], ['grassland', 123, -0.2, -0.9]],
  },
  inn: {
    name: '여관', desc: '용병 고용 · 사냥 파견', max: 5, cost: (lv) => [500, 2000, 6000, 16000, 40000][lv] ?? null,
    slots: (lv) => [0, 1, 2, 3, 4, 5][lv],      // 용병 수
    look: [['grassland', 296, -7, 1]],
  },
};

// 강화: +n 확률 · 금화 · 강화석
export const ENHANCE = {
  chance: (n) => [1, 1, 1, 0.9, 0.8, 0.7, 0.55, 0.45, 0.35, 0.25][n] ?? 0.2,   // n → n+1
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
export const MERC_NAMES = ['브란', '셀마', '오덴', '이라', '케일', '도르', '미라', '하스', '유나', '바크'];
export const mercCost = (n) => 400 * Math.pow(2.5, n);
