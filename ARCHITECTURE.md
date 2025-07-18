# 🏗️ Architecture Overview

## System Architecture

Llama Wool Farm is a full-stack Progressive Web App (PWA) with a modern, scalable architecture designed for high performance and offline capabilities.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (PWA)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │   Phaser.js │  │   React UI  │  │ Service     │           │
│  │   Game      │  │   Overlays  │  │ Worker      │           │
│  │   Engine    │  │             │  │ (Offline)   │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Redux Store + Local Storage                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   │ WebSocket/HTTP API
                                   │
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Services                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │   Express   │  │   WebSocket │  │    Redis    │           │
│  │   API       │  │   Server    │  │   Cache     │           │
│  │   Gateway   │  │             │  │             │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Supabase                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │ PostgreSQL  │  │ Auth        │  │ Realtime    │   │   │
│  │  │ Database    │  │ Service     │  │ Engine      │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack
- **Game Engine**: Phaser.js 3.80.1 (WebGL/Canvas rendering)
- **UI Framework**: React 18.2 (for overlays and menus)
- **Language**: TypeScript 5.3 (strict mode)
- **State Management**: Redux Toolkit + Custom Game State
- **Build Tool**: Webpack 5 with PWA optimization
- **PWA Framework**: Workbox 7.0 (caching, offline support)

### Component Architecture

```
Frontend/
├── Game Layer (Phaser.js)
│   ├── Scenes/
│   │   ├── BootScene      # Asset loading and initialization
│   │   ├── PreloaderScene # Game asset preloading
│   │   ├── MainGameScene  # Primary game loop
│   │   └── UIScene        # HUD and game UI
│   ├── Objects/
│   │   ├── LlamaSprite    # Animated llama entities
│   │   ├── WoolParticle   # Wool production effects
│   │   └── BuildingSprite # Production buildings
│   └── Systems/
│       ├── InputManager   # Touch/mouse/keyboard handling
│       ├── AudioManager   # Sound effects and music
│       └── EffectManager  # Particle effects and animations
│
├── UI Layer (React)
│   ├── Overlays/
│   │   ├── GameHUD        # Stats, currency, progress
│   │   ├── ShopModal      # Upgrade purchases
│   │   ├── SettingsModal  # Game settings
│   │   └── PrestigeModal  # Prestige system UI
│   ├── Components/
│   │   ├── Button         # Styled game buttons
│   │   ├── Modal          # Reusable modal component
│   │   ├── Counter        # Animated number displays
│   │   └── ProgressBar    # Progress indicators
│   └── Hooks/
│       ├── useGameState   # Game state management
│       ├── useOffline     # Offline progress tracking
│       └── useNotification # Push notification handling
│
└── Core Layer (Business Logic)
    ├── Managers/
    │   ├── ProductionManager # Wool production calculations
    │   ├── EventManager      # Game events and triggers
    │   └── SaveManager       # Save/load game state
    ├── Services/
    │   ├── ApiService        # Backend communication
    │   ├── OfflineService    # Offline progress calculation
    │   └── AnalyticsService  # Game analytics tracking
    └── Utils/
        ├── GameMath          # Game balance calculations
        ├── StorageUtils      # Local storage abstraction
        └── DateUtils         # Time-based calculations
```

### Data Flow

```
User Input → Phaser Input Manager → Game State Update → Redux Store → UI Re-render
                                        ↓
                                 Local Storage Save
                                        ↓
                              Background Sync (Service Worker)
                                        ↓
                                 Backend API Call
                                        ↓
                                 Supabase Database
```

## Backend Architecture

### Technology Stack
- **Runtime**: Node.js 18 LTS
- **Framework**: Express.js 4.18
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis 7
- **WebSocket**: Socket.io 4.7
- **Authentication**: JWT + Supabase Auth
- **Deployment**: Docker containers on cloud platforms

### Service Architecture

```
Backend/
├── API Gateway (Express.js)
│   ├── Routes/
│   │   ├── /auth      # Authentication endpoints
│   │   ├── /game      # Game state management
│   │   ├── /players   # Player data and stats
│   │   ├── /leaderboard # Global rankings
│   │   └── /health    # Health check endpoints
│   ├── Middleware/
│   │   ├── auth.middleware      # JWT validation
│   │   ├── ratelimit.middleware # Rate limiting
│   │   ├── security.middleware  # Security headers
│   │   └── performance.middleware # Performance monitoring
│   └── Services/
│       ├── GameStateService  # Game logic processing
│       ├── PlayerService     # Player management
│       └── LeaderboardService # Rankings calculation
│
├── Real-time Engine (Socket.io)
│   ├── Handlers/
│   │   ├── GameSync     # Real-time game state sync
│   │   ├── PlayerEvents # Player action broadcasting
│   │   └── Leaderboard  # Live ranking updates
│   └── Middleware/
│       ├── SocketAuth   # WebSocket authentication
│       └── RateLimit    # WebSocket rate limiting
│
├── Data Layer (Supabase)
│   ├── Tables/
│   │   ├── users        # User accounts and profiles
│   │   ├── game_states  # Player game data
│   │   ├── leaderboards # Global rankings
│   │   └── analytics    # Game analytics events
│   ├── Functions/
│   │   ├── calculate_offline_progress # Offline calculation
│   │   ├── update_leaderboard        # Ranking updates
│   │   └── process_prestige          # Prestige calculations
│   └── Policies/
│       ├── Row Level Security # Data access control
│       └── Real-time Policies # WebSocket security
│
└── Cache Layer (Redis)
    ├── Session Storage    # User sessions
    ├── Game State Cache   # Hot game data
    ├── Leaderboard Cache  # Cached rankings
    └── Rate Limit Storage # Rate limiting counters
```

### Database Schema

```sql
-- Users table (managed by Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    username VARCHAR UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Game states table
CREATE TABLE game_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wool_count DECIMAL(20,2) DEFAULT 0,
    soul_shears DECIMAL(20,2) DEFAULT 0,
    prestige_level INTEGER DEFAULT 0,
    buildings JSONB DEFAULT '{}',
    upgrades JSONB DEFAULT '{}',
    last_offline_calculation TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Leaderboards table
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR NOT NULL,
    wool_count DECIMAL(20,2) DEFAULT 0,
    prestige_level INTEGER DEFAULT 0,
    rank INTEGER,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics events table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Security Architecture

### Authentication Flow

```
1. User Registration/Login → Supabase Auth
2. JWT Token Generation → Secure HTTP-only cookies
3. Token Validation → Middleware on each request
4. Session Management → Redis cache
5. Refresh Token Rotation → Automatic token refresh
```

### Security Measures

- **Authentication**: JWT tokens with short expiration
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Row-level security (RLS) in Supabase
- **Rate Limiting**: Per-user and per-IP rate limits
- **Input Validation**: Joi schema validation on all inputs
- **HTTPS**: TLS 1.3 encryption for all communications
- **CORS**: Restricted cross-origin resource sharing
- **CSP**: Content Security Policy headers
- **Sanitization**: XSS prevention on all user inputs

## Performance Architecture

### Caching Strategy

```
Level 1: Browser Cache (Service Worker)
├── Game assets (images, audio, scripts)
├── API responses (GET requests)
└── Offline game state

Level 2: CDN Cache (Cloudflare/AWS CloudFront)
├── Static assets
├── API responses (public data)
└── Compressed bundles

Level 3: Application Cache (Redis)
├── Session data
├── Frequently accessed game states
├── Leaderboard data
└── Calculated offline progress

Level 4: Database Cache (Supabase)
├── Query result caching
├── Connection pooling
└── Prepared statements
```

### Performance Optimizations

- **Code Splitting**: Webpack chunks for reduced initial load
- **Lazy Loading**: Dynamic imports for non-critical features
- **Asset Optimization**: Compressed images, minified code
- **Bundle Analysis**: Webpack bundle analyzer for optimization
- **Database Indexing**: Optimized queries with proper indexes
- **Memory Management**: Object pooling in game engine
- **Offline Calculations**: Pre-calculated progress for instant loading

## Deployment Architecture

### Development Environment

```
Local Development:
├── Frontend: Webpack Dev Server (localhost:8080)
├── Backend: Nodemon (localhost:3000)
├── Database: Local Supabase instance
├── Cache: Local Redis instance
└── WebSocket: Socket.io development server
```

### Production Environment

```
Production (Cloud):
├── Frontend: Static hosting (Netlify/Vercel)
├── Backend: Containerized API (AWS ECS/Google Cloud Run)
├── Database: Supabase managed PostgreSQL
├── Cache: Redis Cloud/AWS ElastiCache
├── CDN: Cloudflare/AWS CloudFront
└── Monitoring: DataDog/New Relic
```

### Container Architecture

```dockerfile
# Multi-stage build for optimized production image
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
```

## Monitoring and Observability

### Metrics Collection

- **Application Metrics**: Response times, error rates, throughput
- **Business Metrics**: User engagement, game progression, revenue
- **Infrastructure Metrics**: CPU, memory, disk, network usage
- **Database Metrics**: Query performance, connection pool status
- **Cache Metrics**: Hit rates, eviction rates, memory usage

### Logging Strategy

```
Log Levels:
├── ERROR: System errors, exceptions, critical failures
├── WARN: Performance issues, deprecated features
├── INFO: User actions, system events, state changes
├── DEBUG: Detailed execution flow (development only)
└── TRACE: Fine-grained debugging (development only)

Log Destinations:
├── Console: Development environment
├── File: Rotating log files
├── Database: Critical errors and business events
└── External: DataDog, Splunk, or ELK stack
```

### Health Checks

```javascript
// Health check endpoints
GET /health          # Basic service health
GET /health/detailed # Detailed system status
GET /health/db       # Database connectivity
GET /health/cache    # Redis cache status
GET /health/external # External service dependencies
```

## Scalability Considerations

### Horizontal Scaling

- **Load Balancing**: Multiple backend instances behind load balancer
- **Database Sharding**: Partition game data by user regions
- **CDN Distribution**: Global content delivery network
- **Auto-scaling**: Container orchestration based on metrics

### Vertical Scaling

- **Resource Optimization**: CPU and memory profiling
- **Database Optimization**: Query optimization and indexing
- **Cache Optimization**: Intelligent cache warming and eviction
- **Asset Optimization**: Compression and minification

### Future Architecture Considerations

- **Microservices**: Break down monolithic backend into services
- **Event-Driven Architecture**: Implement message queues for async processing
- **Multi-Region Deployment**: Global presence for reduced latency
- **Serverless Functions**: Edge computing for real-time calculations