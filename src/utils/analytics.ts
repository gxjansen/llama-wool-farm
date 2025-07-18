// Simple analytics wrapper for game events
// Can be extended to integrate with Google Analytics, Mixpanel, etc.

interface GameEvent {
  name: string;
  category: string;
  value?: number;
  label?: string;
  metadata?: Record<string, any>;
}

class Analytics {
  private enabled: boolean = false;
  private sessionId: string;
  private userId: string;
  private eventQueue: GameEvent[] = [];

  constructor() {
    this.sessionId = this.generateId();
    this.userId = this.getUserId();
  }

  async initialize(): Promise<void> {
    // Check if analytics should be enabled
    const consent = localStorage.getItem('analytics-consent');
    this.enabled = consent === 'true';

    if (this.enabled) {
      // Initialize third-party analytics here
      // Example: Google Analytics, Mixpanel, etc.
      console.log('Analytics initialized');
      
      // Flush any queued events
      this.flushEventQueue();
    }
  }

  trackEvent(event: GameEvent): void {
    if (!this.enabled) {
      this.eventQueue.push(event);
      return;
    }

    // Add common properties
    const enrichedEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      metadata: {
        ...event.metadata,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
      },
    };

    // Send to analytics service
    this.sendEvent(enrichedEvent);
  }

  trackGameStart(): void {
    this.trackEvent({
      name: 'game_start',
      category: 'game',
    });
  }

  trackLevelComplete(level: number, score: number): void {
    this.trackEvent({
      name: 'level_complete',
      category: 'game',
      value: score,
      metadata: { level },
    });
  }

  trackPurchase(item: string, amount: number, currency: string): void {
    this.trackEvent({
      name: 'purchase',
      category: 'monetization',
      value: amount,
      label: item,
      metadata: { currency },
    });
  }

  trackUpgrade(upgradeType: string, level: number): void {
    this.trackEvent({
      name: 'upgrade',
      category: 'game',
      label: upgradeType,
      value: level,
    });
  }

  trackPrestige(prestigeLevel: number, soulShears: number): void {
    this.trackEvent({
      name: 'prestige',
      category: 'game',
      value: prestigeLevel,
      metadata: { soulShears },
    });
  }

  trackError(error: Error, context?: string): void {
    this.trackEvent({
      name: 'error',
      category: 'technical',
      label: error.message,
      metadata: {
        stack: error.stack,
        context,
      },
    });
  }

  setUserProperty(property: string, value: any): void {
    if (!this.enabled) return;

    // Set user property in analytics service
    console.log(`Set user property: ${property} = ${value}`);
  }

  setUserId(userId: string): void {
    this.userId = userId;
    localStorage.setItem('analytics-user-id', userId);
  }

  enableAnalytics(): void {
    this.enabled = true;
    localStorage.setItem('analytics-consent', 'true');
    this.flushEventQueue();
  }

  disableAnalytics(): void {
    this.enabled = false;
    localStorage.setItem('analytics-consent', 'false');
  }

  private sendEvent(event: any): void {
    // Implementation would send to actual analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
    }

    // Example: Send to Google Analytics
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', event.name, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        custom_parameters: event.metadata,
      });
    }
  }

  private flushEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.trackEvent(event);
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserId(): string {
    let userId = localStorage.getItem('analytics-user-id');
    if (!userId) {
      userId = this.generateId();
      localStorage.setItem('analytics-user-id', userId);
    }
    return userId;
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Export initialization function
export async function initializeAnalytics(): Promise<void> {
  await analytics.initialize();
}

// Export convenience functions
export const trackEvent = analytics.trackEvent.bind(analytics);
export const trackGameStart = analytics.trackGameStart.bind(analytics);
export const trackLevelComplete = analytics.trackLevelComplete.bind(analytics);
export const trackPurchase = analytics.trackPurchase.bind(analytics);
export const trackUpgrade = analytics.trackUpgrade.bind(analytics);
export const trackPrestige = analytics.trackPrestige.bind(analytics);
export const trackError = analytics.trackError.bind(analytics);