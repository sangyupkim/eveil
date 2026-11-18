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

// 여러 개 고르기 창: opts = [{ key, label, sub, color, on, off }] → 고른 key 배열 | null(취소)
export function gamePick(title, opts, yes = '확인', text = '') {
  return new Promise((done) => {
    document.getElementById('gameAsk')?.remove();
    const el = document.createElement('div');
    el.id = 'gameAsk';
    const on = new Set(opts.filter((o) => o.on && !o.off).map((o) => o.key));
    const draw = () => {
      el.innerHTML = `<div><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}<div class="askPick">${opts.map((o, i) => `<button class="btn${on.has(o.key) ? ' on' : ''}" data-p="${i}" ${o.off ? 'disabled' : ''}><span style="${o.color ? `color:${o.color}` : ''}">${esc(o.label)}</span>${o.sub != null ? `<small>${esc(String(o.sub))}</small>` : ''}</button>`).join('')}</div><div class="askBtns"><button class="plate gold" data-a="1" ${on.size ? '' : 'disabled'}>${esc(yes)}</button><button class="plate" data-a="0">취소</button></div></div>`;
    };
    draw();
    const t0 = performance.now();
    const end = (v) => { el.remove(); removeEventListener('keydown', key, true); done(v); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); end(null); } };
    addEventListener('keydown', key, true);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => { e.stopPropagation(); if (performance.now() - t0 < 250) return;
      const p = e.target.closest('[data-p]'); if (p && !p.disabled) { const k = opts[+p.dataset.p].key; if (on.has(k)) on.delete(k); else on.add(k); draw(); return; }
      const b = e.target.closest('[data-a]'); if (b && !b.disabled) end(b.dataset.a === '1' ? opts.filter((o) => on.has(o.key)).map((o) => o.key) : null); else if (e.target === el) end(null); });
    document.body.appendChild(el);
  });
}
