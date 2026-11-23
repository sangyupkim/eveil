// 고스펙 캐릭터가 각 세계 단계 · 지역에서 몇 대를 버티나 (분석용, 게임에 쓰지 않음)
import '../../src/data/skill_fx.js';
import { newPlayer, derive, damageReduction } from '../../src/game/player.js';
import { BASES, SLOTS } from '../../src/data/items.js';
import { makeItem } from '../../src/game/items.js';
import { ZONES, MONSTERS, TIER_STEP } from '../../src/data/world.js';
import { TIERS } from '../../src/data/config.js';
import { chapterK as chapterK0 } from '../../src/data/chapters.js';
import { tierCurveK } from '../../src/data/tiercurve.js';
import { seeded } from '../../src/game/rng.js';
const TIER_K = { 1: { hp: 1, dmg: 1 }, 2: { hp: 1.8, dmg: 1.45 }, 3: { hp: 3, dmg: 2 }, 4: { hp: 7, dmg: 3.6 } };
const OFF = [0, TIER_STEP, TIER_STEP * 2, 380];
const chapterK = (zi, tier, wt) => { const c = chapterK0(zi, tier), t = tierCurveK(zi, wt); if (!t) return { hp: c.hp * TIER_K[wt].hp, dmg: c.dmg * TIER_K[wt].dmg }; const n = chapterK0(zi, 'normal'); return { hp: t.hp * (c.hp / n.hp), dmg: t.dmg * (c.dmg / n.dmg) }; };
// 몬스터 한 대 (평균 공격, 그 지역 몬스터 평균)
function mobHit(zi, wt, tier) {
  const zn = ZONES[zi], L = zn.levels[1] + OFF[wt - 1], ts = tier === 'boss' ? [zn.boss.type] : Object.keys(zn.spawns);
  const avg = ts.reduce((a, t) => a + (MONSTERS[t].dmg[0] + MONSTERS[t].dmg[1]) / 2, 0) / ts.length, mx = Math.max(...ts.map((t) => MONSTERS[t].dmg[1]));
  const k = (1 + 0.27 * (L - 1)) * TIERS[tier].dmg * chapterK(zi, tier, wt).dmg;
  return { L, avg: avg * k, max: mx * k };
}
// 고스펙: 모든 칸 전설 +20, 아이템 레벨 = 지역 레벨, 주 스탯 갈래 장비
function build(main, L, aw) {
  const rng = seeded(7 + L), st = newPlayer();
  st.awakenings = aw; const base = Math.round(aw * 5); // 기본 능력치: 각성당 약 5 (스크린샷 캐릭터 668 → 3400)
  for (const s of ['str', 'dex', 'int', 'wis', 'vit']) st.stats[s] = Math.round(base * (s === main ? 0.5 : s === 'vit' ? 0.2 : 0.1));
  for (const sl of SLOTS) {
    const ids = Object.keys(BASES).filter((id) => { const b = BASES[id]; return b.slot === sl && !b.noDrop && (b.minLvl ?? 1) <= L && (b.minLvl ?? 1) > L - (sl === 'ring' || sl === 'amulet' ? 40 : 16) && (!b.line || b.line === main); });
    if (!ids.length) continue;
    let best = null;
    for (let i = 0; i < 6; i++) { const it = makeItem(ids[Math.floor(rng() * ids.length)], { rarity: 'legend', ilvl: L }, st, rng); it.plus = 20; const sc = (it.affixes || []).reduce((a, x) => a + (x.id === main || x.id === 'vit' || x.id === 'maxHp' ? x.v : 0), 0); if (!best || sc > best.sc) best = { it, sc }; }
    if (sl === 'offhand' && ['str', 'dex'].includes(main)) continue;
    st.equip[sl] = best.it;
  }
  return { st, d: derive(st) };
}
const rows = [];
for (const wt of [1, 2, 3, 4]) for (const zi of [9, 14, 16, 19]) {
  const zn = ZONES[zi], L = zn.levels[1] + OFF[wt - 1];
  const n = mobHit(zi, wt, 'normal'), e = mobHit(zi, wt, 'elite'), b = mobHit(zi, wt, 'boss');
  for (const main of ['str', 'dex', 'int', 'wis', 'vit']) {
    const { d } = build(main, L, L);
    const red = damageReduction(d.armor, L) + 0, dr = (1 - red) * (1 - (d.dmgReduce || 0) / 100);
    const tk = (x) => d.maxHp / (x * dr);
    rows.push({ wt, zone: zn.name, L, main, hp: d.maxHp, armor: Math.round(d.armor), red: (red * 100).toFixed(1) + '%', nAvg: Math.round(n.avg * dr), hitsN: tk(n.avg).toFixed(1), hitsNmax: tk(n.max * 1.4).toFixed(1), hitsE: tk(e.max * 1.4).toFixed(1), hitsB: tk(b.max).toFixed(1), hitsBpat3: tk(b.max * 3).toFixed(1) });
  }
}
console.table(rows);
