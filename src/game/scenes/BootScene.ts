import { SCENES } from '../../data/Constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.BOOT });
  }

  preload(): void {
    // Load essential assets for the preloader
    this.load.image('loading-bg', 'assets/images/loading-bg.png');
    this.load.image('loading-bar', 'assets/images/loading-bar.png');
    this.load.image('loading-fill', 'assets/images/loading-fill.png');
    
    // Load web fonts
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
    
    // Progress bar for boot loading
    this.createLoadingBar();
  }

  private createLoadingBar(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    // Create simple loading text
    const loadingText = this.add.text(centerX, centerY - 50, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    loadingText.setOrigin(0.5, 0.5);
    
    // Create progress bar background
    const progressBg = this.add.rectangle(centerX, centerY, 400, 20, 0x333333);
    progressBg.setStrokeStyle(2, 0xffffff);
    
    // Create progress bar fill
    const progressFill = this.add.rectangle(centerX - 198, centerY, 0, 16, 0x00ff00);
    progressFill.setOrigin(0, 0.5);
    
    // Update progress
    this.load.on('progress', (value: number) => {
      progressFill.setSize(396 * value, 16);
    });
    
    this.load.on('complete', () => {
      loadingText.setText('Boot Complete!');
      this.time.delayedCall(1000, () => {
        this.scene.start(SCENES.PRELOADER);
      });
    });
  }

  create(): void {
    console.log('BootScene: Boot process complete');
    
    // Initialize web fonts if loaded
    if (window.WebFont) {
      window.WebFont.load({
        google: {
          families: ['Roboto:300,400,700']
        },
        active: () => {
          console.log('Fonts loaded successfully');
        }
      });
    }
  }

  update(): void {
    // Boot scene typically doesn't need update loop
  }
}