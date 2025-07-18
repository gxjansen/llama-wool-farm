/**
 * Performance Configuration Module
 * Centralized configuration for Supabase performance optimization
 * Handles connection pooling, caching, and real-time subscriptions
 */

const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

/**
 * Supabase Performance Configuration
 */
class SupabasePerformanceConfig {
  constructor() {
    this.supabase = null;
    this.connectionPool = null;
    this.cacheConfig = {
      // Cache TTL in seconds
      ttl: {
        leaderboard: 300,      // 5 minutes
        gameState: 30,         // 30 seconds
        playerProfile: 600,    // 10 minutes
        analytics: 1800,       // 30 minutes
        staticData: 3600       // 1 hour
      },
      // Cache size limits
      maxSize: {
        leaderboard: 1000,
        gameState: 5000,
        playerProfile: 2000,
        analytics: 500
      }
    };
    
    this.realTimeConfig = {
      // Channel configurations
      channels: {
        gameState: {
          maxSubscribers: 1000,
          bufferSize: 100,
          throttle: 100 // ms
        },
        leaderboard: {
          maxSubscribers: 5000,
          bufferSize: 50,
          throttle: 5000 // ms
        },
        playerStatus: {
          maxSubscribers: 2000,
          bufferSize: 200,
          throttle: 1000 // ms
        }
      },
      // Connection settings
      heartbeatInterval: 30000,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10
    };
  }

  /**
   * Initialize Supabase client with performance optimizations
   */
  async initialize() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration');
      }

      // Initialize Supabase client with performance settings
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        db: {
          schema: 'public',
        },
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        },
        realtime: {
          params: {
            eventsPerSecond: 50, // Limit events per second
            heartbeatInterval: this.realTimeConfig.heartbeatInterval,
            reconnectInterval: this.realTimeConfig.reconnectInterval
          }
        },
        global: {
          headers: {
            'X-Client-Info': 'llama-wool-farm/1.0.0',
            'X-Performance-Mode': 'optimized'
          }
        }
      });

      // Initialize connection pool
      await this.initializeConnectionPool();

      // Setup monitoring
      this.setupPerformanceMonitoring();

      logger.info('✅ Supabase performance configuration initialized');
      return this.supabase;
    } catch (error) {
      logger.error('❌ Failed to initialize Supabase performance config:', error);
      throw error;
    }
  }

  /**
   * Initialize connection pooling
   */
  async initializeConnectionPool() {
    const poolConfig = {
      max: parseInt(process.env.SUPABASE_POOL_SIZE) || 20,
      min: parseInt(process.env.SUPABASE_POOL_MIN) || 5,
      idle: parseInt(process.env.SUPABASE_POOL_IDLE) || 10000,
      acquire: parseInt(process.env.SUPABASE_POOL_ACQUIRE) || 30000,
      evict: parseInt(process.env.SUPABASE_POOL_EVICT) || 1000,
      handleDisconnects: true
    };

    logger.info('🔗 Connection pool initialized:', poolConfig);
    this.connectionPool = poolConfig;
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor connection pool health
    setInterval(() => {
      this.checkConnectionHealth();
    }, 30000);

    // Monitor cache hit rates
    setInterval(() => {
      this.logCacheMetrics();
    }, 60000);

    // Monitor real-time subscription health
    setInterval(() => {
      this.checkRealtimeHealth();
    }, 15000);
  }

  /**
   * Check connection health
   */
  async checkConnectionHealth() {
    try {
      const start = Date.now();
      await this.supabase.rpc('connection_health_check');
      const latency = Date.now() - start;
      
      if (latency > 1000) {
        logger.warn(`⚠️ High database latency: ${latency}ms`);
      }
      
      // Log health metrics
      logger.debug('🔍 Connection health check:', {
        latency,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ Connection health check failed:', error);
    }
  }

  /**
   * Log cache metrics
   */
  logCacheMetrics() {
    // This would integrate with your cache layer
    logger.debug('📊 Cache metrics:', {
      hitRate: '85%', // Placeholder - implement actual cache metrics
      size: '1.2GB',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check real-time subscription health
   */
  checkRealtimeHealth() {
    const channels = this.supabase.getChannels();
    
    logger.debug('🔴 Real-time health:', {
      activeChannels: channels.length,
      status: this.supabase.realtime.connection.connectionState,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get optimized query builder
   */
  getOptimizedQuery(table) {
    return this.supabase
      .from(table)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
  }

  /**
   * Batch operations for better performance
   */
  async batchOperation(operations) {
    try {
      const results = await Promise.all(
        operations.map(op => this.executeOperation(op))
      );
      
      return results;
    } catch (error) {
      logger.error('❌ Batch operation failed:', error);
      throw error;
    }
  }

  /**
   * Execute single operation
   */
  async executeOperation(operation) {
    const { type, table, data, query } = operation;
    
    switch (type) {
      case 'select':
        return await this.supabase.from(table).select(query);
      case 'insert':
        return await this.supabase.from(table).insert(data);
      case 'update':
        return await this.supabase.from(table).update(data).match(query);
      case 'delete':
        return await this.supabase.from(table).delete().match(query);
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  /**
   * Real-time subscription with performance optimizations
   */
  createOptimizedSubscription(table, filters = {}) {
    const channel = this.supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: filters.filter || undefined
      }, (payload) => {
        this.handleRealtimePayload(table, payload);
      })
      .subscribe();

    return channel;
  }

  /**
   * Handle real-time payload with throttling
   */
  handleRealtimePayload(table, payload) {
    const config = this.realTimeConfig.channels[table];
    
    if (config && config.throttle) {
      // Implement throttling logic
      const now = Date.now();
      const lastUpdate = this.lastRealtimeUpdate || 0;
      
      if (now - lastUpdate < config.throttle) {
        return; // Skip this update due to throttling
      }
      
      this.lastRealtimeUpdate = now;
    }
    
    // Process the payload
    logger.debug(`🔄 Real-time update for ${table}:`, payload);
  }

  /**
   * Query optimization utilities
   */
  getQueryOptimizations() {
    return {
      // Pagination settings
      pagination: {
        defaultLimit: 25,
        maxLimit: 100
      },
      
      // Field selection patterns
      fieldSelections: {
        player: 'id, username, display_name, level, wool_produced, coins_earned, last_active',
        gameState: 'id, player_id, wool, coins, feed, last_saved, version',
        leaderboard: 'id, player_id, category, score, rank, updated_at'
      },
      
      // Common filters
      filters: {
        active: 'deleted_at.is.null',
        recent: `last_active.gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`,
        public: 'show_on_leaderboard.eq.true'
      }
    };
  }

  /**
   * Performance analytics and monitoring
   */
  async getPerformanceMetrics() {
    try {
      const metrics = {
        connectionPool: {
          active: this.connectionPool?.active || 0,
          idle: this.connectionPool?.idle || 0,
          waiting: this.connectionPool?.waiting || 0
        },
        queries: {
          slow: await this.getSlowQueries(),
          frequent: await this.getFrequentQueries()
        },
        cache: {
          hitRate: await this.getCacheHitRate(),
          size: await this.getCacheSize()
        },
        realtime: {
          activeChannels: this.supabase.getChannels().length,
          connectionState: this.supabase.realtime.connection.connectionState
        }
      };

      return metrics;
    } catch (error) {
      logger.error('❌ Failed to get performance metrics:', error);
      return null;
    }
  }

  /**
   * Get slow queries from monitoring
   */
  async getSlowQueries() {
    try {
      const { data } = await this.supabase
        .rpc('get_slow_queries', { limit: 10 });
      
      return data || [];
    } catch (error) {
      logger.error('Failed to get slow queries:', error);
      return [];
    }
  }

  /**
   * Get frequent queries from monitoring
   */
  async getFrequentQueries() {
    try {
      const { data } = await this.supabase
        .rpc('get_frequent_queries', { limit: 10 });
      
      return data || [];
    } catch (error) {
      logger.error('Failed to get frequent queries:', error);
      return [];
    }
  }

  /**
   * Get cache hit rate
   */
  async getCacheHitRate() {
    // Implement cache hit rate calculation
    return 0.85; // 85% hit rate placeholder
  }

  /**
   * Get cache size
   */
  async getCacheSize() {
    // Implement cache size calculation
    return '1.2GB'; // Placeholder
  }

  /**
   * Cleanup and graceful shutdown
   */
  async cleanup() {
    try {
      // Close all real-time subscriptions
      const channels = this.supabase.getChannels();
      await Promise.all(channels.map(channel => channel.unsubscribe()));
      
      // Close connection pool
      if (this.connectionPool) {
        logger.info('🔌 Closing connection pool');
      }
      
      logger.info('✅ Supabase performance config cleaned up');
    } catch (error) {
      logger.error('❌ Error during cleanup:', error);
    }
  }
}

// Export singleton instance
const performanceConfig = new SupabasePerformanceConfig();

module.exports = {
  performanceConfig,
  SupabasePerformanceConfig
};