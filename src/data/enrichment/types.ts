/**
 * Types for the enrichment overlay that adds manually-curated data on top of processed API data.
 * Phase 5.5B.1: Define Enrichment Types
 */

import type {
  AttackType,
  AttackSurgeChart,
  DefenseSurgeChart,
  WeaponKeywords,
} from '../../engine/types';
import type { UpgradeSlot } from '../types';
import type { UnitKeywords, UpgradeKeywords } from './keywordTypes';

/**
 * Weapon profile shape used by manual unit enrichment.
 *
 * Dice values are optional during manual entry and default to 0 in resolver
 * normalization when omitted/null/undefined.
 */
export interface EnrichmentWeaponProfile {
  name: string;
  weaponType: AttackType;
  redDice?: number | null;
  blackDice?: number | null;
  whiteDice?: number | null;
  keywords?: Partial<WeaponKeywords>;
  minRange?: number;
  maxRange?: number;
}

// ============================================================================
// Unit Enrichment
// ============================================================================

/**
 * Manual enrichment data for a single unit.
 * Keyed by the processedUnit.id (slugified ID).
 *
 * All fields are optional — only provide what the API doesn't.
 * The resolver merges enrichment on top of processed data.
 */
export interface UnitEnrichment {
  /** Unit-level attack surge chart used by all unit weapons */
  attackSurgeChart?: AttackSurgeChart;

  /** Defense surge chart (not available from API) */
  defenseSurgeChart?: DefenseSurgeChart;

  /**
   * Weapon profiles for this unit.
   * Each entry generates a separate attacker preset.
   * If empty/omitted, the unit only generates a defender preset.
   */
  weapons?: EnrichmentWeaponProfile[];

  /**
   * Override the upgrade bar derived from the API.
   * Only needed if the API data is wrong or incomplete for this unit.
   * Most units should NOT set this — the API provides accurate upgrade bars.
   */
  upgradeBarOverride?: UpgradeSlot[];

  /**
   * Override/supplement keyword values.
   * For magnitude keywords: provide the X value (e.g., { armorX: 2 }).
   * For boolean keywords: true/false.
   * These merge with (and override) keywords detected from the API.
   * 
   * ONLY use keywords defined in UnitKeywords - these are the keywords
   * actually supported by the combat engine.
   */
  keywords?: UnitKeywords;
}

// ============================================================================
// Upgrade Enrichment
// ============================================================================

/**
 * Manual enrichment data for a single upgrade card.
 * Keyed by the processedUpgrade.id (slugified ID).
 */
export interface UpgradeEnrichment {
  /**
   * Keywords this upgrade grants when equipped.
   * For magnitude keywords: the X value. For boolean: true.
   * Only needed for combat-relevant upgrades (including conditionally
   * combat-relevant slots like Training, Programming, Protocol,
   * Squad Leader, Door Gunner, and Dug In).
   *
   * ONLY use keywords defined in UpgradeKeywords - these are the keywords
   * actually supported by the combat engine.
   * 
   * Special case: Dug In upgrades should set { dugIn: true }.
   * The upgrade applicator handles this as a special flag that causes
   * the defender to roll red defense dice during the Roll Cover step.
   */
  keywords?: UpgradeKeywords;
}