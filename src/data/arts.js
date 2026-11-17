// v0.44.42 수련 비전: 수동 사냥 중의 행동을 정해진 만큼 하면 열린다. 캐릭터 창 「비전」에서 장착 (1차 1칸 · 3차 2칸 · 5차 3칸).
// line: 단일 갈래(str · dex · int · wis · vit · dagger) 또는 혼합 조합('str+int' 등 — 그 두 스탯이 든 칭호를 받은 적이 있어야 장착)
// ev: 세는 행동 (world.js artEv) · n: 필요한 횟수 · 회복 효과 없음
export const ARTS = [
  { id: 'crush', line: 'str', name: '분쇄', ev: 'meleeCrit', n: 3000, cond: '근접 치명타', text: '근접 스킬 치명타가 적을 0.5초 기절시킨다 (보스 제외)' },
  { id: 'brink', line: 'str', name: '벼랑 끝', ev: 'lowHpKill', n: 1000, cond: 'HP 30% 이하에서 처치', text: 'HP 30% 이하일 때 힘 스킬 피해 +25%' },
  { id: 'quake', line: 'str', name: '대지의 울림', ev: 'multiHit', n: 2000, cond: '한 번에 3마리 이상 맞히기', text: '둘레 · 부채꼴 스킬 범위 +20%' },
  { id: 'sniper', line: 'dex', name: '저격수', ev: 'rangedCrit', n: 5000, cond: '원거리 치명타', text: '8칸 넘게 떨어진 적에게 피해 +15%' },
  { id: 'shadowfoot', line: 'dex', name: '그림자 발', ev: 'evadeKill', n: 500, cond: '구르기 · 연막 뒤 2초 안에 처치', text: '구르기 뒤 첫 스킬 확정 치명타' },
  { id: 'volley', line: 'dex', name: '화살 폭풍', ev: 'arrowKill', n: 3000, cond: '여러 발 화살 스킬로 처치', text: '여러 발 화살 스킬 +2발' },
  { id: 'resonance', line: 'int', name: '원소 공명', ev: 'elemSwitch', n: 1000, cond: '서로 다른 원소 주문 연달아', text: '원소가 바뀌면 그 주문 +20%' },
  { id: 'iceheart', line: 'int', name: '얼음 심장', ev: 'ccKill', n: 1500, cond: '묶이거나 느린 적 처치', text: '묶기 · 느리게 시간 +50%' },
  { id: 'chainblast', line: 'int', name: '연쇄 폭발', ev: 'spellKill', n: 5000, cond: '주문으로 처치', text: '주문으로 처치한 적이 터져 둘레에 그 피해의 30%' },
  { id: 'manaflow', line: 'wis', name: '마력 순환', ev: 'mpSpent', n: 100000, cond: 'MP 사용', text: '스킬을 쓰면 쓴 MP의 5%를 돌려받는다' },
  { id: 'shieldsmith', line: 'wis', name: '보호막 장인', ev: 'shieldAbsorb', n: 50000, cond: '보호막으로 막은 피해', text: '보호막 +25%' },
  { id: 'manarush', line: 'wis', name: '마나 폭주', ev: 'lowMpSkill', n: 1000, cond: 'MP 20% 이하에서 스킬', text: 'MP 20% 이하일 때 정신 스킬 +30%' },
  { id: 'toughbody', line: 'vit', name: '단련된 몸', ev: 'dmgTaken', n: 500000, cond: '받은 피해', text: '받는 피해 -5%' },
  { id: 'retribution', line: 'vit', name: '응보', ev: 'vengeHit', n: 3000, cond: '인내의 폭발 · 가시 갑옷으로 맞히기', text: '인내의 폭발 상한 +50%, 가시 갑옷 반사 +10%p' },
  { id: 'provoker', line: 'vit', name: '도발자', ev: 'tauntKill', n: 2000, cond: '도발 중 처치', text: '도발 중 받는 피해 감소 +10%p' },
  { id: 'vital', line: 'dagger', name: '급소', ev: 'daggerCrit', n: 3000, cond: '단검 치명타', text: '단검을 들면 치명타 피해 +30%' },
  // 혼합 (조합마다 둘)
  { id: 'gale', line: 'str+dex', name: '칼바람', ev: 'fx:출혈', n: 3000, cond: '출혈 걸기', text: '출혈 피해 +50%' },
  { id: 'bladedance', line: 'str+dex', name: '검무', ev: 'comboBurst', n: 500, cond: '연계 폭발', text: '연계가 4단계까지 쌓인다' },
  { id: 'eleblade', line: 'str+int', name: '원소 칼날', ev: 'vulnKill', n: 2000, cond: '약화된 적 처치', text: '근접 평타에 마법 공격력 30% 추가 피해' },
  { id: 'spellsword', line: 'str+int', name: '마검 공명', ev: 'comboBurst', n: 500, cond: '연계 폭발', text: '연계 폭발 뒤 2초 동안 마법 공격력 +20%' },
  { id: 'brand', line: 'str+wis', name: '낙인', ev: 'shieldGain', n: 30000, cond: '혼합 보호막 얻기', text: '혼합 효과 보호막 +50%' },
  { id: 'judge', line: 'str+wis', name: '심판', ev: 'shieldKill', n: 2000, cond: '보호막이 있는 동안 처치', text: '보호막이 있으면 힘 스킬 +15%' },
  { id: 'ironblood', line: 'str+vit', name: '철혈', ev: 'stunKill', n: 2000, cond: '기절 · 묶인 적 처치', text: '기절 시간 +0.4초' },
  { id: 'vanguard', line: 'str+vit', name: '돌격대장', ev: 'dashUse', n: 3000, cond: '돌진 스킬 쓰기', text: '돌진 스킬 재사용 대기 -30%' },
  { id: 'frostarrow', line: 'dex+int', name: '서리 화살', ev: 'ccKill', n: 2000, cond: '느리거나 묶인 적 처치', text: '느린 적에게 치명타 확률 +20%p' },
  { id: 'constellation', line: 'dex+int', name: '성좌', ev: 'comboBurst', n: 500, cond: '연계 폭발', text: '연계 폭발 뒤 3초 동안 화살 스킬 +1발' },
  { id: 'soulmark', line: 'dex+wis', name: '영혼 표식', ev: 'vulnKill', n: 2000, cond: '약화된 적 처치', text: '약화 피해 증가 +10%p' },
  { id: 'soulhunt', line: 'dex+wis', name: '영혼 사냥', ev: 'rangedKill', n: 5000, cond: '원거리로 처치', text: '처치하면 최대 MP의 2% (1초에 한 번)' },
  { id: 'huntertrap', line: 'dex+vit', name: '사냥꾼의 덫', ev: 'stunKill', n: 2000, cond: '묶인 적 처치', text: '묶기 +0.5초, 묶인 적에게 피해 +10%' },
  { id: 'wild', line: 'dex+vit', name: '야생', ev: 'hurtKill', n: 2000, cond: '맞은 뒤 2초 안에 처치', text: '맞으면 2초 동안 공격 속도 +20%' },
  { id: 'truth', line: 'int+wis', name: '진리', ev: 'fx:마력 연소', n: 3000, cond: '마력 연소 걸기', text: '마력 연소가 가까운 적 하나에게 옮는다' },
  { id: 'sage', line: 'int+wis', name: '현자', ev: 'comboBurst', n: 500, cond: '연계 폭발', text: '연계 폭발 때 최대 MP의 10%' },
  { id: 'burn', line: 'int+vit', name: '화상', ev: 'fx:화상', n: 3000, cond: '화상 걸기', text: '화상 피해 +50%' },
  { id: 'spellwall', line: 'int+vit', name: '마도 방벽', ev: 'spellHurt', n: 200000, cond: '주문을 쓰는 동안 받은 피해', text: '주문을 쓰면 1초 동안 받는 피해 -10%' },
  { id: 'diamond', line: 'wis+vit', name: '금강', ev: 'shieldGain', n: 50000, cond: '혼합 보호막 얻기', text: '보호막이 깨지면 둘레에 무기 피해 100%' },
  { id: 'unbreak', line: 'wis+vit', name: '불괴', ev: 'shieldAbsorb', n: 100000, cond: '보호막으로 막은 피해', text: '보호막 지속 +3초' },
];
export const ART = Object.fromEntries(ARTS.map((a) => [a.id, a]));
export const ART_LINE_NAMES = { str: '힘', dex: '민첩', int: '지능', wis: '정신', vit: '체력', dagger: '단검' };
// 장착 칸: 1차 각성 1 · 3차 2 · 5차 3
export const artSlots = (st) => { const t = (st.titles || []).map((x) => x.tier); return t.includes(4) ? 3 : t.includes(2) ? 2 : t.includes(0) ? 1 : 0; };
// 혼합 비전은 두 스탯이 든 칭호를 받은 적이 있어야
export const artUsable = (st, a) => !a.line.includes('+') || (st.titles || []).some((t) => a.line.split('+').every((s) => t.key.split('+').includes(s)));
