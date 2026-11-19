const start = require('./base.cjs'), L = require('./lib.cjs');
(async () => {
  const { b, p, errs } = await start(); const S = L(p);
  
  // 1. 숲 전투
  await S.goZone(8, 5, 5); await p.waitForTimeout(1500); await S.pack(8, 10, { r: 3.5 });
  await p.waitForTimeout(1200); await S.cast(['chain_lightning', 'fireball', 'thunderstorm'], 450); await p.screenshot({ path: 's1_orc.png' });
  // 2. 보스
  await S.goZone(16, 4, 4); await p.waitForTimeout(1500); await S.pack(16, 6, { boss: true, r: 5 });
  await p.evaluate(() => { const w = window.__game.world, m = w.monsters.find((x) => x.tier === 'boss'); if (m) { w.bossPattern(m, 'cross'); w.bossPattern(m, 'meteors'); } });
  await S.cast(['meteor', 'thunderstorm'], 450); await p.screenshot({ path: 's2_boss.png' });
  // 3. 마을
  await p.evaluate(() => { const w = window.__game.world; window.__game.windows.close(); w.player.pos.set(1.5, 0, 3); w.moveTo = null; });
  await p.waitForTimeout(2500); await p.screenshot({ path: 's3_town.png' });
  // 4. 늪 (나무) 전투
  await S.goZone(4, -5, 6); await p.waitForTimeout(1500); await S.pack(4, 8);
  await S.cast(['blizzard', 'chain_lightning'], 600); await p.screenshot({ path: 's4_swamp.png' });
  // 5. 스킬 창 · 6. 대장간 · 7. 지도
  await p.evaluate(() => { const W = window.__game.windows; W.skillSel = 'thunderstorm'; W.show('skills'); }); await p.waitForTimeout(800); await p.screenshot({ path: 's5_skills.png' });
  await p.evaluate(async () => { const G = window.__game, W = G.windows; W.close(); const T = await import('/src/game/town.js'); const e = Object.entries(T.townOf(G.world.st).plots).find(([, b]) => b.type === 'smithy'); W.townSel = e[0]; W.talkTo(['town'], 'town', 'one'); }); await p.waitForTimeout(800); await p.screenshot({ path: 's6_smithy.png' });
  await p.evaluate(async () => { const G = window.__game; G.windows.close(); G.world.st.dungeons = { ruins: 3 }; G.world.enterDungeon(3); }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const w = window.__game.world; const ms = w.monsters.filter((m) => !m.dead).sort((a, b) => Math.hypot(a.pos.x - w.player.pos.x, a.pos.z - w.player.pos.z) - Math.hypot(b.pos.x - w.player.pos.x, b.pos.z - w.player.pos.z)); const m = ms[0]; if (m) { w.player.pos.set(m.pos.x - 3, 0, m.pos.z + 2); } });
  await p.waitForTimeout(1500); await S.cast(['inferno_field', 'chain_lightning'], 500); await p.screenshot({ path: 's7_dungeon.png' });
  console.log(errs); await b.close();
})();
