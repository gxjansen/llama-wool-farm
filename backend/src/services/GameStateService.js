/**
 * Game State Service
 * Handles all game state management and calculations
 */

const { logger } = require('../utils/logger');
const { redis } = require('../config/redis');
const { GameSave } = require('../models/GameSave');
const { Player } = require('../models/Player');
const { ProductionService } = require('./ProductionService');
const { ValidationService } = require('./ValidationService');
const Decimal = require('decimal.js');

class GameStateService {
  /**
   * Get current game state for a player
   */
  static async getState(playerId) {
    try {
      // Try Redis cache first
      const cached = await redis.get(`gamestate:${playerId}`);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Fallback to database
      const gameState = await GameSave.findOne({ playerId }).sort({ timestamp: -1 });
      
      if (!gameState) {
        // Create new game state
        const newState = this.createInitialState(playerId);
        await this.saveState(playerId, newState);
        return newState;
      }
      
      // Update cache
      await redis.setex(`gamestate:${playerId}`, 300, JSON.stringify(gameState)); // 5 min cache
      
      return gameState;
    } catch (error) {
      logger.error('Error getting game state:', error);
      throw error;
    }
  }
  
  /**
   * Create initial game state for new player
   */
  static createInitialState(playerId) {
    return {
      playerId,
      version: '1.0.0',
      timestamp: Date.now(),
      
      // Resources
      woolCounts: {
        basic: '0',
        silver: '0',
        golden: '0',
        rainbow: '0',
        cosmic: '0',
        ethereal: '0',
        temporal: '0',
        dimensional: '0',
        celestial: '0',
        quantum: '0'
      },
      
      soulShears: '0',
      goldenFleece: '0',
      totalWoolProduced: '0',
      totalClicks: 0,
      
      // Buildings
      buildings: {
        barn: { level: 0, unlocked: true },
        shears: { level: 0, unlocked: false },
        transport: { level: 0, unlocked: false },
        factory: { level: 0, unlocked: false },
        lab: { level: 0, unlocked: false },
        portal: { level: 0, unlocked: false },
        timeMachine: { level: 0, unlocked: false },
        dimensionGate: { level: 0, unlocked: false }
      },
      
      // Upgrades
      purchasedUpgrades: [],
      
      // Progress
      totalPrestiges: 0,
      playTime: 0,
      lastSaveTime: Date.now(),
      
      // Achievements
      unlockedAchievements: [],
      
      // Game state
      gameState: 'playing',
      
      // Settings
      settings: {
        masterVolume: 1.0,
        sfxVolume: 1.0,
        musicVolume: 0.7,
        particles: true,
        autoSave: true,
        cloudSync: true,
        notifications: true,
        reducedMotion: false,
        colorBlindMode: false,
        language: 'en'
      }
    };
  }
  
  /**
   * Update game state
   */
  static async updateState(playerId, stateUpdate) {
    try {
      const currentState = await this.getState(playerId);
      
      // Validate state update
      const validationResult = await ValidationService.validateStateUpdate(
        currentState, 
        stateUpdate
      );
      
      if (!validationResult.valid) {
        throw new Error(`Invalid state update: ${validationResult.error}`);
      }
      
      // Apply state update
      const updatedState = this.applyStateUpdate(currentState, stateUpdate);
      
      // Save updated state
      await this.saveState(playerId, updatedState);
      
      return updatedState;
    } catch (error) {
      logger.error('Error updating game state:', error);
      throw error;
    }
  }
  
  /**
   * Apply state update to current state
   */
  static applyStateUpdate(currentState, stateUpdate) {
    const updatedState = { ...currentState };
    
    // Update timestamp
    updatedState.timestamp = Date.now();
    
    // Update resources
    if (stateUpdate.woolCounts) {
      for (const [woolType, amount] of Object.entries(stateUpdate.woolCounts)) {
        const current = new Decimal(updatedState.woolCounts[woolType] || '0');
        const change = new Decimal(amount);
        updatedState.woolCounts[woolType] = current.plus(change).toString();
      }
    }
    
    // Update buildings
    if (stateUpdate.buildings) {
      for (const [buildingType, data] of Object.entries(stateUpdate.buildings)) {
        updatedState.buildings[buildingType] = {
          ...updatedState.buildings[buildingType],
          ...data
        };
      }
    }
    
    // Update upgrades
    if (stateUpdate.purchasedUpgrades) {
      updatedState.purchasedUpgrades = [
        ...new Set([...updatedState.purchasedUpgrades, ...stateUpdate.purchasedUpgrades])
      ];
    }
    
    // Update achievements
    if (stateUpdate.unlockedAchievements) {
      updatedState.unlockedAchievements = [
        ...new Set([...updatedState.unlockedAchievements, ...stateUpdate.unlockedAchievements])
      ];
    }
    
    // Update other fields
    if (stateUpdate.soulShears) {
      updatedState.soulShears = stateUpdate.soulShears;
    }
    
    if (stateUpdate.goldenFleece) {
      updatedState.goldenFleece = stateUpdate.goldenFleece;
    }
    
    if (stateUpdate.totalClicks) {
      updatedState.totalClicks += stateUpdate.totalClicks;
    }
    
    // Update total wool produced
    if (stateUpdate.woolCounts) {
      const totalProduced = Object.values(updatedState.woolCounts)
        .reduce((sum, amount) => sum.plus(new Decimal(amount)), new Decimal('0'));
      updatedState.totalWoolProduced = totalProduced.toString();
    }
    
    return updatedState;
  }
  
  /**
   * Perform game action
   */
  static async performAction(playerId, action) {
    try {
      const gameState = await this.getState(playerId);
      
      switch (action.action) {
        case 'click':
          return await this.performClick(playerId, gameState, action);
        case 'purchase':
          return await this.performPurchase(playerId, gameState, action);
        case 'upgrade':
          return await this.performUpgrade(playerId, gameState, action);
        case 'prestige':
          return await this.performPrestige(playerId, gameState, action);
        default:
          throw new Error(`Unknown action: ${action.action}`);
      }
    } catch (error) {
      logger.error('Error performing action:', error);
      throw error;
    }
  }
  
  /**
   * Perform click action
   */
  static async performClick(playerId, gameState, action) {
    const clickPower = this.calculateClickPower(gameState);
    const woolEarned = clickPower;
    
    const stateUpdate = {
      woolCounts: {
        basic: woolEarned.toString()
      },
      totalClicks: 1
    };
    
    const updatedState = await this.updateState(playerId, stateUpdate);
    
    return {
      woolEarned,
      clickPower,
      newTotal: updatedState.woolCounts.basic,
      timestamp: Date.now()
    };
  }
  
  /**
   * Calculate click power based on upgrades
   */
  static calculateClickPower(gameState) {
    let basePower = new Decimal(1);
    
    // Apply upgrade multipliers
    for (const upgradeId of gameState.purchasedUpgrades) {
      const upgrade = this.getUpgradeById(upgradeId);
      if (upgrade && upgrade.effect.target === 'click') {
        if (upgrade.effect.type === 'multiply') {
          basePower = basePower.times(upgrade.effect.value);
        } else if (upgrade.effect.type === 'add') {
          basePower = basePower.plus(upgrade.effect.value);
        }
      }
    }
    
    // Apply prestige multipliers
    const prestigeMultiplier = this.calculatePrestigeMultiplier(gameState);
    basePower = basePower.times(prestigeMultiplier);
    
    return basePower;
  }
  
  /**
   * Purchase building
   */
  static async purchaseBuilding(playerId, buildingType, quantity = 1) {
    try {
      const gameState = await this.getState(playerId);
      const building = gameState.buildings[buildingType];
      
      if (!building) {
        throw new Error(`Unknown building type: ${buildingType}`);
      }
      
      if (!building.unlocked) {
        throw new Error(`Building ${buildingType} is not unlocked`);
      }
      
      const cost = this.calculateBuildingCost(buildingType, building.level, quantity);
      
      // Check if player has enough resources
      if (!this.canAfford(gameState, cost)) {
        throw new Error('Insufficient resources');
      }
      
      // Deduct cost and add building levels
      const stateUpdate = {
        woolCounts: {},
        buildings: {
          [buildingType]: {
            level: building.level + quantity
          }
        }
      };
      
      // Deduct wool cost
      for (const [woolType, amount] of Object.entries(cost)) {
        const current = new Decimal(gameState.woolCounts[woolType] || '0');
        const costAmount = new Decimal(amount);
        stateUpdate.woolCounts[woolType] = current.minus(costAmount).toString();
      }
      
      const updatedState = await this.updateState(playerId, stateUpdate);
      
      return {
        buildingType,
        newLevel: updatedState.buildings[buildingType].level,
        cost,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error purchasing building:', error);
      throw error;
    }
  }
  
  /**
   * Calculate building cost
   */
  static calculateBuildingCost(buildingType, currentLevel, quantity) {
    const baseCosts = {
      barn: { basic: 10 },
      shears: { basic: 50 },
      transport: { silver: 100 },
      factory: { golden: 500 },
      lab: { rainbow: 1000 },
      portal: { cosmic: 5000 },
      timeMachine: { temporal: 10000 },
      dimensionGate: { quantum: 50000 }
    };
    
    const baseCost = baseCosts[buildingType];
    const multiplier = Math.pow(1.15, currentLevel); // 15% increase per level
    
    const cost = {};
    for (const [woolType, amount] of Object.entries(baseCost)) {
      const totalCost = new Decimal(amount)
        .times(multiplier)
        .times(quantity);
      cost[woolType] = totalCost.toString();
    }
    
    return cost;
  }
  
  /**
   * Check if player can afford a cost
   */
  static canAfford(gameState, cost) {
    for (const [woolType, amount] of Object.entries(cost)) {
      const current = new Decimal(gameState.woolCounts[woolType] || '0');
      const required = new Decimal(amount);
      
      if (current.lessThan(required)) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Save game state
   */
  static async saveState(playerId, gameState) {
    try {
      // Save to database
      await GameSave.create({
        ...gameState,
        playerId,
        timestamp: Date.now()
      });
      
      // Update Redis cache
      await redis.setex(`gamestate:${playerId}`, 300, JSON.stringify(gameState));
      
      // Update player statistics
      await Player.findByIdAndUpdate(playerId, {
        lastSaveTime: Date.now(),
        totalWoolProduced: gameState.totalWoolProduced,
        totalPrestiges: gameState.totalPrestiges
      });
      
      logger.debug(`Game state saved for player ${playerId}`);
    } catch (error) {
      logger.error('Error saving game state:', error);
      throw error;
    }
  }
  
  /**
   * Get buildings for a player
   */
  static async getBuildings(playerId) {
    const gameState = await this.getState(playerId);
    return gameState.buildings;
  }
  
  /**
   * Get upgrades for a player
   */
  static async getUpgrades(playerId, category) {
    const gameState = await this.getState(playerId);
    const allUpgrades = this.getAllUpgrades();
    
    // Filter by category if specified
    let upgrades = category ? 
      allUpgrades.filter(upgrade => upgrade.category === category) : 
      allUpgrades;
    
    // Check availability and requirements
    upgrades = upgrades.map(upgrade => ({
      ...upgrade,
      purchased: gameState.purchasedUpgrades.includes(upgrade.id),
      affordable: this.canAfford(gameState, upgrade.cost),
      available: this.checkUpgradeRequirements(gameState, upgrade)
    }));
    
    return upgrades;
  }
  
  /**
   * Purchase upgrade
   */
  static async purchaseUpgrade(playerId, upgradeId) {
    try {
      const gameState = await this.getState(playerId);
      const upgrade = this.getUpgradeById(upgradeId);
      
      if (!upgrade) {
        throw new Error(`Unknown upgrade: ${upgradeId}`);
      }
      
      if (gameState.purchasedUpgrades.includes(upgradeId)) {
        throw new Error('Upgrade already purchased');
      }
      
      if (!this.canAfford(gameState, upgrade.cost)) {
        throw new Error('Insufficient resources');
      }
      
      if (!this.checkUpgradeRequirements(gameState, upgrade)) {
        throw new Error('Upgrade requirements not met');
      }
      
      // Deduct cost and add upgrade
      const stateUpdate = {
        woolCounts: {},
        purchasedUpgrades: [upgradeId]
      };
      
      // Deduct wool cost
      for (const [woolType, amount] of Object.entries(upgrade.cost)) {
        const current = new Decimal(gameState.woolCounts[woolType] || '0');
        const costAmount = new Decimal(amount);
        stateUpdate.woolCounts[woolType] = current.minus(costAmount).toString();
      }
      
      const updatedState = await this.updateState(playerId, stateUpdate);
      
      return {
        upgradeId,
        upgrade,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error purchasing upgrade:', error);
      throw error;
    }
  }
  
  /**
   * Register click
   */
  static async registerClick(playerId, clickData) {
    return await this.performAction(playerId, {
      action: 'click',
      ...clickData
    });
  }
  
  /**
   * Get game configuration
   */
  static async getGameConfig(playerId) {
    return {
      woolTypes: this.getWoolTypes(),
      buildingTypes: this.getBuildingTypes(),
      upgradeCategories: this.getUpgradeCategories(),
      constants: this.getGameConstants()
    };
  }
  
  /**
   * Check for new achievements
   */
  static async checkAchievements(playerId, gameState) {
    const allAchievements = this.getAllAchievements();
    const newAchievements = [];
    
    for (const achievement of allAchievements) {
      if (!gameState.unlockedAchievements.includes(achievement.id)) {
        if (this.checkAchievementRequirement(gameState, achievement.requirement)) {
          newAchievements.push(achievement);
        }
      }
    }
    
    if (newAchievements.length > 0) {
      const stateUpdate = {
        unlockedAchievements: newAchievements.map(a => a.id)
      };
      await this.updateState(playerId, stateUpdate);
    }
    
    return newAchievements;
  }
  
  // Helper methods for game data
  static getWoolTypes() {
    return ['basic', 'silver', 'golden', 'rainbow', 'cosmic', 'ethereal', 'temporal', 'dimensional', 'celestial', 'quantum'];
  }
  
  static getBuildingTypes() {
    return ['barn', 'shears', 'transport', 'factory', 'lab', 'portal', 'timeMachine', 'dimensionGate'];
  }
  
  static getUpgradeCategories() {
    return ['production', 'efficiency', 'automation', 'prestige', 'special'];
  }
  
  static getGameConstants() {
    return {
      maxOfflineHours: 24,
      prestigeRequirement: '1000000',
      maxBuildingLevel: 1000,
      autoSaveInterval: 60000 // 1 minute
    };
  }
  
  // Mock methods - these would be replaced with actual game data
  static getAllUpgrades() {
    return []; // Would return actual upgrade data
  }
  
  static getUpgradeById(id) {
    return null; // Would return actual upgrade data
  }
  
  static getAllAchievements() {
    return []; // Would return actual achievement data
  }
  
  static checkUpgradeRequirements(gameState, upgrade) {
    return true; // Would check actual requirements
  }
  
  static checkAchievementRequirement(gameState, requirement) {
    return false; // Would check actual requirements
  }
  
  static calculatePrestigeMultiplier(gameState) {
    return new Decimal(1); // Would calculate actual multiplier
  }
}

module.exports = { GameStateService };