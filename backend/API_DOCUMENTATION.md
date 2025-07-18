# 🔌 Supabase API Documentation

## 📋 Overview

The Llama Wool Farm API now leverages Supabase's PostgreSQL database with built-in REST API, real-time subscriptions, and authentication. This documentation covers all endpoints, real-time features, and integration patterns.

## 🔧 Configuration

### Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Application Configuration
NODE_ENV=production
PORT=3000
JWT_SECRET=your-jwt-secret
```

### Supabase Client Setup

```javascript
// config/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = { supabase, supabaseAdmin };
```

## 🔐 Authentication

### Supabase Auth Integration

```javascript
// middleware/auth.js
const { supabase } = require('../config/supabase');

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = { authenticateUser };
```

### Auth Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "player@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "player@example.com",
    "user_metadata": {
      "firstName": "John",
      "lastName": "Doe"
    }
  },
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "player@example.com",
  "password": "SecurePass123!"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

## 👤 User Management

### Users Table API

#### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "player@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_active": true,
  "subscription_plan": "free",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Smith",
  "date_of_birth": "1990-01-01"
}
```

## 🎮 Player Management

### Players Table API

#### Get Player Profile
```http
GET /api/players/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "username": "player123",
  "display_name": "John Doe",
  "level": 15,
  "experience": 12500,
  "wool_produced": 5000,
  "coins_earned": 2500,
  "daily_streak": 7,
  "last_active": "2024-01-01T12:00:00Z"
}
```

#### Update Player Profile
```http
PUT /api/players/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "display_name": "John Smith",
  "avatar": "new_avatar.png",
  "notifications_enabled": true,
  "sound_enabled": false
}
```

#### Get Player Statistics
```http
GET /api/players/statistics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "wool_produced": 5000,
  "coins_earned": 2500,
  "llamas_fed": 150,
  "buildings_constructed": 25,
  "daily_streak": 7,
  "max_daily_streak": 15,
  "total_play_time": 3600,
  "level": 15,
  "experience": 12500
}
```

## 🏠 Game State Management

### Game States Table API

#### Get Game State
```http
GET /api/game/state
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "player_id": "uuid",
  "resources": {
    "wool": 1000,
    "coins": 500,
    "feed": 200,
    "premium": 0
  },
  "production": {
    "wool_production_rate": 5.5,
    "feed_consumption_rate": 2.0
  },
  "farm": {
    "width": 25,
    "height": 25,
    "theme": "classic"
  },
  "daily_bonus": {
    "last_claimed": "2024-01-01T00:00:00Z",
    "streak": 5,
    "available": true
  },
  "version": 1,
  "last_saved": "2024-01-01T12:00:00Z"
}
```

#### Update Game State
```http
PUT /api/game/state
Authorization: Bearer <token>
Content-Type: application/json

{
  "resources": {
    "wool": 1100,
    "coins": 450,
    "feed": 180
  },
  "production": {
    "wool_production_rate": 6.0
  }
}
```

#### Save Game Progress
```http
POST /api/game/save
Authorization: Bearer <token>
Content-Type: application/json

{
  "resources": {
    "wool": 1200,
    "coins": 400,
    "feed": 160
  },
  "checksum": "sha256-hash"
}
```

## 🦙 Llama Management

### Llamas Table API

#### Get Player's Llamas
```http
GET /api/llamas
Authorization: Bearer <token>
```

**Response:**
```json
{
  "llamas": [
    {
      "id": "uuid",
      "llama_id": "unique-llama-id",
      "name": "Fluffy",
      "breed": "alpaca",
      "color": "white",
      "level": 5,
      "happiness": 85,
      "health": 90,
      "wool_quality": 3,
      "traits": ["fast_grower", "high_quality"],
      "position": {
        "x": 10,
        "y": 15,
        "building": "barn-001"
      },
      "last_fed": "2024-01-01T10:00:00Z",
      "last_wool_harvest": "2024-01-01T08:00:00Z"
    }
  ]
}
```

#### Add New Llama
```http
POST /api/llamas
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Snowy",
  "breed": "huacaya",
  "color": "white",
  "position": {
    "x": 12,
    "y": 18
  }
}
```

#### Feed Llama
```http
POST /api/llamas/{llamaId}/feed
Authorization: Bearer <token>
Content-Type: application/json

{
  "feed_amount": 10
}
```

#### Harvest Wool
```http
POST /api/llamas/{llamaId}/harvest
Authorization: Bearer <token>
```

**Response:**
```json
{
  "wool_harvested": 15,
  "wool_quality": 3,
  "experience_gained": 25,
  "next_harvest": "2024-01-01T14:00:00Z"
}
```

## 🏗️ Building Management

### Buildings Table API

#### Get Player's Buildings
```http
GET /api/buildings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "buildings": [
    {
      "id": "uuid",
      "building_id": "unique-building-id",
      "type": "barn",
      "level": 3,
      "position": {
        "x": 5,
        "y": 5,
        "rotation": 0
      },
      "capacity": 20,
      "efficiency": 1.5,
      "is_active": true,
      "constructed_at": "2024-01-01T00:00:00Z",
      "last_upgrade": "2024-01-01T06:00:00Z"
    }
  ]
}
```

#### Construct Building
```http
POST /api/buildings
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "mill",
  "position": {
    "x": 8,
    "y": 12,
    "rotation": 90
  }
}
```

#### Upgrade Building
```http
PUT /api/buildings/{buildingId}/upgrade
Authorization: Bearer <token>
```

**Response:**
```json
{
  "building": {
    "id": "uuid",
    "level": 4,
    "capacity": 30,
    "efficiency": 1.8,
    "upgrade_cost": {
      "coins": 500,
      "wood": 50
    }
  }
}
```

## 🏆 Leaderboards

### Leaderboards Table API

#### Get Global Leaderboard
```http
GET /api/leaderboards?category=wool_produced&limit=100
Authorization: Bearer <token>
```

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "player": {
        "username": "woolmaster",
        "display_name": "Wool Master",
        "level": 25,
        "avatar": "avatar.png"
      },
      "score": 50000,
      "category": "wool_produced",
      "is_verified": true
    }
  ],
  "player_rank": {
    "rank": 156,
    "score": 5000
  }
}
```

#### Get Player Rank
```http
GET /api/leaderboards/player/{playerId}?category=wool_produced
Authorization: Bearer <token>
```

## 📊 Analytics

### Analytics Events Table API

#### Track Event
```http
POST /api/analytics/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "event_type": "wool_harvest",
  "event_data": {
    "llama_id": "uuid",
    "wool_amount": 15,
    "quality": 3
  },
  "session_id": "session-uuid"
}
```

#### Get Player Analytics
```http
GET /api/analytics/player?days=30
Authorization: Bearer <token>
```

**Response:**
```json
{
  "summary": {
    "total_events": 1250,
    "play_sessions": 45,
    "average_session_duration": 1800,
    "wool_harvested": 2500,
    "buildings_constructed": 15
  },
  "daily_stats": [
    {
      "date": "2024-01-01",
      "events": 35,
      "play_time": 3600,
      "wool_harvested": 150
    }
  ]
}
```

## 🔄 Real-time Features

### Real-time Subscriptions

#### Game State Updates
```javascript
// Client-side subscription
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Subscribe to game state changes
const gameStateSubscription = supabase
  .channel(`game_state_${playerId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'game_states',
    filter: `player_id=eq.${playerId}`
  }, (payload) => {
    console.log('Game state updated:', payload.new);
    updateGameUI(payload.new);
  })
  .subscribe();

// Subscribe to llama updates
const llamaSubscription = supabase
  .channel(`llamas_${playerId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'llamas',
    filter: `game_state_id=eq.${gameStateId}`
  }, (payload) => {
    console.log('Llama updated:', payload);
    updateLlamaUI(payload);
  })
  .subscribe();
```

#### Leaderboard Updates
```javascript
// Subscribe to leaderboard changes
const leaderboardSubscription = supabase
  .channel('leaderboard_wool_produced')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'leaderboards',
    filter: 'category=eq.wool_produced'
  }, (payload) => {
    console.log('Leaderboard updated:', payload);
    updateLeaderboardUI(payload);
  })
  .subscribe();
```

#### Real-time Notifications
```javascript
// Subscribe to player notifications
const notificationSubscription = supabase
  .channel(`notifications_${playerId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `player_id=eq.${playerId}`
  }, (payload) => {
    showNotification(payload.new);
  })
  .subscribe();
```

## 🔍 Advanced Queries

### Complex Filtering

#### Get Top Players with Filters
```http
GET /api/players?select=username,level,wool_produced&wool_produced=gte.1000&level=gte.10&order=wool_produced.desc&limit=50
Authorization: Bearer <token>
```

#### Get Buildings by Type and Level
```http
GET /api/buildings?type=eq.barn&level=gte.5&select=*,game_states(player_id)
Authorization: Bearer <token>
```

### Aggregations

#### Get Player Statistics Summary
```http
GET /api/analytics/summary?select=player_id,count(*),sum(wool_produced),avg(level)&group_by=player_id
Authorization: Bearer <token>
```

### Full-text Search

#### Search Players by Username
```http
GET /api/players?username=ilike.*wool*&select=username,display_name,level
Authorization: Bearer <token>
```

## 🚀 Performance Optimization

### Query Optimization

#### Use Indexes
```sql
-- Ensure proper indexing for common queries
CREATE INDEX idx_players_wool_produced ON players(wool_produced DESC);
CREATE INDEX idx_game_states_player_id ON game_states(player_id);
CREATE INDEX idx_llamas_game_state_id ON llamas(game_state_id);
```

#### Limit and Pagination
```javascript
// Efficient pagination
const { data, error } = await supabase
  .from('players')
  .select('*')
  .order('wool_produced', { ascending: false })
  .range(0, 49); // First 50 records

// Next page
const { data: nextPage } = await supabase
  .from('players')
  .select('*')
  .order('wool_produced', { ascending: false })
  .range(50, 99); // Next 50 records
```

### Caching Strategy

#### Redis Integration
```javascript
// services/CacheService.js
const redis = require('redis');
const client = redis.createClient();

class CacheService {
  async getLeaderboard(category, limit = 10) {
    const cacheKey = `leaderboard:${category}:${limit}`;
    
    // Try cache first
    const cached = await client.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fetch from Supabase
    const { data } = await supabase
      .from('leaderboards')
      .select('*')
      .eq('category', category)
      .order('current_rank')
      .limit(limit);
    
    // Cache for 5 minutes
    await client.setex(cacheKey, 300, JSON.stringify(data));
    
    return data;
  }
}

module.exports = new CacheService();
```

## 🔒 Security

### Row Level Security (RLS)

#### Users Table RLS
```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

#### Game States RLS
```sql
-- Enable RLS on game_states table
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;

-- Policy: Players can only access their own game state
CREATE POLICY "Players can view own game state" ON game_states
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = game_states.player_id 
      AND players.user_id = auth.uid()
    )
  );
```

#### Llamas RLS
```sql
-- Enable RLS on llamas table
ALTER TABLE llamas ENABLE ROW LEVEL SECURITY;

-- Policy: Players can only access their own llamas
CREATE POLICY "Players can view own llamas" ON llamas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM game_states 
      JOIN players ON players.id = game_states.player_id
      WHERE game_states.id = llamas.game_state_id 
      AND players.user_id = auth.uid()
    )
  );
```

### API Rate Limiting

```javascript
// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  }
});

module.exports = { apiLimiter, authLimiter };
```

## 🧪 Testing

### API Testing with Supabase

```javascript
// tests/api/players.test.js
const { createClient } = require('@supabase/supabase-js');
const request = require('supertest');
const app = require('../../src/app');

describe('Players API', () => {
  let supabase;
  let authToken;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Create test user
    const { data: { user, session } } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpass123'
    });
    
    authToken = session.access_token;
  });
  
  afterAll(async () => {
    // Cleanup test data
    await supabase.auth.signOut();
  });
  
  test('GET /api/players/profile', async () => {
    const response = await request(app)
      .get('/api/players/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('username');
    expect(response.body).toHaveProperty('level');
  });
  
  test('PUT /api/players/profile', async () => {
    const response = await request(app)
      .put('/api/players/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        display_name: 'Test Player Updated',
        sound_enabled: false
      })
      .expect(200);
    
    expect(response.body.display_name).toBe('Test Player Updated');
    expect(response.body.sound_enabled).toBe(false);
  });
});
```

### Real-time Testing

```javascript
// tests/realtime/subscriptions.test.js
const { createClient } = require('@supabase/supabase-js');

describe('Real-time Subscriptions', () => {
  let supabase;
  let playerId;
  
  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Create test player
    const { data: player } = await supabase
      .from('players')
      .insert({ username: 'testplayer', display_name: 'Test Player' })
      .select()
      .single();
    
    playerId = player.id;
  });
  
  test('Game state real-time updates', async () => {
    return new Promise((resolve) => {
      const subscription = supabase
        .channel(`game_state_${playerId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_states',
          filter: `player_id=eq.${playerId}`
        }, (payload) => {
          expect(payload.new.wool).toBe(150);
          subscription.unsubscribe();
          resolve();
        })
        .subscribe();
      
      // Trigger update
      setTimeout(async () => {
        await supabase
          .from('game_states')
          .update({ wool: 150 })
          .eq('player_id', playerId);
      }, 100);
    });
  });
});
```

## 📚 API Reference

### Base URL
```
https://api.llamawoolfarm.com/v1
```

### Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { /* error details */ }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## 🔄 Migration from MongoDB API

### Breaking Changes
1. **Authentication**: Now uses Supabase Auth instead of JWT
2. **User IDs**: Changed from ObjectId to UUID
3. **Embedded Documents**: Converted to separate tables with foreign keys
4. **Array Fields**: Now use PostgreSQL arrays or separate tables
5. **Real-time**: Uses Supabase subscriptions instead of Socket.IO

### Migration Mapping
```javascript
// MongoDB → Supabase API mapping
const apiMigrationMap = {
  // Authentication
  'POST /auth/login': 'Uses Supabase Auth',
  'POST /auth/register': 'Uses Supabase Auth',
  
  // Players
  'GET /players/profile': 'GET /api/players/profile',
  'PUT /players/profile': 'PUT /api/players/profile',
  
  // Game State
  'GET /game/state': 'GET /api/game/state',
  'POST /game/state': 'PUT /api/game/state',
  
  // Llamas
  'GET /game/llamas': 'GET /api/llamas',
  'POST /game/llamas': 'POST /api/llamas',
  
  // Buildings
  'GET /game/buildings': 'GET /api/buildings',
  'POST /game/buildings': 'POST /api/buildings'
};
```

## 📊 Performance Metrics

### Target Performance
- **API Response Time**: <200ms for 95% of requests
- **Real-time Latency**: <50ms for subscriptions
- **Database Queries**: <100ms average
- **Concurrent Users**: 10,000+ simultaneous
- **Throughput**: 1,000+ requests/second

### Monitoring
```javascript
// Performance monitoring with Prometheus
const prometheus = require('prom-client');

const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const supabaseQueries = new prometheus.Histogram({
  name: 'supabase_query_duration_seconds',
  help: 'Duration of Supabase queries in seconds',
  labelNames: ['table', 'operation'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5]
});
```

---

This comprehensive API documentation provides all the information needed to integrate with the Supabase-powered Llama Wool Farm backend, including authentication, real-time features, and performance optimization strategies.