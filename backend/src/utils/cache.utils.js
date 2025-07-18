/**
 * Advanced Caching Utilities
 * Multi-tier caching with Redis, in-memory, and edge optimization
 * Designed for high-performance game operations
 */

const { redisManager } = require('../config/redis');
const { logger } = require('./logger');
const LRU = require('lru-cache');

/**
 * Multi-tier cache manager
 */
class CacheManager {
  constructor() {
    // In-memory L1 cache (fastest)
    this.l1Cache = new LRU({
      max: 1000,
      ttl: 1000 * 60 * 5, // 5 minutes
      allowStale: true,
      updateAgeOnGet: true
    });

    // Redis L2 cache (shared across instances)
    this.l2Cache = redisManager;

    // Cache statistics
    this.stats = {
      hits: { l1: 0, l2: 0 },
      misses: { l1: 0, l2: 0 },
      sets: { l1: 0, l2: 0 },
      evictions: { l1: 0, l2: 0 }
    };

    // Cache warming configuration
    this.warmupConfig = {
      enabled: true,
      intervals: {
        leaderboard: 300000, // 5 minutes
        gameConfig: 3600000, // 1 hour
        playerStats: 600000  // 10 minutes
      }
    };

    this.setupCacheWarming();
  }

  /**
   * Get data from cache with fallback strategy
   */
  async get(key, options = {}) {
    const {
      ttl = 300,
      fallback = null,
      skipL1 = false,
      skipL2 = false,
      tag = null
    } = options;

    try {
      // Try L1 cache first (in-memory)
      if (!skipL1) {
        const l1Result = this.l1Cache.get(key);
        if (l1Result !== undefined) {
          this.stats.hits.l1++;
          logger.debug(`🎯 L1 cache hit for key: ${key}`);
          return l1Result;
        }
        this.stats.misses.l1++;
      }

      // Try L2 cache (Redis)
      if (!skipL2) {
        const l2Result = await this.l2Cache.getCached(key);
        if (l2Result !== null) {
          this.stats.hits.l2++;
          logger.debug(`🎯 L2 cache hit for key: ${key}`);
          
          // Populate L1 cache for next time
          if (!skipL1) {
            this.l1Cache.set(key, l2Result);
            this.stats.sets.l1++;
          }
          
          return l2Result;
        }
        this.stats.misses.l2++;
      }

      // Cache miss - use fallback if provided
      if (fallback && typeof fallback === 'function') {
        logger.debug(`💾 Cache miss for key: ${key}, executing fallback`);
        const result = await fallback();
        
        if (result !== null && result !== undefined) {
          await this.set(key, result, { ttl, tag });
        }
        
        return result;
      }

      return null;
    } catch (error) {
      logger.error(`❌ Cache get error for key ${key}:`, error);
      return fallback && typeof fallback === 'function' ? await fallback() : null;
    }
  }

  /**
   * Set data in cache with multi-tier strategy
   */
  async set(key, value, options = {}) {
    const {
      ttl = 300,
      onlyL1 = false,
      onlyL2 = false,
      tag = null
    } = options;

    try {
      // Set in L1 cache (in-memory)
      if (!onlyL2) {
        this.l1Cache.set(key, value);
        this.stats.sets.l1++;
      }

      // Set in L2 cache (Redis)
      if (!onlyL1) {
        await this.l2Cache.cache(key, value, ttl);
        this.stats.sets.l2++;
      }

      // Store tag mapping for invalidation
      if (tag) {
        await this.addKeyToTag(key, tag);
      }

      logger.debug(`💾 Cached data for key: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      logger.error(`❌ Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete from cache
   */
  async delete(key) {
    try {
      // Delete from L1
      this.l1Cache.delete(key);
      
      // Delete from L2
      await this.l2Cache.redis.del(key);
      
      logger.debug(`🗑️ Deleted cache key: ${key}`);
    } catch (error) {
      logger.error(`❌ Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Cache invalidation by tag
   */
  async invalidateByTag(tag) {
    try {
      const tagKey = `cache_tag:${tag}`;
      const keys = await this.l2Cache.redis.smembers(tagKey);
      
      if (keys.length > 0) {
        // Delete from L1
        keys.forEach(key => this.l1Cache.delete(key));
        
        // Delete from L2
        await this.l2Cache.redis.del(...keys);
        
        // Clean up tag set
        await this.l2Cache.redis.del(tagKey);
        
        logger.info(`🔄 Invalidated ${keys.length} cache entries for tag: ${tag}`);
      }
    } catch (error) {
      logger.error(`❌ Cache invalidation error for tag ${tag}:`, error);
    }
  }

  /**
   * Add key to tag for group invalidation
   */
  async addKeyToTag(key, tag) {
    try {
      const tagKey = `cache_tag:${tag}`;
      await this.l2Cache.redis.sadd(tagKey, key);
      await this.l2Cache.redis.expire(tagKey, 3600); // 1 hour expiry for tag
    } catch (error) {
      logger.error(`❌ Error adding key to tag:`, error);
    }
  }

  /**
   * Batch cache operations
   */
  async batchGet(keys, options = {}) {
    const results = {};
    
    try {
      // Check L1 cache for all keys
      const l1Results = {};
      const l1Misses = [];
      
      keys.forEach(key => {
        const value = this.l1Cache.get(key);
        if (value !== undefined) {
          l1Results[key] = value;
          this.stats.hits.l1++;
        } else {
          l1Misses.push(key);
          this.stats.misses.l1++;
        }
      });

      // Check L2 cache for L1 misses
      const l2Results = {};
      if (l1Misses.length > 0) {
        const pipeline = this.l2Cache.redis.pipeline();
        l1Misses.forEach(key => pipeline.get(key));
        
        const l2Responses = await pipeline.exec();
        
        l1Misses.forEach((key, index) => {
          const [err, value] = l2Responses[index];
          if (!err && value) {
            try {
              l2Results[key] = JSON.parse(value);
              this.stats.hits.l2++;
              
              // Populate L1 cache
              this.l1Cache.set(key, l2Results[key]);
              this.stats.sets.l1++;
            } catch (parseError) {
              logger.error(`Parse error for key ${key}:`, parseError);
            }
          } else {
            this.stats.misses.l2++;
          }
        });
      }

      // Combine results
      Object.assign(results, l1Results, l2Results);
      
      return results;
    } catch (error) {
      logger.error('❌ Batch cache get error:', error);
      return {};
    }
  }

  /**
   * Batch set operations
   */
  async batchSet(data, options = {}) {
    const { ttl = 300, tag = null } = options;
    
    try {
      // Set in L1 cache
      Object.entries(data).forEach(([key, value]) => {
        this.l1Cache.set(key, value);
        this.stats.sets.l1++;
      });

      // Set in L2 cache using pipeline
      const pipeline = this.l2Cache.redis.pipeline();
      Object.entries(data).forEach(([key, value]) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });
      
      await pipeline.exec();
      this.stats.sets.l2 += Object.keys(data).length;

      // Handle tagging
      if (tag) {
        await Promise.all(
          Object.keys(data).map(key => this.addKeyToTag(key, tag))
        );
      }

      logger.debug(`💾 Batch cached ${Object.keys(data).length} items`);
    } catch (error) {
      logger.error('❌ Batch cache set error:', error);
    }
  }

  /**
   * Game-specific cache operations
   */
  async getGameState(playerId, options = {}) {
    const key = `game_state:${playerId}`;
    return await this.get(key, {
      ttl: 30, // 30 seconds
      tag: 'game_state',
      ...options
    });
  }

  async setGameState(playerId, gameState, options = {}) {
    const key = `game_state:${playerId}`;
    await this.set(key, gameState, {
      ttl: 30, // 30 seconds
      tag: 'game_state',
      ...options
    });
  }

  async getLeaderboard(category, options = {}) {
    const key = `leaderboard:${category}`;
    return await this.get(key, {
      ttl: 300, // 5 minutes
      tag: 'leaderboard',
      ...options
    });
  }

  async setLeaderboard(category, data, options = {}) {
    const key = `leaderboard:${category}`;
    await this.set(key, data, {
      ttl: 300, // 5 minutes
      tag: 'leaderboard',
      ...options
    });
  }

  async getPlayerProfile(playerId, options = {}) {
    const key = `player:${playerId}`;
    return await this.get(key, {
      ttl: 600, // 10 minutes
      tag: 'player_profile',
      ...options
    });
  }

  async setPlayerProfile(playerId, profile, options = {}) {
    const key = `player:${playerId}`;
    await this.set(key, profile, {
      ttl: 600, // 10 minutes
      tag: 'player_profile',
      ...options
    });
  }

  /**
   * Cache warming strategies
   */
  setupCacheWarming() {
    if (!this.warmupConfig.enabled) return;

    // Warm up leaderboard cache
    setInterval(() => {
      this.warmupLeaderboard();
    }, this.warmupConfig.intervals.leaderboard);

    // Warm up game config cache
    setInterval(() => {
      this.warmupGameConfig();
    }, this.warmupConfig.intervals.gameConfig);
  }

  async warmupLeaderboard() {
    try {
      logger.debug('🔥 Warming up leaderboard cache');
      
      // Pre-load popular leaderboard categories
      const categories = ['wool_produced', 'coins_earned', 'level', 'daily_streak'];
      
      for (const category of categories) {
        // This would typically call your data source
        // await this.getLeaderboard(category, { fallback: () => fetchLeaderboardFromDB(category) });
      }
    } catch (error) {
      logger.error('❌ Leaderboard warmup error:', error);
    }
  }

  async warmupGameConfig() {
    try {
      logger.debug('🔥 Warming up game config cache');
      
      // Pre-load game configuration
      const configKey = 'game_config';
      await this.get(configKey, {
        ttl: 3600,
        // fallback: () => fetchGameConfigFromDB()
      });
    } catch (error) {
      logger.error('❌ Game config warmup error:', error);
    }
  }

  /**
   * Cache analytics and monitoring
   */
  getStats() {
    const totalHits = this.stats.hits.l1 + this.stats.hits.l2;
    const totalMisses = this.stats.misses.l1 + this.stats.misses.l2;
    const totalRequests = totalHits + totalMisses;
    
    return {
      ...this.stats,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) : 0,
      l1HitRate: (this.stats.hits.l1 + this.stats.misses.l1) > 0 ? 
        (this.stats.hits.l1 / (this.stats.hits.l1 + this.stats.misses.l1) * 100).toFixed(2) : 0,
      l2HitRate: (this.stats.hits.l2 + this.stats.misses.l2) > 0 ? 
        (this.stats.hits.l2 / (this.stats.hits.l2 + this.stats.misses.l2) * 100).toFixed(2) : 0,
      l1Size: this.l1Cache.size,
      l1MaxSize: this.l1Cache.max
    };
  }

  /**
   * Cache health check
   */
  async healthCheck() {
    try {
      const testKey = 'cache_health_check';
      const testValue = { timestamp: Date.now(), test: true };
      
      // Test L1 cache
      this.l1Cache.set(testKey, testValue);
      const l1Result = this.l1Cache.get(testKey);
      const l1Healthy = JSON.stringify(l1Result) === JSON.stringify(testValue);
      
      // Test L2 cache
      await this.l2Cache.cache(testKey, testValue, 10);
      const l2Result = await this.l2Cache.getCached(testKey);
      const l2Healthy = JSON.stringify(l2Result) === JSON.stringify(testValue);
      
      // Cleanup
      this.l1Cache.delete(testKey);
      await this.l2Cache.redis.del(testKey);
      
      return {
        l1Cache: l1Healthy,
        l2Cache: l2Healthy,
        overall: l1Healthy && l2Healthy
      };
    } catch (error) {
      logger.error('❌ Cache health check error:', error);
      return {
        l1Cache: false,
        l2Cache: false,
        overall: false,
        error: error.message
      };
    }
  }

  /**
   * Clear all caches
   */
  async clear() {
    try {
      // Clear L1 cache
      this.l1Cache.clear();
      
      // Clear L2 cache (be careful with this in production)
      await this.l2Cache.flushAll();
      
      logger.info('🧹 All caches cleared');
    } catch (error) {
      logger.error('❌ Error clearing caches:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('🔌 Shutting down cache manager');
      
      // Clear L1 cache
      this.l1Cache.clear();
      
      // Disconnect Redis
      await this.l2Cache.disconnect();
      
      logger.info('✅ Cache manager shutdown complete');
    } catch (error) {
      logger.error('❌ Error during cache shutdown:', error);
    }
  }
}

// Export singleton instance
const cacheManager = new CacheManager();

// Export utility functions
const cacheUtils = {
  /**
   * Generate cache key with namespace
   */
  generateKey(namespace, ...parts) {
    return `${namespace}:${parts.join(':')}`;
  },

  /**
   * Cache decorator for functions
   */
  cached(ttl = 300, keyGenerator = null) {
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        const key = keyGenerator ? keyGenerator(...args) : `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
        
        const cached = await cacheManager.get(key);
        if (cached !== null) {
          return cached;
        }
        
        const result = await originalMethod.apply(this, args);
        await cacheManager.set(key, result, { ttl });
        
        return result;
      };
      
      return descriptor;
    };
  },

  /**
   * Invalidate cache decorator
   */
  invalidates(tags) {
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        const result = await originalMethod.apply(this, args);
        
        // Invalidate tags after successful execution
        if (Array.isArray(tags)) {
          await Promise.all(tags.map(tag => cacheManager.invalidateByTag(tag)));
        } else {
          await cacheManager.invalidateByTag(tags);
        }
        
        return result;
      };
      
      return descriptor;
    };
  }
};

module.exports = {
  cacheManager,
  cacheUtils,
  CacheManager
};