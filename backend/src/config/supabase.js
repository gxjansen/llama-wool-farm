/**
 * Supabase Client Configuration
 * Handles Supabase initialization and client management
 */

const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

class SupabaseConfig {
  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Supabase client
   */
  async initialize() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing required Supabase environment variables');
      }

      // Create client with service role key for server-side operations
      this.client = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        },
        global: {
          headers: {
            'x-application-name': 'llama-wool-farm-api'
          }
        }
      });

      // Test connection
      const { data, error } = await this.client.from('players').select('id').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 means table doesn't exist, which is ok
        throw error;
      }

      this.isInitialized = true;
      logger.info('✅ Supabase client initialized successfully');
      
      return this.client;
    } catch (error) {
      logger.error('❌ Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  /**
   * Get Supabase client instance
   */
  getClient() {
    if (!this.isInitialized || !this.client) {
      throw new Error('Supabase client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Create client with user session (for authenticated requests)
   */
  createClientWithAuth(accessToken) {
    if (!this.isInitialized) {
      throw new Error('Supabase client not initialized');
    }

    return createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-application-name': 'llama-wool-farm-api'
          }
        }
      }
    );
  }

  /**
   * Get database schema version
   */
  async getSchemaVersion() {
    try {
      const { data, error } = await this.client.rpc('get_schema_version');
      if (error) throw error;
      return data;
    } catch (error) {
      logger.warn('Could not get schema version:', error.message);
      return null;
    }
  }

  /**
   * Health check for Supabase connection
   */
  async healthCheck() {
    try {
      const { data, error } = await this.client.from('players').select('count').limit(1);
      return { healthy: !error, error: error?.message };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Close connections and cleanup
   */
  async cleanup() {
    try {
      if (this.client) {
        // Close realtime connections
        this.client.realtime.disconnect();
        this.client = null;
        this.isInitialized = false;
        logger.info('🔌 Supabase client disconnected');
      }
    } catch (error) {
      logger.error('Error during Supabase cleanup:', error);
    }
  }
}

// Create singleton instance
const supabaseConfig = new SupabaseConfig();

module.exports = {
  supabaseConfig,
  getSupabaseClient: () => supabaseConfig.getClient(),
  initializeSupabase: () => supabaseConfig.initialize(),
  createClientWithAuth: (token) => supabaseConfig.createClientWithAuth(token)
};