import express from 'express';
import gameRoutes from './game.routes';
import playerRoutes from './player.routes';

const router = express.Router();

// API version info
router.get('/', (req, res) => {
  res.json({
    name: 'Llama Wool Farm API',
    version: '1.0.0',
    description: 'RESTful API for the Llama Wool Farm game',
    endpoints: {
      health: '/health',
      players: '/api/players',
      games: '/api/games',
      docs: '/api/docs',
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount route modules
router.use('/players', playerRoutes);
router.use('/games', gameRoutes);

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    swagger: '2.0',
    info: {
      title: 'Llama Wool Farm API',
      version: '1.0.0',
      description: 'Game API for managing players and game sessions',
    },
    host: req.get('host'),
    basePath: '/api',
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    paths: {
      '/players': {
        get: {
          summary: 'Get all players',
          description: 'Retrieve a list of all players with pagination',
          parameters: [
            { name: 'page', in: 'query', type: 'integer', description: 'Page number' },
            { name: 'limit', in: 'query', type: 'integer', description: 'Items per page' },
          ],
        },
        post: {
          summary: 'Create a new player',
          description: 'Create a new player account',
        },
      },
      '/games': {
        get: {
          summary: 'Get all games',
          description: 'Retrieve a list of all game sessions',
        },
        post: {
          summary: 'Create a new game',
          description: 'Start a new game session',
        },
      },
    },
  });
});

export default router;