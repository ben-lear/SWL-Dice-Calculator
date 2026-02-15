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
  All = 'all',
  Ranged = 'ranged',
  Melee = 'melee',
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
// Attacker Configuration
// ============================================================================

export interface AttackerConfig {
  // Dice pool
  redDice: number;
  blackDice: number;
  whiteDice: number;
  surgeChart: AttackSurgeChart;

  // Tokens
  aimTokens: number;
  surgeTokens: number;
  observationTokens: number;
  dodgeTokensAttacker: number;

  // Attack keywords
  preciseX: number;
  criticalX: number;
  lethalX: number;
  sharpshooterX: number;
  pierceX: number;
  impactX: number;
  ramX: number;

  // Flags
  blast: boolean;
  highVelocity: boolean;
  suppressive: boolean;
  marksman: boolean;
  marksmanStrategy: MarksmanStrategy;
  rerollStrategy: RerollStrategy;
  jediHunter: boolean;
  jarKaiMastery: boolean;
  duelistAttacker: boolean;
  makashiMastery: boolean;
  spray: boolean;
  immuneDeflect: boolean;
  deathFromAbove: boolean;
  holdTheLine: boolean;

  // Dice modification keywords
  antiMaterielX: number;
  antiPersonnelX: number;
  cumbersome: boolean;

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
