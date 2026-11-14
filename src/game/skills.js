// 스킬 습득(스킬북)과 숙련(쓸수록 강해짐).
import { CONFIG } from '../data/config.js';
import { SKILLS } from '../data/skills.js';

// 랭크 제한 없음. 10까지는 빠르게, 그 뒤 완만히, 50을 넘으면 가파르게
export const skillExpNeeded = (rank) => Math.floor(15 * Math.pow(1.55, Math.min(rank, 10) - 1) * (rank > 10 ? 1 + 0.15 * (rank - 10) : 1) * (rank > 50 ? Math.pow(1.07, rank - 50) : 1));

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
  s.exp += amount;
  while (s.exp >= skillExpNeeded(s.rank)) {
    s.exp -= skillExpNeeded(s.rank);
    s.rank++;
    ups++;
  }
  return ups;
}

// 이미 아는 스킬의 책은 숙련 EXP로 흡수
export const bookAbsorbExp = (id) => 25 * SKILLS[id].tier;

// ── 스킬 변형: 랭크 25 · 50에서 하나씩 고른다 (s.mod = { 25: key, 50: key }) ──
// 효과 종류. 스킬마다 종류 풀에서 네 개를 골라 25 · 50에 둘씩 내놓고, 이름은 스킬 속성에 맞춘다
const MECH = {
  power: '피해 +40%', quick: '재사용 -35%', wide: '범위 +40% · 수 +2', chill: '맞은 적 3초 느리게',
  echo: '0.6초 뒤 한 번 더 · 위력 60%', frugal: 'MP -45%', long: '지속 +60%', fierce: '피해 +25% · 재사용 -15%',
};
const POOL = {
  melee: ['power', 'echo', 'chill', 'quick', 'frugal', 'fierce'], bolt: ['wide', 'echo', 'power', 'chill', 'quick', 'frugal'],
  arrow: ['wide', 'echo', 'power', 'chill', 'quick', 'fierce'], line: ['wide', 'power', 'echo', 'chill', 'frugal', 'fierce'],
  spin: ['wide', 'power', 'chill', 'echo', 'quick', 'fierce'], nova: ['wide', 'power', 'chill', 'echo', 'frugal', 'quick'],
  cone: ['wide', 'power', 'chill', 'echo', 'fierce', 'frugal'], cleave: ['wide', 'power', 'echo', 'chill', 'quick', 'fierce'],
  chain: ['wide', 'power', 'echo', 'chill', 'frugal', 'quick'], meteor: ['wide', 'echo', 'power', 'quick', 'chill', 'fierce'],
  rain: ['wide', 'echo', 'power', 'quick', 'chill', 'frugal'], dash: ['power', 'quick', 'wide', 'echo', 'fierce', 'chill'],
  buff: ['long', 'quick', 'frugal', 'power', 'fierce', 'echo'].filter((k) => k !== 'echo'),
};
// 속성별 이름
const ELEM = (sk) => ({ fire: 'fire', frost: 'frost', storm: 'lightning', holy: 'holy', bow: 'bow', guard: 'guard', trick: 'trick' })[sk.school] || ({ fire: 'fire', fireball: 'fire', ice: 'frost' })[sk.fx] || 'none';
const NAMES = {
  fire: { power: '업화', quick: '불티', wide: '들불', chill: '그을음', echo: '잔불', frugal: '불씨 아끼기', long: '꺼지지 않는 불', fierce: '화염 폭주' },
  frost: { power: '혹한', quick: '서릿발', wide: '눈보라', chill: '동상', echo: '얼음 메아리', frugal: '찬 숨', long: '만년설', fierce: '빙결 폭주' },
  lightning: { power: '뇌전', quick: '번쩍임', wide: '뇌우', chill: '마비', echo: '되치는 번개', frugal: '정전기', long: '폭풍 전야', fierce: '천둥 폭주' },
  holy: { power: '심판', quick: '기도', wide: '광휘', chill: '속박의 빛', echo: '찬송', frugal: '절제', long: '서약', fierce: '성전' },
  bow: { power: '관통상', quick: '속사', wide: '화살 비', chill: '다리 쏘기', echo: '두 번째 시위', frugal: '화살 아끼기', long: '매의 눈', fierce: '사냥꾼의 분노' },
  guard: { power: '방패 강타', quick: '철벽 자세', wide: '진형', chill: '짓누르기', echo: '반격', frugal: '버팀목', long: '불굴', fierce: '수호자의 분노' },
  trick: { power: '급소', quick: '그림자 걸음', wide: '연막', chill: '독', echo: '잔상', frugal: '잔꾀', long: '잠복', fierce: '암살' },
  none: { power: '일격', quick: '날렵함', wide: '휩쓸기', chill: '발목 베기', echo: '연격', frugal: '숨 고르기', long: '버티기', fierce: '광포' },
};
const hash = (str) => { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
// 스킬 하나의 변형 후보: { 25: [{key,name,text}, …2], 50: [… 2] }
export function variantsOf(id) {
  const sk = SKILLS[id], pool = [...(POOL[sk.type] || POOL.melee)];
  let h = hash(id);
  const pick = [];
  while (pick.length < 4 && pool.length) { pick.push(pool.splice(h % pool.length, 1)[0]); h = Math.floor(h / 7) + 13; }
  const nm = NAMES[ELEM(sk)];
  const mk = (k) => ({ key: k, name: `${sk.name}: ${nm[k]}`, text: MECH[k] });
  return { 25: pick.slice(0, 2).map(mk), 50: pick.slice(2, 4).map(mk) };
}
export const VARIANT_RANKS = [25, 50];
export const modsOf = (s) => Object.values(s?.mod || {});
// 랭크 효과: 10까지는 랭크마다 가득, 그 뒤는 절반씩
const eff = (rank) => Math.min(rank, 10) - 1 + 0.5 * Math.max(0, rank - 10);
// 주문 계수: 위력 28(재사용 3초급) = 평타 2배. 재사용이 짧은(3초 미만) 주문은 연타할 수 있어 조금 낮춘다
export const SPELL_K = 2 / 3, SPELL_REF = 28; // 0.34.2: 플레이해 보니 너무 세서 1/3로
export const isSpell = (sk) => sk.ap === 'int' && sk.type !== 'buff';
export const spellCoef = (raw, cd) => SPELL_K * Math.pow(Math.max(0, raw) / SPELL_REF, 0.6) * Math.min(1, 0.75 + 0.1 * cd);
export const weaponCoef = (raw, cd) => SPELL_K * (Math.max(0, raw) / 1.8) * Math.min(1, 0.75 + 0.1 * cd);
const multiDiv = (sk) => [sk.waves, sk.count, sk.hits].reduce((a, n) => a * ((n || 1) > 1 ? n * 0.5 : 1), 1);
export function skillValues(id, rank, vars = []) {
  const sk = SKILLS[id];
  const p = vars.includes('power'), q = vars.includes('quick'), f = vars.includes('fierce'), fr = vars.includes('frugal');
  const raw = (sk.power + sk.perRank * eff(rank)) * (p ? 1.4 : 1) * (f ? 1.25 : 1);
  return {
    // 주문(지능 공격 스킬)은 「평타 피해 × 계수」: 무기가 좋아지면 함께 커지고, 큰 위력 · 랭크는 0.6제곱으로 눌러 지나치게 세지지 않는다
    // 공격 스킬은 모두 같은 식 (0.34.3~): 평타 × 계수. 주문은 위력을 0.6제곱으로 누르고, 검 · 활은 무기 배율(1.8 = 주문 위력 28급)을
    // 같은 계수로 맞춘다. 재사용 3초 미만은 감쇠. 여러 번 내리는 주문은 한 번당 계수를 (횟수 × 0.5)로 나눈다 (검 · 활 연타 스킬은 원래 한 번당 위력이 작게 짜여 있어 나누지 않는다)
    power: sk.type === 'buff' ? raw : isSpell(sk) ? spellCoef(raw, sk.cd) / multiDiv(sk) : weaponCoef(raw, sk.cd),
    mp: Math.round(sk.mp * (1 + 0.05 * Math.min(rank - 1, 9) + 0.01 * Math.max(0, rank - 10)) * (fr ? 0.55 : 1)),
    cd: sk.cd * (1 - 0.02 * Math.min(rank - 1, 15)) * (q ? 0.65 : 1) * (f ? 0.85 : 1),
  };
}
// 변형을 반영한 스킬 정의 (범위 · 수 · 느리게 · 지속 · 메아리)
export function skillEff(id, vars = []) {
  const sk = SKILLS[id];
  if (!vars.length) return sk;
  const o = { ...sk };
  if (vars.includes('wide')) {
    for (const k of ['radius', 'width']) if (o[k]) o[k] *= 1.4;
    if (o.range) o.range *= 1.15;
    for (const k of ['count', 'jumps']) if (o[k]) o[k] += 2;
    if (o.waves) o.waves += 1;
  }
  if (vars.includes('chill')) o.slow = Math.max(o.slow || 0, 3);
  if (vars.includes('long') && o.duration) o.duration *= 1.6;
  if (vars.includes('echo')) o.echo = 0.6;
  return o;
}
