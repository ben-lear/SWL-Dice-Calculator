// Core attack sequence
export { executeAttackSequence } from './attackSequence';

// Attack pool functions
export { aggregateWeaponKeywords } from './attackPool';

// Deterministic attack estimation
export { estimateExpectedAttackSuccesses } from './attackEstimation';
export type { AttackEstimationResult } from './attackEstimation';

// Dice functions
export {
  rollAttackDie,
  rollDefenseDie,
  rollAttackPool,
  rollDefensePool,
  upgradeAttack,
  downgradeAttack,
  upgradeDefense,
  downgradeDefense,
  applyDieModification,
} from './dice';

// Simulator
export { simulate, DEFAULT_ITERATIONS } from './simulator';

// Worker client
export { SimulationWorkerClient } from './worker/simulationWorkerClient';

// Types
export type {
  AttackConfig,
  AttackResult,
  AttackerConfig,
  DefenderConfig,
  WeaponProfile,
  WeaponKeywords,
  AggregatedWeaponKeywords,
  RolledAttackDie,
  MarksmanDecision,
  SimulationResult,
  StatsSummary,
  DistributionEntry,
  EfficiencyMetrics,
} from './types';

export {
  AttackDieColor,
  DefenseDieColor,
  AttackFace,
  DefenseFace,
  AttackType,
  AttackSurgeChart,
  DefenseSurgeChart,
  CoverType,
  MarksmanStrategy,
  RerollStrategy,
} from './types';