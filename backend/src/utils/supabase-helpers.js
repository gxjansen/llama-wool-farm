/**
 * Supabase Helper Functions
 * Common utility functions for Supabase operations
 */

const { logger } = require('./logger');
const Decimal = require('decimal.js');

class SupabaseHelpers {
  /**
   * Format Supabase error for API response
   */
  static formatError(error) {
    if (!error) return null;

    // Supabase specific error codes
    const errorMap = {
      '23505': 'DUPLICATE_KEY',
      '23503': 'FOREIGN_KEY_VIOLATION',
      '23502': 'NOT_NULL_VIOLATION',
      '23514': 'CHECK_VIOLATION',
      'PGRST116': 'NOT_FOUND',
      'PGRST204': 'NOT_FOUND',
      'PGRST301': 'PERMISSION_DENIED',
      '42P01': 'TABLE_NOT_FOUND',
      '42703': 'COLUMN_NOT_FOUND'
    };

    const code = errorMap[error.code] || 'DATABASE_ERROR';
    
    return {
      error: error.message || 'Database operation failed',
      code,
      details: error.details || error.hint || null
    };
  }

  /**
   * Execute query with retry logic
   */
  static async executeWithRetry(queryFunction, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await queryFunction();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          logger.warn(`Query attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
          await this.sleep(delay);
          delay *= 2; // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error should not be retried
   */
  static isNonRetryableError(error) {
    const nonRetryableCodes = [
      '23505', // Unique constraint violation
      '23503', // Foreign key violation
      '23502', // Not null violation
      '23514', // Check constraint violation
      'PGRST116', // Not found
      'PGRST204', // Not found
      'PGRST301', // Permission denied
      '42P01', // Table not found
      '42703'  // Column not found
    ];
    
    return nonRetryableCodes.includes(error.code);
  }

  /**
   * Sleep utility for retry delay
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Sanitize user input for SQL queries
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/'/g, "''")  // Escape single quotes
      .replace(/\\/g, '\\\\') // Escape backslashes
      .trim();
  }

  /**
   * Build filter object for Supabase queries
   */
  static buildFilters(filters = {}) {
    const supabaseFilters = {};
    
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;
      
      if (Array.isArray(value)) {
        supabaseFilters[`${key}.in`] = `(${value.join(',')})`;
      } else if (typeof value === 'object' && value.operator) {
        const { operator, value: filterValue } = value;
        supabaseFilters[`${key}.${operator}`] = filterValue;
      } else {
        supabaseFilters[`${key}.eq`] = value;
      }
    }
    
    return supabaseFilters;
  }

  /**
   * Build order by clause for Supabase queries
   */
  static buildOrderBy(orderBy = []) {
    if (!Array.isArray(orderBy)) {
      orderBy = [orderBy];
    }
    
    return orderBy.map(order => {
      if (typeof order === 'string') {
        return { column: order, ascending: true };
      }
      return {
        column: order.column || order.field,
        ascending: order.ascending !== false
      };
    });
  }

  /**
   * Handle pagination parameters
   */
  static buildPagination(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    return {
      from: offset,
      to: offset + limit - 1
    };
  }

  /**
   * Get building base production rate
   */
  static getBuildingBaseProduction(buildingType) {
    const productionRates = {
      barn: 0.1,
      shears: 0.5,
      transport: 2.0,
      factory: 10.0,
      lab: 50.0,
      portal: 250.0,
      timeMachine: 1000.0,
      dimensionGate: 5000.0
    };
    
    return productionRates[buildingType] || 0;
  }

  /**
   * Get upgrade definition by ID
   */
  static getUpgradeDefinition(upgradeId) {
    const upgrades = {
      'click_power_1': {
        id: 'click_power_1',
        name: 'Better Shearing',
        description: 'Increases click power by 100%',
        cost: { basic: '100' },
        category: 'production',
        effect: {
          type: 'multiply',
          target: 'click',
          value: 2
        }
      },
      'click_power_2': {
        id: 'click_power_2',
        name: 'Expert Shearing',
        description: 'Increases click power by 200%',
        cost: { basic: '1000' },
        category: 'production',
        effect: {
          type: 'multiply',
          target: 'click',
          value: 3
        }
      },
      'barn_efficiency_1': {
        id: 'barn_efficiency_1',
        name: 'Comfortable Barns',
        description: 'Increases barn efficiency by 50%',
        cost: { basic: '500' },
        category: 'efficiency',
        effect: {
          type: 'multiply',
          target: 'barn',
          value: 1.5
        }
      }
      // Add more upgrades as needed
    };
    
    return upgrades[upgradeId] || null;
  }

  /**
   * Get achievement definition by ID
   */
  static getAchievementDefinition(achievementId) {
    const achievements = {
      'first_wool': {
        id: 'first_wool',
        name: 'First Wool',
        description: 'Collect your first wool',
        icon: '🐑',
        requirement: {
          type: 'wool_count',
          target: 'basic',
          value: 1
        }
      },
      'wool_collector': {
        id: 'wool_collector',
        name: 'Wool Collector',
        description: 'Collect 1000 wool',
        icon: '📦',
        requirement: {
          type: 'total_wool',
          value: 1000
        }
      },
      'first_building': {
        id: 'first_building',
        name: 'First Building',
        description: 'Purchase your first building',
        icon: '🏗️',
        requirement: {
          type: 'building_count',
          value: 1
        }
      }
      // Add more achievements as needed
    };
    
    return achievements[achievementId] || null;
  }

  /**
   * Calculate wool value in different types
   */
  static calculateWoolValue(woolCounts) {
    const values = {
      basic: 1,
      silver: 10,
      golden: 100,
      rainbow: 1000,
      cosmic: 10000,
      ethereal: 100000,
      temporal: 1000000,
      dimensional: 10000000,
      celestial: 100000000,
      quantum: 1000000000
    };
    
    let totalValue = new Decimal(0);
    
    for (const [woolType, count] of Object.entries(woolCounts)) {
      const value = values[woolType] || 1;
      totalValue = totalValue.plus(new Decimal(count).times(value));
    }
    
    return totalValue.toString();
  }

  /**
   * Convert wool between types
   */
  static convertWool(fromType, toType, amount) {
    const hierarchy = [
      'basic', 'silver', 'golden', 'rainbow', 'cosmic',
      'ethereal', 'temporal', 'dimensional', 'celestial', 'quantum'
    ];
    
    const fromIndex = hierarchy.indexOf(fromType);
    const toIndex = hierarchy.indexOf(toType);
    
    if (fromIndex === -1 || toIndex === -1) {
      throw new Error('Invalid wool type');
    }
    
    const ratio = Math.pow(10, toIndex - fromIndex);
    
    if (ratio >= 1) {
      // Converting to higher tier
      return new Decimal(amount).dividedBy(ratio).toString();
    } else {
      // Converting to lower tier
      return new Decimal(amount).times(Math.abs(ratio)).toString();
    }
  }

  /**
   * Format large numbers for display
   */
  static formatNumber(number) {
    const num = new Decimal(number);
    
    if (num.lessThan(1000)) {
      return num.toString();
    }
    
    const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    const magnitude = Math.floor(Math.log10(num.toNumber()) / 3);
    
    if (magnitude >= suffixes.length) {
      return num.toExponential(2);
    }
    
    const scaledNum = num.dividedBy(Math.pow(1000, magnitude));
    const suffix = suffixes[magnitude];
    
    return scaledNum.toFixed(2) + suffix;
  }

  /**
   * Generate random ID
   */
  static generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Deep merge objects
   */
  static deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Validate game state data
   */
  static validateGameState(gameState) {
    const errors = [];
    
    if (!gameState.player_id) {
      errors.push('Missing player_id');
    }
    
    if (!gameState.wool_counts || typeof gameState.wool_counts !== 'object') {
      errors.push('Invalid wool_counts');
    }
    
    if (gameState.total_clicks < 0) {
      errors.push('Invalid total_clicks');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if user can perform action
   */
  static canPerformAction(gameState, action) {
    switch (action.type) {
      case 'click':
        return true; // Always allowed
      
      case 'purchase_building':
        return this.canAffordBuilding(gameState, action.building_type, action.quantity);
      
      case 'purchase_upgrade':
        return this.canAffordUpgrade(gameState, action.upgrade_id);
      
      default:
        return false;
    }
  }

  /**
   * Check if player can afford building
   */
  static canAffordBuilding(gameState, buildingType, quantity = 1) {
    const building = gameState.buildings?.find(b => b.building_type === buildingType);
    if (!building) return false;
    
    const cost = this.calculateBuildingCost(buildingType, building.level, quantity);
    return this.canAfford(gameState.wool_counts, cost);
  }

  /**
   * Check if player can afford upgrade
   */
  static canAffordUpgrade(gameState, upgradeId) {
    const upgrade = this.getUpgradeDefinition(upgradeId);
    if (!upgrade) return false;
    
    return this.canAfford(gameState.wool_counts, upgrade.cost);
  }

  /**
   * Check if player can afford cost
   */
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
}

module.exports = { SupabaseHelpers };