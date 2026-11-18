// v0.48 강화 몬스터: 세계 난이도가 높을수록 · 던전이 어려울수록 능력이 붙은 몬스터가 자주 나온다 (디아블로 「강화 몬스터」처럼)
// 범람 몬스터 특성(frenzy · hard · ward · burst · split · reflect · shield)도 같은 이름으로 함께 쓴다
export const CHAMP = {
  frenzy: { name: '광포', text: '이동 · 공격이 빠르다' },
  hard: { name: '돌 피부', text: '물리 저항 +30%' },
  ward: { name: '마력 갑옷', text: '마법 저항 +30%' },
  burst: { name: '폭발', text: '죽으면 잠시 뒤 둘레가 터진다' },
  split: { name: '분열', text: '죽으면 둘로 나뉜다' },
  reflect: { name: '반사', text: '받은 피해의 일부를 되돌린다' },
  shield: { name: '보호막', text: '체력이 절반 아래로 떨어지면 한 번 보호막' },
  fire: { name: '화염 강화', text: '맞으면 3초 동안 화상' },
  cold: { name: '냉기 강화', text: '맞으면 2초 동안 느려짐' },
  shock: { name: '전기', text: '때리면 가끔 번개가 되돌아온다' },
  vamp: { name: '흡혈', text: '준 피해의 30%만큼 회복' },
  manaburn: { name: '마나 태우기', text: '맞으면 마나를 잃는다' },
  strong: { name: '괴력', text: '공격력 +40%' },
  giant: { name: '거대', text: '체력 +80% · 몸집이 크다' },
  teleport: { name: '순간이동', text: '멀어지면 곁으로 순간이동' },
  jailer: { name: '속박', text: '가끔 잠시 묶는다' },
  curse: { name: '저주', text: '맞으면 4초 동안 받는 피해 +20%' },
  horde: { name: '무리', text: '졸개를 거느린다' },
};
export const CHAMP_IDS = Object.keys(CHAMP);
// 난이도 단계 r (0 ~ 5): 필드 = 세계 단계 - 1, 던전은 난이도 · 숨은 던전 강화만큼 더한다
// 일반: 확률 · 능력 수 / 정예: 확률 · 능력 수 / 보스 · 네임드: 확률 · 능력 수
export const CHAMP_RATE = {
  normal: { p: [0.03, 0.07, 0.12, 0.18, 0.24, 0.3], n: [1, 1, 1, 2, 2, 2] },
  elite: { p: [0.5, 0.8, 1, 1, 1, 1], n: [1, 1, 2, 2, 3, 3] },
  boss: { p: [0, 0.5, 1, 1, 1, 1], n: [0, 1, 1, 2, 2, 3] },
};
export function rollChamp(tier, r, rng = Math.random) {
  const T = CHAMP_RATE[tier === 'named' ? 'boss' : tier] || CHAMP_RATE.normal, k = Math.max(0, Math.min(5, r));
  if (rng() >= T.p[k]) return [];
  const pool = [...CHAMP_IDS], out = [];
  while (out.length < T.n[k] && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}
