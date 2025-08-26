const CACHE = 'eta-cache-v2';

// Build URLs relative to the SW scope (works on GitHub Pages project paths)
const ROOT = (self.registration && self.registration.scope) ? new URL(self.registration.scope).pathname : '/';
function u(path) { return ROOT.replace(/\/$/, '/') + path.replace(/^\//, ''); }

const ASSETS = [
  u(''),                 // site root ("/")
  u('index.html'),
  u('manifest.webmanifest'),
  u('icons/icon-192.svg'),
  u('icons/icon-512.svg')
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        ASSETS.map((asset) => cache.add(new Request(asset, { cache: 'reload' })))
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // For navigation requests, serve the cached index.html fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(u('index.html')).then((cached) => cached || fetch(req).catch(() => caches.match(u('index.html'))))
    );
    return;
  }

  // For other requests, cache-first with ignoreSearch
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(u('index.html')));
    })
  );
});
