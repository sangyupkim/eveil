// 설치 버전(PWA): 코드는 늘 새로 받고(안 되면 저장본), 그림 · 소리는 저장본을 먼저 쓰고 뒤에서 새로 받는다
const CACHE = 'ashen-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const asset = /\/assets\//.test(url.pathname);
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (asset) {
      // 저장본을 바로 쓰고, 뒤에서 새로 받아 바꿔 둔다 (그림이 바뀌어도 다음에 반영)
      const hit = await cache.match(req);
      const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await fresh) || Response.error();
    }
    try { const res = await fetch(req); if (res.ok) cache.put(req, res.clone()); return res; }
    catch { return (await cache.match(req)) || Response.error(); }
  })());
});
