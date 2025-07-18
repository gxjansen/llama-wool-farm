import Phaser from 'phaser';

export interface PWAInstallPromptConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  onInstall?: () => void;
  onDismiss?: () => void;
}

export class PWAInstallPrompt extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.RoundedRectangle;
  private icon: Phaser.GameObjects.Text;
  private titleText: Phaser.GameObjects.Text;
  private descriptionText: Phaser.GameObjects.Text;
  private installButton: Phaser.GameObjects.Container;
  private dismissButton: Phaser.GameObjects.Container;
  private deferredPrompt: any = null;
  private config: PWAInstallPromptConfig;
  
  constructor(config: PWAInstallPromptConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;
    
    // Check if already installed
    if (this.isInstalled()) {
      return;
    }
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.show();
    });
    
    this.createPromptUI();
    this.setVisible(false);
    this.scene.add.existing(this);
  }
  
  private createPromptUI(): void {
    // Semi-transparent background
    this.background = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.7);
    this.background.setInteractive();
    this.add(this.background);
    
    // Main panel
    this.panel = this.scene.add.rexRoundedRectangle(0, 0, 400, 320, 20, 0xffffff) as any;
    this.panel.setStrokeStyle(3, 0x4A90E2);
    this.add(this.panel);
    
    // Llama icon
    this.icon = this.scene.add.text(0, -100, '🦙', {
      fontSize: '64px',
      fontFamily: 'Arial',
    });
    this.icon.setOrigin(0.5);
    this.add(this.icon);
    
    // Title
    this.titleText = this.scene.add.text(0, -30, 'Install Llama Wool Farm', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#2C3E50',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.add(this.titleText);
    
    // Description
    this.descriptionText = this.scene.add.text(0, 10, 'Install the app for the best experience:\n• Play offline\n• Faster loading\n• Home screen access', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#7F8C8D',
      align: 'center',
      lineSpacing: 5,
    });
    this.descriptionText.setOrigin(0.5);
    this.add(this.descriptionText);
    
    // Install button
    this.installButton = this.createButton(0, 90, 'Install Now', 0x4A90E2, () => this.handleInstall());
    this.add(this.installButton);
    
    // Dismiss button
    this.dismissButton = this.createButton(0, 140, 'Maybe Later', 0xECF0F1, () => this.handleDismiss(), '#2C3E50');
    this.add(this.dismissButton);
    
    // Add animations
    this.setScale(0.9);
    this.setAlpha(0);
  }
  
  private createButton(x: number, y: number, text: string, bgColor: number, callback: () => void, textColor: string = '#FFFFFF'): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);
    
    const bg = this.scene.add.rexRoundedRectangle(0, 0, 200, 45, 22.5, bgColor) as any;
    button.add(bg);
    
    const label = this.scene.add.text(0, 0, text, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: textColor,
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);
    button.add(label);
    
    // Make interactive
    bg.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        button.setScale(0.95);
      })
      .on('pointerup', () => {
        button.setScale(1);
        callback();
      })
      .on('pointerout', () => {
        button.setScale(1);
      })
      .on('pointerover', () => {
        bg.setAlpha(0.9);
      })
      .on('pointerout', () => {
        bg.setAlpha(1);
      });
    
    return button;
  }
  
  private show(): void {
    // Don't show if already dismissed recently
    const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (lastDismissed) {
      const daysSinceDismiss = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) return; // Don't show for 7 days after dismiss
    }
    
    this.setVisible(true);
    
    // Animate in
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
    
    // Add bounce animation to icon
    this.scene.tweens.add({
      targets: this.icon,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }
  
  private hide(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.9,
      scaleY: 0.9,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.setVisible(false);
        this.destroy();
      },
    });
  }
  
  private async handleInstall(): Promise<void> {
    if (!this.deferredPrompt) return;
    
    // Show the install prompt
    this.deferredPrompt.prompt();
    
    // Wait for the user to respond
    const { outcome } = await this.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      
      // Track installation
      if (this.config.onInstall) {
        this.config.onInstall();
      }
      
      // Send analytics event
      if ('gtag' in window) {
        (window as any).gtag('event', 'pwa_install', {
          event_category: 'PWA',
          event_label: 'Install Accepted',
        });
      }
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the deferred prompt
    this.deferredPrompt = null;
    this.hide();
  }
  
  private handleDismiss(): void {
    // Store dismiss time
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    
    if (this.config.onDismiss) {
      this.config.onDismiss();
    }
    
    // Send analytics event
    if ('gtag' in window) {
      (window as any).gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: 'Install Dismissed',
      });
    }
    
    this.hide();
  }
  
  private isInstalled(): boolean {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    
    // iOS check
    if ((window.navigator as any).standalone === true) {
      return true;
    }
    
    // Check if installed via getInstalledRelatedApps API
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        if (apps.length > 0) {
          return true;
        }
      });
    }
    
    return false;
  }
  
  // Static method to show iOS install instructions
  static showIOSInstructions(scene: Phaser.Scene): void {
    const container = scene.add.container(scene.scale.width / 2, scene.scale.height / 2);
    
    // Background
    const bg = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.7);
    bg.setInteractive();
    container.add(bg);
    
    // Panel
    const panel = scene.add.rexRoundedRectangle(0, 0, 350, 400, 20, 0xffffff) as any;
    panel.setStrokeStyle(3, 0x4A90E2);
    container.add(panel);
    
    // Title
    const title = scene.add.text(0, -160, 'Install on iOS', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#2C3E50',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    container.add(title);
    
    // Instructions
    const instructions = scene.add.text(0, -50, '1. Tap the Share button ⬆️\n\n2. Scroll down and tap\n   "Add to Home Screen"\n\n3. Tap "Add" to install', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#7F8C8D',
      align: 'center',
      lineSpacing: 10,
    });
    instructions.setOrigin(0.5);
    container.add(instructions);
    
    // Visual hint
    const hint = scene.add.text(0, 100, '👇', {
      fontSize: '48px',
      fontFamily: 'Arial',
    });
    hint.setOrigin(0.5);
    container.add(hint);
    
    // Animate hint
    scene.tweens.add({
      targets: hint,
      y: 120,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    
    // Close button
    const closeBtn = scene.add.text(0, 150, 'Got it!', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#FFFFFF',
      backgroundColor: '#4A90E2',
      padding: { x: 30, y: 10 },
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => {
      container.destroy();
    });
    container.add(closeBtn);
  }
  
  // Check if should show install prompt
  static shouldShowPrompt(): boolean {
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return false;
    }
    
    // Don't show if recently dismissed
    const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (lastDismissed) {
      const daysSinceDismiss = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) return false;
    }
    
    // Don't show if user has played less than 5 minutes
    const playTime = parseInt(localStorage.getItem('total-play-time') || '0');
    if (playTime < 300000) return false; // 5 minutes in milliseconds
    
    return true;
  }
}