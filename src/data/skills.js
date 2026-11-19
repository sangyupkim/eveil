import { MORE_SKILLS } from './skills_more.js';
import { AWAKEN_SKILLS } from './awaken_skills.js';
// 스킬 정의. 상점에서 팔지 않는다 — 몬스터가 떨어뜨리는 스킬북으로만 배운다.
// tier: 1 하급 · 2 중급 · 3 상급 · 4 고대 · 5 전설
// type: melee(단일) · spin(주변) · cleave(전방 부채꼴) · bolt(투사체 주문) · arrow(투사체 사격)
//       chain(연쇄) · meteor(지점 낙하) · nova(자신 주변 주문) · buff (회복 주문은 없다 — 혼자 하는 게임)
//       dash(돌진해 베기) · line(일직선 관통) · rain(지점에 여러 번) · cone(주문 부채꼴)
// ap: 사용할 때 쌓이는 행동 기록 — weapon(무기 주 스탯) · int · vit (정신은 MP를 회복해야 오른다)
// power: 랭크 1의 위력, perRank: 랭크당 증가
//   weapon 계열은 무기 피해 배수, 주문 계열은 기본 피해(지능 배율이 곱해진다)

export const BOOK_TIERS = {
  1: { name: '하급', color: '#cfc6b0' },
  2: { name: '중급', color: '#6fa8ff' },
  3: { name: '상급', color: '#ffd84a' },
  4: { name: '고대', color: '#ff9a3c' },
  5: { name: '전설', color: '#41e07a' },
};

export const SKILLS = {
  power_strike: {
    name: '강타', glyph: '강', color: '#c0533a', tier: 1, type: 'melee', ap: 'weapon', needs: 'melee',
    req: { str: 12 }, mp: 4, cd: 3, range: 0, power: 1.8, perRank: 0.15, anim: 'heavy',
    desc: '무기로 강하게 내리쳐 큰 피해를 준다.',
  },
  fire_bolt: {
    name: '화염 화살', glyph: '화', color: '#ff7a2a', tier: 1, type: 'bolt', ap: 'int',
    req: { int: 12 }, mp: 5, cd: 1.0, range: 11, power: 12, perRank: 3, fx: 'fire',
    desc: '작은 불덩이를 날린다.',
  },
  aimed_shot: {
    name: '조준 사격', glyph: '조', color: '#8fd0a0', tier: 1, type: 'arrow', ap: 'weapon', needs: 'bow',
    req: { dex: 12 }, mp: 5, cd: 3, range: 13, power: 2.0, perRank: 0.18,
    desc: '숨을 고르고 정확히 쏘아 큰 피해를 준다.',
  },
  whirlwind: {
    name: '회전 베기', glyph: '회', color: '#d9823a', tier: 2, type: 'spin', ap: 'weapon', needs: 'melee',
    req: { str: 18 }, mp: 10, cd: 6, radius: 3.6, power: 1.4, perRank: 0.12, anim: 'spin',
    desc: '몸을 돌려 주변의 모든 적을 벤다.',
  },
  fireball: {
    name: '화염구', glyph: '염', color: '#ff5a1a', tier: 2, type: 'bolt', ap: 'int',
    req: { int: 20 }, mp: 14, cd: 4, range: 12, power: 30, perRank: 7, splash: 3, fx: 'fireball',
    desc: '닿으면 폭발하는 화염구를 던진다.',
  },
  multishot: {
    name: '연사', glyph: '연', color: '#7fe0b0', tier: 2, type: 'arrow', ap: 'weapon', needs: 'bow',
    req: { dex: 18 }, mp: 10, cd: 5, range: 12, power: 0.8, perRank: 0.07, count: 5,
    desc: '여러 적에게 동시에 화살을 쏜다.',
  },
  iron_skin: {
    name: '철벽', glyph: '철', color: '#b0b8c8', tier: 2, type: 'buff', ap: 'vit',
    req: { vit: 16 }, mp: 12, cd: 25, duration: 15, power: 30, perRank: 4, buff: 'armorPct',
    desc: '피부를 강철처럼 굳혀 방어력을 높인다.',
  },
  earth_cleave: {
    name: '대지 가르기', glyph: '대', color: '#a8743a', tier: 3, type: 'cleave', ap: 'weapon', needs: 'melee',
    req: { str: 28 }, mp: 18, cd: 8, radius: 6, power: 2.6, perRank: 0.2, anim: 'heavy',
    desc: '땅을 내리찍어 앞쪽 부채꼴의 적을 모두 벤다.',
  },
  chain_lightning: {
    name: '연쇄 번개', glyph: '번', color: '#8fc8ff', tier: 3, type: 'chain', ap: 'int',
    req: { int: 30 }, mp: 22, cd: 6, range: 12, power: 40, perRank: 9, jumps: 4,
    desc: '적과 적 사이를 튀는 번개를 날린다.',
  },
  divine_shield: {
    name: '신성 보호막', glyph: '막', color: '#ffeaa0', tier: 3, type: 'buff', ap: 'int',
    req: { wis: 26 }, mp: 25, cd: 30, duration: 12, power: 80, perRank: 20, buff: 'shield',
    desc: '피해를 흡수하는 보호막을 두른다.',
  },
  meteor: {
    name: '운석 낙하', glyph: '운', color: '#ff4020', tier: 4, type: 'meteor', ap: 'int',
    req: { int: 40 }, mp: 40, cd: 14, range: 13, radius: 4.5, power: 120, perRank: 25,
    desc: '하늘에서 운석을 떨어뜨려 넓은 범위를 불태운다.',
  },
  berserk: {
    name: '피의 광란', glyph: '광', color: '#d02030', tier: 4, type: 'buff', ap: 'weapon',
    req: { str: 36, vit: 30 }, mp: 20, cd: 40, duration: 12, power: 30, perRank: 4, buff: 'berserk',
    desc: '광란에 빠져 공격 속도와 피해가 크게 오른다.',
  },
  judgement: {
    name: '심판의 검', glyph: '심', color: '#ffd040', tier: 5, type: 'spin', ap: 'weapon', needs: 'melee',
    req: { str: 45 }, mp: 50, cd: 25, radius: 7, power: 5, perRank: 0.4, anim: 'spin',
    desc: '빛의 검을 휘둘러 주변을 심판한다.',
  },
  absolute_zero: {
    name: '절대 영도', glyph: '영', color: '#a0e8ff', tier: 5, type: 'nova', ap: 'int',
    req: { int: 55 }, mp: 60, cd: 30, radius: 7.5, power: 200, perRank: 40,
    desc: '주변을 얼려 막대한 피해를 주고 적을 느리게 한다.',
  },
  // ───── 검 (힘) ─────
  dash_strike: {
    name: '돌진 베기', glyph: '돌', color: '#e07a3a', tier: 2, type: 'dash', ap: 'weapon', needs: 'melee',
    req: { str: 16 }, mp: 9, cd: 5, range: 9, power: 1.9, perRank: 0.15, anim: 'heavy',
    desc: '적에게 단숨에 달려들어 벤다.',
  },
  war_cry: {
    name: '전투 함성', glyph: '함', color: '#ff8a4a', tier: 2, type: 'buff', ap: 'weapon', buff: 'might',
    req: { str: 18 }, mp: 12, cd: 24, duration: 14, power: 20, perRank: 3,
    desc: '함성을 질러 주는 피해를 높인다.',
  },
  blade_storm: {
    name: '칼날 폭풍', glyph: '폭', color: '#ffb060', tier: 4, type: 'spin', ap: 'weapon', needs: 'melee',
    req: { str: 38 }, mp: 30, cd: 12, radius: 5.5, power: 2.6, perRank: 0.2, anim: 'spin', hits: 3,
    desc: '세 번 연달아 돌며 주변을 휩쓴다.',
  },
  // ───── 활 (민첩) ─────
  piercing_arrow: {
    name: '관통 화살', glyph: '관', color: '#9ae0c0', tier: 2, type: 'line', ap: 'weapon', needs: 'bow',
    req: { dex: 17 }, mp: 9, cd: 4, range: 14, width: 1.6, power: 1.7, perRank: 0.14,
    desc: '일직선 위의 적을 모두 꿰뚫는다.',
  },
  arrow_rain: {
    name: '화살비', glyph: '비', color: '#a0f0b0', tier: 3, type: 'rain', ap: 'weapon', needs: 'bow',
    req: { dex: 26 }, mp: 18, cd: 9, range: 13, radius: 4.2, power: 1.0, perRank: 0.08, waves: 4,
    desc: '하늘에서 화살을 쏟아 넓은 곳을 여러 번 친다.',
  },
  eagle_eye: {
    name: '매의 눈', glyph: '매', color: '#d0f0a0', tier: 3, type: 'buff', ap: 'weapon', buff: 'focus',
    req: { dex: 24 }, mp: 14, cd: 28, duration: 14, power: 15, perRank: 2,
    desc: '눈을 가늘게 떠 치명타 확률을 높인다.',
  },
  storm_volley: {
    name: '폭풍 사격', glyph: '풍', color: '#7af0d0', tier: 4, type: 'arrow', ap: 'weapon', needs: 'bow',
    req: { dex: 36 }, mp: 28, cd: 8, range: 13, power: 1.1, perRank: 0.08, count: 9,
    desc: '아홉 발을 한꺼번에 흩뿌린다.',
  },
  phantom_arrow: {
    name: '환영 화살', glyph: '환', color: '#c0a0ff', tier: 5, type: 'line', ap: 'weapon', needs: 'bow',
    req: { dex: 48 }, mp: 45, cd: 18, range: 18, width: 3.2, power: 5.5, perRank: 0.4,
    desc: '거대한 빛의 화살이 길 위의 모든 것을 꿰뚫는다.',
  },
  // ───── 지팡이 (지능) ─────
  frost_bolt: {
    name: '서리 화살', glyph: '서', color: '#8fd8ff', tier: 1, type: 'bolt', ap: 'int', slow: 3,
    req: { int: 12 }, mp: 6, cd: 2, range: 11, power: 14, perRank: 3.5, fx: 'ice',
    desc: '얼음 화살로 맞히고 느리게 만든다.',
  },
  flame_wave: {
    name: '화염 파도', glyph: '파', color: '#ff6a2a', tier: 2, type: 'cone', ap: 'int',
    req: { int: 19 }, mp: 14, cd: 5, radius: 7, power: 26, perRank: 6,
    desc: '앞쪽 부채꼴로 불길을 내뿜는다.',
  },
  blizzard: {
    name: '눈보라', glyph: '눈', color: '#b0e8ff', tier: 4, type: 'rain', ap: 'int', slow: 3,
    req: { int: 38 }, mp: 40, cd: 13, range: 13, radius: 5, power: 50, perRank: 10, waves: 5,
    desc: '눈보라를 불러 넓은 곳을 얼리고 계속 깎는다.',
  },
};

// 원래 스킬의 갈래
const SCHOOL_OF = { power_strike: 'sword', whirlwind: 'sword', earth_cleave: 'sword', judgement: 'sword', dash_strike: 'sword', blade_storm: 'sword', war_cry: 'sword', berserk: 'guard',
  aimed_shot: 'bow', multishot: 'bow', piercing_arrow: 'bow', arrow_rain: 'bow', storm_volley: 'bow', phantom_arrow: 'bow', eagle_eye: 'trick',
  fire_bolt: 'fire', fireball: 'fire', meteor: 'fire', flame_wave: 'fire', frost_bolt: 'frost', blizzard: 'frost', absolute_zero: 'frost',
  chain_lightning: 'storm', iron_skin: 'guard', divine_shield: 'holy' };
for (const id in SCHOOL_OF) if (SKILLS[id]) SKILLS[id].school = SCHOOL_OF[id];
for (const [id, sk] of Object.entries(MORE_SKILLS)) SKILLS[id] = { glyph: sk.name[0], ...sk };
for (const [id, sk] of Object.entries(AWAKEN_SKILLS)) SKILLS[id] = { glyph: sk.name[0], ...sk };
export const SCHOOL_NAMES = { sword: '검술', bow: '궁술', fire: '화염', frost: '냉기', storm: '번개', holy: '신성', guard: '수호', trick: '기교', mix: '혼합', bulwark: '철벽', arcane: '비전' };

// v0.44.38 갈래마다 스킬 수를 비슷하게 (단일 스탯 약 32개): 남는 자동 생성 스킬(g_)을 등급이 붐비는 곳부터 뺀다.
//  뺀 스킬을 배운 캐릭터는 SKILL_MOVED로 같은 스탯 · 같은 등급 스킬로 옮긴다 (main.js fixSave)
export const SKILL_MOVED = {};
{
  const TARGET = 32, grade = (sk) => (sk.awaken != null ? sk.awaken : Math.max(0, (sk.tier || 1) - 2));
  const single = (sk) => !sk.passive && Object.keys(sk.req || {}).length === 1 && !sk.lines;
  for (const st of ['str', 'dex', 'int', 'wis', 'vit']) {
    const mine = () => Object.entries(SKILLS).filter(([id, sk]) => single(sk) && sk.req[st] && !id.startsWith('dg_')); // 단검 계열은 따로 (민첩은 활 + 단검 두 계열)
    while (mine().length > TARGET) {
      const byG = {}; for (const [id, sk] of mine()) (byG[grade(sk)] ||= []).push(id);
      const g = Object.keys(byG).filter((k) => byG[k].length > 2 && byG[k].some((id) => id.startsWith('g_'))).sort((x, y) => byG[y].length - byG[x].length)[0];
      if (g == null) break;
      const gen = byG[g].filter((id) => id.startsWith('g_')).sort().reverse()[0];
      const keep = byG[g].find((id) => id !== gen && SKILLS[id].type === SKILLS[gen].type) || byG[g].find((id) => id !== gen);
      delete SKILLS[gen]; SKILL_MOVED[gen] = keep;
    }
  }
  for (const k in SKILL_MOVED) { let v = SKILL_MOVED[k]; while (SKILL_MOVED[v]) v = SKILL_MOVED[v]; SKILL_MOVED[k] = v; }
}
// v0.44.38 단검 계열: 남은 민첩 자동 생성 스킬 셋을 단검(근접) 기술로 (활 대신 단검 · 아무 근접 무기)
for (const [id, name, type, desc, extra] of [
  ['g_dex3_0', '급소 찌르기', 'melee', '단검으로 급소를 깊게 찌른다.', {}],
  ['g_dex4_2', '그림자 연격', 'spin', '그림자처럼 휘돌며 둘레를 벤다.', { radius: 5 }],
  ['g_dex5_1', '천 개의 칼날', 'spin', '칼날을 두 번 휘몰아 둘레를 찢는다.', { radius: 6, hits: 2 }],
]) if (SKILLS[id]) { const sk = SKILLS[id]; delete sk.count; delete sk.range; Object.assign(sk, { name, glyph: name[0], type, needs: 'melee', anim: type === 'spin' ? 'spin' : 'heavy', school: 'trick', desc: `${desc} (근접 무기)`, power: +(sk.power * (type === 'spin' ? 2 : 2.5)).toFixed(2), ...extra }); }
// v0.49.39 한손 · 양손 스킬 수 맞추기: 등급(tier) · 각성 차수마다 두 쪽 수가 같게 모자란 쪽에 더한다.
//  본보기(tpl) 스킬의 모양을 빌리고, 같은 칸(갈래 · 등급 · 차수) 스킬의 요구 능력치에 맞춰 위력 · MP를 키운다
const NEW_GRIP_SKILLS = [
  // [id, 이름, 본보기, 등급, 차수, 설명]
  ['flame_lance', '화염 창', 'ice_lance', 3, null, '불타는 창이 일직선으로 꿰뚫는다.', { slow: undefined, school: 'fire', color: '#ff8a4a', fx: undefined }],
  ['frost_shard', '서리 파편', 'frozen_orb', 3, null, '날카로운 얼음 조각을 날려 대상을 얼린다.', {}],
  ['fireball_drop', '불덩이 낙하', 'meteor', 3, null, '작은 불덩이를 떨어뜨려 둘레를 태운다.', { radius: 3.6 }],
  ['aw_int2b', '서리 폭풍', 'aw_int3', 3, 2, '얼음 비를 네 번 내린다.', { school: 'frost', color: '#a8e0ff', waves: 4 }],
  ['thunder_lance', '번개 창', 'ice_lance', 4, null, '번개를 창처럼 뻗어 한 줄을 꿰뚫는다.', { slow: undefined, school: 'storm', color: '#a0c8ff' }],
  ['aw_int3b', '원소 구체', 'frozen_orb', 4, 3, '세 원소를 뭉친 구체를 날려 터뜨린다.', { school: 'fire', color: '#ffc070' }],
  ['aw_int4c', '종말의 운석', 'aw_int5', 5, 4, '거대한 운석 하나를 떨어뜨린다.', {}],
  ['aw_int5d', '영겁의 눈보라', 'g_int4_0', 5, 5, '끝없는 눈보라를 여덟 번 퍼붓는다.', { school: 'frost', color: '#c0e8ff', waves: 8 }],
  ['whirl_slash', '돌개 베기', 'whirlwind', 3, null, '두 번 휘돌며 둘레를 크게 벤다.', { hits: 2, radius: 4.4 }],
  ['split_strike', '일도양단', 'execute', 4, null, '한 칼에 둘로 가를 듯 내려벤다.', {}],
  ['sky_dash', '천검 돌격', 'g_str3_0', 5, null, '하늘을 가르듯 적 앞까지 달려들어 벤다.', {}],
  ['aw_str4c', '파멸의 가르기', 'aw_str3', 5, 4, '앞의 땅을 통째로 갈라 버린다.', {}],
  ['aw_str5d', '멸천 일섬', 'g_str5_1', 5, 5, '하늘마저 베어 낼 한 번의 일섬.', {}],
  ['shield_hammer', '방패 내려치기', 'titan_crush', 3, null, '방패째로 적을 내려친다. 방어력이 높을수록 세다.', {}],
  ['aw_vit2b', '철벽 돌진', 'shield_charge', 3, 2, '철벽 같은 몸으로 적에게 부딪친다. 방어력이 높을수록 세다.', {}],
  ['aw_vit3b', '성채 돌격', 'shield_charge', 4, 3, '성채가 밀려오듯 달려들어 들이받는다. 방어력이 높을수록 세다.', {}],
  ['aw_wis2b', '비전 화살', 'g_wis3_1', 3, 2, '모은 마력을 화살처럼 한 대상에게 날린다. 최대 MP가 클수록 강하다.', {}],
  ['light_lance', '빛의 창', 'overload', 4, null, '빛의 창으로 한 줄을 꿰뚫는다. 최대 MP가 클수록 강하다.', { school: 'holy', color: '#ffe8a0' }],
  ['aw_wis3b', '마력 폭풍우', 'arcane_storm', 4, 3, '마력의 폭풍우를 다섯 번 내린다.', { waves: 5 }],
  ['aw_wis5d', '무한의 광선', 'aw_wis5b', 5, 5, '끝없는 마력을 한 줄로 쏟아낸다.', { color: '#d8c8ff' }],
];
for (const [id, name, tpl, tier, awaken, desc, extra] of NEW_GRIP_SKILLS) {
  const T = SKILLS[tpl]; if (!T || SKILLS[id]) continue;
  const line = Object.keys(T.req)[0];
  const sibs = Object.values(SKILLS).filter((x) => x !== T && (x.lines || Object.keys(x.req || {})).length === 1 && x.req?.[line] && x.tier === tier && (x.awaken ?? null) === awaken && x.type !== 'buff');
  const req = sibs.length ? Math.round(sibs.reduce((a, x) => a + x.req[line], 0) / sibs.length) : T.req[line], k = req / T.req[line];
  const spell = T.ap === 'int'; // 지능 주문 위력은 큰 수, 무기 · 마나 배율 스킬은 배율
  const o = { ...T, name, glyph: name[0], desc, tier, req: { [line]: req }, power: +(T.power * k ** (spell ? 0.6 : 0.3)).toFixed(2), perRank: +(T.perRank * k ** (spell ? 0.6 : 0.3)).toFixed(2), mp: Math.round(T.mp * k ** 0.35) };
  if (awaken != null) { o.awaken = awaken; o.line = line; } else { delete o.awaken; delete o.line; }
  delete o.grip; delete o.q;
  for (const [x, v] of Object.entries(extra)) { if (v === undefined) delete o[x]; else o[x] = v; }
  SKILLS[id] = o;
}
// v0.49.38 한손 + 보조 ↔ 양손: 상급(tier 3) 이상 단일 갈래 스킬은 모양에 따라 무기 손이 정해진다. 하급 · 중급 · 버프 · 혼합 · 민첩은 공통
//  지능: 한손(완드) = 대상을 노리는 주문 · 양손(지팡이) = 넓은 광역 / 정신: 한손(홀 + 보주) = 창 · 광선 · 양손(대홀) = 대량 마나 주문
//  힘 · 체력: 한손(+ 방패) = 단일 · 돌진 · 내려치기 · 양손(대검 · 대방패) = 휘두르기 · 가르기 · 충격파
export const GRIP_RULES = {
  int: { one: ['bolt', 'chain', 'line', 'meteor'], two: ['nova', 'rain'] },
  wis: { one: ['bolt', 'line'], two: ['nova', 'rain'] },
  str: { one: ['melee', 'dash'], two: ['cleave', 'spin'] },
  vit: { one: ['melee', 'dash'], two: ['cleave', 'spin'] },
};
export const GRIP_NAMES = { one: '한손 무기', two: '양손 무기' };
for (const sk of Object.values(SKILLS)) {
  const ls = sk.lines || Object.keys(sk.req || {});
  if (ls.length !== 1 || (sk.tier || 1) < 3 || sk.type === 'buff' || sk.passive) continue;
  const R = GRIP_RULES[ls[0]]; if (!R) continue;
  sk.grip = R.one.includes(sk.type) ? 'one' : R.two.includes(sk.type) ? 'two' : undefined;
}
export const SKILL_IDS = Object.keys(SKILLS);
export function skillsOfTier(t) {
  return SKILL_IDS.filter((id) => SKILLS[id].tier === t && !SKILLS[id].awaken); // 각성 등급이 정해진 스킬은 따로 (몬스터 레벨로, game/loot.js)
}
