import { AudioConfig, GameEvent } from '../types';
import { AUDIO, EVENTS } from '../data/Constants';
import { GameSettings } from '../data/GameConfig';

export class AudioSystem {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private music: Phaser.Sound.BaseSound | null = null;
  private settings: GameSettings;
  private eventEmitter: Phaser.Events.EventEmitter;

  constructor(scene: Phaser.Scene, settings: GameSettings) {
    this.scene = scene;
    this.settings = settings;
    this.eventEmitter = new Phaser.Events.EventEmitter();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventEmitter.on(EVENTS.PAUSE_GAME, this.pauseAll, this);
    this.eventEmitter.on(EVENTS.RESUME_GAME, this.resumeAll, this);
  }

  public playSound(key: string, config?: AudioConfig): void {
    if (!this.settings.soundEnabled) return;

    const sound = this.scene.sound.add(key, {
      volume: (config?.volume || 1) * this.settings.sfxVolume * this.settings.masterVolume,
      loop: config?.loop || false,
      rate: config?.rate || 1
    });

    this.sounds.set(key, sound);
    sound.play();
  }

  public playMusic(key: string, config?: AudioConfig): void {
    if (!this.settings.musicEnabled) return;

    this.stopMusic();
    
    this.music = this.scene.sound.add(key, {
      volume: (config?.volume || 1) * this.settings.musicVolume * this.settings.masterVolume,
      loop: config?.loop !== false,
      rate: config?.rate || 1
    });

    this.music.play();
  }

  public stopMusic(): void {
    if (this.music) {
      this.music.stop();
      this.music = null;
    }
  }

  public stopSound(key: string): void {
    const sound = this.sounds.get(key);
    if (sound) {
      sound.stop();
      this.sounds.delete(key);
    }
  }

  public pauseAll(): void {
    this.scene.sound.pauseAll();
  }

  public resumeAll(): void {
    this.scene.sound.resumeAll();
  }

  public setMasterVolume(volume: number): void {
    this.settings.masterVolume = Phaser.Math.Clamp(volume, 0, 1);
    this.scene.sound.volume = this.settings.masterVolume;
  }

  public setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
  }

  public setMusicVolume(volume: number): void {
    this.settings.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    if (this.music) {
      this.music.setVolume(this.settings.musicVolume * this.settings.masterVolume);
    }
  }

  public toggleSound(): void {
    this.settings.soundEnabled = !this.settings.soundEnabled;
    if (!this.settings.soundEnabled) {
      this.sounds.forEach(sound => sound.stop());
      this.sounds.clear();
    }
  }

  public toggleMusic(): void {
    this.settings.musicEnabled = !this.settings.musicEnabled;
    if (!this.settings.musicEnabled) {
      this.stopMusic();
    }
  }

  public destroy(): void {
    this.sounds.forEach(sound => sound.destroy());
    this.sounds.clear();
    this.stopMusic();
    this.eventEmitter.removeAllListeners();
  }
}