// 아이콘 겹침 검사 (v0.49.25): 스킬 · 아이템 · 약초 등 「종류」가 다른데 같은 아이콘 번호를 쓰는 곳을 찾는다
// 종류: 높은 단계 장비(h44_ …)와 끝 숫자(1 · 2 · _3)는 같은 종류로 본다 (단계마다 색 테두리 · 빛깔만 다르다)
import { SKILLS } from '../src/data/skills.js';
import { SKILL_ICON, ITEM_LOOK } from '../src/data/flareWorld.js';
import { SCHOOL_ICON } from '../src/data/skills_more.js';
import { BASES } from '../src/data/items.js';
import { ELIXIRS, HERBS } from '../src/data/potions.js';
export function iconUses() {
  const use = new Map(), add = (ic, kind, who) => { if (ic == null) return; const k = String(ic); if (!use.has(k)) use.set(k, new Map()); const m = use.get(k); if (!m.has(kind)) m.set(kind, []); m.get(kind).push(who); };
  for (const [id, s] of Object.entries(SKILLS)) add(SKILL_ICON[id] ?? SCHOOL_ICON[s.school], 'skill:' + id, s.name);
  const kindOf = (id) => id.replace(/^h\d+_/, '').replace(/^gem_([a-z]+)_\d+$/, 'gem_$1').replace(/_?\d+$/, '').replace(/^(hp|mp)_potion.*/, '$1_potion').replace(/^ess$/, 'ess').replace(/^(el_[a-z]+?)2$/, '$1');
  for (const [id, b] of Object.entries(BASES)) {
    if (b.type === 'pet' || (b.slot && !process.env.GEAR)) continue; // 장비는 같은 부위끼리 단계 · 빛깔만 다른 같은 그림이라 따로 (GEAR=1이면 함께)
    let ic;
    if (b.type === 'shard') ic = 'shard';
    else if (ELIXIRS[id]) ic = ITEM_LOOK[id]?.icon;
    else if (/^ore\d?$/.test(id)) ic = '71:' + id; // 같은 그림에 빛깔(필터)만 다르게
    else if (b.type === 'mat') ic = /^ess\d$/.test(id) ? 1010 : b.icon;
    else ic = (ITEM_LOOK[id]?.icon ?? (b.type === 'potion' ? 64 : 0)) + (ITEM_LOOK[id]?.tint != null && !ELIXIRS[id] ? ':' + ITEM_LOOK[id].tint.toString(16) : '');
    add(ic, 'item:' + kindOf(id), b.name);
  }
  for (const [id, h] of Object.entries(HERBS)) add('herb:' + id, 'herb:' + id, h.name); // 약초 그림은 icons.js HERB_ICON (모두 다름)
  return use;
}
if (process.argv[1]?.endsWith('icon-dupes.mjs')) {
  let n = 0;
  for (const [ic, m] of iconUses()) if (m.size > 1) { n++; console.log(ic, [...m].map(([k, v]) => `${k}(${v[0]}${v.length > 1 ? ` 외 ${v.length - 1}` : ''})`).join(' | ')); }
  console.log('겹침', n);
}
