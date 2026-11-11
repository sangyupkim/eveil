// 모델 로딩과 복제. KayKit 캐릭터는 모두 같은 리그 → 애니메이션은 anims.glb 하나를 공유한다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
// 밝은 원색 소품을 어두운 분위기에 맞춰 누른다
const DARKEN = { tree: 0x5a6a48, trees: 0x55654a, tavern: 0x9a8a80, blacksmith: 0x9a8a80, home_a: 0x9a8a80, home_b: 0x9a8a80, market: 0x9a8a80, church: 0x9a8a80, ruin: 0x8a8078, fence_wood: 0x9a8a80, well: 0x9a8a80, rock_a: 0x9a9a9a, rock_b: 0x9a9a9a, rock_c: 0x9a9a9a };
const cache = new Map();
const clips = new Map();

const ownClips = new Map();   // 모델마다 든 동작 (Quaternius 몬스터)

// KayKit 동작 이름 → 게임에서 쓰는 이름
const KAYKIT = {
  skel: { idle: 'Idle', walk: 'Walking_D_Skeletons', run: 'Running_C', attack: '1H_Melee_Attack_Chop', heavy: '2H_Melee_Attack_Chop',
    shoot: '2H_Ranged_Shoot', cast: 'Spellcast_Shoot', hit: 'Hit_A', death: 'Death_C_Skeletons', spawn: 'Spawn_Ground_Skeletons' },
  human: { idle: 'Idle', walk: 'Running_A', run: 'Running_A', attack: '1H_Melee_Attack_Chop', heavy: '2H_Melee_Attack_Chop', hit: 'Hit_A', death: 'Death_A' },
  hero: { idle: 'Idle', walk: 'Running_A', run: 'Running_A', attack: '1H_Melee_Attack_Slice_Diagonal', attack2: '1H_Melee_Attack_Chop', attack3: '1H_Melee_Attack_Stab',
    heavy: '2H_Melee_Attack_Chop', slash2: '2H_Melee_Attack_Slice', spin: '2H_Melee_Attack_Spin', shoot: '2H_Ranged_Shoot', cast: 'Spellcast_Shoot', castUp: 'Spellcast_Raise',
    channel: 'Spellcast_Long', punch: '1H_Melee_Attack_Stab', punch2: '1H_Melee_Attack_Slice_Diagonal', hit: 'Hit_A', death: 'Death_A', drink: 'Use_Item' },
};
// 없는 동작은 비슷한 것으로
const FALLBACK = { attack2: 'attack', attack3: 'attack', heavy: 'attack', shoot: 'attack', cast: 'attack', spin: 'attack', run: 'walk', walk: 'idle', castUp: 'cast', channel: 'idle' };

export async function loadModels(names, onProgress = () => {}) {
  let done = 0;
  const all = ['anims', ...names.filter((n) => n !== 'anims')];
  await Promise.all(all.map(async (name) => {
    if (cache.has(name)) { onProgress(++done / all.length); return; }
    const gltf = await loader.loadAsync(`assets/models/${name}.glb`);
    if (name === 'anims') for (const c of gltf.animations) clips.set(c.name, c);
    else if (gltf.animations.length) ownClips.set(name, new Map(gltf.animations.map((c) => [c.name, c])));
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material && DARKEN[name]) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(DARKEN[name])); }
        if (o.material) {
          o.material.roughness = Math.max(0.75, o.material.roughness ?? 1);
          o.material.metalness = Math.min(0.2, o.material.metalness ?? 0);
        }
      }
    });
    cache.set(name, gltf.scene);
    onProgress(++done / all.length);
  }));
}

export const clip = (name) => clips.get(name);
export const sourceModel = (name) => cache.get(name);
export const hasModel = (name) => cache.has(name);

// 그 모델(rig)에서 게임 동작 이름에 맞는 클립을 찾는다
export function clipFor(model, rig, name) {
  for (let n = name, i = 0; n && i < 4; n = FALLBACK[n], i++) {
    const c = KAYKIT[rig] ? clips.get(KAYKIT[rig][n]) : ownClips.get(model)?.get(n);
    if (c) return c;
  }
  return null;
}

// 모델의 원래 키 (뼈대가 적용된 모양으로 잰다)
const heights = new Map();
export function modelHeight(name) {
  if (!heights.has(name)) {
    const o = SkeletonUtils.clone(cache.get(name));
    o.updateMatrixWorld(true);
    const box = new THREE.Box3();
    o.traverse((m) => { if (m.isMesh) box.expandByObject(m, true); });
    heights.set(name, Math.max(0.01, box.max.y - Math.min(0, box.min.y)));
  }
  return heights.get(name);
}

// 소품: 지오메트리와 재질을 공유하는 가벼운 복제
export function cloneProp(name, { shadow = true } = {}) {
  const src = cache.get(name);
  if (!src) return new THREE.Group();
  const o = src.clone(true);
  o.traverse((m) => { if (m.isMesh) { m.castShadow = shadow; m.receiveShadow = true; } });
  return o;
}

// 캐릭터 모델에 기본으로 붙어 있는 무기·소품 메시는 숨기고, 손 뼈에 따로 붙인다
const EMBEDDED_GEAR = /(Sword|Shield|Axe|Wand|Staff|Spellbook|Crossbow|Knife|Throwable|Mug)/;

export function makeCharacter(name, { tint = null, height = 0 } = {}) {
  const src = cache.get(name);
  const model = SkeletonUtils.clone(src);
  if (height) model.scale.multiplyScalar(height / modelHeight(name));
  const mats = [];
  model.traverse((o) => {
    if (o.name && EMBEDDED_GEAR.test(o.name) && !o.isBone) o.visible = false;
    if (o.isMesh) {
      o.material = o.material.clone();
      if (tint) o.material.color.multiply(new THREE.Color(tint));
      o.material.emissive = new THREE.Color(0x000000);
      mats.push(o.material);
      o.castShadow = true;
      o.frustumCulled = false;
    }
  });
  const handR = model.getObjectByName('handslotr') || model.getObjectByName('handslot.r');
  const handL = model.getObjectByName('handslotl') || model.getObjectByName('handslot.l');
  return { model, mats, handR, handL };
}

// ───── 주인공: KayKit 캐릭터 4종의 조각을 하나의 뼈대에 섞어 끼운다 ─────
// 몸은 하나(후드 없는 도적의 평상복). 얼굴은 고르고, 장비를 입은 부위만 다른 캐릭터 조각으로 바뀐다.
export const HERO_BASE = 'rogue_plain';
export const FACES = [['rogue_plain', '도적'], ['knight', '기사'], ['mage', '마법사'], ['barbarian', '야만']];
const PFX = { rogue_plain: 'Rogue', knight: 'Knight', mage: 'Mage', barbarian: 'Barbarian' };
const SLOTS_BODY = ['Head', 'Body', 'ArmLeft', 'ArmRight', 'LegLeft', 'LegRight', 'Cape', 'Hat', 'Helmet'];
// 머리카락이 높은 얼굴은 모자를 조금 키워 덮는다
const HAT_FIT = { knight: { s: 1.18, y: 0.08 } };

export function makeHero() {
  const c = makeCharacter(HERO_BASE);
  const bones = {};
  c.model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  // pieces[캐릭터][부위] = 메시 (처음엔 모두 숨김)
  const pieces = {};
  for (const src of Object.keys(PFX)) {
    const from = src === HERO_BASE ? c.model : makeCharacter(src).model;
    from.updateMatrixWorld(true);
    const got = {};
    from.traverse((o) => {
      if (!o.isMesh) return;
      const slot = SLOTS_BODY.find((k) => o.name === `${PFX[src]}_${k}`);
      if (slot) got[slot] = o;
    });
    pieces[src] = {};
    for (const [slot, o] of Object.entries(got)) {
      let m = o;
      if (src !== HERO_BASE) {
        if (o.isSkinnedMesh) {
          m = o.clone();
          m.bind(new THREE.Skeleton(o.skeleton.bones.map((b) => bones[b.name]), o.skeleton.boneInverses), o.bindMatrix);
          c.model.add(m);
        } else {
          m = o.clone();
          bones[o.parent.name]?.add(m);
        }
        m.material = o.material.clone();
        m.material.emissive = new THREE.Color(0);
        m.castShadow = true; m.frustumCulled = false;
        c.mats.push(m.material);
      }
      m.userData.base = m.material.color.clone();
      m.userData.pos = m.position.clone();
      m.userData.scale = m.scale.clone();
      m.visible = false;
      pieces[src][slot] = m;
    }
  }
  return { ...c, pieces, bones, hero: true };
}

// 겉모습 정하기. look: { face, Body, ArmLeft, ArmRight, LegLeft, LegRight, Cape, hat: [캐릭터, 'Hat'|'Helmet'], tint: { 부위: 색 } }
export function dressHero(c, look) {
  for (const src in c.pieces) for (const m of Object.values(c.pieces[src])) m.visible = false;
  const show = (src, slot, tint) => {
    const m = c.pieces[src]?.[slot];
    if (!m) return null;
    m.visible = true;
    m.material.color.copy(m.userData.base);
    if (tint != null) m.material.color.multiply(new THREE.Color(tint));
    return m;
  };
  const face = PFX[look.face] ? look.face : HERO_BASE;
  show(face, 'Head');
  for (const slot of ['Body', 'ArmLeft', 'ArmRight', 'LegLeft', 'LegRight']) show(look[slot] || HERO_BASE, slot, look.tint?.[slot]);
  if (look.Cape) show(look.Cape, 'Cape', look.tint?.Cape);
  if (look.hat) {
    const m = show(look.hat[0], look.hat[1], look.tint?.hat);
    if (m) {
      const fit = look.hat[1] === 'Hat' ? HAT_FIT[face] : null;
      m.scale.copy(m.userData.scale).multiplyScalar(fit?.s || 1);
      m.position.copy(m.userData.pos);
      if (fit) m.position.y += fit.y;
    }
  }
}

const sizes = new Map();
export function propSize(name) {
  if (!sizes.has(name)) { const v = new THREE.Box3().setFromObject(cache.get(name)).getSize(new THREE.Vector3()); sizes.set(name, Math.max(v.x, v.y, v.z, 0.01)); }
  return sizes.get(name);
}

export function attachTo(bone, modelName, tint = null, xf = null) {
  if (!bone) return null;
  for (const c of [...bone.children]) if (c.userData.gear) bone.remove(c);
  if (!modelName) return null;
  let o = cloneProp(modelName);
  if (xf?.center) {
    // 모델 한가운데를 쥔다 (활 · 방패 · 투구)
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    o.position.sub(c);
    const g = new THREE.Group(); g.add(o); o = g;
  }
  o.userData.gear = true;
  if (xf) {
    // len: 가장 긴 쪽을 이 길이로 맞춘다 (모델마다 원래 크기가 제각각)
    if (xf.len) o.scale.setScalar(xf.len / propSize(modelName)); else if (xf.s) o.scale.setScalar(xf.s);
    if (xf.r) o.rotation.set(...xf.r);
    if (xf.p) o.position.set(...xf.p);
  }
  if (tint) o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(tint)); } });
  bone.add(o);
  return o;
}

// 발광하는 원형 스프라이트 텍스처 (투사체 · 반딧불 · 빛기둥)
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
