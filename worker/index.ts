// 에베이 서버: 같은 Worker가 게임 파일(정적)과 /api(계정 · 서버 저장 · 순위)를 함께 낸다.
// /api 만 이 코드가 먼저 받고, 나머지는 게임 파일(ASSETS)로.
// 데이터베이스는 영겁의 틈새와 같은 D1(eonrift)의 ash_* 표 — 예전 dev-eonrift 서버와 같은 데이터.
import { ashen } from './ashen';

interface Env {
  DB: Parameters<typeof ashen>[0];
  ASSETS: { fetch(r: Request): Promise<Response> };
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
let ready = false;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    try {
      if (!ready) { // ashen이 쓰는 요청 제한 표 (영겁의 틈새 서버가 만들어 두지만 혹시 몰라)
        await (env.DB as any).prepare('CREATE TABLE IF NOT EXISTS throttle (k TEXT PRIMARY KEY, until INTEGER NOT NULL)').run();
        ready = true;
      }
      if (req.method === 'GET') {
        if (url.searchParams.get('action') === 'ash') return json({ ok: true, ash: 1 });
        return json({ ok: false, error: 'unknown' }, 404);
      }
      if (req.method === 'POST') {
        const d = (await req.json().catch(() => null)) as Record<string, unknown> | null;
        if (d && typeof d.type === 'string' && d.type.startsWith('ash_')) return json(await ashen(env.DB, d, req.headers.get('CF-Connecting-IP') ?? 'x'));
        return json({ ok: false, error: 'bad' }, 400);
      }
      return json({ ok: false }, 405);
    } catch (e) {
      return json({ ok: false, error: 'server', msg: String((e as Error)?.message || e).slice(0, 200) }, 500);
    }
  },
};
