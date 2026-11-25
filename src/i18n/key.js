// 번역 열쇠 만들기 (게임 · 글 뽑기 도구가 함께 쓴다)
//  한글 문장에서 숫자 · 영문 · 이름 자리(한글이 아닌 덩어리)를 {}로 바꾼 틀이 열쇠다.
//  예: '새끼 개미귀신 처치  3 / 6' → 이름을 먼저 영어로 바꾼 뒤 'Fledgling Antlion 처치  3 / 6' → 열쇠 '{} 처치  {}', 값 ['Fledgling Antlion', '3 / 6']
//  소스의 `${...}`는 \x01로 바꿔 같은 규칙으로 열쇠를 만든다.
export const HANGUL = /[ㄱ-ㆎ가-힣]/;
const NON_H = /[^ㄱ-ㆎ가-힣\u2060]+/g; // \u2060 = 영어로 바꾼 이름의 앞뒤 경계 (이름과 옆 숫자를 한 자리로 묶지 않게)
const CORE = /[A-Za-z0-9\x01À-ɏ]/;
export function tkey(s) {
  const args = []; let key = '', last = 0, m;
  NON_H.lastIndex = 0;
  while ((m = NON_H.exec(s))) {
    key += s.slice(last, m.index).replace(/\u2060/g, '');
    const r = m[0];
    let a = -1, b = -1;
    for (let i = 0; i < r.length; i++) if (CORE.test(r[i])) { if (a < 0) a = i; b = i; }
    if (a < 0) key += r;
    else { key += r.slice(0, a) + '{}' + r.slice(b + 1); args.push(r.slice(a, b + 1)); }
    last = m.index + r.length;
  }
  key += s.slice(last).replace(/\u2060/g, '');
  return { key, args };
}
// 영어 틀에 값 넣기: {}는 차례대로, {0} {1}은 그 번호
export function fill(t, args) {
  let i = 0;
  return t.replace(/\{(\d*)\}/g, (_, n) => (n === '' ? args[i++] : args[+n]) ?? '');
}
