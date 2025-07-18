/**
 * Comprehensive Analytics Engine for Llama Wool Farm
 * Handles event collection, processing, and privacy compliance
 */

import { EventEmitter } from 'events';
import { AnalyticsEvent, EventSchema, PlayerMetrics, SessionData } from './types';
import { DataProcessor } from './DataProcessor';
import { PrivacyManager } from './PrivacyManager';
import { StorageManager } from './StorageManager';
import { ReportingEngine } from './ReportingEngine';

export class AnalyticsEngine extends EventEmitter {
  private initialized = false;
  private sessionId: string;
  private userId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private batchSize = 50;
  private batchTimeout = 5000; // 5 seconds
  private batchTimer: NodeJS.Timeout | null = null;
  private isOffline = false;
  
  private dataProcessor: DataProcessor;
  private privacyManager: PrivacyManager;
  private storageManager: StorageManager;
  private reportingEngine: ReportingEngine;

  constructor() {
    super();
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    
    // Initialize components
    this.dataProcessor = new DataProcessor();
    this.privacyManager = new PrivacyManager();
    this.storageManager = new StorageManager();
    this.reportingEngine = new ReportingEngine();
    
    // Setup offline detection
    this.setupOfflineHandling();
  }

  /**
   * Initialize the analytics engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize all components
      await this.privacyManager.initialize();
      await this.storageManager.initialize();
      await this.dataProcessor.initialize();
      await this.reportingEngine.initialize();
      
      // Check privacy consent
      const hasConsent = await this.privacyManager.hasConsent();
      if (!hasConsent) {
        console.log('Analytics: Waiting for user consent');
        return;
      }
      
      // Start session
      await this.startSession();
      
      // Process any queued events
      this.processQueuedEvents();
      
      this.initialized = true;
      this.emit('initialized');
      
      console.log('Analytics Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Analytics Engine:', error);
      this.emit('error', error);
    }
  }

  /**
   * Track a game event
   */
  async trackEvent(eventName: string, data: any = {}): Promise<void> {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      name: eventName,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      data: await this.privacyManager.sanitizeData(data),
      context: this.getEventContext(),
    };

    // Validate event schema
    if (!this.validateEvent(event)) {
      console.warn('Invalid event schema:', event);
      return;
    }

    // Queue event for batch processing
    this.queueEvent(event);
  }

  /**
   * Track player action with specific schema
   */
  async trackPlayerAction(action: string, details: any = {}): Promise<void> {
    await this.trackEvent('player_action', {
      action,
      details,
      category: 'gameplay',
      subcategory: this.determineSubcategory(action),
    });
  }

  /**
   * Track game progression events
   */
  async trackProgression(stage: string, metrics: PlayerMetrics): Promise<void> {
    await this.trackEvent('game_progression', {
      stage,
      metrics: await this.privacyManager.sanitizeMetrics(metrics),
      category: 'progression',
    });
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(metrics: any): Promise<void> {
    await this.trackEvent('performance', {
      ...metrics,
      category: 'technical',
      subcategory: 'performance',
    });
  }

  /**
   * Track errors with context
   */
  async trackError(error: Error, context: any = {}): Promise<void> {
    await this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      context: await this.privacyManager.sanitizeData(context),
      category: 'technical',
      subcategory: 'error',
      severity: this.determineSeverity(error),
    });
  }

  /**
   * Set user properties
   */
  async setUserProperty(key: string, value: any): Promise<void> {
    const sanitizedValue = await this.privacyManager.sanitizeData(value);
    await this.storageManager.setUserProperty(this.userId, key, sanitizedValue);
  }

  /**
   * Enable analytics with user consent
   */
  async enableAnalytics(): Promise<void> {
    await this.privacyManager.setConsent(true);
    if (!this.initialized) {
      await this.initialize();
    }
    this.processQueuedEvents();
  }

  /**
   * Disable analytics and clear data
   */
  async disableAnalytics(): Promise<void> {
    await this.privacyManager.setConsent(false);
    await this.storageManager.clearUserData(this.userId);
    this.eventQueue = [];
    this.clearBatchTimer();
  }

  /**
   * Get analytics insights
   */
  async getInsights(timeRange: string = '7d'): Promise<any> {
    return this.reportingEngine.generateInsights(this.userId, timeRange);
  }

  /**
   * Export user data for GDPR compliance
   */
  async exportUserData(): Promise<any> {
    return this.storageManager.exportUserData(this.userId);
  }

  /**
   * Delete user data for GDPR compliance
   */
  async deleteUserData(): Promise<void> {
    await this.storageManager.deleteUserData(this.userId);
    await this.privacyManager.clearConsent();
  }

  /**
   * Private methods
   */
  private async startSession(): Promise<void> {
    const sessionData: SessionData = {
      id: this.sessionId,
      userId: this.userId,
      startTime: Date.now(),
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      gameVersion: process.env.GAME_VERSION || '1.0.0',
    };

    await this.storageManager.storeSession(sessionData);
    await this.trackEvent('session_start', {
      category: 'session',
      sessionData: await this.privacyManager.sanitizeData(sessionData),
    });
  }

  private queueEvent(event: AnalyticsEvent): void {
    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= this.batchSize) {
      this.processBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.batchTimeout);
    }
  }

  private async processBatch(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, this.batchSize);
    this.clearBatchTimer();

    try {
      // Process the batch
      const processedBatch = await this.dataProcessor.processBatch(batch);
      
      // Store the batch
      await this.storageManager.storeBatch(processedBatch);
      
      // Send for real-time processing if online
      if (!this.isOffline) {
        await this.sendBatchToServer(processedBatch);
      }
      
      this.emit('batchProcessed', processedBatch);
    } catch (error) {
      console.error('Failed to process batch:', error);
      // Re-queue failed events
      this.eventQueue.unshift(...batch);
      this.emit('batchError', error);
    }
  }

  private async sendBatchToServer(batch: AnalyticsEvent[]): Promise<void> {
    // Implementation would send to analytics backend
    console.log('Sending batch to server:', batch.length, 'events');
  }

  private processQueuedEvents(): void {
    if (this.eventQueue.length > 0) {
      this.processBatch();
    }
  }

  private clearBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  private validateEvent(event: AnalyticsEvent): boolean {
    // Basic event validation
    return !!(event.id && event.name && event.timestamp && event.sessionId);
  }

  private getEventContext(): any {
    return {
      url: window.location.href,
      referrer: document.referrer,
      timestamp: Date.now(),
      gameState: this.getGameState(),
    };
  }

  private getGameState(): any {
    // Extract current game state for context
    return {
      level: 1, // TODO: Get from game state
      currency: 0, // TODO: Get from game state
      buildings: {}, // TODO: Get from game state
    };
  }

  private determineSubcategory(action: string): string {
    if (action.includes('click')) return 'interaction';
    if (action.includes('purchase')) return 'economy';
    if (action.includes('upgrade')) return 'progression';
    return 'general';
  }

  private determineSeverity(error: Error): string {
    if (error.message.includes('network')) return 'warning';
    if (error.message.includes('critical')) return 'error';
    return 'info';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserId(): string {
    let userId = localStorage.getItem('analytics_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('analytics_user_id', userId);
    }
    return userId;
  }

  private setupOfflineHandling(): void {
    window.addEventListener('online', () => {
      this.isOffline = false;
      this.processBatch(); // Process any queued events
    });

    window.addEventListener('offline', () => {
      this.isOffline = true;
    });

    this.isOffline = !navigator.onLine;
  }
}

// Export singleton instance
export const analyticsEngine = new AnalyticsEngine();