// 칭호(전직): 직업을 고르지 않는다. 각성 20 · 40 · 60에 가장 많이 키운 스탯 둘로 갈래가 정해진다.
// 순수 5 + 혼합 10 = 15갈래 × 3단계. 특성은 스탯마다의 "조건 조각" + "효과 조각"을 이어 만든다 (회복 효과는 없다).
import { STATS } from './config.js';

export const TITLE_AT = [20, 40, 60];

// 갈래 이름 (두 스탯은 STATS 순서로 정렬한 키)
export const TITLE_NAMES = {
  str: ['전사', '광전사', '전쟁군주'],
  dex: ['사냥꾼', '명사수', '바람의 궁신'],
  int: ['마법사', '원소술사', '대마도사'],
  wis: ['수련사', '예언자', '성현'],
  vit: ['파수꾼', '수호자', '불굴의 성벽'],
  'str+dex': ['검객', '검무사', '검성'],
  'str+int': ['마검사', '마검 기사', '마검성'],
  'str+wis': ['성전사', '성기사', '성기사단장'],
  'str+vit': ['투사', '철기병', '철혈의 군주'],
  'dex+int': ['마궁사', '원소 궁수', '별빛 사수'],
  'dex+wis': ['순례자', '바람의 추적자', '영혼 사냥꾼'],
  'dex+vit': ['정찰병', '레인저', '황야의 왕'],
  'int+wis': ['학자', '현자', '대현자'],
  'int+vit': ['전투 마법사', '주문 기사', '마도 장군'],
  'wis+vit': ['수도사', '수호 수도사', '금강'],
};

// 조건 조각: trig = 일어나는 일, p = 확률
export const TRIGGERS = {
  str: [{ id: 'meleeHit', text: '근접 공격이 맞으면', p: 0.15 }, { id: 'kill', text: '적을 쓰러뜨리면', p: 0.4 }],
  dex: [{ id: 'rangedHit', text: '화살이 맞으면', p: 0.15 }, { id: 'crit', text: '치명타가 나면', p: 0.35 }, { id: 'dodge', text: '피하면', p: 1 }],
  int: [{ id: 'spell', text: '공격 주문을 쓰면', p: 0.35 }, { id: 'kill', text: '적을 쓰러뜨리면', p: 0.3 }],
  wis: [{ id: 'buff', text: '보조 주문을 쓰면', p: 1 }, { id: 'spell', text: '주문을 쓰면', p: 0.25 }],
  vit: [{ id: 'hurt', text: '맞으면', p: 0.2 }, { id: 'block', text: '막으면', p: 0.6 }],
};
// 효과 조각: v = 1단계 세기 (단계마다 ×1.4 · ×1.8)
export const EFFECTS = {
  str: [{ id: 'might', text: (v) => `3초 동안 피해 +${v}%`, v: 15 }, { id: 'shock', text: (v) => `주변에 무기 피해 ${v}% 충격파`, v: 60 }],
  dex: [{ id: 'haste', text: (v) => `3초 동안 공격 속도 +${v}%`, v: 20 }, { id: 'arrow', text: (v) => `가까운 적에게 화살 한 발 (무기 피해 ${v}%)`, v: 70 }],
  int: [{ id: 'blast', text: (v) => `원소 폭발 (주문 피해 ${v})`, v: 30 }, { id: 'chill', text: (v) => `주변 적 ${v / 10}초 느리게`, v: 20 }],
  wis: [{ id: 'mp', text: (v) => `MP ${v} 회복`, v: 6 }, { id: 'ward', text: (v) => `3초 동안 받는 피해 -${v}%`, v: 20 }],
  vit: [{ id: 'ward', text: (v) => `3초 동안 받는 피해 -${v}%`, v: 20 }, { id: 'thorns', text: (v) => `가까운 적에게 무기 피해 ${v}% 반격`, v: 50 }],
};
const TIER_K = [1, 1.4, 1.8];

// 스탯에서 갈래 키: 시작값(10)을 뺀 성장량으로 본다
export function titleKey(stats, start = 10) {
  const g = STATS.map((s) => [s, Math.max(0, stats[s] - start)]).sort((a, b) => b[1] - a[1]);
  if (g[1][1] < g[0][1] * 0.6) return g[0][0];
  return [g[0][0], g[1][0]].sort((a, b) => STATS.indexOf(a) - STATS.indexOf(b)).join('+');
}

// 갈래의 특성 후보 셋 (같은 갈래 · 단계면 늘 같은 셋)
export function perkChoices(key, tier) {
  const parts = key.split('+'), pool = [];
  const pairs = parts.length === 1 ? [[parts[0], parts[0]]] : [[parts[0], parts[1]], [parts[1], parts[0]]];
  for (const [a, b] of pairs) for (const t of TRIGGERS[a]) for (const e of EFFECTS[b]) pool.push({ trig: t.id, p: t.p, eff: e.id, v: Math.round(e.v * TIER_K[tier]), text: `${t.text} ${e.text(Math.round(e.v * TIER_K[tier]))}` });
  // 갈래 · 단계로 정해지는 순서로 섞어 셋
  let h = [...key].reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, 7 + tier * 101);
  const out = [];
  while (out.length < 3 && pool.length) { h = (h * 1103515245 + 12345) >>> 0; out.push(pool.splice(h % pool.length, 1)[0]); }
  return out;
}

export const titleName = (key, tier) => TITLE_NAMES[key]?.[tier] || '방랑자';
