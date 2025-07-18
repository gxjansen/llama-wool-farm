import Decimal from 'decimal.js';
import type { WoolProperties } from '../../types/game.types';
import { WoolType } from '../../types/game.types';

/**
 * Configuration for all wool types in the game
 */
export const WOOL_CONFIG: Record<WoolType, WoolProperties> = {
  [WoolType.Basic]: {
    type: WoolType.Basic,
    baseValue: new Decimal(0.1),
    productionRate: new Decimal(1),
    unlockCost: new Decimal(0),
    color: '#F5F5DC', // Beige
    particleEffect: 'basic_wool',
    description: 'Soft, fluffy wool perfect for beginners'
  },
  
  [WoolType.Silver]: {
    type: WoolType.Silver,
    baseValue: new Decimal(1),
    productionRate: new Decimal(0.8),
    unlockCost: new Decimal(100),
    color: '#C0C0C0', // Silver
    particleEffect: 'silver_sparkle',
    description: 'Shimmering silver wool with a metallic sheen'
  },
  
  [WoolType.Golden]: {
    type: WoolType.Golden,
    baseValue: new Decimal(12),
    productionRate: new Decimal(0.6),
    unlockCost: new Decimal(10000),
    color: '#FFD700', // Gold
    particleEffect: 'golden_glow',
    description: 'Precious golden fleece worth its weight in coins'
  },
  
  [WoolType.Rainbow]: {
    type: WoolType.Rainbow,
    baseValue: new Decimal(180),
    productionRate: new Decimal(0.4),
    unlockCost: new Decimal(1000000),
    color: '#FF6B6B', // Rainbow (base color)
    particleEffect: 'rainbow_trail',
    description: 'Magical wool that shifts through all colors'
  },
  
  [WoolType.Cosmic]: {
    type: WoolType.Cosmic,
    baseValue: new Decimal(3240),
    productionRate: new Decimal(0.25),
    unlockCost: new Decimal(100000000),
    color: '#4B0082', // Indigo
    particleEffect: 'cosmic_stars',
    description: 'Wool infused with stardust from distant galaxies'
  },
  
  [WoolType.Ethereal]: {
    type: WoolType.Ethereal,
    baseValue: new Decimal(71280),
    productionRate: new Decimal(0.15),
    unlockCost: new Decimal(10000000000),
    color: '#E6E6FA', // Lavender
    particleEffect: 'ethereal_wisps',
    description: 'Translucent wool that phases between dimensions'
  },
  
  [WoolType.Temporal]: {
    type: WoolType.Temporal,
    baseValue: new Decimal(1853280),
    productionRate: new Decimal(0.08),
    unlockCost: new Decimal('1e12'),
    color: '#00CED1', // Dark Turquoise
    particleEffect: 'temporal_ripples',
    description: 'Wool that exists across multiple timelines'
  },
  
  [WoolType.Dimensional]: {
    type: WoolType.Dimensional,
    baseValue: new Decimal(55598400),
    productionRate: new Decimal(0.04),
    unlockCost: new Decimal('1e15'),
    color: '#8A2BE2', // Blue Violet
    particleEffect: 'dimensional_portals',
    description: 'Wool harvested from parallel universes'
  },
  
  [WoolType.Celestial]: {
    type: WoolType.Celestial,
    baseValue: new Decimal(2001542400),
    productionRate: new Decimal(0.02),
    unlockCost: new Decimal('1e18'),
    color: '#FAFAD2', // Light Goldenrod
    particleEffect: 'celestial_halos',
    description: 'Divine wool blessed by cosmic entities'
  },
  
  [WoolType.Quantum]: {
    type: WoolType.Quantum,
    baseValue: new Decimal('8.006169600e10'),
    productionRate: new Decimal(0.01),
    unlockCost: new Decimal('1e21'),
    color: '#00FFFF', // Cyan
    particleEffect: 'quantum_fluctuations',
    description: 'Wool that exists in superposition until observed'
  }
};

/**
 * Get wool configuration by type
 */
export function getWoolConfig(type: WoolType): WoolProperties {
  return WOOL_CONFIG[type];
}

/**
 * Get all wool types in order
 */
export function getAllWoolTypes(): WoolType[] {
  return Object.values(WoolType);
}

/**
 * Check if a wool type is unlocked based on current resources
 */
export function isWoolUnlocked(type: WoolType, currentWool: Decimal): boolean {
  return currentWool.gte(WOOL_CONFIG[type].unlockCost);
}

/**
 * Get the next locked wool type
 */
export function getNextLockedWool(currentWool: Decimal): WoolType | null {
  const woolTypes = getAllWoolTypes();
  
  for (const type of woolTypes) {
    if (!isWoolUnlocked(type, currentWool)) {
      return type;
    }
  }
  
  return null; // All wool types unlocked
}

/**
 * Calculate total wool value
 */
export function calculateTotalWoolValue(woolCounts: Record<WoolType, Decimal>): Decimal {
  let totalValue = new Decimal(0);
  
  Object.entries(woolCounts).forEach(([type, count]) => {
    const woolConfig = WOOL_CONFIG[type as WoolType];
    totalValue = totalValue.plus(count.times(woolConfig.baseValue));
  });
  
  return totalValue;
}