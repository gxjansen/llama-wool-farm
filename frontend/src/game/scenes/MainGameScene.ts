import { SCENES, EVENTS, AUDIO } from '../../data/Constants';
import { AudioSystem } from '../../systems/AudioSystem';
import { SaveSystem } from '../../systems/SaveSystem';
import { Button } from '../../ui/components/Button';
import { GameData } from '../../types';

export class MainGameScene extends Phaser.Scene {
  private player: Phaser.Physics.Arcade.Sprite;
  private platforms: Phaser.Physics.Arcade.StaticGroup;
  private coins: Phaser.Physics.Arcade.Group;
  private enemies: Phaser.Physics.Arcade.Group;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: any;
  private gameData: GameData;
  private scoreText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;
  private timeText: Phaser.GameObjects.Text;
  private gameTimer: Phaser.Time.TimerEvent;
  private isPaused: boolean = false;
  private pauseButton: Button;
  
  // Systems
  public audioSystem: AudioSystem;
  public saveSystem: SaveSystem;

  constructor() {
    super({ key: SCENES.MAIN_GAME });
  }

  init(): void {
    // Initialize systems
    this.saveSystem = new SaveSystem(this);
    this.audioSystem = new AudioSystem(this, this.saveSystem.getSettings());
    
    // Load game data
    this.gameData = this.saveSystem.getGameData();
  }

  create(): void {
    this.createWorld();
    this.createPlayer();
    this.createPlatforms();
    this.createCoins();
    this.createEnemies();
    this.createUI();
    this.setupInput();
    this.setupPhysics();
    this.setupGameTimer();
    this.setupEventListeners();
    
    // Start background music
    this.audioSystem.playMusic(AUDIO.MUSIC.MAIN_THEME);
    
    console.log('MainGameScene: Game started');
  }

  private createWorld(): void {
    // Create background
    this.add.image(400, 300, 'background');
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, 800, 600);
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(100, 450, 'player');
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1.5);
    
    // Player physics
    this.player.body.setGravityY(300);
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    
    // Create ground
    this.platforms.create(400, 568, 'platform').setScale(2, 1).refreshBody();
    
    // Create floating platforms
    this.platforms.create(600, 400, 'platform');
    this.platforms.create(50, 250, 'platform');
    this.platforms.create(750, 220, 'platform');
  }

  private createCoins(): void {
    this.coins = this.physics.add.group({
      key: 'coin',
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 70 }
    });
    
    this.coins.children.entries.forEach((coin: Phaser.Physics.Arcade.Sprite) => {
      coin.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
      coin.setCollideWorldBounds(true);
    });
  }

  private createEnemies(): void {
    this.enemies = this.physics.add.group();
    
    // Create a few enemies
    for (let i = 0; i < 3; i++) {
      const enemy = this.enemies.create(
        Phaser.Math.Between(200, 600),
        Phaser.Math.Between(100, 400),
        'enemy'
      );
      enemy.setBounce(1);
      enemy.setCollideWorldBounds(true);
      enemy.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }
  }

  private createUI(): void {
    // Score
    this.scoreText = this.add.text(16, 16, `Score: ${this.gameData.score}`, {
      fontSize: '20px',
      color: '#000000',
      fontFamily: 'Arial'
    });
    
    // Lives
    this.livesText = this.add.text(16, 48, `Lives: ${this.gameData.lives}`, {
      fontSize: '20px',
      color: '#000000',
      fontFamily: 'Arial'
    });
    
    // Time
    this.timeText = this.add.text(16, 80, `Time: ${this.gameData.time}`, {
      fontSize: '20px',
      color: '#000000',
      fontFamily: 'Arial'
    });
    
    // Pause button
    this.pauseButton = new Button(this, {
      x: 750,
      y: 50,
      texture: 'button',
      text: 'Pause',
      onClick: () => this.togglePause()
    });
    this.pauseButton.setSize(80, 40);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    
    // Pause key
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
  }

  private setupPhysics(): void {
    // Player collides with platforms
    this.physics.add.collider(this.player, this.platforms);
    
    // Coins collide with platforms
    this.physics.add.collider(this.coins, this.platforms);
    
    // Enemies collide with platforms
    this.physics.add.collider(this.enemies, this.platforms);
    
    // Player collects coins
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    
    // Player hits enemies
    this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);
  }

  private setupGameTimer(): void {
    this.gameTimer = this.time.addEvent({
      delay: 1000,
      callback: this.updateGameTime,
      callbackScope: this,
      loop: true
    });
  }

  private setupEventListeners(): void {
    this.events.on(EVENTS.GAME_OVER, this.handleGameOver, this);
    this.events.on(EVENTS.SCORE_UPDATE, this.updateScore, this);
    this.events.on(EVENTS.LEVEL_COMPLETE, this.handleLevelComplete, this);
  }

  private collectCoin(player: Phaser.Physics.Arcade.Sprite, coin: Phaser.Physics.Arcade.Sprite): void {
    coin.disableBody(true, true);
    
    // Update score
    this.gameData.score += 10;
    this.updateScore();
    
    // Play sound
    this.audioSystem.playSound(AUDIO.SFX.COLLECT);
    
    // Check if all coins collected
    if (this.coins.countActive(true) === 0) {
      this.events.emit(EVENTS.LEVEL_COMPLETE);
    }
  }

  private hitEnemy(player: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite): void {
    this.gameData.lives--;
    this.updateLives();
    
    if (this.gameData.lives <= 0) {
      this.events.emit(EVENTS.GAME_OVER);
    } else {
      // Reset player position
      this.player.setPosition(100, 450);
      this.player.setVelocity(0, 0);
    }
  }

  private updateScore(): void {
    this.scoreText.setText(`Score: ${this.gameData.score}`);
    this.events.emit(EVENTS.SCORE_UPDATE, this.gameData.score);
  }

  private updateLives(): void {
    this.livesText.setText(`Lives: ${this.gameData.lives}`);
  }

  private updateGameTime(): void {
    if (!this.isPaused) {
      this.gameData.time++;
      this.timeText.setText(`Time: ${this.gameData.time}`);
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.physics.pause();
      this.audioSystem.pauseAll();
      this.pauseButton.setText('Resume');
      this.events.emit(EVENTS.PAUSE_GAME);
    } else {
      this.physics.resume();
      this.audioSystem.resumeAll();
      this.pauseButton.setText('Pause');
      this.events.emit(EVENTS.RESUME_GAME);
    }
  }

  private handleGameOver(): void {
    this.physics.pause();
    this.audioSystem.stopMusic();
    
    // Save high score
    this.saveSystem.saveHighScore(this.gameData.score);
    
    // Game over text
    this.add.text(400, 300, 'GAME OVER', {
      fontSize: '48px',
      color: '#ff0000',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Restart button
    new Button(this, {
      x: 400,
      y: 380,
      texture: 'button',
      text: 'Restart',
      onClick: () => this.scene.restart()
    });
  }

  private handleLevelComplete(): void {
    this.gameData.level++;
    this.gameData.score += 100; // Bonus points
    
    // Level complete text
    this.add.text(400, 300, 'LEVEL COMPLETE!', {
      fontSize: '36px',
      color: '#00ff00',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Next level button
    new Button(this, {
      x: 400,
      y: 380,
      texture: 'button',
      text: 'Next Level',
      onClick: () => this.startNextLevel()
    });
  }

  private startNextLevel(): void {
    // Reset coins
    this.coins.children.entries.forEach((coin: Phaser.Physics.Arcade.Sprite) => {
      coin.enableBody(true, coin.x, 0, true, true);
    });
    
    // Reset player
    this.player.setPosition(100, 450);
    this.player.setVelocity(0, 0);
    
    // Save progress
    this.saveSystem.updateGameData(this.gameData);
    this.saveSystem.saveGame();
  }

  update(): void {
    if (this.isPaused) return;
    
    this.handlePlayerMovement();
    this.updateEnemies();
  }

  private handlePlayerMovement(): void {
    const isLeftPressed = this.cursors.left.isDown || this.wasd.A.isDown;
    const isRightPressed = this.cursors.right.isDown || this.wasd.D.isDown;
    const isUpPressed = this.cursors.up.isDown || this.wasd.W.isDown;
    
    if (isLeftPressed) {
      this.player.setVelocityX(-160);
      this.player.anims.play('player-walk', true);
      this.player.setFlipX(true);
    } else if (isRightPressed) {
      this.player.setVelocityX(160);
      this.player.anims.play('player-walk', true);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.stop();
    }
    
    if (isUpPressed && this.player.body.touching.down) {
      this.player.setVelocityY(-330);
      this.audioSystem.playSound(AUDIO.SFX.JUMP);
    }
  }

  private updateEnemies(): void {
    this.enemies.children.entries.forEach((enemy: Phaser.Physics.Arcade.Sprite) => {
      // Simple AI - change direction occasionally
      if (Math.random() < 0.005) {
        enemy.setVelocityX(Phaser.Math.Between(-200, 200));
      }
    });
  }

  destroy(): void {
    if (this.gameTimer) {
      this.gameTimer.destroy();
    }
    
    if (this.audioSystem) {
      this.audioSystem.destroy();
    }
    
    if (this.saveSystem) {
      this.saveSystem.destroy();
    }
    
    super.destroy();
  }
}