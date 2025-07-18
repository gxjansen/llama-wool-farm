/**
 * Data Processing Pipeline for Analytics
 * Handles real-time event processing, aggregation, and ETL operations
 */

import { AnalyticsEvent, EventSchema, DataProcessorConfig } from './types';
import { EventValidator } from './EventValidator';
import { DataAggregator } from './DataAggregator';
import { EventEnricher } from './EventEnricher';

export class DataProcessor {
  private config: DataProcessorConfig;
  private validator: EventValidator;
  private aggregator: DataAggregator;
  private enricher: EventEnricher;
  private processingQueue: AnalyticsEvent[] = [];
  private isProcessing = false;

  constructor(config?: Partial<DataProcessorConfig>) {
    this.config = {
      batchSize: 50,
      batchTimeout: 5000,
      enableRealTimeProcessing: true,
      enableCompression: true,
      enableEncryption: false,
      ...config
    };

    this.validator = new EventValidator();
    this.aggregator = new DataAggregator();
    this.enricher = new EventEnricher();
  }

  async initialize(): Promise<void> {
    await this.validator.initialize();
    await this.aggregator.initialize();
    await this.enricher.initialize();
    console.log('DataProcessor initialized');
  }

  /**
   * Process a single event
   */
  async processEvent(event: AnalyticsEvent): Promise<AnalyticsEvent> {
    try {
      // Validate event
      const validationResult = await this.validator.validate(event);
      if (!validationResult.isValid) {
        throw new Error(`Event validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Enrich event with additional context
      const enrichedEvent = await this.enricher.enrich(event);

      // Process for real-time analytics
      if (this.config.enableRealTimeProcessing) {
        await this.processRealTime(enrichedEvent);
      }

      return enrichedEvent;
    } catch (error) {
      console.error('Failed to process event:', error);
      throw error;
    }
  }

  /**
   * Process a batch of events
   */
  async processBatch(events: AnalyticsEvent[]): Promise<AnalyticsEvent[]> {
    const processedEvents: AnalyticsEvent[] = [];

    for (const event of events) {
      try {
        const processedEvent = await this.processEvent(event);
        processedEvents.push(processedEvent);
      } catch (error) {
        console.error('Failed to process event in batch:', error);
        // Continue processing other events
      }
    }

    // Aggregate batch for reporting
    await this.aggregator.processBatch(processedEvents);

    return processedEvents;
  }

  /**
   * Process events for real-time analytics
   */
  private async processRealTime(event: AnalyticsEvent): Promise<void> {
    // Update real-time metrics
    await this.updateRealTimeMetrics(event);

    // Trigger alerts if necessary
    await this.checkAlerts(event);

    // Update live dashboards
    await this.updateLiveDashboards(event);
  }

  /**
   * Update real-time metrics
   */
  private async updateRealTimeMetrics(event: AnalyticsEvent): Promise<void> {
    const metrics = this.extractMetrics(event);
    
    // Update metrics in real-time storage (e.g., Redis)
    for (const [key, value] of Object.entries(metrics)) {
      await this.updateMetric(key, value);
    }
  }

  /**
   * Extract metrics from event
   */
  private extractMetrics(event: AnalyticsEvent): Record<string, number> {
    const metrics: Record<string, number> = {};

    // General metrics
    metrics['events_total'] = 1;
    metrics[`events_${event.name}`] = 1;
    metrics[`events_${event.name}_${event.userId}`] = 1;

    // Event-specific metrics
    switch (event.name) {
      case 'player_action':
        metrics['player_actions_total'] = 1;
        metrics[`player_action_${event.data.action}`] = 1;
        break;

      case 'game_progression':
        metrics['progressions_total'] = 1;
        metrics[`progression_${event.data.stage}`] = 1;
        break;

      case 'purchase':
        metrics['purchases_total'] = 1;
        metrics['revenue_total'] = event.data.amount || 0;
        break;

      case 'error':
        metrics['errors_total'] = 1;
        metrics[`error_${event.data.severity}`] = 1;
        break;

      case 'performance':
        if (event.data.frameRate) {
          metrics['avg_frame_rate'] = event.data.frameRate;
        }
        if (event.data.loadTime) {
          metrics['avg_load_time'] = event.data.loadTime;
        }
        break;
    }

    return metrics;
  }

  /**
   * Update a metric value
   */
  private async updateMetric(key: string, value: number): Promise<void> {
    // Implementation would update metrics in real-time storage
    console.log(`Updating metric: ${key} = ${value}`);
  }

  /**
   * Check for alerts based on events
   */
  private async checkAlerts(event: AnalyticsEvent): Promise<void> {
    // Error rate alerts
    if (event.name === 'error' && event.data.severity === 'critical') {
      await this.triggerAlert('critical_error', {
        message: event.data.message,
        userId: event.userId,
        timestamp: event.timestamp,
      });
    }

    // Performance alerts
    if (event.name === 'performance') {
      if (event.data.frameRate && event.data.frameRate < 30) {
        await this.triggerAlert('low_performance', {
          frameRate: event.data.frameRate,
          userId: event.userId,
        });
      }
    }

    // Business alerts
    if (event.name === 'purchase' && event.data.amount > 100) {
      await this.triggerAlert('high_value_purchase', {
        amount: event.data.amount,
        userId: event.userId,
      });
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(type: string, data: any): Promise<void> {
    console.log(`Alert triggered: ${type}`, data);
    // Implementation would send alerts to monitoring systems
  }

  /**
   * Update live dashboards
   */
  private async updateLiveDashboards(event: AnalyticsEvent): Promise<void> {
    // Implementation would update real-time dashboards
    console.log('Updating live dashboards with event:', event.name);
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): any {
    return {
      queueSize: this.processingQueue.length,
      isProcessing: this.isProcessing,
      config: this.config,
    };
  }
}

/**
 * Event Validator
 */
export class EventValidator {
  private schemas: Map<string, EventSchema> = new Map();

  async initialize(): Promise<void> {
    // Load event schemas
    this.loadEventSchemas();
  }

  async validate(event: AnalyticsEvent): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!event.id) errors.push('Event ID is required');
    if (!event.name) errors.push('Event name is required');
    if (!event.timestamp) errors.push('Event timestamp is required');
    if (!event.userId) errors.push('User ID is required');
    if (!event.sessionId) errors.push('Session ID is required');

    // Schema validation
    const schema = this.schemas.get(event.name);
    if (schema) {
      const schemaErrors = this.validateSchema(event, schema);
      errors.push(...schemaErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateSchema(event: AnalyticsEvent, schema: EventSchema): string[] {
    const errors: string[] = [];

    // Check required fields
    for (const field of schema.requiredFields) {
      if (!event.data[field]) {
        errors.push(`Required field missing: ${field}`);
      }
    }

    // Run custom validation
    if (schema.validation && !schema.validation(event.data)) {
      errors.push('Custom validation failed');
    }

    return errors;
  }

  private loadEventSchemas(): void {
    // Define event schemas
    this.schemas.set('player_action', {
      name: 'player_action',
      requiredFields: ['action'],
      optionalFields: ['details', 'value'],
      validation: (data: any) => typeof data.action === 'string',
    });

    this.schemas.set('game_progression', {
      name: 'game_progression',
      requiredFields: ['stage', 'metrics'],
      optionalFields: ['previousStage'],
      validation: (data: any) => typeof data.stage === 'string' && typeof data.metrics === 'object',
    });

    this.schemas.set('purchase', {
      name: 'purchase',
      requiredFields: ['item', 'amount', 'currency'],
      optionalFields: ['discount', 'source'],
      validation: (data: any) => typeof data.amount === 'number' && data.amount > 0,
    });

    this.schemas.set('error', {
      name: 'error',
      requiredFields: ['message', 'severity'],
      optionalFields: ['stack', 'context'],
      validation: (data: any) => ['low', 'medium', 'high', 'critical'].includes(data.severity),
    });

    this.schemas.set('performance', {
      name: 'performance',
      requiredFields: [],
      optionalFields: ['frameRate', 'loadTime', 'memoryUsage'],
      validation: (data: any) => {
        if (data.frameRate && (data.frameRate < 0 || data.frameRate > 120)) return false;
        if (data.loadTime && data.loadTime < 0) return false;
        return true;
      },
    });
  }
}

/**
 * Event Enricher
 */
export class EventEnricher {
  async initialize(): Promise<void> {
    // Initialize enrichment services
  }

  async enrich(event: AnalyticsEvent): Promise<AnalyticsEvent> {
    const enrichedEvent = { ...event };

    // Add geolocation data (if available)
    enrichedEvent.data.location = await this.getLocationData();

    // Add device information
    enrichedEvent.data.device = this.getDeviceInfo();

    // Add session context
    enrichedEvent.data.sessionContext = await this.getSessionContext(event.sessionId);

    // Add A/B test groups
    enrichedEvent.data.experiments = await this.getExperimentGroups(event.userId);

    return enrichedEvent;
  }

  private async getLocationData(): Promise<any> {
    // Implementation would get location data (respecting privacy)
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
    };
  }

  private getDeviceInfo(): any {
    return {
      userAgent: navigator.userAgent,
      screenWidth: screen.width,
      screenHeight: screen.height,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
    };
  }

  private async getSessionContext(sessionId: string): Promise<any> {
    // Implementation would get session context
    return {
      sessionId,
      startTime: Date.now(),
      referrer: document.referrer,
      landingPage: window.location.pathname,
    };
  }

  private async getExperimentGroups(userId: string): Promise<any> {
    // Implementation would get A/B test groups
    return {
      uiTheme: 'default',
      priceTest: 'control',
    };
  }
}