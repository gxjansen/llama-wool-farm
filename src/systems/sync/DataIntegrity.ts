/**
 * Data Integrity System for Llama Wool Farm
 * Handles corruption detection, validation, and recovery mechanisms
 */

import Decimal from 'decimal.js';
import { GameSave, WoolType, BuildingType } from '../../types/game.types';
import { VersionedGameState } from './SyncEngine';

export interface CorruptionReport {
  corrupted: boolean;
  severity: CorruptionSeverity;
  issues: CorruptionIssue[];
  repairableIssues: number;
  criticalIssues: number;
  timestamp: number;
}

export interface CorruptionIssue {
  id: string;
  type: CorruptionType;
  path: string;
  description: string;
  severity: CorruptionSeverity;
  expectedValue?: any;
  actualValue?: any;
  repairable: boolean;
  repairStrategy?: string;
}

export enum CorruptionType {
  INVALID_RANGE = 'invalid_range',
  MISSING_REFERENCE = 'missing_reference',
  TEMPORAL_INCONSISTENCY = 'temporal_inconsistency',
  CHECKSUM_MISMATCH = 'checksum_mismatch',
  TYPE_MISMATCH = 'type_mismatch',
  STRUCTURAL_CORRUPTION = 'structural_corruption',
  CIRCULAR_REFERENCE = 'circular_reference',
  ORPHANED_DATA = 'orphaned_data'
}

export enum CorruptionSeverity {
  LOW = 'low',        // Minor issues, auto-repairable
  MEDIUM = 'medium',  // Significant issues, may require user input
  HIGH = 'high',      // Major issues, data loss possible
  CRITICAL = 'critical' // Game-breaking issues, requires immediate attention
}

export interface ValidationRule {
  name: string;
  path: string;
  validator: (value: any, context: ValidationContext) => ValidationResult;
  repairer?: (value: any, context: ValidationContext) => any;
}

export interface ValidationContext {
  state: VersionedGameState;
  path: string;
  currentValue: any;
  parentValue?: any;
  rootValue: VersionedGameState;
}

export interface ValidationResult {
  valid: boolean;
  issues: CorruptionIssue[];
  repaired?: any;
}

export interface RecoveryPlan {
  id: string;
  timestamp: number;
  targetState: VersionedGameState;
  corruptionReport: CorruptionReport;
  recoverySteps: RecoveryStep[];
  estimatedDataLoss: number;
  riskLevel: RiskLevel;
}

export interface RecoveryStep {
  id: string;
  type: RecoveryType;
  description: string;
  path: string;
  action: RecoveryAction;
  reversible: boolean;
  estimatedLoss: number;
}

export enum RecoveryType {
  REPAIR = 'repair',
  RESET = 'reset',
  RECONSTRUCT = 'reconstruct',
  REMOVE = 'remove',
  SUBSTITUTE = 'substitute'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface RecoveryAction {
  type: string;
  parameters: Record<string, any>;
  validator?: (result: any) => boolean;
}

export interface IntegrityChecksum {
  algorithm: string;
  value: string;
  timestamp: number;
  includedPaths: string[];
}

/**
 * Data integrity manager for game state validation and recovery
 */
export class DataIntegrityManager {
  private validationRules: ValidationRule[] = [];
  private checksumCache: Map<string, IntegrityChecksum> = new Map();

  constructor() {
    this.initializeValidationRules();
  }

  /**
   * Initialize built-in validation rules
   */
  private initializeValidationRules(): void {
    // Wool validation rules
    this.validationRules.push({
      name: 'wool_amounts_valid',
      path: 'woolCounts.*',
      validator: this.validateWoolAmounts.bind(this),
      repairer: this.repairWoolAmounts.bind(this)
    });

    // Building validation rules
    this.validationRules.push({
      name: 'building_levels_valid',
      path: 'buildings.*',
      validator: this.validateBuildingLevels.bind(this),
      repairer: this.repairBuildingLevels.bind(this)
    });

    // Timestamp validation rules
    this.validationRules.push({
      name: 'timestamps_valid',
      path: '*.timestamp',
      validator: this.validateTimestamps.bind(this),
      repairer: this.repairTimestamps.bind(this)
    });

    // Checksum validation rules
    this.validationRules.push({
      name: 'checksum_valid',
      path: 'checksum',
      validator: this.validateChecksum.bind(this),
      repairer: this.repairChecksum.bind(this)
    });

    // Reference integrity rules
    this.validationRules.push({
      name: 'references_valid',
      path: 'purchasedUpgrades.*',
      validator: this.validateReferences.bind(this),
      repairer: this.repairReferences.bind(this)
    });
  }

  /**
   * Perform comprehensive corruption detection
   */
  async detectCorruption(state: VersionedGameState): Promise<CorruptionReport> {
    const issues: CorruptionIssue[] = [];
    const startTime = Date.now();

    // Run all validation rules
    for (const rule of this.validationRules) {
      const ruleIssues = await this.runValidationRule(state, rule);
      issues.push(...ruleIssues);
    }

    // Additional integrity checks
    issues.push(...this.checkStructuralIntegrity(state));
    issues.push(...this.checkDataConsistency(state));
    issues.push(...this.checkTemporalConsistency(state));

    const repairableIssues = issues.filter(issue => issue.repairable).length;
    const criticalIssues = issues.filter(issue => issue.severity === CorruptionSeverity.CRITICAL).length;

    return {
      corrupted: issues.length > 0,
      severity: this.calculateOverallSeverity(issues),
      issues,
      repairableIssues,
      criticalIssues,
      timestamp: Date.now()
    };
  }

  /**
   * Create a recovery plan for corrupted data
   */
  async createRecoveryPlan(
    state: VersionedGameState,
    corruptionReport: CorruptionReport
  ): Promise<RecoveryPlan> {
    const recoverySteps: RecoveryStep[] = [];
    let estimatedDataLoss = 0;

    // Create recovery steps for each issue
    for (const issue of corruptionReport.issues) {
      const step = this.createRecoveryStep(issue);
      recoverySteps.push(step);
      estimatedDataLoss += step.estimatedLoss;
    }

    // Sort steps by priority (critical first)
    recoverySteps.sort((a, b) => {
      const priorityA = this.getRecoveryPriority(a);
      const priorityB = this.getRecoveryPriority(b);
      return priorityB - priorityA;
    });

    return {
      id: this.generateRecoveryId(),
      timestamp: Date.now(),
      targetState: state,
      corruptionReport,
      recoverySteps,
      estimatedDataLoss,
      riskLevel: this.calculateRiskLevel(corruptionReport, estimatedDataLoss)
    };
  }

  /**
   * Execute recovery plan
   */
  async executeRecovery(
    state: VersionedGameState,
    plan: RecoveryPlan
  ): Promise<VersionedGameState> {
    let recoveredState = { ...state };

    // Execute recovery steps in order
    for (const step of plan.recoverySteps) {
      try {
        recoveredState = await this.executeRecoveryStep(recoveredState, step);
      } catch (error) {
        console.error(`Recovery step failed: ${step.id}`, error);
        // Continue with other steps
      }
    }

    // Validate recovery result
    const validationResult = await this.detectCorruption(recoveredState);
    if (validationResult.corrupted) {
      console.warn('Recovery incomplete, some issues remain');
    }

    // Update metadata
    recoveredState.timestamp = Date.now();
    recoveredState.version = this.generateRecoveryVersion();

    return recoveredState;
  }

  /**
   * Generate integrity checksum for state
   */
  generateIntegrityChecksum(
    state: VersionedGameState,
    includedPaths?: string[]
  ): IntegrityChecksum {
    const paths = includedPaths || this.getDefaultChecksumPaths();
    const dataToHash = this.extractDataForChecksum(state, paths);
    
    return {
      algorithm: 'sha256',
      value: this.calculateHash(dataToHash),
      timestamp: Date.now(),
      includedPaths: paths
    };
  }

  /**
   * Verify integrity checksum
   */
  verifyIntegrityChecksum(
    state: VersionedGameState,
    checksum: IntegrityChecksum
  ): boolean {
    const currentChecksum = this.generateIntegrityChecksum(state, checksum.includedPaths);
    return currentChecksum.value === checksum.value;
  }

  /**
   * Validate wool amounts
   */
  private validateWoolAmounts(value: any, context: ValidationContext): ValidationResult {
    const issues: CorruptionIssue[] = [];

    if (typeof value !== 'string') {
      issues.push({
        id: `wool_type_${context.path}`,
        type: CorruptionType.TYPE_MISMATCH,
        path: context.path,
        description: 'Wool amount must be a string (Decimal)',
        severity: CorruptionSeverity.MEDIUM,
        expectedValue: 'string',
        actualValue: typeof value,
        repairable: true,
        repairStrategy: 'convert_to_string'
      });
    }

    try {
      const decimal = new Decimal(value);
      
      if (decimal.isNaN()) {
        issues.push({
          id: `wool_nan_${context.path}`,
          type: CorruptionType.INVALID_RANGE,
          path: context.path,
          description: 'Wool amount is NaN',
          severity: CorruptionSeverity.HIGH,
          expectedValue: 'valid number',
          actualValue: value,
          repairable: true,
          repairStrategy: 'reset_to_zero'
        });
      }

      if (decimal.isNegative()) {
        issues.push({
          id: `wool_negative_${context.path}`,
          type: CorruptionType.INVALID_RANGE,
          path: context.path,
          description: 'Wool amount cannot be negative',
          severity: CorruptionSeverity.MEDIUM,
          expectedValue: '>= 0',
          actualValue: value,
          repairable: true,
          repairStrategy: 'clamp_to_zero'
        });
      }

      // Check for unreasonably large values
      if (decimal.gt(new Decimal('1e100'))) {
        issues.push({
          id: `wool_overflow_${context.path}`,
          type: CorruptionType.INVALID_RANGE,
          path: context.path,
          description: 'Wool amount is unreasonably large',
          severity: CorruptionSeverity.LOW,
          expectedValue: '<= 1e100',
          actualValue: value,
          repairable: true,
          repairStrategy: 'clamp_to_max'
        });
      }

    } catch (error) {
      issues.push({
        id: `wool_invalid_${context.path}`,
        type: CorruptionType.TYPE_MISMATCH,
        path: context.path,
        description: 'Invalid wool amount format',
        severity: CorruptionSeverity.HIGH,
        expectedValue: 'valid Decimal string',
        actualValue: value,
        repairable: true,
        repairStrategy: 'reset_to_zero'
      });
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Repair wool amounts
   */
  private repairWoolAmounts(value: any, context: ValidationContext): any {
    // Convert non-string values to strings
    if (typeof value !== 'string') {
      value = String(value);
    }

    try {
      const decimal = new Decimal(value);
      
      if (decimal.isNaN() || decimal.isNegative()) {
        return '0';
      }

      if (decimal.gt(new Decimal('1e100'))) {
        return '1e100';
      }

      return decimal.toString();
    } catch (error) {
      return '0';
    }
  }

  /**
   * Validate building levels
   */
  private validateBuildingLevels(value: any, context: ValidationContext): ValidationResult {
    const issues: CorruptionIssue[] = [];

    if (typeof value !== 'object' || value === null) {
      issues.push({
        id: `building_type_${context.path}`,
        type: CorruptionType.TYPE_MISMATCH,
        path: context.path,
        description: 'Building must be an object',
        severity: CorruptionSeverity.HIGH,
        expectedValue: 'object',
        actualValue: typeof value,
        repairable: true,
        repairStrategy: 'create_default_building'
      });
      return { valid: false, issues };
    }

    // Check level property
    if (typeof value.level !== 'number') {
      issues.push({
        id: `building_level_type_${context.path}`,
        type: CorruptionType.TYPE_MISMATCH,
        path: `${context.path}.level`,
        description: 'Building level must be a number',
        severity: CorruptionSeverity.MEDIUM,
        expectedValue: 'number',
        actualValue: typeof value.level,
        repairable: true,
        repairStrategy: 'convert_to_number'
      });
    }

    // Check level range
    if (typeof value.level === 'number') {
      if (value.level < 0 || value.level > 10000) {
        issues.push({
          id: `building_level_range_${context.path}`,
          type: CorruptionType.INVALID_RANGE,
          path: `${context.path}.level`,
          description: 'Building level out of valid range',
          severity: CorruptionSeverity.MEDIUM,
          expectedValue: '0-10000',
          actualValue: value.level,
          repairable: true,
          repairStrategy: 'clamp_to_range'
        });
      }

      if (!Number.isInteger(value.level)) {
        issues.push({
          id: `building_level_integer_${context.path}`,
          type: CorruptionType.INVALID_RANGE,
          path: `${context.path}.level`,
          description: 'Building level must be an integer',
          severity: CorruptionSeverity.LOW,
          expectedValue: 'integer',
          actualValue: value.level,
          repairable: true,
          repairStrategy: 'round_to_integer'
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Repair building levels
   */
  private repairBuildingLevels(value: any, context: ValidationContext): any {
    if (typeof value !== 'object' || value === null) {
      return { level: 0, unlocked: false };
    }

    const repaired = { ...value };

    // Repair level
    if (typeof repaired.level !== 'number') {
      repaired.level = 0;
    } else {
      repaired.level = Math.max(0, Math.min(10000, Math.round(repaired.level)));
    }

    // Ensure unlocked property exists
    if (typeof repaired.unlocked !== 'boolean') {
      repaired.unlocked = repaired.level > 0;
    }

    return repaired;
  }

  /**
   * Validate timestamps
   */
  private validateTimestamps(value: any, context: ValidationContext): ValidationResult {
    const issues: CorruptionIssue[] = [];

    if (typeof value !== 'number') {
      issues.push({
        id: `timestamp_type_${context.path}`,
        type: CorruptionType.TYPE_MISMATCH,
        path: context.path,
        description: 'Timestamp must be a number',
        severity: CorruptionSeverity.MEDIUM,
        expectedValue: 'number',
        actualValue: typeof value,
        repairable: true,
        repairStrategy: 'set_current_timestamp'
      });
    }

    if (typeof value === 'number') {
      const now = Date.now();
      const minTimestamp = new Date('2020-01-01').getTime();
      const maxTimestamp = now + (365 * 24 * 60 * 60 * 1000); // 1 year in future

      if (value < minTimestamp || value > maxTimestamp) {
        issues.push({
          id: `timestamp_range_${context.path}`,
          type: CorruptionType.TEMPORAL_INCONSISTENCY,
          path: context.path,
          description: 'Timestamp out of valid range',
          severity: CorruptionSeverity.LOW,
          expectedValue: `${minTimestamp} - ${maxTimestamp}`,
          actualValue: value,
          repairable: true,
          repairStrategy: 'clamp_to_valid_range'
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Repair timestamps
   */
  private repairTimestamps(value: any, context: ValidationContext): any {
    if (typeof value !== 'number') {
      return Date.now();
    }

    const now = Date.now();
    const minTimestamp = new Date('2020-01-01').getTime();
    const maxTimestamp = now + (365 * 24 * 60 * 60 * 1000);

    return Math.max(minTimestamp, Math.min(maxTimestamp, value));
  }

  /**
   * Validate checksum
   */
  private validateChecksum(value: any, context: ValidationContext): ValidationResult {
    const issues: CorruptionIssue[] = [];

    if (typeof value !== 'string') {
      issues.push({
        id: `checksum_type_${context.path}`,
        type: CorruptionType.TYPE_MISMATCH,
        path: context.path,
        description: 'Checksum must be a string',
        severity: CorruptionSeverity.MEDIUM,
        expectedValue: 'string',
        actualValue: typeof value,
        repairable: true,
        repairStrategy: 'regenerate_checksum'
      });
    }

    if (typeof value === 'string') {
      // Calculate expected checksum
      const stateWithoutChecksum = { ...context.rootValue };
      delete stateWithoutChecksum.checksum;
      const expectedChecksum = this.calculateHash(JSON.stringify(stateWithoutChecksum));

      if (value !== expectedChecksum) {
        issues.push({
          id: `checksum_mismatch_${context.path}`,
          type: CorruptionType.CHECKSUM_MISMATCH,
          path: context.path,
          description: 'Checksum does not match calculated value',
          severity: CorruptionSeverity.HIGH,
          expectedValue: expectedChecksum,
          actualValue: value,
          repairable: true,
          repairStrategy: 'regenerate_checksum'
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Repair checksum
   */
  private repairChecksum(value: any, context: ValidationContext): any {
    const stateWithoutChecksum = { ...context.rootValue };
    delete stateWithoutChecksum.checksum;
    return this.calculateHash(JSON.stringify(stateWithoutChecksum));
  }

  /**
   * Validate references
   */
  private validateReferences(value: any, context: ValidationContext): ValidationResult {
    const issues: CorruptionIssue[] = [];

    // This is a simplified reference validation
    // In a real implementation, you'd check against a registry of valid references

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Repair references
   */
  private repairReferences(value: any, context: ValidationContext): any {
    // Remove invalid references
    if (Array.isArray(value)) {
      return value.filter(ref => this.isValidReference(ref));
    }
    return value;
  }

  /**
   * Check if reference is valid
   */
  private isValidReference(ref: any): boolean {
    // Simplified validation - in reality, this would check against game data
    return typeof ref === 'string' && ref.length > 0;
  }

  /**
   * Run a validation rule against the state
   */
  private async runValidationRule(
    state: VersionedGameState,
    rule: ValidationRule
  ): Promise<CorruptionIssue[]> {
    const issues: CorruptionIssue[] = [];

    // For now, we'll run the rule against all matching paths
    // In a more sophisticated implementation, we'd use a proper path matcher
    const paths = this.findMatchingPaths(state, rule.path);

    for (const path of paths) {
      const value = this.getValueByPath(state, path);
      const context: ValidationContext = {
        state,
        path,
        currentValue: value,
        rootValue: state
      };

      const result = rule.validator(value, context);
      issues.push(...result.issues);
    }

    return issues;
  }

  /**
   * Find paths that match a pattern
   */
  private findMatchingPaths(state: VersionedGameState, pattern: string): string[] {
    const paths: string[] = [];
    
    // Simple pattern matching - in reality, this would be more sophisticated
    if (pattern.includes('*')) {
      // Handle wildcard patterns
      const basePattern = pattern.replace('*', '');
      this.collectPaths(state, '', basePattern, paths);
    } else {
      // Exact path
      paths.push(pattern);
    }

    return paths;
  }

  /**
   * Collect all paths that match a pattern
   */
  private collectPaths(
    obj: any,
    currentPath: string,
    pattern: string,
    paths: string[]
  ): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const key in obj) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (fullPath.includes(pattern.replace('*', ''))) {
        paths.push(fullPath);
      }
      
      this.collectPaths(obj[key], fullPath, pattern, paths);
    }
  }

  /**
   * Get value by path
   */
  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Check structural integrity
   */
  private checkStructuralIntegrity(state: VersionedGameState): CorruptionIssue[] {
    const issues: CorruptionIssue[] = [];

    // Check required properties
    const requiredProps = [
      'version', 'playerId', 'timestamp', 'woolCounts', 'buildings',
      'purchasedUpgrades', 'unlockedAchievements', 'settings'
    ];

    for (const prop of requiredProps) {
      if (!(prop in state)) {
        issues.push({
          id: `missing_prop_${prop}`,
          type: CorruptionType.STRUCTURAL_CORRUPTION,
          path: prop,
          description: `Missing required property: ${prop}`,
          severity: CorruptionSeverity.CRITICAL,
          expectedValue: 'present',
          actualValue: 'missing',
          repairable: true,
          repairStrategy: 'create_default_value'
        });
      }
    }

    return issues;
  }

  /**
   * Check data consistency
   */
  private checkDataConsistency(state: VersionedGameState): CorruptionIssue[] {
    const issues: CorruptionIssue[] = [];

    // Check wool type consistency
    for (const woolType in state.woolCounts) {
      if (!Object.values(WoolType).includes(woolType as WoolType)) {
        issues.push({
          id: `invalid_wool_type_${woolType}`,
          type: CorruptionType.ORPHANED_DATA,
          path: `woolCounts.${woolType}`,
          description: `Invalid wool type: ${woolType}`,
          severity: CorruptionSeverity.MEDIUM,
          expectedValue: 'valid WoolType',
          actualValue: woolType,
          repairable: true,
          repairStrategy: 'remove_invalid_entry'
        });
      }
    }

    // Check building type consistency
    for (const buildingType in state.buildings) {
      if (!Object.values(BuildingType).includes(buildingType as BuildingType)) {
        issues.push({
          id: `invalid_building_type_${buildingType}`,
          type: CorruptionType.ORPHANED_DATA,
          path: `buildings.${buildingType}`,
          description: `Invalid building type: ${buildingType}`,
          severity: CorruptionSeverity.MEDIUM,
          expectedValue: 'valid BuildingType',
          actualValue: buildingType,
          repairable: true,
          repairStrategy: 'remove_invalid_entry'
        });
      }
    }

    return issues;
  }

  /**
   * Check temporal consistency
   */
  private checkTemporalConsistency(state: VersionedGameState): CorruptionIssue[] {
    const issues: CorruptionIssue[] = [];

    // Check that timestamps are in logical order
    if (state.lastSaveTime > state.timestamp) {
      issues.push({
        id: 'temporal_inconsistency_save_time',
        type: CorruptionType.TEMPORAL_INCONSISTENCY,
        path: 'lastSaveTime',
        description: 'Last save time is after current timestamp',
        severity: CorruptionSeverity.LOW,
        expectedValue: `<= ${state.timestamp}`,
        actualValue: state.lastSaveTime,
        repairable: true,
        repairStrategy: 'fix_temporal_order'
      });
    }

    return issues;
  }

  /**
   * Calculate overall severity
   */
  private calculateOverallSeverity(issues: CorruptionIssue[]): CorruptionSeverity {
    if (issues.some(issue => issue.severity === CorruptionSeverity.CRITICAL)) {
      return CorruptionSeverity.CRITICAL;
    }
    if (issues.some(issue => issue.severity === CorruptionSeverity.HIGH)) {
      return CorruptionSeverity.HIGH;
    }
    if (issues.some(issue => issue.severity === CorruptionSeverity.MEDIUM)) {
      return CorruptionSeverity.MEDIUM;
    }
    return CorruptionSeverity.LOW;
  }

  /**
   * Create recovery step for an issue
   */
  private createRecoveryStep(issue: CorruptionIssue): RecoveryStep {
    const stepId = `recovery_${issue.id}`;
    
    return {
      id: stepId,
      type: this.getRecoveryType(issue),
      description: `Fix ${issue.description}`,
      path: issue.path,
      action: {
        type: issue.repairStrategy || 'repair',
        parameters: {
          issueId: issue.id,
          expectedValue: issue.expectedValue,
          actualValue: issue.actualValue
        }
      },
      reversible: issue.severity <= CorruptionSeverity.MEDIUM,
      estimatedLoss: this.calculateEstimatedLoss(issue)
    };
  }

  /**
   * Get recovery type for issue
   */
  private getRecoveryType(issue: CorruptionIssue): RecoveryType {
    switch (issue.type) {
      case CorruptionType.INVALID_RANGE:
        return RecoveryType.REPAIR;
      case CorruptionType.MISSING_REFERENCE:
        return RecoveryType.REMOVE;
      case CorruptionType.STRUCTURAL_CORRUPTION:
        return RecoveryType.RECONSTRUCT;
      case CorruptionType.ORPHANED_DATA:
        return RecoveryType.REMOVE;
      default:
        return RecoveryType.REPAIR;
    }
  }

  /**
   * Calculate estimated data loss for issue
   */
  private calculateEstimatedLoss(issue: CorruptionIssue): number {
    switch (issue.severity) {
      case CorruptionSeverity.LOW:
        return 0;
      case CorruptionSeverity.MEDIUM:
        return 0.1;
      case CorruptionSeverity.HIGH:
        return 0.3;
      case CorruptionSeverity.CRITICAL:
        return 0.5;
      default:
        return 0;
    }
  }

  /**
   * Get recovery priority
   */
  private getRecoveryPriority(step: RecoveryStep): number {
    switch (step.type) {
      case RecoveryType.REPAIR:
        return 5;
      case RecoveryType.RECONSTRUCT:
        return 4;
      case RecoveryType.SUBSTITUTE:
        return 3;
      case RecoveryType.REMOVE:
        return 2;
      case RecoveryType.RESET:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(
    report: CorruptionReport,
    estimatedDataLoss: number
  ): RiskLevel {
    if (report.criticalIssues > 0 || estimatedDataLoss > 0.3) {
      return RiskLevel.CRITICAL;
    }
    if (report.severity === CorruptionSeverity.HIGH || estimatedDataLoss > 0.1) {
      return RiskLevel.HIGH;
    }
    if (report.severity === CorruptionSeverity.MEDIUM || estimatedDataLoss > 0.05) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.LOW;
  }

  /**
   * Execute a recovery step
   */
  private async executeRecoveryStep(
    state: VersionedGameState,
    step: RecoveryStep
  ): Promise<VersionedGameState> {
    const newState = { ...state };
    
    // Apply recovery action based on type
    switch (step.type) {
      case RecoveryType.REPAIR:
        this.applyRepair(newState, step);
        break;
      case RecoveryType.RESET:
        this.applyReset(newState, step);
        break;
      case RecoveryType.RECONSTRUCT:
        this.applyReconstruct(newState, step);
        break;
      case RecoveryType.REMOVE:
        this.applyRemove(newState, step);
        break;
      case RecoveryType.SUBSTITUTE:
        this.applySubstitute(newState, step);
        break;
    }

    return newState;
  }

  /**
   * Apply repair action
   */
  private applyRepair(state: VersionedGameState, step: RecoveryStep): void {
    const rule = this.validationRules.find(r => r.path.includes(step.path.split('.')[0]));
    if (rule && rule.repairer) {
      const value = this.getValueByPath(state, step.path);
      const context: ValidationContext = {
        state,
        path: step.path,
        currentValue: value,
        rootValue: state
      };
      
      const repairedValue = rule.repairer(value, context);
      this.setValueByPath(state, step.path, repairedValue);
    }
  }

  /**
   * Apply reset action
   */
  private applyReset(state: VersionedGameState, step: RecoveryStep): void {
    const defaultValue = this.getDefaultValue(step.path);
    this.setValueByPath(state, step.path, defaultValue);
  }

  /**
   * Apply reconstruct action
   */
  private applyReconstruct(state: VersionedGameState, step: RecoveryStep): void {
    const reconstructedValue = this.reconstructValue(state, step.path);
    this.setValueByPath(state, step.path, reconstructedValue);
  }

  /**
   * Apply remove action
   */
  private applyRemove(state: VersionedGameState, step: RecoveryStep): void {
    this.removeValueByPath(state, step.path);
  }

  /**
   * Apply substitute action
   */
  private applySubstitute(state: VersionedGameState, step: RecoveryStep): void {
    const substituteValue = this.getSubstituteValue(state, step.path);
    this.setValueByPath(state, step.path, substituteValue);
  }

  /**
   * Set value by path
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Remove value by path
   */
  private removeValueByPath(obj: any, path: string): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        return;
      }
      current = current[parts[i]];
    }
    
    delete current[parts[parts.length - 1]];
  }

  /**
   * Get default value for path
   */
  private getDefaultValue(path: string): any {
    if (path.startsWith('woolCounts.')) {
      return '0';
    }
    if (path.startsWith('buildings.')) {
      return { level: 0, unlocked: false };
    }
    if (path === 'purchasedUpgrades') {
      return [];
    }
    if (path === 'unlockedAchievements') {
      return [];
    }
    return null;
  }

  /**
   * Reconstruct value from context
   */
  private reconstructValue(state: VersionedGameState, path: string): any {
    // This would use game logic to reconstruct missing values
    return this.getDefaultValue(path);
  }

  /**
   * Get substitute value
   */
  private getSubstituteValue(state: VersionedGameState, path: string): any {
    // This would find appropriate substitute values
    return this.getDefaultValue(path);
  }

  /**
   * Get default paths for checksum calculation
   */
  private getDefaultChecksumPaths(): string[] {
    return [
      'woolCounts',
      'buildings',
      'purchasedUpgrades',
      'unlockedAchievements',
      'totalWoolProduced',
      'totalPrestiges',
      'playTime'
    ];
  }

  /**
   * Extract data for checksum calculation
   */
  private extractDataForChecksum(state: VersionedGameState, paths: string[]): any {
    const data: any = {};
    
    for (const path of paths) {
      const value = this.getValueByPath(state, path);
      if (value !== undefined) {
        data[path] = value;
      }
    }
    
    return data;
  }

  /**
   * Calculate hash of data
   */
  private calculateHash(data: any): string {
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return this.simpleHash(serialized);
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Generate recovery ID
   */
  private generateRecoveryId(): string {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate recovery version
   */
  private generateRecoveryVersion(): string {
    return `recovery_v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default DataIntegrityManager;