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

export function skillValues(id, rank) {
  const sk = SKILLS[id];
  return {
    power: sk.power + sk.perRank * (rank - 1),
    mp: Math.round(sk.mp * (1 + 0.05 * (rank - 1))),
    cd: sk.cd * (1 - 0.02 * (rank - 1)),
  };
}
