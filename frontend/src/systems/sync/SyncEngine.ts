/**
 * Cloud Sync Engine for Llama Wool Farm
 * Handles multi-device synchronization with conflict resolution
 */

import Decimal from 'decimal.js';
import { GameSave, GameSettings } from '../../types/game.types';
import { EventManager } from '../../core/managers/EventManager';

// Sync-specific types
export interface SyncResult {
  success: boolean;
  newState?: GameSave;
  version?: string;
  conflicts: number;
  autoResolved: number;
  userConflicts: SyncConflict[];
  error?: string;
}

export interface SyncConflict {
  id: string;
  type: ConflictType;
  path: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: number;
  remoteTimestamp: number;
  localDeviceId: string;
  remoteDeviceId: string;
  severity: ConflictSeverity;
  autoResolvable: boolean;
}

export enum ConflictType {
  VALUE_MISMATCH = 'value_mismatch',
  CONCURRENT_MODIFICATION = 'concurrent_modification',
  STRUCTURAL_CHANGE = 'structural_change',
  TIMESTAMP_SKEW = 'timestamp_skew'
}

export enum ConflictSeverity {
  LOW = 'low',        // Auto-resolvable
  MEDIUM = 'medium',  // May require user input
  HIGH = 'high',      // Requires user decision
  CRITICAL = 'critical' // Blocks sync
}

export interface Resolution {
  type: string;
  value: any;
  reason: string;
  automatic: boolean;
}

export interface VersionedGameState extends GameSave {
  deviceId: string;
  syncMetadata: SyncMetadata;
  checksum: string;
}

export interface SyncMetadata {
  lastSyncTime: number;
  conflictResolutions: ConflictResolution[];
  pendingOperations: PendingOperation[];
  syncState: SyncState;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: Resolution;
  timestamp: number;
}

export interface PendingOperation {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export enum SyncState {
  IDLE = 'idle',
  SYNCING = 'syncing',
  CONFLICT = 'conflict',
  ERROR = 'error'
}

export interface StateDelta {
  id: string;
  fromVersion: string;
  toVersion: string;
  timestamp: number;
  operations: DeltaOperation[];
  checksum: string;
}

export interface DeltaOperation {
  type: 'add' | 'update' | 'delete' | 'merge';
  path: string;
  value: any;
  previousValue?: any;
  timestamp: number;
  deviceId: string;
}

/**
 * Main sync engine that orchestrates cloud synchronization
 */
export class SyncEngine {
  private deviceId: string;
  private eventManager: EventManager;
  private localState: VersionedGameState | null = null;
  private syncInProgress = false;
  private conflictResolver: ConflictResolver;
  private checksumValidator: ChecksumValidator;
  private versionControl: VersionControl;

  constructor(deviceId: string, eventManager: EventManager) {
    this.deviceId = deviceId;
    this.eventManager = eventManager;
    this.conflictResolver = new ConflictResolver();
    this.checksumValidator = new ChecksumValidator();
    this.versionControl = new VersionControl();
  }

  /**
   * Perform full synchronization with cloud
   */
  async fullSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        conflicts: 0,
        autoResolved: 0,
        userConflicts: [],
        error: 'Sync already in progress'
      };
    }

    this.syncInProgress = true;
    this.eventManager.emit('sync:started', { type: 'full' });

    try {
      // 1. Get current local state
      const localState = this.getLocalState();
      
      // 2. Fetch remote state
      const remoteState = await this.fetchRemoteState();
      
      // 3. Detect conflicts
      const conflicts = this.detectConflicts(localState, remoteState);
      
      // 4. Auto-resolve simple conflicts
      const autoResolved = this.autoResolveConflicts(conflicts);
      
      // 5. Handle user conflicts
      const userConflicts = conflicts.filter(c => !c.autoResolvable);
      
      if (userConflicts.length > 0) {
        return {
          success: false,
          conflicts: conflicts.length,
          autoResolved: autoResolved.length,
          userConflicts,
          error: 'User intervention required'
        };
      }
      
      // 6. Apply all resolutions
      const mergedState = this.applyResolutions(localState, remoteState, autoResolved);
      
      // 7. Validate merged state
      const validationResult = await this.validateState(mergedState);
      if (!validationResult.valid) {
        throw new Error(`State validation failed: ${validationResult.error}`);
      }
      
      // 8. Save new state
      const newVersion = this.versionControl.createVersion(mergedState);
      await this.saveLocalState(mergedState);
      await this.uploadState(mergedState);
      
      this.eventManager.emit('sync:completed', { 
        conflicts: conflicts.length,
        autoResolved: autoResolved.length
      });
      
      return {
        success: true,
        newState: mergedState,
        version: newVersion,
        conflicts: conflicts.length,
        autoResolved: autoResolved.length,
        userConflicts: []
      };
      
    } catch (error) {
      this.eventManager.emit('sync:error', { error: error.message });
      
      return {
        success: false,
        conflicts: 0,
        autoResolved: 0,
        userConflicts: [],
        error: error.message
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Perform incremental sync using deltas
   */
  async incrementalSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        conflicts: 0,
        autoResolved: 0,
        userConflicts: [],
        error: 'Sync already in progress'
      };
    }

    this.syncInProgress = true;
    this.eventManager.emit('sync:started', { type: 'incremental' });

    try {
      const localState = this.getLocalState();
      const remoteVersion = await this.getRemoteVersion();
      
      // Check if we need to sync
      if (localState.version === remoteVersion) {
        return {
          success: true,
          conflicts: 0,
          autoResolved: 0,
          userConflicts: []
        };
      }
      
      // Get delta from remote
      const delta = await this.fetchDelta(localState.version, remoteVersion);
      
      // Validate delta
      if (!this.checksumValidator.validateDelta(delta)) {
        throw new Error('Delta validation failed');
      }
      
      // Apply delta
      const newState = this.applyDelta(localState, delta);
      
      // Detect conflicts during application
      const conflicts = this.detectDeltaConflicts(localState, delta);
      
      // Handle conflicts
      const autoResolved = this.autoResolveConflicts(conflicts);
      const userConflicts = conflicts.filter(c => !c.autoResolvable);
      
      if (userConflicts.length > 0) {
        return {
          success: false,
          conflicts: conflicts.length,
          autoResolved: autoResolved.length,
          userConflicts,
          error: 'User intervention required'
        };
      }
      
      // Apply resolutions and save
      const finalState = this.applyResolutions(newState, newState, autoResolved);
      await this.saveLocalState(finalState);
      
      return {
        success: true,
        newState: finalState,
        version: remoteVersion,
        conflicts: conflicts.length,
        autoResolved: autoResolved.length,
        userConflicts: []
      };
      
    } catch (error) {
      this.eventManager.emit('sync:error', { error: error.message });
      
      return {
        success: false,
        conflicts: 0,
        autoResolved: 0,
        userConflicts: [],
        error: error.message
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Resolve user conflicts and continue sync
   */
  async resolveUserConflicts(resolutions: Resolution[]): Promise<SyncResult> {
    const localState = this.getLocalState();
    const remoteState = await this.fetchRemoteState();
    
    // Apply user resolutions
    const mergedState = this.applyResolutions(localState, remoteState, resolutions);
    
    // Validate and save
    const validationResult = await this.validateState(mergedState);
    if (!validationResult.valid) {
      return {
        success: false,
        conflicts: 0,
        autoResolved: 0,
        userConflicts: [],
        error: `State validation failed: ${validationResult.error}`
      };
    }
    
    await this.saveLocalState(mergedState);
    await this.uploadState(mergedState);
    
    return {
      success: true,
      newState: mergedState,
      version: mergedState.version,
      conflicts: 0,
      autoResolved: 0,
      userConflicts: []
    };
  }

  /**
   * Get current local state
   */
  private getLocalState(): VersionedGameState {
    if (!this.localState) {
      // Load from local storage or create new
      this.localState = this.loadLocalState() || this.createInitialState();
    }
    return this.localState;
  }

  /**
   * Create initial state for new game
   */
  private createInitialState(): VersionedGameState {
    return {
      version: '1.0.0',
      playerId: this.generatePlayerId(),
      timestamp: Date.now(),
      deviceId: this.deviceId,
      woolCounts: {},
      soulShears: '0',
      goldenFleece: '0',
      buildings: {},
      purchasedUpgrades: [],
      totalWoolProduced: '0',
      totalPrestiges: 0,
      playTime: 0,
      lastSaveTime: Date.now(),
      unlockedAchievements: [],
      settings: this.getDefaultSettings(),
      syncMetadata: {
        lastSyncTime: Date.now(),
        conflictResolutions: [],
        pendingOperations: [],
        syncState: SyncState.IDLE
      },
      checksum: ''
    };
  }

  /**
   * Detect conflicts between local and remote state
   */
  private detectConflicts(local: VersionedGameState, remote: VersionedGameState): SyncConflict[] {
    const conflicts: SyncConflict[] = [];
    
    // Check wool counts
    for (const [woolType, localAmount] of Object.entries(local.woolCounts)) {
      const remoteAmount = remote.woolCounts[woolType];
      if (remoteAmount && localAmount !== remoteAmount) {
        conflicts.push({
          id: `wool-${woolType}`,
          type: ConflictType.VALUE_MISMATCH,
          path: `woolCounts.${woolType}`,
          localValue: localAmount,
          remoteValue: remoteAmount,
          localTimestamp: local.timestamp,
          remoteTimestamp: remote.timestamp,
          localDeviceId: local.deviceId,
          remoteDeviceId: remote.deviceId,
          severity: ConflictSeverity.LOW,
          autoResolvable: true // Wool counts can be merged additively
        });
      }
    }
    
    // Check buildings
    for (const [buildingType, localBuilding] of Object.entries(local.buildings)) {
      const remoteBuilding = remote.buildings[buildingType];
      if (remoteBuilding && JSON.stringify(localBuilding) !== JSON.stringify(remoteBuilding)) {
        conflicts.push({
          id: `building-${buildingType}`,
          type: ConflictType.CONCURRENT_MODIFICATION,
          path: `buildings.${buildingType}`,
          localValue: localBuilding,
          remoteValue: remoteBuilding,
          localTimestamp: local.timestamp,
          remoteTimestamp: remote.timestamp,
          localDeviceId: local.deviceId,
          remoteDeviceId: remote.deviceId,
          severity: ConflictSeverity.MEDIUM,
          autoResolvable: false // Buildings require user decision
        });
      }
    }
    
    // Check achievements
    const localAchievements = new Set(local.unlockedAchievements);
    const remoteAchievements = new Set(remote.unlockedAchievements);
    const allAchievements = new Set([...localAchievements, ...remoteAchievements]);
    
    if (allAchievements.size !== localAchievements.size || allAchievements.size !== remoteAchievements.size) {
      conflicts.push({
        id: 'achievements',
        type: ConflictType.VALUE_MISMATCH,
        path: 'unlockedAchievements',
        localValue: local.unlockedAchievements,
        remoteValue: remote.unlockedAchievements,
        localTimestamp: local.timestamp,
        remoteTimestamp: remote.timestamp,
        localDeviceId: local.deviceId,
        remoteDeviceId: remote.deviceId,
        severity: ConflictSeverity.LOW,
        autoResolvable: true // Achievements can be merged
      });
    }
    
    return conflicts;
  }

  /**
   * Auto-resolve simple conflicts
   */
  private autoResolveConflicts(conflicts: SyncConflict[]): Resolution[] {
    return conflicts
      .filter(conflict => conflict.autoResolvable)
      .map(conflict => this.conflictResolver.resolve(conflict));
  }

  /**
   * Apply conflict resolutions to create merged state
   */
  private applyResolutions(
    local: VersionedGameState,
    remote: VersionedGameState,
    resolutions: Resolution[]
  ): VersionedGameState {
    let mergedState = { ...local };
    
    for (const resolution of resolutions) {
      // Apply resolution based on type
      switch (resolution.type) {
        case 'last_write_wins':
          this.applyLastWriteWins(mergedState, resolution);
          break;
        case 'additive_merge':
          this.applyAdditiveMerge(mergedState, resolution);
          break;
        case 'array_merge':
          this.applyArrayMerge(mergedState, resolution);
          break;
      }
    }
    
    // Update metadata
    mergedState.timestamp = Date.now();
    mergedState.version = this.versionControl.generateVersion();
    mergedState.checksum = this.checksumValidator.generateChecksum(mergedState);
    
    return mergedState;
  }

  /**
   * Apply last-write-wins resolution
   */
  private applyLastWriteWins(state: VersionedGameState, resolution: Resolution): void {
    // Implementation depends on the specific path
    // This is a simplified version
    const path = resolution.type.split('.');
    let current = state as any;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = resolution.value;
  }

  /**
   * Apply additive merge resolution
   */
  private applyAdditiveMerge(state: VersionedGameState, resolution: Resolution): void {
    // For numerical values, use the merged value
    const path = resolution.type.split('.');
    let current = state as any;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = resolution.value;
  }

  /**
   * Apply array merge resolution
   */
  private applyArrayMerge(state: VersionedGameState, resolution: Resolution): void {
    // For arrays, use the merged array
    const path = resolution.type.split('.');
    let current = state as any;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = resolution.value;
  }

  /**
   * Validate state integrity
   */
  private async validateState(state: VersionedGameState): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check checksum
      const expectedChecksum = this.checksumValidator.generateChecksum(state);
      if (state.checksum !== expectedChecksum) {
        return { valid: false, error: 'Checksum mismatch' };
      }
      
      // Check data ranges
      for (const [woolType, amount] of Object.entries(state.woolCounts)) {
        const decimal = new Decimal(amount);
        if (decimal.isNaN() || decimal.isNegative()) {
          return { valid: false, error: `Invalid wool amount for ${woolType}` };
        }
      }
      
      // Check building levels
      for (const [buildingType, building] of Object.entries(state.buildings)) {
        if (building.level < 0 || building.level > 1000) {
          return { valid: false, error: `Invalid building level for ${buildingType}` };
        }
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Placeholder methods for external dependencies
  private async fetchRemoteState(): Promise<VersionedGameState> {
    // TODO: Implement cloud API call
    throw new Error('Not implemented');
  }

  private async getRemoteVersion(): Promise<string> {
    // TODO: Implement cloud API call
    throw new Error('Not implemented');
  }

  private async fetchDelta(fromVersion: string, toVersion: string): Promise<StateDelta> {
    // TODO: Implement cloud API call
    throw new Error('Not implemented');
  }

  private async uploadState(state: VersionedGameState): Promise<void> {
    // TODO: Implement cloud API call
    throw new Error('Not implemented');
  }

  private loadLocalState(): VersionedGameState | null {
    // TODO: Implement local storage loading
    return null;
  }

  private async saveLocalState(state: VersionedGameState): Promise<void> {
    // TODO: Implement local storage saving
    this.localState = state;
  }

  private applyDelta(state: VersionedGameState, delta: StateDelta): VersionedGameState {
    // TODO: Implement delta application
    return state;
  }

  private detectDeltaConflicts(state: VersionedGameState, delta: StateDelta): SyncConflict[] {
    // TODO: Implement delta conflict detection
    return [];
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultSettings(): GameSettings {
    return {
      masterVolume: 1.0,
      sfxVolume: 1.0,
      musicVolume: 1.0,
      particles: true,
      autoSave: true,
      cloudSync: true,
      notifications: true,
      reducedMotion: false,
      colorBlindMode: false,
      language: 'en'
    };
  }
}

/**
 * Conflict resolver handles different resolution strategies
 */
class ConflictResolver {
  resolve(conflict: SyncConflict): Resolution {
    switch (conflict.type) {
      case ConflictType.VALUE_MISMATCH:
        return this.resolveValueMismatch(conflict);
      case ConflictType.CONCURRENT_MODIFICATION:
        return this.resolveConcurrentModification(conflict);
      default:
        return this.resolveLastWriteWins(conflict);
    }
  }

  private resolveValueMismatch(conflict: SyncConflict): Resolution {
    // For wool counts, use additive merge
    if (conflict.path.startsWith('woolCounts.')) {
      const localVal = new Decimal(conflict.localValue);
      const remoteVal = new Decimal(conflict.remoteValue);
      
      return {
        type: 'additive_merge',
        value: localVal.plus(remoteVal).toString(),
        reason: 'Combined wool amounts from both devices',
        automatic: true
      };
    }
    
    // For achievements, merge arrays
    if (conflict.path === 'unlockedAchievements') {
      const merged = Array.from(new Set([...conflict.localValue, ...conflict.remoteValue]));
      
      return {
        type: 'array_merge',
        value: merged,
        reason: 'Merged achievement arrays',
        automatic: true
      };
    }
    
    return this.resolveLastWriteWins(conflict);
  }

  private resolveConcurrentModification(conflict: SyncConflict): Resolution {
    // Use last-write-wins for concurrent modifications
    return this.resolveLastWriteWins(conflict);
  }

  private resolveLastWriteWins(conflict: SyncConflict): Resolution {
    const useRemote = conflict.remoteTimestamp > conflict.localTimestamp;
    
    return {
      type: 'last_write_wins',
      value: useRemote ? conflict.remoteValue : conflict.localValue,
      reason: `Used ${useRemote ? 'remote' : 'local'} value based on timestamp`,
      automatic: true
    };
  }
}

/**
 * Checksum validator for data integrity
 */
class ChecksumValidator {
  generateChecksum(data: any): string {
    // Remove checksum field for calculation
    const { checksum, ...dataWithoutChecksum } = data;
    
    // Deterministic serialization
    const serialized = JSON.stringify(dataWithoutChecksum, Object.keys(dataWithoutChecksum).sort());
    
    // Simple hash (in production, use crypto.createHash)
    return this.simpleHash(serialized);
  }

  validateDelta(delta: StateDelta): boolean {
    const expectedChecksum = this.generateChecksum(delta);
    return delta.checksum === expectedChecksum;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}

/**
 * Version control for game state
 */
class VersionControl {
  createVersion(state: VersionedGameState): string {
    return this.generateVersion();
  }

  generateVersion(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `v${timestamp}_${random}`;
  }
}

export default SyncEngine;