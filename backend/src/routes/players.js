/**
 * Player Management Routes
 * Handles player profiles, game saves, and progress tracking
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/async');
const { PlayerService } = require('../services/PlayerService');
const { GameSaveService } = require('../services/GameSaveService');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

/**
 * @swagger
 * /api/players/profile:
 *   get:
 *     summary: Get player profile
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Player profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlayerProfile'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Player not found
 */
router.get('/profile', 
  auth,
  asyncHandler(async (req, res) => {
    const player = await PlayerService.getProfile(req.user.id);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({
      success: true,
      data: player
    });
  })
);

/**
 * @swagger
 * /api/players/profile:
 *   put:
 *     summary: Update player profile
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *               email:
 *                 type: string
 *                 format: email
 *               preferences:
 *                 type: object
 *                 properties:
 *                   notifications:
 *                     type: boolean
 *                   theme:
 *                     type: string
 *                     enum: [light, dark, auto]
 *                   language:
 *                     type: string
 *                     enum: [en, es, fr, de, ja, ko, zh]
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.put('/profile',
  auth,
  [
    body('username').optional().isLength({ min: 3, max: 20 }).trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('preferences.notifications').optional().isBoolean(),
    body('preferences.theme').optional().isIn(['light', 'dark', 'auto']),
    body('preferences.language').optional().isIn(['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh'])
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const updatedPlayer = await PlayerService.updateProfile(req.user.id, req.body);
    
    res.json({
      success: true,
      data: updatedPlayer,
      message: 'Profile updated successfully'
    });
  })
);

/**
 * @swagger
 * /api/players/save:
 *   post:
 *     summary: Save game progress
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameSave'
 *     responses:
 *       200:
 *         description: Game saved successfully
 *       400:
 *         description: Invalid save data
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: Save data too large
 */
router.post('/save',
  auth,
  [
    body('version').notEmpty().withMessage('Save version is required'),
    body('timestamp').isInt({ min: 0 }).withMessage('Valid timestamp is required'),
    body('woolCounts').isObject().withMessage('Wool counts must be an object'),
    body('buildings').isObject().withMessage('Buildings must be an object'),
    body('playTime').isInt({ min: 0 }).withMessage('Play time must be non-negative')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const saveData = req.body;
    saveData.playerId = req.user.id;
    
    const savedGame = await GameSaveService.saveGame(saveData);
    
    res.json({
      success: true,
      data: {
        saveId: savedGame.id,
        timestamp: savedGame.timestamp,
        version: savedGame.version
      },
      message: 'Game saved successfully'
    });
  })
);

/**
 * @swagger
 * /api/players/save:
 *   get:
 *     summary: Load game progress
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: version
 *         schema:
 *           type: string
 *         description: Specific save version to load
 *     responses:
 *       200:
 *         description: Game loaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameSave'
 *       404:
 *         description: No save data found
 *       401:
 *         description: Unauthorized
 */
router.get('/save',
  auth,
  [
    query('version').optional().isString()
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const saveData = await GameSaveService.loadGame(req.user.id, req.query.version);
    
    if (!saveData) {
      return res.status(404).json({ 
        error: 'No save data found',
        code: 'SAVE_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: saveData
    });
  })
);

/**
 * @swagger
 * /api/players/save/history:
 *   get:
 *     summary: Get save history
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of saves to return
 *     responses:
 *       200:
 *         description: Save history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/save/history',
  auth,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const limit = req.query.limit || 10;
    const saves = await GameSaveService.getSaveHistory(req.user.id, limit);
    
    res.json({
      success: true,
      data: saves,
      pagination: {
        limit,
        total: saves.length
      }
    });
  })
);

/**
 * @swagger
 * /api/players/achievements:
 *   get:
 *     summary: Get player achievements
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Achievements retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/achievements',
  auth,
  asyncHandler(async (req, res) => {
    const achievements = await PlayerService.getAchievements(req.user.id);
    
    res.json({
      success: true,
      data: achievements
    });
  })
);

/**
 * @swagger
 * /api/players/achievements/{achievementId}:
 *   post:
 *     summary: Unlock achievement
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: achievementId
 *         required: true
 *         schema:
 *           type: string
 *         description: Achievement ID to unlock
 *     responses:
 *       200:
 *         description: Achievement unlocked successfully
 *       400:
 *         description: Achievement already unlocked or invalid
 *       401:
 *         description: Unauthorized
 */
router.post('/achievements/:achievementId',
  auth,
  [
    param('achievementId').isString().notEmpty()
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const result = await PlayerService.unlockAchievement(req.user.id, req.params.achievementId);
    
    res.json({
      success: true,
      data: result,
      message: 'Achievement unlocked successfully'
    });
  })
);

/**
 * @swagger
 * /api/players/statistics:
 *   get:
 *     summary: Get player statistics
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/statistics',
  auth,
  asyncHandler(async (req, res) => {
    const stats = await PlayerService.getStatistics(req.user.id);
    
    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * @swagger
 * /api/players/delete:
 *   delete:
 *     summary: Delete player account
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/delete',
  auth,
  asyncHandler(async (req, res) => {
    await PlayerService.deleteAccount(req.user.id);
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  })
);

module.exports = router;