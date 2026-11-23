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
 *  관리(v0.36): ash_cfg(밸런스 받기) · ash_notices · ash_mail / ash_mail_claim {ids?} · ash_admin_*(d.admin = ADMIN_KEY): cfg · notice_add/del · mail · mails · mail_del
 *  - POST /api { type: 'ash_ping', token }                     → { moved } 다른 기기가 가져갔는가
 *  - POST /api { type: 'ash_handoff', token }                  → { done } 예전 기기의 마지막 저장이 끝났는가 (claim이 handoff를 돌려준 뒤)
 *  캐릭터 여럿 (v0.20): 저장 · 순위 열쇠는 '아이디/cid'. cid가 없으면 예전처럼 아이디 하나
 *  - POST /api { type: 'ash_chars', token }                    → { list: [{ cid, at, name, aw }] }
 *  - POST /api { type: 'ash_nick', token, cid, nick }          닉네임 차지 (중복이면 nick_taken)
 *  - POST /api { type: 'ash_delchar', token, cid }             캐릭터 지우기 (저장 · 닉네임 · 순위)
 *  - POST /api { type: 'ash_rank' }                             → { ok, list: [{ name, aw, dg, title }] } (각성 · 던전 단계 합 순)
 *  - POST /api { type: 'ash_raid_list', wk, g }                 → { ok, list: [{ name, t }] } (v0.50 왕좌 원정 주간 순위)
 *  - POST /api { type: 'ash_raid_put', token, cid, wk, g, t, sk } 원정 기록 (닉네임 차지한 캐릭터만)
 * 비밀번호는 PBKDF2(SHA-256, 소금)로, 토큰은 SHA-256 해시로만 둔다.
 */

import { nickError } from '../src/data/nickrules.js';
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
      // 기기 넘기기 (v0.44.7): 새 기기가 가져갈 때 예전 기기가 마지막 저장을 한 번 더 올릴 수 있게
      db.prepare('CREATE TABLE IF NOT EXISTS ash_handoff (id TEXT PRIMARY KEY, prev_hash TEXT NOT NULL, at INTEGER NOT NULL, done INTEGER NOT NULL)'),
      // 닉네임: 소문자로 맞춘 이름 하나에 캐릭터 하나
      db.prepare('CREATE TABLE IF NOT EXISTS ash_names (lname TEXT PRIMARY KEY, name TEXT NOT NULL, k TEXT NOT NULL, at INTEGER NOT NULL)'),
      // 관리 페이지: 밸런스 덮어쓰기(kv) · 공지 · 우편 (계정마다, '*' = 모두)
      db.prepare('CREATE TABLE IF NOT EXISTS ash_kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS ash_notice (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL, at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS ash_mail (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, gold INTEGER NOT NULL, at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS ash_mail_got (mid INTEGER NOT NULL, uid TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (mid, uid))'),
      db.prepare('CREATE TABLE IF NOT EXISTS ash_rank (id TEXT PRIMARY KEY, name TEXT, aw INTEGER, dg INTEGER, title TEXT, at INTEGER)'),
      // v0.50 왕좌 원정 주간 순위: 주 · 등급 · 캐릭터마다 가장 빠른 기록 하나
      db.prepare('CREATE TABLE IF NOT EXISTS ash_raid (wk TEXT NOT NULL, g INTEGER NOT NULL, id TEXT NOT NULL, name TEXT, t REAL NOT NULL, sk TEXT, at INTEGER NOT NULL, PRIMARY KEY (wk, g, id))'),
      db.prepare('CREATE TABLE IF NOT EXISTS ash_raid_put (id TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (id, day))'),
      // 계정 공용 창고 (캐릭터끼리 나눠 쓴다)
      db.prepare('CREATE TABLE IF NOT EXISTS ash_vault (id TEXT PRIMARY KEY, data TEXT NOT NULL, at INTEGER NOT NULL)'),
      // v0.44.23 창고 백업: 덮어쓰기 전 내용을 하루 한 번 남긴다 (최근 10개) — 창고가 통째로 바뀌는 사고 복구용
      db.prepare('CREATE TABLE IF NOT EXISTS ash_vault_bak (id TEXT NOT NULL, data TEXT NOT NULL, at INTEGER NOT NULL, saved INTEGER NOT NULL)'),
    ])
    // v0.49 전투력 칸 (있으면 그냥 넘어간다)
    .then(() => db.prepare('ALTER TABLE ash_rank ADD COLUMN pw INTEGER').run().catch(() => null))
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

export async function ashen(db: DB, d: Record<string, unknown>, ip: string, adminKey?: string): Promise<Record<string, unknown>> {
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
    // v0.49 by = 'pw'면 전투력 순, 아니면 각성(레벨) 순
    const r = d.by === 'pw'
      ? await db.prepare('SELECT name, aw, dg, title, pw FROM ash_rank WHERE pw > 0 ORDER BY pw DESC, at ASC LIMIT 50').all()
      : await db.prepare('SELECT name, aw, dg, title, pw FROM ash_rank ORDER BY aw DESC, dg DESC, at ASC LIMIT 50').all();
    return { ok: true, list: r.results || [] };
  }
  if (type === 'ash_raid_list') {
    // v0.50 왕좌 원정 순위 (로그인 없이): 이번 주 · 등급마다 빠른 순 50
    const wk = String(d.wk ?? ''), g = Math.floor(Number(d.g));
    if (!/^w\d{4}-\d{2}-\d{2}$/.test(wk) || !(g >= 0 && g <= 4)) return { ok: false, error: 'bad' };
    const r = await db.prepare('SELECT name, t FROM ash_raid WHERE wk = ? AND g = ? ORDER BY t ASC, at ASC LIMIT 50').bind(wk, g).all();
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
  // ── 누구나: 밸런스 덮어쓰기 · 공지 ──
  if (type === 'ash_cfg') {
    const r = await db.prepare("SELECT v, at FROM ash_kv WHERE k = 'balance'").first<{ v: string; at: number }>();
    return { ok: true, data: r ? JSON.parse(r.v) : {}, at: r?.at ?? 0 };
  }
  if (type === 'ash_notices') {
    const r = await db.prepare('SELECT id, title, body, at FROM ash_notice ORDER BY id DESC LIMIT 20').all();
    return { ok: true, list: r.results || [] };
  }
  // ── 관리 페이지 (열쇠 d.admin = Secret ADMIN_KEY) ──
  if (type.startsWith('ash_admin_')) {
    if (!adminKey || String(d.admin ?? '').trim() !== String(adminKey).trim()) return { ok: false, error: 'admin' };
    const now = Date.now();
    if (type === 'ash_admin_cfg') {
      const o = d.overrides;
      if (!o || typeof o !== 'object') return { ok: false, error: 'bad' };
      const v = JSON.stringify(o);
      if (v.length > 200_000) return { ok: false, error: 'too_big' };
      await db.prepare("INSERT INTO ash_kv (k, v, at) VALUES ('balance', ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at").bind(v, now).run();
      return { ok: true, at: now };
    }
    if (type === 'ash_admin_notice_add') {
      const title = String(d.title ?? '').trim().slice(0, 60), body = String(d.body ?? '').trim().slice(0, 2000);
      if (!title) return { ok: false, error: 'bad' };
      await db.prepare('INSERT INTO ash_notice (title, body, at) VALUES (?, ?, ?)').bind(title, body, now).run();
      return { ok: true };
    }
    if (type === 'ash_admin_notice_del') { await db.prepare('DELETE FROM ash_notice WHERE id = ?').bind(Number(d.id) || 0).run(); return { ok: true }; }
    // 받는 사람: 계정 아이디 · 닉네임 · '*'(모두)
    if (type === 'ash_admin_mail') {
      const title = String(d.title ?? '').trim().slice(0, 40), body = String(d.body ?? '').trim().slice(0, 500), gold = Math.max(0, Math.min(1e12, Math.floor(Number(d.gold) || 0)));
      if (!title) return { ok: false, error: 'bad' };
      let to = String(d.to ?? '').trim();
      if (to !== '*') {
        const byId = await db.prepare('SELECT id FROM ash_users WHERE id = ?').bind(to.toLowerCase()).first<{ id: string }>();
        if (byId) to = byId.id;
        else {
          const byNick = await db.prepare('SELECT k FROM ash_names WHERE lname = ?').bind(to.toLowerCase()).first<{ k: string }>();
          if (!byNick) return { ok: false, error: 'no_user' };
          to = byNick.k.split('/')[0];
        }
      }
      await db.prepare('INSERT INTO ash_mail (uid, title, body, gold, at) VALUES (?, ?, ?, ?, ?)').bind(to, title, body, gold, now).run();
      return { ok: true, to };
    }
    if (type === 'ash_admin_mails') {
      const r = await db.prepare('SELECT m.id, m.uid, m.title, m.gold, m.at, (SELECT COUNT(*) FROM ash_mail_got g WHERE g.mid = m.id) AS got FROM ash_mail m ORDER BY m.id DESC LIMIT 50').all();
      return { ok: true, list: r.results || [] };
    }
    if (type === 'ash_admin_mail_del') { await db.prepare('DELETE FROM ash_mail WHERE id = ?').bind(Number(d.id) || 0).run(); return { ok: true }; }
    return { ok: false, error: 'bad_type' };
  }
  const id = await who(db, d);
  if (!id) return { ok: false, error: 'auth' };
  // ── 우편함: 내 계정 앞 + 모두에게(계정을 만든 뒤 보낸 것) 중 아직 안 받은 것 ──
  if (type === 'ash_mail' || type === 'ash_mail_claim') {
    const u = await db.prepare('SELECT created FROM ash_users WHERE id = ?').bind(id).first<{ created: number }>();
    const r = await db.prepare("SELECT id, title, body, gold, at FROM ash_mail m WHERE (uid = ? OR (uid = '*' AND at >= ?)) AND NOT EXISTS (SELECT 1 FROM ash_mail_got g WHERE g.mid = m.id AND g.uid = ?) ORDER BY id DESC LIMIT 50")
      .bind(id, u?.created ?? 0, id).all();
    let list = (r.results || []) as { id: number; gold: number }[];
    if (type === 'ash_mail') return { ok: true, list };
    const want = Array.isArray(d.ids) ? (d.ids as unknown[]).map(Number) : null;
    if (want) list = list.filter((m) => want.includes(m.id));
    if (!list.length) return { ok: true, gold: 0, n: 0 };
    // 한 번만: 먼저 받은 기록을 넣고(겹치면 무시), 넣어진 것만 금화로 친다
    let gold = 0, n = 0;
    for (const m of list) {
      const ins = await db.prepare('INSERT OR IGNORE INTO ash_mail_got (mid, uid, at) VALUES (?, ?, ?)').bind(m.id, id, Date.now()).run() as { meta?: { changes?: number } };
      if ((ins?.meta?.changes ?? 1) > 0) { gold += m.gold; n++; }
    }
    return { ok: true, gold, n };
  }
  const th = await sha(String(d.token));
  // 다른 기기가 이 계정을 가져갔는가 (가져간 기기가 없으면 예전 클라이언트도 저장할 수 있다)
  const movedAway = async () => {
    const a = await db.prepare('SELECT token_hash FROM ash_active WHERE id = ?').bind(id).first<{ token_hash: string }>();
    return !!a && a.token_hash !== th;
  };
  // 캐릭터 열쇠: 아이디/cid (cid는 영문 · 숫자 4~16자)
  const cid = String(d.cid ?? '');
  const key = /^[a-z0-9]{4,16}$/.test(cid) ? `${id}/${cid}` : id;
  if (type === 'ash_raid_put') {
    // v0.50 왕좌 원정 기록: 이번 주만 · 등급별 최소 시간보다 빠르면 거절 · 하루 20번까지 · 순위 이름은 차지한 닉네임
    const g = Math.floor(Number(d.g)), t = Number(d.t);
    const k = new Date(Date.now() + 9 * 3600e3); k.setUTCDate(k.getUTCDate() - ((k.getUTCDay() + 6) % 7)); const wk = 'w' + k.toISOString().slice(0, 10);
    if (String(d.wk) !== wk || !(g >= 0 && g <= 4) || !(t > 0 && t <= 900)) return { ok: false, error: 'bad' };
    if (t < 60 + 30 * g) return { ok: false, error: 'too_fast' };
    const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    const c = await db.prepare('SELECT n FROM ash_raid_put WHERE id = ? AND day = ?').bind(key, day).first<{ n: number }>();
    if ((c?.n || 0) >= 20) return { ok: false, error: 'limit' };
    await db.prepare('INSERT INTO ash_raid_put (id, day, n) VALUES (?, ?, 1) ON CONFLICT(id, day) DO UPDATE SET n = n + 1').bind(key, day).run();
    const nm = key === id ? null : await db.prepare('SELECT name FROM ash_names WHERE k = ?').bind(key).first<{ name: string }>();
    if (!nm) return { ok: false, error: 'no_nick' };
    const sk = String(d.sk ?? '').slice(0, 300);
    await db.prepare('INSERT INTO ash_raid (wk, g, id, name, t, sk, at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(wk, g, id) DO UPDATE SET name = excluded.name, t = excluded.t, sk = excluded.sk, at = excluded.at WHERE excluded.t < ash_raid.t')
      .bind(wk, g, key, nm.name, Math.round(t * 10) / 10, sk, Date.now()).run();
    await db.prepare('DELETE FROM ash_raid WHERE wk < ?').bind('w' + new Date(Date.now() - 35 * 86400e3).toISOString().slice(0, 10)).run();
    return { ok: true };
  }
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
    if (key === id) return { ok: false, error: 'bad_cid' };
    const lname = nick.toLowerCase();
    const has = await db.prepare('SELECT k FROM ash_names WHERE lname = ?').bind(lname).first<{ k: string }>();
    // v0.49.31 규칙(2~8자 · 욕설 · 운영진 이름): 이 캐릭터가 이미 가진 닉네임은 예전 규칙(2~10자) 그대로 둔다
    { const why = nickError(nick); if (why && !(has?.k === key && why === 'bad_nick' && /^[가-힣a-zA-Z0-9_]{2,10}$/.test(nick))) return { ok: false, error: why }; }
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
    // 예전 기기가 30초 안에 살아 있었으면 넘기기: 그 기기가 마지막 저장을 올릴 때까지 새 기기가 잠깐 기다린다
    const old = await db.prepare('SELECT token_hash, at FROM ash_active WHERE id = ?').bind(id).first<{ token_hash: string; at: number }>();
    const handoff = !!old && old.token_hash !== th && Date.now() - old.at < 30000;
    if (handoff) await db.prepare('INSERT INTO ash_handoff (id, prev_hash, at, done) VALUES (?, ?, ?, 0) ON CONFLICT(id) DO UPDATE SET prev_hash = excluded.prev_hash, at = excluded.at, done = 0').bind(id, old!.token_hash, Date.now()).run();
    await db.prepare('INSERT INTO ash_active (id, token_hash, at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash, at = excluded.at').bind(id, th, Date.now()).run();
    const s = await db.prepare('SELECT data, at FROM ash_saves WHERE id = ?').bind(key).first<{ data: string; at: number }>();
    return { ok: true, id, data: s?.data ?? null, at: s?.at ?? 0, handoff };
  }
  if (type === 'ash_handoff') {
    const h = await db.prepare('SELECT at, done FROM ash_handoff WHERE id = ?').bind(id).first<{ at: number; done: number }>();
    return { ok: true, done: !h || !!h.done || Date.now() - h.at > 15000 };
  }
  if (type === 'ash_ping') {
    const moved = await movedAway();
    if (!moved) await db.prepare('UPDATE ash_active SET at = ? WHERE id = ? AND token_hash = ?').bind(Date.now(), id, th).run(); // 살아 있음
    return { ok: true, moved };
  }
  // 계정 공용 창고: 읽기 · 쓰기 (더 새 것만 덮는다, 다른 기기가 가져갔으면 거절)
  if (type === 'ash_vault') {
    const r = await db.prepare('SELECT data, at FROM ash_vault WHERE id = ?').bind(id).first<{ data: string; at: number }>();
    return { ok: true, data: r?.data ?? null, at: r?.at ?? 0 };
  }
  if (type === 'ash_vault_put') {
    if (await movedAway()) return { ok: false, error: 'moved' };
    const data = String(d.data ?? ''), at = Number(d.at) || Date.now();
    if (data.length > 600000) return { ok: false, error: 'big' };
    const last = await db.prepare('SELECT MAX(saved) AS s FROM ash_vault_bak WHERE id = ?').bind(id).first<{ s: number | null }>();
    if (!last?.s || Date.now() - last.s > 6 * 3600e3) {
      await db.prepare('INSERT INTO ash_vault_bak (id, data, at, saved) SELECT id, data, at, ? FROM ash_vault WHERE id = ?').bind(Date.now(), id).run();
      await db.prepare('DELETE FROM ash_vault_bak WHERE id = ? AND saved NOT IN (SELECT saved FROM ash_vault_bak WHERE id = ? ORDER BY saved DESC LIMIT 10)').bind(id, id).run();
    }
    await db.prepare('INSERT INTO ash_vault (id, data, at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, at = excluded.at WHERE excluded.at >= ash_vault.at').bind(id, data, at).run();
    return { ok: true };
  }
  if (type === 'ash_save') {
    let last = false; // 넘겨준 기기의 마지막 저장 (15초 안 한 번)
    if (await movedAway()) {
      const h = d.final ? await db.prepare('SELECT at, done FROM ash_handoff WHERE id = ? AND prev_hash = ?').bind(id, th).first<{ at: number; done: number }>() : null;
      if (!h || h.done || Date.now() - h.at > 15000) return { ok: false, error: 'moved' };
      last = true;
    }
    const data = String(d.data ?? '');
    if (data.length < 2 || data.length > SAVE_MAX || data[0] !== '{') return { ok: false, error: 'bad_save' };
    const at = Math.floor(Number(d.at)) || 0;
    // v0.44.69 예전 버전 창(패치 전부터 켜 둔 창)이 더 새 버전이 쓴 저장을 덮지 못하게
    {
      const vnum = (v: unknown) => String(v || '0').split('.').reduce((a, x) => a * 1000 + (parseInt(x, 10) || 0), 0);
      let inV = 0; try { inV = vnum(JSON.parse(data).gver); } catch { /* 깨진 저장은 아래에서 */ }
      const cur = await db.prepare("SELECT json_extract(data, '$.gver') AS v FROM ash_saves WHERE id = ?").bind(key).first<{ v: string | null }>();
      if (cur?.v && vnum(cur.v) > inV) return { ok: false, error: 'old' };
    }
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
      const pw = Math.min(1e12, Math.max(0, Math.floor(Number(st.power) || 0))); // v0.49 전투력 (게임이 계산해 저장에 넣는다)
      const t = Array.isArray(st.titles) && st.titles.length ? String(st.titles[st.titles.length - 1].name || '').slice(0, 20) : '';
      // 순위 이름은 서버에 차지한 닉네임 (없으면 순위에 올리지 않는다)
      const nm = key === id ? { name: String(st.name || id).slice(0, 16) } : await db.prepare('SELECT name FROM ash_names WHERE k = ?').bind(key).first<{ name: string }>();
      if (nm) await db.prepare('INSERT INTO ash_rank (id, name, aw, dg, title, at, pw) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, aw = excluded.aw, dg = excluded.dg, title = excluded.title, at = excluded.at, pw = excluded.pw')
        .bind(key, nm.name, aw, dg, t, Date.now(), pw).run();
    } catch { /* 순위는 실패해도 저장은 된다 */ }
    if (last) await db.prepare('UPDATE ash_handoff SET done = 1 WHERE id = ?').bind(id).run();
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
