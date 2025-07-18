/**
 * Production manager for handling wool production calculations
 */
import Decimal from 'decimal.js';
import { WoolType } from '../../types/game.types';

export class ProductionManager {
  private woolAmounts: Map<WoolType, Decimal> = new Map();
  private productionRates: Map<WoolType, Decimal> = new Map();

  constructor() {
    // Initialize with basic wool
    this.woolAmounts.set(WoolType.Basic, new Decimal(0));
    this.productionRates.set(WoolType.Basic, new Decimal(1));
  }

  public getWoolAmount(type: WoolType): Decimal {
    return this.woolAmounts.get(type) || new Decimal(0);
  }

  public addWool(type: WoolType, amount: Decimal): void {
    const current = this.getWoolAmount(type);
    this.woolAmounts.set(type, current.plus(amount));
  }

  public getProductionRate(type: WoolType): Decimal {
    return this.productionRates.get(type) || new Decimal(0);
  }

  public update(deltaTime: number): void {
    // Update production based on delta time
    const deltaSeconds = deltaTime / 1000;
    
    this.productionRates.forEach((rate, type) => {
      const production = rate.times(deltaSeconds);
      this.addWool(type, production);
    });
  }
}

export default ProductionManager;