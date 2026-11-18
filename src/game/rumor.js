// v0.46 소문 지도 · 숨은 던전 (화면과 무관한 규칙)
// 사냥 · 파견에서 나온 「알 수 없는 지도 조각」을 연구소에서 분석하면
//   70% 미지의 땅 조각(map_piece, 5개로 미지의 지도) · 30% 소문 (숨은 던전 하나)
// 소문은 내가 보스를 잡은 가장 높은 지역에서 두 단계 아래까지의 지역에 생긴다 (높은 지역일수록 자주).
// 그 지역에 가면 맵 어딘가에 입구가 나타나고, 깨면 보물 상자 셋 중 하나를 고른다 (한 번뿐).
// 연구소에서 재료를 넣어 소문 지도를 강화하면 (+1 ~ +5) 더 세지고 보상이 좋아진다 (+2부터 신화).
import { ZONES } from '../data/world.js';
import { townOf, findBuilding, bonusOf, resAdd, resTake, resCount } from './town.js';

export const RUMOR_MAX = 5;
export const ANALYZE_MIN = 10; // 한 장 분석 시간(분) — 연구소 용병 학식으로 최대 절반
export const RUMOR_P = 0.3;
export const PLUS_MAX = 5;
// 강화 단계마다: 몬스터 체력 · 공격력 배율, 보상 전설 · 신화 확률, 보상 아이템 레벨 더하기, 강화 재료
export const PLUS = [
  { hp: 1.3, dmg: 1.3, legend: 0.04, myth: 0, lv: 0 },
  { hp: 2.2, dmg: 1.6, legend: 0.06, myth: 0, lv: 4, cost: { gold: 200000, ore2: 10, map_piece: 2 } },
  { hp: 3.4, dmg: 2.0, legend: 0.08, myth: 0.004, lv: 8, cost: { gold: 600000, ore2: 30, map_piece: 3 } },
  { hp: 5, dmg: 2.5, legend: 0.1, myth: 0.008, lv: 12, cost: { gold: 1500000, ore3: 5, map_piece: 5 } },
  { hp: 7, dmg: 3.1, legend: 0.12, myth: 0.014, lv: 16, cost: { gold: 4000000, ore3: 15, map_piece: 8 } },
  { hp: 10, dmg: 3.8, legend: 0.15, myth: 0.022, lv: 20, cost: { gold: 10000000, ore3: 30, map_piece: 12 } },
];
export const PLUS_NAME = (p) => (p ? `+${p}` : '');

// 보스를 잡은 지역 번호들 (bossCleared는 world에서 넘겨받는다)
export function rumorZones(cleared) {
  if (!cleared.length) return [];
  const top = Math.max(...cleared);
  return cleared.filter((i) => i >= top - 2);
}
// 높은 지역일수록 자주: 가장 높은 곳 3 · 하나 아래 2 · 둘 아래 1
export function pickRumorZone(cleared, rng = Math.random) {
  const ok = rumorZones(cleared); if (!ok.length) return -1;
  const top = Math.max(...ok), w = ok.map((i) => 3 - (top - i)), s = w.reduce((a, v) => a + v, 0);
  let r = rng() * s; for (let k = 0; k < ok.length; k++) { r -= w[k]; if (r < 0) return ok[k]; }
  return ok[ok.length - 1];
}

export const rumorsOf = (st) => (st.rumors ||= []);
export const analyzeTime = (st, n) => Math.round(n * ANALYZE_MIN * 60000 * (1 - bonusOf(st, 'lab')));

// 분석 맡기기: 알 수 없는 조각 n장
export function analyzeStart(st, n, now = Date.now()) {
  const t = townOf(st), lab = findBuilding(st, 'lab');
  if (!lab) return { ok: false, why: '연구소가 없습니다' };
  if (t.mapLab) return { ok: false, why: '이미 분석 중입니다' };
  n = Math.min(n, resCount(st, 'odd_map'));
  if (n <= 0) return { ok: false, why: '알 수 없는 지도 조각이 없습니다' };
  resTake(st, 'odd_map', n);
  t.mapLab = { n, from: now, until: now + analyzeTime(st, n) };
  return { ok: true };
}
// 분석이 끝났으면 결과를 낸다: { pieces, rumors: [zi...] } (소문 자리가 없으면 조각으로)
export function analyzeDone(st, cleared, now = Date.now(), rng = Math.random) {
  const t = townOf(st);
  if (!t.mapLab || now < t.mapLab.until) return null;
  const n = t.mapLab.n; t.mapLab = null;
  const R = rumorsOf(st), out = { n, pieces: 0, rumors: [] };
  for (let k = 0; k < n; k++) {
    const zi = rng() < RUMOR_P && R.length < RUMOR_MAX ? pickRumorZone(cleared, rng) : -1;
    if (zi >= 0) { R.push({ id: `${now.toString(36)}${k}${Math.floor(rng() * 1e4)}`, zi, plus: 0 }); out.rumors.push(zi); } else out.pieces++;
  }
  if (out.pieces) resAdd(st, 'map_piece', out.pieces);
  return out;
}

// 소문 지도 강화
export function rumorUpgrade(st, id) {
  const r = rumorsOf(st).find((x) => x.id === id);
  if (!r) return { ok: false, why: '소문이 없습니다' };
  if (r.plus >= PLUS_MAX) return { ok: false, why: '최고 단계입니다' };
  const c = PLUS[r.plus + 1].cost;
  if (st.gold < c.gold) return { ok: false, why: '금화가 모자랍니다' };
  for (const [k, v] of Object.entries(c)) if (k !== 'gold' && resCount(st, k) < v) return { ok: false, why: '재료가 모자랍니다' };
  st.gold -= c.gold;
  for (const [k, v] of Object.entries(c)) if (k !== 'gold') resTake(st, k, v);
  r.plus++; r.x = r.z = undefined; // 강화하면 입구 자리도 새로 (다시 찾는다)
  return { ok: true, plus: r.plus };
}
export const rumorName = (r) => `${ZONES[r.zi]?.name || ''} 숨은 던전${r.plus ? ` +${r.plus}` : ''}`;
