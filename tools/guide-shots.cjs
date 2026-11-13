// 가이드북 그림: 실제 게임 화면을 찍고 강조 표시(금색 테두리 + 번호)를 얹는다
const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1.5 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const v = document.getElementById('btnNewChar'); if (v && v.offsetParent) v.click(); }); await p.waitForTimeout(300);
  await p.fill('#nameInput', '방랑자').catch(() => {}); await p.click('#btnNew').catch(() => {}); await p.waitForTimeout(3000);
  await p.touchscreen.tap(145, 200); await p.waitForTimeout(300); await p.touchscreen.tap(420, 367); await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelectorAll('.modal, #nickBox, .ask').forEach((e) => { e.hidden = true; }));
  // 캐릭터 꾸미기: 각성 · 골드 · 스킬 · 장비 · 건물 · 용병
  await p.evaluate(async () => {
    const G = window.__game, w = G.world, st = w.st;
    const I = await import('/src/game/items.js'), T = await import('/src/game/town.js'), D = await import('/src/game/daily.js'), Inv = await import('/src/game/inventory.js');
    st.nick = '방랑자'; st.name = '방랑자';
    st.awakenings = 32; st.gold = 184000; st.stats.int += 60; st.stats.wis += 20; st.stats.vit += 20;
    st.titles = [{ tier: 0, key: 'int', name: '견습 마법사', perk: { text: '' } }];
    for (const [id, r] of [['fire_bolt', 31], ['fireball', 27], ['chain_lightning', 18], ['meteor', 12], ['frost_bolt', 9], ['iron_skin', 6]]) st.skills[id] = { rank: r, exp: 40, mod: r >= 25 ? { 25: 'echo' } : {} };
    st.quick = ['fire_bolt', 'fireball', 'chain_lightning', 'meteor', 'frost_bolt', 'iron_skin'];
    for (let i = 0; i < 9; i++) Inv.addItem(st, I.makeItem(I.rollBase(18), { rarity: ['magic', 'rare', 'hero', 'common'][i % 4], ilvl: 18 }, st));
    Inv.addItem(st, I.makeItem('hp_potion', { qty: 24 }, st)); Inv.addItem(st, I.makeItem('mp_potion', { qty: 18 }, st)); Inv.addItem(st, I.makeItem('dungeon_key', { qty: 2 }, st));
    for (const it of [...st.inv].filter((x) => I.makeItem && x.rarity === 'hero').slice(0, 2)) Inv.equip(st, it.uid);
    const t = T.townOf(st); t.ore = 140; t.mats = { field: 64, forest: 38, grave: 12 }; t.herbs = { red: 22, blue: 18, iron: 6 };
    const plan = [['p1', 'smithy'], ['p2', 'workshop'], ['p3', 'guild'], ['p4', 'house'], ['p5', 'inn'], ['p6', 'lab'], ['p7', 'herb'], ['p8', 'mine']];
    for (const [pl, ty] of plan) { t.plots[pl] = { type: ty, lv: 3, stock: ty === 'mine' ? 9 : 0, since: Date.now() }; }
    for (const m of T.recruits(st)) { st.gold += 99999; T.hire(st, m.id); }
    st.liberate = { field: 9999, forest: 9999 };
    t.brew = [{ id: 'hp_potion', n: 4, from: Date.now() - 20000, until: Date.now() + 25000 }, { id: 'mp_potion', n: 2, from: Date.now() - 60000, until: Date.now() - 1000 }];
    t.lab = { id: 'bag', from: Date.now() - 600000, until: Date.now() + 900000 };
    const dl = D.dailyOf(st); dl.list[0].have = 31; dl.list[1].have = dl.list[1].need; dl.list[1].done = true;
    st.camps = { field: { fire: true, merchant: true } };
    w.refreshTown(); w.refreshGear?.(); w.ui.dirty(); G.windows.close();
  });
  await p.waitForTimeout(800);
  // 강조 표시: [선택자 또는 {x,y,w,h}, 번호, 둥글게?]
  const hl = (items) => p.evaluate((items) => {
    document.getElementById('ghl')?.remove();
    const L = document.createElement('div'); L.id = 'ghl'; L.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999';
    for (const [sel, n, round, pad = 4] of items) {
      const r = typeof sel === 'string' ? document.querySelector(sel)?.getBoundingClientRect() : sel;
      if (!r || !r.width) continue;
      const bx = document.createElement('div');
      bx.style.cssText = `position:absolute;left:${r.x - pad}px;top:${r.y - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px;border:2.5px solid #ffd54a;border-radius:${round ? '50%' : '8px'};box-shadow:0 0 0 2px rgba(0,0,0,.6),0 0 14px rgba(255,213,74,.75),inset 0 0 10px rgba(255,213,74,.35)`;
      L.appendChild(bx);
      const bd = document.createElement('div');
      const bxp = Math.min(Math.max(r.x - pad - 9, 2), innerWidth - 22), byp = Math.min(Math.max(r.y - pad - 9, 2), innerHeight - 22);
      bd.style.cssText = `position:absolute;left:${bxp}px;top:${byp}px;width:20px;height:20px;border-radius:50%;background:#ffd54a;color:#2a1a00;font:800 13px/20px sans-serif;text-align:center;box-shadow:0 0 0 2px #2a1a00`;
      bd.textContent = n; L.appendChild(bd);
    }
    document.body.appendChild(L);
  }, items);
  const shot = async (name) => { await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${name}.png` }); await p.evaluate(() => document.getElementById('ghl')?.remove()); };
  const W = (fn, arg) => p.evaluate(fn, arg);
  const world = (x, z, y = 0) => W(([x, z, y]) => { const s = window.__game.stage.toScreen(x, z, y); return s; }, [x, z, y]);

  // 1. 화면 보기 (사냥터, 몬스터 몇)
  await W(async () => { const { world: w } = window.__game; window.__game.windows.close(); const Z = (await import('/src/data/world.js')).ZONES[0]; w.player.pos.set(Z.x - 6, 0, Z.z); w.stage.cam.x = Z.x - 6; w.stage.cam.z = Z.z; for (let i = 0; i < 4; i++) { const m = w.spawn({ zone: Z, x: Z.x - 2 + i * 1.5, z: Z.z - 2 + (i % 2) * 2, level: 3, tier: i === 3 ? 'elite' : 'normal', timer: 0, mon: null }); m.state = 'idle'; m.showHp = 9; } w.st.hp = w.d.maxHp * 0.8; });
  await p.waitForTimeout(1500);
  await hl([['#tl .who', 1], ['.lbl.me', 2], ['#qPanel', 3], ['#questBox', 4], ['#mapWrap', 5], ['.menuCol', 6], ['#quick', 7], ['#btnAttack', 8, true], ['#joy', 9, true]]);
  await p.evaluate(() => { document.getElementById('joy').classList.add('active'); });
  await shot('hud');
  await p.evaluate(() => { document.getElementById('joy').classList.remove('active'); });
  await hl([['#btnRecall', 1, true], ['#btnAuto', 2, true], ['#btnMp', 3, true], ['#btnHp', 4, true], ['#btnAttack', 5, true], ['#quick', 6]]);
  await shot('buttons');
  await hl([['#mapWrap', 1]]);
  await shot('minimap');

  // 2. 마을: 경비대장 앞 (대화 버튼)
  await W(() => { const { world: w } = window.__game; for (const m of w.monsters) { m.dead = true; w.stage.remove(m.actor); } w.monsters = []; w.player.pos.set(-4.5, 0, 7.6); w.stage.cam.x = -4.5; w.stage.cam.z = 7.6; });
  await p.waitForTimeout(1500);
  const g = await world(-4.5, 9, 2.4);
  await hl([[{ x: g.x - 40, y: g.y - 12, width: 80, height: 110 }, 1], ['#btnAttack', 2, true]]);
  await shot('talk');
  // 창고 상자 앞
  await W(() => { const { world: w } = window.__game; w.player.pos.set(8.2, 0, -10); w.stage.cam.x = 8.2; w.stage.cam.z = -10; });
  await p.waitForTimeout(1300);
  const v = await world(8.2, -11.4, 0.8);
  await hl([[{ x: v.x - 45, y: v.y - 40, width: 90, height: 70 }, 1], ['#btnAttack', 2, true]]);
  await shot('vaultspot');
  // 건물 앞 (대장간 p1)
  await W(() => { const { world: w } = window.__game; w.player.pos.set(0, 0, -13.5); w.stage.cam.x = 0; w.stage.cam.z = -15; });
  await p.waitForTimeout(1300);
  const sm = await world(0, -19, 1.5);
  await hl([[{ x: sm.x - 150, y: sm.y - 110, width: 300, height: 180 }, 1], ['#btnAttack', 2, true]]);
  await shot('building');
  // 포탈
  await W(() => { const { world: w } = window.__game; w.player.pos.set(0, 0, -0.6); w.stage.cam.x = 0; w.stage.cam.z = -0.6; });
  await p.waitForTimeout(1300);
  const pt = await world(0, -2, 0);
  await hl([[{ x: pt.x - 80, y: pt.y - 45, width: 160, height: 90 }, 1, true], ['#btnAttack', 2, true]]);
  await shot('portal');

  // 3. 창들
  const win = async (fn) => { await W(fn); await p.waitForTimeout(500); };
  const box = (sel, i = 0) => W(([sel, i]) => { const e = document.querySelectorAll(sel)[i]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, [sel, i]);
  // 가방
  await win(() => window.__game.windows.show('inv'));
  await hl([[await box('#window .frame', 0), 1], [await box('#window .frame', 1), 2], ['.matRow', 3], ['.goldTxt', 4], ['#window .tabs', 5]]);
  await shot('inv');
  // 스킬
  await win(() => { const W = window.__game.windows; W.skillSel = 'fire_bolt'; W.show('skills'); });
  await hl([[await box('#window .frame', 0), 1], [await box('#window .detail .kv', 0), 2], [await box('[data-var]', 0), 3], [await box('.qsRow', 0), 4]]);
  await shot('skills');
  // 능력
  await win(() => window.__game.windows.show('char'));
  await hl([[await box('#window .frame', 0), 1], [await box('#window .frame', 1), 2]]);
  await shot('char');
  // 퀘스트 (경비대장 앞)
  await win(() => { const W = window.__game.windows; W.close(); W.talkTo(['town'], 'quest', 'build'); });
  await hl([[await box('#window .frame', 0), 1], [await box('[data-daily]', 0), 2], [await box('#window .frame', 1), 3]]);
  await shot('quest');
  // 건물 짓기 (경비대장 → 마을 탭)
  await win(() => { const W = window.__game.windows; W.townSel = 'p3'; W.show('town'); });
  await hl([[await box('#window .frame', 0), 1], [await box('[data-upgrade]', 0), 2], [await box('.costT', 0), 3]]);
  await shot('build');
  // 대장간
  await win(() => { const W = window.__game.windows; W.close(); W.townSel = 'p1'; W.talkTo(['town'], 'town', 'one'); });
  await hl([[await box('[data-enh]', 0), 1], [await box('[data-reforge]', 0), 2]]);
  await shot('smithy');
  // 제작소
  await win(() => { const W = window.__game.windows; W.close(); W.townSel = 'p2'; W.talkTo(['town'], 'town', 'one'); });
  await hl([[await box('.herbBar', 0), 1], [await box('#window .detail .row', 0), 2], [await box('[data-brewget]', 0), 3], [await box('[data-brew]', 0), 4]]);
  await shot('workshop');
  // 파견소
  await win(() => { const W = window.__game.windows; W.close(); W.townSel = 'p3'; W.talkTo(['town'], 'town', 'one'); });
  await hl([[await box('[data-pzone]', 0), 1], [await box('[data-pexp]', 0), 2]]);
  await shot('guild');
  // 연구소
  await win(() => { const W = window.__game.windows; W.close(); W.townSel = 'p6'; W.talkTo(['town'], 'town', 'one'); });
  await hl([[await box('#window .detail .mini', 0), 1], [await box('[data-research]', 0), 2]]);
  await shot('lab');
  // 여관
  await win(() => { const W = window.__game.windows; W.close(); W.townSel = 'p5'; W.talkTo(['town'], 'town', 'one'); });
  await hl([[await box('[data-hirem]', 0), 1]]);
  await shot('inn');
  // 상점 · 창고
  await win(() => { const W = window.__game.windows; W.close(); W.talkTo(['shop'], 'shop'); });
  await hl([[await box('#window .frame', 0), 1], [await box('#window .frame', 1), 2]]);
  await shot('shop');
  await win(() => { const W = window.__game.windows; W.close(); W.talkTo(['vault'], 'vault'); });
  await hl([[await box('#window .frame', 0), 1], [await box('#window .frame', 1), 2]]);
  await shot('vault');
  // 지도 (포탈 위에서)
  await win(() => { const W = window.__game.windows; W.close(); W.portalAt = 'town'; W.show('map'); });
  await hl([[await box('#window .frame', 0), 1], [await box('#window .frame', 1), 2]]);
  await shot('map');
  // 설정
  await win(() => { const W = window.__game.windows; W.close(); W.show('menu'); });
  await hl([[await box('[data-ui="zoom"]', 0), 1], [await box('[data-uiedit]', 0), 2]]);
  await shot('menu');
  // 4. 던전
  await W(async () => { const G = window.__game; G.windows.close(); G.world.enterDungeon(0); });
  await p.waitForTimeout(1800);
  await hl([['#mapWrap', 1], ['.pill.zone', 2]]);
  await shot('dungeon');
  // 5. 보스 경고
  await W(async () => { const { world: w } = window.__game; w.leaveDungeon(true); const Z = (await import('/src/data/world.js')).ZONES[0]; w.player.pos.set(Z.x, 0, Z.z); w.stage.cam.x = Z.x; w.stage.cam.z = Z.z; w.st.hp = 1e9; const m = w.spawn({ zone: Z, x: Z.x + 6, z: Z.z - 1, level: 5, tier: 'boss', timer: 0, mon: null, forceType: Z.boss?.type }); m.state = 'idle'; w.bossPattern(m, 'cross'); w.bossPattern(m, 'meteors'); });
  await p.waitForTimeout(700);
  await shot('boss');
  console.log('errors', errs);
  await b.close();
})();
