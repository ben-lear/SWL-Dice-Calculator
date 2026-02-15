/**
 * Data layer index - barrel exports for all public APIs
 * Phase 5.5D.3: Create data layer index
 */

// Types
export type {
  UpgradeSlot,
  UnitRank,
  UnitType,
  WeaponProfile,
  ResolvedUnit,
  ResolvedUpgrade,
} from './types';
export {
  UpgradeSlot as UpgradeSlotEnum,
  UPGRADE_SLOT_LABELS,
  COMBAT_RELEVANT_SLOTS,
} from './types';

// Preset types & data
export type { AttackerPreset, DefenderPreset } from './presets';
export { Faction, FACTION_LABELS } from './presets';

// Preset helpers (main API for Phase 6)
export {
  getAttackerPresets,
  getDefenderPresets,
  getAttackerPresetById,
  getDefenderPresetById,
  getFactionOptions,
} from './presetHelpers';

// Resolvers (for direct data access)
export { getAllResolvedUnits, getResolvedUnitById } from './unitResolver';
export {
  getAllResolvedUpgrades,
  getResolvedUpgradeById,
  getUpgradesForSlot,
} from './upgradeResolver';

// Upgrade applicator (used by configSelectors)
export {
  applyAttackerUpgrades,
  applyDefenderUpgrades,
} from './upgradeApplicator';

// Keyword utilities
export {
  KEYWORD_MAP,
  getKeyword,
  hasKeyword,
  getMagnitudeKeywords,
  getWeaponKeywords,
  getKeywordsByCategory,
  getKeywordStats,
  ATTACKER_KEYWORD_FIELD_MAP,
  DEFENDER_KEYWORD_FIELD_MAP,
  hasMagnitude,
} from './keywordMap';