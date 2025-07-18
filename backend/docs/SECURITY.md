# 🔐 Security Implementation Guide
## Llama Wool Farm - Supabase Backend Security

### 📋 Overview

This document outlines the comprehensive security implementation for the Llama Wool Farm backend, focusing on Supabase Row Level Security (RLS), anti-cheat measures, and data protection.

### 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   Backend       │
│   (PWA)         │    │   (Database)    │    │   (API Layer)   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ - Auth Token    │───▶│ - RLS Policies  │◀───│ - Rate Limiting │
│ - State Sync    │    │ - Anti-Cheat    │    │ - Validation    │
│ - Validation    │    │ - Audit Logs    │    │ - Middleware    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔒 Core Security Components

### 1. Row Level Security (RLS) Policies

#### **File**: `backend/supabase/rls-policies.sql`

**Key Features**:
- ✅ **User Isolation**: Users can only access their own data
- ✅ **Admin Controls**: Admins can manage all data
- ✅ **Rate Limiting**: Built-in SQL-level rate limiting
- ✅ **Anti-Cheat**: Server-side validation triggers
- ✅ **Audit Logging**: Automatic security event logging

**Critical Policies**:
```sql
-- Users can only read their own game saves
CREATE POLICY "game_saves_read_own" ON game_saves
  FOR SELECT TO authenticated
  USING (is_owner(user_id));

-- Anti-cheat validation on game state updates
CREATE POLICY "game_saves_update_own" ON game_saves
  FOR UPDATE TO authenticated
  USING (is_owner(user_id))
  WITH CHECK (
    NOT is_suspicious_game_state(
      OLD.wool_count, NEW.wool_count,
      EXTRACT(EPOCH FROM (NEW.last_updated - OLD.last_updated))::INTEGER
    )
  );
```

### 2. Security Middleware

#### **File**: `backend/src/middleware/security.middleware.js`

**Key Features**:
- 🔐 **Supabase Auth Integration**: JWT token validation
- 🛡️ **Device Fingerprinting**: Unique device identification
- 🚨 **Anti-Cheat Detection**: Real-time game state validation
- 📊 **Audit Logging**: Comprehensive security event tracking
- 🔒 **Security Headers**: Helmet.js security headers

**Usage Example**:
```javascript
const SecurityMiddleware = require('./middleware/security.middleware');

// Apply security middleware
app.use(SecurityMiddleware.globalRateLimit());
app.use(SecurityMiddleware.configure);
```

### 3. Rate Limiting

#### **File**: `backend/src/middleware/ratelimit.middleware.js`

**Key Features**:
- ⚡ **Multi-Layer Limiting**: Global, user, and endpoint-specific limits
- 🧠 **Adaptive Limits**: Adjusts based on user behavior
- 🔄 **Circuit Breaker**: Prevents service overload
- 📊 **Suspicious Score**: Machine learning-based threat detection
- 🚫 **Anti-Spam**: Duplicate request detection

**Rate Limit Configuration**:
```javascript
// Global: 1000 requests per 15 minutes
// Authentication: 10 attempts per 15 minutes
// Game API: 60 requests per minute
// User-specific: 200 requests per minute
```

### 4. Input Validation

#### **File**: `backend/src/validation/game.validation.js`

**Key Features**:
- 📝 **Comprehensive Schemas**: Joi-based validation for all data types
- 🔢 **Decimal Support**: Custom Decimal.js validation for large numbers
- 🎮 **Game Logic Validation**: Business rule enforcement
- 🔍 **Security Validation**: Anti-cheat and security event validation
- 🧹 **Data Sanitization**: Safe logging and storage

**Validation Examples**:
```javascript
// Validate complete game state
const validation = GameValidation.validateGameState(gameState);

// Validate specific game actions
const actionValidation = GameValidation.validateGameAction('purchaseBuilding', {
  buildingType: 'llama_pen',
  quantity: 1,
  expectedCost: '1000',
  timestamp: new Date().toISOString()
});
```

## 🚨 Anti-Cheat System

### Server-Side Validation

**Key Checks**:
1. **Time Progression**: Validates offline time and progression rates
2. **Resource Limits**: Enforces maximum possible production
3. **Building Logic**: Validates building purchases and upgrades
4. **Achievement Logic**: Ensures achievements are properly earned
5. **Statistical Analysis**: Detects anomalous behavior patterns

### Real-Time Detection

**Triggers**:
- Impossible progression rates
- Resource manipulation
- Time tampering
- Repeated suspicious activity
- Anomalous usage patterns

**Actions**:
- Automatic state rejection
- Security event logging
- Progressive rate limiting
- Account flagging
- Admin notifications

## 📊 Audit & Monitoring

### Security Logging

**Logged Events**:
- Authentication attempts
- Rate limit violations
- Anti-cheat detections
- Suspicious activity
- Data access patterns
- Error conditions

**Log Storage**:
- Supabase `security_logs` table
- Local file system backup
- Real-time monitoring dashboard

### Performance Monitoring

**Metrics Tracked**:
- Request latency
- Rate limit effectiveness
- Anti-cheat accuracy
- User behavior patterns
- System resource usage

## 🔧 Configuration

### Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key

# Redis (for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
IP_SALT=your-ip-salt

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_MAX=10
GAME_RATE_LIMIT_MAX=60
```

### Package Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "express-rate-limit": "^7.1.5",
    "rate-limiter-flexible": "^3.0.8",
    "helmet": "^7.1.0",
    "joi": "^17.11.0",
    "ioredis": "^5.3.2",
    "decimal.js": "^10.4.3",
    "crypto": "^1.0.1",
    "winston": "^3.11.0"
  }
}
```

## 🚀 Implementation Steps

### Phase 1: Basic Security Setup
1. **Install Dependencies**
   ```bash
   npm install @supabase/supabase-js express-rate-limit helmet joi ioredis
   ```

2. **Configure Supabase**
   - Set up environment variables
   - Apply RLS policies
   - Configure auth settings

3. **Apply Middleware**
   ```javascript
   const SecurityMiddleware = require('./middleware/security.middleware');
   const RateLimitMiddleware = require('./middleware/ratelimit.middleware');
   
   app.use(SecurityMiddleware.configure);
   app.use(RateLimitMiddleware.globalRateLimit());
   ```

### Phase 2: Anti-Cheat Implementation
1. **Database Triggers**
   - Apply anti-cheat SQL triggers
   - Set up security logging tables
   - Configure audit functions

2. **Middleware Integration**
   ```javascript
   app.use('/api/game/', SecurityMiddleware.antiCheatDetection);
   app.use('/api/game/', RateLimitMiddleware.gameRateLimit());
   ```

### Phase 3: Monitoring & Alerting
1. **Set up logging**
   - Configure Winston logging
   - Set up log rotation
   - Create monitoring dashboard

2. **Implement alerting**
   - High-severity event alerts
   - Performance monitoring
   - Automated responses

## 🔍 Testing Security

### Security Test Checklist

- [ ] **Authentication Tests**
  - Token validation
  - Session management
  - Unauthorized access prevention

- [ ] **Rate Limiting Tests**
  - Global rate limits
  - User-specific limits
  - Adaptive limiting

- [ ] **Anti-Cheat Tests**
  - Game state manipulation
  - Resource injection
  - Time manipulation

- [ ] **Input Validation Tests**
  - SQL injection prevention
  - XSS prevention
  - Data type validation

- [ ] **Performance Tests**
  - Load testing
  - Stress testing
  - Security under load

### Penetration Testing Scenarios

1. **Game State Manipulation**
   ```javascript
   // Test: Attempt to inject impossible resources
   const maliciousState = {
     woolCounts: { white: '99999999999999999999' },
     timestamp: new Date().toISOString()
   };
   ```

2. **Rate Limit Bypass**
   ```javascript
   // Test: Rapid requests with different IPs
   for (let i = 0; i < 1000; i++) {
     await makeRequest('/api/game/save', { 
       headers: { 'X-Forwarded-For': `192.168.1.${i % 255}` }
     });
   }
   ```

3. **Authentication Bypass**
   ```javascript
   // Test: Access protected endpoints without auth
   const response = await fetch('/api/game/save', {
     method: 'POST',
     body: JSON.stringify(gameState)
   });
   ```

## 🛡️ Security Best Practices

### Development Guidelines

1. **Always Validate Input**
   ```javascript
   // Good
   const validation = GameValidation.validateGameState(req.body);
   if (!validation.valid) {
     return res.status(400).json({ error: validation.error });
   }
   
   // Bad
   const gameState = req.body; // No validation
   ```

2. **Use Parameterized Queries**
   ```javascript
   // Good
   const { data } = await supabase
     .from('game_saves')
     .select('*')
     .eq('user_id', userId);
   
   // Bad
   const query = `SELECT * FROM game_saves WHERE user_id = '${userId}'`;
   ```

3. **Implement Proper Error Handling**
   ```javascript
   // Good
   try {
     const result = await validateGameState(gameState);
     await logSecurityEvent('GAME_STATE_VALID', 'info', { userId });
   } catch (error) {
     await logSecurityEvent('VALIDATION_ERROR', 'error', { error: error.message });
     return res.status(400).json({ error: 'Invalid game state' });
   }
   ```

### Production Deployment

1. **Environment Configuration**
   - Use strong encryption keys
   - Configure proper CORS origins
   - Set up SSL/TLS certificates
   - Configure rate limiting thresholds

2. **Monitoring Setup**
   - Set up log aggregation
   - Configure alert thresholds
   - Monitor performance metrics
   - Set up automated responses

3. **Regular Security Audits**
   - Review security logs
   - Update dependencies
   - Penetration testing
   - Code security reviews

## 📈 Performance Considerations

### Optimization Strategies

1. **Database Optimization**
   - Proper indexing on security-related columns
   - Efficient RLS policy design
   - Query optimization

2. **Caching Strategy**
   - Redis for rate limiting
   - Session caching
   - Security metadata caching

3. **Load Balancing**
   - Distribute security processing
   - Horizontal scaling
   - CDN integration

### Monitoring Metrics

- **Security Metrics**: False positive rate, detection accuracy
- **Performance Metrics**: Response times, throughput
- **System Metrics**: CPU usage, memory usage, database connections

## 🔄 Maintenance & Updates

### Regular Tasks

1. **Weekly**
   - Review security logs
   - Update suspicious user scores
   - Clean up old data

2. **Monthly**
   - Security policy review
   - Performance optimization
   - Dependency updates

3. **Quarterly**
   - Penetration testing
   - Security audit
   - Policy updates

### Emergency Procedures

1. **Security Incident Response**
   - Immediate threat containment
   - Evidence preservation
   - System recovery
   - Post-incident analysis

2. **Performance Issues**
   - Load balancing activation
   - Rate limit adjustment
   - Resource scaling

## 📚 Additional Resources

- [Supabase Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Last Updated**: 2025-01-18  
**Version**: 1.0.0  
**Security Level**: Enterprise-Grade