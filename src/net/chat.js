// v0.49.28 채팅: 서버 채팅방(Durable Object)에 웹소켓 하나로 붙는다.
// 로그인하지 않았거나 닉네임이 없으면 읽기만 된다. 끊기면 점점 길게 기다렸다 다시 붙는다 (최대 1분).
import { cloud } from './cloud.js';

const BASE = typeof location !== 'undefined' && (/\.workers\.dev$|\.pages\.dev$/.test(location.hostname) || location.port === '8787') ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}` : 'wss://eveil.weak0416.workers.dev';
const KEEP = 50;

export const chat = {
  list: [], // { n, x, at }
  me: null, // 서버가 정한 내 이름 (없으면 읽기만)
  on: 0, // 접속자 수
  ok: false,
  ws: null,
  cid: null,
  listeners: new Set(),
  since: Date.now(), // 이 게임을 켠 때 (그 전 말은 보이지 않는다)
  wait: 2000,
  emit(ev, data) { for (const f of this.listeners) { try { f(ev, data); } catch { /* 화면 쪽 오류는 무시 */ } } },
  // 캐릭터를 고른 뒤(그 캐릭터 이름으로 말한다) 한 번 부른다. 캐릭터를 바꾸면 다시 부른다
  start(cid) {
    if (this.cid === cid && this.ws) return;
    this.cid = cid; this.stop(); this.connect();
  },
  stop() { const w = this.ws; this.ws = null; this.ok = false; clearTimeout(this.retryT); clearInterval(this.pingT); try { w?.close(); } catch { /* 이미 닫힘 */ } },
  connect() {
    if (typeof WebSocket === 'undefined') return;
    const q = new URLSearchParams();
    if (cloud.token && this.cid) { q.set('token', cloud.token); q.set('cid', this.cid); }
    let ws;
    try { ws = new WebSocket(`${BASE}/api/chat?${q}`); } catch { this.retry(); return; }
    this.ws = ws;
    ws.onopen = () => { this.ok = true; this.wait = 2000; this.pingT = setInterval(() => { try { ws.send('ping'); } catch { /* 끊김 */ } }, 50000); };
    ws.onmessage = (e) => {
      if (e.data === 'pong') return;
      let d; try { d = JSON.parse(e.data); } catch { return; }
      // v0.49.37 게임을 켠 뒤에 오간 말만 보인다: 처음 붙을 때는 서버의 지난 기록을 버리고, 끊겼다 다시 붙으면 그사이 놓친 말만 더한다
      if (d.t === 'hi') {
        this.me = d.me || null; this.on = d.on || 0;
        const seen = new Set(this.list.map((m) => m.at + m.n + m.x));
        for (const m of d.log || []) if (m.at >= this.since && !seen.has(m.at + m.n + m.x)) this.list.push(m);
        this.list.sort((a, b) => a.at - b.at); if (this.list.length > KEEP) this.list.splice(0, this.list.length - KEEP);
        this.emit('hi');
      }
      else if (d.t === 'msg') { this.on = d.on || this.on; this.list.push(d.m); if (this.list.length > KEEP) this.list.splice(0, this.list.length - KEEP); this.emit('msg', d.m); }
      else if (d.t === 'on') { this.on = d.on || 0; this.emit('on'); } // v0.49.44 접속자 수가 바뀜
      else if (d.t === 'err') this.emit('err', d); // { e: login · slow · same · mute · ban, wait(초) }
    };
    ws.onclose = () => { if (this.ws !== ws) return; this.ws = null; this.ok = false; clearInterval(this.pingT); this.emit('close'); this.retry(); };
    ws.onerror = () => { /* onclose가 뒤따른다 */ };
  },
  retry() { clearTimeout(this.retryT); this.retryT = setTimeout(() => { if (!this.ws) this.connect(); }, this.wait); this.wait = Math.min(60000, this.wait * 2); },
  // 화면이 다시 보이면 끊긴 연결을 바로 다시
  wake() { if (!this.ws && this.cid !== null) { this.wait = 2000; this.connect(); } },
  say(text) {
    const x = String(text || '').trim().slice(0, 60);
    if (!x) return { ok: false };
    if (!this.ok) return { ok: false, why: '채팅 서버에 연결 중입니다' };
    if (!this.me) {
      // 방금 로그인 · 닉네임을 정했으면 다시 붙어 이름을 받는다. 다시 붙어도 이름이 없으면 닉네임이 서버에 없는 것 → 정하게 한다 (v0.49.57)
      if (cloud.token && !this.retried) { this.retried = true; this.stop(); this.connect(); return { ok: false, why: '채팅 서버에 다시 연결합니다. 잠시 뒤 다시 보내 주세요' }; }
      if (cloud.token) { this.retried = false; globalThis.__askNick?.('채팅하려면 닉네임을 정해 주세요'); return { ok: false }; }
      return { ok: false, why: '계정을 연동하면 채팅할 수 있습니다 (메뉴 → 설정)' };
    } // 방금 로그인 · 닉네임을 정했으면 다시 붙어 이름을 받는다
    this.ws.send(JSON.stringify({ t: 'say', x }));
    return { ok: true };
  },
};
