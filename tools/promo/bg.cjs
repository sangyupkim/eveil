const start = require('./base.cjs'), L = require('./lib.cjs');
(async () => {
  const { b, p, errs } = await start(); const S = L(p);
  await p.addStyleTag({ content: '#hud, #toasts, #titlePick, .lbl, .dmg { visibility: hidden !important }' });
  await S.goZone(8, 5, 5); await p.waitForTimeout(1200); await S.pack(8, 11, { r: 3.2 }); await p.waitForTimeout(1500);
  await S.cast(['chain_lightning', 'thunderstorm'], 500); await p.waitForTimeout(250); await p.screenshot({ path: 'bg_orc.png' });
  await S.goZone(16, 4, 4); await p.waitForTimeout(1200); await S.pack(16, 6, { boss: true, r: 4.5 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const w = window.__game.world, m = w.monsters.find((x) => x.tier === 'boss'); if (m) w.bossPattern(m, 'meteors'); });
  await S.cast(['blizzard', 'meteor'], 600); await p.screenshot({ path: 'bg_boss.png' });
  await S.goZone(4, -5, 6); await p.waitForTimeout(1200); await S.pack(4, 9); await p.waitForTimeout(1200);
  await S.cast(['inferno_field', 'chain_lightning'], 500); await p.screenshot({ path: 'bg_swamp.png' });
  console.log(errs); await b.close();
})();
