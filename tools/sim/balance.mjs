// 밸런스 시뮬레이션: 화면 없이 공식만으로 1~8지역을 끝까지 진행한다.
// 각 지역에서 "편하게 잡을 수 있으면" 다음 지역으로. 지역별 걸린 시간 · 죽음 · 각성 · 장비를 표로 낸다.
// node tools/sim/balance.mjs [판 수=20] [최대 게임시간(시간)=60]
import { newPlayer, derive, damageReduction } from '../../src/game/player.js';
import { gainExp, addAP, rewardFactor } from '../../src/game/growth.js';
import { rollLoot } from '../../src/game/loot.js';
import { addItem, equip } from '../../src/game/inventory.js';
import { townOf, build, upgrade, collect, tick, enhance, enhanceCost, enhanceCap, dropMats, craft, craftZones } from '../../src/game/town.js';
import { MONSTERS, ZONES } from '../../src/data/world.js';
import { TIERS, AP_TABLE, CONFIG } from '../../src/data/config.js';
import { BASES, SLOTS } from '../../src/data/items.js';
import { SET_SLOTS, craftCost } from '../../src/data/crafting.js';
import { seeded } from '../../src/game/rng.js';
import { liberateAdd, isLiberated } from '../../src/game/town.js';
import { makeItem, rollBase } from '../../src/game/items.js';
import { stageMods } from '../../src/data/dungeons.js';

const RUNS = Number(process.argv[2] || 20), MAX_H = Number(process.argv[3] || 60);
const SKILL_K = 1.6; // 스킬 · 연타를 섞은 실제 딜 배율 (대략)
const avg = (a) => (a[0] + a[1]) / 2;
const pickW = (w, rng) => { const e = Object.entries(w); let t = e.reduce((a, [, v]) => a + v, 0) * rng(); for (const [k, v] of e) if ((t -= v) <= 0) return k; return e[0][0]; };

function mon(type, L, tier) {
  const def = MONSTERS[type], T = TIERS[tier];
  return { def, tier, level: L, maxHp: def.hp * (1 + 0.32 * (L - 1)) * T.hp, dmg: def.dmg.map((v) => v * (1 + 0.22 * (L - 1)) * T.dmg), armor: L * 2, exp: def.exp * (1 + 0.3 * (L - 1)) * T.exp };
}
const score = (it) => { const b = BASES[it.base]; let s = (b.armor || 0) * (1 + 0.1 * (it.ilvl - 1)) * 3 + (b.dmg ? avg(b.dmg) * b.speed * (1 + 0.1 * (it.ilvl - 1)) * 4 : 0); for (const a of it.affixes || []) s += a.v; return s * (1 + 0.08 * (it.plus || 0)) + (it.set ? 15 : 0); };

function run(seed, start) {
  const rng = seeded(seed), R = Math.random; Math.random = rng;
  const st = newPlayer('sim', { face: 'm01' }, start);
  let t = 0, zi = 0, deaths = 0, pots = 0;
  const zones = ZONES.map(() => ({ t0: null, t: 0, kills: 0, deaths: 0, aw0: 0, killT: [], gold: 0 }));
  const now = () => 1e12 + t * 1000;
  townOf(st, now());
  while (t < MAX_H * 3600 && zi < ZONES.length) {
    const zn = ZONES[zi], Z = zones[zi];
    if (Z.t0 == null) { Z.t0 = t; Z.aw0 = st.awakenings; }
    const L = Math.round(zn.levels[0] + rng() * (zn.levels[1] - zn.levels[0]));
    const r = rng(), tier = r < 0.004 ? 'boss' : r < 0.012 ? 'named' : r < CONFIG.eliteChance ? 'elite' : 'normal';
    const type = tier === 'boss' ? zn.boss.type : tier === 'named' ? zn.named.type : pickW(zn.spawns, rng);
    const m = mon(type, L, tier), d = derive(st);
    const titleK = 1 + 0.08 * [20, 40, 60].filter((n) => st.awakenings >= n).length;
    // 싸움: 초당 딜 비교
    const red = m.armor / (m.armor + 60);
    const pd = avg(d.dmg) * (1 + d.crit * (d.critMult - 1)) * d.atkRate * (1 - red) * SKILL_K * titleK;
    const md = (avg(m.dmg) / m.def.interval) * (1 - d.dodge) * (1 - damageReduction(d.armor, L)) * (1 - d.block * 0.7);
    const fightT = m.maxHp / pd;
    let hpLoss = md * fightT - d.hpRegen * fightT;
    st.hp = Math.min(d.maxHp, st.hp);
    while (st.hp - hpLoss < d.maxHp * 0.25 && hpLoss > 0) { // 물약
      const p = st.inv.find((x) => x.base?.startsWith('hp_potion') && x.qty > 0);
      if (!p) break;
      st.hp = Math.min(d.maxHp, st.hp + BASES[p.base].restore.hp); p.qty--; pots++;
      if (!p.qty) st.inv.splice(st.inv.indexOf(p), 1);
      if (st.hp >= d.maxHp) break;
    }
    t += fightT + 3; Z.t += fightT + 3; Z.killT.push(fightT);
    if (st.hp - hpLoss <= 0) { // 죽음: 마을로, 금화 일부 잃음
      deaths++; Z.deaths++; st.hp = d.maxHp; st.gold = Math.floor(st.gold * 0.9); t += 40; Z.t += 40;
      if (Z.deaths > 25 && zi > 0 && Z.kills < 200) { /* 너무 어려우면 한 지역 돌아가 키운다 */ zi--; }
      continue;
    }
    st.hp = Math.min(d.maxHp, st.hp - hpLoss + d.hpRegen * 3);
    Z.kills++;
    if (liberateAdd(st, zn.id, tier)) Z.lib = t - Z.t0;
    addAP(st, d.cls.ap, AP_TABLE.meleeHit * fightT * d.atkRate + AP_TABLE.meleeKill);
    addAP(st, 'vit', (md * fightT / d.maxHp) * AP_TABLE.hurtScale);
    gainExp(st, m.exp * rewardFactor(st, L).exp);
    dropMats(st, zn.id, tier, rng);
    for (const dr of rollLoot(m, { magicFind: d.magicFind, goldFind: d.goldFind }, st, rng)) {
      if (dr.kind === 'gold') { st.gold += dr.amount; Z.gold += dr.amount; continue; }
      const it = dr.item;
      if (it.book) continue;
      if (!BASES[it.base].slot) { addItem(st, it); continue; }
      const slot = BASES[it.base].slot === 'ring' ? 'ring1' : BASES[it.base].slot, cur = st.equip[slot];
      if (BASES[it.base].cls && cur && BASES[cur.base].cls !== BASES[it.base].cls) { st.gold += 5; continue; }
      if (!cur || score(it) > score(cur) * 1.05) { if (addItem(st, it)) equip(st, it.uid); }
      else st.gold += Math.max(1, Math.floor((BASES[it.base].price || 30) / 4));
    }
    // 장비 정리: 가방의 낡은 장비는 판다
    st.inv = st.inv.filter((x) => !BASES[x.base]?.slot || x.book);
    // 마을: 5분마다 들러 짓기 · 올리기 · 강화 · 제작
    if (Math.floor((t - fightT - 3) / 300) !== Math.floor(t / 300)) town(st, now());
    // 다음 지역: 평균 처치 3초 미만이고 이 지역에서 최근 죽지 않았다면
    const recent = Z.killT.slice(-60);
    if (recent.length >= 60 && recent.reduce((a, b) => a + b, 0) / 60 < 3 && Z.deaths * 40 < Z.kills) { Z.t1 = t; zi++; }
  }
  // 던전: 마지막 지역에서 단계 1~10 (단계마다 방 몬스터 14 + 우두머리). 지면 30분 더 사냥하고 다시
  const dgT = [];
  if (zi >= ZONES.length) {
    const zn = ZONES[ZONES.length - 1];
    for (let stg = 1; stg <= 10 && t < MAX_H * 3600; ) {
      const mod = stageMods(stg), L = zn.levels[1] + stg, t0 = t;
      let ok = true; st.hp = derive(st).maxHp;
      const list = [...Array(11).fill('normal'), ...Array(3).fill('elite'), 'boss'];
      for (const [idx, tier] of list.entries()) {
        if (idx === 6 || idx === 14) { st.hp = derive(st).maxHp; t += 20; } // 방 사이에서 쉰다
        const type = tier === 'boss' ? zn.boss.type : pickW(zn.spawns, rng);
        const m = mon(type, L, tier); m.maxHp *= mod.hp; m.dmg = m.dmg.map((v) => v * mod.dmg);
        const d = derive(st), titleK = 1 + 0.08 * [20, 40, 60].filter((n) => st.awakenings >= n).length, red = m.armor / (m.armor + 60);
        const pd = avg(d.dmg) * (1 + d.crit * (d.critMult - 1)) * d.atkRate * (1 - red) * SKILL_K * titleK;
        const md = (avg(m.dmg) / m.def.interval) * (1 - d.dodge) * (1 - damageReduction(d.armor, L)) * (1 - d.block * 0.7);
        const ft = m.maxHp / pd; t += ft + 2;
        st.hp -= md * ft - d.hpRegen * ft;
        while (st.hp < d.maxHp * 0.3) { const pt = st.inv.find((x) => x.base?.startsWith('hp_potion') && x.qty > 0); if (!pt) break; st.hp += BASES[pt.base].restore.hp; pt.qty--; if (!pt.qty) st.inv.splice(st.inv.indexOf(pt), 1); pots++; }
        if (st.hp <= 0) { ok = false; deaths++; break; }
        gainExp(st, m.exp * 1.5 * rewardFactor(st, L).exp);
      }
      if (ok) { // 돌파 보상: 영웅 이상 장비 2개 (더 좋으면 낀다)
        dgT.push((t - t0) / 60); stg++;
        for (let k = 0; k < 2; k++) { const it = makeItem(rollBase(L, rng), { rarity: rng() < 0.08 + stg * 0.035 ? 'legend' : 'hero', ilvl: L }, st, rng); const slot = BASES[it.base].slot === 'ring' ? 'ring1' : BASES[it.base].slot, cur = st.equip[slot];
          if ((!BASES[it.base].cls || !cur || BASES[cur.base].cls === BASES[it.base].cls) && (!cur || score(it) > score(cur))) { if (addItem(st, it)) equip(st, it.uid); } }
      }
      else { // 다시 키운다: 30분 사냥 (경험 · 물약 보충)
        for (let k = 0; k < 400; k++) { const m = mon(pickW(zn.spawns, rng), zn.levels[1], 'normal'); gainExp(st, m.exp * rewardFactor(st, zn.levels[1]).exp); }
        st.inv.push(makeItemSafe(st)); t += 1800; dgT.push(null);
      }
    }
  }
  Math.random = R;
  return { dgT, dgStage: dgT.filter((x) => x != null).length, start, seed, t, deaths, pots, aw: st.awakenings, zi, zones, gear: SLOTS.map((s) => st.equip[s] ? `${s}:${st.equip[s].rarity[0]}${st.equip[s].plus || 0}${st.equip[s].set ? 'S' : ''}` : '').filter(Boolean).join(' '), town: Object.values(townOf(st).plots).map((b) => b.type + b.lv).join(' ') };
}

function town(st, now) {
  tick(st, now);
  const t = townOf(st);
  const want = ['mine', 'smithy', 'workshop', 'herb', 'inn'];
  for (const [i, type] of want.entries()) if (!Object.values(t.plots).some((b) => b.type === type)) build(st, 'p' + (i + 1), type);
  for (const p of Object.keys(t.plots)) { collect(st, p); if (st.gold > 20000) upgrade(st, p); }
  for (const s of SLOTS) { const it = st.equip[s]; if (!it) continue; for (let k = 0; k < 3; k++) { const c = enhanceCost(it); if ((it.plus || 0) >= enhanceCap(st) || st.gold < c.gold * 3 || t.ore < c.ore) break; enhance(st, it); } }
  for (const zn of craftZones(st)) for (const sl of SET_SLOTS) {
    const cur = st.equip[sl], zi = ZONES.indexOf(zn);
    if (cur?.set === zn.id || (cur && cur.ilvl > zn.levels[1])) continue;
    if (st.gold < craftCost(zi).gold * 2) continue;
    const r = craft(st, zn.id, sl); if (r.ok) equip(st, r.item.uid);
  }
}

function makeItemSafe(st) { return { uid: Math.random(), base: 'hp_potion_l', qty: 20 }; }
const fmt = (s) => s == null ? '-' : s < 3600 ? `${Math.round(s / 60)}분` : `${(s / 3600).toFixed(1)}시간`;
const rows = [];
for (let i = 0; i < RUNS; i++) for (const start of ['sword', 'bow', 'staff']) rows.push(run(1000 + i, start));
const lines = [`# 밸런스 시뮬레이션 (${new Date().toISOString().slice(0, 16)})`, '', `판 ${rows.length} (시작 무기 3종 × ${RUNS}), 최대 ${MAX_H}시간, 스킬 배율 ${SKILL_K}`, ''];
lines.push('| 시작 | 지역 | 평균 머문 시간 | 평균 죽음 | 들어갈 때 각성 | 평균 처치 시간 | 해방까지 | 도달한 판 |', '|---|---|---|---|---|---|---|---|');
for (const start of ['sword', 'bow', 'staff']) {
  const rs = rows.filter((r) => r.start === start);
  ZONES.forEach((zn, zi) => {
    const got = rs.filter((r) => r.zones[zi].t0 != null);
    if (!got.length) return;
    const m = (f) => got.reduce((a, r) => a + f(r.zones[zi]), 0) / got.length;
    lines.push(`| ${start} | ${zn.name} | ${fmt(m((z) => z.t))} | ${m((z) => z.deaths).toFixed(1)} | ${m((z) => z.aw0).toFixed(1)} | ${m((z) => z.killT.length ? z.killT.reduce((a, b) => a + b, 0) / z.killT.length : 0).toFixed(1)}초 | ${(() => { const L = got.filter((r) => r.zones[zi].lib != null); return L.length ? fmt(L.reduce((a, r) => a + r.zones[zi].lib, 0) / L.length) + ` (${L.length})` : '-'; })()} | ${got.length}/${rs.length} |`);
  });
  const done = rs.filter((r) => r.zi >= ZONES.length);
  lines.push(`| ${start} | **끝까지** | ${done.length ? fmt(done.reduce((a, r) => a + r.t, 0) / done.length) : '-'} | ${(rs.reduce((a, r) => a + r.deaths, 0) / rs.length).toFixed(1)} | 최종 각성 ${(rs.reduce((a, r) => a + r.aw, 0) / rs.length).toFixed(1)} | 물약 ${Math.round(rs.reduce((a, r) => a + r.pots, 0) / rs.length)} | ${done.length}/${rs.length} |`);
}
lines.push('', '## 던전 (화염 균열 1~10단계, 모든 지역 뒤)', '', '| 시작 | 평균 도달 단계 | 단계당 평균 시간(분) | 실패 횟수 |', '|---|---|---|---|');
for (const start of ['sword', 'bow', 'staff']) {
  const rs = rows.filter((r) => r.start === start && r.zi >= ZONES.length);
  if (!rs.length) continue;
  const tm = rs.flatMap((r) => r.dgT.filter((x) => x != null)), fails = rs.reduce((a, r) => a + r.dgT.filter((x) => x == null).length, 0);
  lines.push(`| ${start} | ${(rs.reduce((a, r) => a + r.dgStage, 0) / rs.length).toFixed(1)} | ${tm.length ? (tm.reduce((a, b) => a + b, 0) / tm.length).toFixed(1) : '-'} | ${(fails / rs.length).toFixed(1)} |`);
}
lines.push('', '## 판 예시 (첫 판)', ...['sword', 'bow', 'staff'].map((s) => { const r = rows.find((x) => x.start === s); return `- ${s}: 장비 ${r.gear} · 마을 ${r.town}`; }));
console.log(lines.join('\n'));
