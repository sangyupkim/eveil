// v0.49.53 스킬 형상: 스킬마다 「어떻게 나가는지」를 따로 정한다 (data/skill_forms.js의 sk.form).
// type(위력 · 계수 · 근접 여부)은 그대로 두고, 맞는 모양 · 움직임 · 그림만 바꾼다.
// 위력 단위 n: 화살비는 파도 수, 회전은 타수 — 형상이 몇 번 때리든 한 적이 받는 합은 예전과 같다.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

import { FORM_DEFS, formUser } from '../data/skill_forms.js';
export { FORM_DEFS, formUser };

// c: { w 월드, sk, P 플레이어 액터, t 대상, color, FX(x,z,s), hit(m,k), n 위력 단위, bow, melee, act(anim, speed) }
export function runForm(c0) {
  let c = c0;
  const { w, sk, P } = c, fx = w.fx, f = sk.form;
  const shp = FORM_DEFS[f].shape, R = sk.radius || (shp === 'arc' ? 7 : shp === 'self' ? 4.5 : 4), L = sk.range || 8, W = sk.width || 3;
  const aimAt = () => (c.t && !c.t.dead ? { x: c.t.pos.x, z: c.t.pos.z } : { x: P.pos.x + Math.sin(P.facing) * 5, z: P.pos.z + Math.cos(P.facing) * 5 });
  const at = aimAt();
  if (c.t) P.face(c.t.pos.x, c.t.pos.z);
  const ang = P.facing, ux = Math.sin(ang), uz = Math.cos(ang);
  const later = (s, fn) => w.later(s, () => { if (!w.dead) fn(); });
  const near = (p, r) => w.monstersNear(p, r);
  const once = new Set(), hitOnce = (m, k) => { if (once.has(m) || m.dead) return; once.add(m); c.hit(m, k); };
  const inLine = (m, ox, oz, vx, vz, len, wid) => { const px = m.pos.x - ox, pz = m.pos.z - oz, a = px * vx + pz * vz, s = Math.abs(px * vz - pz * vx); return a > -0.5 && a < len && s < wid * 0.5 + 0.5 * (m.actor?.scale || 1) ? a : null; };
  const inArc = (m, r, half) => { if (d2(m.pos, P.pos) > r) return false; const a = Math.atan2(m.pos.x - P.pos.x, m.pos.z - P.pos.z); return Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang))) < half; };
  // 한 자리에 떨어지는 것: 활은 화살, 주문 · 근접은 그 스킬 그림 + 불씨
  const strike = (x, z, s = 1) => {
    if (c.bow) fx.projectile({ elem: sk.elem, from: { x: x - 1, y: 9, z: z - 1 }, target: { x, z, pos: new THREE.Vector3(x, -1.1, z) }, color: c.color, size: 0.5, speed: 44, bolt: true, trail: true, onHit: () => {} });
    if (sk.fx) c.FX(x, z, s); else fx.hit(x, 0.8, z, c.color, false);
    fx.burst(x, 0.6, z, c.color, 5, 2.5 * s, 0.3);
  };
  // 움직이는 그림 (부메랑 · 검기 · 회오리): 이름 그림을 path(q)로 옮긴다
  const mover = (name, dur, path, o = {}) => {
    const it = fx.play(name, path(0).x, path(0).z, { loop: true, dur, scale: o.scale || 1, tint: o.tint ?? null, dir: o.dir || 0, y: o.y || 0 });
    const steps = Math.max(2, Math.round(dur / 0.03));
    for (let i = 1; i <= steps; i++) later((i / steps) * dur, () => { const p = path(i / steps); if (it) { it.x = p.x; it.z = p.z; if (it.drawable) it.drawable.z = p.z; } o.step?.(p, i / steps); });
    return it;
  };
  const dirOf = (a) => { const n = 8, k = Math.round(((Math.atan2(Math.sin(a), Math.cos(a)) + TAU) % TAU) / (TAU / n)) % n; return k; };
  const n = c.n || 1;
  // 스킬 그림은 한 번에 5장까지 · 작게 (여러 장이 겹치면 더하기 합성으로 하얀 덩어리가 된다). 나머지는 작은 불티
  let fxLeft = 5;
  const FX0 = c.FX;
  c = { ...c, FX: (x, z, s = 1) => { if (fxLeft-- > 0) FX0(x, z, s * 0.6); else fx.burst(x, 0.6, z, c.color, 3, 1.5, 0.25); } };
  // 고리: 빛 알갱이만 (fx.ring은 큰 방패 · 폭발 그림이 붙어 하얀 덩어리가 된다)
  const ring = (x, z, r, col = c.color, dur = 0.4) => {
    const k = Math.min(32, Math.round(r * 6));
    for (let i = 0; i < k; i++) { const a = (i / k) * TAU; fx.add.add({ x: x + Math.cos(a) * r * 0.6, y: 0.25, z: z + Math.sin(a) * r * 0.6, vx: Math.cos(a) * r * 1.6, vy: 0.4, vz: Math.sin(a) * r * 1.6, color: col, size: 0.45, size1: 0.08, life: dur, cell: 'spark', drag: 3 }); }
  };

  switch (f) {
    // ───── 근접 ─────
    case 'xslash': {
      const dur = c.act('attack2', 1.4);
      [[0, 0.8], [1, -0.8]].forEach(([i, o]) => later(dur * 0.3 + i * 0.16, () => {
        const tg = c.t; if (!tg) return;
        fx.slash(tg.pos.x - Math.sin(ang + o) * 1.2, tg.pos.z - Math.cos(ang + o) * 1.2, ang + o, c.color, 2.4, { dur: 0.25 });
        if (i === 1) { for (const q of [0.785, 2.356, 3.927, 5.498]) strike(tg.pos.x + Math.cos(q) * 1.6, tg.pos.z + Math.sin(q) * 1.6, 0.6); fx.shake(0.2); }
        if (!tg.dead) c.hit(tg, 0.5 * n);
        if (i === 1) for (const m of near(tg.pos, 2.4)) if (m !== tg) c.hit(m, 0.4 * n);
      }));
      break;
    }
    case 'upper': {
      const dur = c.act('heavy', 1.3);
      later(dur * 0.35, () => {
        const tg = c.t; if (!tg || tg.dead) return;
        fx.slash(P.pos.x, P.pos.z, ang, c.color, 2.6, { y: 2.2, dur: 0.3 });
        fx.pillar(tg.pos.x, tg.pos.z, c.color, 0.6, 5, 0.9);
        c.hit(tg, 0.55 * n); tg.rootT = Math.max(tg.rootT || 0, tg.tier === 'boss' ? 0 : 0.9);
        later(0.4, () => { ring(tg.pos.x, tg.pos.z, 2.4, c.color, 0.4); strike(tg.pos.x, tg.pos.z, 1); fx.shake(0.3); for (const m of near(tg.pos, 2.6)) c.hit(m, (m === tg ? 0.45 : 0.35) * n); });
      });
      break;
    }
    case 'thrust': {
      const dur = c.act('attack2', 2.2);
      for (let i = 0; i < 4; i++) later(dur * 0.15 + i * 0.12, () => {
        const reach = 4.2, o = (i % 2 ? 1 : -1) * 0.25;
        fx.play('spear', P.pos.x + ux * 2.2, P.pos.z + uz * 2.2, { dir: dirOf(ang), scale: 0.6, dur: 0.18 });
        fx.burst(P.pos.x + ux * reach + uz * o, 1, P.pos.z + uz * reach - ux * o, c.color, 5, 2, 0.3);
        if (sk.fx && i === 3) c.FX(P.pos.x + ux * reach, P.pos.z + uz * reach, 0.8);
        for (const m of w.monsters) if (!m.dead && inLine(m, P.pos.x, P.pos.z, ux, uz, reach + 0.6, 1.8) != null) c.hit(m, 0.25 * n);
      });
      break;
    }
    case 'blink': {
      const tg = c.t; if (!tg) break;
      const list = [tg, ...near(tg.pos, 6).filter((m) => m !== tg).sort((a, b) => d2(a.pos, tg.pos) - d2(b.pos, tg.pos))].slice(0, 4);
      c.act('attack2', 2);
      list.forEach((m, i) => later(i * 0.16, () => {
        if (m.dead) return;
        fx.play('h_ghost_mist', P.pos.x, P.pos.z, { scale: 0.7, dur: 0.4 });
        const dx = m.pos.x - P.pos.x, dz = m.pos.z - P.pos.z, l = Math.hypot(dx, dz) || 1, to = w.freeSpot(m.pos.x - (dx / l) * 1.2, m.pos.z - (dz / l) * 1.2);
        P.pos.x = to.x; P.pos.z = to.z; P.face(m.pos.x, m.pos.z);
        fx.slash(P.pos.x, P.pos.z, P.facing, c.color, 2.2, { dur: 0.2 }); if (sk.fx) c.FX(m.pos.x, m.pos.z, 0.7);
        c.hit(m, (i ? 0.6 : 1) * n);
      }));
      w.moveTo = null;
      break;
    }
    case 'pierce': {
      const from = { x: P.pos.x, z: P.pos.z }, len = Math.max(L, (c.t ? d2(c.t.pos, P.pos) : 0) + 3), to = w.freeSpot(from.x + ux * len, from.z + uz * len);
      const steps = 8;
      c.act('heavy', 1.6);
      for (let i = 1; i <= steps; i++) later(i * 0.025, () => { P.pos.x = from.x + (to.x - from.x) * i / steps; P.pos.z = from.z + (to.z - from.z) * i / steps; fx.burst(P.pos.x, 0.7, P.pos.z, c.color, 3, 1.5, 0.35); if (sk.fx && i % 2 === 0) c.FX(P.pos.x, P.pos.z, 0.6); });
      later(0.22, () => { fx.slash(P.pos.x, P.pos.z, ang + Math.PI, c.color, 3, { dur: 0.3 }); fx.shake(0.25); });
      const ln = Math.hypot(to.x - from.x, to.z - from.z);
      for (const m of w.monsters) { if (m.dead) continue; const a = inLine(m, from.x, from.z, ux, uz, ln + 1, W); if (a != null) later(0.03 + (a / ln) * 0.2, () => hitOnce(m, n)); }
      w.moveTo = null;
      break;
    }
    case 'leap': {
      const from = { x: P.pos.x, z: P.pos.z }, to = w.freeSpot(at.x - ux * 0.8, at.z - uz * 0.8), steps = 10;
      c.act('heavy', 1.2);
      fx.play('v_dust', from.x, from.z, { scale: 0.6 });
      for (let i = 1; i <= steps; i++) later(i * 0.035, () => { const q = i / steps; P.pos.x = from.x + (to.x - from.x) * q; P.pos.z = from.z + (to.z - from.z) * q; fx.burst(P.pos.x, 1.5 + Math.sin(q * Math.PI) * 3, P.pos.z, c.color, 2, 0.8, 0.3); });
      later(steps * 0.035 + 0.02, () => {
        ring(to.x, to.z, R, c.color, 0.5); fx.shake(0.45); fx.play('quake', to.x, to.z, { scale: Math.min(1.8, R / 3) });
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; strike(to.x + Math.cos(a) * R * 0.6, to.z + Math.sin(a) * R * 0.6, 0.7); }
        for (const m of near(to, R)) c.hit(m, n);
      });
      w.moveTo = null;
      break;
    }
    case 'boomerang': {
      const dur = c.act('attack2', 1.4), len = Math.max(L, 7), out = 0.45;
      later(dur * 0.3, () => {
        const o = { x: P.pos.x, z: P.pos.z }, hitA = new Set(), hitB = new Set();
        const path = (q) => { const k = q < 0.5 ? q * 2 : 2 - q * 2; return { x: o.x + ux * len * k, z: o.z + uz * len * k }; };
        mover('throw_axe', out * 2, path, { scale: 1.1, step: (p, q) => {
          const set = q < 0.5 ? hitA : hitB;
          for (const m of near(p, W * 0.7)) if (!set.has(m)) { set.add(m); c.hit(m, 0.5 * n); fx.burst(m.pos.x, 1, m.pos.z, c.color, 4, 2, 0.3); }
          if (sk.fx && Math.round(q * 20) % 5 === 0) c.FX(p.x, p.z, 0.5);
        } });
      });
      break;
    }
    case 'fissure': {
      const dur = c.act(c.melee ? 'heavy' : 'cast', 1.2), len = Math.max(L, 8);
      later(dur * 0.4, () => {
        const o = { x: P.pos.x, z: P.pos.z };
        fx.shake(0.3);
        for (let k = 1.2; k < len; k += 1.3) later(k / 22, () => { strike(o.x + ux * k + (Math.random() - 0.5) * 0.6, o.z + uz * k + (Math.random() - 0.5) * 0.6, 0.75); fx.play('rupture', o.x + ux * k, o.z + uz * k, { scale: 1.2 }); });
        for (const m of w.monsters) { if (m.dead) continue; const a = inLine(m, o.x, o.z, ux, uz, len, W); if (a != null) later(a / 22, () => hitOnce(m, n)); }
      });
      break;
    }
    case 'wall': {
      const dur = c.act(c.melee ? 'heavy' : 'castUp', 1.2), dist = Math.min(Math.max(3, c.t ? d2(c.t.pos, P.pos) : 5), 8), half = Math.max(3, R);
      later(dur * 0.4, () => {
        const cx = P.pos.x + ux * dist, cz = P.pos.z + uz * dist, px = uz, pz = -ux;
        for (let s = 0; s <= half; s += 1.2) later(s / 30, () => { for (const g of s ? [1, -1] : [1]) strike(cx + px * s * g, cz + pz * s * g, 0.8); });
        fx.shake(0.3);
        for (const m of w.monsters) { if (m.dead) continue; const a = inLine(m, cx - ux * 1.2, cz - uz * 1.2, ux, uz, 2.4, 0.1), side = Math.abs((m.pos.x - cx) * px + (m.pos.z - cz) * pz); if (a != null && side < half + 0.6) later(side / 30, () => hitOnce(m, n)); }
      });
      break;
    }
    case 'ripple': {
      const dur = c.act(c.melee ? 'heavy' : 'castUp', 1.2);
      later(dur * 0.35, () => {
        const o = { x: P.pos.x, z: P.pos.z };
        for (let i = 1; i <= 3; i++) later((i - 1) * 0.18, () => {
          const r = (R * i) / 3; ring(o.x, o.z, r, c.color, 0.35);
          const k = 6 + i * 3; for (let j = 0; j < k; j++) { const a = (j / k) * TAU; if (sk.fx && j % 2 === 0) c.FX(o.x + Math.cos(a) * r, o.z + Math.sin(a) * r, 0.45); else fx.burst(o.x + Math.cos(a) * r, 0.4, o.z + Math.sin(a) * r, c.color, 2, 1, 0.25); }
          for (const m of near(o, r)) hitOnce(m, n);
        });
      });
      break;
    }
    case 'pillars': {
      const dur = c.act(c.melee ? 'heavy' : 'castUp', 1.2), k = 8, rr = R * 0.65;
      later(dur * 0.35, () => {
        const o = { x: P.pos.x, z: P.pos.z }, a0 = ang;
        for (let i = 0; i < k; i++) later(i * 0.07, () => {
          const a = a0 + (i / k) * TAU, x = o.x + Math.sin(a) * rr, z = o.z + Math.cos(a) * rr;
          strike(x, z, 1); for (let j = 0; j < 8; j++) fx.add.add({ x: x + (Math.random() - 0.5) * 0.8, y: 0.2, z: z + (Math.random() - 0.5) * 0.8, vy: 4 + Math.random() * 4, color: c.color, size: 0.5, size1: 0.1, life: 0.5, cell: 'spark' });
          for (const m of near({ x, z }, R * 0.5)) hitOnce(m, n);
        });
        later(k * 0.07, () => { for (const m of near(o, R)) hitOnce(m, n); });
      });
      break;
    }
    case 'vortex': {
      const dur = c.act(c.melee ? 'spin' : 'castUp', 1.3), o = c.melee || FORM_DEFS[f].shape === 'self' ? null : at;
      later(dur * 0.3, () => {
        const ctr = o || { x: P.pos.x, z: P.pos.z }, rr = Math.max(R, 3.5);
        fx.play('c_tornado', ctr.x, ctr.z, { scale: Math.min(1.4, rr / 3.5), dur: 0.9 });
        const grabbed = near(ctr, rr + 1).filter((m) => m.tier !== 'boss');
        for (let i = 1; i <= 8; i++) later(i * 0.05, () => { for (const m of grabbed) { if (m.dead) continue; const dx = ctr.x - m.pos.x, dz = ctr.z - m.pos.z, l = Math.hypot(dx, dz); if (l > 1) { m.pos.x += dx * 0.12; m.pos.z += dz * 0.12; } } fx.burst(ctr.x + (Math.random() - 0.5) * rr, 0.5, ctr.z + (Math.random() - 0.5) * rr, c.color, 2, 1, 0.3); });
        later(0.48, () => { ring(ctr.x, ctr.z, rr * 0.7, c.color, 0.45); strike(ctr.x, ctr.z, 1.3); fx.shake(0.35); for (const m of near(ctr, rr)) c.hit(m, n); });
      });
      break;
    }
    case 'trail': {
      const from = { x: P.pos.x, z: P.pos.z }, len = Math.max(L, 7), to = w.freeSpot(from.x + ux * len, from.z + uz * len), steps = 9;
      c.act('run', 1.6);
      const spots = [];
      for (let i = 1; i <= steps; i++) later(i * 0.03, () => { P.pos.x = from.x + (to.x - from.x) * i / steps; P.pos.z = from.z + (to.z - from.z) * i / steps; spots.push({ x: P.pos.x, z: P.pos.z }); fx.play(sk.fx || 'p_burning', P.pos.x, P.pos.z, { scale: 0.6, dur: 1.1 }); });
      const ln = Math.hypot(to.x - from.x, to.z - from.z), A = new Set();
      for (const m of w.monsters) { if (m.dead) continue; const a = inLine(m, from.x, from.z, ux, uz, ln + 1, W); if (a != null) later(0.03 + (a / ln) * 0.27, () => { if (!A.has(m)) { A.add(m); c.hit(m, n * 0.5); } }); }
      later(0.9, () => { for (const p of spots.filter((_, i) => i % 3 === 1)) strike(p.x, p.z, 0.6); for (const m of w.monsters) if (!m.dead && inLine(m, from.x, from.z, ux, uz, ln + 1, W) != null) c.hit(m, n * 0.5); });
      w.moveTo = null;
      break;
    }
    case 'crescent': {
      const dur = c.act('heavy', 1.3), len = Math.max(L, 9);
      later(dur * 0.4, () => {
        const o = { x: P.pos.x, z: P.pos.z }, sp = 0.5;
        fx.slash(o.x, o.z, ang, c.color, 3, { dur: 0.25 });
        for (let i = 0; i < 6; i++) later((i / 6) * sp, () => fx.slash(o.x + ux * len * (i / 6), o.z + uz * len * (i / 6), ang, c.color, 2.6 + i * 0.15, { dur: 0.22 }));
        for (const m of w.monsters) { if (m.dead) continue; const a = inLine(m, o.x, o.z, ux, uz, len, W + 0.6); if (a != null) later((a / len) * sp, () => { hitOnce(m, n); if (sk.fx) c.FX(m.pos.x, m.pos.z, 0.6); }); }
      });
      break;
    }
    case 'cage': {
      const dur = c.act(c.melee ? 'heavy' : 'castUp', 1.2), rr = Math.max(R, 3);
      later(dur * 0.35, () => {
        const k = 10;
        for (let i = 0; i < k; i++) { const a = (i / k) * TAU; strike(at.x + Math.cos(a) * rr, at.z + Math.sin(a) * rr, 0.8); }
        later(0.3, () => { strike(at.x, at.z, 1.1); fx.shake(0.3); for (const m of near(at, rr)) { if (m.tier !== 'boss') m.rootT = Math.max(m.rootT || 0, 1.2); c.hit(m, n); } });
      });
      break;
    }
    case 'stomp': {
      const dur = c.act('heavy', 1.6);
      for (let i = 0; i < 3; i++) later(dur * 0.2 + i * 0.32, () => {
        const r = R * (0.55 + i * 0.225); c.sfx?.('slam');
        ring(P.pos.x, P.pos.z, r, c.color, 0.4); fx.play('v_dust', P.pos.x, P.pos.z, { scale: 0.5 + i * 0.25 }); fx.shake(0.15 + i * 0.1);
        if (sk.fx && i === 2) for (let j = 0; j < 6; j++) { const a = (j / 6) * TAU; c.FX(P.pos.x + Math.cos(a) * r * 0.7, P.pos.z + Math.sin(a) * r * 0.7, 0.6); }
        for (const m of near(P.pos, r)) c.hit(m, n / 3);
      });
      break;
    }
    // ───── 원거리 ─────
    case 'split': {
      const dur = c.act(c.bow ? 'shoot' : 'cast', 1.5), tg = c.t; if (!tg) break;
      later(dur * 0.35, () => fx.projectile({ elem: sk.elem, from: w.muzzle(), target: tg, color: c.color, size: 0.9, speed: 30, bolt: c.bow, onHit: (x) => {
        const p = x.pos || tg.pos; if (!x.dead) c.hit(x, n); if (sk.fx) c.FX(p.x, p.z, 0.8);
        const A = new Set([x]);
        for (let i = -2; i <= 2; i++) {
          const a = ang + i * 0.38, end = { x: p.x + Math.sin(a) * 7, z: p.z + Math.cos(a) * 7 };
          const m = w.monsters.filter((q) => !q.dead && !A.has(q) && inLine(q, p.x, p.z, Math.sin(a), Math.cos(a), 7, 1.6) != null).sort((q1, q2) => d2(q1.pos, p) - d2(q2.pos, p))[0];
          if (m) A.add(m);
          fx.projectile({ elem: sk.elem, from: { x: p.x, y: 1.2, z: p.z }, target: m || { x: end.x, z: end.z, pos: new THREE.Vector3(end.x, 0.2, end.z) }, color: c.color, size: 0.5, speed: 30, bolt: c.bow, onHit: (q) => { if (q && q.hp != null && !q.dead) c.hit(q, 0.5 * n); } });
        }
      } }));
      break;
    }
    case 'fan': {
      const dur = c.act(c.bow ? 'shoot' : 'cast', 1.5), r = R || 7;
      later(dur * 0.35, () => {
        for (let i = 0; i < 9; i++) { const a = ang + (i / 8 - 0.5) * 1.5, x = P.pos.x + Math.sin(a) * r, z = P.pos.z + Math.cos(a) * r; fx.projectile({ elem: sk.elem, from: w.muzzle(), target: { x, z, pos: new THREE.Vector3(x, 0.4, z) }, color: c.color, size: 0.55, speed: 34, bolt: c.bow, trail: true, onHit: () => {} }); }
        for (const m of w.monsters) if (!m.dead && inArc(m, r, 0.78)) later(d2(m.pos, P.pos) / 34, () => { hitOnce(m, n); if (sk.fx) c.FX(m.pos.x, m.pos.z, 0.6); });
      });
      break;
    }
    case 'homing': {
      const dur = c.act(c.bow ? 'shoot' : 'castUp', 1.3), list = near(at, Math.max(R, 5)).sort((a, b) => d2(a.pos, at) - d2(b.pos, at)).slice(0, 6);
      later(dur * 0.3, () => {
        const up = { x: P.pos.x, y: 7, z: P.pos.z };
        for (let i = 0; i < 6; i++) { const q = { x: P.pos.x + (Math.random() - 0.5) * 2, z: P.pos.z + (Math.random() - 0.5) * 2 }; fx.projectile({ elem: sk.elem, from: w.muzzle(), target: { x: q.x, z: q.z, pos: new THREE.Vector3(q.x, 5.5, q.z) }, color: c.color, size: 0.5, speed: 30, bolt: c.bow, onHit: () => {} }); }
        list.forEach((m, i) => later(0.3 + i * 0.08, () => { if (m.dead) return; fx.projectile({ elem: sk.elem, from: { ...up, x: up.x + (Math.random() - 0.5) * 3 }, target: m, color: c.color, size: 0.6, speed: 26, bolt: c.bow, onHit: (x) => { if (!x.dead) { c.hit(x, n); if (sk.fx) c.FX(x.pos.x, x.pos.z, 0.6); } } }); }));
      });
      break;
    }
    case 'bounce': {
      const dur = c.act(c.bow ? 'shoot' : 'cast', 1.5), tg = c.t; if (!tg) break;
      const jumps = (sk.jumps || 3) + 1;
      later(dur * 0.35, () => {
        const done = new Set();
        const go = (from, m, i) => fx.projectile({ elem: sk.elem, from, target: m, color: c.color, size: 0.75, speed: 28, bolt: c.bow, onHit: (x) => {
          if (x.dead) return; done.add(x); c.hit(x, n * Math.pow(0.85, i)); if (sk.fx) c.FX(x.pos.x, x.pos.z, 0.6);
          if (i + 1 >= jumps) return;
          const nx = w.monsters.filter((q) => !q.dead && !done.has(q) && d2(q.pos, x.pos) < 7).sort((a, b) => d2(a.pos, x.pos) - d2(b.pos, x.pos))[0];
          if (nx) later(0.05, () => go({ x: x.pos.x, y: 1.3, z: x.pos.z }, nx, i + 1));
        } });
        go(w.muzzle(), tg, 0);
      });
      break;
    }
    case 'runes': {
      const dur = c.act(c.bow ? 'shoot' : 'cast', 1.4), list = near(at, Math.max(R, 4.5)).slice(0, 6);
      later(dur * 0.3, () => {
        const spots = list.length ? list.map((m) => m) : [{ pos: at }];
        for (const m of spots) { fx.ground(c.bow ? 'bear_trap' : 'runes_orange', m.pos.x, m.pos.z, { scale: c.bow ? 0.9 : 0.8, dur: 0.9, tint: c.bow ? null : c.color }); }
        later(0.85, () => { for (const m of spots) { const p = m.dead ? m.pos : m.pos; strike(p.x, p.z, 0.9); ring(p.x, p.z, 1.8, c.color, 0.3); for (const q of near(p, 2)) hitOnce(q, n); } fx.shake(0.25); });
      });
      break;
    }
    case 'spiral': {
      const dur = c.act(c.bow ? 'shoot' : 'castUp', 1.3), r = Math.max(R, 4), k = 14;
      later(dur * 0.3, () => {
        const o = { x: P.pos.x, z: P.pos.z };
        for (let i = 0; i < k; i++) later(i * 0.035, () => { const a = ang + (i / k) * TAU * 1.5, x = o.x + Math.sin(a) * r, z = o.z + Math.cos(a) * r; fx.projectile({ elem: sk.elem, from: { x: o.x, y: 1.3, z: o.z }, target: { x, z, pos: new THREE.Vector3(x, 0.3, z) }, color: c.color, size: 0.55, speed: 26, bolt: c.bow, onHit: () => { if (sk.fx && i % 3 === 0) c.FX(x, z, 0.5); } }); });
        for (const m of near(o, r)) later(0.15 + Math.random() * 0.3, () => hitOnce(m, n));
      });
      break;
    }
    case 'orbit': {
      c.act('castUp', 1.4);
      const r = Math.max(2.2, R * 0.6), T = 2.4, ticks = 6, orbs = [];
      const name = sk.elem === 'fire' ? 'fireball' : sk.elem === 'ice' ? 'status_freeze' : sk.elem === 'lightning' ? 'spark_blue' : 'plasmaball';
      for (let j = 0; j < 3; j++) { const it = fx.play(name, P.pos.x, P.pos.z, { y: 1, loop: true, dur: T, scale: 0.6, tint: name === 'plasmaball' ? c.color : null }); orbs.push(it); }
      const steps = Math.round(T / 0.03);
      for (let i = 1; i <= steps; i++) later(i * 0.03, () => orbs.forEach((it, j) => { if (!it) return; const a = (i * 0.03) * 4.2 + (j / 3) * TAU; it.x = P.pos.x + Math.cos(a) * r; it.z = P.pos.z + Math.sin(a) * r; if (it.drawable) it.drawable.z = it.z; }));
      for (let i = 0; i < ticks; i++) later(0.2 + i * (T / ticks), () => { for (const m of near(P.pos, r + 1.2)) c.hit(m, n / ticks); });
      break;
    }
    case 'totem': {
      const dur = c.act('castUp', 1.3), r = Math.max(R, 3.5), waves = Math.max(4, Math.round(n));
      later(dur * 0.3, () => {
        const post = sk.elem === 'fire' ? 'c_firepost' : sk.elem === 'ice' ? 'c_waterpost' : c.bow ? 'c_earthpost' : 'c_waterpost';
        fx.play(post, at.x, at.z, { scale: 1, dur: 0.5 + waves * 0.4, loop: true, tint: sk.elem === 'lightning' || sk.elem === 'arcane' || sk.elem === 'holy' ? c.color : null });
        for (let i = 0; i < waves; i++) later(0.35 + i * 0.4, () => {
          ring(at.x, at.z, r, c.color, 0.3);
          const m0 = near(at, r); if (m0.length) { const q = m0[i % m0.length]; fx.lightning([{ x: at.x, z: at.z }, q.pos], c.color); }
          for (const m of m0) c.hit(m, n / waves);
        });
      });
      break;
    }
    case 'column': {
      const dur = c.act(c.bow ? 'shoot' : 'castUp', 1.3), len = Math.max(L, 9);
      later(dur * 0.3, () => {
        const o = { x: P.pos.x, z: P.pos.z };
        for (let k = 1.5; k < len; k += 1.6) later(k / 18, () => { strike(o.x + ux * k, o.z + uz * k, 0.85); if (sk.elem === 'lightning') fx.play('thunderstrike', o.x + ux * k, o.z + uz * k, { scale: 0.7 }); });
        for (const m of w.monsters) { if (m.dead) continue; const a = inLine(m, o.x, o.z, ux, uz, len, W); if (a != null) later(a / 18 + 0.05, () => hitOnce(m, n)); }
      });
      break;
    }
    case 'cross': {
      const dur = c.act(c.bow ? 'shoot' : 'castUp', 1.3), arm = Math.max(R, 3.5);
      later(dur * 0.3, () => {
        strike(at.x, at.z, 1.2); fx.shake(0.2);
        for (const a of [0.785, 2.356, 3.927, 5.498]) for (let s = 1; s <= 3; s++) later(s * 0.08, () => strike(at.x + Math.cos(a) * arm * s / 3, at.z + Math.sin(a) * arm * s / 3, 0.8));
        for (const m of near(at, arm + 0.6)) { const px = m.pos.x - at.x, pz = m.pos.z - at.z, rot1 = Math.abs(px - pz), rot2 = Math.abs(px + pz); if (Math.min(rot1, rot2) < 2.2 || d2(m.pos, at) < 1.8) later(0.1, () => hitOnce(m, n)); }
      });
      break;
    }
    case 'implode': {
      const dur = c.act('castUp', 1.2), r = Math.max(R, 3.5);
      later(dur * 0.3, () => {
        for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; fx.add.add({ x: at.x + Math.cos(a) * r, y: 0.6, z: at.z + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.2, vy: 0.3, vz: -Math.sin(a) * r * 2.2, color: c.color, size: 0.6, size1: 0.1, life: 0.45, cell: 'spark' }); }
        fx.circle(at.x, at.z, r, c.color, 0.5);
        const grab = near(at, r + 0.5).filter((m) => m.tier !== 'boss');
        for (let i = 1; i <= 5; i++) later(i * 0.07, () => { for (const m of grab) { if (m.dead) continue; m.pos.x += (at.x - m.pos.x) * 0.1; m.pos.z += (at.z - m.pos.z) * 0.1; } });
        later(0.45, () => { strike(at.x, at.z, 1.4); fx.play('b_star_explosion', at.x, at.z, { scale: Math.min(1.1, r / 4), tint: c.color }); fx.shake(0.35); for (const m of near(at, r)) c.hit(m, n); });
      });
      break;
    }
    case 'star': {
      const dur = c.act(c.bow ? 'shoot' : 'castUp', 1.3), r = Math.max(R, 3.5) * 0.7;
      later(dur * 0.3, () => {
        for (let i = 0; i < 5; i++) later(i * 0.12, () => { const a = -Math.PI / 2 + (i * 2 * TAU) / 5, x = at.x + Math.cos(a) * r, z = at.z + Math.sin(a) * r; strike(x, z, 0.9); for (const m of near({ x, z }, r * 0.55)) hitOnce(m, n); });
        later(0.7, () => { strike(at.x, at.z, 1.3); fx.play('b_star_explosion', at.x, at.z, { scale: 0.8, tint: c.color }); fx.shake(0.3); for (const m of near(at, r * 1.3)) hitOnce(m, n); });
      });
      break;
    }
    case 'tornado': {
      const dur = c.act(c.bow ? 'shoot' : 'cast', 1.3), len = Math.max(L, 9), T = 1.6, ticks = Math.max(8, Math.round(n * 2));
      later(dur * 0.3, () => {
        const o = { x: P.pos.x, z: P.pos.z }, path = (q) => ({ x: o.x + ux * len * q, z: o.z + uz * len * q });
        mover('c_tornado', T, path, { scale: Math.min(1.3, W / 2.4), tint: sk.elem && sk.elem !== 'lightning' ? c.color : null });
        const got = new Map();
        for (let i = 0; i < ticks; i++) later(((i + 0.5) / ticks) * T, () => { const p = path((i + 0.5) / ticks); for (const m of near(p, W * 0.8 + 0.8)) { const g = got.get(m) || 0; if (g < 3) { got.set(m, g + 1); c.hit(m, n / 3); } } if (sk.fx) c.FX(p.x, p.z, 0.5); });
      });
      break;
    }
    case 'sweep': {
      const dur = c.act('cast', 1.3), r = R || 8, steps = 7;
      later(dur * 0.3, () => {
        const o = { x: P.pos.x, z: P.pos.z };
        for (let i = 0; i < steps; i++) later(i * 0.06, () => { const a = ang - 0.75 + (i / (steps - 1)) * 1.5, vx = Math.sin(a), vz = Math.cos(a);
          for (let k = 1.2; k < r; k += 1.4) { if (sk.fx && k > r * 0.6) c.FX(o.x + vx * k, o.z + vz * k, 0.45); else fx.burst(o.x + vx * k, 1, o.z + vz * k, c.color, 2, 0.6, 0.35); }
          for (const m of w.monsters) if (!m.dead && inLine(m, o.x, o.z, vx, vz, r, 1.6) != null) hitOnce(m, n); });
      });
      break;
    }
    case 'surge': {
      const dur = c.act('castUp', 1.3), len = Math.max(L, 9), wid = Math.max(W, 4.5);
      later(dur * 0.3, () => {
        const o = { x: P.pos.x, z: P.pos.z }, px = uz, pz = -ux;
        for (let k = 1; k < len; k += 1.5) later(k / 16, () => { for (const s of [-0.4, 0, 0.4]) { const x = o.x + ux * k + px * s * wid, z = o.z + uz * k + pz * s * wid; if (sk.fx) c.FX(x, z, 0.55); fx.burst(x, 0.4, z, c.color, 3, 1.6, 0.3); } });
        for (const m of w.monsters) { if (m.dead) continue; const a = inLine(m, o.x, o.z, ux, uz, len, wid); if (a != null) later(a / 16, () => { hitOnce(m, n); if (m.tier !== 'boss') { m.pos.x += ux * 0.8; m.pos.z += uz * 0.8; } }); }
      });
      break;
    }
    case 'ringfall': {
      const dur = c.act(c.bow ? 'shoot' : 'castUp', 1.3), r = Math.max(R, 3.5), waves = Math.max(3, Math.round(n));
      later(dur * 0.3, () => {
        for (let i = 0; i < waves; i++) later(i * 0.3, () => {
          const rr = r * (1 - i / waves) + 0.4, k = Math.max(4, Math.round(rr * 2));
          for (let j = 0; j < k; j++) { const a = (j / k) * TAU + i; strike(at.x + Math.cos(a) * rr, at.z + Math.sin(a) * rr, 0.6); }
          for (const m of near(at, r)) c.hit(m, n / waves);
        });
      });
      break;
    }
    default: return false;
  }
  return true;
}
