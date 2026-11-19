// v0.49.28 채팅: Durable Object 하나(「lobby」)가 웹소켓을 모두 받는다.
// - 웹소켓 「잠자기(hibernation)」 방식이라 메시지가 없는 동안은 깨어 있지 않는다 (비용 거의 없음).
// - 'ping' → 'pong'은 깨우지 않고 자동으로 답한다 (연결 유지용).
// - 보낸 사람 이름은 서버가 정한다: 토큰 → 아이디, 아이디/cid → 닉네임 표(ash_names). 로그인하지 않으면 읽기만.
// - 최근 메시지 50개만 Durable Object 저장소에 둔다.
// v0.49.30 도배 막기 (모두 서버에서, 연결이 아니라 계정/캐릭터 단위로 센다 — 창을 여러 개 열어도 같다):
//   60자까지 · 10초에 3마디 · 30초 안에 직전 3마디와 같은 말 금지 · 1분에 세 번 걸리면 60초 입 막기(또 걸리면 5분) · 욕설은 *로 가린다
//   운영자: 관리 페이지에서 닉네임으로 채팅 금지(기간 · 영구) · 풀기 · 최근 대화 보기 (/admin, index.ts가 관리 키를 확인한 뒤 넘긴다)
import { DurableObject } from 'cloudflare:workers';

const KEEP = 50, MAX_LEN = 60;
const BURST_N = 3, BURST_MS = 10_000; // 10초에 3마디
const SAME_N = 3, SAME_MS = 30_000; // 직전 3마디와 같은 말 (30초 안)
const STRIKE_N = 3, STRIKE_MS = 60_000; // 1분에 세 번 걸리면
const MUTE_MS = [60_000, 300_000]; // 60초, 그다음부터 5분
const MUTE_RESET_MS = 30 * 60_000; // 30분 동안 조용하면 입 막기 단계를 처음으로
// 욕설: 글자 사이에 띄어쓰기 · 기호를 끼워도 잡는다
const BAD = ['시발', '씨발', '씨바', '씨팔', '시팔', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '븅신', '좆', '개새끼', '개새', '지랄', 'ㅈㄹ', '미친놈', '미친년', '닥쳐', '엿먹', '니애미', '느금', 'fuck', 'shit', 'bitch'];
const SEP = '[\\s\\p{P}\\p{S}_]'; // 띄어쓰기 · 문장 부호 · 기호 (한글은 글자로 친다 — \W는 한글까지 지워 버린다)
const BAD_RE = new RegExp(BAD.map((w) => [...w].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(SEP + '*')).join('|'), 'giu');
const clean = (x: string) => x.replace(BAD_RE, (m) => '*'.repeat([...m.replace(new RegExp(SEP, 'gu'), '')].length || 1));
const norm = (x: string) => x.toLowerCase().replace(new RegExp(SEP, 'gu'), '');
const sha = async (v: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)))].map((x) => x.toString(16).padStart(2, '0')).join('');

type Msg = { n: string; x: string; at: number; k?: string }; // k(계정/캐릭터)는 저장만 하고 이용자에게는 보내지 않는다
type Att = { name: string | null; k: string | null };
type Rate = { t: number[]; recent: { x: string; at: number }[]; strikes: number[] };
type Mute = { until: number; lvl: number; at: number };
type Ban = { until: number; nick: string; at: number }; // until 0 = 영구
const pub = (m: Msg) => ({ n: m.n, x: m.x, at: m.at });

export class ChatRoom extends DurableObject {
  log: Msg[] | null = null;
  rate = new Map<string, Rate>();
  mutes: Record<string, Mute> | null = null;
  bans: Record<string, Ban> | null = null;
  constructor(ctx: any, env: any) {
    super(ctx, env);
    (this as any).ctx.setWebSocketAutoResponse(new (globalThis as any).WebSocketRequestResponsePair('ping', 'pong'));
  }
  get c(): any { return (this as any).ctx; }
  get db(): any { return (this as any).env.DB; }
  async history(): Promise<Msg[]> { return (this.log ??= ((await this.c.storage.get('log')) as Msg[]) || []); }
  async muteMap(): Promise<Record<string, Mute>> { return (this.mutes ??= ((await this.c.storage.get('mutes')) as Record<string, Mute>) || {}); }
  async banMap(): Promise<Record<string, Ban>> { return (this.bans ??= ((await this.c.storage.get('bans')) as Record<string, Ban>) || {}); }

  async fetch(req: Request): Promise<Response> {
    const u = new URL(req.url);
    if (u.pathname.endsWith('/admin') && req.method === 'POST') return Response.json(await this.admin((await req.json().catch(() => ({}))) as Record<string, unknown>));
    // 연결: /api/chat?token=…&cid=… (웹소켓 업그레이드)
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    const token = u.searchParams.get('token') || '', cid = u.searchParams.get('cid') || '';
    let name: string | null = null, k: string | null = null;
    if (token.length >= 20 && token.length <= 100 && /^[a-z0-9]{4,16}$/.test(cid)) {
      try {
        const t = await this.db.prepare('SELECT id FROM ash_tokens WHERE token_hash = ?').bind(await sha(token)).first();
        if (t?.id) { k = `${t.id}/${cid}`; const r = await this.db.prepare('SELECT name FROM ash_names WHERE k = ?').bind(k).first(); name = r?.name || null; }
      } catch { /* DB를 못 읽으면 읽기만 */ }
    }
    const pair = new (globalThis as any).WebSocketPair(), [client, server] = Object.values(pair) as any[];
    this.c.acceptWebSocket(server);
    server.serializeAttachment({ name, k: name ? k : null } as Att);
    server.send(JSON.stringify({ t: 'hi', me: name, on: this.c.getWebSockets().length, log: (await this.history()).map(pub) }));
    return new Response(null, { status: 101, webSocket: client } as any);
  }

  // 막기: 걸리면 { e, wait(초) }를 돌려준다 (null이면 보내도 된다)
  async check(k: string, x: string, now: number): Promise<{ e: string; wait?: number } | null> {
    const ban = (await this.banMap())[k];
    if (ban && (ban.until === 0 || ban.until > now)) return { e: 'ban', wait: ban.until ? Math.ceil((ban.until - now) / 1000) : 0 };
    const mutes = await this.muteMap(), mu = mutes[k];
    if (mu && mu.until > now) return { e: 'mute', wait: Math.ceil((mu.until - now) / 1000) };
    const r = this.rate.get(k) || { t: [], recent: [], strikes: [] };
    this.rate.set(k, r);
    r.t = r.t.filter((a) => now - a < BURST_MS); r.recent = r.recent.filter((a) => now - a.at < SAME_MS); r.strikes = r.strikes.filter((a) => now - a < STRIKE_MS);
    let bad: { e: string; wait?: number } | null = null;
    if (r.t.length >= BURST_N) bad = { e: 'slow', wait: Math.ceil((r.t[0] + BURST_MS - now) / 1000) };
    else if (r.recent.slice(-SAME_N).some((a) => a.x === norm(x))) bad = { e: 'same' };
    if (!bad) { r.t.push(now); r.recent.push({ x: norm(x), at: now }); if (r.recent.length > SAME_N) r.recent.shift(); return null; }
    r.strikes.push(now);
    if (r.strikes.length >= STRIKE_N) { // 계속 시도하면 잠시 입 막기 (저장소에 남겨 잠들었다 깨도 이어진다)
      const lvl = mu && now - mu.at < MUTE_RESET_MS ? mu.lvl + 1 : 0, ms = MUTE_MS[Math.min(lvl, MUTE_MS.length - 1)];
      mutes[k] = { until: now + ms, lvl, at: now }; r.strikes = [];
      for (const [kk, m] of Object.entries(mutes)) if (now - m.at > MUTE_RESET_MS && m.until < now) delete mutes[kk];
      await this.c.storage.put('mutes', mutes);
      return { e: 'mute', wait: Math.ceil(ms / 1000) };
    }
    return bad;
  }

  async webSocketMessage(ws: any, raw: string | ArrayBuffer) {
    let d: any = null;
    try { d = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return; }
    if (d?.t !== 'say') return;
    const att = (ws.deserializeAttachment() || { name: null, k: null }) as Att, now = Date.now();
    if (!att.name || !att.k) { ws.send(JSON.stringify({ t: 'err', e: 'login' })); return; }
    const x0 = String(d.x ?? '').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁯﻿]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
    if (!x0) return;
    const no = await this.check(att.k, x0, now);
    if (no) { ws.send(JSON.stringify({ t: 'err', ...no })); return; }
    const m: Msg = { n: att.name, x: clean(x0), at: now, k: att.k }, log = await this.history();
    log.push(m); if (log.length > KEEP) log.splice(0, log.length - KEEP);
    await this.c.storage.put('log', log);
    const out = JSON.stringify({ t: 'msg', m: pub(m), on: this.c.getWebSockets().length });
    for (const s of this.c.getWebSockets()) { try { s.send(out); } catch { /* 끊긴 연결 */ } }
  }
  async webSocketClose(ws: any, code: number) { try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch { /* 이미 닫힘 */ } }
  async webSocketError(ws: any) { try { ws.close(1011, 'error'); } catch { /* 이미 닫힘 */ } }

  // 운영자 (index.ts가 관리 키를 확인한 뒤에만 부른다)
  async admin(d: Record<string, unknown>): Promise<Record<string, unknown>> {
    const now = Date.now(), bans = await this.banMap();
    for (const [k, b] of Object.entries(bans)) if (b.until && b.until < now) delete bans[k];
    if (d.op === 'ban') {
      const nick = String(d.nick ?? '').trim(), min = Math.max(0, Number(d.minutes) || 0);
      const r = nick ? await this.db.prepare('SELECT k, name FROM ash_names WHERE lname = ?').bind(nick.toLowerCase()).first() : null;
      if (!r?.k) return { ok: false, error: 'no_user' };
      bans[r.k] = { until: min ? now + min * 60_000 : 0, nick: r.name, at: now };
      await this.c.storage.put('bans', bans);
      return { ok: true, nick: r.name };
    }
    if (d.op === 'unban') {
      const k = String(d.k ?? ''); delete bans[k]; await this.c.storage.put('bans', bans);
      const mutes = await this.muteMap(); if (mutes[k]) { delete mutes[k]; await this.c.storage.put('mutes', mutes); }
      return { ok: true };
    }
    // 보기: 최근 대화(누가 보냈는지 계정 포함) · 금지 목록 · 지금 입 막힌 사람
    const mutes = await this.muteMap();
    return { ok: true, on: this.c.getWebSockets().length, log: await this.history(), bans: Object.entries(bans).map(([k, b]) => ({ k, ...b })), mutes: Object.entries(mutes).filter(([, m]) => m.until > now).map(([k, m]) => ({ k, ...m })) };
  }
}
