/**
 * Authentication Middleware
 * Handles Supabase authentication and authorization
 */

const { createClientWithAuth } = require('../config/supabase');
const { logger } = require('../utils/logger');

/**
 * Verify JWT token and extract user information
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7);
    
    // Create Supabase client with user token
    const supabase = createClientWithAuth(token);
    
    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Attach user to request
    req.user = user;
    req.supabase = supabase;
    
    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication - continues even if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const supabase = createClientWithAuth(token);
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (!error && user) {
      req.user = user;
      req.supabase = supabase;
    }
    
    next();
  } catch (error) {
    logger.warn('Optional auth error:', error);
    next();
  }
};

/**
 * Check if user has required role
 */
const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      const userRole = req.user.user_metadata?.role || 'user';
      
      if (userRole !== requiredRole) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: requiredRole,
          actual: userRole
        });
      }

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      return res.status(500).json({
        error: 'Authorization check failed',
        code: 'AUTH_ERROR'
      });
    }
  };
};

/**
 * Check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Check if user is moderator or admin
 */
const requireModerator = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const userRole = req.user.user_metadata?.role || 'user';
    
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: 'moderator or admin',
        actual: userRole
      });
    }

    next();
  } catch (error) {
    logger.error('Moderator check error:', error);
    return res.status(500).json({
      error: 'Authorization check failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Check if user owns the resource or is admin
 */
const requireOwnership = (resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      const resourceId = req.params[resourceIdField];
      const userId = req.user.id;
      const userRole = req.user.user_metadata?.role || 'user';

      // Admin can access any resource
      if (userRole === 'admin') {
        return next();
      }

      // Check if user owns the resource
      if (resourceId !== userId) {
        return res.status(403).json({
          error: 'Access denied - resource not owned by user',
          code: 'FORBIDDEN'
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return res.status(500).json({
        error: 'Ownership check failed',
        code: 'AUTH_ERROR'
      });
    }
  };
};

/**
 * Rate limiting by user ID
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    
    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }

    const requests = userRequests.get(userId);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    validRequests.push(now);
    userRequests.set(userId, validRequests);
    
    next();
  };
};

/**
 * Validate session and refresh token if needed
 */
const validateSession = async (req, res, next) => {
  try {
    if (!req.supabase) {
      return next();
    }

    const { data: { session }, error } = await req.supabase.auth.getSession();
    
    if (error || !session) {
      return res.status(401).json({
        error: 'Session invalid or expired',
        code: 'SESSION_EXPIRED'
      });
    }

    // Check if token needs refresh
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    // Refresh if token expires in less than 5 minutes
    if (timeUntilExpiry < 5 * 60 * 1000) {
      const { data: { session: newSession }, error: refreshError } = 
        await req.supabase.auth.refreshSession();
      
      if (refreshError) {
        logger.warn('Token refresh failed:', refreshError);
      } else if (newSession) {
        // Send new token in response headers
        res.set('X-New-Access-Token', newSession.access_token);
        res.set('X-New-Refresh-Token', newSession.refresh_token);
      }
    }

    next();
  } catch (error) {
    logger.error('Session validation error:', error);
    return res.status(500).json({
      error: 'Session validation failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Extract user preferences from metadata
 */
const extractUserPreferences = (req, res, next) => {
  if (req.user && req.user.user_metadata) {
    req.userPreferences = {
      theme: req.user.user_metadata.theme || 'default',
      language: req.user.user_metadata.language || 'en',
      notifications: req.user.user_metadata.notifications !== false,
      privacy: req.user.user_metadata.privacy || 'friends'
    };
  }
  next();
};

module.exports = {
  verifyToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireModerator,
  requireOwnership,
  userRateLimit,
  validateSession,
  extractUserPreferences
};