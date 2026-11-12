// 캐릭터 여럿: 기기 저장. 'ashen-chars' = cid 목록, 'ashen-save-<cid>' = 캐릭터 저장.
// 예전 저장('ashen-save' 하나)은 처음 읽을 때 첫 캐릭터로 옮긴다.
const LIST = 'ashen-chars', OLD = 'ashen-save';
export const CHAR_MAX = 6;
export const keyOf = (cid) => `ashen-save-${cid}`;
export const newCid = () => 'c' + Math.random().toString(36).slice(2, 10).padEnd(8, '0');
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export function charIds() {
  let ids = read(LIST);
  if (!Array.isArray(ids)) {
    ids = [];
    const old = read(OLD);
    if (old) { old.cid ||= newCid(); write(keyOf(old.cid), old); ids.push(old.cid); try { localStorage.removeItem(OLD); } catch { /* 무시 */ } }
    write(LIST, ids);
  }
  return ids.filter((c) => /^[a-z0-9]{4,16}$/.test(c));
}
export const loadChar = (cid) => read(keyOf(cid));
export function saveChar(st) {
  if (!st.cid) st.cid = newCid();
  const ids = charIds();
  if (!ids.includes(st.cid)) { ids.push(st.cid); write(LIST, ids); }
  return write(keyOf(st.cid), st);
}
export function deleteChar(cid) {
  write(LIST, charIds().filter((c) => c !== cid));
  try { localStorage.removeItem(keyOf(cid)); } catch { /* 무시 */ }
}
// 닉네임 규칙 (서버와 같다): 한글 · 영문 · 숫자 · _ 2~10자
export const NICK_RE = /^[가-힣a-zA-Z0-9_]{2,10}$/;
