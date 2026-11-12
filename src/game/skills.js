// 스킬 습득(스킬북)과 숙련(쓸수록 강해짐).
import { CONFIG } from '../data/config.js';
import { SKILLS } from '../data/skills.js';

export const skillExpNeeded = (rank) => Math.floor(15 * Math.pow(1.55, rank - 1));

export function meetsReq(st, req, stats = st.stats) {
  if (!req) return true;
  for (const k in req) if ((stats[k] || 0) < req[k]) return false;
  return true;
}

export function canLearn(st, id, stats) {
  const sk = SKILLS[id];
  if (!sk) return { ok: false, why: '알 수 없는 스킬' };
  if (st.skills[id]) return { ok: false, why: '이미 배운 스킬', known: true };
  if (!meetsReq(st, sk.req, stats)) return { ok: false, why: '스탯 조건 부족' };
  return { ok: true };
}

export function learn(st, id) {
  st.skills[id] = { rank: 1, exp: 0 };
  const empty = st.quick.indexOf(null);
  if (empty >= 0) st.quick[empty] = id;
}

// 숙련 EXP를 더하고 오른 랭크 수를 돌려준다
export function addSkillExp(st, id, amount) {
  const s = st.skills[id];
  if (!s || !(amount > 0)) return 0;
  let ups = 0;
  if (s.rank >= CONFIG.skillMaxRank) return 0;
  s.exp += amount;
  while (s.rank < CONFIG.skillMaxRank && s.exp >= skillExpNeeded(s.rank)) {
    s.exp -= skillExpNeeded(s.rank);
    s.rank++;
    ups++;
  }
  if (s.rank >= CONFIG.skillMaxRank) s.exp = 0;
  return ups;
}

// 이미 아는 스킬의 책은 숙련 EXP로 흡수
export const bookAbsorbExp = (id) => 25 * SKILLS[id].tier;

// 스킬 변형: 숙련 랭크 3 · 5에서 하나씩 고른다
export const VARIANTS = {
  power: { name: '강하게', text: '피해 +25% · MP +15%' },
  quick: { name: '빠르게', text: '재사용 -25%' },
  wide: { name: '넓게', text: '범위 +30% · 화살 · 튕김 +2' },
  chill: { name: '얼리기', text: '맞은 적 2초 느리게' },
};
export const variantSlots = (rank) => (rank >= 5 ? 2 : rank >= 3 ? 1 : 0);
export function skillValues(id, rank, vars = []) {
  const sk = SKILLS[id];
  const p = vars.includes('power'), q = vars.includes('quick');
  return {
    power: (sk.power + sk.perRank * (rank - 1)) * (p ? 1.25 : 1),
    mp: Math.round(sk.mp * (1 + 0.05 * (rank - 1)) * (p ? 1.15 : 1)),
    cd: sk.cd * (1 - 0.02 * (rank - 1)) * (q ? 0.75 : 1),
  };
}
// 변형을 반영한 스킬 정의 (범위 · 화살 수 · 느리게)
export function skillEff(id, vars = []) {
  const sk = SKILLS[id];
  if (!vars.length) return sk;
  const o = { ...sk };
  if (vars.includes('wide')) {
    for (const k of ['radius', 'width']) if (o[k]) o[k] *= 1.3;
    if (o.range) o.range *= 1.15;
    for (const k of ['count', 'jumps']) if (o[k]) o[k] += 2;
    if (o.waves) o.waves += 1;
  }
  if (vars.includes('chill')) o.slow = Math.max(o.slow || 0, 2);
  return o;
}
