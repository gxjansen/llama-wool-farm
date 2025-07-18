import { ProductionManager } from '@/core/managers/ProductionManager';
import { EventManager } from '@/core/managers/EventManager';
import { WoolType, BuildingType, Building, Upgrade } from '@/types/game.types';
import Decimal from 'decimal.js';

describe('ProductionManager', () => {
  let productionManager: ProductionManager;
  let eventManager: EventManager;

  beforeEach(() => {
    eventManager = new EventManager();
    productionManager = new ProductionManager(eventManager);
    jest.clearAllMocks();
  });

  describe('calculateProduction', () => {
    it('should calculate base production with no buildings', () => {
      const buildings = createEmptyBuildings();
      const upgrades: Upgrade[] = [];
      
      const result = productionManager.calculateProduction(buildings, upgrades);
      
      // Only basic wool should have base production
      expect(result.woolPerSecond[WoolType.Basic].toNumber()).toBeCloseTo(0.1);
      expect(result.woolPerSecond[WoolType.Fine].toNumber()).toBe(0);
      expect(result.woolPerSecond[WoolType.Exotic].toNumber()).toBe(0);
      expect(result.totalPerSecond.toNumber()).toBeCloseTo(0.1);
    });

    it('should calculate production with buildings', () => {
      const buildings = createEmptyBuildings();
      buildings[BuildingType.Pasture] = {
        type: BuildingType.Pasture,
        level: 5,
        unlocked: true,
        cost: new Decimal(100),
        baseCost: new Decimal(10),
        baseProduction: new Decimal(1),
        productionMultiplier: new Decimal(1),
        woolTypeBonus: new Map(),
      };

      const result = productionManager.calculateProduction(buildings, [], new Decimal(1));
      
      // Pasture should produce 5 wool/second (level 5 * 1 base production)
      expect(result.woolPerSecond[WoolType.Basic].toNumber()).toBeCloseTo(5.1); // 5 + 0.1 base
    });

    it('should apply upgrade multipliers correctly', () => {
      const buildings = createEmptyBuildings();
      buildings[BuildingType.Pasture] = {
        type: BuildingType.Pasture,
        level: 1,
        unlocked: true,
        cost: new Decimal(100),
        baseCost: new Decimal(10),
        baseProduction: new Decimal(1),
        productionMultiplier: new Decimal(1),
        woolTypeBonus: new Map(),
      };

      const upgrades: Upgrade[] = [{
        id: 'test-upgrade',
        name: 'Test Upgrade',
        description: 'Doubles production',
        cost: new Decimal(100),
        purchased: true,
        effect: {
          type: 'multiply',
          target: 'production',
          value: new Decimal(2),
        },
        requirements: [],
      }];

      const result = productionManager.calculateProduction(buildings, upgrades);
      
      // Base (1.1) * upgrade multiplier (2) = 2.2
      expect(result.woolPerSecond[WoolType.Basic].toNumber()).toBeCloseTo(2.2);
      expect(result.multipliers.upgrades.toNumber()).toBe(2);
    });

    it('should apply prestige multiplier', () => {
      const buildings = createEmptyBuildings();
      const prestigeMultiplier = new Decimal(3);
      
      const result = productionManager.calculateProduction(buildings, [], prestigeMultiplier);
      
      // Base (0.1) * prestige (3) = 0.3
      expect(result.woolPerSecond[WoolType.Basic].toNumber()).toBeCloseTo(0.3);
      expect(result.multipliers.prestige.toNumber()).toBe(3);
    });

    it('should calculate offline production at 50% efficiency', () => {
      const buildings = createEmptyBuildings();
      buildings[BuildingType.Pasture] = {
        type: BuildingType.Pasture,
        level: 10,
        unlocked: true,
        cost: new Decimal(1000),
        baseCost: new Decimal(10),
        baseProduction: new Decimal(1),
        productionMultiplier: new Decimal(1),
        woolTypeBonus: new Map(),
      };

      const result = productionManager.calculateProduction(buildings, []);
      
      // Online: 10.1 wool/second, Offline: 5.05 wool/second
      expect(result.woolPerSecond[WoolType.Basic].toNumber()).toBeCloseTo(10.1);
      expect(result.offlineProduction[WoolType.Basic].toNumber()).toBeCloseTo(5.05);
    });
  });

  describe('update', () => {
    it('should accumulate production over time', () => {
      const buildings = createEmptyBuildings();
      buildings[BuildingType.Pasture] = {
        type: BuildingType.Pasture,
        level: 1,
        unlocked: true,
        cost: new Decimal(100),
        baseCost: new Decimal(10),
        baseProduction: new Decimal(1),
        productionMultiplier: new Decimal(1),
        woolTypeBonus: new Map(),
      };

      productionManager.calculateProduction(buildings, []);
      
      // Simulate 0.5 seconds - should not produce yet
      let earned = productionManager.update(500);
      expect(Object.keys(earned)).toHaveLength(0);
      
      // Complete 1 second - should produce
      earned = productionManager.update(500);
      expect(earned[WoolType.Basic].toNumber()).toBeCloseTo(1.1);
    });

    it('should emit production events', () => {
      const emitSpy = jest.spyOn(eventManager, 'emit');
      const buildings = createEmptyBuildings();
      buildings[BuildingType.Pasture] = {
        type: BuildingType.Pasture,
        level: 1,
        unlocked: true,
        cost: new Decimal(100),
        baseCost: new Decimal(10),
        baseProduction: new Decimal(1),
        productionMultiplier: new Decimal(1),
        woolTypeBonus: new Map(),
      };

      productionManager.calculateProduction(buildings, []);
      productionManager.update(1000);
      
      expect(emitSpy).toHaveBeenCalledWith('wool.produced', {
        type: WoolType.Basic,
        amount: expect.any(Decimal),
        rate: expect.any(Decimal),
      });
    });

    it('should handle multiple seconds of production', () => {
      const buildings = createEmptyBuildings();
      buildings[BuildingType.Pasture] = {
        type: BuildingType.Pasture,
        level: 1,
        unlocked: true,
        cost: new Decimal(100),
        baseCost: new Decimal(10),
        baseProduction: new Decimal(1),
        productionMultiplier: new Decimal(1),
        woolTypeBonus: new Map(),
      };

      productionManager.calculateProduction(buildings, []);
      
      // Simulate 3.5 seconds
      const earned = productionManager.update(3500);
      expect(earned[WoolType.Basic].toNumber()).toBeCloseTo(3.3); // 3 * 1.1
    });
  });

  describe('calculateOfflineProduction', () => {
    beforeEach(() => {
      const buildings = createEmptyBuildings();
      buildings[BuildingType.Pasture] = {
        type: BuildingType.Pasture,
        level: 10,
        unlocked: true,
        cost: new Decimal(1000),
        baseCost: new Decimal(10),
        baseProduction: new Decimal(1),
        productionMultiplier: new Decimal(1),
        woolTypeBonus: new Map(),
      };
      productionManager.calculateProduction(buildings, []);
    });

    it('should calculate offline production for given duration', () => {
      // 1 hour offline
      const duration = 3600 * 1000;
      const offlineProduction = productionManager.calculateOfflineProduction(duration);
      
      // 10.1 wool/second * 0.5 efficiency * 3600 seconds = 18180
      expect(offlineProduction[WoolType.Basic].toNumber()).toBeCloseTo(18180);
    });

    it('should cap offline production at max hours', () => {
      // 48 hours offline, but max is 24
      const duration = 48 * 3600 * 1000;
      const maxHours = 24;
      const offlineProduction = productionManager.calculateOfflineProduction(duration, maxHours);
      
      // Should only calculate for 24 hours
      const expectedProduction = 10.1 * 0.5 * 24 * 3600;
      expect(offlineProduction[WoolType.Basic].toNumber()).toBeCloseTo(expectedProduction);
    });

    it('should handle short offline durations', () => {
      // 5 minutes offline
      const duration = 5 * 60 * 1000;
      const offlineProduction = productionManager.calculateOfflineProduction(duration);
      
      // 10.1 wool/second * 0.5 efficiency * 300 seconds = 1515
      expect(offlineProduction[WoolType.Basic].toNumber()).toBeCloseTo(1515);
    });
  });

  describe('getProductionRate', () => {
    it('should return correct production rate for wool type', () => {
      const buildings = createEmptyBuildings();
      productionManager.calculateProduction(buildings, []);
      
      const basicRate = productionManager.getProductionRate(WoolType.Basic);
      expect(basicRate.toNumber()).toBeCloseTo(0.1);
      
      const fineRate = productionManager.getProductionRate(WoolType.Fine);
      expect(fineRate.toNumber()).toBe(0);
    });
  });

  describe('getAllProductionRates', () => {
    it('should return all production rates', () => {
      const buildings = createEmptyBuildings();
      productionManager.calculateProduction(buildings, []);
      
      const allRates = productionManager.getAllProductionRates();
      expect(allRates.size).toBe(Object.values(WoolType).length);
      expect(allRates.get(WoolType.Basic)?.toNumber()).toBeCloseTo(0.1);
    });
  });
});

// Helper function to create empty buildings
function createEmptyBuildings(): Record<BuildingType, Building> {
  const buildings: Partial<Record<BuildingType, Building>> = {};
  
  Object.values(BuildingType).forEach(type => {
    buildings[type] = {
      type,
      level: 0,
      unlocked: false,
      cost: new Decimal(10),
      baseCost: new Decimal(10),
      baseProduction: new Decimal(0),
      productionMultiplier: new Decimal(1),
      woolTypeBonus: new Map(),
    };
  });
  
  return buildings as Record<BuildingType, Building>;
}