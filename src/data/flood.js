// v0.44.43 범람지: 보스를 잡은 지역 중 3일 넘게 사냥하지 않은 곳에 몬스터가 넘친다 (docs/콘텐츠기획_범람_탐사_비전.md 1장)
export const FLOOD = {
  idleMs: 3 * 86400e3,   // 이만큼 사냥하지 않은 지역이 대상
  everyMs: 3 * 86400e3,  // 이 간격으로 하나씩 늘어난다
  max: 5,
  minCleared: 3,         // 보스를 잡은 지역이 이만큼 있어야 시작
  levelK: 1.2,           // 난이도: 보스를 잡은 지역 중 가장 높은 위험도 × 이 값
  mobK: 2,               // 들어가면 나오는 범람 몬스터 수 = 그 지역 필드 몬스터 수 × 이 값 (+ 정예 · 네임드 · 범람 보스)
  bossHp: 2,
};
// 범람 접사 (일반 1개 · 정예 2개)
export const FLOOD_AFFIX = {
  frenzy: { name: '광포', text: '이동 · 공격이 빠르다' },
  hard: { name: '단단함', text: '물리 저항 +30%' },
  ward: { name: '마력 갑옷', text: '마법 저항 +30%' },
  burst: { name: '폭발', text: '죽으면 잠시 뒤 둘레가 터진다' },
  split: { name: '분열', text: '죽으면 둘로 나뉜다' },
  reflect: { name: '반사', text: '받은 피해의 10%를 되돌린다' },
  shield: { name: '보호막', text: '체력이 절반 아래로 떨어지면 한 번 보호막' },
};
export const FLOOD_AFFIX_IDS = Object.keys(FLOOD_AFFIX);
// 범람지 수 n에 따른 불이익
export function floodPenalty(st) {
  const n = st?.flood?.list?.length || 0;
  return {
    n,
    prod: 1 - Math.min(0.4, 0.1 * n),          // 광산 · 약초밭 생산
    death: n >= 2 ? 1 + 0.15 * (n - 1) : 1,    // 파견 사망 확률
    loot: n >= 4 ? 0.8 : 1,                    // 파견 보상
    recruits: n >= 3 ? 1 : 0,                  // 여관에 찾아오는 용병 -
    brew: n >= 5 ? 1.25 : 1,                   // 제작 시간
  };
}
export const floodText = (p) => [p.prod < 1 && `생산 -${Math.round((1 - p.prod) * 100)}%`, p.death > 1 && `파견 사망 +${Math.round((p.death - 1) * 100)}%`, p.recruits && '찾아오는 용병 -1', p.loot < 1 && '파견 보상 -20%', p.brew > 1 && '제작 시간 +25%'].filter(Boolean).join(' · ');
