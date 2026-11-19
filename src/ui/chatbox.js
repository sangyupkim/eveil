// v0.49.29 게임 화면 왼쪽 아래 채팅창 (일반 RPG처럼): 투명한 바탕에 글만 올라온다.
// - 글 줄은 손가락 · 마우스를 통과시킨다 (아래 조이스틱 · 사냥터를 가리지 않게). 단추 · 입력 칸만 눌린다.
// - [채팅]을 누르면(PC는 Enter) 입력 칸이 열린다. Enter로 보내고, 비어 있을 때 Enter · Esc · 바깥 누르기로 닫는다.
// - 접기 단추로 글 줄을 숨긴다 (st.settings.chatHud === false). 접힌 동안 온 말은 수만 보인다.
import { chat } from '../net/chat.js';
import { cloud } from '../net/cloud.js';
import { audio } from '../engine/audio.js';

const SHOW = 6;
// v0.49.30 서버가 막은 까닭 (도배 · 금지)
const time = (s) => (s >= 60 ? `${Math.ceil(s / 60)}분` : `${s}초`);
const errText = (d) => ({
  slow: `잠시 뒤에 보내 주세요 (${time(d.wait || 1)})`,
  same: '같은 말을 이어서 보낼 수 없습니다',
  mute: `도배로 ${time(d.wait || 60)} 동안 말할 수 없습니다`,
  ban: d.wait ? `채팅이 금지되었습니다 (${time(d.wait)} 남음)` : '채팅이 금지되었습니다',
}[d.e] || '로그인하고 닉네임을 정해야 말할 수 있습니다');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function setupChatBox(world) {
  const st = world.st;
  const box = document.createElement('div');
  box.id = 'chatBox';
  box.innerHTML = `<div class="chatLines"></div>
    <div class="chatInput" hidden><input id="chatTxt" type="text" maxlength="60" enterkeyhint="send" autocomplete="off" /><button class="btn gold" id="chatSend">보내기</button></div>
    <div class="chatBar"><button id="chatOpen" class="chatBtn">채팅<em class="chatNew" hidden></em></button><button id="chatFold" class="chatBtn fold"><small class="chev"></small></button></div>`;
  document.getElementById('hud').appendChild(box);
  const lines = box.querySelector('.chatLines'), inRow = box.querySelector('.chatInput'), txt = box.querySelector('#chatTxt'), badge = box.querySelector('.chatNew');
  let unread = 0;
  const folded = () => st.settings?.chatHud === false;
  const draw = () => {
    box.classList.toggle('folded', folded());
    lines.innerHTML = chat.list.slice(-SHOW).map((m) => `<div class="cl${m.n === chat.me ? ' me' : ''}"><b>${esc(m.n)}</b> ${esc(m.x)}</div>`).join('');
    badge.hidden = !(folded() && unread); badge.textContent = unread > 99 ? '99+' : String(unread);
  };
  const open = () => {
    if (!cloud.token) { world.ui.toast('로그인하고 닉네임을 정해야 말할 수 있습니다'); audio.play('error'); return; }
    if (folded()) { st.settings.chatHud = true; unread = 0; }
    inRow.hidden = false; box.classList.add('typing'); draw(); txt.focus();
  };
  const close = () => { inRow.hidden = true; box.classList.remove('typing'); txt.blur(); };
  const send = () => {
    if (!txt.value.trim()) { close(); return; }
    const r = chat.say(txt.value);
    if (r.ok) { txt.value = ''; audio.play('click'); } else if (r.why) { world.ui.toast(r.why); audio.play('error'); }
  };
  box.querySelector('#chatOpen').onclick = () => (inRow.hidden ? open() : close());
  box.querySelector('#chatFold').onclick = () => { st.settings.chatHud = folded(); if (!folded()) unread = 0; else close(); audio.play('click'); draw(); };
  box.querySelector('#chatSend').onclick = send;
  txt.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(); } else if (e.key === 'Escape') close(); });
  txt.addEventListener('keyup', (e) => e.stopPropagation());
  // 입력 칸이 열린 채로 다른 곳을 누르면 (쓰던 글이 없을 때) 닫는다
  document.addEventListener('pointerdown', (e) => { if (!inRow.hidden && !box.contains(e.target) && !txt.value.trim()) close(); }, true);
  chat.listeners.add((ev, m) => {
    if (ev === 'msg' && folded() && m.n !== chat.me) unread++;
    else if (ev === 'err') { world.ui.toast(errText(m)); audio.play('error'); }
    draw();
  });
  draw();
  return { open, close, get typing() { return !inRow.hidden; } };
}
