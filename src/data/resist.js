// v0.44.41 몬스터 저항 · 혼합 상태 이상 · 혼합 전용 장비
import { MONSTERS } from './world.js';
import { UNIQUES, UNIQUE_BASE } from './titles.js';

// 저항: 받는 물리 · 마법 피해를 줄인다 (음수 = 약점). 몬스터 이름으로 무리를 나눈다
const RES_RULES = [
  [/유령|망령|원혼|그림자|영혼|혼령|레이스|귀신|원령/, { phys: 0.35, mag: -0.15, tag: '영체' }],
  [/해골|스켈레톤|뼈|구울|좀비|미라|시체/, { phys: 0.25, mag: -0.1, tag: '언데드' }],
  [/골렘|석상|거신|수호상|돌|바위|강철/, { phys: 0.3, mag: -0.1, tag: '단단한 몸' }],
  [/마법사|주술|마녀|사제|리치|마도|드루이드|무당|술사/, { phys: -0.1, mag: 0.3, tag: '마력' }],
  [/악마|임프|마귀|데몬|지옥/, { phys: 0, mag: 0.2, tag: '마족' }],
  [/슬라임|점액|젤리/, { phys: 0.15, mag: -0.15, tag: '물렁한 몸' }],
  [/기사|중갑|판금|수호자|근위/, { phys: 0.2, mag: 0, tag: '갑옷' }],
  [/용|비룡|드레이크|와이번/, { phys: 0.1, mag: 0.1, tag: '용족' }],
  [/정령|원소/, { phys: 0.1, mag: 0.2, tag: '정령' }],
];
const cache = {};
export function monsterRes(type) {
  if (cache[type]) return cache[type];
  const n = MONSTERS[type]?.name || '';
  const r = RES_RULES.find(([re]) => re.test(n));
  return (cache[type] = r ? r[1] : { phys: 0, mag: 0, tag: null });
}

// 혼합 스킬 상태 이상 (두 스탯 조합마다 하나, 세 스탯은 앞 두 조합)
export const MIX_FX = {
  'str+dex': { id: 'bleed', name: '출혈', text: '3초 동안 준 피해의 30%를 더 깎는다' },
  'str+int': { id: 'vuln', name: '원소 상처', text: '4초 동안 받는 피해 +15%' },
  'str+wis': { id: 'shield', name: '낙인', text: '준 피해의 6%만큼 보호막' },
  'str+vit': { id: 'root', name: '기절', text: '0.8초 동안 움직이지 못한다' },
  'dex+int': { id: 'slow', name: '냉기', text: '2초 동안 느려진다' },
  'dex+wis': { id: 'vuln', name: '표식', text: '4초 동안 받는 피해 +15%' },
  'dex+vit': { id: 'root', name: '덫', text: '1초 동안 움직이지 못한다' },
  'int+wis': { id: 'bleed', name: '마력 연소', text: '3초 동안 준 피해의 30%를 더 깎는다' },
  'int+vit': { id: 'bleed', name: '화상', text: '3초 동안 준 피해의 30%를 더 깎는다' },
  'wis+vit': { id: 'shield', name: '금강 보호막', text: '준 피해의 6%만큼 보호막' },
};
const ORDER = ['str', 'dex', 'int', 'wis', 'vit'];
export const mixKey = (a, b) => [a, b].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y)).join('+');
export function mixFxOf(lines) {
  if (!lines || lines.length < 2) return [];
  const out = [MIX_FX[mixKey(lines[0], lines[1])]];
  if (lines[2]) out.push(MIX_FX[mixKey(lines[1], lines[2])]);
  return out.filter(Boolean);
}

// 혼합 전용 장비: 전설 · 신화가 나올 때 무기 · 보조 · 장신구는 가끔 두 스탯 전용 (두 스탯 조건 · 두 스탯 옵션 · 조합 고유 효과)
export const MIX_ITEM = {
  'str+dex': { name: '검무사의', u: 0 }, 'str+int': { name: '마검사의', u: 1 }, 'str+wis': { name: '성기사의', u: 2 }, 'str+vit': { name: '철혈 군주의', u: 3 },
  'dex+int': { name: '마궁사의', u: 4 }, 'dex+wis': { name: '영혼 사냥꾼의', u: 5 }, 'dex+vit': { name: '야생 군주의', u: 6 },
  'int+wis': { name: '현자의', u: 7 }, 'int+vit': { name: '마도 장군의', u: 8 }, 'wis+vit': { name: '금강 수도사의', u: 9 },
};
// 조합 고유 효과 (titles.js UNIQUES 뒤에 붙는다 — MIX_UNIQUE_BASE + u)
export const MIX_UNIQUES = [
  { trig: 'meleeHit', p: 0.25, eff: 'arrow', v: 80, text: '근접 공격이 맞으면 25% 확률로 칼바람 (무기 피해 80%)' },
  { trig: 'meleeHit', p: 0.25, eff: 'blast', v: 60, text: '근접 공격이 맞으면 25% 확률로 피해 60% 원소 폭발' },
  { trig: 'meleeHit', p: 0.2, eff: 'ward', v: 20, text: '근접 공격이 맞으면 20% 확률로 3초 동안 받는 피해 -20%' },
  { trig: 'hurt', p: 0.3, eff: 'shock', v: 80, text: '맞으면 30% 확률로 주변에 무기 피해 80% 충격파' },
  { trig: 'rangedHit', p: 0.25, eff: 'blast', v: 50, text: '화살이 맞으면 25% 확률로 피해 50% 원소 폭발' },
  { trig: 'rangedHit', p: 0.25, eff: 'mp', v: 8, text: '화살이 맞으면 25% 확률로 MP 8 회복' },
  { trig: 'hurt', p: 0.3, eff: 'arrow', v: 90, text: '맞으면 30% 확률로 가까운 적에게 무기 피해 90% 화살' },
  { trig: 'spell', p: 0.35, eff: 'shock', v: 60, text: '주문을 쓰면 35% 확률로 주변에 무기 피해 60% 충격파' },
  { trig: 'hurt', p: 0.3, eff: 'blast', v: 60, text: '맞으면 30% 확률로 피해 60% 원소 폭발' },
  { trig: 'buff', p: 1, eff: 'ward', v: 25, text: '보조 주문을 쓰면 3초 동안 받는 피해 -25%' },
];

if (UNIQUES.length === UNIQUE_BASE) UNIQUES.push(...MIX_UNIQUES);
export const mixUnique = (key) => UNIQUE_BASE + MIX_ITEM[key].u;
