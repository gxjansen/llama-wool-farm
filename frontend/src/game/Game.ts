import { PHASER_CONFIG } from '../data/GameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloaderScene } from './scenes/PreloaderScene';
import { MainGameScene } from './scenes/MainGameScene';

export class Game extends Phaser.Game {
  private static instance: Game;
  
  constructor() {
    // Add scenes to config
    const config = {
      ...PHASER_CONFIG,
      scene: [BootScene, PreloaderScene, MainGameScene]
    };
    
    super(config);
    
    Game.instance = this;
    this.setupGlobalEventHandlers();
    
    console.log('Game: Phaser game instance created');
  }

  private setupGlobalEventHandlers(): void {
    // Handle window resize
    window.addEventListener('resize', () => {
      this.scale.refresh();
    });
    
    // Handle visibility change (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.scene.pause();
      } else {
        this.scene.resume();
      }
    });
    
    // Handle focus events
    window.addEventListener('blur', () => {
      this.scene.pause();
    });
    
    window.addEventListener('focus', () => {
      this.scene.resume();
    });
  }

  public static getInstance(): Game {
    return Game.instance;
  }

  public static create(): Game {
    if (!Game.instance) {
      new Game();
    }
    return Game.instance;
  }

  public getCurrentScene(): Phaser.Scene | null {
    const activeScenes = this.scene.getScenes(true);
    return activeScenes.length > 0 ? activeScenes[0] : null;
  }

  public getSceneByKey(key: string): Phaser.Scene | null {
    return this.scene.getScene(key);
  }

  public pauseGame(): void {
    const currentScene = this.getCurrentScene();
    if (currentScene) {
      currentScene.scene.pause();
    }
  }

  public resumeGame(): void {
    const currentScene = this.getCurrentScene();
    if (currentScene) {
      currentScene.scene.resume();
    }
  }

  public restartGame(): void {
    const currentScene = this.getCurrentScene();
    if (currentScene) {
      currentScene.scene.restart();
    }
  }

  public goToScene(sceneKey: string, data?: any): void {
    const currentScene = this.getCurrentScene();
    if (currentScene) {
      currentScene.scene.start(sceneKey, data);
    }
  }

  public destroy(): void {
    Game.instance = null;
    super.destroy(true);
  }
}