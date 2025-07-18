import { ButtonConfig } from '../../types';
import { COLORS } from '../../data/Constants';

export class Button extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private isHovered: boolean = false;
  private isPressed: boolean = false;
  private config: ButtonConfig;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    super(scene, config.x, config.y);
    
    this.config = config;
    this.createButton();
    this.setupInteractivity();
    
    scene.add.existing(this);
  }

  private createButton(): void {
    // Create background
    this.background = this.scene.add.rectangle(0, 0, 200, 50, COLORS.PRIMARY);
    this.background.setStrokeStyle(2, COLORS.WHITE);
    this.add(this.background);

    // Create text if provided
    if (this.config.text) {
      const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center',
        ...this.config.textStyle
      };

      this.text = this.scene.add.text(0, 0, this.config.text, textStyle);
      this.text.setOrigin(0.5, 0.5);
      this.add(this.text);
    }
  }

  private setupInteractivity(): void {
    this.background.setInteractive({ useHandCursor: true });

    this.background.on('pointerdown', () => {
      this.isPressed = true;
      this.updateVisuals();
    });

    this.background.on('pointerup', () => {
      if (this.isPressed) {
        this.isPressed = false;
        this.updateVisuals();
        
        if (this.config.onClick) {
          this.config.onClick();
        }
      }
    });

    this.background.on('pointerover', () => {
      this.isHovered = true;
      this.updateVisuals();
      
      if (this.config.onHover) {
        this.config.onHover();
      }
    });

    this.background.on('pointerout', () => {
      this.isHovered = false;
      this.isPressed = false;
      this.updateVisuals();
      
      if (this.config.onOut) {
        this.config.onOut();
      }
    });
  }

  private updateVisuals(): void {
    let color = COLORS.PRIMARY;
    let scale = 1;
    
    if (this.isPressed) {
      color = COLORS.SECONDARY;
      scale = 0.95;
    } else if (this.isHovered) {
      color = COLORS.SUCCESS;
      scale = 1.05;
    }

    this.background.setFillStyle(color);
    this.setScale(scale);
  }

  public setText(text: string): void {
    if (this.text) {
      this.text.setText(text);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.background.setInteractive(enabled);
    this.setAlpha(enabled ? 1 : 0.5);
  }

  public setSize(width: number, height: number): void {
    this.background.setSize(width, height);
  }

  public setColor(color: number): void {
    this.background.setFillStyle(color);
  }

  public destroy(): void {
    this.background.removeAllListeners();
    super.destroy();
  }
}