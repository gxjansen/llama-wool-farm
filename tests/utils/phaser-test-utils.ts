import * as Phaser from 'phaser';
import { jest } from '@jest/globals';

/**
 * Mock Phaser Game instance for testing
 */
export function createMockGame(config?: Partial<Phaser.Types.Core.GameConfig>): Phaser.Game {
  const defaultConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.HEADLESS,
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
      },
    },
    scene: [],
    ...config,
  };

  // Mock canvas element
  const canvas = document.createElement('canvas');
  canvas.width = defaultConfig.width as number;
  canvas.height = defaultConfig.height as number;

  // Create game instance
  const game = new Phaser.Game(defaultConfig);
  
  // Mock common game properties
  (game as any).canvas = canvas;
  (game as any).context = canvas.getContext('2d');

  return game;
}

/**
 * Mock Phaser Scene for testing
 */
export class MockScene extends Phaser.Scene {
  constructor(key: string = 'MockScene') {
    super({ key });
  }

  preload(): void {
    // Override in tests
  }

  create(): void {
    // Override in tests
  }

  update(): void {
    // Override in tests
  }
}

/**
 * Create a mock sprite for testing
 */
export function createMockSprite(
  scene: Phaser.Scene,
  x: number = 0,
  y: number = 0,
  texture: string = 'mockTexture',
): Phaser.GameObjects.Sprite {
  // Mock texture if it doesn't exist
  if (!scene.textures.exists(texture)) {
    const mockTexture = scene.textures.createCanvas(texture, 32, 32);
    if (mockTexture) {
      const ctx = mockTexture.getContext();
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 32, 32);
      mockTexture.refresh();
    }
  }

  return scene.add.sprite(x, y, texture);
}

/**
 * Create a mock text object for testing
 */
export function createMockText(
  scene: Phaser.Scene,
  x: number = 0,
  y: number = 0,
  text: string = 'Mock Text',
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, style);
}

/**
 * Mock timer event for testing
 */
export function createMockTimerEvent(
  scene: Phaser.Scene,
  delay: number,
  callback: () => void,
  loop: boolean = false,
): Phaser.Time.TimerEvent {
  return scene.time.addEvent({
    delay,
    callback,
    loop,
  });
}

/**
 * Advance Phaser game time for testing
 */
export function advanceTime(game: Phaser.Game, deltaMs: number): void {
  const scenes = game.scene.getScenes(false);
  scenes.forEach((scene) => {
    if (scene.sys && scene.sys.time) {
      scene.sys.time.update(scene.sys.time.now, deltaMs);
    }
  });
}

/**
 * Wait for a specific number of game frames
 */
export async function waitFrames(game: Phaser.Game, frames: number): Promise<void> {
  for (let i = 0; i < frames; i++) {
    game.step(0, 16.67); // ~60fps
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * Mock input pointer for testing
 */
export function createMockPointer(scene: Phaser.Scene): Phaser.Input.Pointer {
  const pointer = new Phaser.Input.Pointer(
    scene.input.manager,
    0, // id
  );
  
  // Set default properties
  pointer.x = 0;
  pointer.y = 0;
  pointer.isDown = false;
  
  return pointer;
}

/**
 * Simulate pointer click on a game object
 */
export function simulatePointerClick(
  gameObject: Phaser.GameObjects.GameObject,
  x?: number,
  y?: number,
): void {
  const pointer = createMockPointer(gameObject.scene);
  
  if (x !== undefined && y !== undefined) {
    pointer.x = x;
    pointer.y = y;
  } else if ('x' in gameObject && 'y' in gameObject) {
    pointer.x = gameObject.x as number;
    pointer.y = gameObject.y as number;
  }

  // Emit pointer down event
  pointer.isDown = true;
  gameObject.emit('pointerdown', pointer);
  
  // Emit pointer up event
  pointer.isDown = false;
  gameObject.emit('pointerup', pointer);
  gameObject.emit('pointerclick', pointer);
}

/**
 * Mock audio context for testing sounds
 */
export function createMockAudioContext(): AudioContext {
  const mockContext = {
    createGain: jest.fn().mockReturnValue({
      connect: jest.fn(),
      gain: { value: 1 },
    }),
    createOscillator: jest.fn().mockReturnValue({
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: { value: 440 },
    }),
    createBufferSource: jest.fn().mockReturnValue({
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      buffer: null,
    }),
    decodeAudioData: jest.fn().mockResolvedValue({}),
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
    state: 'running' as AudioContextState,
  };

  return mockContext as unknown as AudioContext;
}

/**
 * Create mock save data for testing
 */
export function createMockSaveData(): any {
  return {
    version: '1.0.0',
    timestamp: Date.now(),
    gameState: {
      wool: 0,
      llamas: 1,
      buildings: {},
      upgrades: {},
      achievements: [],
      statistics: {
        totalWool: 0,
        totalClicks: 0,
        totalLlamas: 1,
        playTime: 0,
      },
    },
    settings: {
      musicVolume: 1,
      sfxVolume: 1,
      autoSave: true,
      notifications: true,
    },
  };
}

/**
 * Clean up Phaser game instance
 */
export function destroyGame(game: Phaser.Game): void {
  if (game && !game.isDestroyed) {
    game.destroy(true, false);
  }
}

/**
 * Test helper to check if a scene is active
 */
export function isSceneActive(game: Phaser.Game, sceneKey: string): boolean {
  return game.scene.isActive(sceneKey);
}

/**
 * Test helper to get scene data
 */
export function getSceneData<T = any>(scene: Phaser.Scene, key: string): T | undefined {
  return scene.data.get(key);
}

/**
 * Mock texture for testing without loading actual assets
 */
export function createMockTexture(
  scene: Phaser.Scene,
  key: string,
  width: number = 32,
  height: number = 32,
  color: string = '#00ff00',
): Phaser.Textures.CanvasTexture | null {
  const texture = scene.textures.createCanvas(key, width, height);
  if (texture) {
    const ctx = texture.getContext();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    texture.refresh();
  }
  return texture;
}

/**
 * Helper to test tween animations
 */
export function createMockTween(
  scene: Phaser.Scene,
  target: any,
  props: any,
  duration: number = 1000,
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    ...props,
    duration,
  });
}

/**
 * Fast-forward all active tweens in a scene
 */
export function completeTweens(scene: Phaser.Scene): void {
  const tweens = scene.tweens.getAllTweens();
  tweens.forEach((tween) => {
    tween.complete();
  });
}

export default {
  createMockGame,
  MockScene,
  createMockSprite,
  createMockText,
  createMockTimerEvent,
  advanceTime,
  waitFrames,
  createMockPointer,
  simulatePointerClick,
  createMockAudioContext,
  createMockSaveData,
  destroyGame,
  isSceneActive,
  getSceneData,
  createMockTexture,
  createMockTween,
  completeTweens,
};