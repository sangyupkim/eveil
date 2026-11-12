// 스킬 확장 (기획서 4.3): 갈래별 스킬 + 혼합 기술. 같은 형태(type)의 연출 · 판정을 그대로 쓴다.
// school: 검술 sword · 궁술 bow · 화염 fire · 냉기 frost · 번개 storm · 신성 holy · 수호 guard · 기교 trick · 혼합 mix
// mix: 혼합 기술 — 그 스탯만큼 피해가 더 오르고(1점당 1.2%), 쓸 때 그 스탯 행동 기록도 쌓인다
// 회복 스킬은 없다 (기획서 7).

const req = (t) => 10 + t * 8; // 단계별 조건 스탯 기준
const W = (o) => ({ ap: 'weapon', ...o });

export const MORE_SKILLS = {
  // ── 검술 (힘 · 검) ──
  counter_slash: W({ name: '반격 베기', color: '#d0603a', tier: 1, type: 'melee', needs: 'melee', school: 'sword', req: { str: req(1) }, mp: 5, cd: 4, power: 1.6, perRank: 0.13, anim: 'attack2', desc: '빠르게 되받아 벤다.' }),
  shield_bash: W({ name: '방패 밀치기', color: '#b8a080', tier: 2, type: 'cleave', needs: 'melee', school: 'sword', slow: 2, req: { str: req(2) }, mp: 9, cd: 6, radius: 4, power: 1.5, perRank: 0.12, anim: 'heavy', desc: '앞을 밀쳐 치고 느리게 만든다.' }),
  execute: W({ name: '처형', color: '#a01818', tier: 3, type: 'melee', needs: 'melee', school: 'sword', req: { str: req(3) }, mp: 16, cd: 9, power: 3.6, perRank: 0.28, anim: 'heavy', desc: '한 놈에게 온 힘을 실어 내려친다.' }),
  leap_slam: W({ name: '도약 내려찍기', color: '#c07a3a', tier: 3, type: 'dash', needs: 'melee', school: 'sword', req: { str: req(3) }, mp: 18, cd: 8, range: 10, power: 2.6, perRank: 0.2, anim: 'heavy', desc: '뛰어올라 적에게 내려찍는다.' }),
  flurry: W({ name: '연속 베기', color: '#e09a5a', tier: 2, type: 'spin', needs: 'melee', school: 'sword', req: { str: req(2) }, mp: 10, cd: 5, radius: 3, power: 1.2, perRank: 0.1, anim: 'spin', desc: '쉴 새 없이 둘레를 벤다.' }),

  // ── 궁술 (민첩 · 활) ──
  snipe: W({ name: '저격', color: '#c0f0d0', tier: 3, type: 'arrow', needs: 'bow', school: 'bow', req: { dex: req(3) }, mp: 16, cd: 8, range: 18, power: 3.6, perRank: 0.28, desc: '멀리서 한 발로 크게 꿰뚫는다.' }),
  scatter_shot: W({ name: '산탄 사격', color: '#a0d890', tier: 2, type: 'arrow', needs: 'bow', school: 'bow', req: { dex: req(2) }, mp: 11, cd: 5, range: 9, power: 0.7, perRank: 0.06, count: 7, desc: '가까운 적들에게 화살을 흩뿌린다.' }),
  trap_arrow: W({ name: '덫 화살', color: '#90b070', tier: 1, type: 'arrow', needs: 'bow', school: 'bow', slow: 3, req: { dex: req(1) }, mp: 6, cd: 4, range: 12, power: 1.3, perRank: 0.1, desc: '맞은 적의 발을 묶어 느리게 만든다.' }),
  hail_of_arrows: W({ name: '화살 폭우', color: '#b0f0a0', tier: 4, type: 'rain', needs: 'bow', school: 'bow', req: { dex: req(4) }, mp: 34, cd: 13, range: 14, radius: 5, power: 1.2, perRank: 0.09, waves: 6, desc: '하늘을 화살로 덮는다.' }),
  ricochet: W({ name: '도탄 사격', color: '#d8f0b0', tier: 3, type: 'line', needs: 'bow', school: 'bow', req: { dex: req(3) }, mp: 15, cd: 6, range: 16, width: 2.2, power: 2, perRank: 0.16, desc: '넓게 휘는 화살로 줄지은 적을 뚫는다.' }),

  // ── 화염 (지능) ──
  fire_pillar: { name: '불기둥', color: '#ff6020', tier: 2, type: 'meteor', ap: 'int', school: 'fire', req: { int: req(2) }, mp: 16, cd: 6, range: 12, radius: 2.6, power: 38, perRank: 8, desc: '적 발밑에서 불기둥이 솟는다.' },
  flame_burst: { name: '화염 폭발', color: '#ff8a3a', tier: 3, type: 'nova', ap: 'int', school: 'fire', req: { int: req(3) }, mp: 24, cd: 9, radius: 4.5, power: 60, perRank: 12, desc: '몸 둘레로 불꽃이 터진다.' },
  inferno_field: { name: '불바다', color: '#ff4a10', tier: 4, type: 'rain', ap: 'int', school: 'fire', req: { int: req(4) }, mp: 38, cd: 14, range: 13, radius: 4.8, power: 40, perRank: 8, waves: 6, desc: '땅을 오래 태우는 불바다를 깐다.' },
  ember_spray: { name: '불씨 뿌리기', color: '#ffa050', tier: 1, type: 'cone', ap: 'int', school: 'fire', req: { int: req(1) }, mp: 6, cd: 2.5, radius: 5, power: 14, perRank: 3, desc: '짧게 불씨를 흩뿌린다.' },

  // ── 냉기 (지능) ──
  ice_lance: { name: '얼음 창', color: '#a8e0ff', tier: 2, type: 'line', ap: 'int', school: 'frost', slow: 2, req: { int: req(2) }, mp: 13, cd: 4, range: 14, width: 1.4, power: 30, perRank: 7, desc: '얼음 창이 일직선으로 꿰뚫는다.' },
  frost_ring: { name: '서리 고리', color: '#c0f0ff', tier: 3, type: 'nova', ap: 'int', school: 'frost', slow: 3, req: { int: req(3) }, mp: 22, cd: 10, radius: 5, power: 45, perRank: 9, desc: '둘레를 얼려 느리게 만든다.' },
  frozen_orb: { name: '얼음 구슬', color: '#90d8ff', tier: 4, type: 'bolt', ap: 'int', school: 'frost', slow: 3, req: { int: req(4) }, mp: 32, cd: 8, range: 13, power: 90, perRank: 16, splash: 4, fx: 'ice', desc: '터지며 둘레를 얼리는 구슬을 날린다.' },
  ice_armor: { name: '얼음 갑옷', color: '#d0f0ff', tier: 3, type: 'buff', ap: 'int', school: 'frost', req: { int: req(3) }, mp: 20, cd: 28, duration: 14, power: 25, perRank: 3, buff: 'armorPct', desc: '얼음을 둘러 방어력을 높인다.' },
  cold_snap: { name: '한기', color: '#b0e0ff', tier: 1, type: 'cone', ap: 'int', school: 'frost', slow: 2, req: { int: req(1) }, mp: 6, cd: 3, radius: 5, power: 11, perRank: 2.5, desc: '찬 바람으로 앞을 얼린다.' },

  // ── 번개 (지능) ──
  spark: { name: '불꽃 튀기기', color: '#d0e8ff', tier: 1, type: 'chain', ap: 'int', school: 'storm', req: { int: req(1) }, mp: 6, cd: 2, range: 10, power: 12, perRank: 3, jumps: 2, desc: '작은 번개가 둘을 튄다.' },
  thunder_strike: { name: '번개 강타', color: '#9fc8ff', tier: 2, type: 'meteor', ap: 'int', school: 'storm', req: { int: req(2) }, mp: 15, cd: 5, range: 13, radius: 2.2, power: 42, perRank: 9, desc: '하늘에서 번개가 내리친다.' },
  static_field: { name: '정전기 장', color: '#b0d0ff', tier: 3, type: 'nova', ap: 'int', school: 'storm', req: { int: req(3) }, mp: 22, cd: 8, radius: 5.5, power: 50, perRank: 10, desc: '둘레에 전기가 흐른다.' },
  thunderstorm: { name: '뇌우', color: '#80b0ff', tier: 4, type: 'rain', ap: 'int', school: 'storm', req: { int: req(4) }, mp: 40, cd: 14, range: 14, radius: 5, power: 55, perRank: 11, waves: 5, desc: '번개 구름이 넓은 곳을 친다.' },
  storm_god: { name: '폭풍신의 분노', color: '#6090ff', tier: 5, type: 'chain', ap: 'int', school: 'storm', req: { int: req(5) + 4 }, mp: 55, cd: 20, range: 14, power: 160, perRank: 30, jumps: 8, desc: '번개가 온 무리를 휩쓴다.' },

  // ── 신성 · 정신 (정신) ──
  holy_ward: { name: '수호의 빛', color: '#fff0b0', tier: 1, type: 'buff', ap: 'wis', school: 'holy', req: { wis: req(1) }, mp: 10, cd: 20, duration: 10, power: 30, perRank: 8, buff: 'shield', desc: '작은 보호막을 두른다.' },
  smite: { name: '징벌', color: '#ffe080', tier: 2, type: 'bolt', ap: 'int', apStat: 'wis', school: 'holy', req: { wis: req(2) }, mp: 12, cd: 3, range: 12, power: 28, perRank: 6, fx: 'fire', desc: '빛의 화살로 친다.' },
  consecrate: { name: '정화의 땅', color: '#ffe8a0', tier: 3, type: 'nova', ap: 'int', apStat: 'wis', school: 'holy', req: { wis: req(3) }, mp: 22, cd: 9, radius: 5, power: 46, perRank: 9, desc: '발밑을 축복해 둘레의 적을 태운다.' },
  sanctuary: { name: '성역', color: '#fff4c0', tier: 4, type: 'buff', ap: 'wis', school: 'holy', req: { wis: req(4) }, mp: 35, cd: 40, duration: 15, power: 220, perRank: 40, buff: 'shield', desc: '두꺼운 빛의 결계를 두른다.' },
  focus_mind: { name: '정신 집중', color: '#d0b0ff', tier: 2, type: 'buff', ap: 'wis', school: 'holy', buff: 'focus', req: { wis: req(2) }, mp: 12, cd: 26, duration: 14, power: 12, perRank: 2, desc: '마음을 가다듬어 치명타 확률을 높인다.' },

  // ── 수호 (체력) ──
  taunt_roar: W({ name: '도발의 포효', color: '#c09060', tier: 1, type: 'buff', ap: 'vit', school: 'guard', buff: 'armorPct', req: { vit: req(1) }, mp: 8, cd: 20, duration: 10, power: 20, perRank: 3, desc: '포효하며 몸을 굳힌다.' }),
  stand_fast: W({ name: '버티기', color: '#a0a8b8', tier: 3, type: 'buff', ap: 'vit', school: 'guard', buff: 'shield', req: { vit: req(3) }, mp: 18, cd: 30, duration: 12, power: 120, perRank: 22, desc: '이를 악물고 버틴다.' }),
  thorn_mail: W({ name: '가시 갑옷', color: '#90a070', tier: 2, type: 'buff', ap: 'vit', school: 'guard', buff: 'armorPct', req: { vit: req(2) }, mp: 12, cd: 26, duration: 16, power: 35, perRank: 4, desc: '가시 돋친 갑옷을 두른다.' }),
  earth_stomp: W({ name: '대지 구르기', color: '#a08050', tier: 4, type: 'spin', apStat: 'vit', school: 'guard', slow: 2, req: { vit: req(4) }, mp: 30, cd: 12, radius: 5.5, power: 2.2, perRank: 0.18, anim: 'heavy', desc: '땅을 굴러 둘레를 흔든다.' }),

  // ── 기교 (민첩 · 아무 무기) ──
  smoke_step: W({ name: '연막', color: '#909090', tier: 2, type: 'buff', ap: 'dex', school: 'trick', buff: 'focus', req: { dex: req(2) }, mp: 10, cd: 22, duration: 10, power: 14, perRank: 2, desc: '연막 속에서 급소를 노린다.' }),
  poison_edge: W({ name: '독 바르기', color: '#80c050', tier: 1, type: 'buff', ap: 'dex', school: 'trick', buff: 'might', req: { dex: req(1) }, mp: 8, cd: 22, duration: 14, power: 12, perRank: 2, desc: '무기에 독을 발라 피해를 높인다.' }),
  shadow_step: W({ name: '그림자 걸음', color: '#7060a0', tier: 3, type: 'dash', school: 'trick', req: { dex: req(3) }, mp: 14, cd: 6, range: 10, power: 2.2, perRank: 0.18, desc: '그림자처럼 적 곁으로 파고든다.' }),
  fan_of_knives: W({ name: '단검 부채', color: '#c0c0d0', tier: 4, type: 'spin', school: 'trick', req: { dex: req(4) }, mp: 28, cd: 10, radius: 5, power: 2.4, perRank: 0.2, anim: 'spin', desc: '단검을 둘레로 흩뿌린다.' }),

  // ── 혼합 기술 (두 스탯 · 무기는 기술에 따라) ──
  flame_blade: W({ name: '불꽃 베기', color: '#ff7040', tier: 2, type: 'melee', needs: 'melee', school: 'mix', mix: 'int', req: { str: req(2), int: req(2) - 4 }, mp: 10, cd: 4, power: 2.2, perRank: 0.17, anim: 'heavy', desc: '불붙은 검으로 벤다.' }),
  frost_blade: W({ name: '서리 칼날', color: '#a0e0ff', tier: 3, type: 'cleave', needs: 'melee', school: 'mix', mix: 'int', slow: 3, req: { str: req(3), int: req(3) - 6 }, mp: 18, cd: 7, radius: 5.5, power: 2.4, perRank: 0.18, anim: 'heavy', desc: '얼어붙는 칼날로 앞을 가른다.' }),
  thunder_cleave: W({ name: '뇌전 회전', color: '#9fc0ff', tier: 4, type: 'spin', needs: 'melee', school: 'mix', mix: 'int', req: { str: req(4), int: req(4) - 8 }, mp: 30, cd: 10, radius: 5, power: 2.8, perRank: 0.22, anim: 'spin', desc: '번개를 두르고 휘돈다.' }),
  holy_strike: W({ name: '신성 일격', color: '#ffe070', tier: 2, type: 'melee', needs: 'melee', school: 'mix', mix: 'wis', req: { str: req(2), wis: req(2) - 4 }, mp: 10, cd: 4, power: 2.1, perRank: 0.16, anim: 'heavy', desc: '빛을 실어 내려친다.' }),
  judgement_wave: W({ name: '심판의 물결', color: '#fff0a0', tier: 4, type: 'cleave', needs: 'melee', school: 'mix', mix: 'wis', req: { str: req(4), wis: req(4) - 8 }, mp: 30, cd: 11, radius: 7, power: 3, perRank: 0.22, anim: 'heavy', desc: '빛의 물결로 앞을 쓸어 낸다.' }),
  iron_charge: W({ name: '강철 돌격', color: '#b0b0c0', tier: 3, type: 'dash', needs: 'melee', school: 'mix', mix: 'vit', req: { str: req(3), vit: req(3) - 6 }, mp: 16, cd: 7, range: 11, power: 2.8, perRank: 0.2, anim: 'heavy', desc: '몸으로 들이받으며 벤다.' }),
  quake_blow: W({ name: '지진 강타', color: '#a07040', tier: 4, type: 'spin', needs: 'melee', school: 'mix', mix: 'vit', slow: 2, req: { str: req(4), vit: req(4) - 8 }, mp: 28, cd: 11, radius: 6, power: 2.6, perRank: 0.2, anim: 'heavy', desc: '땅을 쪼개 둘레를 흔든다.' }),
  blade_dance: W({ name: '칼춤', color: '#f0a070', tier: 3, type: 'spin', needs: 'melee', school: 'mix', mix: 'dex', req: { str: req(3) - 6, dex: req(3) }, mp: 18, cd: 7, radius: 4, power: 2.2, perRank: 0.18, anim: 'spin', desc: '빠르게 춤추듯 벤다.' }),
  elemental_arrow: W({ name: '원소 화살', color: '#ff9a50', tier: 2, type: 'arrow', needs: 'bow', school: 'mix', mix: 'int', req: { dex: req(2), int: req(2) - 4 }, mp: 10, cd: 4, range: 13, power: 2.1, perRank: 0.16, desc: '불꽃을 머금은 화살.' }),
  frost_arrow_rain: W({ name: '서리 화살비', color: '#a0e8ff', tier: 3, type: 'rain', needs: 'bow', school: 'mix', mix: 'int', slow: 3, req: { dex: req(3), int: req(3) - 6 }, mp: 22, cd: 10, range: 13, radius: 4.5, power: 1.1, perRank: 0.08, waves: 5, desc: '얼어붙는 화살을 쏟는다.' }),
  star_arrow: W({ name: '별빛 화살', color: '#c0a0ff', tier: 5, type: 'line', needs: 'bow', school: 'mix', mix: 'int', req: { dex: req(5), int: req(5) - 10 }, mp: 45, cd: 14, range: 20, width: 3, power: 5, perRank: 0.4, desc: '별을 꿰어 쏘는 한 발.' }),
  spirit_arrow: W({ name: '영혼 화살', color: '#e0c0ff', tier: 3, type: 'arrow', needs: 'bow', school: 'mix', mix: 'wis', req: { dex: req(3), wis: req(3) - 6 }, mp: 16, cd: 6, range: 14, power: 1, perRank: 0.08, count: 4, desc: '영혼이 깃든 화살이 여럿을 쫓는다.' }),
  wind_volley: W({ name: '바람 사격', color: '#c0f0e0', tier: 4, type: 'arrow', needs: 'bow', school: 'mix', mix: 'wis', req: { dex: req(4), wis: req(4) - 8 }, mp: 28, cd: 9, range: 15, power: 1.2, perRank: 0.09, count: 8, desc: '바람을 타고 화살이 쏟아진다.' }),
  ranger_shot: W({ name: '야생의 일격', color: '#a0c070', tier: 3, type: 'arrow', needs: 'bow', school: 'mix', mix: 'vit', req: { dex: req(3), vit: req(3) - 6 }, mp: 16, cd: 7, range: 14, power: 3.2, perRank: 0.24, desc: '버틴 만큼 묵직하게 쏜다.' }),
  arcane_shield: { name: '마력 방패', color: '#a0b0ff', tier: 2, type: 'buff', ap: 'int', school: 'mix', mix: 'wis', buff: 'shield', req: { int: req(2), wis: req(2) - 4 }, mp: 16, cd: 24, duration: 12, power: 90, perRank: 16, desc: '마력을 굳혀 보호막을 두른다.' },
  mind_blast: { name: '정신 폭발', color: '#c090ff', tier: 4, type: 'nova', ap: 'int', school: 'mix', mix: 'wis', req: { int: req(4), wis: req(4) - 8 }, mp: 36, cd: 12, radius: 6, power: 110, perRank: 20, desc: '정신의 힘을 둘레로 터뜨린다.' },
  battle_mage: { name: '전투 주문', color: '#ff9070', tier: 3, type: 'buff', ap: 'int', school: 'mix', mix: 'vit', buff: 'might', req: { int: req(3), vit: req(3) - 6 }, mp: 18, cd: 26, duration: 14, power: 25, perRank: 3, desc: '주문으로 몸을 달궈 피해를 높인다.' },
  iron_monk: W({ name: '금강불괴', color: '#e0c090', tier: 4, type: 'buff', ap: 'vit', school: 'mix', mix: 'wis', buff: 'shield', req: { vit: req(4), wis: req(4) - 8 }, mp: 30, cd: 34, duration: 14, power: 260, perRank: 45, desc: '몸과 마음을 굳혀 큰 보호막을 두른다.' }),
  swift_fury: W({ name: '질풍노도', color: '#ffb070', tier: 4, type: 'buff', ap: 'dex', school: 'mix', mix: 'str', buff: 'berserk', req: { dex: req(4), str: req(4) - 8 }, mp: 24, cd: 36, duration: 12, power: 25, perRank: 3, desc: '바람처럼 몰아친다.' }),
  hunters_mark: W({ name: '사냥꾼의 표식', color: '#e0e080', tier: 2, type: 'buff', ap: 'dex', school: 'mix', mix: 'vit', buff: 'focus', req: { dex: req(2), vit: req(2) - 4 }, mp: 12, cd: 24, duration: 14, power: 14, perRank: 2, desc: '먹잇감을 노려 치명타를 높인다.' }),
};

// 갈래 → 기본 아이콘 (Flare 기술 아이콘 번호)
export const SCHOOL_ICON = { sword: 5, bow: 16, fire: 34, frost: 38, storm: 7, holy: 26, guard: 4, trick: 6, mix: 45 };
// 지역마다 잘 나오는 갈래 (스킬북 드랍 가중치 3배)
export const ZONE_SCHOOLS = {
  field: ['sword', 'bow'], forest: ['bow', 'trick'], grave: ['holy', 'frost'], ruins: ['sword', 'guard'],
  swamp: ['storm', 'trick'], frost: ['frost', 'guard'], valley: ['bow', 'storm'], inferno: ['fire', 'sword'],
  orcfort: ['sword', 'guard'], webwood: ['bow', 'trick'], harbor: ['holy', 'frost'], demongate: ['fire', 'storm'],
};
