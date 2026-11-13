import "./rotate.js";
// 시작점: 타이틀 → 로딩 → 게임 루프 · 자동 저장
import { createStage, buildWorldProps, isTouch, generateWorld } from './engine2d/stage.js';
import { rebuildTerrain } from './ui/mapimg.js';
import { loadAllJson, waitImage, DATA } from './engine2d/sprites.js';
import { warmTerrain } from './engine2d/stage.js';
import { FACES } from './data/flareWorld.js';
import { World } from './world/world.js';
import { HUD } from './ui/hud.js';
import { Windows, toggleFullscreen, setupFullscreenUi, showNotes } from './ui/windows.js';
import { GAME_VERSION } from './data/patchnotes.js';
import { checkUpdate } from './update.js';
import { syncVault } from './game/vault.js';
import { setupInput } from './input.js';
import { newPlayer } from './game/player.js';
import { CONFIG } from './data/config.js';
import { audio } from './engine/audio.js';
import { portrait, iconsReady } from './ui/icons.js';
import { Tutorial } from './ui/tutorial.js';
import { applyUi } from './ui/layout.js';
import { cloud, cloudError } from './net/cloud.js';
import { charIds, loadChar, saveChar, deleteChar, keyOf, newCid, CHAR_MAX, NICK_RE } from './game/chars.js';

const LAST_KEY = 'ashen-last'; // 마지막에 한 캐릭터
const $ = (s) => document.querySelector(s);

const clock = { last: performance.now(), getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; return d; } };

const getLast = () => { try { return localStorage.getItem(LAST_KEY); } catch { return null; } };
const setLast = (cid) => { try { localStorage.setItem(LAST_KEY, cid); } catch { /* 무시 */ } };

// 저장(기기 · 서버)을 지금 판에 맞춘다
function fixSave(s) {
  try {
    if (!s || s.v !== 2) return null; // 예전 판(v1) 저장은 무기 · 스킬 구성이 달라 이어 쓰지 않는다
    // 새로 생긴 필드는 기본값으로 채운다
    const base = newPlayer(s.name, s.look);
    for (const k in base) if (s[k] === undefined) s[k] = base[k];
    s.settings = { ...base.settings, ...s.settings };
    return s;
  } catch { return null; }
}

async function boot() {
  // 브라우저는 첫 입력 뒤에야 소리를 낼 수 있다
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  audio.setMusic('title');
  const stage = createStage($('#view'));
globalThis.__stage = stage;
  // 정의(JSON)와 처음 보이는 그림(마을 타일 · 아이콘 · 기본 옷)을 먼저 받는다
  const bar = (p) => { $('#loadBar i').style.width = `${Math.round(p * 100)}%`; };
  await loadAllJson();
  bar(0.3);
  const first = [...DATA.tiles.grassland.imgs, 'icons.webp',
    ...['cloth_shirt', 'cloth_pants', 'cloth_sandals', 'default_hands'].flatMap((l) => ['m', 'f'].map((sx) => `avatar/${sx}/${l}.webp`)), 'avatar/m/head_short.webp', 'avatar/f/head_long.webp'];
  let n = 0;
  await Promise.all(first.map((p) => waitImage(p).then(() => bar(0.3 + (0.7 * ++n) / first.length))));
  await iconsReady();
  buildWorldProps(stage);
  $('#loadBar').hidden = true;
  // 시작 화면이 떠 있는 동안 뒤에서: 다른 땅 · 몬스터 · 효과 그림을 미리 받고, 물가 · 언덕 타일을 미리 만든다
  (async () => {
    // 데이터를 아끼려고: 땅 · 효과 · 떨어진 물건 전부 + 처음 두 지역(들판 · 숲) 몬스터만. 나머지 몬스터는 갈 때 받는다
    const later = [...new Set(Object.values(DATA.tiles).flatMap((t) => t.imgs))];
    for (const def of [DATA.npcs, DATA.powers, DATA.loot]) for (const v of Object.values(def || {})) if (v?.images) later.push(...Object.values(v.images));
    const { ZONES } = await import('./data/world.js'), { MONSTER_LOOK } = await import('./data/flareWorld.js');
    for (const zn of ZONES.slice(0, 2)) for (const t of [...Object.keys(zn.spawns), zn.named.type, zn.boss.type]) { const e = DATA.enemies[MONSTER_LOOK[t]?.sprite]; if (e?.images) later.push(...Object.values(e.images)); }
    for (const p of later) await waitImage(p).catch(() => {});
    await warmTerrain();
  })();

  // 타이틀 배경: 마을을 천천히 비춘다
  let titleOn = true;
  let tt = 0;
  const titleLoop = () => {
    if (!titleOn) return;
    const dt = Math.min(0.05, clock.getDelta());
    tt += dt;
    stage.follow(Math.sin(tt * 0.05) * 10, 4 + Math.cos(tt * 0.05) * 6, 0.02);
    stage.render(dt);
    requestAnimationFrame(titleLoop);
  };
  titleLoop();

  // ───── 캐릭터 고르기: 기기 저장 + (로그인하면) 서버 저장을 합친 목록 ─────
  let chars = [];       // [{ cid, st (기기 저장, 없으면 null), remote ({ at, nick, name, aw } 또는 null) }]
  let sel = getLast();
  const look = { face: FACES[0][0] };
  const nameOf = (c) => c.st?.nick || c.remote?.nick || '';
  const label = (c) => nameOf(c) || (c.st?.name || c.remote?.name ? `${c.st?.name || c.remote?.name} (닉네임 없음)` : '닉네임 없음');
  const awOf = (c) => Math.max(c.st?.awakenings || 0, c.remote?.aw || 0);
  const refreshChars = async () => {
    const local = charIds().map((cid) => ({ cid, st: fixSave(loadChar(cid)), remote: null })).filter((c) => c.st);
    const map = new Map(local.map((c) => [c.cid, c]));
    for (const r of await cloud.chars()) { const c = map.get(r.cid); if (c) c.remote = r; else map.set(r.cid, { cid: r.cid, st: null, remote: r }); }
    chars = [...map.values()];
    if (!chars.some((c) => c.cid === sel)) sel = chars[0]?.cid || null;
    drawChars();
  };
  const drawChars = () => {
    const el = $('#charList');
    el.innerHTML = chars.map((c) => {
      const face = c.st?.look || { face: FACES[0][0] };
      return `<button class="charCard${c.cid === sel ? ' on' : ''}" data-cid="${c.cid}"><img src="${portrait(face)}" alt="" /><b>${label(c)}</b><small>각성 ${awOf(c)}${c.st ? '' : ' · 서버'}</small></button>`;
    }).join('') || '<div class="note">캐릭터가 없습니다</div>';
    el.querySelectorAll('[data-cid]').forEach((b) => { b.onclick = () => { audio.play('click'); sel = b.dataset.cid; drawChars(); }; });
    $('#btnPlay').disabled = !sel;
    $('#btnDelChar').disabled = !sel;
    $('#btnNewChar').disabled = chars.length >= CHAR_MAX;
    const s0 = chars.find((c) => c.cid === sel)?.st;
    if (s0) audio.setVolumes(s0.settings.music, s0.settings.sfx);
  };
  const looks = $('.looks');
  const drawLooks = () => {
    looks.innerHTML = `<div class="lgroup">${FACES.map(([k]) => `<button data-face="${k}" class="${look.face === k ? 'on' : ''}"><img src="${portrait({ face: k })}" alt="" /></button>`).join('')}</div>`;
    looks.querySelectorAll('button').forEach((b) => { b.onclick = () => { audio.play('click'); look.face = b.dataset.face; drawLooks(); }; });
  };
  drawLooks();
  $('#titleMenu').hidden = false;
  const showNew = (on) => { $('#newChar').hidden = !on; $('#charList').hidden = on; $('#newMsg').textContent = ''; document.querySelectorAll('#titleMenu > .charBtns').forEach((x) => { x.hidden = on; }); };
  $('#btnNewChar').onclick = () => { audio.play('click'); showNew(true); };
  $('#btnNewCancel').onclick = () => { audio.play('click'); showNew(false); };
  $('#btnDelChar').onclick = async () => {
    const c = chars.find((x) => x.cid === sel);
    if (!c || !confirm(`${nameOf(c) || '이 캐릭터'}를 지울까요? 되돌릴 수 없습니다.`)) return;
    deleteChar(c.cid);
    await cloud.delChar(c.cid);
    sel = null;
    await refreshChars();
  };

  // 계정: 로그인하면 서버의 캐릭터도 목록에 나온다
  const acc = $('#account');
  const drawAccount = (msg = '') => {
    acc.innerHTML = cloud.id
      ? `<span class="who"><b>${cloud.id}</b> 서버 저장</span><button class="btn" data-acc="out">로그아웃</button><span class="msg">${msg}</span>`
      : `<input id="accId" maxlength="20" placeholder="아이디" autocomplete="username" autocapitalize="off" /><input id="accPw" type="password" maxlength="64" placeholder="비밀번호" autocomplete="current-password" />
         <button class="btn" data-acc="login">로그인</button><button class="btn" data-acc="register">가입</button><span class="msg">${msg}</span>`;
    acc.querySelectorAll('[data-acc]').forEach((b) => {
      b.onclick = async () => {
        audio.play('click');
        if (b.dataset.acc === 'out') { cloud.logout(); drawAccount(); refreshChars(); return; }
        const id = $('#accId').value.trim(), pw = $('#accPw').value;
        drawAccount('…');
        const r = await cloud.sign(b.dataset.acc, id, pw);
        if (!r.ok) { drawAccount(cloudError(r.error)); $('#accId').value = id; return; }
        drawAccount();
        await refreshChars();
      };
    });
  };
  drawAccount();
  await refreshChars();

  const start = async (st, fresh = false) => {
    // 계정이면 이 기기를 '지금 하는 기기'로 정하고, 그 순간 서버의 최신 저장으로 이어 한다
    // (다른 기기에서 방금까지 하던 진행). 새 캐릭터는 서버 저장을 덮어쓴다
    if (cloud.id) {
      $('#btnPlay').disabled = true;
      const c = await cloud.claim(st?.cid || sel);
      $('#btnPlay').disabled = false;
      const remote = c.ok && !fresh ? fixSave(c.data) : null;
      if (remote && (!st || (remote.savedAt || 0) > (st.savedAt || 0))) { remote.cid ||= sel; st = remote; saveChar(st); }
    }
    if (!st) { alert('저장을 불러오지 못했습니다'); return; }
    setLast(st.cid);
    audio.setVolumes(st.settings.music, st.settings.sfx);
    await waitImage(portrait(st.look).replace('assets/flare/', ''));
    titleOn = false;
    $('#title').hidden = true;
    if (st.seenVer !== GAME_VERSION) { if (st.seenVer) showNotes(); st.seenVer = GAME_VERSION; }
    if (isTouch) toggleFullscreen(true);
    setupFullscreenUi(isTouch);
    startGame(stage, st);
  };
  $('#btnPlay').onclick = () => { const c = chars.find((x) => x.cid === sel); if (c) start(c.st, false); };
  $('#btnNew').onclick = async () => {
    const nick = $('#nameInput').value.trim();
    const msg = (t) => { $('#newMsg').textContent = t; };
    if (nick && !NICK_RE.test(nick)) { msg(cloudError('bad_nick')); return; }
    const st = newPlayer(nick || '방랑자', { ...look }, null);
    st.cid = newCid();
    st.nick = '';
    if (nick) {
      if (cloud.id) { const r = await cloud.nick(st.cid, nick); if (!r.ok) { msg(cloudError(r.error)); return; } st.nickOk = true; }
      st.nick = nick; st.name = nick;
    }
    saveChar(st);
    start(st, true);
  };
}

function startGame(stage, st) {
  syncVault(); // 계정 공용 창고: 서버와 맞춘다
  // 접속할 때마다 새 세상: 씨앗으로 지역 자리 · 지형 · 던전을 새로 만든다.
  // 지도 안개 · 바닥 아이템은 지우고 마을에서 시작. 야영지 투자(상인 · 모닥불)는 지역별로 남긴다
  st.worldSeed = 1 + Math.floor(Math.random() * 1e9); st.fog = ''; st.ground = []; st.pos = { x: 0, z: 4 };
  generateWorld(st.worldSeed);
  stage.props.clear(); stage.flats.length = 0; stage.colliders.length = 0; stage.grid = null;
  buildWorldProps(stage);
  rebuildTerrain();
  audio.setVolumes(st.settings.music, st.settings.sfx);
  stage.light = st.settings.shadows !== false;
  const hud = new HUD();
  applyUi(st);
  const world = new World(stage, st, hud);
  hud.attach(world);
  const save = (force) => {
    if (window.__noSave) return;
    world.saveGround();
    st.savedAt = Date.now();
    if (!saveChar(st)) console.warn('저장 실패');
    cloud.save(st, force === true);
  };
  const windows = new Windows(world, save);
  hud.onDirty = () => { clearTimeout(hud.winT); hud.winT = setTimeout(() => windows.refresh(), 0); };
  const input = setupInput(world, stage, windows);
  const tut = new Tutorial(world, windows);
  world.onPortal = (zone) => { windows.portalAt = zone; windows.show('map'); };
  $('#hud').hidden = false;
  stage.follow(world.player.pos.x, world.player.pos.z, 1);
  hud.log(`${st.name}, 여명 초소에 왔다.`, '#e8c36a');
  // 닉네임: 없으면 정하게 하고, 로그인했는데 서버에 아직 차지하지 않았으면 차지한다 (중복이면 다시 정한다)
  const askNick = (why = '') => {
    document.getElementById('nickBox')?.remove();
    const el = document.createElement('div');
    el.id = 'nickBox';
    el.innerHTML = `<div><b>닉네임</b><p class="msg">${why}</p><input maxlength="10" placeholder="한글 · 영문 · 숫자 2~10자" value="${st.nick || (st.name !== "방랑자" ? st.name : "")}" /><button class="plate gold">정하기</button></div>`;
    const inp = el.querySelector('input'), msg = el.querySelector('.msg');
    el.querySelector('button').onclick = async () => {
      const nick = inp.value.trim();
      if (!NICK_RE.test(nick)) { msg.textContent = cloudError('bad_nick'); return; }
      if (cloud.id) { msg.textContent = '…'; const r = await cloud.nick(st.cid, nick); if (!r.ok) { msg.textContent = cloudError(r.error); return; } st.nickOk = true; }
      st.nick = nick; st.name = nick;
      el.remove(); audio.play('rankup'); hud.toast?.(`닉네임: ${nick}`, '#ffd84a'); world.ui.dirty(); save(true);
    };
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') el.querySelector('button').click(); });
    document.body.appendChild(el);
    setTimeout(() => inp.focus(), 50);
  };
  // 첫 무기를 고르는 중이면 고른 뒤에 묻는다
  if (!st.nick) { const wait = setInterval(() => { if (st.tut !== 0) { clearInterval(wait); askNick(); } }, 300); }
  else if (cloud.id && !st.nickOk) cloud.nick(st.cid, st.nick).then((r) => { if (r.ok) { st.nickOk = true; save(true); } else if (r.error === 'nick_taken' || r.error === 'bad_nick') askNick(cloudError(r.error)); });
  window.__askNick = askNick;

  let saveT = CONFIG.autosaveInterval;
  const loopErr = {};
  let fpsT = 0, frames = 0, slow = 0, fast = 0;
  const PR_MAX = stage.pr, PR_MIN = Math.min(PR_MAX, isTouch ? 0.75 : 1);
  const loop = () => {
    const dt = Math.min(0.05, clock.getDelta());
    if (window.__stop) { requestAnimationFrame(loop); return; } // 개발용: 화면 멈춤
    // 한 곳에서 오류가 나도 게임이 통째로 멈추지 않게 (예전엔 다음 프레임 예약이 안 돼 화면이 굳었다)
    const safe = (name, fn) => { try { fn(); } catch (e) { if ((loopErr[name] = (loopErr[name] || 0) + 1) <= 3) { console.error(name, e); cloud.reportError(`[loop:${name}] ${e?.message}`, e?.stack, GAME_VERSION); } } };
    safe('input', () => input.update());
    if (!tut.blocking) safe('world', () => world.update(dt));
    safe('tut', () => tut.update());
    safe('follow', () => stage.follow(world.player.pos.x, world.player.pos.z, dt));
    safe('hud', () => hud.update(dt));
    safe('render', () => stage.render(dt));
    saveT -= dt;
    if (saveT <= 0) { saveT = CONFIG.autosaveInterval; save(); }
    frames++; fpsT += dt;
    if (fpsT > 1) {
      window.__fps = frames / fpsT; frames = 0; fpsT = 0;
      // 자동 화질: 2초 넘게 느리면 해상도를 낮추고, 오래 넉넉하면 조금씩 되돌린다
      const pr = stage.pr;
      if (window.__fps < 40) { slow++; fast = 0; } else if (window.__fps > 57) { fast++; slow = 0; } else { slow = 0; fast = 0; }
      if (slow >= 2 && pr > PR_MIN) { stage.setPixelRatio(Math.max(PR_MIN, pr - 0.25)); slow = 0; }
      if (fast >= 8 && pr < PR_MAX) { stage.setPixelRatio(Math.min(PR_MAX, pr + 0.25)); fast = 0; }
    }
    requestAnimationFrame(loop);
  };
  loop();
  // 다른 기기에서 같은 계정으로 들어오면 여기는 멈춘다 (저장도 더 하지 않는다 — 두 기기가 서로 덮어쓰지 않게)
  cloud.onMoved = () => {
    window.__noSave = true; window.__stop = true;
    // 이 기기의 저장은 낡은 것으로 표시: 다음에 켜면 서버(새 기기) 저장을 받는다
    try { const L = loadChar(st.cid); if (L) { L.savedAt = 0; localStorage.setItem(keyOf(st.cid), JSON.stringify(L)); } } catch { /* 무시 */ }
    const el = document.createElement('div');
    el.id = 'movedBox';
    el.innerHTML = '<div><b>다른 기기에서 접속했습니다</b><p>이 기기의 게임은 멈췄습니다. 진행은 새로 접속한 기기에서 이어집니다.</p><button class="plate gold">처음 화면으로</button></div>';
    el.querySelector('button').onclick = () => location.reload();
    document.body.appendChild(el);
  };
  window.addEventListener('beforeunload', () => save(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
  window.__game = { world, stage, st, save, tut, windows };
  // 베이스캠프(마을)에 있을 때 가끔 새 버전을 확인하고, 있으면 저장한 뒤 새 버전으로 다시 연다
  let updT = 0, wasTown = false, updating = false;
  setInterval(async () => {
    if (updating || window.__noSave) return;
    const inTown = !!world.inTown && !world.dead;
    const enter = inTown && !wasTown; wasTown = inTown;
    if (!inTown || windows.open) return;
    if (!enter && Date.now() - updT < 120000) return;  // 마을에 들어오면 바로, 머무는 동안은 2분마다
    updT = Date.now();
    const v = await checkUpdate();
    if (!v || !world.inTown) return;
    let tried = null; try { tried = sessionStorage.getItem('updTried'); } catch {}
    if (tried === v) return;
    try { sessionStorage.setItem('updTried', v); } catch {}
    updating = true;
    hud.toast(`새 버전 ${v}로 업데이트합니다`, '#ffd84a');
    save(true);
    setTimeout(() => location.reload(), 1800);
  }, 5000);
}

boot().catch((e) => {
  console.error(e);
  $('.sub').textContent = '불러오기에 실패했습니다: ' + e.message;
});

// 메인 화면: 오른쪽 아래에 버전, 늘 새 버전을 확인해 있으면 바로 새로 연다
// (같은 버전으로 두 번 다시 열지는 않는다 — 브라우저가 옛 파일을 쥐고 있으면 끝없이 새로 열 수 있어서)
{
  const verEl = document.getElementById('verInfo');
  const show = (t) => { if (verEl) verEl.textContent = t + ' · '; };
  show(`v${GAME_VERSION}`);
  const titleCheck = async () => {
    if (document.getElementById('title')?.hidden) return;
    const v = await checkUpdate();
    if (!v) { show(`v${GAME_VERSION} 최신`); return; }
    let tried = null; try { tried = sessionStorage.getItem('updTried'); } catch {}
    if (tried === v) { show(`v${GAME_VERSION} · 새 버전 v${v} — 앱을 껐다 켜 주세요`); return; }
    try { sessionStorage.setItem('updTried', v); } catch {}
    show(`새 버전 v${v}로 업데이트합니다`);
    setTimeout(() => location.reload(), 1200);
  };
  titleCheck();
  setInterval(titleCheck, 60000);
}

// 설치 버전: 서비스 워커 + 설치 요청 (크롬 · 안드로이드). 아이폰은 공유 → 홈 화면에 추가
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__install = e; document.body.classList.add('canInstall'); });
window.addEventListener('appinstalled', () => { window.__install = null; document.body.classList.remove('canInstall'); });
document.getElementById('btnInstall')?.addEventListener('click', async () => { const p = window.__install; if (!p) return; p.prompt(); await p.userChoice.catch(() => {}); window.__install = null; document.body.classList.remove('canInstall'); });

// 오류 보고: 이용자 화면에서 난 오류를 서버로 (직접 못 본 버그도 잡게)
import('./data/patchnotes.js').then(({ GAME_VERSION }) => {
  window.addEventListener('error', (e) => cloud.reportError(e.message, e.error?.stack, GAME_VERSION));
  window.addEventListener('unhandledrejection', (e) => cloud.reportError(e.reason?.message || String(e.reason), e.reason?.stack, GAME_VERSION));
});
