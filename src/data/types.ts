import type {
  AttackType,
  AttackSurgeChart,
  DefenseSurgeChart,
  DefenseDieColor,
  WeaponKeywords,
} from '../engine/types';
import type { DisplayWeaponKeywords } from './enrichment/keywordTypes';
import type { Faction } from './presets';

// ============================================================================
// Upgrade Slots
// ============================================================================

/**
 * All upgrade card slot types in Star Wars: Legion.
 * Values are kebab-case strings matching processed data output.
 */
export enum UpgradeSlot {
  // Combat-relevant (full enrichment priority)
  HeavyWeapon = 'heavy-weapon',
  Personnel = 'personnel',
  Armament = 'armament',
  Ordnance = 'ordnance',
  Gear = 'gear',
  Force = 'force',
  Hardpoint = 'hardpoint',
  Crew = 'crew',
  Grenades = 'grenades',
  Pilot = 'pilot',

  // Conditionally combat-relevant (some upgrades in these slots affect dice)
  Training = 'training',
  Programming = 'programming',
  Protocol = 'protocol',
  SquadLeader = 'squad-leader',
  DoorGunner = 'door-gunner',
  DugIn = 'dug-in',
  Generator = 'generator',

  // Non-combat (cost-only for MVP)
  Comms = 'comms',
  Command = 'command',
  Scanner = 'scanner',
  StrikeAndFade = 'strike-and-fade',
  ImperialMarch = 'imperial-march',
  Doctrine = 'doctrine',

  // Counterpart upgrades
  Counterpart = 'counterpart',
}

/** Slots where upgrade enrichment includes dice/keyword data */
export const COMBAT_RELEVANT_SLOTS: ReadonlySet<UpgradeSlot> = new Set([
  UpgradeSlot.HeavyWeapon,
  UpgradeSlot.Personnel,
  UpgradeSlot.Armament,
  UpgradeSlot.Ordnance,
  UpgradeSlot.Gear,
  UpgradeSlot.Force,
  UpgradeSlot.Hardpoint,
  UpgradeSlot.Crew,
  UpgradeSlot.Grenades,
  UpgradeSlot.Pilot,
  UpgradeSlot.Training,
  UpgradeSlot.Programming,
  UpgradeSlot.Protocol,
  UpgradeSlot.SquadLeader,
  UpgradeSlot.DoorGunner,
  UpgradeSlot.DugIn,
  UpgradeSlot.Generator,
]);

/** Display labels for each upgrade slot */
export const UPGRADE_SLOT_LABELS: Record<UpgradeSlot, string> = {
  [UpgradeSlot.HeavyWeapon]: 'Heavy Weapon',
  [UpgradeSlot.Personnel]: 'Personnel',
  [UpgradeSlot.Armament]: 'Armament',
  [UpgradeSlot.Ordnance]: 'Ordnance',
  [UpgradeSlot.Gear]: 'Gear',
  [UpgradeSlot.Force]: 'Force',
  [UpgradeSlot.Hardpoint]: 'Hardpoint',
  [UpgradeSlot.Crew]: 'Crew',
  [UpgradeSlot.Grenades]: 'Grenades',
  [UpgradeSlot.Pilot]: 'Pilot',
  [UpgradeSlot.Comms]: 'Comms',
  [UpgradeSlot.Command]: 'Command',
  [UpgradeSlot.Training]: 'Training',
  [UpgradeSlot.Generator]: 'Generator',
  [UpgradeSlot.Programming]: 'Programming',
  [UpgradeSlot.Protocol]: 'Protocol',
  [UpgradeSlot.Scanner]: 'Scanner',
  [UpgradeSlot.SquadLeader]: 'Squad Leader',
  [UpgradeSlot.StrikeAndFade]: 'Strike and Fade',
  [UpgradeSlot.DoorGunner]: 'Door Gunner',
  [UpgradeSlot.ImperialMarch]: 'Imperial March',
  [UpgradeSlot.DugIn]: 'Dug In',
  [UpgradeSlot.Doctrine]: 'Doctrine',
  [UpgradeSlot.Counterpart]: 'Counterpart',
};

// ============================================================================
// Unit Rank & Type
// ============================================================================

export type UnitRank =
  | 'commander'
  | 'operative'
  | 'corps'
  | 'special-forces'
  | 'support'
  | 'heavy';

export type UnitType = 'trooper' | 'ground-vehicle' | 'repulsor-vehicle';

// ============================================================================
// Raw API Shapes (as returned by tabletopadmiral.com)
// ============================================================================

export interface RawUnit {
  id: number;
  name: string;
  faction: number;
  cost: number;
  health: number;
  figures: number;
  red_defense: boolean;
  rank: number;
  unit_type: number;
  keyword_ids: number[];
  /** Upgrade slot entries — available when fetching from /api/units/2 */
  upgrade_types: RawUpgradeTypeEntry[];
  // Always null in current API — retained for future detection
  weapon1: unknown | null;
  weapon2: unknown | null;
  weapon3: unknown | null;
  surge_chart: unknown | null;
}

/**
 * A single upgrade slot entry on a unit, from the API's upgrade_types array.
 */
export interface RawUpgradeTypeEntry {
  id: number;
  /** Whether this slot is available in Revamp mode */
  revamp: boolean;
  /** Whether this slot is available in Classic mode */
  classic: boolean;
  /** API ID of the unit this slot belongs to */
  unit_fkey: number;
  /** API ID of an upgrade that must be equipped in this slot (null = optional) */
  must_equip: number | null;
  /** API ID of an upgrade that unlocks this slot (null = always available) */
  unlocked_by: number | null;
  /** Maps to an upgrade type from /api/upgrade-types */
  upgrade_type_fkey: number;
  /** Most popular upgrade for this slot (informational only) */
  most_popular_upgrade: number | null;
  /** Whether this slot must have something equipped (null/false = optional) */
  must_equip_something: boolean | null;
}

/**
 * An upgrade type definition from /api/upgrade-types.
 */
export interface RawUpgradeType {
  id: number;
  name: string;
  image_url: string;
  sort_priority: number;
}

export interface RawKeyword {
  id: number;
  name: string;
  has_magnitude: boolean;
  weapon: boolean;
  descriptions: unknown[];
}

export interface RawUpgrade {
  id: number;
  name: string;
  cost: number;
  upgrade_type_fkey: number;
  unit_fkey: number | null;
  keyword_ids: number[];
}

// ============================================================================
// Processed Shapes (after processApiData script)
// ============================================================================

export interface ProcessedUnit {
  /** Original API ID */
  apiId: number;
  /** Slugified ID: e.g. "luke-skywalker-jedi-knight" (or "luke-skywalker-galactic-empire" if disambiguation is required) */
  id: string;
  name: string;
  /** Unit subtitle (e.g. "Hero of the Rebellion", "Jedi Knight") — used for disambiguation when multiple units share a name */
  title?: string | null;
  faction: Faction;
  cost: number;
  health: number;
  figures: number;
  defenseDieColor: DefenseDieColor;
  rank: UnitRank;
  unitType: UnitType;
  /** Mercenary affiliation slug, or null for non-mercenary units */
  affiliation: string | null;
  /** Keyword names resolved from keyword_ids */
  keywordNames: string[];
  /** Upgrade bar derived from API upgrade_types field */
  upgradeBar: UpgradeSlot[];
}

export interface ProcessedUpgrade {
  /** Original API ID */
  apiId: number;
  /** Slugified ID */
  id: string;
  name: string;
  cost: number;
  upgradeSlot: UpgradeSlot;
  /** Faction slugs this upgrade is limited to. Empty = any faction. */
  factionRestrictions: string[];
  /** Rank slugs this upgrade is limited to. Empty = any rank. */
  rankRestrictions: string[];
  /** Unit type slugs this upgrade is limited to. Empty = any unit type. */
  unitTypeRestrictions: string[];
  /** API IDs of the specific units this upgrade is limited to. Empty = any unit. */
  unitRestrictions: number[];
  /** Affiliation slugs this upgrade is limited to. Empty = any affiliation. */
  affiliationRestrictions: string[];
  /** Force alignment required, or null if unrestricted. */
  alignmentRestriction: 'Light' | 'Dark' | null;
  /** API IDs of units this upgrade must NOT appear on. */
  unitsDisallowedOn: number[];
  /** Keyword names resolved from keyword_ids */
  keywordNames: string[];
  /** Additional upgrade slot(s) this upgrade adds to the unit when equipped. Empty array if none. */
  addsUpgradeSlot: UpgradeSlot[];
  /** Upgrade slot type the unit must have in its upgrade bar for this upgrade to be equippable. Null = no requirement. */
  requiredUpgradeSlot: UpgradeSlot | null;
}

export interface ProcessedKeyword {
  id: number;
  name: string;
  hasMagnitude: boolean;
  isWeaponKeyword: boolean;
}

// ============================================================================
// Resolved Shapes (processed + enrichment merged)
// ============================================================================

/**
 * A weapon profile with full dice data (from enrichment).
 * 
 * NOTE: This is the DATA LAYER WeaponProfile, which now uses the same typed
 * WeaponKeywords interface as the engine. This ensures type safety and prevents
 * invalid keywords from being specified in enrichment data.
 */
export interface WeaponProfile {
  name: string;
  weaponType: AttackType;
  redDice: number;
  blackDice: number;
  whiteDice: number;
  /** Weapon-specific keywords using the engine's typed WeaponKeywords + display weapon keywords */
  keywords: Partial<WeaponKeywords & DisplayWeaponKeywords>;
  minRange?: number;
  maxRange?: number;
}

export interface ResolvedUnit {
  /** Slugified ID from processed data */
  id: string;
  apiId: number;
  name: string;
  /** Unit subtitle (e.g. "Hero of the Rebellion", "Jedi Knight") — used for disambiguation in dropdowns */
  title: string | null;
  faction: Faction;
  cost: number;
  health: number;
  figures: number;
  defenseDieColor: DefenseDieColor;
  rank: UnitRank;
  unitType: UnitType;
  /** Mercenary affiliation slug, or null for non-mercenary units */
  affiliation: string | null;

  /** Attack surge chart fallback from unit enrichment (null if unspecified) */
  attackSurgeChart: AttackSurgeChart | null;

  /** Defense surge chart (from enrichment; null if un-enriched) */
  defenseSurgeChart: DefenseSurgeChart | null;

  /**
   * Unit-level keywords with resolved values.
   * Boolean keywords: true/false. Magnitude keywords: numeric value.
   * For un-enriched units: boolean keywords from API are set to true;
   * magnitude keywords are set to 0 (unknown X value).
   * 
   * This uses a generic Record to accommodate API keywords that might not
   * be in our typed interfaces yet, but enrichment data should use the
   * typed UnitKeywords interface.
   */
  keywords: Record<string, number | boolean | string>;

  /** Weapon profiles (from enrichment). Empty for un-enriched units. */
  weapons: WeaponProfile[];

  /** Available upgrade slots (from processed API data). Populated for all units. */
  upgradeBar: UpgradeSlot[];

  /** Whether this unit has been manually enriched with full data */
  isEnriched: boolean;
}

export interface ResolvedUpgrade {
  id: string;
  apiId: number;
  name: string;
  cost: number;
  upgradeSlot: UpgradeSlot;
  /** Faction slugs this upgrade is limited to. Empty = any faction. */
  factionRestrictions: string[];
  /** Rank slugs this upgrade is limited to. Empty = any rank. */
  rankRestrictions: string[];
  /** Unit type slugs this upgrade is limited to. Empty = any unit type. */
  unitTypeRestrictions: string[];
  /** API IDs of the specific units this upgrade is limited to. Empty = any unit. */
  unitRestrictions: number[];
  /** Affiliation slugs this upgrade is limited to. Empty = any affiliation. */
  affiliationRestrictions: string[];
  /** Force alignment required, or null if unrestricted. */
  alignmentRestriction: 'Light' | 'Dark' | null;
  /** API IDs of units this upgrade must NOT appear on. */
  unitsDisallowedOn: number[];
  /** 
   * Keywords this upgrade grants (from enrichment). Empty for un-enriched upgrades.
   * 
   * This uses a generic Record to accommodate flexible runtime keyword resolution,
   * but enrichment data should use the typed UpgradeKeywords interface.
   */
  keywords: Record<string, number | boolean | string>;

  /** Weapon profiles this upgrade provides (from enrichment). Empty array if none. */
  weapons: WeaponProfile[];

  /**
   * Number of additional miniatures this upgrade adds to the unit.
   * Resolved from enrichment with slot-based defaults:
   *   - Heavy Weapon / Personnel / Squad Leader: defaults to 1 if not specified
   *   - All other slots: defaults to 0
   * Enrichment can override to any value (e.g., 2 for squad personnel, 0 for
   * an upgrade that explicitly does NOT add a mini despite being in a slot that
   * normally would).
   */
  addsMiniature: number;

  /** Whether the added miniature is a noncombatant (cannot contribute weapons). */
  noncombatant: boolean;

  /** Whether this upgrade provides a grenade weapon (1 entry per grenade instance per pool). */
  isGrenade: boolean;

  /** Additional upgrade slot(s) this upgrade adds to the unit when equipped. Empty array if none. */
  addsUpgradeSlot: UpgradeSlot[];

  /** Upgrade slot type the unit must have in its upgrade bar for this upgrade to be equippable. Null = no requirement. */
  requiredUpgradeSlot: UpgradeSlot | null;

  /**
   * Surge chart overrides this upgrade grants.
   * These modify surge conversion behavior, not keyword tagging.
   * Null if the upgrade has no surge overrides.
   */
  surgeOverrides: {
    surgeCrit?: boolean;
    meleeSurgeCrit?: boolean;
    meleeSurgeBlock?: boolean;
    surgeHit?: boolean;
  } | null;

  /**
   * Defense stat overrides this upgrade grants.
   * Null if the upgrade has no defense overrides.
   */
  defenseOverrides: {
    dieColor?: DefenseDieColor;
    surgeChart?: DefenseSurgeChart;
  } | null;

  /** Whether this upgrade has been manually enriched with keyword/dice data */
  isEnriched: boolean;
}
