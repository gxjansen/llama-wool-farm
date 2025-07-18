# Llama Wool Farm API Architecture

## 🏗️ Architecture Overview

The Llama Wool Farm backend is designed as a high-performance, scalable microservices architecture built on Node.js and Express.js. This document outlines the comprehensive API design, WebSocket implementation, and performance optimization strategies.

## 🚀 Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js 4.18+
- **Database**: MongoDB 7.0 (Primary), Redis 7.2 (Cache/Sessions)
- **WebSocket**: Socket.IO 4.7+ for real-time communication
- **Authentication**: JWT with refresh tokens
- **Validation**: Joi + Express-validator
- **Documentation**: Swagger/OpenAPI 3.0

### Performance & Monitoring
- **Caching**: Redis with smart caching strategies
- **Monitoring**: Prometheus + Grafana
- **Load Balancing**: Nginx with upstream servers
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose (dev), Kubernetes (prod)

## 📋 API Design

### RESTful Endpoints

#### Authentication & Authorization
```
POST   /api/auth/register        # Player registration
POST   /api/auth/login           # Player login
POST   /api/auth/refresh         # Refresh JWT token
POST   /api/auth/logout          # Logout (invalidate token)
POST   /api/auth/forgot-password # Password reset request
POST   /api/auth/reset-password  # Password reset confirmation
```

#### Player Management
```
GET    /api/players/profile      # Get player profile
PUT    /api/players/profile      # Update player profile
DELETE /api/players/delete       # Delete player account
GET    /api/players/achievements # Get player achievements
POST   /api/players/achievements/{id} # Unlock achievement
GET    /api/players/statistics   # Get player statistics
```

#### Game State Operations
```
GET    /api/game/state           # Get current game state
POST   /api/game/state           # Update game state
GET    /api/game/production      # Get production statistics
POST   /api/game/click           # Register manual click
GET    /api/game/config          # Get game configuration
GET    /api/game/offline         # Get offline progress
POST   /api/game/offline/claim   # Claim offline progress
```

#### Building Management
```
GET    /api/game/buildings       # Get all buildings
POST   /api/game/buildings/{type}/purchase # Purchase building
GET    /api/game/buildings/{type}/cost     # Get building cost
```

#### Upgrade System
```
GET    /api/game/upgrades        # Get available upgrades
POST   /api/game/upgrades/{id}/purchase # Purchase upgrade
GET    /api/game/upgrades/categories    # Get upgrade categories
```

#### Prestige System
```
GET    /api/game/prestige        # Get prestige information
POST   /api/game/prestige        # Perform prestige
GET    /api/game/prestige/milestones # Get prestige milestones
```

#### Leaderboards
```
GET    /api/leaderboard          # Get global leaderboard
GET    /api/leaderboard/{type}   # Get specific leaderboard
GET    /api/leaderboard/player/{id} # Get player rank
```

#### Game Saves
```
POST   /api/players/save         # Save game progress
GET    /api/players/save         # Load game progress
GET    /api/players/save/history # Get save history
DELETE /api/players/save/{id}    # Delete save
```

#### Admin Endpoints
```
GET    /api/admin/stats          # Get system statistics
POST   /api/admin/maintenance    # Toggle maintenance mode
GET    /api/admin/players        # Get all players
POST   /api/admin/broadcast      # Broadcast message
```

#### Health & Monitoring
```
GET    /health                   # Health check
GET    /health/detailed          # Detailed health info
GET    /metrics                  # Prometheus metrics
GET    /api/status               # API status
```

## 🔌 WebSocket Architecture

### Real-Time Communication

The WebSocket implementation provides real-time updates for:

#### Game Events
- `gameStateUpdate` - Real-time game state changes
- `productionTick` - Production updates every second
- `achievementUnlock` - Achievement notifications
- `levelUp` - Level progression events
- `prestigeComplete` - Prestige completion

#### Leaderboard Updates
- `leaderboardUpdate` - Periodic leaderboard updates
- `rankChange` - Player rank changes
- `globalEvent` - Server-wide events

#### Social Features
- `playerOnline` - Player connection status
- `playerOffline` - Player disconnection
- `serverMessage` - Admin messages

### Connection Management

```javascript
// WebSocket connection flow
1. Client connects with JWT token
2. Server authenticates and joins rooms
3. Client subscribes to relevant channels
4. Server sends welcome message
5. Real-time updates begin
```

### Event Handling

```javascript
// Client event handlers
socket.on('gameStateUpdate', (data) => {
  // Update game state in real-time
  game.updateState(data.state);
});

socket.on('productionTick', (data) => {
  // Update production display
  ui.updateProduction(data.production);
});

socket.on('achievementUnlock', (data) => {
  // Show achievement notification
  ui.showAchievement(data.achievement);
});
```

## 🏢 Microservices Architecture

### Service Decomposition

#### 1. API Gateway Service
- **Port**: 3000
- **Purpose**: Route requests, authentication, rate limiting
- **Features**: Load balancing, request/response transformation

#### 2. Game Service
- **Port**: 3001
- **Purpose**: Core game logic, state management
- **Features**: Game calculations, production, prestige

#### 3. Player Service
- **Port**: 3002
- **Purpose**: User management, authentication
- **Features**: JWT handling, profile management

#### 4. Leaderboard Service
- **Port**: 3003
- **Purpose**: Ranking and statistics
- **Features**: Real-time rankings, statistics aggregation

#### 5. WebSocket Service
- **Port**: 3004
- **Purpose**: Real-time communication
- **Features**: Event broadcasting, room management

#### 6. Analytics Service
- **Port**: 3005
- **Purpose**: Data collection and analysis
- **Features**: Event tracking, performance metrics

#### 7. Background Jobs Service
- **Purpose**: Async processing, scheduled tasks
- **Features**: Queue processing, cron jobs

### Service Communication

```
┌─────────────────┐     ┌─────────────────┐
│   API Gateway   │────▶│   Game Service  │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│ Player Service  │     │ Analytics Svc   │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│ WebSocket Svc   │     │ Background Jobs │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
```

### Inter-Service Communication

- **HTTP REST**: Synchronous service-to-service calls
- **Redis Pub/Sub**: Asynchronous event messaging
- **Message Queue**: Background job processing
- **Service Discovery**: Consul or built-in DNS

## ⚡ Performance Optimization

### Caching Strategies

#### 1. Redis Cache Layers
```javascript
// Multi-layer caching approach
L1: Application Memory (LRU cache)
L2: Redis Cache (5-300 seconds)
L3: Database (MongoDB)
```

#### 2. Smart Caching
- **Public endpoints**: Long-term cache (1 hour)
- **User-specific**: Short-term cache (5-60 seconds)
- **Real-time data**: No cache or very short (1-5 seconds)

#### 3. Cache Invalidation
- **TTL-based**: Automatic expiration
- **Event-driven**: Manual invalidation on data changes
- **Version-based**: Cache versioning for consistency

### Database Optimization

#### 1. Connection Pooling
```javascript
const poolConfig = {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 600000,
  reapIntervalMillis: 1000
};
```

#### 2. Query Optimization
- **Indexes**: Strategic indexing on frequently queried fields
- **Aggregation**: MongoDB aggregation pipelines
- **Pagination**: Cursor-based pagination for large datasets

#### 3. Read Replicas
- **Read scaling**: Distribute read operations
- **Geographic distribution**: Reduce latency

### Request/Response Optimization

#### 1. Compression
- **Gzip compression**: Automatic response compression
- **Threshold**: Only compress responses > 1KB
- **Level**: Balanced compression level (6/9)

#### 2. Response Optimization
- **Field selection**: Allow clients to specify fields
- **Pagination**: Limit response size
- **Lazy loading**: Load data on demand

#### 3. Background Processing
- **Job queues**: Process heavy operations asynchronously
- **Batch processing**: Group related operations
- **Scheduled tasks**: Periodic maintenance tasks

## 🔍 Error Handling & Monitoring

### Error Handling Strategy

#### 1. Centralized Error Handling
```javascript
// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  
  res.status(error.statusCode || 500).json({
    error: error.message,
    requestId: req.requestId,
    timestamp: Date.now()
  });
});
```

#### 2. Error Types
- **ValidationError**: Input validation failures
- **AuthenticationError**: Auth failures
- **AuthorizationError**: Permission denied
- **DatabaseError**: Database operation failures
- **NetworkError**: External service failures

#### 3. Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [...],
  "requestId": "req_123456",
  "timestamp": 1234567890
}
```

### Logging Strategy

#### 1. Structured Logging
```javascript
// Winston configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

#### 2. Log Levels
- **ERROR**: Application errors, exceptions
- **WARN**: Warning conditions, slow requests
- **INFO**: General information, request logs
- **DEBUG**: Detailed debugging information

### Health Check System

#### 1. Health Endpoints
```javascript
// Basic health check
GET /health
{
  "status": "healthy",
  "timestamp": 1234567890,
  "uptime": 3600,
  "version": "1.0.0"
}

// Detailed health check
GET /health/detailed
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "api": "healthy"
  },
  "metrics": {
    "memory": "256MB",
    "cpu": "15%",
    "connections": 42
  }
}
```

#### 2. Health Checks
- **Database connectivity**: MongoDB connection test
- **Redis availability**: Cache system test
- **External services**: Third-party API tests
- **Memory usage**: System resource monitoring

### Metrics Collection

#### 1. Prometheus Integration
```javascript
// Custom metrics
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const gameStateUpdates = new promClient.Counter({
  name: 'game_state_updates_total',
  help: 'Total number of game state updates',
  labelNames: ['player_id', 'action']
});
```

#### 2. Key Metrics
- **Request metrics**: Response time, throughput, errors
- **Game metrics**: Players online, actions/minute
- **System metrics**: Memory, CPU, disk usage
- **Business metrics**: Revenue, user engagement

## 📊 API Documentation

### OpenAPI Specification

The API is fully documented using OpenAPI 3.0 specification with:

#### 1. Swagger UI
- **Endpoint**: `/docs`
- **Features**: Interactive API explorer
- **Authentication**: JWT token support

#### 2. Schema Definitions
```yaml
components:
  schemas:
    GameState:
      type: object
      properties:
        playerId:
          type: string
        woolCounts:
          type: object
        buildings:
          type: object
        timestamp:
          type: integer
    
    Player:
      type: object
      properties:
        id:
          type: string
        username:
          type: string
        email:
          type: string
        createdAt:
          type: string
```

#### 3. Authentication
```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### API Versioning

#### 1. URI Versioning
```
/api/v1/players/profile
/api/v2/players/profile
```

#### 2. Header Versioning
```
Accept: application/vnd.api+json;version=1
```

#### 3. Backward Compatibility
- **Deprecation warnings**: Inform clients of deprecated endpoints
- **Migration guides**: Documentation for version upgrades
- **Support timeline**: Clear end-of-life dates

## 🔐 Security Architecture

### Authentication & Authorization

#### 1. JWT Implementation
```javascript
// Token structure
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "player_id",
    "iat": 1234567890,
    "exp": 1234567890,
    "roles": ["player"]
  }
}
```

#### 2. Security Middleware
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate limiting**: Prevent abuse
- **Input validation**: Sanitize all inputs

#### 3. API Security
- **HTTPS only**: All communications encrypted
- **CSRF protection**: Cross-site request forgery prevention
- **XSS protection**: Content security policy

### Data Protection

#### 1. Input Validation
```javascript
// Joi schema validation
const gameStateSchema = Joi.object({
  woolCounts: Joi.object().required(),
  buildings: Joi.object().required(),
  timestamp: Joi.number().integer().min(0)
});
```

#### 2. Output Sanitization
- **Remove sensitive data**: Strip internal fields
- **Escape HTML**: Prevent XSS attacks
- **Validate JSON**: Ensure proper formatting

## 🚀 Deployment Architecture

### Docker Configuration

#### 1. Multi-stage Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
```

#### 2. Docker Compose
- **Development**: Local development environment
- **Production**: Production-ready stack
- **Testing**: Isolated test environment

### Load Balancing

#### 1. Nginx Configuration
```nginx
upstream api_servers {
    server api-gateway:3000;
    server api-gateway:3001;
    server api-gateway:3002;
}

server {
    listen 80;
    location /api/ {
        proxy_pass http://api_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 2. Load Balancing Strategies
- **Round Robin**: Default distribution
- **Least Connections**: Route to least busy server
- **IP Hash**: Consistent routing based on client IP

### Scaling Strategies

#### 1. Horizontal Scaling
- **Container orchestration**: Kubernetes/Docker Swarm
- **Auto-scaling**: Based on CPU/memory usage
- **Load distribution**: Across multiple instances

#### 2. Database Scaling
- **Read replicas**: Scale read operations
- **Sharding**: Distribute data across servers
- **Caching**: Reduce database load

## 📈 Performance Testing

### Load Testing Strategy

#### 1. Testing Tools
- **K6**: Modern load testing tool
- **Artillery**: Node.js-based testing
- **Newman**: Postman collection runner

#### 2. Test Scenarios
```javascript
// K6 load test example
import http from 'k6/http';

export default function() {
  const response = http.get('http://localhost:3000/api/game/state');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
}
```

#### 3. Performance Targets
- **Response time**: < 200ms for 95% of requests
- **Throughput**: 1000+ requests/second
- **Concurrent users**: 10,000+ simultaneous
- **Error rate**: < 0.1%

### Monitoring & Alerts

#### 1. Grafana Dashboards
- **API Performance**: Response times, throughput
- **System Resources**: CPU, memory, disk
- **Business Metrics**: Active users, revenue

#### 2. Alert Rules
- **High error rate**: > 1% for 5 minutes
- **Slow response**: > 1 second average
- **High memory usage**: > 80% for 10 minutes
- **Database connection**: Connection pool exhaustion

## 🔄 CI/CD Pipeline

### Continuous Integration

#### 1. GitHub Actions
```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

#### 2. Quality Gates
- **Code coverage**: > 80%
- **Linting**: ESLint passing
- **Security scan**: No high vulnerabilities
- **Performance**: Load test passing

### Continuous Deployment

#### 1. Deployment Stages
- **Development**: Automatic on push to dev branch
- **Staging**: Manual approval after tests
- **Production**: Blue-green deployment

#### 2. Rollback Strategy
- **Health checks**: Automatic rollback on failure
- **Database migrations**: Backward compatible
- **Feature flags**: Toggle features without deployment

## 📚 Best Practices

### Code Organization

#### 1. Project Structure
```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── middleware/      # Custom middleware
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   ├── config/          # Configuration
│   └── websocket/       # WebSocket handlers
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── load/           # Load tests
├── docs/               # Documentation
└── docker/             # Docker configurations
```

#### 2. Coding Standards
- **ESLint**: Consistent code formatting
- **Prettier**: Automated code formatting
- **JSDoc**: Comprehensive documentation
- **TypeScript**: Type safety (optional)

### Database Best Practices

#### 1. Schema Design
- **Normalization**: Avoid data duplication
- **Indexing**: Strategic index placement
- **Validation**: Schema-level validation
- **Relationships**: Proper foreign key constraints

#### 2. Query Optimization
- **Explain plans**: Analyze query performance
- **Batch operations**: Group related queries
- **Connection pooling**: Reuse connections
- **Caching**: Cache frequently accessed data

### Security Best Practices

#### 1. Authentication
- **Strong passwords**: Enforce password complexity
- **Token expiration**: Short-lived access tokens
- **Refresh tokens**: Secure token renewal
- **Rate limiting**: Prevent brute force attacks

#### 2. Data Protection
- **Encryption**: Encrypt sensitive data
- **Sanitization**: Clean all inputs
- **Audit logging**: Track security events
- **Regular updates**: Keep dependencies current

## 🔮 Future Enhancements

### Scalability Improvements

#### 1. Architecture Evolution
- **Microservices mesh**: Service mesh implementation
- **Event sourcing**: Event-driven architecture
- **CQRS**: Command Query Responsibility Segregation
- **GraphQL**: Flexible API queries

#### 2. Performance Enhancements
- **CDN integration**: Global content delivery
- **Edge computing**: Reduce latency
- **Database optimization**: Advanced indexing
- **WebAssembly**: CPU-intensive calculations

### Feature Additions

#### 1. Advanced Features
- **Real-time multiplayer**: Multi-player interactions
- **Social features**: Friend systems, guilds
- **Push notifications**: Mobile app notifications
- **Analytics dashboard**: Player behavior insights

#### 2. Platform Expansion
- **Mobile API**: Native mobile app support
- **Desktop app**: Electron-based client
- **Console integration**: Gaming console support
- **VR/AR support**: Immersive experiences

---

This comprehensive API architecture provides a solid foundation for the Llama Wool Farm backend, ensuring scalability, performance, and maintainability as the game grows and evolves.