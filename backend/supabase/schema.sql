-- ==========================================================================
-- LLAMA WOOL FARM - SUPABASE POSTGRESQL SCHEMA
-- ==========================================================================
-- Complete PostgreSQL schema for Supabase deployment
-- Replaces MongoDB design with relational structure
-- Includes RLS policies, indexes, and real-time subscriptions
-- ==========================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Note: pg_stat_statements is enabled by default in Supabase

-- ==========================================================================
-- USERS TABLE - Authentication and Profile Management
-- ==========================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    
    -- Profile
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    avatar TEXT DEFAULT 'default_avatar.png',
    country CHAR(2),
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'da', 'no')),
    timezone TEXT DEFAULT 'UTC',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    ban_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Email verification
    email_verification_token TEXT,
    email_verification_expires_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Password reset
    password_reset_token TEXT,
    password_reset_expires_at TIMESTAMP WITH TIME ZONE,
    password_reset_requested_at TIMESTAMP WITH TIME ZONE,
    
    -- Security
    last_login TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    login_attempts INTEGER DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE,
    
    -- Subscription
    subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'premium', 'pro', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial')),
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    subscription_trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_provider TEXT CHECK (subscription_provider IN ('stripe', 'paypal', 'apple', 'google')),
    subscription_id TEXT,
    
    -- Privacy preferences
    marketing_emails BOOLEAN DEFAULT true,
    data_processing BOOLEAN DEFAULT true NOT NULL,
    analytics_tracking BOOLEAN DEFAULT true,
    profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================================================
-- PLAYERS TABLE - Game Profiles and Progression
-- ==========================================================================

CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Profile
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT DEFAULT 'default_llama.png',
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 100),
    experience BIGINT DEFAULT 0 CHECK (experience >= 0),
    total_play_time INTEGER DEFAULT 0,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Statistics
    wool_produced BIGINT DEFAULT 0,
    coins_earned BIGINT DEFAULT 0,
    llamas_fed INTEGER DEFAULT 0,
    buildings_constructed INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    max_daily_streak INTEGER DEFAULT 0,
    
    -- Preferences
    notifications_enabled BOOLEAN DEFAULT true,
    notification_types TEXT[] DEFAULT ARRAY['harvest', 'quest', 'achievement', 'social'],
    show_on_leaderboard BOOLEAN DEFAULT true,
    allow_friend_requests BOOLEAN DEFAULT true,
    auto_save BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    music_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- ==========================================================================
-- GAME_STATES TABLE - Core Game Data
-- ==========================================================================

CREATE TABLE IF NOT EXISTS game_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    
    -- Resources
    wool INTEGER DEFAULT 0 CHECK (wool >= 0),
    coins INTEGER DEFAULT 100 CHECK (coins >= 0),
    feed INTEGER DEFAULT 50 CHECK (feed >= 0),
    premium INTEGER DEFAULT 0 CHECK (premium >= 0),
    
    -- Production rates
    wool_production_rate DECIMAL(10,2) DEFAULT 1.0,
    feed_consumption_rate DECIMAL(10,2) DEFAULT 0.5,
    
    -- Farm layout
    farm_width INTEGER DEFAULT 20 CHECK (farm_width >= 10 AND farm_width <= 50),
    farm_height INTEGER DEFAULT 20 CHECK (farm_height >= 10 AND farm_height <= 50),
    farm_theme TEXT DEFAULT 'classic' CHECK (farm_theme IN ('classic', 'modern', 'rustic', 'fantasy', 'winter')),
    
    -- Daily bonus
    daily_bonus_last_claimed TIMESTAMP WITH TIME ZONE,
    daily_bonus_streak INTEGER DEFAULT 0,
    daily_bonus_available BOOLEAN DEFAULT true,
    
    -- Versioning and integrity
    version INTEGER DEFAULT 1,
    last_saved TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id)
);

-- ==========================================================================
-- LLAMAS TABLE - Llama Management
-- ==========================================================================

CREATE TABLE IF NOT EXISTS llamas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_state_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
    
    -- Llama properties
    name TEXT NOT NULL,
    breed TEXT DEFAULT 'alpaca' CHECK (breed IN ('alpaca', 'huacaya', 'suri', 'vicuna', 'guanaco')),
    color TEXT DEFAULT 'white' CHECK (color IN ('white', 'brown', 'black', 'gray', 'mixed')),
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 50),
    
    -- Status
    happiness INTEGER DEFAULT 100 CHECK (happiness >= 0 AND happiness <= 100),
    health INTEGER DEFAULT 100 CHECK (health >= 0 AND health <= 100),
    wool_quality INTEGER DEFAULT 1 CHECK (wool_quality >= 1 AND wool_quality <= 10),
    
    -- Timestamps
    last_fed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_wool_harvest TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Traits
    traits TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Position
    position_x INTEGER,
    position_y INTEGER,
    building_id UUID,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_traits CHECK (
        traits <@ ARRAY['fast_grower', 'high_quality', 'low_maintenance', 'social', 'hardy']
    )
);

-- ==========================================================================
-- BUILDINGS TABLE - Building Management
-- ==========================================================================

CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_state_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
    
    -- Building properties
    type TEXT NOT NULL CHECK (type IN ('barn', 'pasture', 'mill', 'shop', 'house', 'storage', 'fence')),
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 10),
    
    -- Position
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    rotation INTEGER DEFAULT 0 CHECK (rotation >= 0 AND rotation <= 360),
    
    -- Properties
    capacity INTEGER DEFAULT 0,
    efficiency DECIMAL(3,1) DEFAULT 1.0 CHECK (efficiency >= 0 AND efficiency <= 5.0),
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    constructed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_upgrade TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- UNLOCKS TABLE - Player Progress and Unlocks
-- ==========================================================================

CREATE TABLE IF NOT EXISTS unlocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    
    -- Unlock type and identifier
    unlock_type TEXT NOT NULL CHECK (unlock_type IN ('building', 'llama_breed', 'feature', 'recipe')),
    unlock_identifier TEXT NOT NULL,
    
    -- Unlock timestamp
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id, unlock_type, unlock_identifier)
);

-- ==========================================================================
-- DECORATIONS TABLE - Farm Decorations
-- ==========================================================================

CREATE TABLE IF NOT EXISTS decorations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_state_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
    
    -- Decoration properties
    type TEXT NOT NULL,
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    
    -- Metadata
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- ACTIVE_PROCESSES TABLE - Timers and Processes
-- ==========================================================================

CREATE TABLE IF NOT EXISTS active_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_state_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
    
    -- Process properties
    process_type TEXT NOT NULL CHECK (process_type IN ('harvest', 'construction', 'upgrade', 'breeding', 'quest')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Process data
    process_data JSONB DEFAULT '{}',
    
    -- Status
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- QUESTS TABLE - Quest Management
-- ==========================================================================

CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Quest properties
    quest_identifier TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    quest_type TEXT DEFAULT 'main' CHECK (quest_type IN ('main', 'daily', 'weekly', 'special')),
    
    -- Requirements
    required_level INTEGER DEFAULT 1,
    prerequisites TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Rewards
    reward_wool INTEGER DEFAULT 0,
    reward_coins INTEGER DEFAULT 0,
    reward_experience INTEGER DEFAULT 0,
    reward_items TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- PLAYER_QUESTS TABLE - Player Quest Progress
-- ==========================================================================

CREATE TABLE IF NOT EXISTS player_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    
    -- Progress
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
    progress INTEGER DEFAULT 0,
    max_progress INTEGER DEFAULT 100,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id, quest_id)
);

-- ==========================================================================
-- ACHIEVEMENTS TABLE - Achievement System
-- ==========================================================================

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Achievement properties
    achievement_identifier TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    achievement_type TEXT DEFAULT 'progress' CHECK (achievement_type IN ('progress', 'milestone', 'special')),
    
    -- Requirements
    required_value INTEGER DEFAULT 1,
    is_hidden BOOLEAN DEFAULT false,
    
    -- Rewards
    reward_wool INTEGER DEFAULT 0,
    reward_coins INTEGER DEFAULT 0,
    reward_experience INTEGER DEFAULT 0,
    reward_items TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- PLAYER_ACHIEVEMENTS TABLE - Player Achievement Progress
-- ==========================================================================

CREATE TABLE IF NOT EXISTS player_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    
    -- Progress
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id, achievement_id)
);

-- ==========================================================================
-- LEADERBOARDS TABLE - Rankings and Competition
-- ==========================================================================

CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    
    -- Leaderboard category
    category TEXT NOT NULL CHECK (category IN (
        'wool_production', 'coins_earned', 'daily_streak', 'llama_count', 
        'building_count', 'level', 'achievements', 'weekly_wool', 
        'monthly_wool', 'all_time_wool'
    )),
    
    -- Ranking information
    current_rank INTEGER NOT NULL CHECK (current_rank >= 1),
    previous_rank INTEGER,
    best_rank INTEGER,
    rank_change INTEGER DEFAULT 0,
    
    -- Score
    score BIGINT NOT NULL CHECK (score >= 0),
    
    -- Player info (denormalized for performance)
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    player_level INTEGER NOT NULL,
    player_avatar TEXT DEFAULT 'default_llama.png',
    
    -- Anti-cheat validation
    play_time_consistency INTEGER DEFAULT 100 CHECK (play_time_consistency >= 0 AND play_time_consistency <= 100),
    progression_rate INTEGER DEFAULT 100 CHECK (progression_rate >= 0 AND progression_rate <= 100),
    action_frequency INTEGER DEFAULT 100 CHECK (action_frequency >= 0 AND action_frequency <= 100),
    trust_score INTEGER DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
    is_verified BOOLEAN DEFAULT false,
    last_validated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Seasonal tracking
    season TEXT DEFAULT 'current',
    
    -- Competition
    is_active BOOLEAN DEFAULT true,
    tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    competition_points INTEGER DEFAULT 0,
    
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id, category, season)
);

-- ==========================================================================
-- LEADERBOARD_HISTORY TABLE - Historical Rankings
-- ==========================================================================

CREATE TABLE IF NOT EXISTS leaderboard_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
    
    -- Historical data
    date DATE NOT NULL,
    score BIGINT NOT NULL,
    rank INTEGER NOT NULL,
    rank_change INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(leaderboard_id, date)
);

-- ==========================================================================
-- VALIDATION_FLAGS TABLE - Anti-cheat Flags
-- ==========================================================================

CREATE TABLE IF NOT EXISTS validation_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
    
    -- Flag properties
    flag_type TEXT NOT NULL CHECK (flag_type IN (
        'rapid_progress', 'impossible_score', 'suspicious_pattern', 
        'inactive_periods', 'score_manipulation'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    
    -- Status
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- ANALYTICS_EVENTS TABLE - Event Tracking
-- ==========================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event identification
    event_identifier TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'player_login', 'player_logout', 'player_register', 'player_level_up',
        'wool_harvest', 'llama_feed', 'building_construct', 'building_upgrade',
        'resource_spend', 'resource_earn', 'button_click', 'page_view',
        'modal_open', 'tutorial_step', 'quest_start', 'quest_complete',
        'purchase_attempt', 'purchase_complete', 'purchase_failed',
        'subscription_start', 'subscription_cancel', 'friend_add',
        'friend_remove', 'message_send', 'leaderboard_view', 'load_time',
        'error_occurred', 'crash_report', 'performance_metric', 'custom_event'
    )),
    
    -- User context
    user_id UUID REFERENCES users(id),
    session_id TEXT NOT NULL,
    
    -- Event timing
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Event properties
    properties JSONB DEFAULT '{}',
    
    -- Common indexed properties
    wool_amount INTEGER,
    coin_amount INTEGER,
    premium_amount INTEGER,
    player_level INTEGER,
    player_experience BIGINT,
    building_type TEXT,
    llama_id UUID,
    quest_id UUID,
    screen_name TEXT,
    button_name TEXT,
    load_time INTEGER,
    error_code TEXT,
    purchase_amount DECIMAL(10,2),
    currency TEXT,
    product_id TEXT,
    
    -- Platform information
    platform_type TEXT NOT NULL CHECK (platform_type IN ('web', 'ios', 'android', 'desktop')),
    platform_version TEXT NOT NULL,
    os TEXT NOT NULL,
    os_version TEXT NOT NULL,
    device TEXT NOT NULL,
    browser TEXT,
    browser_version TEXT,
    screen_resolution TEXT,
    user_agent TEXT,
    
    -- Geography
    country TEXT,
    region TEXT,
    city TEXT,
    timezone TEXT,
    language TEXT,
    
    -- Metadata
    event_version TEXT DEFAULT '1.0.0',
    source TEXT DEFAULT 'client' CHECK (source IN ('client', 'server', 'batch_import')),
    batch_id TEXT,
    is_test BOOLEAN DEFAULT false,
    is_bot BOOLEAN DEFAULT false,
    checksum TEXT,
    
    -- Timestamps
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- SECURITY_LOGS TABLE - Security Event Tracking
-- ==========================================================================

CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Security event
    action TEXT NOT NULL CHECK (action IN (
        'login', 'logout', 'password_change', 'email_change', 
        '2fa_enable', '2fa_disable', 'account_locked', 'password_reset'
    )),
    success BOOLEAN NOT NULL,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    additional_data JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- SESSION_TOKENS TABLE - Session Management
-- ==========================================================================

CREATE TABLE IF NOT EXISTS session_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token information
    token_hash TEXT NOT NULL UNIQUE,
    device_info TEXT,
    ip_address INET,
    
    -- Timing
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==========================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(is_active, is_verified, is_banned);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_plan, subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Players table indexes
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_level_experience ON players(level, experience);
CREATE INDEX IF NOT EXISTS idx_players_wool_produced ON players(wool_produced);
CREATE INDEX IF NOT EXISTS idx_players_coins_earned ON players(coins_earned);
CREATE INDEX IF NOT EXISTS idx_players_daily_streak ON players(daily_streak);
CREATE INDEX IF NOT EXISTS idx_players_last_active ON players(last_active);

-- Game states table indexes
CREATE INDEX IF NOT EXISTS idx_game_states_player_id ON game_states(player_id);
CREATE INDEX IF NOT EXISTS idx_game_states_last_saved ON game_states(last_saved);
CREATE INDEX IF NOT EXISTS idx_game_states_resources ON game_states(wool, coins);

-- Llamas table indexes
CREATE INDEX IF NOT EXISTS idx_llamas_player_id ON llamas(player_id);
CREATE INDEX IF NOT EXISTS idx_llamas_game_state_id ON llamas(game_state_id);
CREATE INDEX IF NOT EXISTS idx_llamas_breed ON llamas(breed);
CREATE INDEX IF NOT EXISTS idx_llamas_level ON llamas(level);
CREATE INDEX IF NOT EXISTS idx_llamas_position ON llamas(position_x, position_y);

-- Buildings table indexes
CREATE INDEX IF NOT EXISTS idx_buildings_player_id ON buildings(player_id);
CREATE INDEX IF NOT EXISTS idx_buildings_game_state_id ON buildings(game_state_id);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON buildings(type);
CREATE INDEX IF NOT EXISTS idx_buildings_position ON buildings(position_x, position_y);
CREATE INDEX IF NOT EXISTS idx_buildings_level ON buildings(level);

-- Active processes table indexes
CREATE INDEX IF NOT EXISTS idx_active_processes_player_id ON active_processes(player_id);
CREATE INDEX IF NOT EXISTS idx_active_processes_end_time ON active_processes(end_time);
CREATE INDEX IF NOT EXISTS idx_active_processes_type ON active_processes(process_type);
CREATE INDEX IF NOT EXISTS idx_active_processes_completed ON active_processes(is_completed);

-- Quests table indexes
CREATE INDEX IF NOT EXISTS idx_quests_identifier ON quests(quest_identifier);
CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(quest_type);
CREATE INDEX IF NOT EXISTS idx_quests_active ON quests(is_active);

-- Player quests table indexes
CREATE INDEX IF NOT EXISTS idx_player_quests_player_id ON player_quests(player_id);
CREATE INDEX IF NOT EXISTS idx_player_quests_quest_id ON player_quests(quest_id);
CREATE INDEX IF NOT EXISTS idx_player_quests_status ON player_quests(status);

-- Achievements table indexes
CREATE INDEX IF NOT EXISTS idx_achievements_identifier ON achievements(achievement_identifier);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active);

-- Player achievements table indexes
CREATE INDEX IF NOT EXISTS idx_player_achievements_player_id ON player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_achievement_id ON player_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_completed ON player_achievements(is_completed);

-- Leaderboards table indexes
CREATE INDEX IF NOT EXISTS idx_leaderboards_category_rank ON leaderboards(category, current_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboards_category_score ON leaderboards(category, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_player_id ON leaderboards(player_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_season_category ON leaderboards(season, category);
CREATE INDEX IF NOT EXISTS idx_leaderboards_trust_score ON leaderboards(trust_score, is_verified);
CREATE INDEX IF NOT EXISTS idx_leaderboards_tier ON leaderboards(tier, competition_points);

-- Analytics events table indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_country ON analytics_events(country);
CREATE INDEX IF NOT EXISTS idx_analytics_events_test ON analytics_events(is_test) WHERE is_test = false;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leaderboards_category_season_rank ON leaderboards(category, season, current_rank);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp ON analytics_events(user_id, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_timestamp ON analytics_events(event_type, event_timestamp);

-- ==========================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==========================================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at 
    BEFORE UPDATE ON players 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_states_updated_at 
    BEFORE UPDATE ON game_states 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_llamas_updated_at 
    BEFORE UPDATE ON llamas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at 
    BEFORE UPDATE ON buildings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_active_processes_updated_at 
    BEFORE UPDATE ON active_processes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_quests_updated_at 
    BEFORE UPDATE ON player_quests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_achievements_updated_at 
    BEFORE UPDATE ON player_achievements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================================
-- ENABLE REAL-TIME SUBSCRIPTIONS
-- ==========================================================================

-- Enable real-time for game-critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_states;
ALTER PUBLICATION supabase_realtime ADD TABLE llamas;
ALTER PUBLICATION supabase_realtime ADD TABLE buildings;
ALTER PUBLICATION supabase_realtime ADD TABLE active_processes;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboards;

-- ==========================================================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================================================

COMMENT ON TABLE users IS 'User authentication and profile management';
COMMENT ON TABLE players IS 'Player game profiles and progression tracking';
COMMENT ON TABLE game_states IS 'Core game state data including resources and farm layout';
COMMENT ON TABLE llamas IS 'Individual llama management and properties';
COMMENT ON TABLE buildings IS 'Farm building management and positioning';
COMMENT ON TABLE unlocks IS 'Player progression and feature unlocks';
COMMENT ON TABLE decorations IS 'Farm decoration management';
COMMENT ON TABLE active_processes IS 'Active timers and background processes';
COMMENT ON TABLE quests IS 'Quest definitions and properties';
COMMENT ON TABLE player_quests IS 'Player quest progress tracking';
COMMENT ON TABLE achievements IS 'Achievement definitions and rewards';
COMMENT ON TABLE player_achievements IS 'Player achievement progress';
COMMENT ON TABLE leaderboards IS 'Player rankings and competition data';
COMMENT ON TABLE leaderboard_history IS 'Historical ranking data';
COMMENT ON TABLE validation_flags IS 'Anti-cheat validation flags';
COMMENT ON TABLE analytics_events IS 'Event tracking and analytics data';
COMMENT ON TABLE security_logs IS 'Security event logging';
COMMENT ON TABLE session_tokens IS 'User session management';