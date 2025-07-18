-- ==========================================================================
-- LLAMA WOOL FARM - SUPABASE OPTIMIZED SCHEMA
-- ==========================================================================
-- Simplified PostgreSQL schema optimized for Supabase
-- Uses Supabase Auth instead of custom user management
-- ==========================================================================

-- Enable necessary extensions (only what's needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================================
-- PLAYERS TABLE - Game Profiles (Uses Supabase Auth)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to Supabase Auth user
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Player Profile
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT DEFAULT 'default_llama.png',
    
    -- Game Progress
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 1000),
    experience BIGINT DEFAULT 0 CHECK (experience >= 0),
    total_clicks BIGINT DEFAULT 0 CHECK (total_clicks >= 0),
    
    -- Statistics
    games_played INTEGER DEFAULT 0,
    total_playtime INTEGER DEFAULT 0, -- in seconds
    achievements_unlocked INTEGER DEFAULT 0,
    
    -- Settings
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- GAME STATES TABLE - Current Game Data
-- ==========================================================================

CREATE TABLE IF NOT EXISTS game_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    
    -- Resources
    wool_count BIGINT DEFAULT 0 CHECK (wool_count >= 0),
    wool_per_second NUMERIC(15,2) DEFAULT 0 CHECK (wool_per_second >= 0),
    click_power NUMERIC(15,2) DEFAULT 1 CHECK (click_power >= 1),
    
    -- Farm Data
    farm_level INTEGER DEFAULT 1 CHECK (farm_level >= 1 AND farm_level <= 100),
    farm_size INTEGER DEFAULT 10 CHECK (farm_size >= 10 AND farm_size <= 1000),
    
    -- Game Progress
    prestige_level INTEGER DEFAULT 0 CHECK (prestige_level >= 0),
    prestige_points BIGINT DEFAULT 0 CHECK (prestige_points >= 0),
    
    -- Session Data
    is_online BOOLEAN DEFAULT false,
    last_save_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    offline_progress_claimed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id)
);

-- ==========================================================================
-- LLAMAS TABLE - Individual Llama Management
-- ==========================================================================

CREATE TABLE IF NOT EXISTS llamas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    
    -- Llama Info
    name TEXT NOT NULL,
    color TEXT DEFAULT 'white' CHECK (color IN ('white', 'brown', 'black', 'gray', 'spotted')),
    breed TEXT DEFAULT 'standard' CHECK (breed IN ('standard', 'premium', 'rare', 'legendary')),
    
    -- Stats
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 100),
    experience INTEGER DEFAULT 0 CHECK (experience >= 0),
    happiness INTEGER DEFAULT 100 CHECK (happiness >= 0 AND happiness <= 100),
    health INTEGER DEFAULT 100 CHECK (health >= 0 AND health <= 100),
    
    -- Production
    wool_production NUMERIC(10,2) DEFAULT 1.0 CHECK (wool_production >= 0),
    last_fed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_harvest_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- BUILDINGS TABLE - Farm Buildings and Upgrades
-- ==========================================================================

CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    
    -- Building Info
    building_type TEXT NOT NULL CHECK (building_type IN ('barn', 'pasture', 'shearing_station', 'feed_storage', 'wool_factory')),
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 50),
    
    -- Production Stats
    production_bonus NUMERIC(10,2) DEFAULT 0 CHECK (production_bonus >= 0),
    capacity_bonus INTEGER DEFAULT 0 CHECK (capacity_bonus >= 0),
    efficiency_bonus NUMERIC(5,2) DEFAULT 0 CHECK (efficiency_bonus >= 0),
    
    -- Building Status
    is_active BOOLEAN DEFAULT true,
    last_upgraded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id, building_type)
);

-- ==========================================================================
-- ACHIEVEMENTS TABLE - Player Achievements
-- ==========================================================================

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Achievement Info
    achievement_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'production', 'llamas', 'buildings', 'social', 'special')),
    
    -- Requirements
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('clicks', 'wool', 'llamas', 'buildings', 'level', 'time')),
    requirement_value BIGINT NOT NULL,
    
    -- Rewards
    reward_type TEXT CHECK (reward_type IN ('experience', 'wool', 'click_power', 'prestige_points')),
    reward_value BIGINT DEFAULT 0,
    
    -- Metadata
    icon TEXT DEFAULT 'trophy.png',
    is_hidden BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- PLAYER ACHIEVEMENTS TABLE - Achievement Progress
-- ==========================================================================

CREATE TABLE IF NOT EXISTS player_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    
    -- Progress
    progress BIGINT DEFAULT 0 CHECK (progress >= 0),
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id, achievement_id)
);

-- ==========================================================================
-- LEADERBOARDS TABLE - Global Rankings
-- ==========================================================================

CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    
    -- Leaderboard Categories
    wool_total BIGINT DEFAULT 0,
    wool_per_second NUMERIC(15,2) DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    achievements_count INTEGER DEFAULT 0,
    prestige_level INTEGER DEFAULT 0,
    llamas_count INTEGER DEFAULT 0,
    
    -- Ranking
    overall_rank INTEGER,
    wool_rank INTEGER,
    clicks_rank INTEGER,
    
    -- Timestamps
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id)
);

-- ==========================================================================
-- ANALYTICS TABLE - Game Events and Metrics
-- ==========================================================================

CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    
    -- Event Data
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    
    -- Session Info
    session_id TEXT,
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- INDEXES FOR PERFORMANCE
-- ==========================================================================

-- Players
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_level ON players(level DESC);

-- Game States
CREATE INDEX IF NOT EXISTS idx_game_states_player_id ON game_states(player_id);
CREATE INDEX IF NOT EXISTS idx_game_states_wool_count ON game_states(wool_count DESC);
CREATE INDEX IF NOT EXISTS idx_game_states_updated_at ON game_states(updated_at);

-- Llamas
CREATE INDEX IF NOT EXISTS idx_llamas_player_id ON llamas(player_id);
CREATE INDEX IF NOT EXISTS idx_llamas_breed ON llamas(breed);
CREATE INDEX IF NOT EXISTS idx_llamas_level ON llamas(level DESC);

-- Buildings
CREATE INDEX IF NOT EXISTS idx_buildings_player_id ON buildings(player_id);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON buildings(building_type);

-- Player Achievements
CREATE INDEX IF NOT EXISTS idx_player_achievements_player_id ON player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_completed ON player_achievements(is_completed);

-- Leaderboards
CREATE INDEX IF NOT EXISTS idx_leaderboards_wool_total ON leaderboards(wool_total DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_clicks ON leaderboards(total_clicks DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_prestige ON leaderboards(prestige_level DESC);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_player_id ON analytics(player_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at DESC);

-- ==========================================================================
-- ENABLE REAL-TIME SUBSCRIPTIONS
-- ==========================================================================

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_states;
ALTER PUBLICATION supabase_realtime ADD TABLE llamas;
ALTER PUBLICATION supabase_realtime ADD TABLE buildings;
ALTER PUBLICATION supabase_realtime ADD TABLE player_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboards;

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE llamas ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Players: Users can only access their own data
CREATE POLICY "Users can view their own player profile" ON players
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own player profile" ON players
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own player profile" ON players
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Game States: Users can only access their own game state
CREATE POLICY "Users can view their own game state" ON game_states
    FOR SELECT USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own game state" ON game_states
    FOR UPDATE USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own game state" ON game_states
    FOR INSERT WITH CHECK (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Llamas: Users can only access their own llamas
CREATE POLICY "Users can view their own llamas" ON llamas
    FOR SELECT USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own llamas" ON llamas
    FOR ALL USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Buildings: Users can only access their own buildings
CREATE POLICY "Users can view their own buildings" ON buildings
    FOR SELECT USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own buildings" ON buildings
    FOR ALL USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Player Achievements: Users can only access their own achievements
CREATE POLICY "Users can view their own achievements" ON player_achievements
    FOR SELECT USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own achievements" ON player_achievements
    FOR ALL USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Leaderboards: Public read access, users can only update their own
CREATE POLICY "Anyone can view leaderboards" ON leaderboards FOR SELECT USING (true);

CREATE POLICY "Users can update their own leaderboard entry" ON leaderboards
    FOR ALL USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Achievements: Public read access
CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT USING (true);

-- Analytics: Users can only insert their own events
CREATE POLICY "Users can insert their own analytics" ON analytics
    FOR INSERT WITH CHECK (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()) OR player_id IS NULL);

-- ==========================================================================
-- UPDATE TRIGGERS
-- ==========================================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_states_updated_at BEFORE UPDATE ON game_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_llamas_updated_at BEFORE UPDATE ON llamas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_achievements_updated_at BEFORE UPDATE ON player_achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================================
-- SAMPLE ACHIEVEMENTS DATA
-- ==========================================================================

INSERT INTO achievements (achievement_id, name, description, category, requirement_type, requirement_value, reward_type, reward_value) VALUES
('first_click', 'First Click', 'Click your first llama', 'general', 'clicks', 1, 'experience', 10),
('hundred_clicks', 'Century Clicker', 'Click 100 times', 'general', 'clicks', 100, 'click_power', 1),
('first_llama', 'Llama Owner', 'Own your first llama', 'llamas', 'llamas', 1, 'experience', 50),
('wool_collector', 'Wool Collector', 'Collect 1000 wool', 'production', 'wool', 1000, 'wool', 500),
('farm_builder', 'Farm Builder', 'Build your first building', 'buildings', 'buildings', 1, 'experience', 100)
ON CONFLICT (achievement_id) DO NOTHING;

-- ==========================================================================
-- SUCCESS MESSAGE
-- ==========================================================================

-- Show completion message
DO $$
BEGIN
    RAISE NOTICE 'Llama Wool Farm database schema created successfully!';
    RAISE NOTICE 'Tables created: players, game_states, llamas, buildings, achievements, player_achievements, leaderboards, analytics';
    RAISE NOTICE 'RLS policies enabled for data security';
    RAISE NOTICE 'Real-time subscriptions enabled';
    RAISE NOTICE 'Ready for game development!';
END $$;