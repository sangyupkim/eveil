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
const heroClips = new Map();  // 주인공 동작 (hero_anims*.glb)

// KayKit 동작 이름 → 게임에서 쓰는 이름
const KAYKIT = {
  skel: { idle: 'Idle', walk: 'Walking_D_Skeletons', run: 'Running_C', attack: '1H_Melee_Attack_Chop', heavy: '2H_Melee_Attack_Chop',
    shoot: '2H_Ranged_Shoot', cast: 'Spellcast_Shoot', hit: 'Hit_A', death: 'Death_C_Skeletons', spawn: 'Spawn_Ground_Skeletons' },
  human: { idle: 'Idle', walk: 'Running_A', run: 'Running_A', attack: '1H_Melee_Attack_Chop', heavy: '2H_Melee_Attack_Chop', hit: 'Hit_A', death: 'Death_A' },
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
    else if (name.startsWith('hero_anims')) for (const c of gltf.animations) heroClips.set(c.name, c);
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
export const hasModel = (name) => cache.has(name);

// 그 모델(rig)에서 게임 동작 이름에 맞는 클립을 찾는다
export function clipFor(model, rig, name) {
  for (let n = name, i = 0; n && i < 4; n = FALLBACK[n], i++) {
    const c = rig === 'hero' ? heroClips.get(n) : KAYKIT[rig] ? clips.get(KAYKIT[rig][n]) : ownClips.get(model)?.get(n);
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

// ───── 주인공: 맨몸 + 옷 조각 + 머리카락 (Quaternius Universal Rig) ─────
export const HERO_HEIGHT = 2.7; // KayKit 사람 · 해골(머리가 큰 3등신)과 나란히 서도 작아 보이지 않게
export const HAIRS = {
  m: [['hair_buzzed', '짧은 머리'], ['hair_parted', '가르마'], ['hair_beard', '수염']],
  f: [['hair_long', '긴 머리'], ['hair_buns', '올림머리'], ['hair_buzzed_f', '짧은 머리']],
};
export const HAIR_COLORS = [0x2e2218, 0x6a4a2a, 0xb08a4a, 0x8a8a92, 0x7a2a22];
export const HERO_MODELS = (g) => [`hero_${g}`, `peasant_${g}`, `ranger_${g}`, ...HAIRS[g].map((h) => h[0])];

export const HAND_ROT = { r: [0, 0, 0], l: [0, 0, 0] };
// 옷 조각 이름: Male_Ranger_Feet_Boots → Ranger_Feet
const PIECES = ['Ranger_Acc_Pauldron', 'Ranger_Arms_Bracer', 'Ranger_Body_Belt_1', 'Ranger_Body_Belt_2', 'Ranger_Head_Hood',
  'Ranger_Arms', 'Ranger_Body', 'Ranger_Feet', 'Ranger_Legs', 'Peasant_Arms', 'Peasant_Body', 'Peasant_Feet', 'Peasant_Legs'];
const pieceKey = (name) => { const n = name.replace(/^(Male|Female)_/, ''); return PIECES.find((k) => n.startsWith(k)) || n; };

// 통짜 몸에서 머리 · 목에 묶인 면만 남긴 모양 (한 번만 만든다)
const headGeo = new Map();
function headOnly(key, mesh) {
  if (headGeo.has(key)) return headGeo.get(key);
  const src = mesh.geometry, idx = src.index.array, si = src.attributes.skinIndex, sw = src.attributes.skinWeight;
  const keep = new Set(mesh.skeleton.bones.map((b, i) => (/^(Head|neck)/i.test(b.name) ? i : -1)).filter((i) => i >= 0));
  const isHead = (v) => { let w = 0; for (let k = 0; k < 4; k++) if (keep.has(si.getComponent(v, k))) w += sw.getComponent(v, k); return w > 0.5; };
  const out = [];
  for (let i = 0; i < idx.length; i += 3) if (isHead(idx[i]) && isHead(idx[i + 1]) && isHead(idx[i + 2])) out.push(idx[i], idx[i + 1], idx[i + 2]);
  const geo = src.clone();
  geo.setIndex(out);
  headGeo.set(key, geo);
  return geo;
}

// 다른 파일의 SkinnedMesh를 이 캐릭터의 뼈대에 다시 묶는다 (뼈 이름으로)
function rebind(src, bones, root) {
  const m = src.clone();
  m.material = src.material.clone();
  m.bind(new THREE.Skeleton(src.skeleton.bones.map((b) => bones[b.name]), src.skeleton.boneInverses), src.bindMatrix);
  m.castShadow = true; m.frustumCulled = false; m.visible = false;
  root.add(m);
  return m;
}

export function makeHero(gender = 'm') {
  const g = gender === 'f' ? 'f' : 'm';
  const model = SkeletonUtils.clone(cache.get(`hero_${g}`));
  model.scale.multiplyScalar(HERO_HEIGHT / modelHeight(`hero_${g}`));
  const bones = {};
  const mats = [];
  model.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0); mats.push(o.material); o.castShadow = true; o.frustumCulled = false; }
  });
  // 맨몸은 머리만 남긴다 — 몸은 옷 조각이 (자기 살갗까지) 대신한다
  const body = [];
  model.traverse((o) => { if (o.isSkinnedMesh) body.push(o); });
  for (const o of body) if (/hero/i.test(o.name)) o.geometry = headOnly(`hero_${g}`, o);
  const pieces = {};
  for (const set of ['peasant', 'ranger']) {
    cache.get(`${set}_${g}`)?.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const m = rebind(o, bones, model);
      m.material.emissive = new THREE.Color(0);
      m.userData.base = m.material.color.clone();
      mats.push(m.material);
      (pieces[pieceKey(o.name)] ||= []).push(m);
    });
  }
  const hairs = {};
  for (const [name] of HAIRS[g]) {
    cache.get(name)?.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const m = rebind(o, bones, model);
      m.material = new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 0.85 });
      mats.push(m.material);
      hairs[name] = m;
    });
  }
  // 손 · 머리에 물건을 붙일 받침: 뼈대의 크기를 되돌려 월드 단위로 맞춘다
  model.updateMatrixWorld(true);
  const ws = new THREE.Vector3();
  const mount = (bone, rot) => {
    const w = new THREE.Group();
    if (!bone) return w;
    bone.getWorldScale(ws);
    w.scale.setScalar(1 / ws.x);
    w.rotation.set(...rot);
    bone.add(w);
    return w;
  };
  const handR = mount(bones.hand_r, HAND_ROT.r), handL = mount(bones.hand_l, HAND_ROT.l);
  const head = mount(bones.Head, [0, 0, 0]);
  return { model, mats, handR, handL, head, pieces, hairs, bones, body, hero: true };
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
