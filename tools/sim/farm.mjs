// 지역마다 몇 마리를 잡아야(필드 드랍만) 다음 지역에서 버틸 장비가 모이나 — 제안 1(공격 곡선 1.035) · 1+2(권장 장비로 역산) 비교
// 사용: node tools/sim/farm.mjs [성향 str|dex|int|wis|vit] [강화 +E] [auto 1|0]
import '../../src/data/skill_fx.js';
import { newPlayer, derive, damageReduction } from '../../src/game/player.js';
import { BASES, SLOTS } from '../../src/data/items.js';
import { makeItem } from '../../src/game/items.js';
import { rollLoot } from '../../src/game/loot.js';
import { ZONES, MONSTERS, TIER_STEP } from '../../src/data/world.js';
import { TIERS } from '../../src/data/config.js';
import { chapterK as chapterK0 } from '../../src/data/chapters.js';
import { tierCurveK, CURVE } from '../../src/data/tiercurve.js';
import { seeded } from '../../src/game/rng.js';
CURVE.dmg = 1.035; // 제안 1
const MAIN = process.argv[2] || 'int', ENH = Number(process.argv[3] ?? 10), AUTO = (process.argv[4] ?? '1') === '1';
const TK = { 1: 1, 2: 1.45, 3: 2, 4: 3.6 }, OFF = [0, TIER_STEP, TIER_STEP * 2, 380], CAP = 300000, NEED_N = 8, NEED_E = 3;
const zoneL = (wt, zi) => [ZONES[zi].levels[0] + OFF[wt - 1], ZONES[zi].levels[1] + OFF[wt - 1]];
const dmgK = (zi, wt, tier) => { const c = chapterK0(zi, tier), t = tierCurveK(zi, wt); if (!t) return c.dmg * TK[wt]; return t.dmg * (c.dmg / chapterK0(zi, 'normal').dmg); };
const avgDmg = (zi, f) => { const ts = Object.keys(ZONES[zi].spawns); return ts.reduce((a, t) => a + f(MONSTERS[t].dmg), 0) / ts.length; };
// 제안 1: 일반 평균 한 대 · 정예(강함 ×1.4) 최대 한 대
const hitP1 = (wt, zi) => { const L = zoneL(wt, zi)[1], lv = 1 + 0.27 * (L - 1); return { n: avgDmg(zi, (d) => (d[0] + d[1]) / 2) * lv * dmgK(zi, wt, 'normal'), e: avgDmg(zi, (d) => d[1]) * lv * dmgK(zi, wt, 'elite') * TIERS.elite.dmg * 1.4, L }; };
const setStats = (st, aw) => { st.awakenings = aw; const b = Math.round(aw * 5); for (const s of ['str', 'dex', 'int', 'wis', 'vit']) st.stats[s] = Math.max(5, Math.round(b * (s === MAIN ? 0.5 : s === 'vit' ? 0.2 : 0.1))); };
const ehp = (d, L) => d.maxHp / ((1 - damageReduction(d.armor, L)) * (1 - (d.dmgReduce || 0) / 100));
const off = (d) => (['int', 'wis'].includes(MAIN) ? d.spellBase || 1 : ((d.dmg[0] + d.dmg[1]) / 2) * d.atkRate);
const score = (st, L) => { const d = derive(st); return Math.sqrt(ehp(d, L) * off(d)); };
const slotsOf = (it) => { const s = BASES[it.base].slot; return s === 'ring' ? ['ring1', 'ring2'] : [s]; };
function tryEquip(st, it, L) {
  if ((it.ilvl || 1) > Math.max(5, st.awakenings)) return false; // 각성 제한
  if (BASES[it.base].line && BASES[it.base].line !== MAIN) return false;
  it.plus = ENH; let best = null, base = score(st, L);
  for (const sl of slotsOf(it)) { const old = st.equip[sl]; st.equip[sl] = it; const sc = score(st, L); st.equip[sl] = old; if (sc > base * 1.001 && (!best || sc > best.sc)) best = { sl, sc }; }
  if (!best) return false; st.equip[best.sl] = it; return true;
}
// 제안 2 기준 장비: 그 지역 바로 앞 지역 레벨의 영웅 +E 한 벌 (필드에서 모을 수 있는 수준)
function refHit(wt, zi) {
  const rng = seeded(99 + zi + wt * 31), L = zoneL(wt, zi)[0] - 1, st = newPlayer(); setStats(st, L);
  for (const sl of SLOTS) { const s = sl.startsWith('ring') ? 'ring' : sl; const ids = Object.keys(BASES).filter((id) => { const b = BASES[id]; return b.slot === s && !b.noDrop && (!b.line || b.line === MAIN) && (b.minLvl ?? 1) <= L && (b.minLvl ?? 1) > L - (s === 'ring' || s === 'amulet' ? 40 : 16); }); if (!ids.length) continue; const it = makeItem(ids[Math.floor(rng() * ids.length)], { rarity: 'hero', ilvl: L }, st, rng); it.plus = ENH; st.equip[sl] = it; }
  return ehp(derive(st), zoneL(wt, zi)[1]);
}
const rows = [], rng = seeded(1234);
for (const P2 of [false, true]) {
  const st = newPlayer(); let total = 0;
  for (let wt = 1; wt <= 4; wt++) for (let zi = 0; zi < ZONES.length; zi++) {
    const [l0, l1] = zoneL(wt, zi), nx = zi + 1 < ZONES.length ? [wt, zi + 1] : wt < 4 ? [wt + 1, 0] : null; if (!nx) break;
    let H = hitP1(...nx); if (P2) { const r = refHit(...nx); H = { ...H, n: Math.min(H.n, r / NEED_N), e: Math.min(H.e, r / NEED_E) }; }
    setStats(st, l1);
    let kills = 0, items = 0, got = 0;
    const ok = () => { setStats(st, H.L - 1); const d = derive(st), E = ehp(d, H.L); setStats(st, l1); return E / H.n >= NEED_N && E / H.e >= NEED_E; };
    while (!ok() && kills < CAP) {
      for (let k = 0; k < 50; k++) { kills++; const tier = rng() < 0.08 ? 'elite' : 'normal', lv = l0 + Math.floor(rng() * (l1 - l0 + 1));
        for (const dr of rollLoot({ tier, level: lv, sp: { zone: ZONES[zi] } }, { auto: AUTO }, st, rng)) if (dr.item && BASES[dr.item.base]?.slot) { items++; if (tryEquip(st, dr.item, l1)) got++; } }
    }
    total += kills;
    if (zi % 5 === 4 || zi === 0 || kills >= CAP) { setStats(st, H.L - 1); const d = derive(st), E = ehp(d, H.L); setStats(st, l1);
      rows.push({ 안: P2 ? '1+2' : '1', 세계: wt, 지역: ZONES[zi].name, 레벨: l1, 잡은수: kills >= CAP ? '막힘(30만+)' : kills, 장비드랍: items, 바꿔낌: got, 누적만: Math.round(total / 1e4), '다음지역 일반 버팀': (E / H.n).toFixed(1), '정예 강함 버팀': (E / H.e).toFixed(1) }); }
    if (kills >= CAP) break;
  }
}
console.log(`성향 ${MAIN} · 강화 +${ENH} · ${AUTO ? '자동 사냥(드랍 ×0.3)' : '직접 사냥'} · 기준: 다음 지역 일반 평균 ${NEED_N}대 · 정예(강함) 최대 ${NEED_E}대`);
console.table(rows);
