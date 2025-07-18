import Decimal from 'decimal.js';
import { BuildingType, WoolType } from '../../types/game.types';

export interface BuildingConfig {
  name: string;
  description: string;
  baseCost: Decimal;
  costMultiplier: number;
  baseProduction: Decimal;
  producesWool: WoolType[];
  unlockRequirement?: {
    building?: { type: BuildingType; level: number };
    wool?: { type: WoolType; amount: Decimal };
  };
}

/**
 * Configuration for all building types
 */
export const BUILDING_CONFIG: Record<BuildingType, BuildingConfig> = {
  [BuildingType.Barn]: {
    name: 'Llama Barn',
    description: 'A cozy home for your llamas. Increases basic wool production.',
    baseCost: new Decimal(10),
    costMultiplier: 1.15,
    baseProduction: new Decimal(0.5),
    producesWool: [WoolType.Basic, WoolType.Silver]
  },

  [BuildingType.Shears]: {
    name: 'Auto Shears',
    description: 'Automated shearing system for efficient wool collection.',
    baseCost: new Decimal(100),
    costMultiplier: 1.2,
    baseProduction: new Decimal(2),
    producesWool: [WoolType.Basic, WoolType.Silver, WoolType.Golden],
    unlockRequirement: {
      building: { type: BuildingType.Barn, level: 5 }
    }
  },

  [BuildingType.Transport]: {
    name: 'Wool Transport',
    description: 'Trucks and trains to move wool to market faster.',
    baseCost: new Decimal(1000),
    costMultiplier: 1.25,
    baseProduction: new Decimal(10),
    producesWool: [WoolType.Silver, WoolType.Golden],
    unlockRequirement: {
      building: { type: BuildingType.Shears, level: 3 }
    }
  },

  [BuildingType.Factory]: {
    name: 'Wool Factory',
    description: 'Industrial-scale wool processing facility.',
    baseCost: new Decimal(25000),
    costMultiplier: 1.3,
    baseProduction: new Decimal(50),
    producesWool: [WoolType.Golden, WoolType.Rainbow],
    unlockRequirement: {
      building: { type: BuildingType.Transport, level: 5 },
      wool: { type: WoolType.Golden, amount: new Decimal(10000) }
    }
  },

  [BuildingType.Lab]: {
    name: 'Research Lab',
    description: 'Scientific facility for creating exotic wool types.',
    baseCost: new Decimal(500000),
    costMultiplier: 1.35,
    baseProduction: new Decimal(200),
    producesWool: [WoolType.Rainbow, WoolType.Cosmic, WoolType.Ethereal],
    unlockRequirement: {
      building: { type: BuildingType.Factory, level: 3 },
      wool: { type: WoolType.Rainbow, amount: new Decimal(1000) }
    }
  },

  [BuildingType.Portal]: {
    name: 'Dimensional Portal',
    description: 'Gateway to other dimensions for rare wool collection.',
    baseCost: new Decimal(10000000),
    costMultiplier: 1.4,
    baseProduction: new Decimal(1000),
    producesWool: [WoolType.Ethereal, WoolType.Temporal, WoolType.Dimensional],
    unlockRequirement: {
      building: { type: BuildingType.Lab, level: 5 },
      wool: { type: WoolType.Cosmic, amount: new Decimal(10000) }
    }
  },

  [BuildingType.TimeMachine]: {
    name: 'Time Machine',
    description: 'Harvest wool from past and future timelines.',
    baseCost: new Decimal('1e9'),
    costMultiplier: 1.45,
    baseProduction: new Decimal(5000),
    producesWool: [WoolType.Temporal, WoolType.Dimensional, WoolType.Celestial],
    unlockRequirement: {
      building: { type: BuildingType.Portal, level: 3 },
      wool: { type: WoolType.Temporal, amount: new Decimal(1000) }
    }
  },

  [BuildingType.DimensionGate]: {
    name: 'Quantum Gate',
    description: 'Ultimate wool harvesting from quantum realities.',
    baseCost: new Decimal('1e12'),
    costMultiplier: 1.5,
    baseProduction: new Decimal(25000),
    producesWool: [WoolType.Celestial, WoolType.Quantum],
    unlockRequirement: {
      building: { type: BuildingType.TimeMachine, level: 5 },
      wool: { type: WoolType.Dimensional, amount: new Decimal(10000) }
    }
  }
};

/**
 * Calculate building cost for a specific level
 */
export function calculateBuildingCost(type: BuildingType, currentLevel: number): Decimal {
  const config = BUILDING_CONFIG[type];
  return config.baseCost.times(Decimal.pow(config.costMultiplier, currentLevel));
}

/**
 * Calculate total production for a building at a specific level
 */
export function calculateBuildingProduction(type: BuildingType, level: number): Decimal {
  const config = BUILDING_CONFIG[type];
  return config.baseProduction.times(level);
}

/**
 * Check if a building can be unlocked
 */
export function canUnlockBuilding(
  type: BuildingType,
  buildings: Record<BuildingType, { level: number }>,
  woolCounts: Record<WoolType, Decimal>
): boolean {
  const config = BUILDING_CONFIG[type];
  
  if (!config.unlockRequirement) {
    return true;
  }

  // Check building requirement
  if (config.unlockRequirement.building) {
    const reqBuilding = config.unlockRequirement.building;
    if (buildings[reqBuilding.type].level < reqBuilding.level) {
      return false;
    }
  }

  // Check wool requirement
  if (config.unlockRequirement.wool) {
    const reqWool = config.unlockRequirement.wool;
    if (woolCounts[reqWool.type].lt(reqWool.amount)) {
      return false;
    }
  }

  return true;
}