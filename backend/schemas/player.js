const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Player Data Schema
 * Optimized for read/write performance with proper indexing
 * Supports horizontal scaling with sharding strategies
 */
const playerSchema = new Schema({
  // Primary identifier and sharding key
  _id: {
    type: Schema.Types.ObjectId,
    auto: true
  },
  
  // User authentication reference
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Player profile information
  profile: {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-zA-Z0-9_-]+$/,
      index: true
    },
    displayName: {
      type: String,
      required: true,
      maxlength: 30
    },
    avatar: {
      type: String,
      default: 'default_llama.png'
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 100,
      index: true
    },
    experience: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },
    totalPlayTime: {
      type: Number,
      default: 0,
      min: 0
    },
    lastActive: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  
  // Game progress tracking
  progress: {
    questsCompleted: [{
      questId: String,
      completedAt: Date,
      rewards: {
        wool: Number,
        coins: Number,
        experience: Number
      }
    }],
    achievementsUnlocked: [{
      achievementId: String,
      unlockedAt: Date,
      progress: Number
    }],
    tutorialSteps: [{
      stepId: String,
      completedAt: Date
    }],
    currentQuest: {
      questId: String,
      startedAt: Date,
      progress: Number
    }
  },
  
  // Statistics for leaderboards
  stats: {
    woolProduced: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },
    coinsEarned: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },
    llamasFed: {
      type: Number,
      default: 0,
      min: 0
    },
    buildingsConstructed: {
      type: Number,
      default: 0,
      min: 0
    },
    dailyStreak: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },
    maxDailyStreak: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Preferences and settings
  preferences: {
    notifications: {
      enabled: {
        type: Boolean,
        default: true
      },
      types: [{
        type: String,
        enum: ['harvest', 'quest', 'achievement', 'social']
      }]
    },
    privacy: {
      showOnLeaderboard: {
        type: Boolean,
        default: true
      },
      allowFriendRequests: {
        type: Boolean,
        default: true
      }
    },
    gameSettings: {
      autoSave: {
        type: Boolean,
        default: true
      },
      soundEnabled: {
        type: Boolean,
        default: true
      },
      musicEnabled: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Audit trail
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  versionKey: false,
  // Optimize for frequent updates
  minimize: false
});

// Indexes for performance optimization
playerSchema.index({ userId: 1 }, { unique: true });
playerSchema.index({ 'profile.username': 1 }, { unique: true });
playerSchema.index({ 'profile.level': -1, 'profile.experience': -1 });
playerSchema.index({ 'stats.woolProduced': -1 });
playerSchema.index({ 'stats.coinsEarned': -1 });
playerSchema.index({ 'stats.dailyStreak': -1 });
playerSchema.index({ 'profile.lastActive': -1 });
playerSchema.index({ createdAt: 1 });

// Compound indexes for leaderboard queries
playerSchema.index({ 
  'profile.level': -1, 
  'stats.woolProduced': -1, 
  'stats.coinsEarned': -1 
});

// Sharding strategy: shard by userId hash for even distribution
playerSchema.index({ userId: 'hashed' });

// Pre-save middleware for data validation and updates
playerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Validate experience matches level
  const requiredExp = Math.pow(this.profile.level - 1, 2) * 1000;
  if (this.profile.experience < requiredExp) {
    return next(new Error('Experience does not match level'));
  }
  
  next();
});

// Methods for common operations
playerSchema.methods.addExperience = function(amount) {
  this.profile.experience += amount;
  
  // Level up calculation
  const newLevel = Math.floor(Math.sqrt(this.profile.experience / 1000)) + 1;
  if (newLevel > this.profile.level) {
    this.profile.level = Math.min(newLevel, 100);
  }
  
  return this.save();
};

playerSchema.methods.updateStats = function(statUpdates) {
  Object.keys(statUpdates).forEach(key => {
    if (this.stats[key] !== undefined) {
      this.stats[key] += statUpdates[key];
    }
  });
  
  return this.save();
};

// Static methods for queries
playerSchema.statics.getLeaderboard = function(metric, limit = 10) {
  const sortField = `stats.${metric}`;
  return this.find(
    { 'preferences.privacy.showOnLeaderboard': true },
    { 
      'profile.username': 1, 
      'profile.displayName': 1, 
      'profile.level': 1, 
      'stats': 1,
      'profile.avatar': 1
    }
  )
  .sort({ [sortField]: -1 })
  .limit(limit)
  .lean();
};

playerSchema.statics.getActivePlayerCount = function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.countDocuments({ 
    'profile.lastActive': { $gte: oneDayAgo } 
  });
};

module.exports = mongoose.model('Player', playerSchema);