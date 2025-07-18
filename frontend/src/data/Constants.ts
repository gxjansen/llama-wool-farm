export const GAME_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  BACKGROUND_COLOR: 0x2c3e50,
  PHYSICS: {
    GRAVITY: 300,
    BOUNCE: 0.7
  }
};

export const SCENES = {
  BOOT: 'BootScene',
  PRELOADER: 'PreloaderScene',
  MAIN_GAME: 'MainGameScene'
};

export const AUDIO = {
  MUSIC: {
    MAIN_THEME: 'main-theme',
    MENU_THEME: 'menu-theme'
  },
  SFX: {
    CLICK: 'click',
    JUMP: 'jump',
    COLLECT: 'collect'
  }
};

export const COLORS = {
  PRIMARY: 0x3498db,
  SECONDARY: 0xe74c3c,
  SUCCESS: 0x2ecc71,
  WARNING: 0xf39c12,
  WHITE: 0xffffff,
  BLACK: 0x000000
};

export const STORAGE_KEYS = {
  GAME_SAVE: 'game-save',
  SETTINGS: 'game-settings',
  HIGH_SCORE: 'high-score'
};

export const EVENTS = {
  GAME_OVER: 'game-over',
  SCORE_UPDATE: 'score-update',
  LEVEL_COMPLETE: 'level-complete',
  PAUSE_GAME: 'pause-game',
  RESUME_GAME: 'resume-game'
};