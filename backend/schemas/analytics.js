const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Analytics Events Schema
 * Efficient event collection and aggregation
 * Optimized for high-volume data ingestion and time-series analysis
 */
const analyticsEventSchema = new Schema({
  // Primary identifier
  _id: {
    type: Schema.Types.ObjectId,
    auto: true
  },
  
  // Event identification
  eventId: {
    type: String,
    required: true,
    index: true
  },
  
  eventType: {
    type: String,
    required: true,
    enum: [
      // Player actions
      'player_login',
      'player_logout',
      'player_register',
      'player_level_up',
      
      // Game actions
      'wool_harvest',
      'llama_feed',
      'building_construct',
      'building_upgrade',
      'resource_spend',
      'resource_earn',
      
      // UI interactions
      'button_click',
      'page_view',
      'modal_open',
      'tutorial_step',
      'quest_start',
      'quest_complete',
      
      // Monetization
      'purchase_attempt',
      'purchase_complete',
      'purchase_failed',
      'subscription_start',
      'subscription_cancel',
      
      // Social
      'friend_add',
      'friend_remove',
      'message_send',
      'leaderboard_view',
      
      // Performance
      'load_time',
      'error_occurred',
      'crash_report',
      'performance_metric',
      
      // Custom events
      'custom_event'
    ],
    index: true
  },
  
  // User context
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Not required for anonymous events
    index: true
  },
  
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // Event timing
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // Date partitioning fields for efficient queries
  date: {
    year: {
      type: Number,
      required: true,
      index: true
    },
    month: {
      type: Number,
      required: true,
      index: true
    },
    day: {
      type: Number,
      required: true,
      index: true
    },
    hour: {
      type: Number,
      required: true,
      index: true
    },
    dayOfWeek: {
      type: Number,
      required: true,
      index: true
    }
  },
  
  // Event properties (flexible schema)
  properties: {
    type: Schema.Types.Mixed,
    default: {},
    index: false
  },
  
  // Common event properties (indexed for performance)
  commonProperties: {
    // Resource amounts
    woolAmount: {
      type: Number,
      default: null,
      index: true
    },
    coinAmount: {
      type: Number,
      default: null,
      index: true
    },
    premiumAmount: {
      type: Number,
      default: null,
      index: true
    },
    
    // Player context
    playerLevel: {
      type: Number,
      default: null,
      index: true
    },
    playerExperience: {
      type: Number,
      default: null
    },
    
    // Game context
    buildingType: {
      type: String,
      default: null,
      index: true
    },
    llamaId: {
      type: String,
      default: null,
      index: true
    },
    questId: {
      type: String,
      default: null,
      index: true
    },
    
    // UI context
    screenName: {
      type: String,
      default: null,
      index: true
    },
    buttonName: {
      type: String,
      default: null,
      index: true
    },
    
    // Performance metrics
    loadTime: {
      type: Number,
      default: null,
      index: true
    },
    errorCode: {
      type: String,
      default: null,
      index: true
    },
    
    // Monetization
    purchaseAmount: {
      type: Number,
      default: null,
      index: true
    },
    currency: {
      type: String,
      default: null,
      index: true
    },
    productId: {
      type: String,
      default: null,
      index: true
    }
  },
  
  // Device and platform information
  platform: {
    type: {
      type: String,
      enum: ['web', 'ios', 'android', 'desktop'],
      required: true,
      index: true
    },
    version: {
      type: String,
      required: true
    },
    os: {
      type: String,
      required: true,
      index: true
    },
    osVersion: {
      type: String,
      required: true
    },
    device: {
      type: String,
      required: true,
      index: true
    },
    browser: {
      type: String,
      default: null,
      index: true
    },
    browserVersion: {
      type: String,
      default: null
    },
    screenResolution: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    }
  },
  
  // Geographic information
  geography: {
    country: {
      type: String,
      default: null,
      index: true
    },
    region: {
      type: String,
      default: null,
      index: true
    },
    city: {
      type: String,
      default: null,
      index: true
    },
    timezone: {
      type: String,
      default: null,
      index: true
    },
    language: {
      type: String,
      default: null,
      index: true
    }
  },
  
  // Event metadata
  metadata: {
    // Event version for schema evolution
    version: {
      type: String,
      default: '1.0.0',
      index: true
    },
    
    // Data source
    source: {
      type: String,
      enum: ['client', 'server', 'batch_import'],
      default: 'client',
      index: true
    },
    
    // Processing information
    processedAt: {
      type: Date,
      default: Date.now
    },
    
    // Batch information
    batchId: {
      type: String,
      default: null,
      index: true
    },
    
    // Quality flags
    isTest: {
      type: Boolean,
      default: false,
      index: true
    },
    isBot: {
      type: Boolean,
      default: false,
      index: true
    },
    
    // Data integrity
    checksum: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: false, // We handle timestamps manually
  versionKey: false,
  // Optimize for high-volume writes
  minimize: false,
  // Enable capped collection for log rotation
  capped: false // Can be enabled per deployment
});

// Time-series indexes for efficient queries
analyticsEventSchema.index({ 
  timestamp: -1, 
  eventType: 1 
});

analyticsEventSchema.index({ 
  'date.year': 1, 
  'date.month': 1, 
  'date.day': 1 
});

analyticsEventSchema.index({ 
  'date.year': 1, 
  'date.month': 1, 
  'date.day': 1, 
  'date.hour': 1 
});

// User-specific indexes
analyticsEventSchema.index({ 
  userId: 1, 
  timestamp: -1 
});

analyticsEventSchema.index({ 
  sessionId: 1, 
  timestamp: -1 
});

// Event-specific indexes
analyticsEventSchema.index({ 
  eventType: 1, 
  timestamp: -1 
});

analyticsEventSchema.index({ 
  eventType: 1, 
  'commonProperties.playerLevel': 1 
});

// Platform and geography indexes
analyticsEventSchema.index({ 
  'platform.type': 1, 
  'geography.country': 1, 
  timestamp: -1 
});

// Monetization indexes
analyticsEventSchema.index({ 
  'commonProperties.purchaseAmount': 1, 
  'commonProperties.currency': 1, 
  timestamp: -1 
});

// Performance indexes
analyticsEventSchema.index({ 
  'commonProperties.loadTime': 1, 
  'platform.type': 1 
});

// Compound indexes for common analytics queries
analyticsEventSchema.index({ 
  eventType: 1, 
  'date.year': 1, 
  'date.month': 1, 
  'date.day': 1 
});

analyticsEventSchema.index({ 
  userId: 1, 
  eventType: 1, 
  'date.year': 1, 
  'date.month': 1 
});

// Sharding strategy: shard by date (year-month) for time-series data
analyticsEventSchema.index({ 
  'date.year': 1, 
  'date.month': 1 
});

// TTL index for data retention (optional)
analyticsEventSchema.index({ 
  timestamp: 1 
}, { 
  expireAfterSeconds: 365 * 24 * 60 * 60 // 1 year retention
});

// Pre-save middleware for date partitioning
analyticsEventSchema.pre('save', function(next) {
  const date = this.timestamp || new Date();
  
  this.date = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    dayOfWeek: date.getDay()
  };
  
  // Generate checksum for data integrity
  if (this.properties && Object.keys(this.properties).length > 0) {
    const crypto = require('crypto');
    const dataString = JSON.stringify(this.properties);
    this.metadata.checksum = crypto.createHash('md5').update(dataString).digest('hex');
  }
  
  next();
});

// Static methods for analytics queries
analyticsEventSchema.statics.getDailyStats = function(startDate, endDate, eventTypes = []) {
  const matchQuery = {
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (eventTypes.length > 0) {
    matchQuery.eventType = { $in: eventTypes };
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          year: '$date.year',
          month: '$date.month',
          day: '$date.day',
          eventType: '$eventType'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $project: {
        _id: 1,
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        uniqueSessions: { $size: '$uniqueSessions' }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
  ]);
};

analyticsEventSchema.statics.getUserFunnel = function(userId, funnelSteps) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $match: { eventType: { $in: funnelSteps } } },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: '$eventType',
        firstOccurrence: { $first: '$timestamp' },
        lastOccurrence: { $last: '$timestamp' },
        count: { $sum: 1 }
      }
    }
  ]);
};

analyticsEventSchema.statics.getRevenue = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        eventType: 'purchase_complete',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: '$date.year',
          month: '$date.month',
          day: '$date.day',
          currency: '$commonProperties.currency'
        },
        totalRevenue: { $sum: '$commonProperties.purchaseAmount' },
        transactionCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        _id: 1,
        totalRevenue: 1,
        transactionCount: 1,
        uniqueUsers: { $size: '$uniqueUsers' }
      }
    }
  ]);
};

analyticsEventSchema.statics.getRetention = function(cohortDate) {
  return this.aggregate([
    // Find users who registered on cohort date
    {
      $match: {
        eventType: 'player_register',
        'date.year': cohortDate.getFullYear(),
        'date.month': cohortDate.getMonth() + 1,
        'date.day': cohortDate.getDate()
      }
    },
    { $group: { _id: null, cohortUsers: { $addToSet: '$userId' } } },
    
    // Find login events for these users
    {
      $lookup: {
        from: 'analyticevents',
        let: { users: '$cohortUsers' },
        pipeline: [
          {
            $match: {
              $expr: { $in: ['$userId', '$$users'] },
              eventType: 'player_login',
              timestamp: { $gte: cohortDate }
            }
          },
          {
            $group: {
              _id: {
                userId: '$userId',
                daysSinceRegistration: {
                  $floor: {
                    $divide: [
                      { $subtract: ['$timestamp', cohortDate] },
                      1000 * 60 * 60 * 24
                    ]
                  }
                }
              }
            }
          }
        ],
        as: 'logins'
      }
    }
  ]);
};

analyticsEventSchema.statics.getPerformanceMetrics = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        eventType: 'load_time',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          platform: '$platform.type',
          screenName: '$commonProperties.screenName'
        },
        avgLoadTime: { $avg: '$commonProperties.loadTime' },
        minLoadTime: { $min: '$commonProperties.loadTime' },
        maxLoadTime: { $max: '$commonProperties.loadTime' },
        p95LoadTime: { $percentile: { input: '$commonProperties.loadTime', p: [0.95] } },
        count: { $sum: 1 }
      }
    },
    { $sort: { avgLoadTime: -1 } }
  ]);
};

analyticsEventSchema.statics.getABTestResults = function(testId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        'properties.abTestId': testId,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          variant: '$properties.abTestVariant',
          eventType: '$eventType'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        _id: 1,
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' }
      }
    }
  ]);
};

// Methods for event batching and performance
analyticsEventSchema.statics.bulkInsertEvents = function(events) {
  return this.insertMany(events, {
    ordered: false, // Continue on error
    rawResult: true,
    lean: true
  });
};

analyticsEventSchema.statics.createIndexes = function() {
  // Create additional indexes for specific use cases
  const indexes = [
    { 'userId': 1, 'eventType': 1, 'timestamp': -1 },
    { 'sessionId': 1, 'eventType': 1, 'timestamp': -1 },
    { 'properties.abTestId': 1, 'properties.abTestVariant': 1 },
    { 'commonProperties.questId': 1, 'eventType': 1 },
    { 'commonProperties.buildingType': 1, 'eventType': 1 }
  ];
  
  return Promise.all(indexes.map(index => this.createIndex(index)));
};

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);