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
  else if (kind === 'spark') { g.fillStyle = rad(20, [[0, '#fff'], [0.35, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-32, -32, 64, 64); }
  else if (kind === 'flame') { g.fillStyle = rad(24, [[0, '#fff'], [0.4, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]); g.save(); g.scale(0.7, 1.2); g.fillRect(-46, -27, 92, 54); g.restore(); }
  else if (kind === 'smoke') {
    for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, r = Math.random() * 12, s = 10 + Math.random() * 10; g.fillStyle = rad(s, [[0, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]); g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r); g.fillRect(-s, -s, s * 2, s * 2); g.restore(); }
  } else { g.fillStyle = rad(12, [[0, '#fff'], [0.6, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-32, -32, 64, 64); } // dot · shard · flake: 부드러운 빛 알갱이
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

// 효과 그림 한 장면을 바로 그린다 (땅 표시 · 바닥 아이템 빛처럼 계속 붙어 있는 것)
export function drawPowerFrame(ctx, st, name, x, z, { scale = 1, tint = null, t = 0, alpha = 1, y = 0, add = true } = {}) {
  const def = DATA.powers?.[name];
  if (!def) return;
  const a = def.anims.power || Object.values(def.anims)[0], path = animImage(def, 'power');
  const src = tint != null ? tinted(path, tint) : image(path).ok && image(path).im;
  if (!src) return;
  const p = st.toScreen(x, z, y);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = add ? 'lighter' : 'source-over';
  drawRect(ctx, src, a.f[0]?.[frameIndex(a, t)], p.x, p.y, st.scale() * scale);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
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
  play(name, x, z, { y = 0, scale = 1, dur = null, loop = false, dir = 0, alpha = 1, tint = null, fade = false } = {}) {
    const def = DATA.powers?.[name];
    if (!def) return null;
    const anim = def.anims.power || Object.values(def.anims)[0];
    const it = { kind: 'power', def, anim, x, z, y, scale, dir, alpha, tint, fade, t: 0, dur: dur ?? anim.dur / 1000, loop };
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
    const rects = a.f[it.dir] || a.f[0];  // 방향이 셋 · 하나뿐인 그림도 있다
    const fi = it.loop ? frameIndex(a, it.t) : Math.min(a.frames - 1, Math.floor((it.t / it.dur) * a.frames));
    const p = st.toScreen(it.x, it.z, it.y);
    ctx.globalAlpha = it.alpha * (it.fade ? Math.max(0, 1 - it.t / it.dur) : 1);
    ctx.globalCompositeOperation = it.add === false ? 'source-over' : 'lighter';
    drawRect(ctx, src, rects?.[fi], p.x, p.y, st.scale() * it.scale);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // 바닥 효과 (예전 도형 판 대신 Flare 효과 그림으로). mode: 0 충격파 · 1 예고판 · 2 부채꼴 · 4 검기 · 5 그을음 · 6 직선 예고판
  decal(mode, x, z, radius, color, dur, o = {}) {
    if (mode === 0) return this.shock(x, z, radius, color, dur);
    if (mode === 1) return this.telegraph(x, z, radius, dur, color);
    if (mode === 2) return this.cone(x, z, o.angle || 0, radius, color, o.spread);
    if (mode === 4) return this.slash(x, z, o.angle || 0, color, radius, { all: (o.spread || 0) > 6 });
    if (mode === 5) return this.scorch(x, z, radius);
    if (mode === 6) return this.lane(x, z, x + Math.sin(o.angle || 0) * (o.len || 4), z + Math.cos(o.angle || 0) * (o.len || 4), o.width || 2, dur, color);
    return null;
  }
  // 바닥에 그리는 효과 그림 (사람 뒤에)
  ground(name, x, z, opts = {}) { const it = this.play(name, x, z, opts); if (it) it.drawable.z = z - 50; return it; }
  // 충격파: 큰 것은 흙먼지 고리(quake), 불은 폭발(blast), 그 밖은 빛 알갱이 고리(shield)
  shock(x, z, r, color = 0xffaa40, dur = 0.45) {
    const kind = flavor(color);
    if (r >= 2.5) { const q = this.ground('quake', x, z, { scale: Math.min(1.8, r / 3), dur: Math.max(0.35, dur) }); if (q) q.add = false; }
    if (kind === 'fire') return this.play('blast', x, z, { scale: Math.min(1.6, r / 3), dur: Math.max(0.35, dur) });
    return this.ground(kind === 'nature' ? 'shield' : 'shield', x, z, { scale: Math.min(2, r / 2.2), dur: Math.max(0.3, dur), tint: color, fade: true });
  }
  // 땅에 그리는 것: 적 공격 예고(도형)만
  drawGround(ctx, st) {
    const k = st.scale();
    for (const it of this.items) {
      if (it.kind !== 'warn') continue;
      const q = Math.min(1, it.t / it.dur);
      ctx.globalCompositeOperation = 'source-over';
      if (it.shape === 'circle') {
        if (!st.onScreen(it.x, it.z, it.r + 4)) continue;
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 14);
        ctx.globalAlpha = 0.2 + 0.08 * pulse; ctx.fillStyle = hex(it.color); ellipse(ctx, st, it.x, it.z, it.r); ctx.fill();
        ctx.globalAlpha = 0.45; ellipse(ctx, st, it.x, it.z, it.r * q); ctx.fill();
        ctx.globalAlpha = 0.95; ctx.strokeStyle = hex(it.color); ctx.lineWidth = 3 * k; ellipse(ctx, st, it.x, it.z, it.r); ctx.stroke();
        ctx.globalAlpha = 0.8; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * k; ellipse(ctx, st, it.x, it.z, it.r * q); ctx.stroke();
      } else {
        const ux = Math.sin(it.angle), uz = Math.cos(it.angle), w = it.width / 2;
        const pt = (a, b) => st.toScreen(it.x + ux * a - uz * b, it.z + uz * a + ux * b);
        const path = (L) => { const ps = [pt(0, -w), pt(L, -w), pt(L, w), pt(0, w)]; ctx.beginPath(); ps.forEach((s2, i) => (i ? ctx.lineTo(s2.x, s2.y) : ctx.moveTo(s2.x, s2.y))); ctx.closePath(); };
        ctx.fillStyle = hex(it.color);
        ctx.globalAlpha = 0.22; path(it.len); ctx.fill();
        ctx.globalAlpha = 0.45; path(it.len * q); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.strokeStyle = hex(it.color); ctx.lineWidth = 2.5 * k; path(it.len); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawTop() {}

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

  // 부채꼴: 불은 불덩이 · 불씨가 퍼지고, 그 밖은 휘두른 검기(cleave) 그림
  cone(x, z, angle, radius, color, spread = 1.5) {
    const kind = flavor(color);
    for (let i = 0; i < 26; i++) {
      const a = angle + (Math.random() - 0.5) * spread, sp = radius * (1.2 + Math.random());
      this.add.add({ x, y: 0.6, z, vx: Math.sin(a) * sp, vy: Math.random() * 1.5, vz: Math.cos(a) * sp, color: i % 4 ? color : 0xffffff, size: 0.9, size1: 1.6, life: 0.45, cell: kind === 'fire' ? 'flame' : 'spark', drag: 2.2 });
    }
    if (kind === 'fire') { for (let i = 1; i <= 3; i++) { const a = angle + (i - 2) * spread * 0.3; this.play('blast', x + Math.sin(a) * radius * i / 4, z + Math.cos(a) * radius * i / 4, { scale: 0.3 + i * 0.08, dur: 0.5 }); } }
    else this.slash(x, z, angle, color, radius * 0.8);
  }

  // 검기: Flare 「cleave」 그림을 휘두른 방향으로 (all이면 사방으로)
  slash(x, z, angle, color = 0xfff0d0, radius = 2.2, { all = false, y = 1 } = {}) {
    const angs = all ? [0, 1, 2, 3].map((i) => angle + (i * Math.PI) / 2) : [angle];
    const white = flavor(color) === 'light' && new THREE.Color(color).getHSL({}).l > 0.85;
    for (const a of angs) {
      const dir = dirIndex(Math.sin(a) * PX, Math.cos(a) * PZ);
      this.play('cleave', x + Math.sin(a) * 0.6, z + Math.cos(a) * 0.6, { y: 0, scale: Math.max(0.7, radius / 2.2), dir, tint: white ? null : color });
    }
    const n = all ? 14 : 7;
    for (let i = 0; i < n; i++) {
      const a = angle + (all ? (i / n) * Math.PI * 2 : (i / (n - 1) - 0.5) * 2.4);
      this.add.add({ x: x + Math.sin(a) * radius, y, z: z + Math.cos(a) * radius, vx: Math.sin(a) * 2.5, vy: 0.6, vz: Math.cos(a) * 2.5, color: i % 3 ? color : 0xffffff, size: 0.45, size1: 0.05, life: 0.3, cell: 'dot', drag: 3 });
    }
  }

  // 마법진: Flare 룬 (색에 맞춰)
  circle(x, z, radius, color, dur = 0.9) {
    const kind = flavor(color);
    const name = kind === 'fire' ? 'runes_orange' : kind === 'ice' || kind === 'arcane' ? 'runes_blue' : 'runes';
    this.ground(name, x, z, { scale: radius / 1.6, dur, loop: true });
  }

  // 차원문(귀환 · 포탈): 빛무리(sparkle) · 소용돌이 바람(immunity) · 푸른 룬이 dur 동안 돈다 — 땅 건물 그림 없이
  portal(x, z, dur = 1.8) {
    this.ground('runes_blue', x, z, { scale: 1.1, dur, loop: true });
    this.play('immunity', x, z, { scale: 1.1, dur, loop: true, tint: 0x80b8ff });
    this.play('sparkle', x, z, { scale: 1.2, dur, loop: true, tint: 0xa8d8ff });
    for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, r = Math.random() * 1.2; this.add.add({ x: x + Math.cos(a) * r, y: 0.2, z: z + Math.sin(a) * r, vy: 1.5 + Math.random() * 2, color: 0x9fd0ff, size: 0.4, size1: 0.05, life: dur * 0.7, cell: 'dot' }); }
    return { x, z };
  }

  // 도착: 소용돌이 바람 · 빛무리 · 빛 알갱이
  arrive(x, z, color = 0x80b0ff) {
    this.play('immunity', x, z, { scale: 1.3, dur: 0.8, tint: color });
    this.play('sparkle', x, z, { scale: 1.3, dur: 0.9, tint: color });
    this.ground('shield', x, z, { scale: 1.4, dur: 0.6, tint: color, fade: true });
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * 6.28;
      this.add.add({ x, y: 0.3, z, vx: Math.cos(a) * 4, vy: 1 + Math.random() * 3, vz: Math.sin(a) * 4, color: i % 3 ? color : 0xffffff, size: 0.45, size1: 0.05, life: 0.7, cell: 'dot', drag: 2.5 });
    }
    this.shake(0.2);
  }

  // 스킬 시전 섬광: 손에서 번쩍 + 둘레로 튀는 빛
  castFlash(x, z, color) {
    this.add.add({ x, y: 1.2, z, color: 0xffffff, size: 1.6, size1: 0.4, life: 0.18, cell: 'spark' });
    this.add.add({ x, y: 1.0, z, color, size: 3, size1: 4.5, life: 0.3, cell: 'glow', alpha: 0.7 });
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * 6.28;
      this.add.add({ x, y: 0.3, z, vx: Math.cos(a) * 3, vy: 2 + Math.random() * 3, vz: Math.sin(a) * 3, color, size: 0.4, size1: 0.05, life: 0.5, cell: i % 2 ? 'spark' : 'dot', drag: 2 });
    }
  }

  // 적 공격 예고: 한눈에 보여야 하므로 색칠한 도형(원 · 직선 띠)으로. 가운데부터 차오르면 맞는다
  telegraph(x, z, radius, delay, color = 0xff4020) { const it = { kind: 'warn', shape: 'circle', x, z, r: radius, color, dur: delay, t: 0 }; this.items.push(it); return it; }
  lane(x1, z1, x2, z2, width, delay, color = 0xff4020) {
    const it = { kind: 'warn', shape: 'lane', x: x1, z: z1, angle: Math.atan2(x2 - x1, z2 - z1), len: Math.hypot(x2 - x1, z2 - z1), width, color, dur: delay, t: 0 };
    this.items.push(it); return it;
  }
  // 그을음: 검은 연기
  scorch(x, z, radius) {
    for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28, r = Math.random() * radius * 0.6; this.smoke.add({ x: x + Math.cos(a) * r, y: 0.2, z: z + Math.sin(a) * r, vy: 0.3 + Math.random() * 0.4, color: 0x141010, size: 1.2, size1: 2.6, life: 1.6, cell: 'smoke', alpha: 0.5, drag: 1 }); }
  }

  // 빛기둥: 소용돌이 바람(immunity) + 빛무리, 색에 맞춰
  pillar(x, z, color = 0xffd060, dur = 1.2, h = 8, w = 1.4) {
    this.play('immunity', x, z, { scale: Math.max(0.8, w * 0.8), dur, tint: color });
    this.play(flavor(color) === 'nature' ? 'heal' : 'sparkle', x, z, { scale: Math.max(0.8, w * 0.8), dur, tint: flavor(color) === 'nature' ? null : color });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * 6.28, r = Math.random() * w;
      this.add.add({ x: x + Math.cos(a) * r, y: Math.random() * 1.5, z: z + Math.sin(a) * r, vy: 2 + Math.random() * 3, color, size: 0.35, size1: 0.1, life: dur * (0.6 + Math.random() * 0.5), cell: 'dot' });
    }
  }

  // 번개: 선을 긋지 않고 Flare 번개 그림을 이어 놓는다 (맞은 곳엔 낙뢰)
  lightning(points, color = 0x9fd0ff) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 2));
      for (let k = 1; k <= n; k++) { const t = k / (n + 1); this.play('lightning', a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, { y: 1.1, scale: 0.6, dur: 0.25 }); }
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
        // Flare 투사체 그림은 땅 기준점에서 손 높이만큼 위에 그려져 있다 → 땅 자리에 놓는다
        const p = st.toScreen(it.x, it.z, Math.max(0, it.y - 1.25));
        const rects = a.f[it.dirI] || a.f[0];
        ctx.globalCompositeOperation = bolt ? 'source-over' : 'lighter';
        drawRect(ctx, src, rects?.[frameIndex(a, it.t)], p.x, p.y, st.scale() * (bolt ? 0.9 : Math.max(0.7, size * 0.8)));
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
        it.dirI = dirIndex(tx * PX, tz * PZ);
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
