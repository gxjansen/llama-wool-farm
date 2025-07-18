/**
 * Redis Configuration and Connection Pool
 * Handles caching, session storage, and real-time data
 */

const Redis = require('ioredis');
const { logger } = require('../utils/logger');

class RedisManager {
  constructor() {
    this.redis = null;
    this.publisher = null;
    this.subscriber = null;
    this.connectionPool = [];
    this.isConnected = false;
  }

  /**
   * Initialize Redis connection with clustering support
   */
  async connect() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: parseInt(process.env.REDIS_DB) || 0,
        
        // Connection pool settings
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        
        // Performance settings
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        
        // Cluster settings (if Redis Cluster is used)
        enableReadyCheck: true,
        maxRetriesPerRequest: null,
        
        // Connection pool
        family: 4,
        keyPrefix: 'llama_wool_farm:',
        
        // Retry strategy
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          logger.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
          return delay;
        },
        
        // Connection events
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        }
      };

      // Initialize main Redis connection
      this.redis = new Redis(redisConfig);

      // Initialize pub/sub connections
      this.publisher = new Redis(redisConfig);
      this.subscriber = new Redis(redisConfig);

      // Setup event listeners
      this.setupEventListeners();

      // Connect to Redis
      await this.redis.connect();
      await this.publisher.connect();
      await this.subscriber.connect();

      this.isConnected = true;
      logger.info('✅ Redis connected successfully');

      // Setup health check
      this.setupHealthCheck();

      return this.redis;
    } catch (error) {
      logger.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  /**
   * Setup Redis event listeners
   */
  setupEventListeners() {
    // Main connection events
    this.redis.on('connect', () => {
      logger.info('🔌 Redis connected');
    });

    this.redis.on('ready', () => {
      logger.info('✅ Redis ready');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      logger.error('❌ Redis error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      logger.warn('🔌 Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });

    // Publisher events
    this.publisher.on('error', (error) => {
      logger.error('❌ Redis publisher error:', error);
    });

    // Subscriber events
    this.subscriber.on('error', (error) => {
      logger.error('❌ Redis subscriber error:', error);
    });

    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });
  }

  /**
   * Setup health check interval
   */
  setupHealthCheck() {
    setInterval(async () => {
      try {
        await this.redis.ping();
      } catch (error) {
        logger.error('Redis health check failed:', error);
        this.isConnected = false;
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Handle pub/sub messages
   */
  handleMessage(channel, message) {
    try {
      const data = JSON.parse(message);
      logger.debug(`Received message on channel ${channel}:`, data);
      
      // Emit to application event handlers
      process.emit('redis-message', { channel, data });
    } catch (error) {
      logger.error('Error handling Redis message:', error);
    }
  }

  /**
   * Publish message to channel
   */
  async publish(channel, data) {
    try {
      const message = JSON.stringify(data);
      await this.publisher.publish(channel, message);
      logger.debug(`Published message to channel ${channel}`);
    } catch (error) {
      logger.error('Error publishing message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel) {
    try {
      await this.subscriber.subscribe(channel);
      logger.info(`Subscribed to channel: ${channel}`);
    } catch (error) {
      logger.error('Error subscribing to channel:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel) {
    try {
      await this.subscriber.unsubscribe(channel);
      logger.info(`Unsubscribed from channel: ${channel}`);
    } catch (error) {
      logger.error('Error unsubscribing from channel:', error);
      throw error;
    }
  }

  /**
   * Cache operations with TTL
   */
  async cache(key, value, ttl = 3600) {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
      logger.debug(`Cached data for key: ${key}, TTL: ${ttl}`);
    } catch (error) {
      logger.error('Error caching data:', error);
      throw error;
    }
  }

  /**
   * Get cached data
   */
  async getCached(key) {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Increment counter with TTL
   */
  async incrementCounter(key, ttl = 3600) {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttl);
      const results = await pipeline.exec();
      return results[0][1]; // Return the incremented value
    } catch (error) {
      logger.error('Error incrementing counter:', error);
      throw error;
    }
  }

  /**
   * Rate limiting with sliding window
   */
  async checkRateLimit(key, limit, window) {
    try {
      const now = Date.now();
      const pipeline = this.redis.pipeline();
      
      // Remove old entries
      pipeline.zremrangebyscore(key, 0, now - window);
      
      // Count current entries
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(window / 1000));
      
      const results = await pipeline.exec();
      const currentCount = results[1][1];
      
      return {
        allowed: currentCount < limit,
        count: currentCount,
        limit,
        remaining: Math.max(0, limit - currentCount)
      };
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      throw error;
    }
  }

  /**
   * Distributed lock implementation
   */
  async acquireLock(key, ttl = 10000) {
    try {
      const lockKey = `lock:${key}`;
      const identifier = `${Date.now()}-${Math.random()}`;
      
      const result = await this.redis.set(
        lockKey, 
        identifier, 
        'PX', 
        ttl, 
        'NX'
      );
      
      if (result === 'OK') {
        return {
          acquired: true,
          identifier,
          release: () => this.releaseLock(lockKey, identifier)
        };
      }
      
      return { acquired: false };
    } catch (error) {
      logger.error('Error acquiring lock:', error);
      throw error;
    }
  }

  /**
   * Release distributed lock
   */
  async releaseLock(lockKey, identifier) {
    try {
      const script = `
        if redis.call('get', KEYS[1]) == ARGV[1] then
          return redis.call('del', KEYS[1])
        else
          return 0
        end
      `;
      
      const result = await this.redis.eval(script, 1, lockKey, identifier);
      return result === 1;
    } catch (error) {
      logger.error('Error releasing lock:', error);
      throw error;
    }
  }

  /**
   * Batch operations
   */
  async batch(operations) {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const operation of operations) {
        const { command, args } = operation;
        pipeline[command](...args);
      }
      
      const results = await pipeline.exec();
      return results.map(result => result[1]);
    } catch (error) {
      logger.error('Error executing batch operations:', error);
      throw error;
    }
  }

  /**
   * Session management
   */
  async createSession(sessionId, data, ttl = 86400) {
    try {
      const sessionKey = `session:${sessionId}`;
      await this.cache(sessionKey, data, ttl);
      return sessionId;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionId) {
    try {
      const sessionKey = `session:${sessionId}`;
      return await this.getCached(sessionKey);
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(sessionId, data, ttl = 86400) {
    try {
      const sessionKey = `session:${sessionId}`;
      await this.cache(sessionKey, data, ttl);
    } catch (error) {
      logger.error('Error updating session:', error);
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    try {
      const sessionKey = `session:${sessionId}`;
      await this.redis.del(sessionKey);
    } catch (error) {
      logger.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      status: this.redis?.status,
      uptime: this.redis?.uptime,
      memory: this.getMemoryUsage()
    };
  }

  /**
   * Get memory usage statistics
   */
  async getMemoryUsage() {
    try {
      const info = await this.redis.info('memory');
      const lines = info.split('\r\n');
      const memoryInfo = {};
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          memoryInfo[key] = value;
        }
      });
      
      return memoryInfo;
    } catch (error) {
      logger.error('Error getting memory usage:', error);
      return {};
    }
  }

  /**
   * Flush all cached data (use with caution)
   */
  async flushAll() {
    try {
      await this.redis.flushall();
      logger.warn('⚠️  All Redis data flushed');
    } catch (error) {
      logger.error('Error flushing Redis:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    try {
      if (this.redis) {
        await this.redis.quit();
      }
      if (this.publisher) {
        await this.publisher.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      
      this.isConnected = false;
      logger.info('Redis connections closed gracefully');
    } catch (error) {
      logger.error('Error disconnecting Redis:', error);
      throw error;
    }
  }
}

// Create singleton instance
const redisManager = new RedisManager();

// Export connection function
async function connectRedis() {
  return await redisManager.connect();
}

// Export the Redis instance and manager
module.exports = {
  connectRedis,
  redis: redisManager.redis,
  redisManager
};