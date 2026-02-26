/**
 * Types for the enrichment overlay that adds manually-curated data on top of processed API data.
 * Phase 5.5B.1: Define Enrichment Types
 */

import type {
  AttackType,
  AttackSurgeChart,
  DefenseDieColor,
  DefenseSurgeChart,
  WeaponKeywords,
} from '../../engine/types';
import type { UpgradeSlot } from '../types';
import type { DisplayWeaponKeywords, UnitKeywords, UpgradeKeywords } from './keywordTypes';

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
  keywords?: Partial<WeaponKeywords & DisplayWeaponKeywords>;
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
   * Override the defense die color derived from the processed API data.
   * Use when the API data is incorrect or missing for this unit.
   * When absent, the processed unit's `defenseDieColor` value is used.
   */
  defenseDieColor?: DefenseDieColor;

  /**
   * Override the base miniature count for this unit.
   * When present, overrides the API's `figures` field.
   * When absent, the API `figures` value is used (default: 1 if API is also absent).
   *
   * This is the number of miniatures in the base unit BEFORE upgrades.
   * Personnel upgrades may add additional miniatures on top of this count.
   */
  miniatureCount?: number;

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

  /**
   * Weapon profiles this upgrade provides.
   * Used by: Heavy Weapon upgrades (add a miniature with this weapon),
   * Squad Leader upgrades (add a miniature with this weapon),
   * Armament upgrades (add/modify weapon options), Grenade upgrades
   * (add one weapon entry per grenade instance — each grenade upgrade
   * contributes once per pool, but multiple different grenades each
   * contribute independently), Personnel upgrades
   * (provide the weapon profile for the added miniature).
   *
   * If a weapon has sidearmMelee/sidearmRanged in its keywords,
   * it is only usable in the matching attack type.
   */
  weapons?: EnrichmentWeaponProfile[];

  /**
   * Whether this upgrade adds a miniature to the unit.
   * Implicit defaults based on upgrade slot type:
   *   - Heavy Weapon: 1 (adds the heavy weapon specialist mini)
   *   - Personnel: 1 (adds a trooper/support mini)
   *   - Squad Leader: 1 (adds a leader mini)
   *   - All other slots: 0 (does not add a mini)
   *
   * Only set this explicitly when the upgrade differs from the slot default.
   * For example, "squad" personnel upgrades that add 2 minis should set
   * `addsMiniature: 2` to override the default of 1.
   *
   * The resolver applies slot-based defaults when this field is absent.
   */
  addsMiniature?: number;

  /**
   * Whether the miniature added by this upgrade is a noncombatant.
   * Noncombatant miniatures increase the unit's mini count (for wound allocation
   * and model count purposes) but cannot contribute weapons to the attack pool.
   *
   * Used by: Medical droids (2-1B, FX-9, EV-series), astromech droids,
   * protocol droids, comms technicians, etc.
   */
  noncombatant?: boolean;

  /**
   * Whether this is a grenade-type weapon.
   * Grenade weapons can only contribute once per attack pool per grenade
   * upgrade instance, regardless of how many miniatures carry them.
   * A unit may equip multiple different grenade upgrades — each one
   * independently adds its weapon once to the pool.
   * When true, the upgrade applicator ensures exactly one entry per
   * grenade upgrade (not one total across all grenades).
   */
  isGrenade?: boolean;

  /**
   * Surge chart overrides this upgrade grants.
   * These are NOT game keywords — they modify surge conversion behavior
   * (e.g., adding crit to the surge chart, or block on melee surge).
   * Separated from keywords because they affect surge chart configuration,
   * not keyword tagging.
   */
  surgeOverrides?: {
    surgeCrit?: boolean;
    meleeSurgeCrit?: boolean;
    meleeSurgeBlock?: boolean;
    surgeHit?: boolean;       // Surge → Hit (e.g. Imperial Hammers Elite Armor Pilot)
  };

  /**
   * Defense stat overrides this upgrade grants (e.g. Combat Armor gives a red die).
   * Applied to the defender config when this upgrade is equipped on the defender.
   */
  defenseOverrides?: {
    dieColor?: DefenseDieColor;
    surgeChart?: DefenseSurgeChart;
  };

  /**
   * Additional upgrade slot(s) this upgrade adds to the unit when equipped.
   * For example, Agent Kallus adds a Heavy Weapon slot; Stormtrooper Captain
   * adds a Training slot.
   *
   * When this upgrade is equipped, the UI dynamically adds these slot(s)
   * to the unit's upgrade bar, allowing the user to equip additional upgrades.
   * Unequipping this upgrade removes the dynamically-added slot(s) and any
   * upgrades equipped in them.
   */
  addsUpgradeSlot?: UpgradeSlot[];
}