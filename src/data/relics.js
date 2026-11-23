// v0.44.47 유물 · 유물 제단 (기획서 2-4). 유물은 미지의 땅에서만 얻는다 (범람 보스는 주지 않는다 — 사용자 결정).
export const RELICS = [
  { id: 'r_prod', name: '풍요의 뿔', kind: '마을', key: 'prod', v: 20, text: (v) => `광산 · 약초밭 생산 +${v}%` },
  { id: 'r_safe', name: '수호의 부적', kind: '마을', key: 'safe', v: 30, text: (v) => `파견 사망 확률 -${v}%` },
  { id: 'r_exp', name: '현자의 두루마리', kind: '캐릭터', key: 'exp', v: 10, text: (v) => `경험치 +${v}%` },
  { id: 'r_mf', name: '행운의 동전', kind: '캐릭터', key: 'mf', v: 30, text: (v) => `좋은 아이템 발견 +${v}%` },
  { id: 'r_dmg', name: '전쟁의 깃발', kind: '캐릭터', key: 'dmg', v: 5, text: (v) => `피해 +${v}%` },
  { id: 'r_dr', name: '거인의 방패 조각', kind: '캐릭터', key: 'dr', v: 5, text: (v) => `받는 피해 -${v}%` },
  { id: 'r_move', name: '바람의 깃털', kind: '캐릭터', key: 'move', v: 8, text: (v) => `이동 속도 +${v}%` },
  { id: 'r_lab', name: '학자의 촛대', kind: '마을', key: 'lab', v: 15, text: (v) => `연구 시간 -${v}%` },
  { id: 'r_calm', name: '정화의 성수', kind: '마을', key: 'calm', v: 30, text: (v) => `범람 불이익 -${v}%` },
  { id: 'r_ess', name: '정수의 결정', kind: '둘 다', key: 'ess', v: 20, text: (v) => `정수 얻을 확률 +${v}%` },
  { id: 'r_inn', name: '나그네의 등불', kind: '마을', key: 'inn', v: 2, text: (v) => `여관에 찾아오는 용병 등급 +${v}단계` },
  { id: 'r_gold', name: '황금 잔', kind: '둘 다', key: 'gold', v: 15, text: (v) => `금화 +${v}% (사냥 · 파견)` },
];
export const RELIC = Object.fromEntries(RELICS.map((r) => [r.id, r]));
export const RELIC_GRADES = [{ name: '일반', k: 1, days: 3, color: '#d8d2c4' }, { name: '희귀', k: 1.5, days: 5, color: '#6aa8ff' }, { name: '전설', k: 2, days: 7, color: '#ffb040' }];
export const altarSlots = (lv) => (lv >= 20 ? 7 : lv >= 15 ? 6 : lv >= 10 ? 5 : lv >= 8 ? 4 : lv >= 5 ? 3 : lv >= 3 ? 2 : lv >= 1 ? 1 : 0);
export const altarDur = (lv) => 1 + (lv > 10 ? 0.4 + 0.05 * (lv - 10) : lv >= 10 ? 0.4 : lv >= 8 ? 0.3 : lv >= 5 ? 0.2 : lv >= 3 ? 0.1 : 0);
export const altarOdds = (lv) => (lv >= 9 ? [15, 55, 30] : lv >= 7 ? [30, 55, 15] : lv >= 5 ? [50, 45, 5] : lv >= 3 ? [75, 25, 0] : [100, 0, 0]);
export function rollRelic(altarLv, rng = Math.random) {
  const o = altarOdds(altarLv), r = rng() * 100, g = r < o[0] ? 0 : r < o[0] + o[1] ? 1 : 2;
  return { id: RELICS[Math.floor(rng() * RELICS.length)].id, g };
}
export const relicV = (r) => Math.round(RELIC[r.id].v * RELIC_GRADES[r.g].k);
// 올린 유물 효과 (같은 효과는 가장 큰 하나만)
export function relicBonus(st, key, now = Date.now()) {
  let best = 0;
  for (const r of st?.relics?.on || []) if (r.until > now && RELIC[r.id]?.key === key) best = Math.max(best, relicV(r));
  return best;
}
