import type {
  AttackType,
  AttackSurgeChart,
  DefenseSurgeChart,
  DefenseDieColor,
  MarksmanStrategy,
  RerollStrategy,
  WeaponProfile,
} from '../engine/types';
import type { UpgradeSlot } from './types';
import type { WeaponProfile as DataLayerWeaponProfile } from './types';

// ============================================================================
// Factions
// ============================================================================

export enum Faction {
  RebelAlliance = 'rebel-alliance',
  GalacticEmpire = 'galactic-empire',
  Republic = 'republic',
  SeparatistAlliance = 'separatist-alliance',
  Mercenaries = 'mercenaries',
}

/** Display labels for each faction */
export const FACTION_LABELS: Record<Faction, string> = {
  [Faction.RebelAlliance]: 'Rebel Alliance',
  [Faction.GalacticEmpire]: 'Galactic Empire',
  [Faction.Republic]: 'Republic',
  [Faction.SeparatistAlliance]: 'Separatist Alliance',
  [Faction.Mercenaries]: 'Mercenaries',
};

// ============================================================================
// Preset Profile Types
// ============================================================================

/**
 * Partial attacker profile for a preset.
 * Only includes fields that the preset overrides from defaults.
 * Omitted fields keep their default value in the store.
 * 
 * After Phase 2.5: dice pool and weapon keywords are stored in `weapons[]`.
 * Unit-level keywords (Precise, Marksman, Sharpshooter, etc.) remain flat fields.
 * 
 * In Custom Pool mode, presets include a single weapon in `weapons`.
 * In Unit Builder mode, presets include the full weapon breakdown (multiple weapons).
 */
export interface AttackerPresetProfile {
  // Dice pool and weapon keywords — packaged as weapons array
  weapons?: WeaponProfile[];  // One or more weapon profiles with dice + weapon keywords

  /**
   * Base miniature count for this unit (before upgrades).
   * Used to determine how many base weapon entries to expand.
   * Defaults to 1 if not specified (single-mini unit).
   */
  baseMiniatureCount?: number;

  /**
   * All weapon profiles available on the unit card (ALL attack types).
   * Used by the config assembly to select the correct weapon per miniature
   * based on the current attack type, and for sidearm fallback.
   * In Custom Pool mode this is not used; only in Unit Builder mode.
   */
  unitBaseWeapons?: DataLayerWeaponProfile[];
  
  // Surge chart (unit-level)
  surgeChart?: AttackSurgeChart;
  
  // Tokens
  aimTokens?: number;
  surgeTokens?: number;
  observationTokens?: number;
  dodgeTokensAttacker?: number;

  // Unit-level keywords (numeric)
  preciseX?: number;
  sharpshooterX?: number;
  arsenalX?: number;
  
  // Unit-level keywords (boolean)
  marksman?: boolean;
  marksmanStrategy?: MarksmanStrategy;
  rerollStrategy?: RerollStrategy;
  jediHunter?: boolean;
  jarKaiMastery?: boolean;
  duelistAttacker?: boolean;
  makashiMastery?: boolean;
  immuneDeflect?: boolean;
  deathFromAbove?: boolean;
  holdTheLine?: boolean;

  // Points
  unitCost?: number;
}

/**
 * Partial defender profile for a preset.
 * Only includes fields that the preset overrides from defaults.
 */
export interface DefenderPresetProfile {
  dieColor?: DefenseDieColor;
  surgeChart?: DefenseSurgeChart;

  // Miniatures
  minisInLOS?: number;

  // Keywords (only include non-default values)
  armorX?: number;
  weakPointX?: number;
  immunePierce?: boolean;
  immuneMeleePierce?: boolean;
  immuneBlast?: boolean;
  impervious?: boolean;
  dangerSenseX?: number;
  uncannyLuckX?: number;
  block?: boolean;
  deflect?: boolean;
  shienMastery?: boolean;
  outmaneuver?: boolean;
  lowProfile?: boolean;
  shieldedX?: number;
  djemSoMastery?: boolean;
  soresuMastery?: boolean;
  duelistDefender?: boolean;
  backup?: boolean;
  holdTheLine?: boolean;
  dugIn?: boolean;
  coverX?: number;

  // Points
  unitCost?: number;
}

// Note: Guardian fields (guardianX, guardianDieColor, guardianSurgeChart,
// guardianDeflect, guardianSoresuMastery, guardianDodgeTokens) are intentionally
// excluded from DefenderPresetProfile. Guardian always represents a *separate*
// unit nearby — it is never part of the selected defender's own unit profile.
// Guardian settings are configured manually in the store via setField().

// ============================================================================
// Preset Entry Types
// ============================================================================

export interface AttackerPreset {
  id: string;
  faction: Faction;
  name: string;             // e.g., "Darth Vader (Lightsaber)"
  attackType: AttackType;
  profile: AttackerPresetProfile;
  upgradeBar: UpgradeSlot[];  // Available upgrade slots
}

export interface DefenderPreset {
  id: string;
  faction: Faction;
  name: string;             // e.g., "Stormtroopers"
  profile: DefenderPresetProfile;
  upgradeBar: UpgradeSlot[];  // Available upgrade slots
}
