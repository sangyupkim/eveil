// 입력: PC(마우스 · 키보드) + 모바일(조이스틱 · 터치 · 버튼)
import { isTouch, CAMPS } from './engine2d/stage.js';
import { PLOTS, BUILDINGS, VAULT_SPOT } from './data/buildings.js';
import { iconCut } from './ui/icons.js';
import { actionOf, keyMap, bindKey } from './data/keys.js';

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

  // ── 가까운 상호작용 대상 (NPC · 건물 터) → { name, go } ──
  const near = (n, r = 4) => n && Math.hypot(n.x - world.player.pos.x, n.z - world.player.pos.z) < r;
  // NPC와 대화: 상인 = 상점 · 창고, 경비대장 = 퀘스트 · 건물 짓기, 건물 앞 = 그 건물만
  const talk = (npc) => {
    if (npc === world.npc) windows.talkTo(['shop'], 'shop');
    else if (npc === world.guard) windows.talkTo(['town'], 'quest', 'build');
    else if (npc === world.sage) windows.show('dex');
    else windows.talkTo(['shop'], 'shop');
  };
  const useBuilding = (id) => { windows.townSel = id; windows.talkTo(['town'], 'town', 'one'); };
  const interactTarget = () => {
    if (world.dead) return null;
    if (world.dungeon?.cleared && !world.monsters.some((m) => !m.dead && m.dungeon && Math.hypot(m.pos.x - world.player.pos.x, m.pos.z - world.player.pos.z) < 6)) return { name: '나가기', exit: true, go: () => world.askLeave() };
    for (const [npc, nm] of [[world.npc, '상인'], [world.guard, '경비대장'], [world.gemNpc, '보석상'], [world.sage, '현자'], ...(world.campNpcs || []).map((a) => [a, '야영지 상인']), ...(world.eventNpc ? [[world.eventNpc, '떠돌이 상인']] : [])])
      if (npc && near(npc.pos)) return { name: nm, go: () => talk(npc) };
    // 포탈 (마을 차원문 · 발견한 야영지): 공격 버튼으로 탄다
    const pt = [{ x: 0, z: -2, zone: 'town' }, ...CAMPS.filter((c) => world.st.camps?.[c.zone])].find((q) => near(q, 3));
    if (pt) return { name: '포탈', go: () => { windows.portalAt = pt.zone; windows.show('map'); } };
    if (world.inTown && near(VAULT_SPOT, 2.6)) return { name: '창고', go: () => windows.talkTo(['vault'], 'vault') };
    if (world.inTown) {
      const pl = PLOTS.filter((q) => near(q, 7.5)).sort((a, b) => Math.hypot(a.x - world.player.pos.x, a.z - world.player.pos.z) - Math.hypot(b.x - world.player.pos.x, b.z - world.player.pos.z))[0];
      const b = pl && world.st.town?.plots?.[pl.id];
      if (b) return { name: BUILDINGS[b.type]?.name || '건물', bld: true, go: () => useBuilding(pl.id) };
    }
    return null;
  };
  const attackOrInteract = () => { const t = interactTarget(); if (t) { t.go(); return; } world.manual(); world.attackButton(); };
  const atkBtn = $('#btnAttack'), atkLabel = atkBtn.querySelector('span'), atkImg = atkBtn.querySelector('img');
  let lastInter = null;
  const refreshAttack = () => {
    const t = interactTarget(), k = t ? t.name : null;
    if (k === lastInter) return;
    lastInter = k;
    atkBtn.classList.toggle('interact', !!t);
    atkLabel.textContent = t ? t.name : '공격';
    // 대상마다 그림: 사람 = 두루마리(대화), 건물 = 망치, 창고 = 상자, 포탈 = 귀환 그림
    if (!atkImg.dataset.sword) atkImg.dataset.sword = atkImg.src;
    atkImg.src = !t ? atkImg.dataset.sword : iconCut(t.exit || t.name === '포탈' ? 19 : t.name === '창고' ? 30 : t.bld ? 103 : 224);
    atkImg.style.visibility = '';
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
        if (Math.hypot(pl.x - world.player.pos.x, pl.z - world.player.pos.z) < 6) { if (world.st.town?.plots?.[pl.id]) useBuilding(pl.id); }
        else world.cmdMove(pl.x, pl.z + 2.5);
        return;
      }
    }
    for (const npc of [world.gemNpc, world.sage, ...(world.campNpcs || []), ...(world.eventNpc ? [world.eventNpc] : [])]) {
      if (!npc || !pickNpc(e.clientX, e.clientY, npc)) continue;
      const n = npc.pos;
      if (Math.hypot(n.x - world.player.pos.x, n.z - world.player.pos.z) < 5) talk(npc);
      else world.cmdMove(n.x + 1, n.z + 1.2);
      return;
    }
    if (pickNpc(e.clientX, e.clientY, world.guard)) {
      const n = world.guard.pos;
      if (Math.hypot(n.x - world.player.pos.x, n.z - world.player.pos.z) < 5) talk(world.guard);
      else world.cmdMove(n.x + 1.2, n.z - 1.5);
      return;
    }
    if (pickNpc(e.clientX, e.clientY)) {
      const n = world.npc.pos;
      if (Math.hypot(n.x - world.player.pos.x, n.z - world.player.pos.z) < 5) talk(world.npc);
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

  // 확대 · 축소는 설정(메뉴 → 화면 확대)에서만. 게임 중 휠 · 핀치로는 바뀌지 않는다

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
  tap('#btnAttack', attackOrInteract);
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
    // 메뉴에서 단축키를 바꾸는 중이면 이 키를 지정
    if (windows.waitKey) { e.preventDefault(); if (e.code !== 'Escape') bindKey(world.st, windows.waitKey, e.code); windows.waitKey = null; windows.refresh(); return; }
    keys.add(e.code);
    if (world.st.tut === 0) return;
    if (e.code === 'Escape') { if (windows.open) windows.close(); else if (!world.dead) windows.show('menu'); return; }
    const a = actionOf(world.st, e.code);
    if (!a) return;
    if (['inv', 'skills', 'char', 'quest', 'map', 'guide', 'menu'].includes(a)) { windows.toggle(a); return; }
    if (a === 'shop') { if (world.canShop) windows.toggle('shop'); return; }
    if (windows.open || e.repeat) return;
    if (/^s[1-6]$/.test(a)) { world.manual(); world.useSkill(world.st.quick[Number(a[1]) - 1]); }
    if (a === 'hp') world.usePotion('hp');
    if (a === 'mp') world.usePotion('mp');
    if (a === 'auto') world.toggleAuto();
    if (a === 'recall') world.recall();
    if (a === 'attack') { e.preventDefault(); attackOrInteract(); }
    if (a === 'interact') { const t = interactTarget(); if (t) t.go(); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  return {
    // WASD 이동 (카메라가 북쪽을 보고 있으므로 W = -z)
    update() {
      refreshAttack();
      // 1.5초 넘게 움직임 신호가 없는데 손가락도 없으면 (신호 유실) 멈춘다
      if (joyId !== null && performance.now() - lastJoyMove > 1500 && !(navigator.maxTouchPoints && document.querySelector(':active'))) { /* 누르고 가만히 있는 것일 수 있어 그대로 둔다 */ }
      if (windows.open && joyId !== null) joyEnd({ pointerId: joyId });
      if (joyId !== null || windows.open) return;
      let x = 0, y = 0;
      const m = keyMap(world.st);
      if (keys.has(m.up) || keys.has('ArrowUp')) y -= 1;
      if (keys.has(m.down) || keys.has('ArrowDown')) y += 1;
      if (keys.has(m.left) || keys.has('ArrowLeft')) x -= 1;
      if (keys.has(m.right) || keys.has('ArrowRight')) x += 1;
      if (x || y) { const l = Math.hypot(x, y); world.setJoy(x / l, y / l); this.kb = true; }
      else if (this.kb) { world.setJoy(0, 0); this.kb = false; }
    },
  };
}

const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

document.getElementById('minimap')?.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); window.__game?.windows.show('map'); });
