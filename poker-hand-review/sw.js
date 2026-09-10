/*
 * Service worker: precache the whole app on install and serve it from cache thereafter, so the
 * drill runs with no network at all. There is nothing to fetch at runtime - hands are generated
 * in the browser - so cache-first costs nothing and the app works offline from the first load.
 *
 * Updating: cache-first means a new version only reaches the page when CACHE bumps. Bump the
 * version string on every change to the files below, or the browser will keep serving the old
 * copy. While developing, tick DevTools > Application > Service workers > "Update on reload".
 */
const CACHE = 'poker-hand-drill-v2';

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'src/app.css',
  'src/app.js',
  'src/generate_hand.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) return hit;
      return fetch(request).catch(() => {
        // Offline and uncached. A navigation still has somewhere sensible to land.
        if (request.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
