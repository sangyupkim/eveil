// 2D 인물: 주인공(겹그림) · 몬스터 · NPC. 예전 3D Actor와 같은 쓰임새(play · act · face · lock · hitFlash · pos …)
import * as THREE from 'three';
import { DATA, image, tinted, frameIndex, animImage, drawRect, dirIndex } from './sprites.js';
import { ANIM_MAP, BASE_CLOTHES, faceOf } from '../data/flareWorld.js';
import { PX, PZ, PY } from './stage.js';

// 방향마다 겹 순서 (Flare hero_layers)
const ORDER = [
  ['main', 'feet', 'legs', 'hands', 'chest', 'off', 'head'], ['main', 'feet', 'legs', 'hands', 'chest', 'off', 'head'], ['main', 'feet', 'legs', 'hands', 'chest', 'off', 'head'],
  ['feet', 'legs', 'hands', 'chest', 'off', 'head', 'main'], ['feet', 'legs', 'hands', 'chest', 'off', 'head', 'main'], ['feet', 'legs', 'hands', 'chest', 'off', 'head', 'main'],
  ['feet', 'legs', 'hands', 'main', 'chest', 'head', 'off'], ['main', 'feet', 'legs', 'hands', 'chest', 'head', 'off'],
];

// 주인공 몸 정의 (예전 makeHero 자리)
export function makeHero(look = {}) {
  const f = faceOf(look.face);
  return { hero: true, sex: f[2], head: f[3] };
}

export class Actor {
  // model: makeHero() · { enemy: 이름 } · { npc: 이름 }
  constructor(stage, model, { tint = null, scale = 1, size = 1 } = {}) {
    this.stage = stage;
    this.spec = model;
    this.scale = scale * size;          // 이름표 · 타격 높이에 쓰는 몸집
    this.drawScale = scale * size;
    this.tint = tint;
    this.pos = new THREE.Vector3();
    this.facing = 0;
    this.dir = 6;
    this.lock = 0;
    this.flash = 0;
    this.glow = null;
    this.alpha = 1;
    this.current = null;
    this.t = 0;
    this.speed = 1;
    this.once = false;
    this.root = { visible: true, position: { y: 0 }, rotation: { y: 0 } };
    this.model = { position: { y: 0 } }; // 떠 있는 높이
    if (model.hero) {
      this.def = DATA[model.sex === 'f' ? 'avatar_f' : 'avatar_m'];
      this.layers = { ...BASE_CLOTHES, head: model.head };
    } else {
      this.def = model.enemy ? DATA.enemies[model.enemy] : DATA.npcs[model.npc];
      if (!this.def) console.warn('그림 없음', model);
      for (const p of Object.values(this.def?.images || {})) image(p); // 미리 받기
    }
    this.drawable = { z: 0, draw: (ctx, st) => this.draw(ctx, st), visible: true };
    stage.add(this.drawable);
  }

  // 주인공 겉모습: { chest, legs, feet, hands, head, main, off } + tints
  setLook({ layers = {}, tints = {} } = {}) {
    if (!this.spec.hero) return;
    this.layers = { ...BASE_CLOTHES, head: this.spec.head, ...layers };
    this.tints = tints;
    for (const l of Object.values(this.layers)) { const d = this.def[l]; if (d) image(animImage(d, 'stance')); }
  }

  // 동작 정의 (주인공은 몸통 겹 기준)
  anim(name) {
    const fl = ANIM_MAP[name] ?? name;
    if (!fl) return null;
    if (this.spec.hero) return this.def.default_chest.anims[fl] || null;
    return this.def?.anims[fl] || (fl === 'swing' ? this.def?.anims.melee : null) || null;
  }

  // 예전 three.js AnimationAction 흉내 (기본 공격 속도 맞추기에 쓴다)
  action(name) {
    const a = this.anim(name);
    return a ? { getClip: () => ({ duration: a.dur / 1000 }) } : null;
  }

  play(name, { once = false, speed = 1, force = false } = {}) {
    if (!force && this.current === name && !once) { this.speed = speed; return 0; }
    const a = this.anim(name);
    if (!a) return 0;
    this.current = name;
    this.t = 0;
    this.speed = speed;
    this.once = once || a.type === 'play_once';
    return once ? a.dur / 1000 / speed : 0;
  }

  act(name, speed = 1, lockScale = 1) {
    const d = this.play(name, { once: true, speed, force: true });
    this.lock = d * lockScale;
    return d;
  }

  face(x, z) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    if (dx * dx + dz * dz > 1e-4) this.facing = Math.atan2(dx, dz);
  }

  hitFlash(color = 0xffffff, t = 0.12) { this.flash = t; this.flashColor = color; }
  setGlow(color) { this.glow = color ? '#' + new THREE.Color(color).multiplyScalar(4).getHexString() : null; }

  update(dt) {
    this.t += dt * this.speed;
    if (this.lock > 0) this.lock -= dt;
    if (this.flash > 0) this.flash -= dt;
    this.dir = dirIndex(Math.sin(this.facing) * PX, Math.cos(this.facing) * PZ);
    this.drawable.z = this.pos.z;
    this.drawable.visible = this.root.visible;
  }

  draw(ctx, st) {
    if (!this.def) return;
    const s = st.scale() * this.drawScale;
    const fly = (this.model.position.y || 0) * PY * st.scale();
    const p = st.toScreen(this.pos.x, this.pos.z);
    const alpha = this.alpha * Math.max(0, Math.min(1, 1 + this.root.position.y));
    if (alpha <= 0.01) return;
    // 그림자 · 정예 테두리
    ctx.globalAlpha = 0.35 * alpha;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 26 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();
    if (this.glow) {
      ctx.globalAlpha = 0.55 * alpha; ctx.strokeStyle = this.glow; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 34 * s, 15 * s, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    const name = this.current || 'idle';
    const fl = ANIM_MAP[name] ?? name;
    const y = p.y - fly;
    if (this.spec.hero) {
      const base = this.def.default_chest.anims[fl] || this.def.default_chest.anims.stance;
      const fi = frameIndex(base, this.t, this.once);
      for (const type of ORDER[this.dir]) {
        const layer = this.layers[type];
        if (!layer) continue;
        const d = this.def[layer];
        const a = d?.anims[fl] || d?.anims.stance;
        if (!a) continue;
        const path = animImage(d, fl);
        const src = this.tints?.[type] != null ? tinted(path, this.tints[type]) : image(path).ok && image(path).im;
        if (!src) continue;
        drawRect(ctx, src, a.f[this.dir]?.[Math.min(fi, a.frames - 1)], p.x, y, s);
      }
    } else {
      const anims = this.def.anims;
      const a = anims[fl] || (fl === 'swing' && anims.melee) || anims.stance || Object.values(anims)[0];
      const path = animImage(this.def, anims[fl] ? fl : 'stance');
      const src = this.tint != null ? tinted(path, this.tint) : image(path).ok && image(path).im;
      if (src && a) drawRect(ctx, src, a.f[this.dir]?.[frameIndex(a, this.t, this.once)], p.x, y, s * (this.def.px || 1));
    }
    // 맞았을 때 번쩍: 같은 그림을 밝게 한 번 더 (lighter)
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, this.flash * 6) * 0.5;
      ctx.fillStyle = '#' + new THREE.Color(this.flashColor).getHexString();
      ctx.beginPath(); ctx.ellipse(p.x, y - 50 * s, 24 * s, 46 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  dispose() { this.stage.remove(this.drawable); }
}
