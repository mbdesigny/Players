/* Ouns service worker — cache version injected at build time via scripts/bump-sw.mjs */
const VERSION = '__CACHE_VERSION__';
const CACHE = `ouns-app-${VERSION}`;
const MUSHAF_CACHE = 'ouns-mushaf';
const MUSHAF_CACHE_MAX = 700;
const PRECACHE = ['/', '/offline.html'];

const MUSHAF_HOSTS = ['cdn.jsdelivr.net', 'raw.githubusercontent.com'];
const isMushafURL = (url) =>
  MUSHAF_HOSTS.includes(url.hostname) && /mushaf|pro-muslim|quran-svg/i.test(url.pathname);

async function trimCache(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  if (keys.length <= max) return;
  for (const k of keys.slice(0, keys.length - max)) await c.delete(k);
}

/* clone() must run synchronously: once the response is handed to respondWith,
   the browser consumes its body and a later clone() throws "body already used". */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => {
        const appCaches = ks.filter((k) => k.startsWith('ouns-app-') && k !== CACHE);
        const toDelete = appCaches.slice(0, Math.max(0, appCaches.length - 1));
        const others = ks.filter((k) => !k.startsWith('ouns-app-') && k !== MUSHAF_CACHE);
        return Promise.all([...toDelete, ...others].map((k) => caches.delete(k)));
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'precache-mushaf' && Array.isArray(d.urls)) {
    e.waitUntil((async () => {
      const c = await caches.open(MUSHAF_CACHE);
      for (const u of d.urls.slice(0, 12)) {
        const ctrl = new AbortController();
        const tm = setTimeout(() => ctrl.abort(), 8000);
        try {
          if (await c.match(u)) { clearTimeout(tm); continue; }
          const res = await fetch(u, { mode: 'no-cors', signal: ctrl.signal });
          clearTimeout(tm);
          if (res && (res.ok || res.type === 'opaque')) {
            const clone = res.clone();
            await c.put(u, clone);
          }
        } catch (_) {
          clearTimeout(tm);
        }
      }
      await trimCache(MUSHAF_CACHE, MUSHAF_CACHE_MAX);
    })());
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;
  if (req.destination === 'audio' || req.destination === 'video') return;

  const url = new URL(req.url);

  if (isMushafURL(url)) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') {
              const clone = res.clone();
              caches.open(MUSHAF_CACHE).then((c) => c.put(req, clone).then(() => trimCache(MUSHAF_CACHE, MUSHAF_CACHE_MAX)));
            }
            return res;
          })
          .catch(() => hit)
      )
    );
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/offline.html')))
    );
    return;
  }

  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
