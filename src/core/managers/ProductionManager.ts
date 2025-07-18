import Decimal from 'decimal.js';
import { WoolType, Building, BuildingType, Upgrade, ProductionResult, ProductionMultipliers } from '@types/game.types';
import { EventManager } from './EventManager';
import { WOOL_CONFIG } from '../config/wool.config';
import { BUILDING_CONFIG } from '../config/building.config';

/**
 * Manages all production calculations and wool generation
 */
export class ProductionManager {
  private eventManager: EventManager;
  private productionRates: Map<WoolType, Decimal>;
  private lastProductionTime: number;
  private accumulatedTime: number = 0;

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager;
    this.productionRates = new Map();
    this.lastProductionTime = Date.now();
    
    // Initialize production rates
    Object.values(WoolType).forEach(type => {
      this.productionRates.set(type, new Decimal(0));
    });
  }

  /**
   * Calculate current production rates for all wool types
   */
  public calculateProduction(
    buildings: Record<BuildingType, Building>,
    upgrades: Upgrade[],
    prestigeMultiplier: Decimal = new Decimal(1)
  ): ProductionResult {
    const woolPerSecond: Partial<Record<WoolType, Decimal>> = {};
    const multipliers = this.calculateMultipliers(upgrades, prestigeMultiplier);
    
    // Calculate production for each wool type
    Object.values(WoolType).forEach(woolType => {
      const baseProduction = this.calculateBaseProduction(woolType, buildings);
      const totalProduction = baseProduction.times(multipliers.total);
      
      woolPerSecond[woolType] = totalProduction;
      this.productionRates.set(woolType, totalProduction);
    });

    // Calculate total production
    const totalPerSecond = Object.values(woolPerSecond).reduce(
      (sum, rate) => sum.plus(rate),
      new Decimal(0)
    );

    // Calculate offline production (50% efficiency)
    const offlineProduction: Partial<Record<WoolType, Decimal>> = {};
    Object.entries(woolPerSecond).forEach(([type, rate]) => {
      offlineProduction[type as WoolType] = rate.times(0.5);
    });

    return {
      woolPerSecond: woolPerSecond as Record<WoolType, Decimal>,
      totalPerSecond,
      offlineProduction: offlineProduction as Record<WoolType, Decimal>,
      multipliers
    };
  }

  /**
   * Update production and return wool earned
   */
  public update(deltaTime: number): Record<WoolType, Decimal> {
    this.accumulatedTime += deltaTime;
    const woolEarned: Partial<Record<WoolType, Decimal>> = {};

    // Only produce once per second for performance
    if (this.accumulatedTime >= 1000) {
      const seconds = Math.floor(this.accumulatedTime / 1000);
      this.accumulatedTime %= 1000;

      this.productionRates.forEach((rate, woolType) => {
        if (rate.greaterThan(0)) {
          const earned = rate.times(seconds);
          woolEarned[woolType] = earned;
          
          // Emit production event
          this.eventManager.emit('wool.produced', {
            type: woolType,
            amount: earned,
            rate
          });
        }
      });
    }

    return woolEarned as Record<WoolType, Decimal>;
  }

  /**
   * Calculate base production for a wool type from buildings
   */
  private calculateBaseProduction(
    woolType: WoolType,
    buildings: Record<BuildingType, Building>
  ): Decimal {
    let totalProduction = new Decimal(0);

    // Each building contributes to specific wool types
    Object.entries(buildings).forEach(([buildingType, building]) => {
      if (building.level > 0 && building.unlocked) {
        const buildingConfig = BUILDING_CONFIG[buildingType as BuildingType];
        
        // Check if this building produces this wool type
        if (buildingConfig.producesWool.includes(woolType)) {
          const buildingProduction = building.baseProduction
            .times(building.level)
            .times(building.productionMultiplier);
          
          totalProduction = totalProduction.plus(buildingProduction);
        }
      }
    });

    // Add base llama production for basic wool
    if (woolType === WoolType.Basic) {
      totalProduction = totalProduction.plus(0.1); // Base 0.1 wool/second
    }

    return totalProduction;
  }

  /**
   * Calculate all production multipliers
   */
  private calculateMultipliers(
    upgrades: Upgrade[],
    prestigeMultiplier: Decimal
  ): ProductionMultipliers {
    let buildingsMultiplier = new Decimal(1);
    let upgradesMultiplier = new Decimal(1);
    let achievementsMultiplier = new Decimal(1);
    let temporaryMultiplier = new Decimal(1);

    // Calculate upgrade multipliers
    upgrades.forEach(upgrade => {
      if (upgrade.purchased && upgrade.effect.target === 'production') {
        if (upgrade.effect.type === 'multiply') {
          upgradesMultiplier = upgradesMultiplier.times(upgrade.effect.value);
        }
      }
    });

    // TODO: Calculate achievement multipliers
    // TODO: Calculate temporary multipliers (boosts, events)

    const total = new Decimal(1)
      .times(buildingsMultiplier)
      .times(upgradesMultiplier)
      .times(achievementsMultiplier)
      .times(prestigeMultiplier)
      .times(temporaryMultiplier);

    return {
      base: new Decimal(1),
      buildings: buildingsMultiplier,
      upgrades: upgradesMultiplier,
      achievements: achievementsMultiplier,
      prestige: prestigeMultiplier,
      temporary: temporaryMultiplier,
      total
    };
  }

  /**
   * Calculate offline production for a duration
   */
  public calculateOfflineProduction(
    duration: number,
    maxOfflineHours: number = 24
  ): Record<WoolType, Decimal> {
    // Cap offline time
    const cappedDuration = Math.min(duration, maxOfflineHours * 3600 * 1000);
    const hours = cappedDuration / (3600 * 1000);
    
    const offlineProduction: Partial<Record<WoolType, Decimal>> = {};
    
    this.productionRates.forEach((rate, woolType) => {
      // 50% efficiency offline
      const offlineRate = rate.times(0.5);
      const earned = offlineRate.times(hours).times(3600);
      offlineProduction[woolType] = earned;
    });

    return offlineProduction as Record<WoolType, Decimal>;
  }

  /**
   * Get current production rate for a specific wool type
   */
  public getProductionRate(woolType: WoolType): Decimal {
    return this.productionRates.get(woolType) || new Decimal(0);
  }

  /**
   * Get all current production rates
   */
  public getAllProductionRates(): Map<WoolType, Decimal> {
    return new Map(this.productionRates);
  }
}