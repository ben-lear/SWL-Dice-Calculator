// ============================================================================
// Dice & Faces
// ============================================================================

export enum AttackDieColor {
  White = 'white',
  Black = 'black',
  Red = 'red',
}

export enum DefenseDieColor {
  White = 'white',
  Red = 'red',
}

export enum AttackFace {
  Blank = 'blank',
  Hit = 'hit',              // a
  Critical = 'crit',        // b
  Surge = 'surge',          // c
}

export enum DefenseFace {
  Blank = 'blank',
  Block = 'block',          // d
  Surge = 'surge',          // e
}

// ============================================================================
// Attack Types
// ============================================================================

export enum AttackType {
  Ranged = 'ranged',
  Melee = 'melee',
  Hybrid = 'hybrid',
  Overrun = 'overrun',
}

// Note: AttackType is stored at the top level of AttackConfig,
// not in a separate context object.

// ============================================================================
// Surge Conversion Charts
// ============================================================================

export enum AttackSurgeChart {
  None = 'none',        // c → blank
  ToHit = 'to-hit',     // c → a
  ToCrit = 'to-crit',   // c → b
}

export enum DefenseSurgeChart {
  None = 'none',        // e → blank
  ToBlock = 'to-block', // e → d
}

// ============================================================================
// Cover
// ============================================================================

export enum CoverType {
  None = 'none',
  Light = 'light',    // 1
  Heavy = 'heavy',    // 2
}

export enum MarksmanStrategy {
  Deterministic = 'deterministic',  // Always use Marksman for guaranteed conversion
  Averages = 'averages',            // Use Marksman only if EV is better than rerolls
}

export enum RerollStrategy {
  Conservative = 'conservative',    // Only reroll blanks and excess surges (default)
  CritFishing = 'crit-fishing',     // Also reroll hits to fish for crits
}

/**
 * Decision for using Marksman keyword with a single aim token.
 * Exactly one of these fields will be set (not null).
 */
export interface MarksmanDecision {
  convertBlankIndex: number | null;  // Index of specific blank die to convert to hit
  convertHitIndex: number | null;    // Index of specific hit die to convert to crit
  useRerollInstead: boolean;         // True if this aim should be used for rerolling instead
}

// ============================================================================
// Weapon Keywords (per-weapon, contributed to attack pool)
// ============================================================================

/**
 * Keywords that belong to individual weapons and are contributed to the
 * attack pool along with that weapon's dice. Some are aggregated across
 * all weapons in the pool (sum/OR/AND), others apply per-weapon only
 * during pool formation.
 */
export interface WeaponKeywords {
  // Aggregated: Summed across weapons in pool
  criticalX: number;
  lethalX: number;
  pierceX: number;
  impactX: number;
  ramX: number;

  // Aggregated: Boolean OR (any weapon → pool has it)
  blast: boolean;
  suppressive: boolean;

  // Aggregated: Boolean AND (all weapons must have it)
  highVelocity: boolean;

  // Aggregated: Boolean OR (any weapon → pool has it)
  immuneDeflect: boolean;
  primitive: boolean;

  // Aggregated: Summed across weapons in pool
  ionX: number;

  // Per-weapon only (applied during pool formation, not aggregated)
  spray: boolean;
  antiMaterielX: number;
  antiPersonnelX: number;
  cumbersome: boolean;
  sidearmMelee: boolean;    // Weapon only usable in melee attack pools
  sidearmRanged: boolean;   // Weapon only usable in ranged attack pools
}

// ============================================================================
// Weapon Profile (dice + keywords for a single weapon)
// ============================================================================

/**
 * Represents a single weapon contributing to an attack pool.
 * Each weapon has its own dice and weapon keywords.
 */
export interface WeaponProfile {
  /** Optional display name (e.g., "DLT-19", "Lightsaber") */
  name?: string;
  /** Weapon attack type; if omitted, treated as valid for all attack types. */
  weaponType?: AttackType;
  /** Whether this weapon is enabled in Unit Builder mode. */
  enabled?: boolean;

  // Dice contributed by this weapon
  redDice: number;
  blackDice: number;
  whiteDice: number;

  // Weapon keywords
  keywords: WeaponKeywords;
}

// ============================================================================
// Aggregated Weapon Keywords (pool-level, computed from all weapons)
// ============================================================================

/**
 * The result of aggregating weapon keywords across all weapons in an
 * attack pool. Per-weapon-only keywords (spray, cumbersome, anti-materiel,
 * anti-personnel) are excluded — they are handled during pool formation.
 */
export interface AggregatedWeaponKeywords {
  // Summed across weapons
  criticalX: number;
  lethalX: number;
  pierceX: number;
  impactX: number;
  ramX: number;

  // OR'd across weapons
  blast: boolean;
  suppressive: boolean;

  // AND'd across weapons (all must have it)
  highVelocity: boolean;

  // OR'd across weapons
  immuneDeflect: boolean;
  primitive: boolean;

  // Summed across weapons
  ionX: number;
}

// ============================================================================
// Attacker Configuration
// ============================================================================

export interface AttackerConfig {
  // Weapons in the attack pool
  weapons: WeaponProfile[];

  // Unit-level surge chart (applies to all dice in pool)
  surgeChart: AttackSurgeChart;

  // Tokens (unit-level)
  aimTokens: number;
  surgeTokens: number;
  observationTokens: number;
  dodgeTokensAttacker: number;

  // Unit keywords (numeric)
  preciseX: number;
  sharpshooterX: number;
  arsenalX: number;

  // Unit keywords (boolean)
  marksman: boolean;
  marksmanStrategy: MarksmanStrategy;
  rerollStrategy: RerollStrategy;
  jediHunter: boolean;
  jarKaiMastery: boolean;
  duelistAttacker: boolean;
  makashiMastery: boolean;
  deathFromAbove: boolean;
  holdTheLine: boolean;
  completeTheMission: boolean;

  // Points
  unitCost: number;
}

// ============================================================================
// Defender Configuration
// ============================================================================

export interface DefenderConfig {
  // Defense
  dieColor: DefenseDieColor;
  surgeChart: DefenseSurgeChart;
  disableDefenseDice?: boolean;  // Custom Pool mode: when true, defense rolls 0 dice

  // Cover
  coverType: CoverType;
  coverX: number;
  smokeTokens: number;
  suppressed: boolean;

  // Tokens
  dodgeTokens: number;
  surgeTokens: number;
  suppressionTokens: number;

  // Miniatures
  minisInLOS: number;

  // Defense keywords
  armorX: number;
  weakPointX: number;
  immunePierce: boolean;
  immuneMeleePierce: boolean;
  immuneBlast: boolean;
  immuneMelee: boolean;
  impervious: boolean;
  dangerSenseX: number;
  uncannyLuckX: number;
  block: boolean;
  deflect: boolean;
  shienMastery: boolean;
  outmaneuver: boolean;
  lowProfile: boolean;
  shieldedX: number;
  djemSoMastery: boolean;
  soresuMastery: boolean;
  duelistDefender: boolean;
  backup: boolean;
  holdTheLine: boolean;
  dugIn: boolean;  // Dug In upgrade: cover dice become red instead of white
  completeTheMission: boolean;  // Complete the Mission: surge→block near allied Priority Mission Token

  // Guardian
  guardianX: number;
  guardianDieColor?: DefenseDieColor;
  guardianSurgeChart?: DefenseSurgeChart;
  guardianDeflect?: boolean;        // Guardian unit has Deflect keyword
  guardianSoresuMastery?: boolean;   // Guardian unit has Soresu Mastery keyword
  guardianDodgeTokens?: number;      // Dodge tokens on the Guardian unit (for Soresu reroll)

  // Points
  unitCost: number;
}

// ============================================================================
// Full Attack Configuration
// ============================================================================

export interface AttackConfig {
  attacker: AttackerConfig;
  defender: DefenderConfig;
  attackType: AttackType;
}

// ============================================================================
// Attack Result
// ============================================================================

export interface AttackResult {
  // Primary results (without pierce — individual target breakdown)
  guardianWoundsNoPierce: number;   // Wounds suffered by Guardian unit (without pierce)
  mainTargetWoundsNoPierce: number; // Wounds suffered by main target (without pierce)

  // Total result (with pierce — combined)
  totalWounds: number;              // Total wounds across both targets (with pierce applied)

  // Secondary effects
  deflectWounds: number;        // Wounds reflected back to attacker (Deflect/Shien)
  djemSoWounds: number;         // Wounds reflected back to attacker (Djem So)

  // Suppression
  suppressionApplied: number;   // 1 + Suppressive flag

  // Breakdown (optional, for debugging/UI)
  breakdown?: {
    initialPool: AttackDieColor[];
    afterStep2: AttackDieColor[];
    afterStep4a: AttackDieColor[];
    rolledAttack: AttackFace[];
    afterStep4c: AttackFace[];
    afterStep4d: AttackFace[];
    afterStep5Cover: number;      // hits remaining after cover
    afterStep5Dodge: number;       // hits remaining after dodge
    afterStep6: { hits: number; crits: number };
    defensePool: number;
    rolledDefense: DefenseFace[];
    afterStep7d: DefenseFace[];
    afterStep7e: DefenseFace[];
    afterStep8: number;           // blocks remaining after Pierce
  };
}

// ============================================================================
// Internal Type: Rolled Attack Die (preserves color information)
// ============================================================================

/**
 * Internal representation of a rolled attack die that preserves both
 * color and face information needed for reroll decisions.
 */
export interface RolledAttackDie {
  color: AttackDieColor;
  face: AttackFace;
}

/**
 * Internal representation of a rolled defense die that preserves both
 * color and face information needed for reroll decisions.
 */
export interface RolledDefenseDie {
  color: DefenseDieColor;
  face: DefenseFace;
}

// ============================================================================
// Simulation Results
// ============================================================================

/**
 * Distribution entry: maps a wound count to its probability.
 */
export interface DistributionEntry {
  wounds: number;         // X wounds
  count: number;          // Number of iterations that produced exactly X wounds
  probability: number;    // count / totalIterations (0–1)
  cumulative: number;     // P(≥ X wounds) (0–1)
}

/**
 * Core statistical summary for a set of simulation results.
 */
export interface StatsSummary {
  mean: number;
  median: number;
  mode: number;
  min: number;
  max: number;
  standardDeviation: number;
}

/**
 * Points efficiency metrics derived from simulation results and unit costs.
 */
export interface EfficiencyMetrics {
  attackerWoundsPerPoint: number;     // mean wounds / attacker cost
  attackerPointsPerWound: number;     // attacker cost / mean wounds
  defenderWoundsPerPoint: number;     // mean wounds / defender cost
  defenderPointsPerWound: number;     // defender cost / mean wounds
  attackerEfficiencyRatio: number;    // (mean wounds / attacker cost) / defender cost
}

/**
 * Full simulation output returned to the UI.
 */
export interface SimulationResult {
  // Config echo (for verifying results match the current config)
  iterations: number;
  durationMs: number;

  // Primary results — total wounds (with pierce)
  totalWounds: StatsSummary;
  totalWoundsDistribution: DistributionEntry[];

  // Secondary results — guardian wounds (without pierce)
  guardianWounds: StatsSummary;
  guardianWoundsDistribution: DistributionEntry[];

  // Secondary results — main target wounds (without pierce)
  mainTargetWounds: StatsSummary;
  mainTargetWoundsDistribution: DistributionEntry[];

  // Reflection damage to attacker
  deflectWounds: StatsSummary;
  deflectWoundsDistribution: DistributionEntry[];

  djemSoWounds: StatsSummary;
  djemSoWoundsDistribution: DistributionEntry[];

  // Suppression (constant per config, but included for completeness)
  suppressionPerAttack: number;

  // Points efficiency
  efficiency: EfficiencyMetrics;
}
