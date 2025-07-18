const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Game State Schema
 * Resource management, buildings, unlocks with versioning
 * Optimized for frequent updates and conflict resolution
 */
const gameStateSchema = new Schema({
  // Primary identifier and player reference
  _id: {
    type: Schema.Types.ObjectId,
    auto: true
  },
  
  playerId: {
    type: Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    unique: true,
    index: true
  },
  
  // Resource management
  resources: {
    wool: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Wool must be an integer'
      }
    },
    coins: {
      type: Number,
      default: 100,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Coins must be an integer'
      }
    },
    feed: {
      type: Number,
      default: 50,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Feed must be an integer'
      }
    },
    premium: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Premium currency must be an integer'
      }
    },
    // Resource generation rates per minute
    woolProductionRate: {
      type: Number,
      default: 1,
      min: 0
    },
    feedConsumptionRate: {
      type: Number,
      default: 0.5,
      min: 0
    }
  },
  
  // Llama management
  llamas: [{
    llamaId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 20
    },
    breed: {
      type: String,
      enum: ['alpaca', 'huacaya', 'suri', 'vicuna', 'guanaco'],
      default: 'alpaca'
    },
    color: {
      type: String,
      enum: ['white', 'brown', 'black', 'gray', 'mixed'],
      default: 'white'
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 50
    },
    happiness: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    health: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    woolQuality: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    lastFed: {
      type: Date,
      default: Date.now
    },
    lastWoolHarvest: {
      type: Date,
      default: Date.now
    },
    traits: [{
      type: String,
      enum: ['fast_grower', 'high_quality', 'low_maintenance', 'social', 'hardy']
    }],
    position: {
      x: Number,
      y: Number,
      building: String
    }
  }],
  
  // Building management
  buildings: [{
    buildingId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['barn', 'pasture', 'mill', 'shop', 'house', 'storage', 'fence'],
      required: true
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    position: {
      x: {
        type: Number,
        required: true
      },
      y: {
        type: Number,
        required: true
      },
      rotation: {
        type: Number,
        default: 0,
        min: 0,
        max: 360
      }
    },
    capacity: {
      type: Number,
      default: 0,
      min: 0
    },
    efficiency: {
      type: Number,
      default: 1,
      min: 0,
      max: 5
    },
    constructedAt: {
      type: Date,
      default: Date.now
    },
    lastUpgrade: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Unlocks and progression
  unlocks: {
    buildings: [{
      type: String,
      enum: ['barn', 'pasture', 'mill', 'shop', 'house', 'storage', 'fence']
    }],
    llamaBreeds: [{
      type: String,
      enum: ['alpaca', 'huacaya', 'suri', 'vicuna', 'guanaco']
    }],
    features: [{
      type: String,
      enum: ['breeding', 'trading', 'competitions', 'decorations', 'automation']
    }],
    recipes: [{
      recipeId: String,
      unlockedAt: Date
    }]
  },
  
  // Farm layout and decoration
  farmLayout: {
    width: {
      type: Number,
      default: 20,
      min: 10,
      max: 50
    },
    height: {
      type: Number,
      default: 20,
      min: 10,
      max: 50
    },
    theme: {
      type: String,
      enum: ['classic', 'modern', 'rustic', 'fantasy', 'winter'],
      default: 'classic'
    },
    decorations: [{
      decorationId: String,
      type: String,
      position: {
        x: Number,
        y: Number
      },
      placedAt: Date
    }]
  },
  
  // Active processes and timers
  activeProcesses: [{
    processId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['harvest', 'construction', 'upgrade', 'breeding', 'quest'],
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    data: {
      type: Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Daily bonuses and streaks
  dailyBonus: {
    lastClaimed: {
      type: Date,
      default: null
    },
    streak: {
      type: Number,
      default: 0,
      min: 0
    },
    available: {
      type: Boolean,
      default: true
    }
  },
  
  // Versioning for conflict resolution
  version: {
    type: Number,
    default: 1,
    index: true
  },
  
  // Audit trail
  lastSaved: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Backup checksum for data integrity
  checksum: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  versionKey: false,
  // Enable optimistic concurrency control
  optimisticConcurrency: true
});

// Indexes for performance
gameStateSchema.index({ playerId: 1 }, { unique: true });
gameStateSchema.index({ lastSaved: -1 });
gameStateSchema.index({ version: 1 });
gameStateSchema.index({ 'resources.wool': -1 });
gameStateSchema.index({ 'resources.coins': -1 });
gameStateSchema.index({ 'llamas.llamaId': 1 });
gameStateSchema.index({ 'buildings.buildingId': 1 });
gameStateSchema.index({ 'activeProcesses.endTime': 1 });

// Compound indexes for common queries
gameStateSchema.index({ 
  playerId: 1, 
  lastSaved: -1 
});

// Sharding strategy: shard by playerId hash
gameStateSchema.index({ playerId: 'hashed' });

// Pre-save middleware for data integrity
gameStateSchema.pre('save', function(next) {
  this.lastSaved = new Date();
  
  // Generate checksum for data integrity
  const crypto = require('crypto');
  const dataString = JSON.stringify({
    resources: this.resources,
    llamas: this.llamas,
    buildings: this.buildings
  });
  this.checksum = crypto.createHash('sha256').update(dataString).digest('hex');
  
  // Validate resource constraints
  if (this.resources.wool < 0 || this.resources.coins < 0 || this.resources.feed < 0) {
    return next(new Error('Resources cannot be negative'));
  }
  
  // Validate building positions don't overlap
  const positions = this.buildings.map(b => `${b.position.x},${b.position.y}`);
  const uniquePositions = new Set(positions);
  if (positions.length !== uniquePositions.size) {
    return next(new Error('Building positions cannot overlap'));
  }
  
  next();
});

// Methods for resource management
gameStateSchema.methods.addResources = function(resourceUpdates) {
  Object.keys(resourceUpdates).forEach(resource => {
    if (this.resources[resource] !== undefined) {
      this.resources[resource] = Math.max(0, this.resources[resource] + resourceUpdates[resource]);
    }
  });
  
  return this.save();
};

gameStateSchema.methods.canAfford = function(cost) {
  return Object.keys(cost).every(resource => 
    this.resources[resource] >= cost[resource]
  );
};

gameStateSchema.methods.spendResources = function(cost) {
  if (!this.canAfford(cost)) {
    throw new Error('Insufficient resources');
  }
  
  Object.keys(cost).forEach(resource => {
    this.resources[resource] -= cost[resource];
  });
  
  return this.save();
};

// Methods for llama management
gameStateSchema.methods.addLlama = function(llamaData) {
  const newLlama = {
    llamaId: new mongoose.Types.ObjectId().toString(),
    ...llamaData
  };
  
  this.llamas.push(newLlama);
  return this.save();
};

gameStateSchema.methods.feedLlama = function(llamaId, feedAmount = 10) {
  const llama = this.llamas.id(llamaId);
  if (!llama) {
    throw new Error('Llama not found');
  }
  
  if (this.resources.feed < feedAmount) {
    throw new Error('Not enough feed');
  }
  
  this.resources.feed -= feedAmount;
  llama.happiness = Math.min(100, llama.happiness + 20);
  llama.health = Math.min(100, llama.health + 10);
  llama.lastFed = new Date();
  
  return this.save();
};

// Methods for building management
gameStateSchema.methods.addBuilding = function(buildingData) {
  const newBuilding = {
    buildingId: new mongoose.Types.ObjectId().toString(),
    ...buildingData
  };
  
  this.buildings.push(newBuilding);
  return this.save();
};

gameStateSchema.methods.upgradeBuilding = function(buildingId) {
  const building = this.buildings.find(b => b.buildingId === buildingId);
  if (!building) {
    throw new Error('Building not found');
  }
  
  if (building.level >= 10) {
    throw new Error('Building already at max level');
  }
  
  building.level += 1;
  building.lastUpgrade = new Date();
  building.capacity = Math.floor(building.capacity * 1.5);
  building.efficiency = Math.min(5, building.efficiency + 0.2);
  
  return this.save();
};

// Static methods for queries
gameStateSchema.statics.getActiveProcesses = function() {
  const now = new Date();
  return this.find({
    'activeProcesses.endTime': { $gte: now }
  }, {
    playerId: 1,
    activeProcesses: 1
  });
};

gameStateSchema.statics.getTopProducers = function(limit = 10) {
  return this.find({}, {
    playerId: 1,
    'resources.wool': 1,
    'resources.coins': 1
  })
  .sort({ 'resources.wool': -1 })
  .limit(limit)
  .populate('playerId', 'profile.username profile.displayName')
  .lean();
};

module.exports = mongoose.model('GameState', gameStateSchema);