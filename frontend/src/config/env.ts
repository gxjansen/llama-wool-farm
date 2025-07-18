/**
 * Environment configuration
 */
export const env = {
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  PROD: process.env['NODE_ENV'] === 'production',
  DEV: process.env['NODE_ENV'] === 'development',
  API_URL: process.env['API_URL'] || 'http://localhost:3001',
  GAME_VERSION: process.env['GAME_VERSION'] || '1.0.0',
  DEBUG: process.env['DEBUG'] === 'true',
  ENABLE_ANALYTICS: process.env['ENABLE_ANALYTICS'] === 'true',
  ENABLE_ERROR_TRACKING: process.env['ENABLE_ERROR_TRACKING'] === 'true',
};

/**
 * Validate environment variables
 */
export function validateEnv(): void {
  // Basic validation - can be expanded as needed
  if (!env.NODE_ENV) {
    console.warn('NODE_ENV is not set, defaulting to development');
  }
}

export default env;