// 스킬마다 고유 효과 그림 (v0.41): powers.json 이름. 맞은 자리 · 범위 안에 찍는다 (world.js castSkill의 FX)
// 새 그림: Valley of Concordia(makrohn, CC-BY-SA) 땅 가시 · 얼음 가시 · 얼음 촉수 · 물 촉수 · 번개 발톱 · 불기둥 · 물 구슬 · 회오리 · 화살비,
//          Flare 원본 덫 · 마름쇠 · 얼어붙음 · 독침, Fallen Kingdom 어둠 안개
import { SKILLS } from './skills.js';
export const SKILL_FX = {
  // v0.44 새 효과 그림: Painted Spells(불꽃 · 법신 · 진실의 거울 · 은빛 늑대), Free VFX Sampler(베기 · 불씨 · 먼지 · 물 · 화염 폭발), Haunted Effects(사령 · 영혼 · 유령 안개)
  power_strike: 'v_slash', counter_slash: 'v_slash', execute: 'v_slash', aw_str1: 'v_slash', aw_str4b: 'v_slash', aw_vit1: 'v_slash', shield_slam: 'v_slash',
  whirlwind: 'v_slash', blade_storm: 'v_slash', flurry: 'v_slash', blade_dance: 'v_slash', aw_str4a: 'v_slash',
  flame_blade: 'v_ember', flame_wave: 'v_ember', ember_spray: 'v_ember', meteor: 'v_fireburst',
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
  arcane_storm: 'p_mirror', aw_wis4b: 'p_mirror', overload: 'p_mirror', aw_wis3: 'p_mirror', mana_burst: 'p_mirror', aw_wis2: 'v_splash',
  aw_str5: 'c_earthmultispike', aw_dex5: 'c_lightningclaw', aw_int5: 'c_firepost', aw_wis5: 'c_torrentacle', aw_vit5: 'c_earthspike',
  aw_str5b: 'c_earthspike', aw_str5c: 'c_earthmultispike', aw_dex5b: 'c_arrowrain', aw_dex5c: 'c_tornado', aw_int5b: 'c_lightningclaw', aw_int5c: 'c_icemultispike', aw_wis5b: 'c_torrentacle', aw_vit5b: 'c_earthpost',
  aw_x_sd: 'c_tornado', aw_x_si: 'c_lightningclaw', aw_x_sw: 'c_firepost', aw_x_sv: 'c_earthspike', aw_x_di: 'c_lightningclaw', aw_x_dw: 'h_ghost_mist', aw_x_dv: 'bear_trap', aw_x_iw: 'c_firepost', aw_x_iv: 'c_firepost', aw_x_wv: 'c_waterpost',
  mind_blast: 'h_ghost_mist', fan_of_knives: 'caltrops', aw_int3: 'c_icemultispike',
};
for (const [id, fx] of Object.entries(SKILL_FX)) if (SKILLS[id] && !SKILLS[id].fx) SKILLS[id].fx = fx;
// 버프 오라 (v0.41): 불꽃 오라 (astiar_rpg "Fire Aura", CC-BY 4.0) · 얼음 결정 (Flare status_freeze)
export const SKILL_AURA = { berserk: 'v_flame_aura', war_cry: 'inferno_aura', swift_fury: 'inferno_aura', battle_mage: 'h_soul_orbit', ice_armor: 'status_freeze',
  divine_shield: 'p_dharma', holy_ward: 'p_dharma', sanctuary: 'p_dharma', aw_wis5c: 'p_dharma', smoke_step: 'h_ghost_mist', focus_mind: 'h_soul_orbit', arcane_shield: 'h_soul_orbit', mana_shield: 'h_soul_orbit' };
for (const [id, a] of Object.entries(SKILL_AURA)) if (SKILLS[id]) SKILLS[id].aura = a;
