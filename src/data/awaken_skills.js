// 높은 각성 등급 스킬 (v0.39): 다른 스킬과 같은 스킬북. 각성 등급 1 ~ 4가 붙어 있고(awaken), 몬스터 레벨 20 · 40 · 60 · 100부터 떨어진다 (game/loot.js).
// '각성 스킬'이라는 따로 된 종류는 없다 — 모든 스킬에 각성 등급이 있다 (skillGrade). 갈래(school)는 스탯마다 검술 · 궁술 · 화염 · 비전 · 철벽.
// awaken 1 · 2 · 3 = 1차 · 2차 · 3차 각성(20 · 40 · 60)에 닿고 필요 능력치를 넘으면 누구나 쓴다 (윗 차수가 되어도 아래 차수 스킬은 그대로).
// awaken 4 · 5 = 4차(300) · 5차(500) 각성 전용: 내 4차 갈래에 그 스탯(line)이 들어 있어야 쓴다 (직업 스킬).
// 세기: 같은 계수 체계(평타 × 계수) — 같은 레벨의 책 스킬보다 한 단계 위. 회복 효과 없음.
const R = { 1: 40, 2: 100, 3: 220, 4: 400, 5: 650 }; // 차수별 필요 능력치 (v0.42: 전직 20 · 60 · 150 · 300 · 500)
const SCH = { str: 'sword', dex: 'bow', int: 'fire', wis: 'arcane', vit: 'bulwark' };
const A = (stat, awaken, o) => ({ awaken, line: stat, school: SCH[stat], tier: Math.min(5, awaken + 1), req: { [stat]: R[awaken] }, ...o });
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
  // ── 5차 각성(500) 전용: 내 5차 갈래에 그 스탯이 있어야 쓴다 (v0.42) ──
  aw_str5: W('str', 5, { name: '종말의 일격', color: '#ff5030', type: 'cleave', needs: 'melee', mp: 70, cd: 20, radius: 8, power: 11, perRank: 0.7, anim: 'heavy', desc: '세상을 가르는 일격.' }),
  aw_dex5: W('dex', 5, { name: '별을 꿰는 화살', color: '#e0ffe8', type: 'line', needs: 'bow', mp: 66, cd: 20, range: 20, width: 3, power: 12, perRank: 0.75, desc: '하늘 끝까지 한 줄을 꿰뚫는다.' }),
  aw_int5: A('int', 5, { name: '창세의 불꽃', color: '#ff6020', type: 'meteor', ap: 'int', mp: 90, cd: 22, radius: 7, power: 520, perRank: 90, desc: '하늘에서 창세의 불을 떨군다.' }),
  aw_wis5: A('wis', 5, { name: '무한의 마력', color: '#c8b0ff', type: 'nova', ap: 'wis', scale: 'mp', mpPct: 0.45, mp: 40, cd: 22, radius: 8, power: 9, perRank: 0.6, desc: '쌓아 둔 마력을 모두 터뜨린다.' }),
  aw_vit5: W('vit', 5, { name: '불멸의 대지', color: '#f0c070', type: 'spin', needs: 'melee', scale: 'hp', hpCost: 0.12, mp: 50, cd: 20, radius: 8, hits: 3, power: 6, perRank: 0.4, anim: 'spin', desc: '대지를 세 번 뒤흔든다.' }),
  aw_str5b: W('str', 5, { name: '패왕의 질주', color: '#ff7a40', type: 'dash', needs: 'melee', mp: 54, cd: 14, power: 8.5, perRank: 0.55, anim: 'heavy', desc: '번개처럼 달려들어 베어 넘긴다.' }),
  aw_str5c: W('str', 5, { name: '천지 붕괴', color: '#ff9050', type: 'spin', needs: 'melee', mp: 80, cd: 26, radius: 9, hits: 4, power: 4.2, perRank: 0.3, anim: 'spin', desc: '네 번 휘몰아쳐 둘레를 무너뜨린다.' }),
  aw_dex5b: W('dex', 5, { name: '유성 화살비', color: '#a0ffc8', type: 'rain', needs: 'bow', mp: 70, cd: 22, radius: 7, waves: 8, range: 15, power: 2.4, perRank: 0.17, desc: '유성 같은 화살을 여덟 번 쏟는다.' }),
  aw_dex5c: W('dex', 5, { name: '만 개의 화살', color: '#c0ffd8', type: 'arrow', needs: 'bow', mp: 64, cd: 18, count: 16, range: 15, power: 1.9, perRank: 0.13, desc: '열여섯 발을 한꺼번에 흩뿌린다.' }),
  aw_int5b: A('int', 5, { name: '종말의 뇌우', color: '#a0c8ff', type: 'chain', ap: 'int', mp: 80, cd: 18, jumps: 10, range: 14, power: 380, perRank: 70, desc: '번개가 열 적을 잇는다.' }),
  aw_int5c: A('int', 5, { name: '절대 영역', color: '#c0f0ff', type: 'nova', ap: 'int', mp: 96, cd: 26, radius: 9, power: 460, perRank: 80, desc: '둘레를 얼려 부순다.' }),
  aw_wis5b: A('wis', 5, { name: '별의 창', color: '#b8a8ff', type: 'line', ap: 'wis', scale: 'mp', mpPct: 0.4, mp: 36, cd: 16, range: 18, width: 3, power: 8, perRank: 0.55, desc: '마력의 창으로 한 줄을 꿰뚫는다.' }),
  aw_wis5c: A('wis', 5, { name: '신성 결계', color: '#e8d8ff', type: 'buff', ap: 'wis', buff: 'might', mp: 60, cd: 45, duration: 15, power: 70, perRank: 4, desc: '15초 동안 주는 피해가 크게 오른다.' }),
  aw_vit5b: W('vit', 5, { name: '거신의 망치', color: '#f8c878', type: 'melee', needs: 'melee', scale: 'hp', hpCost: 0.12, mp: 50, cd: 16, power: 10, perRank: 0.65, anim: 'heavy', desc: '거신처럼 한 대상을 내리찍는다.' }),
  aw_vit5c: A('vit', 5, { name: '불괴의 성채', color: '#ffe0a0', type: 'buff', ap: 'vit', buff: 'armorPct', mp: 50, cd: 45, duration: 16, power: 90, perRank: 5, desc: '16초 동안 방어력이 크게 오른다.' }),
  // 두 스탯 5차 갈래 전용 (갈래에 두 스탯이 모두 있어야): 검객 · 마검사 · 성전사 · 투사 · 마궁사 · 순례자 · 정찰병 · 학자 · 전투 마법사 · 수도사 계열
  aw_x_sd: W('str', 5, { lines: ['str', 'dex'], name: '검무 폭풍', color: '#ffc080', type: 'spin', needs: 'melee', mp: 70, cd: 20, radius: 8, hits: 3, power: 5, perRank: 0.35, anim: 'spin', desc: '검의 춤으로 세 번 휩쓴다.' }),
  aw_x_si: W('str', 5, { lines: ['str', 'int'], mix: 'int', name: '마검 일섬', color: '#ff80c0', type: 'cleave', needs: 'melee', mp: 72, cd: 18, radius: 9, power: 10, perRank: 0.65, anim: 'heavy', desc: '마력을 실은 검으로 앞을 가른다.' }),
  aw_x_sw: W('str', 5, { lines: ['str', 'wis'], mix: 'wis', name: '성검 심판', color: '#fff0a0', type: 'cleave', needs: 'melee', mp: 70, cd: 18, radius: 8, power: 9.5, perRank: 0.6, anim: 'heavy', desc: '빛의 검으로 앞을 심판한다.' }),
  aw_x_sv: W('str', 5, { lines: ['str', 'vit'], name: '철혈 돌격', color: '#e0a070', type: 'dash', needs: 'melee', scale: 'armor', hpCost: 0.08, mp: 56, cd: 14, power: 9, perRank: 0.6, anim: 'heavy', desc: '강철 같은 몸으로 들이받는다.' }),
  aw_x_di: W('dex', 5, { lines: ['dex', 'int'], mix: 'int', name: '성좌 화살', color: '#c8a0ff', type: 'line', needs: 'bow', mp: 66, cd: 18, range: 18, width: 3, power: 11, perRank: 0.7, desc: '별의 힘을 실은 한 발.' }),
  aw_x_dw: W('dex', 5, { lines: ['dex', 'wis'], mix: 'wis', name: '영혼 사냥', color: '#d8c0ff', type: 'arrow', needs: 'bow', mp: 60, cd: 16, count: 10, range: 15, power: 2.4, perRank: 0.17, desc: '영혼을 좇는 화살 열 발.' }),
  aw_x_dv: W('dex', 5, { lines: ['dex', 'vit'], name: '야생의 덫', color: '#a0d080', type: 'rain', needs: 'bow', mp: 62, cd: 20, radius: 7, waves: 6, range: 14, power: 2.8, perRank: 0.2, slow: 3, desc: '덫 화살을 여섯 번 쏟아 묶는다.' }),
  aw_x_iw: A('int', 5, { lines: ['int', 'wis'], name: '진리의 폭발', color: '#b0b8ff', type: 'meteor', ap: 'int', mp: 90, cd: 22, radius: 8, power: 560, perRank: 95, desc: '진리의 별을 떨어뜨린다.' }),
  aw_x_iv: A('int', 5, { lines: ['int', 'vit'], name: '마도 포격', color: '#ff9a60', type: 'rain', ap: 'int', mp: 86, cd: 20, radius: 7, waves: 6, power: 120, perRank: 22, desc: '마력 포탄을 여섯 번 퍼붓는다.' }),
  aw_x_wv: W('vit', 5, { lines: ['wis', 'vit'], name: '금강 파동', color: '#ffe8b0', type: 'nova', needs: 'melee', scale: 'hp', hpCost: 0.1, mp: 60, cd: 18, radius: 9, power: 7, perRank: 0.5, desc: '단단한 몸에서 파동을 내뿜는다.' }),
  aw_vit4b: W('vit', 4, { name: '성벽 붕괴', color: '#d8a868', type: 'melee', needs: 'melee', scale: 'hp', hpCost: 0.1, mp: 40, cd: 18, power: 7.0, perRank: 0.5, anim: 'heavy', desc: '성벽을 무너뜨리듯 내리친다.' }),
};
// 스킬의 각성 등급 (v0.39.3: 모든 스킬): awaken이 정해진 스킬은 그 차수, 나머지는 책 단계로 —
// 하급 · 중급 = 0 (각성 전에도), 상급 = 1차, 고대 = 2차, 전설 = 3차 각성
export const skillGrade = (sk) => (sk.awaken != null ? sk.awaken : Math.max(0, (sk.tier || 1) - 2));
export const gradeName = (g) => (g ? `${g}차 각성` : '각성 전');
// 이 스킬을 지금 배우고 쓸 수 있나: 내 차수가 등급 이상 (4차 전용 스킬은 내 4차 갈래에 그 스탯)
export function awakenOk(st, sk) {
  const g = skillGrade(sk);
  if (!g) return { ok: true };
  const t = (st.titles || []).find((x) => x.tier === g - 1);
  if (!t) return { ok: false, why: `${g}차 각성 필요` };
  if (sk.awaken >= 4 && !(sk.lines || [sk.line]).every((l) => t.key.split('+').includes(l))) return { ok: false, why: `${g}차 갈래에 맞지 않는 스킬` };
  return { ok: true };
}

// ───── 등급별 스킬 채우기 (v0.42.5) ─────
// 모든 스탯 × 각성 등급(1 ~ 5)에 스킬이 6개 이상, 등급마다 하품(약함) · 중품(보통) · 상품(강함)이 섞이게 만든다.
// 품질 q: 1 하품 ×0.75 · 2 중품 ×1 · 3 상품 ×1.3 (기존 스킬은 중품). 상품일수록 책이 드물다 (game/loot.js)
export const QUALITY = { 1: { name: '하품', k: 0.75, w: 5, color: '#9a917f' }, 2: { name: '중품', k: 1, w: 3, color: '#d8d2c4' }, 3: { name: '상품', k: 1.3, w: 1, color: '#ffb84a' } };
const GW = { 0: 1.8, 1: 2.4, 2: 3.0, 3: 4.0, 4: 6.0, 5: 8.5 };   // 무기 · 자원 스킬 계수 (등급 기준)
const GS = { 0: 40, 1: 70, 2: 120, 3: 200, 4: 300, 5: 460 };  // 주문 위력
const GN = { 0: '수련의', 1: '투지의', 2: '분노의', 3: '천둥의', 4: '패왕의', 5: '종말의' };
const NOUN = {
  str: [['melee', '참격'], ['spin', '회전 베기'], ['cleave', '대지 가르기'], ['dash', '돌격 베기'], ['melee', '일격'], ['spin', '칼날 회오리']],
  dex: [['arrow', '연사'], ['line', '관통 사격'], ['rain', '화살비'], ['arrow', '산탄'], ['line', '저격'], ['rain', '화살 폭우']],
  int: [['bolt', '화염탄'], ['nova', '원소 폭발'], ['meteor', '낙성'], ['chain', '연쇄 번개'], ['rain', '원소 비'], ['bolt', '얼음 창']],
  wis: [['bolt', '비전 화살'], ['nova', '마력 파동'], ['line', '마력 광선'], ['rain', '별빛 비'], ['bolt', '영혼 창'], ['nova', '정신 폭발']],
  vit: [['melee', '방패 강타'], ['cleave', '돌진 방벽'], ['spin', '대지 진동'], ['melee', '거인 내려찍기'], ['spin', '대지 회오리'], ['cleave', '철벽 충격']],
};
const FXS = { str: 'c_earthspike', dex: 'c_arrowrain', int: 'c_firepost', wis: 'c_torrentacle', vit: 'c_earthmultispike' };
const COLORS = { str: ['#d0704a', '#e08a5a', '#ffaa6a'], dex: ['#7ab890', '#8fd0a0', '#b0f0c0'], int: ['#e07040', '#ff8a4a', '#ffb070'], wis: ['#8a90e0', '#a8a0ff', '#d0c0ff'], vit: ['#b09860', '#c8b080', '#f0d090'] };
// 이름: 스탯 × 공격 자리(NOUN 순서) × 각성 등급(0 ~ 5). 등급이 오를수록 무게 있는 말로 (v0.42.6)
const GNAME = {
  str: [['내려베기', '파쇄참', '뇌격참', '패도참', '멸절참', '종언의 일섬'], ['휘돌려 베기', '선풍참', '뇌전 선풍', '패왕 선풍', '멸천 선풍', '종말의 회오리'], ['땅 가르기', '대지 쪼개기', '뇌령 가르기', '산맥 가르기', '천지 가르기', '세계 가르기'],
    ['돌진 베기', '질풍 돌격', '섬광 돌격', '패왕 돌격', '유성 돌격', '종언의 돌진'], ['머리 쪼개기', '분쇄 일격', '벽력 일격', '군주의 일격', '파천 일격', '신살의 일격'], ['칼날 춤', '칼날 바람', '뇌우의 칼춤', '군단 베기', '멸망의 칼춤', '종막의 검무']],
  dex: [['세 발 쏘기', '속사', '폭풍 속사', '군주의 속사', '성운 속사', '종말의 속사'], ['꿰뚫는 화살', '관통 사격', '번개 관통', '패왕의 화살', '천공의 화살', '종언의 화살'], ['화살 소나기', '화살 장대비', '뇌우 화살비', '군세의 화살비', '유성우', '멸망의 화살비'],
    ['흩뿌리기', '흩어 쏘기', '섬광 산탄', '천 갈래 화살', '별무리 화살', '만천 화살'], ['급소 저격', '숨통 저격', '천둥 저격', '왕을 노리는 화살', '천리 저격', '신살 저격'], ['비 뿌리기', '폭우 사격', '폭풍 화살비', '하늘 덮기', '천벌의 화살비', '종말의 빗줄기']],
  int: [['불씨 탄', '화염 탄환', '작열탄', '겁화탄', '태양탄', '창세의 불덩이'], ['불꽃 터뜨리기', '원소 파열', '뇌화 폭발', '겁화 폭발', '태양 폭발', '태초의 폭발'], ['떨어지는 돌', '화염 운석', '불타는 별', '겁화 운석', '천붕 운석', '종말의 별'],
    ['찌릿한 번개', '번개 사슬', '뇌룡 사슬', '천둥 사슬', '신뢰의 사슬', '종언의 뇌전'], ['불씨 비', '원소의 비', '번개비', '겁화의 비', '유성 폭풍', '종말의 폭풍'], ['얼음 바늘', '빙창', '빙결 창', '혹한의 창', '절대 빙창', '영겁의 빙창']],
  wis: [['마력 구슬', '마력 화살', '비전 투창', '현자의 창', '성좌의 창', '진리의 창'], ['마력 물결', '마력 파동', '비전 해일', '현자의 파동', '성좌의 파동', '무한의 파동'], ['마력 줄기', '마력 광선', '비전 광선', '현자의 광선', '별빛 광선', '진리의 광선'],
    ['반딧불 비', '별빛 소나기', '비전 유성', '현자의 별비', '성좌의 비', '무한의 별비'], ['넋 구슬', '넋의 창', '영혼 투사', '현자의 넋', '성좌의 넋', '영겁의 넋'], ['정신 울림', '정신 파열', '의지 폭발', '현자의 각성', '성좌의 각성', '무한의 깨달음']],
  vit: [['방패 치기', '방패 후려치기', '철벽 내려치기', '성채 강타', '불괴 강타', '불멸의 강타'], ['밀어내기', '방벽 밀치기', '충격 방벽', '성채 돌파', '불괴 돌파', '불멸의 돌파'], ['발 구르기', '땅울림', '지진 울림', '성채 진동', '불괴 진동', '불멸의 지진'],
    ['내려찍기', '거인의 망치질', '바위 부수기', '성채 부수기', '산 부수기', '세계 부수기'], ['흙먼지 회오리', '모래 회오리', '바위 회오리', '성채 회오리', '불괴 회오리', '불멸의 회오리'], ['몸통 박치기', '어깨 들이받기', '강철 충격', '성채 충격', '불괴 충격', '불멸의 충격']],
};
// 설명: 실제 수치(횟수 · 발 수 · 잇는 적)로 자연스럽게
function gradedDesc(stat, type, o, slot) {
  const ice = stat === 'int' && slot === 5, two = o.hits ? '두 번 ' : '';
  const D = {
    melee: stat === 'vit' ? '단단한 몸에 실은 힘으로 한 대상을 내리찍는다.' : '무기에 힘을 모아 한 대상을 크게 벤다.',
    spin: stat === 'vit' ? `땅을 울려 둘레의 적을 ${two}뒤흔든다.` : `무기를 휘돌려 둘레의 적을 ${two}휩쓴다.`,
    cleave: stat === 'vit' ? '방패를 앞세워 앞의 적들을 밀어붙인다.' : '앞을 부채꼴로 크게 갈라 버린다.',
    dash: '눈 깜짝할 새 적 앞까지 달려들어 벤다.',
    arrow: `화살 ${o.count}발을 둘레의 적에게 잇달아 쏜다.`,
    line: '한 줄로 늘어선 적을 모두 꿰뚫는다.',
    rain: stat === 'dex' ? `고른 곳에 화살을 ${o.waves}번 쏟아붓는다.` : stat === 'wis' ? `고른 곳에 별빛을 ${o.waves}번 떨어뜨린다.` : `고른 곳에 원소를 ${o.waves}번 퍼붓는다.`,
    bolt: stat === 'wis' ? '모은 마력을 한 대상에게 날린다.' : ice ? '얼음 창을 날려 맞은 적을 꿰뚫고 느리게 한다.' : '불덩이를 날려 맞은 적을 태운다.',
    nova: stat === 'wis' ? '쌓아 둔 마력을 몸 둘레로 터뜨린다.' : '몸 둘레에 원소를 한꺼번에 터뜨린다.',
    meteor: '하늘에서 불타는 돌을 떨어뜨린다.',
    chain: `번개가 적 ${o.jumps}마리를 차례로 잇는다.`,
  };
  let d = D[type];
  if (stat === 'wis') d += ' 최대 MP가 클수록 강하다.';
  if (stat === 'vit') d += ' HP를 조금 쓴다.';
  return d;
}
function makeGraded(stat, g, q, i) {
  const [type, noun] = NOUN[stat][i % NOUN[stat].length], k = QUALITY[q].k;
  const o = { awaken: g, line: stat, school: SCH[stat], tier: g ? Math.min(5, g + 1) : q === 3 ? 2 : 1, req: { [stat]: Math.round((R[g] || 14) * (q === 3 ? 1.15 : q === 1 ? 0.85 : 1)) }, q,
    name: GNAME[stat][i % 6][g], color: COLORS[stat][q - 1], type, mp: 10 + g * 9 + q * 3, cd: [4, 6, 9, 12, 16, 20][i % 6] + g, fx: FXS[stat], desc: g ? `${QUALITY[q].name} ${g}차 각성 스킬.` : `${QUALITY[q].name} 기본 스킬.` };
  const melee = type === 'melee' || type === 'spin' || type === 'cleave' || type === 'dash';
  if (stat === 'int') Object.assign(o, { ap: 'int', power: Math.round(GS[g] * k * (type === 'rain' ? 0.35 : type === 'chain' ? 0.9 : 1)), perRank: Math.round(GS[g] * k * 0.18) });
  else if (stat === 'wis') Object.assign(o, { ap: 'wis', scale: 'mp', mpPct: 0.08 + g * 0.05, power: +(GW[g] * k * (type === 'rain' ? 0.4 : 1)).toFixed(2), perRank: +(GW[g] * k * 0.07).toFixed(2) });
  else Object.assign(o, { ap: 'weapon', needs: stat === 'dex' ? 'bow' : 'melee', power: +(GW[g] * k * (type === 'rain' ? 0.4 : type === 'arrow' ? 0.4 : type === 'spin' ? 0.8 : 1)).toFixed(2), perRank: +(GW[g] * k * 0.07).toFixed(2), anim: type === 'spin' ? 'spin' : 'heavy' });
  if (stat === 'vit') Object.assign(o, { scale: i % 2 ? 'armor' : 'hp', hpCost: 0.03 + g * 0.015 });
  if (type === 'spin' || type === 'cleave' || type === 'nova') o.radius = 4 + g * 0.8;
  if (type === 'rain') Object.assign(o, { radius: 4 + g * 0.6, waves: 3 + g, range: 13 });
  if (type === 'meteor') o.radius = 3.5 + g * 0.6;
  if (type === 'arrow') Object.assign(o, { count: 3 + g * 2, range: 13 });
  if (type === 'line') Object.assign(o, { range: 13 + g, width: 1.6 + g * 0.3 });
  if (type === 'bolt') o.range = 11 + g;
  if (type === 'chain') Object.assign(o, { jumps: 3 + g, range: 11 });
  if (type === 'spin' && g >= 4) o.hits = 2;
  if (stat === 'int' && i % 6 === 5) o.slow = 2;
  o.desc = gradedDesc(stat, type, o, i % 6);
  return o;
}
{
  const cnt = {};
  for (const sk of Object.values(AWAKEN_SKILLS)) { const k = `${sk.line}|${sk.awaken}`; cnt[k] = (cnt[k] || 0) + 1; }
  for (const stat of Object.keys(SCH)) for (let g = 0; g <= 5; g++) {
    const have = g ? cnt[`${stat}|${g}`] || 0 : 6, n = Math.max(2, 6 - have); // 적어도 하품 · 상품 하나씩 (각성 전은 둘만)
    const qs = [1, 3, 2, 1, 3, 2];
    for (let i = 0; i < n; i++) AWAKEN_SKILLS[`g_${stat}${g}_${i}`] = makeGraded(stat, g, qs[i], i + g);
  }
}

// ───── v0.44.38 혼합 스킬: 두 스탯 조합마다 1 ~ 4차 각성에 하나씩, 세 스탯 갈래는 4 · 5차에 하나씩 ─────
// 피해는 두(세) 스탯이 함께 (game/player.js skillScale), 공격력은 필요 스탯 비율대로 물리 · 마법.
// p = 무기 · 모양을 정하는 주 스탯, ix = 차수별 모양 (NOUN 순서)
const MIX2 = {
  'str+dex': { p: 'str', ix: [0, 1, 3, 5], names: ['쌍검 난무', '질풍 연격', '천검 난무', '검무 섬멸'], color: '#ffc080' },
  'str+int': { p: 'str', ix: [0, 2, 1, 2], names: ['마력 베기', '원소 검격', '마검 폭쇄', '마검 천붕'], color: '#ff80c0' },
  'str+wis': { p: 'str', ix: [0, 2, 4, 2], names: ['성광 베기', '심판의 일격', '성검 낙인', '천상의 심판'], color: '#fff0a0' },
  'str+vit': { p: 'str', ix: [4, 3, 1, 5], names: ['철혈 강타', '돌진 분쇄', '철혈 진동', '강철 폭풍'], color: '#e0a070' },
  'dex+int': { p: 'dex', ix: [0, 1, 2, 4], names: ['마력 화살', '원소 관통', '성운 화살비', '별무리 저격'], color: '#c8a0ff' },
  'dex+wis': { p: 'dex', ix: [0, 3, 2, 1], names: ['영혼 추적', '넋의 화살', '영혼 화살비', '영혼 관통'], color: '#d8c0ff' },
  'dex+vit': { p: 'dex', ix: [4, 0, 2, 5], names: ['야수 사격', '덫 사격', '황야의 화살비', '야생의 폭우'], color: '#a0d080' },
  'int+wis': { p: 'int', ix: [0, 1, 2, 3], names: ['진리의 구슬', '현자의 파동', '진리의 낙하', '현자의 사슬'], color: '#b0b8ff' },
  'int+vit': { p: 'int', ix: [1, 0, 4, 2], names: ['마력 방벽 폭발', '마도 탄환', '마도 포화', '마도 낙성'], color: '#ff9a60' },
  'wis+vit': { p: 'vit', ix: [0, 2, 1, 4], names: ['금강 장타', '금강 진동', '금강 파도', '금강 해일'], color: '#ffe8b0' },
};
const SN = { str: '힘', dex: '민첩', int: '지능', wis: '정신', vit: '체력' };
for (const [key, M] of Object.entries(MIX2)) {
  const [a, b] = key.split('+');
  for (let g = 1; g <= 4; g++) {
    const o = makeGraded(M.p, g, 2, M.ix[g - 1]);
    const ra = Math.round(R[g] * 0.6), rb = Math.round(R[g] * 0.45);
    Object.assign(o, { name: M.names[g - 1], lines: [a, b], line: M.p, school: 'mix', color: M.color, req: { [a]: ra, [b]: rb }, q: 2, desc: `${SN[a]} · ${SN[b]} 혼합 기술. ${o.desc}` });
    if (M.p !== 'vit') { delete o.scale; delete o.hpCost; }
    AWAKEN_SKILLS[`m_${a}${b}${g}`] = o;
  }
}
// 세 스탯 갈래 (4 · 5차 칭호): 그 칭호 이름으로
const MIX3 = {
  'str+dex+int': ['마도 검무', '마도 검신의 춤'], 'str+dex+wis': ['성검 순례', '성검 신관의 심판'], 'str+dex+vit': ['전장의 패도', '전장신의 일격'],
  'str+int+wis': ['신성 마검', '신성 마검신의 섬광'], 'str+int+vit': ['마갑 돌진', '마갑 전신의 포격'], 'str+wis+vit': ['성채 기사의 일격', '성채 수호신의 낙인'],
  'dex+int+wis': ['별의 현자 사격', '별의 현신 강림'], 'dex+int+vit': ['원소 사냥', '원소 사냥신의 화살비'], 'dex+wis+vit': ['대지의 수호 사격', '대지의 화신 폭우'],
  'int+wis+vit': ['대마법 수호', '대마법 수호신의 심판'],
};
for (const [key, names] of Object.entries(MIX3)) {
  const ls = key.split('+'), p = ls[0] === 'wis' ? 'vit' : ls[0];
  [4, 5].forEach((g, k) => {
    const o = makeGraded(p, g, 3, p === 'int' ? [2, 1][k] : p === 'dex' ? [2, 1][k] : [1, 2][k]);
    const req = Object.fromEntries(ls.map((s, i) => [s, Math.round(R[g] * [0.5, 0.4, 0.3][i])]));
    Object.assign(o, { name: names[k], lines: ls, line: p, school: 'mix', color: MIX2[`${ls[0]}+${ls[1]}`]?.color || '#e0d0ff', req, q: 3, desc: `${ls.map((s) => SN[s]).join(' · ')} 세 갈래 기술. ${o.desc}` });
    if (p !== 'vit') { delete o.scale; delete o.hpCost; }
    AWAKEN_SKILLS[`m_${ls.join('')}${g}`] = o;
  });
}
