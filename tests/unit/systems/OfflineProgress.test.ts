import Decimal from 'decimal.js';
import { WoolType } from '@/types/game.types';

// Mock Offline Progress Calculator
class OfflineProgressCalculator {
  private maxOfflineHours: number;
  private offlineEfficiency: number;

  constructor(maxOfflineHours: number = 24, offlineEfficiency: number = 0.5) {
    this.maxOfflineHours = maxOfflineHours;
    this.offlineEfficiency = offlineEfficiency;
  }

  /**
   * Calculate offline progress based on production rates and time
   */
  calculateOfflineProgress(
    productionRates: Map<WoolType, Decimal>,
    offlineTimeMs: number,
  ): {
    woolEarned: Map<WoolType, Decimal>;
    actualTime: number;
    cappedTime: number;
    efficiency: number;
  } {
    // Cap offline time
    const maxOfflineMs = this.maxOfflineHours * 60 * 60 * 1000;
    const cappedTime = Math.min(offlineTimeMs, maxOfflineMs);
    const seconds = cappedTime / 1000;

    // Calculate wool earned
    const woolEarned = new Map<WoolType, Decimal>();
    
    productionRates.forEach((rate, woolType) => {
      const offlineRate = rate.times(this.offlineEfficiency);
      const earned = offlineRate.times(seconds);
      woolEarned.set(woolType, earned);
    });

    return {
      woolEarned,
      actualTime: offlineTimeMs,
      cappedTime,
      efficiency: this.offlineEfficiency,
    };
  }

  /**
   * Calculate offline progress with bonuses
   */
  calculateOfflineProgressWithBonuses(
    productionRates: Map<WoolType, Decimal>,
    offlineTimeMs: number,
    bonuses: {
      timeExtension?: number; // Additional hours allowed
      efficiencyBonus?: number; // Additional efficiency (0-1)
      woolTypeBonus?: Map<WoolType, number>; // Specific wool type bonuses
    },
  ): {
    woolEarned: Map<WoolType, Decimal>;
    actualTime: number;
    cappedTime: number;
    efficiency: number;
    bonusesApplied: string[];
  } {
    const bonusesApplied: string[] = [];
    
    // Apply time extension bonus
    let maxOfflineMs = this.maxOfflineHours * 60 * 60 * 1000;
    if (bonuses.timeExtension) {
      maxOfflineMs += bonuses.timeExtension * 60 * 60 * 1000;
      bonusesApplied.push(`Time extension: +${bonuses.timeExtension} hours`);
    }
    
    // Apply efficiency bonus
    let efficiency = this.offlineEfficiency;
    if (bonuses.efficiencyBonus) {
      efficiency = Math.min(1, efficiency + bonuses.efficiencyBonus);
      bonusesApplied.push(`Efficiency bonus: +${(bonuses.efficiencyBonus * 100).toFixed(0)}%`);
    }

    // Cap offline time
    const cappedTime = Math.min(offlineTimeMs, maxOfflineMs);
    const seconds = cappedTime / 1000;

    // Calculate wool earned with bonuses
    const woolEarned = new Map<WoolType, Decimal>();
    
    productionRates.forEach((rate, woolType) => {
      let effectiveRate = rate.times(efficiency);
      
      // Apply wool type specific bonus
      if (bonuses.woolTypeBonus?.has(woolType)) {
        const typeBonus = bonuses.woolTypeBonus.get(woolType)!;
        effectiveRate = effectiveRate.times(1 + typeBonus);
        bonusesApplied.push(`${woolType} bonus: +${(typeBonus * 100).toFixed(0)}%`);
      }
      
      const earned = effectiveRate.times(seconds);
      woolEarned.set(woolType, earned);
    });

    return {
      woolEarned,
      actualTime: offlineTimeMs,
      cappedTime,
      efficiency,
      bonusesApplied,
    };
  }

  /**
   * Format offline progress report
   */
  formatOfflineReport(
    progress: ReturnType<typeof this.calculateOfflineProgress>,
  ): string {
    const hours = Math.floor(progress.cappedTime / (60 * 60 * 1000));
    const minutes = Math.floor((progress.cappedTime % (60 * 60 * 1000)) / (60 * 1000));
    
    let report = `Offline Progress Report\n`;
    report += `========================\n`;
    report += `Time Away: ${hours}h ${minutes}m\n`;
    
    if (progress.actualTime > progress.cappedTime) {
      const cappedHours = Math.floor((progress.actualTime - progress.cappedTime) / (60 * 60 * 1000));
      report += `(Capped - ${cappedHours}h over limit)\n`;
    }
    
    report += `Efficiency: ${(progress.efficiency * 100).toFixed(0)}%\n\n`;
    report += `Wool Earned:\n`;
    
    progress.woolEarned.forEach((amount, type) => {
      if (amount.greaterThan(0)) {
        report += `  ${type}: ${this.formatNumber(amount)}\n`;
      }
    });
    
    return report;
  }

  private formatNumber(num: Decimal): string {
    const value = num.toNumber();
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  }
}

describe('OfflineProgressCalculator', () => {
  let calculator: OfflineProgressCalculator;
  let productionRates: Map<WoolType, Decimal>;

  beforeEach(() => {
    calculator = new OfflineProgressCalculator(24, 0.5);
    
    // Set up test production rates
    productionRates = new Map([
      [WoolType.Basic, new Decimal(10)], // 10/second
      [WoolType.Fine, new Decimal(5)],   // 5/second
      [WoolType.Exotic, new Decimal(1)], // 1/second
    ]);
  });

  describe('calculateOfflineProgress', () => {
    it('should calculate offline progress for short duration', () => {
      const offlineTime = 60 * 60 * 1000; // 1 hour
      const progress = calculator.calculateOfflineProgress(productionRates, offlineTime);

      // Basic: 10/s * 0.5 efficiency * 3600s = 18,000
      expect(progress.woolEarned.get(WoolType.Basic)?.toNumber()).toBeCloseTo(18000);
      expect(progress.woolEarned.get(WoolType.Fine)?.toNumber()).toBeCloseTo(9000);
      expect(progress.woolEarned.get(WoolType.Exotic)?.toNumber()).toBeCloseTo(1800);
      expect(progress.efficiency).toBe(0.5);
      expect(progress.cappedTime).toBe(offlineTime);
    });

    it('should cap offline time at maximum hours', () => {
      const offlineTime = 48 * 60 * 60 * 1000; // 48 hours
      const progress = calculator.calculateOfflineProgress(productionRates, offlineTime);

      const maxTime = 24 * 60 * 60 * 1000;
      expect(progress.cappedTime).toBe(maxTime);
      expect(progress.actualTime).toBe(offlineTime);

      // Basic: 10/s * 0.5 * 86400s (24 hours) = 432,000
      expect(progress.woolEarned.get(WoolType.Basic)?.toNumber()).toBeCloseTo(432000);
    });

    it('should handle zero production rates', () => {
      const emptyRates = new Map([
        [WoolType.Basic, new Decimal(0)],
        [WoolType.Fine, new Decimal(0)],
      ]);

      const progress = calculator.calculateOfflineProgress(emptyRates, 3600000);
      
      expect(progress.woolEarned.get(WoolType.Basic)?.toNumber()).toBe(0);
      expect(progress.woolEarned.get(WoolType.Fine)?.toNumber()).toBe(0);
    });

    it('should handle very short offline times', () => {
      const offlineTime = 30 * 1000; // 30 seconds
      const progress = calculator.calculateOfflineProgress(productionRates, offlineTime);

      // Basic: 10/s * 0.5 * 30s = 150
      expect(progress.woolEarned.get(WoolType.Basic)?.toNumber()).toBeCloseTo(150);
    });
  });

  describe('calculateOfflineProgressWithBonuses', () => {
    it('should apply time extension bonus', () => {
      const offlineTime = 30 * 60 * 60 * 1000; // 30 hours
      const bonuses = {
        timeExtension: 6, // +6 hours, total 30 hours allowed
      };

      const progress = calculator.calculateOfflineProgressWithBonuses(
        productionRates,
        offlineTime,
        bonuses,
      );

      expect(progress.cappedTime).toBe(offlineTime); // Full 30 hours used
      expect(progress.bonusesApplied).toContain('Time extension: +6 hours');
    });

    it('should apply efficiency bonus', () => {
      const offlineTime = 60 * 60 * 1000; // 1 hour
      const bonuses = {
        efficiencyBonus: 0.3, // +30% efficiency, total 80%
      };

      const progress = calculator.calculateOfflineProgressWithBonuses(
        productionRates,
        offlineTime,
        bonuses,
      );

      expect(progress.efficiency).toBeCloseTo(0.8);
      // Basic: 10/s * 0.8 * 3600s = 28,800
      expect(progress.woolEarned.get(WoolType.Basic)?.toNumber()).toBeCloseTo(28800);
      expect(progress.bonusesApplied).toContain('Efficiency bonus: +30%');
    });

    it('should apply wool type specific bonuses', () => {
      const offlineTime = 60 * 60 * 1000; // 1 hour
      const bonuses = {
        woolTypeBonus: new Map([
          [WoolType.Fine, 0.5],   // +50% for Fine wool
          [WoolType.Exotic, 1.0], // +100% for Exotic wool
        ]),
      };

      const progress = calculator.calculateOfflineProgressWithBonuses(
        productionRates,
        offlineTime,
        bonuses,
      );

      // Basic: 10/s * 0.5 * 3600s = 18,000 (no bonus)
      expect(progress.woolEarned.get(WoolType.Basic)?.toNumber()).toBeCloseTo(18000);
      
      // Fine: 5/s * 0.5 * 3600s * 1.5 = 13,500
      expect(progress.woolEarned.get(WoolType.Fine)?.toNumber()).toBeCloseTo(13500);
      
      // Exotic: 1/s * 0.5 * 3600s * 2.0 = 3,600
      expect(progress.woolEarned.get(WoolType.Exotic)?.toNumber()).toBeCloseTo(3600);
    });

    it('should cap efficiency at 100%', () => {
      const bonuses = {
        efficiencyBonus: 0.8, // Would be 130% total, capped at 100%
      };

      const progress = calculator.calculateOfflineProgressWithBonuses(
        productionRates,
        3600000,
        bonuses,
      );

      expect(progress.efficiency).toBe(1.0);
    });

    it('should stack multiple bonuses', () => {
      const offlineTime = 25 * 60 * 60 * 1000; // 25 hours
      const bonuses = {
        timeExtension: 2,
        efficiencyBonus: 0.2,
        woolTypeBonus: new Map([[WoolType.Exotic, 0.5]]),
      };

      const progress = calculator.calculateOfflineProgressWithBonuses(
        productionRates,
        offlineTime,
        bonuses,
      );

      expect(progress.cappedTime).toBe(offlineTime); // 25 hours allowed (24 + 2 - 1)
      expect(progress.efficiency).toBeCloseTo(0.7);
      expect(progress.bonusesApplied.length).toBe(3);
    });
  });

  describe('formatOfflineReport', () => {
    it('should format short duration report', () => {
      const progress = calculator.calculateOfflineProgress(productionRates, 2 * 60 * 60 * 1000);
      const report = calculator.formatOfflineReport(progress);

      expect(report).toContain('Time Away: 2h 0m');
      expect(report).toContain('Efficiency: 50%');
      expect(report).toContain('Basic: 36.00K');
      expect(report).toContain('Fine: 18.00K');
      expect(report).toContain('Exotic: 3.60K');
    });

    it('should show capped time warning', () => {
      const progress = calculator.calculateOfflineProgress(productionRates, 30 * 60 * 60 * 1000);
      const report = calculator.formatOfflineReport(progress);

      expect(report).toContain('Time Away: 24h 0m');
      expect(report).toContain('(Capped - 6h over limit)');
    });

    it('should format large numbers correctly', () => {
      const highRates = new Map([
        [WoolType.Basic, new Decimal(1000000)], // 1M/second
      ]);

      const progress = calculator.calculateOfflineProgress(highRates, 60 * 60 * 1000);
      const report = calculator.formatOfflineReport(progress);

      expect(report).toContain('Basic: 1.80B'); // 1M * 0.5 * 3600 = 1.8B
    });

    it('should omit zero production wool types', () => {
      const limitedRates = new Map([
        [WoolType.Basic, new Decimal(10)],
        [WoolType.Fine, new Decimal(0)],
      ]);

      const progress = calculator.calculateOfflineProgress(limitedRates, 3600000);
      const report = calculator.formatOfflineReport(progress);

      expect(report).toContain('Basic:');
      expect(report).not.toContain('Fine:');
    });
  });
});