// 창고: 같은 계정(로그인하지 않았으면 같은 기기)의 캐릭터가 함께 쓴다. 100칸부터, 연구 「큰 창고」로 늘어난다.
// 기기에는 'ashen-vault'로, 로그인하면 서버(ash_vault)에도. 더 새 쪽을 쓴다.
import { BASES } from '../data/items.js';
import { addItem, bagSize } from './inventory.js';
import { cloud } from '../net/cloud.js';

export const VAULT_BASE = 100;
export const VAULT_PER = 20; // 연구 단계마다
const KEY = 'ashen-vault';
let V = { items: [], at: 0 };
try { const x = JSON.parse(localStorage.getItem(KEY)); if (x?.items) V = x; } catch { /* 저장소 없음 */ }

export const vault = () => V;
export const vaultSize = (st) => VAULT_BASE + VAULT_PER * (st?.town?.research?.vault || 0);
let putT = null;
function save() {
  V.at = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(V)); } catch { /* 무시 */ }
  clearTimeout(putT);
  putT = setTimeout(() => cloud.vaultSave(JSON.stringify(V.items), V.at), 1500);
}
// 게임을 시작할 때: 서버 창고가 더 새 것이면 받아 쓰고, 기기 쪽이 더 새 것이면 올린다
export async function syncVault() {
  const r = await cloud.vaultLoad();
  if (!r) return;
  if (r.data && r.at > (V.at || 0)) {
    try { V = { items: JSON.parse(r.data), at: r.at }; localStorage.setItem(KEY, JSON.stringify(V)); } catch { /* 깨진 창고 */ }
  } else if ((V.at || 0) > r.at) cloud.vaultSave(JSON.stringify(V.items), V.at);
}
const stack = (it) => !!BASES[it.base]?.stack;
// 가방 → 창고
export function vaultPut(st, uid) {
  const i = st.inv.findIndex((x) => x.uid === uid);
  if (i < 0) return { ok: false };
  const it = st.inv[i];
  const same = stack(it) && V.items.find((x) => x.base === it.base);
  if (!same && V.items.length >= vaultSize(st)) return { ok: false, why: '창고가 가득 찼습니다' };
  st.inv.splice(i, 1);
  if (same) same.qty += it.qty; else V.items.push(it);
  save();
  return { ok: true };
}
// 새 아이템을 창고에 바로 (제작소 결과물)
export function vaultAdd(st, it) {
  const same = stack(it) && V.items.find((x) => x.base === it.base);
  if (!same && V.items.length >= vaultSize(st)) return false;
  if (same) same.qty += it.qty; else V.items.push(it);
  save();
  return true;
}
// 창고 → 가방 (다른 캐릭터가 넣은 것일 수 있으니 번호를 새로 준다)
export function vaultTake(st, idx) {
  const it = V.items[idx];
  if (!it) return { ok: false };
  const copy = { ...it, uid: st.nextUid++ };
  if (!stack(it) && st.inv.length >= bagSize(st)) return { ok: false, why: '가방이 가득 찼습니다' };
  if (!addItem(st, copy)) return { ok: false, why: '가방이 가득 찼습니다' };
  V.items.splice(idx, 1);
  save();
  return { ok: true };
}
