// 입력: PC(마우스 · 키보드) + 모바일(조이스틱 · 터치 · 버튼)
import * as THREE from 'three';
import { isTouch } from './engine/scene.js';

const $ = (s) => document.querySelector(s);

export function setupInput(world, stage, windows) {
  const canvas = stage.renderer.domElement;
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const v = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  if (isTouch) document.body.classList.add('touch');

  const groundAt = (cx, cy) => {
    ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, stage.camera);
    return ray.ray.intersectPlane(plane, v) ? v.clone() : null;
  };

  // 화면 좌표 근처의 몬스터 (클릭/탭 판정을 넉넉하게)
  const pickMonster = (cx, cy) => {
    let best = null, bd = isTouch ? 60 : 45;
    for (const m of world.monsters) {
      if (m.dead || !m.actor.root.visible) continue;
      for (const h of [0.6, 1.3, 2]) {
        v.set(m.pos.x, h * m.actor.scale, m.pos.z).project(stage.camera);
        const sx = (v.x * 0.5 + 0.5) * window.innerWidth, sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
        const d = Math.hypot(sx - cx, sy - cy);
        if (d < bd) { bd = d; best = m; }
      }
    }
    return best;
  };
  const pickNpc = (cx, cy) => {
    v.set(world.npc.pos.x, 1.3, world.npc.pos.z).project(stage.camera);
    const sx = (v.x * 0.5 + 0.5) * window.innerWidth, sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
    return Math.hypot(sx - cx, sy - cy) < 50;
  };

  // ── 화면 클릭/탭: 몬스터면 공격, 땅이면 이동 ──
  let holding = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (windows.open || world.dead) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const m = pickMonster(e.clientX, e.clientY);
    world.manual();
    if (m) { world.cmdAttack(m); return; }
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
    stage.zoom = Math.max(0.55, Math.min(1.5, stage.zoom * (e.deltaY > 0 ? 1.08 : 0.93)));
  }, { passive: true });
  const touches = new Map();
  let pinch0 = 0, zoom0 = 1;
  canvas.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) touches.set(t.identifier, t);
    if (e.touches.length === 2) { pinch0 = dist(e.touches[0], e.touches[1]); zoom0 = stage.zoom; }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinch0) stage.zoom = Math.max(0.55, Math.min(1.5, zoom0 * (pinch0 / dist(e.touches[0], e.touches[1]))));
  }, { passive: true });
  canvas.addEventListener('touchend', () => { pinch0 = 0; }, { passive: true });

  // ── 조이스틱 ──
  const joy = $('#joy'), knob = joy.querySelector('.knob');
  let joyId = null;
  const joyMove = (e) => {
    const r = joy.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = r.width * 0.4;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const k = len < max * 0.15 ? 0 : 1;
    world.setJoy((dx / max) * k, (dy / max) * k);
  };
  joy.addEventListener('pointerdown', (e) => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== joyId) return; joyId = null; knob.style.transform = ''; world.setJoy(0, 0); };
  joy.addEventListener('pointerup', joyEnd);
  joy.addEventListener('pointercancel', joyEnd);

  // ── 버튼 ──
  const tap = (sel, fn) => $(sel).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  tap('#btnAttack', () => { world.manual(); if (world.target && !world.target.dead) world.cmdAttack(world.target); else world.cmdAttackNearest(); });
  tap('#btnHp', () => world.usePotion('hp'));
  tap('#btnMp', () => world.usePotion('mp'));
  tap('#btnAuto', () => world.toggleAuto());
  tap('#btnRecall', () => world.recall());
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
    if (k === 'p' && world.inTown) windows.toggle('shop');
    if (windows.open || e.repeat) return;
    if (k >= '1' && k <= '6') { world.manual(); world.useSkill(world.st.quick[Number(k) - 1]); }
    if (k === 'q') world.usePotion('hp');
    if (k === 'e') world.usePotion('mp');
    if (k === 'f') world.toggleAuto();
    if (k === 'r') world.recall();
    if (e.code === 'Space') { e.preventDefault(); world.manual(); world.cmdAttackNearest(); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  return {
    // WASD 이동 (카메라가 북쪽을 보고 있으므로 W = -z)
    update() {
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
