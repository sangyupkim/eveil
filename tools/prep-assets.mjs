// KayKit(CC0) 원본 팩에서 게임에 쓰는 모델만 골라 assets/models/ 에 .glb로 만든다.
// 캐릭터는 쓰는 애니메이션만 남겨 용량을 줄인다.
// 사용: node tools/prep-assets.mjs <KayKit 팩들을 clone 한 폴더>
//   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
//   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0
//   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0
//   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Halloween-Bits-1.0
//   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, resample } from '@gltf-transform/functions';

const SRC = process.argv[2];
if (!SRC) { console.error('원본 폴더를 인자로 주세요'); process.exit(1); }
const OUT = path.resolve('assets/models');
fs.mkdirSync(OUT, { recursive: true });
const io = new NodeIO();
// prune()가 남기는, 아무도 쓰지 않는 accessor를 직접 지운다
function killAnim(a) {
  for (const c of a.listChannels()) c.dispose();
  for (const s of a.listSamplers()) s.dispose();
  a.dispose();
}
function dropOrphans(doc) {
  for (const a of doc.getRoot().listAccessors()) if (a.listParents().every((p) => p.propertyType === 'Root')) a.dispose();
}

const PLAYER_ANIMS = new Set([
  'Idle', 'Running_A',
  '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Stab',
  '2H_Melee_Attack_Chop', '2H_Melee_Attack_Slice', '2H_Melee_Attack_Spin',
  'Dualwield_Melee_Attack_Slice', '1H_Ranged_Shoot', '2H_Ranged_Shoot',
  'Spellcast_Shoot', 'Spellcast_Raise', 'Spellcast_Long',
  'Hit_A', 'Block', 'Use_Item', 'Cheer', 'Death_A',
]);
const MONSTER_ANIMS = new Set([
  'Idle', 'Walking_D_Skeletons', 'Running_C', '1H_Melee_Attack_Chop', '2H_Melee_Attack_Chop',
  '2H_Ranged_Shoot', 'Spellcast_Shoot', 'Hit_A', 'Death_C_Skeletons', 'Spawn_Ground_Skeletons',
]);

const A = 'KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures';
const S = 'KayKit-Character-Pack-Skeletons-1.0/addons/kaykit_character_pack_skeletons';
const D = 'KayKit-Dungeon-Remastered-1.0/addons/kaykit_dungeon_remastered/Assets/gltf';
const H = 'KayKit-Halloween-Bits-1.0/addons/kaykit_halloween_bits/Assets/gltf';
const M = 'KayKit-Medieval-Hexagon-Pack-1.0/addons/kaykit_medieval_hexagon_pack/Assets/gltf';

const characters = {
  knight: `${A}/Characters/gltf/Knight.glb`,
  barbarian: `${A}/Characters/gltf/Barbarian.glb`,
  mage: `${A}/Characters/gltf/Mage.glb`,
  rogue_plain: `${A}/Characters/gltf/Rogue.glb`, // 주인공 기본 몸 (후드 없음)
  skel_minion: `${S}/Characters/gltf/Skeleton_Minion.glb`,
  skel_warrior: `${S}/Characters/gltf/Skeleton_Warrior.glb`,
  skel_rogue: `${S}/Characters/gltf/Skeleton_Rogue.glb`,
  skel_mage: `${S}/Characters/gltf/Skeleton_Mage.glb`,
};
const props = {
  // 무기 (손에 붙인다)
  w_sword: `${A}/Assets/gltf/sword_1handed.gltf`,
  w_greatsword: `${A}/Assets/gltf/sword_2handed.gltf`,
  w_axe: `${A}/Assets/gltf/axe_1handed.gltf`,
  w_greataxe: `${A}/Assets/gltf/axe_2handed.gltf`,
  w_dagger: `${A}/Assets/gltf/dagger.gltf`,
  w_staff: `${A}/Assets/gltf/staff.gltf`,
  w_wand: `${A}/Assets/gltf/wand.gltf`,
  w_crossbow: `${A}/Assets/gltf/crossbow_2handed.gltf`,
  w_shield: `${A}/Assets/gltf/shield_round.gltf`,
  w_shield_sq: `${A}/Assets/gltf/shield_square.gltf`,
  ws_blade: `${S}/Assets/gltf/Skeleton_Blade.gltf`,
  ws_axe: `${S}/Assets/gltf/Skeleton_Axe.gltf`,
  ws_staff: `${S}/Assets/gltf/Skeleton_Staff.gltf`,
  ws_crossbow: `${S}/Assets/gltf/Skeleton_Crossbow.gltf`,
  ws_shield: `${S}/Assets/gltf/Skeleton_Shield_Small_A.gltf`,
  // 묘지 · 들판
  tree_dead_l: `${H}/tree_dead_large.gltf`,
  tree_dead_m: `${H}/tree_dead_medium.gltf`,
  tree_dead_s: `${H}/tree_dead_small.gltf`,
  tree_pine: `${H}/tree_pine_orange_small.gltf`,
  grave: `${H}/grave_A.gltf`,
  gravestone: `${H}/gravestone.gltf`,
  gravemarker: `${H}/gravemarker_A.gltf`,
  crypt: `${H}/crypt.gltf`,
  coffin: `${H}/coffin.gltf`,
  bone: `${H}/bone_A.gltf`,
  fence_broken: `${H}/fence_seperate_broken.gltf`,
  fence_pillar: `${H}/fence_pillar_broken.gltf`,
  lantern: `${H}/lantern_hanging.gltf`,
  post: `${H}/post.gltf`,
  shrine: `${H}/shrine.gltf`,
  arch_gate: `${H}/arch_gate.gltf`,
  skull_candle: `${H}/skull_candle.gltf`,
  // 마을
  tavern: `${M}/buildings/red/building_tavern_red.gltf`,
  blacksmith: `${M}/buildings/red/building_blacksmith_red.gltf`,
  home_a: `${M}/buildings/red/building_home_A_red.gltf`,
  home_b: `${M}/buildings/red/building_home_B_red.gltf`,
  market: `${M}/buildings/red/building_market_red.gltf`,
  well: `${M}/buildings/red/building_well_red.gltf`,
  church: `${M}/buildings/red/building_church_red.gltf`,
  ruin: `${M}/buildings/neutral/building_destroyed.gltf`,
  fence_wood: `${M}/buildings/neutral/fence_wood_straight.gltf`,
  tree: `${M}/decoration/nature/tree_single_A.gltf`,
  trees: `${M}/decoration/nature/trees_B_medium.gltf`,
  rock_a: `${M}/decoration/nature/rock_single_A.gltf`,
  rock_b: `${M}/decoration/nature/rock_single_B.gltf`,
  rock_c: `${M}/decoration/nature/rock_single_C.gltf`,
  // 던전 소품
  barrel: `${D}/barrel_large.gltf.glb`,
  crates: `${D}/crates_stacked.gltf.glb`,
  box: `${D}/box_large.gltf.glb`,
  chest: `${D}/chest.glb`,
  chest_gold: `${D}/chest_gold.glb`,
  torch: `${D}/torch_lit.gltf.glb`,
  banner: `${D}/banner_patternA_red.gltf.glb`,
  coin: `${D}/coin_stack_small.gltf.glb`,
  rubble: `${D}/rubble_large.gltf.glb`,
  pillar: `${D}/pillar.gltf.glb`,
  table: `${D}/table_long_decorated_A.gltf.glb`,
  potion: `${D}/bottle_A_labeled_green.gltf.glb`,
  book: `${A}/Assets/gltf/spellbook_closed.gltf`,
};

function find(rel) {
  const p = path.join(SRC, rel);
  if (fs.existsSync(p)) return p;
  // 팩마다 폴더 구조가 조금씩 달라 이름으로 한 번 더 찾는다
  const name = path.basename(rel);
  const hit = walk(path.join(SRC, rel.split('/')[0])).find((f) => path.basename(f) === name);
  return hit;
}
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

let total = 0;
{
  const doc = await io.read(find(characters.skel_minion));
  const keep = new Set([...PLAYER_ANIMS, ...MONSTER_ANIMS]);
  for (const a of doc.getRoot().listAnimations()) if (!keep.has(a.getName())) killAnim(a);
  for (const m of doc.getRoot().listMeshes()) m.dispose();
  await doc.transform(resample({ tolerance: 1e-3 }), dedup(), prune());
  dropOrphans(doc);
  const out = path.join(OUT, 'anims.glb');
  await io.write(out, doc);
  total += fs.statSync(out).size / 1024;
  console.log('anims'.padEnd(14), `${(fs.statSync(out).size / 1024).toFixed(0)}KB`);
}
for (const [name, rel] of Object.entries({ ...characters, ...props })) {
  const file = find(rel);
  if (!file) { console.warn('없음:', rel); continue; }
  const doc = await io.read(file);
  // KayKit 캐릭터는 모두 같은 리그를 쓴다 → 애니메이션은 anims.glb 하나에만 두고 모델에선 뺀다
  if (characters[name]) for (const a of doc.getRoot().listAnimations()) killAnim(a);
  await doc.transform(resample({ tolerance: 1e-3 }), dedup(), prune());
  dropOrphans(doc);
  const out = path.join(OUT, `${name}.glb`);
  await io.write(out, doc);
  const kb = fs.statSync(out).size / 1024;
  total += kb;
  console.log(name.padEnd(14), `${kb.toFixed(0)}KB`);
}
console.log('합계', (total / 1024).toFixed(1) + 'MB');
