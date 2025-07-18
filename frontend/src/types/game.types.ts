import Decimal from 'decimal.js';

/**
 * Core game types and interfaces
 */

// Wool types from basic to quantum
export enum WoolType {
  Basic = 'basic',
  Silver = 'silver',
  Golden = 'golden',
  Rainbow = 'rainbow',
  Cosmic = 'cosmic',
  Ethereal = 'ethereal',
  Temporal = 'temporal',
  Dimensional = 'dimensional',
  Celestial = 'celestial',
  Quantum = 'quantum'
}

// Building types
export enum BuildingType {
  Barn = 'barn',
  Shears = 'shears',
  Transport = 'transport',
  Factory = 'factory',
  Lab = 'lab',
  Portal = 'portal',
  TimeMachine = 'timeMachine',
  DimensionGate = 'dimensionGate'
}

// Upgrade categories
export enum UpgradeCategory {
  Production = 'production',
  Efficiency = 'efficiency',
  Automation = 'automation',
  Prestige = 'prestige',
  Special = 'special'
}

// Game states
export enum GameState {
  Loading = 'loading',
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  Prestige = 'prestige',
  Settings = 'settings'
}

// Wool properties
export interface WoolProperties {
  type: WoolType;
  baseValue: Decimal;
  productionRate: Decimal;
  unlockCost: Decimal;
  color: string;
  particleEffect: string;
  description: string;
}

// Llama entity
export interface Llama {
  id: string;
  name: string;
  level: number;
  woolType: WoolType;
  productionMultiplier: Decimal;
  specialAbility?: string;
  unlocked: boolean;
}

// Building data
export interface Building {
  type: BuildingType;
  level: number;
  baseCost: Decimal;
  costMultiplier: number;
  baseProduction: Decimal;
  productionMultiplier: Decimal;
  description: string;
  unlocked: boolean;
}

// Upgrade data
export interface Upgrade {
  id: string;
  name: string;
  category: UpgradeCategory;
  cost: Decimal;
  effect: UpgradeEffect;
  description: string;
  purchased: boolean;
  requirements?: UpgradeRequirement[];
}

// Upgrade effects
export interface UpgradeEffect {
  type: 'multiply' | 'add' | 'unlock' | 'special';
  target: 'production' | 'cost' | 'offline' | 'prestige' | string;
  value: number;
  metadata?: Record<string, any>;
}

// Upgrade requirements
export interface UpgradeRequirement {
  type: 'building' | 'wool' | 'prestige' | 'achievement';
  target: string;
  value: number;
}

// Achievement data
export interface Achievement {
  id: string;
  name: string;
  description: string;
  requirement: AchievementRequirement;
  reward?: AchievementReward;
  unlocked: boolean;
  unlockedAt?: number;
  icon: string;
}

// Achievement requirements
export interface AchievementRequirement {
  type: 'wool' | 'building' | 'prestige' | 'time' | 'click';
  target?: string;
  value: number;
}

// Achievement rewards
export interface AchievementReward {
  type: 'multiplier' | 'unlock' | 'currency';
  value: number;
  target?: string;
}

// Game save data
export interface GameSave {
  version: string;
  playerId: string;
  timestamp: number;
  
  // Resources
  woolCounts: Record<WoolType, string>; // Decimal as string
  soulShears: string; // Decimal as string
  goldenFleece: string; // Decimal as string
  
  // Buildings
  buildings: Record<BuildingType, Building>;
  
  // Upgrades
  purchasedUpgrades: string[];
  
  // Progress
  totalWoolProduced: string; // Decimal as string
  totalPrestiges: number;
  playTime: number;
  lastSaveTime: number;
  
  // Achievements
  unlockedAchievements: string[];
  
  // Settings
  settings: GameSettings;
}

// Game settings
export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  particles: boolean;
  autoSave: boolean;
  cloudSync: boolean;
  notifications: boolean;
  reducedMotion: boolean;
  colorBlindMode: boolean;
  language: string;
}

// Production calculation result
export interface ProductionResult {
  woolPerSecond: Record<WoolType, Decimal>;
  totalPerSecond: Decimal;
  offlineProduction: Record<WoolType, Decimal>;
  multipliers: ProductionMultipliers;
}

// Production multipliers breakdown
export interface ProductionMultipliers {
  base: Decimal;
  buildings: Decimal;
  upgrades: Decimal;
  achievements: Decimal;
  prestige: Decimal;
  temporary: Decimal;
  total: Decimal;
}

// Offline progress data
export interface OfflineProgress {
  duration: number;
  woolEarned: Record<WoolType, string>;
  eventsOccurred: OfflineEvent[];
  bonusMultiplier: number;
}

// Offline events
export interface OfflineEvent {
  type: 'bonus' | 'achievement' | 'milestone';
  description: string;
  timestamp: number;
  reward?: any;
}

// Prestige data
export interface PrestigeData {
  currentSoulShears: Decimal;
  pendingSoulShears: Decimal;
  totalPrestiges: number;
  prestigeMultiplier: Decimal;
  unlockedFeatures: string[];
  milestones: PrestigeMilestone[];
}

// Prestige milestones
export interface PrestigeMilestone {
  soulShears: number;
  name: string;
  description: string;
  reward: string;
  unlocked: boolean;
}

// Analytics event
export interface AnalyticsEvent {
  name: string;
  category: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

// Notification data
export interface GameNotification {
  id: string;
  type: 'achievement' | 'milestone' | 'event' | 'error';
  title: string;
  message: string;
  icon?: string;
  duration?: number;
  action?: () => void;
}