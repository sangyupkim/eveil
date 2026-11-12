// 계정 · 서버 저장. 서버는 영겁의 틈새와 같은 Cloudflare Worker (eonrift 저장소 worker/ashen.ts).
// 이 게임은 GitHub Pages에서 돌므로 다른 주소로 부른다 (서버가 CORS를 연다).
// 영겁의 틈새 테스트 서버(dev 브랜치). 같은 D1을 쓴다. 영겁의 틈새가 출시(main)되면 본 주소로 바꿔도 된다
const API = 'https://dev-eonrift.weak0416.workers.dev/api';
const KEY = 'ashen-account';
const GAP = 45; // 서버 저장 사이 최소 간격(초)

const ERR = {
  bad_id: '아이디는 영문 소문자 · 숫자 · _ 4~20자',
  bad_pw: '비밀번호는 6자 이상',
  taken: '이미 있는 아이디입니다',
  wrong: '아이디나 비밀번호가 맞지 않습니다',
  too_fast: '잠시 뒤에 다시 해 주세요',
  auth: '다시 로그인해 주세요',
  offline: '서버에 닿지 않습니다',
  no_server: '서버 저장이 아직 열리지 않았습니다',
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

  // 서버에 있는 저장 (없으면 null)
  async load() {
    if (!account || !(await this.available())) return null;
    const r = await post({ type: 'ash_load', token: account.token });
    if (r.error === 'auth') { this.logout(); return null; }
    if (!r.ok || !r.data) return null;
    try { return JSON.parse(r.data); } catch { return null; }
  },

  // 저장을 서버에도 올린다. 너무 잦으면 건너뛰고, force면 바로 (창을 닫을 때)
  async save(st, force = false) {
    if (!account || st.savedAt === lastAt) return;
    const now = Date.now();
    if (!force && (pending || now - lastPut < GAP * 1000)) return;
    if (!(await this.available())) return;
    lastPut = now; lastAt = st.savedAt;
    pending = post({ type: 'ash_save', token: account.token, data: JSON.stringify(st), at: st.savedAt }, force);
    const r = await pending;
    pending = null;
    this.state = r.ok ? 'saved' : 'error';
    if (r.ok) this.savedAt = now;
    if (r.error === 'auth') this.logout();
  },
};
