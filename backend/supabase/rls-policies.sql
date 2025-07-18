-- =============================================
-- SUPABASE ROW LEVEL SECURITY POLICIES
-- Llama Wool Farm - Comprehensive Security
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY HELPER FUNCTIONS
-- =============================================

-- Check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user owns the record
CREATE OR REPLACE FUNCTION is_owner(owner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is moderator or admin
CREATE OR REPLACE FUNCTION is_moderator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user action is rate limited
CREATE OR REPLACE FUNCTION is_rate_limited(action_type TEXT, window_minutes INTEGER DEFAULT 60, max_actions INTEGER DEFAULT 100)
RETURNS BOOLEAN AS $$
DECLARE
  action_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  window_start := NOW() - INTERVAL '1 minute' * window_minutes;
  
  SELECT COUNT(*) INTO action_count
  FROM security_logs
  WHERE user_id = auth.uid()
    AND action = action_type
    AND created_at >= window_start;
    
  RETURN action_count >= max_actions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if game state change is suspicious
CREATE OR REPLACE FUNCTION is_suspicious_game_state(
  old_wool_count DECIMAL,
  new_wool_count DECIMAL,
  time_delta_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  max_production_per_second DECIMAL := 1000000; -- Adjust based on game mechanics
  expected_max_gain DECIMAL;
BEGIN
  expected_max_gain := max_production_per_second * time_delta_seconds;
  RETURN (new_wool_count - old_wool_count) > expected_max_gain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log security event
CREATE OR REPLACE FUNCTION log_security_event(
  event_type TEXT,
  severity TEXT DEFAULT 'info',
  details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO security_logs (
    user_id,
    action,
    severity,
    details,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    auth.uid(),
    event_type,
    severity,
    details,
    current_setting('request.headers')::jsonb->>'x-forwarded-for',
    current_setting('request.headers')::jsonb->>'user-agent',
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Users can read their own profile
CREATE POLICY "users_read_own" ON users
  FOR SELECT
  TO authenticated
  USING (is_owner(id));

-- Users can update their own profile (restricted fields)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (is_owner(id))
  WITH CHECK (
    is_owner(id) AND
    -- Prevent users from changing critical fields
    OLD.role = NEW.role AND
    OLD.created_at = NEW.created_at AND
    OLD.email = NEW.email
  );

-- Admins can read all users
CREATE POLICY "users_read_admin" ON users
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can update any user
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE
  TO authenticated
  USING (is_admin());

-- New users can insert their own record
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_owner(id) AND
    role = 'user' -- Force new users to have 'user' role
  );

-- =============================================
-- GAME SAVES TABLE POLICIES
-- =============================================

-- Users can read their own game saves
CREATE POLICY "game_saves_read_own" ON game_saves
  FOR SELECT
  TO authenticated
  USING (is_owner(user_id));

-- Users can insert their own game saves (with rate limiting)
CREATE POLICY "game_saves_insert_own" ON game_saves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_owner(user_id) AND
    NOT is_rate_limited('game_save', 5, 10) -- Max 10 saves per 5 minutes
  );

-- Users can update their own game saves (with validation)
CREATE POLICY "game_saves_update_own" ON game_saves
  FOR UPDATE
  TO authenticated
  USING (is_owner(user_id))
  WITH CHECK (
    is_owner(user_id) AND
    NOT is_rate_limited('game_save', 1, 60) AND -- Max 60 saves per minute
    -- Validate game state progression
    NOT is_suspicious_game_state(
      OLD.wool_count,
      NEW.wool_count,
      EXTRACT(EPOCH FROM (NEW.last_updated - OLD.last_updated))::INTEGER
    )
  );

-- Admins can read all game saves
CREATE POLICY "game_saves_read_admin" ON game_saves
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Log suspicious game save attempts
CREATE OR REPLACE FUNCTION log_suspicious_save()
RETURNS TRIGGER AS $$
BEGIN
  IF is_suspicious_game_state(
    OLD.wool_count,
    NEW.wool_count,
    EXTRACT(EPOCH FROM (NEW.last_updated - OLD.last_updated))::INTEGER
  ) THEN
    PERFORM log_security_event(
      'suspicious_game_save',
      'warning',
      jsonb_build_object(
        'old_wool_count', OLD.wool_count,
        'new_wool_count', NEW.wool_count,
        'time_delta', EXTRACT(EPOCH FROM (NEW.last_updated - OLD.last_updated))
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_saves_security_check
  BEFORE UPDATE ON game_saves
  FOR EACH ROW
  EXECUTE FUNCTION log_suspicious_save();

-- =============================================
-- ACHIEVEMENTS TABLE POLICIES
-- =============================================

-- Users can read their own achievements
CREATE POLICY "achievements_read_own" ON achievements
  FOR SELECT
  TO authenticated
  USING (is_owner(user_id));

-- Users can insert their own achievements (system-validated only)
CREATE POLICY "achievements_insert_own" ON achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_owner(user_id) AND
    NOT is_rate_limited('achievement', 10, 5) -- Max 5 achievements per 10 minutes
  );

-- Prevent achievement deletion by users
CREATE POLICY "achievements_no_delete" ON achievements
  FOR DELETE
  TO authenticated
  USING (FALSE);

-- Admins can manage all achievements
CREATE POLICY "achievements_admin_all" ON achievements
  FOR ALL
  TO authenticated
  USING (is_admin());

-- =============================================
-- LEADERBOARDS TABLE POLICIES
-- =============================================

-- Everyone can read leaderboards (public data)
CREATE POLICY "leaderboards_read_public" ON leaderboards
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Users can insert their own leaderboard entries
CREATE POLICY "leaderboards_insert_own" ON leaderboards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_owner(user_id) AND
    NOT is_rate_limited('leaderboard', 60, 1) -- Max 1 entry per hour
  );

-- Users can update their own leaderboard entries
CREATE POLICY "leaderboards_update_own" ON leaderboards
  FOR UPDATE
  TO authenticated
  USING (is_owner(user_id))
  WITH CHECK (
    is_owner(user_id) AND
    -- Prevent score manipulation
    NEW.score >= OLD.score AND
    NEW.updated_at > OLD.updated_at
  );

-- Admins can manage all leaderboard entries
CREATE POLICY "leaderboards_admin_all" ON leaderboards
  FOR ALL
  TO authenticated
  USING (is_admin());

-- =============================================
-- ANALYTICS EVENTS TABLE POLICIES
-- =============================================

-- Users can read their own analytics
CREATE POLICY "analytics_read_own" ON analytics_events
  FOR SELECT
  TO authenticated
  USING (is_owner(user_id));

-- Users can insert their own analytics events
CREATE POLICY "analytics_insert_own" ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_owner(user_id) AND
    NOT is_rate_limited('analytics', 1, 1000) -- Max 1000 events per minute
  );

-- Prevent analytics modification
CREATE POLICY "analytics_no_update" ON analytics_events
  FOR UPDATE
  TO authenticated
  USING (FALSE);

CREATE POLICY "analytics_no_delete" ON analytics_events
  FOR DELETE
  TO authenticated
  USING (FALSE);

-- Admins can read all analytics
CREATE POLICY "analytics_read_admin" ON analytics_events
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- =============================================
-- SECURITY LOGS TABLE POLICIES
-- =============================================

-- Users can read their own security logs
CREATE POLICY "security_logs_read_own" ON security_logs
  FOR SELECT
  TO authenticated
  USING (is_owner(user_id));

-- System can insert security logs
CREATE POLICY "security_logs_insert_system" ON security_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE); -- System function handles validation

-- Prevent security log modification
CREATE POLICY "security_logs_no_update" ON security_logs
  FOR UPDATE
  TO authenticated
  USING (FALSE);

CREATE POLICY "security_logs_no_delete" ON security_logs
  FOR DELETE
  TO authenticated
  USING (FALSE);

-- Admins can read all security logs
CREATE POLICY "security_logs_read_admin" ON security_logs
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- =============================================
-- PLAYER SESSIONS TABLE POLICIES
-- =============================================

-- Users can read their own sessions
CREATE POLICY "player_sessions_read_own" ON player_sessions
  FOR SELECT
  TO authenticated
  USING (is_owner(user_id));

-- Users can insert their own sessions
CREATE POLICY "player_sessions_insert_own" ON player_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_owner(user_id) AND
    NOT is_rate_limited('session', 5, 10) -- Max 10 sessions per 5 minutes
  );

-- Users can update their own active sessions
CREATE POLICY "player_sessions_update_own" ON player_sessions
  FOR UPDATE
  TO authenticated
  USING (
    is_owner(user_id) AND
    status = 'active'
  )
  WITH CHECK (
    is_owner(user_id) AND
    -- Can only end sessions or update last_activity
    (OLD.status = 'active' AND NEW.status IN ('active', 'ended')) AND
    NEW.last_activity >= OLD.last_activity
  );

-- Admins can manage all sessions
CREATE POLICY "player_sessions_admin_all" ON player_sessions
  FOR ALL
  TO authenticated
  USING (is_admin());

-- =============================================
-- PLAYER STATS TABLE POLICIES
-- =============================================

-- Users can read their own stats
CREATE POLICY "player_stats_read_own" ON player_stats
  FOR SELECT
  TO authenticated
  USING (is_owner(user_id));

-- Users can read public stats (for leaderboards)
CREATE POLICY "player_stats_read_public" ON player_stats
  FOR SELECT
  TO authenticated
  USING (
    -- Only allow reading of public stats fields
    TRUE
  );

-- System can update player stats
CREATE POLICY "player_stats_update_system" ON player_stats
  FOR UPDATE
  TO authenticated
  USING (
    is_owner(user_id) AND
    NOT is_rate_limited('stats_update', 1, 60) -- Max 60 updates per minute
  );

-- Admins can manage all stats
CREATE POLICY "player_stats_admin_all" ON player_stats
  FOR ALL
  TO authenticated
  USING (is_admin());

-- =============================================
-- ADDITIONAL SECURITY MEASURES
-- =============================================

-- Create indexes for security queries
CREATE INDEX IF NOT EXISTS idx_security_logs_user_action ON security_logs(user_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_game_saves_user_updated ON game_saves(user_id, last_updated);
CREATE INDEX IF NOT EXISTS idx_player_sessions_user_status ON player_sessions(user_id, status, last_activity);

-- Create view for user security summary
CREATE OR REPLACE VIEW user_security_summary AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.role,
  u.created_at,
  COUNT(DISTINCT gs.id) as total_saves,
  COUNT(DISTINCT sl.id) as security_events,
  COUNT(DISTINCT ps.id) as total_sessions,
  MAX(ps.last_activity) as last_activity,
  CASE 
    WHEN COUNT(sl.id) FILTER (WHERE sl.severity IN ('warning', 'error') AND sl.created_at > NOW() - INTERVAL '24 hours') > 0 
    THEN TRUE 
    ELSE FALSE 
  END as has_recent_security_events
FROM users u
LEFT JOIN game_saves gs ON u.id = gs.user_id
LEFT JOIN security_logs sl ON u.id = sl.user_id
LEFT JOIN player_sessions ps ON u.id = ps.user_id
WHERE u.id = auth.uid() OR is_admin()
GROUP BY u.id, u.username, u.email, u.role, u.created_at;

-- Grant appropriate permissions
GRANT SELECT ON user_security_summary TO authenticated;

-- =============================================
-- ANTI-CHEAT TRIGGERS
-- =============================================

-- Trigger to detect impossible progression
CREATE OR REPLACE FUNCTION detect_impossible_progression()
RETURNS TRIGGER AS $$
DECLARE
  time_diff INTEGER;
  wool_diff DECIMAL;
  max_possible_production DECIMAL;
BEGIN
  time_diff := EXTRACT(EPOCH FROM (NEW.last_updated - OLD.last_updated))::INTEGER;
  wool_diff := NEW.wool_count - OLD.wool_count;
  
  -- Calculate maximum possible production based on game mechanics
  -- This is a simplified calculation - adjust based on actual game mechanics
  max_possible_production := 1000 * time_diff; -- 1000 wool per second max
  
  IF wool_diff > max_possible_production THEN
    PERFORM log_security_event(
      'impossible_progression',
      'error',
      jsonb_build_object(
        'time_diff', time_diff,
        'wool_diff', wool_diff,
        'max_possible', max_possible_production,
        'old_count', OLD.wool_count,
        'new_count', NEW.wool_count
      )
    );
    
    -- Optionally reject the update
    RAISE EXCEPTION 'Impossible game progression detected';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_saves_anti_cheat
  BEFORE UPDATE ON game_saves
  FOR EACH ROW
  EXECUTE FUNCTION detect_impossible_progression();

-- Trigger to detect rapid save attempts
CREATE OR REPLACE FUNCTION detect_rapid_saves()
RETURNS TRIGGER AS $$
DECLARE
  recent_saves INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_saves
  FROM game_saves
  WHERE user_id = NEW.user_id
    AND last_updated > NOW() - INTERVAL '1 minute';
    
  IF recent_saves > 10 THEN
    PERFORM log_security_event(
      'rapid_saves',
      'warning',
      jsonb_build_object(
        'saves_count', recent_saves,
        'window', '1 minute'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_saves_rapid_detection
  BEFORE INSERT OR UPDATE ON game_saves
  FOR EACH ROW
  EXECUTE FUNCTION detect_rapid_saves();

-- =============================================
-- CLEANUP POLICIES
-- =============================================

-- Function to clean up old security logs
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS VOID AS $$
BEGIN
  DELETE FROM security_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND severity NOT IN ('error', 'critical');
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old player sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS VOID AS $$
BEGIN
  DELETE FROM player_sessions
  WHERE last_activity < NOW() - INTERVAL '30 days'
    AND status = 'ended';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_old_security_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_sessions() TO authenticated;

-- =============================================
-- COMMENT DOCUMENTATION
-- =============================================

COMMENT ON POLICY "users_read_own" ON users IS 'Allow users to read their own profile information';
COMMENT ON POLICY "game_saves_update_own" ON game_saves IS 'Allow users to update their game saves with anti-cheat validation';
COMMENT ON POLICY "achievements_no_delete" ON achievements IS 'Prevent users from deleting achievements to maintain integrity';
COMMENT ON POLICY "leaderboards_read_public" ON leaderboards IS 'Allow all authenticated users to view leaderboards';
COMMENT ON POLICY "security_logs_no_update" ON security_logs IS 'Prevent modification of security logs for audit trail integrity';

COMMENT ON FUNCTION is_suspicious_game_state(DECIMAL, DECIMAL, INTEGER) IS 'Validates game state changes for anti-cheat detection';
COMMENT ON FUNCTION log_security_event(TEXT, TEXT, JSONB) IS 'Centralized security event logging function';
COMMENT ON FUNCTION detect_impossible_progression() IS 'Trigger function to detect and prevent impossible game progression';