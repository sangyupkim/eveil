// 챕터(지역)별 난이도 모형: 진짜 게임 공식(derive · 몬스터 성장 · expNeeded)으로
// 「그 챕터에 들어갈 때의 기준 캐릭터」를 만들고, 일반 몬스터 처치 시간 · 버티는 시간 · 보스 처치 시간 · 챕터를 지나는 데 걸리는 시간을 낸다.
// node tools/sim/chapter.mjs [무기=staff]
import { newPlayer, derive, damageReduction } from '../../src/game/player.js';
import { expNeeded, recAwaken } from '../../src/game/growth.js';
import { MONSTERS, ZONES } from '../../src/data/world.js';
import { TIERS, CONFIG } from '../../src/data/config.js';
import { BASES } from '../../src/data/items.js';
import { makeItem } from '../../src/game/items.js';
import { chapterK } from '../../src/data/chapters.js';

const MAINS = { sword: 'str', bow: 'dex', staff: 'int' };
let CLS = process.argv[2] || 'staff';
export const setClass = (c) => { CLS = c; };
const SKILL_MIX = 1.3;   // 스킬을 섞은 실제 딜 / 평타 딜 (0.34 스킬 계수 기준 대략)
const TRAVEL = 2.5;      // 몬스터 사이 이동 · 줍기(초)
const best = (slot, L, cls) => Object.keys(BASES).filter((k) => { const b = BASES[k]; return b.slot === slot && (!cls || b.cls === cls) && (b.minLvl ?? 1) <= L && (b.minLvl ?? 1) < 99 && !b.noDrop; })
  .sort((a, b) => (BASES[b].minLvl ?? 1) - (BASES[a].minLvl ?? 1))[0];
// 기준 캐릭터: 각성 A, 장비 레벨 G(희귀), 강화 P
export function refPlayer(A, G, P) {
  const st = newPlayer('ref', { face: 'm01' }, CLS);
  const pts = A * CONFIG.awakenPoints;
  st.stats[MAINS[CLS]] += Math.round(pts * 0.55); st.stats.vit += Math.round(pts * 0.2); st.stats.wis += Math.round(pts * 0.15); st.stats.dex += Math.round(pts * 0.1);
  for (const slot of ['weapon', 'helm', 'armor', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'ring2']) {
    const id = best(slot.startsWith('ring') ? 'ring' : slot, Math.max(1, G), slot === 'weapon' ? CLS : null); if (!id) continue;
    const it = makeItem(id, { rarity: 'rare', ilvl: Math.max(1, G) }, st, () => 0.5); it.plus = P; it.q = 1; it.req = null; st.equip[slot] = it;
  }
  return derive(st);
}
function monster(zn, L, tier, zi) {
  const types = Object.keys(zn.spawns).map((t) => MONSTERS[t]), T = TIERS[tier], K = chapterK(zi, tier);
  const def = tier === 'boss' ? MONSTERS[zn.boss.type] : { hp: types.reduce((a, d) => a + d.hp, 0) / types.length, dmg: [types.reduce((a, d) => a + d.dmg[0], 0) / types.length, types.reduce((a, d) => a + d.dmg[1], 0) / types.length], interval: types.reduce((a, d) => a + d.interval, 0) / types.length, exp: types.reduce((a, d) => a + d.exp, 0) / types.length };
  return { hp: def.hp * (1 + 0.4 * (L - 1)) * T.hp * K.hp, dps: ((def.dmg[0] + def.dmg[1]) / 2) * (1 + 0.27 * (L - 1)) * T.dmg * K.dmg / (def.interval || 1.5), exp: def.exp * (1 + 0.3 * (L - 1)) * T.exp * K.exp, armor: L * 2 };
}
export function chapterRow(zi) {
  const zn = ZONES[zi], [L0, L1] = zn.levels, Lm = (L0 + L1) / 2;
  const A0 = recAwaken(L0), A1 = ZONES[zi + 1] ? recAwaken(ZONES[zi + 1].levels[0]) : recAwaken(L1 + 1);
  // 들어갈 때: 앞 챕터 끝 장비(레벨 L0-2), 강화는 챕터마다 반 단계쯤
  const P = Math.min(10, Math.floor(zi * 0.6));
  const dIn = refPlayer(A0, L0 - 2, P), dOut = refPlayer(A1, L1, Math.min(10, P + 1));
  const fight = (d, m) => {
    const pd = ((d.dmg[0] + d.dmg[1]) / 2) * (1 + d.crit * (d.critMult - 1)) * d.atkRate * (1 - m.armor / (m.armor + 60)) * SKILL_MIX;
    const md = m.dps * (1 - d.dodge) * (1 - damageReduction(d.armor, Lm));
    return { ttk: m.hp / pd, ttd: d.maxHp / Math.max(0.01, md - d.hpRegen) };
  };
  const mn = monster(zn, Lm, 'normal', zi), mb = monster(zn, L1, 'boss', zi);
  const inN = fight(dIn, mn), outN = fight(dOut, mn), inB = fight(dIn, mb), outB = fight(dOut, mb);
  // 챕터를 지나는 시간: 각성 A0 → A1에 드는 경험치 ÷ 초당 경험치(들어갈 때와 나갈 때 평균 처치 속도)
  let need = 0; for (let a = A0; a < A1; a++) need += expNeeded(a);
  const ttk = (inN.ttk + outN.ttk) / 2, expPerSec = (mn.exp * (1 + CONFIG.eliteChance * 2)) / (ttk + TRAVEL);
  return { zi, name: zn.name, L: `${L0}-${L1}`, A: `${A0}→${A1}`, ttkIn: inN.ttk, ttkOut: outN.ttk, ttdIn: inN.ttd, bossIn: inB.ttk, bossOut: outB.ttk, bossTtdOut: outB.ttd, minutes: need / expPerSec / 60 };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const f = (v) => (v >= 100 ? Math.round(v) : v.toFixed(1)).toString().padStart(6);
  console.log(`무기 ${CLS} · 처치 시간(초) 들어갈 때/나갈 때 · 버티는 시간(초, 물약 없이) · 보스 처치(초) 들어갈 때/나갈 때 · 보스 앞 버티기 · 챕터 시간(분)`);
  let tot = 0;
  for (let i = 0; i < ZONES.length; i++) { const r = chapterRow(i); tot += r.minutes; console.log(String(i + 1).padStart(2), r.name.padEnd(8), r.L.padEnd(8), r.A.padEnd(9), f(r.ttkIn), f(r.ttkOut), f(r.ttdIn), f(r.bossIn), f(r.bossOut), f(r.bossTtdOut), f(r.minutes), `누적 ${(tot / 60).toFixed(1)}h`); }
}
