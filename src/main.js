// 시작점: 타이틀 → 로딩 → 게임 루프 · 자동 저장
import * as THREE from 'three';
import { createStage, buildTerrain, buildWorldProps, isTouch } from './engine/scene.js';
import { loadModels, HAIRS, HAIR_COLORS } from './engine/assets.js';
import { World } from './world/world.js';
import { HUD } from './ui/hud.js';
import { Windows, toggleFullscreen } from './ui/windows.js';
import { setupInput } from './input.js';
import { newPlayer } from './game/player.js';
import { CONFIG } from './data/config.js';
import { audio } from './engine/audio.js';
import { portrait } from './ui/icons.js';
import { Tutorial } from './ui/tutorial.js';
import { cloud, cloudError } from './net/cloud.js';

const SAVE_KEY = 'ashen-save';
const $ = (s) => document.querySelector(s);

const MODELS = [
  // 주인공 (맨몸 · 옷 · 머리카락 · 동작)
  'hero_m', 'hero_f', 'peasant_m', 'peasant_f', 'ranger_m', 'ranger_f', 'hero_anims', 'hero_anims2',
  'hair_buzzed', 'hair_parted', 'hair_beard', 'hair_long', 'hair_buns', 'hair_buzzed_f',
  // 사람 · 해골 (KayKit)
  'knight', 'barbarian', 'mage', 'skel_minion', 'skel_warrior', 'skel_rogue', 'skel_mage',
  'w_sword', 'w_greataxe', 'w_staff', 'w_wand', 'w_shield_sq', 'ws_blade', 'ws_axe', 'ws_staff', 'ws_crossbow', 'ws_shield',
  // 몬스터 (Quaternius)
  'm_slime', 'm_slime_spiky', 'm_rat', 'm_mushnub', 'm_mushking', 'm_wolf', 'm_spider', 'm_wasp', 'm_orc_grunt', 'm_tribal', 'm_orc',
  'm_ghost', 'm_ghost_skull', 'm_demon', 'm_blue_demon', 'm_goleling', 'm_dragon',
  // 무기 · 투구 · 아이템 그림
  'q_sword', 'q_sword2', 'q_sword_big', 'q_sword_gold', 'q_claymore', 'q_bow', 'q_bow2', 'q_bow_gold', 'q_bow_evil',
  'q_shield', 'q_shield2', 'q_shield3', 'q_helm1', 'q_helm2', 'q_helm3',
  'i_armor_leather', 'i_armor_metal', 'i_armor_metal2', 'i_armor_black', 'i_glove', 'i_necklace', 'i_ring2',
  'i_potion_hp', 'i_potion_mp', 'i_potion_hp_l', 'i_potion_mp_l', 'i_book', 'i_book2', 'i_book3', 'i_book4', 'i_scroll',
  'tree_dead_l', 'tree_dead_m', 'tree_dead_s', 'tree_pine', 'grave', 'gravestone', 'gravemarker', 'crypt', 'coffin', 'bone',
  'fence_broken', 'fence_pillar', 'post', 'skull_candle',
  'tavern', 'blacksmith', 'home_a', 'home_b', 'market', 'well', 'church', 'ruin', 'fence_wood', 'tree', 'trees', 'rock_a', 'rock_b', 'rock_c',
  'barrel', 'crates', 'box', 'chest', 'torch', 'banner', 'coin', 'rubble', 'pillar', 'table', 'potion', 'book',
];

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
  // 타이틀 뒤에도 마을 풍경이 보이게 먼저 불러온다
  await loadModels(MODELS, (p) => { $('#loadBar i').style.width = `${Math.round(p * 100)}%`; });
  buildTerrain(stage);
  buildWorldProps(stage);
  $('#loadBar').hidden = true;

  // 타이틀 배경: 마을을 천천히 비춘다
  let titleOn = true;
  const clock = new THREE.Clock();
  const titleLoop = () => {
    if (!titleOn) return;
    const t = clock.getElapsedTime();
    stage.zoom = 1.1;
    stage.follow(Math.sin(t * 0.05) * 10, 4 + Math.cos(t * 0.05) * 6, 0.02);
    stage.fireflies?.(t);
    stage.renderer.render(stage.scene, stage.camera);
    requestAnimationFrame(titleLoop);
  };
  titleLoop();

  let saved = loadSave();
  if (saved) audio.setVolumes(saved.settings.music, saved.settings.sfx);
  const look = { g: 'm', hair: 0, color: 0, ...(saved?.look || {}) };
  const looks = $('.looks');
  const drawLooks = () => {
    const btn = (k, v, inner, on) => `<button data-k="${k}" data-v="${v}" class="${on ? 'on' : ''}">${inner}</button>`;
    looks.innerHTML = `<div class="lgroup">${['m', 'f'].map((g) => btn('g', g, `<img src="${portrait({ ...look, g, hair: Math.min(look.hair, HAIRS[g].length - 1) })}" alt="" />${g === 'm' ? '남' : '여'}`, look.g === g)).join('')}</div>
      <div class="lgroup">${HAIRS[look.g].map((h, i) => btn('hair', i, `<img src="${portrait({ ...look, hair: i })}" alt="" />${h[1]}`, look.hair === i)).join('')}</div>
      <div class="lgroup swatches">${HAIR_COLORS.map((c, i) => btn('color', i, `<i style="background:#${c.toString(16).padStart(6, '0')}"></i>`, look.color === i)).join('')}</div>`;
    looks.querySelectorAll('button').forEach((b) => {
      b.onclick = () => { audio.play('click'); const k = b.dataset.k; look[k] = k === 'g' ? b.dataset.v : Number(b.dataset.v); if (k === 'g') look.hair = 0; drawLooks(); };
    });
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
      Object.assign(look, saved.look);
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
  const start = (st) => {
    titleOn = false;
    $('#title').hidden = true;
    if (isTouch) toggleFullscreen();
    startGame(stage, st);
  };
  $('#btnNew').onclick = () => {
    if (saved && !confirm('저장된 캐릭터가 있습니다. 새로 시작하면 지워집니다. 계속할까요?')) return;
    start(newPlayer($('#nameInput').value.trim() || '방랑자', { ...look }, null));
  };
  $('#btnContinue').onclick = () => start(saved);
}

function startGame(stage, st) {
  stage.zoom = 1;
  audio.setVolumes(st.settings.music, st.settings.sfx);
  stage.renderer.shadowMap.enabled = st.settings.shadows;
  stage.sun.castShadow = st.settings.shadows;
  const hud = new HUD();
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

  const clock = new THREE.Clock();
  let saveT = CONFIG.autosaveInterval;
  let fpsT = 0, frames = 0;
  const loop = () => {
    const dt = Math.min(0.05, clock.getDelta());
    if (window.__stop) { requestAnimationFrame(loop); return; } // 개발용: 화면 멈춤
    input.update();
    if (!tut.blocking) world.update(dt);
    tut.update();
    stage.follow(world.player.pos.x, world.player.pos.z, dt);
    hud.update(dt);
    stage.renderer.render(stage.scene, stage.camera);
    saveT -= dt;
    if (saveT <= 0) { saveT = CONFIG.autosaveInterval; save(); }
    frames++; fpsT += dt;
    if (fpsT > 1) { window.__fps = frames / fpsT; frames = 0; fpsT = 0; }
    requestAnimationFrame(loop);
  };
  loop();
  window.addEventListener('beforeunload', () => save(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
  window.__game = { world, stage, st, save, tut };
}

boot().catch((e) => {
  console.error(e);
  $('.sub').textContent = '불러오기에 실패했습니다: ' + e.message;
});
