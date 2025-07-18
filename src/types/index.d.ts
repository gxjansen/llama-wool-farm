export interface GameData {
  level: number;
  score: number;
  lives: number;
  time: number;
  powerUps: string[];
  achievements: string[];
  lastSaved: number;
}

export interface SceneData {
  [key: string]: any;
}

export interface AudioConfig {
  key: string;
  volume?: number;
  loop?: boolean;
  rate?: number;
}

export interface ButtonConfig {
  x: number;
  y: number;
  texture: string;
  text?: string;
  textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
  onClick?: () => void;
  onHover?: () => void;
  onOut?: () => void;
}

export interface ProgressBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: number;
  fillColor: number;
  borderColor?: number;
  borderWidth?: number;
}

export interface GameEvent {
  type: string;
  data?: any;
  timestamp: number;
}

export interface SaveData {
  gameData: GameData;
  settings: import('../data/GameConfig').GameSettings;
  timestamp: number;
  version: string;
}

// Extend Phaser types
declare global {
  namespace Phaser {
    interface Scene {
      audioSystem?: import('../systems/AudioSystem').AudioSystem;
      saveSystem?: import('../systems/SaveSystem').SaveSystem;
    }
  }
}

export {};