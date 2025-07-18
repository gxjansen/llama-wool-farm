/**
 * Game Service
 * Handles game logic and state management using Supabase
 */

const { getSupabaseClient } = require('../config/supabase');
const { logger } = require('../utils/logger');
const { SupabaseHelpers } = require('../utils/supabase-helpers');
const Decimal = require('decimal.js');

class GameService {
  /**
   * Get current game state for a player
   */
  static async getGameState(playerId) {
    try {
      const supabase = getSupabaseClient();
      
      // Get player's current game state
      const { data: gameState, error } = await supabase
        .from('game_states')
        .select(`
          *,
          buildings:game_buildings(*),
          upgrades:game_upgrades(*),
          achievements:game_achievements(*)
        `)
        .eq('player_id', playerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No game state found, create initial state
          return await this.createInitialGameState(playerId);
        }
        throw error;
      }

      return this.formatGameState(gameState);
    } catch (error) {
      logger.error('Error getting game state:', error);
      throw error;
    }
  }

  /**
   * Create initial game state for new player
   */
  static async createInitialGameState(playerId) {
    try {
      const supabase = getSupabaseClient();
      
      const initialState = {
        player_id: playerId,
        version: '1.0.0',
        wool_counts: {
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
        soul_shears: '0',
        golden_fleece: '0',
        total_wool_produced: '0',
        total_clicks: 0,
        total_prestiges: 0,
        play_time: 0,
        game_state: 'playing',
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
        },
        last_save_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create game state
      const { data: gameState, error } = await supabase
        .from('game_states')
        .insert(initialState)
        .select()
        .single();

      if (error) throw error;

      // Create initial buildings
      const initialBuildings = [
        { player_id: playerId, building_type: 'barn', level: 0, unlocked: true },
        { player_id: playerId, building_type: 'shears', level: 0, unlocked: false },
        { player_id: playerId, building_type: 'transport', level: 0, unlocked: false },
        { player_id: playerId, building_type: 'factory', level: 0, unlocked: false },
        { player_id: playerId, building_type: 'lab', level: 0, unlocked: false },
        { player_id: playerId, building_type: 'portal', level: 0, unlocked: false },
        { player_id: playerId, building_type: 'timeMachine', level: 0, unlocked: false },
        { player_id: playerId, building_type: 'dimensionGate', level: 0, unlocked: false }
      ];

      const { error: buildingsError } = await supabase
        .from('game_buildings')
        .insert(initialBuildings);

      if (buildingsError) throw buildingsError;

      logger.info(`Created initial game state for player ${playerId}`);
      return await this.getGameState(playerId);
    } catch (error) {
      logger.error('Error creating initial game state:', error);
      throw error;
    }
  }

  /**
   * Update game state
   */
  static async updateGameState(playerId, updateData) {
    try {
      const supabase = getSupabaseClient();
      
      // Update main game state
      const { data: gameState, error } = await supabase
        .from('game_states')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('player_id', playerId)
        .select()
        .single();

      if (error) throw error;

      // Trigger real-time update
      await this.broadcastGameStateUpdate(playerId, gameState);

      return gameState;
    } catch (error) {
      logger.error('Error updating game state:', error);
      throw error;
    }
  }

  /**
   * Perform click action
   */
  static async performClick(playerId, clickData = {}) {
    try {
      const gameState = await this.getGameState(playerId);
      const clickPower = this.calculateClickPower(gameState);
      
      // Calculate wool earned
      const woolEarned = clickPower;
      const currentBasicWool = new Decimal(gameState.wool_counts.basic || '0');
      const newBasicWool = currentBasicWool.plus(woolEarned);
      
      // Update game state
      const updateData = {
        wool_counts: {
          ...gameState.wool_counts,
          basic: newBasicWool.toString()
        },
        total_clicks: gameState.total_clicks + 1,
        total_wool_produced: new Decimal(gameState.total_wool_produced || '0')
          .plus(woolEarned).toString()
      };

      await this.updateGameState(playerId, updateData);

      return {
        wool_earned: woolEarned.toString(),
        click_power: clickPower.toString(),
        new_total: newBasicWool.toString(),
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error performing click:', error);
      throw error;
    }
  }

  /**
   * Purchase building
   */
  static async purchaseBuilding(playerId, buildingType, quantity = 1) {
    try {
      const supabase = getSupabaseClient();
      
      // Get current building level
      const { data: building, error: buildingError } = await supabase
        .from('game_buildings')
        .select('*')
        .eq('player_id', playerId)
        .eq('building_type', buildingType)
        .single();

      if (buildingError) throw buildingError;

      if (!building.unlocked) {
        throw new Error(`Building ${buildingType} is not unlocked`);
      }

      // Calculate cost
      const cost = this.calculateBuildingCost(buildingType, building.level, quantity);
      
      // Get current game state to check affordability
      const gameState = await this.getGameState(playerId);
      
      if (!this.canAfford(gameState.wool_counts, cost)) {
        throw new Error('Insufficient resources');
      }

      // Use Supabase transaction-like operation with RPC
      const { data: result, error } = await supabase.rpc('purchase_building', {
        p_player_id: playerId,
        p_building_type: buildingType,
        p_quantity: quantity,
        p_cost: cost
      });

      if (error) throw error;

      // Broadcast update
      await this.broadcastBuildingUpdate(playerId, buildingType, result);

      return result;
    } catch (error) {
      logger.error('Error purchasing building:', error);
      throw error;
    }
  }

  /**
   * Purchase upgrade
   */
  static async purchaseUpgrade(playerId, upgradeId) {
    try {
      const supabase = getSupabaseClient();
      
      // Check if upgrade already purchased
      const { data: existingUpgrade } = await supabase
        .from('game_upgrades')
        .select('*')
        .eq('player_id', playerId)
        .eq('upgrade_id', upgradeId)
        .single();

      if (existingUpgrade) {
        throw new Error('Upgrade already purchased');
      }

      // Get upgrade definition
      const upgrade = SupabaseHelpers.getUpgradeDefinition(upgradeId);
      if (!upgrade) {
        throw new Error(`Unknown upgrade: ${upgradeId}`);
      }

      // Check affordability
      const gameState = await this.getGameState(playerId);
      if (!this.canAfford(gameState.wool_counts, upgrade.cost)) {
        throw new Error('Insufficient resources');
      }

      // Use RPC for atomic transaction
      const { data: result, error } = await supabase.rpc('purchase_upgrade', {
        p_player_id: playerId,
        p_upgrade_id: upgradeId,
        p_cost: upgrade.cost
      });

      if (error) throw error;

      // Broadcast update
      await this.broadcastUpgradeUpdate(playerId, upgradeId, result);

      return result;
    } catch (error) {
      logger.error('Error purchasing upgrade:', error);
      throw error;
    }
  }

  /**
   * Calculate production rates
   */
  static async calculateProduction(playerId) {
    try {
      const gameState = await this.getGameState(playerId);
      const buildings = gameState.buildings || [];
      
      let totalProduction = new Decimal(0);
      const productionByBuilding = {};

      for (const building of buildings) {
        if (building.level > 0) {
          const baseProduction = SupabaseHelpers.getBuildingBaseProduction(building.building_type);
          const buildingProduction = new Decimal(baseProduction)
            .times(building.level)
            .times(this.calculateBuildingMultiplier(gameState, building.building_type));
          
          productionByBuilding[building.building_type] = buildingProduction.toString();
          totalProduction = totalProduction.plus(buildingProduction);
        }
      }

      return {
        total_production: totalProduction.toString(),
        production_by_building: productionByBuilding,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error calculating production:', error);
      throw error;
    }
  }

  /**
   * Handle offline progress
   */
  static async calculateOfflineProgress(playerId) {
    try {
      const gameState = await this.getGameState(playerId);
      const lastSaveTime = new Date(gameState.last_save_time);
      const now = new Date();
      const offlineMinutes = Math.floor((now - lastSaveTime) / (1000 * 60));

      if (offlineMinutes < 1) {
        return { offline_minutes: 0, wool_earned: '0' };
      }

      // Calculate offline production
      const production = await this.calculateProduction(playerId);
      const offlineWool = new Decimal(production.total_production)
        .times(offlineMinutes)
        .times(0.5); // 50% offline efficiency

      return {
        offline_minutes: offlineMinutes,
        wool_earned: offlineWool.toString(),
        production_rate: production.total_production
      };
    } catch (error) {
      logger.error('Error calculating offline progress:', error);
      throw error;
    }
  }

  /**
   * Broadcast game state update via real-time
   */
  static async broadcastGameStateUpdate(playerId, gameState) {
    try {
      const supabase = getSupabaseClient();
      
      // Send real-time update
      await supabase.channel(`game_state_${playerId}`)
        .send({
          type: 'broadcast',
          event: 'game_state_updated',
          payload: gameState
        });
    } catch (error) {
      logger.warn('Error broadcasting game state update:', error);
    }
  }

  /**
   * Broadcast building update via real-time
   */
  static async broadcastBuildingUpdate(playerId, buildingType, result) {
    try {
      const supabase = getSupabaseClient();
      
      await supabase.channel(`game_state_${playerId}`)
        .send({
          type: 'broadcast',
          event: 'building_purchased',
          payload: { building_type: buildingType, result }
        });
    } catch (error) {
      logger.warn('Error broadcasting building update:', error);
    }
  }

  /**
   * Broadcast upgrade update via real-time
   */
  static async broadcastUpgradeUpdate(playerId, upgradeId, result) {
    try {
      const supabase = getSupabaseClient();
      
      await supabase.channel(`game_state_${playerId}`)
        .send({
          type: 'broadcast',
          event: 'upgrade_purchased',
          payload: { upgrade_id: upgradeId, result }
        });
    } catch (error) {
      logger.warn('Error broadcasting upgrade update:', error);
    }
  }

  // Helper methods
  static calculateClickPower(gameState) {
    let basePower = new Decimal(1);
    
    // Apply upgrade multipliers
    if (gameState.upgrades) {
      for (const upgrade of gameState.upgrades) {
        const upgradeData = SupabaseHelpers.getUpgradeDefinition(upgrade.upgrade_id);
        if (upgradeData && upgradeData.effect.target === 'click') {
          if (upgradeData.effect.type === 'multiply') {
            basePower = basePower.times(upgradeData.effect.value);
          } else if (upgradeData.effect.type === 'add') {
            basePower = basePower.plus(upgradeData.effect.value);
          }
        }
      }
    }

    // Apply prestige multipliers
    const prestigeMultiplier = Math.pow(1.1, gameState.total_prestiges || 0);
    basePower = basePower.times(prestigeMultiplier);

    return basePower;
  }

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

    const baseCost = baseCosts[buildingType] || { basic: 10 };
    const multiplier = Math.pow(1.15, currentLevel);

    const cost = {};
    for (const [woolType, amount] of Object.entries(baseCost)) {
      const totalCost = new Decimal(amount)
        .times(multiplier)
        .times(quantity);
      cost[woolType] = totalCost.toString();
    }

    return cost;
  }

  static calculateBuildingMultiplier(gameState, buildingType) {
    let multiplier = new Decimal(1);
    
    // Apply upgrade multipliers for this building type
    if (gameState.upgrades) {
      for (const upgrade of gameState.upgrades) {
        const upgradeData = SupabaseHelpers.getUpgradeDefinition(upgrade.upgrade_id);
        if (upgradeData && upgradeData.effect.target === buildingType) {
          if (upgradeData.effect.type === 'multiply') {
            multiplier = multiplier.times(upgradeData.effect.value);
          }
        }
      }
    }

    return multiplier;
  }

  static canAfford(woolCounts, cost) {
    for (const [woolType, amount] of Object.entries(cost)) {
      const current = new Decimal(woolCounts[woolType] || '0');
      const required = new Decimal(amount);
      
      if (current.lessThan(required)) {
        return false;
      }
    }
    return true;
  }

  static formatGameState(rawGameState) {
    return {
      ...rawGameState,
      buildings: rawGameState.buildings || [],
      upgrades: rawGameState.upgrades || [],
      achievements: rawGameState.achievements || []
    };
  }
}

module.exports = { GameService };