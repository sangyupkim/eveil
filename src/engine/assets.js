// 모델 로딩과 복제. KayKit 캐릭터는 모두 같은 리그 → 애니메이션은 anims.glb 하나를 공유한다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
// 밝은 원색 소품을 어두운 분위기에 맞춰 누른다
const DARKEN = { tree: 0x5a6a48, trees: 0x55654a, tavern: 0x9a8a80, blacksmith: 0x9a8a80, home_a: 0x9a8a80, home_b: 0x9a8a80, market: 0x9a8a80, church: 0x9a8a80, ruin: 0x8a8078, fence_wood: 0x9a8a80, well: 0x9a8a80, rock_a: 0x9a9a9a, rock_b: 0x9a9a9a, rock_c: 0x9a9a9a };
const cache = new Map();
const clips = new Map();

export async function loadModels(names, onProgress = () => {}) {
  let done = 0;
  const all = ['anims', ...names.filter((n) => n !== 'anims')];
  await Promise.all(all.map(async (name) => {
    if (cache.has(name)) { onProgress(++done / all.length); return; }
    const gltf = await loader.loadAsync(`assets/models/${name}.glb`);
    if (name === 'anims') for (const c of gltf.animations) clips.set(c.name, c);
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

export function makeCharacter(name, { tint = null } = {}) {
  const src = cache.get(name);
  const model = SkeletonUtils.clone(src);
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

export function attachTo(bone, modelName, tint = null) {
  if (!bone) return null;
  for (const c of [...bone.children]) if (c.userData.gear) bone.remove(c);
  if (!modelName) return null;
  const o = cloneProp(modelName);
  o.userData.gear = true;
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
