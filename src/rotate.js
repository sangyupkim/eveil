// 세로 화면 강제 가로: 휴대폰을 세로로 들면 게임 전체(body)를 90도 돌린다.
// 돌린 동안 window.innerWidth/innerHeight는 바꿔 돌려주고, 터치 좌표(clientX/Y)는 게임 안 좌표로 바꾼다.
const realW = () => document.documentElement.clientWidth || screen.width, realH = () => document.documentElement.clientHeight || screen.height;
let rotated = false;
const nativeW = () => window.visualViewport ? window.visualViewport.width : realW();
const nativeH = () => window.visualViewport ? window.visualViewport.height : realH();
export const forcedLandscape = () => rotated;
// 세로가 가로보다 이만큼 길 때만 돌린다. 폴드를 펼친 화면처럼 정사각형에 가까우면 돌리지 않고 그대로 쓴다
export const TALL = 1.3;
// 글을 치는 중(키보드가 떠 있음)에는 화면 높이가 줄어도 방향을 바꾸지 않는다
const typing = () => { const e = document.activeElement; return !!e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.isContentEditable); };
function apply() {
  if (typing()) return;
  const w = nativeW(), h = nativeH();
  rotated = matchMedia('(pointer: coarse)').matches && h > w * TALL;
  document.documentElement.classList.toggle('force-land', rotated);
  document.documentElement.classList.toggle('squarish', !rotated && h > w * 0.8);
}
// 돌렸으면 가로 · 세로를 바꿔 알려 준다
try {
  Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => (rotated ? nativeH() : nativeW()) });
  Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => (rotated ? nativeW() : nativeH()) });
} catch {}
// 터치 · 마우스 좌표: 화면 (sx, sy) → 게임 (sy, W - sx)
const fix = (proto) => {
  const dx = Object.getOwnPropertyDescriptor(proto, 'clientX'), dy = Object.getOwnPropertyDescriptor(proto, 'clientY');
  if (!dx || !dy) return;
  Object.defineProperty(proto, 'clientX', { configurable: true, get() { return rotated ? dy.get.call(this) : dx.get.call(this); } });
  Object.defineProperty(proto, 'clientY', { configurable: true, get() { return rotated ? nativeW() - dx.get.call(this) : dy.get.call(this); } });
};
fix(MouseEvent.prototype);
if (window.Touch) fix(Touch.prototype);
// 요소 사각형도 게임 좌표로
const gbr = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function () {
  const r = gbr.call(this);
  if (!rotated) return r;
  const W = nativeW();
  return { left: r.top, top: W - r.right, right: r.bottom, bottom: W - r.left, width: r.height, height: r.width, x: r.top, y: W - r.right };
};
apply();
const on = () => { const was = rotated; apply(); if (was !== rotated) window.dispatchEvent(new Event('resize')); };
window.visualViewport?.addEventListener('resize', on);
window.addEventListener('orientationchange', () => setTimeout(on, 200));
window.addEventListener('resize', () => { const was = rotated; apply(); if (was !== rotated) window.dispatchEvent(new Event('resize')); });
// 키보드를 닫으면(입력칸에서 벗어나면) 다시 따져 본다
document.addEventListener('focusout', () => setTimeout(on, 350));
