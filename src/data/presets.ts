import type {
  AttackSurgeChart,
  DefenseSurgeChart,
  DefenseDieColor,
  MarksmanStrategy,
  RerollStrategy,
  WeaponProfile,
} from '../engine/types';
import type { UpgradeSlot } from './types';

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
