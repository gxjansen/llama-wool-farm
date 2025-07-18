-- ==========================================================================
-- LLAMA WOOL FARM - SUPABASE SEED DATA
-- ==========================================================================
-- Initial data and game configuration for Supabase
-- Includes quests, achievements, and game configuration data
-- ==========================================================================

-- ==========================================================================
-- QUESTS - Initial Quest Configuration
-- ==========================================================================

-- Tutorial Quests
INSERT INTO quests (quest_identifier, title, description, quest_type, required_level, reward_wool, reward_coins, reward_experience) VALUES
('tutorial_welcome', 'Welcome to the Farm!', 'Learn the basics of managing your llama wool farm.', 'main', 1, 0, 50, 100),
('tutorial_first_llama', 'Meet Your First Llama', 'Get acquainted with your first llama and learn about their needs.', 'main', 1, 10, 25, 50),
('tutorial_feed_llama', 'Feed Your Llama', 'Keep your llama happy and healthy by feeding them regularly.', 'main', 1, 5, 10, 25),
('tutorial_harvest_wool', 'Harvest Your First Wool', 'Collect wool from your llama to start building your wool empire.', 'main', 1, 0, 20, 50),
('tutorial_build_barn', 'Build Your First Barn', 'Construct a barn to house more llamas and expand your farm.', 'main', 1, 0, 100, 150),
('tutorial_upgrade_barn', 'Upgrade Your Barn', 'Improve your barn to increase its capacity and efficiency.', 'main', 2, 0, 200, 250),
('tutorial_buy_llama', 'Purchase a Second Llama', 'Expand your herd by purchasing another llama.', 'main', 2, 0, 0, 200),
('tutorial_complete', 'Farm Master', 'You have completed the tutorial and are ready to manage your farm independently!', 'main', 3, 100, 500, 1000);

-- Main Story Quests
INSERT INTO quests (quest_identifier, title, description, quest_type, required_level, reward_wool, reward_coins, reward_experience) VALUES
('main_wool_producer', 'Wool Producer', 'Produce 500 wool to establish yourself as a serious wool producer.', 'main', 3, 0, 250, 500),
('main_llama_collector', 'Llama Collector', 'Own 5 llamas to diversify your farm operations.', 'main', 5, 0, 500, 750),
('main_building_contractor', 'Building Contractor', 'Construct 3 different types of buildings on your farm.', 'main', 5, 0, 750, 1000),
('main_farm_expansion', 'Farm Expansion', 'Expand your farm to accommodate 10 llamas.', 'main', 8, 0, 1000, 1500),
('main_wool_master', 'Wool Master', 'Produce 5000 wool to become a true wool master.', 'main', 10, 0, 2000, 2500);

-- Daily Quests
INSERT INTO quests (quest_identifier, title, description, quest_type, required_level, reward_wool, reward_coins, reward_experience) VALUES
('daily_feed_llamas', 'Daily Care', 'Feed all your llamas today to keep them happy.', 'daily', 1, 10, 50, 100),
('daily_harvest_wool', 'Daily Harvest', 'Harvest wool from your llamas today.', 'daily', 1, 20, 25, 75),
('daily_collect_resources', 'Resource Collection', 'Collect resources around your farm.', 'daily', 2, 15, 75, 125),
('daily_upgrade_building', 'Daily Improvement', 'Upgrade any building on your farm today.', 'daily', 3, 0, 150, 200),
('daily_visit_shop', 'Shopping Day', 'Visit the shop and make a purchase.', 'daily', 2, 0, 0, 150);

-- Weekly Quests
INSERT INTO quests (quest_identifier, title, description, quest_type, required_level, reward_wool, reward_coins, reward_experience) VALUES
('weekly_wool_goal', 'Weekly Wool Goal', 'Produce 1000 wool this week.', 'weekly', 3, 0, 500, 1000),
('weekly_llama_care', 'Llama Care Champion', 'Feed your llamas 50 times this week.', 'weekly', 2, 50, 250, 500),
('weekly_construction', 'Construction Week', 'Build or upgrade 5 buildings this week.', 'weekly', 5, 0, 1000, 1500),
('weekly_social', 'Social Farmer', 'Visit 10 friends'' farms this week.', 'weekly', 4, 0, 300, 750);

-- Special Event Quests
INSERT INTO quests (quest_identifier, title, description, quest_type, required_level, reward_wool, reward_coins, reward_experience) VALUES
('special_holiday_harvest', 'Holiday Harvest', 'Participate in the special holiday harvest event.', 'special', 1, 100, 500, 1000),
('special_competition', 'Monthly Competition', 'Compete in this month''s wool production competition.', 'special', 5, 0, 1000, 2000),
('special_rare_llama', 'Rare Llama Discovery', 'Help discover and care for a rare llama breed.', 'special', 8, 0, 2000, 3000);

-- ==========================================================================
-- ACHIEVEMENTS - Achievement System Configuration
-- ==========================================================================

-- Production Achievements
INSERT INTO achievements (achievement_identifier, title, description, achievement_type, required_value, reward_wool, reward_coins, reward_experience) VALUES
('first_wool', 'First Wool', 'Harvest your first piece of wool.', 'milestone', 1, 5, 10, 25),
('wool_apprentice', 'Wool Apprentice', 'Produce 100 wool.', 'progress', 100, 10, 50, 100),
('wool_journeyman', 'Wool Journeyman', 'Produce 1,000 wool.', 'progress', 1000, 50, 250, 500),
('wool_expert', 'Wool Expert', 'Produce 10,000 wool.', 'progress', 10000, 200, 1000, 2000),
('wool_master', 'Wool Master', 'Produce 100,000 wool.', 'progress', 100000, 1000, 5000, 10000),
('wool_legend', 'Wool Legend', 'Produce 1,000,000 wool.', 'progress', 1000000, 5000, 25000, 50000);

-- Llama Achievements
INSERT INTO achievements (achievement_identifier, title, description, achievement_type, required_value, reward_wool, reward_coins, reward_experience) VALUES
('first_llama', 'First Llama', 'Get your first llama.', 'milestone', 1, 0, 25, 50),
('llama_collector', 'Llama Collector', 'Own 5 llamas.', 'progress', 5, 0, 100, 200),
('llama_herd', 'Llama Herd', 'Own 10 llamas.', 'progress', 10, 0, 250, 500),
('llama_ranch', 'Llama Ranch', 'Own 25 llamas.', 'progress', 25, 0, 500, 1000),
('llama_empire', 'Llama Empire', 'Own 50 llamas.', 'progress', 50, 0, 1000, 2500),
('llama_legend', 'Llama Legend', 'Own 100 llamas.', 'progress', 100, 0, 2500, 5000);

-- Building Achievements
INSERT INTO achievements (achievement_identifier, title, description, achievement_type, required_value, reward_wool, reward_coins, reward_experience) VALUES
('first_building', 'First Building', 'Construct your first building.', 'milestone', 1, 0, 50, 100),
('builder', 'Builder', 'Construct 5 buildings.', 'progress', 5, 0, 200, 400),
('architect', 'Architect', 'Construct 10 buildings.', 'progress', 10, 0, 500, 1000),
('construction_king', 'Construction King', 'Construct 25 buildings.', 'progress', 25, 0, 1000, 2000),
('master_builder', 'Master Builder', 'Construct 50 buildings.', 'progress', 50, 0, 2500, 5000);

-- Level Achievements
INSERT INTO achievements (achievement_identifier, title, description, achievement_type, required_value, reward_wool, reward_coins, reward_experience) VALUES
('level_5', 'Rising Star', 'Reach level 5.', 'milestone', 5, 20, 100, 0),
('level_10', 'Experienced Farmer', 'Reach level 10.', 'milestone', 10, 50, 250, 0),
('level_25', 'Veteran Farmer', 'Reach level 25.', 'milestone', 25, 100, 500, 0),
('level_50', 'Master Farmer', 'Reach level 50.', 'milestone', 50, 250, 1000, 0),
('level_100', 'Legendary Farmer', 'Reach the maximum level of 100.', 'milestone', 100, 1000, 5000, 0);

-- Daily Streak Achievements
INSERT INTO achievements (achievement_identifier, title, description, achievement_type, required_value, reward_wool, reward_coins, reward_experience) VALUES
('streak_7', 'Weekly Commitment', 'Maintain a 7-day daily streak.', 'progress', 7, 25, 100, 200),
('streak_30', 'Monthly Dedication', 'Maintain a 30-day daily streak.', 'progress', 30, 100, 500, 1000),
('streak_100', 'Centennial Commitment', 'Maintain a 100-day daily streak.', 'progress', 100, 500, 2000, 5000),
('streak_365', 'Year-Long Dedication', 'Maintain a 365-day daily streak.', 'progress', 365, 2000, 10000, 20000);

-- Care Achievements
INSERT INTO achievements (achievement_identifier, title, description, achievement_type, required_value, reward_wool, reward_coins, reward_experience) VALUES
('feed_100', 'Caring Farmer', 'Feed llamas 100 times.', 'progress', 100, 25, 100, 250),
('feed_1000', 'Nurturing Farmer', 'Feed llamas 1,000 times.', 'progress', 1000, 100, 500, 1000),
('feed_10000', 'Llama Whisperer', 'Feed llamas 10,000 times.', 'progress', 10000, 500, 2000, 5000);

-- Special Achievements
INSERT INTO achievements (achievement_identifier, title, description, achievement_type, required_value, is_hidden, reward_wool, reward_coins, reward_experience) VALUES
('perfect_llama', 'Perfect Llama', 'Raise a llama to maximum level with perfect stats.', 'special', 1, false, 100, 1000, 2000),
('rainbow_herd', 'Rainbow Herd', 'Own llamas of all available colors.', 'special', 5, false, 200, 500, 1000),
('speed_demon', 'Speed Demon', 'Complete the tutorial in under 10 minutes.', 'special', 1, true, 50, 250, 500),
('early_bird', 'Early Bird', 'Be one of the first 100 players to register.', 'special', 1, false, 500, 1000, 2000),
('secret_discoverer', 'Secret Discoverer', 'Find the hidden secret area on your farm.', 'special', 1, true, 100, 500, 1000);

-- ==========================================================================
-- SAMPLE DATA - For Development and Testing
-- ==========================================================================

-- Sample User (for development/testing only)
INSERT INTO users (id, email, first_name, last_name, is_verified, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'demo@llamawoolfarm.com', 'Demo', 'Player', true, true);

-- Sample Player
INSERT INTO players (id, user_id, username, display_name, level, experience) VALUES
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'demo_player', 'Demo Player', 5, 2500);

-- Sample Game State
INSERT INTO game_states (id, player_id, wool, coins, feed) VALUES
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 150, 250, 75);

-- Sample Llamas
INSERT INTO llamas (id, player_id, game_state_id, name, breed, color, level, position_x, position_y) VALUES
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Fluffy', 'alpaca', 'white', 3, 10, 10),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Cocoa', 'alpaca', 'brown', 2, 15, 12);

-- Sample Buildings
INSERT INTO buildings (id, player_id, game_state_id, type, level, position_x, position_y) VALUES
('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'barn', 2, 5, 5),
('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'pasture', 1, 20, 8);

-- Sample Unlocks
INSERT INTO unlocks (player_id, unlock_type, unlock_identifier) VALUES
('00000000-0000-0000-0000-000000000002', 'building', 'barn'),
('00000000-0000-0000-0000-000000000002', 'building', 'pasture'),
('00000000-0000-0000-0000-000000000002', 'llama_breed', 'alpaca'),
('00000000-0000-0000-0000-000000000002', 'feature', 'breeding');

-- Sample Player Achievements
INSERT INTO player_achievements (player_id, achievement_id, progress, is_completed, completed_at) VALUES
('00000000-0000-0000-0000-000000000002', (SELECT id FROM achievements WHERE achievement_identifier = 'first_wool'), 1, true, NOW()),
('00000000-0000-0000-0000-000000000002', (SELECT id FROM achievements WHERE achievement_identifier = 'first_llama'), 1, true, NOW()),
('00000000-0000-0000-0000-000000000002', (SELECT id FROM achievements WHERE achievement_identifier = 'first_building'), 1, true, NOW()),
('00000000-0000-0000-0000-000000000002', (SELECT id FROM achievements WHERE achievement_identifier = 'wool_apprentice'), 150, true, NOW()),
('00000000-0000-0000-0000-000000000002', (SELECT id FROM achievements WHERE achievement_identifier = 'wool_journeyman'), 150, false, NULL);

-- Sample Player Quests
INSERT INTO player_quests (player_id, quest_id, status, progress, max_progress, completed_at) VALUES
('00000000-0000-0000-0000-000000000002', (SELECT id FROM quests WHERE quest_identifier = 'tutorial_welcome'), 'completed', 100, 100, NOW()),
('00000000-0000-0000-0000-000000000002', (SELECT id FROM quests WHERE quest_identifier = 'tutorial_first_llama'), 'completed', 100, 100, NOW()),
('00000000-0000-0000-0000-000000000002', (SELECT id FROM quests WHERE quest_identifier = 'tutorial_feed_llama'), 'completed', 100, 100, NOW()),
('00000000-0000-0000-0000-000000000002', (SELECT id FROM quests WHERE quest_identifier = 'tutorial_harvest_wool'), 'completed', 100, 100, NOW()),
('00000000-0000-0000-0000-000000000002', (SELECT id FROM quests WHERE quest_identifier = 'tutorial_build_barn'), 'completed', 100, 100, NOW()),
('00000000-0000-0000-0000-000000000002', (SELECT id FROM quests WHERE quest_identifier = 'main_wool_producer'), 'active', 150, 500, NULL);

-- Sample Leaderboard Entry
INSERT INTO leaderboards (player_id, category, current_rank, score, username, display_name, player_level) VALUES
('00000000-0000-0000-0000-000000000002', 'wool_production', 1, 150, 'demo_player', 'Demo Player', 5);

-- ==========================================================================
-- GAME CONFIGURATION VALUES
-- ==========================================================================

-- Note: These would typically be stored in a separate configuration table
-- For now, they're documented as comments for reference

-- RESOURCE PRODUCTION RATES
-- Base wool production: 1 wool per minute per llama
-- Feed consumption: 0.5 feed per minute per llama
-- Happiness affects production: 100% happiness = 100% production rate
-- Level multiplier: Each level increases production by 5%

-- LEVEL PROGRESSION
-- Experience required for level N: (N-1)^2 * 1000
-- Level 1: 0 XP
-- Level 2: 1000 XP
-- Level 3: 4000 XP
-- Level 4: 9000 XP
-- Level 5: 16000 XP
-- etc.

-- BUILDING COSTS AND BENEFITS
-- Barn Level 1: 100 coins, houses 2 llamas
-- Barn Level 2: 200 coins, houses 4 llamas
-- Pasture Level 1: 150 coins, +10% happiness for llamas
-- Mill Level 1: 300 coins, +20% wool production rate
-- Shop Level 1: 250 coins, unlocks trading features

-- LLAMA BREEDS AND TRAITS
-- Alpaca: Balanced stats, good for beginners
-- Huacaya: Higher wool production, lower happiness decay
-- Suri: Premium wool quality, higher coin value
-- Vicuna: Rare breed, exceptional wool quality
-- Guanaco: Hardy breed, lower feed consumption

-- DAILY BONUS REWARDS
-- Day 1: 10 coins
-- Day 2: 5 wool
-- Day 3: 15 coins
-- Day 4: 10 wool
-- Day 5: 25 coins
-- Day 6: 20 wool
-- Day 7: 50 coins + 25 wool + 100 XP

-- ==========================================================================
-- CLEANUP NOTES
-- ==========================================================================

-- Remember to remove or modify sample data for production deployment
-- The demo user and related data are for development purposes only
-- Consider implementing proper data seeding based on environment