// 게임 안 확인 창 (브라우저 기본 confirm 대신). gameConfirm(제목, 글, [예] 글자, 내용 HTML) → Promise<boolean>
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function gameConfirm(title, text = '', yes = '확인', html = '', noCancel = false) {
  return new Promise((done) => {
    document.getElementById('gameAsk')?.remove();
    const el = document.createElement('div');
    el.id = 'gameAsk';
    el.innerHTML = `<div><b>${esc(title)}</b>${html}${text ? `<p>${esc(text).replace(/\n/g, '<br>')}</p>` : ''}<div class="askBtns"><button class="plate gold" data-a="1">${esc(yes)}</button>${noCancel ? '' : '<button class="plate" data-a="0">취소</button>'}</div></div>`;
    const t0 = performance.now();
    const end = (v) => { el.remove(); removeEventListener('keydown', key, true); done(v); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); end(false); } else if (e.key === 'Enter') { e.stopPropagation(); end(true); } };
    addEventListener('keydown', key, true);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => { e.stopPropagation(); if (performance.now() - t0 < 250) return; const b = e.target.closest('[data-a]'); if (b) end(b.dataset.a === '1'); else if (e.target === el) end(false); });
    document.body.appendChild(el);
  });
}
