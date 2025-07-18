import { Scene } from 'phaser';
import { assetConfig } from '@game/config';

export class PreloaderScene extends Scene {
  private loadingBar!: Phaser.GameObjects.Image;
  private loadingBarFill!: Phaser.GameObjects.Image;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PreloaderScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Add logo
    this.add.image(width / 2, height / 2 - 100, 'boot-logo')
      .setOrigin(0.5);

    // Add loading bar background
    this.loadingBar = this.add.image(width / 2, height / 2 + 50, 'loading-bar-bg')
      .setOrigin(0.5);

    // Add loading bar fill
    this.loadingBarFill = this.add.image(
      width / 2 - this.loadingBar.width / 2,
      height / 2 + 50,
      'loading-bar-fill'
    ).setOrigin(0, 0.5);

    // Add loading text
    this.loadingText = this.add.text(width / 2, height / 2 + 100, 'Loading...', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Set up loading events
    this.load.on('progress', this.updateProgress, this);
    this.load.on('complete', this.loadComplete, this);

    // Start loading assets
    this.loadGameAssets();
  }

  private updateProgress(value: number): void {
    // Update loading bar fill
    this.loadingBarFill.setScale(value, 1);
    
    // Update loading text
    this.loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
  }

  private loadComplete(): void {
    // Fade out loading screen
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainGameScene');
      this.scene.start('UIScene');
    });
  }

  private loadGameAssets(): void {
    const { basePath, images, audio, spritesheets, fonts } = assetConfig;

    // Load llama sprites
    this.load.image('llama-basic', `${basePath}${images.llamas}llama-basic.png`);
    this.load.image('llama-silver', `${basePath}${images.llamas}llama-silver.png`);
    this.load.image('llama-golden', `${basePath}${images.llamas}llama-golden.png`);

    // Load wool sprites
    this.load.image('wool-basic', `${basePath}${images.wool}wool-basic.png`);
    this.load.image('wool-silver', `${basePath}${images.wool}wool-silver.png`);
    this.load.image('wool-golden', `${basePath}${images.wool}wool-golden.png`);

    // Load building sprites
    this.load.image('barn', `${basePath}${images.buildings}barn.png`);
    this.load.image('shears', `${basePath}${images.buildings}shears.png`);
    this.load.image('transport', `${basePath}${images.buildings}transport.png`);

    // Load UI elements
    this.load.image('button-bg', `${basePath}${images.ui}button-bg.png`);
    this.load.image('panel-bg', `${basePath}${images.ui}panel-bg.png`);
    this.load.image('icon-wool', `${basePath}${images.ui}icon-wool.png`);
    this.load.image('icon-coin', `${basePath}${images.ui}icon-coin.png`);

    // Load backgrounds
    this.load.image('bg-farm', `${basePath}${images.backgrounds}farm.png`);
    this.load.image('bg-clouds', `${basePath}${images.backgrounds}clouds.png`);

    // Load spritesheets
    this.load.spritesheet(
      'llama-idle',
      `${basePath}${spritesheets.animations}llama-idle.png`,
      { frameWidth: 128, frameHeight: 128 }
    );

    // Load audio
    this.load.audio('click', `${basePath}${audio.sfx}click.mp3`);
    this.load.audio('wool-collect', `${basePath}${audio.sfx}wool-collect.mp3`);
    this.load.audio('purchase', `${basePath}${audio.sfx}purchase.mp3`);
    this.load.audio('achievement', `${basePath}${audio.sfx}achievement.mp3`);
    this.load.audio('bg-music', `${basePath}${audio.music}peaceful-farm.mp3`);

    // Load custom fonts if needed
    // Note: Web fonts should be loaded via CSS
  }
}