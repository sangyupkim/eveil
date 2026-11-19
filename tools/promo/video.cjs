// 홍보 영상: 장면마다 자막 한 줄 (게임 글꼴), 시작 시각을 기록해 ffmpeg로 잘라 낸다
const start = require('./base.cjs'), L = require('./lib.cjs');
(async () => {
  const t0 = Date.now();
  const { b, ctx, p, errs } = await start(); const S = L(p);
  // 화면 그대로 받기 (Playwright 녹화는 흐려서): CDP screencast 프레임을 시각과 함께 저장
  const fs = require('fs'), dir = __dirname + '/frames'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const cdp = await ctx.newCDPSession(p), frames = []; let rec = false;
  cdp.on('Page.screencastFrame', async (f) => { if (rec) { const i = frames.length; fs.writeFileSync(`${dir}/${String(i).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64')); frames.push(f.metadata.timestamp); } cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await p.addStyleTag({ content: `#toasts, #titlePick { display: none !important }
    #promoCap { position: fixed; left: 0; right: 0; top: 16%; text-align: center; z-index: 99999; pointer-events: none; font-family: var(--f-title); font-weight: 800; font-size: 54px; color: #f6e2a6;
      text-shadow: 0 3px 0 #2a1806, 0 0 22px rgba(0,0,0,.95), 0 0 6px #000; letter-spacing: .06em; opacity: 0; transition: opacity .5s; }
    #promoCap small { display: block; font-size: 26px; color: #e8dcc0; margin-top: 8px; letter-spacing: .02em; font-family: var(--f-body); font-weight: 400; }
    #promoCap.on { opacity: 1; }` });
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'promoCap'; document.body.appendChild(d); });
  const cap = (t, sub = '') => p.evaluate(([t, sub]) => { const d = document.getElementById('promoCap'); d.innerHTML = t ? `${t}${sub ? `<small>${sub}</small>` : ''}` : ''; d.classList.toggle('on', !!t); }, [t, sub]);
  const W = (ms) => p.waitForTimeout(ms);
  // 마을에서 시작
  await p.evaluate(() => { const w = window.__game.world; w.player.pos.set(-3, 0, 6); w.moveTo = { x: 4, z: -3 }; });
  await W(1500);
  rec = true;
  const tStart = Date.now() - t0;
  await cap('ÉVEIL · 에베이', '싸운 방식대로 자라는 쿼터뷰 액션 RPG'); await W(3800); await cap(''); await W(600);
  // 1. 오크 요새 전투
  await S.goZone(8, 5, 5); await W(900); await S.pack(8, 10, { r: 3.5 }); await W(700);
  await cap('직업 없이, 행동으로 성장', '칼을 휘두르면 힘이, 주문을 쓰면 지능이 오릅니다');
  await S.cast(['chain_lightning', 'fireball', 'thunderstorm', 'meteor', 'inferno_field', 'blizzard'], 750); await W(800); await cap(''); await W(400);
  // 2. 서리 고원 보스
  await S.goZone(16, 4, 4); await W(900); await S.pack(16, 6, { boss: true, r: 5 });
  await p.evaluate(() => { const w = window.__game.world, m = w.monsters.find((x) => x.tier === 'boss'); if (m) { w.bossPattern(m, 'cross'); setTimeout(() => w.bossPattern(m, 'meteors'), 1500); } });
  await cap('20개 지역, 보스와 던전', '지역마다 다른 보스 패턴 · 변이 던전 · 숨은 던전');
  await S.cast(['meteor', 'thunderstorm', 'blizzard', 'chain_lightning', 'fireball'], 800); await W(600); await cap(''); await W(300);
  // 3. 늪 전투
  await S.goZone(4, -5, 6); await W(900); await S.pack(4, 9);
  await cap('300가지에 가까운 스킬', '두 갈래를 섞은 혼합 스킬 · 랭크 · 변형');
  await S.cast(['inferno_field', 'chain_lightning', 'blizzard', 'flame_wave', 'thunderstorm'], 750); await W(500); await cap(''); await W(300);
  // 4. 마을
  await p.evaluate(() => { const w = window.__game.world; w.player.pos.set(-6, 0, 10); w.moveTo = { x: 6, z: 2 }; for (const m of w.monsters) { m.dead = true; w.stage.remove(m.actor); } w.monsters = []; });
  await W(800); await cap('나만의 마을', '건물을 짓고 용병을 고용해 파견 · 생산 · 연구'); await W(4200); await cap('');
  // 5. 창들
  await p.evaluate(() => { const W = window.__game.windows; W.skillSel = 'thunderstorm'; W.show('skills'); }); await W(1800);
  await p.evaluate(async () => { const G = window.__game, W = G.windows; W.close(); const T = await import('/src/game/town.js'); const e = Object.entries(T.townOf(G.world.st).plots).find(([, b]) => b.type === 'smithy'); W.townSel = e[0]; W.talkTo(['town'], 'town', 'one'); });
  await cap('강화 · 제련 · 보석', ''); await W(2200);
  await p.evaluate(() => { window.__game.windows.close(); const w = window.__game.world; w.player.pos.set(0, 0, 1); }); await W(700);
  await cap('ÉVEIL · 에베이', '브라우저에서 바로 · 휴대폰 · PC'); await W(3500);
  const tEnd = Date.now() - t0;
  rec = false; await cdp.send('Page.stopScreencast');
  // ffmpeg concat 목록: 프레임마다 다음 프레임까지 걸린 시간
  let L2 = ''; for (let i = 0; i < frames.length; i++) { const d = i + 1 < frames.length ? frames[i + 1] - frames[i] : 0.04; L2 += `file '${dir}/${String(i).padStart(5, '0')}.jpg'\nduration ${Math.max(0.005, d).toFixed(4)}\n`; }
  fs.writeFileSync(dir + '/list.txt', L2); console.log('frames', frames.length, (frames.at(-1) - frames[0]).toFixed(1) + 's');
  await ctx.close(); await b.close();
  console.log(errs, tStart, tEnd);
})();
