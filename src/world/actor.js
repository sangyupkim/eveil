// 애니메이션되는 캐릭터 (플레이어 · 몬스터 · NPC 공통)
import * as THREE from 'three';
import { makeCharacter, attachTo, clip } from '../engine/assets.js';

let nextId = 1;

export class Actor {
  constructor(scene, model, { tint = null, scale = 1, weapon = null, offhand = null, weaponTint = null } = {}) {
    this.id = nextId++;
    const c = makeCharacter(model, { tint });
    this.root = new THREE.Group();
    this.root.add(c.model);
    this.root.scale.setScalar(scale);
    this.model = c.model;
    this.mats = c.mats;
    this.handR = c.handR;
    this.handL = c.handL;
    this.scale = scale;
    scene.add(this.root);
    this.scene = scene;
    this.mixer = new THREE.AnimationMixer(c.model);
    this.actions = new Map();
    this.current = null;
    this.lock = 0;          // 공격·피격 동작 중엔 이동 애니메이션으로 바꾸지 않는다
    this.facing = 0;
    this.flash = 0;
    this.flashColor = new THREE.Color(1, 1, 1);
    this.mixer.addEventListener('finished', (e) => {
      if (e.action === this.actions.get(this.current) && this.onFinish) this.onFinish(this.current);
    });
    this.setGear(weapon, offhand, weaponTint);
  }

  get pos() { return this.root.position; }

  setGear(weapon, offhand, tint = null) {
    attachTo(this.handR, weapon, tint);
    attachTo(this.handL, offhand, tint);
  }

  // 겉옷: 투구 · 망토는 입었을 때만 보이고, 갑옷이 없으면 몸을 수수한 천 색으로 누른다
  setOutfit({ helm = true, armor = true, gloves = true, boots = true } = {}) {
    const plain = new THREE.Color(0xb49a72), white = new THREE.Color(0xffffff);
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      if (/Helmet|Hat/.test(o.name)) o.visible = helm;
      else if (/Cape/.test(o.name)) o.visible = armor;
      else if (/Body/.test(o.name)) o.material.color.copy(armor ? white : plain);
      else if (/Arm/.test(o.name)) o.material.color.copy(armor || gloves ? white : plain);
      else if (/Leg/.test(o.name)) o.material.color.copy(armor || boots ? white : plain);
    });
  }

  action(name) {
    let a = this.actions.get(name);
    if (!a) {
      const c = clip(name);
      if (!c) return null;
      a = this.mixer.clipAction(c);
      this.actions.set(name, a);
    }
    return a;
  }

  // loop: 반복 / once: 한 번 재생 후 멈춤(clamp) — 한 번 재생이면 재생 시간(초)을 돌려준다
  play(name, { once = false, fade = 0.15, speed = 1, force = false, clamp = false } = {}) {
    if (!force && this.current === name && !once) return 0;
    const a = this.action(name);
    if (!a) return 0;
    const prev = this.actions.get(this.current);
    a.reset();
    a.enabled = true;
    a.setEffectiveTimeScale(speed);
    a.setEffectiveWeight(1);
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = once || clamp;
    if (prev && prev !== a) a.crossFadeFrom(prev, fade, false);
    a.play();
    this.current = name;
    return once ? a.getClip().duration / speed : 0;
  }

  // 공격 같은 한 번짜리 동작: 끝날 때까지 이동 애니메이션을 막는다
  act(name, speed = 1, lockScale = 1) {
    const d = this.play(name, { once: true, speed, force: true, fade: 0.08 });
    this.lock = d * lockScale;
    return d;
  }

  face(x, z) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    if (dx * dx + dz * dz > 1e-4) this.facing = Math.atan2(dx, dz);
  }

  hitFlash(color = 0xffffff, t = 0.12) {
    this.flash = t;
    this.flashColor.set(color);
  }

  update(dt) {
    this.mixer.update(dt);
    if (this.lock > 0) this.lock -= dt;
    // 부드럽게 돌아보기
    const cur = this.root.rotation.y;
    let d = this.facing - cur;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.root.rotation.y = cur + d * Math.min(1, dt * 14);
    if (this.flash > 0) {
      this.flash -= dt;
      const k = Math.max(0, this.flash) * 6;
      for (const m of this.mats) m.emissive.copy(this.flashColor).multiplyScalar(k);
      if (this.flash <= 0) for (const m of this.mats) m.emissive.setRGB(this.glow?.r || 0, this.glow?.g || 0, this.glow?.b || 0);
    }
  }

  setGlow(color) {
    this.glow = color ? new THREE.Color(color) : null;
    for (const m of this.mats) m.emissive.copy(this.glow || new THREE.Color(0));
  }

  dispose() {
    this.scene.remove(this.root);
    this.mixer.stopAllAction();
    for (const m of this.mats) m.dispose();
  }
}
