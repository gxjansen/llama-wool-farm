// Service Worker for Llama Wool Farm PWA
const CACHE_NAME = 'llama-wool-farm-v1';
const RUNTIME_CACHE = 'llama-wool-farm-runtime';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/vendors.js',
  '/js/phaser.js',
  '/js/main.js',
  '/css/main.css',
];

// Dynamic caching strategies
const CACHE_STRATEGIES = {
  // Cache first - for assets that rarely change
  cacheFirst: [
    /\.(?:png|gif|jpg|jpeg|webp|svg)$/,
    /^https:\/\/fonts\.gstatic\.com/,
    /\.(?:woff|woff2|ttf|otf)$/,
  ],
  // Network first - for API calls and dynamic content
  networkFirst: [
    /\/api\//,
    /\/save\//,
    /\/leaderboard\//,
  ],
  // Stale while revalidate - for CSS and JS
  staleWhileRevalidate: [
    /\.(?:js|css)$/,
    /^https:\/\/fonts\.googleapis\.com/,
  ],
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'no-cache' })))
          .catch((error) => {
            console.error('[ServiceWorker] Failed to cache:', error);
            // Continue installation even if some assets fail to cache
            return Promise.resolve();
          });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Determine caching strategy
  let strategy = 'networkFirst'; // default strategy

  for (const [strategyName, patterns] of Object.entries(CACHE_STRATEGIES)) {
    if (patterns.some(pattern => pattern.test(request.url))) {
      strategy = strategyName;
      break;
    }
  }

  event.respondWith(handleRequest(request, strategy));
});

// Request handling strategies
async function handleRequest(request, strategy) {
  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request);
    case 'networkFirst':
      return networkFirst(request);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request);
    default:
      return fetch(request);
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Fetch failed:', error);
    throw error;
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_ASSETS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.assets);
      })
    );
  }
});

// Background sync for saving game state
self.addEventListener('sync', (event) => {
  if (event.tag === 'save-game-state') {
    event.waitUntil(saveGameState());
  }
});

async function saveGameState() {
  try {
    // Get pending saves from IndexedDB
    const pendingSaves = await getPendingSaves();
    
    for (const save of pendingSaves) {
      try {
        const response = await fetch('/api/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(save),
        });
        
        if (response.ok) {
          await removePendingSave(save.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync save:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingSaves() {
  // Implementation would go here
  return [];
}

async function removePendingSave(id) {
  // Implementation would go here
}

// Periodic background sync for leaderboard updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-leaderboard') {
    event.waitUntil(updateLeaderboard());
  }
});

async function updateLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard');
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put('/api/leaderboard', response);
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to update leaderboard:', error);
  }
}