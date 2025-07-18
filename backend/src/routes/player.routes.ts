import express from 'express';
import { body, param, query } from 'express-validator';
import { PlayerService } from '../services/player.service';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const playerService = new PlayerService();

// Validation middleware
const validatePlayerCreation = [
  body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('avatar_url').optional().isURL().withMessage('Avatar URL must be a valid URL'),
];

const validatePlayerUpdate = [
  param('id').isUUID().withMessage('Player ID must be a valid UUID'),
  body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('avatar_url').optional().isURL().withMessage('Avatar URL must be a valid URL'),
];

const validatePlayerId = [
  param('id').isUUID().withMessage('Player ID must be a valid UUID'),
];

// GET /api/players - Get all players with pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
], async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await playerService.getPlayers({
      page,
      limit,
      search,
    });

    res.json({
      success: true,
      data: result.players,
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

// GET /api/players/:id - Get a specific player
router.get('/:id', validatePlayerId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const player = await playerService.getPlayer(id);

    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
      });
    }

    res.json({
      success: true,
      data: player,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/players - Create a new player
router.post('/', validatePlayerCreation, async (req, res, next) => {
  try {
    const { username, email, password, avatar_url } = req.body;

    const player = await playerService.createPlayer({
      username,
      email,
      password,
      avatar_url,
    });

    res.status(201).json({
      success: true,
      data: player,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/players/:id - Update a player
router.put('/:id', authMiddleware, validatePlayerUpdate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const player = await playerService.updatePlayer(id, updates);

    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
      });
    }

    res.json({
      success: true,
      data: player,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/players/:id/games - Get player's games
router.get('/:id/games', validatePlayerId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await playerService.getPlayerGames(id, { page, limit });

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

// GET /api/players/:id/stats - Get player statistics
router.get('/:id/stats', validatePlayerId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await playerService.getPlayerStats(id);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/players/:id/achievements - Award achievement to player
router.post('/:id/achievements', [
  authMiddleware,
  param('id').isUUID().withMessage('Player ID must be a valid UUID'),
  body('achievement_id').isUUID().withMessage('Achievement ID must be a valid UUID'),
  body('game_id').optional().isUUID().withMessage('Game ID must be a valid UUID'),
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { achievement_id, game_id } = req.body;

    const achievement = await playerService.awardAchievement(id, achievement_id, game_id);

    res.status(201).json({
      success: true,
      data: achievement,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/players/:id/achievements - Get player's achievements
router.get('/:id/achievements', validatePlayerId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const achievements = await playerService.getPlayerAchievements(id);

    res.json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/players/:id - Delete a player
router.delete('/:id', authMiddleware, validatePlayerId, async (req, res, next) => {
  try {
    const { id } = req.params;

    const success = await playerService.deletePlayer(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
      });
    }

    res.json({
      success: true,
      message: 'Player deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;