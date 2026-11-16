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
// v0.44.23 서버 창고와 맞추기 전에는 창고를 건드리지 않는다.
//  (예전: 맞추기 전에 이 기기의 낡은 창고에 물건이 하나 들어가면 「더 새 것」이 되어 서버 창고를 통째로 덮었다 — 창고가 다른 물건으로 바뀐 사고)
let synced = false;
const FIX_AT = Date.parse('2026-11-17T12:00:00Z'); // 이 수정이 나간 때
// 이 기기에 남은 예전 창고 (사고 전 것): [되살리기]로 지금 창고에 더한다 (한 번만)
export const oldVault = () => { try { return JSON.parse(localStorage.getItem(KEY + '-old'))?.items || null; } catch { return null; } };
export function restoreOldVault(st) {
  const old = oldVault(); if (!old || !synced) return { ok: false };
  const have = new Set(V.items.map((x) => JSON.stringify({ ...x, uid: 0, qty: 0 })));
  let n = 0; for (const it of old) { if (V.items.length >= vaultSize(st)) break; const k = JSON.stringify({ ...it, uid: 0, qty: 0 }); if (have.has(k) && !BASES[it.base]?.stack) continue; const same = BASES[it.base]?.stack && V.items.find((x) => x.base === it.base); if (same) same.qty += it.qty; else V.items.push(it); n++; }
  try { localStorage.removeItem(KEY + '-old'); } catch { /* 무시 */ }
  save(); return { ok: true, n };
}
export const vaultReady = () => synced || !cloud.id;
export function vaultSave() { save(); }
function save() {
  V.at = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(V)); } catch { /* 무시 */ }
  if (!synced) return; // 맞춘 뒤에만 서버로
  clearTimeout(putT);
  putT = setTimeout(() => cloud.vaultSave(JSON.stringify(V.items), V.at), 1500);
}
// 게임을 시작할 때: 로그인했으면 서버 창고를 늘 기준으로 받는다 (서버 창고가 비어 있을 때만 기기 창고를 올린다)
export async function syncVault() {
  if (!cloud.id) { synced = true; return; }
  for (let k = 0; k < 5 && !synced; k++) {
    const r = await cloud.vaultLoad();
    if (!r) { await new Promise((ok) => setTimeout(ok, 3000)); continue; } // 서버가 안 되면 잠깐 뒤 다시 (그동안 창고는 잠근다)
    // 사고 전(v0.44.23 이전) 이 기기에 남아 있던 창고는 한 번 되살릴 수 있게 따로 둔다
    if (r.data && V.items.length && (V.at || 0) < FIX_AT && r.data !== JSON.stringify(V.items)) { try { if (!localStorage.getItem(KEY + '-old')) localStorage.setItem(KEY + '-old', JSON.stringify(V)); } catch { /* 무시 */ } }
    if (r.data) { try { V = { items: JSON.parse(r.data), at: r.at }; localStorage.setItem(KEY, JSON.stringify(V)); } catch { /* 깨진 창고 */ } }
    else if (V.items.length) cloud.vaultSave(JSON.stringify(V.items), Date.now());
    synced = true;
  }
}
const stack = (it) => !!BASES[it.base]?.stack;
// 가방 → 창고
export function vaultPut(st, uid) {
  if (!vaultReady()) return { ok: false, why: '창고를 불러오는 중입니다' };
  const i = st.inv.findIndex((x) => x.uid === uid);
  if (i < 0) return { ok: false };
  const it = st.inv[i];
  if (it.rarity === 'myth') it.owner ||= st.cid; // v0.44.18 신화 장비는 넣은 캐릭터만 다시 꺼낼 수 있다
  const same = stack(it) && V.items.find((x) => x.base === it.base);
  if (!same && V.items.length >= vaultSize(st)) return { ok: false, why: '창고가 가득 찼습니다' };
  st.inv.splice(i, 1);
  if (same) same.qty += it.qty; else V.items.push(it);
  save();
  return { ok: true };
}
// 새 아이템을 창고에 바로 (제작소 결과물)
export function vaultAdd(st, it) {
  if (!vaultReady()) return false;
  if (it?.rarity === 'myth') it.owner ||= st.cid;
  const same = stack(it) && V.items.find((x) => x.base === it.base);
  if (!same && V.items.length >= vaultSize(st)) return false;
  if (same) same.qty += it.qty; else V.items.push(it);
  save();
  return true;
}
// 창고 → 가방 (다른 캐릭터가 넣은 것일 수 있으니 번호를 새로 준다)
export function vaultTake(st, idx) {
  if (!vaultReady()) return { ok: false, why: '창고를 불러오는 중입니다' };
  const it = V.items[idx];
  if (!it) return { ok: false };
  if (it.rarity === 'myth' && it.owner && it.owner !== st.cid) return { ok: false, why: '다른 캐릭터의 신화 장비는 꺼낼 수 없습니다' };
  const copy = { ...it, uid: st.nextUid++ };
  delete copy.loot; // 창고에서 꺼낸 것은 자동 판매하지 않는다
  if (!stack(it) && st.inv.length >= bagSize(st)) return { ok: false, why: '가방이 가득 찼습니다' };
  if (!addItem(st, copy)) return { ok: false, why: '가방이 가득 찼습니다' };
  V.items.splice(idx, 1);
  save();
  return { ok: true };
}
