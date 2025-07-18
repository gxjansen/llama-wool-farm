import { supabase, supabaseAdmin } from '../config/supabase';
import { Player, Game, Achievement } from '../types';
import { CustomError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

export interface PlayerFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreatePlayerData {
  username: string;
  email: string;
  password: string;
  avatar_url?: string;
}

export interface UpdatePlayerData {
  username?: string;
  email?: string;
  avatar_url?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class PlayerService {
  /**
   * Get all players with optional filtering and pagination
   */
  async getPlayers(filters: PlayerFilters = {}): Promise<{ players: Player[]; total: number }> {
    const { page = 1, limit = 10, search } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('players')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply search filter
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: players, error, count } = await query;

    if (error) {
      throw new CustomError(
        `Failed to fetch players: ${error.message}`,
        500,
        true,
        'PLAYERS_FETCH_ERROR'
      );
    }

    return {
      players: players || [],
      total: count || 0,
    };
  }

  /**
   * Get a specific player by ID
   */
  async getPlayer(id: string): Promise<Player | null> {
    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Player not found
      }
      throw new CustomError(
        `Failed to fetch player: ${error.message}`,
        500,
        true,
        'PLAYER_FETCH_ERROR'
      );
    }

    return player;
  }

  /**
   * Create a new player
   */
  async createPlayer(playerData: CreatePlayerData): Promise<Player> {
    const { username, email, password, avatar_url } = playerData;

    // Check if username or email already exists
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id, username, email')
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (existingPlayer) {
      if (existingPlayer.username === username) {
        throw new CustomError(
          'Username already exists',
          409,
          true,
          'USERNAME_EXISTS'
        );
      }
      if (existingPlayer.email === email) {
        throw new CustomError(
          'Email already exists',
          409,
          true,
          'EMAIL_EXISTS'
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create player in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        avatar_url,
      },
    });

    if (authError) {
      throw new CustomError(
        `Failed to create auth user: ${authError.message}`,
        500,
        true,
        'AUTH_CREATE_ERROR'
      );
    }

    // Create player in players table
    const { data: player, error } = await supabase
      .from('players')
      .insert([
        {
          id: authData.user.id,
          username,
          email,
          password_hash: hashedPassword,
          avatar_url,
          total_score: 0,
          games_played: 0,
          achievements_earned: 0,
          role: 'player',
        },
      ])
      .select('*')
      .single();

    if (error) {
      // Cleanup auth user if player creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new CustomError(
        `Failed to create player: ${error.message}`,
        500,
        true,
        'PLAYER_CREATE_ERROR'
      );
    }

    return player;
  }

  /**
   * Update a player
   */
  async updatePlayer(id: string, updates: UpdatePlayerData): Promise<Player | null> {
    // Check if username already exists (if being updated)
    if (updates.username) {
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('username', updates.username)
        .neq('id', id)
        .single();

      if (existingPlayer) {
        throw new CustomError(
          'Username already exists',
          409,
          true,
          'USERNAME_EXISTS'
        );
      }
    }

    const { data: player, error } = await supabase
      .from('players')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Player not found
      }
      throw new CustomError(
        `Failed to update player: ${error.message}`,
        500,
        true,
        'PLAYER_UPDATE_ERROR'
      );
    }

    return player;
  }

  /**
   * Get player's games
   */
  async getPlayerGames(
    playerId: string,
    options: PaginationOptions
  ): Promise<{ games: Game[]; total: number }> {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { data: games, error, count } = await supabase
      .from('games')
      .select('*', { count: 'exact' })
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new CustomError(
        `Failed to fetch player games: ${error.message}`,
        500,
        true,
        'PLAYER_GAMES_FETCH_ERROR'
      );
    }

    return {
      games: games || [],
      total: count || 0,
    };
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(playerId: string): Promise<any | null> {
    const player = await this.getPlayer(playerId);
    if (!player) {
      return null;
    }

    // Get game statistics
    const { data: gameStats, error: gameError } = await supabase
      .from('games')
      .select(`
        state,
        score,
        wool_collected,
        play_time,
        difficulty,
        created_at
      `)
      .eq('player_id', playerId);

    if (gameError) {
      throw new CustomError(
        `Failed to fetch player game stats: ${gameError.message}`,
        500,
        true,
        'PLAYER_STATS_FETCH_ERROR'
      );
    }

    const games = gameStats || [];
    const completedGames = games.filter(game => game.state === 'completed');
    const totalScore = games.reduce((sum, game) => sum + (game.score || 0), 0);
    const totalWool = games.reduce((sum, game) => sum + (game.wool_collected || 0), 0);
    const totalPlayTime = games.reduce((sum, game) => sum + (game.play_time || 0), 0);

    // Calculate difficulty distribution
    const difficultyStats = games.reduce((acc, game) => {
      acc[game.difficulty] = (acc[game.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average score
    const averageScore = completedGames.length > 0 
      ? totalScore / completedGames.length 
      : 0;

    return {
      player: {
        id: player.id,
        username: player.username,
        email: player.email,
        avatar_url: player.avatar_url,
        created_at: player.created_at,
      },
      stats: {
        total_games: games.length,
        completed_games: completedGames.length,
        active_games: games.filter(game => game.state === 'active').length,
        total_score: totalScore,
        average_score: Math.round(averageScore),
        total_wool_collected: totalWool,
        total_play_time: totalPlayTime,
        difficulty_distribution: difficultyStats,
      },
    };
  }

  /**
   * Award achievement to player
   */
  async awardAchievement(
    playerId: string,
    achievementId: string,
    gameId?: string
  ): Promise<Achievement> {
    // Check if player already has this achievement
    const { data: existing } = await supabase
      .from('player_achievements')
      .select('*')
      .eq('player_id', playerId)
      .eq('achievement_id', achievementId)
      .single();

    if (existing) {
      throw new CustomError(
        'Player already has this achievement',
        409,
        true,
        'ACHIEVEMENT_EXISTS'
      );
    }

    // Award achievement
    const { data: achievement, error } = await supabase
      .from('player_achievements')
      .insert([
        {
          player_id: playerId,
          achievement_id: achievementId,
          game_id: gameId,
          earned_at: new Date().toISOString(),
        },
      ])
      .select(`
        *,
        achievements:achievement_id (
          id,
          name,
          description,
          icon,
          points
        )
      `)
      .single();

    if (error) {
      throw new CustomError(
        `Failed to award achievement: ${error.message}`,
        500,
        true,
        'ACHIEVEMENT_AWARD_ERROR'
      );
    }

    // Update player's achievement count
    await this.updatePlayer(playerId, {
      achievements_earned: (await this.getPlayer(playerId))?.achievements_earned + 1,
    });

    return achievement;
  }

  /**
   * Get player's achievements
   */
  async getPlayerAchievements(playerId: string): Promise<Achievement[]> {
    const { data: achievements, error } = await supabase
      .from('player_achievements')
      .select(`
        *,
        achievements:achievement_id (
          id,
          name,
          description,
          icon,
          points
        )
      `)
      .eq('player_id', playerId)
      .order('earned_at', { ascending: false });

    if (error) {
      throw new CustomError(
        `Failed to fetch player achievements: ${error.message}`,
        500,
        true,
        'PLAYER_ACHIEVEMENTS_FETCH_ERROR'
      );
    }

    return achievements || [];
  }

  /**
   * Delete a player
   */
  async deletePlayer(id: string): Promise<boolean> {
    // Delete from auth first
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      throw new CustomError(
        `Failed to delete auth user: ${authError.message}`,
        500,
        true,
        'AUTH_DELETE_ERROR'
      );
    }

    // Delete from players table (should cascade to related tables)
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);

    if (error) {
      throw new CustomError(
        `Failed to delete player: ${error.message}`,
        500,
        true,
        'PLAYER_DELETE_ERROR'
      );
    }

    return true;
  }
}