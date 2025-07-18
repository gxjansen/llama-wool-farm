import { GameSave, WoolType, BuildingType } from '../types/game.types';
import { Decimal } from 'decimal.js';

export interface ValidationResult {
  isValid: boolean;
  suspiciousActivity: SecurityEvent[];
  violations: SecurityEvent[];
  confidenceScore: number;
  recommendations: string[];
}

export interface SecurityEvent {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class StateValidator {
  private readonly MAX_OFFLINE_HOURS = 24;
  private readonly MAX_PRODUCTION_MULTIPLIER = 1e12;
  private readonly SUSPICIOUS_THRESHOLD = 0.95;
  private readonly WOOL_CONFIGS = this.loadWoolConfigs();
  private readonly BUILDING_CONFIGS = this.loadBuildingConfigs();

  /**
   * Validate game state changes
   */
  async validateGameState(
    previousState: GameSave,
    currentState: GameSave,
    timeDelta: number
  ): Promise<ValidationResult> {
    const results: ValidationResult = {
      isValid: true,
      suspiciousActivity: [],
      violations: [],
      confidenceScore: 1.0,
      recommendations: []
    };

    // Run all validation checks
    await this.validateTimeProgression(previousState, currentState, timeDelta, results);
    await this.validateProduction(previousState, currentState, timeDelta, results);
    await this.validateResources(previousState, currentState, results);
    await this.validateBuildingProgression(previousState, currentState, results);
    await this.validateAchievements(previousState, currentState, results);
    await this.validateUpgrades(previousState, currentState, results);
    await this.validatePrestige(previousState, currentState, results);

    // Calculate final confidence score
    results.confidenceScore = this.calculateConfidenceScore(results);
    results.isValid = results.confidenceScore > this.SUSPICIOUS_THRESHOLD;

    // Generate recommendations
    results.recommendations = this.generateRecommendations(results);

    return results;
  }

  /**
   * Validate time progression
   */
  private async validateTimeProgression(
    prev: GameSave,
    curr: GameSave,
    timeDelta: number,
    results: ValidationResult
  ): Promise<void> {
    // Check for impossible time jumps
    if (timeDelta > this.MAX_OFFLINE_HOURS * 3600 * 1000) {
      results.violations.push({
        type: 'TIME_JUMP',
        severity: 'HIGH',
        message: `Impossible time jump: ${timeDelta / 1000 / 3600}h`,
        timestamp: new Date(),
        metadata: { timeDelta, maxAllowed: this.MAX_OFFLINE_HOURS * 3600 * 1000 }
      });
    }

    // Check for negative time progression
    if (curr.timestamp < prev.timestamp) {
      results.violations.push({
        type: 'TIME_REGRESSION',
        severity: 'HIGH',
        message: 'Timestamp moved backwards',
        timestamp: new Date(),
        metadata: { prevTimestamp: prev.timestamp, currTimestamp: curr.timestamp }
      });
    }

    // Check for suspicious playtime increases
    const playtimeIncrease = curr.playTime - prev.playTime;
    if (playtimeIncrease > timeDelta * 1.1) {
      results.suspiciousActivity.push({
        type: 'PLAYTIME_ANOMALY',
        severity: 'MEDIUM',
        message: 'Playtime increased more than real time',
        timestamp: new Date(),
        metadata: { playtimeIncrease, timeDelta }
      });
    }

    // Check for unrealistic progression speed
    const progressionRate = this.calculateProgressionRate(prev, curr, timeDelta);
    if (progressionRate > 100) { // 100x normal speed
      results.suspiciousActivity.push({
        type: 'PROGRESSION_SPEED',
        severity: 'HIGH',
        message: 'Unrealistic progression speed detected',
        timestamp: new Date(),
        metadata: { progressionRate }
      });
    }
  }

  /**
   * Validate production calculations
   */
  private async validateProduction(
    prev: GameSave,
    curr: GameSave,
    timeDelta: number,
    results: ValidationResult
  ): Promise<void> {
    const expectedProduction = await this.calculateExpectedProduction(prev, timeDelta);
    
    Object.values(WoolType).forEach(woolType => {
      const prevAmount = new Decimal(prev.woolCounts[woolType] || '0');
      const currAmount = new Decimal(curr.woolCounts[woolType] || '0');
      const actualGain = currAmount.minus(prevAmount);
      const expectedGain = expectedProduction[woolType];
      
      // Allow 10% tolerance for floating point errors
      const tolerance = expectedGain.mul(0.1);
      const maxAllowed = expectedGain.plus(tolerance);
      
      if (actualGain.gt(maxAllowed)) {
        results.violations.push({
          type: 'PRODUCTION_OVERFLOW',
          severity: 'HIGH',
          message: `${woolType} production exceeded maximum: ${actualGain.toString()} > ${maxAllowed.toString()}`,
          timestamp: new Date(),
          metadata: { 
            woolType, 
            actual: actualGain.toString(), 
            expected: expectedGain.toString(),
            maxAllowed: maxAllowed.toString()
          }
        });
      }

      // Check for impossible production rates
      const productionRate = actualGain.div(timeDelta / 1000);
      const maxRate = this.calculateMaxProductionRate(prev, woolType);
      
      if (productionRate.gt(maxRate.mul(1.1))) {
        results.violations.push({
          type: 'IMPOSSIBLE_PRODUCTION_RATE',
          severity: 'HIGH',
          message: `${woolType} production rate exceeds maximum possible`,
          timestamp: new Date(),
          metadata: { 
            woolType, 
            rate: productionRate.toString(), 
            maxRate: maxRate.toString()
          }
        });
      }
    });
  }

  /**
   * Validate resource changes
   */
  private async validateResources(
    prev: GameSave,
    curr: GameSave,
    results: ValidationResult
  ): Promise<void> {
    // Check for impossible resource increases
    const prevSoulShears = new Decimal(prev.soulShears);
    const currSoulShears = new Decimal(curr.soulShears);
    
    if (currSoulShears.gt(prevSoulShears)) {
      // Soul shears can only increase through prestige
      if (curr.totalPrestiges === prev.totalPrestiges) {
        results.violations.push({
          type: 'INVALID_CURRENCY_GAIN',
          severity: 'HIGH',
          message: 'Soul shears increased without prestige',
          timestamp: new Date(),
          metadata: { 
            prevSoulShears: prevSoulShears.toString(), 
            currSoulShears: currSoulShears.toString()
          }
        });
      }
    }

    // Check for negative resources
    Object.values(WoolType).forEach(woolType => {
      const amount = new Decimal(curr.woolCounts[woolType] || '0');
      if (amount.lt(0)) {
        results.violations.push({
          type: 'NEGATIVE_RESOURCE',
          severity: 'HIGH',
          message: `Negative ${woolType} amount: ${amount.toString()}`,
          timestamp: new Date(),
          metadata: { woolType, amount: amount.toString() }
        });
      }
    });

    // Check for resource ratios that don't make sense
    const totalWool = Object.values(WoolType).reduce((sum, type) => {
      return sum.plus(new Decimal(curr.woolCounts[type] || '0'));
    }, new Decimal(0));

    const totalProduced = new Decimal(curr.totalWoolProduced);
    
    if (totalWool.gt(totalProduced.mul(1.1))) {
      results.suspiciousActivity.push({
        type: 'RESOURCE_RATIO_ANOMALY',
        severity: 'MEDIUM',
        message: 'Current wool exceeds total produced',
        timestamp: new Date(),
        metadata: { 
          totalWool: totalWool.toString(), 
          totalProduced: totalProduced.toString()
        }
      });
    }
  }

  /**
   * Validate building progression
   */
  private async validateBuildingProgression(
    prev: GameSave,
    curr: GameSave,
    results: ValidationResult
  ): Promise<void> {
    Object.values(BuildingType).forEach(buildingType => {
      const prevBuilding = prev.buildings[buildingType];
      const currBuilding = curr.buildings[buildingType];
      
      // Check for impossible level jumps
      const levelIncrease = currBuilding.level - prevBuilding.level;
      if (levelIncrease > 100) { // Max 100 levels per update
        results.violations.push({
          type: 'BUILDING_LEVEL_JUMP',
          severity: 'HIGH',
          message: `${buildingType} level increased by ${levelIncrease}`,
          timestamp: new Date(),
          metadata: { 
            buildingType, 
            prevLevel: prevBuilding.level, 
            currLevel: currBuilding.level,
            increase: levelIncrease
          }
        });
      }

      // Check if building upgrades are affordable
      if (levelIncrease > 0) {
        const upgradeCost = this.calculateBuildingUpgradeCost(
          buildingType,
          prevBuilding.level,
          currBuilding.level
        );
        
        if (!this.canAffordUpgrade(prev, upgradeCost)) {
          results.violations.push({
            type: 'UNAFFORDABLE_UPGRADE',
            severity: 'HIGH',
            message: `${buildingType} upgrade not affordable`,
            timestamp: new Date(),
            metadata: { 
              buildingType, 
              cost: upgradeCost.toString(),
              prevLevel: prevBuilding.level,
              currLevel: currBuilding.level
            }
          });
        }
      }

      // Check for building unlock consistency
      if (currBuilding.unlocked && !prevBuilding.unlocked) {
        if (!this.validateBuildingUnlock(curr, buildingType)) {
          results.violations.push({
            type: 'INVALID_BUILDING_UNLOCK',
            severity: 'MEDIUM',
            message: `${buildingType} unlocked without meeting requirements`,
            timestamp: new Date(),
            metadata: { buildingType }
          });
        }
      }
    });
  }

  /**
   * Validate achievements
   */
  private async validateAchievements(
    prev: GameSave,
    curr: GameSave,
    results: ValidationResult
  ): Promise<void> {
    const newAchievements = curr.unlockedAchievements.filter(
      id => !prev.unlockedAchievements.includes(id)
    );

    for (const achievementId of newAchievements) {
      const achievement = this.getAchievementById(achievementId);
      if (!achievement) {
        results.violations.push({
          type: 'INVALID_ACHIEVEMENT',
          severity: 'MEDIUM',
          message: `Unknown achievement: ${achievementId}`,
          timestamp: new Date(),
          metadata: { achievementId }
        });
        continue;
      }

      // Validate achievement requirements
      if (!this.validateAchievementRequirements(curr, achievement)) {
        results.violations.push({
          type: 'ACHIEVEMENT_REQUIREMENT_NOT_MET',
          severity: 'HIGH',
          message: `Achievement ${achievementId} requirements not met`,
          timestamp: new Date(),
          metadata: { achievementId, requirements: achievement.requirement }
        });
      }
    }
  }

  /**
   * Validate upgrade purchases
   */
  private async validateUpgrades(
    prev: GameSave,
    curr: GameSave,
    results: ValidationResult
  ): Promise<void> {
    const newUpgrades = curr.purchasedUpgrades.filter(
      id => !prev.purchasedUpgrades.includes(id)
    );

    for (const upgradeId of newUpgrades) {
      const upgrade = this.getUpgradeById(upgradeId);
      if (!upgrade) {
        results.violations.push({
          type: 'INVALID_UPGRADE',
          severity: 'MEDIUM',
          message: `Unknown upgrade: ${upgradeId}`,
          timestamp: new Date(),
          metadata: { upgradeId }
        });
        continue;
      }

      // Check if upgrade is affordable
      if (!this.canAffordUpgrade(prev, upgrade.cost)) {
        results.violations.push({
          type: 'UNAFFORDABLE_UPGRADE_PURCHASE',
          severity: 'HIGH',
          message: `Upgrade ${upgradeId} not affordable`,
          timestamp: new Date(),
          metadata: { upgradeId, cost: upgrade.cost.toString() }
        });
      }

      // Check upgrade requirements
      if (upgrade.requirements && !this.validateUpgradeRequirements(prev, upgrade.requirements)) {
        results.violations.push({
          type: 'UPGRADE_REQUIREMENT_NOT_MET',
          severity: 'HIGH',
          message: `Upgrade ${upgradeId} requirements not met`,
          timestamp: new Date(),
          metadata: { upgradeId, requirements: upgrade.requirements }
        });
      }
    }
  }

  /**
   * Validate prestige mechanics
   */
  private async validatePrestige(
    prev: GameSave,
    curr: GameSave,
    results: ValidationResult
  ): Promise<void> {
    const prestigeIncrease = curr.totalPrestiges - prev.totalPrestiges;
    
    if (prestigeIncrease > 0) {
      // Check if prestige is valid
      if (prestigeIncrease > 1) {
        results.violations.push({
          type: 'MULTIPLE_PRESTIGE',
          severity: 'HIGH',
          message: `Multiple prestiges in single update: ${prestigeIncrease}`,
          timestamp: new Date(),
          metadata: { prestigeIncrease }
        });
      }

      // Check if prestige requirements are met
      const totalWool = Object.values(WoolType).reduce((sum, type) => {
        return sum.plus(new Decimal(prev.woolCounts[type] || '0'));
      }, new Decimal(0));

      const minWoolForPrestige = new Decimal('1e50'); // Arbitrary large number
      if (totalWool.lt(minWoolForPrestige)) {
        results.violations.push({
          type: 'EARLY_PRESTIGE',
          severity: 'HIGH',
          message: 'Prestige attempted without sufficient wool',
          timestamp: new Date(),
          metadata: { 
            totalWool: totalWool.toString(), 
            required: minWoolForPrestige.toString()
          }
        });
      }

      // Validate soul shears calculation
      const expectedSoulShears = this.calculateExpectedSoulShears(prev);
      const actualSoulShears = new Decimal(curr.soulShears);
      const prevSoulShears = new Decimal(prev.soulShears);
      const soulShearsGain = actualSoulShears.minus(prevSoulShears);

      if (soulShearsGain.gt(expectedSoulShears.mul(1.1))) {
        results.violations.push({
          type: 'INVALID_SOUL_SHEARS',
          severity: 'HIGH',
          message: 'Soul shears gain exceeds expected amount',
          timestamp: new Date(),
          metadata: { 
            actual: soulShearsGain.toString(), 
            expected: expectedSoulShears.toString()
          }
        });
      }
    }
  }

  /**
   * Calculate expected production for validation
   */
  private async calculateExpectedProduction(
    state: GameSave,
    timeDelta: number
  ): Promise<Record<WoolType, Decimal>> {
    const production: Record<WoolType, Decimal> = {} as any;
    
    Object.values(WoolType).forEach(woolType => {
      let baseProduction = new Decimal(0);
      
      // Calculate building contributions
      Object.values(BuildingType).forEach(buildingType => {
        const building = state.buildings[buildingType];
        if (building.unlocked && building.level > 0) {
          const buildingProduction = building.baseProduction
            .mul(building.productionMultiplier)
            .mul(building.level);
          baseProduction = baseProduction.plus(buildingProduction);
        }
      });
      
      // Apply global multipliers
      const totalMultiplier = this.calculateTotalMultiplier(state);
      
      // Calculate production over time
      const timeInSeconds = timeDelta / 1000;
      production[woolType] = baseProduction.mul(totalMultiplier).mul(timeInSeconds);
    });
    
    return production;
  }

  /**
   * Calculate total production multiplier
   */
  private calculateTotalMultiplier(state: GameSave): Decimal {
    let multiplier = new Decimal(1);
    
    // Add upgrade multipliers
    state.purchasedUpgrades.forEach(upgradeId => {
      const upgrade = this.getUpgradeById(upgradeId);
      if (upgrade?.effect.type === 'multiply' && upgrade.effect.target === 'production') {
        multiplier = multiplier.mul(upgrade.effect.value);
      }
    });
    
    // Add prestige multiplier
    const prestigeMultiplier = new Decimal(1.1).pow(state.totalPrestiges);
    multiplier = multiplier.mul(prestigeMultiplier);
    
    // Add achievement multipliers
    state.unlockedAchievements.forEach(achievementId => {
      const achievement = this.getAchievementById(achievementId);
      if (achievement?.reward?.type === 'multiplier' && achievement.reward.target === 'production') {
        multiplier = multiplier.mul(achievement.reward.value);
      }
    });
    
    return multiplier;
  }

  /**
   * Calculate confidence score based on violations and suspicious activity
   */
  private calculateConfidenceScore(results: ValidationResult): number {
    let score = 1.0;
    
    // Reduce score for violations
    results.violations.forEach(violation => {
      switch (violation.severity) {
        case 'HIGH':
          score -= 0.3;
          break;
        case 'MEDIUM':
          score -= 0.15;
          break;
        case 'LOW':
          score -= 0.05;
          break;
      }
    });
    
    // Reduce score for suspicious activity
    results.suspiciousActivity.forEach(activity => {
      switch (activity.severity) {
        case 'HIGH':
          score -= 0.2;
          break;
        case 'MEDIUM':
          score -= 0.1;
          break;
        case 'LOW':
          score -= 0.02;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(results: ValidationResult): string[] {
    const recommendations: string[] = [];
    
    if (results.violations.length > 0) {
      recommendations.push('Review user activity for potential cheating');
    }
    
    if (results.suspiciousActivity.length > 5) {
      recommendations.push('Implement additional monitoring for this user');
    }
    
    if (results.confidenceScore < 0.7) {
      recommendations.push('Consider temporary restrictions on this account');
    }
    
    const hasTimeViolations = results.violations.some(v => v.type.includes('TIME'));
    if (hasTimeViolations) {
      recommendations.push('Implement client-side time synchronization');
    }
    
    return recommendations;
  }

  // Helper methods for validation
  private calculateProgressionRate(prev: GameSave, curr: GameSave, timeDelta: number): number {
    const prevTotal = new Decimal(prev.totalWoolProduced);
    const currTotal = new Decimal(curr.totalWoolProduced);
    const increase = currTotal.minus(prevTotal);
    
    if (timeDelta === 0) return 0;
    
    return increase.div(timeDelta / 1000).toNumber();
  }

  private calculateMaxProductionRate(state: GameSave, woolType: WoolType): Decimal {
    // Calculate theoretical maximum production rate
    let maxRate = new Decimal(0);
    
    Object.values(BuildingType).forEach(buildingType => {
      const building = state.buildings[buildingType];
      if (building.unlocked) {
        const buildingProduction = building.baseProduction.mul(building.level);
        maxRate = maxRate.plus(buildingProduction);
      }
    });
    
    const maxMultiplier = this.calculateTotalMultiplier(state);
    return maxRate.mul(maxMultiplier);
  }

  private calculateBuildingUpgradeCost(
    buildingType: BuildingType,
    fromLevel: number,
    toLevel: number
  ): Decimal {
    const config = this.BUILDING_CONFIGS[buildingType];
    let totalCost = new Decimal(0);
    
    for (let level = fromLevel; level < toLevel; level++) {
      const levelCost = config.baseCost.mul(
        new Decimal(config.costMultiplier).pow(level)
      );
      totalCost = totalCost.plus(levelCost);
    }
    
    return totalCost;
  }

  private canAffordUpgrade(state: GameSave, cost: Decimal): boolean {
    const totalWool = Object.values(WoolType).reduce((sum, type) => {
      return sum.plus(new Decimal(state.woolCounts[type] || '0'));
    }, new Decimal(0));
    
    return totalWool.gte(cost);
  }

  private validateBuildingUnlock(state: GameSave, buildingType: BuildingType): boolean {
    // Implementation depends on building unlock requirements
    // This is a placeholder
    return true;
  }

  private validateAchievementRequirements(state: GameSave, achievement: any): boolean {
    // Implementation depends on achievement requirements
    // This is a placeholder
    return true;
  }

  private validateUpgradeRequirements(state: GameSave, requirements: any[]): boolean {
    // Implementation depends on upgrade requirements
    // This is a placeholder
    return true;
  }

  private calculateExpectedSoulShears(state: GameSave): Decimal {
    const totalWool = Object.values(WoolType).reduce((sum, type) => {
      return sum.plus(new Decimal(state.woolCounts[type] || '0'));
    }, new Decimal(0));
    
    // Soul shears = sqrt(total wool) / 1000
    return totalWool.sqrt().div(1000);
  }

  private getUpgradeById(id: string): any {
    // Implementation depends on upgrade system
    return null;
  }

  private getAchievementById(id: string): any {
    // Implementation depends on achievement system
    return null;
  }

  private loadWoolConfigs(): Record<WoolType, any> {
    // Load wool configurations
    return {} as any;
  }

  private loadBuildingConfigs(): Record<BuildingType, any> {
    // Load building configurations
    return {} as any;
  }
}