import { Game } from './game/Game';
import { PHASER_CONFIG } from './data/GameConfig';

// Global game instance
let game: Game;

// Initialize the game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing game...');
  initializeGame();
});

// Initialize service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

function initializeGame(): void {
  try {
    // Check if WebGL is supported
    if (!checkWebGLSupport()) {
      showErrorMessage('WebGL is not supported in your browser. Please update your browser or enable WebGL.');
      return;
    }
    
    // Check if minimum screen size is met
    if (!checkScreenSize()) {
      showErrorMessage('Screen size is too small. Minimum resolution required: 320x240');
      return;
    }
    
    // Create game instance
    game = Game.create();
    
    // Add game to global scope for debugging
    (window as any).game = game;
    
    console.log('Game initialized successfully');
    
    // Show loading screen
    showLoadingScreen();
    
  } catch (error) {
    console.error('Failed to initialize game:', error);
    showErrorMessage('Failed to initialize the game. Please refresh the page.');
  }
}

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (error) {
    return false;
  }
}

function checkScreenSize(): boolean {
  return window.innerWidth >= 320 && window.innerHeight >= 240;
}

function showLoadingScreen(): void {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'flex';
    
    // Hide loading screen after game starts
    setTimeout(() => {
      loadingElement.style.display = 'none';
    }, 2000);
  }
}

function showErrorMessage(message: string): void {
  const errorElement = document.getElementById('error');
  const errorMessageElement = document.getElementById('error-message');
  
  if (errorElement && errorMessageElement) {
    errorMessageElement.textContent = message;
    errorElement.style.display = 'flex';
  } else {
    // Fallback to alert if error elements don't exist
    alert(message);
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  if (game) {
    // Phaser handles this automatically with the scale configuration
    console.log('Window resized');
  }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (game) {
    // Save game state before page unload
    const currentScene = game.getCurrentScene();
    if (currentScene && (currentScene as any).saveSystem) {
      (currentScene as any).saveSystem.saveGame();
    }
  }
});

// Global functions for debugging
(window as any).restartGame = () => {
  if (game) {
    game.restartGame();
  }
};

(window as any).pauseGame = () => {
  if (game) {
    game.pauseGame();
  }
};

(window as any).resumeGame = () => {
  if (game) {
    game.resumeGame();
  }
};

// Export for module usage
export { game, initializeGame };