/**
 * WebSocket Server Setup
 * Handles real-time communication for game events, leaderboards, and social features
 */

const { logger } = require('../utils/logger');
const { auth } = require('../middleware/auth');
const { GameStateService } = require('../services/GameStateService');
const { LeaderboardService } = require('../services/LeaderboardService');
const { NotificationService } = require('../services/NotificationService');
const { RateLimitService } = require('../services/RateLimitService');

// Connection management
const connectedUsers = new Map();
const roomManagement = new Map();

// WebSocket events
const EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  
  // Game events
  GAME_STATE_UPDATE: 'gameStateUpdate',
  PRODUCTION_TICK: 'productionTick',
  ACHIEVEMENT_UNLOCK: 'achievementUnlock',
  LEVEL_UP: 'levelUp',
  PRESTIGE_COMPLETE: 'prestigeComplete',
  
  // Leaderboard events
  LEADERBOARD_UPDATE: 'leaderboardUpdate',
  RANK_CHANGE: 'rankChange',
  
  // Social events
  PLAYER_ONLINE: 'playerOnline',
  PLAYER_OFFLINE: 'playerOffline',
  GLOBAL_EVENT: 'globalEvent',
  
  // System events
  MAINTENANCE_MODE: 'maintenanceMode',
  SERVER_MESSAGE: 'serverMessage',
  
  // Error events
  ERROR: 'error',
  RATE_LIMITED: 'rateLimited'
};

/**
 * Setup WebSocket server with all event handlers
 */
function setupWebSocket(io) {
  logger.info('🔌 Initializing WebSocket server...');
  
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      
      // Verify token and get user
      const user = await auth.verifyToken(token);
      if (!user) {
        return next(new Error('Invalid authentication token'));
      }
      
      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });
  
  // Connection handler
  io.on(EVENTS.CONNECTION, (socket) => {
    handleConnection(socket, io);
  });
  
  // Periodic updates
  setInterval(() => {
    broadcastLeaderboardUpdates(io);
    broadcastProductionTicks(io);
  }, 1000); // 1 second intervals
  
  // Leaderboard updates every 30 seconds
  setInterval(() => {
    broadcastLeaderboardUpdates(io);
  }, 30000);
  
  logger.info('✅ WebSocket server initialized successfully');
}

/**
 * Handle new WebSocket connections
 */
async function handleConnection(socket, io) {
  const userId = socket.userId;
  const user = socket.user;
  
  logger.info(`🔗 User connected: ${user.username} (${userId})`);
  
  // Store connection
  connectedUsers.set(userId, {
    socket,
    user,
    connectedAt: Date.now(),
    lastActivity: Date.now()
  });
  
  // Join user-specific room
  await socket.join(`user:${userId}`);
  
  // Join global rooms
  await socket.join('global');
  await socket.join('leaderboard');
  
  // Send welcome message
  socket.emit(EVENTS.SERVER_MESSAGE, {
    type: 'welcome',
    message: `Welcome back, ${user.username}!`,
    timestamp: Date.now()
  });
  
  // Broadcast user online status
  socket.broadcast.emit(EVENTS.PLAYER_ONLINE, {
    userId,
    username: user.username,
    timestamp: Date.now()
  });
  
  // Setup event handlers
  setupEventHandlers(socket, io);
  
  // Handle disconnection
  socket.on(EVENTS.DISCONNECT, () => {
    handleDisconnection(socket, io);
  });
}

/**
 * Setup all event handlers for a socket
 */
function setupEventHandlers(socket, io) {
  const userId = socket.userId;
  
  // Game state updates
  socket.on(EVENTS.GAME_STATE_UPDATE, async (data) => {
    if (await RateLimitService.checkLimit(userId, 'gameUpdate', 10, 1000)) {
      socket.emit(EVENTS.RATE_LIMITED, { 
        event: 'gameStateUpdate',
        retryAfter: 1000
      });
      return;
    }
    
    try {
      const updatedState = await GameStateService.updateState(userId, data);
      
      // Send updated state back to client
      socket.emit(EVENTS.GAME_STATE_UPDATE, {
        state: updatedState,
        timestamp: Date.now()
      });
      
      // Check for achievements
      await checkAchievements(socket, updatedState);
      
      // Update leaderboard if needed
      await updateLeaderboardIfNeeded(socket, updatedState);
      
    } catch (error) {
      logger.error('Game state update error:', error);
      socket.emit(EVENTS.ERROR, {
        event: 'gameStateUpdate',
        error: error.message
      });
    }
  });
  
  // Production tick updates
  socket.on('requestProductionTick', async () => {
    try {
      const production = await GameStateService.calculateProduction(userId);
      socket.emit(EVENTS.PRODUCTION_TICK, {
        production,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Production tick error:', error);
      socket.emit(EVENTS.ERROR, {
        event: 'productionTick',
        error: error.message
      });
    }
  });
  
  // Leaderboard requests
  socket.on('requestLeaderboard', async (data) => {
    try {
      const { type = 'total', limit = 100 } = data;
      const leaderboard = await LeaderboardService.getLeaderboard(type, limit);
      
      socket.emit(EVENTS.LEADERBOARD_UPDATE, {
        type,
        leaderboard,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Leaderboard request error:', error);
      socket.emit(EVENTS.ERROR, {
        event: 'leaderboard',
        error: error.message
      });
    }
  });
  
  // Join/leave rooms
  socket.on('joinRoom', async (roomId) => {
    try {
      await socket.join(roomId);
      socket.emit('roomJoined', { roomId });
      
      // Track room membership
      if (!roomManagement.has(roomId)) {
        roomManagement.set(roomId, new Set());
      }
      roomManagement.get(roomId).add(userId);
      
    } catch (error) {
      logger.error('Join room error:', error);
      socket.emit(EVENTS.ERROR, {
        event: 'joinRoom',
        error: error.message
      });
    }
  });
  
  socket.on('leaveRoom', async (roomId) => {
    try {
      await socket.leave(roomId);
      socket.emit('roomLeft', { roomId });
      
      // Update room membership
      if (roomManagement.has(roomId)) {
        roomManagement.get(roomId).delete(userId);
      }
      
    } catch (error) {
      logger.error('Leave room error:', error);
      socket.emit(EVENTS.ERROR, {
        event: 'leaveRoom',
        error: error.message
      });
    }
  });
  
  // Activity tracking
  socket.on('heartbeat', () => {
    const userConnection = connectedUsers.get(userId);
    if (userConnection) {
      userConnection.lastActivity = Date.now();
    }
  });
}

/**
 * Handle WebSocket disconnections
 */
function handleDisconnection(socket, io) {
  const userId = socket.userId;
  const user = socket.user;
  
  logger.info(`🔌 User disconnected: ${user.username} (${userId})`);
  
  // Remove from connected users
  connectedUsers.delete(userId);
  
  // Clean up room memberships
  for (const [roomId, users] of roomManagement.entries()) {
    users.delete(userId);
    if (users.size === 0) {
      roomManagement.delete(roomId);
    }
  }
  
  // Broadcast user offline status
  socket.broadcast.emit(EVENTS.PLAYER_OFFLINE, {
    userId,
    username: user.username,
    timestamp: Date.now()
  });
}

/**
 * Check for new achievements and notify
 */
async function checkAchievements(socket, gameState) {
  try {
    const newAchievements = await GameStateService.checkAchievements(
      socket.userId, 
      gameState
    );
    
    for (const achievement of newAchievements) {
      socket.emit(EVENTS.ACHIEVEMENT_UNLOCK, {
        achievement,
        timestamp: Date.now()
      });
      
      // Broadcast to global if it's a rare achievement
      if (achievement.rarity === 'legendary') {
        socket.broadcast.emit(EVENTS.GLOBAL_EVENT, {
          type: 'rareAchievement',
          player: socket.user.username,
          achievement: achievement.name,
          timestamp: Date.now()
        });
      }
    }
  } catch (error) {
    logger.error('Achievement check error:', error);
  }
}

/**
 * Update leaderboard if player rank changed significantly
 */
async function updateLeaderboardIfNeeded(socket, gameState) {
  try {
    const rankChange = await LeaderboardService.updatePlayerRank(
      socket.userId, 
      gameState.totalWoolProduced
    );
    
    if (rankChange && Math.abs(rankChange) >= 10) {
      socket.emit(EVENTS.RANK_CHANGE, {
        oldRank: rankChange.oldRank,
        newRank: rankChange.newRank,
        change: rankChange.change,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    logger.error('Leaderboard update error:', error);
  }
}

/**
 * Broadcast production ticks to all connected users
 */
function broadcastProductionTicks(io) {
  for (const [userId, connection] of connectedUsers.entries()) {
    // Only send to active connections (heartbeat within last 30 seconds)
    if (Date.now() - connection.lastActivity < 30000) {
      GameStateService.calculateProduction(userId)
        .then(production => {
          connection.socket.emit(EVENTS.PRODUCTION_TICK, {
            production,
            timestamp: Date.now()
          });
        })
        .catch(error => {
          logger.error(`Production tick error for user ${userId}:`, error);
        });
    }
  }
}

/**
 * Broadcast leaderboard updates to subscribed users
 */
async function broadcastLeaderboardUpdates(io) {
  try {
    const leaderboard = await LeaderboardService.getTopPlayers(50);
    
    io.to('leaderboard').emit(EVENTS.LEADERBOARD_UPDATE, {
      type: 'total',
      leaderboard,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Leaderboard broadcast error:', error);
  }
}

/**
 * Broadcast global events to all connected users
 */
function broadcastGlobalEvent(io, event) {
  io.emit(EVENTS.GLOBAL_EVENT, {
    ...event,
    timestamp: Date.now()
  });
}

/**
 * Send maintenance mode notifications
 */
function notifyMaintenanceMode(io, message, scheduledTime) {
  io.emit(EVENTS.MAINTENANCE_MODE, {
    message,
    scheduledTime,
    timestamp: Date.now()
  });
}

/**
 * Get connection statistics
 */
function getConnectionStats() {
  return {
    totalConnections: connectedUsers.size,
    activeConnections: Array.from(connectedUsers.values()).filter(
      conn => Date.now() - conn.lastActivity < 30000
    ).length,
    totalRooms: roomManagement.size,
    averageRoomSize: roomManagement.size > 0 ? 
      Array.from(roomManagement.values()).reduce((sum, users) => sum + users.size, 0) / roomManagement.size : 0
  };
}

module.exports = {
  setupWebSocket,
  broadcastGlobalEvent,
  notifyMaintenanceMode,
  getConnectionStats,
  EVENTS
};