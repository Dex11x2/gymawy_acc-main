// Service Worker — network-first عشان نتجنّب أي محتوى قديم (stale)، مع fallback offline
const CACHE = 'gymmawy-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;                 // خارجي — سيبه
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return; // لا تتدخّل في الـAPI/الـsocket

  // ملفات البناء (hashed) ثابتة — cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // الباقي (بما فيه التنقّل) — network-first، ونرجع للكاش وقت انقطاع النت فقط
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.status === 200) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const idx = (await caches.match('/index.html')) || (await caches.match('/'));
        if (idx) return idx;
      }
      throw new Error('offline');
    }
  })());
});
