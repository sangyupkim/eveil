// v0.49.77 화면 숫자 안전망: 소수점이 셋째 자리 넘게 붙은 숫자(계산 중 생긴 73.59997800000002 · 1,234.568 같은 것)를
//  10 이상이면 정수, 10 미만이면 소수 한 자리로. 일부러 두 자리로 보이는 배율(×4.45 · 1.15)은 그대로 둔다.
const LONG = /(\d[\d,]*)\.(\d{3,})/g;
export const cleanNum = (s) => {
  if (typeof s !== 'string' || !s.includes('.')) return s;
  return s.replace(LONG, (all, a, b) => { const v = Number(a.replace(/,/g, '') + '.' + b); if (!isFinite(v)) return all; return v >= 10 ? Math.round(v).toLocaleString() : (Math.round(v * 10) / 10).toString(); });
};
// 창 안 글자 마디를 한 번 훑어 고친다 (속성 · 스타일 값은 건드리지 않는다)
export function cleanTree(root) {
  if (!root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const t = n.nodeValue; if (t && t.includes('.') && /\d\.\d{3}/.test(t)) n.nodeValue = cleanNum(t); }
}
