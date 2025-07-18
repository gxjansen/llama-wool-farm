// Database types for Supabase integration
export interface Database {
  public: {
    Tables: {
      players: {
        Row: Player;
        Insert: Omit<Player, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Player, 'id' | 'created_at'>>;
      };
      games: {
        Row: Game;
        Insert: Omit<Game, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Game, 'id' | 'created_at'>>;
      };
      achievements: {
        Row: Achievement;
        Insert: Omit<Achievement, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Achievement, 'id' | 'created_at'>>;
      };
      player_achievements: {
        Row: PlayerAchievement;
        Insert: Omit<PlayerAchievement, 'id' | 'earned_at'>;
        Update: Partial<Omit<PlayerAchievement, 'id' | 'earned_at'>>;
      };
    };
  };
}

// Core entity types
export interface Player {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_url?: string;
  total_score: number;
  games_played: number;
  achievements_earned: number;
  role: 'player' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  player_id: string;
  difficulty: GameDifficulty;
  state: GameState;
  score: number;
  wool_collected: number;
  play_time: number;
  seed: number;
  game_data: GameData;
  created_at: string;
  updated_at: string;
  // Relations
  players?: Player;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: AchievementCategory;
  requirements: AchievementRequirements;
  created_at: string;
  updated_at: string;
}

export interface PlayerAchievement {
  id: string;
  player_id: string;
  achievement_id: string;
  game_id?: string;
  earned_at: string;
  // Relations
  achievements?: Achievement;
}

// Enum types
export type GameState = 'active' | 'paused' | 'completed';
export type GameDifficulty = 'easy' | 'medium' | 'hard';
export type GameAction = 'collect_wool' | 'feed_llama' | 'upgrade_farm' | 'save_game';
export type AchievementCategory = 'wool' | 'llamas' | 'buildings' | 'time' | 'special';

// Game data structure
export interface GameData {
  llamas: Llama[];
  buildings: Building[];
  upgrades: Upgrade[];
  resources: Resources;
  settings?: GameSettings;
}

export interface Llama {
  id: string;
  name: string;
  breed: LlamaBreed;
  age: number;
  health: number;
  happiness: number;
  wool_quality: number;
  wool_growth_rate: number;
  last_sheared: string;
  last_fed: string;
  position: Position;
  traits: LlamaTrait[];
  created_at: string;
}

export interface Building {
  id: string;
  type: BuildingType;
  level: number;
  position: Position;
  capacity: number;
  efficiency: number;
  last_maintenance: string;
  created_at: string;
}

export interface Upgrade {
  id: string;
  type: UpgradeType;
  level: number;
  cost: number;
  effect: UpgradeEffect;
  applied_at: string;
}

export interface Resources {
  wool: number;
  coins: number;
  food: number;
  wood: number;
  stone: number;
  energy: number;
}

export interface GameSettings {
  auto_save: boolean;
  sound_enabled: boolean;
  music_enabled: boolean;
  graphics_quality: 'low' | 'medium' | 'high';
  language: string;
}

// Supporting types
export type LlamaBreed = 'alpaca' | 'guanaco' | 'vicuna' | 'huacaya' | 'suri';
export type LlamaTrait = 'friendly' | 'stubborn' | 'productive' | 'hardy' | 'rare';
export type BuildingType = 'barn' | 'shearing_station' | 'feed_storage' | 'workshop' | 'market';
export type UpgradeType = 'automation' | 'efficiency' | 'capacity' | 'quality' | 'speed';

export interface Position {
  x: number;
  y: number;
}

export interface UpgradeEffect {
  type: 'percentage' | 'additive';
  value: number;
  target: string;
}

export interface AchievementRequirements {
  type: 'wool_collected' | 'llamas_owned' | 'buildings_built' | 'time_played' | 'score_reached';
  value: number;
  difficulty?: GameDifficulty;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  stack?: string;
}

// Request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  avatar_url?: string;
}

export interface GameActionRequest {
  action: GameAction;
  data?: any;
}

export interface GameUpdateRequest {
  state?: GameState;
  score?: number;
  wool_collected?: number;
  play_time?: number;
  game_data?: Partial<GameData>;
}

// Utility types
export type CreateEntity<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateEntity<T> = Partial<Omit<T, 'id' | 'created_at'>>;
export type EntityWithRelations<T, K extends keyof T> = T & {
  [P in K]: T[P] extends string ? any : T[P];
};

// WebSocket types for real-time features
export interface WebSocketMessage {
  type: 'game_update' | 'achievement_earned' | 'player_online' | 'system_message';
  data: any;
  timestamp: string;
}

export interface GameUpdateMessage extends WebSocketMessage {
  type: 'game_update';
  data: {
    game_id: string;
    player_id: string;
    updates: Partial<Game>;
  };
}

export interface AchievementEarnedMessage extends WebSocketMessage {
  type: 'achievement_earned';
  data: {
    player_id: string;
    achievement: Achievement;
    game_id?: string;
  };
}

// Configuration types
export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  max: number;
}