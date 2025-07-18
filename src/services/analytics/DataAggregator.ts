/**
 * Data Aggregator for Analytics
 * Handles data aggregation, time-series processing, and metric calculation
 */

import { AnalyticsEvent, PlayerBehaviorReport, GameBalanceReport, PerformanceReport } from './types';

export class DataAggregator {
  private timeSeriesData: Map<string, any[]> = new Map();
  private aggregatedMetrics: Map<string, any> = new Map();
  private aggregationInterval = 60000; // 1 minute
  private retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days

  async initialize(): Promise<void> {
    // Setup aggregation timers
    this.setupAggregationTimers();
    console.log('DataAggregator initialized');
  }

  /**
   * Process a batch of events for aggregation
   */
  async processBatch(events: AnalyticsEvent[]): Promise<void> {
    for (const event of events) {
      await this.processEvent(event);
    }
  }

  /**
   * Process a single event for aggregation
   */
  async processEvent(event: AnalyticsEvent): Promise<void> {
    // Add to time series data
    this.addToTimeSeries(event);

    // Update real-time aggregations
    await this.updateRealTimeAggregations(event);

    // Update user-specific aggregations
    await this.updateUserAggregations(event);

    // Update game-specific aggregations
    await this.updateGameAggregations(event);
  }

  /**
   * Add event to time series data
   */
  private addToTimeSeries(event: AnalyticsEvent): void {
    const timeSlot = this.getTimeSlot(event.timestamp);
    const key = `${event.name}_${timeSlot}`;
    
    if (!this.timeSeriesData.has(key)) {
      this.timeSeriesData.set(key, []);
    }
    
    this.timeSeriesData.get(key)!.push(event);
  }

  /**
   * Update real-time aggregations
   */
  private async updateRealTimeAggregations(event: AnalyticsEvent): Promise<void> {
    const now = Date.now();
    const timeSlot = this.getTimeSlot(now);

    // Update event counts
    this.incrementCounter(`events_total_${timeSlot}`);
    this.incrementCounter(`events_${event.name}_${timeSlot}`);

    // Update user activity
    this.updateUserActivity(event.userId, timeSlot);

    // Update session metrics
    this.updateSessionMetrics(event.sessionId, timeSlot);
  }

  /**
   * Update user-specific aggregations
   */
  private async updateUserAggregations(event: AnalyticsEvent): Promise<void> {
    const userKey = `user_${event.userId}`;
    
    if (!this.aggregatedMetrics.has(userKey)) {
      this.aggregatedMetrics.set(userKey, {
        totalEvents: 0,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        sessions: new Set(),
        eventTypes: new Map(),
        gameProgress: {},
      });
    }

    const userMetrics = this.aggregatedMetrics.get(userKey)!;
    userMetrics.totalEvents++;
    userMetrics.lastSeen = event.timestamp;
    userMetrics.sessions.add(event.sessionId);
    
    // Update event type counts
    const eventType = event.name;
    userMetrics.eventTypes.set(eventType, (userMetrics.eventTypes.get(eventType) || 0) + 1);

    // Update game progress
    if (event.name === 'game_progression') {
      userMetrics.gameProgress = {
        ...userMetrics.gameProgress,
        ...event.data.metrics,
      };
    }
  }

  /**
   * Update game-specific aggregations
   */
  private async updateGameAggregations(event: AnalyticsEvent): Promise<void> {
    const gameKey = 'game_global';
    
    if (!this.aggregatedMetrics.has(gameKey)) {
      this.aggregatedMetrics.set(gameKey, {
        totalPlayers: new Set(),
        totalEvents: 0,
        eventTypes: new Map(),
        economyMetrics: {
          totalPurchases: 0,
          totalRevenue: 0,
          averageSpend: 0,
        },
        performanceMetrics: {
          averageFrameRate: 0,
          averageLoadTime: 0,
          errorRate: 0,
        },
      });
    }

    const gameMetrics = this.aggregatedMetrics.get(gameKey)!;
    gameMetrics.totalPlayers.add(event.userId);
    gameMetrics.totalEvents++;
    gameMetrics.eventTypes.set(event.name, (gameMetrics.eventTypes.get(event.name) || 0) + 1);

    // Update economy metrics
    if (event.name === 'purchase') {
      gameMetrics.economyMetrics.totalPurchases++;
      gameMetrics.economyMetrics.totalRevenue += event.data.amount || 0;
      gameMetrics.economyMetrics.averageSpend = 
        gameMetrics.economyMetrics.totalRevenue / gameMetrics.economyMetrics.totalPurchases;
    }

    // Update performance metrics
    if (event.name === 'performance') {
      if (event.data.frameRate) {
        gameMetrics.performanceMetrics.averageFrameRate = this.updateMovingAverage(
          gameMetrics.performanceMetrics.averageFrameRate,
          event.data.frameRate
        );
      }
      if (event.data.loadTime) {
        gameMetrics.performanceMetrics.averageLoadTime = this.updateMovingAverage(
          gameMetrics.performanceMetrics.averageLoadTime,
          event.data.loadTime
        );
      }
    }

    // Update error rate
    if (event.name === 'error') {
      gameMetrics.performanceMetrics.errorRate = this.calculateErrorRate();
    }
  }

  /**
   * Generate player behavior report
   */
  async generatePlayerBehaviorReport(userId: string, timeRange: string): Promise<PlayerBehaviorReport> {
    const userMetrics = this.aggregatedMetrics.get(`user_${userId}`);
    if (!userMetrics) {
      throw new Error('User not found');
    }

    const sessions = await this.getSessionsForUser(userId, timeRange);
    const totalPlayTime = this.calculateTotalPlayTime(sessions);
    const averageSessionLength = totalPlayTime / sessions.length;

    return {
      userId,
      timeRange,
      totalSessions: sessions.length,
      totalPlayTime,
      averageSessionLength,
      mostActiveTime: this.calculateMostActiveTime(sessions),
      favoriteActions: this.calculateFavoriteActions(userMetrics.eventTypes),
      progressionRate: this.calculateProgressionRate(userId, timeRange),
      retentionRate: this.calculateRetentionRate(userId, timeRange),
    };
  }

  /**
   * Generate game balance report
   */
  async generateGameBalanceReport(timeRange: string): Promise<GameBalanceReport> {
    const gameMetrics = this.aggregatedMetrics.get('game_global');
    if (!gameMetrics) {
      throw new Error('Game metrics not found');
    }

    return {
      timeRange,
      economyMetrics: {
        averageCurrencyPerPlayer: await this.calculateAverageCurrencyPerPlayer(timeRange),
        currencyInflationRate: await this.calculateCurrencyInflationRate(timeRange),
        purchaseFrequency: await this.calculatePurchaseFrequency(timeRange),
        economyBalance: await this.calculateEconomyBalance(timeRange),
      },
      buildingUsage: await this.calculateBuildingUsage(timeRange),
      progressionFunnels: await this.calculateProgressionFunnels(timeRange),
      difficultyAnalysis: await this.calculateDifficultyAnalysis(timeRange),
    };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(timeRange: string): Promise<PerformanceReport> {
    const gameMetrics = this.aggregatedMetrics.get('game_global');
    if (!gameMetrics) {
      throw new Error('Game metrics not found');
    }

    return {
      timeRange,
      averageFrameRate: gameMetrics.performanceMetrics.averageFrameRate,
      averageLoadTime: gameMetrics.performanceMetrics.averageLoadTime,
      crashRate: await this.calculateCrashRate(timeRange),
      errorRate: gameMetrics.performanceMetrics.errorRate,
      topErrors: await this.getTopErrors(timeRange),
      performanceBottlenecks: await this.identifyPerformanceBottlenecks(timeRange),
    };
  }

  /**
   * Helper methods
   */
  private getTimeSlot(timestamp: number): string {
    const date = new Date(timestamp);
    const minutes = Math.floor(date.getTime() / this.aggregationInterval);
    return `${minutes}`;
  }

  private incrementCounter(key: string): void {
    const current = this.aggregatedMetrics.get(key) || 0;
    this.aggregatedMetrics.set(key, current + 1);
  }

  private updateUserActivity(userId: string, timeSlot: string): void {
    const key = `user_activity_${userId}_${timeSlot}`;
    this.incrementCounter(key);
  }

  private updateSessionMetrics(sessionId: string, timeSlot: string): void {
    const key = `session_${sessionId}_${timeSlot}`;
    this.incrementCounter(key);
  }

  private updateMovingAverage(current: number, newValue: number): number {
    // Simple moving average (can be enhanced with proper window size)
    return (current + newValue) / 2;
  }

  private calculateErrorRate(): number {
    const gameMetrics = this.aggregatedMetrics.get('game_global')!;
    const totalEvents = gameMetrics.totalEvents;
    const errorEvents = gameMetrics.eventTypes.get('error') || 0;
    return totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;
  }

  private async getSessionsForUser(userId: string, timeRange: string): Promise<any[]> {
    // Implementation would query sessions from storage
    return [];
  }

  private calculateTotalPlayTime(sessions: any[]): number {
    return sessions.reduce((total, session) => total + (session.duration || 0), 0);
  }

  private calculateMostActiveTime(sessions: any[]): string {
    // Implementation would analyze session start times
    return '20:00'; // Example
  }

  private calculateFavoriteActions(eventTypes: Map<string, number>): any[] {
    const total = Array.from(eventTypes.values()).reduce((sum, count) => sum + count, 0);
    return Array.from(eventTypes.entries())
      .map(([action, count]) => ({
        action,
        count,
        percentage: (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateProgressionRate(userId: string, timeRange: string): number {
    // Implementation would calculate progression rate
    return 0.75; // Example
  }

  private calculateRetentionRate(userId: string, timeRange: string): number {
    // Implementation would calculate retention rate
    return 0.60; // Example
  }

  private async calculateAverageCurrencyPerPlayer(timeRange: string): Promise<number> {
    // Implementation would calculate average currency
    return 1000; // Example
  }

  private async calculateCurrencyInflationRate(timeRange: string): Promise<number> {
    // Implementation would calculate inflation rate
    return 0.02; // Example
  }

  private async calculatePurchaseFrequency(timeRange: string): Promise<any[]> {
    // Implementation would calculate purchase frequency
    return []; // Example
  }

  private async calculateEconomyBalance(timeRange: string): Promise<number> {
    // Implementation would calculate economy balance
    return 0.8; // Example
  }

  private async calculateBuildingUsage(timeRange: string): Promise<any[]> {
    // Implementation would calculate building usage
    return []; // Example
  }

  private async calculateProgressionFunnels(timeRange: string): Promise<any[]> {
    // Implementation would calculate progression funnels
    return []; // Example
  }

  private async calculateDifficultyAnalysis(timeRange: string): Promise<any> {
    // Implementation would calculate difficulty analysis
    return {}; // Example
  }

  private async calculateCrashRate(timeRange: string): Promise<number> {
    // Implementation would calculate crash rate
    return 0.001; // Example
  }

  private async getTopErrors(timeRange: string): Promise<any[]> {
    // Implementation would get top errors
    return []; // Example
  }

  private async identifyPerformanceBottlenecks(timeRange: string): Promise<any[]> {
    // Implementation would identify bottlenecks
    return []; // Example
  }

  private setupAggregationTimers(): void {
    // Setup periodic aggregation tasks
    setInterval(() => {
      this.performPeriodicAggregation();
    }, this.aggregationInterval);

    // Setup cleanup of old data
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  private async performPeriodicAggregation(): Promise<void> {
    // Perform periodic aggregation tasks
    console.log('Performing periodic aggregation');
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - this.retentionPeriod;
    
    // Clean up old time series data
    for (const [key, events] of this.timeSeriesData.entries()) {
      const filteredEvents = events.filter(event => event.timestamp > cutoffTime);
      if (filteredEvents.length === 0) {
        this.timeSeriesData.delete(key);
      } else {
        this.timeSeriesData.set(key, filteredEvents);
      }
    }
  }
}