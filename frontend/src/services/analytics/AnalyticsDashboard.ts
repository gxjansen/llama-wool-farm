/**
 * Analytics Dashboard Component
 * Provides real-time analytics visualization and insights
 */

import { ReportingEngine } from './ReportingEngine';
import { AnalyticsEngine } from './AnalyticsEngine';

export interface DashboardConfig {
  refreshInterval: number; // milliseconds
  enableRealTime: boolean;
  enablePredictiveAnalytics: boolean;
  enablePlayerSegmentation: boolean;
  theme: 'light' | 'dark' | 'auto';
  layout: 'grid' | 'list' | 'cards';
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'text' | 'progress';
  title: string;
  description?: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  config: any;
  refreshInterval?: number;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  data: any[];
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  labels?: string[];
  options?: any;
}

export class AnalyticsDashboard {
  private config: DashboardConfig;
  private reportingEngine: ReportingEngine;
  private analyticsEngine: AnalyticsEngine;
  private widgets: Map<string, DashboardWidget> = new Map();
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config?: Partial<DashboardConfig>) {
    this.config = {
      refreshInterval: 5000, // 5 seconds
      enableRealTime: true,
      enablePredictiveAnalytics: true,
      enablePlayerSegmentation: true,
      theme: 'auto',
      layout: 'grid',
      ...config
    };

    this.reportingEngine = new ReportingEngine();
    this.analyticsEngine = new AnalyticsEngine();
  }

  async initialize(): Promise<void> {
    await this.reportingEngine.initialize();
    await this.analyticsEngine.initialize();
    
    // Setup default widgets
    this.setupDefaultWidgets();
    
    // Start real-time updates
    if (this.config.enableRealTime) {
      this.startRealTimeUpdates();
    }
    
    console.log('Analytics Dashboard initialized');
  }

  /**
   * Add a widget to the dashboard
   */
  addWidget(widget: DashboardWidget): void {
    this.widgets.set(widget.id, widget);
    this.setupWidgetRefresh(widget);
  }

  /**
   * Remove a widget from the dashboard
   */
  removeWidget(widgetId: string): void {
    this.widgets.delete(widgetId);
    
    // Clear refresh timer
    const timer = this.refreshTimers.get(widgetId);
    if (timer) {
      clearInterval(timer);
      this.refreshTimers.delete(widgetId);
    }
  }

  /**
   * Update a widget's configuration
   */
  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;

    const updatedWidget = { ...widget, ...updates };
    this.widgets.set(widgetId, updatedWidget);
    
    // Restart refresh timer if interval changed
    if (updates.refreshInterval !== undefined) {
      this.setupWidgetRefresh(updatedWidget);
    }
  }

  /**
   * Get all widgets
   */
  getWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widget data
   */
  async getWidgetData(widgetId: string): Promise<any> {
    const widget = this.widgets.get(widgetId);
    if (!widget) return null;

    switch (widget.type) {
      case 'metric':
        return this.getMetricData(widget);
      case 'chart':
        return this.getChartData(widget);
      case 'table':
        return this.getTableData(widget);
      case 'progress':
        return this.getProgressData(widget);
      default:
        return null;
    }
  }

  /**
   * Get dashboard overview
   */
  async getDashboardOverview(): Promise<any> {
    const overview = await this.reportingEngine.generateDashboardData();
    
    return {
      ...overview,
      widgets: await this.getAllWidgetData(),
      lastUpdated: new Date().toISOString(),
      config: this.config,
    };
  }

  /**
   * Export dashboard configuration
   */
  exportConfig(): any {
    return {
      config: this.config,
      widgets: Array.from(this.widgets.values()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Import dashboard configuration
   */
  importConfig(configData: any): void {
    if (configData.config) {
      this.config = { ...this.config, ...configData.config };
    }
    
    if (configData.widgets) {
      this.widgets.clear();
      configData.widgets.forEach((widget: DashboardWidget) => {
        this.addWidget(widget);
      });
    }
  }

  /**
   * Subscribe to dashboard events
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Emit dashboard events
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Setup default widgets
   */
  private setupDefaultWidgets(): void {
    // Player metrics widget
    this.addWidget({
      id: 'player_metrics',
      type: 'metric',
      title: 'Player Metrics',
      description: 'Current session statistics',
      size: 'medium',
      position: { x: 0, y: 0 },
      config: {
        metrics: ['totalClicks', 'totalCurrency', 'totalBuildings', 'prestigeLevel'],
        showTrends: true,
      },
      refreshInterval: 10000, // 10 seconds
    });

    // Performance chart widget
    this.addWidget({
      id: 'performance_chart',
      type: 'chart',
      title: 'Performance Over Time',
      description: 'Frame rate and load times',
      size: 'large',
      position: { x: 1, y: 0 },
      config: {
        chart: {
          type: 'line',
          metrics: ['frameRate', 'loadTime'],
          timeRange: '1h',
        },
      },
      refreshInterval: 30000, // 30 seconds
    });

    // Error rate widget
    this.addWidget({
      id: 'error_rate',
      type: 'progress',
      title: 'Error Rate',
      description: 'Current error percentage',
      size: 'small',
      position: { x: 2, y: 0 },
      config: {
        maxValue: 5, // 5% max
        warningThreshold: 2,
        errorThreshold: 4,
        unit: '%',
      },
      refreshInterval: 15000, // 15 seconds
    });

    // Recent events table
    this.addWidget({
      id: 'recent_events',
      type: 'table',
      title: 'Recent Events',
      description: 'Latest player actions',
      size: 'medium',
      position: { x: 0, y: 1 },
      config: {
        columns: ['timestamp', 'event', 'user', 'details'],
        maxRows: 10,
        refreshInterval: 5000,
      },
      refreshInterval: 5000, // 5 seconds
    });

    // Game progression chart
    this.addWidget({
      id: 'game_progression',
      type: 'chart',
      title: 'Game Progression',
      description: 'Player advancement over time',
      size: 'large',
      position: { x: 1, y: 1 },
      config: {
        chart: {
          type: 'area',
          metrics: ['level', 'currency', 'buildings'],
          timeRange: '7d',
        },
      },
      refreshInterval: 60000, // 1 minute
    });
  }

  /**
   * Setup widget refresh timer
   */
  private setupWidgetRefresh(widget: DashboardWidget): void {
    // Clear existing timer
    const existingTimer = this.refreshTimers.get(widget.id);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Setup new timer
    const interval = widget.refreshInterval || this.config.refreshInterval;
    const timer = setInterval(async () => {
      try {
        const data = await this.getWidgetData(widget.id);
        this.emit('widgetUpdated', { widgetId: widget.id, data });
      } catch (error) {
        console.error(`Failed to refresh widget ${widget.id}:`, error);
      }
    }, interval);

    this.refreshTimers.set(widget.id, timer);
  }

  /**
   * Start real-time updates
   */
  private startRealTimeUpdates(): void {
    // Listen for analytics events
    this.analyticsEngine.on('batchProcessed', (batch) => {
      this.emit('newData', { type: 'batch', data: batch });
    });

    this.analyticsEngine.on('error', (error) => {
      this.emit('error', error);
    });

    // Update dashboard every interval
    const dashboardTimer = setInterval(async () => {
      try {
        const overview = await this.getDashboardOverview();
        this.emit('dashboardUpdated', overview);
      } catch (error) {
        console.error('Failed to update dashboard:', error);
      }
    }, this.config.refreshInterval);

    this.refreshTimers.set('dashboard', dashboardTimer);
  }

  /**
   * Get metric data for a widget
   */
  private async getMetricData(widget: DashboardWidget): Promise<any> {
    const metrics = widget.config.metrics || [];
    const data: any = {};

    for (const metric of metrics) {
      switch (metric) {
        case 'totalClicks':
          data.totalClicks = await this.getTotalClicks();
          break;
        case 'totalCurrency':
          data.totalCurrency = await this.getTotalCurrency();
          break;
        case 'totalBuildings':
          data.totalBuildings = await this.getTotalBuildings();
          break;
        case 'prestigeLevel':
          data.prestigeLevel = await this.getPrestigeLevel();
          break;
        case 'activeUsers':
          data.activeUsers = await this.getActiveUsers();
          break;
        case 'sessionLength':
          data.sessionLength = await this.getAverageSessionLength();
          break;
        case 'errorRate':
          data.errorRate = await this.getErrorRate();
          break;
      }
    }

    return data;
  }

  /**
   * Get chart data for a widget
   */
  private async getChartData(widget: DashboardWidget): Promise<any> {
    const chartConfig = widget.config.chart;
    const timeRange = chartConfig.timeRange || '1h';
    const metrics = chartConfig.metrics || [];

    const data = await this.getTimeSeriesData(metrics, timeRange);
    
    return {
      type: chartConfig.type,
      data,
      options: this.generateChartOptions(chartConfig),
    };
  }

  /**
   * Get table data for a widget
   */
  private async getTableData(widget: DashboardWidget): Promise<any> {
    const config = widget.config;
    const maxRows = config.maxRows || 10;

    // Get recent events
    const events = await this.getRecentEvents(maxRows);
    
    return {
      columns: config.columns,
      rows: events.map(event => ({
        timestamp: new Date(event.timestamp).toLocaleTimeString(),
        event: event.name,
        user: event.userId.substring(0, 8) + '...',
        details: this.formatEventDetails(event),
      })),
    };
  }

  /**
   * Get progress data for a widget
   */
  private async getProgressData(widget: DashboardWidget): Promise<any> {
    const config = widget.config;
    const value = await this.getProgressValue(widget.id);
    
    return {
      value,
      maxValue: config.maxValue,
      percentage: (value / config.maxValue) * 100,
      status: this.getProgressStatus(value, config),
      unit: config.unit || '',
    };
  }

  /**
   * Get all widget data
   */
  private async getAllWidgetData(): Promise<any> {
    const widgetData: any = {};
    
    for (const [id, widget] of this.widgets.entries()) {
      try {
        widgetData[id] = await this.getWidgetData(id);
      } catch (error) {
        console.error(`Failed to get data for widget ${id}:`, error);
        widgetData[id] = null;
      }
    }
    
    return widgetData;
  }

  /**
   * Helper methods for data retrieval
   */
  private async getTotalClicks(): Promise<number> {
    // Implementation would get total clicks from game state
    return Math.floor(Math.random() * 1000000);
  }

  private async getTotalCurrency(): Promise<number> {
    // Implementation would get total currency from game state
    return Math.floor(Math.random() * 50000);
  }

  private async getTotalBuildings(): Promise<number> {
    // Implementation would get total buildings from game state
    return Math.floor(Math.random() * 100);
  }

  private async getPrestigeLevel(): Promise<number> {
    // Implementation would get prestige level from game state
    return Math.floor(Math.random() * 10);
  }

  private async getActiveUsers(): Promise<number> {
    // Implementation would get active users count
    return Math.floor(Math.random() * 500) + 100;
  }

  private async getAverageSessionLength(): Promise<number> {
    // Implementation would get average session length
    return Math.floor(Math.random() * 60) + 20; // 20-80 minutes
  }

  private async getErrorRate(): Promise<number> {
    // Implementation would get current error rate
    return Math.random() * 3; // 0-3%
  }

  private async getTimeSeriesData(metrics: string[], timeRange: string): Promise<any> {
    // Implementation would get time series data
    const data = [];
    const now = Date.now();
    const points = 20;
    
    for (let i = 0; i < points; i++) {
      const timestamp = now - (i * 60000); // 1 minute intervals
      const dataPoint: any = { timestamp };
      
      metrics.forEach(metric => {
        dataPoint[metric] = Math.random() * 100;
      });
      
      data.unshift(dataPoint);
    }
    
    return data;
  }

  private async getRecentEvents(limit: number): Promise<any[]> {
    // Implementation would get recent events
    const events = [];
    const now = Date.now();
    
    for (let i = 0; i < limit; i++) {
      events.push({
        id: `event_${i}`,
        name: ['player_action', 'purchase', 'achievement', 'error'][Math.floor(Math.random() * 4)],
        timestamp: now - (i * 30000), // 30 seconds apart
        userId: `user_${Math.floor(Math.random() * 100)}`,
        data: { action: 'click_llama', value: Math.random() * 100 },
      });
    }
    
    return events;
  }

  private async getProgressValue(widgetId: string): Promise<number> {
    // Implementation would get progress value based on widget type
    switch (widgetId) {
      case 'error_rate':
        return await this.getErrorRate();
      default:
        return Math.random() * 100;
    }
  }

  private getProgressStatus(value: number, config: any): string {
    if (config.errorThreshold && value >= config.errorThreshold) {
      return 'error';
    }
    if (config.warningThreshold && value >= config.warningThreshold) {
      return 'warning';
    }
    return 'success';
  }

  private formatEventDetails(event: any): string {
    if (event.data.action) {
      return event.data.action;
    }
    if (event.data.value) {
      return `Value: ${event.data.value}`;
    }
    return 'No details';
  }

  private generateChartOptions(config: any): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Time',
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Value',
          },
        },
      },
    };
  }
}

// Export dashboard instance
export const analyticsDashboard = new AnalyticsDashboard();