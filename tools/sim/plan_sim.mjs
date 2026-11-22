// 기획 시뮬레이터: 라운드마다 파라미터를 바꿔 지표를 본다
import { ZONES, MONSTERS, TIER_STEP } from '../../src/data/world.js';
import { CHAPTER } from '../../src/data/chapters.js';
import { SKILLS } from '../../src/data/skills.js';
import '../../src/data/skill_fx.js';
import { skillValues } from '../../src/game/skills.js';
const P = JSON.parse(process.argv[2] || '{}');
const round = P.round || 0;
const OUT = [];
const log = (...a) => OUT.push(a.join(' '));
// ── S1 지역 곡선: 처치 시간(TTK) · 시간당 경험치 연속성 ──
const TK = { 1: { hp: 1, dmg: 1 }, 2: { hp: 1.8, dmg: 1.45 }, 3: { hp: 3, dmg: 2 }, 4: { hp: 7, dmg: 3.6 } };
const OFF = { 1: 0, 2: TIER_STEP, 3: TIER_STEP * 2, 4: 380 };
const avgMon = (zn) => { const ts = Object.keys(zn.spawns); let h = 0, e = 0; for (const t of ts) { h += MONSTERS[t].hp; e += MONSTERS[t].exp; } return { hp: h / ts.length, exp: e / ts.length }; };
const lnFit = (k) => { const ys = CHAPTER.map((c) => Math.log(c[k])), n = ys.length, xs = ys.map((_, i) => i), mx = (n - 1) / 2, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; }); const b = sxy / sxx; return { a: my - b * mx, b }; };
const FH = lnFit('hp'), FE = lnFit('exp');
const ck = (wt, zi) => {
  if (P.ck === 'anchor' && wt > 1) { const n = zi + 1 + 20 * (wt - 2), last = CHAPTER[19]; return { hp: last.hp * Math.pow(P.gHp ?? Math.exp(FH.b), n) * (P.ckHpK ?? 1), exp: last.exp * Math.pow(P.gExp ?? Math.exp(FE.b), n) * (P.ckExpK ?? 1) }; }
  if (P.ck === 'continue' && wt > 1) { const c = zi + 20 * (wt - 1); const g = P.ckGrowth ?? 1; return { hp: Math.exp(FH.a + FH.b * c * g) * (P.ckHpK ?? 1), exp: Math.exp(FE.a + FE.b * c * g) * (P.ckExpK ?? 1) }; }
  return { hp: CHAPTER[zi].hp, exp: CHAPTER[zi].exp };
};
const tk = (wt) => ((P.ck === 'continue' || P.ck === 'anchor') && wt > 1 ? { hp: P.tierHp?.[wt] ?? 1 } : TK[wt]);
// 플레이어 피해 모형: 무기 (1 + 0.1(L-1)) × 스탯 배율 (1 + 0.006 L) × 장비 강화 1.5 (중반 이후)
const pdps = (L) => (1 + 0.1 * (L - 1)) * (1 + 0.006 * L) * (L > 40 ? 1.5 : 1);
let prev = null, worstJump = 0, rows = []; const END = {}; const stepJ = [];
for (let wt = 1; wt <= 3; wt++) for (let zi = 0; zi < 20; zi++) {
  const zn = ZONES[zi], a = avgMon(zn), L = zn.levels[1] + OFF[wt], c = ck(wt, zi);
  let hp = a.hp * (1 + 0.4 * (L - 1)) * tk(wt).hp * c.hp, exp = a.exp * (1 + 0.3 * (L - 1)) * c.exp;
  if (P.ck === 'target' && wt > 1) { const n = zi + 1 + 20 * (wt - 2); hp = END.hp * Math.pow(P.gHp, n); exp = END.exp * Math.pow(P.gExp, n); }
  if (wt === 1 && zi === 19) Object.assign(END, { hp, exp });
  const ttk = hp / pdps(L), eph = exp / ttk; // 처치당 경험치 ÷ 처치 시간
  if (prev) { const j = ttk / prev.ttk; if (wt > 1) stepJ.push(j); if (zi === 0) rows.push(`${['', '평온', '악몽', '지옥'][wt]} 시작 처치시간 ×${j.toFixed(2)} 경험치효율 ×${(eph / prev.eph).toFixed(2)}`); worstJump = Math.max(worstJump, Math.max(j, 1 / j)); }
  prev = { ttk, eph };
}
log('S1 지역:', rows.join(' | '), `| 가장 큰 단절 ×${worstJump.toFixed(1)}`, stepJ.length ? `| 악몽 이후 지역마다 처치시간 ×${(stepJ.reduce((a,b)=>a*b,1)**(1/stepJ.length)).toFixed(2)}` : '');
// ── S2 스킬 차수 곡선: 초당 위력(쿨 기준) 차수별 · 랭크 ──
const TM = P.tierMul || { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };
const lines = ['str', 'dex', 'int', 'wis', 'vit'];
const tierPps = {};
for (const [id, s] of Object.entries(SKILLS)) {
  if (s.retired || s.passive || s.type === 'buff' || s.type === 'evade') continue;
  const L = (s.lines || Object.keys(s.req || {})); if (L.length !== 1) continue;
  const t = s.tier || 1, v = skillValues(id, 1, []);
  const area = ['spin', 'nova', 'meteor', 'rain', 'cone', 'cleave', 'line'].includes(s.type) ? (P.areaVal ?? 2.5) : 1;
  (tierPps[t] ||= []).push((v.power * TM[t] / Math.max(1, v.cd)) * (P.countArea ? area : 1));
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const tp = [1, 2, 3, 4, 5].map((t) => med(tierPps[t]));
log('S2 차수별 초당 위력(중앙값):', tp.map((v, i) => `${i + 1}차 ${v.toFixed(3)}`).join(' · '), '| 증가', tp.slice(1).map((v, i) => (v / tp[i]).toFixed(2)).join(' → '));
// 1차 스킬 랭크 효과: 랭크 r에서 1차 = 몇 차 1랭크와 같나
const rk = P.rankK ?? 1;
const t1 = Object.keys(SKILLS).filter((id) => SKILLS[id].tier === 1 && !SKILLS[id].passive && SKILLS[id].type !== 'buff' && SKILLS[id].perRank);
const gain = (r) => med(t1.map((id) => { const s = SKILLS[id]; const raw1 = s.power, rawr = s.power + s.perRank * rk * (Math.min(r, 10) - 1 + 0.5 * Math.max(0, r - 10)); return rawr / raw1; }));
log('S2 1차 스킬 랭크 효과: 10랭크 ×' + gain(10).toFixed(2), '20랭크 ×' + gain(20).toFixed(2), '30랭크 ×' + gain(30).toFixed(2), '| 5차 1랭크 대비 1차 30랭크 =', (tp[0] * gain(30) / tp[4]).toFixed(2));
// ── S3 퀵슬롯 두 벌: 보스전 · 무리 사냥 기대 피해 ──
const slots = P.slots ?? 8, sets = P.sets ?? 1;
const pool = Object.entries(SKILLS).filter(([, s]) => !s.retired && !s.passive && s.type !== 'buff' && s.type !== 'evade' && (s.lines || Object.keys(s.req || {})).join() === 'str');
const AREA = ['spin', 'nova', 'meteor', 'rain', 'cone', 'cleave', 'line'];
const vals = pool.map(([id, s]) => { const v = skillValues(id, 5, []), isA = AREA.includes(s.type) || !!s.form && !['xslash','upper','thrust','blink','split','bounce'].includes(s.form), base = v.power * TM[s.tier || 1] / Math.max(1, v.cd), single = base * (isA ? (P.roleArea ?? 1) : (P.roleSingle ?? 1)), aoe = single * (isA ? 4 : 1); return { id, single, aoe }; });
const best = (k, n) => [...vals].sort((a, b) => b[k] - a[k]).slice(0, n).reduce((x, y) => x + y[k], 0);
const one = { boss: 0, mob: 0 }; { const pick = [...vals].sort((a, b) => b.single + b.aoe / 4 - (a.single + a.aoe / 4)).slice(0, slots); one.boss = pick.reduce((x, y) => x + y.single, 0); one.mob = pick.reduce((x, y) => x + y.aoe, 0); }
const two = { boss: best('single', slots), mob: best('aoe', slots) };
log(`S3 퀵슬롯 ${slots}칸 한 벌 → 두 벌(보스 · 무리): 보스 ×${(two.boss / one.boss).toFixed(2)} · 무리 ×${(two.mob / one.mob).toFixed(2)} (힘 갈래 스킬 ${pool.length}개 중 쓰는 수 ${slots} → ${new Set([...vals].sort((a, b) => b.single - a.single).slice(0, slots).map((x) => x.id).concat([...vals].sort((a, b) => b.aoe - a.aoe).slice(0, slots).map((x) => x.id))).size})`);
// ── S4 대토벌(핵앤슬래시) 보상 비교: 필드 1시간 vs 토벌 1회(10분) ──
const fieldKpm = P.fieldKpm ?? 6, raidKpm = P.raidKpm ?? 30, raidExpK = P.raidExpK ?? 0.35, raidMin = P.raidMin ?? 10;
const fieldExpH = fieldKpm * 60, raidExp = raidKpm * raidMin * raidExpK, perMinField = fieldKpm, perMinRaid = raidKpm * raidExpK;
log(`S4 대토벌: 분당 경험치 필드 ${perMinField.toFixed(1)} vs 토벌 ${perMinRaid.toFixed(1)} (×${(perMinRaid / perMinField).toFixed(2)}) · 1회 ${raidMin}분 = 필드 ${(raidExp / fieldKpm).toFixed(0)}분어치`);
// ── S5 아이템: 완드에 쓸모 있는 옵션이 뜰 확률 ──
const AFF = { str: 1, dex: 1, int: 1, wis: 1, vit: 1, maxHp: 1, maxMp: 1, dmgPct: 1, matk: P.wandMatk ? 1 : 0, patk: P.wandMatk ? 0 : 1, atkSpd: 1, crit: 1, mpRegen: 1, lifeSteal: 1 };
const useful = new Set(['int', 'wis', 'maxMp', 'dmgPct', 'matk', 'atkSpd', 'crit', 'mpRegen']);
const W = P.statWeight ? { str: 0.3, dex: 0.3, vit: 0.3, int: 2, wis: 1.2 } : {};
let tot = 0, ok = 0; for (const [k, on] of Object.entries(AFF)) { if (!on) continue; const w = W[k] ?? 1; tot += w; if (useful.has(k)) ok += w; }
log(`S5 완드 옵션 한 줄이 지능 마법사에게 쓸모 있을 확률 ${(ok / tot * 100).toFixed(0)}% (네 줄 모두 쓸모 ${(Math.pow(ok / tot, 4) * 100).toFixed(1)}%)`);
console.log(`── 라운드 ${round}: ${P.note || ''}\n` + OUT.join('\n'));
