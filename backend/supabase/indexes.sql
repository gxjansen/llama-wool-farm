-- ================================================================
-- SUPABASE PERFORMANCE OPTIMIZATION INDEXES
-- Database indexes for high-performance game queries
-- ================================================================

-- Enable required extensions for advanced features
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
-- PLAYERS TABLE INDEXES
-- ================================================================

-- Primary performance indexes for player queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_user_id 
ON players(user_id) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_username 
ON players(username) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_level_exp 
ON players(level DESC, experience DESC) 
WHERE deleted_at IS NULL;

-- Leaderboard optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_wool_produced 
ON players(wool_produced DESC) 
WHERE deleted_at IS NULL AND show_on_leaderboard = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_coins_earned 
ON players(coins_earned DESC) 
WHERE deleted_at IS NULL AND show_on_leaderboard = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_daily_streak 
ON players(daily_streak DESC) 
WHERE deleted_at IS NULL AND show_on_leaderboard = true;

-- Activity tracking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_last_active 
ON players(last_active DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_created_at 
ON players(created_at DESC) 
WHERE deleted_at IS NULL;

-- Composite index for complex leaderboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_leaderboard_composite 
ON players(level DESC, wool_produced DESC, coins_earned DESC) 
WHERE deleted_at IS NULL AND show_on_leaderboard = true;

-- ================================================================
-- GAME_STATES TABLE INDEXES
-- ================================================================

-- Primary game state indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_player_id 
ON game_states(player_id) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_last_saved 
ON game_states(last_saved DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_version 
ON game_states(version DESC) 
WHERE deleted_at IS NULL;

-- Resource tracking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_wool 
ON game_states(wool DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_coins 
ON game_states(coins DESC) 
WHERE deleted_at IS NULL;

-- Real-time sync optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_player_version 
ON game_states(player_id, version DESC) 
WHERE deleted_at IS NULL;

-- JSONB indexes for complex queries on nested data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_llamas_gin 
ON game_states USING gin(llamas) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_buildings_gin 
ON game_states USING gin(buildings) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_active_processes_gin 
ON game_states USING gin(active_processes) 
WHERE deleted_at IS NULL;

-- Specific JSONB path indexes for frequently accessed data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_llama_count 
ON game_states((jsonb_array_length(llamas))) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_building_count 
ON game_states((jsonb_array_length(buildings))) 
WHERE deleted_at IS NULL;

-- ================================================================
-- LEADERBOARD TABLE INDEXES
-- ================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_category_score 
ON leaderboard(category, score DESC, updated_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_player_category 
ON leaderboard(player_id, category) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_updated_at 
ON leaderboard(updated_at DESC) 
WHERE deleted_at IS NULL;

-- ================================================================
-- ANALYTICS TABLE INDEXES
-- ================================================================

-- Time-series analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_player_date 
ON analytics(player_id, date DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_event_type_date 
ON analytics(event_type, date DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_date_hour 
ON analytics(date DESC, hour DESC) 
WHERE deleted_at IS NULL;

-- Event aggregation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_event_data_gin 
ON analytics USING gin(event_data) 
WHERE deleted_at IS NULL;

-- ================================================================
-- REAL-TIME SUBSCRIPTIONS OPTIMIZATION
-- ================================================================

-- Enable Row Level Security for real-time subscriptions
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for performance
CREATE POLICY "Players can view their own data" 
ON players FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Players can update their own data" 
ON players FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Game states are private to players" 
ON game_states FOR ALL 
USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Leaderboard is publicly readable" 
ON leaderboard FOR SELECT 
USING (true);

CREATE POLICY "Analytics are private to players" 
ON analytics FOR ALL 
USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- ================================================================
-- PARTITIONING FOR LARGE TABLES
-- ================================================================

-- Partition analytics by date for better performance
CREATE TABLE IF NOT EXISTS analytics_y2024 PARTITION OF analytics
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE IF NOT EXISTS analytics_y2025 PARTITION OF analytics
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- ================================================================
-- MATERIALIZED VIEWS FOR COMPLEX QUERIES
-- ================================================================

-- Real-time leaderboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_snapshot AS
SELECT 
  p.id,
  p.username,
  p.display_name,
  p.avatar,
  p.level,
  p.wool_produced,
  p.coins_earned,
  p.daily_streak,
  p.last_active,
  ROW_NUMBER() OVER (ORDER BY p.wool_produced DESC) as wool_rank,
  ROW_NUMBER() OVER (ORDER BY p.coins_earned DESC) as coins_rank,
  ROW_NUMBER() OVER (ORDER BY p.level DESC, p.experience DESC) as level_rank,
  ROW_NUMBER() OVER (ORDER BY p.daily_streak DESC) as streak_rank
FROM players p
WHERE p.deleted_at IS NULL 
  AND p.show_on_leaderboard = true
  AND p.last_active > NOW() - INTERVAL '30 days';

-- Index the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_snapshot_id 
ON leaderboard_snapshot(id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshot_wool_rank 
ON leaderboard_snapshot(wool_rank);

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshot_coins_rank 
ON leaderboard_snapshot(coins_rank);

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshot_level_rank 
ON leaderboard_snapshot(level_rank);

-- Daily active players materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_active_players AS
SELECT 
  DATE(last_active) as date,
  COUNT(DISTINCT id) as active_players,
  COUNT(DISTINCT CASE WHEN created_at::date = DATE(last_active) THEN id END) as new_players
FROM players
WHERE deleted_at IS NULL
  AND last_active > NOW() - INTERVAL '7 days'
GROUP BY DATE(last_active);

-- Index the DAP materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_active_players_date 
ON daily_active_players(date DESC);

-- ================================================================
-- FUNCTION-BASED INDEXES
-- ================================================================

-- Index for text search on usernames (fuzzy matching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_username_trgm 
ON players USING gin(username gin_trgm_ops) 
WHERE deleted_at IS NULL;

-- Index for JSON array length queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_states_llama_happiness 
ON game_states((
  SELECT AVG((elem->>'happiness')::numeric) 
  FROM jsonb_array_elements(llamas) elem
)) 
WHERE deleted_at IS NULL;

-- ================================================================
-- PERFORMANCE MONITORING INDEXES
-- ================================================================

-- Query performance tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pg_stat_statements_query 
ON pg_stat_statements(query, calls DESC, total_time DESC);

-- ================================================================
-- REFRESH POLICIES FOR MATERIALIZED VIEWS
-- ================================================================

-- Auto-refresh leaderboard every 5 minutes
CREATE OR REPLACE FUNCTION refresh_leaderboard_snapshot()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_snapshot;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh daily active players every hour
CREATE OR REPLACE FUNCTION refresh_daily_active_players()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_active_players;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- CLEAN UP FUNCTIONS
-- ================================================================

-- Function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics 
  WHERE date < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to update table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE players;
  ANALYZE game_states;
  ANALYZE leaderboard;
  ANALYZE analytics;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PERFORMANCE MONITORING VIEWS
-- ================================================================

-- View for slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 100 -- queries taking more than 100ms on average
ORDER BY total_time DESC;

-- View for index usage
CREATE OR REPLACE VIEW index_usage AS
SELECT 
  t.tablename,
  indexname,
  c.reltuples::bigint AS num_rows,
  pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::text)) AS table_size,
  pg_size_pretty(pg_relation_size(quote_ident(indexrelname)::text)) AS index_size,
  CASE WHEN indisunique THEN 'Y' ELSE 'N' END AS unique,
  idx_scan AS number_of_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
LEFT JOIN pg_indexes i ON i.tablename = t.tablename
LEFT JOIN pg_stat_user_indexes psui ON psui.indexrelname = i.indexname
LEFT JOIN pg_index pgi ON pgi.indexrelid = psui.indexrelid
WHERE t.schemaname = 'public'
ORDER BY number_of_scans DESC;

-- ================================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON INDEX idx_players_user_id IS 'Primary lookup index for player by user_id';
COMMENT ON INDEX idx_players_leaderboard_composite IS 'Composite index for complex leaderboard queries';
COMMENT ON INDEX idx_game_states_llamas_gin IS 'GIN index for fast JSONB queries on llamas array';
COMMENT ON MATERIALIZED VIEW leaderboard_snapshot IS 'Cached leaderboard for fast real-time updates';
COMMENT ON FUNCTION refresh_leaderboard_snapshot() IS 'Refreshes leaderboard materialized view';
COMMENT ON VIEW slow_queries IS 'Monitoring view for identifying slow queries';
COMMENT ON VIEW index_usage IS 'Monitoring view for index usage statistics';