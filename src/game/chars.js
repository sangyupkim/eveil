// 캐릭터 여럿: 기기 저장. 'ashen-chars' = cid 목록, 'ashen-save-<cid>' = 캐릭터 저장.
// 예전 저장('ashen-save' 하나)은 처음 읽을 때 첫 캐릭터로 옮긴다.
const LIST = 'ashen-chars', OLD = 'ashen-save';
export const CHAR_MAX = 6;
export const keyOf = (cid) => `ashen-save-${cid}`;
export const newCid = () => 'c' + Math.random().toString(36).slice(2, 10).padEnd(8, '0');
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const write = (k, v, json = null) => { try { localStorage.setItem(k, json ?? JSON.stringify(v)); return true; } catch { return false; } };

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
export function saveChar(st, json = null) { // json: 이미 만든 문자열 (v0.49.16 저장할 때 한 번만 문자열로)
  if (!st.cid) st.cid = newCid();
  const ids = charIds();
  if (!ids.includes(st.cid)) { ids.push(st.cid); write(LIST, ids); }
  return write(keyOf(st.cid), st, json);
}
export function deleteChar(cid) {
  write(LIST, charIds().filter((c) => c !== cid));
  try { localStorage.removeItem(keyOf(cid)); } catch { /* 무시 */ }
}
// 닉네임 규칙 (서버와 같다): 한글 · 영문 · 숫자 · _ 2~10자
export const NICK_RE = /^[가-힣a-zA-Z0-9_]{2,10}$/;
