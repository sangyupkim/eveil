// 렌더러 · 카메라 · 조명 · 지형 · 소품 배치
import * as THREE from 'three';
import { cloneProp, glowTexture, sourceModel } from './assets.js';
import { ZONES, TOWN, WORLD_SIZE } from '../data/world.js';
import { seeded } from '../game/rng.js';

export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export function createStage(canvas, { shadows = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const fogColor = new THREE.Color(0x0e1114);
  scene.background = fogColor;
  scene.fog = new THREE.Fog(fogColor, 30, 66);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 95); // 안개(66) 너머는 그리지 않는다

  // 해질녘의 차가운 하늘빛 + 낮게 깔린 따뜻한 햇빛
  const hemi = new THREE.HemisphereLight(0x7d8aa6, 0x231a10, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2a0, 2.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  const sc = sun.shadow.camera;
  sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  // 플레이어 주변을 밝히는 등불 (디아블로식 시야 반경)
  const lamp = new THREE.PointLight(0xffb070, 30, 16, 1.6);
  scene.add(lamp);

  const stage = { renderer, scene, camera, sun, lamp, zoom: 1, colliders: [], torches: [] };
  stage.resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1.5 ? 40 : 34;
    camera.updateProjectionMatrix();
  };
  stage.shakeK = 0;
  stage.shake = (k) => { stage.shakeK = Math.min(1, Math.max(stage.shakeK, k)); };
  stage.follow = (x, z, dt = 1) => {
    const off = new THREE.Vector3(0, 23, 21).multiplyScalar(stage.zoom);
    const want = new THREE.Vector3(x, 0, z).add(off);
    camera.position.lerp(want, Math.min(1, dt * 8));
    camera.lookAt(camera.position.x - off.x, 1.2, camera.position.z - off.z);
    // 화면 흔들림: 큰 타격 · 보스 패턴에서 잠깐
    if (stage.shakeK > 0.001) {
      const k = stage.shakeK * stage.shakeK * 0.6;
      camera.position.x += (Math.random() - 0.5) * k; camera.position.y += (Math.random() - 0.5) * k; camera.position.z += (Math.random() - 0.5) * k;
      stage.shakeK = Math.max(0, stage.shakeK - dt * 2.5);
    }
    sun.position.set(x - 18, 34, z + 10);
    sun.target.position.set(x, 0, z);
    lamp.position.set(x, 3.2, z + 0.5);
  };
  stage.resize();
  window.addEventListener('resize', stage.resize);
  return stage;
}

// ───────── 지형 ─────────

function zoneAt(x, z) {
  for (const zn of ZONES) if (Math.hypot(x - zn.x, z - zn.z) < zn.r) return zn;
  return null;
}

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

const DIRT = [0.27, 0.21, 0.15];
const WILD = [0.17, 0.2, 0.12];

export function groundColor(x, z, n) {
  // 지역별 바닥색을 부드럽게 섞는다
  let col = [...WILD], wsum = 0.15;
  col = col.map((c) => c * 0.15);
  for (const zn of ZONES) {
    const d = Math.hypot(x - zn.x, z - zn.z);
    const w = Math.max(0, 1 - d / (zn.r * 1.25)) ** 1.5;
    if (w > 0) { for (let i = 0; i < 3; i++) col[i] += zn.ground[i] * w; wsum += w; }
  }
  col = col.map((c) => c / wsum);
  // 마을과 길은 흙
  const dTown = Math.hypot(x - TOWN.x, z - TOWN.z);
  let dirt = Math.max(0, 1 - Math.max(0, dTown - TOWN.r * 0.6) / 8);
  for (const zn of ZONES) {
    const d = distToSeg(x, z, 0, 0, zn.x * 0.7, zn.z * 0.7);
    dirt = Math.max(dirt, Math.max(0, 1 - d / 2.6) * 0.85);
  }
  dirt = Math.min(1, dirt + (n - 0.5) * 0.3 * dirt);
  for (let i = 0; i < 3; i++) col[i] = col[i] * (1 - dirt) + DIRT[i] * dirt;
  const v = 0.82 + n * 0.36;
  return col.map((c) => c * v);
}

function noise2(x, z) {
  return (Math.sin(x * 0.21 + Math.cos(z * 0.13) * 2) + Math.sin(z * 0.17 + Math.sin(x * 0.11) * 2) + Math.sin((x + z) * 0.37) * 0.5) / 5 + 0.5;
}

function detailTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 256, 256);
  const rng = seeded(42);
  for (let i = 0; i < 9000; i++) {
    const v = 90 + rng() * 90;
    g.fillStyle = `rgba(${v},${v},${v},${0.25 + rng() * 0.35})`;
    const x = rng() * 256, y = rng() * 256;
    g.fillRect(x, y, 1 + rng() * 2, 1 + rng() * 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(70, 70);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildTerrain(stage) {
  const size = WORLD_SIZE * 2 + 40;
  const seg = 240;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = noise2(x, z);
    const c = groundColor(x, z, n);
    colors.set(c, i * 3);
    // 맵 가장자리는 어둡게 솟아오른 언덕
    const edge = Math.max(0, Math.hypot(x, z) - WORLD_SIZE);
    pos.setY(i, edge * 0.35);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: detailTexture(), roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  stage.scene.add(ground);
  stage.ground = ground;
  buildGrass(stage);
  buildFireflies(stage);
}

function buildGrass(stage) {
  // 풀 포기: 가는 삼각형 잎 몇 장
  const blades = [];
  for (let b = 0; b < 5; b++) {
    const a = (b / 5) * Math.PI * 2 + b;
    const ox = Math.cos(a) * 0.12, oz = Math.sin(a) * 0.12;
    const tx = Math.cos(a) * 0.35, tz = Math.sin(a) * 0.35;
    const h = 0.5 + (b % 3) * 0.18;
    blades.push(ox - 0.05, 0, oz, ox + 0.05, 0, oz, tx, h, tz);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  const count = isTouch ? 9000 : 20000;
  const rng = seeded(7);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const col = new THREE.Color();
  // 구역마다 따로 모아 화면 밖 구역은 그리지 않게 한다
  const chunks = new Map();
  let n = 0;
  while (n < count) {
    const x = (rng() * 2 - 1) * WORLD_SIZE, z = (rng() * 2 - 1) * WORLD_SIZE;
    if (Math.hypot(x, z) > WORLD_SIZE) continue;
    if (Math.hypot(x, z) < TOWN.r * 0.7) continue;
    const zn = zoneAt(x, z);
    if ((zn?.id === 'grave' || zn?.id === 'inferno') && rng() < 0.6) continue;
    if (zn?.id === 'frost' && rng() < 0.4) continue;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2);
    const k = 0.45 + rng() * 0.6;
    s.set(k, k * (0.6 + rng() * 0.5), k);
    p.set(x, 0, z);
    const gc = groundColor(x, z, noise2(x, z));
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push([m.compose(p, q, s).clone(), col.setRGB(gc[0] * 1.15, gc[1] * 1.3 + 0.02, gc[2] * 1.0).clone()]);
    n++;
  }
  for (const list of chunks.values()) {
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([mm, cc], i) => { mesh.setMatrixAt(i, mm); mesh.setColorAt(i, cc); });
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true;
    stage.scene.add(mesh);
  }
}

function buildFireflies(stage) {
  const count = 520;
  const pos = new Float32Array(count * 3);
  const rng = seeded(99);
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2, r = rng() * WORLD_SIZE;
    pos.set([Math.cos(a) * r, 0.6 + rng() * 2.4, Math.sin(a) * r], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: glowTexture(), color: 0xffd860, size: 0.55, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: true,
  });
  const pts = new THREE.Points(geo, mat);
  stage.scene.add(pts);
  const base = pos.slice();
  stage.fireflies = (t) => {
    for (let i = 0; i < count; i++) {
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.5 + i) * 0.8;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 1.3 + i * 2.1) * 0.35;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.4 + i * 1.7) * 0.8;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.65 + Math.sin(t * 2) * 0.25;
  };
}

// ───────── 소품 ─────────

// name: [크기 배율, 충돌 반경(배율 적용 후), 무작위 크기 폭]
const PROP_INFO = {
  tree: [3.6, 0.7, 0.4], trees: [3.4, 1.8, 0.3], rock: [7, 0.9, 0.6],
  rock_a: [7, 0.9, 0.6], rock_b: [7, 0.9, 0.6], rock_c: [7, 1, 0.6],
  tree_dead_l: [1.25, 0.6, 0.3], tree_dead_m: [1.25, 0.5, 0.3], tree_dead_s: [1.25, 0.4, 0.3], tree_pine: [1.3, 0.8, 0.3],
  fence_broken: [1, 0, 0], fence_pillar: [1, 0.3, 0.2], bone: [1.2, 0, 0.3],
  grave: [1, 0.9, 0.15], gravestone: [1, 0.6, 0.15], gravemarker: [1, 0, 0.2], crypt: [0.9, 3.6, 0], coffin: [0.8, 1, 0],
  skull_candle: [1, 0, 0.2], post: [1, 0.25, 0], ruin: [6, 3.6, 0.2], rubble: [0.9, 2.6, 0.2], pillar: [0.9, 0.7, 0.2],
  barrel: [0.6, 0.6, 0.1], crates: [0.6, 0.8, 0.1], banner: [1, 0.3, 0],
};
// 자연 소품(Quaternius): 이름 앞부분 → [크기, 충돌, 크기 폭]. 풀 · 꽃 · 덤불은 부딪치지 않는다
const NATURE_INFO = [
  [/^n_(tree|pine|birch|willow|dead|snow_(pine|tree|birch|dead))/, [1.25, 0.55, 0.35]], [/^n_(rock|moss)/, [1.1, 0.9, 0.5]],
  [/^n_(stump|log)/, [1.1, 0.5, 0.3]], [/^n_cactus/, [1.2, 0.4, 0.3]],
  [/^n_(bush|berries)/, [1.1, 0, 0.4]], [/^n_(flowers|grass|plant|lily|wheat)/, [1.1, 0, 0.5]],
];
for (const name of ['n_tree1', 'n_tree2', 'n_tree3', 'n_tree_au', 'n_tree_au2', 'n_pine1', 'n_pine2', 'n_pine_au', 'n_birch', 'n_birch2', 'n_willow', 'n_willow2', 'n_willow_dead',
  'n_dead1', 'n_dead2', 'n_birch_dead', 'n_snow_pine', 'n_snow_pine2', 'n_snow_tree', 'n_snow_birch', 'n_snow_dead', 'n_bush', 'n_bush2', 'n_berries', 'n_bush_snow',
  'n_flowers', 'n_grass', 'n_grass2', 'n_plant', 'n_plant2', 'n_lily', 'n_wheat', 'n_rock1', 'n_rock2', 'n_moss1', 'n_moss2', 'n_rock_snow', 'n_rock_snow2',
  'n_stump', 'n_stump_moss', 'n_log', 'n_log_moss', 'n_log_snow', 'n_cactus', 'n_cactus2']) PROP_INFO[name] = NATURE_INFO.find(([re]) => re.test(name))[1];
export const NATURE_PROPS = Object.keys(PROP_INFO).filter((k) => k.startsWith('n_'));

// 움직이지 않는 소품은 바로 그리지 않고 모아 두었다가, 구역(CHUNK)마다 같은 모델끼리 한 번에 그린다 (InstancedMesh)
let batch = null;
const CHUNK = 40;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0);

function placeProp(stage, name, x, z, { rot = 0, scale = 1, collide = true } = {}) {
  const info = PROP_INFO[name] || [1, 0.5, 0];
  const s = info[0] * scale;
  if (collide && info[1] > 0) stage.colliders.push({ x, z, r: info[1] * scale });
  if (batch) {
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}|${name}`;
    if (!batch.has(key)) batch.set(key, { name, mats: [] });
    batch.get(key).mats.push(_m.compose(_p.set(x, 0, z), _q.setFromAxisAngle(_y, rot), _s.setScalar(s)).clone());
    return null;
  }
  const o = cloneProp(name);
  o.scale.setScalar(s);
  o.position.set(x, 0, z);
  o.rotation.y = rot;
  stage.scene.add(o);
  return o;
}

function flushProps(stage) {
  let meshes = 0, count = 0;
  for (const { name, mats } of batch.values()) {
    const src = sourceModel(name);
    if (!src) continue;
    // 그림자는 부딪치는 큰 소품(나무 · 바위 · 그루터기)만 — 풀 · 꽃 · 덤불은 그림자 패스를 아낀다
    const shadow = (PROP_INFO[name]?.[1] ?? 0.5) > 0;
    src.updateMatrixWorld(true);
    src.traverse((o) => {
      if (!o.isMesh) return;
      const im = new THREE.InstancedMesh(o.geometry, o.material, mats.length);
      for (let i = 0; i < mats.length; i++) im.setMatrixAt(i, _m.multiplyMatrices(mats[i], o.matrixWorld));
      im.castShadow = shadow;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      stage.scene.add(im);
      meshes++;
    });
    count += mats.length;
  }
  batch = null;
  stage.propStats = { props: count, meshes };
}

export function buildWorldProps(stage) {
  batch = new Map();
  const rng = seeded(1234);
  const roadClear = (x, z) => {
    if (Math.hypot(x, z) < TOWN.r + 3) return false;
    for (const zn of ZONES) if (distToSeg(x, z, 0, 0, zn.x * 0.7, zn.z * 0.7) < 4) return false;
    return true;
  };
  for (const zn of ZONES) {
    for (const [name, n] of Object.entries(zn.props)) {
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * zn.r * 1.05;
        const x = zn.x + Math.cos(a) * r, z = zn.z + Math.sin(a) * r;
        if (!roadClear(x, z)) continue;
        const nm = name === 'rock' ? ['rock_a', 'rock_b', 'rock_c'][Math.floor(rng() * 3)] : name;
        const info = PROP_INFO[nm] || [1, 0.5, 0.2];
        placeProp(stage, nm, x, z, { rot: rng() * Math.PI * 2, scale: 1 + (rng() - 0.5) * info[2] });
      }
    }
  }
  // 지역 사이 빈 들판에도 드문드문
  for (let i = 0; i < 420; i++) {
    const x = (rng() * 2 - 1) * WORLD_SIZE, z = (rng() * 2 - 1) * WORLD_SIZE;
    if (Math.hypot(x, z) > WORLD_SIZE - 4 || zoneAt(x, z) || !roadClear(x, z)) continue;
    const nm = ['tree_dead_l', 'n_tree2', 'tree', 'n_rock1', 'trees', 'n_pine1', 'n_bush', 'n_grass', 'n_dead1', 'n_stump'][Math.floor(rng() * 10)];
    placeProp(stage, nm, x, z, { rot: rng() * 6.28, scale: 0.9 + rng() * 0.3 });
  }
  // 맵 테두리: 빽빽한 죽은 숲
  for (let i = 0; i < 340; i++) {
    const a = (i / 340) * Math.PI * 2 + rng() * 0.02, r = WORLD_SIZE + 1 + rng() * 6;
    placeProp(stage, ['tree_dead_l', 'n_pine2', 'n_dead2', 'tree_pine'][Math.floor(rng() * 4)], Math.cos(a) * r, Math.sin(a) * r, { rot: rng() * 6.28, scale: 1.2 + rng() * 0.5, collide: false });
  }
  flushProps(stage);
  buildTown(stage);
}

function buildTown(stage) {
  const B = 6; // 육각 마을 건물 배율
  const houses = [
    ['tavern', -11, -8, 0.4, 3.8], ['blacksmith', 11, -8, -0.4, 3.8], ['market', 0, -13, 0, 4.2],
    ['home_a', -14, 4, 1.2, 3], ['home_b', 14, 5, -1.1, 3.2], ['church', -6, -17, 0.2, 3.6],
    ['home_a', 7, -18, -0.3, 3], ['home_b', -17, -4, 1.6, 3.2],
  ];
  for (const [name, x, z, rot, r] of houses) {
    const o = cloneProp(name);
    o.scale.setScalar(B);
    o.position.set(x, 0, z);
    o.rotation.y = rot;
    stage.scene.add(o);
    stage.colliders.push({ x, z, r });
  }
  const well = cloneProp('well');
  well.scale.setScalar(4);
  well.position.set(0, 0, -3);
  stage.scene.add(well);
  stage.colliders.push({ x: 0, z: -3, r: 1.6 });
  // 울타리 (길 쪽은 비운다)
  const rng = seeded(5);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const gate = [Math.PI / 2, -Math.PI / 2, Math.PI, 0].some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.16);
    if (gate) continue;
    const r = TOWN.r;
    const f = cloneProp('fence_wood');
    f.scale.setScalar(2.2);
    f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    f.rotation.y = -a;
    stage.scene.add(f);
    stage.colliders.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, r: 1.1 });
  }
  // 횃불 (빛)
  const torchSpots = [[-4, 4], [4, 4], [-5, -8], [5, -8], [0, TOWN.r - 1.5], [0, -TOWN.r + 1.5], [TOWN.r - 1.5, 0], [-TOWN.r + 1.5, 0]];
  torchSpots.forEach(([x, z], i) => {
    const post = cloneProp('post');
    post.position.set(x, 0, z);
    post.scale.setScalar(0.8);
    stage.scene.add(post);
    const t = cloneProp('torch');
    t.position.set(x, 2.7, z);
    t.scale.setScalar(1.3);
    stage.scene.add(t);
    if (i < (isTouch ? 3 : 6)) {
      const l = new THREE.PointLight(0xff8a3a, 14, 12, 1.8);
      l.position.set(x, 3.4, z);
      stage.scene.add(l);
      stage.torches.push(l);
    }
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff9a40, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.position.set(x, 3.25, z);
    flame.scale.setScalar(1.1);
    stage.scene.add(flame);
    stage.colliders.push({ x, z, r: 0.4 });
  });
  for (const [n, x, z, r] of [['barrel', -8, 2, 0], ['barrel', -8.8, 3.2, 1], ['crates', 9, 2, 0.4], ['table', 4, -6, 1.57], ['box', -3, -9, 0.3], ['banner', 2.5, -13.4, 0]]) {
    placeProp(stage, n, x, z, { rot: r });
  }
}

// 충돌: 원형 장애물에서 밀어낸다. 장애물이 많아 칸(8×8)으로 나눠 가까운 것만 본다
const CELL = 8;
function grid(stage) {
  if (stage.grid && stage.gridN === stage.colliders.length) return stage.grid;
  const g = new Map();
  for (const c of stage.colliders) {
    const r = c.r + 1;
    for (let gx = Math.floor((c.x - r) / CELL); gx <= Math.floor((c.x + r) / CELL); gx++)
      for (let gz = Math.floor((c.z - r) / CELL); gz <= Math.floor((c.z + r) / CELL); gz++) {
        const k = gx * 10007 + gz;
        if (!g.has(k)) g.set(k, []);
        g.get(k).push(c);
      }
  }
  stage.grid = g; stage.gridN = stage.colliders.length;
  return g;
}
export function resolveCollision(stage, p, radius = 0.5) {
  const list = grid(stage).get(Math.floor(p.x / CELL) * 10007 + Math.floor(p.z / CELL)) || [];
  for (const c of list) {
    const dx = p.x - c.x, dz = p.z - c.z;
    const min = c.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      p.x = c.x + (dx / d) * min;
      p.z = c.z + (dz / d) * min;
    }
  }
  const d = Math.hypot(p.x, p.z);
  if (d > WORLD_SIZE) { p.x *= WORLD_SIZE / d; p.z *= WORLD_SIZE / d; }
}

export { zoneAt };
