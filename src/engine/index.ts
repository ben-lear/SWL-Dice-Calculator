// Core attack sequence
export { executeAttackSequence } from './attackSequence';

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

// Types
export type {
  AttackConfig,
  AttackResult,
  AttackerConfig,
  DefenderConfig,
  RolledAttackDie,
  MarksmanDecision,
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
