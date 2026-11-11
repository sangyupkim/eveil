// 가방 · 장착
import { CONFIG } from '../data/config.js';
import { BASES } from '../data/items.js';
import { isStack } from './items.js';
import { meetsReq } from './skills.js';
import { totalStats } from './player.js';

export function addItem(st, it) {
  if (isStack(it)) {
    const same = st.inv.find((x) => x.base === it.base);
    if (same) { same.qty += it.qty; return true; }
  }
  if (st.inv.length >= CONFIG.inventorySize) return false;
  st.inv.push(it);
  return true;
}

export function removeItem(st, uid) {
  const i = st.inv.findIndex((x) => x.uid === uid);
  if (i < 0) return null;
  return st.inv.splice(i, 1)[0];
}

export const countOf = (st, baseId) => st.inv.filter((x) => x.base === baseId).reduce((a, x) => a + (x.qty || 1), 0);

export function takeOne(st, baseId) {
  const it = st.inv.find((x) => x.base === baseId);
  if (!it) return false;
  it.qty--;
  if (it.qty <= 0) removeItem(st, it.uid);
  return true;
}

export function canEquip(st, it) {
  const base = BASES[it.base];
  if (!base?.slot) return { ok: false, why: '장착할 수 없는 아이템' };
  if (!meetsReq(st, base.req, totalStats(st))) return { ok: false, why: '스탯 조건이 부족합니다' };
  return { ok: true };
}

export function slotFor(st, it) {
  const s = BASES[it.base].slot;
  if (s === 'ring') return !st.equip.ring1 ? 'ring1' : !st.equip.ring2 ? 'ring2' : 'ring1';
  return s;
}

// 가방의 아이템을 장착. 기존 장비는 가방으로.
export function equip(st, uid) {
  const it = st.inv.find((x) => x.uid === uid);
  if (!it) return { ok: false, why: '아이템이 없습니다' };
  const c = canEquip(st, it);
  if (!c.ok) return c;
  const slot = slotFor(st, it);
  removeItem(st, uid);
  const back = [];
  if (st.equip[slot]) back.push(st.equip[slot]);
  st.equip[slot] = it;
  // 양손 무기 ↔ 보조 장비
  const base = BASES[it.base];
  if (slot === 'weapon' && isTwoHanded(it) && st.equip.offhand) { back.push(st.equip.offhand); st.equip.offhand = null; }
  if (slot === 'offhand' && st.equip.weapon && isTwoHanded(st.equip.weapon)) { back.push(st.equip.weapon); st.equip.weapon = null; }
  for (const b of back) st.inv.push(b); // 꺼낸 장비는 칸 수와 상관없이 가방으로
  return { ok: true, slot, base };
}

export function unequip(st, slot) {
  const it = st.equip[slot];
  if (!it) return { ok: false };
  if (st.inv.length >= CONFIG.inventorySize) return { ok: false, why: '가방이 가득 찼습니다' };
  st.equip[slot] = null;
  st.inv.push(it);
  return { ok: true };
}

const TWO_HANDED = new Set(['greatsword', 'greataxe', 'crossbow', 'staff']);
export const isTwoHanded = (it) => TWO_HANDED.has(BASES[it.base].cls);
