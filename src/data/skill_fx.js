// 스킬마다 고유 효과 그림 (v0.41): powers.json 이름. 맞은 자리 · 범위 안에 찍는다 (world.js castSkill의 FX)
// 새 그림: Valley of Concordia(makrohn, CC-BY-SA) 땅 가시 · 얼음 가시 · 얼음 촉수 · 물 촉수 · 번개 발톱 · 불기둥 · 물 구슬 · 회오리 · 화살비,
//          Flare 원본 덫 · 마름쇠 · 얼어붙음 · 독침, Fallen Kingdom 어둠 안개
import { SKILLS } from './skills.js';
import { applyForms } from './skill_forms.js';
import { buildRoster } from './skill_roster.js';
export const SKILL_FX = {
  // v0.44 새 효과 그림: Painted Spells(불꽃 · 법신 · 진실의 거울 · 은빛 늑대), Free VFX Sampler(베기 · 불씨 · 먼지 · 물 · 화염 폭발), Haunted Effects(사령 · 영혼 · 유령 안개)
  flame_blade: 'p_burning', flame_wave: 'p_burning', ember_spray: 'p_burning', meteor: 'v_fireburst',
  holy_strike: 'p_dharma', judgement: 'p_dharma', judgement_wave: 'p_dharma', consecrate: 'p_dharma',
  shield_bash: 'v_dust', bulwark_wave: 'v_dust', leap_slam: 'v_dust', iron_charge: 'v_dust', dash_strike: 'v_dust', shadow_step: 'h_ghost_mist',
  thunder_strike: 'c_lightningclaw', thunderstorm: 'c_lightningclaw',
  spirit_arrow: 'h_necrotic', phantom_arrow: 'h_spectral', star_arrow: 'p_mirror', aw_wis1: 'p_mirror',
  earth_cleave: 'c_earthmultispike', quake_blow: 'v_dust', iron_quake: 'c_earthmultispike', earth_stomp: 'v_dust', titan_crush: 'c_earthpost',
  aw_str2: 'c_earthspike', aw_str3: 'c_earthmultispike', aw_vit2: 'c_earthspike', aw_vit3: 'c_earthmultispike', aw_vit4b: 'c_earthpost',
  absolute_zero: 'c_icemultispike', frost_ring: 'c_icespike', blizzard: 'c_icespike', cold_snap: 'c_icetacle', frost_blade: 'c_icetacle', frost_arrow_rain: 'c_icespike',
  ice_lance: 'status_freeze', frost_bolt: 'status_freeze', frozen_orb: 'c_waterpost',
  chain_lightning: 'c_lightningclaw', spark: 'c_lightningclaw', storm_god: 'c_lightningclaw', static_field: 'c_lightningclaw', thunder_cleave: 'c_lightningclaw', aw_int4a: 'c_lightningclaw',
  fire_pillar: 'p_burning', inferno_field: 'p_burning', flame_burst: 'v_fireburst', aw_int1: 'p_burning', aw_int4b: 'c_firepost', aw_int2: 'c_firepost',
  arrow_rain: 'c_arrowrain', hail_of_arrows: 'c_arrowrain', aw_dex3: 'c_arrowrain', trap_arrow: 'bear_trap', scatter_shot: 'caltrops', wind_volley: 'p_wolf', storm_volley: 'p_wolf',
  arcane_storm: 'p_mirror', aw_wis4b: 'p_mirror', overload: 'p_mirror', aw_wis3: 'p_mirror', mana_burst: 'p_mirror', aw_wis2: 'c_waterpost',
  aw_str5: 'c_earthmultispike', aw_dex5: 'c_lightningclaw', aw_int5: 'c_firepost', aw_wis5: 'c_torrentacle', aw_vit5: 'c_earthspike',
  aw_str5b: 'c_earthspike', aw_str5c: 'c_earthmultispike', aw_dex5b: 'c_arrowrain', aw_dex5c: 'c_tornado', aw_int5b: 'c_lightningclaw', aw_int5c: 'c_icemultispike', aw_wis5b: 'c_torrentacle', aw_vit5b: 'c_earthpost',
  aw_x_sd: 'c_tornado', aw_x_si: 'c_lightningclaw', aw_x_sw: 'c_firepost', aw_x_sv: 'c_earthspike', aw_x_di: 'c_lightningclaw', aw_x_dw: 'h_ghost_mist', aw_x_dv: 'bear_trap', aw_x_iw: 'c_firepost', aw_x_iv: 'c_firepost', aw_x_wv: 'c_waterpost',
  mind_blast: 'h_ghost_mist', fan_of_knives: 'caltrops', aw_int3: 'c_icemultispike',
};
for (const [id, fx] of Object.entries(SKILL_FX)) if (SKILLS[id] && !SKILLS[id].fx) SKILLS[id].fx = fx;
// 버프 오라 (v0.41): 불꽃 오라 (astiar_rpg "Fire Aura", CC-BY 4.0) · 얼음 결정 (Flare status_freeze)
export const SKILL_AURA = { berserk: 'inferno_aura', war_cry: 'inferno_aura', swift_fury: 'inferno_aura', battle_mage: 'h_soul_orbit', ice_armor: 'status_freeze',
  divine_shield: 'p_dharma', holy_ward: 'p_dharma', sanctuary: 'p_dharma', aw_wis5c: 'p_dharma', smoke_step: 'h_ghost_mist', focus_mind: 'h_soul_orbit', arcane_shield: 'h_soul_orbit', mana_shield: 'h_soul_orbit',
  taunt_roar: 'bell_gold', stand_fast: 'bell_blue', hunters_mark: 'bell_dark' };
for (const [id, a] of Object.entries(SKILL_AURA)) if (SKILLS[id]) SKILLS[id].aura = a;

// v0.44.32 원소 맞추기: 이름 · 설명으로 원소를 정하고, 효과 그림 · 색이 원소와 다르면 바꾼다
// (얼음 스킬에 불꽃, 번개 스킬에 고드름이 떨어지던 것)
const ELEM_RULES = [
  ['ice', /얼음|빙창|빙결|서리|눈보라|영도|한기|혹한|얼려|얼어|얼리/],
  ['lightning', /번개(?!처럼)|뇌전|뇌우|뇌룡|뇌령|뇌격|천둥|벽력|전기|섬광|폭풍신/],
  ['fire', /불(?!굴|멸|괴|사)|화염|작열|겁화|태양|운석|용암|원소 화살/],
  ['holy', /신성|심판|성검|정화|성역|징벌|빛의 검|빛을 실어|빛의 물결|빛의 화살/],
  ['arcane', /마력|비전|마나|별|진리|성좌|현자|정신|넋|영혼|의지|깨달음|환영/],
];
const FX_ELEM = { p_burning: 'fire', v_fireburst: 'fire', c_firepost: 'fire', fire: 'fire', fireball: 'fire', c_icespike: 'ice', c_icemultispike: 'ice', c_icetacle: 'ice', status_freeze: 'ice', c_waterpost: 'ice', ice: 'ice',
  c_lightningclaw: 'lightning', p_dharma: 'holy', p_mirror: 'arcane', c_torrentacle: 'arcane', h_spectral: 'arcane', h_necrotic: 'arcane', h_ghost_mist: 'arcane', arcane: 'arcane' };
const ELEM_FX = { fire: ['p_burning', 'v_fireburst'], ice: ['c_icespike', 'c_icemultispike'], lightning: ['c_lightningclaw', 'c_lightningclaw'], holy: ['p_dharma', 'p_dharma'], arcane: ['p_mirror', 'c_torrentacle'] };
export const ELEM_COLOR = { fire: '#ff6a2a', ice: '#9fe4ff', lightning: '#c8d8ff', holy: '#ffe080', arcane: '#a890ff' };
const BIG = new Set(['nova', 'meteor', 'rain']);
function hueOf(hex) { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return -1; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return ((h * 60) + 360) % 360; }
const colorFits = (el, hex) => { const h = hueOf(hex); return el === 'fire' ? (h >= 0 && (h < 45 || h > 340)) : el === 'ice' ? h >= 180 && h <= 215 : el === 'lightning' ? h >= 200 && h <= 250 || h === -1 : el === 'holy' ? h >= 40 && h <= 60 : h >= 230 && h <= 290; };
export function skillElem(sk) { const t = `${sk.name} ${sk.desc || ''}`; for (const [el, re] of ELEM_RULES) if (re.test(t)) return el; return null; }
for (const sk of Object.values(SKILLS)) {
  if (sk.passive || sk.type === 'buff') continue;
  const el = skillElem(sk); if (!el) continue;
  sk.elem = el;
  if (sk.fx && FX_ELEM[sk.fx] !== el) sk.fx = ELEM_FX[el][BIG.has(sk.type) ? 1 : 0];
  else if (!sk.fx && ['nova', 'meteor', 'rain', 'chain', 'cone'].includes(sk.type)) sk.fx = ELEM_FX[el][BIG.has(sk.type) ? 1 : 0];
  if (!colorFits(el, sk.color || '#ffffff')) sk.color = ELEM_COLOR[el];
}
applyForms(); // v0.49.53 스킬 형상 (원소를 정한 뒤)
buildRoster(); // v0.50 스킬 정리 (갈래 30 · 차수 · 역할 · 위력) — 형상 · 원소를 정한 뒤
// v0.50.1 Martin Jelinek 효과 그림 (assets/drive/fx, 무료): 작은 그림이라 낮은 차수 · 그림이 겹치던 스킬에
export const JEL_FX = { fire_pillar: 'jel_sign_of_fire', aw_int1: 'jel_fireBall', inferno_field: 'jel_eaterFire', flame_lance: 'jel_swordFire', thunder_strike: 'jel_lighteningBall',
  aw_int4a: 'jel_blue_topEffect', mana_burst: 'jel_energyBall', arcane_surge: 'jel_energyBall', shadow_step: 'jel_blackExplosion' };
for (const [id, fx] of Object.entries(JEL_FX)) if (SKILLS[id]) SKILLS[id].fx = fx;
