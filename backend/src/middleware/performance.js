/**
 * Performance Optimization Middleware
 * Handles caching, compression, and performance monitoring
 */

const { logger } = require('../utils/logger');
const { redis } = require('../config/redis');
const { promisify } = require('util');
const compression = require('compression');
const responseTime = require('response-time');

/**
 * Response caching middleware
 */
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for authenticated requests with sensitive data
    if (req.headers.authorization && req.path.includes('/profile')) {
      return next();
    }

    const cacheKey = `api_cache:${req.originalUrl}`;
    
    try {
      // Check if response is cached
      const cachedResponse = await redis.get(cacheKey);
      
      if (cachedResponse) {
        const data = JSON.parse(cachedResponse);
        
        // Set cache headers
        res.set({
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${ttl}`,
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey
        });
        
        return res.json(data);
      }

      // Cache miss - intercept response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache successful responses
        if (res.statusCode === 200) {
          redis.setex(cacheKey, ttl, JSON.stringify(data))
            .catch(error => logger.error('Cache set error:', error));
        }
        
        // Set cache headers
        res.set({
          'Cache-Control': `public, max-age=${ttl}`,
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey
        });
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Conditional caching based on user context
 */
const smartCacheMiddleware = () => {
  return async (req, res, next) => {
    // Define cache strategies
    const cacheStrategies = {
      // Public endpoints - long cache
      '/api/game/config': { ttl: 3600, public: true },
      '/api/leaderboard': { ttl: 30, public: true },
      
      // User-specific endpoints - short cache
      '/api/game/state': { ttl: 5, userSpecific: true },
      '/api/players/achievements': { ttl: 60, userSpecific: true },
      
      // No cache
      '/api/game/click': { ttl: 0, noCache: true },
      '/api/auth': { ttl: 0, noCache: true }
    };

    const strategy = Object.entries(cacheStrategies)
      .find(([path]) => req.path.startsWith(path))?.[1];

    if (!strategy || strategy.noCache) {
      return next();
    }

    let cacheKey = `api:${req.path}`;
    
    // Add user context for user-specific endpoints
    if (strategy.userSpecific && req.user?.id) {
      cacheKey += `:user:${req.user.id}`;
    }

    // Add query parameters to cache key
    if (Object.keys(req.query).length > 0) {
      const queryString = new URLSearchParams(req.query).toString();
      cacheKey += `:${queryString}`;
    }

    try {
      const cachedResponse = await redis.get(cacheKey);
      
      if (cachedResponse) {
        const data = JSON.parse(cachedResponse);
        
        res.set({
          'Content-Type': 'application/json',
          'Cache-Control': strategy.public ? 
            `public, max-age=${strategy.ttl}` : 
            `private, max-age=${strategy.ttl}`,
          'X-Cache': 'HIT',
          'X-Cache-TTL': strategy.ttl
        });
        
        return res.json(data);
      }

      // Intercept and cache response
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200 && strategy.ttl > 0) {
          redis.setex(cacheKey, strategy.ttl, JSON.stringify(data))
            .catch(error => logger.error('Smart cache error:', error));
        }
        
        res.set({
          'Cache-Control': strategy.public ? 
            `public, max-age=${strategy.ttl}` : 
            `private, max-age=${strategy.ttl}`,
          'X-Cache': 'MISS',
          'X-Cache-TTL': strategy.ttl
        });
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Smart cache middleware error:', error);
      next();
    }
  };
};

/**
 * Performance monitoring middleware
 */
const performanceMiddleware = () => {
  return responseTime((req, res, time) => {
    const metrics = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: time,
      timestamp: Date.now(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    // Log slow requests
    if (time > 1000) {
      logger.warn('Slow request detected:', metrics);
    }

    // Store performance metrics
    storePerformanceMetrics(metrics);
  });
};

/**
 * Store performance metrics in Redis
 */
async function storePerformanceMetrics(metrics) {
  try {
    const key = `perf:${Date.now()}`;
    await redis.setex(key, 3600, JSON.stringify(metrics)); // Keep for 1 hour
    
    // Update aggregated metrics
    await updateAggregatedMetrics(metrics);
  } catch (error) {
    logger.error('Error storing performance metrics:', error);
  }
}

/**
 * Update aggregated performance metrics
 */
async function updateAggregatedMetrics(metrics) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    
    // Hourly aggregation
    const hourlyKey = `perf:hourly:${date}:${hour}`;
    await redis.hincrby(hourlyKey, 'count', 1);
    await redis.hincrbyfloat(hourlyKey, 'totalTime', metrics.responseTime);
    await redis.expire(hourlyKey, 86400 * 7); // Keep for 7 days
    
    // Status code tracking
    const statusKey = `perf:status:${date}:${hour}`;
    await redis.hincrby(statusKey, metrics.statusCode, 1);
    await redis.expire(statusKey, 86400 * 7);
    
    // Endpoint tracking
    const endpointKey = `perf:endpoint:${metrics.url}:${date}:${hour}`;
    await redis.hincrby(endpointKey, 'count', 1);
    await redis.hincrbyfloat(endpointKey, 'totalTime', metrics.responseTime);
    await redis.expire(endpointKey, 86400 * 7);
  } catch (error) {
    logger.error('Error updating aggregated metrics:', error);
  }
}

/**
 * Database connection pooling optimization
 */
const connectionPoolMiddleware = () => {
  return (req, res, next) => {
    // Add connection pool info to request
    req.dbPoolInfo = {
      activeConnections: process.env.DB_POOL_SIZE || 10,
      maxConnections: process.env.DB_MAX_CONNECTIONS || 20
    };
    
    next();
  };
};

/**
 * Request/Response optimization middleware
 */
const requestOptimizationMiddleware = () => {
  return (req, res, next) => {
    // Enable gzip compression
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024, // Only compress if > 1KB
      level: 6 // Balanced compression level
    })(req, res, () => {});

    // Set security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });

    // Add request ID for tracing
    req.requestId = generateRequestId();
    res.set('X-Request-ID', req.requestId);

    next();
  };
};

/**
 * Memory usage monitoring
 */
const memoryMonitoringMiddleware = () => {
  return (req, res, next) => {
    const memUsage = process.memoryUsage();
    
    // Log memory warnings
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      logger.warn('High memory usage detected:', {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      });
    }

    // Add memory info to response headers (dev mode only)
    if (process.env.NODE_ENV === 'development') {
      res.set('X-Memory-Usage', Math.round(memUsage.heapUsed / 1024 / 1024));
    }

    next();
  };
};

/**
 * Background job processing optimization
 */
const backgroundJobMiddleware = () => {
  return (req, res, next) => {
    // Queue heavy operations for background processing
    req.queueJob = (jobType, data) => {
      // Implementation would integrate with job queue (Bull, Agenda, etc.)
      logger.info(`Queuing background job: ${jobType}`, { requestId: req.requestId });
    };

    next();
  };
};

/**
 * API response optimization
 */
const responseOptimizationMiddleware = () => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      // Add performance metadata
      const responseData = {
        ...data,
        _meta: {
          timestamp: Date.now(),
          requestId: req.requestId,
          processingTime: Date.now() - req.startTime
        }
      };

      // Optimize response size
      if (req.query.fields) {
        const fields = req.query.fields.split(',');
        responseData.data = pickFields(responseData.data, fields);
      }

      return originalJson.call(this, responseData);
    };

    // Track request start time
    req.startTime = Date.now();
    next();
  };
};

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Pick specific fields from object
 */
function pickFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {};
  fields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      result[field] = obj[field];
    }
  });
  
  return result;
}

/**
 * Get performance statistics
 */
async function getPerformanceStats() {
  try {
    const date = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    
    const hourlyKey = `perf:hourly:${date}:${hour}`;
    const statusKey = `perf:status:${date}:${hour}`;
    
    const [hourlyStats, statusStats] = await Promise.all([
      redis.hgetall(hourlyKey),
      redis.hgetall(statusKey)
    ]);

    const avgResponseTime = hourlyStats.count > 0 ? 
      (parseFloat(hourlyStats.totalTime) / parseInt(hourlyStats.count)).toFixed(2) : 0;

    return {
      hourly: {
        requests: parseInt(hourlyStats.count) || 0,
        avgResponseTime: parseFloat(avgResponseTime),
        totalTime: parseFloat(hourlyStats.totalTime) || 0
      },
      statusCodes: statusStats,
      timestamp: Date.now()
    };
  } catch (error) {
    logger.error('Error getting performance stats:', error);
    return null;
  }
}

module.exports = {
  cacheMiddleware,
  smartCacheMiddleware,
  performanceMiddleware,
  connectionPoolMiddleware,
  requestOptimizationMiddleware,
  memoryMonitoringMiddleware,
  backgroundJobMiddleware,
  responseOptimizationMiddleware,
  getPerformanceStats
};