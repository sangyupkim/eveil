// v0.44.43 범람지: 보스를 잡은 지역 중 3일 넘게 사냥하지 않은 곳에 몬스터가 넘친다 (docs/콘텐츠기획_범람_탐사_비전.md 1장)
import { relicBonus } from './relics.js';
export const FLOOD = {
  idleMs: 1 * 86400e3,   // 이만큼 사냥하지 않은 지역을 먼저 고른다 (없으면 아무 지역)
  hourKST: 19,           // 매일 이 시각(한국 시간 저녁 7시)에 하나씩 늘어난다 — 일일 숙제처럼
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
  const n0 = st?.flood?.list?.length || 0, n = n0 * (1 - relicBonus(st, 'calm') / 100); // v0.44.51 정화의 성수
  return {
    n: n0,
    prod: 1 - Math.min(0.4, 0.1 * n),          // 광산 · 약초밭 생산
    death: n >= 2 ? 1 + 0.15 * (n - 1) : 1,    // 파견 사망 확률
    loot: n >= 4 ? 0.8 : 1,                    // 파견 보상
    recruits: n >= 3 ? 1 : 0,                  // 여관에 찾아오는 용병 -
    brew: n >= 5 ? 1.25 : 1,                   // 제작 시간
  };
}
export const floodText = (p) => [p.prod < 1 && `생산 -${Math.round((1 - p.prod) * 100)}%`, p.death > 1 && `파견 사망 +${Math.round((p.death - 1) * 100)}%`, p.recruits && '찾아오는 용병 -1', p.loot < 1 && '파견 보상 -20%', p.brew > 1 && '제작 시간 +25%'].filter(Boolean).join(' · ');

// 다음 범람 시각: 한국 시간 저녁 7시 (지금 이후 가장 가까운)
export function nextFloodAt(now = Date.now()) {
  const k = 9 * 3600e3, d = new Date(now + k); d.setUTCHours(FLOOD.hourKST, 0, 0, 0);
  let t = d.getTime() - k; if (t <= now) t += 86400e3; return t;
}
