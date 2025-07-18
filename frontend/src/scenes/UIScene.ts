import { Scene } from 'phaser';
import { WoolType } from '@types/game.types';
import Decimal from 'decimal.js';

export class UIScene extends Scene {
  private woolDisplays: Map<WoolType, Phaser.GameObjects.Text> = new Map();
  private productionDisplay!: Phaser.GameObjects.Text;
  private prestigeButton!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Create UI panels
    this.createTopPanel();
    this.createSidePanel();
    this.createBottomPanel();

    // Listen for game events
    this.setupEventListeners();

    // Initial UI update
    this.updateUI();
  }

  private createTopPanel(): void {
    const { width } = this.cameras.main;
    
    // Panel background
    const panel = this.add.rectangle(width / 2, 40, width - 40, 80, 0x000000, 0.7)
      .setStrokeStyle(2, 0xffffff);

    // Wool displays
    let xPos = 60;
    const woolTypes = [WoolType.Basic, WoolType.Silver, WoolType.Golden];
    
    woolTypes.forEach(type => {
      // Icon
      this.add.image(xPos, 40, 'icon-wool')
        .setScale(0.5)
        .setTint(this.getWoolColor(type));
      
      // Amount text
      const text = this.add.text(xPos + 30, 40, '0', {
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      
      this.woolDisplays.set(type, text);
      xPos += 150;
    });

    // Production rate display
    this.productionDisplay = this.add.text(width - 60, 40, '0/s', {
      fontSize: '18px',
      color: '#00ff00'
    }).setOrigin(1, 0.5);
  }

  private createSidePanel(): void {
    const { width, height } = this.cameras.main;
    
    // Building panel
    const panelWidth = 300;
    const panel = this.add.rectangle(
      width - panelWidth / 2 - 20,
      height / 2,
      panelWidth,
      height - 200,
      0x000000,
      0.8
    ).setStrokeStyle(2, 0xffffff);

    // Panel title
    this.add.text(width - panelWidth / 2 - 20, 120, 'Buildings', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Building slots will be added dynamically
  }

  private createBottomPanel(): void {
    const { width, height } = this.cameras.main;
    
    // Upgrade panel
    const panel = this.add.rectangle(
      width / 2,
      height - 60,
      width - 400,
      100,
      0x000000,
      0.8
    ).setStrokeStyle(2, 0xffffff);

    // Prestige button
    this.createPrestigeButton();
  }

  private createPrestigeButton(): void {
    const { width, height } = this.cameras.main;
    
    const button = this.add.container(100, height - 60);
    
    // Button background
    const bg = this.add.rectangle(0, 0, 150, 50, 0x9b59b6)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive();
    
    // Button text
    const text = this.add.text(0, 0, 'PRESTIGE', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    button.add([bg, text]);
    
    // Add hover effect
    bg.on('pointerover', () => {
      bg.setFillStyle(0xad6dc8);
    });
    
    bg.on('pointerout', () => {
      bg.setFillStyle(0x9b59b6);
    });
    
    bg.on('pointerdown', () => {
      this.onPrestigeClick();
    });
    
    this.prestigeButton = button;
  }

  private setupEventListeners(): void {
    // Listen for production updates from MainGameScene
    const mainScene = this.scene.get('MainGameScene');
    
    mainScene.events.on('production.update', (production: any) => {
      this.updateProduction(production);
    });
    
    mainScene.events.on('achievement.show', (achievement: any) => {
      this.showAchievementNotification(achievement);
    });
  }

  private updateUI(): void {
    // This will be connected to the actual game state
    // For now, just placeholder updates
  }

  private updateProduction(production: any): void {
    // Update wool displays
    Object.entries(production).forEach(([type, amount]) => {
      const display = this.woolDisplays.get(type as WoolType);
      if (display && amount instanceof Decimal) {
        display.setText(this.formatNumber(amount));
      }
    });
    
    // Update production rate
    // This would come from the actual production manager
    this.productionDisplay.setText('0/s');
  }

  private showAchievementNotification(achievement: any): void {
    const { width } = this.cameras.main;
    
    // Create notification container
    const notification = this.add.container(width / 2, 100);
    
    // Background
    const bg = this.add.rectangle(0, 0, 400, 80, 0x2ecc71, 0.9)
      .setStrokeStyle(3, 0xffffff);
    
    // Icon
    const icon = this.add.image(-150, 0, 'achievement')
      .setScale(0.5);
    
    // Text
    const title = this.add.text(0, -15, 'Achievement Unlocked!', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    const name = this.add.text(0, 15, achievement.name, {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    notification.add([bg, icon, title, name]);
    
    // Animate in
    notification.setScale(0);
    this.tweens.add({
      targets: notification,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Wait then fade out
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: notification,
            alpha: 0,
            y: notification.y - 50,
            duration: 500,
            onComplete: () => notification.destroy()
          });
        });
      }
    });
  }

  private onPrestigeClick(): void {
    // Show prestige confirmation dialog
    console.log('Prestige clicked!');
    // This will open the prestige scene/modal
  }

  private getWoolColor(type: WoolType): number {
    const colors: Record<WoolType, number> = {
      [WoolType.Basic]: 0xf5f5dc,
      [WoolType.Silver]: 0xc0c0c0,
      [WoolType.Golden]: 0xffd700,
      [WoolType.Rainbow]: 0xff6b6b,
      [WoolType.Cosmic]: 0x4b0082,
      [WoolType.Ethereal]: 0xe6e6fa,
      [WoolType.Temporal]: 0x00ced1,
      [WoolType.Dimensional]: 0x8a2be2,
      [WoolType.Celestial]: 0xfafad2,
      [WoolType.Quantum]: 0x00ffff
    };
    return colors[type];
  }

  private formatNumber(value: Decimal): string {
    if (value.lessThan(1000)) {
      return value.toFixed(2);
    } else if (value.lessThan(1000000)) {
      return `${value.dividedBy(1000).toFixed(2)}K`;
    } else if (value.lessThan(1000000000)) {
      return `${value.dividedBy(1000000).toFixed(2)}M`;
    } else {
      return value.toExponential(2);
    }
  }
}