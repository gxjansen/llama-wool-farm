import express from 'express';
import { body, param, query } from 'express-validator';
import { GameService } from '../services/game.service';
import { authMiddleware } from '../middleware/auth';
import { GameState } from '../types';

const router = express.Router();
const gameService = new GameService();

// Validation middleware
const validateGameCreation = [
  body('player_id').isUUID().withMessage('Player ID must be a valid UUID'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
  body('seed').optional().isInt({ min: 0 }).withMessage('Seed must be a positive integer'),
];

const validateGameUpdate = [
  param('id').isUUID().withMessage('Game ID must be a valid UUID'),
  body('state').optional().isIn(['active', 'paused', 'completed']).withMessage('Invalid game state'),
  body('score').optional().isInt({ min: 0 }).withMessage('Score must be a positive integer'),
  body('wool_collected').optional().isInt({ min: 0 }).withMessage('Wool collected must be a positive integer'),
];

const validateGameId = [
  param('id').isUUID().withMessage('Game ID must be a valid UUID'),
];

// GET /api/games - Get all games with pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('player_id').optional().isUUID().withMessage('Player ID must be a valid UUID'),
  query('state').optional().isIn(['active', 'paused', 'completed']).withMessage('Invalid game state'),
], async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const playerId = req.query.player_id as string;
    const state = req.query.state as GameState;

    const result = await gameService.getGames({
      page,
      limit,
      playerId,
      state,
    });

    res.json({
      success: true,
      data: result.games,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/games/:id - Get a specific game
router.get('/:id', validateGameId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const game = await gameService.getGame(id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    res.json({
      success: true,
      data: game,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/games - Create a new game
router.post('/', validateGameCreation, async (req, res, next) => {
  try {
    const { player_id, difficulty = 'medium', seed } = req.body;

    const game = await gameService.createGame({
      player_id,
      difficulty,
      seed,
    });

    res.status(201).json({
      success: true,
      data: game,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/games/:id - Update a game
router.put('/:id', validateGameUpdate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const game = await gameService.updateGame(id, updates);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    res.json({
      success: true,
      data: game,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/games/:id/actions - Perform game actions
router.post('/:id/actions', [
  param('id').isUUID().withMessage('Game ID must be a valid UUID'),
  body('action').isIn(['collect_wool', 'feed_llama', 'upgrade_farm', 'save_game']).withMessage('Invalid action'),
  body('data').optional().isObject().withMessage('Action data must be an object'),
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, data } = req.body;

    const result = await gameService.performAction(id, action, data);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/games/:id/leaderboard - Get leaderboard for a game
router.get('/:id/leaderboard', validateGameId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const leaderboard = await gameService.getLeaderboard(id, limit);

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/games/:id - Delete a game
router.delete('/:id', authMiddleware, validateGameId, async (req, res, next) => {
  try {
    const { id } = req.params;

    const success = await gameService.deleteGame(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    res.json({
      success: true,
      message: 'Game deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;