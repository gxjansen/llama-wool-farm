import { Scene } from 'phaser';
import { ProductionManager } from '@core/managers/ProductionManager';
import { EventManager } from '@core/managers/EventManager';
import { WoolType } from '@types/game.types';
import Decimal from 'decimal.js';

export class MainGameScene extends Scene {
  private productionManager!: ProductionManager;
  private eventManager!: EventManager;
  private llamas: Phaser.GameObjects.Group | undefined;
  private woolParticles: Phaser.GameObjects.Particles.ParticleEmitter | undefined;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  create(): void {
    // Initialize managers
    this.eventManager = new EventManager();
    this.productionManager = new ProductionManager(this.eventManager);

    // Set up background
    this.createBackground();
    
    // Create game objects
    this.createLlamas();
    this.createBuildings();
    
    // Set up particles
    this.setupParticles();
    
    // Set up input
    this.setupInput();
    
    // Start background music if enabled
    if (this.registry.get('musicEnabled')) {
      this.playBackgroundMusic();
    }

    // Set up game loop
    this.time.addEvent({
      delay: 1000, // Update every second
      callback: this.updateProduction,
      callbackScope: this,
      loop: true
    });

    // Listen for game events
    this.setupEventListeners();
  }

  update(time: number, delta: number): void {
    // Update animations
    this.updateAnimations(delta);
    
    // Update particle effects
    this.updateParticles();
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    
    // Add sky gradient
    const sky = this.add.rectangle(0, 0, width, height, 0x87CEEB)
      .setOrigin(0, 0);
    
    // Add parallax clouds
    const clouds = this.add.tileSprite(0, 100, width, 200, 'bg-clouds')
      .setOrigin(0, 0)
      .setAlpha(0.6);
    
    // Animate clouds
    this.tweens.add({
      targets: clouds,
      tilePositionX: width,
      duration: 60000,
      repeat: -1
    });
    
    // Add farm background
    this.add.image(width / 2, height - 100, 'bg-farm')
      .setOrigin(0.5, 1)
      .setScale(1.2);
  }

  private createLlamas(): void {
    this.llamas = this.add.group();
    
    // Create initial llama
    const llama = this.add.sprite(400, 400, 'llama-basic')
      .setInteractive()
      .setScale(1.5);
    
    // Add idle animation
    this.anims.create({
      key: 'llama-idle-anim',
      frames: this.anims.generateFrameNumbers('llama-idle', { start: 0, end: 7 }),
      frameRate: 8,
      repeat: -1
    });
    
    llama.play('llama-idle-anim');
    
    // Add click handler
    llama.on('pointerdown', () => {
      this.onLlamaClick(llama);
    });
    
    this.llamas.add(llama);
  }

  private createBuildings(): void {
    // Buildings will be created dynamically based on game state
    // This is a placeholder for the building system
  }

  private setupParticles(): void {
    // Create wool particle emitter
    const particles = this.add.particles(0, 0, 'wool-basic', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1000,
      gravityY: -100,
      alpha: { start: 1, end: 0 },
      emitting: false
    });
    
    this.woolParticles = particles;
  }

  private setupInput(): void {
    // Set up keyboard shortcuts
    this.input.keyboard?.on('keydown-S', () => {
      // Save game
      this.eventManager.emit('game.save');
    });
    
    this.input.keyboard?.on('keydown-P', () => {
      // Toggle pause
      this.scene.pause();
      this.scene.launch('PauseScene');
    });
  }

  private setupEventListeners(): void {
    // Listen for wool production events
    this.eventManager.on('wool.produced', (data: any) => {
      this.showWoolProduction(data.type, data.amount);
    });
    
    // Listen for achievement unlocks
    this.eventManager.on('achievement.unlocked', (achievement: any) => {
      this.showAchievement(achievement);
    });
  }

  private onLlamaClick(llama: Phaser.GameObjects.Sprite): void {
    // Play click sound
    if (this.registry.get('soundEnabled')) {
      this.sound.play('click');
    }
    
    // Animate llama
    this.tweens.add({
      targets: llama,
      scaleX: 1.6,
      scaleY: 1.4,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        // Manual click production bonus
        this.eventManager.emit('llama.clicked');
      }
    });
    
    // Show wool particles
    if (this.woolParticles) {
      this.woolParticles.setPosition(llama.x, llama.y - 50);
      this.woolParticles.explode(5);
    }
  }

  private updateProduction(): void {
    // This is called every second to update production
    const production = this.productionManager.update(1000);
    
    // Update UI with production values
    this.events.emit('production.update', production);
  }

  private updateAnimations(delta: number): void {
    // Update any custom animations here
  }

  private updateParticles(): void {
    // Update particle effects based on production rate
  }

  private showWoolProduction(type: WoolType, amount: Decimal): void {
    // Show floating text for wool production
    const text = this.add.text(
      Phaser.Math.Between(300, 500),
      Phaser.Math.Between(300, 400),
      `+${amount.toFixed(2)} ${type} wool`,
      {
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    
    this.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy()
    });
  }

  private showAchievement(achievement: any): void {
    // Play achievement sound
    if (this.registry.get('soundEnabled')) {
      this.sound.play('achievement');
    }
    
    // Show achievement notification
    this.events.emit('achievement.show', achievement);
  }

  private playBackgroundMusic(): void {
    const music = this.sound.add('bg-music', {
      loop: true,
      volume: 0.5
    });
    
    music.play();
  }
}