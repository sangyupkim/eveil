// 마나: 레벨마다 최대 마나 · 초당 회복 vs 스킬 8개를 재사용마다 돌릴 때 초당 소모
import '../../src/data/skill_fx.js';
import { newPlayer, derive } from '../../src/game/player.js';
import { BASES, SLOTS } from '../../src/data/items.js';
import { makeItem } from '../../src/game/items.js';
import { SKILLS } from '../../src/data/skills.js';
import { skillValues, mpCost } from '../../src/game/skills.js';
import { seeded } from '../../src/game/rng.js';
const rows = [];
for (const MAIN of ['int', 'str', 'wis']) for (const L of [5, 30, 100, 200, 300, 500]) {
  const rng = seeded(5), st = newPlayer(); st.awakenings = L; const b = Math.round(L * 5);
  for (const s of ['str', 'dex', 'int', 'wis', 'vit']) st.stats[s] = Math.round(b * (s === MAIN ? 0.5 : s === 'vit' ? 0.2 : 0.1));
  for (const sl of SLOTS) { const s = sl.startsWith('ring') ? 'ring' : sl; const ids = Object.keys(BASES).filter((id) => { const B = BASES[id]; return B.slot === s && !B.noDrop && (!B.line || B.line === MAIN) && (B.minLvl ?? 1) <= L && (B.minLvl ?? 1) > L - 40; }); if (!ids.length) continue; st.equip[sl] = makeItem(ids[0], { rarity: 'hero', ilvl: L }, st, rng); }
  const d = derive(st);
  const c = Math.max(1, Math.min(5, [20, 60, 150, 300, 500].filter((x) => L >= x).length));
  const sk = Object.keys(SKILLS).filter((id) => SKILLS[id].chasu === c && Object.keys(SKILLS[id].req || {})[0] === MAIN && SKILLS[id].type !== 'buff').slice(0, 6);
  let spend = 0; for (const id of sk) { const v = skillValues(id, 30, []); const mp = mpCost(st, id, v); spend += mp / v.cd; }
  rows.push({ 성향: MAIN, 각성: L, 최대마나: d.maxMp, '초당 회복': +d.mpRegen.toFixed(1), '초당 소모(6개)': +spend.toFixed(1), '마나 바닥까지(초)': spend > d.mpRegen ? Math.round(d.maxMp / (spend - d.mpRegen)) : '안 닳음' });
}
console.table(rows);
