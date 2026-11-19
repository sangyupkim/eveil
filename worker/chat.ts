// v0.49.28 채팅: Durable Object 하나(「lobby」)가 웹소켓을 모두 받는다.
// - 웹소켓 「잠자기(hibernation)」 방식이라 메시지가 없는 동안은 깨어 있지 않는다 (비용 거의 없음).
// - 'ping' → 'pong'은 깨우지 않고 자동으로 답한다 (연결 유지용).
// - 보낸 사람 이름은 서버가 정한다: 토큰 → 아이디, 아이디/cid → 닉네임 표(ash_names). 로그인하지 않으면 읽기만.
// - 최근 메시지 50개만 Durable Object 저장소에 둔다. 한 사람은 1.5초에 한 번, 80자까지.
import { DurableObject } from 'cloudflare:workers';

const KEEP = 50, MAX_LEN = 80, GAP_MS = 1500;
const sha = async (v: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)))].map((x) => x.toString(16).padStart(2, '0')).join('');
type Msg = { n: string; x: string; at: number };
type Att = { name: string | null; last: number };

export class ChatRoom extends DurableObject {
  log: Msg[] | null = null;
  constructor(ctx: any, env: any) {
    super(ctx, env);
    (this as any).ctx.setWebSocketAutoResponse(new (globalThis as any).WebSocketRequestResponsePair('ping', 'pong'));
  }
  get c(): any { return (this as any).ctx; }
  async history(): Promise<Msg[]> { return (this.log ??= ((await this.c.storage.get('log')) as Msg[]) || []); }

  // 연결: /api/chat?token=…&cid=… (웹소켓 업그레이드)
  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    const u = new URL(req.url), token = u.searchParams.get('token') || '', cid = u.searchParams.get('cid') || '';
    let name: string | null = null;
    const db = (this as any).env.DB;
    if (token.length >= 20 && token.length <= 100 && /^[a-z0-9]{4,16}$/.test(cid)) {
      try {
        const t = await db.prepare('SELECT id FROM ash_tokens WHERE token_hash = ?').bind(await sha(token)).first();
        if (t?.id) { const r = await db.prepare('SELECT name FROM ash_names WHERE k = ?').bind(`${t.id}/${cid}`).first(); name = r?.name || null; }
      } catch { /* DB를 못 읽으면 읽기만 */ }
    }
    const pair = new (globalThis as any).WebSocketPair(), [client, server] = Object.values(pair) as any[];
    this.c.acceptWebSocket(server);
    server.serializeAttachment({ name, last: 0 } as Att);
    server.send(JSON.stringify({ t: 'hi', me: name, on: this.c.getWebSockets().length, log: await this.history() }));
    return new Response(null, { status: 101, webSocket: client } as any);
  }

  async webSocketMessage(ws: any, raw: string | ArrayBuffer) {
    let d: any = null;
    try { d = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return; }
    if (d?.t !== 'say') return;
    const att = (ws.deserializeAttachment() || { name: null, last: 0 }) as Att, now = Date.now();
    if (!att.name) { ws.send(JSON.stringify({ t: 'err', e: 'login' })); return; }
    if (now - att.last < GAP_MS) { ws.send(JSON.stringify({ t: 'err', e: 'slow' })); return; }
    const x = String(d.x ?? '').replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, '').trim().slice(0, MAX_LEN);
    if (!x) return;
    att.last = now; ws.serializeAttachment(att);
    const m: Msg = { n: att.name, x, at: now }, log = await this.history();
    log.push(m); if (log.length > KEEP) log.splice(0, log.length - KEEP);
    await this.c.storage.put('log', log);
    const out = JSON.stringify({ t: 'msg', m, on: this.c.getWebSockets().length });
    for (const s of this.c.getWebSockets()) { try { s.send(out); } catch { /* 끊긴 연결 */ } }
  }
  async webSocketClose(ws: any, code: number) { try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch { /* 이미 닫힘 */ } }
  async webSocketError(ws: any) { try { ws.close(1011, 'error'); } catch { /* 이미 닫힘 */ } }
}
