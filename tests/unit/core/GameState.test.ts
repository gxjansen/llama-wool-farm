import { createMockGame, MockScene, destroyGame } from '@/tests/utils/phaser-test-utils';
import { WoolType, BuildingType } from '@/types/game.types';
import Decimal from 'decimal.js';
import * as Phaser from 'phaser';

// Mock GameState class for testing
class GameState {
  private wool: Map<WoolType, Decimal>;
  private buildings: Map<BuildingType, { level: number; unlocked: boolean }>;
  private totalClicks: number;
  private gameStartTime: number;
  private lastSaveTime: number;
  private version: string;

  constructor() {
    this.wool = new Map();
    this.buildings = new Map();
    this.totalClicks = 0;
    this.gameStartTime = Date.now();
    this.lastSaveTime = Date.now();
    this.version = '1.0.0';

    // Initialize wool types
    Object.values(WoolType).forEach(type => {
      this.wool.set(type, new Decimal(0));
    });

    // Initialize buildings
    Object.values(BuildingType).forEach(type => {
      this.buildings.set(type, { level: 0, unlocked: false });
    });
  }

  // Wool management
  addWool(type: WoolType, amount: Decimal | number): void {
    const current = this.wool.get(type) || new Decimal(0);
    this.wool.set(type, current.plus(amount));
  }

  subtractWool(type: WoolType, amount: Decimal | number): boolean {
    const current = this.wool.get(type) || new Decimal(0);
    const amountDecimal = new Decimal(amount);
    
    if (current.gte(amountDecimal)) {
      this.wool.set(type, current.minus(amountDecimal));
      return true;
    }
    return false;
  }

  getWool(type: WoolType): Decimal {
    return this.wool.get(type) || new Decimal(0);
  }

  getTotalWool(): Decimal {
    let total = new Decimal(0);
    this.wool.forEach(amount => {
      total = total.plus(amount);
    });
    return total;
  }

  // Building management
  purchaseBuilding(type: BuildingType, cost: Decimal): boolean {
    if (this.subtractWool(WoolType.Basic, cost)) {
      const building = this.buildings.get(type)!;
      building.level++;
      building.unlocked = true;
      return true;
    }
    return false;
  }

  getBuildingLevel(type: BuildingType): number {
    return this.buildings.get(type)?.level || 0;
  }

  isBuildingUnlocked(type: BuildingType): boolean {
    return this.buildings.get(type)?.unlocked || false;
  }

  // Game statistics
  incrementClicks(): void {
    this.totalClicks++;
  }

  getPlayTime(): number {
    return Date.now() - this.gameStartTime;
  }

  // Save/Load functionality
  getSaveData(): any {
    const woolData: Record<string, string> = {};
    this.wool.forEach((amount, type) => {
      woolData[type] = amount.toString();
    });

    const buildingData: Record<string, any> = {};
    this.buildings.forEach((building, type) => {
      buildingData[type] = {
        level: building.level,
        unlocked: building.unlocked,
      };
    });

    return {
      version: this.version,
      timestamp: Date.now(),
      wool: woolData,
      buildings: buildingData,
      statistics: {
        totalClicks: this.totalClicks,
        playTime: this.getPlayTime(),
        gameStartTime: this.gameStartTime,
      },
    };
  }

  loadSaveData(data: any): boolean {
    try {
      // Validate version
      if (data.version !== this.version) {
        console.warn(`Save version mismatch: ${data.version} vs ${this.version}`);
      }

      // Load wool
      if (data.wool) {
        Object.entries(data.wool).forEach(([type, amount]) => {
          this.wool.set(type as WoolType, new Decimal(amount as string));
        });
      }

      // Load buildings
      if (data.buildings) {
        Object.entries(data.buildings).forEach(([type, building]: [string, any]) => {
          this.buildings.set(type as BuildingType, {
            level: building.level || 0,
            unlocked: building.unlocked || false,
          });
        });
      }

      // Load statistics
      if (data.statistics) {
        this.totalClicks = data.statistics.totalClicks || 0;
        this.gameStartTime = data.statistics.gameStartTime || Date.now();
      }

      this.lastSaveTime = Date.now();
      return true;
    } catch (error) {
      console.error('Failed to load save data:', error);
      return false;
    }
  }

  reset(): void {
    this.wool.clear();
    this.buildings.clear();
    this.totalClicks = 0;
    this.gameStartTime = Date.now();
    this.lastSaveTime = Date.now();

    // Reinitialize
    Object.values(WoolType).forEach(type => {
      this.wool.set(type, new Decimal(0));
    });

    Object.values(BuildingType).forEach(type => {
      this.buildings.set(type, { level: 0, unlocked: false });
    });
  }
}

describe('GameState', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  describe('Wool Management', () => {
    it('should initialize all wool types with 0', () => {
      Object.values(WoolType).forEach(type => {
        expect(gameState.getWool(type).toNumber()).toBe(0);
      });
    });

    it('should add wool correctly', () => {
      gameState.addWool(WoolType.Basic, 100);
      expect(gameState.getWool(WoolType.Basic).toNumber()).toBe(100);

      gameState.addWool(WoolType.Basic, new Decimal(50.5));
      expect(gameState.getWool(WoolType.Basic).toNumber()).toBe(150.5);
    });

    it('should subtract wool when sufficient', () => {
      gameState.addWool(WoolType.Basic, 100);
      
      const success = gameState.subtractWool(WoolType.Basic, 50);
      expect(success).toBe(true);
      expect(gameState.getWool(WoolType.Basic).toNumber()).toBe(50);
    });

    it('should not subtract wool when insufficient', () => {
      gameState.addWool(WoolType.Basic, 30);
      
      const success = gameState.subtractWool(WoolType.Basic, 50);
      expect(success).toBe(false);
      expect(gameState.getWool(WoolType.Basic).toNumber()).toBe(30);
    });

    it('should calculate total wool correctly', () => {
      gameState.addWool(WoolType.Basic, 100);
      gameState.addWool(WoolType.Fine, 50);
      gameState.addWool(WoolType.Exotic, 25);

      expect(gameState.getTotalWool().toNumber()).toBe(175);
    });

    it('should handle Decimal precision correctly', () => {
      gameState.addWool(WoolType.Basic, new Decimal('0.1'));
      gameState.addWool(WoolType.Basic, new Decimal('0.2'));
      
      expect(gameState.getWool(WoolType.Basic).toNumber()).toBeCloseTo(0.3);
    });
  });

  describe('Building Management', () => {
    it('should initialize all buildings as locked with level 0', () => {
      Object.values(BuildingType).forEach(type => {
        expect(gameState.getBuildingLevel(type)).toBe(0);
        expect(gameState.isBuildingUnlocked(type)).toBe(false);
      });
    });

    it('should purchase building when enough wool', () => {
      gameState.addWool(WoolType.Basic, 100);
      
      const success = gameState.purchaseBuilding(BuildingType.Pasture, new Decimal(50));
      expect(success).toBe(true);
      expect(gameState.getBuildingLevel(BuildingType.Pasture)).toBe(1);
      expect(gameState.isBuildingUnlocked(BuildingType.Pasture)).toBe(true);
      expect(gameState.getWool(WoolType.Basic).toNumber()).toBe(50);
    });

    it('should not purchase building when insufficient wool', () => {
      gameState.addWool(WoolType.Basic, 30);
      
      const success = gameState.purchaseBuilding(BuildingType.Pasture, new Decimal(50));
      expect(success).toBe(false);
      expect(gameState.getBuildingLevel(BuildingType.Pasture)).toBe(0);
      expect(gameState.isBuildingUnlocked(BuildingType.Pasture)).toBe(false);
    });

    it('should upgrade building levels', () => {
      gameState.addWool(WoolType.Basic, 500);
      
      gameState.purchaseBuilding(BuildingType.Pasture, new Decimal(50));
      gameState.purchaseBuilding(BuildingType.Pasture, new Decimal(100));
      gameState.purchaseBuilding(BuildingType.Pasture, new Decimal(150));
      
      expect(gameState.getBuildingLevel(BuildingType.Pasture)).toBe(3);
    });
  });

  describe('Game Statistics', () => {
    it('should track clicks', () => {
      expect(gameState['totalClicks']).toBe(0);
      
      gameState.incrementClicks();
      gameState.incrementClicks();
      gameState.incrementClicks();
      
      expect(gameState['totalClicks']).toBe(3);
    });

    it('should track play time', () => {
      const startTime = Date.now();
      
      // Wait a bit
      jest.advanceTimersByTime(1000);
      
      const playTime = gameState.getPlayTime();
      expect(playTime).toBeGreaterThanOrEqual(0);
      expect(playTime).toBeLessThan(2000);
    });
  });

  describe('Save/Load System', () => {
    it('should save game state correctly', () => {
      // Set up game state
      gameState.addWool(WoolType.Basic, 100);
      gameState.addWool(WoolType.Fine, 50);
      gameState.purchaseBuilding(BuildingType.Pasture, new Decimal(10));
      gameState.incrementClicks();
      gameState.incrementClicks();

      const saveData = gameState.getSaveData();
      
      expect(saveData.version).toBe('1.0.0');
      expect(saveData.timestamp).toBeDefined();
      expect(saveData.wool[WoolType.Basic]).toBe('90'); // 100 - 10 for building
      expect(saveData.wool[WoolType.Fine]).toBe('50');
      expect(saveData.buildings[BuildingType.Pasture]).toEqual({
        level: 1,
        unlocked: true,
      });
      expect(saveData.statistics.totalClicks).toBe(2);
    });

    it('should load save data correctly', () => {
      const saveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        wool: {
          [WoolType.Basic]: '250.5',
          [WoolType.Fine]: '125.25',
          [WoolType.Exotic]: '10',
        },
        buildings: {
          [BuildingType.Pasture]: { level: 5, unlocked: true },
          [BuildingType.Barn]: { level: 2, unlocked: true },
        },
        statistics: {
          totalClicks: 150,
          playTime: 3600000,
          gameStartTime: Date.now() - 3600000,
        },
      };

      const success = gameState.loadSaveData(saveData);
      
      expect(success).toBe(true);
      expect(gameState.getWool(WoolType.Basic).toNumber()).toBe(250.5);
      expect(gameState.getWool(WoolType.Fine).toNumber()).toBe(125.25);
      expect(gameState.getWool(WoolType.Exotic).toNumber()).toBe(10);
      expect(gameState.getBuildingLevel(BuildingType.Pasture)).toBe(5);
      expect(gameState.getBuildingLevel(BuildingType.Barn)).toBe(2);
      expect(gameState['totalClicks']).toBe(150);
    });

    it('should handle corrupted save data gracefully', () => {
      const corruptedData = {
        version: '1.0.0',
        wool: 'not an object',
        buildings: null,
      };

      const success = gameState.loadSaveData(corruptedData);
      
      expect(success).toBe(true); // Should still return true but log error
      expect(gameState.getWool(WoolType.Basic).toNumber()).toBe(0);
    });

    it('should handle version mismatch', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const oldSaveData = {
        version: '0.9.0',
        timestamp: Date.now(),
        wool: { [WoolType.Basic]: '100' },
      };

      gameState.loadSaveData(oldSaveData);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Save version mismatch')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all game state', () => {
      // Set up game state
      gameState.addWool(WoolType.Basic, 1000);
      gameState.purchaseBuilding(BuildingType.Pasture, new Decimal(100));
      gameState.incrementClicks();

      // Reset
      gameState.reset();

      // Check everything is reset
      Object.values(WoolType).forEach(type => {
        expect(gameState.getWool(type).toNumber()).toBe(0);
      });
      
      Object.values(BuildingType).forEach(type => {
        expect(gameState.getBuildingLevel(type)).toBe(0);
        expect(gameState.isBuildingUnlocked(type)).toBe(false);
      });
      
      expect(gameState['totalClicks']).toBe(0);
    });
  });
});