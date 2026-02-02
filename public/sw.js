const CACHE_NAME = 'aeromail-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/main.tsx',
  '/src/index.css'
];
// Install: Cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});
// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
// Fetch: Stale-While-Revalidate for static assets, Network-Only for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Bypass cache for API calls to prevent stale mailbox data
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  // Stale-While-Revalidate Strategy
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // If network fails and no cache, return index.html for navigation
          if (event.request.mode === 'navigate') {
            return cache.match('/index.html');
          }
        });
        return cachedResponse || fetchPromise;
      });
    })
  );
});
// Background Sync for offline email composition
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-email') {
    console.log('[SW] Background Sync: Attempting to flush pending outbound emails...');
    // In a real implementation, we would pull items from IndexedDB and fetch /api/emails/send
  }
});