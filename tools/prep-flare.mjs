// Flare: Empyrean Campaign(CC-BY-SA 3.0) 그림을 게임용으로 다듬어 assets/flare/ 에 넣는다.
//   - 그림은 WebP로 줄이고, 동작 정의(.txt)는 JSON으로 바꾼다
//   - 주인공은 겹그림(머리 · 몸통 · 다리 · 신발 · 장갑 · 무기 · 방패) — 같은 틀이라 겹쳐 그리면 장비 모습이 된다
// 사용: node tools/prep-flare.mjs <flare-game 폴더>
//   git clone --depth 1 https://github.com/flareteam/flare-game
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = process.argv[2];
if (!SRC) { console.error('flare-game 폴더를 인자로 주세요'); process.exit(1); }
const FC = path.join(SRC, 'mods/fantasycore'), EC = path.join(SRC, 'mods/empyrean_campaign');
const OUT = path.resolve('assets/flare');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let bytes = 0;

async function webp(src, dst, { q = 76, width = 0 } = {}) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  let s = sharp(src);
  if (width) s = s.resize(width);
  await s.webp({ quality: q, alphaQuality: 85, effort: 5 }).toFile(dst);
  bytes += fs.statSync(dst).size;
}
const writeJson = (rel, obj) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(obj)); bytes += fs.statSync(f).size; };

// 동작 정의: image=경로[,동작] 과 [동작] 구역, frame=번호,방향,x,y,w,h,ox,oy
function parseAnim(file) {
  const out = { images: {}, anims: {} };
  let cur = null, dflt = null;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const l = raw.trim();
    if (!l || l.startsWith('#')) continue;
    if (l.startsWith('image=')) {
      const [p, name] = l.slice(6).split(',');
      if (name) out.images[name] = p; else dflt = p;
    } else if (l.startsWith('[')) {
      cur = l.slice(1, -1);
      out.anims[cur] = { frames: 1, dur: 500, type: 'looped', f: {} };
    } else if (cur) {
      const [k, v] = l.split('=');
      const a = out.anims[cur];
      if (k === 'frames') a.frames = +v;
      else if (k === 'duration') a.dur = parseInt(v) * (v.endsWith('s') && !v.endsWith('ms') ? 1000 : 1);
      else if (k === 'type') a.type = v;
      else if (k === 'frame') {
        const [i, d, x, y, w, h, ox, oy] = v.split(',').map(Number);
        (a.f[d] ||= [])[i] = [x, y, w, h, ox, oy];
      }
    }
  }
  if (dflt) out.images.default = dflt;
  return out;
}

// 이미지 경로들을 webp로 옮기고 JSON 안의 경로를 바꾼다
async function packAnim(animFile, root, dstDir, key, k2 = 1) {
  const a = parseAnim(animFile);
  for (const [k, p] of Object.entries(a.images)) {
    const name = `${key}${k === 'default' ? '' : '_' + k}.webp`;
    const src = path.join(root, p);
    if (k2 < 1) { const m = await sharp(src).metadata(); await webp(src, path.join(OUT, dstDir, name), { width: Math.round(m.width * k2) }); }
    else await webp(src, path.join(OUT, dstDir, name));
    a.images[k] = `${dstDir}/${name}`;
  }
  if (k2 < 1) { a.px = 1 / k2; for (const an of Object.values(a.anims)) for (const d in an.f) an.f[d] = an.f[d].map((r) => r && r.map((v) => Math.round(v / a.px))); }
  return a;
}

// ── 주인공 겹그림 ──
const LAYERS = [
  'default_chest', 'default_legs', 'default_feet', 'default_hands',
  'cloth_shirt', 'cloth_pants', 'cloth_sandals', 'cloth_gloves',
  'leather_chest', 'leather_pants', 'leather_boots', 'leather_gloves', 'leather_hood',
  'chain_cuirass', 'chain_greaves', 'chain_boots', 'chain_gloves', 'chain_coif',
  'plate_cuirass', 'plate_greaves', 'plate_boots', 'plate_gauntlets', 'plate_helm',
  'mage_vest', 'mage_skirt', 'mage_boots', 'mage_sleeves', 'mage_hood',
  'mage_vest_alt1', 'mage_skirt_alt1', 'mage_boots_alt1', 'mage_sleeves_alt1', 'mage_hood_alt1',
  'shortsword', 'longsword', 'greatsword', 'zweihander', 'hand_axe', 'battle_axe', 'dagger',
  'slingshot', 'shortbow', 'longbow', 'greatbow', 'wand', 'rod', 'staff', 'greatstaff',
  'buckler', 'iron_buckler', 'shield', 'kite_shield',
];
for (const [sex, dir, heads] of [['m', 'male', ['head_short', 'head_bald']], ['f', 'female', ['head_long']]]) {
  const json = {};
  for (const layer of [...LAYERS, ...heads]) {
    const a = await packAnim(path.join(FC, `animations/avatar/${dir}/${layer}.txt`), FC, `avatar/${sex}`, layer, 0.75);
    json[layer] = a;
  }
  writeJson(`avatar_${sex}.json`, json);
  console.log('주인공', sex, Object.keys(json).length, '겹', (bytes / 1e6).toFixed(1) + 'MB');
}

// ── 몬스터 ──
const ENEMIES = {
  goblin: FC, goblin_elite: FC, hobgoblin: EC, hobgoblin_archer: EC, antlion: FC, antlion_small: FC, fire_ant: FC, ice_ant: FC,
  skeleton: FC, skeleton_weak: FC, skeleton_archer: FC, skeleton_mage: FC, zombie: FC, cursed_grave: FC, minotaur: FC,
  wyvern: FC, wyvern_air: FC, wyvern_fire: FC, wyvern_water: FC,
  zombie_dark: EC, antlion_armored: EC, skeleton_knight_boss: EC, skeleton_mage_boss: EC, skeleton_mage_high_boss: EC, wyvern_air_boss: EC,
};
const enemies = {};
for (const [name, root] of Object.entries(ENEMIES)) {
  let file = path.join(root, `animations/enemies/${name}.txt`);
  if (!fs.existsSync(file)) file = path.join(FC, `animations/enemies/${name}.txt`);
  if (!fs.existsSync(file)) { console.warn('없음', name); continue; }
  // empyrean 그림이 fantasycore 경로를 가리키기도 한다 → 있는 쪽을 쓴다
  const a = parseAnim(file);
  for (const [k, p] of Object.entries(a.images)) {
    const src = [path.join(root, p), path.join(FC, p), path.join(EC, p)].find((f) => fs.existsSync(f));
    const dst = `enemies/${name}${k === 'default' ? '' : '_' + k}.webp`;
    // 비룡은 그림이 커서 줄여 담고, 그릴 때 다시 키운다 (px)
    const k2 = name.startsWith('wyvern') ? 0.5 : 0.6; // 화면엔 원래의 0.5~0.9배로 그리니 줄여 담아도 티가 안 난다
    if (k2 < 1) { const m = await sharp(src).metadata(); await webp(src, path.join(OUT, dst), { q: 72, width: Math.round(m.width * k2) }); }
    else await webp(src, path.join(OUT, dst), { q: 72 });
    a.images[k] = dst;
    if (k2 < 1) a.px = 1 / k2;
  }
  if (a.px) for (const an of Object.values(a.anims)) for (const d in an.f) an.f[d] = an.f[d].map((r) => r && r.map((v) => Math.round(v / a.px)));
  enemies[name] = a;
}
writeJson('enemies.json', enemies);
console.log('몬스터', Object.keys(enemies).length, (bytes / 1e6).toFixed(1) + 'MB');

// ── NPC ──
const npcs = {};
for (const name of ['wandering_trader', 'knight', 'guild_man', 'peasant_man1', 'peasant_woman1']) {
  npcs[name] = await packAnim(path.join(FC, `animations/npcs/${name}.txt`), FC, 'npcs', name, 0.75);
}
writeJson('npcs.json', npcs);

// ── 땅 타일 ──
const tiles = {};
for (const ts of ['grassland', 'snowplains', 'cave', 'dungeon']) {
  const def = { imgs: [], tiles: {} };
  for (const raw of fs.readFileSync(path.join(FC, `tilesetdefs/tileset_${ts}.txt`), 'utf8').split('\n')) {
    const l = raw.trim();
    if (l.startsWith('img=')) {
      const name = path.basename(l.slice(4), '.png') + '.webp';
      await webp(path.join(FC, l.slice(4)), path.join(OUT, 'tiles', name), { q: 78 });
      def.imgs.push('tiles/' + name);
    } else if (l.startsWith('tile=')) {
      const [id, x, y, w, h, ox, oy] = l.slice(5).split(',').map(Number);
      def.tiles[id] = [def.imgs.length - 1, x, y, w, h, ox, oy];
    }
  }
  tiles[ts] = def;
}
writeJson('tiles.json', tiles);
console.log('타일', (bytes / 1e6).toFixed(1) + 'MB');

// ── 효과 · 떨어진 아이템 ──
const powers = {};
for (const name of ['fireball', 'lightning', 'icicle', 'freeze', 'blast', 'quake', 'runes', 'runes_blue', 'runes_orange', 'spark_blue', 'spark_green', 'spark_orange', 'spark_red',
  'sparkle', 'cleave', 'arrows', 'ember', 'thunderstrike', 'spikes', 'channel', 'shield', 'shield_orange', 'plasmaball', 'rupture', 'dark_mist', 'stone', 'throw_axe', 'spear', 'heal', 'immunity']) {
  powers[name] = await packAnim(path.join(FC, `animations/powers/${name}.txt`), FC, 'powers', name);
}
writeJson('powers.json', powers);
const loot = {};
for (const f of fs.readdirSync(path.join(FC, 'animations/loot'))) {
  const name = path.basename(f, '.txt');
  loot[name] = await packAnim(path.join(FC, 'animations/loot', f), FC, 'loot', name);
}
writeJson('loot.json', loot);
console.log('효과 · 아이템', (bytes / 1e6).toFixed(1) + 'MB');

// ── 아이콘 · 초상화 · 메뉴 ──
await webp(path.join(FC, 'images/icons/icons.png'), path.join(OUT, 'icons.webp'), { q: 85 });
for (const f of fs.readdirSync(path.join(FC, 'images/portraits'))) {
  if (!/^(male|female)\d+\.png$/.test(f)) continue;
  await webp(path.join(FC, 'images/portraits', f), path.join(OUT, 'portraits', f.replace('.png', '.webp')), { q: 80, width: 160 });
}
const MENUS = ['bar_hp.png', 'bar_hp_background.png', 'bar_mp.png', 'bar_mp_background.png', 'bar_xp.png', 'bar_xp_background.png', 'bar_enemy_hp.png', 'bar_enemy_hp_background.png',
  'actionbar_trim.png', 'portrait_border.png', 'slot_empty.png', 'slot_selected.png', 'tab_active.png', 'tab_inactive.png', 'frame_background.png', 'dialog_box.png',
  'tooltips.png', 'log.png', 'minimap.png', 'inventory.png', 'character.png', 'powers.png', 'buttons/button_default.png', 'buttons/button_x.png',
  'buttons/checkbox_default.png', 'buttons/slider_default.png', 'buttons/scrollbar_default.png', 'buttons/listbox_default.png', 'disabled.png', 'attention_glow.png', 'backgrounds/dungeon.jpg'];
for (const m of MENUS) {
  const dst = path.join(OUT, 'menus', m.replace('buttons/', '').replace('backgrounds/', 'bg_'));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (m.endsWith('.jpg')) await sharp(path.join(FC, 'images/menus', m)).jpeg({ quality: 80 }).toFile(dst);
  else fs.copyFileSync(path.join(FC, 'images/menus', m), dst);
  bytes += fs.statSync(dst).size;
}
// 상태별로 겹쳐 그린 버튼 그림을 잘라 둔다 (CSS border-image용)
const M = path.join(OUT, 'menus');
for (const [file, h, names] of [['button_default.png', 48, ['button', 'button_down', 'button_hover', 'button_off']], ['button_x.png', 38, ['close', 'close_down', 'close_hover', 'close_off']], ['checkbox_default.png', 38, ['check_off', 'check_on']]]) {
  const meta = await sharp(path.join(M, file)).metadata();
  for (let i = 0; i < names.length; i++) await sharp(path.join(M, file)).extract({ left: 0, top: i * h, width: meta.width, height: h }).toFile(path.join(M, names[i] + '.png'));
}
fs.copyFileSync(path.join(SRC, 'LICENSE.txt'), path.join(OUT, 'LICENSE-CC-BY-SA-3.0.txt'));
fs.copyFileSync(path.join(SRC, 'CREDITS.txt'), path.join(OUT, 'CREDITS.txt'));
console.log('합계', (bytes / 1e6).toFixed(1) + 'MB');
