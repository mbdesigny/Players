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

/* Audio streams: cache-first with range support. First play streams natively;
   that same stream is tee'd into the cache as it plays (one download, no
   competing second fetch). Cached ranges are served as zero-copy Blob slices,
   memoized per file (least-recently-used, only cors/basic bodies are readable).
   Cache is FIFO-trimmed by file count and soft-capped via storage estimate. */
const blobMemo = new Map();
const BLOB_MEMO_MAX = 4;
function memoBlob(key, res) {
  if (blobMemo.has(key)) {
    const p = blobMemo.get(key);
    blobMemo.delete(key);
    blobMemo.set(key, p);
    return p;
  }
  const p = res.blob().catch(() => null);
  blobMemo.set(key, p);
  if (blobMemo.size > BLOB_MEMO_MAX) blobMemo.delete(blobMemo.keys().next().value);
  return p;
}

async function trimAudioCache() {
  const c = await caches.open(AUDIO_CACHE);
  const keys = await c.keys();
  if (blobMemo.size) {
    const alive = new Set(keys.map((k) => k.url));
    for (const k of [...blobMemo.keys()]) if (!alive.has(k)) blobMemo.delete(k);
  }
  if (keys.length > AUDIO_CACHE_MAX_FILES) {
    for (const k of keys.slice(0, keys.length - AUDIO_CACHE_MAX_FILES)) {
      await c.delete(k);
      blobMemo.delete(k.url);
    }
  }
  if (navigator.storage && navigator.storage.estimate) {
    try {
      for (let guard = 0; guard < AUDIO_CACHE_MAX_FILES; guard++) {
        const est = await navigator.storage.estimate();
        if ((est.usage || 0) <= AUDIO_QUOTA_BYTES) break;
        const ks2 = await c.keys();
        if (!ks2.length) break;
        await c.delete(ks2[0]);
        blobMemo.delete(ks2[0].url);
      }
    } catch (_) { }
  }
}

function rangeParts(rangeHeader, size) {
  const m = /bytes=(\d+)-(\d*)/.exec(rangeHeader || '');
  if (!m) return null;
  return { start: +m[1], end: m[2] ? Math.min(+m[2] + 1, size) : size };
}

async function sliceResponse(bp, rangeHeader, contentType) {
  const blob = await bp;
  if (!blob) return null;
  const p = rangeParts(rangeHeader, blob.size);
  if (!p) return null;
  if (p.start >= blob.size || p.end <= p.start) throw new Error('range-start-out-of-bounds');
  const body = blob.slice(p.start, p.end);
  return new Response(body, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': contentType || 'audio/mpeg',
      'Content-Range': `bytes ${p.start}-${p.start + body.size - 1}/${blob.size}`,
      'Content-Length': String(body.size)
    }
  });
}

async function handleAudio(req, url) {
  const range = req.headers.get('range');
  const key = url.href;
  const c = await caches.open(AUDIO_CACHE);
  const hit = await c.match(key);
  if (hit) {
    trimAudioCache();
    if (hit.type !== 'opaque' && range) {
      try {
        const sliced = await sliceResponse(memoBlob(key, hit.clone()), range, hit.headers.get('Content-Type'));
        if (sliced) return sliced;
      } catch (_) { return hit.clone() }
    }
    return hit.clone();
  }
  const res = await fetch(req);
  if (res && res.ok) {
    const p = rangeParts(range, Infinity);
    if (!p || p.start === 0) {
      c.put(key, res.clone()).then(() => trimAudioCache()).catch(() => { });
    }
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.destination === 'audio' || req.destination === 'video' || AUDIO_EXT.test(url.pathname)) {
    e.respondWith(handleAudio(req, url));
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
