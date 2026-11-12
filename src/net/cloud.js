// 계정 · 서버 저장. 서버는 영겁의 틈새와 같은 Cloudflare Worker (eonrift 저장소 worker/ashen.ts).
// 이 게임은 GitHub Pages에서 돌므로 다른 주소로 부른다 (서버가 CORS를 연다).
// 영겁의 틈새 테스트 서버(dev 브랜치). 같은 D1을 쓴다. 영겁의 틈새가 출시(main)되면 본 주소로 바꿔도 된다
// 서버는 게임과 같은 Worker(eveil)의 /api. 다른 곳(로컬 등)에서 열면 Cloudflare 게임 주소의 서버를 쓴다
const API = /\.workers\.dev$|\.pages\.dev$/.test(location.hostname) ? '/api' : 'https://eveil.weak0416.workers.dev/api';
const KEY = 'ashen-account';
const GAP = 20; // 서버 저장 사이 최소 간격(초)

const ERR = {
  bad_id: '아이디는 영문 소문자 · 숫자 · _ 4~20자',
  bad_pw: '비밀번호는 6자 이상',
  taken: '이미 있는 아이디입니다',
  wrong: '아이디나 비밀번호가 맞지 않습니다',
  too_fast: '잠시 뒤에 다시 해 주세요',
  auth: '다시 로그인해 주세요',
  offline: '서버에 닿지 않습니다',
  no_server: '서버 저장이 아직 열리지 않았습니다',
  nick_taken: '이미 쓰는 닉네임입니다',
  bad_nick: '닉네임은 한글 · 영문 · 숫자 2~10자',
  moved: '다른 기기에서 접속했습니다',
};
export const cloudError = (code) => ERR[code] || '실패했습니다';

let account = null;
try { account = JSON.parse(localStorage.getItem(KEY)); } catch { /* 저장소를 못 쓰는 환경 */ }
let ready = null;      // 서버에 이 기능이 있는가
let lastPut = 0, lastAt = 0, pending = null;

async function post(body, keepalive = false) {
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive });
    return await r.json();
  } catch { return { ok: false, error: 'offline' }; }
}

export const cloud = {
  get id() { return account?.id || null; },
  state: '',  // 화면에 보일 상태: '' · 'saved' · 'error'
  savedAt: 0,

  // 예전 서버는 모르는 요청을 의견으로 받아 버리므로, 먼저 기능이 있는지 묻는다
  async available() {
    ready ??= fetch(`${API}?action=ash`).then((r) => r.json()).then((j) => !!j.ash).catch(() => false);
    const ok = await ready;
    if (!ok) ready = null;
    return ok;
  },

  async sign(kind, id, pw) {
    if (!(await this.available())) return { ok: false, error: 'no_server' };
    const r = await post({ type: kind === 'register' ? 'ash_register' : 'ash_login', id, pw });
    if (r.ok && r.token) {
      account = { id: r.id, token: r.token };
      try { localStorage.setItem(KEY, JSON.stringify(account)); } catch { /* 무시 */ }
      return { ok: true, id: r.id };
    }
    return { ok: false, error: r.error || 'offline' };
  },

  // 순위 (각성 · 던전 단계 합)
  async rank() {
    if (!(await this.available())) return [];
    const r = await post({ type: 'ash_rank' });
    return r.ok ? r.list || [] : [];
  },

  logout() {
    if (account) post({ type: 'ash_logout', token: account.token });
    account = null;
    try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
  },

  // 오류 보고 (로그인 없이, 한 번 켜는 동안 5개까지)
  reportError(msg, stack, ver) {
    if ((this.errN = (this.errN || 0) + 1) > 5) return;
    post({ type: 'ash_err', msg: String(msg).slice(0, 300), stack: String(stack || '').slice(0, 1500), ver, ua: navigator.userAgent.slice(0, 200) }, true);
  },
  // 서버에 있는 내 캐릭터 목록 [{ cid, at, name, nick, aw }]
  async chars() {
    if (!account || !(await this.available())) return [];
    const r = await post({ type: 'ash_chars', token: account.token });
    if (r.error === 'auth') { this.logout(); return []; }
    return r.ok ? r.list || [] : [];
  },
  // 닉네임 차지 (중복이면 nick_taken)
  async nick(cid, nick) {
    if (!account || !(await this.available())) return { ok: false, error: 'offline' };
    return post({ type: 'ash_nick', token: account.token, cid, nick });
  },
  async delChar(cid) {
    if (!account || !(await this.available())) return;
    await post({ type: 'ash_delchar', token: account.token, cid });
  },
  // 한 단계 전 저장 (백업)
  async restore(cid) {
    if (!account || !(await this.available())) return null;
    const r = await post({ type: 'ash_restore', token: account.token, cid });
    if (!r.ok || !r.data) return null;
    try { return JSON.parse(r.data); } catch { return null; }
  },

  // 서버에 있는 저장 (없으면 null)
  async load(cid) {
    if (!account || !(await this.available())) return null;
    const r = await post({ type: 'ash_load', token: account.token, cid });
    if (r.error === 'auth') { this.logout(); return null; }
    if (!r.ok || !r.data) return null;
    try { return JSON.parse(r.data); } catch { return null; }
  },

  // 게임을 시작할 때: 이 기기를 '지금 하는 기기'로 정하고 서버의 최신 저장을 받는다.
  // 그 뒤 다른 기기가 접속하면 이 기기의 저장은 서버가 거절하고(moved) onMoved가 불린다
  moved: false,
  onMoved: null,
  async claim(cid) {
    if (!account || !(await this.available())) return { ok: false };
    const r = await post({ type: 'ash_claim', token: account.token, cid });
    if (r.error === 'auth') { this.logout(); return { ok: false }; }
    if (!r.ok) return { ok: false, error: r.error };
    this.moved = false;
    clearInterval(this.pingT);
    // 다른 기기가 가져갔는지 15초마다 확인 (저장이 없을 때도 빨리 알아채게)
    this.pingT = setInterval(async () => {
      if (!account || this.moved || document.hidden) return;
      const p = await post({ type: 'ash_ping', token: account.token });
      if (p.ok && p.moved) this.kick();
    }, 15000);
    let data = null;
    try { data = r.data ? JSON.parse(r.data) : null; } catch { /* 깨진 저장 */ }
    return { ok: true, data };
  },
  kick() {
    if (this.moved) return;
    this.moved = true;
    clearInterval(this.pingT);
    this.onMoved?.();
  },

  // 저장을 서버에도 올린다. 너무 잦으면 건너뛰고, force면 바로 (창을 닫을 때)
  async save(st, force = false) {
    if (!account || this.moved || st.savedAt === lastAt) return;
    const now = Date.now();
    if (!force && (pending || now - lastPut < GAP * 1000)) return;
    if (!(await this.available())) return;
    lastPut = now; lastAt = st.savedAt;
    pending = post({ type: 'ash_save', token: account.token, cid: st.cid, data: JSON.stringify(st), at: st.savedAt }, force);
    const r = await pending;
    pending = null;
    this.state = r.ok ? 'saved' : 'error';
    if (r.ok) this.savedAt = now;
    if (r.error === 'auth') this.logout();
    if (r.error === 'moved') this.kick();
  },
};
