# 🔄 MongoDB to Supabase Migration Guide

## 📋 Overview

This guide provides a comprehensive step-by-step migration from MongoDB to Supabase for the Llama Wool Farm backend. Supabase offers PostgreSQL-based database with real-time capabilities, built-in authentication, and automatic REST API generation.

## 🎯 Migration Goals

- **Zero Downtime**: Maintain game availability during migration
- **Data Integrity**: Ensure no data loss during transfer
- **Performance**: Improve query performance with PostgreSQL
- **Real-time**: Leverage Supabase's real-time subscriptions
- **Authentication**: Migrate to Supabase Auth for better security

## 🚀 Pre-Migration Preparation

### 1. Environment Setup

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Initialize Supabase project
supabase init

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Database Schema Analysis

Current MongoDB collections and their PostgreSQL equivalents:

```javascript
// MongoDB Collections → PostgreSQL Tables
users          → users
players        → players
gamestates     → game_states
leaderboards   → leaderboards
analyticevents → analytics_events
```

### 3. Data Export from MongoDB

```bash
# Export MongoDB data
mongodump --uri="mongodb://localhost:27017/llamawoolfarm" --out ./mongodb-backup

# Convert to JSON for easier migration
mongoexport --uri="mongodb://localhost:27017/llamawoolfarm" --collection=users --out=users.json
mongoexport --uri="mongodb://localhost:27017/llamawoolfarm" --collection=players --out=players.json
mongoexport --uri="mongodb://localhost:27017/llamawoolfarm" --collection=gamestates --out=gamestates.json
mongoexport --uri="mongodb://localhost:27017/llamawoolfarm" --collection=leaderboards --out=leaderboards.json
mongoexport --uri="mongodb://localhost:27017/llamawoolfarm" --collection=analyticevents --out=analyticevents.json
```

## 🗄️ Database Schema Migration

### 1. Users Table

```sql
-- Create users table (replacing MongoDB users collection)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    subscription_plan TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active, is_banned);
CREATE INDEX idx_users_subscription ON users(subscription_plan, subscription_status);
CREATE INDEX idx_users_last_login ON users(last_login);
```

### 2. Players Table

```sql
-- Create players table (replacing MongoDB players collection)
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT DEFAULT 'default_llama.png',
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 100),
    experience INTEGER DEFAULT 0 CHECK (experience >= 0),
    total_play_time INTEGER DEFAULT 0 CHECK (total_play_time >= 0),
    wool_produced INTEGER DEFAULT 0 CHECK (wool_produced >= 0),
    coins_earned INTEGER DEFAULT 0 CHECK (coins_earned >= 0),
    llamas_fed INTEGER DEFAULT 0 CHECK (llamas_fed >= 0),
    buildings_constructed INTEGER DEFAULT 0 CHECK (buildings_constructed >= 0),
    daily_streak INTEGER DEFAULT 0 CHECK (daily_streak >= 0),
    max_daily_streak INTEGER DEFAULT 0 CHECK (max_daily_streak >= 0),
    notifications_enabled BOOLEAN DEFAULT true,
    show_on_leaderboard BOOLEAN DEFAULT true,
    allow_friend_requests BOOLEAN DEFAULT true,
    auto_save BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    music_enabled BOOLEAN DEFAULT true,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE UNIQUE INDEX idx_players_user_id ON players(user_id);
CREATE UNIQUE INDEX idx_players_username ON players(username);
CREATE INDEX idx_players_level_exp ON players(level DESC, experience DESC);
CREATE INDEX idx_players_wool_produced ON players(wool_produced DESC);
CREATE INDEX idx_players_coins_earned ON players(coins_earned DESC);
CREATE INDEX idx_players_daily_streak ON players(daily_streak DESC);
CREATE INDEX idx_players_last_active ON players(last_active DESC);
```

### 3. Game States Table

```sql
-- Create game_states table (replacing MongoDB gamestates collection)
CREATE TABLE game_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    wool INTEGER DEFAULT 0 CHECK (wool >= 0),
    coins INTEGER DEFAULT 100 CHECK (coins >= 0),
    feed INTEGER DEFAULT 50 CHECK (feed >= 0),
    premium INTEGER DEFAULT 0 CHECK (premium >= 0),
    wool_production_rate DECIMAL(10,2) DEFAULT 1.0 CHECK (wool_production_rate >= 0),
    feed_consumption_rate DECIMAL(10,2) DEFAULT 0.5 CHECK (feed_consumption_rate >= 0),
    farm_width INTEGER DEFAULT 20 CHECK (farm_width >= 10 AND farm_width <= 50),
    farm_height INTEGER DEFAULT 20 CHECK (farm_height >= 10 AND farm_height <= 50),
    farm_theme TEXT DEFAULT 'classic',
    daily_bonus_last_claimed TIMESTAMPTZ,
    daily_bonus_streak INTEGER DEFAULT 0 CHECK (daily_bonus_streak >= 0),
    daily_bonus_available BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    checksum TEXT DEFAULT '',
    last_saved TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE UNIQUE INDEX idx_game_states_player_id ON game_states(player_id);
CREATE INDEX idx_game_states_last_saved ON game_states(last_saved DESC);
CREATE INDEX idx_game_states_version ON game_states(version);
CREATE INDEX idx_game_states_wool ON game_states(wool DESC);
CREATE INDEX idx_game_states_coins ON game_states(coins DESC);
```

### 4. Llamas Table

```sql
-- Create llamas table (replacing MongoDB embedded llamas array)
CREATE TABLE llamas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_state_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
    llama_id TEXT NOT NULL, -- Original MongoDB llamaId
    name TEXT NOT NULL CHECK (length(name) <= 20),
    breed TEXT DEFAULT 'alpaca' CHECK (breed IN ('alpaca', 'huacaya', 'suri', 'vicuna', 'guanaco')),
    color TEXT DEFAULT 'white' CHECK (color IN ('white', 'brown', 'black', 'gray', 'mixed')),
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 50),
    happiness INTEGER DEFAULT 100 CHECK (happiness >= 0 AND happiness <= 100),
    health INTEGER DEFAULT 100 CHECK (health >= 0 AND health <= 100),
    wool_quality INTEGER DEFAULT 1 CHECK (wool_quality >= 1 AND wool_quality <= 10),
    traits TEXT[], -- Array of traits
    position_x INTEGER,
    position_y INTEGER,
    position_building TEXT,
    last_fed TIMESTAMPTZ DEFAULT NOW(),
    last_wool_harvest TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_llamas_game_state_id ON llamas(game_state_id);
CREATE INDEX idx_llamas_llama_id ON llamas(llama_id);
CREATE INDEX idx_llamas_level ON llamas(level DESC);
CREATE INDEX idx_llamas_happiness ON llamas(happiness DESC);
```

### 5. Buildings Table

```sql
-- Create buildings table (replacing MongoDB embedded buildings array)
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_state_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
    building_id TEXT NOT NULL, -- Original MongoDB buildingId
    type TEXT NOT NULL CHECK (type IN ('barn', 'pasture', 'mill', 'shop', 'house', 'storage', 'fence')),
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 10),
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    rotation INTEGER DEFAULT 0 CHECK (rotation >= 0 AND rotation <= 360),
    capacity INTEGER DEFAULT 0 CHECK (capacity >= 0),
    efficiency DECIMAL(3,2) DEFAULT 1.0 CHECK (efficiency >= 0 AND efficiency <= 5),
    is_active BOOLEAN DEFAULT true,
    constructed_at TIMESTAMPTZ DEFAULT NOW(),
    last_upgrade TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_buildings_game_state_id ON buildings(game_state_id);
CREATE INDEX idx_buildings_building_id ON buildings(building_id);
CREATE INDEX idx_buildings_type ON buildings(type);
CREATE INDEX idx_buildings_level ON buildings(level DESC);
CREATE INDEX idx_buildings_position ON buildings(position_x, position_y);
```

### 6. Leaderboards Table

```sql
-- Create leaderboards table (replacing MongoDB leaderboards collection)
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    current_rank INTEGER NOT NULL,
    previous_rank INTEGER,
    score INTEGER NOT NULL,
    trust_score DECIMAL(5,2) DEFAULT 100.0,
    is_verified BOOLEAN DEFAULT false,
    season TEXT,
    player_username TEXT NOT NULL,
    player_display_name TEXT NOT NULL,
    player_level INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_leaderboards_category_rank ON leaderboards(category, current_rank);
CREATE INDEX idx_leaderboards_player_id ON leaderboards(player_id);
CREATE INDEX idx_leaderboards_trust_score ON leaderboards(trust_score DESC, is_verified);
CREATE INDEX idx_leaderboards_season ON leaderboards(season, category);
```

### 7. Analytics Events Table

```sql
-- Create analytics_events table (replacing MongoDB analyticevents collection)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_data JSONB,
    platform_type TEXT,
    platform_version TEXT,
    os TEXT,
    os_version TEXT,
    device TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type, timestamp DESC);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id, timestamp DESC);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_event_data ON analytics_events USING GIN(event_data);
```

## 📊 Data Migration Scripts

### 1. User Data Migration

```javascript
// migrate-users.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateUsers() {
  const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
  
  for (const user of users) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user._id,
        email: user.email,
        password_hash: user.password, // Already hashed in MongoDB
        first_name: user.profile?.firstName,
        last_name: user.profile?.lastName,
        date_of_birth: user.profile?.dateOfBirth,
        is_active: user.status?.isActive ?? true,
        is_verified: user.status?.isVerified ?? false,
        is_banned: user.status?.isBanned ?? false,
        subscription_plan: user.subscription?.plan ?? 'free',
        subscription_status: user.subscription?.status ?? 'active',
        last_login: user.security?.lastLogin,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      });
    
    if (error) {
      console.error('Error migrating user:', user.email, error);
    } else {
      console.log('Migrated user:', user.email);
    }
  }
}

migrateUsers().catch(console.error);
```

### 2. Player Data Migration

```javascript
// migrate-players.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migratePlayers() {
  const players = JSON.parse(fs.readFileSync('players.json', 'utf8'));
  
  for (const player of players) {
    const { data, error } = await supabase
      .from('players')
      .insert({
        id: player._id,
        user_id: player.userId,
        username: player.profile.username,
        display_name: player.profile.displayName,
        avatar: player.profile.avatar,
        level: player.profile.level,
        experience: player.profile.experience,
        total_play_time: player.profile.totalPlayTime,
        wool_produced: player.stats.woolProduced,
        coins_earned: player.stats.coinsEarned,
        llamas_fed: player.stats.llamasFed,
        buildings_constructed: player.stats.buildingsConstructed,
        daily_streak: player.stats.dailyStreak,
        max_daily_streak: player.stats.maxDailyStreak,
        notifications_enabled: player.preferences?.notifications?.enabled ?? true,
        show_on_leaderboard: player.preferences?.privacy?.showOnLeaderboard ?? true,
        allow_friend_requests: player.preferences?.privacy?.allowFriendRequests ?? true,
        auto_save: player.preferences?.gameSettings?.autoSave ?? true,
        sound_enabled: player.preferences?.gameSettings?.soundEnabled ?? true,
        music_enabled: player.preferences?.gameSettings?.musicEnabled ?? true,
        last_active: player.profile.lastActive,
        created_at: player.createdAt,
        updated_at: player.updatedAt
      });
    
    if (error) {
      console.error('Error migrating player:', player.profile.username, error);
    } else {
      console.log('Migrated player:', player.profile.username);
    }
  }
}

migratePlayers().catch(console.error);
```

### 3. Game State Migration

```javascript
// migrate-gamestates.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateGameStates() {
  const gameStates = JSON.parse(fs.readFileSync('gamestates.json', 'utf8'));
  
  for (const gameState of gameStates) {
    // Insert main game state
    const { data: gameStateData, error: gameStateError } = await supabase
      .from('game_states')
      .insert({
        id: gameState._id,
        player_id: gameState.playerId,
        wool: gameState.resources.wool,
        coins: gameState.resources.coins,
        feed: gameState.resources.feed,
        premium: gameState.resources.premium,
        wool_production_rate: gameState.resources.woolProductionRate,
        feed_consumption_rate: gameState.resources.feedConsumptionRate,
        farm_width: gameState.farmLayout?.width,
        farm_height: gameState.farmLayout?.height,
        farm_theme: gameState.farmLayout?.theme,
        daily_bonus_last_claimed: gameState.dailyBonus?.lastClaimed,
        daily_bonus_streak: gameState.dailyBonus?.streak,
        daily_bonus_available: gameState.dailyBonus?.available,
        version: gameState.version,
        checksum: gameState.checksum,
        last_saved: gameState.lastSaved,
        created_at: gameState.createdAt,
        updated_at: gameState.updatedAt
      });
    
    if (gameStateError) {
      console.error('Error migrating game state:', gameState._id, gameStateError);
      continue;
    }
    
    // Migrate llamas
    if (gameState.llamas && gameState.llamas.length > 0) {
      const llamaInserts = gameState.llamas.map(llama => ({
        game_state_id: gameState._id,
        llama_id: llama.llamaId,
        name: llama.name,
        breed: llama.breed,
        color: llama.color,
        level: llama.level,
        happiness: llama.happiness,
        health: llama.health,
        wool_quality: llama.woolQuality,
        traits: llama.traits || [],
        position_x: llama.position?.x,
        position_y: llama.position?.y,
        position_building: llama.position?.building,
        last_fed: llama.lastFed,
        last_wool_harvest: llama.lastWoolHarvest
      }));
      
      const { error: llamaError } = await supabase
        .from('llamas')
        .insert(llamaInserts);
      
      if (llamaError) {
        console.error('Error migrating llamas for game state:', gameState._id, llamaError);
      }
    }
    
    // Migrate buildings
    if (gameState.buildings && gameState.buildings.length > 0) {
      const buildingInserts = gameState.buildings.map(building => ({
        game_state_id: gameState._id,
        building_id: building.buildingId,
        type: building.type,
        level: building.level,
        position_x: building.position.x,
        position_y: building.position.y,
        rotation: building.position.rotation,
        capacity: building.capacity,
        efficiency: building.efficiency,
        is_active: building.isActive,
        constructed_at: building.constructedAt,
        last_upgrade: building.lastUpgrade
      }));
      
      const { error: buildingError } = await supabase
        .from('buildings')
        .insert(buildingInserts);
      
      if (buildingError) {
        console.error('Error migrating buildings for game state:', gameState._id, buildingError);
      }
    }
    
    console.log('Migrated game state:', gameState._id);
  }
}

migrateGameStates().catch(console.error);
```

## 🔧 API Layer Updates

### 1. Database Connection

```javascript
// config/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Service client for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = { supabase, supabaseAdmin };
```

### 2. Updated Service Layer

```javascript
// services/PlayerService.js
const { supabase } = require('../config/supabase');

class PlayerService {
  async getPlayerById(playerId) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async updatePlayerStats(playerId, stats) {
    const { data, error } = await supabase
      .from('players')
      .update({
        wool_produced: stats.woolProduced,
        coins_earned: stats.coinsEarned,
        llamas_fed: stats.llamasFed,
        buildings_constructed: stats.buildingsConstructed,
        updated_at: new Date()
      })
      .eq('id', playerId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async getLeaderboard(metric = 'wool_produced', limit = 10) {
    const { data, error } = await supabase
      .from('players')
      .select('username, display_name, level, avatar, ' + metric)
      .eq('show_on_leaderboard', true)
      .order(metric, { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }
}

module.exports = new PlayerService();
```

### 3. Real-time Subscriptions

```javascript
// services/RealtimeService.js
const { supabase } = require('../config/supabase');

class RealtimeService {
  constructor() {
    this.subscriptions = new Map();
  }
  
  subscribeToGameState(playerId, callback) {
    const subscription = supabase
      .channel(`game_state_${playerId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_states',
        filter: `player_id=eq.${playerId}`
      }, callback)
      .subscribe();
    
    this.subscriptions.set(`game_state_${playerId}`, subscription);
    return subscription;
  }
  
  subscribeToLeaderboard(category, callback) {
    const subscription = supabase
      .channel(`leaderboard_${category}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leaderboards',
        filter: `category=eq.${category}`
      }, callback)
      .subscribe();
    
    this.subscriptions.set(`leaderboard_${category}`, subscription);
    return subscription;
  }
  
  unsubscribe(key) {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(key);
    }
  }
}

module.exports = new RealtimeService();
```

## 🚀 Deployment Strategy

### 1. Blue-Green Deployment

```yaml
# docker-compose.migration.yml
version: '3.8'

services:
  # Keep MongoDB running (Blue)
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
  
  # New Supabase-based API (Green)
  api-supabase:
    build: .
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_TYPE=supabase
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    depends_on:
      - mongodb
  
  # Load balancer for gradual migration
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx-migration.conf:/etc/nginx/nginx.conf
    depends_on:
      - api-mongodb
      - api-supabase

volumes:
  mongodb_data:
```

### 2. Gradual Traffic Migration

```nginx
# nginx-migration.conf
upstream backend_mongodb {
    server api-mongodb:3000 weight=70;
}

upstream backend_supabase {
    server api-supabase:3000 weight=30;
}

server {
    listen 80;
    
    location /api/ {
        # Route 30% of traffic to Supabase
        proxy_pass http://backend_supabase;
        
        # Fallback to MongoDB on error
        proxy_next_upstream error timeout http_500 http_502 http_503 http_504;
        proxy_backup http://backend_mongodb;
    }
}
```

### 3. Migration Monitoring

```javascript
// scripts/migration-monitor.js
const { supabase } = require('../config/supabase');
const { MongoClient } = require('mongodb');

async function compareCounts() {
  // MongoDB counts
  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db('llamawoolfarm');
  
  const mongoUsers = await db.collection('users').countDocuments();
  const mongoPlayers = await db.collection('players').countDocuments();
  const mongoGameStates = await db.collection('gamestates').countDocuments();
  
  // Supabase counts
  const { count: supabaseUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  const { count: supabasePlayers } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });
  
  const { count: supabaseGameStates } = await supabase
    .from('game_states')
    .select('*', { count: 'exact', head: true });
  
  console.log('Migration Progress:');
  console.log(`Users: ${supabaseUsers}/${mongoUsers} (${Math.round(supabaseUsers/mongoUsers*100)}%)`);
  console.log(`Players: ${supabasePlayers}/${mongoPlayers} (${Math.round(supabasePlayers/mongoPlayers*100)}%)`);
  console.log(`Game States: ${supabaseGameStates}/${mongoGameStates} (${Math.round(supabaseGameStates/mongoGameStates*100)}%)`);
  
  await mongoClient.close();
}

// Run every 5 minutes during migration
setInterval(compareCounts, 5 * 60 * 1000);
```

## 🧪 Testing Strategy

### 1. Data Integrity Tests

```javascript
// tests/migration/data-integrity.test.js
const { supabase } = require('../../config/supabase');
const { MongoClient } = require('mongodb');

describe('Data Integrity Tests', () => {
  let mongoClient;
  
  beforeAll(async () => {
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
  });
  
  afterAll(async () => {
    await mongoClient.close();
  });
  
  test('User data integrity', async () => {
    const db = mongoClient.db('llamawoolfarm');
    
    // Get sample user from MongoDB
    const mongoUser = await db.collection('users').findOne();
    
    // Get corresponding user from Supabase
    const { data: supabaseUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', mongoUser._id)
      .single();
    
    expect(supabaseUser.email).toBe(mongoUser.email);
    expect(supabaseUser.first_name).toBe(mongoUser.profile.firstName);
    expect(supabaseUser.last_name).toBe(mongoUser.profile.lastName);
  });
  
  test('Game state data integrity', async () => {
    const db = mongoClient.db('llamawoolfarm');
    
    // Get sample game state from MongoDB
    const mongoGameState = await db.collection('gamestates').findOne();
    
    // Get corresponding game state from Supabase
    const { data: supabaseGameState } = await supabase
      .from('game_states')
      .select('*')
      .eq('id', mongoGameState._id)
      .single();
    
    expect(supabaseGameState.wool).toBe(mongoGameState.resources.wool);
    expect(supabaseGameState.coins).toBe(mongoGameState.resources.coins);
    expect(supabaseGameState.feed).toBe(mongoGameState.resources.feed);
    
    // Check llamas
    const { data: llamas } = await supabase
      .from('llamas')
      .select('*')
      .eq('game_state_id', mongoGameState._id);
    
    expect(llamas.length).toBe(mongoGameState.llamas.length);
  });
});
```

### 2. Performance Tests

```javascript
// tests/migration/performance.test.js
const { supabase } = require('../../config/supabase');

describe('Performance Tests', () => {
  test('Leaderboard query performance', async () => {
    const startTime = Date.now();
    
    const { data } = await supabase
      .from('players')
      .select('username, display_name, wool_produced')
      .eq('show_on_leaderboard', true)
      .order('wool_produced', { ascending: false })
      .limit(100);
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    expect(queryTime).toBeLessThan(200); // Should be under 200ms
    expect(data.length).toBeLessThanOrEqual(100);
  });
  
  test('Real-time subscription performance', async () => {
    const startTime = Date.now();
    
    const subscription = supabase
      .channel('test-channel')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_states'
      }, (payload) => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        expect(latency).toBeLessThan(100); // Should be under 100ms
      })
      .subscribe();
    
    // Trigger an update
    await supabase
      .from('game_states')
      .update({ wool: 999 })
      .eq('id', 'test-id');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    subscription.unsubscribe();
  });
});
```

## 🔄 Rollback Strategy

### 1. Automated Rollback

```javascript
// scripts/rollback.js
const { supabase } = require('../config/supabase');

async function rollbackToMongoDB() {
  console.log('Starting rollback to MongoDB...');
  
  // 1. Stop traffic to Supabase
  await updateLoadBalancer('mongodb');
  
  // 2. Verify MongoDB is healthy
  const mongoHealth = await checkMongoDBHealth();
  if (!mongoHealth) {
    throw new Error('MongoDB is not healthy, cannot rollback');
  }
  
  // 3. Sync any new data from Supabase to MongoDB
  await syncDataToMongoDB();
  
  // 4. Update application configuration
  process.env.DATABASE_TYPE = 'mongodb';
  
  console.log('Rollback completed successfully');
}

async function updateLoadBalancer(target) {
  // Update nginx configuration to route 100% traffic to target
  const nginxConfig = target === 'mongodb' 
    ? generateMongoDBConfig()
    : generateSupabaseConfig();
  
  // Write new config and reload nginx
  await writeNginxConfig(nginxConfig);
  await reloadNginx();
}

module.exports = { rollbackToMongoDB };
```

## 📊 Migration Timeline

### Week 1: Preparation
- [ ] Set up Supabase project
- [ ] Create PostgreSQL schemas
- [ ] Export MongoDB data
- [ ] Set up migration scripts
- [ ] Create testing environment

### Week 2: Data Migration
- [ ] Migrate user data
- [ ] Migrate player data
- [ ] Migrate game states
- [ ] Migrate leaderboards
- [ ] Migrate analytics events

### Week 3: API Updates
- [ ] Update service layer
- [ ] Implement real-time subscriptions
- [ ] Update authentication
- [ ] Update WebSocket handlers
- [ ] Performance testing

### Week 4: Deployment
- [ ] Blue-green deployment setup
- [ ] Gradual traffic migration (10% → 50% → 100%)
- [ ] Monitor performance and errors
- [ ] Complete migration
- [ ] Cleanup MongoDB resources

## 🚨 Troubleshooting

### Common Issues

1. **UUID vs ObjectId Conflicts**
   ```javascript
   // Convert MongoDB ObjectId to UUID
   function objectIdToUUID(objectId) {
     return require('uuid').v5(objectId.toString(), require('uuid').v5.DNS);
   }
   ```

2. **Embedded Document Relationships**
   ```sql
   -- Use foreign keys instead of embedded documents
   -- MongoDB: { llamas: [...] }
   -- PostgreSQL: separate llamas table with game_state_id
   ```

3. **Array Fields**
   ```sql
   -- Use PostgreSQL arrays for simple lists
   traits TEXT[]
   
   -- Use separate tables for complex objects
   -- MongoDB: { achievements: [...] }
   -- PostgreSQL: achievements table with player_id
   ```

4. **Real-time Performance**
   ```javascript
   // Optimize real-time subscriptions
   const subscription = supabase
     .channel('game-updates')
     .on('postgres_changes', {
       event: 'UPDATE',
       schema: 'public',
       table: 'game_states',
       filter: `player_id=eq.${playerId}`
     }, handleUpdate)
     .subscribe();
   ```

## ✅ Migration Checklist

### Pre-Migration
- [ ] Supabase project created and configured
- [ ] Database schemas created
- [ ] Migration scripts tested
- [ ] Backup strategy implemented
- [ ] Rollback plan documented

### During Migration
- [ ] MongoDB export completed
- [ ] Data integrity verified
- [ ] Performance benchmarks met
- [ ] Real-time features working
- [ ] Authentication migrated

### Post-Migration
- [ ] All services using Supabase
- [ ] MongoDB connections removed
- [ ] Performance monitoring active
- [ ] User acceptance testing passed
- [ ] Documentation updated

## 🎯 Success Metrics

- **Data Integrity**: 100% data migration accuracy
- **Performance**: <200ms API response times
- **Real-time**: <100ms subscription latency
- **Uptime**: 99.9% availability during migration
- **User Impact**: Zero data loss, minimal downtime

---

This migration guide provides a comprehensive roadmap for transitioning from MongoDB to Supabase while maintaining data integrity, performance, and user experience. Follow the steps carefully and monitor progress at each stage.