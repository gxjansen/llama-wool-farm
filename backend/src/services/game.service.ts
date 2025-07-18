import { supabase } from '../config/supabase';
import { Game, GameState, GameDifficulty, GameAction } from '../types';
import { CustomError } from '../middleware/errorHandler';

export interface GameFilters {
  page?: number;
  limit?: number;
  playerId?: string;
  state?: GameState;
}

export interface CreateGameData {
  player_id: string;
  difficulty?: GameDifficulty;
  seed?: number;
}

export interface UpdateGameData {
  state?: GameState;
  score?: number;
  wool_collected?: number;
  play_time?: number;
  game_data?: any;
}

export class GameService {
  /**
   * Get all games with optional filtering and pagination
   */
  async getGames(filters: GameFilters = {}): Promise<{ games: Game[]; total: number }> {
    const { page = 1, limit = 10, playerId, state } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('games')
      .select(`
        *,
        players:player_id (
          id,
          username,
          email,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (playerId) {
      query = query.eq('player_id', playerId);
    }

    if (state) {
      query = query.eq('state', state);
    }

    const { data: games, error, count } = await query;

    if (error) {
      throw new CustomError(
        `Failed to fetch games: ${error.message}`,
        500,
        true,
        'GAMES_FETCH_ERROR'
      );
    }

    return {
      games: games || [],
      total: count || 0,
    };
  }

  /**
   * Get a specific game by ID
   */
  async getGame(id: string): Promise<Game | null> {
    const { data: game, error } = await supabase
      .from('games')
      .select(`
        *,
        players:player_id (
          id,
          username,
          email,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Game not found
      }
      throw new CustomError(
        `Failed to fetch game: ${error.message}`,
        500,
        true,
        'GAME_FETCH_ERROR'
      );
    }

    return game;
  }

  /**
   * Create a new game
   */
  async createGame(gameData: CreateGameData): Promise<Game> {
    const { player_id, difficulty = 'medium', seed } = gameData;

    // Verify player exists
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('id', player_id)
      .single();

    if (playerError || !player) {
      throw new CustomError(
        'Player not found',
        404,
        true,
        'PLAYER_NOT_FOUND'
      );
    }

    // Generate game seed if not provided
    const gameSeed = seed || Math.floor(Math.random() * 1000000);

    const { data: game, error } = await supabase
      .from('games')
      .insert([
        {
          player_id,
          difficulty,
          seed: gameSeed,
          state: 'active',
          score: 0,
          wool_collected: 0,
          play_time: 0,
          game_data: {
            llamas: [],
            buildings: [],
            upgrades: [],
            resources: {
              wool: 0,
              coins: 100,
              food: 50,
            },
          },
        },
      ])
      .select(`
        *,
        players:player_id (
          id,
          username,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      throw new CustomError(
        `Failed to create game: ${error.message}`,
        500,
        true,
        'GAME_CREATE_ERROR'
      );
    }

    return game;
  }

  /**
   * Update a game
   */
  async updateGame(id: string, updates: UpdateGameData): Promise<Game | null> {
    const { data: game, error } = await supabase
      .from('games')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        players:player_id (
          id,
          username,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Game not found
      }
      throw new CustomError(
        `Failed to update game: ${error.message}`,
        500,
        true,
        'GAME_UPDATE_ERROR'
      );
    }

    return game;
  }

  /**
   * Perform a game action
   */
  async performAction(gameId: string, action: GameAction, data?: any): Promise<any> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new CustomError('Game not found', 404, true, 'GAME_NOT_FOUND');
    }

    if (game.state !== 'active') {
      throw new CustomError('Game is not active', 400, true, 'GAME_NOT_ACTIVE');
    }

    let result: any = {};
    const gameData = game.game_data || {};

    switch (action) {
      case 'collect_wool':
        result = await this.collectWool(gameId, gameData, data);
        break;
      case 'feed_llama':
        result = await this.feedLlama(gameId, gameData, data);
        break;
      case 'upgrade_farm':
        result = await this.upgradeFarm(gameId, gameData, data);
        break;
      case 'save_game':
        result = await this.saveGame(gameId, data);
        break;
      default:
        throw new CustomError('Invalid action', 400, true, 'INVALID_ACTION');
    }

    return result;
  }

  /**
   * Get leaderboard for a game
   */
  async getLeaderboard(gameId: string, limit: number = 10): Promise<any[]> {
    const { data: leaderboard, error } = await supabase
      .from('games')
      .select(`
        id,
        score,
        wool_collected,
        play_time,
        difficulty,
        players:player_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('state', 'completed')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      throw new CustomError(
        `Failed to fetch leaderboard: ${error.message}`,
        500,
        true,
        'LEADERBOARD_FETCH_ERROR'
      );
    }

    return leaderboard || [];
  }

  /**
   * Delete a game
   */
  async deleteGame(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', id);

    if (error) {
      throw new CustomError(
        `Failed to delete game: ${error.message}`,
        500,
        true,
        'GAME_DELETE_ERROR'
      );
    }

    return true;
  }

  // Private helper methods for game actions
  private async collectWool(gameId: string, gameData: any, data: any): Promise<any> {
    const { llamaId } = data;
    const woolCollected = Math.floor(Math.random() * 5) + 1;

    gameData.resources = gameData.resources || {};
    gameData.resources.wool = (gameData.resources.wool || 0) + woolCollected;

    await this.updateGame(gameId, {
      wool_collected: (gameData.resources.wool || 0) + woolCollected,
      game_data: gameData,
    });

    return {
      action: 'collect_wool',
      wool_collected: woolCollected,
      total_wool: gameData.resources.wool,
    };
  }

  private async feedLlama(gameId: string, gameData: any, data: any): Promise<any> {
    const { llamaId, foodAmount } = data;

    gameData.resources = gameData.resources || {};
    gameData.resources.food = (gameData.resources.food || 0) - foodAmount;

    await this.updateGame(gameId, {
      game_data: gameData,
    });

    return {
      action: 'feed_llama',
      llama_id: llamaId,
      food_used: foodAmount,
      remaining_food: gameData.resources.food,
    };
  }

  private async upgradeFarm(gameId: string, gameData: any, data: any): Promise<any> {
    const { upgradeType, cost } = data;

    gameData.resources = gameData.resources || {};
    gameData.resources.coins = (gameData.resources.coins || 0) - cost;
    gameData.upgrades = gameData.upgrades || [];
    gameData.upgrades.push({
      type: upgradeType,
      timestamp: new Date().toISOString(),
    });

    await this.updateGame(gameId, {
      game_data: gameData,
    });

    return {
      action: 'upgrade_farm',
      upgrade_type: upgradeType,
      cost,
      remaining_coins: gameData.resources.coins,
    };
  }

  private async saveGame(gameId: string, data: any): Promise<any> {
    await this.updateGame(gameId, {
      game_data: data,
    });

    return {
      action: 'save_game',
      saved_at: new Date().toISOString(),
    };
  }
}