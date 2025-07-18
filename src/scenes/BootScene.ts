import { Scene } from 'phaser';

export class BootScene extends Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load boot assets (minimal loading screen assets)
    this.load.image('boot-logo', 'assets/images/ui/boot-logo.png');
    this.load.image('loading-bar-bg', 'assets/images/ui/loading-bar-bg.png');
    this.load.image('loading-bar-fill', 'assets/images/ui/loading-bar-fill.png');
  }

  create(): void {
    // Set up game globals
    this.registry.set('highScore', 0);
    this.registry.set('soundEnabled', true);
    this.registry.set('musicEnabled', true);
    
    // Initialize game systems
    this.initializeGameSystems();
    
    // Move to preloader
    this.scene.start('PreloaderScene');
  }

  private initializeGameSystems(): void {
    // Set up global event emitters
    this.game.events.on('blur', () => {
      this.sound.pauseAll();
    });

    this.game.events.on('focus', () => {
      this.sound.resumeAll();
    });

    // Set up performance monitoring in development
    if (process.env.NODE_ENV === 'development') {
      this.game.events.on('prestep', () => {
        (window as any).gameStats?.begin();
      });

      this.game.events.on('poststep', () => {
        (window as any).gameStats?.end();
      });
    }
  }
}