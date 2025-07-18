import 'phaser';
import { gameConfig } from '@game/config';
import { BootScene } from '@scenes/BootScene';
import { PreloaderScene } from '@scenes/PreloaderScene';
import { MainGameScene } from '@scenes/MainGameScene';
import { UIScene } from '@scenes/UIScene';
import { registerServiceWorker } from './registerServiceWorker';
import { validateEnv } from '@config/env';

// Validate environment variables
validateEnv();

// Register service worker for PWA
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    registerServiceWorker();
  });
}

// Add scenes to game config
const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  scene: [BootScene, PreloaderScene, MainGameScene, UIScene]
};

// Initialize analytics if enabled
if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true') {
  import('@services/analytics').then(({ initAnalytics }) => {
    initAnalytics();
  });
}

// Create game instance
window.addEventListener('load', () => {
  const game = new Phaser.Game(config);
  
  // Store game instance globally for debugging in development
  if (process.env.NODE_ENV === 'development') {
    (window as any).game = game;
  }
  
  // Handle resize events
  window.addEventListener('resize', () => {
    game.scale.refresh();
  });
  
  // Handle visibility change for pausing
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.scene.pause('MainGameScene');
    } else {
      game.scene.resume('MainGameScene');
    }
  });
});

// Handle errors gracefully
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to error tracking service in production
  if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_SENTRY_DSN) {
    import('@services/errorTracking').then(({ reportError }) => {
      reportError(event.error);
    });
  }
});