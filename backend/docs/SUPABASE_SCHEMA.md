# Supabase Schema Documentation

## Overview

This document describes the complete PostgreSQL schema for the Llama Wool Farm game, designed for deployment on Supabase. The schema replaces the original MongoDB design with a fully relational structure that leverages PostgreSQL's advanced features.

## Architecture Decisions

### From MongoDB to PostgreSQL

The migration from MongoDB to PostgreSQL was designed to:

1. **Leverage ACID Transactions**: Ensure data consistency for financial operations
2. **Implement Real-time Features**: Use Supabase's real-time subscriptions
3. **Enhance Security**: Implement Row Level Security (RLS) for data protection
4. **Improve Performance**: Use proper indexing and query optimization
5. **Enable Advanced Analytics**: Leverage PostgreSQL's analytical capabilities

### Key Design Principles

- **Security First**: All tables use RLS policies
- **Performance Optimized**: Comprehensive indexing strategy
- **Real-time Ready**: Tables configured for live updates
- **Scalable Architecture**: Designed for horizontal scaling
- **Data Integrity**: Extensive validation and constraints

## Schema Structure

### Core Tables

#### 1. Users Table
**Purpose**: Authentication and user profile management

```sql
users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    -- Additional profile fields
    subscription_plan TEXT DEFAULT 'free',
    is_verified BOOLEAN DEFAULT false,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Key Features**:
- JWT-compatible authentication
- Subscription management
- Email verification system
- Password reset functionality
- Two-factor authentication support
- Social login integration

#### 2. Players Table
**Purpose**: Game profiles and progression tracking

```sql
players (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    experience BIGINT DEFAULT 0,
    -- Game statistics
    wool_produced BIGINT DEFAULT 0,
    coins_earned BIGINT DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    -- Preferences
    notifications_enabled BOOLEAN DEFAULT true,
    show_on_leaderboard BOOLEAN DEFAULT true
)
```

**Key Features**:
- Unique username system
- Level progression with experience points
- Comprehensive statistics tracking
- Privacy preferences
- Notification settings

#### 3. Game States Table
**Purpose**: Core game data and resources

```sql
game_states (
    id UUID PRIMARY KEY,
    player_id UUID UNIQUE REFERENCES players(id),
    -- Resources
    wool INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 100,
    feed INTEGER DEFAULT 50,
    premium INTEGER DEFAULT 0,
    -- Production rates
    wool_production_rate DECIMAL(10,2) DEFAULT 1.0,
    -- Farm layout
    farm_width INTEGER DEFAULT 20,
    farm_height INTEGER DEFAULT 20,
    farm_theme TEXT DEFAULT 'classic',
    -- Versioning
    version INTEGER DEFAULT 1,
    checksum TEXT
)
```

**Key Features**:
- Resource management (wool, coins, feed, premium)
- Production rate calculations
- Farm layout configuration
- Version control for conflict resolution
- Data integrity checksums

#### 4. Llamas Table
**Purpose**: Individual llama management

```sql
llamas (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    game_state_id UUID REFERENCES game_states(id),
    name TEXT NOT NULL,
    breed TEXT DEFAULT 'alpaca',
    color TEXT DEFAULT 'white',
    level INTEGER DEFAULT 1,
    -- Status attributes
    happiness INTEGER DEFAULT 100,
    health INTEGER DEFAULT 100,
    wool_quality INTEGER DEFAULT 1,
    -- Timestamps
    last_fed TIMESTAMP WITH TIME ZONE,
    last_wool_harvest TIMESTAMP WITH TIME ZONE,
    -- Traits and position
    traits TEXT[],
    position_x INTEGER,
    position_y INTEGER
)
```

**Key Features**:
- Multiple llama breeds (alpaca, huacaya, suri, vicuna, guanaco)
- Color variations
- Health and happiness tracking
- Trait system for unique characteristics
- Position tracking for farm layout
- Feeding and harvesting timestamps

#### 5. Buildings Table
**Purpose**: Farm building management

```sql
buildings (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    game_state_id UUID REFERENCES game_states(id),
    type TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    -- Position
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    rotation INTEGER DEFAULT 0,
    -- Properties
    capacity INTEGER DEFAULT 0,
    efficiency DECIMAL(3,1) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true
)
```

**Key Features**:
- Multiple building types (barn, pasture, mill, shop, house, storage, fence)
- Upgradeable levels (1-10)
- Position and rotation tracking
- Capacity and efficiency attributes
- Active/inactive state management

### Game Systems Tables

#### 6. Quests Table
**Purpose**: Quest definitions and management

```sql
quests (
    id UUID PRIMARY KEY,
    quest_identifier TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    quest_type TEXT DEFAULT 'main',
    required_level INTEGER DEFAULT 1,
    -- Rewards
    reward_wool INTEGER DEFAULT 0,
    reward_coins INTEGER DEFAULT 0,
    reward_experience INTEGER DEFAULT 0,
    reward_items TEXT[]
)
```

**Quest Types**:
- **Main**: Story progression quests
- **Daily**: Daily challenges
- **Weekly**: Weekly goals
- **Special**: Limited-time events

#### 7. Player Quests Table
**Purpose**: Player quest progress tracking

```sql
player_quests (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    quest_id UUID REFERENCES quests(id),
    status TEXT DEFAULT 'active',
    progress INTEGER DEFAULT 0,
    max_progress INTEGER DEFAULT 100,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
)
```

#### 8. Achievements Table
**Purpose**: Achievement system

```sql
achievements (
    id UUID PRIMARY KEY,
    achievement_identifier TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    achievement_type TEXT DEFAULT 'progress',
    required_value INTEGER DEFAULT 1,
    is_hidden BOOLEAN DEFAULT false,
    -- Rewards
    reward_wool INTEGER DEFAULT 0,
    reward_coins INTEGER DEFAULT 0,
    reward_experience INTEGER DEFAULT 0
)
```

**Achievement Types**:
- **Progress**: Incremental achievements (e.g., produce 1000 wool)
- **Milestone**: One-time achievements (e.g., reach level 10)
- **Special**: Unique or secret achievements

#### 9. Leaderboards Table
**Purpose**: Rankings and competition

```sql
leaderboards (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    category TEXT NOT NULL,
    current_rank INTEGER NOT NULL,
    previous_rank INTEGER,
    best_rank INTEGER,
    score BIGINT NOT NULL,
    -- Anti-cheat validation
    trust_score INTEGER DEFAULT 100,
    is_verified BOOLEAN DEFAULT false,
    -- Competition
    tier TEXT DEFAULT 'bronze',
    season TEXT DEFAULT 'current'
)
```

**Leaderboard Categories**:
- wool_production
- coins_earned
- daily_streak
- llama_count
- building_count
- level
- achievements

### Analytics and Monitoring

#### 10. Analytics Events Table
**Purpose**: Event tracking and analytics

```sql
analytics_events (
    id UUID PRIMARY KEY,
    event_identifier TEXT NOT NULL,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    session_id TEXT NOT NULL,
    event_timestamp TIMESTAMP WITH TIME ZONE,
    properties JSONB DEFAULT '{}',
    -- Platform information
    platform_type TEXT NOT NULL,
    platform_version TEXT,
    os TEXT,
    device TEXT,
    -- Geography
    country TEXT,
    region TEXT,
    city TEXT
)
```

**Event Types**:
- Player actions (login, logout, level_up)
- Game actions (wool_harvest, llama_feed, building_construct)
- UI interactions (button_click, page_view, modal_open)
- Monetization (purchase_attempt, purchase_complete)
- Performance (load_time, error_occurred)

## Functions and Procedures

### Player Management Functions

#### add_player_experience(player_id, experience)
Adds experience points and handles level progression.

```sql
SELECT * FROM add_player_experience(
    '123e4567-e89b-12d3-a456-426614174000',
    250
);
```

#### update_player_stats(player_id, wool_produced, coins_earned, llamas_fed, buildings_constructed)
Updates player statistics for achievements and leaderboards.

### Resource Management Functions

#### add_resources(player_id, wool, coins, feed, premium)
Safely adds resources to a player's game state.

```sql
SELECT * FROM add_resources(
    '123e4567-e89b-12d3-a456-426614174000',
    100,  -- wool
    50,   -- coins
    25,   -- feed
    0     -- premium
);
```

#### can_afford_cost(player_id, wool_cost, coins_cost, feed_cost, premium_cost)
Checks if a player can afford a purchase.

#### spend_resources(player_id, wool_cost, coins_cost, feed_cost, premium_cost)
Deducts resources from a player's game state.

### Llama Management Functions

#### add_llama(player_id, name, breed, color, position_x, position_y)
Adds a new llama to a player's farm.

```sql
SELECT add_llama(
    '123e4567-e89b-12d3-a456-426614174000',
    'Fluffy',
    'alpaca',
    'white',
    10,
    10
);
```

#### feed_llama(llama_id, feed_amount)
Feeds a llama, improving happiness and health.

#### harvest_wool(llama_id)
Harvests wool from a llama based on its level, happiness, and quality.

### Building Management Functions

#### add_building(player_id, building_type, position_x, position_y, wool_cost, coins_cost)
Constructs a new building on the player's farm.

#### upgrade_building(building_id, wool_cost, coins_cost)
Upgrades a building to the next level.

### Quest and Achievement Functions

#### start_quest(player_id, quest_identifier)
Starts a new quest for a player.

#### complete_quest(player_id, quest_identifier)
Completes a quest and awards rewards.

#### check_achievements(player_id)
Checks all achievements and unlocks any that are completed.

### Daily Bonus Functions

#### claim_daily_bonus(player_id)
Claims the daily bonus and manages streak tracking.

### Utility Functions

#### calculate_experience_for_level(target_level)
Calculates the experience required for a given level.

#### calculate_level_from_experience(experience)
Determines the level from total experience points.

#### initialize_player_game_state(player_id)
Sets up initial game state for new players.

## Row Level Security (RLS) Policies

### Security Model

All tables implement RLS policies following these principles:

1. **Users can only access their own data**
2. **Public data is available to all authenticated users**
3. **Administrators have elevated access for moderation**
4. **Real-time subscriptions are properly secured**

### Key Policies

#### User Data Protection
```sql
-- Users can only read their own profile
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT USING (id = get_current_user_id());
```

#### Player Data Isolation
```sql
-- Players can only access their own game data
CREATE POLICY "Players can read own data" ON players
    FOR SELECT USING (user_id = get_current_user_id());
```

#### Public Leaderboards
```sql
-- All users can read leaderboards
CREATE POLICY "All users can read leaderboards" ON leaderboards
    FOR SELECT USING (is_active = true);
```

#### Administrative Access
```sql
-- Admins can access all data for moderation
CREATE POLICY "Admins can read all users" ON users
    FOR SELECT USING (is_admin());
```

### Rate Limiting

Analytics events are rate-limited to prevent abuse:

```sql
CREATE POLICY "Rate limit analytics events" ON analytics_events
    FOR INSERT WITH CHECK (
        (SELECT COUNT(*) FROM analytics_events 
         WHERE user_id = get_current_user_id() 
         AND created_at > NOW() - INTERVAL '1 hour') < 1000
    );
```

## Real-time Subscriptions

### Enabled Tables

Real-time subscriptions are enabled for:
- `game_states` - Resource and farm state updates
- `llamas` - Llama status changes
- `buildings` - Building updates
- `active_processes` - Process completion notifications
- `players` - Player level and achievement updates
- `leaderboards` - Ranking updates

### Example Usage

```javascript
// Subscribe to game state changes
const gameStateSubscription = supabase
  .channel('game-state-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'game_states',
    filter: `player_id=eq.${playerId}`
  }, (payload) => {
    console.log('Game state updated:', payload);
  })
  .subscribe();

// Subscribe to llama updates
const llamaSubscription = supabase
  .channel('llama-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'llamas',
    filter: `player_id=eq.${playerId}`
  }, (payload) => {
    console.log('Llama updated:', payload);
  })
  .subscribe();
```

## Indexing Strategy

### Performance Optimization

The schema includes comprehensive indexing for:

1. **Primary Operations**: Game state access, resource management
2. **Leaderboard Queries**: Category-based rankings
3. **Analytics Queries**: Time-series analysis
4. **Authentication**: User lookup and session management

### Key Indexes

```sql
-- Game state access
CREATE INDEX idx_game_states_player_id ON game_states(player_id);
CREATE INDEX idx_game_states_resources ON game_states(wool, coins);

-- Leaderboard performance
CREATE INDEX idx_leaderboards_category_rank ON leaderboards(category, current_rank);
CREATE INDEX idx_leaderboards_category_score ON leaderboards(category, score DESC);

-- Analytics time-series
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(event_timestamp);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
```

## Game Balance Configuration

### Level Progression

Experience required for level N: `(N-1)² × 1000`

- Level 1: 0 XP
- Level 2: 1,000 XP
- Level 3: 4,000 XP
- Level 4: 9,000 XP
- Level 5: 16,000 XP
- Level 10: 81,000 XP
- Level 25: 576,000 XP
- Level 50: 2,401,000 XP
- Level 100: 9,801,000 XP

### Resource Production

- **Base Wool Production**: 1 wool per minute per llama
- **Feed Consumption**: 0.5 feed per minute per llama
- **Happiness Multiplier**: 100% happiness = 100% production
- **Level Bonus**: Each level increases production by 5%

### Building Costs and Benefits

| Building | Level 1 Cost | Benefit |
|----------|-------------|---------|
| Barn | 100 coins | Houses 2 llamas |
| Pasture | 150 coins | +10% happiness |
| Mill | 300 coins | +20% wool production |
| Shop | 250 coins | Unlocks trading |
| Storage | 200 coins | +100 resource capacity |

### Daily Bonus Rewards

7-day cycle:
1. Day 1: 10 coins
2. Day 2: 5 wool
3. Day 3: 15 coins
4. Day 4: 10 wool
5. Day 5: 25 coins
6. Day 6: 20 wool
7. Day 7: 50 coins + 25 wool + 100 XP

## Deployment Instructions

### 1. Database Setup

```sql
-- Run in order:
\i backend/supabase/schema.sql
\i backend/supabase/functions.sql
\i backend/supabase/policies.sql
\i backend/supabase/seed.sql
```

### 2. Environment Variables

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Real-time Configuration

Enable real-time in Supabase dashboard for:
- game_states
- llamas
- buildings
- active_processes
- players
- leaderboards

### 4. Authentication Setup

Configure Supabase Auth with:
- Email/password authentication
- Social providers (Google, Apple, Discord)
- Email verification
- Password reset

## API Integration

### Client Libraries

Use the official Supabase client libraries:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
```

### Example Operations

```javascript
// Add resources
const { data, error } = await supabase
  .rpc('add_resources', {
    p_player_id: playerId,
    p_wool: 50,
    p_coins: 25
  });

// Feed llama
const { data, error } = await supabase
  .rpc('feed_llama', {
    p_llama_id: llamaId,
    p_feed_amount: 10
  });

// Get leaderboard
const { data, error } = await supabase
  .from('leaderboards')
  .select('*')
  .eq('category', 'wool_production')
  .order('current_rank', { ascending: true })
  .limit(10);
```

## Migration from MongoDB

### Data Migration Scripts

The schema includes sample data that corresponds to the MongoDB structure. Key mappings:

- MongoDB `_id` → PostgreSQL `id` (UUID)
- MongoDB subdocuments → PostgreSQL related tables
- MongoDB arrays → PostgreSQL arrays or related tables
- MongoDB flexible schema → PostgreSQL JSONB where needed

### Breaking Changes

1. **IDs**: MongoDB ObjectIds become UUIDs
2. **Relationships**: Foreign key constraints enforce data integrity
3. **Queries**: SQL instead of MongoDB query language
4. **Transactions**: ACID compliance for all operations

## Maintenance and Monitoring

### Regular Maintenance

```sql
-- Clean up expired processes
SELECT cleanup_expired_processes();

-- Reset daily bonuses
SELECT reset_daily_bonuses();

-- Update all leaderboards
SELECT * FROM update_all_leaderboards();
```

### Performance Monitoring

```sql
-- Check query performance
SELECT * FROM pg_stat_statements;

-- Monitor table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Security Auditing

```sql
-- Review RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check security logs
SELECT * FROM security_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Troubleshooting

### Common Issues

1. **RLS Policy Violations**: Check that user is authenticated and has proper permissions
2. **Real-time Connection Issues**: Verify table is added to `supabase_realtime` publication
3. **Performance Issues**: Check query execution plans and index usage
4. **Data Integrity**: Validate foreign key constraints and triggers

### Debug Queries

```sql
-- Check user permissions
SELECT * FROM users WHERE id = auth.uid();

-- Verify player data
SELECT * FROM players WHERE user_id = auth.uid();

-- Test function execution
SELECT * FROM add_player_experience(
    (SELECT id FROM players WHERE user_id = auth.uid()),
    100
);
```

## Conclusion

This Supabase schema provides a robust, scalable foundation for the Llama Wool Farm game. It leverages PostgreSQL's strengths while maintaining the flexibility needed for a modern gaming application. The comprehensive RLS policies ensure data security, while real-time subscriptions enable responsive gameplay experiences.

The schema is designed to handle thousands of concurrent players while maintaining data integrity and performance. Regular maintenance and monitoring will ensure optimal performance as the game scales.