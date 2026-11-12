// 방치 경제 시뮬레이션: 마을 생산 · 용병 · 강화 · 제작을 가상 시간으로 돌려
// "방치 수입이 직접 사냥을 앞지르는지", "강화 · 건물 비용이 어디서 막히는지"를 본다.
// node tools/sim/economy.mjs [반복=2000]
import { newPlayer } from '../../src/game/player.js';
import { liberateAdd, townOf, build, upgrade, collect, tick, hire, dispatch, claim, enhance, enhanceCost } from '../../src/game/town.js';
import { rollLoot } from '../../src/game/loot.js';
import { itemValue } from '../../src/game/items.js';
import { BUILDINGS, EXPEDITIONS, ENHANCE, mercCost } from '../../src/data/buildings.js';
import { MAT_DROP, upgradeMats, craftCost } from '../../src/data/crafting.js';
import { MONSTERS, ZONES } from '../../src/data/world.js';
import { TIERS, CONFIG } from '../../src/data/config.js';
import { seeded } from '../../src/game/rng.js';

const N = Number(process.argv[2] || 2000), H = 3600e3;
const out = [`# 방치 경제 시뮬레이션 (${new Date().toISOString().slice(0, 16)})`, '', `반복 ${N}`, ''];
const mon = (zn, tier) => ({ tier, level: Math.round((zn.levels[0] + zn.levels[1]) / 2) });

// 1) 직접 사냥 수입 (한 마리 3초 + 이동 → 시간당 900마리, 정예 비율 반영)
out.push('## 1. 시간당 수입: 직접 사냥 vs 용병 (금화 · 장비 판매값 포함)', '', '| 지역 | 사냥 금화/시간 | 사냥 재료/시간 | 용병 Lv1 긴 원정 금화/시간 | 용병 Lv10 | 용병 Lv30 | 용병 5명 Lv30 ÷ 사냥 |', '|---|---|---|---|---|---|---|');
for (const zn of ZONES) {
  const rng = seeded(7);
  let g = 0;
  for (let i = 0; i < N; i++) {
    const tier = rng() < CONFIG.eliteChance ? 'elite' : 'normal';
    for (const d of rollLoot(mon(zn, tier), {}, null, rng)) g += d.kind === 'gold' ? d.amount : d.item.book ? 0 : itemValue(d.item);
  }
  const huntG = (g / N) * 900;
  const matH = 900 * ((1 - CONFIG.eliteChance) * MAT_DROP.normal[0] * MAT_DROP.normal[1] + CONFIG.eliteChance * MAT_DROP.elite[1]);
  const merc = (lv) => {
    const st = newPlayer('e', { face: 'm01' }, 'sword'); st.gold = 1e9; townOf(st, 0); build(st, 'p1', 'inn'); hire(st); for (const z of ZONES) for (let i = 0; i < 400; i++) liberateAdd(st, z.id, 'normal');
    st.inv = []; let g = 0; const reps = Math.max(20, N / 50), rng = seeded(11);
    for (let i = 0; i < reps; i++) {
      const m = townOf(st).mercs[0]; m.lv = lv; m.exp = 0;
      dispatch(st, 0, zn.id, 'long', 0); const g0 = st.gold; const r = claim(st, 0, 1e15, rng);
      g += st.gold - g0 + r.items.reduce((a, it) => a + itemValue(it), 0); st.inv = [];
    }
    return (g / reps) / (EXPEDITIONS[2].min / 60);
  };
  const m1 = merc(1), m10 = merc(10), m30 = merc(30);
  out.push(`| ${zn.name} | ${Math.round(huntG).toLocaleString()} | ${Math.round(matH)} | ${Math.round(m1).toLocaleString()} | ${Math.round(m10).toLocaleString()} | ${Math.round(m30).toLocaleString()} | ${((m30 * 5) / huntG).toFixed(2)}배 |`);
}

// 2) 건물 생산 · 비용 회수
out.push('', '## 2. 건물: 단계별 생산량과 비용', '', '| 건물 | 단계 | 비용(금화) | 필요 재료 | 시간당 | 가득 차는 시간 |', '|---|---|---|---|---|---|');
for (const [k, d] of Object.entries(BUILDINGS)) for (let lv = 1; lv <= d.max; lv++) {
  const um = upgradeMats(lv - 1);
  out.push(`| ${d.name} | ${lv} | ${(d.cost(lv - 1) ?? 0).toLocaleString()} | ${um && lv > 1 ? `${um.zone} ${um.n}` : '-'} | ${d.rate ? d.rate(lv) : '-'} | ${d.rate ? (d.store(lv) / d.rate(lv)).toFixed(1) + '시간' : '-'} |`);
}

// 3) 강화: +n까지 평균 금화 · 강화석 (몬테카를로), 광산 최고 단계로 몇 시간
out.push('', '## 3. 강화: 0 → +n 평균 비용 (아이템 레벨 20 기준)', '', '| 목표 | 평균 시도 | 평균 금화 | 평균 강화석 | 광산 5단계로 걸리는 시간 | 금화 = 20지역 사냥 몇 시간 |', '|---|---|---|---|---|---|');
const rng = seeded(3);
for (let target = 1; target <= 10; target++) {
  let tries = 0, gold = 0, ore = 0;
  for (let i = 0; i < N; i++) {
    let n = 0;
    while (n < target) { tries++; gold += ENHANCE.gold(n, 20); ore += ENHANCE.ore(n); if (rng() < ENHANCE.chance(n)) n++; }
  }
  out.push(`| +${target} | ${(tries / N).toFixed(1)} | ${Math.round(gold / N).toLocaleString()} | ${Math.round(ore / N)} | ${(ore / N / BUILDINGS.mine.rate(5)).toFixed(1)}시간 | - |`);
}

// 4) 일주일 방치만 했을 때 (매일 두 번 접속해 거두고 원정 보냄, 사냥 0)
out.push('', '## 4. 사냥 없이 방치만 7일 (하루 2번 접속, 모든 건물 · 용병 최대한)', '');
{
  const st = newPlayer('idle', { face: 'm01' }, 'sword'); st.gold = 5000; st.awakenings = 20;
  let t = 0; townOf(st, t); const log = [];
  for (let day = 1; day <= 7; day++) for (const half of [0, 1]) {
    t += 12 * H; tick(st, t);
    ['mine', 'smithy', 'herb', 'inn', 'workshop'].forEach((ty, i) => build(st, 'p' + (i + 1), ty));
    for (const p of Object.keys(townOf(st).plots)) { collect(st, p); upgrade(st, p); }
    while (hire(st).ok);
    if (day === 1 && !half) for (let i = 0; i < 400; i++) liberateAdd(st, 'ruins', 'normal'); // 성채는 직접 해방했다고 친다
    townOf(st).mercs.forEach((m, i) => { claim(st, i, t); dispatch(st, i, 'ruins', 'long', t); });
    st.inv = st.inv.filter((x) => !x.base || !x.base.includes('potion')).slice(0, 0);
    if (half) log.push(`- ${day}일: 금화 ${Math.round(st.gold).toLocaleString()} · 강화석 ${townOf(st).ore} · 건물 ${Object.values(townOf(st).plots).map((b) => BUILDINGS[b.type].name + b.lv).join(' ')} · 용병 ${townOf(st).mercs.map((m) => 'Lv' + m.lv).join(' ')}`);
  }
  out.push(...log, '', '> 원정은 하루 2번 접속이라 4시간짜리가 하루 2번만 돈다 (방치 접속 패턴).');
}
console.log(out.join('\n'));
