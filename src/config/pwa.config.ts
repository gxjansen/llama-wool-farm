// PWA Configuration for Llama Wool Farm
export const PWAConfig = {
  // Service Worker Configuration
  serviceWorker: {
    enabled: true,
    src: '/service-worker.js',
    scope: '/',
    updateInterval: 60000, // Check for updates every minute
    skipWaiting: true,
    clientsClaim: true,
  },
  
  // Caching Strategies
  caching: {
    // Static assets that rarely change
    staticAssets: [
      '/',
      '/index.html',
      '/manifest.json',
      '/offline.html',
    ],
    
    // Game assets to precache
    gameAssets: [
      '/assets/sprites/llama-sprite.png',
      '/assets/sprites/buildings-sprite.png',
      '/assets/sprites/ui-sprite.png',
      '/assets/audio/background-music.mp3',
      '/assets/audio/wool-collect.mp3',
      '/assets/audio/purchase.mp3',
      '/assets/audio/achievement.mp3',
    ],
    
    // Cache expiration settings
    expiration: {
      images: 30 * 24 * 60 * 60 * 1000, // 30 days
      audio: 30 * 24 * 60 * 60 * 1000, // 30 days
      api: 5 * 60 * 1000, // 5 minutes
      fonts: 365 * 24 * 60 * 60 * 1000, // 1 year
    },
    
    // Network timeout for API calls
    networkTimeout: 5000, // 5 seconds
  },
  
  // Background Sync Configuration
  backgroundSync: {
    enabled: true,
    queues: {
      gameSave: {
        name: 'game-save-queue',
        maxRetentionTime: 24 * 60, // 24 hours in minutes
      },
      analytics: {
        name: 'analytics-queue',
        maxRetentionTime: 7 * 24 * 60, // 7 days in minutes
      },
    },
  },
  
  // Periodic Background Sync
  periodicSync: {
    enabled: true,
    tasks: {
      leaderboardUpdate: {
        tag: 'update-leaderboard',
        minInterval: 60 * 60 * 1000, // 1 hour
      },
      achievementSync: {
        tag: 'sync-achievements',
        minInterval: 24 * 60 * 60 * 1000, // 24 hours
      },
    },
  },
  
  // Install Prompt Configuration
  installPrompt: {
    enabled: true,
    minPlayTime: 5 * 60 * 1000, // 5 minutes
    dismissCooldown: 7 * 24 * 60 * 60 * 1000, // 7 days
    showOnMobile: true,
    showOnDesktop: true,
    
    // Trigger conditions
    triggers: {
      pageViews: 3,
      sessionTime: 2 * 60 * 1000, // 2 minutes
      achievementUnlocked: true,
      levelReached: 5,
    },
  },
  
  // Push Notifications Configuration
  pushNotifications: {
    enabled: false, // Will be enabled in future update
    vapidPublicKey: process.env.VITE_VAPID_PUBLIC_KEY || '',
    
    // Notification types
    types: {
      dailyBonus: {
        enabled: true,
        schedule: '09:00',
      },
      offlineEarnings: {
        enabled: true,
        threshold: 1000000, // 1M wool
      },
      achievement: {
        enabled: true,
      },
      event: {
        enabled: true,
      },
    },
  },
  
  // App Shortcuts
  shortcuts: [
    {
      name: 'Play Game',
      shortName: 'Play',
      description: 'Jump straight into your llama farm',
      url: '/play',
      icon: '/icons/play-96.png',
    },
    {
      name: 'Leaderboard',
      shortName: 'Rankings',
      description: 'View global leaderboard rankings',
      url: '/leaderboard',
      icon: '/icons/leaderboard-96.png',
    },
    {
      name: 'Daily Bonus',
      shortName: 'Bonus',
      description: 'Claim your daily bonus',
      url: '/daily-bonus',
      icon: '/icons/bonus-96.png',
    },
  ],
  
  // Web Share Target
  shareTarget: {
    enabled: true,
    action: '/share',
    method: 'POST',
    enctype: 'multipart/form-data',
    params: {
      text: 'text',
      url: 'url',
      files: [
        {
          name: 'save',
          accept: ['application/json', '.llamasave'],
        },
      ],
    },
  },
  
  // Protocol Handlers
  protocolHandlers: {
    enabled: true,
    protocol: 'web+llamafarm',
    actions: {
      join: '/join?code=%s',
      challenge: '/challenge?id=%s',
      share: '/import?data=%s',
    },
  },
  
  // Performance Monitoring
  performance: {
    enabled: true,
    metrics: {
      cacheHitRate: true,
      loadTime: true,
      offlineCapability: true,
      installRate: true,
    },
    reportingEndpoint: '/api/performance',
    sampleRate: 0.1, // 10% of users
  },
  
  // Update Strategy
  updateStrategy: {
    checkInterval: 60000, // 1 minute
    autoUpdate: false,
    showUpdatePrompt: true,
    forceUpdateAfter: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // Storage Management
  storage: {
    // Request persistent storage
    requestPersistent: true,
    
    // Storage quotas
    quotas: {
      minimum: 100 * 1024 * 1024, // 100MB
      recommended: 500 * 1024 * 1024, // 500MB
    },
    
    // Clean up old data
    cleanup: {
      enabled: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      excludePatterns: [
        'game-save',
        'user-preferences',
        'achievements',
      ],
    },
  },
  
  // Offline Features
  offline: {
    enabled: true,
    fallbackPage: '/offline.html',
    
    // Features available offline
    features: {
      gameplay: true,
      saves: true,
      achievements: true,
      leaderboard: 'cached', // Show cached version
      shop: true,
      settings: true,
    },
    
    // Offline indicators
    indicators: {
      showBanner: true,
      showIcon: true,
      autoHide: true,
      position: 'bottom',
    },
  },
  
  // Analytics Configuration
  analytics: {
    enabled: true,
    offline: true, // Track events offline
    
    // PWA-specific events
    events: {
      install: true,
      update: true,
      offline: true,
      cacheHit: true,
      networkError: true,
      backgroundSync: true,
    },
  },
};

// Export helper functions
export const isPWAInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
};

export const isIOSSafari = (): boolean => {
  const ua = window.navigator.userAgent;
  const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
  const webkit = !!ua.match(/WebKit/i);
  const iOSSafari = iOS && webkit && !ua.match(/CriOS/i) && !ua.match(/FxiOS/i);
  return iOSSafari;
};

export const canInstallPWA = (): boolean => {
  return 'BeforeInstallPromptEvent' in window || isIOSSafari();
};

export const getStorageEstimate = async (): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
    };
  }
  
  return { usage: 0, quota: 0, percentage: 0 };
};

export const requestPersistentStorage = async (): Promise<boolean> => {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    const isPersisted = await navigator.storage.persist();
    return isPersisted;
  }
  return false;
};