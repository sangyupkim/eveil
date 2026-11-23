// 챕터(지역)별 난이도 보정: 몬스터 체력 · 공격 · 보스 체력 · 보스 공격 · 경험치 배율.
// tools/sim/calibrate.mjs가 목표(챕터 시간 · 처치 시간 · 버티는 시간 · 보스)에 맞춰 계산해 쓴 값. 손으로 고치지 말고 목표를 고쳐 다시 돌린다.
export const CHAPTER = [
  { hp: 0.88, dmg: 2.06, boss: 0.95, bossDmg: 0.6, exp: 0.17 }, // 1 푸리에 들판
  { hp: 0.49, dmg: 0.69, boss: 0.94, bossDmg: 1.27, exp: 0.11 }, // 2 썩은 숲
  { hp: 0.86, dmg: 1.21, boss: 1.8, bossDmg: 1.16, exp: 0.14 }, // 3 망자의 묘지
  { hp: 0.91, dmg: 1.44, boss: 0.76, bossDmg: 0.61, exp: 0.14 }, // 4 무너진 성채
  { hp: 1.11, dmg: 1.03, boss: 0.91, bossDmg: 0.87, exp: 0.19 }, // 5 안개 늪
  { hp: 1.39, dmg: 1.6, boss: 0.69, bossDmg: 0.44, exp: 0.27 }, // 6 서리 고원
  { hp: 1.6, dmg: 1.84, boss: 0.56, bossDmg: 0.41, exp: 0.38 }, // 7 고대 협곡
  { hp: 1.28, dmg: 1.43, boss: 0.66, bossDmg: 0.42, exp: 0.61 }, // 8 화염 균열
  { hp: 2.24, dmg: 1.37, boss: 0.39, bossDmg: 0.49, exp: 1.27 }, // 9 오크 요새
  { hp: 3.05, dmg: 1.5, boss: 0.31, bossDmg: 0.4, exp: 2.25 }, // 10 거미줄 숲
  { hp: 3, dmg: 1.47, boss: 0.39, bossDmg: 0.43, exp: 3.08 }, // 11 망령의 항구
  { hp: 2.76, dmg: 1.7, boss: 0.41, bossDmg: 0.34, exp: 4.03 }, // 12 악마의 관문
  { hp: 3.31, dmg: 2.1, boss: 0.41, bossDmg: 0.33, exp: 5.76 }, // 13 잿빛 황무지
  { hp: 6.32, dmg: 3.34, boss: 0.27, bossDmg: 0.26, exp: 8.91 }, // 14 얼어붙은 묘역
  { hp: 7.77, dmg: 4.83, boss: 0.29, bossDmg: 0.25, exp: 13.03 }, // 15 수정 동굴
  { hp: 19.3, dmg: 10.78, boss: 0.65, bossDmg: 0.45, exp: 25.51 }, // 16 피의 늪
  { hp: 11.15, dmg: 6.71, boss: 0.82, bossDmg: 0.62, exp: 19.76 }, // 17 천둥 고원
  { hp: 9.1, dmg: 5.18, boss: 0.38, bossDmg: 0.38, exp: 16.55 }, // 18 망각의 사원
  { hp: 8.76, dmg: 4.98, boss: 0.52, bossDmg: 0.43, exp: 18.9 }, // 19 심연의 균열 (v0.49.74 손으로: 각성 1당 처치가 앞 지역보다 줄던 것 → 끝 약 950)
  { hp: 7.32, dmg: 4.92, boss: 0.35, bossDmg: 0.3, exp: 20.7 }, // 20 종말의 왕좌 (v0.49.74 손으로: 끝 약 1,000)
];
export const chapterK = (zi, tier = 'normal') => {
  const c = CHAPTER[zi] || {};
  return { hp: (c.hp || 1) * (tier === 'boss' ? c.boss || 1 : 1), dmg: (c.dmg || 1) * (tier === 'boss' ? c.bossDmg || 1 : 1), exp: c.exp || 1 };
};
