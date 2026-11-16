// 설치 버전(PWA): 코드 · 그림 · 소리 모두 새로 받고(안 되면 저장본).
// v0.44.18: 그림 주소에 ?v=버전이 붙으면서 버전마다 그림 전체가 따로 쌓여 저장 공간이 차던 것 →
//   저장본은 주소에서 ?v를 뺀 열쇠 하나로만 두고, 예전 저장소(ashen-v1)는 지운다
const CACHE = 'ashen-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) return;
  const key = url.origin + url.pathname; // ?v= 를 뺀 열쇠
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(key, res.clone()).catch(() => {}); // 저장 공간이 모자라도 게임은 이어진다
      return res;
    } catch {
      return (await cache.match(key)) || Response.error();
    }
  })());
});
