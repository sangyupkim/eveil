// 금화: 시간당 버는 양 vs 쓰는 곳 (분석용). 서버 저장의 실제 금화 · 금화 발견도 함께 (scratchpad d1/saves.json이 있으면)
import fs from 'fs';
import '../../src/data/skill_fx.js';
import { derive } from '../../src/game/player.js';
import { ENHANCE, BUILDINGS, RESEARCH, researchCost } from '../../src/data/buildings.js';
import { LOOT } from '../../src/data/config.js';
import { mercWage, rollMerc } from '../../src/game/town.js';
import { shardCost } from '../../src/game/shards.js';
import { PLUS } from '../../src/game/rumor.js';
const fmt = (n) => (n >= 1e8 ? (n / 1e8).toLocaleString(undefined, { maximumFractionDigits: 1 }) + '억' : n >= 1e4 ? Math.round(n / 1e4).toLocaleString() + '만' : Math.round(n).toLocaleString());
const kph = 1500; // 시간당 처치 (자동, 이전 분석과 같은 가정)
console.log('== 1. 사냥 금화 (몬스터 레벨 L, 금화 발견 배율 gf) ==');
const hunt = (L, gf, auto) => { const n = LOOT.normal, e = LOOT.elite, k = auto ? 0.3 : 1; return kph * (0.9 * n.gold[0] * k * 5.5 * L * n.gold[1] + 0.1 * e.gold[0] * k * 5.5 * L * 2) * gf; };
const rows1 = [];
for (const L of [120, 300, 500, 600]) for (const gf of [1, 5, 15]) rows1.push({ L, '금화 발견': `×${gf}`, '수동 시간당': fmt(hunt(L, gf, false)), '자동 시간당': fmt(hunt(L, gf, true)) });
console.table(rows1);
console.log('== 2. 던전 한 바퀴 금화 (극한, 단계 10) ==', fmt(500 * 60 * (1 + 10 * 0.2) * 3));
console.log('== 3. 쓰는 곳 (레벨 500 장비 기준) ==');
const enh = (from, to, ilvl) => { let g = 0; for (let n = from; n < to; n++) g += ENHANCE.gold(n, ilvl) / (n < 20 ? ENHANCE.chance(n) : 0.05); return g; };
const bld = Object.keys(BUILDINGS).filter((k) => BUILDINGS[k].cost).map((k) => { let g = 0; for (let lv = 0; lv < 20; lv++) g += BUILDINGS[k].cost(lv) || 0; return g; }).reduce((a, b) => a + b, 0);
const res = Object.keys(RESEARCH).reduce((a, id) => { let g = 0; for (let lv = 0; lv < Math.min(10, RESEARCH[id].max ?? 10); lv++) g += researchCost(lv, id).gold; return a + g; }, 0);
let wage = 0; for (let i = 0; i < 20; i++) { const m = rollMerc(Math.random, 5); m.lv = 20; wage += mercWage(m); }
const rows3 = [
  { 쓰는곳: '장비 하나 +0 → +20 (기대값)', 금화: fmt(enh(0, 20, 500)) },
  { 쓰는곳: '장비 하나 초월 +20 → +30 (성공 5% 가정)', 금화: fmt(enh(20, 30, 500)) },
  { 쓰는곳: '장비 11칸 모두 +20', 금화: fmt(11 * enh(0, 20, 500)) },
  { 쓰는곳: '건물 모두 20단계까지 (합)', 금화: fmt(bld) },
  { 쓰는곳: '연구 모두 10단계 (합)', 금화: fmt(res) },
  { 쓰는곳: '용병 20명 하루 품삯 (Lv20)', 금화: fmt(wage) },
  { 쓰는곳: '파편 붙이기 한 번 (Lv500 장비)', 금화: fmt(shardCost({ ilvl: 500 }).gold) },
  { 쓰는곳: '숨은 던전 +5 한 번', 금화: fmt(PLUS[5].cost.gold) },
];
console.table(rows3);
const p = '/tmp/claude-0/-home-user/addd5b13-fd84-5c2f-b9b3-b0b2afc7e29c/scratchpad/d1/saves.json';
if (fs.existsSync(p)) { console.log('== 4. 서버 저장 (지난번 받아 둔 것) ==');
  const rows4 = [];
  for (const r of JSON.parse(fs.readFileSync(p)).result[0].results) { let st; try { st = JSON.parse(r.data); } catch { continue; } if (!st.equip) continue; const d = derive(st);
    rows4.push({ 이름: st.name, 각성: st.awakenings, 금화: fmt(st.gold || 0), '금화 발견': `×${d.goldFind.toFixed(1)}` }); }
  console.table(rows4); }
