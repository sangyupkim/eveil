// 시각 효과: 입자(한 번에 그리기) · 바닥 효과(충격파 · 예고판 · 부채꼴 · 마법진 · 그을음) · 검기 · 번개 · 운석 · 빛기둥 · 떠오르는 숫자
// 그림은 모두 캔버스로 직접 그린 질감과 셰이더 — 외부 파일 없음
import * as THREE from 'three';
import { glowTexture } from '../engine/assets.js';

// ───────── 입자 그림 모음 (4×2 칸) ─────────
// 0 빛 · 1 별빛 불꽃 · 2 연기 · 3 불꽃 · 4 파편 · 5 작은 점 · 6 고리 · 7 눈꽃
const CELLS = { glow: 0, spark: 1, smoke: 2, flame: 3, shard: 4, dot: 5, ring: 6, flake: 7 };
let atlas = null;
function atlasTexture() {
  if (atlas) return atlas;
  const C = 128, c = document.createElement('canvas');
  c.width = C * 4; c.height = C * 2;
  const g = c.getContext('2d');
  const cell = (i, draw) => { g.save(); g.translate((i % 4) * C + C / 2, Math.floor(i / 4) * C + C / 2); draw(); g.restore(); };
  const radial = (r, stops) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); for (const [o, col] of stops) gr.addColorStop(o, col); return gr; };
  cell(0, () => { g.fillStyle = radial(62, [[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,255,255,0.75)'], [0.5, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-64, -64, 128, 128); });
  cell(1, () => {
    g.fillStyle = radial(40, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-64, -64, 128, 128);
    g.fillStyle = '#fff';
    for (const [w, h] of [[5, 62], [62, 5]]) { g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 0.5;
    for (const a of [Math.PI / 4, -Math.PI / 4]) { g.save(); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 3, 36, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  });
  cell(2, () => {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 6.28, r = Math.random() * 26, s = 18 + Math.random() * 22;
      g.fillStyle = radial(s, [[0, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']]);
      g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r); g.fillRect(-s, -s, s * 2, s * 2); g.restore();
    }
  });
  cell(3, () => {
    g.beginPath(); g.moveTo(0, -60); g.bezierCurveTo(30, -20, 40, 30, 0, 56); g.bezierCurveTo(-40, 30, -30, -20, 0, -60); g.closePath();
    const gr = g.createLinearGradient(0, -60, 0, 56);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gr; g.fill();
    // (합성 모드는 캔버스 전체를 지우므로 쓰지 않는다) 속을 한 번 더 밝게
    g.globalAlpha = 0.6; g.fillStyle = radial(30, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]); g.translate(0, 22); g.fillRect(-40, -40, 80, 80);
  });
  cell(4, () => {
    g.beginPath(); g.moveTo(0, -58); g.lineTo(16, 0); g.lineTo(0, 58); g.lineTo(-16, 0); g.closePath();
    const gr = g.createLinearGradient(-16, 0, 16, 0); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0.4)');
    g.fillStyle = gr; g.fill();
  });
  cell(5, () => { g.fillStyle = radial(22, [[0, '#fff'], [0.5, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-64, -64, 128, 128); });
  cell(6, () => { g.strokeStyle = '#fff'; g.lineWidth = 9; g.shadowColor = '#fff'; g.shadowBlur = 16; g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.stroke(); });
  cell(7, () => {
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 8;
    for (let k = 0; k < 6; k++) { g.save(); g.rotate((k / 6) * Math.PI * 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -50); g.moveTo(0, -28); g.lineTo(12, -40); g.moveTo(0, -28); g.lineTo(-12, -40); g.stroke(); g.restore(); }
  });
  atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.SRGBColorSpace;
  return atlas;
}

// ───────── 입자 장치: 수천 개를 한 번에 그린다 ─────────
class Particles {
  constructor(scene, max, blending) {
    this.max = max;
    this.n = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.siz = new Float32Array(max);
    this.alp = new Float32Array(max);
    this.cel = new Float32Array(max);
    this.rot = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.siz, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alp, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('cell', new THREE.BufferAttribute(this.cel, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.geo = g;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: atlasTexture() }, scale: { value: 600 } },
      vertexShader: `
        attribute float size; attribute float alpha; attribute float cell; attribute float rot;
        varying vec3 vCol; varying float vA; varying float vCell; varying float vRot;
        uniform float scale;
        void main() {
          vCol = color; vA = alpha; vCell = cell; vRot = rot;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec3 vCol; varying float vA; varying float vCell; varying float vRot;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float c = cos(vRot), s = sin(vRot);
          p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
          if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) discard;
          vec2 uv = vec2((mod(vCell, 4.0) + p.x) / 4.0, 1.0 - (floor(vCell / 4.0) + p.y) / 2.0);
          vec4 t = texture2D(map, uv);
          gl_FragColor = vec4(vCol * t.rgb, t.a * vA);
        }`,
      vertexColors: true, transparent: true, depthWrite: false, blending,
    });
    this.mat = mat;
    this.pts = new THREE.Points(g, mat);
    this.pts.frustumCulled = false;
    this.pts.renderOrder = blending === THREE.AdditiveBlending ? 3 : 2;
    scene.add(this.pts);
    // 움직임 (CPU 쪽)
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.dur = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.spin = new Float32Array(max);
  }

  // o: { x, y, z, vx, vy, vz, color, size, size1, alpha, life, cell, grav, drag, spin, rot }
  add(o) {
    let i = this.n;
    if (i >= this.max) i = Math.floor(Math.random() * this.max); // 꽉 차면 아무거나 덮는다
    else this.n++;
    const c = _col.set(o.color ?? 0xffffff);
    this.pos.set([o.x, o.y, o.z], i * 3);
    this.vel.set([o.vx || 0, o.vy || 0, o.vz || 0], i * 3);
    this.col.set([c.r, c.g, c.b], i * 3);
    this.s0[i] = o.size ?? 0.5; this.s1[i] = o.size1 ?? this.s0[i];
    this.a0[i] = o.alpha ?? 1;
    this.life[i] = 0; this.dur[i] = o.life ?? 0.5;
    this.cel[i] = CELLS[o.cell] ?? o.cell ?? 0;
    this.grav[i] = o.grav ?? 0; this.drag[i] = o.drag ?? 0;
    this.rot[i] = o.rot ?? Math.random() * 6.28; this.spin[i] = o.spin ?? 0;
  }

  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] += dt;
      const k = this.life[i] / this.dur[i];
      if (k >= 1) { this.kill(i); continue; }
      const j = i * 3, d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[j] *= d; this.vel[j + 1] = this.vel[j + 1] * d - this.grav[i] * dt; this.vel[j + 2] *= d;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      if (this.pos[j + 1] < 0.05 && this.grav[i] > 0) { this.pos[j + 1] = 0.05; this.vel[j + 1] *= -0.3; }
      this.siz[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k;
      this.alp[i] = this.a0[i] * (k < 0.1 ? k * 10 : 1 - (k - 0.1) / 0.9);
      this.rot[i] += this.spin[i] * dt;
      i++;
    }
    const g = this.geo;
    g.setDrawRange(0, this.n);
    for (const a of ['position', 'color', 'size', 'alpha', 'cell', 'rot']) g.attributes[a].needsUpdate = true;
  }

  // 마지막 것을 i 자리로 옮겨 지운다
  kill(i) {
    const l = --this.n;
    if (i === l) return;
    for (const [arr, w] of [[this.pos, 3], [this.vel, 3], [this.col, 3]]) for (let k = 0; k < w; k++) arr[i * w + k] = arr[l * w + k];
    for (const arr of [this.siz, this.alp, this.cel, this.rot, this.life, this.dur, this.s0, this.s1, this.a0, this.grav, this.drag, this.spin]) arr[i] = arr[l];
  }
}
const _col = new THREE.Color();

// ───────── 바닥 효과 셰이더 ─────────
// mode 0 충격파 · 1 예고판(차오름) · 2 부채꼴 불길 · 3 마법진 · 4 검기 궤적 · 5 그을음 · 6 직선 예고판
const groundVS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const groundFS = `
  uniform vec3 color; uniform float opacity; uniform float mode; uniform float fill; uniform float spread; uniform float time;
  varying vec2 vUv;
  // 거꾸로 준 경계(큰→작은)도 안전하게 (GLSL smoothstep은 e0 < e1만 정의돼 있다)
  float ss(float e0, float e1, float x) { return e0 < e1 ? smoothstep(e0, e1, x) : 1.0 - smoothstep(e1, e0, x); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.x, p.y);
    float al = 0.0;
    vec3 col = color;
    if (mode < 0.5) {            // 충격파: 퍼지는 띠 + 옅은 속
      float band = ss(0.16, 0.0, abs(r - fill));
      al = band * 1.2 + ss(fill, 0.0, r) * 0.18;
      col = mix(color, vec3(1.0), band * 0.5);
    } else if (mode < 1.5) {     // 예고판: 테두리 + 안쪽이 가운데부터 차오름 + 빗금
      float edge = ss(0.08, 0.0, abs(r - 0.96)) * 0.95;
      float inside = step(r, 0.98);
      float filled = step(r, fill * 0.98);
      float hatch = 0.5 + 0.5 * sin((p.x + p.y) * 22.0 - time * 6.0);
      al = edge + inside * (0.14 + 0.1 * hatch) + filled * 0.32 + ss(0.05, 0.0, abs(r - fill * 0.98)) * 0.6;
      col = mix(color, vec3(1.0, 0.95, 0.85), edge * 0.4);
    } else if (mode < 2.5) {     // 부채꼴 불길
      float inA = ss(spread * 0.5, spread * 0.5 - 0.15, abs(a));
      float n = hash(floor(p * 10.0 + time * 3.0));
      float front = ss(fill + 0.1, fill - 0.25, r) * ss(0.0, 0.15, r);
      al = inA * front * (0.55 + 0.45 * n) * step(r, 1.0);
      col = mix(color, vec3(1.0, 0.95, 0.7), (1.0 - r) * 0.7);
    } else if (mode < 3.5) {     // 마법진: 두 겹 고리 + 룬 눈금 + 별 모양
      float ring1 = ss(0.03, 0.0, abs(r - 0.94));
      float ring2 = ss(0.02, 0.0, abs(r - 0.78));
      float ticks = step(0.8, r) * step(r, 0.92) * step(0.6, abs(sin((a + time * 0.6) * 18.0)));
      float star = 0.0;
      for (int k = 0; k < 6; k++) {
        float ang = float(k) * 1.0472 - time * 0.4;
        vec2 d = vec2(sin(ang), cos(ang));
        float l = abs(dot(p, vec2(d.y, -d.x)) - 0.39);
        star += ss(0.018, 0.0, l) * step(r, 0.79);
      }
      al = (ring1 + ring2 + ticks * 0.7 + min(star, 1.0) * 0.8) + ss(0.95, 0.0, r) * 0.08;
    } else if (mode < 4.5) {     // 검기: 호를 따라 머리가 밝고 꼬리가 사라짐
      float aa = (a + spread * 0.5) / spread;             // 0 → 1 호 위치
      float head = fill;                                   // 머리 위치
      float tail = clamp(1.0 - (head - aa) / 0.95, 0.0, 1.0) * step(aa, head);
      float w = 0.1 + 0.2 * tail;                           // 머리 쪽이 두껍다
      float d = abs(r - 0.78);
      float band = ss(w, 0.0, d) * step(0.0, aa) * step(aa, 1.0);
      float core = ss(w * 0.35, 0.0, d) * step(0.0, aa) * step(aa, 1.0);
      al = tail * (band * 1.1 + core * 1.2);
      col = mix(color, vec3(1.0), clamp(core * tail * 1.2, 0.0, 1.0));
    } else if (mode < 5.5) {     // 그을음
      float n = hash(floor(p * 6.0));
      al = ss(1.0, 0.2, r) * (0.55 + 0.25 * n);
    } else {                     // 직선 예고판 (y가 길이 방향)
      float edge = ss(0.06, 0.0, abs(abs(p.x) - 0.94));
      float fillv = step(vUv.y, fill);
      float hatch = 0.5 + 0.5 * sin((p.x + vUv.y * 6.0) * 10.0 - time * 6.0);
      al = edge * 0.9 + 0.15 + 0.1 * hatch + fillv * 0.3;
    }
    gl_FragColor = vec4(col, al * opacity);
  }`;
const planeGeo = new THREE.PlaneGeometry(2, 2);
function groundMat(mode, color, { additive = true, spread = 1.2 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: 1 }, mode: { value: mode }, fill: { value: 0 }, spread: { value: spread }, time: { value: 0 } },
    vertexShader: groundVS, fragmentShader: groundFS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

// 빛기둥 셰이더: 위로 갈수록 옅고, 줄무늬가 위로 흐른다
const beamMat = (color) => new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: 0 }, time: { value: 0 } },
  vertexShader: groundVS,
  fragmentShader: `uniform vec3 color; uniform float opacity; uniform float time; varying vec2 vUv;
    void main() {
      float fade = pow(1.0 - vUv.y, 1.6);
      float stripe = 0.6 + 0.4 * sin(vUv.x * 40.0 + vUv.y * 8.0 - time * 10.0);
      float edge = 0.5 + 0.5 * cos(vUv.x * 6.2832 * 2.0);
      gl_FragColor = vec4(mix(color, vec3(1.0), fade * 0.4), fade * stripe * opacity * (0.6 + 0.4 * edge));
    }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
});

const beamGeo = new THREE.CylinderGeometry(1, 0.7, 1, 24, 1, true).translate(0, 0.5, 0);
const arrowGeo = (() => {
  const shaft = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5).rotateX(Math.PI / 2);
  const tip = new THREE.ConeGeometry(0.08, 0.22, 5).rotateX(Math.PI / 2).translate(0, 0, 0.55);
  const g = new THREE.BufferGeometry();
  const merge = (geos) => {
    let pos = [], idx = [], off = 0;
    for (const x of geos) { const p = x.attributes.position.array; pos.push(...p); idx.push(...x.index.array.map((v) => v + off)); off += p.length / 3; }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  };
  merge([shaft, tip]);
  return g;
})();
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xe8dcc0 });
const rockGeo = new THREE.IcosahedronGeometry(1, 0);
const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a2018, emissive: 0xff4a10, emissiveIntensity: 0.9, roughness: 0.8, flatShading: true });

// 색 이름 → 입자 모양 고르기 (불 · 얼음 · 번개 · 그 밖)
function flavor(color) {
  const c = new THREE.Color(color);
  const hsl = {}; c.getHSL(hsl);
  if (hsl.h < 0.12 || hsl.h > 0.95) return 'fire';
  if (hsl.h > 0.5 && hsl.h < 0.62 && hsl.l > 0.55) return 'ice';
  if (hsl.h > 0.55 && hsl.h < 0.75) return 'arcane';
  if (hsl.h > 0.2 && hsl.h < 0.45) return 'nature';
  return 'light';
}

export class FX {
  constructor(scene, camera, layer) {
    this.scene = scene;
    this.camera = camera;
    this.layer = layer; // 떠오르는 숫자를 그릴 DOM
    this.items = [];
    this.texts = [];
    this.v = new THREE.Vector3();
    this.time = 0;
    this.add = new Particles(scene, 4000, THREE.AdditiveBlending);   // 빛 · 불꽃
    this.smoke = new Particles(scene, 1200, THREE.NormalBlending);   // 연기 · 흙먼지
    this.onShake = null;                                              // (세기) → 화면 흔들기
  }

  shake(k) { this.onShake?.(k); }

  sprite(color, size, opacity = 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    s.scale.setScalar(size);
    return s;
  }

  // 바닥에 까는 판 하나
  decal(mode, x, z, radius, color, dur, { y = 0.07, additive = true, spread = 1.2, rot = 0, sx = null, sz = null, grow = false, fill = null, tilt = 0 } = {}) {
    const m = new THREE.Mesh(planeGeo, groundMat(mode, color, { additive, spread }));
    m.rotation.x = -Math.PI / 2 + tilt;
    m.rotation.z = rot;
    m.position.set(x, y, z);
    m.scale.set(sx ?? radius, sz ?? radius, 1);
    m.renderOrder = 1;
    this.scene.add(m);
    const it = { kind: 'decal', obj: m, dur, t: 0, mode, grow, fill };
    this.items.push(it);
    return it;
  }

  // ───── 자주 쓰는 묶음 ─────

  // 터짐: 빛 + 불꽃 튐 (색에 따라 불 · 얼음 · 마법 모양이 다르다)
  burst(x, y, z, color = 0xffc070, n = 8, spread = 3, size = 0.35) {
    const kind = flavor(color);
    const big = size * 2.6;
    this.add.add({ x, y, z, color, size: big * 1.6, size1: big * 2.4, life: 0.22, cell: 'glow', alpha: 0.9 });
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, sp = spread * (0.4 + Math.random() * 0.8);
      const cell = kind === 'ice' ? (i % 2 ? 'shard' : 'flake') : kind === 'fire' ? (i % 3 ? 'flame' : 'spark') : i % 2 ? 'spark' : 'dot';
      this.add.add({
        x, y, z, vx: Math.cos(a) * sp, vy: Math.random() * spread * 1.1 + 0.5, vz: Math.sin(a) * sp,
        color: i % 3 ? color : 0xffffff, size: big * (0.5 + Math.random() * 0.6), size1: big * 0.1, life: 0.35 + Math.random() * 0.35,
        cell, grav: kind === 'fire' ? -1 : 7, drag: 2.5, spin: (Math.random() - 0.5) * 8,
      });
    }
    if (kind === 'fire' && n > 6) for (let i = 0; i < n / 3; i++) this.smoke.add({ x, y, z, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random(), vz: (Math.random() - 0.5) * 2, color: 0x6a5a50, size: big * 1.2, size1: big * 2.6, life: 0.8, cell: 'smoke', alpha: 0.28, drag: 1.5 });
  }

  // 맞았을 때: 번쩍 + 튀는 불꽃 + 치명이면 십자 빛
  hit(x, y, z, color = 0xffa060, crit = false) {
    this.add.add({ x, y, z, color: 0xffffff, size: crit ? 2.6 : 1.4, size1: crit ? 0.4 : 0.2, life: crit ? 0.25 : 0.14, cell: 'spark', rot: Math.random() * 0.8 });
    this.burst(x, y, z, color, crit ? 14 : 6, crit ? 5 : 3, crit ? 0.4 : 0.28);
    if (crit) { this.decal(0, x, z, 2.2, color, 0.3); this.shake(0.12); }
  }

  // 충격파: 퍼지는 고리 + 흙먼지
  ring(x, z, radius, color = 0xffaa40, dur = 0.45, y = 0.08) {
    this.decal(0, x, z, radius, color, dur, { y, grow: true });
    const n = Math.min(28, Math.round(radius * 4));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28, r = radius * 0.4;
      this.add.add({ x: x + Math.cos(a) * r, y: y + 0.2, z: z + Math.sin(a) * r, vx: Math.cos(a) * radius * 2, vy: 0.4, vz: Math.sin(a) * radius * 2, color, size: 0.6, size1: 0.1, life: dur, cell: 'spark', drag: 3 });
    }
    if (radius > 2.5) for (let i = 0; i < n / 2; i++) {
      const a = Math.random() * 6.28;
      this.smoke.add({ x: x + Math.cos(a) * radius * 0.5, y: 0.3, z: z + Math.sin(a) * radius * 0.5, vx: Math.cos(a) * radius, vy: 0.5, vz: Math.sin(a) * radius, color: 0x9a8670, size: 1.4, size1: 3, life: 0.7, cell: 'smoke', alpha: 0.22, drag: 2.5 });
    }
  }

  // 부채꼴 불길 (대지 가르기 · 화염 파도)
  cone(x, z, angle, radius, color, spread = 1.5) {
    this.decal(2, x, z, radius, color, 0.55, { rot: angle - Math.PI, spread, grow: 'fill' });
    const kind = flavor(color);
    for (let i = 0; i < 30; i++) {
      const a = angle + (Math.random() - 0.5) * spread, sp = radius * (1.2 + Math.random());
      this.add.add({ x, y: 0.6, z, vx: Math.sin(a) * sp, vy: Math.random() * 1.5, vz: Math.cos(a) * sp, color: i % 4 ? color : 0xffffff, size: 1.1, size1: 2, life: 0.45, cell: kind === 'fire' ? 'flame' : 'spark', drag: 2.2 });
    }
  }

  // 검기: 앞쪽에 호를 그리며 지나가는 빛 (all이면 한 바퀴)
  slash(x, z, angle, color = 0xfff0d0, radius = 2.2, { all = false, y = 1.05, dur = 0.24, tilt = 0.25 } = {}) {
    const spread = all ? Math.PI * 2 : 2.4;
    this.decal(4, x, z, radius, color, dur * 1.4, { y, rot: angle - Math.PI, spread, grow: 'sweep', tilt });
    // 호를 따라 튀는 불꽃
    const n = all ? 22 : 10;
    for (let i = 0; i < n; i++) {
      const a = angle + (all ? (i / n) * Math.PI * 2 : (i / (n - 1) - 0.5) * spread), r = radius * 0.78;
      this.add.add({ x: x + Math.sin(a) * r, y: y + Math.sin(a - angle) * tilt * r * 0.4, z: z + Math.cos(a) * r, vx: Math.sin(a) * 2.5, vy: 0.6, vz: Math.cos(a) * 2.5,
        color: i % 3 ? color : 0xffffff, size: 0.5, size1: 0.05, life: 0.28 + (i / n) * 0.12, cell: i % 2 ? 'spark' : 'dot', drag: 3 });
    }
  }

  // 마법진 (주문 · 버프)
  circle(x, z, radius, color, dur = 0.9) {
    this.decal(3, x, z, radius, color, dur, { y: 0.06 });
  }

  // 예고판: delay 동안 가운데부터 차오르고 끝나면 사라진다
  telegraph(x, z, radius, delay, color = 0xff4020) {
    return this.decal(1, x, z, radius, color, delay, { y: 0.05, grow: 'telegraph' });
  }

  // 직선 예고판 (돌진 경로)
  lane(x1, z1, x2, z2, width, delay, color = 0xff4020) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    return this.decal(6, (x1 + x2) / 2, (z1 + z2) / 2, 1, color, delay, { y: 0.05, sx: width / 2, sz: len / 2, rot: Math.atan2(x2 - x1, z2 - z1) + Math.PI, grow: 'telegraph' });
  }

  scorch(x, z, radius) { this.decal(5, x, z, radius, 0x050302, 4, { y: 0.04, additive: false }); }

  // 투사체: 빛 덩이 + 꼬리 (화살은 화살 모양)
  projectile({ from, target, color = 0xff8a30, size = 0.8, speed = 22, onHit, bolt = false, trail = true }) {
    const g = new THREE.Group();
    if (bolt) {
      const m = new THREE.Mesh(arrowGeo, arrowMat);
      m.scale.setScalar(Math.max(1, size));
      g.add(m);
    }
    g.position.set(from.x, from.y ?? 1.4, from.z);
    this.scene.add(g);
    this.items.push({
      kind: 'proj', obj: g, target, speed, onHit, color, trail, t: 0, bolt, size, flavor: flavor(color),
      last: target.pos ? target.pos.clone() : new THREE.Vector3(target.x, 0, target.z),
    });
  }

  // 빛기둥: 줄무늬가 흐르는 원통 + 오르는 빛 알갱이
  pillar(x, z, color = 0xffd060, dur = 1.2, h = 8, w = 1.4) {
    const m = new THREE.Mesh(beamGeo, beamMat(color));
    m.scale.set(w, h, w);
    m.position.set(x, 0, z);
    this.scene.add(m);
    this.items.push({ kind: 'beam', obj: m, dur, t: 0 });
    this.circle(x, z, w * 1.6, color, dur);
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * 6.28, r = Math.random() * w;
      this.add.add({ x: x + Math.cos(a) * r, y: Math.random() * 1.5, z: z + Math.sin(a) * r, vy: 2 + Math.random() * 4, color, size: 0.4, size1: 0.1, life: dur * (0.6 + Math.random() * 0.5), cell: i % 2 ? 'spark' : 'dot' });
    }
  }

  // 번개: 굵은 빛 줄기 두 겹 + 이음매마다 빛
  lightning(points, color = 0x9fd0ff) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8, j = k === 0 || k === 8 ? 0 : 0.7;
        pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t + (Math.random() - 0.5) * j, 1.3 + (Math.random() - 0.5) * j, a.z + (b.z - a.z) * t + (Math.random() - 0.5) * j));
      }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
      for (const [r, op, c] of [[0.05, 1, 0xffffff], [0.18, 0.5, color]]) {
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 5), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
        this.scene.add(m);
        this.items.push({ kind: 'flicker', obj: m, dur: 0.32, t: 0, base: op });
      }
    }
    for (const p of points.slice(1)) { this.burst(p.x, 1.3, p.z, color, 7, 3, 0.35); this.decal(0, p.x, p.z, 1.6, color, 0.3, { grow: true }); }
  }

  // 운석: 예고판 → 불타는 바위가 꼬리를 끌고 떨어짐 → 충격파 · 파편 · 연기 · 그을음 · 흔들림
  meteor(x, z, radius, delay, onHit) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.scale.setScalar(0.9);
    rock.position.set(x - 6, 18, z - 3);
    this.scene.add(rock);
    this.telegraph(x, z, radius, delay, 0xff4010);
    this.items.push({ kind: 'meteor', obj: rock, x, z, dur: delay, t: 0, onHit, radius, keepGeo: true });
  }

  text(pos, str, cls = '') {
    const el = document.createElement('div');
    el.className = 'dmg ' + cls;
    el.textContent = str;
    this.layer.appendChild(el);
    this.texts.push({ el, pos: pos.clone ? pos.clone() : new THREE.Vector3(pos.x, pos.y, pos.z), t: 0, dx: (Math.random() - 0.5) * 30 });
  }

  update(dt) {
    this.time += dt;
    // 입자 크기 → 화면 픽셀 (화면 높이 · 시야각에 맞춘다)
    const ph = (this.renderer ? this.renderer.domElement.height : window.innerHeight);
    const sc = ph / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    this.add.mat.uniforms.scale.value = sc; this.smoke.mat.uniforms.scale.value = sc;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      let done = false;
      if (it.kind === 'proj') {
        const tp = it.target.pos && !it.target.dead ? it.target.pos : it.last;
        if (it.target.pos && !it.target.dead) it.last.copy(it.target.pos);
        const to = this.v.set(tp.x - it.obj.position.x, (tp.y ?? 0) + 1.2 - it.obj.position.y, tp.z - it.obj.position.z);
        const d = to.length();
        const step = it.speed * dt;
        it.obj.lookAt(tp.x, it.obj.position.y, tp.z);
        if (d <= step || it.t > 3) {
          done = true;
          const p = it.obj.position;
          this.hit(p.x, p.y, p.z, it.color, false);
          it.onHit?.(it.target);
        } else {
          it.obj.position.addScaledVector(to.normalize(), step);
          const p = it.obj.position, s = it.size;
          if (!it.bolt) {
            // 빛 덩이 머리 (매 프레임 새로 — 입자라 가볍다)
            this.add.add({ x: p.x, y: p.y, z: p.z, color: 0xffffff, size: s * 0.9, size1: s * 0.5, life: 0.06, cell: 'glow' });
            this.add.add({ x: p.x, y: p.y, z: p.z, color: it.color, size: s * 2.2, size1: s * 1.6, life: 0.08, cell: 'glow', alpha: 0.9 });
          }
          if (it.trail) {
            const cell = it.flavor === 'fire' ? 'flame' : it.flavor === 'ice' ? 'flake' : it.bolt ? 'dot' : 'spark';
            this.add.add({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.6, vy: it.flavor === 'fire' ? 1.2 : 0.2, vz: (Math.random() - 0.5) * 0.6,
              color: it.color, size: it.bolt ? 0.35 : s * 1.1, size1: 0.05, life: it.bolt ? 0.18 : 0.35, cell, spin: 4 });
            if (it.flavor === 'fire' && Math.random() < 0.35) this.smoke.add({ x: p.x, y: p.y, z: p.z, vy: 0.8, color: 0x2a2420, size: s * 1.2, size1: s * 2.4, life: 0.7, cell: 'smoke', alpha: 0.35 });
          }
        }
      } else if (it.kind === 'decal') {
        const k = Math.min(1, it.t / it.dur);
        const u = it.obj.material.uniforms;
        u.time.value = this.time;
        if (it.grow === true) { u.fill.value = 0.15 + 0.85 * Math.min(1, k * 1.4); u.opacity.value = 1 - k; }
        else if (it.grow === 'telegraph') { u.fill.value = k; u.opacity.value = k < 0.92 ? Math.min(1, it.t * 6) : (1 - k) / 0.08 * 1.6; }
        else if (it.grow === 'fill') { u.fill.value = 0.3 + k * 1.1; u.opacity.value = 1 - k * k; }
        else if (it.grow === 'sweep') { u.fill.value = 0.2 + Math.min(1.6, k * 2.6); u.opacity.value = 1 - Math.max(0, k - 0.55) / 0.45; }
        else if (it.mode === 3) { u.opacity.value = Math.min(1, it.t * 5) * (1 - Math.max(0, k - 0.6) / 0.4); it.obj.scale.setScalar(it.obj.scale.x); }
        else if (it.mode === 5) { u.opacity.value = 1 - k; }
        else u.opacity.value = 1 - k;
        done = k >= 1;
      } else if (it.kind === 'beam') {
        const k = it.t / it.dur;
        const u = it.obj.material.uniforms;
        u.time.value = this.time;
        u.opacity.value = Math.sin(Math.PI * Math.min(1, k)) * 0.9;
        done = k >= 1;
      } else if (it.kind === 'flicker') {
        it.obj.material.opacity = it.base * (1 - it.t / it.dur) * (0.6 + Math.random() * 0.4);
        done = it.t >= it.dur;
      } else if (it.kind === 'meteor') {
        const k = Math.min(1, it.t / it.dur);
        const p = it.obj.position;
        p.set(it.x - 6 * (1 - k), 18 * (1 - k) + 0.6, it.z - 3 * (1 - k));
        it.obj.rotation.x += dt * 4; it.obj.rotation.y += dt * 3;
        for (let n = 0; n < 3; n++) this.add.add({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5), vy: 1, vz: (Math.random() - 0.5), color: n ? 0xff6a20 : 0xffd080, size: 2, size1: 0.4, life: 0.4, cell: 'flame', spin: 3 });
        this.smoke.add({ x: p.x, y: p.y, z: p.z, vy: 0.5, color: 0x221a18, size: 1.6, size1: 3.5, life: 1, cell: 'smoke', alpha: 0.5 });
        if (k >= 1) {
          done = true;
          const r = it.radius;
          this.burst(it.x, 0.6, it.z, 0xff6020, 30, 10, 0.7);
          this.ring(it.x, it.z, r * 1.3, 0xff8030, 0.55);
          this.decal(0, it.x, it.z, r * 1.8, 0xffd080, 0.35, { grow: true });
          this.scorch(it.x, it.z, r * 0.9);
          for (let n = 0; n < 14; n++) { const a = Math.random() * 6.28; this.smoke.add({ x: it.x, y: 0.5, z: it.z, vx: Math.cos(a) * 4, vy: 2 + Math.random() * 2, vz: Math.sin(a) * 4, color: 0x2a2220, size: 2.5, size1: 5, life: 1.4, cell: 'smoke', alpha: 0.55, drag: 1.8 }); }
          this.shake(0.5);
          it.onHit?.();
        }
      }
      if (done) {
        this.scene.remove(it.obj);
        if (!it.keepGeo) it.obj.traverse?.((o) => { if (o.geometry && o.geometry !== planeGeo && o.geometry !== beamGeo && o.geometry !== arrowGeo) o.geometry.dispose(); if (o.material && o.material !== arrowMat) o.material.dispose(); });
        this.items.splice(i, 1);
      }
    }
    this.add.update(dt);
    this.smoke.update(dt);
    // 떠오르는 숫자
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt;
      if (t.t > 0.9) { t.el.remove(); this.texts.splice(i, 1); continue; }
      this.v.copy(t.pos).project(this.camera);
      const x = (this.v.x * 0.5 + 0.5) * w + t.dx * t.t;
      const y = (-this.v.y * 0.5 + 0.5) * h - 40 * t.t - 30;
      t.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${t.t < 0.12 ? 1.4 - t.t * 3 : 1})`;
      t.el.style.opacity = String(Math.min(1, (0.9 - t.t) * 3));
    }
    // 화면에 숫자가 너무 많으면 오래된 것부터 지운다
    while (this.texts.length > 40) { const t = this.texts.shift(); t.el.remove(); }
  }
}
