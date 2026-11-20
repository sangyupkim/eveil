// v0.49.53 스킬 형상 표: 스킬마다 「어떻게 나가는지」 (world/skillForms.js runForm). 같은 갈래 안에서 겹치지 않게 나눴다.
// type(위력 · 계수)은 그대로, 맞는 모양 · 움직임 · 그림 · 설명만 바꾼다.
import { SKILLS } from './skills.js';

// 형상 정의: who = 쓸 수 있는 쪽 (melee 근접 무기 · ranged 활 · 주문), shape = 맞는 범위 모양
//  one 한 적(+둘레 약간) · self 내 둘레 · tgt 고른 자리 둘레 · line 앞으로 긴 줄 · arc 앞쪽 부채꼴
export const FORM_DEFS = {
  // ── 근접 ──
  xslash: { who: 'melee', shape: 'one', name: '십자 베기', desc: '대상을 X자로 두 번 벤다. 둘레 적도 조금' },
  upper: { who: 'melee', shape: 'one', name: '올려 베기', desc: '대상을 띄워 올렸다가 땅에 처박는다. 잠깐 묶는다' },
  thrust: { who: 'melee', shape: 'one', name: '연속 찌르기', desc: '앞으로 짧게 네 번 찌른다' },
  blink: { who: 'melee', shape: 'one', name: '그림자 연쇄', desc: '가까운 적 사이를 순간이동하며 차례로 벤다' },
  pierce: { who: 'melee', shape: 'line', name: '관통 돌진', desc: '대상을 꿰뚫고 지나가며 길 위의 적을 모두 벤다' },
  leap: { who: 'melee', shape: 'tgt', name: '도약 내려찍기', desc: '뛰어올라 고른 자리에 내려찍는다' },
  boomerang: { who: 'melee', shape: 'line', name: '회전 투척', desc: '무기를 던져 앞으로 날렸다가 되돌려 받는다. 갈 때 · 올 때 맞는다' },
  fissure: { who: 'both', shape: 'line', name: '땅 균열', desc: '앞으로 한 줄로 차례차례 땅을 뚫고 솟구친다' },
  wall: { who: 'both', bow: true, shape: 'line', name: '솟구치는 벽', desc: '앞쪽에 가로로 길게 벽처럼 쏟아진다' },
  ripple: { who: 'both', shape: 'self', name: '파문', desc: '내 둘레로 세 겹 물결이 차례로 퍼진다' },
  pillars: { who: 'both', shape: 'self', name: '둘레 기둥', desc: '내 둘레를 돌며 기둥이 차례로 솟는다' },
  vortex: { who: 'both', shape: 'tgt', name: '소용돌이', desc: '둘레 적을 한가운데로 끌어모은 뒤 터뜨린다' },
  trail: { who: 'melee', shape: 'line', name: '불길 질주', desc: '앞으로 내달리며 지나간 자리를 두 번 태운다' },
  crescent: { who: 'melee', shape: 'line', name: '검기 날리기', desc: '큰 검기를 앞으로 날려 길 위의 적을 벤다' },
  cage: { who: 'both', bow: true, shape: 'tgt', name: '가시 감옥', desc: '고른 자리 둘레를 원으로 둘러싸 가두고 묶는다' },
  stomp: { who: 'melee', shape: 'self', name: '세 번 구르기', desc: '땅을 세 번 굴러 점점 넓게 흔든다' },
  // ── 원거리 (활 · 주문) ──
  split: { who: 'ranged', shape: 'one', name: '갈라지는 탄', desc: '대상에 맞으면 뒤쪽으로 다섯 갈래로 갈라진다' },
  fan: { who: 'ranged', shape: 'arc', name: '부채 사격', desc: '앞쪽으로 부채처럼 펼쳐 쏜다' },
  homing: { who: 'ranged', shape: 'tgt', name: '유도탄', desc: '하늘로 쏘아 올린 탄이 둘레 적을 하나씩 쫓아간다' },
  bounce: { who: 'ranged', shape: 'one', name: '튕기는 탄', desc: '적과 적 사이를 튕기며 날아간다' },
  runes: { who: 'ranged', shape: 'tgt', name: '지연 표식', desc: '둘레 적 발밑에 표식을 새기고 잠시 뒤 한꺼번에 터뜨린다', descBow: '둘레 적 발밑에 덫을 깔고 잠시 뒤 한꺼번에 터뜨린다' },
  spiral: { who: 'ranged', shape: 'self', name: '나선 탄막', desc: '내 둘레로 나선을 그리며 쏟아낸다' },
  orbit: { who: 'spell', shape: 'self', name: '궤도 구슬', desc: '구슬 셋이 내 둘레를 돌며 닿는 적을 친다' },
  totem: { who: 'spell', shape: 'tgt', name: '설치 기둥', desc: '고른 자리에 기둥을 세워 둘레를 여러 번 친다' },
  column: { who: 'ranged', shape: 'line', name: '낙하 행렬', desc: '앞으로 한 줄로 차례차례 내리꽂힌다' },
  cross: { who: 'ranged', shape: 'tgt', name: '십자 폭발', desc: '고른 자리에서 네 갈래로 터져 나간다' },
  implode: { who: 'spell', shape: 'tgt', name: '수축 폭발', desc: '둘레를 한가운데로 빨아들였다가 터진다' },
  star: { who: 'ranged', shape: 'tgt', name: '별자리 낙하', desc: '다섯 꼭짓점에 차례로 떨어진 뒤 가운데가 터진다' },
  tornado: { who: 'ranged', shape: 'line', name: '회오리', desc: '회오리가 앞으로 나아가며 닿는 적을 여러 번 친다' },
  sweep: { who: 'spell', shape: 'arc', name: '휩쓰는 광선', desc: '광선을 왼쪽에서 오른쪽으로 휩쓴다' },
  surge: { who: 'spell', shape: 'line', name: '밀려가는 물결', desc: '넓은 물결이 앞으로 밀려가며 적을 친다' },
  ringfall: { who: 'ranged', shape: 'tgt', name: '둘레 낙하', desc: '고른 자리 바깥 둘레부터 안쪽으로 떨어진다' },
};
export const FORM_IDS = Object.keys(FORM_DEFS);
export const formUser = (sk) => (sk.ap === 'weapon' && sk.needs === 'bow' ? 'bow' : sk.ap === 'weapon' && (sk.needs === 'melee' || ['melee', 'spin', 'cleave', 'dash'].includes(sk.type)) ? 'melee' : sk.ap === 'weapon' ? 'bow' : 'spell');
export const formFits = (f, user) => { const D = FORM_DEFS[f], w = D.who; return w === 'both' ? user !== 'bow' || !!D.bow : w === 'melee' ? user === 'melee' : w === 'spell' ? user === 'spell' : user !== 'melee'; };
// 닿는 거리 (자동 사냥 · 대상 고르기)
export function formReach(sk, d) {
  const s = FORM_DEFS[sk.form]?.shape;
  if (s === 'self') return 0;
  if (s === 'one') return formUser(sk) === 'melee' ? (sk.form === 'blink' ? 6 : d.range) : sk.range || 10;
  if (s === 'arc') return (sk.radius || 7) * 0.8;
  if (s === 'line') return Math.min(sk.range || 8, 8);
  return sk.range || 9;
}


// 스킬 → 형상 (scratchpad 배정 도구로 만든 표. 없는 스킬은 예전 type 그대로)
export const SKILL_FORMS = {
  // blink
  aw_str5b: 'blink', m_strdex1: 'blink', dg_3_1: 'blink', m_strwis4b: 'blink', shield_hammer: 'blink',
  // boomerang
  judgement: 'boomerang', g_dex4_2: 'boomerang', g_vit4_2: 'boomerang', g_vit5_0: 'boomerang', m_strwis4: 'boomerang', sky_dash: 'boomerang',
  // bounce
  frost_bolt: 'bounce', snipe: 'bounce', ranger_shot: 'bounce', g_wis3_1: 'bounce', m_dexwis1: 'bounce', m_intwis1: 'bounce',
  // cage
  shield_bash: 'cage', ice_prison: 'cage', titan_crush: 'cage', aw_dex5: 'cage', aw_x_sd: 'cage', aw_x_dv: 'cage', m_strint2: 'cage', m_intwisvit4: 'cage', dg_4_2: 'cage', m_wisvit4b: 'cage',
  // column
  storm_volley: 'column', aw_dex2: 'column', aw_wis1: 'column', m_dexint4b: 'column', m_intvit4b: 'column', flame_lance: 'column',
  // crescent
  whirlwind: 'crescent', aw_x_si: 'crescent', g_vit3_2: 'crescent', g_vit5_1: 'crescent', m_strwis3: 'crescent', m_strdexwis4: 'crescent', m_strintwis5: 'crescent', dg_2_2: 'crescent', m_strvit2b: 'crescent',
  // cross
  aw_dex4b: 'cross', aw_int3: 'cross', aw_x_iw: 'cross', m_dexwis4: 'cross', aw_int4c: 'cross',
  // fan
  multishot: 'fan', static_field: 'fan', wind_volley: 'fan', arcane_surge: 'fan', m_dexvit1: 'fan', m_dexint3b: 'fan', frost_shard: 'fan',
  // fissure
  consecrate: 'fissure', aw_str1: 'fissure', aw_vit2: 'fissure', aw_int5c: 'fissure', aw_wis5b: 'fissure', aw_vit4b: 'fissure', m_strint4: 'fissure', dg_1_2: 'fissure', m_strdex4b: 'fissure', aw_int3b: 'fissure',
  // homing
  star_arrow: 'homing', aw_dex4a: 'homing', aw_x_iv: 'homing', g_dex3_1: 'homing', g_wis4_0: 'homing', m_dexwis3b: 'homing', aw_int5d: 'homing',
  // implode
  thunder_strike: 'implode', mind_blast: 'implode', mana_burst: 'implode', m_intvit1: 'implode',
  // leap
  leap_slam: 'leap', aw_vit5: 'leap', aw_str5c: 'leap', aw_vit5b: 'leap', g_dex5_1: 'leap', m_strwis2: 'leap', m_strintwis4: 'leap',
  // orbit
  frozen_orb: 'orbit', aw_int4b: 'orbit',
  // pierce
  g_str2_0: 'pierce', g_str2_1: 'pierce', g_vit4_1: 'pierce', m_strvit2: 'pierce', m_strintvit4: 'pierce', dg_2_0: 'pierce', aw_vit2b: 'pierce',
  // pillars
  blade_storm: 'pillars', cold_snap: 'pillars', blade_dance: 'pillars', aw_vit3: 'pillars', g_str3_1: 'pillars', m_wisvit4: 'pillars', m_strdexint4: 'pillars', m_intwisvit5: 'pillars', dg_1_1: 'pillars', m_strint2b: 'pillars',
  // ringfall
  hail_of_arrows: 'ringfall', thunderstorm: 'ringfall', g_dex4_1: 'ringfall', g_wis3_0: 'ringfall', m_dexvit4: 'ringfall', m_dexint2b: 'ringfall', fireball_drop: 'ringfall',
  // ripple
  execute: 'ripple', fan_of_knives: 'ripple', judgement_wave: 'ripple', aw_str2: 'ripple', g_wis1_0: 'ripple', g_vit1_1: 'ripple', m_strvit3: 'ripple', m_intwis2: 'ripple', m_wisvit2: 'ripple', dg_5_1: 'ripple',
  // runes
  phantom_arrow: 'runes', flame_burst: 'runes', overload: 'runes', aw_int5: 'runes', m_dexintvit4: 'runes', m_dexvit3b: 'runes',
  // spiral
  scatter_shot: 'spiral', spark: 'spiral', aw_wis5: 'spiral', m_dexintwis4: 'spiral', m_dexwisvit4: 'spiral', m_dexwis4b: 'spiral',
  // split
  fire_bolt: 'split', trap_arrow: 'split', m_dexint1: 'split', m_dexwis2: 'split', m_intwis4: 'split', m_dexvit4b: 'split', aw_wis2b: 'split',
  // star
  aw_dex3: 'star', aw_int2: 'star', g_int4_0: 'star', g_wis2_1: 'star', m_dexint3: 'star', m_dexintvit5: 'star',
  // stomp
  earth_cleave: 'stomp', thunder_cleave: 'stomp', quake_blow: 'stomp', iron_quake: 'stomp', g_vit3_3: 'stomp', m_strdex4: 'stomp', dg_4_1: 'stomp', aw_str5d: 'stomp',
  // surge
  frost_ring: 'surge', aw_wis3: 'surge', aw_wis4b: 'surge', thunder_lance: 'surge',
  // sweep
  ember_spray: 'sweep', aw_wis5d: 'sweep',
  // thrust
  holy_strike: 'thrust', aw_str4b: 'thrust', aw_str5: 'thrust', g_vit3_0: 'thrust', dg_0_0: 'thrust',
  // tornado
  blizzard: 'tornado', storm_god: 'tornado', aw_dex1: 'tornado', aw_x_di: 'tornado', aw_x_dw: 'tornado', light_lance: 'tornado', aw_wis3b: 'tornado',
  // totem
  fire_pillar: 'totem', smite: 'totem', m_intvit3: 'totem',
  // trail
  shadow_step: 'trail', aw_str4a: 'trail', aw_x_sv: 'trail', g_str3_0: 'trail', m_strintvit5: 'trail', dg_5_0: 'trail', aw_vit3b: 'trail',
  // upper
  power_strike: 'upper', shield_slam: 'upper', m_strvit1: 'upper', dg_4_0: 'upper', m_strint4b: 'upper', m_wisvit3b: 'upper',
  // vortex
  arcane_storm: 'vortex', aw_int5b: 'vortex', g_str4_0: 'vortex', g_vit3_1: 'vortex', m_strvit4: 'vortex', dg_0_1: 'vortex', m_strdex3b: 'vortex', m_wisvit2b: 'vortex', aw_int2b: 'vortex', whirl_slash: 'vortex',
  // wall
  ricochet: 'wall', aw_str3: 'wall', aw_int4a: 'wall', g_str2_2: 'wall', g_wis4_1: 'wall', g_wis4_2: 'wall', g_vit1_0: 'wall', m_dexint4: 'wall', m_strdexvit5: 'wall', m_strwisvit4: 'wall', m_dexintwis5: 'wall', m_dexwisvit5: 'wall', dg_3_2: 'wall', dg_5_2: 'wall',
  // xslash
  counter_slash: 'xslash', flame_blade: 'xslash', g_vit2_1: 'xslash', m_strdex3: 'xslash', m_strwis1: 'xslash', dg_3_0: 'xslash',
};

// skill_fx.js가 원소를 정한 뒤 부른다 (설명을 먼저 바꾸면 원소 판정이 달라진다)
export function applyForms() {
  for (const [id, f] of Object.entries(SKILL_FORMS)) {
    const sk = SKILLS[id], def = FORM_DEFS[f];
    if (!sk || !def) continue;
    sk.form = f;
    sk.desc = (formUser(sk) === 'bow' && def.descBow || def.desc) + (sk.slow ? '. 맞은 적은 느려진다' : '') + (sk.root && f !== 'cage' && f !== 'upper' ? '. 맞은 적을 묶는다' : '') + (sk.echo ? '. 잠시 뒤 한 번 더' : '');
  }
}
