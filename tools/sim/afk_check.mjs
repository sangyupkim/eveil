// 사용: node tools/sim/afk_check.mjs <코드 폴더> <이름> <저장 JSON(D1 응답)> <무간 층>
// 디엘(이전 저장, 장비 다 낀 상태)을 무간 6층 종말의 왕좌에 세워 본다: 받는 피해 · 버티는 대수 · 마나 (root = 코드 위치)
import fs from 'fs';
const root = process.argv[2], tag = process.argv[3];
await import(root + '/src/data/skill_fx.js');
const P = await import(root + '/src/game/player.js'), I = await import(root + '/src/game/items.js'), SK = await import(root + '/src/game/skills.js');
const { SKILLS } = await import(root + '/src/data/skills.js'), { ZONES, MONSTERS } = await import(root + '/src/data/world.js'), { TIERS } = await import(root + '/src/data/config.js');
const { chapterK: ck0 } = await import(root + '/src/data/chapters.js'), { muganCurveK } = await import(root + '/src/data/tiercurve.js');
const st = JSON.parse(JSON.parse(fs.readFileSync(process.argv[4])).result[0].results[0].data);
if (I.capAll) { I.capAll(Object.values(st.equip)); }
const d = P.derive(st);
const zi = ZONES.findIndex((z) => z.id === 'throne'), zn = ZONES[zi], floor = Number(process.argv[5] || 6), L = zn.levels[1] + 380 + 10 * floor;
const CK = (tier) => { const c = ck0(zi, tier), t = muganCurveK(zi, floor), n = ck0(zi, 'normal'); return { dmg: t.dmg * (c.dmg / n.dmg), hp: t.hp * (c.hp / n.hp) }; };
const hit = (type, tier) => { const def = MONSTERS[type], k = (1 + 0.27 * (L - 1)) * TIERS[tier].dmg * CK(tier).dmg; return { avg: (def.dmg[0] + def.dmg[1]) / 2 * k, max: def.dmg[1] * k }; };
const red = P.damageReduction(d.armor, L), dr = (1 - red) * (1 - (d.dmgReduce || 0) / 100);
const ts = Object.keys(zn.spawns); const nAvg = ts.reduce((a, t) => a + hit(t, 'normal').avg, 0) / ts.length, nMax = Math.max(...ts.map((t) => hit(t, 'normal').max));
const bMax = hit(zn.boss.type, 'boss').max, eMax = Math.max(...ts.map((t) => hit(t, 'elite').max));
// 마나: 지금 퀵슬롯 스킬을 재사용마다 쓸 때 초당 소모
let spend = 0; const q = (st.quick || []).filter(Boolean);
for (const id of q) { const s = st.skills[id]; if (!s || !SKILLS[id]) continue; const v = SK.skillValues(id, s.rank, Object.values(s.mod || {})); let mp;
  if (SK.mpCost) mp = SK.mpCost(st, id, v); else { mp = v.mp; if (SKILLS[id].mpPct) mp = Math.max(mp, Math.ceil(d.maxMp * SKILLS[id].mpPct)); }
  spend += mp / Math.max(0.3, v.cd || 1); }
console.log(JSON.stringify({ 코드: tag, 층: floor, 몬스터레벨: L, 최대HP: Math.round(d.maxHp), 방어감소: (red * 100).toFixed(1) + '%', 받는피해감소: d.dmgReduce || 0,
  일반평균한대: Math.round(nAvg * dr), '일반 최대 몇 대': +(d.maxHp / (nMax * dr)).toFixed(1), '정예 최대 몇 대': +(d.maxHp / (eMax * dr)).toFixed(1), '보스 최대 몇 대': +(d.maxHp / (bMax * dr)).toFixed(1),
  최대MP: Math.round(d.maxMp), 'MP 초당 회복': +d.mpRegen.toFixed(1), 'MP 초당 소모': Math.round(spend), '마나 바닥(초)': spend > d.mpRegen ? Math.round(d.maxMp / (spend - d.mpRegen)) : '안 닳음', 생명흡수: d.lifeSteal || 0, 'HP 초당 회복': +(d.hpRegen || 0).toFixed(1) }));
