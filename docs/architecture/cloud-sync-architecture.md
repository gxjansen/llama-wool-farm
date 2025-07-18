# Cloud Sync Architecture for Llama Wool Farm

## Overview

This document outlines the comprehensive cloud sync architecture for Llama Wool Farm, designed to provide seamless multi-device synchronization with conflict resolution, versioning, and data integrity guarantees.

## Architecture Principles

### 1. Offline-First Design
- Local storage is the primary source of truth
- All operations work offline
- Sync operations are additive, not blocking
- Network failures don't break gameplay

### 2. Conflict Resolution Strategy
- **Last-Write-Wins (LWW)** for most game state
- **Merge-Based** for additive operations (wool counts, achievements)
- **User-Driven** for critical conflicts
- **Automatic** for non-critical conflicts

### 3. Data Integrity
- Cryptographic checksums for all data
- Incremental validation
- Corruption detection and recovery
- Rollback capabilities

## Core Components

### 1. Sync Engine Architecture

```typescript
interface SyncEngine {
  // Core sync operations
  syncUp(): Promise<SyncResult>;
  syncDown(): Promise<SyncResult>;
  fullSync(): Promise<SyncResult>;
  
  // Conflict resolution
  resolveConflicts(conflicts: SyncConflict[]): Promise<void>;
  
  // State management
  getLocalState(): GameState;
  getRemoteState(): Promise<GameState>;
  
  // Versioning
  createSnapshot(): StateSnapshot;
  applySnapshot(snapshot: StateSnapshot): void;
}
```

### 2. Version Control System

```typescript
interface VersionControl {
  // Version management
  getCurrentVersion(): string;
  createVersion(state: GameState): Version;
  getVersionHistory(): Version[];
  
  // Delta operations
  createDelta(from: Version, to: Version): StateDelta;
  applyDelta(delta: StateDelta): GameState;
  
  // Branching and merging
  createBranch(name: string): Branch;
  mergeBranches(source: Branch, target: Branch): MergeResult;
}
```

### 3. Conflict Resolution Engine

```typescript
interface ConflictResolver {
  // Conflict detection
  detectConflicts(local: GameState, remote: GameState): SyncConflict[];
  
  // Resolution strategies
  resolveLastWriteWins(conflict: SyncConflict): Resolution;
  resolveMergeAdditive(conflict: SyncConflict): Resolution;
  resolveUserChoice(conflict: SyncConflict): Promise<Resolution>;
  
  // Automatic resolution
  autoResolve(conflicts: SyncConflict[]): Resolution[];
}
```

## Data Models

### 1. Versioned Game State

```typescript
interface VersionedGameState {
  version: string;
  timestamp: number;
  checksum: string;
  deviceId: string;
  playerId: string;
  
  // Core game data
  woolCounts: Record<WoolType, WoolAmount>;
  buildings: Record<BuildingType, BuildingState>;
  achievements: AchievementState[];
  upgrades: UpgradeState[];
  
  // Metadata
  statistics: GameStatistics;
  settings: GameSettings;
  
  // Sync metadata
  syncMetadata: SyncMetadata;
}

interface WoolAmount {
  value: string; // Decimal as string
  lastModified: number;
  deviceId: string;
}

interface SyncMetadata {
  lastSyncTime: number;
  conflictResolutions: ConflictResolution[];
  pendingOperations: PendingOperation[];
  syncState: SyncState;
}
```

### 2. Delta Operations

```typescript
interface StateDelta {
  id: string;
  fromVersion: string;
  toVersion: string;
  timestamp: number;
  
  operations: DeltaOperation[];
  checksum: string;
}

interface DeltaOperation {
  type: 'add' | 'update' | 'delete' | 'merge';
  path: string;
  value: any;
  previousValue?: any;
  timestamp: number;
  deviceId: string;
}
```

### 3. Conflict Data

```typescript
interface SyncConflict {
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

enum ConflictType {
  VALUE_MISMATCH = 'value_mismatch',
  CONCURRENT_MODIFICATION = 'concurrent_modification',
  STRUCTURAL_CHANGE = 'structural_change',
  TIMESTAMP_SKEW = 'timestamp_skew'
}

enum ConflictSeverity {
  LOW = 'low',        // Auto-resolvable
  MEDIUM = 'medium',  // May require user input
  HIGH = 'high',      // Requires user decision
  CRITICAL = 'critical' // Blocks sync
}
```

## Sync Protocols

### 1. Three-Way Merge Protocol

```typescript
class ThreeWayMergeProtocol {
  async performSync(
    local: GameState,
    remote: GameState,
    base: GameState
  ): Promise<SyncResult> {
    // 1. Detect conflicts
    const conflicts = this.detectConflicts(local, remote, base);
    
    // 2. Auto-resolve simple conflicts
    const autoResolved = this.autoResolveConflicts(conflicts);
    
    // 3. Present user conflicts
    const userConflicts = conflicts.filter(c => !c.autoResolvable);
    const userResolutions = await this.getUserResolutions(userConflicts);
    
    // 4. Apply all resolutions
    const mergedState = this.applyResolutions(
      local, 
      remote, 
      [...autoResolved, ...userResolutions]
    );
    
    // 5. Validate and create new version
    const newVersion = this.createVersion(mergedState);
    
    return {
      success: true,
      newState: mergedState,
      version: newVersion,
      conflicts: conflicts.length,
      autoResolved: autoResolved.length
    };
  }
}
```

### 2. Delta Sync Protocol

```typescript
class DeltaSyncProtocol {
  async syncWithDeltas(
    localVersion: string,
    remoteVersion: string
  ): Promise<SyncResult> {
    // 1. Get delta from remote
    const delta = await this.getRemoteDelta(localVersion, remoteVersion);
    
    // 2. Validate delta integrity
    if (!this.validateDelta(delta)) {
      throw new Error('Delta integrity check failed');
    }
    
    // 3. Apply delta operations
    const newState = this.applyDelta(this.getLocalState(), delta);
    
    // 4. Detect conflicts during application
    const conflicts = this.detectDeltaConflicts(delta);
    
    // 5. Resolve conflicts
    const resolvedState = await this.resolveConflicts(newState, conflicts);
    
    return {
      success: true,
      newState: resolvedState,
      appliedOperations: delta.operations.length,
      conflicts: conflicts.length
    };
  }
}
```

## Conflict Resolution Strategies

### 1. Last-Write-Wins (LWW)

```typescript
class LastWriteWinsResolver {
  resolve(conflict: SyncConflict): Resolution {
    // Use timestamp to determine winner
    const useRemote = conflict.remoteTimestamp > conflict.localTimestamp;
    
    return {
      type: 'last_write_wins',
      value: useRemote ? conflict.remoteValue : conflict.localValue,
      reason: `Remote timestamp ${conflict.remoteTimestamp} > Local timestamp ${conflict.localTimestamp}`,
      automatic: true
    };
  }
}
```

### 2. Additive Merge

```typescript
class AdditiveMergeResolver {
  resolve(conflict: SyncConflict): Resolution {
    // For numerical values, add them together
    if (this.isNumericConflict(conflict)) {
      const localVal = new Decimal(conflict.localValue);
      const remoteVal = new Decimal(conflict.remoteValue);
      
      return {
        type: 'additive_merge',
        value: localVal.plus(remoteVal).toString(),
        reason: 'Combined additive values',
        automatic: true
      };
    }
    
    // For arrays, merge unique items
    if (this.isArrayConflict(conflict)) {
      const merged = this.mergeArrays(conflict.localValue, conflict.remoteValue);
      
      return {
        type: 'array_merge',
        value: merged,
        reason: 'Merged array items',
        automatic: true
      };
    }
    
    throw new Error('Cannot auto-resolve conflict');
  }
}
```

### 3. User-Driven Resolution

```typescript
class UserDrivenResolver {
  async resolve(conflict: SyncConflict): Promise<Resolution> {
    const userChoice = await this.promptUser({
      message: this.formatConflictMessage(conflict),
      options: [
        { label: 'Keep Local', value: 'local' },
        { label: 'Keep Remote', value: 'remote' },
        { label: 'Merge Both', value: 'merge' },
        { label: 'Custom', value: 'custom' }
      ]
    });
    
    switch (userChoice) {
      case 'local':
        return this.createLocalResolution(conflict);
      case 'remote':
        return this.createRemoteResolution(conflict);
      case 'merge':
        return this.createMergeResolution(conflict);
      case 'custom':
        return this.createCustomResolution(conflict);
    }
  }
}
```

## Data Integrity & Validation

### 1. Checksum System

```typescript
class ChecksumValidator {
  generateChecksum(data: any): string {
    const serialized = this.serializeForChecksum(data);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }
  
  validateChecksum(data: any, expectedChecksum: string): boolean {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }
  
  private serializeForChecksum(data: any): string {
    // Deterministic serialization for consistent checksums
    return JSON.stringify(data, Object.keys(data).sort());
  }
}
```

### 2. Corruption Detection

```typescript
class CorruptionDetector {
  async detectCorruption(state: GameState): Promise<CorruptionReport> {
    const issues: CorruptionIssue[] = [];
    
    // Check data consistency
    issues.push(...this.checkDataConsistency(state));
    
    // Check value ranges
    issues.push(...this.checkValueRanges(state));
    
    // Check referential integrity
    issues.push(...this.checkReferentialIntegrity(state));
    
    // Check temporal consistency
    issues.push(...this.checkTemporalConsistency(state));
    
    return {
      corrupted: issues.length > 0,
      issues,
      severity: this.calculateSeverity(issues)
    };
  }
}
```

### 3. Recovery Mechanisms

```typescript
class DataRecoveryManager {
  async recoverFromCorruption(
    corruptedState: GameState,
    report: CorruptionReport
  ): Promise<GameState> {
    let recoveredState = { ...corruptedState };
    
    for (const issue of report.issues) {
      switch (issue.type) {
        case 'invalid_range':
          recoveredState = this.fixInvalidRanges(recoveredState, issue);
          break;
        case 'missing_reference':
          recoveredState = this.fixMissingReferences(recoveredState, issue);
          break;
        case 'temporal_inconsistency':
          recoveredState = this.fixTemporalIssues(recoveredState, issue);
          break;
      }
    }
    
    // Validate recovery
    const validationResult = await this.validateRecovery(recoveredState);
    if (!validationResult.valid) {
      throw new Error('Recovery failed validation');
    }
    
    return recoveredState;
  }
}
```

## State Management Patterns

### 1. Event Sourcing

```typescript
class EventSourcingManager {
  private events: GameEvent[] = [];
  
  recordEvent(event: GameEvent): void {
    event.id = this.generateEventId();
    event.timestamp = Date.now();
    this.events.push(event);
  }
  
  replayEvents(fromTimestamp?: number): GameState {
    const relevantEvents = fromTimestamp
      ? this.events.filter(e => e.timestamp >= fromTimestamp)
      : this.events;
    
    return relevantEvents.reduce(
      (state, event) => this.applyEvent(state, event),
      this.getInitialState()
    );
  }
  
  createSnapshot(): StateSnapshot {
    return {
      state: this.getCurrentState(),
      eventCount: this.events.length,
      timestamp: Date.now()
    };
  }
}
```

### 2. CRDT Implementation

```typescript
class CRDTCounter {
  private counters: Map<string, number> = new Map();
  
  increment(deviceId: string, amount: number = 1): void {
    const current = this.counters.get(deviceId) || 0;
    this.counters.set(deviceId, current + amount);
  }
  
  getValue(): number {
    return Array.from(this.counters.values()).reduce((sum, val) => sum + val, 0);
  }
  
  merge(other: CRDTCounter): void {
    for (const [deviceId, value] of other.counters) {
      const current = this.counters.get(deviceId) || 0;
      this.counters.set(deviceId, Math.max(current, value));
    }
  }
}
```

## Performance Optimizations

### 1. Bandwidth Optimization

```typescript
class BandwidthOptimizer {
  compressState(state: GameState): CompressedState {
    // Remove redundant data
    const minimized = this.minimizeState(state);
    
    // Apply compression
    const compressed = this.compress(minimized);
    
    return {
      compressed,
      originalSize: JSON.stringify(state).length,
      compressedSize: compressed.length,
      compressionRatio: compressed.length / JSON.stringify(state).length
    };
  }
  
  createIncrementalUpdate(
    previousState: GameState,
    currentState: GameState
  ): IncrementalUpdate {
    const diff = this.calculateDiff(previousState, currentState);
    
    return {
      baseVersion: previousState.version,
      targetVersion: currentState.version,
      changes: diff,
      size: JSON.stringify(diff).length
    };
  }
}
```

### 2. Sync Queue Management

```typescript
class SyncQueueManager {
  private queue: SyncOperation[] = [];
  private processing = false;
  
  async enqueue(operation: SyncOperation): Promise<void> {
    this.queue.push(operation);
    
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      
      try {
        await this.executeOperation(operation);
      } catch (error) {
        await this.handleOperationFailure(operation, error);
      }
    }
    
    this.processing = false;
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Basic sync engine implementation
- [ ] Version control system
- [ ] Local state management
- [ ] Checksum validation

### Phase 2: Conflict Resolution (Weeks 3-4)
- [ ] Conflict detection algorithms
- [ ] Last-write-wins resolver
- [ ] Additive merge resolver
- [ ] User-driven resolution UI

### Phase 3: Data Integrity (Weeks 5-6)
- [ ] Corruption detection
- [ ] Recovery mechanisms
- [ ] Event sourcing implementation
- [ ] CRDT for critical data

### Phase 4: Optimization (Weeks 7-8)
- [ ] Bandwidth optimization
- [ ] Sync queue management
- [ ] Performance monitoring
- [ ] Testing framework

### Phase 5: Advanced Features (Weeks 9-10)
- [ ] Multi-device coordination
- [ ] Offline sync queue
- [ ] Backup and restore
- [ ] Analytics and monitoring

## Security Considerations

### 1. Data Encryption
- All sync data encrypted in transit
- Local storage encryption for sensitive data
- Key management for multi-device access

### 2. Authentication
- Device-based authentication
- Session management
- Secure token handling

### 3. Validation
- Server-side validation of all sync operations
- Rate limiting for sync requests
- Anomaly detection for suspicious activity

## Testing Strategy

### 1. Unit Tests
- Individual component testing
- Conflict resolution scenarios
- Data integrity validation

### 2. Integration Tests
- End-to-end sync flows
- Multi-device scenarios
- Network failure handling

### 3. Performance Tests
- Large dataset synchronization
- Bandwidth usage measurement
- Latency optimization

## Monitoring & Analytics

### 1. Sync Metrics
- Sync success/failure rates
- Conflict resolution statistics
- Data integrity reports

### 2. Performance Metrics
- Sync duration tracking
- Bandwidth usage monitoring
- Error rate analysis

### 3. User Experience
- Sync UI responsiveness
- Conflict resolution user flow
- Recovery time metrics

---

This architecture provides a robust foundation for cloud synchronization in Llama Wool Farm, ensuring data consistency, conflict resolution, and optimal user experience across all devices.