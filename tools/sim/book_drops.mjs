import '../../src/data/skill_fx.js';
import { SKILLS } from '../../src/data/skills.js';
import { rollLoot } from '../../src/game/loot.js';
import { newPlayer } from '../../src/game/player.js';
import { ZONES } from '../../src/data/world.js';
const st = newPlayer('t', {}, null); st.awakenings = 70;
const AW = [20, 60, 150, 300, 500];
const usable = (sk) => sk.awaken != null ? (st.awakenings >= AW[sk.awaken] - (sk.awaken === 0 ? 20 : 0)) : true;
for (const [label, L, zi] of [['평온 오크 요새(43~48)', 48, 8], ['평온 종말의 왕좌(111~120)', 120, 19], ['악몽 푸리에 들판(123)', 123, 0], ['악몽 망령의 항구(180)', 180, 10]]) {
  const cnt = {}; let books = 0, kills = 0;
  for (const tier of ['normal', 'elite', 'named', 'boss']) {
    const n = { normal: 60000, elite: 6000, named: 600, boss: 200 }[tier];
    for (let i = 0; i < n; i++) {
      kills++;
      const mon = { level: L, tier, sp: { zone: ZONES[zi] }, exp: 1 };
      let out; try { out = rollLoot(mon, {}, st, Math.random); } catch (e) { out = []; }
      for (const d of out) if (d.item?.book) { books++; const sk = SKILLS[d.item.book]; const k = (sk.awaken != null ? `${sk.awaken + 1}차(각성 ${AW[sk.awaken]})` : `차수 ${sk.tier}`) + (usable(sk) ? '' : ' ✗'); cnt[k] = (cnt[k] || 0) + 1; }
    }
  }
  console.log(`\n${label} · 몬스터 Lv ${L} · 각성 70 캐릭터 · 책 ${books}권`);
  for (const [k, v] of Object.entries(cnt).sort()) console.log('  ', k.padEnd(18), (v / books * 100).toFixed(1) + '%');
}
