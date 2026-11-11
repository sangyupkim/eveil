// 시작점: 타이틀 → 로딩 → 게임 루프 · 자동 저장
import * as THREE from 'three';
import { createStage, buildTerrain, buildWorldProps, isTouch } from './engine/scene.js';
import { loadModels } from './engine/assets.js';
import { World } from './world/world.js';
import { HUD } from './ui/hud.js';
import { Windows, toggleFullscreen } from './ui/windows.js';
import { setupInput } from './input.js';
import { newPlayer } from './game/player.js';
import { CONFIG } from './data/config.js';
import { audio } from './engine/audio.js';
import { portrait } from './ui/icons.js';

const SAVE_KEY = 'ashen-save';
const $ = (s) => document.querySelector(s);

const MODELS = [
  'knight', 'barbarian', 'mage', 'rogue', 'skel_minion', 'skel_warrior', 'skel_rogue', 'skel_mage',
  'w_sword', 'w_greatsword', 'w_axe', 'w_greataxe', 'w_dagger', 'w_staff', 'w_wand', 'w_crossbow', 'w_shield', 'w_shield_sq',
  'ws_blade', 'ws_axe', 'ws_staff', 'ws_crossbow', 'ws_shield',
  'tree_dead_l', 'tree_dead_m', 'tree_dead_s', 'tree_pine', 'grave', 'gravestone', 'gravemarker', 'crypt', 'coffin', 'bone',
  'fence_broken', 'fence_pillar', 'post', 'skull_candle',
  'tavern', 'blacksmith', 'home_a', 'home_b', 'market', 'well', 'church', 'ruin', 'fence_wood', 'tree', 'trees', 'rock_a', 'rock_b', 'rock_c',
  'barrel', 'crates', 'box', 'chest', 'torch', 'banner', 'coin', 'rubble', 'pillar', 'table', 'potion', 'book',
];

const LOOKS = { knight: '기사', barbarian: '야만전사', mage: '마법사', rogue: '도적' };

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s || s.v !== 1) return null;
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

  const saved = loadSave();
  if (saved) audio.setVolumes(saved.settings.music, saved.settings.sfx);
  let look = saved?.look || 'knight';
  const looks = $('.looks');
  looks.innerHTML = Object.entries(LOOKS).map(([k, n]) => `<button data-look="${k}" class="${k === look ? 'on' : ''}"><img src="${portrait(k)}" alt="" />${n}</button>`).join('')
    + '<div class="note">외형만 다르다. 직업은 없다 — 싸우는 방식이 곧 직업이 된다.</div>';
  looks.querySelectorAll('button').forEach((b) => {
    b.onclick = () => { audio.play('click'); look = b.dataset.look; looks.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); };
  });
  $('#titleMenu').hidden = false;
  if (saved) {
    $('#btnContinue').hidden = false;
    $('#btnContinue').textContent = `이어하기 (${saved.name} · 각성 ${saved.awakenings})`;
  }
  const start = (st) => {
    titleOn = false;
    $('#title').hidden = true;
    if (isTouch) toggleFullscreen();
    startGame(stage, st);
  };
  $('#btnNew').onclick = () => {
    if (saved && !confirm('저장된 캐릭터가 있습니다. 새로 시작하면 지워집니다. 계속할까요?')) return;
    start(newPlayer($('#nameInput').value.trim() || '방랑자', look));
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
  const save = () => {
    if (window.__noSave) return;
    world.saveGround();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) { console.warn('저장 실패', e); }
  };
  const windows = new Windows(world, save);
  hud.onDirty = () => { clearTimeout(hud.winT); hud.winT = setTimeout(() => windows.refresh(), 0); };
  const input = setupInput(world, stage, windows);
  $('#hud').hidden = false;
  stage.follow(world.player.pos.x, world.player.pos.z, 1);
  hud.log(`${st.name}, 잿빛 초소에 왔다.`, '#e8c36a');
  if (!st.awakenings && !st.playTime) {
    hud.log('남쪽 들판(아래)의 해골부터 사냥하자.', '#9a917f');
    hud.log('스킬은 몬스터가 떨어뜨리는 스킬북으로 배운다.', '#9a917f');
  }

  const clock = new THREE.Clock();
  let saveT = CONFIG.autosaveInterval;
  let fpsT = 0, frames = 0;
  const loop = () => {
    const dt = Math.min(0.05, clock.getDelta());
    input.update();
    world.update(dt);
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
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.__game = { world, stage, st, save };
}

boot().catch((e) => {
  console.error(e);
  $('.sub').textContent = '불러오기에 실패했습니다: ' + e.message;
});
