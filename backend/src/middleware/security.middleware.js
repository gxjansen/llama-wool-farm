/**
 * =============================================
 * SECURITY MIDDLEWARE - SUPABASE INTEGRATION
 * Llama Wool Farm - Comprehensive Protection
 * =============================================
 */

const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const winston = require('winston');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Security logger
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class SecurityMiddleware {
  /**
   * Configure comprehensive security middleware
   */
  static configure(app) {
    // Basic security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "https:", process.env.SUPABASE_URL],
          workerSrc: ["'self'", "blob:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'X-Device-ID',
        'X-Game-Version',
        'X-Platform'
      ],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    }));

    // Compression
    app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Request parsing with limits
    app.use(express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));

    app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Custom security middleware
    app.use(this.requestValidator);
    app.use(this.deviceFingerprinting);
    app.use(this.supabaseAuth);
    app.use(this.antiCheatDetection);
    app.use(this.securityHeaders);
    app.use(this.auditLogger);
  }

  /**
   * Global rate limiting with Redis support
   */
  static createGlobalRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/status';
      },
      onLimitReached: (req, res) => {
        SecurityMiddleware.logSecurityEvent(req, 'RATE_LIMIT_EXCEEDED', 'warning', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path
        });
      }
    });
  }

  /**
   * Authentication-specific rate limiting
   */
  static createAuthRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // limit each IP to 10 login attempts per windowMs
      message: {
        error: 'Too many login attempts, please try again later.',
        retryAfter: 15 * 60
      },
      skipSuccessfulRequests: true,
      onLimitReached: (req, res) => {
        SecurityMiddleware.logSecurityEvent(req, 'AUTH_RATE_LIMIT_EXCEEDED', 'warning', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path
        });
      }
    });
  }

  /**
   * Game API rate limiting
   */
  static createGameRateLimit() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 60, // limit each user to 60 game updates per minute
      keyGenerator: (req) => req.user?.id || req.ip,
      message: {
        error: 'Too many game updates, please slow down.',
        retryAfter: 60
      },
      onLimitReached: (req, res) => {
        SecurityMiddleware.logSecurityEvent(req, 'GAME_RATE_LIMIT_EXCEEDED', 'warning', {
          userId: req.user?.id,
          ip: req.ip,
          endpoint: req.path
        });
      }
    });
  }

  /**
   * Request validation middleware
   */
  static requestValidator(req, res, next) {
    // Validate request size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
      SecurityMiddleware.logSecurityEvent(req, 'REQUEST_TOO_LARGE', 'warning', {
        contentLength,
        maxAllowed: 10 * 1024 * 1024
      });
      return res.status(413).json({ error: 'Request too large' });
    }

    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        SecurityMiddleware.logSecurityEvent(req, 'INVALID_CONTENT_TYPE', 'info', {
          contentType,
          method: req.method
        });
        return res.status(415).json({ error: 'Unsupported content type' });
      }
    }

    // Validate user agent
    const userAgent = req.headers['user-agent'];
    if (!userAgent || userAgent.length < 10) {
      SecurityMiddleware.logSecurityEvent(req, 'INVALID_USER_AGENT', 'info', {
        userAgent
      });
      return res.status(400).json({ error: 'Invalid user agent' });
    }

    // Validate game version for game API endpoints
    if (req.path.startsWith('/api/game/')) {
      const gameVersion = req.headers['x-game-version'];
      if (!gameVersion || !SecurityMiddleware.isValidGameVersion(gameVersion)) {
        SecurityMiddleware.logSecurityEvent(req, 'INVALID_GAME_VERSION', 'warning', {
          gameVersion,
          endpoint: req.path
        });
        return res.status(400).json({ error: 'Invalid or missing game version' });
      }
    }

    next();
  }

  /**
   * Device fingerprinting middleware
   */
  static deviceFingerprinting(req, res, next) {
    const deviceId = req.headers['x-device-id'] || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const platform = req.headers['x-platform'] || 'unknown';

    // Generate device fingerprint
    const fingerprint = crypto.createHash('sha256')
      .update(`${deviceId}${userAgent}${acceptLanguage}${acceptEncoding}${req.ip}${platform}`)
      .digest('hex');

    req.deviceFingerprint = fingerprint;
    req.deviceId = deviceId;
    req.platform = platform;

    next();
  }

  /**
   * Supabase authentication middleware
   */
  static async supabaseAuth(req, res, next) {
    // Skip auth for public endpoints
    if (SecurityMiddleware.isPublicEndpoint(req.path)) {
      return next();
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        SecurityMiddleware.logSecurityEvent(req, 'MISSING_AUTH_TOKEN', 'info', {
          endpoint: req.path
        });
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7);
      
      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        SecurityMiddleware.logSecurityEvent(req, 'INVALID_AUTH_TOKEN', 'warning', {
          endpoint: req.path,
          error: error?.message
        });
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Validate session
      const sessionValid = await SecurityMiddleware.validateSession(user.id, req.deviceFingerprint);
      if (!sessionValid) {
        SecurityMiddleware.logSecurityEvent(req, 'INVALID_SESSION', 'warning', {
          userId: user.id,
          deviceFingerprint: req.deviceFingerprint
        });
        return res.status(401).json({ error: 'Invalid session' });
      }

      // Check if user is banned or suspended
      const userStatus = await SecurityMiddleware.checkUserStatus(user.id);
      if (userStatus.banned || userStatus.suspended) {
        SecurityMiddleware.logSecurityEvent(req, 'BLOCKED_USER_ACCESS', 'warning', {
          userId: user.id,
          status: userStatus
        });
        return res.status(403).json({ 
          error: 'Account suspended or banned',
          reason: userStatus.reason 
        });
      }

      req.user = user;
      req.userId = user.id;
      
      next();
    } catch (error) {
      SecurityMiddleware.logSecurityEvent(req, 'AUTH_ERROR', 'error', {
        error: error.message,
        stack: error.stack
      });
      return res.status(500).json({ error: 'Authentication error' });
    }
  }

  /**
   * Anti-cheat detection middleware
   */
  static async antiCheatDetection(req, res, next) {
    // Only apply to game state endpoints
    if (!req.path.includes('/game/save') && !req.path.includes('/game/sync')) {
      return next();
    }

    try {
      const gameState = req.body;
      const userId = req.userId;

      if (!gameState || !userId) {
        return next();
      }

      // Get previous game state
      const { data: previousState } = await supabase
        .from('game_saves')
        .select('*')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (previousState) {
        // Validate game state progression
        const validation = await SecurityMiddleware.validateGameStateProgression(
          previousState,
          gameState,
          userId
        );

        if (!validation.valid) {
          SecurityMiddleware.logSecurityEvent(req, 'ANTI_CHEAT_VIOLATION', 'error', {
            userId,
            violations: validation.violations,
            previousState: SecurityMiddleware.sanitizeGameState(previousState),
            currentState: SecurityMiddleware.sanitizeGameState(gameState)
          });

          return res.status(400).json({
            error: 'Invalid game state progression',
            violations: validation.violations
          });
        }

        // Log suspicious activity
        if (validation.suspicious.length > 0) {
          SecurityMiddleware.logSecurityEvent(req, 'SUSPICIOUS_ACTIVITY', 'warning', {
            userId,
            suspicious: validation.suspicious
          });
        }
      }

      next();
    } catch (error) {
      SecurityMiddleware.logSecurityEvent(req, 'ANTI_CHEAT_ERROR', 'error', {
        error: error.message,
        userId: req.userId
      });
      // Continue with request even if anti-cheat fails
      next();
    }
  }

  /**
   * Security headers middleware
   */
  static securityHeaders(req, res, next) {
    // Add custom security headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Add cache control for sensitive endpoints
    if (req.path.includes('/api/auth') || req.path.includes('/api/user')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  }

  /**
   * Audit logging middleware
   */
  static auditLogger(req, res, next) {
    const startTime = Date.now();
    
    // Log request
    if (req.userId) {
      SecurityMiddleware.logSecurityEvent(req, 'API_REQUEST', 'info', {
        userId: req.userId,
        method: req.method,
        endpoint: req.path,
        userAgent: req.get('User-Agent'),
        deviceId: req.deviceId
      });
    }

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (req.userId) {
        SecurityMiddleware.logSecurityEvent(req, 'API_RESPONSE', 'info', {
          userId: req.userId,
          method: req.method,
          endpoint: req.path,
          statusCode: res.statusCode,
          duration
        });
      }
    });

    next();
  }

  /**
   * Helper Functions
   */

  static isPublicEndpoint(path) {
    const publicEndpoints = [
      '/health',
      '/status',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/leaderboard/public'
    ];
    return publicEndpoints.some(endpoint => path.startsWith(endpoint));
  }

  static isValidGameVersion(version) {
    const validVersions = ['1.0.0', '1.0.1', '1.1.0']; // Update as needed
    return validVersions.includes(version);
  }

  static async validateSession(userId, deviceFingerprint) {
    try {
      const { data: session } = await supabase
        .from('player_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint)
        .eq('status', 'active')
        .single();

      return !!session;
    } catch (error) {
      return false;
    }
  }

  static async checkUserStatus(userId) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('status, banned_until, suspension_reason')
        .eq('id', userId)
        .single();

      return {
        banned: user.status === 'banned',
        suspended: user.status === 'suspended' || (user.banned_until && new Date(user.banned_until) > new Date()),
        reason: user.suspension_reason
      };
    } catch (error) {
      return { banned: false, suspended: false };
    }
  }

  static async validateGameStateProgression(previousState, currentState, userId) {
    const violations = [];
    const suspicious = [];

    // Time validation
    const timeDiff = (new Date(currentState.last_updated) - new Date(previousState.last_updated)) / 1000;
    if (timeDiff < 0) {
      violations.push('Time regression detected');
    }

    if (timeDiff > 24 * 60 * 60) { // 24 hours
      suspicious.push('Offline time exceeds 24 hours');
    }

    // Resource validation
    const woolDiff = parseFloat(currentState.wool_count) - parseFloat(previousState.wool_count);
    const maxPossibleProduction = SecurityMiddleware.calculateMaxProduction(previousState, timeDiff);

    if (woolDiff > maxPossibleProduction * 1.1) { // 10% tolerance
      violations.push('Impossible production rate detected');
    }

    // Building validation
    if (currentState.buildings) {
      for (const [buildingType, building] of Object.entries(currentState.buildings)) {
        const prevBuilding = previousState.buildings[buildingType];
        if (prevBuilding && building.level < prevBuilding.level) {
          violations.push(`Building level decreased: ${buildingType}`);
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      suspicious
    };
  }

  static calculateMaxProduction(gameState, timeDiffSeconds) {
    // Simplified production calculation
    // In a real implementation, this would use the actual game mechanics
    let baseProduction = 0;
    
    if (gameState.buildings) {
      for (const building of Object.values(gameState.buildings)) {
        baseProduction += building.level * building.base_production || 0;
      }
    }

    return baseProduction * timeDiffSeconds;
  }

  static sanitizeGameState(gameState) {
    // Remove sensitive information from game state for logging
    const sanitized = { ...gameState };
    delete sanitized.encryption_key;
    delete sanitized.device_id;
    return sanitized;
  }

  static async logSecurityEvent(req, eventType, severity, details) {
    try {
      const securityEvent = {
        user_id: req.userId || null,
        event_type: eventType,
        severity: severity,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        device_fingerprint: req.deviceFingerprint,
        endpoint: req.path,
        method: req.method,
        details: details,
        created_at: new Date().toISOString()
      };

      // Log to Supabase
      await supabase
        .from('security_logs')
        .insert([securityEvent]);

      // Log to file
      securityLogger.log(severity, `Security Event: ${eventType}`, securityEvent);

      // Send alerts for high severity events
      if (severity === 'error' || severity === 'critical') {
        // TODO: Implement alert system (email, Slack, etc.)
        console.warn(`🚨 SECURITY ALERT: ${eventType} - ${severity}`);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

module.exports = SecurityMiddleware;