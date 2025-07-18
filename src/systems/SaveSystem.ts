import { GameData, SaveData } from '../types';
import { STORAGE_KEYS } from '../data/Constants';
import { GameSettings, DEFAULT_SETTINGS } from '../data/GameConfig';

export class SaveSystem {
  private gameData: GameData;
  private settings: GameSettings;
  private autoSaveInterval: number = 30000; // 30 seconds
  private autoSaveTimer: Phaser.Time.TimerEvent | null = null;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gameData = this.getDefaultGameData();
    this.settings = this.loadSettings();
    this.setupAutoSave();
  }

  private getDefaultGameData(): GameData {
    return {
      level: 1,
      score: 0,
      lives: 3,
      time: 0,
      powerUps: [],
      achievements: [],
      lastSaved: Date.now()
    };
  }

  private setupAutoSave(): void {
    if (this.settings.autoSave) {
      this.autoSaveTimer = this.scene.time.addEvent({
        delay: this.autoSaveInterval,
        callback: this.autoSave,
        callbackScope: this,
        loop: true
      });
    }
  }

  public saveGame(): boolean {
    try {
      const saveData: SaveData = {
        gameData: { ...this.gameData, lastSaved: Date.now() },
        settings: this.settings,
        timestamp: Date.now(),
        version: '1.0.0'
      };

      localStorage.setItem(STORAGE_KEYS.GAME_SAVE, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  public loadGame(): boolean {
    try {
      const saveDataString = localStorage.getItem(STORAGE_KEYS.GAME_SAVE);
      if (!saveDataString) return false;

      const saveData: SaveData = JSON.parse(saveDataString);
      this.gameData = saveData.gameData;
      this.settings = { ...DEFAULT_SETTINGS, ...saveData.settings };
      
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  public hasSaveData(): boolean {
    return localStorage.getItem(STORAGE_KEYS.GAME_SAVE) !== null;
  }

  public deleteSave(): void {
    localStorage.removeItem(STORAGE_KEYS.GAME_SAVE);
    this.gameData = this.getDefaultGameData();
  }

  public saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  public loadSettings(): GameSettings {
    try {
      const settingsString = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!settingsString) return { ...DEFAULT_SETTINGS };

      const settings = JSON.parse(settingsString);
      return { ...DEFAULT_SETTINGS, ...settings };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  public updateGameData(data: Partial<GameData>): void {
    this.gameData = { ...this.gameData, ...data };
  }

  public getGameData(): GameData {
    return { ...this.gameData };
  }

  public updateSettings(settings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public saveHighScore(score: number): void {
    try {
      const currentHighScore = parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) || '0');
      if (score > currentHighScore) {
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, score.toString());
      }
    } catch (error) {
      console.error('Failed to save high score:', error);
    }
  }

  public getHighScore(): number {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) || '0');
    } catch (error) {
      console.error('Failed to get high score:', error);
      return 0;
    }
  }

  private autoSave(): void {
    if (this.settings.autoSave) {
      this.saveGame();
    }
  }

  public destroy(): void {
    if (this.autoSaveTimer) {
      this.autoSaveTimer.destroy();
      this.autoSaveTimer = null;
    }
  }
}