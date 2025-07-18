/**
 * Game State and Mechanics Routes
 * Handles game state, calculations, and real-time updates
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/async');
const { GameStateService } = require('../services/GameStateService');
const { ProductionService } = require('../services/ProductionService');
const { PrestigeService } = require('../services/PrestigeService');
const { OfflineService } = require('../services/OfflineService');
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
 * /api/game/state:
 *   get:
 *     summary: Get current game state
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current game state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameState'
 *       401:
 *         description: Unauthorized
 */
router.get('/state',
  auth,
  asyncHandler(async (req, res) => {
    const gameState = await GameStateService.getState(req.user.id);
    
    res.json({
      success: true,
      data: gameState,
      timestamp: Date.now()
    });
  })
);

/**
 * @swagger
 * /api/game/state:
 *   post:
 *     summary: Update game state
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [click, purchase, upgrade, prestige]
 *               target:
 *                 type: string
 *                 description: Target entity for the action
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity for bulk actions
 *               timestamp:
 *                 type: integer
 *                 description: Client timestamp
 *     responses:
 *       200:
 *         description: Game state updated successfully
 *       400:
 *         description: Invalid action or parameters
 *       401:
 *         description: Unauthorized
 */
router.post('/state',
  auth,
  [
    body('action').isIn(['click', 'purchase', 'upgrade', 'prestige']),
    body('target').optional().isString(),
    body('quantity').optional().isInt({ min: 1 }).toInt(),
    body('timestamp').optional().isInt({ min: 0 })
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { action, target, quantity = 1, timestamp } = req.body;
    
    const result = await GameStateService.performAction(req.user.id, {
      action,
      target,
      quantity,
      timestamp: timestamp || Date.now()
    });
    
    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  })
);

/**
 * @swagger
 * /api/game/production:
 *   get:
 *     summary: Get production statistics
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Production statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductionResult'
 *       401:
 *         description: Unauthorized
 */
router.get('/production',
  auth,
  asyncHandler(async (req, res) => {
    const production = await ProductionService.calculateProduction(req.user.id);
    
    res.json({
      success: true,
      data: production
    });
  })
);

/**
 * @swagger
 * /api/game/buildings:
 *   get:
 *     summary: Get all buildings
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Building information
 *       401:
 *         description: Unauthorized
 */
router.get('/buildings',
  auth,
  asyncHandler(async (req, res) => {
    const buildings = await GameStateService.getBuildings(req.user.id);
    
    res.json({
      success: true,
      data: buildings
    });
  })
);

/**
 * @swagger
 * /api/game/buildings/{buildingType}/purchase:
 *   post:
 *     summary: Purchase building
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [barn, shears, transport, factory, lab, portal, timeMachine, dimensionGate]
 *         description: Type of building to purchase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 1
 *     responses:
 *       200:
 *         description: Building purchased successfully
 *       400:
 *         description: Insufficient resources or invalid building
 *       401:
 *         description: Unauthorized
 */
router.post('/buildings/:buildingType/purchase',
  auth,
  [
    param('buildingType').isIn(['barn', 'shears', 'transport', 'factory', 'lab', 'portal', 'timeMachine', 'dimensionGate']),
    body('quantity').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { buildingType } = req.params;
    const { quantity = 1 } = req.body;
    
    const result = await GameStateService.purchaseBuilding(req.user.id, buildingType, quantity);
    
    res.json({
      success: true,
      data: result,
      message: `Purchased ${quantity} ${buildingType}(s)`
    });
  })
);

/**
 * @swagger
 * /api/game/upgrades:
 *   get:
 *     summary: Get available upgrades
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [production, efficiency, automation, prestige, special]
 *         description: Filter upgrades by category
 *     responses:
 *       200:
 *         description: Available upgrades
 *       401:
 *         description: Unauthorized
 */
router.get('/upgrades',
  auth,
  [
    query('category').optional().isIn(['production', 'efficiency', 'automation', 'prestige', 'special'])
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const upgrades = await GameStateService.getUpgrades(req.user.id, req.query.category);
    
    res.json({
      success: true,
      data: upgrades
    });
  })
);

/**
 * @swagger
 * /api/game/upgrades/{upgradeId}/purchase:
 *   post:
 *     summary: Purchase upgrade
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: upgradeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Upgrade ID to purchase
 *     responses:
 *       200:
 *         description: Upgrade purchased successfully
 *       400:
 *         description: Insufficient resources or upgrade already owned
 *       401:
 *         description: Unauthorized
 */
router.post('/upgrades/:upgradeId/purchase',
  auth,
  [
    param('upgradeId').isString().notEmpty()
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { upgradeId } = req.params;
    
    const result = await GameStateService.purchaseUpgrade(req.user.id, upgradeId);
    
    res.json({
      success: true,
      data: result,
      message: 'Upgrade purchased successfully'
    });
  })
);

/**
 * @swagger
 * /api/game/prestige:
 *   get:
 *     summary: Get prestige information
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prestige information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrestigeData'
 *       401:
 *         description: Unauthorized
 */
router.get('/prestige',
  auth,
  asyncHandler(async (req, res) => {
    const prestigeData = await PrestigeService.getPrestigeData(req.user.id);
    
    res.json({
      success: true,
      data: prestigeData
    });
  })
);

/**
 * @swagger
 * /api/game/prestige:
 *   post:
 *     summary: Perform prestige
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prestige performed successfully
 *       400:
 *         description: Requirements not met for prestige
 *       401:
 *         description: Unauthorized
 */
router.post('/prestige',
  auth,
  asyncHandler(async (req, res) => {
    const result = await PrestigeService.performPrestige(req.user.id);
    
    res.json({
      success: true,
      data: result,
      message: 'Prestige completed successfully'
    });
  })
);

/**
 * @swagger
 * /api/game/offline:
 *   get:
 *     summary: Get offline progress
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Offline progress data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OfflineProgress'
 *       401:
 *         description: Unauthorized
 */
router.get('/offline',
  auth,
  asyncHandler(async (req, res) => {
    const offlineProgress = await OfflineService.calculateOfflineProgress(req.user.id);
    
    res.json({
      success: true,
      data: offlineProgress
    });
  })
);

/**
 * @swagger
 * /api/game/offline/claim:
 *   post:
 *     summary: Claim offline progress
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Offline progress claimed successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/offline/claim',
  auth,
  asyncHandler(async (req, res) => {
    const result = await OfflineService.claimOfflineProgress(req.user.id);
    
    res.json({
      success: true,
      data: result,
      message: 'Offline progress claimed successfully'
    });
  })
);

/**
 * @swagger
 * /api/game/click:
 *   post:
 *     summary: Register manual click
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               x:
 *                 type: number
 *                 description: Click X coordinate
 *               y:
 *                 type: number
 *                 description: Click Y coordinate
 *               timestamp:
 *                 type: integer
 *                 description: Client timestamp
 *     responses:
 *       200:
 *         description: Click registered successfully
 *       400:
 *         description: Invalid click data
 *       401:
 *         description: Unauthorized
 */
router.post('/click',
  auth,
  [
    body('x').optional().isNumeric(),
    body('y').optional().isNumeric(),
    body('timestamp').optional().isInt({ min: 0 })
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { x, y, timestamp } = req.body;
    
    const result = await GameStateService.registerClick(req.user.id, {
      x, y, timestamp: timestamp || Date.now()
    });
    
    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @swagger
 * /api/game/config:
 *   get:
 *     summary: Get game configuration
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Game configuration data
 *       401:
 *         description: Unauthorized
 */
router.get('/config',
  auth,
  asyncHandler(async (req, res) => {
    const config = await GameStateService.getGameConfig(req.user.id);
    
    res.json({
      success: true,
      data: config
    });
  })
);

module.exports = router;