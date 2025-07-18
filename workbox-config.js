module.exports = {
  globDirectory: 'dist/',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,jpeg,gif,svg,webp,ico,json,woff,woff2,ttf,otf}',
  ],
  swDest: 'dist/service-worker.js',
  swSrc: 'src/service-worker-enhanced.js',
  
  // Don't precache files larger than 5MB
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  
  // Exclude source maps and certain files
  globIgnores: [
    '**/*.map',
    '**/node_modules/**/*',
    'screenshots/**/*',
    'test/**/*',
  ],
  
  // Runtime caching configuration
  runtimeCaching: [
    {
      // Google Fonts stylesheets
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
      },
    },
    {
      // Google Fonts webfont files
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        cacheableResponse: {
          statuses: [0, 200],
        },
        expiration: {
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          maxEntries: 30,
        },
      },
    },
    {
      // Game assets from CDN
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cdn-assets',
        cacheableResponse: {
          statuses: [0, 200],
        },
        expiration: {
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          maxEntries: 50,
        },
      },
    },
    {
      // API calls
      urlPattern: /\/api\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 5, // 5 minutes
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // Game save data
      urlPattern: /\/api\/save/,
      handler: 'NetworkOnly',
      options: {
        backgroundSync: {
          name: 'game-save-queue',
          options: {
            maxRetentionTime: 24 * 60, // Retry for up to 24 hours
          },
        },
      },
    },
    {
      // Images
      urlPattern: /\.(?:png|gif|jpg|jpeg|webp|svg)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      // Audio files
      urlPattern: /\.(?:mp3|wav|ogg|m4a)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'audio',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
  
  // Skip waiting and claim clients
  skipWaiting: true,
  clientsClaim: true,
  
  // Navigation fallback for SPA
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
  
  // Clean up outdated caches
  cleanupOutdatedCaches: true,
  
  // Source map generation
  sourcemap: false,
};