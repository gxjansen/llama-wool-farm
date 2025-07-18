// Enhanced Service Worker with Workbox for Llama Wool Farm PWA
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { Queue } from 'workbox-background-sync';

// Precache all static assets generated at build time
precacheAndRoute(self.__WB_MANIFEST);

// Cache names
const CACHE_VERSION = 'v2';
const CACHE_NAMES = {
  static: `llama-static-${CACHE_VERSION}`,
  runtime: `llama-runtime-${CACHE_VERSION}`,
  images: `llama-images-${CACHE_VERSION}`,
  gameAssets: `llama-game-assets-${CACHE_VERSION}`,
  api: `llama-api-${CACHE_VERSION}`,
};

// Create a queue for failed API requests
const apiQueue = new Queue('llama-api-queue', {
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('Replayed request successfully:', entry.request.url);
      } catch (error) {
        console.error('Failed to replay request:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
    console.log('API queue synced successfully');
  },
});

// Game assets caching strategy
registerRoute(
  ({ url }) => url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i) &&
    (url.pathname.includes('/assets/') || url.pathname.includes('/sprites/')),
  new CacheFirst({
    cacheName: CACHE_NAMES.gameAssets,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Audio files caching
registerRoute(
  ({ url }) => url.pathname.match(/\.(mp3|ogg|wav|m4a)$/i),
  new CacheFirst({
    cacheName: CACHE_NAMES.gameAssets,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Phaser.js and game scripts
registerRoute(
  ({ url }) => url.pathname.match(/\.(js)$/i) && 
    (url.pathname.includes('phaser') || url.pathname.includes('game')),
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.static,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// API calls with background sync
registerRoute(
  ({ url }) => url.pathname.includes('/api/'),
  new NetworkFirst({
    cacheName: CACHE_NAMES.api,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new BackgroundSyncPlugin('llama-api-queue', {
        maxRetentionTime: 24 * 60, // Retry for up to 24 hours
      }),
    ],
  })
);

// Game save data special handling
registerRoute(
  ({ url }) => url.pathname.includes('/api/save'),
  async ({ event }) => {
    try {
      const response = await fetch(event.request.clone());
      if (!response.ok) throw new Error('Save failed');
      return response;
    } catch (error) {
      // Queue the save request for later
      await apiQueue.pushRequest({ request: event.request });
      // Return a synthetic success response
      return new Response(
        JSON.stringify({ 
          success: true, 
          queued: true,
          message: 'Save queued for sync when online' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
);

// Leaderboard data
registerRoute(
  ({ url }) => url.pathname.includes('/api/leaderboard'),
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.api,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 10 * 60, // 10 minutes
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// HTML pages (including offline fallback)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      // Try network first
      const response = await fetch(event.request);
      if (response.ok) return response;
      throw new Error('Network response not ok');
    } catch (error) {
      // Fall back to cache
      const cache = await caches.open(CACHE_NAMES.static);
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;
      
      // If no cache, return offline page
      return cache.match('/offline.html');
    }
  }
);

// Install event - immediate activation
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Enhanced SW installing...');
  
  // Cache offline page and critical assets
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      return cache.addAll([
        '/offline.html',
        '/manifest.json',
      ]);
    })
  );
  
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Enhanced SW activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return !Object.values(CACHE_NAMES).includes(cacheName);
          })
          .map((cacheName) => {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Cache game assets on demand
  if (event.data && event.data.type === 'CACHE_GAME_ASSETS') {
    event.waitUntil(
      cacheGameAssets(event.data.assets)
    );
  }
  
  // Get cache status
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      getCacheStatus().then((status) => {
        event.ports[0].postMessage(status);
      })
    );
  }
});

// Cache game assets function
async function cacheGameAssets(assets) {
  const cache = await caches.open(CACHE_NAMES.gameAssets);
  const promises = assets.map(async (asset) => {
    try {
      const response = await fetch(asset);
      if (response.ok) {
        await cache.put(asset, response);
        console.log('[ServiceWorker] Cached:', asset);
      }
    } catch (error) {
      console.error('[ServiceWorker] Failed to cache:', asset, error);
    }
  });
  
  await Promise.all(promises);
  
  // Notify clients that assets are cached
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'ASSETS_CACHED',
      assets,
    });
  });
}

// Get cache storage status
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {
    caches: {},
    totalSize: 0,
  };
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status.caches[cacheName] = {
      count: keys.length,
      urls: keys.map(req => req.url),
    };
  }
  
  // Estimate storage if available
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    status.usage = estimate.usage;
    status.quota = estimate.quota;
    status.percentage = ((estimate.usage / estimate.quota) * 100).toFixed(2);
  }
  
  return status;
}

// Periodic sync for game state
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-game-state') {
    event.waitUntil(syncGameState());
  }
  
  if (event.tag === 'update-leaderboard') {
    event.waitUntil(updateLeaderboard());
  }
});

// Sync game state function
async function syncGameState() {
  try {
    // Get all clients
    const clients = await self.clients.matchAll();
    
    // Request game state from active client
    if (clients.length > 0) {
      const client = clients[0];
      const messageChannel = new MessageChannel();
      
      // Send request for game state
      client.postMessage({ type: 'REQUEST_GAME_STATE' }, [messageChannel.port2]);
      
      // Wait for response
      const gameState = await new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
      });
      
      // Sync to server
      if (gameState) {
        await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gameState),
        });
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Game state sync failed:', error);
  }
}

// Update leaderboard function
async function updateLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard');
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.api);
      await cache.put('/api/leaderboard', response);
      
      // Notify clients of updated leaderboard
      const clients = await self.clients.matchAll();
      const data = await response.clone().json();
      
      clients.forEach((client) => {
        client.postMessage({
          type: 'LEADERBOARD_UPDATED',
          data,
        });
      });
    }
  } catch (error) {
    console.error('[ServiceWorker] Leaderboard update failed:', error);
  }
}

// Listen for online/offline events
self.addEventListener('online', () => {
  console.log('[ServiceWorker] Back online, syncing queued requests...');
  apiQueue.replayRequests();
});

// Advanced features: Web Share Target
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle share target
  if (url.pathname === '/share' && event.request.method === 'POST') {
    event.respondWith(handleShare(event.request));
  }
});

async function handleShare(request) {
  try {
    const formData = await request.formData();
    const sharedData = {
      title: formData.get('title'),
      text: formData.get('text'),
      url: formData.get('url'),
    };
    
    // Store shared data for the app to process
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SHARED_DATA',
        data: sharedData,
      });
    });
    
    // Redirect to main app
    return Response.redirect('/', 303);
  } catch (error) {
    console.error('[ServiceWorker] Share handling failed:', error);
    return new Response('Share failed', { status: 500 });
  }
}

console.log('[ServiceWorker] Enhanced service worker loaded with Workbox');