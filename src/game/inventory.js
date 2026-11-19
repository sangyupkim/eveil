// 가방 · 장착
import { CONFIG } from '../data/config.js';
import { BASES, isTwoHandedBase } from '../data/items.js';
import { isStack, sameStack } from './items.js';
import { meetsReq } from './skills.js';
import { totalStats } from './player.js';
import { SHARD, shardFrom, mergeShard } from './shards.js';

export const bagSize = (st) => CONFIG.inventorySize + 8 * (st?.town?.research?.bag || 0);
export function addItem(st, it) {
  if (it?.shard && mergeShard(st.inv, it)) return true; // v0.49.11 같은 옵션 파편은 한 칸에
  if (isStack(it)) {
    const same = st.inv.find((x) => sameStack(x, it));
    if (same) { same.qty = (same.qty || 1) + (it.qty || 1); return true; }
  }
  if (st.inv.length >= bagSize(st)) return false;
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

// v0.42 장비 각성 제한: 필요 각성 = 아이템 레벨 (아이템 레벨 1 · 시작 장비는 제한 없음)
export const needAwaken = (it) => (it.noDrop || (it.ilvl || 1) <= 5 ? 0 : it.ilvl || 0); // 아이템 레벨 5까지는 제한 없음 (초반 널널, v0.42.3)
export function canEquip(st, it) {
  const base = BASES[it.base];
  if (!base?.slot) return { ok: false, why: '장착할 수 없는 아이템' };
  if (!meetsReq(st, base.req, totalStats(st))) return { ok: false, why: '스탯 조건이 부족합니다' };
  if (it.mixReq && !meetsReq(st, it.mixReq, totalStats(st))) return { ok: false, why: '혼합 장비: 두 스탯 조건이 부족합니다' }; // v0.44.41
  const need = needAwaken(it);
  if ((st.awakenings || 0) < need) return { ok: false, why: `각성 ${need} 필요` };
  return { ok: true };
}

export function slotFor(st, it) {
  const s = BASES[it.base].slot;
  if (s === 'ring') return !st.equip.ring1 ? 'ring1' : !st.equip.ring2 ? 'ring2' : 'ring1';
  return s;
}

// 가방의 아이템을 장착. 기존 장비는 가방으로.
export function equip(st, uid, rng = Math.random) {
  const it = st.inv.find((x) => x.uid === uid);
  if (!it) return { ok: false, why: '아이템이 없습니다' };
  const c = canEquip(st, it);
  if (!c.ok) return c;
  const slot = slotFor(st, it);
  removeItem(st, uid);
  const back = [];
  if (st.equip[slot]) back.push(st.equip[slot]);
  st.equip[slot] = it;
  it.worn = true; delete it.loot; // 한 번 입은 장비는 자동 판매하지 않는다
  // 양손 무기 ↔ 보조 장비
  const base = BASES[it.base];
  if (slot === 'weapon' && isTwoHanded(it) && st.equip.offhand) { back.push(st.equip.offhand); st.equip.offhand = null; }
  if (slot === 'offhand' && st.equip.weapon && isTwoHanded(st.equip.weapon)) { back.push(st.equip.weapon); st.equip.weapon = null; }
  for (const b of back) st.inv.push(b); // 꺼낸 장비는 칸 수와 상관없이 가방으로
  // 갈아 끼운 장비에서 낮은 확률로 능력치 파편
  const shards = [];
  for (const b of back) if (rng() < SHARD.swapChance * (1 + 0.2 * (st.town?.research?.shard || 0))) { const sh = shardFrom(b, st, rng); if (sh) { if (!mergeShard(st.inv, sh)) st.inv.push(sh); shards.push(sh); } }
  return { ok: true, slot, base, shards };
}

export function unequip(st, slot) {
  const it = st.equip[slot];
  if (!it) return { ok: false };
  if (st.inv.length >= bagSize(st)) return { ok: false, why: '가방이 가득 찼습니다' };
  st.equip[slot] = null;
  st.inv.push(it);
  return { ok: true };
}

export const isTwoHanded = (it) => isTwoHandedBase(BASES[it.base]);
// v0.49.25 예전 저장: 같은 스킬의 스킬북을 한 칸으로 (바뀌었으면 true)
export function packBooks(list) {
  let ch = false;
  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i]; if (!it?.book) continue;
    const j = list.findIndex((x) => x?.book === it.book);
    if (j < i) { list[j].qty = (list[j].qty || 1) + (it.qty || 1); list.splice(i, 1); ch = true; }
  }
  return ch;
}
