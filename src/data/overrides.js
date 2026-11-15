// 밸런스 덮어쓰기: 관리 페이지(admin.html)에서 고친 값을 서버(ash_kv 'balance')에 두고, 게임이 켜질 때 받아 표에 덮는다.
// 형식: { 표: { 줄 열쇠: { 칸: 값 } } }. 표 정의(TABLES)는 관리 페이지도 같이 쓴다.
import { MONSTERS, ZONES } from './world.js';
import { CONFIG, LOOT, TIERS } from './config.js';
import { BASES } from './items.js';
import { CHAPTER } from './chapters.js';

// 배열 칸(dmg · gold)은 [0] · [1]로 나눠 보여 준다
const pair = (k) => ({ get: (r) => r[k]?.[0], set: (r, v) => { r[k] = [v, r[k]?.[1] ?? v]; } });
const pair1 = (k) => ({ get: (r) => r[k]?.[1], set: (r, v) => { r[k] = [r[k]?.[0] ?? v, v]; } });
const plain = (k) => ({ get: (r) => r[k], set: (r, v) => { r[k] = v; } });
export const TABLES = {
  monsters: { name: '몬스터', rows: () => MONSTERS, label: (r) => r.name,
    cols: { hp: plain('hp'), dmgMin: pair('dmg'), dmgMax: pair1('dmg'), interval: plain('interval'), speed: plain('speed'), aggro: plain('aggro'), exp: plain('exp') } },
  tiers: { name: '몬스터 등급', rows: () => TIERS, label: (r) => r.name, cols: { hp: plain('hp'), dmg: plain('dmg'), exp: plain('exp'), scale: plain('scale') } },
  loot: { name: '드랍', rows: () => LOOT, label: (_, k) => TIERS[k]?.name,
    cols: { itemChance: plain('itemChance'), itemsMax: pair1('items'), goldChance: pair('gold'), goldMult: pair1('gold'), potion: plain('potion'), book: plain('book'),
      common: { get: (r) => r.rarity.common, set: (r, v) => { r.rarity.common = v; } }, magic: { get: (r) => r.rarity.magic, set: (r, v) => { r.rarity.magic = v; } },
      rare: { get: (r) => r.rarity.rare, set: (r, v) => { r.rarity.rare = v; } }, hero: { get: (r) => r.rarity.hero, set: (r, v) => { r.rarity.hero = v; } }, legend: { get: (r) => r.rarity.legend, set: (r, v) => { r.rarity.legend = v; } } } },
  chapters: { name: '챕터(지역)', rows: () => Object.fromEntries(CHAPTER.map((c, i) => [String(i), c])), label: (_, k) => `${+k + 1} ${ZONES[+k]?.name || ''}`,
    cols: { hp: plain('hp'), dmg: plain('dmg'), boss: plain('boss'), bossDmg: plain('bossDmg'), exp: plain('exp') } },
  config: { name: '기본 설정 · 젠 시간', rows: () => ({ cfg: CONFIG }), label: () => '전체',
    cols: Object.fromEntries(Object.keys(CONFIG).filter((k) => typeof CONFIG[k] === 'number').map((k) => [k, plain(k)])) },
  items: { name: '아이템', rows: () => Object.fromEntries(Object.entries(BASES).filter(([, b]) => b.slot || b.price)), label: (r) => `${r.name}${r.minLvl ? ` (${r.minLvl})` : ''}`,
    cols: { dmgMin: pair('dmg'), dmgMax: pair1('dmg'), speed: plain('speed'), armor: plain('armor'), block: plain('block'), price: plain('price'), minLvl: plain('minLvl') } },
};
// 덮어쓰기 적용 (모르는 표 · 줄 · 칸은 건너뛴다)
export function applyOverrides(o) {
  let n = 0;
  for (const [t, rows] of Object.entries(o || {})) {
    const T = TABLES[t]; if (!T) continue;
    const all = T.rows();
    for (const [k, f] of Object.entries(rows || {})) {
      const r = all[k]; if (!r) continue;
      for (const [c, v] of Object.entries(f || {})) { const C = T.cols[c]; if (C && Number.isFinite(+v) && C.get(r) !== undefined) { C.set(r, +v); n++; } }
    }
  }
  return n;
}
