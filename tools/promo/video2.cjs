// 홍보 영상 2: 짧은 장면 여러 개를 따로 녹화하고, 이어 붙일 때 검은 화면으로 넘긴다 (맵이 순간이동하는 모습이 안 보이게)
// 이야기: 행동한 대로 성장 → 몬스터 처치 · 드랍 → 보스 → 던전 · 돌파 → 강화 → 더 강한 곳
const start = require('./base.cjs'), L = require('./lib.cjs'), fs = require('fs');
(async () => {
  const { b, ctx, p, errs } = await start(); const S = L(p);
  await p.addStyleTag({ content: `#toasts, #titlePick, #chatBox { display: none !important }
    #promoCap { position: fixed; left: 0; right: 0; top: 13%; text-align: center; z-index: 99999; pointer-events: none; font-family: var(--f-title); font-weight: 800; font-size: 60px; color: #f6e2a6;
      text-shadow: 0 3px 0 #2a1806, 0 0 24px rgba(0,0,0,.95), 0 0 8px #000; letter-spacing: .06em; opacity: 0; transform: translateY(8px); transition: opacity .35s, transform .35s; }
    #promoCap small { display: block; font-size: 28px; color: #efe3c6; margin-top: 10px; letter-spacing: .02em; font-family: var(--f-body); font-weight: 400; }
    #promoCap.on { opacity: 1; transform: none; }` });
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'promoCap'; document.body.appendChild(d); });
  const cap = (t, sub = '') => p.evaluate(([t, sub]) => { const d = document.getElementById('promoCap'); if (t) d.innerHTML = `${t}${sub ? `<small>${sub}</small>` : ''}`; d.classList.toggle('on', !!t); }, [t, sub]);
  const W = (ms) => p.waitForTimeout(ms);
  // 장면 녹화: CDP screencast 프레임을 장면 폴더마다
  const root = __dirname + (process.env.ONLY ? '/seg_' + process.env.ONLY : '/seg'); fs.rmSync(root, { recursive: true, force: true }); fs.mkdirSync(root);
  const cdp = await ctx.newCDPSession(p); let seg = null, frames = [];
  cdp.on('Page.screencastFrame', (f) => { if (seg) { fs.writeFileSync(`${root}/${seg}/${String(frames.length).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64')); frames.push(f.metadata.timestamp); } cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const done = [];
  const rec = async (name, fn) => {
    seg = name; frames = []; fs.mkdirSync(`${root}/${name}`);
    await fn();
    const fr = frames; seg = null;
    let Ls = ''; for (let i = 0; i < fr.length; i++) Ls += `file '${root}/${name}/${String(i).padStart(5, '0')}.jpg'\nduration ${Math.max(0.005, (fr[i + 1] ?? fr[i] + 0.035) - fr[i]).toFixed(4)}\n`;
    fs.writeFileSync(`${root}/${name}/list.txt`, Ls); done.push(name); await cap(''); await W(300);
  };
  // 몬스터 체력: 스킬 몇 번에 쓰러지게 (일반 · 정예 · 보스)
  const setHp = (k) => p.evaluate((k) => { const w = window.__game.world, base = w.d.spellBase || 300; for (const m of w.monsters) { if (m.dead || m.dungeon) continue; const v = base * (m.tier === 'boss' ? k.boss : m.tier === 'elite' ? k.elite : k.normal); m.maxHp = m.hp = v; } }, k);
  const awaken = () => p.evaluate(async () => { const w = window.__game.world, G = await import('/src/game/growth.js'); const st = w.st; st.ap = { str: 0, dex: 0, int: 40, wis: 8, vit: 4 }; const rs = G.gainExp(st, G.expNeeded(st.awakenings) - st.exp + 1); for (const r of rs) w.onAwaken(r); });

  if (process.env.ONLY !== 'enh') {
  // 1. 행동한 대로 성장
  await S.goZone(6, 6, 4); await W(400); await S.pack(6, 7, { r: 3.4 }); await setHp({ normal: 3, elite: 6, boss: 30 }); await W(900);
  await rec('a_grow', async () => {
    await cap('직업은 없다', '주문을 쓰면 지능이, 칼을 휘두르면 힘이 오른다'); await W(300);
    await S.cast(['flame_wave', 'chain_lightning', 'fireball'], 520); await cap(''); await W(350); await awaken(); await W(2400);
  });
  // 2. 처치 · 드랍
  await S.goZone(8, 5, 5); await W(400); await S.pack(8, 10, { r: 3.2 }); await setHp({ normal: 2.2, elite: 4, boss: 30 }); await p.evaluate(() => { window.__game.world.d.magicFind = 400; }); await W(900);
  await rec('b_loot', async () => {
    await cap('잡고, 줍고', '몬스터를 쓰러뜨리면 장비 · 보석 · 스킬북이 쏟아진다');
    await S.cast(['meteor', 'thunderstorm', 'inferno_field', 'chain_lightning'], 560); await W(1900);
  });
  // 3. 보스
  await S.goZone(16, 4, 4); await W(400); await S.pack(16, 5, { boss: true, r: 4.5 }); await setHp({ normal: 2, elite: 3, boss: 14 }); await W(900);
  await rec('c_boss', async () => {
    await cap('보스를 쓰러뜨리고', '보스마다 다른 패턴 — 색칠된 곳을 피하라');
    await p.evaluate(() => { const w = window.__game.world, m = w.monsters.find((x) => x.tier === 'boss' && !x.dead); if (m) { w.bossPattern(m, 'meteors'); setTimeout(() => w.bossPattern(m, 'cross'), 1400); } });
    await S.cast(['meteor', 'thunderstorm', 'chain_lightning', 'fireball', 'meteor', 'chain_lightning', 'fireball'], 520);
    await p.evaluate(async () => { const w = window.__game.world, I = await import('/src/game/items.js'); const m = w.monsters.find((x) => x.tier === 'boss'); const P = m?.pos || w.player.pos;
      if (m && !m.dead) w.killMonster(m, 'skill', null, { ap: 1, exp: 1 });
      setTimeout(() => { w.dropGround({ kind: 'item', item: I.makeItem(I.rollBase(90), { rarity: 'legend', ilvl: 90 }, w.st) }, P.x + 0.8, P.z + 0.6); w.fx.pillar(P.x + 0.8, P.z + 0.6, 0xffb040, 2.2, 6, 1.5); }, 500); });
    await W(2300);
  });
  // 4. 던전 · 돌파
  await p.evaluate(async () => { const G = window.__game, w = G.world, I = await import('/src/game/items.js'), V = await import('/src/game/inventory.js'); V.addItem(w.st, I.makeItem('dungeon_key', { qty: 3 }, w.st)); w.st.dungeons = { ...(w.st.dungeons || {}), ruins: 2 }; w.st.bossDone = { ...(w.st.bossDone || {}), ruins: 1 }; G.windows.close(); w.enterDungeon(3, 1); const dg = w.dungeon; if (dg) { dg.muts = []; dg.started = true; } document.getElementById('winAlert')?.remove(); });
  await W(600);
  await p.evaluate(() => { const w = window.__game.world, P = w.player.pos; const ms = w.monsters.filter((m) => m.dungeon && !m.dead && m.tier !== 'boss').sort((a, b) => Math.hypot(a.pos.x - P.x, a.pos.z - P.z) - Math.hypot(b.pos.x - P.x, b.pos.z - P.z)); const t = ms[0]; if (t) { const near = ms.filter((m) => Math.hypot(m.pos.x - t.pos.x, m.pos.z - t.pos.z) < 7); w.player.pos.set(t.pos.x - 2.5, 0, t.pos.z + 2); for (const [i, m] of near.entries()) { m.maxHp = m.hp = (w.d.spellBase || 300) * 2.2; } } });
  await W(1200);
  await rec('d_dungeon', async () => {
    await cap('던전에 도전하고', '들어갈 때마다 다른 변이 · 깊은 곳의 우두머리');
    await S.cast(['inferno_field', 'chain_lightning', 'thunderstorm', 'fireball'], 560); await W(800);
  });
  await p.evaluate(() => { const w = window.__game.world, m = w.monsters.find((x) => x.dungeon && x.tier === 'boss' && !x.dead); if (m) { w.player.pos.set(m.pos.x - 3, 0, m.pos.z + 2.5); m.maxHp = m.hp = (w.d.spellBase || 300) * 6; } });
  await W(1400);
  await rec('e_clear', async () => {
    await S.cast(['meteor', 'chain_lightning', 'fireball', 'thunderstorm'], 500);
    await p.evaluate(() => { const w = window.__game.world, m = w.monsters.find((x) => x.dungeon && x.tier === 'boss' && !x.dead); if (m) w.killMonster(m, 'skill', null, { ap: 1, exp: 1 }); });
    await W(1200); await cap('', ''); await W(2600);
  });
  await p.evaluate(() => { document.getElementById('winAlert')?.remove(); const w = window.__game.world; w.leaveDungeon(true); });
  }
  // 5. 강화
  await p.evaluate(async () => { const G = window.__game, w = G.world, W = G.windows; w.player.pos.set(0, 0, -13.5); const T = await import('/src/game/town.js'); const e = Object.entries(T.townOf(w.st).plots).find(([, b]) => b.type === 'smithy'); w.st.gold = 9e9; T.townOf(w.st).ore = 99999; const I = await import('/src/game/items.js'), V = await import('/src/game/inventory.js'); V.addItem(w.st, I.makeItem('ore', { qty: 9999 }, w.st)); W.townSel = e[0]; const I2 = await import('/src/game/items.js'), V2 = await import('/src/game/inventory.js'); const wp = I2.makeItem('archmage_staff', { rarity: 'legend', ilvl: 80 }, w.st); wp.plus = Math.max(0, T.enhanceCap(w.st) - 3); V2.addItem(w.st, wp); W.enhSel = 'b:' + wp.uid; W.talkTo(['town'], 'town', 'one'); });
  await W(600);
  await W(900);
  await rec('f_enhance', async () => {
    await cap('더 강한 장비로', '강화 · 제련 · 보석');
    for (let i = 0; i < 2; i++) { await p.evaluate(() => { const r = Math.random; Math.random = () => 0; document.querySelector('[data-enh]')?.click(); Math.random = r; }); await W(1500); }
  });
  await p.evaluate(() => { document.getElementById('forgeFx')?.remove(); window.__game.windows.close(); });
  if (process.env.ONLY !== 'enh') {
  // 6. 더 강한 곳
  await S.goZone(18, 4, 5); await W(400); await S.pack(18, 9, { r: 3.6 }); await setHp({ normal: 3, elite: 6, boss: 30 }); await W(1000);
  await rec('g_stronger', async () => {
    await cap('더 강한 적에게', '심연의 균열 · 종말의 왕좌 · 그리고 악몽 · 지옥 · 혼돈');
    await S.cast(['meteor', 'blizzard', 'thunderstorm', 'chain_lightning', 'inferno_field'], 560); await W(800);
  });
  }
  await cdp.send('Page.stopScreencast'); await ctx.close(); await b.close();
  fs.writeFileSync(root + '/order.json', JSON.stringify(done)); console.log(errs, done);
})();
