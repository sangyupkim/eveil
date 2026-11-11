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
  const box = focus || new THREE.Box3().setFromObject(obj, true);
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
