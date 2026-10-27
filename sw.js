// App-shell cache. Bump VERSION when you deploy changes.
const VERSION = 'cm-v4';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/config.js', 'js/store.js', 'js/tiles.js',
  'js/spotify-auth.js', 'js/spotify.js', 'js/map.js',
  'js/vendor/leaflet.js', 'js/vendor/leaflet.css',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Same-origin GETs: stale-while-revalidate. Spotify/Google calls are cross-origin and untouched.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      // ignoreSearch so the OAuth callback (?code=...) still gets the shell offline
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
