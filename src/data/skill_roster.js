// v0.50 스킬 정리 (docs/기획_밸런스_v0.50.md 1장): 스탯 갈래마다 1 ~ 5차 × 6개 = 30개
//   차수마다 하품 2(사냥기 1 · 보스기 1) · 중품 3(사냥기 · 보스기 · 보조기) · 상품 1(1 · 3차 사냥기, 2 · 4차 보스기, 5차 궁극기)
//   혼합(두 · 세 스탯)은 조합마다 3개 (낮은 · 중간 · 높은 차수). 빠지는 스킬은 같은 갈래 · 차수 · 역할 스킬로 옮기고 숙련을 합친다 (game/skills.js moveRetiredSkills).
//   위력은 차수 ×1.75씩 · 역할 · 등급으로 다시 계산한다 (랭크는 game/skills.js rankMul).
// 단검(dg_)은 민첩 근접 계열이라 따로 둔다 (그대로).
import { SKILLS, SKILL_MOVED } from './skills.js';
import { FORM_DEFS, formUser, formFits } from './skill_forms.js';
import { spellCoef, weaponCoef, MELEE_K, isSpell, isMelee } from '../game/skills.js';
import { STARTS } from './items.js';

export const LINES = ['str', 'dex', 'int', 'wis', 'vit'];
export const TIER_POW = [0, 1, 1.75, 3.06, 5.36, 9.38];
export const ROLE_K = { boss: 1.6, hunt: 0.7, util: 0.35 };
export const GRADE_K = { 1: 0.85, 2: 1, 3: 1.3 };
export const ROLE_NAMES = { boss: '보스기', hunt: '사냥기', util: '보조기' };
const BASE_PPS = 0.45; // 1차 하나 · 1랭크 · 초당 계수 — 예전 공식(랭크가 위력을 크게 올리던 것)과 각성 시점마다 비슷한 세기가 되게 (tools/sim 비교: 각성 70 · 150 · 500에서 예전과 ±10%)
const SINGLE_T = ['melee', 'dash', 'bolt', 'arrow', 'chain'], SINGLE_F = ['xslash', 'upper', 'thrust', 'blink', 'split', 'bounce'];
const isBuff = (s) => s.type === 'buff' || s.type === 'evade';
export const roleOf = (s) => s.role || (isBuff(s) ? 'util' : (s.form ? SINGLE_F.includes(s.form) : SINGLE_T.includes(s.type)) ? 'boss' : 'hunt');
const chasu = (s) => (s.awaken != null ? Math.max(1, Math.min(5, s.awaken)) : Math.max(1, Math.min(5, (s.tier || 1) - 1)));
const linesOf = (s) => s.lines || Object.keys(s.req || {});
const R = { 1: 40, 2: 100, 3: 220, 4: 400, 5: 650 }; // 차수별 필요 능력치 (awaken_skills.js와 같다)
const START_IDS = new Set(Object.values(STARTS).map((x) => x.book));

// 이 스킬이 한 번에 몇 번 맞히나 (위력을 나눠 맞춘다)
const units = (s) => (s.waves || 1) * (s.hits || 1);
const multiDiv = (sk) => [sk.waves, sk.count, sk.hits].reduce((a, n) => a * ((n || 1) > 1 ? n * 0.5 : 1), 1);
const coefOf = (s, raw) => (isSpell(s) ? spellCoef(raw, s.cd) / multiDiv(s) : weaponCoef(raw, s.cd) * (isMelee(s) ? MELEE_K : 1));
// 목표 계수(한 번 쓸 때 한 대상이 받는 합)에 맞는 power를 찾는다
function fitPower(s, target) {
  let lo = 0.01, hi = 5000;
  for (let i = 0; i < 60; i++) { const mid = Math.sqrt(lo * hi); if (coefOf(s, mid) * units(s) < target) lo = mid; else hi = mid; }
  return Math.round(Math.sqrt(lo * hi) * 100) / 100;
}
// 단일 · 광역 형상 바꾸기: 그 갈래에서 덜 쓴 형상 (보스기는 단일 기본 종류도 후보 — 위력은 어차피 다시 계산한다)
const SINGLE_TYPES = { melee: ['melee', 'dash'], bow: ['arrow', 'bolt', 'chain'], spell: ['bolt', 'chain'] };
function reform(s, want, used, avoid = new Set()) {
  const user = formUser(s);
  const forms = Object.keys(FORM_DEFS).filter((f) => formFits(f, user) && (want === 'boss' ? FORM_DEFS[f].shape === 'one' : FORM_DEFS[f].shape !== 'one'));
  const cand = [...forms.map((f) => ['f', f]), ...(want === 'boss' ? (SINGLE_TYPES[user] || []).map((t) => ['t', t]) : [])].filter(([, v]) => !avoid.has(v));
  cand.sort((a, b) => (used[a[1]] || 0) - (used[b[1]] || 0));
  const [k, v] = cand[0] || []; if (!v) return;
  used[v] = (used[v] || 0) + 1;
  if (k === 'f') { s.form = v; s.desc = FORM_DEFS[v].desc; }
  else { delete s.form; s.type = v; s.desc = { melee: '한 대상에 온 힘을 실어 내려친다', dash: '대상에게 달려들어 벤다', arrow: '대상을 정확히 꿰뚫는다', bolt: '대상에게 큰 한 발을 날린다', chain: '대상에서 가까운 적으로 이어 튄다' }[v]; if (v === 'chain') s.jumps = s.jumps || 2; if (user === 'bow' && v !== 'arrow') s.needs = 'bow'; }
}
const shapeKey = (s) => s.form || 'T:' + s.type;

export const ROSTER = {}; // id → { line, c, grade, role }
let built = false;
export function buildRoster() {
  if (built) return; built = true;
  const moved = {};
  const take = (id, line, c, grade, role) => { ROSTER[id] = { line, c, grade, role }; };
  const scoreKeep = (id) => (START_IDS.has(id) ? 1e6 : 0) + (SKILLS[id].awaken != null ? 1000 : 0) + (SKILLS[id].q || 2) * 10 + (SKILLS[id].power || 0) / 100;
  for (const line of LINES) {
    const used = {};
    // 후보: 단일 갈래 (단검 제외) + 이 갈래가 첫 스탯인 혼합 중 쓸 데 없는 것은 나중에
    const mine = Object.keys(SKILLS).filter((id) => { const s = SKILLS[id]; return !s.passive && !id.startsWith('dg_') && linesOf(s).length === 1 && linesOf(s)[0] === line; });
    const cells = {}; for (let c = 1; c <= 5; c++) cells[c] = { boss: [], hunt: [], util: [] };
    for (const id of mine) cells[chasu(SKILLS[id])][roleOf(SKILLS[id])].push(id);
    // 보조기: 갈래 전체에서 차수마다 하나씩 (남는 버프는 비어 있는 차수로 옮긴다)
    const utils = Object.values(cells).flatMap((x) => x.util).sort((a, b) => scoreKeep(b) - scoreKeep(a));
    for (let c = 1; c <= 5; c++) cells[c].util = [];
    for (let c = 1; c <= 5; c++) { const i = utils.findIndex((id) => chasu(SKILLS[id]) === c); if (i >= 0) cells[c].util.push(utils.splice(i, 1)[0]); }
    for (let c = 1; c <= 5; c++) if (!cells[c].util.length && utils.length) cells[c].util.push(utils.shift());
    // 칸마다 6개 채우기
    const spare = []; // 다른 차수에서 남은 공격 스킬 (모자란 칸에 빌려준다)
    const need = (c) => ({ boss: 2 + (c === 2 || c === 4 ? 1 : 0), hunt: 2 + (c === 1 || c === 3 || c === 5 ? 1 : 0), util: 1 });
    for (let c = 1; c <= 5; c++) {
      const C = cells[c], N = need(c);
      for (const r of ['boss', 'hunt']) C[r].sort((a, b) => scoreKeep(b) - scoreKeep(a));
      // 보조기가 없으면 남는 사냥기 하나를 제어형 보조기로 (낮은 위력 · 묶음)
      if (!C.util.length) { const h = C.hunt.length > N.hunt ? C.hunt.pop() : C.boss.length > N.boss ? C.boss.pop() : null; if (h) { C.util.push(h); SKILLS[h].role = 'util'; } }
      // 보스기가 모자라면 남는 사냥기를 단일 형상으로
      while (C.boss.length < N.boss && C.hunt.length > N.hunt) { const h = C.hunt.pop(); SKILLS[h].role = 'boss'; reform(SKILLS[h], 'boss', used, new Set([...C.boss, ...C.hunt].map((x) => shapeKey(SKILLS[x])).map((x) => x.replace('T:', '')))); C.boss.push(h); }
      while (C.hunt.length < N.hunt && C.boss.length > N.boss) { const b = C.boss.pop(); SKILLS[b].role = 'hunt'; reform(SKILLS[b], 'hunt', used, new Set([...C.boss, ...C.hunt].map((x) => shapeKey(SKILLS[x])))); C.hunt.push(b); }
      for (const r of ['boss', 'hunt']) while (C[r].length > N[r]) spare.push([c, r, C[r].pop()]);
    }
    // 모자란 칸은 가까운 차수의 남는 스킬로 (위력은 차수에 맞게 다시 계산되니 상관없다)
    for (let c = 1; c <= 5; c++) {
      const C = cells[c], N = need(c);
      for (const r of ['util', 'boss', 'hunt']) while (C[r].length < (N[r] || 0)) {
        spare.sort((a, b) => Math.abs(a[0] - c) - Math.abs(b[0] - c));
        const k = spare.findIndex((x) => x[1] === r || r !== 'util'); if (k < 0) break;
        const [, r0, id] = spare.splice(k, 1)[0];
        if (r0 !== r) { SKILLS[id].role = r; if (r !== 'util') reform(SKILLS[id], r, used, new Set([...C.boss, ...C.hunt].map((x) => shapeKey(SKILLS[x]).replace('T:', '')))); }
        C[r].push(id);
      }
    }
    // 등급 · 역할 붙이기, 남은 것은 옮기기
    for (let c = 1; c <= 5; c++) {
      const C = cells[c], top = c === 2 || c === 4 ? 'boss' : 'hunt';
      // 상품 = 대표 역할 중 가장 센 것, 하품 = 사냥 · 보스 중 약한 것 하나씩, 나머지 중품
            const byPow = (a, b) => (SKILLS[b].power || 0) - (SKILLS[a].power || 0);
      const st = START_IDS;
      const pool = C[top].filter((x) => !st.has(x)), sTop = (pool.length ? pool : C[top]).sort(byPow)[0];
      C[top] = C[top].filter((x) => x !== sTop);
      if (sTop) take(sTop, line, c, 3, top);
      for (const r of ['hunt', 'boss']) {
        C[r].sort((a, b) => (st.has(b) ? 1 : 0) - (st.has(a) ? 1 : 0) || (SKILLS[a].power || 0) - (SKILLS[b].power || 0));
        const low = C[r].shift(); if (low) take(low, line, c, 1, r);
        for (const id of C[r]) take(id, line, c, 2, r);
      }
      for (const id of C.util) take(id, line, c, 2, 'util');
    }
    for (const [, r, id] of spare) moved[id] = { line, r };
    for (const id of utils) moved[id] = { line, r: 'util' };
  }
  // 혼합: 조합(두 스탯)마다 3개 — 낮은(1 · 2차) · 중간(3차) · 높은(4 · 5차). 세 스탯은 앞 두 스탯 조합으로
  const mix = Object.keys(SKILLS).filter((id) => { const s = SKILLS[id]; return !s.passive && linesOf(s).length >= 2; });
  const byPair = {};
  for (const id of mix) { const L = linesOf(SKILLS[id]), key = [L[0], L[1]].sort((a, b) => LINES.indexOf(a) - LINES.indexOf(b)).join('+'); (byPair[key] ||= []).push(id); }
  for (const [key, ids] of Object.entries(byPair)) {
    const band = (id) => { const c = chasu(SKILLS[id]); return c <= 2 ? 0 : c === 3 ? 1 : 2; };
    const kept = [];
    for (const b of [0, 1, 2]) { const inB = ids.filter((id) => band(id) === b && linesOf(SKILLS[id]).length === 2).sort((x, y) => scoreKeep(y) - scoreKeep(x)); const k = inB[0] || ids.filter((id) => band(id) === b).sort((x, y) => scoreKeep(y) - scoreKeep(x))[0]; if (k && !kept.includes(k)) kept.push(k); }
    for (const id of kept) { const s = SKILLS[id]; take(id, key, chasu(s), 2, roleOf(s)); ROSTER[id].mix = true; }
    for (const id of ids) if (!kept.includes(id)) moved[id] = { line: key, r: roleOf(SKILLS[id]), mixKeep: kept };
  }
  // 옮기기: 같은 갈래(조합) · 같은 역할 · 가장 가까운 차수
  for (const [id, m] of Object.entries(moved)) {
    if (ROSTER[id]) continue;
    const c0 = chasu(SKILLS[id]);
    const cands = Object.entries(ROSTER).filter(([, r]) => r.line === m.line).sort((a, b) => (a[1].role === m.r ? 0 : 10) - (b[1].role === m.r ? 0 : 10) || Math.abs(a[1].c - c0) - Math.abs(b[1].c - c0));
    if (cands[0]) { SKILL_MOVED[id] = cands[0][0]; delete SKILLS[id]; }
  }
  for (const k in SKILL_MOVED) { let v = SKILL_MOVED[k], n = 0; while (SKILL_MOVED[v] && n++ < 20) v = SKILL_MOVED[v]; SKILL_MOVED[k] = v; }
  // 같은 갈래 · 같은 차수 안에서 형상이 겹치면 등급이 낮은 쪽을 바꾼다
  { const groups = {}; for (const [id, r] of Object.entries(ROSTER)) if (SKILLS[id] && !isBuff(SKILLS[id])) (groups[r.line + '|' + r.c + '|' + formUser(SKILLS[id])] ||= []).push(id);
    const usedAll = {};
    for (const ids of Object.values(groups)) { ids.sort((a, b) => ROSTER[b].grade - ROSTER[a].grade); const seen = new Set(); for (const id of ids) { const k = shapeKey(SKILLS[id]); if (seen.has(k) && ROSTER[id].role !== 'util') { reform(SKILLS[id], ROSTER[id].role, usedAll, new Set([...seen].map((x) => x.replace('T:', '')))); } seen.add(shapeKey(SKILLS[id])); } } }
  // 위력 · 차수 · 등급 · 필요 능력치 다시 쓰기
  for (const [id, r] of Object.entries(ROSTER)) {
    const s = SKILLS[id]; if (!s) continue;
    s.role = r.role; s.q = r.grade; s.chasu = r.c; s.tier = r.c;
    const free = (r.c === 1 && r.grade === 1) || START_IDS.has(id); // 1차 하품 · 시작 스킬북은 각성 없이 처음부터
    s.awaken = free ? 0 : r.c;
    if (!r.mix) { s.line = r.line; s.req = { [r.line]: free ? 6 : R[r.c] }; }
    delete s.grip; // 한손 · 양손 구분 없이 같은 칸 (모양은 무기에 맞춰)
    if (isBuff(s)) continue;
    if (r.grade === 1) s.cd = Math.min(s.cd || 4, 3 + r.c * 0.5); // 하품: 짧은 쿨 채움기
    else if (r.grade === 3) s.cd = Math.max(10, Math.min(20, s.cd || 12));
    else s.cd = Math.max(5, Math.min(14, s.cd || 8));
    if (r.role === 'util') { s.root = Math.max(s.root || 0, 1.5); if (!s.form || FORM_DEFS[s.form]?.shape === 'one') { const user = formUser(s), f = ['cage', 'vortex', 'implode', 'runes'].find((x) => FORM_DEFS[x] && formFits(x, user)); if (f) { s.form = f; s.desc = FORM_DEFS[f].desc; } } }
    if (r.grade === 3 && !s.echo) s.echo = 0.4; // 상품: 효과 하나 더 (메아리)
    const target = BASE_PPS * TIER_POW[r.c] * s.cd * ROLE_K[r.role] * GRADE_K[r.grade];
    s.power = fitPower(s, target); s.perRank = 0;
  }
}
