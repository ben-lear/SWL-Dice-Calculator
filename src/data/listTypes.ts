/**
 * List Analyzer data types — shapes for imported army lists, resolved units,
 * army stats, and all aggregate computation results.
 */

import type { Faction } from './presets';
import type { ResolvedUnit, ResolvedUpgrade } from './types';

// ============================================================================
// Raw Imported JSON
// ============================================================================

/** Raw JSON shape from list builders (union of known formats) */
export interface ImportedListJson {
  listname?: string;
  points?: number;
  numActivations?: number;
  armyFaction?: string;
  battleForce?: string | null;
  commandCards?: string[];
  contingencies?: string[];
  units: ImportedUnitJson[];
  battlefieldDeck?: {
    scenario?: string;
    conditions?: string[];
    deployment?: string[];
    objective?: string[];
  };
  listlink?: string;
  author?: string;
}

export interface ImportedUnitJson {
  name: string;
  upgrades?: string[];
  loadout?: string[];
}

// ============================================================================
// Resolved List Types
// ============================================================================

/** A unit from the imported list after name-matching resolution */
export interface ResolvedListUnit {
  /** The raw name from the imported JSON */
  rawName: string;
  /** The raw upgrade names from the imported JSON */
  rawUpgradeNames: string[];
  /** Matched unit data from the app's resolved units (null = unmatched) */
  resolvedUnit: ResolvedUnit | null;
  /** Matched upgrades (null entries = unmatched) */
  resolvedUpgrades: (ResolvedUpgrade | null)[];
  /** Which upgrade bar slot each resolved upgrade maps to (parallel to resolvedUpgrades) */
  slotMapping: number[];
  /** Match quality for the unit itself */
  unitMatchConfidence: 'exact' | 'fuzzy' | 'none';
  /** Warnings generated during matching (e.g., "Upgrade 'X' not found") */
  warnings: string[];
}

// ============================================================================
// Army Stats Types
// ============================================================================

/** Dice counts and weighted success metrics for a single range band */
export interface RangeBandDice {
  rangeBand: string;
  redDice: number;
  blackDice: number;
  whiteDice: number;
  totalDice: number;
  expectedSuccesses: number;
  attackingEfficacy: number;
}

/** Tally of a keyword across the army */
export interface KeywordTally {
  keyword: string;
  label: string;
  unitCount: number;
  totalValue?: number;
}

/** Defensive save tier grouping */
export interface SaveTier {
  label: string;
  saveProbability: number;
  unitCount: number;
  totalWounds: number;
}

/** Rank composition with points breakdown */
export interface RankBreakdown {
  rank: string;
  count: number;
  points: number;
  percentage: number;
}

/** Aggregate army-level statistics */
export interface ArmyStats {
  // — Tier 1: Key stat cards —
  totalPoints: number;
  activationCount: number;
  totalWounds: number;
  totalEffectiveWounds: number;
  totalMiniatures: number;
  avgPointsPerActivation: number;

  // — Tier 2A: Dice output by range —
  diceByRange: RangeBandDice[];

  // — Tier 2B: Anti-armor tech —
  totalImpact: number;
  totalCritical: number;
  totalIon: number;
  impactUnits: number;
  criticalUnits: number;
  ionUnits: number;
  surgeToCritUnitCount: number;

  // — Tier 2C: Cover denial —
  sharpshooterUnits: number;
  totalSharpshooter: number;
  blastWeaponCount: number;
  highVelocityWeaponCount: number;

  // — Tier 2D: Suppression & control —
  suppressiveWeaponCount: number;
  scatterWeaponCount: number;

  // — Tier 2E: Deployment advantage —
  deploymentKeywords: KeywordTally[];

  // — Tier 2F: Action economy —
  actionEconomySelf: KeywordTally[];
  actionEconomySupport: KeywordTally[];

  // — Tier 2G: Defensive profile —
  saveTierBreakdown: SaveTier[];
  defensiveKeywords: KeywordTally[];

  // — Tier 2H: Composition —
  unitsByRank: RankBreakdown[];

  // — Tier 2I: Cards —
  commandCards: string[];
  contingencies: string[];
}

/** Fully resolved imported list */
export interface ResolvedList {
  meta: {
    name: string;
    points: number;
    faction: Faction | null;
    battleForce: string | null;
    author: string | null;
    listLink: string | null;
  };
  units: ResolvedListUnit[];
  stats: ArmyStats;
  parseWarnings: string[];
}
