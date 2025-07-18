import { SCENES, AUDIO } from '../../data/Constants';
import { ProgressBar } from '../../ui/components/ProgressBar';

export class PreloaderScene extends Phaser.Scene {
  private progressBar: ProgressBar;
  private loadingText: Phaser.GameObjects.Text;
  private loadingTips: string[] = [
    'Tip: Use WASD or arrow keys to move',
    'Tip: Collect power-ups to boost your score',
    'Tip: Watch out for obstacles!',
    'Tip: Your progress is automatically saved',
    'Tip: Try different difficulty levels'
  ];
  private currentTip: number = 0;
  private tipText: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENES.PRELOADER });
  }

  preload(): void {
    this.createLoadingScreen();
    this.loadAssets();
    this.setupLoadingEvents();
  }

  private createLoadingScreen(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    // Background
    this.add.rectangle(centerX, centerY, this.cameras.main.width, this.cameras.main.height, 0x2c3e50);
    
    // Title
    const title = this.add.text(centerX, centerY - 150, 'LLAMA WOOL FARM', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5, 0.5);
    
    // Subtitle
    const subtitle = this.add.text(centerX, centerY - 100, 'Loading Game Assets...', {
      fontSize: '18px',
      color: '#bdc3c7',
      fontFamily: 'Arial, sans-serif'
    });
    subtitle.setOrigin(0.5, 0.5);
    
    // Progress bar
    this.progressBar = new ProgressBar(this, {
      x: centerX,
      y: centerY,
      width: 400,
      height: 20,
      backgroundColor: 0x34495e,
      fillColor: 0x3498db,
      borderColor: 0xffffff,
      borderWidth: 2
    });
    
    // Loading text
    this.loadingText = this.add.text(centerX, centerY + 50, 'Initializing...', {
      fontSize: '16px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif'
    });
    this.loadingText.setOrigin(0.5, 0.5);
    
    // Loading tips
    this.tipText = this.add.text(centerX, centerY + 100, this.loadingTips[0], {
      fontSize: '14px',
      color: '#95a5a6',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      wordWrap: { width: 500 }
    });
    this.tipText.setOrigin(0.5, 0.5);
    
    // Cycle through tips
    this.time.addEvent({
      delay: 2000,
      callback: this.cycleTips,
      callbackScope: this,
      loop: true
    });
  }

  private cycleTips(): void {
    this.currentTip = (this.currentTip + 1) % this.loadingTips.length;
    this.tipText.setText(this.loadingTips[this.currentTip]);
  }

  private loadAssets(): void {
    // Images
    this.load.image('player', 'assets/images/player.png');
    this.load.image('background', 'assets/images/background.png');
    this.load.image('platform', 'assets/images/platform.png');
    this.load.image('coin', 'assets/images/coin.png');
    this.load.image('enemy', 'assets/images/enemy.png');
    this.load.image('powerup', 'assets/images/powerup.png');
    
    // Spritesheets
    this.load.spritesheet('player-walk', 'assets/spritesheets/player-walk.png', {
      frameWidth: 32,
      frameHeight: 48
    });
    
    this.load.spritesheet('explosion', 'assets/spritesheets/explosion.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    
    // Audio
    this.load.audio(AUDIO.MUSIC.MAIN_THEME, [
      'assets/audio/music/main-theme.mp3',
      'assets/audio/music/main-theme.ogg'
    ]);
    
    this.load.audio(AUDIO.MUSIC.MENU_THEME, [
      'assets/audio/music/menu-theme.mp3',
      'assets/audio/music/menu-theme.ogg'
    ]);
    
    this.load.audio(AUDIO.SFX.CLICK, [
      'assets/audio/sfx/click.mp3',
      'assets/audio/sfx/click.ogg'
    ]);
    
    this.load.audio(AUDIO.SFX.JUMP, [
      'assets/audio/sfx/jump.mp3',
      'assets/audio/sfx/jump.ogg'
    ]);
    
    this.load.audio(AUDIO.SFX.COLLECT, [
      'assets/audio/sfx/collect.mp3',
      'assets/audio/sfx/collect.ogg'
    ]);
    
    // UI elements
    this.load.image('button', 'assets/ui/button.png');
    this.load.image('button-hover', 'assets/ui/button-hover.png');
    this.load.image('panel', 'assets/ui/panel.png');
    
    // Fonts
    this.load.bitmapFont('pixel', 'assets/fonts/pixel.png', 'assets/fonts/pixel.xml');
    
    // JSON data
    this.load.json('level-data', 'assets/data/levels.json');
    this.load.json('achievements', 'assets/data/achievements.json');
  }

  private setupLoadingEvents(): void {
    this.load.on('progress', (progress: number) => {
      this.progressBar.setProgress(progress);
      const percentage = Math.round(progress * 100);
      this.loadingText.setText(`Loading... ${percentage}%`);
    });
    
    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      this.loadingText.setText(`Loading: ${file.key}`);
    });
    
    this.load.on('complete', () => {
      this.loadingText.setText('Loading Complete!');
      this.progressBar.complete();
      
      // Wait a moment then transition
      this.time.delayedCall(1000, () => {
        this.scene.start(SCENES.MAIN_GAME);
      });
    });
    
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error(`Failed to load: ${file.key}`);
      this.loadingText.setText(`Error loading: ${file.key}`);
    });
  }

  create(): void {
    console.log('PreloaderScene: Assets loaded successfully');
    
    // Create animations after assets are loaded
    this.createAnimations();
  }

  private createAnimations(): void {
    // Player walk animation
    this.anims.create({
      key: 'player-walk',
      frames: this.anims.generateFrameNumbers('player-walk', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Explosion animation
    this.anims.create({
      key: 'explosion',
      frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 15 }),
      frameRate: 20,
      repeat: 0
    });
    
    // Coin spin animation
    this.anims.create({
      key: 'coin-spin',
      frames: [{ key: 'coin', frame: 0 }],
      frameRate: 1,
      repeat: -1
    });
  }

  update(): void {
    // Preloader typically doesn't need update loop
  }
}