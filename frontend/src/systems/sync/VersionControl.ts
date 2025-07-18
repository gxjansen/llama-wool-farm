/**
 * Version Control System for Llama Wool Farm
 * Handles game state versioning, branching, and delta operations
 */

import { GameSave } from '../../types/game.types';
import { VersionedGameState } from './SyncEngine';

export interface Version {
  id: string;
  parentId?: string;
  timestamp: number;
  deviceId: string;
  playerId: string;
  checksum: string;
  metadata: VersionMetadata;
  state: VersionedGameState;
}

export interface VersionMetadata {
  title?: string;
  description?: string;
  tags: string[];
  size: number;
  compressed: boolean;
  majorChanges: string[];
  minorChanges: string[];
}

export interface StateDelta {
  id: string;
  fromVersion: string;
  toVersion: string;
  timestamp: number;
  operations: DeltaOperation[];
  checksum: string;
  metadata: DeltaMetadata;
}

export interface DeltaOperation {
  type: 'add' | 'update' | 'delete' | 'move';
  path: string;
  value?: any;
  oldValue?: any;
  timestamp: number;
  deviceId: string;
}

export interface DeltaMetadata {
  operationCount: number;
  size: number;
  compressed: boolean;
  affectedPaths: string[];
}

export interface Branch {
  id: string;
  name: string;
  parentBranch?: string;
  headVersion: string;
  createdAt: number;
  lastModified: number;
  description?: string;
  tags: string[];
}

export interface MergeResult {
  success: boolean;
  resultVersion?: Version;
  conflicts: MergeConflict[];
  mergedBranch?: Branch;
  error?: string;
}

export interface MergeConflict {
  path: string;
  baseValue: any;
  sourceValue: any;
  targetValue: any;
  resolution?: any;
}

export interface StateSnapshot {
  id: string;
  version: string;
  timestamp: number;
  state: VersionedGameState;
  metadata: SnapshotMetadata;
}

export interface SnapshotMetadata {
  title?: string;
  description?: string;
  automatic: boolean;
  triggers: string[];
  size: number;
  compressed: boolean;
}

export interface VersionHistory {
  versions: Version[];
  branches: Branch[];
  snapshots: StateSnapshot[];
  currentVersion: string;
  currentBranch: string;
}

/**
 * Advanced version control system for game state
 */
export class GameStateVersionControl {
  private versions: Map<string, Version> = new Map();
  private branches: Map<string, Branch> = new Map();
  private snapshots: Map<string, StateSnapshot> = new Map();
  private currentVersion: string | null = null;
  private currentBranch: string = 'main';

  constructor() {
    this.initializeMainBranch();
  }

  /**
   * Initialize the main branch
   */
  private initializeMainBranch(): void {
    const mainBranch: Branch = {
      id: 'main',
      name: 'main',
      headVersion: '',
      createdAt: Date.now(),
      lastModified: Date.now(),
      description: 'Main game progression branch',
      tags: ['default', 'main']
    };
    
    this.branches.set('main', mainBranch);
  }

  /**
   * Create a new version from game state
   */
  createVersion(state: VersionedGameState, metadata?: Partial<VersionMetadata>): Version {
    const version: Version = {
      id: this.generateVersionId(),
      parentId: this.currentVersion || undefined,
      timestamp: Date.now(),
      deviceId: state.deviceId,
      playerId: state.playerId,
      checksum: this.calculateChecksum(state),
      metadata: {
        title: metadata?.title || 'Auto-save',
        description: metadata?.description || 'Automatic version creation',
        tags: metadata?.tags || [],
        size: this.calculateSize(state),
        compressed: false,
        majorChanges: metadata?.majorChanges || [],
        minorChanges: metadata?.minorChanges || []
      },
      state: { ...state }
    };

    this.versions.set(version.id, version);
    this.currentVersion = version.id;
    
    // Update current branch
    const currentBranch = this.branches.get(this.currentBranch);
    if (currentBranch) {
      currentBranch.headVersion = version.id;
      currentBranch.lastModified = Date.now();
    }

    return version;
  }

  /**
   * Get a specific version
   */
  getVersion(versionId: string): Version | null {
    return this.versions.get(versionId) || null;
  }

  /**
   * Get the current version
   */
  getCurrentVersion(): Version | null {
    return this.currentVersion ? this.versions.get(this.currentVersion) || null : null;
  }

  /**
   * Get version history
   */
  getVersionHistory(limit?: number): Version[] {
    const allVersions = Array.from(this.versions.values())
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? allVersions.slice(0, limit) : allVersions;
  }

  /**
   * Create a delta between two versions
   */
  createDelta(fromVersion: string, toVersion: string): StateDelta {
    const fromState = this.versions.get(fromVersion);
    const toState = this.versions.get(toVersion);
    
    if (!fromState || !toState) {
      throw new Error('One or both versions not found');
    }

    const operations = this.calculateDeltaOperations(fromState.state, toState.state);
    
    const delta: StateDelta = {
      id: this.generateDeltaId(),
      fromVersion,
      toVersion,
      timestamp: Date.now(),
      operations,
      checksum: this.calculateDeltaChecksum(operations),
      metadata: {
        operationCount: operations.length,
        size: this.calculateDeltaSize(operations),
        compressed: false,
        affectedPaths: Array.from(new Set(operations.map(op => op.path)))
      }
    };

    return delta;
  }

  /**
   * Apply a delta to a version
   */
  applyDelta(baseVersion: string, delta: StateDelta): Version {
    const baseState = this.versions.get(baseVersion);
    if (!baseState) {
      throw new Error('Base version not found');
    }

    // Validate delta
    if (delta.fromVersion !== baseVersion) {
      throw new Error('Delta base version mismatch');
    }

    const newState = this.applyDeltaOperations(baseState.state, delta.operations);
    
    return this.createVersion(newState, {
      title: 'Delta Application',
      description: `Applied delta from ${delta.fromVersion} to ${delta.toVersion}`,
      tags: ['delta', 'sync']
    });
  }

  /**
   * Create a new branch
   */
  createBranch(name: string, fromVersion?: string, description?: string): Branch {
    const baseVersion = fromVersion || this.currentVersion;
    if (!baseVersion) {
      throw new Error('No base version available');
    }

    const branch: Branch = {
      id: this.generateBranchId(),
      name,
      parentBranch: this.currentBranch,
      headVersion: baseVersion,
      createdAt: Date.now(),
      lastModified: Date.now(),
      description,
      tags: []
    };

    this.branches.set(branch.id, branch);
    return branch;
  }

  /**
   * Switch to a different branch
   */
  switchBranch(branchId: string): boolean {
    const branch = this.branches.get(branchId);
    if (!branch) {
      return false;
    }

    this.currentBranch = branchId;
    this.currentVersion = branch.headVersion;
    return true;
  }

  /**
   * Merge two branches
   */
  mergeBranches(sourceBranch: string, targetBranch: string): MergeResult {
    const source = this.branches.get(sourceBranch);
    const target = this.branches.get(targetBranch);
    
    if (!source || !target) {
      return {
        success: false,
        conflicts: [],
        error: 'Source or target branch not found'
      };
    }

    const sourceVersion = this.versions.get(source.headVersion);
    const targetVersion = this.versions.get(target.headVersion);
    
    if (!sourceVersion || !targetVersion) {
      return {
        success: false,
        conflicts: [],
        error: 'Source or target version not found'
      };
    }

    // Find common ancestor
    const commonAncestor = this.findCommonAncestor(sourceVersion, targetVersion);
    if (!commonAncestor) {
      return {
        success: false,
        conflicts: [],
        error: 'No common ancestor found'
      };
    }

    // Perform three-way merge
    const mergeResult = this.performThreeWayMerge(
      commonAncestor.state,
      sourceVersion.state,
      targetVersion.state
    );

    if (mergeResult.conflicts.length > 0) {
      return {
        success: false,
        conflicts: mergeResult.conflicts,
        error: 'Merge conflicts detected'
      };
    }

    // Create merged version
    const mergedVersion = this.createVersion(mergeResult.mergedState, {
      title: `Merge ${source.name} into ${target.name}`,
      description: `Merged branch ${source.name} into ${target.name}`,
      tags: ['merge', 'branch'],
      majorChanges: ['Branch merge']
    });

    // Update target branch
    target.headVersion = mergedVersion.id;
    target.lastModified = Date.now();

    return {
      success: true,
      resultVersion: mergedVersion,
      conflicts: [],
      mergedBranch: target
    };
  }

  /**
   * Create a snapshot of the current state
   */
  createSnapshot(title?: string, description?: string): StateSnapshot {
    const currentVersion = this.getCurrentVersion();
    if (!currentVersion) {
      throw new Error('No current version to snapshot');
    }

    const snapshot: StateSnapshot = {
      id: this.generateSnapshotId(),
      version: currentVersion.id,
      timestamp: Date.now(),
      state: { ...currentVersion.state },
      metadata: {
        title: title || 'Manual Snapshot',
        description: description || 'User-created snapshot',
        automatic: false,
        triggers: ['manual'],
        size: this.calculateSize(currentVersion.state),
        compressed: false
      }
    };

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  /**
   * Restore from a snapshot
   */
  restoreFromSnapshot(snapshotId: string): Version {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    return this.createVersion(snapshot.state, {
      title: 'Snapshot Restore',
      description: `Restored from snapshot: ${snapshot.metadata.title}`,
      tags: ['restore', 'snapshot'],
      majorChanges: ['Snapshot restore']
    });
  }

  /**
   * Rollback to a previous version
   */
  rollback(versionId: string): Version {
    const targetVersion = this.versions.get(versionId);
    if (!targetVersion) {
      throw new Error('Target version not found');
    }

    return this.createVersion(targetVersion.state, {
      title: 'Rollback',
      description: `Rolled back to version ${versionId}`,
      tags: ['rollback', 'restore'],
      majorChanges: ['Version rollback']
    });
  }

  /**
   * Get complete version history
   */
  getCompleteHistory(): VersionHistory {
    return {
      versions: Array.from(this.versions.values()),
      branches: Array.from(this.branches.values()),
      snapshots: Array.from(this.snapshots.values()),
      currentVersion: this.currentVersion || '',
      currentBranch: this.currentBranch
    };
  }

  /**
   * Calculate delta operations between two states
   */
  private calculateDeltaOperations(
    fromState: VersionedGameState,
    toState: VersionedGameState
  ): DeltaOperation[] {
    const operations: DeltaOperation[] = [];

    // Compare wool counts
    this.compareWoolCounts(fromState, toState, operations);
    
    // Compare buildings
    this.compareBuildings(fromState, toState, operations);
    
    // Compare achievements
    this.compareAchievements(fromState, toState, operations);
    
    // Compare upgrades
    this.compareUpgrades(fromState, toState, operations);
    
    // Compare settings
    this.compareSettings(fromState, toState, operations);

    return operations;
  }

  /**
   * Compare wool counts between states
   */
  private compareWoolCounts(
    fromState: VersionedGameState,
    toState: VersionedGameState,
    operations: DeltaOperation[]
  ): void {
    // Check for changes in wool counts
    const allWoolTypes = new Set([
      ...Object.keys(fromState.woolCounts),
      ...Object.keys(toState.woolCounts)
    ]);

    for (const woolType of allWoolTypes) {
      const fromAmount = fromState.woolCounts[woolType];
      const toAmount = toState.woolCounts[woolType];

      if (fromAmount !== toAmount) {
        operations.push({
          type: toAmount === undefined ? 'delete' : fromAmount === undefined ? 'add' : 'update',
          path: `woolCounts.${woolType}`,
          value: toAmount,
          oldValue: fromAmount,
          timestamp: Date.now(),
          deviceId: toState.deviceId
        });
      }
    }
  }

  /**
   * Compare buildings between states
   */
  private compareBuildings(
    fromState: VersionedGameState,
    toState: VersionedGameState,
    operations: DeltaOperation[]
  ): void {
    const allBuildingTypes = new Set([
      ...Object.keys(fromState.buildings),
      ...Object.keys(toState.buildings)
    ]);

    for (const buildingType of allBuildingTypes) {
      const fromBuilding = fromState.buildings[buildingType];
      const toBuilding = toState.buildings[buildingType];

      if (JSON.stringify(fromBuilding) !== JSON.stringify(toBuilding)) {
        operations.push({
          type: toBuilding === undefined ? 'delete' : fromBuilding === undefined ? 'add' : 'update',
          path: `buildings.${buildingType}`,
          value: toBuilding,
          oldValue: fromBuilding,
          timestamp: Date.now(),
          deviceId: toState.deviceId
        });
      }
    }
  }

  /**
   * Compare achievements between states
   */
  private compareAchievements(
    fromState: VersionedGameState,
    toState: VersionedGameState,
    operations: DeltaOperation[]
  ): void {
    if (JSON.stringify(fromState.unlockedAchievements) !== JSON.stringify(toState.unlockedAchievements)) {
      operations.push({
        type: 'update',
        path: 'unlockedAchievements',
        value: toState.unlockedAchievements,
        oldValue: fromState.unlockedAchievements,
        timestamp: Date.now(),
        deviceId: toState.deviceId
      });
    }
  }

  /**
   * Compare upgrades between states
   */
  private compareUpgrades(
    fromState: VersionedGameState,
    toState: VersionedGameState,
    operations: DeltaOperation[]
  ): void {
    if (JSON.stringify(fromState.purchasedUpgrades) !== JSON.stringify(toState.purchasedUpgrades)) {
      operations.push({
        type: 'update',
        path: 'purchasedUpgrades',
        value: toState.purchasedUpgrades,
        oldValue: fromState.purchasedUpgrades,
        timestamp: Date.now(),
        deviceId: toState.deviceId
      });
    }
  }

  /**
   * Compare settings between states
   */
  private compareSettings(
    fromState: VersionedGameState,
    toState: VersionedGameState,
    operations: DeltaOperation[]
  ): void {
    if (JSON.stringify(fromState.settings) !== JSON.stringify(toState.settings)) {
      operations.push({
        type: 'update',
        path: 'settings',
        value: toState.settings,
        oldValue: fromState.settings,
        timestamp: Date.now(),
        deviceId: toState.deviceId
      });
    }
  }

  /**
   * Apply delta operations to a state
   */
  private applyDeltaOperations(
    baseState: VersionedGameState,
    operations: DeltaOperation[]
  ): VersionedGameState {
    const newState = { ...baseState };

    for (const operation of operations) {
      this.applyDeltaOperation(newState, operation);
    }

    // Update metadata
    newState.timestamp = Date.now();
    newState.version = this.generateVersionId();

    return newState;
  }

  /**
   * Apply a single delta operation
   */
  private applyDeltaOperation(state: VersionedGameState, operation: DeltaOperation): void {
    const pathParts = operation.path.split('.');
    let current = state as any;

    // Navigate to the parent of the target
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }

    const targetKey = pathParts[pathParts.length - 1];

    switch (operation.type) {
      case 'add':
      case 'update':
        current[targetKey] = operation.value;
        break;
      case 'delete':
        delete current[targetKey];
        break;
      case 'move':
        // For move operations, we'd need additional metadata
        break;
    }
  }

  /**
   * Find common ancestor between two versions
   */
  private findCommonAncestor(version1: Version, version2: Version): Version | null {
    const ancestors1 = this.getAncestors(version1);
    const ancestors2 = this.getAncestors(version2);

    // Find first common ancestor
    for (const ancestor1 of ancestors1) {
      for (const ancestor2 of ancestors2) {
        if (ancestor1.id === ancestor2.id) {
          return ancestor1;
        }
      }
    }

    return null;
  }

  /**
   * Get all ancestors of a version
   */
  private getAncestors(version: Version): Version[] {
    const ancestors: Version[] = [];
    let current = version;

    while (current.parentId) {
      const parent = this.versions.get(current.parentId);
      if (!parent) break;
      
      ancestors.push(parent);
      current = parent;
    }

    return ancestors;
  }

  /**
   * Perform three-way merge
   */
  private performThreeWayMerge(
    base: VersionedGameState,
    source: VersionedGameState,
    target: VersionedGameState
  ): { mergedState: VersionedGameState; conflicts: MergeConflict[] } {
    const conflicts: MergeConflict[] = [];
    const mergedState = { ...target };

    // This is a simplified merge - in reality, this would be much more complex
    // For now, we'll use a simple strategy: prefer target for conflicts
    
    return { mergedState, conflicts };
  }

  /**
   * Generate version ID
   */
  private generateVersionId(): string {
    return `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate delta ID
   */
  private generateDeltaId(): string {
    return `d${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate branch ID
   */
  private generateBranchId(): string {
    return `b${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate snapshot ID
   */
  private generateSnapshotId(): string {
    return `s${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate checksum for state
   */
  private calculateChecksum(state: VersionedGameState): string {
    const serialized = JSON.stringify(state, Object.keys(state).sort());
    return this.simpleHash(serialized);
  }

  /**
   * Calculate checksum for delta
   */
  private calculateDeltaChecksum(operations: DeltaOperation[]): string {
    const serialized = JSON.stringify(operations);
    return this.simpleHash(serialized);
  }

  /**
   * Calculate size of state
   */
  private calculateSize(state: VersionedGameState): number {
    return JSON.stringify(state).length;
  }

  /**
   * Calculate size of delta
   */
  private calculateDeltaSize(operations: DeltaOperation[]): number {
    return JSON.stringify(operations).length;
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
}

export default GameStateVersionControl;