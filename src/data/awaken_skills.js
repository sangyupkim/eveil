// 각성 전용 스킬 (v0.39): 스킬북으로 떨어진다 (몬스터 레벨 20 · 40 · 60 · 100부터, game/loot.js). 그 차수 각성이어야 배우고 쓴다.
// awaken 1 · 2 · 3 = 1차 · 2차 · 3차 각성(20 · 40 · 60)에 닿고 필요 능력치를 넘으면 누구나 쓴다 (윗 차수가 되어도 아래 차수 스킬은 그대로).
// awaken 4 = 4차 각성(100) 전용: 내 4차 갈래에 그 스탯(line)이 들어 있어야 쓴다 (직업 스킬).
// 세기: 같은 계수 체계(평타 × 계수) — 같은 레벨의 책 스킬보다 한 단계 위. 회복 효과 없음.
const R = { 1: 40, 2: 80, 3: 120, 4: 180 }; // 차수별 필요 능력치
const A = (stat, awaken, o) => ({ awaken, line: stat, school: 'awaken', tier: Math.min(5, awaken + 1), req: { [stat]: R[awaken] }, ...o });
const W = (stat, awaken, o) => A(stat, awaken, { ap: 'weapon', ...o });

export const AWAKEN_SKILLS = {
  // ── 힘 (검) ──
  aw_str1: W('str', 1, { name: '패도 일섬', color: '#e07a4a', type: 'melee', needs: 'melee', mp: 14, cd: 6, power: 3.2, perRank: 0.24, anim: 'heavy', desc: '한 번에 크게 벤다.' }),
  aw_str2: W('str', 2, { name: '대지 분쇄', color: '#c8703a', type: 'spin', needs: 'melee', mp: 24, cd: 10, radius: 5, power: 3.0, perRank: 0.22, anim: 'spin', desc: '둘레를 부수며 휘두른다.' }),
  aw_str3: W('str', 3, { name: '천붕격', color: '#ff8a4a', type: 'cleave', needs: 'melee', mp: 34, cd: 14, radius: 6, power: 4.2, perRank: 0.3, anim: 'heavy', desc: '하늘이 무너지듯 앞을 내리친다.' }),
  aw_str4a: W('str', 4, { name: '전쟁신의 강림', color: '#ff6a3a', type: 'spin', needs: 'melee', mp: 50, cd: 22, radius: 6, hits: 3, power: 3.2, perRank: 0.24, anim: 'spin', desc: '세 번 휘몰아친다.' }),
  aw_str4b: W('str', 4, { name: '패왕참', color: '#ffb04a', type: 'melee', needs: 'melee', mp: 44, cd: 16, power: 7.5, perRank: 0.5, anim: 'heavy', desc: '한 대상을 끝장내는 일격.' }),
  // ── 민첩 (활) ──
  aw_dex1: W('dex', 1, { name: '연사 폭풍', color: '#8fd0a0', type: 'arrow', needs: 'bow', mp: 14, cd: 7, count: 6, range: 13, power: 1.0, perRank: 0.08, desc: '여섯 발을 잇달아 쏜다.' }),
  aw_dex2: W('dex', 2, { name: '꿰뚫는 별', color: '#b0f0c0', type: 'line', needs: 'bow', mp: 24, cd: 10, range: 14, width: 2, power: 3.2, perRank: 0.24, desc: '줄지어 선 적을 모두 꿰뚫는다.' }),
  aw_dex3: W('dex', 3, { name: '하늘 화살비', color: '#7ad0a0', type: 'rain', needs: 'bow', mp: 34, cd: 15, radius: 5, waves: 6, range: 13, power: 1.4, perRank: 0.1, desc: '화살비를 여섯 번 쏟는다.' }),
  aw_dex4a: W('dex', 4, { name: '신궁의 일격', color: '#d0ffd8', type: 'line', needs: 'bow', mp: 44, cd: 18, range: 16, width: 2.4, power: 8, perRank: 0.5, desc: '활시위를 끝까지 당겨 한 줄을 날린다.' }),
  aw_dex4b: W('dex', 4, { name: '천 개의 화살', color: '#a0e8b8', type: 'arrow', needs: 'bow', mp: 50, cd: 20, count: 12, range: 13, power: 1.2, perRank: 0.09, desc: '열두 발을 흩뿌린다.' }),
  // ── 지능 (주문: 위력이 주문 계수로 눌린다) ──
  aw_int1: A('int', 1, { name: '원소 해방', color: '#ff9a5a', type: 'nova', ap: 'int', mp: 18, cd: 6, radius: 5, power: 60, perRank: 12, desc: '몸에서 원소를 터뜨린다.' }),
  aw_int2: A('int', 2, { name: '별똥 낙하', color: '#ffb070', type: 'meteor', ap: 'int', mp: 30, cd: 10, radius: 4.5, power: 110, perRank: 22, desc: '불타는 별을 떨어뜨린다.' }),
  aw_int3: A('int', 3, { name: '원소 폭풍', color: '#9ad0ff', type: 'rain', ap: 'int', mp: 44, cd: 15, radius: 5.5, waves: 5, power: 70, perRank: 14, desc: '원소의 비를 다섯 번 내린다.' }),
  aw_int4a: A('int', 4, { name: '천벌의 사슬', color: '#c0e0ff', type: 'chain', ap: 'int', mp: 54, cd: 18, jumps: 7, range: 12, power: 260, perRank: 50, desc: '번개가 일곱 적을 잇는다.' }),
  aw_int4b: A('int', 4, { name: '태초의 불꽃', color: '#ff7040', type: 'nova', ap: 'int', mp: 64, cd: 24, radius: 7, power: 300, perRank: 55, desc: '태초의 불로 둘레를 태운다.' }),
  // ── 정신 (비전: 장비로 늘린 MP 보너스, 최대 MP의 %를 쓴다) ──
  aw_wis1: A('wis', 1, { name: '비전 창', color: '#9ab8ff', type: 'bolt', ap: 'wis', scale: 'mp', mpPct: 0.12, mp: 10, cd: 5, range: 11, power: 2.2, perRank: 0.17, desc: '마력을 창처럼 던진다.' }),
  aw_wis2: A('wis', 2, { name: '마나 폭주', color: '#b090ff', type: 'nova', ap: 'wis', scale: 'mp', mpPct: 0.18, mp: 16, cd: 9, radius: 5, power: 3.0, perRank: 0.23, desc: '모은 마력을 한꺼번에 터뜨린다.' }),
  aw_wis3: A('wis', 3, { name: '마나 해일', color: '#8a9aff', type: 'line', ap: 'wis', scale: 'mp', mpPct: 0.25, mp: 24, cd: 12, range: 13, width: 2.4, power: 4.0, perRank: 0.3, desc: '마력의 물결로 한 줄을 쓸어 버린다.' }),
  aw_wis4a: A('wis', 4, { name: '비전 승천', color: '#d0c0ff', type: 'buff', ap: 'wis', buff: 'might', mp: 40, cd: 40, duration: 12, power: 40, perRank: 3, desc: '12초 동안 주는 피해가 크게 오른다.' }),
  aw_wis4b: A('wis', 4, { name: '별의 대해일', color: '#a090ff', type: 'rain', ap: 'wis', scale: 'mp', mpPct: 0.35, mp: 30, cd: 18, radius: 6, waves: 5, power: 2.2, perRank: 0.17, desc: '마력의 비를 다섯 번 내린다.' }),
  // ── 체력 (철벽: 장비로 늘린 HP · 방어력 보너스, HP도 쓴다) ──
  aw_vit1: W('vit', 1, { name: '철벽 강타', color: '#c8b080', type: 'melee', needs: 'melee', scale: 'armor', hpCost: 0.04, mp: 12, cd: 6, power: 2.6, perRank: 0.2, anim: 'heavy', desc: '단단한 몸으로 들이받는다.' }),
  aw_vit2: W('vit', 2, { name: '대지의 방패', color: '#b0a070', type: 'cleave', needs: 'melee', scale: 'hp', hpCost: 0.06, mp: 20, cd: 10, radius: 5, power: 3.0, perRank: 0.22, anim: 'heavy', desc: '방패로 앞을 쓸어 밀어낸다.' }),
  aw_vit3: W('vit', 3, { name: '불굴의 진동', color: '#a09060', type: 'spin', needs: 'melee', scale: 'armor', hpCost: 0.08, mp: 30, cd: 14, radius: 6, power: 4.0, perRank: 0.3, anim: 'spin', desc: '땅을 울려 둘레를 흔든다.' }),
  aw_vit4a: A('vit', 4, { name: '불멸의 의지', color: '#e0c080', type: 'buff', ap: 'vit', buff: 'armorPct', mp: 36, cd: 40, duration: 14, power: 60, perRank: 4, desc: '14초 동안 방어력이 크게 오른다.' }),
  aw_vit4b: W('vit', 4, { name: '성벽 붕괴', color: '#d8a868', type: 'melee', needs: 'melee', scale: 'hp', hpCost: 0.1, mp: 40, cd: 18, power: 7.0, perRank: 0.5, anim: 'heavy', desc: '성벽을 무너뜨리듯 내리친다.' }),
};
// 스킬의 각성 등급 (v0.39.3: 모든 스킬): 각성 스킬은 정한 차수, 책 스킬은 책 단계로 —
// 하급 · 중급 = 0 (각성 전에도), 상급 = 1차, 고대 = 2차, 전설 = 3차 각성
export const skillGrade = (sk) => (sk.awaken != null ? sk.awaken : Math.max(0, (sk.tier || 1) - 2));
export const gradeName = (g) => (g ? `${g}차 각성` : '각성 전');
// 이 스킬을 지금 배우고 쓸 수 있나: 내 차수가 등급 이상 (4차 전용 스킬은 내 4차 갈래에 그 스탯)
export function awakenOk(st, sk) {
  const g = skillGrade(sk);
  if (!g) return { ok: true };
  const t = (st.titles || []).find((x) => x.tier === g - 1);
  if (!t) return { ok: false, why: `${g}차 각성 필요` };
  if (sk.awaken === 4 && !t.key.split('+').includes(sk.line)) return { ok: false, why: '4차 갈래에 맞지 않는 스킬' };
  return { ok: true };
}
