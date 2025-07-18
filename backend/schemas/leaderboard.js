const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Leaderboard Schema
 * Rankings with anti-cheat validation points
 * Optimized for real-time updates and fraud detection
 */
const leaderboardSchema = new Schema({
  // Primary identifier
  _id: {
    type: Schema.Types.ObjectId,
    auto: true
  },
  
  // Player reference
  playerId: {
    type: Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    index: true
  },
  
  // Leaderboard category
  category: {
    type: String,
    enum: [
      'wool_production',
      'coins_earned',
      'daily_streak',
      'llama_count',
      'building_count',
      'level',
      'achievements',
      'weekly_wool',
      'monthly_wool',
      'all_time_wool'
    ],
    required: true,
    index: true
  },
  
  // Ranking information
  rank: {
    current: {
      type: Number,
      required: true,
      min: 1,
      index: true
    },
    previous: {
      type: Number,
      default: null
    },
    best: {
      type: Number,
      default: null
    },
    change: {
      type: Number,
      default: 0
    }
  },
  
  // Score and metrics
  score: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  
  // Player display information (denormalized for performance)
  playerInfo: {
    username: {
      type: String,
      required: true,
      index: true
    },
    displayName: {
      type: String,
      required: true
    },
    level: {
      type: Number,
      required: true
    },
    avatar: {
      type: String,
      default: 'default_llama.png'
    }
  },
  
  // Anti-cheat validation points
  validation: {
    // Behavioral patterns
    playTimeConsistency: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    progressionRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    actionFrequency: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    
    // Statistical anomalies
    scoreVariance: {
      type: Number,
      default: 0,
      min: 0
    },
    rateOfChange: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Flags and warnings
    flags: [{
      type: {
        type: String,
        enum: [
          'rapid_progress',
          'impossible_score',
          'suspicious_pattern',
          'inactive_periods',
          'score_manipulation'
        ]
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      description: String
    }],
    
    // Overall trust score
    trustScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
      index: true
    },
    
    // Verification status
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    
    // Last validation check
    lastValidated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Seasonal and time-based tracking
  season: {
    type: String,
    default: 'current',
    index: true
  },
  
  // Historical data points for trend analysis
  history: [{
    date: {
      type: Date,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    rank: {
      type: Number,
      required: true
    },
    change: {
      type: Number,
      default: 0
    }
  }],
  
  // Rewards and achievements
  rewards: [{
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'seasonal', 'milestone']
    },
    rank: Number,
    reward: {
      wool: Number,
      coins: Number,
      premium: Number,
      items: [String]
    },
    claimedAt: {
      type: Date,
      default: null
    }
  }],
  
  // Competitive information
  competition: {
    isActive: {
      type: Boolean,
      default: true
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'bronze',
      index: true
    },
    points: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Timestamps
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Metadata
  metadata: {
    calculationVersion: {
      type: String,
      default: '1.0.0'
    },
    source: {
      type: String,
      enum: ['game_state', 'manual_update', 'batch_calculation'],
      default: 'game_state'
    }
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound indexes for performance
leaderboardSchema.index({ 
  category: 1, 
  'rank.current': 1 
});

leaderboardSchema.index({ 
  category: 1, 
  score: -1, 
  'validation.trustScore': -1 
});

leaderboardSchema.index({ 
  season: 1, 
  category: 1, 
  'rank.current': 1 
});

leaderboardSchema.index({ 
  'validation.trustScore': -1, 
  'validation.isVerified': 1 
});

leaderboardSchema.index({ 
  'competition.tier': 1, 
  'competition.points': -1 
});

leaderboardSchema.index({ 
  playerId: 1, 
  category: 1, 
  season: 1 
}, { unique: true });

// TTL index for historical cleanup
leaderboardSchema.index({ 
  'history.date': 1 
}, { 
  expireAfterSeconds: 365 * 24 * 60 * 60 // 1 year
});

// Sharding strategy: shard by category and season
leaderboardSchema.index({ 
  category: 1, 
  season: 1 
});

// Pre-save middleware for validation scoring
leaderboardSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  
  // Calculate trust score based on validation metrics
  const weights = {
    playTimeConsistency: 0.3,
    progressionRate: 0.3,
    actionFrequency: 0.2,
    flagSeverity: 0.2
  };
  
  let trustScore = 0;
  trustScore += this.validation.playTimeConsistency * weights.playTimeConsistency;
  trustScore += this.validation.progressionRate * weights.progressionRate;
  trustScore += this.validation.actionFrequency * weights.actionFrequency;
  
  // Reduce trust score based on flags
  const flagPenalties = {
    low: 5,
    medium: 15,
    high: 30,
    critical: 50
  };
  
  const flagPenalty = this.validation.flags.reduce((total, flag) => {
    return total + (flagPenalties[flag.severity] || 0);
  }, 0);
  
  trustScore -= flagPenalty;
  this.validation.trustScore = Math.max(0, Math.min(100, trustScore));
  
  // Auto-verify if trust score is high enough
  if (this.validation.trustScore >= 90 && this.validation.flags.length === 0) {
    this.validation.isVerified = true;
  }
  
  next();
});

// Methods for rank management
leaderboardSchema.methods.updateRank = function(newRank) {
  this.rank.previous = this.rank.current;
  this.rank.current = newRank;
  this.rank.change = (this.rank.previous || newRank) - newRank;
  
  if (!this.rank.best || newRank < this.rank.best) {
    this.rank.best = newRank;
  }
  
  return this.save();
};

leaderboardSchema.methods.updateScore = function(newScore) {
  const oldScore = this.score;
  this.score = newScore;
  
  // Add to history
  this.history.push({
    date: new Date(),
    score: newScore,
    rank: this.rank.current,
    change: newScore - oldScore
  });
  
  // Keep only last 100 history entries
  if (this.history.length > 100) {
    this.history = this.history.slice(-100);
  }
  
  return this.save();
};

// Methods for anti-cheat validation
leaderboardSchema.methods.addValidationFlag = function(flagType, severity, description) {
  this.validation.flags.push({
    type: flagType,
    severity: severity,
    description: description,
    timestamp: new Date()
  });
  
  // Remove old flags (keep only last 50)
  if (this.validation.flags.length > 50) {
    this.validation.flags = this.validation.flags.slice(-50);
  }
  
  return this.save();
};

leaderboardSchema.methods.validateScore = function(gameState) {
  const validationResults = {
    playTimeConsistency: 100,
    progressionRate: 100,
    actionFrequency: 100,
    flags: []
  };
  
  // Check for impossible scores
  const maxPossibleScore = this.calculateMaxPossibleScore(gameState);
  if (this.score > maxPossibleScore * 1.1) {
    validationResults.flags.push({
      type: 'impossible_score',
      severity: 'critical',
      description: `Score ${this.score} exceeds maximum possible ${maxPossibleScore}`
    });
  }
  
  // Check progression rate
  if (this.history.length > 1) {
    const recentHistory = this.history.slice(-10);
    const avgChange = recentHistory.reduce((sum, h) => sum + Math.abs(h.change), 0) / recentHistory.length;
    const expectedChange = this.calculateExpectedChange(gameState);
    
    if (avgChange > expectedChange * 3) {
      validationResults.progressionRate = 60;
      validationResults.flags.push({
        type: 'rapid_progress',
        severity: 'medium',
        description: `Unusually rapid progression detected`
      });
    }
  }
  
  // Update validation metrics
  Object.assign(this.validation, validationResults);
  this.validation.lastValidated = new Date();
  
  return this.save();
};

leaderboardSchema.methods.calculateMaxPossibleScore = function(gameState) {
  // Calculate theoretical maximum based on game mechanics
  const playTime = gameState.totalPlayTime || 0;
  const maxWoolPerMinute = 10; // Theoretical maximum
  return Math.floor(playTime * maxWoolPerMinute);
};

leaderboardSchema.methods.calculateExpectedChange = function(gameState) {
  // Calculate expected score change based on player level and buildings
  const level = gameState.profile?.level || 1;
  const buildings = gameState.buildings?.length || 0;
  return Math.floor(level * 10 + buildings * 5);
};

// Static methods for leaderboard queries
leaderboardSchema.statics.getTopPlayers = function(category, season = 'current', limit = 100) {
  return this.find({
    category: category,
    season: season,
    'validation.trustScore': { $gte: 70 }
  })
  .sort({ 'rank.current': 1 })
  .limit(limit)
  .populate('playerId', 'profile.username profile.displayName profile.level')
  .lean();
};

leaderboardSchema.statics.getPlayerRanking = function(playerId, category, season = 'current') {
  return this.findOne({
    playerId: playerId,
    category: category,
    season: season
  })
  .populate('playerId', 'profile.username profile.displayName profile.level')
  .lean();
};

leaderboardSchema.statics.getFlaggedPlayers = function(minSeverity = 'medium') {
  const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
  const minLevel = severityLevels[minSeverity];
  
  return this.find({
    'validation.flags.severity': {
      $in: Object.keys(severityLevels).filter(s => severityLevels[s] >= minLevel)
    }
  })
  .populate('playerId', 'profile.username profile.displayName')
  .lean();
};

leaderboardSchema.statics.updateRankings = function(category, season = 'current') {
  return this.find({ category, season })
    .sort({ score: -1, 'validation.trustScore': -1 })
    .then(entries => {
      const updates = entries.map((entry, index) => ({
        updateOne: {
          filter: { _id: entry._id },
          update: { 
            $set: { 
              'rank.previous': entry.rank.current,
              'rank.current': index + 1,
              'rank.change': (entry.rank.current || index + 1) - (index + 1)
            }
          }
        }
      }));
      
      return this.bulkWrite(updates);
    });
};

module.exports = mongoose.model('Leaderboard', leaderboardSchema);