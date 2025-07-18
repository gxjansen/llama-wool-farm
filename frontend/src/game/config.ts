import type { Types } from 'phaser';

/**
 * Main game configuration for Phaser
 */
export const gameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#87CEEB', // Sky blue
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080,
    min: {
      width: 320,
      height: 480
    },
    max: {
      width: 1920,
      height: 1080
    }
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: process.env['NODE_ENV'] === 'development'
    }
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  input: {
    activePointers: 3, // Support multi-touch
    smoothFactor: 0.5
  },
  audio: {
    disableWebAudio: false,
    noAudio: false
  },
  scene: [], // Scenes will be added dynamically
  plugins: {
    global: [
      // Add global plugins here
    ],
    scene: [
      // Add scene plugins here
    ]
  }
};

/**
 * Asset configuration
 */
export const assetConfig = {
  basePath: 'assets/',
  images: {
    llamas: 'images/llamas/',
    wool: 'images/wool/',
    buildings: 'images/buildings/',
    ui: 'images/ui/',
    backgrounds: 'images/backgrounds/'
  },
  audio: {
    sfx: 'audio/sfx/',
    music: 'audio/music/',
    ambient: 'audio/ambient/'
  },
  fonts: {
    custom: 'fonts/'
  },
  spritesheets: {
    animations: 'spritesheets/'
  }
};

/**
 * Game settings and constants
 */
export const gameSettings = {
  // Production settings
  baseProductionRate: 0.1, // Wool per second for basic llama
  offlineEfficiency: 0.5, // 50% production while offline
  maxOfflineHours: 24, // Maximum offline progress
  
  // Save settings
  autoSaveInterval: 30000, // Auto-save every 30 seconds
  cloudSyncInterval: 60000, // Sync to cloud every minute
  
  // Performance settings
  particleLimit: 100, // Maximum particles on screen
  updateInterval: 1000, // Game logic update every second
  
  // UI settings
  tooltipDelay: 500, // Milliseconds before showing tooltip
  animationDuration: 300, // Default animation duration
  
  // Audio settings
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.5,
  
  // Progression settings
  prestigeBase: 10, // Base requirement for first prestige
  prestigeScaling: 1.5, // Exponential scaling factor
  
  // Debug settings
  debugMode: process.env['NODE_ENV'] === 'development',
  showFPS: process.env['NODE_ENV'] === 'development',
  skipIntro: process.env['NODE_ENV'] === 'development'
};

/**
 * PWA configuration
 */
export const pwaConfig = {
  name: 'Llama Wool Farm',
  shortName: 'LlamaWool',
  description: 'An idle clicker game about llamas producing wool',
  startUrl: '/',
  display: 'standalone',
  orientation: 'any',
  themeColor: '#4A90E2',
  backgroundColor: '#87CEEB',
  icons: [
    { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
    { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
    { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
    { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
    { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
  ],
  shortcuts: [
    {
      name: 'Play Now',
      shortName: 'Play',
      url: '/?source=pwa',
      icons: [{ src: '/icons/play-96x96.png', sizes: '96x96' }]
    }
  ],
  shareTarget: {
    action: '/share',
    method: 'POST',
    enctype: 'multipart/form-data',
    params: {
      title: 'title',
      text: 'text',
      url: 'url'
    }
  }
};