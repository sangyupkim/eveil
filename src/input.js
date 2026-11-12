// 입력: PC(마우스 · 키보드) + 모바일(조이스틱 · 터치 · 버튼)
import { isTouch } from './engine2d/stage.js';
import { PLOTS } from './data/buildings.js';

const $ = (s) => document.querySelector(s);

export function setupInput(world, stage, windows) {
  const canvas = stage.canvas;
  if (isTouch) document.body.classList.add('touch');

  const groundAt = (cx, cy) => stage.toWorld(cx, cy);

  // 화면 좌표 근처의 몬스터 (클릭/탭 판정을 넉넉하게)
  const pickMonster = (cx, cy) => {
    let best = null, bd = isTouch ? 60 : 45;
    for (const m of world.monsters) {
      if (m.dead || !m.actor.root.visible) continue;
      for (const h of [0.3, 0.9, 1.5]) {
        const s = stage.toScreen(m.pos.x, m.pos.z, h * m.actor.scale);
        const d = Math.hypot(s.x - cx, s.y - cy);
        if (d < bd) { bd = d; best = m; }
      }
    }
    return best;
  };
  const pickNpc = (cx, cy, npc = world.npc) => {
    const s = stage.toScreen(npc.pos.x, npc.pos.z, 1);
    return Math.hypot(s.x - cx, s.y - cy) < 50;
  };

  // ── 화면 클릭/탭: 몬스터면 공격, 땅이면 이동 ──
  let holding = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (windows.open || world.dead) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const m = pickMonster(e.clientX, e.clientY);
    world.manual();
    if (m) { world.cmdAttack(m); return; }
    if (world.inTown) {
      const w = groundAt(e.clientX, e.clientY);
      const pl = PLOTS.find((q) => Math.hypot(q.x - w.x, q.z - w.z) < 3.2);
      if (pl) {
        if (Math.hypot(pl.x - world.player.pos.x, pl.z - world.player.pos.z) < 6) { windows.townSel = pl.id; windows.show('town'); }
        else world.cmdMove(pl.x, pl.z + 2.5);
        return;
      }
    }
    if (pickNpc(e.clientX, e.clientY, world.guard)) {
      const n = world.guard.pos;
      if (Math.hypot(n.x - world.player.pos.x, n.z - world.player.pos.z) < 5) windows.show('quest');
      else world.cmdMove(n.x + 1.2, n.z - 1.5);
      return;
    }
    if (pickNpc(e.clientX, e.clientY)) {
      const n = world.npc.pos;
      if (Math.hypot(n.x - world.player.pos.x, n.z - world.player.pos.z) < 5) windows.show('shop');
      else world.cmdMove(n.x, n.z + 1.5);
      return;
    }
    const g = groundAt(e.clientX, e.clientY);
    if (g) {
      world.cmdMove(g.x, g.z);
      world.fx.ring(g.x, g.z, 0.8, 0x80c0ff, 0.35);
    }
    if (e.pointerType === 'mouse') holding = { id: e.pointerId };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!holding || holding.id !== e.pointerId) return;
    const g = groundAt(e.clientX, e.clientY);
    if (g) { world.cmdMove(g.x, g.z); world.manual(); }
  });
  const release = () => { holding = null; };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ── 휠 · 핀치 줌 ──
  canvas.addEventListener('wheel', (e) => {
    stage.userZoom = Math.max(0.6, Math.min(1.6, stage.userZoom * (e.deltaY > 0 ? 0.93 : 1.08)));
  }, { passive: true });
  const touches = new Map();
  let pinch0 = 0, zoom0 = 1;
  canvas.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) touches.set(t.identifier, t);
    if (e.touches.length === 2) { pinch0 = dist(e.touches[0], e.touches[1]); zoom0 = stage.userZoom; }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinch0) stage.userZoom = Math.max(0.6, Math.min(1.6, zoom0 * (dist(e.touches[0], e.touches[1]) / pinch0)));
  }, { passive: true });
  canvas.addEventListener('touchend', () => { pinch0 = 0; }, { passive: true });

  // ── 조이스틱: 왼쪽 화면 어디든 누르면 그 자리에 생긴다 (떠다니는 조이스틱) ──
  const joy = $('#joy'), knob = joy.querySelector('.knob');
  const zone = $('#joyZone');
  let joyId = null, jx = 0, jy = 0, lastJoyMove = 0;
  const joyRadius = () => joy.offsetWidth * 0.42 || 40;
  const joyMove = (e) => {
    let dx = e.clientX - jx, dy = e.clientY - jy;
    const max = joyRadius(), len = Math.hypot(dx, dy);
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    lastJoyMove = performance.now();
    // 작은 흔들림은 무시 (데드존), 그 밖은 부드럽게 0→1
    const k = len < max * 0.18 ? 0 : Math.min(1, (len - max * 0.18) / (max * 0.5));
    const l = Math.hypot(dx, dy) || 1;
    world.setJoy((dx / l) * k, (dy / l) * k);
  };
  const joyEnd = (e) => {
    if (e && e.pointerId !== joyId) return;
    joyId = null; knob.style.transform = ''; joy.classList.remove('active'); world.setJoy(0, 0);
    joy.style.left = ''; joy.style.top = ''; joy.style.bottom = '';
  };
  zone.addEventListener('pointerdown', (e) => {
    if (joyId !== null || windows.open || document.body.classList.contains('ui-edit')) return;
    e.preventDefault();
    joyId = e.pointerId;
    try { zone.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    const r = joy.getBoundingClientRect();
    // 기본 자리 근처면 그 자리 그대로, 아니면 누른 곳으로 옮긴다
    const home = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    if (world.st.settings.joyFloat !== false && Math.hypot(e.clientX - home.x, e.clientY - home.y) > r.width * 0.5) {
      joy.style.left = `${e.clientX - r.width / 2}px`; joy.style.top = `${e.clientY - r.height / 2}px`; joy.style.bottom = 'auto';
      jx = e.clientX; jy = e.clientY;
    } else { jx = home.x; jy = home.y; }
    joy.classList.add('active');
    joyMove(e);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
  zone.addEventListener('pointerup', joyEnd);
  zone.addEventListener('pointercancel', joyEnd);
  zone.addEventListener('lostpointercapture', joyEnd);
  // 손을 뗀 신호를 놓쳐도 멈춘다: 손가락이 하나도 없거나, 화면이 바뀌면
  window.addEventListener('touchend', (e) => { if (joyId !== null && e.touches.length === 0) joyEnd({ pointerId: joyId }); }, { passive: true });
  window.addEventListener('blur', () => { if (joyId !== null) joyEnd({ pointerId: joyId }); });
  document.addEventListener('visibilitychange', () => { if (joyId !== null) joyEnd({ pointerId: joyId }); });

  // ── 버튼 ──
  const tap = (sel, fn) => $(sel).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  tap('#btnAttack', () => { world.manual(); world.attackButton(); });
  tap('#btnHp', () => world.usePotion('hp'));
  tap('#btnMp', () => world.usePotion('mp'));
  tap('#btnAuto', () => world.toggleAuto());
  tap('#btnRecall', () => world.recall());
  tap('#btnRoll', () => world.roll());
  document.querySelectorAll('[data-win]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); windows.toggle(b.dataset.win); }));
  $('#quick').addEventListener('pointerdown', (e) => {
    const s = e.target.closest('.slot');
    if (!s) return;
    e.preventDefault();
    const id = world.st.quick[Number(s.dataset.i)];
    if (id) { world.manual(); world.useSkill(id); } else windows.show('skills');
  });

  // ── 키보드 ──
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    keys.add(e.code);
    if (world.st.tut === 0) return;
    if (k === 'escape') { if (windows.open) windows.close(); else if (!world.dead) windows.show('menu'); return; }
    if (k === 'i' || k === 'b') windows.toggle('inv');
    if (k === 'k') windows.toggle('skills');
    if (k === 'c') windows.toggle('char');
    if (k === 'm') windows.toggle('menu');
    if (k === 'j') windows.toggle('quest');
    if (k === 't') windows.toggle('town');
    if (k === 'p' && world.inTown) windows.toggle('shop');
    if (windows.open || e.repeat) return;
    if (k >= '1' && k <= '6') { world.manual(); world.useSkill(world.st.quick[Number(k) - 1]); }
    if (k === 'q') world.usePotion('hp');
    if (k === 'e') world.usePotion('mp');
    if (k === 'f') world.toggleAuto();
    if (k === 'r') world.recall();
    if (k === 'shift' || k === 'v') world.roll();
    if (e.code === 'Space') { e.preventDefault(); world.manual(); world.attackButton(); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  return {
    // WASD 이동 (카메라가 북쪽을 보고 있으므로 W = -z)
    update() {
      // 1.5초 넘게 움직임 신호가 없는데 손가락도 없으면 (신호 유실) 멈춘다
      if (joyId !== null && performance.now() - lastJoyMove > 1500 && !(navigator.maxTouchPoints && document.querySelector(':active'))) { /* 누르고 가만히 있는 것일 수 있어 그대로 둔다 */ }
      if (windows.open && joyId !== null) joyEnd({ pointerId: joyId });
      if (joyId !== null || windows.open) return;
      let x = 0, y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (x || y) { const l = Math.hypot(x, y); world.setJoy(x / l, y / l); this.kb = true; }
      else if (this.kb) { world.setJoy(0, 0); this.kb = false; }
    },
  };
}

const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
