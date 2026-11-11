// 스킬 정의. 상점에서 팔지 않는다 — 몬스터가 떨어뜨리는 스킬북으로만 배운다.
// tier: 1 하급 · 2 중급 · 3 상급 · 4 고대 · 5 전설
// type: melee(단일) · spin(주변) · cleave(전방 부채꼴) · bolt(투사체 주문) · arrow(투사체 사격)
//       chain(연쇄) · meteor(지점 낙하) · nova(자신 주변 주문) · heal · buff
// ap: 사용할 때 쌓이는 행동 기록 — weapon(무기 주 스탯) · int · wis · vit
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
  first_aid: {
    name: '응급 처치', glyph: '치', color: '#5fd08a', tier: 1, type: 'heal', ap: 'wis',
    req: { wis: 11 }, mp: 8, cd: 8, power: 25, perRank: 7,
    desc: '상처를 싸매 HP를 회복한다.',
  },
  aimed_shot: {
    name: '조준 사격', glyph: '조', color: '#8fd0a0', tier: 1, type: 'arrow', ap: 'weapon', needs: 'crossbow',
    req: { dex: 12 }, mp: 5, cd: 3, range: 13, power: 2.0, perRank: 0.18,
    desc: '숨을 고르고 정확히 쏘아 큰 피해를 준다. (석궁 필요)',
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
  holy_light: {
    name: '치유의 빛', glyph: '빛', color: '#ffe680', tier: 2, type: 'heal', ap: 'wis',
    req: { wis: 18 }, mp: 18, cd: 10, power: 60, perRank: 14,
    desc: '성스러운 빛으로 크게 회복한다.',
  },
  multishot: {
    name: '연사', glyph: '연', color: '#7fe0b0', tier: 2, type: 'arrow', ap: 'weapon', needs: 'crossbow',
    req: { dex: 18 }, mp: 10, cd: 5, range: 12, power: 0.8, perRank: 0.07, count: 5,
    desc: '여러 적에게 동시에 화살을 쏜다. (석궁 필요)',
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
    name: '신성 보호막', glyph: '막', color: '#ffeaa0', tier: 3, type: 'buff', ap: 'wis',
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
};

export const SKILL_IDS = Object.keys(SKILLS);
export function skillsOfTier(t) {
  return SKILL_IDS.filter((id) => SKILLS[id].tier === t);
}
