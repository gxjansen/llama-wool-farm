/**
 * Analytics Type Definitions
 */

export interface AnalyticsEvent {
  id: string;
  name: string;
  timestamp: number;
  sessionId: string;
  userId: string;
  data: any;
  context: EventContext;
}

export interface EventContext {
  url: string;
  referrer: string;
  timestamp: number;
  gameState: GameState;
}

export interface GameState {
  level: number;
  currency: number;
  buildings: Record<string, BuildingState>;
}

export interface BuildingState {
  count: number;
  level: number;
  production: number;
}

export interface PlayerMetrics {
  totalClicks: number;
  totalCurrency: number;
  totalBuildings: number;
  playTime: number;
  prestigeLevel: number;
  achievements: string[];
}

export interface SessionData {
  id: string;
  userId: string;
  startTime: number;
  endTime?: number;
  userAgent: string;
  screenResolution: string;
  language: string;
  timezone: string;
  gameVersion: string;
}

export interface EventSchema {
  name: string;
  requiredFields: string[];
  optionalFields: string[];
  validation: (data: any) => boolean;
}

export interface PrivacySettings {
  analyticsConsent: boolean;
  personalizedAds: boolean;
  dataRetention: number; // days
  anonymizeIp: boolean;
  shareWithThirdParties: boolean;
}

export interface DataProcessorConfig {
  batchSize: number;
  batchTimeout: number;
  enableRealTimeProcessing: boolean;
  enableCompression: boolean;
  enableEncryption: boolean;
}

export interface StorageConfig {
  maxStorageSize: number; // MB
  retentionPeriod: number; // days
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface ReportingConfig {
  updateInterval: number; // minutes
  enableRealtimeReports: boolean;
  enablePredictiveAnalytics: boolean;
  enablePlayerSegmentation: boolean;
}

// Event type definitions
export type GameEventType = 
  | 'player_action'
  | 'game_progression'
  | 'performance'
  | 'error'
  | 'session_start'
  | 'session_end'
  | 'purchase'
  | 'upgrade'
  | 'achievement'
  | 'prestige';

export type PlayerActionType =
  | 'click_llama'
  | 'purchase_building'
  | 'upgrade_building'
  | 'sell_building'
  | 'collect_offline_progress'
  | 'prestige'
  | 'unlock_achievement'
  | 'save_game'
  | 'load_game';

export type PerformanceMetricType =
  | 'frame_rate'
  | 'load_time'
  | 'memory_usage'
  | 'network_latency'
  | 'error_rate'
  | 'crash_rate';

// Aggregated data types
export interface PlayerBehaviorReport {
  userId: string;
  timeRange: string;
  totalSessions: number;
  totalPlayTime: number;
  averageSessionLength: number;
  mostActiveTime: string;
  favoriteActions: ActionFrequency[];
  progressionRate: number;
  retentionRate: number;
}

export interface ActionFrequency {
  action: string;
  count: number;
  percentage: number;
}

export interface GameBalanceReport {
  timeRange: string;
  economyMetrics: EconomyMetrics;
  buildingUsage: BuildingUsageStats[];
  progressionFunnels: ProgressionFunnel[];
  difficultyAnalysis: DifficultyAnalysis;
}

export interface EconomyMetrics {
  averageCurrencyPerPlayer: number;
  currencyInflationRate: number;
  purchaseFrequency: PurchaseFrequency[];
  economyBalance: number; // 0-1 scale
}

export interface PurchaseFrequency {
  item: string;
  count: number;
  averagePrice: number;
  priceElasticity: number;
}

export interface BuildingUsageStats {
  buildingType: string;
  totalBuilt: number;
  averageLevel: number;
  contributionToProgress: number;
  popularityRank: number;
}

export interface ProgressionFunnel {
  stage: string;
  playersEntered: number;
  playersCompleted: number;
  conversionRate: number;
  averageTimeToComplete: number;
  dropoffReasons: string[];
}

export interface DifficultyAnalysis {
  stage: string;
  completionRate: number;
  averageAttempts: number;
  playerFeedback: number; // 1-5 scale
  recommendedAdjustments: string[];
}

export interface PerformanceReport {
  timeRange: string;
  averageFrameRate: number;
  averageLoadTime: number;
  crashRate: number;
  errorRate: number;
  topErrors: ErrorFrequency[];
  performanceBottlenecks: PerformanceBottleneck[];
}

export interface ErrorFrequency {
  error: string;
  count: number;
  affectedUsers: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceBottleneck {
  type: string;
  description: string;
  impact: number; // 1-10 scale
  affectedUsers: number;
  recommendedFix: string;
}

// Data export types for GDPR compliance
export interface UserDataExport {
  userId: string;
  exportDate: string;
  personalData: PersonalData;
  gameData: GameData;
  analyticsData: AnalyticsData;
  preferences: UserPreferences;
}

export interface PersonalData {
  userId: string;
  createdAt: string;
  lastActiveAt: string;
  language: string;
  timezone: string;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  userAgent: string;
  screenResolution: string;
  platform: string;
  isDesktop: boolean;
  isMobile: boolean;
}

export interface GameData {
  currentLevel: number;
  totalPlayTime: number;
  achievements: string[];
  purchases: Purchase[];
  progressHistory: ProgressSnapshot[];
}

export interface Purchase {
  id: string;
  item: string;
  price: number;
  currency: string;
  timestamp: number;
}

export interface ProgressSnapshot {
  timestamp: number;
  level: number;
  currency: number;
  buildings: Record<string, number>;
}

export interface AnalyticsData {
  totalEvents: number;
  eventTypes: Record<string, number>;
  sessions: SessionSummary[];
  preferences: PrivacySettings;
}

export interface SessionSummary {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  eventCount: number;
}

export interface UserPreferences {
  privacy: PrivacySettings;
  game: GamePreferences;
  ui: UIPreferences;
}

export interface GamePreferences {
  autoSave: boolean;
  notifications: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  reducedMotion: boolean;
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  fontSize: number;
  highContrast: boolean;
}