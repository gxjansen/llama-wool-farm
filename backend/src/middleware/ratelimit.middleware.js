/**
 * =============================================
 * RATE LIMITING MIDDLEWARE
 * Advanced rate limiting with Redis and Supabase
 * =============================================
 */

const rateLimit = require('express-rate-limit');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');
const crypto = require('crypto');

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class RateLimitMiddleware {
  constructor() {
    this.redis = redis;
    this.setupRateLimiters();
  }

  setupRateLimiters() {
    // Global rate limiter
    this.globalLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_global',
      points: 1000, // requests
      duration: 900, // 15 minutes
      blockDuration: 900, // 15 minutes
    });

    // Authentication rate limiter
    this.authLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_auth',
      points: 10, // attempts
      duration: 900, // 15 minutes
      blockDuration: 1800, // 30 minutes
    });

    // Game API rate limiter
    this.gameLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_game',
      points: 60, // requests
      duration: 60, // 1 minute
      blockDuration: 60, // 1 minute
    });

    // User-specific rate limiter
    this.userLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_user',
      points: 200, // requests
      duration: 60, // 1 minute
      blockDuration: 60, // 1 minute
    });

    // Progressive rate limiter for suspicious activity
    this.progressiveLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_progressive',
      points: 100, // requests
      duration: 60, // 1 minute
      blockDuration: 300, // 5 minutes
    });

    // Connection rate limiter
    this.connectionLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_connection',
      points: 10, // connections
      duration: 60, // 1 minute
      blockDuration: 300, // 5 minutes
    });
  }

  /**
   * Global rate limiting middleware
   */
  globalRateLimit() {
    return async (req, res, next) => {
      try {
        const key = this.getGlobalKey(req);
        await this.globalLimiter.consume(key);
        next();
      } catch (rateLimiterRes) {
        await this.logRateLimitEvent(req, 'GLOBAL_RATE_LIMIT', rateLimiterRes);
        this.sendRateLimitResponse(res, rateLimiterRes);
      }
    };
  }

  /**
   * Authentication rate limiting middleware
   */
  authRateLimit() {
    return async (req, res, next) => {
      try {
        const key = this.getAuthKey(req);
        await this.authLimiter.consume(key);
        next();
      } catch (rateLimiterRes) {
        await this.logRateLimitEvent(req, 'AUTH_RATE_LIMIT', rateLimiterRes);
        this.sendRateLimitResponse(res, rateLimiterRes);
      }
    };
  }

  /**
   * Game API rate limiting middleware
   */
  gameRateLimit() {
    return async (req, res, next) => {
      try {
        const key = this.getGameKey(req);
        const adaptiveLimit = await this.getAdaptiveLimit(req.userId || req.ip);
        
        // Create dynamic limiter based on user behavior
        const dynamicLimiter = new RateLimiterRedis({
          storeClient: this.redis,
          keyPrefix: 'rl_game_dynamic',
          points: adaptiveLimit,
          duration: 60,
          blockDuration: 60,
        });

        await dynamicLimiter.consume(key);
        next();
      } catch (rateLimiterRes) {
        await this.logRateLimitEvent(req, 'GAME_RATE_LIMIT', rateLimiterRes);
        this.sendRateLimitResponse(res, rateLimiterRes);
      }
    };
  }

  /**
   * User-specific rate limiting middleware
   */
  userRateLimit() {
    return async (req, res, next) => {
      if (!req.userId) {
        return next();
      }

      try {
        const key = req.userId;
        await this.userLimiter.consume(key);
        next();
      } catch (rateLimiterRes) {
        await this.logRateLimitEvent(req, 'USER_RATE_LIMIT', rateLimiterRes);
        this.sendRateLimitResponse(res, rateLimiterRes);
      }
    };
  }

  /**
   * Progressive rate limiting for suspicious users
   */
  progressiveRateLimit() {
    return async (req, res, next) => {
      try {
        const suspiciousScore = await this.getSuspiciousScore(req.userId || req.ip);
        
        if (suspiciousScore > 0.7) {
          const key = this.getProgressiveKey(req);
          // Reduce limit for suspicious users
          const adjustedPoints = Math.max(10, 100 - (suspiciousScore * 80));
          
          const progressiveLimiter = new RateLimiterRedis({
            storeClient: this.redis,
            keyPrefix: 'rl_progressive_dynamic',
            points: adjustedPoints,
            duration: 60,
            blockDuration: 300,
          });

          await progressiveLimiter.consume(key);
        }
        
        next();
      } catch (rateLimiterRes) {
        await this.logRateLimitEvent(req, 'PROGRESSIVE_RATE_LIMIT', rateLimiterRes);
        this.sendRateLimitResponse(res, rateLimiterRes);
      }
    };
  }

  /**
   * Connection rate limiting middleware
   */
  connectionRateLimit() {
    return async (req, res, next) => {
      try {
        const key = this.getConnectionKey(req);
        await this.connectionLimiter.consume(key);
        next();
      } catch (rateLimiterRes) {
        await this.logRateLimitEvent(req, 'CONNECTION_RATE_LIMIT', rateLimiterRes);
        this.sendRateLimitResponse(res, rateLimiterRes);
      }
    };
  }

  /**
   * Anti-spam middleware for repeated requests
   */
  antiSpamMiddleware() {
    return async (req, res, next) => {
      try {
        const bodyHash = this.hashRequestBody(req.body);
        const key = `spam_${req.userId || req.ip}_${bodyHash}`;
        
        // Check if same request was made recently
        const recentRequest = await this.redis.get(key);
        if (recentRequest) {
          await this.logRateLimitEvent(req, 'SPAM_DETECTED', { bodyHash });
          return res.status(429).json({
            error: 'Duplicate request detected',
            retryAfter: 5
          });
        }

        // Store request hash for 5 seconds
        await this.redis.setex(key, 5, Date.now().toString());
        next();
      } catch (error) {
        console.error('Anti-spam middleware error:', error);
        next();
      }
    };
  }

  /**
   * Burst protection middleware
   */
  burstProtection() {
    return async (req, res, next) => {
      try {
        const key = `burst_${req.userId || req.ip}`;
        const burstLimiter = new RateLimiterRedis({
          storeClient: this.redis,
          keyPrefix: 'rl_burst',
          points: 20, // requests
          duration: 1, // 1 second
          blockDuration: 10, // 10 seconds
        });

        await burstLimiter.consume(key);
        next();
      } catch (rateLimiterRes) {
        await this.logRateLimitEvent(req, 'BURST_PROTECTION', rateLimiterRes);
        this.sendRateLimitResponse(res, rateLimiterRes);
      }
    };
  }

  /**
   * Resource-based rate limiting
   */
  resourceRateLimit(resource, points = 50, duration = 60) {
    return async (req, res, next) => {
      try {
        const key = `resource_${resource}_${req.userId || req.ip}`;
        const resourceLimiter = new RateLimiterRedis({
          storeClient: this.redis,
          keyPrefix: 'rl_resource',
          points: points,
          duration: duration,
          blockDuration: duration,
        });

        await resourceLimiter.consume(key);
        next();
      } catch (rateLimiterRes) {
        await this.logRateLimitEvent(req, 'RESOURCE_RATE_LIMIT', rateLimiterRes);
        this.sendRateLimitResponse(res, rateLimiterRes);
      }
    };
  }

  /**
   * Sliding window rate limiter
   */
  slidingWindowRateLimit(windowSize = 3600, maxRequests = 1000) {
    return async (req, res, next) => {
      try {
        const key = `sliding_${req.userId || req.ip}`;
        const now = Date.now();
        const windowStart = now - (windowSize * 1000);

        // Remove old entries
        await this.redis.zremrangebyscore(key, 0, windowStart);

        // Count current requests
        const currentRequests = await this.redis.zcard(key);

        if (currentRequests >= maxRequests) {
          await this.logRateLimitEvent(req, 'SLIDING_WINDOW_RATE_LIMIT', {
            currentRequests,
            maxRequests,
            windowSize
          });
          return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil(windowSize / 1000)
          });
        }

        // Add current request
        await this.redis.zadd(key, now, `${now}_${Math.random()}`);
        await this.redis.expire(key, windowSize);

        next();
      } catch (error) {
        console.error('Sliding window rate limit error:', error);
        next();
      }
    };
  }

  /**
   * Key generation methods
   */
  getGlobalKey(req) {
    return req.ip;
  }

  getAuthKey(req) {
    return `${req.ip}_${req.get('User-Agent')}`;
  }

  getGameKey(req) {
    return req.userId || req.ip;
  }

  getProgressiveKey(req) {
    return `progressive_${req.userId || req.ip}`;
  }

  getConnectionKey(req) {
    return `conn_${req.ip}`;
  }

  /**
   * Adaptive rate limiting based on user behavior
   */
  async getAdaptiveLimit(identifier) {
    try {
      const baseLimit = 60;
      const suspiciousScore = await this.getSuspiciousScore(identifier);
      
      // Reduce limit for suspicious users
      if (suspiciousScore > 0.8) {
        return Math.max(10, baseLimit * 0.2);
      } else if (suspiciousScore > 0.5) {
        return Math.max(20, baseLimit * 0.5);
      } else if (suspiciousScore > 0.3) {
        return Math.max(30, baseLimit * 0.7);
      }
      
      return baseLimit;
    } catch (error) {
      return 60; // Default fallback
    }
  }

  /**
   * Calculate suspicious score based on security logs
   */
  async getSuspiciousScore(identifier) {
    try {
      const { data: securityLogs } = await supabase
        .from('security_logs')
        .select('event_type, severity, created_at')
        .or(`user_id.eq.${identifier},ip_address.eq.${identifier}`)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (!securityLogs || securityLogs.length === 0) {
        return 0;
      }

      let score = 0;
      const severityWeights = {
        'info': 0.1,
        'warning': 0.3,
        'error': 0.7,
        'critical': 1.0
      };

      const eventTypeWeights = {
        'ANTI_CHEAT_VIOLATION': 0.8,
        'SUSPICIOUS_ACTIVITY': 0.6,
        'RATE_LIMIT_EXCEEDED': 0.4,
        'INVALID_AUTH_TOKEN': 0.5,
        'SPAM_DETECTED': 0.3
      };

      for (const log of securityLogs) {
        const severityWeight = severityWeights[log.severity] || 0.1;
        const eventTypeWeight = eventTypeWeights[log.event_type] || 0.1;
        const timeWeight = this.calculateTimeWeight(log.created_at);
        
        score += severityWeight * eventTypeWeight * timeWeight;
      }

      return Math.min(1, score / 10); // Normalize to 0-1
    } catch (error) {
      console.error('Error calculating suspicious score:', error);
      return 0;
    }
  }

  /**
   * Calculate time weight (recent events have higher weight)
   */
  calculateTimeWeight(createdAt) {
    const now = Date.now();
    const eventTime = new Date(createdAt).getTime();
    const timeDiff = now - eventTime;
    const hours = timeDiff / (1000 * 60 * 60);
    
    // Weight decreases over time
    if (hours < 1) return 1.0;
    if (hours < 6) return 0.8;
    if (hours < 12) return 0.6;
    if (hours < 24) return 0.4;
    return 0.2;
  }

  /**
   * Hash request body for spam detection
   */
  hashRequestBody(body) {
    if (!body || Object.keys(body).length === 0) {
      return 'empty';
    }
    
    const bodyString = JSON.stringify(body);
    return crypto.createHash('sha256').update(bodyString).digest('hex');
  }

  /**
   * Send rate limit response
   */
  sendRateLimitResponse(res, rateLimiterRes) {
    const remainingPoints = rateLimiterRes.remainingPoints || 0;
    const msBeforeNext = rateLimiterRes.msBeforeNext || 0;
    const retryAfter = Math.ceil(msBeforeNext / 1000);

    res.set({
      'X-RateLimit-Limit': rateLimiterRes.totalHits || 0,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
      'Retry-After': retryAfter
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: retryAfter,
      remainingPoints: remainingPoints
    });
  }

  /**
   * Log rate limit events
   */
  async logRateLimitEvent(req, eventType, rateLimiterRes) {
    try {
      const securityEvent = {
        user_id: req.userId || null,
        event_type: eventType,
        severity: 'warning',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        device_fingerprint: req.deviceFingerprint,
        endpoint: req.path,
        method: req.method,
        details: {
          remainingPoints: rateLimiterRes.remainingPoints || 0,
          totalHits: rateLimiterRes.totalHits || 0,
          msBeforeNext: rateLimiterRes.msBeforeNext || 0
        },
        created_at: new Date().toISOString()
      };

      await supabase
        .from('security_logs')
        .insert([securityEvent]);

    } catch (error) {
      console.error('Failed to log rate limit event:', error);
    }
  }

  /**
   * Circuit breaker pattern implementation
   */
  async circuitBreaker(service, maxFailures = 5, timeout = 30000) {
    const key = `circuit_${service}`;
    const circuitState = await this.redis.hgetall(key);
    
    if (circuitState.state === 'OPEN') {
      const lastFailure = parseInt(circuitState.lastFailure || '0');
      if (Date.now() - lastFailure < timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Try to half-open
      await this.redis.hset(key, 'state', 'HALF_OPEN');
    }

    return {
      recordSuccess: async () => {
        await this.redis.hset(key, 'state', 'CLOSED', 'failures', '0');
      },
      recordFailure: async () => {
        const failures = parseInt(circuitState.failures || '0') + 1;
        if (failures >= maxFailures) {
          await this.redis.hset(key, 
            'state', 'OPEN', 
            'failures', failures.toString(),
            'lastFailure', Date.now().toString()
          );
        } else {
          await this.redis.hset(key, 'failures', failures.toString());
        }
      }
    };
  }

  /**
   * Cleanup old rate limit keys
   */
  async cleanup() {
    try {
      const patterns = [
        'rl_*',
        'spam_*',
        'burst_*',
        'resource_*',
        'sliding_*',
        'circuit_*'
      ];

      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          // Only clean up keys older than 24 hours
          const pipeline = this.redis.pipeline();
          for (const key of keys) {
            const ttl = await this.redis.ttl(key);
            if (ttl < 0) { // No expiration set
              pipeline.del(key);
            }
          }
          await pipeline.exec();
        }
      }
    } catch (error) {
      console.error('Rate limit cleanup error:', error);
    }
  }
}

// Export singleton instance
const rateLimitMiddleware = new RateLimitMiddleware();

// Schedule cleanup every hour
setInterval(() => {
  rateLimitMiddleware.cleanup();
}, 60 * 60 * 1000);

module.exports = rateLimitMiddleware;