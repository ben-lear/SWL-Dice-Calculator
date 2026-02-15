/**
 * Types for the enrichment overlay that adds manually-curated data on top of processed API data.
 * Phase 5.5B.1: Define Enrichment Types
 */

import type {
  AttackSurgeChart,
  DefenseSurgeChart,
} from '../../engine/types';
import type { UpgradeSlot, WeaponProfile } from '../types';
import type { UnitKeywords, UpgradeKeywords } from './keywordTypes';

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
  /** Attack surge chart fallback for units without enriched weapon profiles */
  attackSurgeChart?: AttackSurgeChart;

  /** Defense surge chart (not available from API) */
  defenseSurgeChart?: DefenseSurgeChart;

  /**
   * Weapon profiles for this unit.
   * Each entry generates a separate attacker preset.
   * If empty/omitted, the unit only generates a defender preset.
   */
  weapons?: WeaponProfile[];

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