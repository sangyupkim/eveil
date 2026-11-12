/**
 * 잿빛 연대기(sangyupkim/nec_rog) 계정 · 저장. 영겁의 틈새와 같은 서버 · 같은 D1을 쓰되 표는 따로 둔다 (ash_*).
 * 게임은 다른 주소(GitHub Pages)에서 돌므로 CORS로 부른다.
 *  - GET  /api?action=ash                      이 기능이 있는 서버인지 확인
 *  - POST /api { type: 'ash_register' | 'ash_login', id, pw }   → { ok, id, token }
 *  - POST /api { type: 'ash_save', token, data, at }            저장 (더 오래된 것은 덮어쓰지 않는다)
 *  - POST /api { type: 'ash_load', token }                      → { ok, data, at }
 *  - POST /api { type: 'ash_logout', token }
 *  - POST /api { type: 'ash_err', ver, msg, stack, ua }         오류 보고 (로그인 없음, IP당 하루 50개)
 *  - POST /api { type: 'ash_restore', token }                  → 한 단계 전 저장 (백업)
 *  - POST /api { type: 'ash_claim', token }                    → 이 기기를 지금 하는 기기로 (다른 기기는 저장이 막힌다), 최신 저장을 돌려준다
 *  - POST /api { type: 'ash_ping', token }                     → { moved } 다른 기기가 가져갔는가
 *  캐릭터 여럿 (v0.20): 저장 · 순위 열쇠는 '아이디/cid'. cid가 없으면 예전처럼 아이디 하나
 *  - POST /api { type: 'ash_chars', token }                    → { list: [{ cid, at, name, aw }] }
 *  - POST /api { type: 'ash_nick', token, cid, nick }          닉네임 차지 (중복이면 nick_taken)
 *  - POST /api { type: 'ash_delchar', token, cid }             캐릭터 지우기 (저장 · 닉네임 · 순위)
 *  - POST /api { type: 'ash_rank' }                             → { ok, list: [{ name, aw, dg, title }] } (각성 · 던전 단계 합 순)
 * 비밀번호는 PBKDF2(SHA-256, 소금)로, 토큰은 SHA-256 해시로만 둔다.
 */

interface Stmt {
  bind(...v: unknown[]): Stmt;
  run(): Promise<unknown>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all(): Promise<{ results?: unknown[] }>;
}
interface DB {
  prepare(sql: string): Stmt;
  batch(s: Stmt[]): Promise<unknown>;
}

const SAVE_MAX = 300_000;
const ITER = 100_000;
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b as ArrayBuffer)].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => new Uint8Array((s.match(/../g) ?? []).map((x) => parseInt(x, 16)));
const rand = (n: number) => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async (v: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));

async function pwHash(pw: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: ITER }, key, 256));
}
// 길이가 같은 두 해시를 시간 차 없이 견준다
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

let ready: Promise<unknown> | null = null;
function setup(db: DB): Promise<unknown> {
  ready ??= db
    .batch([
      db.prepare('CREATE TABLE IF NOT EXISTS ash_users (id TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL, created INTEGER NOT NULL, seen INTEGER)'),
      db.prepare('CREATE TABLE IF NOT EXISTS ash_tokens (token_hash TEXT PRIMARY KEY, id TEXT NOT NULL, created INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS ash_saves (id TEXT PRIMARY KEY, data TEXT NOT NULL, at INTEGER NOT NULL, received INTEGER NOT NULL, size INTEGER)'),
      db.prepare('CREATE TABLE IF NOT EXISTS ash_saves_prev (id TEXT PRIMARY KEY, data TEXT NOT NULL, at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS ash_errors (t INTEGER, ip TEXT, ver TEXT, msg TEXT, stack TEXT, ua TEXT)'),
      // 계정마다 지금 하는 기기 하나 (토큰 해시). 다른 토큰의 저장은 'moved'로 거절한다
      db.prepare('CREATE TABLE IF NOT EXISTS ash_active (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, at INTEGER NOT NULL)'),
      // 닉네임: 소문자로 맞춘 이름 하나에 캐릭터 하나
      db.prepare('CREATE TABLE IF NOT EXISTS ash_names (lname TEXT PRIMARY KEY, name TEXT NOT NULL, k TEXT NOT NULL, at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS ash_rank (id TEXT PRIMARY KEY, name TEXT, aw INTEGER, dg INTEGER, title TEXT, at INTEGER)'),
      // 계정 공용 창고 (캐릭터끼리 나눠 쓴다)
      db.prepare('CREATE TABLE IF NOT EXISTS ash_vault (id TEXT PRIMARY KEY, data TEXT NOT NULL, at INTEGER NOT NULL)'),
    ])
    .catch((e) => {
      ready = null;
      throw e;
    });
  return ready;
}

/** 같은 열쇠로 sec초 안에 다시 오면 false (throttle 표는 본 서버가 만든다) */
async function pass(db: DB, k: string, sec: number): Promise<boolean> {
  const now = Date.now();
  const row = await db.prepare('SELECT until FROM throttle WHERE k = ?').bind(k).first<{ until: number }>();
  if (row && row.until > now) return false;
  await db.prepare('INSERT INTO throttle (k, until) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET until = excluded.until').bind(k, now + sec * 1000).run();
  return true;
}

async function issue(db: DB, id: string): Promise<string> {
  const token = rand(24);
  await db.batch([
    db.prepare('INSERT INTO ash_tokens (token_hash, id, created) VALUES (?, ?, ?)').bind(await sha(token), id, Date.now()),
    db.prepare('UPDATE ash_users SET seen = ? WHERE id = ?').bind(Date.now(), id),
    // 기기마다 하나씩, 가장 새 토큰 다섯만 남긴다
    db.prepare('DELETE FROM ash_tokens WHERE id = ? AND token_hash NOT IN (SELECT token_hash FROM ash_tokens WHERE id = ? ORDER BY created DESC LIMIT 5)').bind(id, id),
  ]);
  return token;
}

async function who(db: DB, d: Record<string, unknown>): Promise<string | null> {
  const token = String(d.token ?? '');
  if (token.length < 20 || token.length > 100) return null;
  const r = await db.prepare('SELECT id FROM ash_tokens WHERE token_hash = ?').bind(await sha(token)).first<{ id: string }>();
  return r?.id ?? null;
}

export async function ashen(db: DB, d: Record<string, unknown>, ip: string): Promise<Record<string, unknown>> {
  await setup(db);
  const type = String(d.type);
  if (type === 'ash_err') {
    const day = Date.now() - 86400e3;
    const n = await db.prepare('SELECT COUNT(*) AS n FROM ash_errors WHERE ip = ? AND t > ?').bind(ip, day).first<{ n: number }>();
    if ((n?.n || 0) >= 50) return { ok: true };
    await db.prepare('INSERT INTO ash_errors (t, ip, ver, msg, stack, ua) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(Date.now(), ip, String(d.ver ?? '').slice(0, 20), String(d.msg ?? '').slice(0, 300), String(d.stack ?? '').slice(0, 1500), String(d.ua ?? '').slice(0, 200)).run();
    await db.prepare('DELETE FROM ash_errors WHERE t < ?').bind(Date.now() - 30 * 86400e3).run();
    return { ok: true };
  }
  if (type === 'ash_rank') {
    const r = await db.prepare('SELECT name, aw, dg, title FROM ash_rank ORDER BY aw DESC, dg DESC, at ASC LIMIT 50').all();
    return { ok: true, list: r.results || [] };
  }
  if (type === 'ash_register' || type === 'ash_login') {
    const id = String(d.id ?? '').trim().toLowerCase();
    const pw = String(d.pw ?? '');
    if (!/^[a-z0-9_]{4,20}$/.test(id)) return { ok: false, error: 'bad_id' };
    if (pw.length < 6 || pw.length > 64) return { ok: false, error: 'bad_pw' };
    if (type === 'ash_register') {
      if (!(await pass(db, 'ashr_' + ip, 10))) return { ok: false, error: 'too_fast' };
      if (await db.prepare('SELECT id FROM ash_users WHERE id = ?').bind(id).first()) return { ok: false, error: 'taken' };
      const salt = rand(16);
      await db.prepare('INSERT INTO ash_users (id, salt, hash, created, seen) VALUES (?, ?, ?, ?, ?)').bind(id, salt, await pwHash(pw, salt), Date.now(), Date.now()).run();
      return { ok: true, id, token: await issue(db, id) };
    }
    // 비밀번호 맞히기를 막는다: 같은 곳 · 같은 아이디는 2초에 한 번
    if (!(await pass(db, 'ashl_' + ip, 2)) || !(await pass(db, 'ashl_' + id, 2))) return { ok: false, error: 'too_fast' };
    const u = await db.prepare('SELECT salt, hash FROM ash_users WHERE id = ?').bind(id).first<{ salt: string; hash: string }>();
    if (!u || !same(await pwHash(pw, u.salt), u.hash)) return { ok: false, error: 'wrong' };
    return { ok: true, id, token: await issue(db, id) };
  }
  const id = await who(db, d);
  if (!id) return { ok: false, error: 'auth' };
  const th = await sha(String(d.token));
  // 다른 기기가 이 계정을 가져갔는가 (가져간 기기가 없으면 예전 클라이언트도 저장할 수 있다)
  const movedAway = async () => {
    const a = await db.prepare('SELECT token_hash FROM ash_active WHERE id = ?').bind(id).first<{ token_hash: string }>();
    return !!a && a.token_hash !== th;
  };
  // 캐릭터 열쇠: 아이디/cid (cid는 영문 · 숫자 4~16자)
  const cid = String(d.cid ?? '');
  const key = /^[a-z0-9]{4,16}$/.test(cid) ? `${id}/${cid}` : id;
  if (type === 'ash_chars') {
    // 예전 저장(아이디 하나)은 첫 캐릭터로 옮긴다
    const old = await db.prepare('SELECT id FROM ash_saves WHERE id = ?').bind(id).first();
    if (old) {
      const nc = 'c' + rand(4);
      await db.batch([
        db.prepare('UPDATE ash_saves SET id = ? WHERE id = ?').bind(`${id}/${nc}`, id),
        db.prepare('DELETE FROM ash_rank WHERE id = ?').bind(id),
      ]);
    }
    const r = await db.prepare("SELECT id, data, at FROM ash_saves WHERE id LIKE ? ESCAPE '\\'").bind(id.replace(/_/g, '\\_') + '/%').all();
    const list = ((r.results || []) as { id: string; data: string; at: number }[]).map((x) => {
      let name = '', aw = 0, nick = '';
      try { const st = JSON.parse(x.data); name = String(st.name || ''); aw = Number(st.awakenings) || 0; nick = String(st.nick || ''); } catch { /* 깨진 저장 */ }
      return { cid: x.id.slice(id.length + 1), at: x.at, name, nick, aw };
    });
    return { ok: true, list };
  }
  if (type === 'ash_nick') {
    const nick = String(d.nick ?? '').trim();
    if (!/^[가-힣a-zA-Z0-9_]{2,10}$/.test(nick)) return { ok: false, error: 'bad_nick' };
    if (key === id) return { ok: false, error: 'bad_cid' };
    const lname = nick.toLowerCase();
    const has = await db.prepare('SELECT k FROM ash_names WHERE lname = ?').bind(lname).first<{ k: string }>();
    if (has && has.k !== key) return { ok: false, error: 'nick_taken' };
    await db.batch([
      db.prepare('DELETE FROM ash_names WHERE k = ?').bind(key),
      db.prepare('INSERT INTO ash_names (lname, name, k, at) VALUES (?, ?, ?, ?)').bind(lname, nick, key, Date.now()),
      db.prepare('UPDATE ash_rank SET name = ? WHERE id = ?').bind(nick, key),
    ]);
    return { ok: true, nick };
  }
  if (type === 'ash_delchar') {
    if (key === id) return { ok: false, error: 'bad_cid' };
    await db.batch([
      db.prepare('DELETE FROM ash_saves WHERE id = ?').bind(key),
      db.prepare('DELETE FROM ash_saves_prev WHERE id = ?').bind(key),
      db.prepare('DELETE FROM ash_names WHERE k = ?').bind(key),
      db.prepare('DELETE FROM ash_rank WHERE id = ?').bind(key),
    ]);
    return { ok: true };
  }
  if (type === 'ash_claim') {
    await db.prepare('INSERT INTO ash_active (id, token_hash, at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash, at = excluded.at').bind(id, th, Date.now()).run();
    const s = await db.prepare('SELECT data, at FROM ash_saves WHERE id = ?').bind(key).first<{ data: string; at: number }>();
    return { ok: true, id, data: s?.data ?? null, at: s?.at ?? 0 };
  }
  if (type === 'ash_ping') return { ok: true, moved: await movedAway() };
  // 계정 공용 창고: 읽기 · 쓰기 (더 새 것만 덮는다, 다른 기기가 가져갔으면 거절)
  if (type === 'ash_vault') {
    const r = await db.prepare('SELECT data, at FROM ash_vault WHERE id = ?').bind(id).first<{ data: string; at: number }>();
    return { ok: true, data: r?.data ?? null, at: r?.at ?? 0 };
  }
  if (type === 'ash_vault_put') {
    if (await movedAway()) return { ok: false, error: 'moved' };
    const data = String(d.data ?? ''), at = Number(d.at) || Date.now();
    if (data.length > 600000) return { ok: false, error: 'big' };
    await db.prepare('INSERT INTO ash_vault (id, data, at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, at = excluded.at WHERE excluded.at >= ash_vault.at').bind(id, data, at).run();
    return { ok: true };
  }
  if (type === 'ash_save') {
    if (await movedAway()) return { ok: false, error: 'moved' };
    const data = String(d.data ?? '');
    if (data.length < 2 || data.length > SAVE_MAX || data[0] !== '{') return { ok: false, error: 'bad_save' };
    const at = Math.floor(Number(d.at)) || 0;
    // 덮어쓰기 전 저장을 하나 남긴다 (한 시간 넘게 지난 것만 — 잦은 저장마다 덮지 않게)
    await db.prepare('INSERT INTO ash_saves_prev (id, data, at) SELECT id, data, at FROM ash_saves WHERE id = ? AND at < ? ON CONFLICT(id) DO UPDATE SET data = excluded.data, at = excluded.at')
      .bind(key, at - 3600e3).run();
    await db
      .prepare(
        `INSERT INTO ash_saves (id, data, at, received, size) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, at = excluded.at, received = excluded.received, size = excluded.size WHERE excluded.at >= ash_saves.at`,
      )
      .bind(key, data, at, Date.now(), data.length)
      .run();
    // 순위: 저장 안에서 각성 · 던전 단계 합 · 칭호만 읽어 둔다 (값은 서버가 저장에서 뽑는다)
    try {
      const st = JSON.parse(data);
      const dg = Object.values(st.dungeons || {}).reduce((a: number, v: any) => a + Math.min(10, Math.max(0, Math.floor(Number(v) || 0))), 0);
      const aw = Math.min(999, Math.max(0, Math.floor(Number(st.awakenings) || 0)));
      const t = Array.isArray(st.titles) && st.titles.length ? String(st.titles[st.titles.length - 1].name || '').slice(0, 20) : '';
      // 순위 이름은 서버에 차지한 닉네임 (없으면 순위에 올리지 않는다)
      const nm = key === id ? { name: String(st.name || id).slice(0, 16) } : await db.prepare('SELECT name FROM ash_names WHERE k = ?').bind(key).first<{ name: string }>();
      if (nm) await db.prepare('INSERT INTO ash_rank (id, name, aw, dg, title, at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, aw = excluded.aw, dg = excluded.dg, title = excluded.title, at = excluded.at')
        .bind(key, nm.name, aw, dg, t, Date.now()).run();
    } catch { /* 순위는 실패해도 저장은 된다 */ }
    return { ok: true, at };
  }
  if (type === 'ash_load') {
    const s = await db.prepare('SELECT data, at FROM ash_saves WHERE id = ?').bind(key).first<{ data: string; at: number }>();
    return { ok: true, id, data: s?.data ?? null, at: s?.at ?? 0 };
  }
  if (type === 'ash_restore') {
    const s = await db.prepare('SELECT data, at FROM ash_saves_prev WHERE id = ?').bind(key).first<{ data: string; at: number }>();
    return { ok: true, data: s?.data ?? null, at: s?.at ?? 0 };
  }
  if (type === 'ash_logout') {
    await db.prepare('DELETE FROM ash_tokens WHERE token_hash = ?').bind(await sha(String(d.token))).run();
    return { ok: true };
  }
  return { ok: false, error: 'bad_type' };
}
