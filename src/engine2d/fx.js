// 2D 효과: Flare 효과 그림(화염구 · 얼음 · 화살 · 폭발 · 낙뢰 · 룬 …) + 캔버스로 그린 검기 · 예고판 · 충격파 · 입자
// 예전 3D FX와 같은 쓰임새 (hit · burst · ring · cone · slash · circle · telegraph · lane · pillar · lightning · meteor · projectile · text)
import * as THREE from 'three';
import { DATA, image, tinted, frameIndex, animImage, drawRect, dirIndex } from './sprites.js';
import { PX, PZ, PY } from './stage.js';

const hex = (c) => '#' + new THREE.Color(c).getHexString();
const rgba = (c, a) => { const k = new THREE.Color(c); return `rgba(${(k.r * 255) | 0},${(k.g * 255) | 0},${(k.b * 255) | 0},${a})`; };

// 색 이름 → 효과 종류
function flavor(color) {
  const hsl = {}; new THREE.Color(color).getHSL(hsl);
  if (hsl.h < 0.12 || hsl.h > 0.95) return 'fire';
  if (hsl.h > 0.5 && hsl.h < 0.62 && hsl.l > 0.55) return 'ice';
  if (hsl.h > 0.55 && hsl.h < 0.8) return 'arcane';
  if (hsl.h > 0.2 && hsl.h < 0.45) return 'nature';
  return 'light';
}

// ───── 입자 모양 (흰색) → 색마다 한 번 칠해 둔다 ─────
const SHAPES = {};
function shape(kind) {
  if (SHAPES[kind]) return SHAPES[kind];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.translate(32, 32);
  const rad = (r, st) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); for (const [o, col] of st) gr.addColorStop(o, col); return gr; };
  if (kind === 'glow') { g.fillStyle = rad(31, [[0, '#fff'], [0.25, 'rgba(255,255,255,0.7)'], [0.6, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-32, -32, 64, 64); }
  else if (kind === 'spark') {
    g.fillStyle = rad(18, [[0, '#fff'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-32, -32, 64, 64);
    g.fillStyle = '#fff'; for (const [w, h] of [[2.5, 30], [30, 2.5]]) { g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, 7); g.fill(); }
  } else if (kind === 'flame') {
    g.beginPath(); g.moveTo(0, -30); g.bezierCurveTo(15, -10, 20, 15, 0, 28); g.bezierCurveTo(-20, 15, -15, -10, 0, -30);
    const gr = g.createLinearGradient(0, -30, 0, 28); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, '#fff'); g.fillStyle = gr; g.fill();
  } else if (kind === 'smoke') {
    for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, r = Math.random() * 12, s = 10 + Math.random() * 10; g.fillStyle = rad(s, [[0, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]); g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r); g.fillRect(-s, -s, s * 2, s * 2); g.restore(); }
  } else if (kind === 'shard') { g.beginPath(); g.moveTo(0, -28); g.lineTo(8, 0); g.lineTo(0, 28); g.lineTo(-8, 0); g.closePath(); g.fillStyle = '#fff'; g.fill(); }
  else if (kind === 'flake') {
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
    for (let k = 0; k < 6; k++) { g.save(); g.rotate((k / 6) * Math.PI * 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -24); g.moveTo(0, -14); g.lineTo(6, -20); g.moveTo(0, -14); g.lineTo(-6, -20); g.stroke(); g.restore(); }
  } else { g.fillStyle = rad(10, [[0, '#fff'], [0.6, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-32, -32, 64, 64); }
  return (SHAPES[kind] = c);
}
const colored = new Map();
function coloredShape(kind, color) {
  const key = kind + color;
  let c = colored.get(key);
  if (!c) {
    const src = shape(kind);
    c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = hex(color); g.fillRect(0, 0, 64, 64);
    colored.set(key, c);
    if (colored.size > 400) colored.clear();
  }
  return c;
}

// ───── 입자 묶음 (예전 Particles와 같은 add) ─────
class Particles {
  constructor(additive) { this.list = []; this.additive = additive; }
  add(o) {
    if (this.list.length > 1800) this.list.shift();
    this.list.push({ x: o.x, y: o.y || 0, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, color: o.color ?? 0xffffff, s0: o.size ?? 0.5, s1: o.size1 ?? o.size ?? 0.5,
      a0: o.alpha ?? 1, life: 0, dur: o.life ?? 0.5, cell: o.cell || 'glow', grav: o.grav || 0, drag: o.drag || 0, rot: o.rot ?? Math.random() * 6.28, spin: o.spin || 0 });
  }
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life += dt;
      if (p.life >= p.dur) { L[i] = L[L.length - 1]; L.pop(); continue; }
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vz *= d; p.vy = p.vy * d - p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.03 && p.grav > 0) { p.y = 0.03; p.vy *= -0.3; }
      p.rot += p.spin * dt;
    }
  }
  draw(ctx, st) {
    const z = st.scale();
    ctx.globalCompositeOperation = this.additive ? 'lighter' : 'source-over';
    for (const p of this.list) {
      const k = p.life / p.dur;
      const a = p.a0 * (k < 0.1 ? k * 10 : 1 - (k - 0.1) / 0.9);
      const size = (p.s0 + (p.s1 - p.s0) * k) * PX * z;
      if (size < 0.5) continue;
      const s = st.toScreen(p.x, p.z, p.y);
      if (s.x < -size || s.y < -size || s.x > st.W + size || s.y > st.H + size) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      const img = coloredShape(p.cell, p.color);
      if (p.spin || p.cell === 'spark' || p.cell === 'shard') {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(p.rot); ctx.drawImage(img, -size / 2, -size / 2, size, size); ctx.restore();
      } else ctx.drawImage(img, s.x - size / 2, s.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// 바닥 타원 (반지름 r, 세계 단위) 경로
function ellipse(ctx, st, x, z, r) {
  const p = st.toScreen(x, z), k = st.scale();
  ctx.beginPath(); ctx.ellipse(p.x, p.y, r * PX * k, r * PZ * k, 0, 0, Math.PI * 2);
}

export class FX {
  constructor(stage, layer) {
    this.stage = stage;
    this.layer = layer;   // 떠오르는 숫자를 그릴 DOM
    this.items = [];      // 바닥 효과 · 투사체 · 빛기둥 · Flare 효과 그림
    this.texts = [];
    this.time = 0;
    this.add = new Particles(true);
    this.smoke = new Particles(false);
    this.onShake = null;
    stage.groundLayers.push((ctx, st) => this.drawGround(ctx, st));
    stage.topLayers.push((ctx, st) => { this.smoke.draw(ctx, st); this.add.draw(ctx, st); this.drawTop(ctx, st); });
  }

  shake(k) { this.onShake?.(k); }

  // ───── Flare 효과 그림 (앞뒤 정렬에 끼어 그려진다) ─────
  play(name, x, z, { y = 0, scale = 1, dur = null, loop = false, dir = 0, alpha = 1, tint = null } = {}) {
    const def = DATA.powers?.[name];
    if (!def) return null;
    const anim = def.anims.power || Object.values(def.anims)[0];
    const it = { kind: 'power', def, anim, x, z, y, scale, dir, alpha, tint, t: 0, dur: dur ?? anim.dur / 1000, loop };
    image(animImage(def, 'power'));
    it.drawable = { z, draw: (ctx, st) => this.drawPower(ctx, st, it) };
    this.stage.add(it.drawable);
    this.items.push(it);
    return it;
  }
  drawPower(ctx, st, it) {
    const path = animImage(it.def, 'power');
    const src = it.tint != null ? tinted(path, it.tint) : image(path).ok && image(path).im;
    if (!src) return;
    const a = it.anim;
    const rects = a.f[it.dir] || a.f[0];
    const fi = it.loop ? frameIndex(a, it.t) : Math.min(a.frames - 1, Math.floor((it.t / it.dur) * a.frames));
    const p = st.toScreen(it.x, it.z, it.y);
    ctx.globalAlpha = it.alpha * (it.fade ? Math.max(0, 1 - it.t / it.dur) : 1);
    ctx.globalCompositeOperation = it.add === false ? 'source-over' : 'lighter';
    drawRect(ctx, src, rects?.[fi], p.x, p.y, st.scale() * it.scale);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // 바닥 효과 판 (mode: 0 충격파 · 1 예고판 · 2 부채꼴 · 3 마법진 · 4 검기 · 5 그을음 · 6 직선 예고판)
  decal(mode, x, z, radius, color, dur, o = {}) {
    const it = { kind: 'decal', mode, x, z, r: radius, color, dur, t: 0, ...o };
    this.items.push(it);
    return it;
  }

  drawGround(ctx, st) {
    const k = st.scale();
    for (const it of this.items) {
      if (it.kind !== 'decal' || it.mode === 4) continue;
      const q = Math.min(1, it.t / it.dur);
      if (!st.onScreen(it.x, it.z, it.r + 4)) continue;
      if (it.mode === 0) {          // 충격파
        const r = it.r * (0.15 + 0.85 * Math.min(1, q * 1.4));
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - q; ctx.strokeStyle = hex(it.color); ctx.lineWidth = 8 * k * (1 - q * 0.6);
        ellipse(ctx, st, it.x, it.z, r); ctx.stroke();
        ctx.globalAlpha = (1 - q) * 0.25; ctx.fillStyle = hex(it.color); ellipse(ctx, st, it.x, it.z, r); ctx.fill();
      } else if (it.mode === 1) {   // 예고판: 가운데부터 차오름
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 14);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.2 + 0.08 * pulse; ctx.fillStyle = hex(it.color); ellipse(ctx, st, it.x, it.z, it.r); ctx.fill();
        ctx.globalAlpha = 0.45; ellipse(ctx, st, it.x, it.z, it.r * q); ctx.fill();
        ctx.globalAlpha = 0.95; ctx.strokeStyle = hex(it.color); ctx.lineWidth = 3 * k; ellipse(ctx, st, it.x, it.z, it.r); ctx.stroke();
        ctx.globalAlpha = 0.8; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * k; ellipse(ctx, st, it.x, it.z, it.r * q); ctx.stroke();
      } else if (it.mode === 2) {   // 부채꼴 불길
        const p = st.toScreen(it.x, it.z), spread = it.spread || 1.5, R = it.r * Math.min(1, 0.3 + q * 1.2);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - q * q) * 0.8;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R * PX * k);
        g.addColorStop(0, rgba(0xffffff, 0.8)); g.addColorStop(0.35, rgba(it.color, 0.7)); g.addColorStop(1, rgba(it.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        for (let i = 0; i <= 16; i++) { const a = it.angle - spread / 2 + (spread * i) / 16; ctx.lineTo(p.x + Math.sin(a) * R * PX * k, p.y + Math.cos(a) * R * PZ * k); }
        ctx.closePath(); ctx.fill();
      } else if (it.mode === 5) {   // 그을음
        const p = st.toScreen(it.x, it.z);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.6 * (1 - q);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, it.r * PX * k);
        g.addColorStop(0, 'rgba(10,6,4,0.9)'); g.addColorStop(1, 'rgba(10,6,4,0)');
        ctx.fillStyle = g; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.5); ctx.translate(-p.x, -p.y);
        ctx.beginPath(); ctx.arc(p.x, p.y, it.r * PX * k, 0, 7); ctx.fill(); ctx.restore();
      } else if (it.mode === 6) {   // 직선 예고판
        const ux = Math.sin(it.angle), uz = Math.cos(it.angle), w = it.width / 2;
        const pt = (a, b) => st.toScreen(it.x + ux * a - uz * b, it.z + uz * a + ux * b);
        const pts = [pt(0, -w), pt(it.len, -w), pt(it.len, w), pt(0, w)];
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = hex(it.color);
        ctx.globalAlpha = 0.22; ctx.beginPath(); pts.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y))); ctx.closePath(); ctx.fill();
        const f = [pt(0, -w), pt(it.len * q, -w), pt(it.len * q, w), pt(0, w)];
        ctx.globalAlpha = 0.45; ctx.beginPath(); f.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y))); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.strokeStyle = hex(it.color); ctx.lineWidth = 2.5 * k; ctx.beginPath(); pts.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y))); ctx.closePath(); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // 검기 · 빛기둥 · 번개 · 투사체 빛 (맨 위)
  drawTop(ctx, st) {
    const k = st.scale();
    ctx.globalCompositeOperation = 'lighter';
    for (const it of this.items) {
      const q = Math.min(1, it.t / it.dur);
      if (it.kind === 'decal' && it.mode === 4) {    // 검기: 호를 따라 머리는 굵고 밝게, 꼬리는 사라짐
        const p = st.toScreen(it.x, it.z, it.y ?? 1);
        const head = Math.min(1.25, 0.2 + q * 2.4), spread = it.spread;
        const N = 22;
        for (let i = 0; i < N; i++) {
          const u = i / N, u2 = (i + 1) / N;
          const tail = 1 - (head - u) / 0.95;
          if (u > head || tail <= 0) continue;
          const a1 = it.angle - spread / 2 + spread * u, a2 = it.angle - spread / 2 + spread * u2;
          const tilt = it.tilt || 0;
          const P = (a) => ({ x: p.x + Math.sin(a) * it.r * PX * k, y: p.y + Math.cos(a) * it.r * PZ * k - Math.sin(a - it.angle) * tilt * 30 * k });
          const A = P(a1), B = P(a2);
          ctx.globalAlpha = Math.max(0, tail) * (1 - Math.max(0, q - 0.55) / 0.45);
          ctx.strokeStyle = hex(it.color); ctx.lineWidth = (3 + 9 * tail) * k; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = (1 + 3 * tail) * k;
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        }
      } else if (it.kind === 'beam') {
        const p = st.toScreen(it.x, it.z), w = it.w * PX * k, h = it.h * PY * k;
        ctx.globalAlpha = Math.sin(Math.PI * q) * 0.8;
        const g = ctx.createLinearGradient(0, p.y, 0, p.y - h);
        g.addColorStop(0, rgba(0xffffff, 0.9)); g.addColorStop(0.2, rgba(it.color, 0.7)); g.addColorStop(1, rgba(it.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(p.x, p.y - h / 2, w * 0.5, h / 2, 0, 0, 7); ctx.fill();
      } else if (it.kind === 'bolt') {
        ctx.globalAlpha = (1 - q) * (0.6 + Math.random() * 0.4);
        for (const [lw, c] of [[10, it.color], [3, 0xffffff]]) {
          ctx.strokeStyle = hex(c); ctx.lineWidth = lw * k; ctx.lineJoin = 'round';
          ctx.beginPath();
          it.pts.forEach((w, i) => { const s = st.toScreen(w.x, w.z, w.y); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ───── 묶음 ─────
  burst(x, y, z, color = 0xffc070, n = 8, spread = 3, size = 0.35) {
    const kind = flavor(color), big = size * 2.2;
    this.add.add({ x, y, z, color, size: big * 1.5, size1: big * 2.2, life: 0.2, cell: 'glow', alpha: 0.9 });
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, sp = spread * (0.4 + Math.random() * 0.8);
      const cell = kind === 'ice' ? (i % 2 ? 'shard' : 'flake') : kind === 'fire' ? (i % 3 ? 'flame' : 'spark') : i % 2 ? 'spark' : 'dot';
      this.add.add({ x, y, z, vx: Math.cos(a) * sp, vy: Math.random() * spread * 1.1 + 0.5, vz: Math.sin(a) * sp, color: i % 3 ? color : 0xffffff,
        size: big * (0.5 + Math.random() * 0.6), size1: big * 0.1, life: 0.35 + Math.random() * 0.35, cell, grav: kind === 'fire' ? -1 : 7, drag: 2.5, spin: (Math.random() - 0.5) * 8 });
    }
  }

  hit(x, y, z, color = 0xffa060, crit = false) {
    const kind = flavor(color);
    const spark = { fire: 'spark_red', ice: 'spark_blue', arcane: 'spark_blue', nature: 'spark_green', light: 'spark_orange' }[kind];
    this.play(spark, x, z, { y, scale: crit ? 1.2 : 0.8 });
    this.burst(x, y, z, color, crit ? 12 : 5, crit ? 4 : 2.5, crit ? 0.4 : 0.28);
    if (crit) { this.decal(0, x, z, 2, color, 0.3); this.shake(0.12); }
  }

  ring(x, z, radius, color = 0xffaa40, dur = 0.45) {
    this.decal(0, x, z, radius, color, dur);
    const n = Math.min(26, Math.round(radius * 4));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28;
      this.add.add({ x: x + Math.cos(a) * radius * 0.4, y: 0.2, z: z + Math.sin(a) * radius * 0.4, vx: Math.cos(a) * radius * 2, vy: 0.4, vz: Math.sin(a) * radius * 2, color, size: 0.5, size1: 0.1, life: dur, cell: 'spark', drag: 3 });
    }
    if (radius > 2.5) {
      { const q = this.play('quake', x, z, { scale: Math.min(1.6, radius / 3), alpha: 0.9 }); if (q) q.add = false; }
      for (let i = 0; i < n / 2; i++) { const a = Math.random() * 6.28; this.smoke.add({ x: x + Math.cos(a) * radius * 0.5, y: 0.3, z: z + Math.sin(a) * radius * 0.5, vx: Math.cos(a) * radius, vy: 0.5, vz: Math.sin(a) * radius, color: 0x9a8670, size: 1.2, size1: 2.6, life: 0.7, cell: 'smoke', alpha: 0.22, drag: 2.5 }); }
    }
  }

  cone(x, z, angle, radius, color, spread = 1.5) {
    this.decal(2, x, z, radius, color, 0.55, { angle, spread });
    const kind = flavor(color);
    for (let i = 0; i < 26; i++) {
      const a = angle + (Math.random() - 0.5) * spread, sp = radius * (1.2 + Math.random());
      this.add.add({ x, y: 0.6, z, vx: Math.sin(a) * sp, vy: Math.random() * 1.5, vz: Math.cos(a) * sp, color: i % 4 ? color : 0xffffff, size: 0.9, size1: 1.6, life: 0.45, cell: kind === 'fire' ? 'flame' : 'spark', drag: 2.2 });
    }
    if (kind === 'fire') for (let i = 1; i <= 3; i++) this.play('ember', x + Math.sin(angle) * radius * i / 4, z + Math.cos(angle) * radius * i / 4, { scale: 0.9, dur: 0.6 });
  }

  slash(x, z, angle, color = 0xfff0d0, radius = 2.2, { all = false, y = 1, dur = 0.24, tilt = 0.25 } = {}) {
    const spread = all ? Math.PI * 2 : 2.4;
    this.decal(4, x, z, radius, color, dur * 1.4, { y, angle, spread, tilt });
    const n = all ? 18 : 9;
    for (let i = 0; i < n; i++) {
      const a = angle + (all ? (i / n) * Math.PI * 2 : (i / (n - 1) - 0.5) * spread), r = radius;
      this.add.add({ x: x + Math.sin(a) * r, y, z: z + Math.cos(a) * r, vx: Math.sin(a) * 2.5, vy: 0.6, vz: Math.cos(a) * 2.5, color: i % 3 ? color : 0xffffff, size: 0.45, size1: 0.05, life: 0.28 + (i / n) * 0.12, cell: i % 2 ? 'spark' : 'dot', drag: 3 });
    }
  }

  // 마법진: Flare 룬 (색에 맞춰)
  circle(x, z, radius, color, dur = 0.9) {
    const kind = flavor(color);
    const name = kind === 'fire' ? 'runes_orange' : kind === 'ice' || kind === 'arcane' ? 'runes_blue' : 'runes';
    const it = this.play(name, x, z, { scale: radius / 1.6, dur, loop: true });
    if (it) it.drawable.z = z - 50; // 바닥처럼 인물 뒤에
  }

  telegraph(x, z, radius, delay, color = 0xff4020) { return this.decal(1, x, z, radius, color, delay); }
  lane(x1, z1, x2, z2, width, delay, color = 0xff4020) {
    return this.decal(6, x1, z1, 1, color, delay, { angle: Math.atan2(x2 - x1, z2 - z1), len: Math.hypot(x2 - x1, z2 - z1), width });
  }
  scorch(x, z, radius) { this.decal(5, x, z, radius, 0x050302, 4); }

  pillar(x, z, color = 0xffd060, dur = 1.2, h = 8, w = 1.4) {
    this.items.push({ kind: 'beam', x, z, color, dur, t: 0, h: Math.min(h, 6), w });
    this.circle(x, z, w * 1.4, color, dur);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * 6.28, r = Math.random() * w;
      this.add.add({ x: x + Math.cos(a) * r, y: Math.random() * 1.5, z: z + Math.sin(a) * r, vy: 2 + Math.random() * 3, color, size: 0.35, size1: 0.1, life: dur * (0.6 + Math.random() * 0.5), cell: i % 2 ? 'spark' : 'dot' });
    }
  }

  lightning(points, color = 0x9fd0ff) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], pts = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8, j = k === 0 || k === 8 ? 0 : 0.6;
        pts.push({ x: a.x + (b.x - a.x) * t + (Math.random() - 0.5) * j, y: 1.2 + (Math.random() - 0.5) * j, z: a.z + (b.z - a.z) * t + (Math.random() - 0.5) * j });
      }
      this.items.push({ kind: 'bolt', pts, color, dur: 0.3, t: 0 });
    }
    for (const p of points.slice(1)) { this.play('thunderstrike', p.x, p.z, { scale: 0.8 }); this.burst(p.x, 1.2, p.z, color, 6, 3, 0.3); }
  }

  meteor(x, z, radius, delay, onHit) {
    this.telegraph(x, z, radius, delay, 0xff4010);
    this.items.push({ kind: 'meteor', x, z, radius, dur: delay, t: 0, onHit });
  }

  // 투사체: 불 → 화염구, 얼음 → 얼음 창, 화살 → 화살, 그 밖은 빛 덩이
  projectile({ from, target, color = 0xff8a30, size = 0.8, speed = 22, onHit, bolt = false, trail = true }) {
    const kind = flavor(color);
    const sprite = bolt ? 'arrows' : kind === 'fire' ? 'fireball' : kind === 'ice' ? 'icicle' : size > 1.2 ? 'plasmaball' : null;
    const it = { kind: 'proj', x: from.x, y: from.y ?? 1.4, z: from.z, target, speed, onHit, color, trail, size, bolt, flavor: kind, t: 0, dur: 99,
      last: target.pos ? target.pos.clone() : new THREE.Vector3(target.x, 0, target.z), sprite, def: sprite && DATA.powers[sprite] };
    if (it.def) {
      image(animImage(it.def, 'power'));
      it.drawable = { z: it.z, draw: (ctx, st) => {
        const a = it.def.anims.power || Object.values(it.def.anims)[0];
        const path = animImage(it.def, 'power'), src = image(path).ok && image(path).im;
        if (!src) return;
        const p = st.toScreen(it.x, it.z, it.y);
        const rects = a.f[it.dirI] || a.f[0];
        ctx.globalCompositeOperation = bolt ? 'source-over' : 'lighter';
        drawRect(ctx, src, rects?.[frameIndex(a, it.t)], p.x, p.y + 30 * st.scale(), st.scale() * (bolt ? 0.9 : Math.max(0.7, size * 0.8)));
        ctx.globalCompositeOperation = 'source-over';
      } };
      this.stage.add(it.drawable);
    }
    this.items.push(it);
  }

  text(pos, str, cls = '') {
    const el = document.createElement('div');
    el.className = 'dmg ' + cls;
    el.textContent = str;
    this.layer.appendChild(el);
    this.texts.push({ el, x: pos.x, y: pos.y, z: pos.z, t: 0, dx: (Math.random() - 0.5) * 30 });
  }

  update(dt) {
    this.time += dt;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      let done = it.t >= it.dur;
      if (it.kind === 'proj') {
        const tp = it.target.pos && !it.target.dead ? it.target.pos : it.last;
        if (it.target.pos && !it.target.dead) it.last.copy(it.target.pos);
        const tx = tp.x - it.x, ty = (tp.y ?? 0) + 1.1 - it.y, tz = tp.z - it.z;
        const d = Math.hypot(tx, ty, tz), step = it.speed * dt;
        it.dirI = dirIndex(tx * PX, tz * PZ - ty * PY);
        if (d <= step || it.t > 3) {
          done = true;
          this.hit(it.x, it.y, it.z, it.color, false);
          if (it.flavor === 'fire' && !it.bolt) this.play('blast', it.x, it.z, { scale: 0.7 });
          it.onHit?.(it.target);
        } else {
          it.x += (tx / d) * step; it.y += (ty / d) * step; it.z += (tz / d) * step;
          if (it.drawable) it.drawable.z = it.z;
          if (!it.def) {
            this.add.add({ x: it.x, y: it.y, z: it.z, color: 0xffffff, size: it.size * 0.7, size1: it.size * 0.4, life: 0.06, cell: 'glow' });
            this.add.add({ x: it.x, y: it.y, z: it.z, color: it.color, size: it.size * 1.8, size1: it.size * 1.2, life: 0.08, cell: 'glow', alpha: 0.9 });
          }
          if (it.trail && Math.random() < 0.8) {
            const cell = it.flavor === 'fire' ? 'flame' : it.flavor === 'ice' ? 'flake' : it.bolt ? 'dot' : 'spark';
            this.add.add({ x: it.x, y: it.y, z: it.z, vy: it.flavor === 'fire' ? 1 : 0.2, color: it.color, size: it.bolt ? 0.25 : it.size * 0.8, size1: 0.05, life: it.bolt ? 0.15 : 0.3, cell, spin: 4 });
          }
        }
      } else if (it.kind === 'meteor') {
        const q = Math.min(1, it.t / it.dur);
        const x = it.x - 6 * (1 - q), y = 14 * (1 - q) + 0.5, z = it.z - 3 * (1 - q);
        for (let n = 0; n < 3; n++) this.add.add({ x, y, z, vx: Math.random() - 0.5, vy: 1, vz: Math.random() - 0.5, color: n ? 0xff6a20 : 0xffd080, size: 1.6, size1: 0.3, life: 0.4, cell: 'flame', spin: 3 });
        this.add.add({ x, y, z, color: 0xffa040, size: 2.6, size1: 2, life: 0.06, cell: 'glow' });
        this.smoke.add({ x, y, z, vy: 0.5, color: 0x221a18, size: 1.4, size1: 3, life: 1, cell: 'smoke', alpha: 0.5 });
        if (q >= 1) {
          const r = it.radius;
          this.play('blast', it.x, it.z, { scale: 1.6 });
          { const q = this.play('quake', it.x, it.z, { scale: 1.5 }); if (q) q.add = false; }
          this.burst(it.x, 0.6, it.z, 0xff6020, 26, 9, 0.6);
          this.ring(it.x, it.z, r * 1.3, 0xff8030, 0.55);
          this.scorch(it.x, it.z, r * 0.9);
          this.shake(0.5);
          it.onHit?.();
        }
      }
      if (done) {
        if (it.drawable) this.stage.remove(it.drawable);
        this.items.splice(i, 1);
      }
    }
    this.add.update(dt);
    this.smoke.update(dt);
    // 떠오르는 숫자
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt;
      if (t.t > 0.9) { t.el.remove(); this.texts.splice(i, 1); continue; }
      const s = this.stage.toScreen(t.x, t.z, t.y);
      t.el.style.transform = `translate(${s.x + t.dx * t.t}px, ${s.y - 40 * t.t - 10}px) translate(-50%, -50%) scale(${t.t < 0.12 ? 1.4 - t.t * 3 : 1})`;
      t.el.style.opacity = String(Math.min(1, (0.9 - t.t) * 3));
    }
    while (this.texts.length > 40) { const t = this.texts.shift(); t.el.remove(); }
  }
}
