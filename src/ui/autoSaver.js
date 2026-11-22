// v0.49.61 자동 사냥: 화면 꺼짐 막기 + 화면 가리기(검은 화면에 요약만)
// - 화면 꺼짐 막기: 자동 사냥이 켜져 있는 동안 Screen Wake Lock. 지원하지 않는 휴대폰(예전 iOS 등)은 소리 없는 작은 영상을 되풀이해 꺼지지 않게 한다.
//   Wake Lock은 화면이 다시 보일 때마다 풀리므로 그때 다시 잡는다.
// - 화면 가리기: 게임 그림은 그리지 않고(전기를 아낀다) 각성 · 경험치 · 가방 · 이번 자동 사냥에서 얻은 것만 보인다.
import { bagSize } from '../game/inventory.js';
import { expNeeded } from '../game/growth.js';
import { audio } from '../engine/audio.js';

let lock = null, video = null, want = false;
async function grab() {
  if (!want || document.hidden) return;
  try {
    if ('wakeLock' in navigator) {
      if (!lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
      return;
    }
  } catch { /* 거절 · 미지원 → 영상으로 */ }
  if (!video) {
    video = document.createElement('video');
    video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.muted = true; video.loop = true;
    video.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1';
    for (const [src, type] of [['assets/keepawake.webm', 'video/webm'], ['assets/keepawake.mp4', 'video/mp4']]) { const s = document.createElement('source'); s.src = src; s.type = type; video.appendChild(s); }
    document.body.appendChild(video);
  }
  video.play().catch(() => {});
}
function letGo() {
  try { lock?.release(); } catch { /* 이미 풀림 */ }
  lock = null; video?.pause();
}
export function keepAwake(on) {
  want = on;
  if (on) grab(); else letGo();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && want) grab(); });
// 누를 때마다 한 번 더 (영상 재생 · 잠금은 사용자가 누른 순간에만 허락하는 브라우저가 있다)
addEventListener('pointerdown', () => { if (want && !lock && !(video && !video.paused)) grab(); }, true);

export function setupAutoSaver(world) {
  const st = world.st;
  const el = document.createElement('div');
  el.id = 'autoSaver'; el.hidden = true;
  el.innerHTML = `<div class="asBox"><div class="asTitle">자동 사냥 중</div><div class="asZone"></div>
    <div class="asRows"></div><button class="plate gold" id="asShow">화면 보기</button></div>`;
  document.body.appendChild(el);
  const btn = document.createElement('button');
  btn.id = 'btnHideScreen'; btn.className = 'btn'; btn.textContent = '화면 가리기'; btn.hidden = true;
  document.getElementById('hud').appendChild(btn);
  let start = null;
  const rows = el.querySelector('.asRows'), zoneEl = el.querySelector('.asZone');
  const show = (on) => {
    el.hidden = !on; window.__saverOn = on; audio.play('click');
    if (on) { start = { kills: st.rec?.kills || 0, gold: st.gold, aw: st.awakenings || 0, t: Date.now() }; draw(); }
  };
  const draw = () => {
    if (el.hidden) return;
    const need = expNeeded(st.awakenings || 0) || 1, pct = Math.min(100, (st.exp / need) * 100);
    const n = st.inv.length, B = bagSize(st), min = Math.floor((Date.now() - start.t) / 60000);
    zoneEl.textContent = world.dungeon ? `${world.dungeon.zone.name} 던전` : world.autoArea?.zone?.name || '';
    rows.innerHTML = `<div><span>각성</span><b>${st.awakenings || 0}${(st.awakenings || 0) > start.aw ? ` <em>+${st.awakenings - start.aw}</em>` : ''}</b></div>
      <div><span>경험치</span><b>${pct.toFixed(2)}%</b></div><div class="asBar"><i style="width:${pct}%"></i></div>
      <div><span>가방</span><b class="${n >= B ? 'full' : ''}">${n} / ${B}</b></div>
      <div><span>처치</span><b>${((st.rec?.kills || 0) - start.kills).toLocaleString()}</b></div>
      <div><span>금화</span><b>+${Math.max(0, st.gold - start.gold).toLocaleString()} G</b></div>
      <div><span>시간</span><b>${min >= 60 ? `${Math.floor(min / 60)}시간 ` : ''}${min % 60}분</b></div>`;
  };
  el.querySelector('#asShow').onclick = () => show(false);
  // 자동 사냥 단추를 누르는 그 순간에 잡는다 (영상 대체는 누른 순간에만 재생을 허락하는 휴대폰이 있다)
  addEventListener('pointerdown', (e) => { if (e.target.closest?.('#btnAuto') && !world.auto) { want = true; grab(); } }, true);
  btn.onclick = () => { show(true); keepAwake(true); };
  setInterval(() => {
    const auto = !!world.auto && !world.dead;
    if (auto !== want) keepAwake(auto);
    btn.hidden = !auto || !el.hidden;
    if (!auto && !el.hidden) show(false); // 자동 사냥이 멈추면(죽음 · 직접 끔) 게임 화면으로
    draw();
  }, 1000);
  return { show };
}
