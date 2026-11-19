const { chromium } = require('playwright');
const OUT = process.argv[2] === 'outro' ? [['outro_1920x1080', 1920, 1080, 'wide', 'bg_orc.png&br=.7', '지금 브라우저에서 바로 · 휴대폰 · PC']] : [
  ['cover_1920x1080', 1920, 1080, 'wide', 'bg_boss.png&br=.72', '쿼터뷰 액션 RPG'],
  ['cover_1280x720', 1280, 720, 'wide', 'bg_boss.png&br=.72', '쿼터뷰 액션 RPG'],
  ['cover_630x500_itch', 630, 500, 'square', 'bg_boss.png&br=.7', ''],
  ['cover_800x800', 800, 800, 'square', 'bg_orc.png', ''],
  ['cover_800x1200', 800, 1200, 'tall', 'bg_swamp.png', '쿼터뷰 액션 RPG'],
  ['banner_1500x500', 1500, 500, 'wide', 'bg_orc.png', ''],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [n, w, h, lay, bg, sub] of OUT) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(`file://${__dirname}/key.html?w=${w}&h=${h}&lay=${lay}&bg=${bg}&sub=${encodeURIComponent(sub)}`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
    await p.screenshot({ path: `out_${n}.png` });
  }
  await b.close();
})();
