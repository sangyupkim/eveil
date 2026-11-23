// 무간지옥 분석: 장비 레벨 · 각성이 10씩 오를 때 캐릭터 세기(버팀 · 화력) vs 층마다 몬스터 세기
import '../../src/data/skill_fx.js';
import { newPlayer, derive, damageReduction } from '../../src/game/player.js';
import { BASES, SLOTS } from '../../src/data/items.js';
import { makeItem } from '../../src/game/items.js';
import { seeded } from '../../src/game/rng.js';
const MAIN = process.argv[2] || 'int';
function build(L, plus = 20) {
  const rng = seeded(77), st = newPlayer(); st.awakenings = L; const b = Math.round(L * 5);
  for (const s of ['str', 'dex', 'int', 'wis', 'vit']) st.stats[s] = Math.round(b * (s === MAIN ? 0.5 : s === 'vit' ? 0.2 : 0.1));
  for (const sl of SLOTS) { const s = sl.startsWith('ring') ? 'ring' : sl; if (sl === 'offhand' && ['str', 'dex'].includes(MAIN)) continue;
    const top = Object.keys(BASES).filter((id) => { const B = BASES[id]; return B.slot === s && !B.noDrop && (!B.line || B.line === MAIN); }).sort((x, y) => (BASES[y].minLvl ?? 1) - (BASES[x].minLvl ?? 1));
    const it = makeItem(top[0], { rarity: 'legend', ilvl: L }, st, rng); it.plus = plus; st.equip[sl] = it; }
  const d = derive(st);
  const ehp = d.maxHp / (1 - damageReduction(d.armor, L)), off = ['int', 'wis'].includes(MAIN) ? d.spellBase : ((d.dmg[0] + d.dmg[1]) / 2) * d.atkRate;
  return { ehp, off };
}
const rows = []; let prev = null;
for (const L of [500, 510, 550, 600, 700, 800, 1000, 1500]) { const r = build(L); rows.push({ 레벨: L, 버팀: Math.round(r.ehp), 화력: Math.round(r.off), '버팀 10레벨당': prev ? ((r.ehp / prev.ehp) ** (10 / (L - prev.L)) * 100 - 100).toFixed(1) + '%' : '', '화력 10레벨당': prev ? ((r.off / prev.off) ** (10 / (L - prev.L)) * 100 - 100).toFixed(1) + '%' : '' }); prev = { ...r, L }; }
console.log('성향', MAIN, '· 모든 칸 전설 +20, 각성 = 레벨');
console.table(rows);
