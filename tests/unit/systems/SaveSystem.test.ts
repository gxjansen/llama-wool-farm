import { WoolType, BuildingType } from '@/types/game.types';
import Decimal from 'decimal.js';

// Mock interfaces for save system
interface SaveData {
  version: string;
  timestamp: number;
  gameState: {
    wool: Record<string, string>;
    buildings: Record<string, any>;
    upgrades: any[];
    achievements: string[];
    statistics: {
      totalWool: string;
      totalClicks: number;
      totalLlamas: number;
      playTime: number;
      lastSaveTime: number;
    };
  };
  settings: {
    musicVolume: number;
    sfxVolume: number;
    autoSave: boolean;
    saveInterval: number;
    notifications: boolean;
  };
}

class SaveSystem {
  private storageKey: string;
  private currentVersion: string;
  private autoSaveInterval?: NodeJS.Timeout;

  constructor(storageKey: string = 'llama-wool-farm-save', version: string = '1.0.0') {
    this.storageKey = storageKey;
    this.currentVersion = version;
  }

  /**
   * Save game data to localStorage
   */
  save(data: SaveData): boolean {
    try {
      const saveString = JSON.stringify(data);
      
      // Compress if too large (basic compression simulation)
      if (saveString.length > 1000000) {
        console.warn('Save data is large, consider optimization');
      }
      
      localStorage.setItem(this.storageKey, saveString);
      
      // Create backup
      this.createBackup(saveString);
      
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  /**
   * Load game data from localStorage
   */
  load(): SaveData | null {
    try {
      const saveString = localStorage.getItem(this.storageKey);
      if (!saveString) {
        return null;
      }

      const data = JSON.parse(saveString) as SaveData;
      
      // Validate save data
      if (!this.validateSaveData(data)) {
        console.error('Invalid save data structure');
        return null;
      }

      // Handle version migration if needed
      if (data.version !== this.currentVersion) {
        return this.migrateSaveData(data);
      }

      return data;
    } catch (error) {
      console.error('Failed to load game:', error);
      
      // Try to load backup
      return this.loadBackup();
    }
  }

  /**
   * Delete save data
   */
  deleteSave(): boolean {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(`${this.storageKey}-backup`);
      return true;
    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  }

  /**
   * Export save data as base64 string
   */
  exportSave(data: SaveData): string {
    try {
      const saveString = JSON.stringify(data);
      return btoa(saveString);
    } catch (error) {
      console.error('Failed to export save:', error);
      return '';
    }
  }

  /**
   * Import save data from base64 string
   */
  importSave(base64String: string): SaveData | null {
    try {
      const saveString = atob(base64String);
      const data = JSON.parse(saveString) as SaveData;
      
      if (!this.validateSaveData(data)) {
        throw new Error('Invalid save data');
      }

      return data;
    } catch (error) {
      console.error('Failed to import save:', error);
      return null;
    }
  }

  /**
   * Setup auto-save
   */
  setupAutoSave(saveFunction: () => SaveData, intervalMs: number = 60000): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      const data = saveFunction();
      this.save(data);
      console.log('Auto-save completed');
    }, intervalMs);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
  }

  /**
   * Validate save data structure
   */
  private validateSaveData(data: any): data is SaveData {
    return (
      data &&
      typeof data.version === 'string' &&
      typeof data.timestamp === 'number' &&
      data.gameState &&
      typeof data.gameState.wool === 'object' &&
      typeof data.gameState.buildings === 'object' &&
      Array.isArray(data.gameState.upgrades) &&
      Array.isArray(data.gameState.achievements) &&
      data.gameState.statistics &&
      data.settings &&
      typeof data.settings.musicVolume === 'number' &&
      typeof data.settings.sfxVolume === 'number' &&
      typeof data.settings.autoSave === 'boolean'
    );
  }

  /**
   * Create backup of save data
   */
  private createBackup(saveString: string): void {
    try {
      localStorage.setItem(`${this.storageKey}-backup`, saveString);
    } catch (error) {
      console.warn('Failed to create backup:', error);
    }
  }

  /**
   * Load backup save data
   */
  private loadBackup(): SaveData | null {
    try {
      const backupString = localStorage.getItem(`${this.storageKey}-backup`);
      if (!backupString) {
        return null;
      }

      const data = JSON.parse(backupString) as SaveData;
      if (this.validateSaveData(data)) {
        console.log('Loaded from backup');
        return data;
      }
      return null;
    } catch (error) {
      console.error('Failed to load backup:', error);
      return null;
    }
  }

  /**
   * Migrate save data to current version
   */
  private migrateSaveData(data: SaveData): SaveData {
    console.log(`Migrating save from v${data.version} to v${this.currentVersion}`);
    
    // Example migrations
    if (data.version === '0.9.0') {
      // Add new fields introduced in 1.0.0
      if (!data.gameState.statistics.lastSaveTime) {
        data.gameState.statistics.lastSaveTime = data.timestamp;
      }
      if (!data.settings.saveInterval) {
        data.settings.saveInterval = 60000;
      }
    }

    // Update version
    data.version = this.currentVersion;
    return data;
  }

  /**
   * Get save data size in bytes
   */
  getSaveSize(): number {
    const saveString = localStorage.getItem(this.storageKey);
    return saveString ? new Blob([saveString]).size : 0;
  }

  /**
   * Check if save exists
   */
  hasSave(): boolean {
    return localStorage.getItem(this.storageKey) !== null;
  }
}

describe('SaveSystem', () => {
  let saveSystem: SaveSystem;
  let mockSaveData: SaveData;

  beforeEach(() => {
    saveSystem = new SaveSystem('test-save', '1.0.0');
    localStorage.clear();
    
    mockSaveData = {
      version: '1.0.0',
      timestamp: Date.now(),
      gameState: {
        wool: {
          [WoolType.Basic]: '1000',
          [WoolType.Fine]: '500',
          [WoolType.Exotic]: '100',
        },
        buildings: {
          [BuildingType.Pasture]: { level: 5, unlocked: true },
          [BuildingType.Barn]: { level: 2, unlocked: true },
        },
        upgrades: [
          { id: 'upgrade1', purchased: true },
        ],
        achievements: ['first_wool', 'first_building'],
        statistics: {
          totalWool: '1600',
          totalClicks: 250,
          totalLlamas: 10,
          playTime: 3600000,
          lastSaveTime: Date.now(),
        },
      },
      settings: {
        musicVolume: 0.8,
        sfxVolume: 0.9,
        autoSave: true,
        saveInterval: 60000,
        notifications: true,
      },
    };
  });

  afterEach(() => {
    saveSystem.stopAutoSave();
    localStorage.clear();
  });

  describe('save', () => {
    it('should save data to localStorage', () => {
      const result = saveSystem.save(mockSaveData);
      
      expect(result).toBe(true);
      expect(localStorage.getItem('test-save')).toBeTruthy();
    });

    it('should create backup when saving', () => {
      saveSystem.save(mockSaveData);
      
      expect(localStorage.getItem('test-save-backup')).toBeTruthy();
    });

    it('should handle save errors gracefully', () => {
      // Mock localStorage.setItem to throw
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('Storage full');
        });

      const result = saveSystem.save(mockSaveData);
      
      expect(result).toBe(false);
      setItemSpy.mockRestore();
    });
  });

  describe('load', () => {
    it('should load saved data', () => {
      saveSystem.save(mockSaveData);
      
      const loaded = saveSystem.load();
      
      expect(loaded).toEqual(mockSaveData);
    });

    it('should return null if no save exists', () => {
      const loaded = saveSystem.load();
      
      expect(loaded).toBeNull();
    });

    it('should validate save data structure', () => {
      const invalidData = { version: '1.0.0' }; // Missing required fields
      localStorage.setItem('test-save', JSON.stringify(invalidData));
      
      const loaded = saveSystem.load();
      
      expect(loaded).toBeNull();
    });

    it('should load from backup if main save is corrupted', () => {
      // Save valid data first (creates backup)
      saveSystem.save(mockSaveData);
      
      // Corrupt main save
      localStorage.setItem('test-save', 'corrupted{data');
      
      const loaded = saveSystem.load();
      
      expect(loaded).toEqual(mockSaveData);
    });

    it('should handle JSON parse errors', () => {
      localStorage.setItem('test-save', 'not valid json');
      
      const loaded = saveSystem.load();
      
      expect(loaded).toBeNull();
    });
  });

  describe('version migration', () => {
    it('should migrate old save data', () => {
      const oldSaveData = {
        ...mockSaveData,
        version: '0.9.0',
        settings: {
          ...mockSaveData.settings,
          saveInterval: undefined, // Missing in old version
        },
      };

      localStorage.setItem('test-save', JSON.stringify(oldSaveData));
      
      const loaded = saveSystem.load();
      
      expect(loaded?.version).toBe('1.0.0');
      expect(loaded?.settings.saveInterval).toBe(60000);
    });

    it('should preserve data during migration', () => {
      const oldSaveData = {
        ...mockSaveData,
        version: '0.9.0',
      };

      localStorage.setItem('test-save', JSON.stringify(oldSaveData));
      
      const loaded = saveSystem.load();
      
      expect(loaded?.gameState.wool[WoolType.Basic]).toBe('1000');
      expect(loaded?.gameState.buildings[BuildingType.Pasture].level).toBe(5);
    });
  });

  describe('export/import', () => {
    it('should export save as base64', () => {
      const exported = saveSystem.exportSave(mockSaveData);
      
      expect(exported).toBeTruthy();
      expect(() => atob(exported)).not.toThrow();
    });

    it('should import valid base64 save', () => {
      const exported = saveSystem.exportSave(mockSaveData);
      const imported = saveSystem.importSave(exported);
      
      expect(imported).toEqual(mockSaveData);
    });

    it('should reject invalid base64', () => {
      const imported = saveSystem.importSave('not-valid-base64!@#');
      
      expect(imported).toBeNull();
    });

    it('should validate imported data', () => {
      const invalidData = { version: '1.0.0' };
      const exported = btoa(JSON.stringify(invalidData));
      
      const imported = saveSystem.importSave(exported);
      
      expect(imported).toBeNull();
    });
  });

  describe('auto-save', () => {
    jest.useFakeTimers();

    it('should setup auto-save interval', () => {
      const saveFunction = jest.fn(() => mockSaveData);
      
      saveSystem.setupAutoSave(saveFunction, 1000);
      
      expect(saveFunction).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(1000);
      expect(saveFunction).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(1000);
      expect(saveFunction).toHaveBeenCalledTimes(2);
    });

    it('should stop auto-save', () => {
      const saveFunction = jest.fn(() => mockSaveData);
      
      saveSystem.setupAutoSave(saveFunction, 1000);
      saveSystem.stopAutoSave();
      
      jest.advanceTimersByTime(2000);
      expect(saveFunction).not.toHaveBeenCalled();
    });

    it('should replace existing auto-save interval', () => {
      const saveFunction1 = jest.fn(() => mockSaveData);
      const saveFunction2 = jest.fn(() => mockSaveData);
      
      saveSystem.setupAutoSave(saveFunction1, 1000);
      saveSystem.setupAutoSave(saveFunction2, 1000);
      
      jest.advanceTimersByTime(1000);
      
      expect(saveFunction1).not.toHaveBeenCalled();
      expect(saveFunction2).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  describe('utility methods', () => {
    it('should check if save exists', () => {
      expect(saveSystem.hasSave()).toBe(false);
      
      saveSystem.save(mockSaveData);
      
      expect(saveSystem.hasSave()).toBe(true);
    });

    it('should get save size', () => {
      expect(saveSystem.getSaveSize()).toBe(0);
      
      saveSystem.save(mockSaveData);
      
      const size = saveSystem.getSaveSize();
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(10000); // Reasonable size for test data
    });

    it('should delete save and backup', () => {
      saveSystem.save(mockSaveData);
      
      expect(localStorage.getItem('test-save')).toBeTruthy();
      expect(localStorage.getItem('test-save-backup')).toBeTruthy();
      
      const result = saveSystem.deleteSave();
      
      expect(result).toBe(true);
      expect(localStorage.getItem('test-save')).toBeNull();
      expect(localStorage.getItem('test-save-backup')).toBeNull();
    });
  });
});