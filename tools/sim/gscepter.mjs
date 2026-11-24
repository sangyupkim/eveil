// 대홀 보너스 비교 (분석용): 정신 캐릭터 홀 + 보주 vs 대홀(보조 없음) vs 대홀 + 보너스 · 지능 캐릭터 완드 + 마도서 vs 지팡이 (양손 기준점)
//  스킬 한 방 기대 피해 = 공격력 × 스킬 배율 × 장비 보정 × 치명 기대값 (world.js useSkill과 같은 식). 장비는 전설 +20, 같은 시드로 무기 · 보조만 바꾼다
import '../../src/data/skill_fx.js';
import { newPlayer, derive, skillScale } from '../../src/game/player.js';
import { BASES, SLOTS } from '../../src/data/items.js';
import { makeItem } from '../../src/game/items.js';
import { SKILLS } from '../../src/data/skills.js';
import { mpCost, skillValues } from '../../src/game/skills.js';
import { seeded } from '../../src/game/rng.js';
const top = (slot, f) => Object.keys(BASES).filter((id) => { const B = BASES[id]; return B.slot === slot && !B.noDrop && f(B, id); }).sort((x, y) => (BASES[y].minLvl ?? 1) - (BASES[x].minLvl ?? 1))[0];
function build(MAIN, L, wpn, off, seed) {
  const rng = seeded(seed), st = newPlayer(); st.awakenings = L; const b = Math.round(L * 5);
  for (const s of ['str', 'dex', 'int', 'wis', 'vit']) st.stats[s] = Math.round(b * (s === MAIN ? 0.5 : s === 'vit' ? 0.2 : 0.1));
  for (const sl of SLOTS) { if (sl === 'weapon' || sl === 'offhand') continue; const s = sl.startsWith('ring') ? 'ring' : sl;
    const id = top(s, (B) => !B.line || B.line === MAIN); if (!id) continue; const it = makeItem(id, { rarity: 'legend', ilvl: L }, st, rng); it.plus = 20; st.equip[sl] = it; }
  // 무기 · 보조: 같은 시드 (옵션 굴림이 비슷하게)
  const w = makeItem(wpn, { rarity: 'legend', ilvl: L }, st, seeded(seed * 31)); w.plus = 20; st.equip.weapon = w;
  if (off) { const o = makeItem(off, { rarity: 'legend', ilvl: L }, st, seeded(seed * 37)); o.plus = 20; st.equip.offhand = o; }
  return { st, d: derive(st) };
}
function hit(st, d, MAIN) {
  const c = Math.max(1, Math.min(5, [20, 60, 150, 300, 500].filter((x) => st.awakenings >= x).length));
  const sks = Object.keys(SKILLS).filter((id) => SKILLS[id].chasu === c && Object.keys(SKILLS[id].req || {})[0] === MAIN && SKILLS[id].type !== 'buff' && SKILLS[id].power).slice(0, 6);
  let dmg = 0, mp = 0;
  for (const id of sks) { const sk = SKILLS[id], v = skillValues(id, 30, []), sc = skillScale(sk, d.stats), rk = sk.scale ? d.resK?.[sk.scale] || 1 : 1;
    const base = ((d.patk[0] + d.patk[1]) / 2) * sc.phys + ((d.matk[0] + d.matk[1]) / 2) * sc.mag;
    dmg += base * d.atkMult * sc.statF * rk * v.power * (1 + d.crit * (d.critMult - 1)); mp += mpCost(st, id, v); }
  return { dmg: dmg / sks.length, mp: mp / sks.length };
}
const rows = [], N = 30;
for (const L of [60, 200, 380, 500]) {
  const sc = top('weapon', (B) => B.cls === 'scepter' && (B.minLvl ?? 1) <= L), gs = top('weapon', (B) => B.cls === 'gscepter' && (B.minLvl ?? 1) <= L);
  const orb = top('offhand', (B, id) => /orb/.test(id) && (B.minLvl ?? 1) <= L), wand = top('weapon', (B) => B.cls === 'wand' && (B.minLvl ?? 1) <= L), staff = top('weapon', (B) => B.cls === 'staff' && (B.minLvl ?? 1) <= L), tome = top('offhand', (B, id) => /tome/.test(id) && (B.minLvl ?? 1) <= L);
  const avg = (MAIN, w, o) => { let D = 0, M = 0, H = 0, MX = 0; for (let s = 1; s <= N; s++) { const { st, d } = build(MAIN, L, w, o, s * 101 + L); const h = hit(st, d, MAIN); D += h.dmg; M += h.mp; H += d.maxHp; MX += d.maxMp; } return { dmg: D / N, mp: M / N, hp: H / N, maxMp: MX / N }; };
  const A = avg('wis', sc, orb), B = avg('wis', gs, null), I1 = avg('int', wand, tome), I2 = avg('int', staff, null);
  const r = (x) => (x / A.dmg).toFixed(2);
  rows.push({ 각성: L, '홀+보주': '1.00', '대홀': r(B.dmg), '대홀 +15%': r(B.dmg * 1.15), '대홀 +25%': r(B.dmg * 1.25), '대홀 +35%': r(B.dmg * 1.35), '지팡이/완드+마도서': (I2.dmg / I1.dmg).toFixed(2), '최대MP 대홀/홀': (B.maxMp / A.maxMp).toFixed(2), '최대HP 대홀/홀': (B.hp / A.hp).toFixed(2), '마나 소모 ×1.5 / 최대MP': ((B.mp * 1.5 / B.maxMp) / (A.mp / A.maxMp)).toFixed(2) });
}
console.log('스킬 한 방 기대 피해 (홀+보주 = 1), 전설 +20 · 30벌 평균. 범위 +20%는 따로 (맞는 수 최대 ×1.44)');
console.table(rows);
