// 스킬마다 고유 효과 그림 (v0.41): powers.json 이름. 맞은 자리 · 범위 안에 찍는다 (world.js castSkill의 FX)
// 새 그림: Valley of Concordia(makrohn, CC-BY-SA) 땅 가시 · 얼음 가시 · 얼음 촉수 · 물 촉수 · 번개 발톱 · 불기둥 · 물 구슬 · 회오리 · 화살비,
//          Flare 원본 덫 · 마름쇠 · 얼어붙음 · 독침, Fallen Kingdom 어둠 안개
import { SKILLS } from './skills.js';
export const SKILL_FX = {
  earth_cleave: 'c_earthmultispike', quake_blow: 'c_earthspike', iron_quake: 'c_earthmultispike', earth_stomp: 'c_earthspike', titan_crush: 'c_earthpost',
  aw_str2: 'c_earthspike', aw_str3: 'c_earthmultispike', aw_vit2: 'c_earthspike', aw_vit3: 'c_earthmultispike', aw_vit4b: 'c_earthpost',
  absolute_zero: 'c_icemultispike', frost_ring: 'c_icespike', blizzard: 'c_icespike', cold_snap: 'c_icetacle', frost_blade: 'c_icetacle', frost_arrow_rain: 'c_icespike',
  ice_lance: 'status_freeze', frost_bolt: 'status_freeze', frozen_orb: 'c_waterpost',
  chain_lightning: 'c_lightningclaw', spark: 'c_lightningclaw', storm_god: 'c_lightningclaw', static_field: 'c_lightningclaw', thunder_cleave: 'c_lightningclaw', aw_int4a: 'c_lightningclaw',
  fire_pillar: 'c_firepost', inferno_field: 'c_firepost', flame_burst: 'c_firepost', aw_int1: 'c_firepost', aw_int4b: 'c_firepost', aw_int2: 'c_firepost',
  arrow_rain: 'c_arrowrain', hail_of_arrows: 'c_arrowrain', aw_dex3: 'c_arrowrain', trap_arrow: 'bear_trap', scatter_shot: 'caltrops', wind_volley: 'c_tornado', storm_volley: 'c_tornado',
  arcane_storm: 'c_torrentacle', aw_wis4b: 'c_torrentacle', overload: 'c_torrentacle', aw_wis3: 'c_torrentacle', mana_burst: 'c_waterpost', aw_wis2: 'c_waterpost',
  aw_str5: 'c_earthmultispike', aw_dex5: 'c_lightningclaw', aw_int5: 'c_firepost', aw_wis5: 'c_torrentacle', aw_vit5: 'c_earthspike',
  mind_blast: 'dark_mist_alt', fan_of_knives: 'caltrops', aw_int3: 'c_icemultispike',
};
for (const [id, fx] of Object.entries(SKILL_FX)) if (SKILLS[id] && !SKILLS[id].fx) SKILLS[id].fx = fx;
// 버프 오라 (v0.41): 불꽃 오라 (astiar_rpg "Fire Aura", CC-BY 4.0) · 얼음 결정 (Flare status_freeze)
export const SKILL_AURA = { berserk: 'inferno_aura', war_cry: 'inferno_aura', swift_fury: 'inferno_aura', battle_mage: 'inferno_aura', ice_armor: 'status_freeze' };
for (const [id, a] of Object.entries(SKILL_AURA)) if (SKILLS[id]) SKILLS[id].aura = a;
