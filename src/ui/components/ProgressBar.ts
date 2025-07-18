import { ProgressBarConfig } from '../../types';
import { COLORS } from '../../data/Constants';

export class ProgressBar extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private fillBar: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle | null = null;
  private progressText: Phaser.GameObjects.Text;
  private config: ProgressBarConfig;
  private currentProgress: number = 0;
  private targetProgress: number = 0;
  private animationTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: ProgressBarConfig) {
    super(scene, config.x, config.y);
    
    this.config = config;
    this.createProgressBar();
    
    scene.add.existing(this);
  }

  private createProgressBar(): void {
    // Create background
    this.background = this.scene.add.rectangle(
      0, 0, 
      this.config.width, 
      this.config.height, 
      this.config.backgroundColor
    );
    this.add(this.background);

    // Create fill bar
    this.fillBar = this.scene.add.rectangle(
      -this.config.width / 2, 0,
      0, 
      this.config.height, 
      this.config.fillColor
    );
    this.fillBar.setOrigin(0, 0.5);
    this.add(this.fillBar);

    // Create border if specified
    if (this.config.borderColor && this.config.borderWidth) {
      this.border = this.scene.add.rectangle(
        0, 0,
        this.config.width,
        this.config.height
      );
      this.border.setStrokeStyle(this.config.borderWidth, this.config.borderColor);
      this.border.setFillStyle(null);
      this.add(this.border);
    }

    // Create progress text
    this.progressText = this.scene.add.text(0, 0, '0%', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial',
      align: 'center'
    });
    this.progressText.setOrigin(0.5, 0.5);
    this.add(this.progressText);
  }

  public setProgress(progress: number, animate: boolean = true): void {
    this.targetProgress = Phaser.Math.Clamp(progress, 0, 1);
    
    if (animate) {
      this.animateProgress();
    } else {
      this.updateProgress(this.targetProgress);
    }
  }

  private animateProgress(): void {
    if (this.animationTween) {
      this.animationTween.destroy();
    }

    this.animationTween = this.scene.tweens.add({
      targets: this,
      currentProgress: this.targetProgress,
      duration: 500,
      ease: 'Power2',
      onUpdate: () => {
        this.updateProgress(this.currentProgress);
      },
      onComplete: () => {
        this.animationTween = null;
      }
    });
  }

  private updateProgress(progress: number): void {
    const fillWidth = this.config.width * progress;
    this.fillBar.setSize(fillWidth, this.config.height);
    
    const percentage = Math.round(progress * 100);
    this.progressText.setText(`${percentage}%`);
  }

  public getProgress(): number {
    return this.targetProgress;
  }

  public setColors(backgroundColor: number, fillColor: number): void {
    this.background.setFillStyle(backgroundColor);
    this.fillBar.setFillStyle(fillColor);
  }

  public showText(show: boolean): void {
    this.progressText.setVisible(show);
  }

  public setText(text: string): void {
    this.progressText.setText(text);
  }

  public setSize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    
    this.background.setSize(width, height);
    this.fillBar.setSize(width * this.currentProgress, height);
    this.fillBar.x = -width / 2;
    
    if (this.border) {
      this.border.setSize(width, height);
    }
  }

  public reset(): void {
    this.setProgress(0, false);
  }

  public complete(): void {
    this.setProgress(1, true);
  }

  public destroy(): void {
    if (this.animationTween) {
      this.animationTween.destroy();
    }
    super.destroy();
  }
}