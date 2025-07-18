/**
 * Real-time Service
 * Handles WebSocket connections and real-time updates using Supabase
 */

const { getSupabaseClient } = require('../config/supabase');
const { logger } = require('../utils/logger');

class RealtimeService {
  constructor() {
    this.channels = new Map();
    this.subscribers = new Map();
    this.heartbeatInterval = null;
  }

  /**
   * Initialize real-time service
   */
  async initialize() {
    try {
      const supabase = getSupabaseClient();
      
      // Set up global realtime event handlers
      supabase.realtime.onOpen(() => {
        logger.info('🔴 Supabase realtime connection opened');
      });

      supabase.realtime.onClose(() => {
        logger.warn('🔴 Supabase realtime connection closed');
      });

      supabase.realtime.onError((error) => {
        logger.error('🔴 Supabase realtime error:', error);
      });

      // Start heartbeat
      this.startHeartbeat();
      
      logger.info('✅ Real-time service initialized');
    } catch (error) {
      logger.error('Error initializing real-time service:', error);
      throw error;
    }
  }

  /**
   * Subscribe to player's game state changes
   */
  subscribeToGameState(playerId, callback) {
    try {
      const supabase = getSupabaseClient();
      const channelName = `game_state_${playerId}`;
      
      const channel = supabase.channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_states',
          filter: `player_id=eq.${playerId}`
        }, (payload) => {
          logger.debug(`Game state change for player ${playerId}:`, payload);
          callback({
            type: 'game_state_updated',
            payload: payload.new || payload.old,
            eventType: payload.eventType
          });
        })
        .on('broadcast', { event: 'game_state_updated' }, (payload) => {
          callback({
            type: 'game_state_updated',
            payload: payload.payload,
            eventType: 'broadcast'
          });
        })
        .on('broadcast', { event: 'building_purchased' }, (payload) => {
          callback({
            type: 'building_purchased',
            payload: payload.payload,
            eventType: 'broadcast'
          });
        })
        .on('broadcast', { event: 'upgrade_purchased' }, (payload) => {
          callback({
            type: 'upgrade_purchased',
            payload: payload.payload,
            eventType: 'broadcast'
          });
        })
        .subscribe();

      this.channels.set(channelName, channel);
      this.addSubscriber(playerId, channelName, callback);
      
      logger.info(`Subscribed to game state for player ${playerId}`);
      return channelName;
    } catch (error) {
      logger.error('Error subscribing to game state:', error);
      throw error;
    }
  }

  /**
   * Subscribe to building changes
   */
  subscribeToBuildings(playerId, callback) {
    try {
      const supabase = getSupabaseClient();
      const channelName = `buildings_${playerId}`;
      
      const channel = supabase.channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_buildings',
          filter: `player_id=eq.${playerId}`
        }, (payload) => {
          logger.debug(`Building change for player ${playerId}:`, payload);
          callback({
            type: 'building_updated',
            payload: payload.new || payload.old,
            eventType: payload.eventType
          });
        })
        .subscribe();

      this.channels.set(channelName, channel);
      this.addSubscriber(playerId, channelName, callback);
      
      logger.info(`Subscribed to buildings for player ${playerId}`);
      return channelName;
    } catch (error) {
      logger.error('Error subscribing to buildings:', error);
      throw error;
    }
  }

  /**
   * Subscribe to achievements
   */
  subscribeToAchievements(playerId, callback) {
    try {
      const supabase = getSupabaseClient();
      const channelName = `achievements_${playerId}`;
      
      const channel = supabase.channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'player_achievements',
          filter: `player_id=eq.${playerId}`
        }, (payload) => {
          logger.debug(`Achievement unlocked for player ${playerId}:`, payload);
          callback({
            type: 'achievement_unlocked',
            payload: payload.new,
            eventType: payload.eventType
          });
        })
        .subscribe();

      this.channels.set(channelName, channel);
      this.addSubscriber(playerId, channelName, callback);
      
      logger.info(`Subscribed to achievements for player ${playerId}`);
      return channelName;
    } catch (error) {
      logger.error('Error subscribing to achievements:', error);
      throw error;
    }
  }

  /**
   * Subscribe to leaderboard changes
   */
  subscribeToLeaderboard(callback) {
    try {
      const supabase = getSupabaseClient();
      const channelName = 'leaderboard';
      
      const channel = supabase.channel(channelName)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: 'total_wool_produced=gt.0'
        }, (payload) => {
          logger.debug('Leaderboard change:', payload);
          callback({
            type: 'leaderboard_updated',
            payload: payload.new,
            eventType: payload.eventType
          });
        })
        .subscribe();

      this.channels.set(channelName, channel);
      
      logger.info('Subscribed to leaderboard changes');
      return channelName;
    } catch (error) {
      logger.error('Error subscribing to leaderboard:', error);
      throw error;
    }
  }

  /**
   * Subscribe to friend activity
   */
  subscribeToFriendActivity(playerId, callback) {
    try {
      const supabase = getSupabaseClient();
      const channelName = `friend_activity_${playerId}`;
      
      // First get friend IDs
      supabase
        .from('player_friends')
        .select('friend_id')
        .eq('player_id', playerId)
        .then(({ data: friends }) => {
          if (!friends || friends.length === 0) return;
          
          const friendIds = friends.map(f => f.friend_id);
          
          const channel = supabase.channel(channelName)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'players',
              filter: `id=in.(${friendIds.join(',')})`
            }, (payload) => {
              logger.debug(`Friend activity for player ${playerId}:`, payload);
              callback({
                type: 'friend_activity',
                payload: payload.new,
                eventType: payload.eventType
              });
            })
            .subscribe();

          this.channels.set(channelName, channel);
          this.addSubscriber(playerId, channelName, callback);
        });
      
      logger.info(`Subscribed to friend activity for player ${playerId}`);
      return channelName;
    } catch (error) {
      logger.error('Error subscribing to friend activity:', error);
      throw error;
    }
  }

  /**
   * Subscribe to all player events
   */
  subscribeToPlayer(playerId, callback) {
    try {
      const channels = [
        this.subscribeToGameState(playerId, callback),
        this.subscribeToBuildings(playerId, callback),
        this.subscribeToAchievements(playerId, callback),
        this.subscribeToFriendActivity(playerId, callback)
      ];

      logger.info(`Subscribed to all events for player ${playerId}`);
      return channels;
    } catch (error) {
      logger.error('Error subscribing to player events:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channelName) {
    try {
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.unsubscribe();
        this.channels.delete(channelName);
        
        // Remove from subscribers
        for (const [playerId, channels] of this.subscribers.entries()) {
          channels.delete(channelName);
          if (channels.size === 0) {
            this.subscribers.delete(playerId);
          }
        }
        
        logger.info(`Unsubscribed from channel ${channelName}`);
      }
    } catch (error) {
      logger.error('Error unsubscribing from channel:', error);
    }
  }

  /**
   * Unsubscribe from all channels for a player
   */
  unsubscribePlayer(playerId) {
    try {
      const channels = this.subscribers.get(playerId);
      if (channels) {
        for (const channelName of channels.keys()) {
          this.unsubscribe(channelName);
        }
        this.subscribers.delete(playerId);
        
        logger.info(`Unsubscribed player ${playerId} from all channels`);
      }
    } catch (error) {
      logger.error('Error unsubscribing player:', error);
    }
  }

  /**
   * Send broadcast message
   */
  async sendBroadcast(channelName, event, payload) {
    try {
      const channel = this.channels.get(channelName);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event,
          payload
        });
        
        logger.debug(`Sent broadcast to ${channelName}: ${event}`);
      }
    } catch (error) {
      logger.error('Error sending broadcast:', error);
    }
  }

  /**
   * Send message to specific player
   */
  async sendToPlayer(playerId, event, payload) {
    try {
      const channelName = `game_state_${playerId}`;
      await this.sendBroadcast(channelName, event, payload);
    } catch (error) {
      logger.error('Error sending message to player:', error);
    }
  }

  /**
   * Get channel status
   */
  getChannelStatus(channelName) {
    const channel = this.channels.get(channelName);
    if (!channel) return null;
    
    return {
      name: channelName,
      state: channel.state,
      subscriptions: channel.bindings.length
    };
  }

  /**
   * Get all active channels
   */
  getActiveChannels() {
    return Array.from(this.channels.keys()).map(name => this.getChannelStatus(name));
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount() {
    return this.subscribers.size;
  }

  /**
   * Start heartbeat to keep connections alive
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      logger.debug(`Heartbeat: ${this.channels.size} channels, ${this.subscribers.size} subscribers`);
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Cleanup all connections
   */
  async cleanup() {
    try {
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Unsubscribe from all channels
      for (const channelName of this.channels.keys()) {
        this.unsubscribe(channelName);
      }
      
      // Clear all data
      this.channels.clear();
      this.subscribers.clear();
      
      logger.info('🔌 Real-time service cleaned up');
    } catch (error) {
      logger.error('Error during realtime cleanup:', error);
    }
  }

  // Helper methods
  addSubscriber(playerId, channelName, callback) {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, new Map());
    }
    
    this.subscribers.get(playerId).set(channelName, callback);
  }
}

// Create singleton instance
const realtimeService = new RealtimeService();

module.exports = {
  RealtimeService,
  realtimeService
};