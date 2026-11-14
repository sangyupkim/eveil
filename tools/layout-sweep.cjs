// 모든 창을 여러 화면 크기로 찍고, 글자가 세로로 쪼개진 곳(아주 좁은 글 칸)을 찾는다
const { chromium } = require('playwright');
const OUT = process.argv[2];
const SIZES = { phone: [844, 390, true], fold: [904, 1000, true], pc: [1366, 768, false] };
(async () => {
  const b = await chromium.launch();
  const report = [];
  for (const [nm, [W, H, touch]] of Object.entries(SIZES)) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8099/'); await p.waitForTimeout(1500);
    await p.evaluate(() => { const v = document.getElementById('btnNewChar'); if (v && v.offsetParent) v.click(); }); await p.waitForTimeout(300);
    await p.fill('#nameInput', '점검').catch(() => {}); await p.click('#btnNew').catch(() => {}); await p.waitForTimeout(3000);
    await p.evaluate(() => { const c = document.querySelector('.pickCard'); c?.click(); document.querySelector('#startPick .plate, #startPick button.plate')?.click(); });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { document.querySelectorAll('#nickBox, .modal').forEach((e) => { e.hidden = true; }); });
    // 살림살이: 장비 · 보석 · 건물 · 용병 · 파편
    await p.evaluate(async () => {
      const G = window.__game, w = G.world, st = w.st; G.windows.close();
      const I = await import('/src/game/items.js'), T = await import('/src/game/town.js'), Inv = await import('/src/game/inventory.js'), Sh = await import('/src/game/shards.js');
      st.gold = 999999; st.awakenings = 40;
      for (let i = 0; i < 14; i++) { const it = I.makeItem(I.rollBase(40), { rarity: ['magic', 'rare', 'hero', 'legend'][i % 4], ilvl: 40 }, st); st.inv.push(it); if (i < 8) Inv.equip(st, it.uid); }
      for (const g of ['gem_ruby_0', 'gem_sapphire_1', 'gem_emerald_0', 'gem_diamond_2']) st.inv.push({ uid: Math.random() * 1e9 | 0, base: g, qty: 4 });
      for (let i = 0; i < 3; i++) st.inv.push(Sh.rollShard(30, st));
      const t = T.townOf(st); t.ore += 200; t.mats.field = 30;
      const types = ['smithy', 'workshop', 'guild', 'house', 'inn', 'lab', 'herb', 'mine'];
      (await import('/src/data/buildings.js')).PLOTS.forEach((pl, i) => { t.plots[pl.id] = { type: types[i], lv: 4, stock: 5, since: 0 }; });
      for (const m of T.recruits(st)) T.hire(st, m.id);
      st.skills.fire_bolt = { rank: 30, exp: 0, mod: { 25: 'echo' } };
      w.refreshTown(); w.ui.dirty();
    });
    const wins = [['inv'], ['skills'], ['char'], ['quest'], ['dex'], ['map'], ['guide'], ['menu'], ['shop', ['shop']], ['vault', ['vault']], ['gems', ['gems']],
      ...['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'].map((pl) => ['town', ['town'], 'one', pl]), ['town', ['town'], 'build', 'p3']];
    for (const [k, talk, mode, pl] of wins) {
      await p.evaluate(([k, talk, mode, pl]) => { const W = window.__game.windows; W.close(); if (pl) W.townSel = pl; if (talk) W.talkTo(talk, k, mode); else W.show(k); }, [k, talk, mode, pl]);
      await p.waitForTimeout(250);
      const bad = await p.evaluate(() => {
        // 한 줄 높이에 글 한두 자만 들어가는 좁은 글 상자 · 가로로 넘치는 창
        const out = [];
        for (const el of document.querySelectorAll('#window .body *')) {
          if (!el.offsetParent || el.children.length) continue;
          const t = el.textContent.trim(); if (t.length < 4) continue;
          const r = el.getBoundingClientRect(), lh = parseFloat(getComputedStyle(el).lineHeight) || 16;
          if (r.width < 34 && r.height > lh * 2.5) out.push('세로쪼개짐: ' + t.slice(0, 12));
        }
        for (const f of document.querySelectorAll('#window .frame')) if (f.scrollWidth > f.clientWidth + 4) out.push('가로넘침: ' + (f.querySelector('h3')?.textContent || '').slice(0, 12));
        return [...new Set(out)].slice(0, 5);
      });
      const tag = `${nm}-${k}${pl ? '-' + pl + mode : ''}`;
      if (bad.length) report.push(tag + ' ' + bad.join(' | '));
      await p.screenshot({ path: `${OUT}/${tag}.png` });
    }
    if (errs.length) report.push(nm + ' 오류 ' + errs.join(' / '));
    await ctx.close();
  }
  console.log(report.join('\n') || '문제 없음');
  await b.close();
})();
