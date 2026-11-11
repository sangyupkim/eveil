// 3D 모델을 그대로 찍어 만든 아이콘 (아이템 · 초상화 · 메뉴 단추)
import * as THREE from 'three';
import { cloneProp, makeCharacter } from '../engine/assets.js';
import { BASES, WEAPON_CLASSES, RARITY } from '../data/items.js';
import { SKILLS, BOOK_TIERS } from '../data/skills.js';

const SIZE = 128;
let R = null, scene = null, cam = null;
const cache = new Map();

function setup() {
  const canvas = document.createElement('canvas');
  R = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1);
  R.setSize(SIZE, SIZE, false);
  R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = 1.15;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff2dd, 0x2a2238, 1.6));
  const key = new THREE.DirectionalLight(0xffe2b0, 2.4);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fd8ff, 1.6);
  rim.position.set(-5, 2, -4);
  scene.add(rim);
  cam = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
}

// obj를 화면에 꽉 차게 찍는다. view: 바라보는 방향, fill: 채우는 비율
function shoot(obj, { view = [0.35, 0.3, 1], fill = 0.82, focus = null } = {}) {
  if (!R) setup();
  scene.add(obj);
  obj.updateMatrixWorld(true);
  // 숨긴 부위는 빼고 잰다 (부위 아이콘이 점처럼 작아지지 않게)
  let box = focus;
  if (!box) {
    box = new THREE.Box3();
    obj.traverse((o) => { if (o.isMesh && o.visible) box.expandByObject(o, true); });
    if (box.isEmpty()) box.setFromObject(obj, true);
  }
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.x, s.y, s.z) * 0.5 / fill;
  const dir = new THREE.Vector3(...view).normalize();
  const dist = r / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  cam.position.copy(c).addScaledVector(dir, dist * 1.05);
  cam.lookAt(c);
  cam.near = dist * 0.05; cam.far = dist * 4;
  cam.updateProjectionMatrix();
  R.setClearColor(0x000000, 0);
  R.clear();
  R.render(scene, cam);
  const url = R.domElement.toDataURL('image/png');
  scene.remove(obj);
  return url;
}

function cached(key, make) {
  if (!cache.has(key)) {
    try { cache.set(key, make()); } catch (e) { console.warn('아이콘 실패', key, e); cache.set(key, ''); }
  }
  return cache.get(key);
}

function tinted(obj, color, k = 1) {
  const c = new THREE.Color(color);
  obj.traverse((m) => {
    if (m.isMesh) {
      m.material = m.material.clone();
      m.material.color.lerp(c, k);
      m.material.emissive = c.clone().multiplyScalar(0.12);
    }
  });
  return obj;
}

// 캐릭터 모델에서 한 부위만 남겨 찍는다 (투구 · 갑옷 · 장갑 · 신발)
function part(model, names) {
  const c = makeCharacter(model);
  c.model.traverse((o) => {
    if (o.isMesh) o.visible = names.some((n) => o.name.includes(n) || o.parent?.name.includes(n));
  });
  const g = new THREE.Group();
  g.add(c.model);
  return g;
}

function jewel(kind, color) {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b860, metalness: 0.85, roughness: 0.3 });
  const gem = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.35), metalness: 0.2, roughness: 0.15 });
  if (kind === 'ring') {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 12, 32), gold);
    g.add(t);
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), gem);
    s.position.y = 0.6;
    g.add(s);
    g.rotation.x = 0.5;
  } else {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 40, Math.PI * 1.3), gold);
    chain.rotation.z = Math.PI * 1.35;
    g.add(chain);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 6), gold);
    p.rotation.x = Math.PI / 2;
    p.position.y = -0.7;
    g.add(p);
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), gem);
    s.position.set(0, -0.7, 0.1);
    g.add(s);
  }
  return g;
}

export function itemIcon(it) {
  if (it.book) {
    const tier = SKILLS[it.book].tier;
    return cached('book' + tier, () => {
      const o = tinted(cloneProp('book'), BOOK_TIERS[tier].color, 0.55);
      o.rotation.y = -0.5;
      return shoot(o, { view: [0.4, 0.5, 1] });
    });
  }
  const b = BASES[it.base];
  if (b.type === 'potion') {
    const col = b.restore.hp ? 0xff3040 : 0x3a78ff;
    return cached('pot' + it.base, () => shoot(tinted(cloneProp('potion'), col, 0.7), { fill: b.base?.endsWith('_l') ? 0.9 : 0.78 }));
  }
  const glow = RARITY[it.rarity || 'common'].color;
  switch (b.slot) {
    case 'weapon': return cached('w' + b.cls, () => {
      const o = cloneProp(WEAPON_CLASSES[b.cls].model);
      o.rotation.z = b.cls === 'crossbow' ? 0 : -Math.PI / 4;
      if (b.cls === 'crossbow') o.rotation.y = 0.6;
      return shoot(o, { view: [0, 0.15, 1], fill: 0.9 });
    });
    case 'offhand': return cached('o' + b.model, () => shoot(cloneProp(b.model), { view: [0.2, 0.1, 1] }));
    case 'helm': return cached('helm', () => shoot(part('knight', ['Knight_Helmet']), { view: [0.6, 0.25, 1] }));
    case 'armor': return cached('armor', () => shoot(part('knight', ['Knight_Body', 'Knight_Cape']), { view: [0.4, 0.15, 1] }));
    case 'gloves': return cached('gloves', () => shoot(part('barbarian', ['Barbarian_ArmRight']), { view: [0.2, 0.2, 1] }));
    case 'boots': return cached('boots', () => shoot(part('knight', ['Knight_LegRight']), { view: [0.6, 0.1, 1] }));
    case 'belt': return cached('belt', () => shoot(part('rogue', ['Rogue_Body']), { view: [0.3, 0.1, 1] }));
    case 'amulet': return cached('amulet' + glow, () => shoot(jewel('amulet', glow)));
    case 'ring': return cached('ring' + glow, () => shoot(jewel('ring', glow)));
  }
  return '';
}

export const coinIcon = () => cached('coin', () => shoot(cloneProp('coin'), { view: [0.3, 0.6, 1] }));
export const chestIcon = () => cached('chest', () => shoot(cloneProp('chest'), { view: [0.6, 0.45, 1] }));
export const bookIcon = () => cached('menubook', () => shoot(tinted(cloneProp('book'), 0xc04030, 0.4), { view: [0.5, 0.6, 1] }));
export const swordIcon = () => cached('menusword', () => { const o = cloneProp('w_sword'); o.rotation.z = -Math.PI / 4; return shoot(o, { view: [0, 0.1, 1], fill: 0.95 }); });

// 얼굴 초상화
export function portrait(look) {
  return cached('face' + look, () => {
    const c = makeCharacter(look);
    c.model.traverse((o) => { if (/Helmet|Hat|Cape/.test(o.name)) o.visible = false; });
    const g = new THREE.Group();
    g.add(c.model);
    g.updateMatrixWorld(true);
    const head = c.model.getObjectByName('head') || c.model.getObjectByName('Head');
    const hp = new THREE.Vector3();
    if (head) head.getWorldPosition(hp); else hp.set(0, 1.8, 0);
    const focus = new THREE.Box3(new THREE.Vector3(hp.x - 0.55, hp.y - 0.25, hp.z - 0.4), new THREE.Vector3(hp.x + 0.55, hp.y + 0.9, hp.z + 0.4));
    return shoot(g, { view: [0.25, 0.08, 1], focus, fill: 0.95 });
  });
}

// ───────── 스킬 아이콘: 물건 모양 3D 조각으로 ─────────
const glowMat = (color, k = 0.7) => new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(k), roughness: 0.45, metalness: 0.1 });
const at = (o, x = 0, y = 0, z = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.z = rz; return o; };
const group = (...xs) => { const g = new THREE.Group(); for (const x of xs) g.add(x); return g; };

function flame(color = 0xff6a1a, core = 0xffe08a, s = 1) {
  const prof = (w) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.9) * w, t * 1.7)); }
    return new THREE.LatheGeometry(pts, 16);
  };
  const g = group(new THREE.Mesh(prof(0.52), glowMat(color, 0.8)), at(new THREE.Mesh(prof(0.28), glowMat(core, 1)), 0, 0.12, 0.3));
  g.children[1].scale.y = 0.7;
  g.scale.setScalar(s);
  return g;
}
function arrow(color = 0xd8d2c4) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.8 });
  const g = group(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.9, 8), wood),
    at(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 4), glowMat(color, 0.25)), 0, 1.1));
  for (const r of [0, Math.PI / 2]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.02), glowMat(0xc04030, 0.2)); f.position.y = -0.8; f.rotation.y = r; g.add(f); }
  return g;
}
function cross(color) {
  const m = glowMat(color, 0.75);
  return group(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.36), m), new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.36), m));
}
function bolt(color) {
  const s = new THREE.Shape();
  [[0.25, 1.1], [-0.5, 0.05], [-0.05, 0.05], [-0.4, -1.1], [0.55, 0.25], [0.08, 0.25], [0.6, 1.1]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 });
  return new THREE.Mesh(g, glowMat(color, 0.9));
}
function crystals(color) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.45), roughness: 0.15, metalness: 0.3, flatShading: true });
  for (const [x, h, rz, r] of [[0, 1.5, 0, 0.36], [-0.5, 1.0, 0.45, 0.27], [0.5, 1.1, -0.4, 0.28], [-0.25, 0.7, 0.2, 0.2], [0.28, 0.65, -0.15, 0.2]]) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(r), m);
    c.scale.y = h / r / 1.6; c.position.set(x, h * 0.45, x ? 0.25 * Math.sign(x) * (h < 0.8 ? 1.6 : 0) : 0); c.rotation.z = rz;
    g.add(c);
  }
  return g;
}
const halo = (color, r = 0.6, tube = 0.07) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 36), glowMat(color, 0.9)); t.rotation.x = 1.25; return t; };
const swoosh = (color, r = 1, arc = Math.PI * 1.1) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 6, 28, arc), glowMat(color, 0.9)); t.scale.z = 0.3; return t; };
const weapon = (name, rz = -Math.PI / 4, tint = null, k = 0.5) => { const o = cloneProp(name); if (tint !== null) tinted(o, tint, k); const g = group(o); g.rotation.z = rz; return g; };
function rock(color = 0x4a2a22) {
  return new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), new THREE.MeshStandardMaterial({ color, emissive: 0x551400, roughness: 0.9, flatShading: true }));
}

const SKILL_ART = {
  power_strike: () => group(weapon('w_sword'), at(swoosh(0xff5a3a, 0.95), -0.15, 0.75, -0.2, 0.3)),
  fire_bolt: () => at(flame(0xff7a2a, 0xffe08a), 0, 0, 0, -0.9),
  first_aid: () => cross(0x4fd87a),
  aimed_shot: () => group(at(arrow(), 0, 0, 0, -Math.PI / 4), at(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 32), glowMat(0xff5a4a, 0.8)), 0.7, 0.7, 0), at(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 24), glowMat(0xff5a4a, 0.8)), 0.7, 0.7, 0)),
  whirlwind: () => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 6, 40, Math.PI * 1.7), glowMat(0xffb060, 0.9)); r.rotation.x = 1.2; r.position.y = 0.7; return group(weapon('w_axe', -0.5), r); },
  fireball: () => group(new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), glowMat(0xff4a12, 0.85)), at(flame(0xff8a2a, 0xfff0a0, 1.0), 0.15, 0.1, -0.1, -0.5), at(new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), glowMat(0xffe08a, 1)), -0.12, 0.12, 0.42)),
  holy_light: () => group(cross(0xffe680), at(halo(0xfff4c0, 0.62), 0, 1.25)),
  multishot: () => group(at(arrow(), -0.55, 0, 0, 0.45), arrow(), at(arrow(), 0.55, 0, 0, -0.45)),
  iron_skin: () => { const g = weapon('w_shield', 0, 0xaab4c8, 0.75); g.rotation.y = 0.25; return g; },
  earth_cleave: () => group(weapon('w_greataxe', -0.6), at(cloneProp('rock_a'), 0.5, -0.2, 0.3), at(cloneProp('rock_b'), -0.6, -0.2, 0.2)),
  chain_lightning: () => group(bolt(0x8fd0ff), at(bolt(0xd8f0ff), 0.75, -0.25, -0.3, -0.5)),
  divine_shield: () => { const s = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 16), new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0x806020, transparent: true, opacity: 0.3, roughness: 0.2, depthWrite: false })); const w = weapon('w_shield_sq', 0, 0xffd860, 0.6); s.position.y = 0.1; return group(w, s); },
  meteor: () => group(rock(), at(flame(0xff4a1a, 0xffc060, 1.15), 0.2, 0.2, -0.3, -0.8), at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), glowMat(0xff8a2a, 1)), -0.3, -0.75, 0.3)),
  berserk: () => group(weapon('w_axe', -0.6, 0xd02030, 0.55), at(weapon('w_axe', 0.6, 0xd02030, 0.55), 0, 0, -0.25)),
  judgement: () => group(weapon('w_greatsword', 0, 0xffd860, 0.55), at(halo(0xfff0a0, 0.75, 0.08), 0, 2.3)),
  absolute_zero: () => group(crystals(0x9fe6ff), at(halo(0xdff6ff, 1.0, 0.05), 0, 0.15)),
};

export function skillIcon(id) {
  return cached('skill' + id, () => (SKILL_ART[id] ? shoot(SKILL_ART[id](), { view: [0.12, 0.18, 1], fill: 0.9 }) : ''));
}
export const homeIcon = () => cached('home', () => shoot(cloneProp('home_a'), { view: [0.7, 0.5, 1], fill: 0.95 }));
export const duelIcon = () => cached('duel', () => shoot(group(weapon('w_sword', -0.6), at(weapon('w_sword', 0.6), 0, 0, -0.2)), { view: [0, 0.1, 1], fill: 0.95 }));
