/**
 * Analytics Module Entry Point
 * Exports all analytics components and provides unified interface
 */

export { AnalyticsEngine, analyticsEngine } from './AnalyticsEngine';
export { DataProcessor, EventValidator } from './DataProcessor';
export { DataAggregator } from './DataAggregator';
export { PrivacyManager } from './PrivacyManager';
export { StorageManager } from './StorageManager';
export { ReportingEngine } from './ReportingEngine';

export * from './types';

// Convenience exports for common use cases
export {
  AnalyticsEvent,
  PlayerMetrics,
  SessionData,
  PrivacySettings,
  UserDataExport,
  PlayerBehaviorReport,
  GameBalanceReport,
  PerformanceReport,
} from './types';

// Initialize analytics system
export async function initializeAnalytics(config?: any): Promise<void> {
  const { analyticsEngine } = await import('./AnalyticsEngine');
  await analyticsEngine.initialize();
  
  // Setup global error handling for analytics
  setupGlobalErrorHandling();
  
  // Setup page visibility handling
  setupPageVisibilityHandling();
  
  console.log('Analytics system initialized successfully');
}

// Global error handling for analytics
function setupGlobalErrorHandling(): void {
  window.addEventListener('error', (event) => {
    import('./AnalyticsEngine').then(({ analyticsEngine }) => {
      analyticsEngine.trackError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript_error',
      });
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    import('./AnalyticsEngine').then(({ analyticsEngine }) => {
      analyticsEngine.trackError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
      });
    });
  });
}

// Page visibility handling
function setupPageVisibilityHandling(): void {
  document.addEventListener('visibilitychange', () => {
    import('./AnalyticsEngine').then(({ analyticsEngine }) => {
      if (document.hidden) {
        analyticsEngine.trackEvent('page_hidden', {
          category: 'session',
          timestamp: Date.now(),
        });
      } else {
        analyticsEngine.trackEvent('page_visible', {
          category: 'session',
          timestamp: Date.now(),
        });
      }
    });
  });
}

// Convenience functions for common analytics operations
export async function trackGameEvent(eventName: string, data?: any): Promise<void> {
  const { analyticsEngine } = await import('./AnalyticsEngine');
  await analyticsEngine.trackEvent(eventName, data);
}

export async function trackPlayerAction(action: string, details?: any): Promise<void> {
  const { analyticsEngine } = await import('./AnalyticsEngine');
  await analyticsEngine.trackPlayerAction(action, details);
}

export async function trackError(error: Error, context?: any): Promise<void> {
  const { analyticsEngine } = await import('./AnalyticsEngine');
  await analyticsEngine.trackError(error, context);
}

export async function trackPerformance(metrics: any): Promise<void> {
  const { analyticsEngine } = await import('./AnalyticsEngine');
  await analyticsEngine.trackPerformance(metrics);
}

export async function getInsights(timeRange?: string): Promise<any> {
  const { analyticsEngine } = await import('./AnalyticsEngine');
  return analyticsEngine.getInsights(timeRange);
}

export async function exportUserData(): Promise<any> {
  const { analyticsEngine } = await import('./AnalyticsEngine');
  return analyticsEngine.exportUserData();
}

export async function enableAnalytics(): Promise<void> {
  const { analyticsEngine } = await import('./AnalyticsEngine');
  await analyticsEngine.enableAnalytics();
}

export async function disableAnalytics(): Promise<void> {
  const { analyticsEngine } = await import('./AnalyticsEngine');
  await analyticsEngine.disableAnalytics();
}

// Privacy-focused analytics wrapper
export class PrivacyAwareAnalytics {
  private engine: any = null;

  async initialize(): Promise<void> {
    const { analyticsEngine } = await import('./AnalyticsEngine');
    this.engine = analyticsEngine;
    await this.engine.initialize();
  }

  async trackEvent(eventName: string, data?: any): Promise<void> {
    if (!this.engine) return;
    
    // Always respect user privacy preferences
    const hasConsent = await this.engine.privacyManager?.hasConsent();
    if (!hasConsent) {
      console.log('Analytics: Event not tracked due to privacy settings');
      return;
    }
    
    await this.engine.trackEvent(eventName, data);
  }

  async getReport(type: string, timeRange?: string): Promise<any> {
    if (!this.engine) return null;
    
    const hasConsent = await this.engine.privacyManager?.hasConsent();
    if (!hasConsent) {
      return this.getAnonymousReport(type, timeRange);
    }
    
    return this.engine.getInsights(timeRange);
  }

  private async getAnonymousReport(type: string, timeRange?: string): Promise<any> {
    // Return anonymized/aggregated data only
    return {
      type: 'anonymous',
      message: 'Anonymous usage statistics only',
      data: {
        totalEvents: 0,
        aggregatedMetrics: {},
      },
    };
  }
}

// Create privacy-aware analytics instance
export const privacyAwareAnalytics = new PrivacyAwareAnalytics();

// Development utilities
export const AnalyticsDevUtils = {
  async getStorageStats(): Promise<any> {
    const { analyticsEngine } = await import('./AnalyticsEngine');
    return analyticsEngine.storageManager?.getStorageStats();
  },

  async clearAllData(): Promise<void> {
    const { analyticsEngine } = await import('./AnalyticsEngine');
    await analyticsEngine.disableAnalytics();
    // Clear all stored data
    localStorage.removeItem('analytics_user_id');
    localStorage.removeItem('privacy_settings');
    indexedDB.deleteDatabase('LlamaWoolFarmAnalytics');
  },

  async generateTestData(count: number = 100): Promise<void> {
    const { analyticsEngine } = await import('./AnalyticsEngine');
    
    const eventTypes = [
      'player_action',
      'game_progression',
      'purchase',
      'achievement',
      'performance',
    ];
    
    const actions = [
      'click_llama',
      'purchase_building',
      'upgrade_building',
      'collect_offline_progress',
      'prestige',
    ];
    
    for (let i = 0; i < count; i++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      const data = {
        action,
        value: Math.floor(Math.random() * 1000),
        timestamp: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
      };
      
      await analyticsEngine.trackEvent(eventType, data);
    }
    
    console.log(`Generated ${count} test analytics events`);
  },
};

// Export default analytics instance
export default analyticsEngine;