/**
 * =============================================
 * GAME VALIDATION SCHEMAS
 * Comprehensive input validation for game data
 * =============================================
 */

const Joi = require('joi');
const { Decimal } = require('decimal.js');

// Custom Joi extension for Decimal validation
const JoiDecimal = Joi.extend((joi) => ({
  type: 'decimal',
  base: joi.string(),
  messages: {
    'decimal.base': '{{#label}} must be a valid decimal string',
    'decimal.min': '{{#label}} must be at least {{#limit}}',
    'decimal.max': '{{#label}} must be at most {{#limit}}',
    'decimal.positive': '{{#label}} must be positive',
    'decimal.negative': '{{#label}} must be negative'
  },
  validate(value, helpers) {
    try {
      const decimal = new Decimal(value);
      return { value: decimal.toString() };
    } catch (error) {
      return { errors: helpers.error('decimal.base') };
    }
  },
  rules: {
    min: {
      method(limit) {
        return this.$_addRule({ name: 'min', args: { limit } });
      },
      args: [
        {
          name: 'limit',
          assert: (value) => typeof value === 'string' || typeof value === 'number',
          message: 'must be a number or string'
        }
      ],
      validate(value, helpers, { limit }) {
        const decimal = new Decimal(value);
        const limitDecimal = new Decimal(limit);
        if (decimal.lt(limitDecimal)) {
          return helpers.error('decimal.min', { limit });
        }
        return value;
      }
    },
    max: {
      method(limit) {
        return this.$_addRule({ name: 'max', args: { limit } });
      },
      args: [
        {
          name: 'limit',
          assert: (value) => typeof value === 'string' || typeof value === 'number',
          message: 'must be a number or string'
        }
      ],
      validate(value, helpers, { limit }) {
        const decimal = new Decimal(value);
        const limitDecimal = new Decimal(limit);
        if (decimal.gt(limitDecimal)) {
          return helpers.error('decimal.max', { limit });
        }
        return value;
      }
    },
    positive: {
      method() {
        return this.$_addRule({ name: 'positive' });
      },
      validate(value, helpers) {
        const decimal = new Decimal(value);
        if (decimal.lte(0)) {
          return helpers.error('decimal.positive');
        }
        return value;
      }
    }
  }
}));

/**
 * User Authentication Validation
 */
const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    deviceId: Joi.string().uuid().optional(),
    platform: Joi.string().valid('web', 'mobile', 'desktop').default('web')
  }),

  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    deviceId: Joi.string().uuid().optional(),
    platform: Joi.string().valid('web', 'mobile', 'desktop').default('web')
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
    deviceId: Joi.string().uuid().optional()
  })
};

/**
 * Game State Validation
 */
const woolTypeSchema = Joi.string().valid(
  'white', 'brown', 'black', 'gray', 'rainbow', 'golden', 'platinum', 'diamond'
);

const buildingTypeSchema = Joi.string().valid(
  'llama_pen', 'shearing_station', 'wool_processor', 'quality_enhancer', 
  'automation_hub', 'research_lab', 'storage_facility', 'marketplace'
);

const buildingSchema = Joi.object({
  id: Joi.string().required(),
  type: buildingTypeSchema.required(),
  level: Joi.number().integer().min(0).max(1000).required(),
  unlocked: Joi.boolean().required(),
  baseProduction: JoiDecimal.decimal().min('0').required(),
  productionMultiplier: JoiDecimal.decimal().min('0.1').max('1000').required(),
  upgradeCost: JoiDecimal.decimal().min('0').required(),
  position: Joi.object({
    x: Joi.number().integer().min(0).max(100).required(),
    y: Joi.number().integer().min(0).max(100).required()
  }).optional()
});

const upgradeSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().valid('production', 'efficiency', 'automation', 'quality').required(),
  level: Joi.number().integer().min(0).max(100).required(),
  cost: JoiDecimal.decimal().min('0').required(),
  effect: Joi.object({
    type: Joi.string().valid('multiply', 'add', 'special').required(),
    value: JoiDecimal.decimal().min('0').required(),
    target: Joi.string().required()
  }).required()
});

const achievementSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().valid('production', 'building', 'upgrade', 'time', 'special').required(),
  unlockedAt: Joi.date().iso().optional(),
  progress: Joi.number().min(0).max(1).required(),
  completed: Joi.boolean().required()
});

const gameStateSchema = Joi.object({
  // Basic game info
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).required(),
  playerId: Joi.string().uuid().required(),
  deviceId: Joi.string().uuid().optional(),
  platform: Joi.string().valid('web', 'mobile', 'desktop').default('web'),
  
  // Time tracking
  timestamp: Joi.date().iso().required(),
  lastSaved: Joi.date().iso().required(),
  playTime: Joi.number().integer().min(0).max(365 * 24 * 60 * 60 * 1000).required(), // Max 1 year in milliseconds
  sessionStartTime: Joi.date().iso().optional(),
  
  // Resources
  woolCounts: Joi.object({
    white: JoiDecimal.decimal().min('0').max('1e100').required(),
    brown: JoiDecimal.decimal().min('0').max('1e100').required(),
    black: JoiDecimal.decimal().min('0').max('1e100').required(),
    gray: JoiDecimal.decimal().min('0').max('1e100').required(),
    rainbow: JoiDecimal.decimal().min('0').max('1e100').required(),
    golden: JoiDecimal.decimal().min('0').max('1e100').required(),
    platinum: JoiDecimal.decimal().min('0').max('1e100').required(),
    diamond: JoiDecimal.decimal().min('0').max('1e100').required()
  }).required(),
  
  soulShears: JoiDecimal.decimal().min('0').max('1e50').required(),
  totalWoolProduced: JoiDecimal.decimal().min('0').max('1e150').required(),
  
  // Buildings
  buildings: Joi.object().pattern(
    buildingTypeSchema,
    buildingSchema
  ).required(),
  
  // Upgrades
  purchasedUpgrades: Joi.array().items(Joi.string()).max(1000).required(),
  availableUpgrades: Joi.array().items(upgradeSchema).max(100).optional(),
  
  // Progress
  achievements: Joi.object().pattern(
    Joi.string(),
    achievementSchema
  ).required(),
  
  unlockedContent: Joi.object({
    buildings: Joi.array().items(buildingTypeSchema).required(),
    woolTypes: Joi.array().items(woolTypeSchema).required(),
    features: Joi.array().items(Joi.string()).required()
  }).required(),
  
  // Prestige
  totalPrestiges: Joi.number().integer().min(0).max(1000).required(),
  currentPrestigeLevel: Joi.number().integer().min(0).max(1000).required(),
  prestigeProgress: Joi.number().min(0).max(1).required(),
  
  // Statistics
  statistics: Joi.object({
    totalClicks: Joi.number().integer().min(0).max(1e15).required(),
    totalBuildingsPurchased: Joi.number().integer().min(0).max(1e10).required(),
    totalUpgradesPurchased: Joi.number().integer().min(0).max(1e10).required(),
    maxWoolPerSecond: JoiDecimal.decimal().min('0').max('1e50').required(),
    longestSession: Joi.number().integer().min(0).max(24 * 60 * 60 * 1000).required()
  }).required(),
  
  // Settings
  settings: Joi.object({
    soundEnabled: Joi.boolean().default(true),
    musicEnabled: Joi.boolean().default(true),
    notificationsEnabled: Joi.boolean().default(true),
    autoSaveEnabled: Joi.boolean().default(true),
    graphicsQuality: Joi.string().valid('low', 'medium', 'high').default('medium'),
    language: Joi.string().valid('en', 'es', 'fr', 'de', 'nl').default('en')
  }).default({}),
  
  // Integrity
  checksum: Joi.string().hex().length(64).optional(),
  encrypted: Joi.boolean().default(false)
});

/**
 * Game Action Validation
 */
const gameActionSchemas = {
  // Building actions
  purchaseBuilding: Joi.object({
    buildingType: buildingTypeSchema.required(),
    quantity: Joi.number().integer().min(1).max(100).default(1),
    expectedCost: JoiDecimal.decimal().min('0').required(),
    timestamp: Joi.date().iso().required()
  }),

  upgradeBuilding: Joi.object({
    buildingType: buildingTypeSchema.required(),
    targetLevel: Joi.number().integer().min(1).max(1000).required(),
    expectedCost: JoiDecimal.decimal().min('0').required(),
    timestamp: Joi.date().iso().required()
  }),

  // Upgrade actions
  purchaseUpgrade: Joi.object({
    upgradeId: Joi.string().required(),
    expectedCost: JoiDecimal.decimal().min('0').required(),
    timestamp: Joi.date().iso().required()
  }),

  // Production actions
  collectWool: Joi.object({
    woolType: woolTypeSchema.required(),
    amount: JoiDecimal.decimal().positive().max('1e20').required(),
    timestamp: Joi.date().iso().required(),
    buildingId: Joi.string().optional()
  }),

  // Prestige actions
  prestige: Joi.object({
    currentLevel: Joi.number().integer().min(0).required(),
    expectedReward: JoiDecimal.decimal().min('0').required(),
    timestamp: Joi.date().iso().required()
  }),

  // Achievement actions
  unlockAchievement: Joi.object({
    achievementId: Joi.string().required(),
    progress: Joi.number().min(0).max(1).required(),
    timestamp: Joi.date().iso().required()
  })
};

/**
 * API Request Validation
 */
const apiSchemas = {
  // Game save/load
  saveGame: Joi.object({
    gameState: gameStateSchema.required(),
    forceSave: Joi.boolean().default(false),
    deviceInfo: Joi.object({
      userAgent: Joi.string().max(500).required(),
      platform: Joi.string().valid('web', 'mobile', 'desktop').required(),
      version: Joi.string().required()
    }).optional()
  }),

  loadGame: Joi.object({
    playerId: Joi.string().uuid().required(),
    deviceId: Joi.string().uuid().optional(),
    requestedVersion: Joi.string().optional()
  }),

  // Leaderboard
  submitScore: Joi.object({
    score: JoiDecimal.decimal().positive().max('1e100').required(),
    category: Joi.string().valid('total_wool', 'wool_per_second', 'prestige_level').required(),
    gameState: gameStateSchema.required()
  }),

  // Analytics
  trackEvent: Joi.object({
    eventType: Joi.string().valid(
      'game_start', 'game_end', 'building_purchased', 'upgrade_purchased',
      'prestige', 'achievement_unlocked', 'error', 'performance'
    ).required(),
    eventData: Joi.object().max(50).optional(),
    timestamp: Joi.date().iso().required(),
    sessionId: Joi.string().uuid().optional()
  }),

  // User profile
  updateProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    avatar: Joi.string().uri().optional(),
    preferences: Joi.object({
      privacy: Joi.string().valid('public', 'friends', 'private').default('public'),
      notifications: Joi.boolean().default(true)
    }).optional()
  })
};

/**
 * Security Validation
 */
const securitySchemas = {
  // Rate limiting
  rateLimitInfo: Joi.object({
    endpoint: Joi.string().required(),
    identifier: Joi.string().required(),
    timestamp: Joi.date().iso().required()
  }),

  // Security event
  securityEvent: Joi.object({
    eventType: Joi.string().valid(
      'SUSPICIOUS_ACTIVITY', 'ANTI_CHEAT_VIOLATION', 'RATE_LIMIT_EXCEEDED',
      'INVALID_REQUEST', 'AUTHENTICATION_FAILURE', 'AUTHORIZATION_FAILURE'
    ).required(),
    severity: Joi.string().valid('info', 'warning', 'error', 'critical').required(),
    details: Joi.object().optional(),
    timestamp: Joi.date().iso().required()
  }),

  // Anti-cheat validation
  antiCheatReport: Joi.object({
    violations: Joi.array().items(Joi.object({
      type: Joi.string().required(),
      severity: Joi.string().valid('low', 'medium', 'high').required(),
      description: Joi.string().required(),
      evidence: Joi.object().optional()
    })).required(),
    confidenceScore: Joi.number().min(0).max(1).required(),
    recommendedAction: Joi.string().valid('none', 'warning', 'suspension', 'ban').required()
  })
};

/**
 * Validation Helper Functions
 */
class GameValidation {
  /**
   * Validate game state with additional business logic
   */
  static validateGameState(gameState) {
    const { error, value } = gameStateSchema.validate(gameState);
    if (error) {
      return { valid: false, error: error.details[0].message };
    }

    // Additional business logic validation
    const businessValidation = this.validateBusinessLogic(value);
    if (!businessValidation.valid) {
      return businessValidation;
    }

    return { valid: true, value };
  }

  /**
   * Validate business logic rules
   */
  static validateBusinessLogic(gameState) {
    const errors = [];

    // Check if buildings are properly unlocked
    for (const [buildingType, building] of Object.entries(gameState.buildings)) {
      if (building.unlocked && !gameState.unlockedContent.buildings.includes(buildingType)) {
        errors.push(`Building ${buildingType} is unlocked but not in unlockedContent`);
      }
    }

    // Check if wool counts are consistent with production
    const totalWool = Object.values(gameState.woolCounts)
      .reduce((sum, count) => sum.plus(new Decimal(count)), new Decimal(0));
    
    if (totalWool.gt(new Decimal(gameState.totalWoolProduced))) {
      errors.push('Current wool count exceeds total wool produced');
    }

    // Check if prestige level is consistent
    if (gameState.currentPrestigeLevel > gameState.totalPrestiges) {
      errors.push('Current prestige level exceeds total prestiges');
    }

    // Check if achievements are properly unlocked
    for (const [achievementId, achievement] of Object.entries(gameState.achievements)) {
      if (achievement.completed && achievement.progress < 1) {
        errors.push(`Achievement ${achievementId} is completed but progress is less than 1`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate game action
   */
  static validateGameAction(actionType, actionData) {
    const schema = gameActionSchemas[actionType];
    if (!schema) {
      return { valid: false, error: `Unknown action type: ${actionType}` };
    }

    const { error, value } = schema.validate(actionData);
    if (error) {
      return { valid: false, error: error.details[0].message };
    }

    return { valid: true, value };
  }

  /**
   * Validate API request
   */
  static validateApiRequest(requestType, requestData) {
    const schema = apiSchemas[requestType];
    if (!schema) {
      return { valid: false, error: `Unknown request type: ${requestType}` };
    }

    const { error, value } = schema.validate(requestData);
    if (error) {
      return { valid: false, error: error.details[0].message };
    }

    return { valid: true, value };
  }

  /**
   * Validate security event
   */
  static validateSecurityEvent(eventType, eventData) {
    const schema = securitySchemas[eventType];
    if (!schema) {
      return { valid: false, error: `Unknown security event type: ${eventType}` };
    }

    const { error, value } = schema.validate(eventData);
    if (error) {
      return { valid: false, error: error.details[0].message };
    }

    return { valid: true, value };
  }

  /**
   * Sanitize game state for logging
   */
  static sanitizeGameState(gameState) {
    const sanitized = { ...gameState };
    
    // Remove sensitive information
    delete sanitized.checksum;
    delete sanitized.deviceId;
    delete sanitized.encrypted;
    
    // Truncate large arrays
    if (sanitized.purchasedUpgrades && sanitized.purchasedUpgrades.length > 100) {
      sanitized.purchasedUpgrades = sanitized.purchasedUpgrades.slice(0, 100);
    }
    
    return sanitized;
  }

  /**
   * Check if values are within expected ranges
   */
  static checkValueRanges(gameState) {
    const warnings = [];
    
    // Check for extremely high values
    for (const [woolType, count] of Object.entries(gameState.woolCounts)) {
      const decimal = new Decimal(count);
      if (decimal.gt('1e50')) {
        warnings.push(`Very high ${woolType} count: ${count}`);
      }
    }

    // Check for suspicious building levels
    for (const [buildingType, building] of Object.entries(gameState.buildings)) {
      if (building.level > 500) {
        warnings.push(`Very high building level: ${buildingType} level ${building.level}`);
      }
    }

    // Check for suspicious play time
    if (gameState.playTime > 365 * 24 * 60 * 60 * 1000) { // More than 1 year
      warnings.push(`Suspicious play time: ${gameState.playTime}ms`);
    }

    return warnings;
  }
}

module.exports = {
  authSchemas,
  gameStateSchema,
  gameActionSchemas,
  apiSchemas,
  securitySchemas,
  GameValidation
};