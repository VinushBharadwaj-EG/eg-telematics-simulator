const CACHE_VERSION = 'v1.2.0';
const CACHE_NAME = `eg-telematics-${CACHE_VERSION}`;
const RUNTIME_CACHE = `eg-telematics-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './telematics-simulator.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// Install - cache app shell
self.addEventListener('install', event => {
  console.log('[SW] Install event');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');

  event.waitUntil(
    caches.keys()
      .then(names => {
        return Promise.all(
          names
            .filter(n => n.startsWith('eg-telematics-') && n !== CACHE_NAME && n !== RUNTIME_CACHE)
            .map(n => {
              console.log('[SW] Deleting old cache:', n);
              return caches.delete(n);
            })
        );
      })
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch - smart caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests except API calls
  if (url.origin !== location.origin) {
    // Special handling for API calls (for background sync)
    if (request.method === 'POST') {
      event.respondWith(
        fetch(request)
          .catch(error => {
            console.log('[SW] API call failed, will queue for sync:', error);
            // Return 503 to indicate service unavailable
            return new Response(
              JSON.stringify({ error: 'Offline', queued: true }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          })
      );
    }
    return;
  }

  // Strategy 1: Network-first for HTML (always get latest)
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Update cache with fresh version
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request);
        })
    );
    return;
  }

  // Strategy 2: Cache-first for icons and images
  if (request.destination === 'image' || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then(response => {
              // Cache new images
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE)
                .then(cache => cache.put(request, responseClone));
              return response;
            });
        })
    );
    return;
  }

  // Strategy 3: Stale-while-revalidate for manifest and other resources
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        const fetchPromise = fetch(request)
          .then(response => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseClone));
            return response;
          })
          .catch(() => cachedResponse); // Fallback to cache if fetch fails

        return cachedResponse || fetchPromise;
      })
  );
});

// Background Sync - retry failed pings
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pings') {
    console.log('[SW] Background sync triggered');

    event.waitUntil(
      // Notify main thread to sync
      self.clients.matchAll()
        .then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_PINGS'
            });
          });
        })
    );
  }
});

// Message handler
self.addEventListener('message', event => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE)
        .then(cache => cache.addAll(event.data.urls))
    );
  }
});
