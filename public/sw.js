/* Ouns service worker — cache version injected at build time via scripts/bump-sw.mjs */
const VERSION = '__CACHE_VERSION__';
const CACHE = `ouns-app-${VERSION}`;
const MUSHAF_CACHE = 'ouns-mushaf';
const MUSHAF_CACHE_MAX = 700;
const AUDIO_CACHE = 'ouns-audio';
const AUDIO_CACHE_MAX_FILES = 48;
const AUDIO_QUOTA_BYTES = 300 * 1024 * 1024;
const AUDIO_EXT = /\.mp3(?:$|\?)/i;
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
  /* No skipWaiting (F-22): let the new worker wait until every tab has closed.
     Claiming mid-session while an old HTML still references old hashed assets
     is what caused 404s on lazy-loaded chunks during deploys. */
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  );
});

self.addEventListener('activate', (e) => {
  /* Old caches are purged only after the new worker is active, so open tabs
     keep serving a consistent set. clients.claim() is safe here because the
     worker only skips waiting when a page explicitly sent SKIP_WAITING, and
     that page reloads itself on controllerchange to pick up fresh assets. */
  e.waitUntil(
    caches.keys()
      .then((ks) => {
        const appCaches = ks.filter((k) => k.startsWith('ouns-app-') && k !== CACHE);
        const toDelete = appCaches.slice(0, Math.max(0, appCaches.length - 1));
        const others = ks.filter((k) => !k.startsWith('ouns-app-') && k !== MUSHAF_CACHE && k !== AUDIO_CACHE);
        return Promise.all([...toDelete, ...others].map((k) => caches.delete(k)));
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  if (d.type === 'cache-audio' && typeof d.url === 'string') {
    try { e.waitUntil(storeAudio(new URL(d.url))) } catch (_) { }
  }
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

/* Audio streams: native playback is NEVER intercepted on a miss -- the request
   falls through to Chrome's media stack, which resumes mp3quran's immutable,
   CORnative responses better than any synthetic 206. The worker only becomes
   visible for files explicitly pulled ahead via the cache-audio message.
   Cache.put rejects 206 bodies (spec: partial responses are unstorable), so
   population always uses a separate credentialless full GET that answers 200. */
const AUDIO_CORS_RE = /^https:\/\/([a-z0-9-]+\.)*mp3quran\.net\//i;

async function getCachedAudio(url) {
  const c = await caches.open(AUDIO_CACHE);
  const hit = await c.match(url.href);
  return (hit && hit.type !== 'opaque' && hit.status === 200) ? hit : null;
}

async function storeAudio(url) {
  if (!AUDIO_CORS_RE.test(url.href)) return;
  const c = await caches.open(AUDIO_CACHE);
  if (await c.match(url.href)) return;
  let res;
  try { res = await fetch(url.href, { credentials: 'omit', redirect: 'follow' }) } catch (_) { return }
  if (!res || res.status !== 200 || res.type === 'opaque') return;
  await c.put(url.href, res.clone()).catch(() => { });
  await trimAudioCache();
}

async function trimAudioCache() {
  const c = await caches.open(AUDIO_CACHE);
  const keys = await c.keys();
  if (keys.length > AUDIO_CACHE_MAX_FILES) {
    for (const k of keys.slice(0, keys.length - AUDIO_CACHE_MAX_FILES)) await c.delete(k);
  }
  if (navigator.storage && navigator.storage.estimate) {
    try {
      for (let guard = 0; guard < 8; guard++) {
        const est = await navigator.storage.estimate();
        if ((est.usage || 0) <= AUDIO_QUOTA_BYTES) break;
        const ks2 = await c.keys();
        if (!ks2.length) break;
        await c.delete(ks2[0]);
      }
    } catch (_) { }
  }
}

function sliceAudio(blob, rangeHeader, contentType) {
  const m = /bytes=(\d+)-(\d*)/.exec(rangeHeader || '');
  if (!m) return null;
  const start = +m[1], end = m[2] ? Math.min(+m[2] + 1, blob.size) : blob.size;
  if (start >= blob.size || end <= start) {
    return { status: 416, size: blob.size };
  }
  return new Response(blob.slice(start, end), {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': contentType || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${start + (end - start) - 1}/${blob.size}`,
      'Content-Length': String(end - start),
      'Accept-Ranges': 'bytes'
    }
  });
}

async function serveAudio(event, url) {
  const hit = await getCachedAudio(url);
  if (!hit) return;
  const range = event.request.headers.get('range');
  if (range) {
    let sliced = null;
    try { sliced = sliceAudio(await hit.clone().blob(), range, hit.headers.get('Content-Type')) } catch (_) { }
    if (sliced && sliced.status === 416) {
      const size = sliced.size;
      event.respondWith(new Response('', { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' } }));
      return;
    }
    if (sliced) { event.respondWith(sliced); return }
  }
  event.respondWith(hit.clone());
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.destination === 'audio' || req.destination === 'video' || AUDIO_EXT.test(url.pathname)) {
    if (AUDIO_CORS_RE.test(url.href)) serveAudio(e, url);
    return;
  }
  if (req.headers.has('range')) return;

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
