/**
 * Storage Manager for Analytics
 * Handles data storage, retrieval, and management with optimization strategies
 */

import { AnalyticsEvent, SessionData, StorageConfig, UserDataExport } from './types';

export class StorageManager {
  private config: StorageConfig;
  private db: IDBDatabase | null = null;
  private dbName = 'LlamaWoolFarmAnalytics';
  private dbVersion = 1;
  private compressionEnabled = true;
  private encryptionEnabled = false;

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      maxStorageSize: 100, // MB
      retentionPeriod: 30, // days
      compressionEnabled: true,
      encryptionEnabled: false,
      ...config
    };
  }

  async initialize(): Promise<void> {
    await this.initializeIndexedDB();
    await this.setupStorageQuotaManagement();
    await this.scheduleCleanupTasks();
    console.log('StorageManager initialized');
  }

  /**
   * Store a single event
   */
  async storeEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const processedEvent = await this.processEventForStorage(event);
      
      const transaction = this.db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      
      await this.promisifyRequest(store.add(processedEvent));
      
      // Update storage metrics
      await this.updateStorageMetrics('events', 1);
      
    } catch (error) {
      console.error('Failed to store event:', error);
      throw error;
    }
  }

  /**
   * Store a batch of events
   */
  async storeBatch(events: AnalyticsEvent[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['events'], 'readwrite');
    const store = transaction.objectStore('events');
    
    const promises = events.map(async (event) => {
      const processedEvent = await this.processEventForStorage(event);
      return this.promisifyRequest(store.add(processedEvent));
    });

    try {
      await Promise.all(promises);
      await this.updateStorageMetrics('events', events.length);
    } catch (error) {
      console.error('Failed to store batch:', error);
      throw error;
    }
  }

  /**
   * Store session data
   */
  async storeSession(session: SessionData): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');
    
    const processedSession = await this.processSessionForStorage(session);
    await this.promisifyRequest(store.put(processedSession));
    
    await this.updateStorageMetrics('sessions', 1);
  }

  /**
   * Get events for a user within a time range
   */
  async getEventsForUser(userId: string, startTime: number, endTime: number): Promise<AnalyticsEvent[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['events'], 'readonly');
    const store = transaction.objectStore('events');
    const index = store.index('userId');
    
    const range = IDBKeyRange.bound([userId, startTime], [userId, endTime]);
    const request = index.getAll(range);
    
    const events = await this.promisifyRequest(request);
    return events.map(event => this.processEventFromStorage(event));
  }

  /**
   * Get events by type within a time range
   */
  async getEventsByType(eventType: string, startTime: number, endTime: number): Promise<AnalyticsEvent[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['events'], 'readonly');
    const store = transaction.objectStore('events');
    const index = store.index('eventType');
    
    const range = IDBKeyRange.bound([eventType, startTime], [eventType, endTime]);
    const request = index.getAll(range);
    
    const events = await this.promisifyRequest(request);
    return events.map(event => this.processEventFromStorage(event));
  }

  /**
   * Get session data for a user
   */
  async getSessionsForUser(userId: string): Promise<SessionData[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');
    const index = store.index('userId');
    
    const request = index.getAll(userId);
    const sessions = await this.promisifyRequest(request);
    
    return sessions.map(session => this.processSessionFromStorage(session));
  }

  /**
   * Set user property
   */
  async setUserProperty(userId: string, key: string, value: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['userProperties'], 'readwrite');
    const store = transaction.objectStore('userProperties');
    
    const userProperty = {
      userId,
      key,
      value: await this.compressData(value),
      timestamp: Date.now(),
    };
    
    await this.promisifyRequest(store.put(userProperty));
  }

  /**
   * Get user property
   */
  async getUserProperty(userId: string, key: string): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['userProperties'], 'readonly');
    const store = transaction.objectStore('userProperties');
    const index = store.index('userIdKey');
    
    const request = index.get([userId, key]);
    const property = await this.promisifyRequest(request);
    
    if (property) {
      return await this.decompressData(property.value);
    }
    
    return null;
  }

  /**
   * Export all user data
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    const [events, sessions, properties] = await Promise.all([
      this.getEventsForUser(userId, 0, Date.now()),
      this.getSessionsForUser(userId),
      this.getAllUserProperties(userId),
    ]);

    return {
      userId,
      exportDate: new Date().toISOString(),
      personalData: {
        userId,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        language: 'en',
        timezone: 'UTC',
        deviceInfo: {
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          platform: navigator.platform,
          isDesktop: !navigator.userAgent.includes('Mobile'),
          isMobile: navigator.userAgent.includes('Mobile'),
        },
      },
      gameData: {
        currentLevel: 1,
        totalPlayTime: this.calculateTotalPlayTime(sessions),
        achievements: [],
        purchases: this.extractPurchases(events),
        progressHistory: this.extractProgressHistory(events),
      },
      analyticsData: {
        totalEvents: events.length,
        eventTypes: this.calculateEventTypes(events),
        sessions: sessions.map(s => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime || 0,
          duration: (s.endTime || Date.now()) - s.startTime,
          eventCount: 0,
        })),
        preferences: {
          analyticsConsent: false,
          personalizedAds: false,
          dataRetention: 30,
          anonymizeIp: true,
          shareWithThirdParties: false,
        },
      },
      preferences: {
        privacy: {
          analyticsConsent: false,
          personalizedAds: false,
          dataRetention: 30,
          anonymizeIp: true,
          shareWithThirdParties: false,
        },
        game: {
          autoSave: true,
          notifications: true,
          soundEnabled: true,
          musicEnabled: true,
          reducedMotion: false,
        },
        ui: {
          theme: 'auto',
          language: 'en',
          fontSize: 16,
          highContrast: false,
        },
      },
    };
  }

  /**
   * Delete all user data
   */
  async deleteUserData(userId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['events', 'sessions', 'userProperties'], 'readwrite');
    
    // Delete events
    const eventsStore = transaction.objectStore('events');
    const eventsIndex = eventsStore.index('userId');
    const eventsRequest = eventsIndex.getAllKeys(userId);
    const eventKeys = await this.promisifyRequest(eventsRequest);
    
    for (const key of eventKeys) {
      await this.promisifyRequest(eventsStore.delete(key));
    }
    
    // Delete sessions
    const sessionsStore = transaction.objectStore('sessions');
    const sessionsIndex = sessionsStore.index('userId');
    const sessionsRequest = sessionsIndex.getAllKeys(userId);
    const sessionKeys = await this.promisifyRequest(sessionsRequest);
    
    for (const key of sessionKeys) {
      await this.promisifyRequest(sessionsStore.delete(key));
    }
    
    // Delete user properties
    const propertiesStore = transaction.objectStore('userProperties');
    const propertiesIndex = propertiesStore.index('userId');
    const propertiesRequest = propertiesIndex.getAllKeys(userId);
    const propertyKeys = await this.promisifyRequest(propertiesRequest);
    
    for (const key of propertyKeys) {
      await this.promisifyRequest(propertiesStore.delete(key));
    }
    
    console.log(`Deleted all data for user: ${userId}`);
  }

  /**
   * Clear all user data (for privacy compliance)
   */
  async clearUserData(userId: string): Promise<void> {
    await this.deleteUserData(userId);
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats = {
      totalEvents: await this.countRecords('events'),
      totalSessions: await this.countRecords('sessions'),
      totalUserProperties: await this.countRecords('userProperties'),
      estimatedSize: await this.estimateStorageSize(),
      quotaUsed: await this.getQuotaUsage(),
    };

    return stats;
  }

  /**
   * Cleanup old data based on retention policies
   */
  async cleanupOldData(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    
    await this.deleteOldEvents(cutoffTime);
    await this.deleteOldSessions(cutoffTime);
    await this.deleteOldUserProperties(cutoffTime);
    
    console.log('Old data cleanup completed');
  }

  /**
   * Private methods
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create events store
        if (!db.objectStoreNames.contains('events')) {
          const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
          eventsStore.createIndex('userId', 'userId');
          eventsStore.createIndex('eventType', 'name');
          eventsStore.createIndex('timestamp', 'timestamp');
          eventsStore.createIndex('userIdTimestamp', ['userId', 'timestamp']);
          eventsStore.createIndex('eventTypeTimestamp', ['name', 'timestamp']);
        }
        
        // Create sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionsStore.createIndex('userId', 'userId');
          sessionsStore.createIndex('startTime', 'startTime');
        }
        
        // Create user properties store
        if (!db.objectStoreNames.contains('userProperties')) {
          const propertiesStore = db.createObjectStore('userProperties', { keyPath: ['userId', 'key'] });
          propertiesStore.createIndex('userId', 'userId');
          propertiesStore.createIndex('userIdKey', ['userId', 'key']);
        }
      };
    });
  }

  private async processEventForStorage(event: AnalyticsEvent): Promise<any> {
    const processedEvent = { ...event };
    
    if (this.config.compressionEnabled) {
      processedEvent.data = await this.compressData(event.data);
    }
    
    if (this.config.encryptionEnabled) {
      processedEvent.data = await this.encryptData(processedEvent.data);
    }
    
    return processedEvent;
  }

  private processEventFromStorage(event: any): AnalyticsEvent {
    const processedEvent = { ...event };
    
    if (this.config.encryptionEnabled) {
      processedEvent.data = this.decryptData(processedEvent.data);
    }
    
    if (this.config.compressionEnabled) {
      processedEvent.data = this.decompressData(processedEvent.data);
    }
    
    return processedEvent;
  }

  private async processSessionForStorage(session: SessionData): Promise<any> {
    const processedSession = { ...session };
    
    if (this.config.compressionEnabled) {
      // Compress large session data
      if (JSON.stringify(processedSession).length > 1000) {
        processedSession.compressed = await this.compressData(processedSession);
      }
    }
    
    return processedSession;
  }

  private processSessionFromStorage(session: any): SessionData {
    if (session.compressed) {
      return this.decompressData(session.compressed);
    }
    return session;
  }

  private async compressData(data: any): Promise<string> {
    if (!this.config.compressionEnabled) return data;
    
    // Simple compression using JSON stringification
    // In production, use proper compression algorithms
    const jsonString = JSON.stringify(data);
    return btoa(jsonString);
  }

  private async decompressData(compressedData: string): Promise<any> {
    if (!this.config.compressionEnabled) return compressedData;
    
    try {
      const jsonString = atob(compressedData);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to decompress data:', error);
      return compressedData;
    }
  }

  private async encryptData(data: any): Promise<string> {
    // Simple encryption placeholder
    // In production, use proper encryption
    return btoa(JSON.stringify(data));
  }

  private decryptData(encryptedData: string): any {
    try {
      return JSON.parse(atob(encryptedData));
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return encryptedData;
    }
  }

  private async promisifyRequest(request: IDBRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async countRecords(storeName: string): Promise<number> {
    if (!this.db) return 0;
    
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();
    
    return this.promisifyRequest(request);
  }

  private async estimateStorageSize(): Promise<number> {
    // Estimate storage size in bytes
    // In production, use navigator.storage.estimate()
    return 0;
  }

  private async getQuotaUsage(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }

  private async deleteOldEvents(cutoffTime: number): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['events'], 'readwrite');
    const store = transaction.objectStore('events');
    const index = store.index('timestamp');
    
    const range = IDBKeyRange.upperBound(cutoffTime);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  private async deleteOldSessions(cutoffTime: number): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');
    const index = store.index('startTime');
    
    const range = IDBKeyRange.upperBound(cutoffTime);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  private async deleteOldUserProperties(cutoffTime: number): Promise<void> {
    // User properties typically don't have timestamps
    // This would be customized based on specific requirements
  }

  private async updateStorageMetrics(type: string, count: number): Promise<void> {
    // Update storage metrics for monitoring
    console.log(`Storage metrics updated: ${type} +${count}`);
  }

  private async setupStorageQuotaManagement(): Promise<void> {
    // Monitor storage quota and manage cleanup
    const checkQuota = async () => {
      const usage = await this.getQuotaUsage();
      const maxSize = this.config.maxStorageSize * 1024 * 1024; // Convert MB to bytes
      
      if (usage > maxSize * 0.9) { // 90% threshold
        console.warn('Storage quota nearing limit, triggering cleanup');
        await this.cleanupOldData();
      }
    };
    
    // Check quota every hour
    setInterval(checkQuota, 60 * 60 * 1000);
  }

  private async scheduleCleanupTasks(): Promise<void> {
    // Schedule daily cleanup
    const dailyCleanup = () => {
      this.cleanupOldData();
    };
    
    // Run cleanup every 24 hours
    setInterval(dailyCleanup, 24 * 60 * 60 * 1000);
  }

  private async getAllUserProperties(userId: string): Promise<any[]> {
    if (!this.db) return [];
    
    const transaction = this.db.transaction(['userProperties'], 'readonly');
    const store = transaction.objectStore('userProperties');
    const index = store.index('userId');
    
    const request = index.getAll(userId);
    return this.promisifyRequest(request);
  }

  private calculateTotalPlayTime(sessions: SessionData[]): number {
    return sessions.reduce((total, session) => {
      const duration = (session.endTime || Date.now()) - session.startTime;
      return total + duration;
    }, 0);
  }

  private extractPurchases(events: AnalyticsEvent[]): any[] {
    return events
      .filter(event => event.name === 'purchase')
      .map(event => ({
        id: event.id,
        item: event.data.item,
        price: event.data.amount,
        currency: event.data.currency,
        timestamp: event.timestamp,
      }));
  }

  private extractProgressHistory(events: AnalyticsEvent[]): any[] {
    return events
      .filter(event => event.name === 'game_progression')
      .map(event => ({
        timestamp: event.timestamp,
        level: event.data.metrics?.totalClicks || 0,
        currency: event.data.metrics?.totalCurrency || 0,
        buildings: event.data.metrics?.totalBuildings || 0,
      }));
  }

  private calculateEventTypes(events: AnalyticsEvent[]): Record<string, number> {
    return events.reduce((types, event) => {
      types[event.name] = (types[event.name] || 0) + 1;
      return types;
    }, {} as Record<string, number>);
  }
}