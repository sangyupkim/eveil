// v0.47 던전 변이: 던전 · 숨은 던전에 들어가면 무작위로 붙는다 (들어간 뒤 보고 시작). 하나마다 보상이 오른다.
// group: 같은 무리(time · elem)는 하나만
export const MUTS = {
  collapse: { name: '무너지는 던전', text: '5분 안에 주인을 잡아야 합니다', group: 'time' },
  frozen: { name: '얼어붙은 던전', text: '이동 속도 -20% · 몬스터가 냉기 피해를 50% 덜 받음', group: 'elem' },
  burning: { name: '불타는 던전', text: '3초마다 최대 체력 1.5% 화상 · 몬스터가 화염 피해를 50% 덜 받음', group: 'elem' },
  storm: { name: '폭풍 치는 던전', text: '가끔 발밑에 낙뢰 · 몬스터가 번개 피해를 50% 덜 받음', group: 'elem' },
  frenzy: { name: '광포한 던전', text: '몬스터 이동 · 공격이 빠름' },
  split: { name: '분열하는 던전', text: '몬스터가 죽으면 둘로 나뉨' },
  burst: { name: '폭발하는 던전', text: '몬스터가 죽으면 잠시 뒤 둘레가 터짐' },
  hard: { name: '단단한 던전', text: '몬스터 물리 저항 +30%' },
  ward: { name: '마력 깃든 던전', text: '몬스터 마법 저항 +30%' },
  elite: { name: '정예의 던전', text: '정예 몬스터 2배' },
  dark: { name: '어두운 던전', text: '시야가 어두움' },
  wound: { name: '상처 입는 던전', text: '모든 체력 회복 -50%' },
  drain: { name: '마력이 마른 던전', text: '마나 회복 -50%' },
  slowcd: { name: '시간이 뒤틀린 던전', text: '스킬 재사용 시간 +30%' },
};
export const MUT_IDS = Object.keys(MUTS);
export const COLLAPSE_SEC = 300;
// 몬스터 몸에 붙는 변이 (범람 몬스터 특성과 같은 이름)
export const MUT_AFFIX = ['frenzy', 'split', 'burst', 'hard', 'ward'];
// 원소 변이 → 피해를 덜 받는 스킬 계열
export const MUT_RESIST = { frozen: 'frost', burning: 'fire', storm: 'storm' };

// 변이 수: 기존 던전 보통 0~1 · 강화 1 · 극한 2, 숨은 던전 기본 · +1 1 · +2 · +3 2 · +4 3 · +5 4
export function mutCount({ hidden = false, plus = 0, diff = 1 }, rng = Math.random) {
  if (hidden) return [1, 1, 2, 2, 3, 4][Math.min(5, plus)] || 1;
  return diff >= 3 ? 2 : diff === 2 ? 1 : rng() < 0.5 ? 1 : 0;
}
export function rollMuts(n, rng = Math.random) {
  const out = [], pool = [...MUT_IDS];
  while (out.length < n && pool.length) {
    const id = pool.splice(Math.floor(rng() * pool.length), 1)[0], g = MUTS[id].group;
    if (g && out.some((x) => MUTS[x].group === g)) continue;
    out.push(id);
  }
  return out;
}
// 변이 하나마다 보상: 장비 레벨 +2 · 전설 ×1.15 · 금화 · 보석 +20%
export const mutBonus = (n) => ({ lv: 2 * n, legend: 1.15 ** n, gold: 1 + 0.2 * n });
