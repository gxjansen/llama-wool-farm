/**
 * Player Service
 * Handles player management and authentication using Supabase
 */

const { getSupabaseClient } = require('../config/supabase');
const { logger } = require('../utils/logger');
const { SupabaseHelpers } = require('../utils/supabase-helpers');

class PlayerService {
  /**
   * Create a new player profile
   */
  static async createPlayer(userData) {
    try {
      const supabase = getSupabaseClient();
      
      const playerData = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        avatar_url: userData.avatar_url,
        display_name: userData.display_name || userData.username,
        level: 1,
        experience: 0,
        total_wool_produced: '0',
        total_clicks: 0,
        total_prestiges: 0,
        total_play_time: 0,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        preferences: {
          theme: 'default',
          notifications: true,
          privacy: 'friends',
          language: 'en'
        },
        statistics: {
          sessions: 0,
          achievements_unlocked: 0,
          buildings_purchased: 0,
          upgrades_purchased: 0
        }
      };

      const { data: player, error } = await supabase
        .from('players')
        .insert(playerData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Player already exists');
        }
        throw error;
      }

      logger.info(`Created new player: ${player.id}`);
      return player;
    } catch (error) {
      logger.error('Error creating player:', error);
      throw error;
    }
  }

  /**
   * Get player profile
   */
  static async getPlayer(playerId) {
    try {
      const supabase = getSupabaseClient();
      
      const { data: player, error } = await supabase
        .from('players')
        .select(`
          *,
          friends:player_friends!player_id(
            friend:players!friend_id(id, username, display_name, avatar_url, level)
          ),
          achievements:player_achievements(
            achievement_id,
            unlocked_at,
            progress
          )
        `)
        .eq('id', playerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Player not found');
        }
        throw error;
      }

      return this.formatPlayerData(player);
    } catch (error) {
      logger.error('Error getting player:', error);
      throw error;
    }
  }

  /**
   * Update player profile
   */
  static async updatePlayer(playerId, updateData) {
    try {
      const supabase = getSupabaseClient();
      
      const allowedFields = [
        'username', 'display_name', 'avatar_url', 'preferences',
        'level', 'experience', 'total_wool_produced', 'total_clicks',
        'total_prestiges', 'total_play_time', 'statistics'
      ];

      const filteredData = {};
      for (const field of allowedFields) {
        if (updateData.hasOwnProperty(field)) {
          filteredData[field] = updateData[field];
        }
      }

      filteredData.updated_at = new Date().toISOString();

      const { data: player, error } = await supabase
        .from('players')
        .update(filteredData)
        .eq('id', playerId)
        .select()
        .single();

      if (error) throw error;

      // Broadcast player update
      await this.broadcastPlayerUpdate(playerId, player);

      return player;
    } catch (error) {
      logger.error('Error updating player:', error);
      throw error;
    }
  }

  /**
   * Update player login timestamp
   */
  static async updateLastLogin(playerId) {
    try {
      const supabase = getSupabaseClient();
      
      await supabase
        .from('players')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId);

      logger.debug(`Updated last login for player ${playerId}`);
    } catch (error) {
      logger.error('Error updating last login:', error);
      // Don't throw error, this is not critical
    }
  }

  /**
   * Get player statistics
   */
  static async getPlayerStats(playerId) {
    try {
      const supabase = getSupabaseClient();
      
      const { data: stats, error } = await supabase
        .from('players')
        .select(`
          level,
          experience,
          total_wool_produced,
          total_clicks,
          total_prestiges,
          total_play_time,
          statistics,
          created_at,
          last_login
        `)
        .eq('id', playerId)
        .single();

      if (error) throw error;

      // Get additional stats from game state
      const { data: gameState } = await supabase
        .from('game_states')
        .select('wool_counts, total_clicks, total_prestiges')
        .eq('player_id', playerId)
        .single();

      return {
        ...stats,
        current_wool: gameState?.wool_counts || {},
        rank: await this.getPlayerRank(playerId),
        achievements_count: await this.getAchievementsCount(playerId),
        buildings_count: await this.getBuildingsCount(playerId)
      };
    } catch (error) {
      logger.error('Error getting player stats:', error);
      throw error;
    }
  }

  /**
   * Get player leaderboard position
   */
  static async getPlayerRank(playerId) {
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase.rpc('get_player_rank', {
        p_player_id: playerId
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      logger.warn('Error getting player rank:', error);
      return 0;
    }
  }

  /**
   * Get achievements count for player
   */
  static async getAchievementsCount(playerId) {
    try {
      const supabase = getSupabaseClient();
      
      const { count, error } = await supabase
        .from('player_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', playerId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      logger.warn('Error getting achievements count:', error);
      return 0;
    }
  }

  /**
   * Get buildings count for player
   */
  static async getBuildingsCount(playerId) {
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('game_buildings')
        .select('level')
        .eq('player_id', playerId)
        .gt('level', 0);

      if (error) throw error;
      
      return data?.reduce((total, building) => total + building.level, 0) || 0;
    } catch (error) {
      logger.warn('Error getting buildings count:', error);
      return 0;
    }
  }

  /**
   * Search players
   */
  static async searchPlayers(query, limit = 10) {
    try {
      const supabase = getSupabaseClient();
      
      const { data: players, error } = await supabase
        .from('players')
        .select('id, username, display_name, avatar_url, level, total_wool_produced')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .order('level', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return players || [];
    } catch (error) {
      logger.error('Error searching players:', error);
      throw error;
    }
  }

  /**
   * Get top players for leaderboard
   */
  static async getTopPlayers(category = 'wool', limit = 100) {
    try {
      const supabase = getSupabaseClient();
      
      const orderBy = this.getLeaderboardOrderBy(category);
      
      const { data: players, error } = await supabase
        .from('players')
        .select('id, username, display_name, avatar_url, level, total_wool_produced, total_clicks, total_prestiges')
        .order(orderBy.field, { ascending: orderBy.ascending })
        .limit(limit);

      if (error) throw error;
      
      return players?.map((player, index) => ({
        ...player,
        rank: index + 1
      })) || [];
    } catch (error) {
      logger.error('Error getting top players:', error);
      throw error;
    }
  }

  /**
   * Add friend
   */
  static async addFriend(playerId, friendId) {
    try {
      const supabase = getSupabaseClient();
      
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('player_friends')
        .select('*')
        .eq('player_id', playerId)
        .eq('friend_id', friendId)
        .single();

      if (existing) {
        throw new Error('Already friends');
      }

      // Create friendship (bidirectional)
      const { error } = await supabase
        .from('player_friends')
        .insert([
          { player_id: playerId, friend_id: friendId },
          { player_id: friendId, friend_id: playerId }
        ]);

      if (error) throw error;

      logger.info(`Added friendship between ${playerId} and ${friendId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error adding friend:', error);
      throw error;
    }
  }

  /**
   * Remove friend
   */
  static async removeFriend(playerId, friendId) {
    try {
      const supabase = getSupabaseClient();
      
      // Remove friendship (bidirectional)
      const { error } = await supabase
        .from('player_friends')
        .delete()
        .or(`and(player_id.eq.${playerId},friend_id.eq.${friendId}),and(player_id.eq.${friendId},friend_id.eq.${playerId})`);

      if (error) throw error;

      logger.info(`Removed friendship between ${playerId} and ${friendId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error removing friend:', error);
      throw error;
    }
  }

  /**
   * Get player friends
   */
  static async getFriends(playerId) {
    try {
      const supabase = getSupabaseClient();
      
      const { data: friends, error } = await supabase
        .from('player_friends')
        .select(`
          friend:players!friend_id(
            id,
            username,
            display_name,
            avatar_url,
            level,
            total_wool_produced,
            last_login
          )
        `)
        .eq('player_id', playerId);

      if (error) throw error;
      
      return friends?.map(f => f.friend) || [];
    } catch (error) {
      logger.error('Error getting friends:', error);
      throw error;
    }
  }

  /**
   * Delete player account
   */
  static async deletePlayer(playerId) {
    try {
      const supabase = getSupabaseClient();
      
      // This will cascade delete all related records
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;

      logger.info(`Deleted player account: ${playerId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting player:', error);
      throw error;
    }
  }

  /**
   * Broadcast player update via real-time
   */
  static async broadcastPlayerUpdate(playerId, playerData) {
    try {
      const supabase = getSupabaseClient();
      
      await supabase.channel(`player_${playerId}`)
        .send({
          type: 'broadcast',
          event: 'player_updated',
          payload: playerData
        });
    } catch (error) {
      logger.warn('Error broadcasting player update:', error);
    }
  }

  // Helper methods
  static getLeaderboardOrderBy(category) {
    const categories = {
      wool: { field: 'total_wool_produced', ascending: false },
      clicks: { field: 'total_clicks', ascending: false },
      prestiges: { field: 'total_prestiges', ascending: false },
      level: { field: 'level', ascending: false },
      playtime: { field: 'total_play_time', ascending: false }
    };

    return categories[category] || categories.wool;
  }

  static formatPlayerData(player) {
    return {
      ...player,
      friends: player.friends?.map(f => f.friend) || [],
      achievements: player.achievements || []
    };
  }
}

module.exports = { PlayerService };