// 시각 효과: 투사체 · 충격파 · 번개 · 불꽃 · 떠오르는 숫자
import * as THREE from 'three';
import { glowTexture } from '../engine/assets.js';

export class FX {
  constructor(scene, camera, layer) {
    this.scene = scene;
    this.camera = camera;
    this.layer = layer; // 떠오르는 숫자를 그릴 DOM
    this.items = [];
    this.texts = [];
    this.v = new THREE.Vector3();
  }

  sprite(color, size, opacity = 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    s.scale.setScalar(size);
    return s;
  }

  // 투사체: target은 {pos} 가진 대상 (유도) — 도착하면 onHit
  projectile({ from, target, color = 0xff8a30, size = 0.8, speed = 22, onHit, bolt = false, trail = true }) {
    const g = new THREE.Group();
    const core = this.sprite(color, size);
    g.add(core);
    if (bolt) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xd8c8a0 }));
      m.rotation.x = Math.PI / 2;
      g.add(m);
      core.scale.setScalar(size * 0.5);
    }
    g.position.set(from.x, from.y ?? 1.4, from.z);
    this.scene.add(g);
    this.items.push({
      kind: 'proj', obj: g, target, speed, onHit, color, trail, t: 0,
      last: target.pos ? target.pos.clone() : new THREE.Vector3(target.x, 0, target.z),
    });
  }

  ring(x, z, radius, color = 0xffaa40, dur = 0.45, y = 0.08) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    this.scene.add(m);
    this.items.push({ kind: 'ring', obj: m, radius, dur, t: 0 });
  }

  // 부채꼴 (대지 가르기)
  cone(x, z, angle, radius, color, spread = 1.2) {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1, 24, -spread / 2, spread),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = angle - Math.PI / 2;
    m.position.set(x, 0.1, z);
    this.scene.add(m);
    this.items.push({ kind: 'ring', obj: m, radius, dur: 0.4, t: 0 });
  }

  burst(x, y, z, color = 0xffc070, n = 8, spread = 3, size = 0.35) {
    for (let i = 0; i < n; i++) {
      const s = this.sprite(color, size);
      s.position.set(x, y, z);
      this.scene.add(s);
      const v = new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * spread * 0.8, (Math.random() - 0.5) * spread);
      this.items.push({ kind: 'spark', obj: s, vel: v, dur: 0.35 + Math.random() * 0.3, t: 0, size });
    }
  }

  pillar(x, z, color = 0xffd060, dur = 1.2, h = 8, w = 1.4) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(w, w * 0.6, h, 20, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    m.position.set(x, h / 2, z);
    this.scene.add(m);
    this.items.push({ kind: 'pillar', obj: m, dur, t: 0 });
  }

  lightning(points, color = 0x9fd0ff) {
    const pts = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const j = k === 0 || k === 6 ? 0 : 0.5;
        pts.push(new THREE.Vector3(
          a.x + (b.x - a.x) * t + (Math.random() - 0.5) * j,
          1.3 + (Math.random() - 0.5) * j,
          a.z + (b.z - a.z) * t + (Math.random() - 0.5) * j,
        ));
      }
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending }),
    );
    this.scene.add(line);
    this.items.push({ kind: 'fade', obj: line, dur: 0.3, t: 0 });
    for (const p of points.slice(1)) this.burst(p.x, 1.3, p.z, color, 5, 2.5);
  }

  // 운석: 하늘에서 떨어져 delay 후 onHit
  meteor(x, z, radius, delay, onHit) {
    const s = this.sprite(0xff6020, 2.6);
    s.position.set(x - 6, 18, z - 3);
    this.scene.add(s);
    this.ring(x, z, radius, 0xff4010, delay, 0.06);
    this.items.push({ kind: 'meteor', obj: s, x, z, dur: delay, t: 0, onHit, radius });
  }

  text(pos, str, cls = '') {
    const el = document.createElement('div');
    el.className = 'dmg ' + cls;
    el.textContent = str;
    this.layer.appendChild(el);
    this.texts.push({ el, pos: pos.clone ? pos.clone() : new THREE.Vector3(pos.x, pos.y, pos.z), t: 0, dx: (Math.random() - 0.5) * 30 });
  }

  update(dt) {
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
          it.onHit?.(it.target);
        } else {
          it.obj.position.addScaledVector(to.normalize(), step);
          if (it.trail && Math.random() < 0.6) {
            const s = this.sprite(it.color, 0.35, 0.6);
            s.position.copy(it.obj.position);
            this.scene.add(s);
            this.items.push({ kind: 'spark', obj: s, vel: new THREE.Vector3(0, 0.3, 0), dur: 0.25, t: 0, size: 0.35 });
          }
        }
      } else if (it.kind === 'ring') {
        const k = it.t / it.dur;
        it.obj.scale.setScalar(it.radius * (0.3 + 0.7 * Math.min(1, k * 1.5)));
        it.obj.material.opacity = 0.9 * (1 - k);
        done = k >= 1;
      } else if (it.kind === 'spark') {
        it.obj.position.addScaledVector(it.vel, dt);
        it.vel.y -= 6 * dt;
        const k = it.t / it.dur;
        it.obj.material.opacity = 1 - k;
        it.obj.scale.setScalar(it.size * (1 - k * 0.5));
        done = k >= 1;
      } else if (it.kind === 'pillar') {
        const k = it.t / it.dur;
        it.obj.material.opacity = 0.3 * Math.sin(Math.PI * Math.min(1, k));
        it.obj.rotation.y += dt * 2;
        done = k >= 1;
      } else if (it.kind === 'fade') {
        it.obj.material.opacity = 1 - it.t / it.dur;
        done = it.t >= it.dur;
      } else if (it.kind === 'meteor') {
        const k = Math.min(1, it.t / it.dur);
        it.obj.position.set(it.x - 6 * (1 - k), 18 * (1 - k) + 0.5, it.z - 3 * (1 - k));
        if (k >= 1) {
          done = true;
          this.burst(it.x, 0.6, it.z, 0xff6020, 26, 9, 0.8);
          this.ring(it.x, it.z, it.radius * 1.3, 0xff8030, 0.5);
          it.onHit?.();
        }
      }
      if (done) {
        this.scene.remove(it.obj);
        it.obj.traverse?.((o) => { o.geometry?.dispose(); o.material?.dispose(); });
        this.items.splice(i, 1);
      }
    }
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
  }
}
