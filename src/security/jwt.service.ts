import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Redis from 'ioredis';

export interface JWTPayload {
  userId: string;
  sessionId: string;
  deviceId: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  deviceId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: number;
}

export class JWTService {
  private readonly accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
  private readonly refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '30d';
  private readonly redisClient: Redis;

  constructor() {
    this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Generate JWT token pair (access + refresh)
   */
  async generateTokenPair(userId: string, deviceId: string): Promise<TokenPair> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    const accessToken = jwt.sign(
      { userId, sessionId, deviceId },
      this.accessTokenSecret,
      { 
        expiresIn: this.accessTokenExpiry,
        issuer: 'llama-wool-farm',
        audience: 'game-client'
      }
    );

    const refreshToken = jwt.sign(
      { userId, sessionId, deviceId, tokenVersion: 1 },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    // Store session in Redis
    await this.storeSession(sessionId, userId, deviceId);

    return { 
      accessToken, 
      refreshToken, 
      sessionId,
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as JWTPayload;
      
      // Verify session exists
      const sessionExists = await this.verifySession(payload.sessionId);
      if (!sessionExists) {
        throw new Error('Session invalid');
      }

      return payload;
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = jwt.verify(refreshToken, this.refreshTokenSecret) as RefreshTokenPayload;
      
      // Verify session and token version
      const session = await this.getSession(payload.sessionId);
      if (!session || session.tokenVersion !== payload.tokenVersion) {
        throw new Error('Invalid refresh token');
      }

      // Generate new token pair
      return this.generateTokenPair(payload.userId, payload.deviceId);
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Revoke session and invalidate all tokens
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.redisClient.del(`session:${sessionId}`);
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessionKeys = await this.redisClient.keys(`session:*`);
    
    for (const key of sessionKeys) {
      const sessionData = await this.redisClient.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.userId === userId) {
          await this.redisClient.del(key);
        }
      }
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const sessionData = await this.redisClient.get(`session:${sessionId}`);
    return sessionData ? JSON.parse(sessionData) : null;
  }

  /**
   * Store session in Redis
   */
  private async storeSession(sessionId: string, userId: string, deviceId: string): Promise<void> {
    const sessionData: SessionData = {
      userId,
      deviceId,
      tokenVersion: 1,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    await this.redisClient.setex(
      `session:${sessionId}`, 
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify(sessionData)
    );
  }

  /**
   * Verify session exists and is valid
   */
  private async verifySession(sessionId: string): Promise<boolean> {
    const sessionData = await this.redisClient.get(`session:${sessionId}`);
    if (!sessionData) return false;

    const session = JSON.parse(sessionData);
    
    // Update last activity
    session.lastActivity = Date.now();
    await this.redisClient.setex(
      `session:${sessionId}`,
      30 * 24 * 60 * 60,
      JSON.stringify(session)
    );

    return true;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const sessionKeys = await this.redisClient.keys(`session:*`);
    let cleanedCount = 0;

    for (const key of sessionKeys) {
      const sessionData = await this.redisClient.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const daysSinceActivity = (Date.now() - session.lastActivity) / (1000 * 60 * 60 * 24);
        
        // Remove sessions inactive for more than 30 days
        if (daysSinceActivity > 30) {
          await this.redisClient.del(key);
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessionKeys = await this.redisClient.keys(`session:*`);
    const sessions: SessionInfo[] = [];

    for (const key of sessionKeys) {
      const sessionData = await this.redisClient.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.userId === userId) {
          sessions.push({
            sessionId: key.replace('session:', ''),
            deviceId: session.deviceId,
            createdAt: new Date(session.createdAt),
            lastActivity: new Date(session.lastActivity)
          });
        }
      }
    }

    return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }
}

export interface SessionData {
  userId: string;
  deviceId: string;
  tokenVersion: number;
  createdAt: number;
  lastActivity: number;
}

export interface SessionInfo {
  sessionId: string;
  deviceId: string;
  createdAt: Date;
  lastActivity: Date;
}