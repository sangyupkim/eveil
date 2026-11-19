// 홍보용: 1920×1080 데스크톱 화면, 높은 단계 저장으로 시작
const { chromium } = require('playwright');
module.exports = async function start(opts = {}) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, ...(opts.video ? { recordVideo: { dir: opts.video, size: { width: 1920, height: 1080 } } } : {}) });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const v = document.getElementById('btnNewChar'); if (v && v.offsetParent) v.click(); }); await p.waitForTimeout(300);
  await p.fill('#nameInput', '방랑자').catch(() => {}); await p.click('#btnNew').catch(() => {}); await p.waitForTimeout(3000);
  const card = await p.$('.card, [data-start]'); if (card) { await card.click().catch(() => {}); await p.waitForTimeout(300); const go = await p.$('text=이 무기로 시작'); if (go) await go.click(); await p.waitForTimeout(2500); }
  // 홍보용 캐릭터: 중반 마법사 (숫자가 너무 크지 않게), 죽지 않는다
  await p.evaluate(async () => {
    const G = window.__game, w = G.world, st = w.st;
    const I = await import('/src/game/items.js'), Inv = await import('/src/game/inventory.js'), T = await import('/src/game/town.js');
    st.tut = 99; st.name = st.nick = '방랑자'; st.awakenings = 64; st.gold = 1840000; st.stats.int += 110; st.stats.wis += 40; st.stats.vit += 50;
    st.titles = [{ tier: 0, key: 'int', name: '원소술사', perk: { text: '' } }];
    for (const [id, r] of [['fire_bolt', 48], ['fireball', 41], ['chain_lightning', 36], ['meteor', 33], ['blizzard', 28], ['thunderstorm', 26], ['inferno_field', 22], ['flame_wave', 30]]) st.skills[id] = { rank: r, exp: 40, mod: {} };
    st.quick = ['meteor', 'thunderstorm', 'inferno_field', 'blizzard', 'chain_lightning', 'fireball', 'flame_wave', 'fire_bolt'];
    st.settings = { ...(st.settings || {}), chatHud: false };
    for (let i = 0; i < 24; i++) Inv.addItem(st, I.makeItem(I.rollBase(60), { rarity: ['magic', 'rare', 'hero', 'legend'][i % 4], ilvl: 60 }, st));
    for (const it of [...st.inv].filter((x) => ['hero', 'legend'].includes(x.rarity))) Inv.equip(st, it.uid);
    const t = T.townOf(st); const plan = [['p1', 'smithy'], ['p2', 'workshop'], ['p3', 'guild'], ['p4', 'house'], ['p5', 'inn'], ['p6', 'lab'], ['p7', 'herb'], ['p8', 'mine'], ['p9', 'altar']];
    for (const [pl, ty] of plan) t.plots[pl] = { type: ty, lv: 6, stock: 0, since: Date.now() };
    for (const m of T.recruits(st)) { st.gold += 99999; T.hire(st, m.id); }
    const P = await import('/src/game/player.js'); w.d = P.derive(st, w.buffValues()); st.hp = w.d.maxHp; st.mp = w.d.maxMp;
    w.hurtPlayer = () => {}; w.ui.titlePick = () => {}; document.getElementById('titlePick')?.remove(); setInterval(() => document.getElementById('titlePick')?.remove(), 200); w.refreshTown?.(); w.refreshGear?.();
    document.querySelectorAll('#winAlert,#startPick,#nickBox,.modal').forEach((e) => e.remove()); G.windows.close(); w.ui.dirty();
  });
  await p.waitForTimeout(1000);
  return { b, ctx, p, errs };
};
