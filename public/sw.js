const CACHE_NAME = 'aeromail-static-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Stale-While-Revalidate for local assets
  if (url.origin === self.location.origin && !url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchedResponse = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchedResponse;
        });
      })
    );
  }
});
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-email') {
    // Conceptual: In a real app, we'd pull from IndexedDB and retry POST /api/emails/send
    console.log('[SW] Background Sync: Retrying pending email sends...');
  }
});