// 시작점: 타이틀 → 로딩 → 게임 루프 · 자동 저장
import { createStage, buildWorldProps, isTouch } from './engine2d/stage.js';
import { loadAllJson, waitImage, DATA } from './engine2d/sprites.js';
import { FACES } from './data/flareWorld.js';
import { World } from './world/world.js';
import { HUD } from './ui/hud.js';
import { Windows, toggleFullscreen, setupFullscreenUi } from './ui/windows.js';
import { setupInput } from './input.js';
import { newPlayer } from './game/player.js';
import { CONFIG } from './data/config.js';
import { audio } from './engine/audio.js';
import { portrait, iconsReady } from './ui/icons.js';
import { Tutorial } from './ui/tutorial.js';
import { applyUi } from './ui/layout.js';
import { cloud, cloudError } from './net/cloud.js';

const SAVE_KEY = 'ashen-save';
const $ = (s) => document.querySelector(s);

const clock = { last: performance.now(), getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; return d; } };

function loadSave() {
  try { return fixSave(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { return null; }
}

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

  let saved = loadSave();
  if (saved) audio.setVolumes(saved.settings.music, saved.settings.sfx);
  const look = { face: FACES.some((f) => f[0] === saved?.look?.face) ? saved.look.face : FACES[0][0] };
  const looks = $('.looks');
  const drawLooks = () => {
    looks.innerHTML = `<div class="lgroup">${FACES.map(([k]) => `<button data-face="${k}" class="${look.face === k ? 'on' : ''}"><img src="${portrait({ face: k })}" alt="" /></button>`).join('')}</div>`;
    looks.querySelectorAll('button').forEach((b) => { b.onclick = () => { audio.play('click'); look.face = b.dataset.face; drawLooks(); }; });
  };
  drawLooks();
  $('#titleMenu').hidden = false;
  const showContinue = () => {
    $('#btnContinue').hidden = !saved;
    if (saved) $('#btnContinue').textContent = `이어하기 (${saved.name} · 각성 ${saved.awakenings})`;
  };
  showContinue();

  // 계정: 로그인하면 서버 저장과 기기 저장 중 더 새 것으로 이어 한다
  const acc = $('#account');
  const pull = async () => {
    const remote = fixSave(await cloud.load());
    if (remote && (!saved || (remote.savedAt || 0) > (saved.savedAt || 0))) {
      saved = remote;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { /* 무시 */ }
      look.face = FACES.some((f) => f[0] === saved.look?.face) ? saved.look.face : FACES[0][0];
      drawLooks();
      showContinue();
      return true;
    }
    return false;
  };
  const drawAccount = (msg = '') => {
    acc.innerHTML = cloud.id
      ? `<span class="who"><b>${cloud.id}</b> 서버 저장</span><button class="btn" data-acc="out">로그아웃</button><span class="msg">${msg}</span>`
      : `<input id="accId" maxlength="20" placeholder="아이디" autocomplete="username" autocapitalize="off" /><input id="accPw" type="password" maxlength="64" placeholder="비밀번호" autocomplete="current-password" />
         <button class="btn" data-acc="login">로그인</button><button class="btn" data-acc="register">가입</button><span class="msg">${msg}</span>`;
    acc.querySelectorAll('[data-acc]').forEach((b) => {
      b.onclick = async () => {
        audio.play('click');
        if (b.dataset.acc === 'out') { cloud.logout(); drawAccount(); return; }
        const id = $('#accId').value.trim(), pw = $('#accPw').value;
        drawAccount('…');
        const r = await cloud.sign(b.dataset.acc, id, pw);
        if (!r.ok) { drawAccount(cloudError(r.error)); $('#accId').value = id; return; }
        drawAccount((await pull()) ? '서버 저장을 불러왔습니다' : '');
      };
    });
  };
  drawAccount();
  if (cloud.id) pull().then((got) => { if (got) drawAccount('서버 저장을 불러왔습니다'); });
  const start = async (st) => {
    await waitImage(portrait(st.look).replace('assets/flare/', ''));
    titleOn = false;
    $('#title').hidden = true;
    if (isTouch) toggleFullscreen(true);
    setupFullscreenUi(isTouch);
    startGame(stage, st);
  };
  $('#btnNew').onclick = () => {
    if (saved && !confirm('저장된 캐릭터가 있습니다. 새로 시작하면 지워집니다. 계속할까요?')) return;
    start(newPlayer($('#nameInput').value.trim() || '방랑자', { ...look }, null));
  };
  $('#btnContinue').onclick = () => start(saved);
}

function startGame(stage, st) {
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
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) { console.warn('저장 실패', e); }
    cloud.save(st, force === true);
  };
  const windows = new Windows(world, save);
  hud.onDirty = () => { clearTimeout(hud.winT); hud.winT = setTimeout(() => windows.refresh(), 0); };
  const input = setupInput(world, stage, windows);
  const tut = new Tutorial(world, windows);
  $('#hud').hidden = false;
  stage.follow(world.player.pos.x, world.player.pos.z, 1);
  hud.log(`${st.name}, 잿빛 초소에 왔다.`, '#e8c36a');

  let saveT = CONFIG.autosaveInterval;
  let fpsT = 0, frames = 0, slow = 0, fast = 0;
  const PR_MAX = stage.pr, PR_MIN = Math.min(PR_MAX, isTouch ? 0.75 : 1);
  const loop = () => {
    const dt = Math.min(0.05, clock.getDelta());
    if (window.__stop) { requestAnimationFrame(loop); return; } // 개발용: 화면 멈춤
    input.update();
    if (!tut.blocking) world.update(dt);
    tut.update();
    stage.follow(world.player.pos.x, world.player.pos.z, dt);
    hud.update(dt);
    stage.render(dt);
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
  window.addEventListener('beforeunload', () => save(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
  window.__game = { world, stage, st, save, tut, windows };
}

boot().catch((e) => {
  console.error(e);
  $('.sub').textContent = '불러오기에 실패했습니다: ' + e.message;
});
