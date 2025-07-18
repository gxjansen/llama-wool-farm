-- ==========================================================================
-- LLAMA WOOL FARM - SUPABASE FUNCTIONS
-- ==========================================================================
-- PostgreSQL functions for game logic, calculations, and utilities
-- Replaces MongoDB methods with PostgreSQL stored procedures
-- ==========================================================================

-- ==========================================================================
-- UTILITY FUNCTIONS
-- ==========================================================================

-- Calculate experience required for a given level
CREATE OR REPLACE FUNCTION calculate_experience_for_level(target_level INTEGER)
RETURNS BIGINT AS $$
BEGIN
    -- Formula: (level - 1)^2 * 1000
    IF target_level <= 1 THEN
        RETURN 0;
    END IF;
    
    RETURN POWER(target_level - 1, 2) * 1000;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate level from experience
CREATE OR REPLACE FUNCTION calculate_level_from_experience(experience BIGINT)
RETURNS INTEGER AS $$
BEGIN
    -- Formula: FLOOR(SQRT(experience / 1000)) + 1
    IF experience <= 0 THEN
        RETURN 1;
    END IF;
    
    RETURN LEAST(FLOOR(SQRT(experience / 1000.0)) + 1, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate secure random token
CREATE OR REPLACE FUNCTION generate_secure_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ==========================================================================
-- PLAYER FUNCTIONS
-- ==========================================================================

-- Add experience and handle level ups
CREATE OR REPLACE FUNCTION add_player_experience(
    p_player_id UUID,
    p_experience INTEGER
)
RETURNS TABLE (
    new_level INTEGER,
    new_experience BIGINT,
    level_up BOOLEAN
) AS $$
DECLARE
    v_current_level INTEGER;
    v_current_experience BIGINT;
    v_new_experience BIGINT;
    v_new_level INTEGER;
    v_level_up BOOLEAN := FALSE;
BEGIN
    -- Get current stats
    SELECT level, experience INTO v_current_level, v_current_experience
    FROM players WHERE id = p_player_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Player not found';
    END IF;
    
    -- Calculate new experience
    v_new_experience := v_current_experience + p_experience;
    
    -- Calculate new level
    v_new_level := calculate_level_from_experience(v_new_experience);
    
    -- Check if level up occurred
    IF v_new_level > v_current_level THEN
        v_level_up := TRUE;
    END IF;
    
    -- Update player
    UPDATE players 
    SET 
        level = v_new_level,
        experience = v_new_experience,
        updated_at = NOW()
    WHERE id = p_player_id;
    
    -- Return results
    RETURN QUERY SELECT v_new_level, v_new_experience, v_level_up;
END;
$$ LANGUAGE plpgsql;

-- Update player statistics
CREATE OR REPLACE FUNCTION update_player_stats(
    p_player_id UUID,
    p_wool_produced INTEGER DEFAULT 0,
    p_coins_earned INTEGER DEFAULT 0,
    p_llamas_fed INTEGER DEFAULT 0,
    p_buildings_constructed INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    UPDATE players 
    SET 
        wool_produced = wool_produced + p_wool_produced,
        coins_earned = coins_earned + p_coins_earned,
        llamas_fed = llamas_fed + p_llamas_fed,
        buildings_constructed = buildings_constructed + p_buildings_constructed,
        updated_at = NOW()
    WHERE id = p_player_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Player not found';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- GAME STATE FUNCTIONS
-- ==========================================================================

-- Add resources to player's game state
CREATE OR REPLACE FUNCTION add_resources(
    p_player_id UUID,
    p_wool INTEGER DEFAULT 0,
    p_coins INTEGER DEFAULT 0,
    p_feed INTEGER DEFAULT 0,
    p_premium INTEGER DEFAULT 0
)
RETURNS TABLE (
    new_wool INTEGER,
    new_coins INTEGER,
    new_feed INTEGER,
    new_premium INTEGER
) AS $$
DECLARE
    v_game_state_id UUID;
    v_new_wool INTEGER;
    v_new_coins INTEGER;
    v_new_feed INTEGER;
    v_new_premium INTEGER;
BEGIN
    -- Get game state
    SELECT id INTO v_game_state_id FROM game_states WHERE player_id = p_player_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game state not found for player';
    END IF;
    
    -- Update resources
    UPDATE game_states 
    SET 
        wool = GREATEST(0, wool + p_wool),
        coins = GREATEST(0, coins + p_coins),
        feed = GREATEST(0, feed + p_feed),
        premium = GREATEST(0, premium + p_premium),
        last_saved = NOW(),
        updated_at = NOW(),
        version = version + 1
    WHERE id = v_game_state_id
    RETURNING wool, coins, feed, premium INTO v_new_wool, v_new_coins, v_new_feed, v_new_premium;
    
    -- Update player stats if resources were added
    IF p_wool > 0 OR p_coins > 0 THEN
        PERFORM update_player_stats(p_player_id, p_wool, p_coins);
    END IF;
    
    RETURN QUERY SELECT v_new_wool, v_new_coins, v_new_feed, v_new_premium;
END;
$$ LANGUAGE plpgsql;

-- Check if player can afford a cost
CREATE OR REPLACE FUNCTION can_afford_cost(
    p_player_id UUID,
    p_wool_cost INTEGER DEFAULT 0,
    p_coins_cost INTEGER DEFAULT 0,
    p_feed_cost INTEGER DEFAULT 0,
    p_premium_cost INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_wool INTEGER;
    v_coins INTEGER;
    v_feed INTEGER;
    v_premium INTEGER;
BEGIN
    -- Get current resources
    SELECT wool, coins, feed, premium INTO v_wool, v_coins, v_feed, v_premium
    FROM game_states WHERE player_id = p_player_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if can afford
    RETURN (v_wool >= p_wool_cost AND 
            v_coins >= p_coins_cost AND 
            v_feed >= p_feed_cost AND 
            v_premium >= p_premium_cost);
END;
$$ LANGUAGE plpgsql;

-- Spend resources
CREATE OR REPLACE FUNCTION spend_resources(
    p_player_id UUID,
    p_wool_cost INTEGER DEFAULT 0,
    p_coins_cost INTEGER DEFAULT 0,
    p_feed_cost INTEGER DEFAULT 0,
    p_premium_cost INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_can_afford BOOLEAN;
BEGIN
    -- Check if can afford
    v_can_afford := can_afford_cost(p_player_id, p_wool_cost, p_coins_cost, p_feed_cost, p_premium_cost);
    
    IF NOT v_can_afford THEN
        RETURN FALSE;
    END IF;
    
    -- Spend resources
    PERFORM add_resources(p_player_id, -p_wool_cost, -p_coins_cost, -p_feed_cost, -p_premium_cost);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- LLAMA FUNCTIONS
-- ==========================================================================

-- Add a new llama to player's farm
CREATE OR REPLACE FUNCTION add_llama(
    p_player_id UUID,
    p_name TEXT,
    p_breed TEXT DEFAULT 'alpaca',
    p_color TEXT DEFAULT 'white',
    p_position_x INTEGER DEFAULT NULL,
    p_position_y INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_game_state_id UUID;
    v_llama_id UUID;
BEGIN
    -- Get game state
    SELECT id INTO v_game_state_id FROM game_states WHERE player_id = p_player_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game state not found for player';
    END IF;
    
    -- Insert new llama
    INSERT INTO llamas (player_id, game_state_id, name, breed, color, position_x, position_y)
    VALUES (p_player_id, v_game_state_id, p_name, p_breed, p_color, p_position_x, p_position_y)
    RETURNING id INTO v_llama_id;
    
    RETURN v_llama_id;
END;
$$ LANGUAGE plpgsql;

-- Feed a llama
CREATE OR REPLACE FUNCTION feed_llama(
    p_llama_id UUID,
    p_feed_amount INTEGER DEFAULT 10
)
RETURNS TABLE (
    success BOOLEAN,
    new_happiness INTEGER,
    new_health INTEGER,
    feed_remaining INTEGER
) AS $$
DECLARE
    v_player_id UUID;
    v_current_feed INTEGER;
    v_new_happiness INTEGER;
    v_new_health INTEGER;
    v_feed_remaining INTEGER;
BEGIN
    -- Get llama info
    SELECT player_id INTO v_player_id FROM llamas WHERE id = p_llama_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Check if player has enough feed
    SELECT feed INTO v_current_feed FROM game_states WHERE player_id = v_player_id;
    
    IF v_current_feed < p_feed_amount THEN
        RETURN QUERY SELECT FALSE, 0, 0, v_current_feed;
        RETURN;
    END IF;
    
    -- Feed the llama
    UPDATE llamas 
    SET 
        happiness = LEAST(100, happiness + 20),
        health = LEAST(100, health + 10),
        last_fed = NOW(),
        updated_at = NOW()
    WHERE id = p_llama_id
    RETURNING happiness, health INTO v_new_happiness, v_new_health;
    
    -- Spend feed
    PERFORM spend_resources(v_player_id, 0, 0, p_feed_amount, 0);
    
    -- Update player stats
    PERFORM update_player_stats(v_player_id, 0, 0, 1, 0);
    
    -- Get remaining feed
    SELECT feed INTO v_feed_remaining FROM game_states WHERE player_id = v_player_id;
    
    RETURN QUERY SELECT TRUE, v_new_happiness, v_new_health, v_feed_remaining;
END;
$$ LANGUAGE plpgsql;

-- Harvest wool from a llama
CREATE OR REPLACE FUNCTION harvest_wool(
    p_llama_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    wool_harvested INTEGER,
    coins_earned INTEGER,
    total_wool INTEGER
) AS $$
DECLARE
    v_player_id UUID;
    v_llama_level INTEGER;
    v_llama_happiness INTEGER;
    v_llama_quality INTEGER;
    v_wool_amount INTEGER;
    v_coins_amount INTEGER;
    v_total_wool INTEGER;
BEGIN
    -- Get llama info
    SELECT player_id, level, happiness, wool_quality 
    INTO v_player_id, v_llama_level, v_llama_happiness, v_llama_quality
    FROM llamas WHERE id = p_llama_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Calculate wool amount based on level, happiness, and quality
    v_wool_amount := (v_llama_level * v_llama_quality * v_llama_happiness) / 100;
    v_coins_amount := v_wool_amount * v_llama_quality;
    
    -- Update llama harvest time
    UPDATE llamas 
    SET 
        last_wool_harvest = NOW(),
        updated_at = NOW()
    WHERE id = p_llama_id;
    
    -- Add resources to player
    PERFORM add_resources(v_player_id, v_wool_amount, v_coins_amount, 0, 0);
    
    -- Get total wool
    SELECT wool INTO v_total_wool FROM game_states WHERE player_id = v_player_id;
    
    RETURN QUERY SELECT TRUE, v_wool_amount, v_coins_amount, v_total_wool;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- BUILDING FUNCTIONS
-- ==========================================================================

-- Add a new building
CREATE OR REPLACE FUNCTION add_building(
    p_player_id UUID,
    p_building_type TEXT,
    p_position_x INTEGER,
    p_position_y INTEGER,
    p_wool_cost INTEGER DEFAULT 0,
    p_coins_cost INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_game_state_id UUID;
    v_building_id UUID;
    v_can_afford BOOLEAN;
BEGIN
    -- Get game state
    SELECT id INTO v_game_state_id FROM game_states WHERE player_id = p_player_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game state not found for player';
    END IF;
    
    -- Check if player can afford
    v_can_afford := can_afford_cost(p_player_id, p_wool_cost, p_coins_cost, 0, 0);
    
    IF NOT v_can_afford THEN
        RAISE EXCEPTION 'Insufficient resources to build';
    END IF;
    
    -- Check if position is available
    IF EXISTS (SELECT 1 FROM buildings WHERE player_id = p_player_id AND position_x = p_position_x AND position_y = p_position_y) THEN
        RAISE EXCEPTION 'Position already occupied';
    END IF;
    
    -- Spend resources
    PERFORM spend_resources(p_player_id, p_wool_cost, p_coins_cost, 0, 0);
    
    -- Add building
    INSERT INTO buildings (player_id, game_state_id, type, position_x, position_y)
    VALUES (p_player_id, v_game_state_id, p_building_type, p_position_x, p_position_y)
    RETURNING id INTO v_building_id;
    
    -- Update player stats
    PERFORM update_player_stats(p_player_id, 0, 0, 0, 1);
    
    RETURN v_building_id;
END;
$$ LANGUAGE plpgsql;

-- Upgrade a building
CREATE OR REPLACE FUNCTION upgrade_building(
    p_building_id UUID,
    p_wool_cost INTEGER DEFAULT 0,
    p_coins_cost INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_player_id UUID;
    v_current_level INTEGER;
    v_can_afford BOOLEAN;
BEGIN
    -- Get building info
    SELECT player_id, level INTO v_player_id, v_current_level
    FROM buildings WHERE id = p_building_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check max level
    IF v_current_level >= 10 THEN
        RETURN FALSE;
    END IF;
    
    -- Check if player can afford
    v_can_afford := can_afford_cost(v_player_id, p_wool_cost, p_coins_cost, 0, 0);
    
    IF NOT v_can_afford THEN
        RETURN FALSE;
    END IF;
    
    -- Spend resources
    PERFORM spend_resources(v_player_id, p_wool_cost, p_coins_cost, 0, 0);
    
    -- Upgrade building
    UPDATE buildings 
    SET 
        level = level + 1,
        capacity = FLOOR(capacity * 1.5),
        efficiency = LEAST(5.0, efficiency + 0.2),
        last_upgrade = NOW(),
        updated_at = NOW()
    WHERE id = p_building_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- QUEST FUNCTIONS
-- ==========================================================================

-- Start a quest for a player
CREATE OR REPLACE FUNCTION start_quest(
    p_player_id UUID,
    p_quest_identifier TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_quest_id UUID;
    v_required_level INTEGER;
    v_player_level INTEGER;
BEGIN
    -- Get quest info
    SELECT id, required_level INTO v_quest_id, v_required_level
    FROM quests WHERE quest_identifier = p_quest_identifier AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if player already has this quest
    IF EXISTS (SELECT 1 FROM player_quests WHERE player_id = p_player_id AND quest_id = v_quest_id) THEN
        RETURN FALSE;
    END IF;
    
    -- Check player level requirement
    SELECT level INTO v_player_level FROM players WHERE id = p_player_id;
    
    IF v_player_level < v_required_level THEN
        RETURN FALSE;
    END IF;
    
    -- Start quest
    INSERT INTO player_quests (player_id, quest_id, status, progress, max_progress)
    VALUES (p_player_id, v_quest_id, 'active', 0, 100);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Complete a quest
CREATE OR REPLACE FUNCTION complete_quest(
    p_player_id UUID,
    p_quest_identifier TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    wool_reward INTEGER,
    coins_reward INTEGER,
    experience_reward INTEGER
) AS $$
DECLARE
    v_quest_id UUID;
    v_wool_reward INTEGER;
    v_coins_reward INTEGER;
    v_experience_reward INTEGER;
BEGIN
    -- Get quest info
    SELECT q.id, q.reward_wool, q.reward_coins, q.reward_experience
    INTO v_quest_id, v_wool_reward, v_coins_reward, v_experience_reward
    FROM quests q
    WHERE q.quest_identifier = p_quest_identifier AND q.is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Check if player has active quest
    IF NOT EXISTS (
        SELECT 1 FROM player_quests 
        WHERE player_id = p_player_id AND quest_id = v_quest_id AND status = 'active'
    ) THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Complete quest
    UPDATE player_quests 
    SET 
        status = 'completed',
        progress = 100,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE player_id = p_player_id AND quest_id = v_quest_id;
    
    -- Award rewards
    PERFORM add_resources(p_player_id, v_wool_reward, v_coins_reward, 0, 0);
    PERFORM add_player_experience(p_player_id, v_experience_reward);
    
    RETURN QUERY SELECT TRUE, v_wool_reward, v_coins_reward, v_experience_reward;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- ACHIEVEMENT FUNCTIONS
-- ==========================================================================

-- Check and unlock achievements for a player
CREATE OR REPLACE FUNCTION check_achievements(
    p_player_id UUID
)
RETURNS TABLE (
    achievement_identifier TEXT,
    unlocked BOOLEAN,
    wool_reward INTEGER,
    coins_reward INTEGER,
    experience_reward INTEGER
) AS $$
DECLARE
    v_achievement RECORD;
    v_current_value INTEGER;
    v_is_unlocked BOOLEAN;
BEGIN
    -- Loop through all active achievements
    FOR v_achievement IN 
        SELECT a.id, a.achievement_identifier, a.achievement_type, a.required_value,
               a.reward_wool, a.reward_coins, a.reward_experience
        FROM achievements a
        WHERE a.is_active = TRUE
        AND NOT EXISTS (
            SELECT 1 FROM player_achievements pa 
            WHERE pa.player_id = p_player_id 
            AND pa.achievement_id = a.id 
            AND pa.is_completed = TRUE
        )
    LOOP
        -- Calculate current value based on achievement type
        v_current_value := 0;
        
        -- Get current progress value based on achievement identifier
        CASE 
            WHEN v_achievement.achievement_identifier LIKE 'wool_%' THEN
                SELECT wool_produced INTO v_current_value FROM players WHERE id = p_player_id;
            WHEN v_achievement.achievement_identifier LIKE 'llama_%' THEN
                SELECT COUNT(*) INTO v_current_value FROM llamas WHERE player_id = p_player_id;
            WHEN v_achievement.achievement_identifier LIKE 'level_%' THEN
                SELECT level INTO v_current_value FROM players WHERE id = p_player_id;
            WHEN v_achievement.achievement_identifier LIKE 'streak_%' THEN
                SELECT daily_streak INTO v_current_value FROM players WHERE id = p_player_id;
            WHEN v_achievement.achievement_identifier LIKE 'feed_%' THEN
                SELECT llamas_fed INTO v_current_value FROM players WHERE id = p_player_id;
            WHEN v_achievement.achievement_identifier LIKE '%building%' THEN
                SELECT buildings_constructed INTO v_current_value FROM players WHERE id = p_player_id;
            ELSE
                v_current_value := 0;
        END CASE;
        
        -- Check if achievement should be unlocked
        v_is_unlocked := v_current_value >= v_achievement.required_value;
        
        -- Update or insert achievement progress
        INSERT INTO player_achievements (player_id, achievement_id, progress, is_completed, completed_at)
        VALUES (p_player_id, v_achievement.id, v_current_value, v_is_unlocked, 
                CASE WHEN v_is_unlocked THEN NOW() ELSE NULL END)
        ON CONFLICT (player_id, achievement_id) 
        DO UPDATE SET
            progress = v_current_value,
            is_completed = v_is_unlocked,
            completed_at = CASE WHEN v_is_unlocked AND player_achievements.completed_at IS NULL THEN NOW() ELSE player_achievements.completed_at END,
            updated_at = NOW();
        
        -- Award rewards if newly unlocked
        IF v_is_unlocked THEN
            PERFORM add_resources(p_player_id, v_achievement.reward_wool, v_achievement.reward_coins, 0, 0);
            PERFORM add_player_experience(p_player_id, v_achievement.reward_experience);
            
            RETURN QUERY SELECT v_achievement.achievement_identifier, TRUE, 
                               v_achievement.reward_wool, v_achievement.reward_coins, v_achievement.reward_experience;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- LEADERBOARD FUNCTIONS
-- ==========================================================================

-- Update leaderboard rankings for a category
CREATE OR REPLACE FUNCTION update_leaderboard_rankings(
    p_category TEXT,
    p_season TEXT DEFAULT 'current'
)
RETURNS INTEGER AS $$
DECLARE
    v_entry RECORD;
    v_rank INTEGER := 1;
    v_updated_count INTEGER := 0;
BEGIN
    -- Update rankings based on score
    FOR v_entry IN 
        SELECT id, current_rank, score
        FROM leaderboards 
        WHERE category = p_category AND season = p_season
        ORDER BY score DESC, created_at ASC
    LOOP
        -- Update rank if changed
        IF v_entry.current_rank != v_rank THEN
            UPDATE leaderboards 
            SET 
                previous_rank = current_rank,
                current_rank = v_rank,
                rank_change = current_rank - v_rank,
                last_updated = NOW()
            WHERE id = v_entry.id;
            
            v_updated_count := v_updated_count + 1;
        END IF;
        
        v_rank := v_rank + 1;
    END LOOP;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Update player's leaderboard entry
CREATE OR REPLACE FUNCTION update_player_leaderboard(
    p_player_id UUID,
    p_category TEXT,
    p_score BIGINT,
    p_season TEXT DEFAULT 'current'
)
RETURNS VOID AS $$
DECLARE
    v_player_info RECORD;
BEGIN
    -- Get player info
    SELECT username, display_name, level, avatar
    INTO v_player_info
    FROM players WHERE id = p_player_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Player not found';
    END IF;
    
    -- Update or insert leaderboard entry
    INSERT INTO leaderboards (
        player_id, category, current_rank, score, username, 
        display_name, player_level, player_avatar, season
    )
    VALUES (
        p_player_id, p_category, 999999, p_score, v_player_info.username,
        v_player_info.display_name, v_player_info.level, v_player_info.avatar, p_season
    )
    ON CONFLICT (player_id, category, season)
    DO UPDATE SET
        score = p_score,
        username = v_player_info.username,
        display_name = v_player_info.display_name,
        player_level = v_player_info.level,
        player_avatar = v_player_info.avatar,
        last_updated = NOW();
    
    -- Update rankings for this category
    PERFORM update_leaderboard_rankings(p_category, p_season);
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- DAILY BONUS FUNCTIONS
-- ==========================================================================

-- Claim daily bonus
CREATE OR REPLACE FUNCTION claim_daily_bonus(
    p_player_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    streak_day INTEGER,
    wool_reward INTEGER,
    coins_reward INTEGER,
    experience_reward INTEGER
) AS $$
DECLARE
    v_last_claimed TIMESTAMP WITH TIME ZONE;
    v_current_streak INTEGER;
    v_new_streak INTEGER;
    v_wool_reward INTEGER := 0;
    v_coins_reward INTEGER := 0;
    v_experience_reward INTEGER := 0;
    v_bonus_available BOOLEAN;
BEGIN
    -- Get current bonus info
    SELECT daily_bonus_last_claimed, daily_bonus_streak, daily_bonus_available
    INTO v_last_claimed, v_current_streak, v_bonus_available
    FROM game_states WHERE player_id = p_player_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Check if bonus is available
    IF NOT v_bonus_available THEN
        RETURN QUERY SELECT FALSE, v_current_streak, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Check if already claimed today
    IF v_last_claimed IS NOT NULL AND DATE(v_last_claimed) = CURRENT_DATE THEN
        RETURN QUERY SELECT FALSE, v_current_streak, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Calculate new streak
    IF v_last_claimed IS NULL OR DATE(v_last_claimed) = CURRENT_DATE - INTERVAL '1 day' THEN
        v_new_streak := v_current_streak + 1;
    ELSE
        v_new_streak := 1;  -- Reset streak if gap
    END IF;
    
    -- Calculate rewards based on streak day
    CASE v_new_streak % 7
        WHEN 1 THEN v_coins_reward := 10;
        WHEN 2 THEN v_wool_reward := 5;
        WHEN 3 THEN v_coins_reward := 15;
        WHEN 4 THEN v_wool_reward := 10;
        WHEN 5 THEN v_coins_reward := 25;
        WHEN 6 THEN v_wool_reward := 20;
        WHEN 0 THEN 
            v_coins_reward := 50;
            v_wool_reward := 25;
            v_experience_reward := 100;
    END CASE;
    
    -- Update game state
    UPDATE game_states 
    SET 
        daily_bonus_last_claimed = NOW(),
        daily_bonus_streak = v_new_streak,
        daily_bonus_available = FALSE,
        updated_at = NOW()
    WHERE player_id = p_player_id;
    
    -- Update player streak
    UPDATE players 
    SET 
        daily_streak = v_new_streak,
        max_daily_streak = GREATEST(max_daily_streak, v_new_streak),
        updated_at = NOW()
    WHERE id = p_player_id;
    
    -- Award rewards
    PERFORM add_resources(p_player_id, v_wool_reward, v_coins_reward, 0, 0);
    IF v_experience_reward > 0 THEN
        PERFORM add_player_experience(p_player_id, v_experience_reward);
    END IF;
    
    RETURN QUERY SELECT TRUE, v_new_streak, v_wool_reward, v_coins_reward, v_experience_reward;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- ==========================================================================

-- Reset daily bonuses for all players
CREATE OR REPLACE FUNCTION reset_daily_bonuses()
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE game_states 
    SET daily_bonus_available = TRUE
    WHERE daily_bonus_available = FALSE;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired processes
CREATE OR REPLACE FUNCTION cleanup_expired_processes()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM active_processes 
    WHERE end_time < NOW() AND is_completed = FALSE;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Update all leaderboards
CREATE OR REPLACE FUNCTION update_all_leaderboards()
RETURNS TABLE (
    category TEXT,
    updated_count INTEGER
) AS $$
DECLARE
    v_category TEXT;
    v_count INTEGER;
BEGIN
    -- Update wool production leaderboard
    FOR v_category IN SELECT DISTINCT category FROM leaderboards
    LOOP
        SELECT update_leaderboard_rankings(v_category) INTO v_count;
        RETURN QUERY SELECT v_category, v_count;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- ANALYTICS FUNCTIONS
-- ==========================================================================

-- Get player statistics summary
CREATE OR REPLACE FUNCTION get_player_stats_summary(
    p_player_id UUID
)
RETURNS TABLE (
    total_wool_produced BIGINT,
    total_coins_earned BIGINT,
    total_llamas INTEGER,
    total_buildings INTEGER,
    current_level INTEGER,
    daily_streak INTEGER,
    achievements_completed INTEGER,
    quests_completed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.wool_produced,
        p.coins_earned,
        (SELECT COUNT(*)::INTEGER FROM llamas WHERE player_id = p_player_id),
        (SELECT COUNT(*)::INTEGER FROM buildings WHERE player_id = p_player_id),
        p.level,
        p.daily_streak,
        (SELECT COUNT(*)::INTEGER FROM player_achievements WHERE player_id = p_player_id AND is_completed = TRUE),
        (SELECT COUNT(*)::INTEGER FROM player_quests WHERE player_id = p_player_id AND status = 'completed')
    FROM players p
    WHERE p.id = p_player_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- INITIALIZATION FUNCTIONS
-- ==========================================================================

-- Initialize new player game state
CREATE OR REPLACE FUNCTION initialize_player_game_state(
    p_player_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_game_state_id UUID;
    v_llama_id UUID;
    v_building_id UUID;
BEGIN
    -- Create game state
    INSERT INTO game_states (player_id, wool, coins, feed)
    VALUES (p_player_id, 0, 100, 50)
    RETURNING id INTO v_game_state_id;
    
    -- Add starting llama
    SELECT add_llama(p_player_id, 'Fluffy', 'alpaca', 'white', 10, 10) INTO v_llama_id;
    
    -- Add starting barn
    SELECT add_building(p_player_id, 'barn', 5, 5, 0, 0) INTO v_building_id;
    
    -- Add basic unlocks
    INSERT INTO unlocks (player_id, unlock_type, unlock_identifier) VALUES
    (p_player_id, 'building', 'barn'),
    (p_player_id, 'llama_breed', 'alpaca'),
    (p_player_id, 'feature', 'feeding');
    
    -- Start tutorial quest
    PERFORM start_quest(p_player_id, 'tutorial_welcome');
    
    RETURN v_game_state_id;
END;
$$ LANGUAGE plpgsql;