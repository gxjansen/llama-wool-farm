const mongoose = require('mongoose');

// Import all schemas
const User = require('./user');
const Player = require('./player');
const GameState = require('./gameState');
const Leaderboard = require('./leaderboard');
const AnalyticsEvent = require('./analytics');

/**
 * Schema Index and Database Management
 * Provides centralized schema management and utilities
 */

// Export all models
module.exports = {
  User,
  Player,
  GameState,
  Leaderboard,
  AnalyticsEvent,
  
  // Database connection management
  connect: async (uri, options = {}) => {
    const defaultOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
      ...options
    };
    
    try {
      const conn = await mongoose.connect(uri, defaultOptions);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      
      // Set up event handlers
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
      });
      
      return conn;
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error;
    }
  },
  
  // Graceful shutdown
  disconnect: async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  },
  
  // Database initialization
  initialize: async () => {
    try {
      // Create all indexes
      await Promise.all([
        User.createIndexes(),
        Player.createIndexes(),
        GameState.createIndexes(),
        Leaderboard.createIndexes(),
        AnalyticsEvent.createIndexes()
      ]);
      
      console.log('All database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
      throw error;
    }
  },
  
  // Database health check
  healthCheck: async () => {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };
      
      return {
        status: states[state],
        connected: state === 1,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      };
    } catch (error) {
      return {
        status: 'error',
        connected: false,
        error: error.message
      };
    }
  },
  
  // Schema validation utilities
  validateSchemas: async () => {
    const validationResults = {};
    
    try {
      // Test each schema with sample data
      const testUser = new User({
        email: 'test@example.com',
        password: 'TestPass123!',
        profile: {
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: new Date('1990-01-01')
        }
      });
      
      const testPlayer = new Player({
        userId: new mongoose.Types.ObjectId(),
        profile: {
          username: 'testuser',
          displayName: 'Test User'
        }
      });
      
      const testGameState = new GameState({
        playerId: new mongoose.Types.ObjectId(),
        resources: {
          wool: 100,
          coins: 50,
          feed: 25
        }
      });
      
      const testLeaderboard = new Leaderboard({
        playerId: new mongoose.Types.ObjectId(),
        category: 'wool_production',
        rank: { current: 1 },
        score: 1000,
        playerInfo: {
          username: 'testuser',
          displayName: 'Test User',
          level: 5
        }
      });
      
      const testAnalytics = new AnalyticsEvent({
        eventId: 'test-event-1',
        eventType: 'player_login',
        sessionId: 'test-session-1',
        platform: {
          type: 'web',
          version: '1.0.0',
          os: 'Windows',
          osVersion: '10',
          device: 'Desktop'
        }
      });
      
      // Validate without saving
      await testUser.validate();
      await testPlayer.validate();
      await testGameState.validate();
      await testLeaderboard.validate();
      await testAnalytics.validate();
      
      validationResults.all = 'passed';
      validationResults.user = 'passed';
      validationResults.player = 'passed';
      validationResults.gameState = 'passed';
      validationResults.leaderboard = 'passed';
      validationResults.analytics = 'passed';
      
    } catch (error) {
      validationResults.all = 'failed';
      validationResults.error = error.message;
    }
    
    return validationResults;
  },
  
  // Migration utilities
  migrations: {
    // Create initial admin user
    createAdminUser: async (email, password) => {
      try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return { success: false, message: 'Admin user already exists' };
        }
        
        const adminUser = new User({
          email,
          password,
          profile: {
            firstName: 'Admin',
            lastName: 'User',
            dateOfBirth: new Date('1990-01-01')
          },
          status: {
            isActive: true,
            isVerified: true
          },
          subscription: {
            plan: 'pro'
          }
        });
        
        await adminUser.save();
        return { success: true, userId: adminUser._id };
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    
    // Seed sample data
    seedSampleData: async () => {
      try {
        // Create sample users
        const sampleUsers = [
          {
            email: 'alice@example.com',
            password: 'SamplePass123!',
            profile: {
              firstName: 'Alice',
              lastName: 'Johnson',
              dateOfBirth: new Date('1985-03-15')
            }
          },
          {
            email: 'bob@example.com',
            password: 'SamplePass123!',
            profile: {
              firstName: 'Bob',
              lastName: 'Smith',
              dateOfBirth: new Date('1990-07-22')
            }
          }
        ];
        
        const createdUsers = await Promise.all(
          sampleUsers.map(async (userData) => {
            const existingUser = await User.findOne({ email: userData.email });
            if (!existingUser) {
              const user = new User(userData);
              return await user.save();
            }
            return existingUser;
          })
        );
        
        // Create sample players
        const samplePlayers = await Promise.all(
          createdUsers.map(async (user, index) => {
            const existingPlayer = await Player.findOne({ userId: user._id });
            if (!existingPlayer) {
              const player = new Player({
                userId: user._id,
                profile: {
                  username: `player${index + 1}`,
                  displayName: user.profile.firstName,
                  level: Math.floor(Math.random() * 20) + 1,
                  experience: Math.floor(Math.random() * 10000)
                },
                stats: {
                  woolProduced: Math.floor(Math.random() * 5000),
                  coinsEarned: Math.floor(Math.random() * 10000),
                  dailyStreak: Math.floor(Math.random() * 30)
                }
              });
              return await player.save();
            }
            return existingPlayer;
          })
        );
        
        // Create sample game states
        await Promise.all(
          samplePlayers.map(async (player) => {
            const existingGameState = await GameState.findOne({ playerId: player._id });
            if (!existingGameState) {
              const gameState = new GameState({
                playerId: player._id,
                resources: {
                  wool: Math.floor(Math.random() * 1000),
                  coins: Math.floor(Math.random() * 500),
                  feed: Math.floor(Math.random() * 100)
                },
                llamas: [
                  {
                    llamaId: new mongoose.Types.ObjectId().toString(),
                    name: 'Fluffy',
                    breed: 'alpaca',
                    color: 'white',
                    level: Math.floor(Math.random() * 10) + 1,
                    position: { x: 10, y: 10 }
                  }
                ],
                buildings: [
                  {
                    buildingId: new mongoose.Types.ObjectId().toString(),
                    type: 'barn',
                    level: 1,
                    position: { x: 5, y: 5 }
                  }
                ]
              });
              await gameState.save();
            }
          })
        );
        
        return { success: true, message: 'Sample data created successfully' };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },
  
  // Database statistics
  getStats: async () => {
    try {
      const stats = await Promise.all([
        User.countDocuments(),
        Player.countDocuments(),
        GameState.countDocuments(),
        Leaderboard.countDocuments(),
        AnalyticsEvent.countDocuments()
      ]);
      
      return {
        users: stats[0],
        players: stats[1],
        gameStates: stats[2],
        leaderboards: stats[3],
        analyticsEvents: stats[4],
        total: stats.reduce((sum, count) => sum + count, 0)
      };
    } catch (error) {
      return { error: error.message };
    }
  }
};

// Schema documentation
module.exports.documentation = {
  User: {
    description: 'User authentication and profile management',
    collections: 'users',
    indexes: [
      'email (unique)',
      'status.isActive, status.isBanned',
      'security.lastLogin',
      'subscription.plan, subscription.status'
    ],
    sharding: 'email (hashed)',
    methods: [
      'comparePassword',
      'generateJWT',
      'generateRefreshToken',
      'verifyEmail',
      'resetPassword'
    ]
  },
  
  Player: {
    description: 'Player profiles and game progression',
    collections: 'players',
    indexes: [
      'userId (unique)',
      'profile.username (unique)',
      'profile.level, profile.experience',
      'stats.woolProduced, stats.coinsEarned'
    ],
    sharding: 'userId (hashed)',
    methods: [
      'addExperience',
      'updateStats',
      'getLeaderboard'
    ]
  },
  
  GameState: {
    description: 'Game state management with conflict resolution',
    collections: 'gamestates',
    indexes: [
      'playerId (unique)',
      'resources.wool, resources.coins',
      'activeProcesses.endTime'
    ],
    sharding: 'playerId (hashed)',
    methods: [
      'addResources',
      'spendResources',
      'addLlama',
      'addBuilding'
    ]
  },
  
  Leaderboard: {
    description: 'Rankings with anti-cheat validation',
    collections: 'leaderboards',
    indexes: [
      'category, rank.current',
      'validation.trustScore, validation.isVerified',
      'season, category'
    ],
    sharding: 'category, season',
    methods: [
      'updateRank',
      'updateScore',
      'validateScore'
    ]
  },
  
  AnalyticsEvent: {
    description: 'High-volume event tracking and analytics',
    collections: 'analyticevents',
    indexes: [
      'timestamp, eventType',
      'userId, timestamp',
      'date.year, date.month, date.day'
    ],
    sharding: 'date.year, date.month',
    methods: [
      'getDailyStats',
      'getUserFunnel',
      'getRevenue'
    ]
  }
};