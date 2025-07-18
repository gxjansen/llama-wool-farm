import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  errorCount: number;
  lastFailure: Date | null;
  nextAttempt: Date | null;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class RateLimiter {
  private readonly redis: Redis;
  private readonly defaultWindowMs = 15 * 60 * 1000; // 15 minutes
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerTimeout = 30 * 1000; // 30 seconds

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Create global rate limiter for all requests
   */
  createGlobalLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: this.redis,
        prefix: 'global:',
      }),
      windowMs: this.defaultWindowMs,
      max: 1000, // 1000 requests per 15 minutes per IP
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: this.defaultWindowMs / 1000,
        type: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many requests from this IP, please try again later.',
          retryAfter: this.defaultWindowMs / 1000,
          type: 'RATE_LIMIT_EXCEEDED'
        });
      }
    });
  }

  /**
   * Create authentication rate limiter
   */
  createAuthLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: this.redis,
        prefix: 'auth:',
      }),
      windowMs: this.defaultWindowMs,
      max: 10, // 10 login attempts per 15 minutes
      message: {
        error: 'Too many login attempts, please try again later.',
        retryAfter: this.defaultWindowMs / 1000,
        type: 'AUTH_RATE_LIMIT_EXCEEDED'
      },
      skipSuccessfulRequests: true,
      keyGenerator: (req) => {
        // Rate limit by IP and email combination
        const email = req.body?.email || '';
        return `${req.ip}:${email}`;
      },
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many login attempts, please try again later.',
          retryAfter: this.defaultWindowMs / 1000,
          type: 'AUTH_RATE_LIMIT_EXCEEDED'
        });
      }
    });
  }

  /**
   * Create game state update rate limiter
   */
  createGameStateLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: this.redis,
        prefix: 'gamestate:',
      }),
      windowMs: 60 * 1000, // 1 minute
      max: 60, // 60 updates per minute per user
      keyGenerator: (req) => req.user?.id || req.ip,
      message: {
        error: 'Too many game state updates, please slow down.',
        retryAfter: 60,
        type: 'GAMESTATE_RATE_LIMIT_EXCEEDED'
      },
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many game state updates, please slow down.',
          retryAfter: 60,
          type: 'GAMESTATE_RATE_LIMIT_EXCEEDED'
        });
      }
    });
  }

  /**
   * Create API endpoint rate limiter
   */
  createApiLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: this.redis,
        prefix: 'api:',
      }),
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute per user
      keyGenerator: (req) => req.user?.id || req.ip,
      message: {
        error: 'API rate limit exceeded, please slow down.',
        retryAfter: 60,
        type: 'API_RATE_LIMIT_EXCEEDED'
      },
      handler: (req, res) => {
        res.status(429).json({
          error: 'API rate limit exceeded, please slow down.',
          retryAfter: 60,
          type: 'API_RATE_LIMIT_EXCEEDED'
        });
      }
    });
  }

  /**
   * Create adaptive rate limiter based on user behavior
   */
  async createAdaptiveLimiter(userId: string): Promise<(req: Request, res: Response, next: NextFunction) => void> {
    const baseLimit = await this.calculateAdaptiveLimit(userId);
    
    return rateLimit({
      store: new RedisStore({
        client: this.redis,
        prefix: `adaptive:${userId}:`,
      }),
      windowMs: 60 * 1000, // 1 minute
      max: baseLimit,
      keyGenerator: (req) => req.user?.id || req.ip,
      message: {
        error: 'Adaptive rate limit exceeded based on your behavior.',
        retryAfter: 60,
        type: 'ADAPTIVE_RATE_LIMIT_EXCEEDED'
      },
      handler: (req, res) => {
        res.status(429).json({
          error: 'Adaptive rate limit exceeded based on your behavior.',
          retryAfter: 60,
          type: 'ADAPTIVE_RATE_LIMIT_EXCEEDED'
        });
      }
    });
  }

  /**
   * Calculate adaptive rate limit based on user's security score
   */
  async calculateAdaptiveLimit(userId: string): Promise<number> {
    const key = `user:${userId}:security`;
    const securityData = await this.redis.hgetall(key);
    
    const suspiciousActivity = parseInt(securityData.suspicious || '0');
    const violationCount = parseInt(securityData.violations || '0');
    const trustScore = parseFloat(securityData.trustScore || '1.0');
    
    let baseLimit = 100; // Default requests per minute
    
    // Reduce limit based on suspicious activity
    if (suspiciousActivity > 5) {
      baseLimit = Math.max(10, baseLimit - (suspiciousActivity * 5));
    }
    
    // Reduce limit based on violations
    if (violationCount > 3) {
      baseLimit = Math.max(5, baseLimit - (violationCount * 10));
    }
    
    // Adjust based on trust score
    baseLimit = Math.floor(baseLimit * trustScore);
    
    return Math.max(5, baseLimit); // Minimum 5 requests per minute
  }

  /**
   * Check connection limits per IP
   */
  async checkConnectionLimits(ip: string): Promise<boolean> {
    const key = `conn:${ip}`;
    const connections = await this.redis.get(key);
    
    if (!connections) {
      await this.redis.setex(key, 60, '1');
      return true;
    }
    
    const count = parseInt(connections);
    if (count >= 10) { // Max 10 concurrent connections per IP
      return false;
    }
    
    await this.redis.incr(key);
    return true;
  }

  /**
   * Check resource-based limits
   */
  async checkResourceLimits(userId: string, resource: string): Promise<boolean> {
    const key = `resource:${userId}:${resource}`;
    const usage = await this.redis.get(key);
    
    const limits = {
      'cpu': 100,     // CPU units per minute
      'memory': 50,   // Memory operations per minute
      'storage': 10,  // Storage operations per minute
      'network': 200  // Network requests per minute
    };
    
    const limit = limits[resource as keyof typeof limits] || 50;
    
    if (!usage) {
      await this.redis.setex(key, 60, '1');
      return true;
    }
    
    const count = parseInt(usage);
    if (count >= limit) {
      return false;
    }
    
    await this.redis.incr(key);
    return true;
  }

  /**
   * Implement sliding window rate limiting
   */
  async checkSlidingWindowLimit(
    key: string,
    windowSize: number,
    maxRequests: number
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowSize;
    
    // Remove old entries
    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    
    // Count current requests
    const currentRequests = await this.redis.zcard(key);
    
    if (currentRequests >= maxRequests) {
      return false;
    }
    
    // Add current request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, Math.ceil(windowSize / 1000));
    
    return true;
  }

  /**
   * Get circuit breaker status
   */
  async getCircuitBreakerStatus(service: string): Promise<CircuitBreakerStatus> {
    const key = `circuit:${service}`;
    const data = await this.redis.hgetall(key);
    
    if (!data.state) {
      return {
        state: 'CLOSED',
        errorCount: 0,
        lastFailure: null,
        nextAttempt: null
      };
    }
    
    return {
      state: data.state as CircuitBreakerState,
      errorCount: parseInt(data.errorCount || '0'),
      lastFailure: data.lastFailure ? new Date(data.lastFailure) : null,
      nextAttempt: data.nextAttempt ? new Date(data.nextAttempt) : null
    };
  }

  /**
   * Record service error for circuit breaker
   */
  async recordServiceError(service: string): Promise<void> {
    const key = `circuit:${service}`;
    const status = await this.getCircuitBreakerStatus(service);
    
    const newErrorCount = status.errorCount + 1;
    
    if (newErrorCount >= this.circuitBreakerThreshold) {
      // Open circuit
      await this.redis.hmset(key, {
        state: 'OPEN',
        errorCount: newErrorCount,
        lastFailure: new Date().toISOString(),
        nextAttempt: new Date(Date.now() + this.circuitBreakerTimeout).toISOString()
      });
    } else {
      await this.redis.hmset(key, {
        state: 'CLOSED',
        errorCount: newErrorCount,
        lastFailure: new Date().toISOString()
      });
    }
    
    await this.redis.expire(key, 300); // 5 minutes TTL
  }

  /**
   * Record service success for circuit breaker
   */
  async recordServiceSuccess(service: string): Promise<void> {
    const key = `circuit:${service}`;
    const status = await this.getCircuitBreakerStatus(service);
    
    if (status.state === 'HALF_OPEN') {
      // Close circuit on success
      await this.redis.hmset(key, {
        state: 'CLOSED',
        errorCount: 0,
        lastFailure: null,
        nextAttempt: null
      });
    } else if (status.state === 'CLOSED' && status.errorCount > 0) {
      // Reset error count on success
      await this.redis.hmset(key, {
        state: 'CLOSED',
        errorCount: 0
      });
    }
  }

  /**
   * Check if circuit breaker allows request
   */
  async isCircuitBreakerOpen(service: string): Promise<boolean> {
    const status = await this.getCircuitBreakerStatus(service);
    
    if (status.state === 'OPEN') {
      // Check if we should transition to half-open
      if (status.nextAttempt && new Date() > status.nextAttempt) {
        await this.redis.hmset(`circuit:${service}`, {
          state: 'HALF_OPEN'
        });
        return false; // Allow one request
      }
      return true; // Circuit is open
    }
    
    return false; // Circuit is closed or half-open
  }

  /**
   * Implement token bucket rate limiting
   */
  async checkTokenBucket(
    key: string,
    capacity: number,
    refillRate: number,
    tokensRequested: number = 1
  ): Promise<boolean> {
    const now = Date.now();
    const bucketData = await this.redis.hmget(key, 'tokens', 'lastRefill');
    
    let tokens = parseFloat(bucketData[0] || capacity.toString());
    let lastRefill = parseInt(bucketData[1] || now.toString());
    
    // Calculate tokens to add based on time elapsed
    const timeDelta = now - lastRefill;
    const tokensToAdd = Math.floor(timeDelta / 1000) * refillRate;
    tokens = Math.min(capacity, tokens + tokensToAdd);
    
    // Check if we have enough tokens
    if (tokens < tokensRequested) {
      // Update bucket state
      await this.redis.hmset(key, {
        tokens: tokens.toString(),
        lastRefill: now.toString()
      });
      await this.redis.expire(key, 3600); // 1 hour TTL
      return false;
    }
    
    // Consume tokens
    tokens -= tokensRequested;
    
    // Update bucket state
    await this.redis.hmset(key, {
      tokens: tokens.toString(),
      lastRefill: now.toString()
    });
    await this.redis.expire(key, 3600); // 1 hour TTL
    
    return true;
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats(prefix: string): Promise<RateLimitStats> {
    const keys = await this.redis.keys(`${prefix}:*`);
    const stats: RateLimitStats = {
      totalKeys: keys.length,
      activeKeys: 0,
      totalRequests: 0,
      blockedRequests: 0
    };
    
    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl > 0) {
        stats.activeKeys++;
        
        // Get request count (implementation depends on rate limiter type)
        const value = await this.redis.get(key);
        if (value) {
          stats.totalRequests += parseInt(value);
        }
      }
    }
    
    return stats;
  }

  /**
   * Clean up expired rate limit keys
   */
  async cleanupExpiredKeys(prefix: string): Promise<number> {
    const keys = await this.redis.keys(`${prefix}:*`);
    let cleanedCount = 0;
    
    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -2) { // Key doesn't exist
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * Update user security score
   */
  async updateUserSecurityScore(userId: string, score: number): Promise<void> {
    const key = `user:${userId}:security`;
    await this.redis.hset(key, 'trustScore', score.toString());
    await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 days TTL
  }

  /**
   * Record suspicious activity
   */
  async recordSuspiciousActivity(userId: string, activity: string): Promise<void> {
    const key = `user:${userId}:security`;
    await this.redis.hincrby(key, 'suspicious', 1);
    await this.redis.hset(key, 'lastSuspiciousActivity', activity);
    await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 days TTL
  }

  /**
   * Record security violation
   */
  async recordSecurityViolation(userId: string, violation: string): Promise<void> {
    const key = `user:${userId}:security`;
    await this.redis.hincrby(key, 'violations', 1);
    await this.redis.hset(key, 'lastViolation', violation);
    await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 days TTL
  }
}

export interface RateLimitStats {
  totalKeys: number;
  activeKeys: number;
  totalRequests: number;
  blockedRequests: number;
}