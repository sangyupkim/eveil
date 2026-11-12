// UI 크기 · 위치 조절: 설정(st.settings.ui)에 저장하고 화면 요소에 transform으로 적용한다
// 편집 모드에서는 조이스틱 · 행동 단추 · 퀵슬롯 · 위쪽 정보 · 미니맵을 손가락으로 끌어 옮긴다
const $ = (s) => document.querySelector(s);
// key: [요소, 크기 설정 이름, 기준점]
const PARTS = { joy: ['#joy', 'joy', 'center'], br: ['#br', 'btn', 'bottom right'], quick: ['#quick', 'btn', 'bottom right'], tl: ['#tl', 'top', 'top left'], tr: ['#tr', 'top', 'top right'] };
export const UI_DEFAULT = { scale: 1, joy: 1, btn: 1, top: 1, alpha: 1, zoom: 1, pos: {} };

export function uiSettings(st) {
  st.settings.ui = { ...UI_DEFAULT, ...(st.settings.ui || {}) };
  st.settings.ui.pos ||= {};
  return st.settings.ui;
}

export function applyUi(st) {
  const u = uiSettings(st);
  document.documentElement.style.setProperty('--uiK', u.scale);
  if (globalThis.__stage) globalThis.__stage.userZoom = u.zoom; // 화면 확대는 설정에서만
  for (const [key, [sel, size, origin]] of Object.entries(PARTS)) {
    const el = $(sel);
    if (!el) continue;
    const p = u.pos[key] || { x: 0, y: 0 };
    el.style.transformOrigin = origin;
    el.style.translate = `${p.x}px ${p.y}px`;
    el.style.scale = String(u[size]);
    el.style.opacity = key === 'tl' || key === 'tr' ? '' : String(u.alpha);
  }
}

// 편집 모드: 끌어서 옮기고 [완료]로 저장
export function editUi(st, done) {
  const u = uiSettings(st);
  document.body.classList.add('ui-edit');
  const bar = document.createElement('div');
  bar.id = 'uiEditBar';
  bar.innerHTML = '<span>끌어서 옮기기</span><button class="btn" data-k="reset">처음대로</button><button class="btn gold" data-k="done">완료</button>';
  document.body.appendChild(bar);
  const offs = [];
  for (const [key, [sel]] of Object.entries(PARTS)) {
    const el = $(sel);
    if (!el) continue;
    let drag = null;
    const down = (e) => {
      e.preventDefault(); e.stopPropagation();
      const p = u.pos[key] || { x: 0, y: 0 };
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: p.x, y: p.y };
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      u.pos[key] = { x: Math.round(drag.x + e.clientX - drag.sx), y: Math.round(drag.y + e.clientY - drag.sy) };
      applyUi(st);
    };
    const up = () => { drag = null; };
    el.addEventListener('pointerdown', down, true);
    el.addEventListener('pointermove', move, true);
    el.addEventListener('pointerup', up, true);
    offs.push(() => { el.removeEventListener('pointerdown', down, true); el.removeEventListener('pointermove', move, true); el.removeEventListener('pointerup', up, true); });
  }
  bar.onclick = (e) => {
    const k = e.target.dataset.k;
    if (k === 'reset') { u.pos = {}; applyUi(st); }
    if (k === 'done') { offs.forEach((f) => f()); bar.remove(); document.body.classList.remove('ui-edit'); done?.(); }
  };
}
