// 2D 쿼터뷰 화면: 카메라 · 땅 타일 · 배경 물건 · 앞뒤 정렬 · 조명. 게임 규칙의 좌표(x, z)는 그대로 쓴다
// 투영: 화면 x = x·48, 화면 y = z·24 − 높이·48 (Flare 타일 192×96 하나 = 세계 (2, 2) 대각)
import { ZONES, TOWN, WORLD_SIZE } from '../data/world.js';
import { ZONE_LOOK, ZONE_PROPS, FLAT } from '../data/flareWorld.js';
import { DATA, image, drawRect } from './sprites.js';
import { seeded } from '../game/rng.js';

export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
export const PX = 64, PZ = 32, PY = 64;
// 땅 타일(192×96) 한 칸 = 세계 STEP칸 대각
const STEP = 96 / PX;

export function zoneAt(x, z) {
  for (const zn of ZONES) if (Math.hypot(x - zn.x, z - zn.z) < zn.r) return zn;
  return null;
}
function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const noise = (x, z) => (Math.sin(x * 0.11 + Math.cos(z * 0.07) * 2) + Math.sin(z * 0.09 + Math.sin(x * 0.05) * 2)) / 4 + 0.5;

// 이 칸(타일 i, j)의 땅: [타일 묶음, 번호]
function groundAt(i, j) {
  const x = (i - j) * STEP, z = (i + j) * STEP;
  const h = hash(i, j);
  const dT = Math.hypot(x, z);
  if (dT < TOWN.r * 0.75) return pick('town', h);
  for (const zn of ZONES) if (distToSeg(x, z, 0, 0, zn.x * 0.72, zn.z * 0.72) < 2.6 + noise(x, z) * 1.5) return pick('town', h);
  // 지역 경계는 들쭉날쭉하게
  let zn = null;
  for (const z0 of ZONES) if (Math.hypot(x - z0.x, z - z0.z) < z0.r * (1.05 + (noise(x * 2, z * 2) - 0.5) * 0.3)) { zn = z0; break; }
  const L = ZONE_LOOK[zn ? zn.id : 'wild'];
  const lake = inLake(x, z);
  if (lake) return [lake.set, 176 + Math.floor(h * 16), true];
  if (L.water && noise(x * 1.7 + 50, z * 1.7) > 0.72) return [L.set, L.water[0] + Math.floor(h * (L.water[1] - L.water[0] + 1)), true];
  if (L.patch && noise(x * 1.3 + 9, z * 1.3) > 0.68) return [L.set, L.patch[0] + Math.floor(h * (L.patch[1] - L.patch[0] + 1))];
  return [L.set, L.ground[0] + Math.floor(h * (L.ground[1] - L.ground[0] + 1))];
}
// ───── 지형: 호수 · 바위 능선 (지역마다 정해진 자리) ─────
const roadDist = (x, z) => Math.min(Math.hypot(x, z) - TOWN.r, ...ZONES.map((zn) => distToSeg(x, z, 0, 0, zn.x * 0.72, zn.z * 0.72)));
export const LAKES = [], RIDGES = [];
{
  const rng = seeded(4242);
  for (const zn of ZONES) {
    const L = ZONE_LOOK[zn.id];
    const lakes = L.set === 'cave' ? 0 : zn.id === 'swamp' ? 3 : 1 + (rng() < 0.6 ? 1 : 0);
    for (let k = 0, tries = 0; k < lakes && tries < 60; tries++) {
      const a = rng() * 6.28, d = rng() * zn.r * 0.75, r = 4.5 + rng() * 4.5;
      const x = zn.x + Math.cos(a) * d, z = zn.z + Math.sin(a) * d;
      if (roadDist(x, z) < r + 5 || LAKES.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + r + 6)) continue;
      LAKES.push({ x, z, r, set: L.set }); k++;
    }
    // 바위 능선: 반원 모양으로 늘어선 바위, 가운데에 지나갈 틈
    for (let k = 0, tries = 0; k < 2 && tries < 60; tries++) {
      const a = rng() * 6.28, d = zn.r * (0.3 + rng() * 0.5), len = 9 + rng() * 8, dir = rng() * 6.28;
      const x = zn.x + Math.cos(a) * d, z = zn.z + Math.sin(a) * d;
      const x2 = x + Math.cos(dir) * len, z2 = z + Math.sin(dir) * len;
      if (roadDist(x, z) < 5 || roadDist(x2, z2) < 5 || roadDist((x + x2) / 2, (z + z2) / 2) < 5) continue;
      if (LAKES.some((q) => distToSeg(q.x, q.z, x, z, x2, z2) < q.r + 3)) continue;
      RIDGES.push({ x, z, x2, z2, gap: 0.35 + rng() * 0.3, set: L.set }); k++;
    }
  }
}
export function inLake(x, z, pad = 0) {
  for (const q of LAKES) if (Math.hypot(x - q.x, z - q.z) < q.r * (1 + (noise(x * 1.9, z * 1.9) - 0.5) * 0.35) + pad) return q;
  return null;
}

function pick(look, h) { const L = ZONE_LOOK[look]; return [L.set, L.ground[0] + Math.floor(h * (L.ground[1] - L.ground[0] + 1))]; }

export function createStage(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const stage = {
    canvas, ctx, zoom: 1, userZoom: 1, cam: { x: 0, z: 0 }, W: 0, H: 0, pr: Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2),
    colliders: [], props: new Map(), flats: [], drawables: new Set(), groundLayers: [], topLayers: [], shakeK: 0, time: 0,
    light: true,
  };
  stage.resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * stage.pr); canvas.height = Math.round(h * stage.pr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    stage.W = w; stage.H = h;
    stage.baseZoom = Math.max(0.55, Math.min(1, h / 1000)); // 세로 1000px에서 Flare 원래 크기, 휴대폰은 0.5
  };
  stage.resize();
  window.addEventListener('resize', stage.resize);
  stage.setPixelRatio = (pr) => { stage.pr = pr; stage.resize(); };
  const Z = () => stage.baseZoom * stage.userZoom;
  stage.scale = Z;
  stage.toScreen = (x, z, y = 0) => ({ x: (x - stage.cam.x) * PX * Z() + stage.W / 2, y: (z - stage.cam.z) * PZ * Z() - y * PY * Z() + stage.H / 2 });
  stage.toWorld = (sx, sy) => ({ x: (sx - stage.W / 2) / (PX * Z()) + stage.cam.x, z: (sy - stage.H / 2) / (PZ * Z()) + stage.cam.z });
  stage.onScreen = (x, z, r = 3) => {
    const s = stage.toScreen(x, z), m = r * PX * Z();
    return s.x > -m && s.x < stage.W + m && s.y > -m * 1.5 && s.y < stage.H + m;
  };
  stage.shake = (k) => { stage.shakeK = Math.min(1, Math.max(stage.shakeK, k)); };
  stage.follow = (x, z, dt = 1) => {
    const k = Math.min(1, dt * 8);
    stage.cam.x += (x - stage.cam.x) * k;
    stage.cam.z += (z - stage.cam.z) * k;
    stage.shakeK = Math.max(0, stage.shakeK - dt * 2.5);
  };
  stage.add = (d) => stage.drawables.add(d);
  stage.remove = (d) => stage.drawables.delete(d);
  stage.scene = { add: stage.add, remove: stage.remove }; // 예전 코드와 맞춤
  stage.render = (dt) => render(stage, dt);
  stage.debugColliders = false;
  return stage;
}

// ───── 배경 물건 ─────
const CHUNK = 16;
function addProp(stage, set, id, x, z, r) {
  const t = DATA.tiles[set]?.tiles[id];
  if (!t) return;
  const p = { set, id, x, z, t };
  if (FLAT.has(set + '|' + id)) stage.flats.push(p);
  else {
    const key = Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);
    if (!stage.props.has(key)) stage.props.set(key, []);
    stage.props.get(key).push(p);
  }
  if (r > 0) stage.colliders.push({ x, z, r });
}

export function buildWorldProps(stage) {
  const rng = seeded(1234);
  const roadClear = (x, z) => {
    if (Math.hypot(x, z) < TOWN.r + 3) return false;
    for (const zn of ZONES) if (distToSeg(x, z, 0, 0, zn.x * 0.72, zn.z * 0.72) < 4.5) return false;
    return true;
  };
  // 호수: 못 지나가게 판정을 채우고 둘레에 갈대 · 바위
  for (const q of LAKES) {
    for (let u = -q.r * 1.3; u <= q.r * 1.3; u += 1.3) for (let v = -q.r * 1.3; v <= q.r * 1.3; v += 1.3) if (inLake(q.x + u, q.z + v, -0.6)) stage.colliders.push({ x: q.x + u, z: q.z + v, r: 1.05 });
    for (let i = 0; i < 26; i++) {
      const a = rng() * 6.28, d = q.r * (1.02 + rng() * 0.25), x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d;
      if (inLake(x, z, 0.3)) continue;
      const shore = q.set === 'snowplains' ? [[552, 567, 1], [112, 115, 0]] : [[114, 115, 0], [124, 127, 0], [128, 131, 1]];
      const [a0, a1, rr] = shore[Math.floor(rng() * shore.length)];
      addProp(stage, q.set, a0 + Math.floor(rng() * (a1 - a0 + 1)), x, z, rr);
    }
  }
  // 바위 능선: 큰 바위 기둥을 줄지어 세우고 가운데를 비운다
  for (const rd of RIDGES) {
    const len = Math.hypot(rd.x2 - rd.x, rd.z2 - rd.z), n = Math.ceil(len / 1.5);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (Math.abs(t - rd.gap) < 0.12) continue; // 틈
      const x = rd.x + (rd.x2 - rd.x) * t + (rng() - 0.5) * 0.5, z = rd.z + (rd.z2 - rd.z) * t + (rng() - 0.5) * 0.5;
      const ids = rd.set === 'snowplains' ? [132, 133, 134, 135] : rd.set === 'cave' ? [144, 145, 146, 147] : [132, 133, 134, 135];
      addProp(stage, rd.set === 'cave' ? 'cave' : rd.set, ids[Math.floor(rng() * ids.length)], x, z, 1.05);
    }
  }
  const free = (x, z) => !inLake(x, z, 1.5) && !RIDGES.some((rd) => distToSeg(x, z, rd.x, rd.z, rd.x2, rd.z2) < 1.6);
  for (const zn of ZONES) {
    for (const [set, ids, n, r] of ZONE_PROPS[zn.id] || []) {
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * zn.r * 1.05;
        const x = zn.x + Math.cos(a) * d, z = zn.z + Math.sin(a) * d;
        if (!roadClear(x, z) || !free(x, z)) continue;
        addProp(stage, set, ids[Math.floor(rng() * ids.length)], x, z, r);
      }
    }
  }
  // 지역 사이 들판
  for (let i = 0; i < 1400; i++) {
    const x = (rng() * 2 - 1) * WORLD_SIZE, z = (rng() * 2 - 1) * WORLD_SIZE;
    if (Math.hypot(x, z) > WORLD_SIZE - 4 || zoneAt(x, z) || !roadClear(x, z)) continue;
    const list = ZONE_PROPS.wild.flatMap(([set, ids, w, r]) => Array(w).fill([set, ids, r]));
    const [set, ids, r] = list[Math.floor(rng() * list.length)];
    addProp(stage, set, ids[Math.floor(rng() * ids.length)], x, z, r);
  }
  // 맵 테두리: 빽빽한 숲
  for (let k = 0; k < 2; k++) for (let i = 0; i < 520; i++) {
    const a = (i / 520) * Math.PI * 2 + rng() * 0.01, r = WORLD_SIZE + 1.5 + k * 3 + rng() * 2;
    addProp(stage, 'grassland', [248, 249, 250, 251, 244, 245, 252][Math.floor(rng() * 7)], Math.cos(a) * r, Math.sin(a) * r, 0);
  }
  buildTown(stage, rng);
}

// 잿빛 초소: 천막 · 모닥불 · 대장간 모루 · 상자 · 울타리 · 귀환 차원문
function buildTown(stage, rng) {
  addProp(stage, 'grassland', 265, 0, -2, 0);
  for (const [id, x, z, r] of [[296, -20, -12, 0], [296, 6, -15, 0], [100, -15, 3, 1.1], [101, 14, 4, 1.1], [76, -6, -13, 0.8], [102, -4, 6, 0.8], [103, 7, -6, 0.9],
    [96, 4, -12, 0.9], [98, 5.5, -12.5, 0.9], [99, -8, -13, 0.9], [100, -16, -6, 1], [76, 2.5, -9.5, 0.8], [77, -2.5, -10, 0.8], [138, 0, 14, 0.3], [139, 14, 0, 0.3]]) addProp(stage, 'grassland', id, x, z, r);
  // 오두막(296)은 기준점에서 오른쪽 위로 뻗은 큰 그림 → 바닥 자리에 판정을 깐다
  // 그림 기준점에서 바닥은 오른쪽(+7.3, −2.2)을 가운데로 한 마름모(반지름 약 6.5)
  for (const [x, z] of [[-20, -12], [6, -15]]) for (let a = -6; a <= 6; a += 1.2) for (let b = -6; b <= 6; b += 1.2) if (Math.abs(a) + Math.abs(b) <= 5.8) stage.colliders.push({ x: x + 7.3 + a, z: z - 2.2 + b, r: 0.9 });
  // 울타리 (길 쪽 네 방향은 비운다)
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const gate = [Math.PI / 2, -Math.PI / 2, Math.PI, 0].some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.17);
    if (gate) continue;
    addProp(stage, 'grassland', [104, 107, 104, 107][i % 4], Math.cos(a) * TOWN.r, Math.sin(a) * TOWN.r, 1.1);
  }
}
export function buildTerrain() {}

// ───── 충돌 (칸 격자로 가까운 것만) ─────
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

// ───── 그리기 ─────
const tileCache = new Map();
function tileAt(i, j) {
  const k = i * 100003 + j;
  let t = tileCache.get(k);
  if (!t) { t = groundAt(i, j); tileCache.set(k, t); if (tileCache.size > 60000) tileCache.clear(); }
  return t;
}
function drawTile(stage, ctx, set, id, sx, sy, s) {
  const def = DATA.tiles[set];
  const t = def?.tiles[id];
  if (!t) return;
  const src = image(def.imgs[t[0]]);
  if (!src.ok) return;
  drawRect(ctx, src.im, t.slice(1), sx, sy, s);
}

function render(stage, dt) {
  stage.time += dt;
  const { ctx, W, H } = stage;
  const s = stage.scale();
  ctx.setTransform(stage.pr, 0, 0, stage.pr, 0, 0);
  // 흔들림
  if (stage.shakeK > 0.001) { const k = stage.shakeK * stage.shakeK * 10; ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k); }
  ctx.fillStyle = '#0d0c0b';
  ctx.fillRect(-20, -20, W + 40, H + 40);
  // 땅: 화면 네 귀퉁이를 타일 좌표로 바꿔 그 안만
  const c0 = stage.toWorld(-100, -100), c1 = stage.toWorld(W + 100, H + 160);
  const ti = (x, z) => [(x + z) / (2 * STEP), (z - x) / (2 * STEP)];
  const pts = [ti(c0.x, c0.z), ti(c1.x, c0.z), ti(c0.x, c1.z), ti(c1.x, c1.z)];
  const i0 = Math.floor(Math.min(...pts.map((p) => p[0]))), i1 = Math.ceil(Math.max(...pts.map((p) => p[0])));
  const j0 = Math.floor(Math.min(...pts.map((p) => p[1]))), j1 = Math.ceil(Math.max(...pts.map((p) => p[1])));
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const x = (i - j) * STEP, z = (i + j) * STEP;
    if (x < c0.x - 4 || x > c1.x + 4 || z < c0.z - 4 || z > c1.z + 4) continue;
    if (Math.hypot(x, z) > WORLD_SIZE + 12) continue;
    const [set, id, wet] = tileAt(i, j);
    const p = stage.toScreen(x, z);
    drawTile(stage, ctx, set, id, p.x, p.y, s);
    if (wet) { // 물: 푸른 빛 + 일렁임
      const w = 97 * s, h = 48.5 * s, k = 0.5 + 0.5 * Math.sin(stage.time * 1.6 + x * 0.7 + z * 0.9);
      ctx.fillStyle = set === 'snowplains' ? `rgba(120,170,210,${0.32 + k * 0.08})` : `rgba(40,110,140,${0.36 + k * 0.1})`;
      ctx.beginPath(); ctx.moveTo(p.x - w, p.y); ctx.lineTo(p.x, p.y - h); ctx.lineTo(p.x + w, p.y); ctx.lineTo(p.x, p.y + h); ctx.fill();
      if (k > 0.85) { ctx.fillStyle = 'rgba(200,235,255,0.12)'; ctx.fillRect(p.x - w * 0.3, p.y - 2 * s, w * 0.5, 2 * s); }
    }
  }
  for (const f of stage.flats) {
    if (!stage.onScreen(f.x, f.z, 3)) continue;
    const p = stage.toScreen(f.x, f.z);
    drawTile(stage, ctx, f.set, f.id, p.x, p.y, s);
  }
  for (const g of stage.groundLayers) g(ctx, stage);
  // 서 있는 것들: 배경 물건 + 인물 + 효과를 z(화면 아래쪽)로 정렬
  const list = [];
  const cx0 = Math.floor(c0.x / CHUNK) - 1, cx1 = Math.floor(c1.x / CHUNK) + 1, cz0 = Math.floor(c0.z / CHUNK) - 1, cz1 = Math.floor(c1.z / CHUNK) + 2;
  for (let a = cx0; a <= cx1; a++) for (let b = cz0; b <= cz1; b++) {
    const arr = stage.props.get(a + ',' + b);
    if (arr) for (const p of arr) list.push(p);
  }
  for (const d of stage.drawables) if (d.visible !== false) list.push(d);
  list.sort((a, b) => a.z - b.z);
  for (const o of list) {
    if (o.t) { const p = stage.toScreen(o.x, o.z); drawTile(stage, ctx, o.set, o.id, p.x, p.y, s); }
    else o.draw(ctx, stage);
  }
  for (const g of stage.topLayers) g(ctx, stage);
  if (stage.debugColliders) { ctx.strokeStyle = '#f0f'; for (const c of stage.colliders) { if (!stage.onScreen(c.x, c.z, c.r + 2)) continue; const p = stage.toScreen(c.x, c.z); ctx.beginPath(); ctx.ellipse(p.x, p.y, c.r * PX * s, c.r * PZ * s, 0, 0, 7); ctx.stroke(); } }
  // 조명: 지역 색감 + 플레이어 둘레만 밝은 어둠 (디아블로식)
  const zn = zoneAt(stage.cam.x, stage.cam.z);
  const grade = ZONE_LOOK[zn ? zn.id : Math.hypot(stage.cam.x, stage.cam.z) < TOWN.r ? 'town' : 'wild']?.grade;
  if (grade) { ctx.fillStyle = grade; ctx.fillRect(0, 0, W, H); }
  if (stage.light) {
    const p = stage.toScreen(stage.cam.x, stage.cam.z, 1);
    const r = Math.max(W, H) * 0.62;
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.18, p.x, p.y, r);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

// 이 자리가 장애물에 막혔나 (반경 r)
export function blockedAt(stage, x, z, r = 0.5) {
  const list = grid(stage).get(Math.floor(x / CELL) * 10007 + Math.floor(z / CELL)) || [];
  for (const c of list) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + r) ** 2) return true;
  return Math.hypot(x, z) > WORLD_SIZE;
}
// 두 점 사이 직선이 트였나
export function clearLine(stage, a, b, r = 0.5) {
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.6);
  for (let i = 1; i < n; i++) if (blockedAt(stage, a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n, r)) return false;
  return true;
}
// 격자 길찾기 (A*, 칸 1). 막힌 길을 돌아가는 꺾인 점들을 돌려준다 (못 찾으면 null)
export function findPath(stage, from, to, r = 0.5, maxNodes = 1800) {
  const S = 1, key = (i, j) => i * 4096 + j;
  const si = Math.round(from.x / S), sj = Math.round(from.z / S), ti = Math.round(to.x / S), tj = Math.round(to.z / S);
  const open = [[si, sj, 0, Math.hypot(ti - si, tj - sj)]], came = new Map(), gs = new Map([[key(si, sj), 0]]);
  let seen = 0;
  while (open.length && seen++ < maxNodes) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (open[k][2] + open[k][3] < open[bi][2] + open[bi][3]) bi = k;
    const [i, j, g] = open.splice(bi, 1)[0];
    if (Math.abs(i - ti) <= 1 && Math.abs(j - tj) <= 1) {
      const pts = [{ x: to.x, z: to.z }];
      let k = key(i, j);
      while (came.has(k)) { const [a, b] = came.get(k); pts.push({ x: a * S, z: b * S }); k = key(a, b); }
      pts.reverse();
      // 직선으로 갈 수 있는 점은 건너뛴다
      const out = []; let cur = from;
      for (let n = 0; n < pts.length; n++) {
        const next = pts[n + 1];
        if (!next || !clearLine(stage, cur, next, r)) { out.push(pts[n]); cur = pts[n]; }
      }
      return out;
    }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = i + di, nj = j + dj, nk = key(ni, nj), ng = g + (di && dj ? 1.414 : 1);
      if (ng >= (gs.get(nk) ?? Infinity)) continue;
      if (blockedAt(stage, ni * S, nj * S, r)) continue;
      gs.set(nk, ng); came.set(nk, [i, j]);
      open.push([ni, nj, ng, Math.hypot(ti - ni, tj - nj)]);
    }
  }
  return null;
}
