/**
 * Privacy Manager for Analytics
 * Handles GDPR compliance, data anonymization, and user consent management
 */

import { PrivacySettings, AnalyticsEvent, PlayerMetrics, UserDataExport } from './types';

export class PrivacyManager {
  private consentSettings: PrivacySettings;
  private dataRetentionPolicies: Map<string, number> = new Map();
  private anonymizationRules: Map<string, (data: any) => any> = new Map();

  constructor() {
    this.consentSettings = {
      analyticsConsent: false,
      personalizedAds: false,
      dataRetention: 30, // days
      anonymizeIp: true,
      shareWithThirdParties: false,
    };
    
    this.initializeAnonymizationRules();
    this.initializeDataRetentionPolicies();
  }

  async initialize(): Promise<void> {
    await this.loadConsentSettings();
    await this.loadDataRetentionPolicies();
    console.log('PrivacyManager initialized');
  }

  /**
   * Check if user has given consent for analytics
   */
  async hasConsent(): Promise<boolean> {
    return this.consentSettings.analyticsConsent;
  }

  /**
   * Set user consent for analytics
   */
  async setConsent(consent: boolean): Promise<void> {
    this.consentSettings.analyticsConsent = consent;
    await this.saveConsentSettings();
    
    if (consent) {
      await this.logConsentEvent('granted');
    } else {
      await this.logConsentEvent('revoked');
      await this.scheduleDataDeletion();
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
    this.consentSettings = { ...this.consentSettings, ...settings };
    await this.saveConsentSettings();
  }

  /**
   * Get current privacy settings
   */
  getPrivacySettings(): PrivacySettings {
    return { ...this.consentSettings };
  }

  /**
   * Sanitize data according to privacy rules
   */
  async sanitizeData(data: any): Promise<any> {
    if (!this.consentSettings.analyticsConsent) {
      return this.anonymizeData(data);
    }

    const sanitizedData = { ...data };

    // Apply anonymization rules
    for (const [field, rule] of this.anonymizationRules.entries()) {
      if (sanitizedData[field] !== undefined) {
        sanitizedData[field] = rule(sanitizedData[field]);
      }
    }

    // Remove sensitive fields if no consent
    if (!this.consentSettings.shareWithThirdParties) {
      delete sanitizedData.personalInfo;
      delete sanitizedData.contactInfo;
    }

    return sanitizedData;
  }

  /**
   * Sanitize player metrics
   */
  async sanitizeMetrics(metrics: PlayerMetrics): Promise<PlayerMetrics> {
    const sanitizedMetrics = { ...metrics };

    // Always anonymize achievement data if it contains personal info
    if (sanitizedMetrics.achievements) {
      sanitizedMetrics.achievements = sanitizedMetrics.achievements.map(
        achievement => this.anonymizeAchievement(achievement)
      );
    }

    return sanitizedMetrics;
  }

  /**
   * Anonymize entire data object
   */
  private anonymizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const anonymized: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        anonymized[key] = this.anonymizeValue(value);
      } else if (typeof value === 'object' && value !== null) {
        anonymized[key] = this.anonymizeData(value);
      } else {
        anonymized[key] = value;
      }
    }

    return anonymized;
  }

  /**
   * Check if field is sensitive
   */
  private isSensitiveField(field: string): boolean {
    const sensitiveFields = [
      'email',
      'phone',
      'address',
      'ip',
      'userId',
      'sessionId',
      'deviceId',
      'fingerprint',
      'location',
      'personalInfo',
      'contactInfo',
    ];

    return sensitiveFields.some(sensitive => 
      field.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  /**
   * Anonymize a single value
   */
  private anonymizeValue(value: any): any {
    if (typeof value === 'string') {
      if (value.includes('@')) {
        // Email anonymization
        return this.anonymizeEmail(value);
      }
      if (value.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
        // IP address anonymization
        return this.anonymizeIp(value);
      }
      // Generic string anonymization
      return this.hashString(value);
    }
    
    if (typeof value === 'number') {
      // Numeric value anonymization (add noise)
      return this.addNoise(value);
    }

    return value;
  }

  /**
   * Anonymize email address
   */
  private anonymizeEmail(email: string): string {
    if (!this.consentSettings.analyticsConsent) {
      return this.hashString(email);
    }
    
    const [localPart, domain] = email.split('@');
    const anonymizedLocal = localPart.slice(0, 2) + '*'.repeat(Math.max(0, localPart.length - 2));
    return `${anonymizedLocal}@${domain}`;
  }

  /**
   * Anonymize IP address
   */
  private anonymizeIp(ip: string): string {
    if (!this.consentSettings.anonymizeIp) {
      return ip;
    }
    
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    
    return this.hashString(ip);
  }

  /**
   * Hash a string for anonymization
   */
  private hashString(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash)}`;
  }

  /**
   * Add noise to numeric values
   */
  private addNoise(value: number): number {
    const noise = (Math.random() - 0.5) * 0.1 * value; // 10% noise
    return Math.round(value + noise);
  }

  /**
   * Anonymize achievement data
   */
  private anonymizeAchievement(achievement: string): string {
    // Remove any personal identifiers from achievement names
    return achievement.replace(/user_\d+/g, 'user_anonymous');
  }

  /**
   * Initialize anonymization rules
   */
  private initializeAnonymizationRules(): void {
    this.anonymizationRules.set('ip', (ip: string) => this.anonymizeIp(ip));
    this.anonymizationRules.set('email', (email: string) => this.anonymizeEmail(email));
    this.anonymizationRules.set('userId', (userId: string) => this.hashString(userId));
    this.anonymizationRules.set('sessionId', (sessionId: string) => this.hashString(sessionId));
    this.anonymizationRules.set('deviceId', (deviceId: string) => this.hashString(deviceId));
  }

  /**
   * Initialize data retention policies
   */
  private initializeDataRetentionPolicies(): void {
    this.dataRetentionPolicies.set('analytics_events', 365); // 1 year
    this.dataRetentionPolicies.set('session_data', 90); // 3 months
    this.dataRetentionPolicies.set('error_logs', 30); // 1 month
    this.dataRetentionPolicies.set('performance_metrics', 180); // 6 months
    this.dataRetentionPolicies.set('user_preferences', 1095); // 3 years
  }

  /**
   * Get data retention period for a data type
   */
  getDataRetentionPeriod(dataType: string): number {
    return this.dataRetentionPolicies.get(dataType) || this.consentSettings.dataRetention;
  }

  /**
   * Check if data should be deleted based on retention policy
   */
  shouldDeleteData(dataType: string, dataAge: number): boolean {
    const retentionPeriod = this.getDataRetentionPeriod(dataType);
    const maxAge = retentionPeriod * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    return dataAge > maxAge;
  }

  /**
   * Export user data for GDPR compliance
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    // Implementation would collect all user data
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
        totalPlayTime: 0,
        achievements: [],
        purchases: [],
        progressHistory: [],
      },
      analyticsData: {
        totalEvents: 0,
        eventTypes: {},
        sessions: [],
        preferences: this.consentSettings,
      },
      preferences: {
        privacy: this.consentSettings,
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
   * Clear user consent and data
   */
  async clearConsent(): Promise<void> {
    this.consentSettings = {
      analyticsConsent: false,
      personalizedAds: false,
      dataRetention: 30,
      anonymizeIp: true,
      shareWithThirdParties: false,
    };
    
    await this.saveConsentSettings();
  }

  /**
   * Load consent settings from storage
   */
  private async loadConsentSettings(): Promise<void> {
    const stored = localStorage.getItem('privacy_settings');
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        this.consentSettings = { ...this.consentSettings, ...settings };
      } catch (error) {
        console.error('Failed to load consent settings:', error);
      }
    }
  }

  /**
   * Save consent settings to storage
   */
  private async saveConsentSettings(): Promise<void> {
    try {
      localStorage.setItem('privacy_settings', JSON.stringify(this.consentSettings));
    } catch (error) {
      console.error('Failed to save consent settings:', error);
    }
  }

  /**
   * Load data retention policies from configuration
   */
  private async loadDataRetentionPolicies(): Promise<void> {
    // Implementation would load from configuration
    console.log('Data retention policies loaded');
  }

  /**
   * Log consent event
   */
  private async logConsentEvent(action: 'granted' | 'revoked'): Promise<void> {
    const event = {
      type: 'consent_change',
      action,
      timestamp: Date.now(),
      settings: this.consentSettings,
    };
    
    // Log to audit trail
    console.log('Consent event logged:', event);
  }

  /**
   * Schedule data deletion
   */
  private async scheduleDataDeletion(): Promise<void> {
    // Implementation would schedule data deletion
    console.log('Data deletion scheduled');
  }

  /**
   * Validate data processing compliance
   */
  async validateCompliance(event: AnalyticsEvent): Promise<boolean> {
    // Check if we have consent to process this event
    if (!this.consentSettings.analyticsConsent) {
      return false;
    }

    // Check if event contains sensitive data without proper consent
    if (this.containsSensitiveData(event) && !this.hasSpecificConsent(event)) {
      return false;
    }

    // Check data retention compliance
    const dataAge = Date.now() - event.timestamp;
    if (this.shouldDeleteData('analytics_events', dataAge)) {
      return false;
    }

    return true;
  }

  /**
   * Check if event contains sensitive data
   */
  private containsSensitiveData(event: AnalyticsEvent): boolean {
    const sensitiveFields = ['email', 'phone', 'address', 'personalInfo'];
    return sensitiveFields.some(field => 
      JSON.stringify(event).toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * Check if we have specific consent for this type of data
   */
  private hasSpecificConsent(event: AnalyticsEvent): boolean {
    // Implementation would check specific consent types
    return this.consentSettings.analyticsConsent;
  }
}