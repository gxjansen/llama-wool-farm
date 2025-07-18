/**
 * Advanced Conflict Resolution System for Llama Wool Farm
 * Handles complex merge scenarios and user-driven conflict resolution
 */

import Decimal from 'decimal.js';
import { SyncConflict, Resolution, ConflictType, ConflictSeverity } from './SyncEngine';

export interface ConflictResolutionStrategy {
  canResolve(conflict: SyncConflict): boolean;
  resolve(conflict: SyncConflict): Resolution;
}

export interface UserConflictPrompt {
  message: string;
  options: ConflictOption[];
  conflict: SyncConflict;
}

export interface ConflictOption {
  label: string;
  value: string;
  description?: string;
  preview?: any;
}

export interface MergeContext {
  basePath: string;
  dataType: string;
  conflictHistory: ConflictResolution[];
  userPreferences: UserPreferences;
}

export interface ConflictResolution {
  conflictId: string;
  strategy: string;
  timestamp: number;
  userChoice?: string;
  automatic: boolean;
}

export interface UserPreferences {
  defaultStrategy: string;
  autoResolveTypes: ConflictType[];
  rememberChoices: boolean;
  alwaysAskForCritical: boolean;
}

/**
 * Advanced conflict resolver with multiple resolution strategies
 */
export class AdvancedConflictResolver {
  private strategies: ConflictResolutionStrategy[] = [];
  private userPreferences: UserPreferences;
  private conflictHistory: ConflictResolution[] = [];

  constructor(userPreferences?: UserPreferences) {
    this.userPreferences = userPreferences || this.getDefaultPreferences();
    this.initializeStrategies();
  }

  /**
   * Initialize built-in resolution strategies
   */
  private initializeStrategies(): void {
    this.strategies.push(
      new LastWriteWinsStrategy(),
      new AdditiveMergeStrategy(),
      new ArrayMergeStrategy(),
      new SmartMergeStrategy(),
      new UserDrivenStrategy()
    );
  }

  /**
   * Resolve a conflict using the best available strategy
   */
  async resolve(conflict: SyncConflict): Promise<Resolution> {
    // Check if we have a previous resolution for similar conflict
    const historicalResolution = this.findHistoricalResolution(conflict);
    if (historicalResolution && this.userPreferences.rememberChoices) {
      return this.applyHistoricalResolution(conflict, historicalResolution);
    }

    // Find the best strategy for this conflict
    const strategy = this.findBestStrategy(conflict);
    if (!strategy) {
      throw new Error(`No strategy found for conflict: ${conflict.id}`);
    }

    // Apply the strategy
    const resolution = await strategy.resolve(conflict);
    
    // Record the resolution
    this.recordResolution(conflict, resolution);
    
    return resolution;
  }

  /**
   * Resolve multiple conflicts in batch
   */
  async resolveMultiple(conflicts: SyncConflict[]): Promise<Resolution[]> {
    const resolutions: Resolution[] = [];
    
    // Group conflicts by type for batch processing
    const groupedConflicts = this.groupConflictsByType(conflicts);
    
    for (const [type, typeConflicts] of groupedConflicts) {
      const batchResolutions = await this.resolveBatch(typeConflicts);
      resolutions.push(...batchResolutions);
    }
    
    return resolutions;
  }

  /**
   * Get user prompt for conflicts that require user input
   */
  async getUserPrompt(conflict: SyncConflict): Promise<UserConflictPrompt> {
    const context = this.createMergeContext(conflict);
    
    switch (conflict.type) {
      case ConflictType.VALUE_MISMATCH:
        return this.createValueMismatchPrompt(conflict, context);
      case ConflictType.CONCURRENT_MODIFICATION:
        return this.createConcurrentModificationPrompt(conflict, context);
      case ConflictType.STRUCTURAL_CHANGE:
        return this.createStructuralChangePrompt(conflict, context);
      default:
        return this.createGenericPrompt(conflict, context);
    }
  }

  /**
   * Apply user choice to resolve conflict
   */
  async applyUserChoice(conflict: SyncConflict, choice: string): Promise<Resolution> {
    const strategy = new UserDrivenStrategy();
    const resolution = await strategy.resolveWithChoice(conflict, choice);
    
    this.recordResolution(conflict, resolution);
    
    return resolution;
  }

  /**
   * Find the best strategy for a given conflict
   */
  private findBestStrategy(conflict: SyncConflict): ConflictResolutionStrategy | null {
    // Try strategies in order of preference
    for (const strategy of this.strategies) {
      if (strategy.canResolve(conflict)) {
        return strategy;
      }
    }
    
    return null;
  }

  /**
   * Find historical resolution for similar conflicts
   */
  private findHistoricalResolution(conflict: SyncConflict): ConflictResolution | null {
    return this.conflictHistory.find(resolution => 
      resolution.conflictId === conflict.id ||
      (resolution.conflictId.startsWith(conflict.path) && resolution.automatic)
    ) || null;
  }

  /**
   * Apply historical resolution to current conflict
   */
  private applyHistoricalResolution(
    conflict: SyncConflict, 
    historical: ConflictResolution
  ): Resolution {
    return {
      type: historical.strategy,
      value: this.adaptHistoricalValue(conflict, historical),
      reason: `Applied previous resolution: ${historical.strategy}`,
      automatic: historical.automatic
    };
  }

  /**
   * Group conflicts by type for batch processing
   */
  private groupConflictsByType(conflicts: SyncConflict[]): Map<ConflictType, SyncConflict[]> {
    const grouped = new Map<ConflictType, SyncConflict[]>();
    
    for (const conflict of conflicts) {
      const existing = grouped.get(conflict.type) || [];
      existing.push(conflict);
      grouped.set(conflict.type, existing);
    }
    
    return grouped;
  }

  /**
   * Resolve a batch of conflicts of the same type
   */
  private async resolveBatch(conflicts: SyncConflict[]): Promise<Resolution[]> {
    const resolutions: Resolution[] = [];
    
    for (const conflict of conflicts) {
      const resolution = await this.resolve(conflict);
      resolutions.push(resolution);
    }
    
    return resolutions;
  }

  /**
   * Create merge context for conflict resolution
   */
  private createMergeContext(conflict: SyncConflict): MergeContext {
    return {
      basePath: conflict.path,
      dataType: this.inferDataType(conflict),
      conflictHistory: this.conflictHistory,
      userPreferences: this.userPreferences
    };
  }

  /**
   * Infer data type from conflict path
   */
  private inferDataType(conflict: SyncConflict): string {
    if (conflict.path.startsWith('woolCounts.')) return 'decimal';
    if (conflict.path.startsWith('buildings.')) return 'object';
    if (conflict.path === 'unlockedAchievements') return 'array';
    if (conflict.path === 'purchasedUpgrades') return 'array';
    return 'unknown';
  }

  /**
   * Create prompt for value mismatch conflicts
   */
  private createValueMismatchPrompt(conflict: SyncConflict, context: MergeContext): UserConflictPrompt {
    const options: ConflictOption[] = [
      {
        label: 'Keep Local',
        value: 'local',
        description: 'Use the value from this device',
        preview: conflict.localValue
      },
      {
        label: 'Keep Remote',
        value: 'remote',
        description: 'Use the value from the cloud',
        preview: conflict.remoteValue
      }
    ];

    // Add merge option for compatible data types
    if (context.dataType === 'decimal' || context.dataType === 'array') {
      options.push({
        label: 'Merge Both',
        value: 'merge',
        description: 'Combine both values',
        preview: this.previewMerge(conflict, context)
      });
    }

    return {
      message: this.formatConflictMessage(conflict, context),
      options,
      conflict
    };
  }

  /**
   * Create prompt for concurrent modification conflicts
   */
  private createConcurrentModificationPrompt(
    conflict: SyncConflict, 
    context: MergeContext
  ): UserConflictPrompt {
    return {
      message: `Both devices modified ${conflict.path}. Which version should be kept?`,
      options: [
        {
          label: 'Keep Local Changes',
          value: 'local',
          description: 'Keep changes made on this device',
          preview: conflict.localValue
        },
        {
          label: 'Keep Remote Changes',
          value: 'remote',
          description: 'Keep changes from the cloud',
          preview: conflict.remoteValue
        },
        {
          label: 'Manual Merge',
          value: 'manual',
          description: 'Manually combine both versions'
        }
      ],
      conflict
    };
  }

  /**
   * Create prompt for structural change conflicts
   */
  private createStructuralChangePrompt(
    conflict: SyncConflict, 
    context: MergeContext
  ): UserConflictPrompt {
    return {
      message: `The structure of ${conflict.path} has changed. This may indicate incompatible game versions.`,
      options: [
        {
          label: 'Use Local Structure',
          value: 'local',
          description: 'Keep the structure from this device'
        },
        {
          label: 'Use Remote Structure',
          value: 'remote',
          description: 'Adopt the structure from the cloud'
        },
        {
          label: 'Reset to Default',
          value: 'reset',
          description: 'Reset to default structure (may lose data)'
        }
      ],
      conflict
    };
  }

  /**
   * Create generic prompt for unknown conflict types
   */
  private createGenericPrompt(conflict: SyncConflict, context: MergeContext): UserConflictPrompt {
    return {
      message: `Conflict detected in ${conflict.path}. Please choose how to resolve it.`,
      options: [
        {
          label: 'Keep Local',
          value: 'local',
          preview: conflict.localValue
        },
        {
          label: 'Keep Remote',
          value: 'remote',
          preview: conflict.remoteValue
        }
      ],
      conflict
    };
  }

  /**
   * Format conflict message for user display
   */
  private formatConflictMessage(conflict: SyncConflict, context: MergeContext): string {
    const pathParts = conflict.path.split('.');
    const readablePath = pathParts.join(' > ');
    
    switch (conflict.type) {
      case ConflictType.VALUE_MISMATCH:
        return `Different values found for ${readablePath}. Local: ${conflict.localValue}, Remote: ${conflict.remoteValue}`;
      case ConflictType.CONCURRENT_MODIFICATION:
        return `${readablePath} was modified on both devices at the same time`;
      case ConflictType.STRUCTURAL_CHANGE:
        return `The structure of ${readablePath} has changed between devices`;
      default:
        return `Conflict in ${readablePath}`;
    }
  }

  /**
   * Preview what a merge would look like
   */
  private previewMerge(conflict: SyncConflict, context: MergeContext): any {
    switch (context.dataType) {
      case 'decimal':
        const local = new Decimal(conflict.localValue);
        const remote = new Decimal(conflict.remoteValue);
        return local.plus(remote).toString();
      case 'array':
        return Array.from(new Set([...conflict.localValue, ...conflict.remoteValue]));
      default:
        return 'Merge preview not available';
    }
  }

  /**
   * Record a resolution for future reference
   */
  private recordResolution(conflict: SyncConflict, resolution: Resolution): void {
    this.conflictHistory.push({
      conflictId: conflict.id,
      strategy: resolution.type,
      timestamp: Date.now(),
      automatic: resolution.automatic
    });
  }

  /**
   * Adapt historical value to current conflict
   */
  private adaptHistoricalValue(conflict: SyncConflict, historical: ConflictResolution): any {
    // For now, just return the conflict value
    // In a more sophisticated implementation, this would adapt the historical choice
    return conflict.localValue;
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      defaultStrategy: 'last_write_wins',
      autoResolveTypes: [ConflictType.VALUE_MISMATCH],
      rememberChoices: true,
      alwaysAskForCritical: true
    };
  }
}

/**
 * Last-write-wins strategy
 */
class LastWriteWinsStrategy implements ConflictResolutionStrategy {
  canResolve(conflict: SyncConflict): boolean {
    return conflict.severity <= ConflictSeverity.MEDIUM;
  }

  resolve(conflict: SyncConflict): Resolution {
    const useRemote = conflict.remoteTimestamp > conflict.localTimestamp;
    
    return {
      type: 'last_write_wins',
      value: useRemote ? conflict.remoteValue : conflict.localValue,
      reason: `Used ${useRemote ? 'remote' : 'local'} value (more recent)`,
      automatic: true
    };
  }
}

/**
 * Additive merge strategy for numerical values
 */
class AdditiveMergeStrategy implements ConflictResolutionStrategy {
  canResolve(conflict: SyncConflict): boolean {
    return this.isNumericValue(conflict.localValue) && 
           this.isNumericValue(conflict.remoteValue);
  }

  resolve(conflict: SyncConflict): Resolution {
    const local = new Decimal(conflict.localValue);
    const remote = new Decimal(conflict.remoteValue);
    
    return {
      type: 'additive_merge',
      value: local.plus(remote).toString(),
      reason: 'Combined numerical values',
      automatic: true
    };
  }

  private isNumericValue(value: any): boolean {
    try {
      new Decimal(value);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Array merge strategy for combining arrays
 */
class ArrayMergeStrategy implements ConflictResolutionStrategy {
  canResolve(conflict: SyncConflict): boolean {
    return Array.isArray(conflict.localValue) && 
           Array.isArray(conflict.remoteValue);
  }

  resolve(conflict: SyncConflict): Resolution {
    const merged = Array.from(new Set([...conflict.localValue, ...conflict.remoteValue]));
    
    return {
      type: 'array_merge',
      value: merged,
      reason: 'Merged unique array items',
      automatic: true
    };
  }
}

/**
 * Smart merge strategy for complex objects
 */
class SmartMergeStrategy implements ConflictResolutionStrategy {
  canResolve(conflict: SyncConflict): boolean {
    return typeof conflict.localValue === 'object' && 
           typeof conflict.remoteValue === 'object' &&
           conflict.localValue !== null &&
           conflict.remoteValue !== null &&
           conflict.severity <= ConflictSeverity.MEDIUM;
  }

  resolve(conflict: SyncConflict): Resolution {
    const merged = this.mergeObjects(conflict.localValue, conflict.remoteValue);
    
    return {
      type: 'smart_merge',
      value: merged,
      reason: 'Intelligently merged object properties',
      automatic: true
    };
  }

  private mergeObjects(local: any, remote: any): any {
    const result = { ...local };
    
    for (const [key, value] of Object.entries(remote)) {
      if (!(key in result)) {
        result[key] = value;
      } else if (typeof value === 'number' && typeof result[key] === 'number') {
        // For numbers, use the larger value
        result[key] = Math.max(result[key], value);
      } else if (Array.isArray(value) && Array.isArray(result[key])) {
        // For arrays, merge unique items
        result[key] = Array.from(new Set([...result[key], ...value]));
      }
      // For other types, keep local value
    }
    
    return result;
  }
}

/**
 * User-driven strategy for complex conflicts
 */
class UserDrivenStrategy implements ConflictResolutionStrategy {
  canResolve(conflict: SyncConflict): boolean {
    return conflict.severity >= ConflictSeverity.MEDIUM;
  }

  async resolve(conflict: SyncConflict): Promise<Resolution> {
    // This would normally prompt the user
    // For now, return a placeholder that indicates user input is needed
    return {
      type: 'user_required',
      value: null,
      reason: 'User intervention required',
      automatic: false
    };
  }

  async resolveWithChoice(conflict: SyncConflict, choice: string): Promise<Resolution> {
    switch (choice) {
      case 'local':
        return {
          type: 'user_choice_local',
          value: conflict.localValue,
          reason: 'User chose local value',
          automatic: false
        };
      case 'remote':
        return {
          type: 'user_choice_remote',
          value: conflict.remoteValue,
          reason: 'User chose remote value',
          automatic: false
        };
      case 'merge':
        return {
          type: 'user_choice_merge',
          value: this.attemptMerge(conflict),
          reason: 'User chose to merge values',
          automatic: false
        };
      default:
        throw new Error(`Unknown user choice: ${choice}`);
    }
  }

  private attemptMerge(conflict: SyncConflict): any {
    // Try to merge based on data type
    if (typeof conflict.localValue === 'string' && typeof conflict.remoteValue === 'string') {
      try {
        const local = new Decimal(conflict.localValue);
        const remote = new Decimal(conflict.remoteValue);
        return local.plus(remote).toString();
      } catch {
        // If not numeric, just concatenate
        return conflict.localValue + conflict.remoteValue;
      }
    }
    
    if (Array.isArray(conflict.localValue) && Array.isArray(conflict.remoteValue)) {
      return Array.from(new Set([...conflict.localValue, ...conflict.remoteValue]));
    }
    
    // For other types, return local value
    return conflict.localValue;
  }
}

export default AdvancedConflictResolver;