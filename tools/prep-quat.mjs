// Quaternius(CC0) 모델을 게임용으로 다듬어 assets/models/ 에 넣는다.
//   - 맨몸(hero_m · hero_f) + 옷 조각(peasant_* · ranger_*) + 머리카락: 같은 뼈대(Universal Rig)
//   - 주인공 동작: UAL1 · UAL2에서 쓰는 것만 골라 이름을 게임용으로 바꿔 hero_anims.glb 하나로
//   - 몬스터: 모델마다 자기 뼈대 · 동작. 동작 이름을 idle · walk · run · attack · attack2 · hit · death 로 통일
//   - 무기 · 투구 · 아이템 그림용 소품
// 사용: node tools/prep-quat.mjs <moorfall-assets 폴더> <quaternius-showcase/public/glb 폴더>
//   git clone --depth 1 https://github.com/Dallolz/moorfall-assets
//   git clone --depth 1 https://github.com/trebeljahr/quaternius-showcase
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, resample, textureCompress } from '@gltf-transform/functions';

const [MF, QS] = process.argv.slice(2);
if (!MF || !QS) { console.error('원본 폴더 둘을 인자로 주세요'); process.exit(1); }
const OUT = path.resolve('assets/models');
const io = new NodeIO();
const short = (n) => n.split('|').pop();
function killAnim(a) { for (const c of a.listChannels()) c.dispose(); for (const s of a.listSamplers()) s.dispose(); a.dispose(); }
function dropOrphans(doc) { for (const a of doc.getRoot().listAccessors()) if (a.listParents().every((p) => p.propertyType === 'Root')) a.dispose(); }
let total = 0;
async function write(doc, name, { tex = 512 } = {}) {
  const steps = [resample({ tolerance: 1e-3 }), dedup(), prune()];
  if (doc.getRoot().listTextures().length) steps.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [tex, tex], quality: 82 }));
  await doc.transform(...steps);
  dropOrphans(doc);
  const out = path.join(OUT, `${name}.glb`);
  await io.write(out, doc);
  const kb = fs.statSync(out).size / 1024;
  total += kb;
  console.log(name.padEnd(18), `${kb.toFixed(0)}KB`);
}
// keep: { 원래 이름: 새 이름 }
function pickAnims(doc, keep) {
  const seen = new Set();
  for (const a of doc.getRoot().listAnimations()) {
    const to = keep[short(a.getName())];
    if (!to || seen.has(to)) killAnim(a); else { a.setName(to); seen.add(to); }
  }
  return seen;
}

// ── 주인공 ──
for (const [name, file] of Object.entries({
  hero_m: 'characters/Superhero_Male.glb', hero_f: 'characters/Superhero_Female.glb',
  peasant_m: 'outfits/Male_Peasant.glb', peasant_f: 'outfits/Female_Peasant.glb',
  ranger_m: 'outfits/Male_Ranger.glb', ranger_f: 'outfits/Female_Ranger.glb',
  hair_buzzed: 'hair/Hair_Buzzed.glb', hair_parted: 'hair/Hair_SimpleParted.glb', hair_beard: 'hair/Hair_Beard.glb',
  hair_long: 'hair/Hair_Long.glb', hair_buns: 'hair/Hair_Buns.glb', hair_buzzed_f: 'hair/Hair_BuzzedFemale.glb',
})) {
  const doc = await io.read(path.join(MF, file));
  for (const a of doc.getRoot().listAnimations()) killAnim(a);
  await write(doc, name);
}
{
  const HERO = [
    ['UAL1.glb', { Idle_Loop: 'idle', Jog_Fwd_Loop: 'run', Walk_Loop: 'walk', Death01: 'death', Hit_Chest: 'hit', Punch_Jab: 'punch', Punch_Cross: 'punch2',
      Sword_Attack: 'heavy', Spell_Simple_Shoot: 'cast', Spell_Simple_Enter: 'castUp', Spell_Simple_Idle_Loop: 'channel', Pistol_Shoot: 'aim', Roll: 'roll', Interact: 'use' }],
    ['UAL2.glb', { Sword_Regular_A: 'attack', Sword_Regular_B: 'attack2', Sword_Regular_C: 'attack3', Sword_Regular_Combo: 'spin', OverhandThrow: 'throw', Consume: 'drink' }],
  ];
  let base = null;
  for (const [file, keep] of HERO) {
    const doc = await io.read(path.join(MF, 'animations', file));
    pickAnims(doc, keep);
    for (const m of doc.getRoot().listMeshes()) m.dispose();
    for (const s of doc.getRoot().listSkins()) s.dispose();
    await write(doc, base ? 'hero_anims2' : 'hero_anims');
    base = doc;
  }
}

// ── 몬스터: [파일, 동작 이름 바꾸기] ──
const BIPED = { Idle: 'idle', Walk: 'walk', Run: 'run', Punch: 'attack', Weapon: 'attack2', HitReact: 'hit', Death: 'death', Jump: 'jump' };
const BLOB = { Idle: 'idle', Walk: 'walk', Bite_Front: 'attack', HitRecieve: 'hit', Death: 'death', Jump: 'jump' };
const FLY = { Flying_Idle: 'idle', Fast_Flying: 'run', Headbutt: 'attack', Punch: 'attack2', HitReact: 'hit', Death: 'death' };
const BEAST = { Idle: 'idle', Walk: 'walk', Gallop: 'run', Attack: 'attack', Attack_Headbutt: 'attack', Attack_Kick: 'attack2', Idle_HitReact_Left: 'hit', Death: 'death' };
const easy = (n) => ({ [`${n}_Idle`]: 'idle', [`${n}_Walk`]: 'walk', [`${n}_Run`]: 'run', [`${n}_Flying`]: 'idle', [`${n}_Attack`]: 'attack', [`${n}_Death`]: 'death', [`${n}_Jump`]: 'jump' });
const E = (f) => path.join(MF, 'enemies', f), Q = (f) => path.join(QS, 'easy_enemies_pack', f);
const MOBS = {
  m_slime: [E('Green_Blob.glb'), BLOB], m_slime_spiky: [E('Green_Spiky_Blob.glb'), BLOB], m_slime_pink: [E('Pink_Slime.glb'), BLOB],
  m_mushnub: [E('Mushnub.glb'), BLOB], m_mushnub_evo: [E('Mushnub_Evolved.glb'), BLOB], m_mushking: [E('Mushroom_King.glb'), BIPED],
  m_orc_grunt: [E('Orc_Enemy.glb'), BLOB], m_orc: [E('Orc.glb'), BIPED], m_frog: [E('Frog.glb'), BIPED],
  m_wolf: [E('Wolf.glb'), BEAST], m_fox: [E('Fox.glb'), BEAST], m_bull: [E('Bull.glb'), BEAST],
  m_tribal: [E('Tribal.glb'), FLY], m_ghost: [E('Ghost.glb'), FLY], m_ghost_skull: [E('Ghost_Skull.glb'), FLY],
  m_demon: [E('Demon.glb'), FLY], m_blue_demon: [E('Blue_Demon.glb'), BIPED], m_goleling: [E('Goleling.glb'), FLY],
  m_squidle: [E('Squidle.glb'), FLY], m_dragon: [E('Dragon_Evolved.glb'), FLY], m_wizard: [E('Wizard.glb'), BLOB], m_yeti: [E('Yeti.glb'), BLOB],
  m_rat: [Q('Rat.glb'), easy('Rat')], m_spider: [Q('Spider.glb'), easy('Spider')], m_wasp: [Q('Wasp.glb'), easy('Wasp')],
};
for (const [name, [file, keep]] of Object.entries(MOBS)) {
  const doc = await io.read(file);
  const got = pickAnims(doc, keep);
  for (const need of ['idle', 'attack', 'death']) if (!got.has(need)) console.warn('  동작 없음:', name, need);
  await write(doc, name);
}

// ── 소품: 무기 · 투구 · 아이템 그림 ──
const W = (f) => path.join(QS, 'medieval_weapons_pack', f), I = (f) => path.join(QS, 'rpg_items_pack', f), K = (f) => path.join(QS, 'single_knight_pack', f);
const PROPS = {
  q_sword: W('Sword.glb'), q_sword2: W('Sword_2.glb'), q_sword_big: W('Sword_Big.glb'), q_sword_gold: W('Sword_Golden.glb'), q_claymore: W('Claymore.glb'),
  q_bow: W('Bow_Wooden.glb'), q_bow2: W('Bow_Wooden2.glb'), q_bow_gold: W('Bow_Golden.glb'), q_bow_evil: W('Bow_Evil.glb'), q_arrow: W('Arrow.glb'),
  q_shield: W('Shield_Round.glb'), q_shield2: W('Shield_Heater.glb'), q_shield3: W('Shield_Celtic_Golden.glb'),
  q_helm1: K('Helmet1.glb'), q_helm2: K('Helmet2.glb'), q_helm3: K('Helmet3.glb'),
  i_armor_leather: I('Armor_Leather.glb'), i_armor_metal: I('Armor_Metal.glb'), i_armor_metal2: I('Armor_Metal2.glb'), i_armor_black: I('Armor_Black.glb'), i_armor_gold: I('Armor_Golden.glb'),
  i_glove: I('Glove.glb'), i_necklace: I('Necklace1.glb'), i_necklace2: I('Necklace2.glb'), i_ring: I('Ring1.glb'), i_ring2: I('Ring3.glb'), i_ring3: I('Ring5.glb'),
  i_potion_hp: I('Potion1_Filled.glb'), i_potion_mp: I('Potion3_Filled.glb'), i_potion_hp_l: I('Potion5_Filled.glb'), i_potion_mp_l: I('Potion7_Filled.glb'),
  i_book: I('Book1_Closed.glb'), i_book2: I('Book2_Closed.glb'), i_book3: I('Book3_Closed.glb'), i_book4: I('Book4_Closed.glb'),
  i_pouch: I('Pouch.glb'), i_bag: I('Backpack.glb'), i_scroll: I('Scroll.glb'), i_crown: I('Crown.glb'), i_skull: I('Skull.glb'), i_coin: I('Coin.glb'), i_chest: I('Chest_Closed.glb'), i_heart: I('Heart.glb'),
};
for (const [name, file] of Object.entries(PROPS)) {
  if (!fs.existsSync(file)) { console.warn('없음:', file); continue; }
  await write(await io.read(file), name);
}
console.log('합계', (total / 1024).toFixed(1) + 'MB');
