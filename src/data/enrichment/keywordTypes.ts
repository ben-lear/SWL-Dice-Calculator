/**
 * Typed keyword interfaces for enrichment data.
 * 
 * These types ensure that enrichment files only use keywords that are actually
 * supported by the combat engine. All fields are optional (Partial) because
 * enrichment is additive — you only specify what you need to override/add.
 * 
 * Phase 5.5: Type-safe enrichment keywords
 */

/** Placeholder used for magnitude keywords that require manual curation. */
export type NeedHumanValue = '<need human>';

/** Numeric enrichment values can be concrete numbers or human placeholders. */
export type EnrichmentNumericValue = number | NeedHumanValue;

// ============================================================================
// Weapon Keywords (for weapon profiles)
// ============================================================================

/**
 * Keywords that can be specified on weapon profiles in enrichment data.
 * All fields are optional — enrich only what's needed.
 * 
 * Use these for weapon.keywords in UnitEnrichment weapon profiles.
 */
export interface EnrichmentWeaponKeywords {
  pierceX?: EnrichmentNumericValue;
  impactX?: EnrichmentNumericValue;
  criticalX?: EnrichmentNumericValue;
  lethalX?: EnrichmentNumericValue;
  ramX?: EnrichmentNumericValue;
  ionX?: EnrichmentNumericValue;
  blast?: boolean;
  suppressive?: boolean;
  highVelocity?: boolean;
  spray?: boolean;
  antiMaterielX?: EnrichmentNumericValue;
  antiPersonnelX?: EnrichmentNumericValue;
  cumbersome?: boolean;
  immuneDeflect?: boolean;
  primitive?: boolean;
  sidearmMelee?: boolean;
  sidearmRanged?: boolean;
}

// ============================================================================
// Unit-Level Attacker Keywords
// ============================================================================

/**
 * Attacker-side unit keywords that can be specified in enrichment data.
 * All fields are optional — enrich only what's needed.
 * 
 * Use these for unit-level keywords in attacker UnitEnrichment.
 */
export interface AttackerUnitKeywords {
  // Numeric keywords
  preciseX?: EnrichmentNumericValue;
  sharpshooterX?: EnrichmentNumericValue;
  arsenalX?: EnrichmentNumericValue;

  // Boolean keywords
  marksman?: boolean;
  jediHunter?: boolean;
  jarKaiMastery?: boolean;
  duelistAttacker?: boolean;
  makashiMastery?: boolean;
  deathFromAbove?: boolean;
  holdTheLine?: boolean;
  completeTheMission?: boolean;
}

// ============================================================================
// Unit-Level Defender Keywords
// ============================================================================

/**
 * Defender-side unit keywords that can be specified in enrichment data.
 * All fields are optional — enrich only what's needed.
 * 
 * Use these for unit-level keywords in defender UnitEnrichment.
 */
export interface DefenderUnitKeywords {
  // Numeric keywords
  armorX?: EnrichmentNumericValue;
  weakPointX?: EnrichmentNumericValue;
  dangerSenseX?: EnrichmentNumericValue;
  uncannyLuckX?: EnrichmentNumericValue;
  shieldedX?: EnrichmentNumericValue;
  guardianX?: EnrichmentNumericValue;
  coverX?: EnrichmentNumericValue;

  // Boolean keywords
  immunePierce?: boolean;
  immuneMeleePierce?: boolean;
  immuneBlast?: boolean;
  immuneMelee?: boolean;
  impervious?: boolean;
  block?: boolean;
  deflect?: boolean;
  shienMastery?: boolean;
  outmaneuver?: boolean;
  lowProfile?: boolean;
  djemSoMastery?: boolean;
  soresuMastery?: boolean;
  duelistDefender?: boolean;
  backup?: boolean;
  holdTheLine?: boolean;
  dugIn?: boolean;
  completeTheMission?: boolean;
}

// ============================================================================
// Display Weapon Keywords (non-engine, tagging/display only)
// ============================================================================

/**
 * Weapon-level keywords for display/tagging purposes.
 * None of these affect the combat engine.
 */
export interface DisplayWeaponKeywords {
  longshot?: boolean;
  scatter?: boolean;
  exhaust?: boolean;
  expend?: boolean;
  immobilizeX?: EnrichmentNumericValue;
  overrunX?: EnrichmentNumericValue;
  fixed?: string;
  areaWeapon?: boolean;
  beamX?: EnrichmentNumericValue;
  poisonX?: EnrichmentNumericValue;
  selfDestructX?: EnrichmentNumericValue;
  towCable?: boolean;
  versatile?: boolean;
  armX?: string;
  detonateX?: string;
}

// ============================================================================
// Display Unit Keywords (non-engine, tagging/display only)
// ============================================================================

/**
 * Unit/upgrade-level keywords for display/tagging purposes.
 * None of these affect the combat engine. Organized by value type.
 */
export interface DisplayUnitKeywords {
  // Boolean keywords
  charge?: boolean;
  dauntless?: boolean;
  reconfigure?: boolean;
  cycle?: boolean;
  cunning?: boolean;
  alliesOfConvenience?: boolean;
  exemplar?: boolean;
  preparedPosition?: boolean;
  indomitable?: boolean;
  spur?: boolean;
  quickThinking?: boolean;
  infiltrate?: boolean;
  relentless?: boolean;
  nimble?: boolean;
  gunslinger?: boolean;
  fireSupport?: boolean;
  barrage?: boolean;
  ataruMastery?: boolean;
  juyoMastery?: boolean;
  steady?: boolean;
  disengage?: boolean;
  scale?: boolean;
  covertOps?: boolean;
  incognito?: boolean;
  loadout?: boolean;
  sentinel?: boolean;
  stationary?: boolean;
  fullPivot?: boolean;
  climbingVehicle?: boolean;
  expertClimber?: boolean;
  unhindered?: boolean;
  plodding?: boolean;
  grounded?: boolean;
  reposition?: boolean;
  attackRun?: boolean;
  authoritative?: boolean;
  bounty?: boolean;
  cacheDodgeX?: EnrichmentNumericValue;
  cacheAimX?: EnrichmentNumericValue;
  calculateOdds?: boolean;
  compel?: boolean;
  detachment?: boolean;
  disgraced?: boolean;
  distract?: boolean;
  divineInfluence?: boolean;
  divulge?: boolean;
  faultyEquipment?: boolean;
  fieldCommander?: boolean;
  flawed?: boolean;
  guidance?: boolean;
  heavyWeaponTeam?: boolean;
  hunted?: boolean;
  imPartOfTheSquadToo?: boolean;
  inconspicuous?: boolean;
  insecure?: boolean;
  interrogate?: boolean;
  latentPower?: boolean;
  leader?: boolean;
  masterStoryteller?: boolean;
  mobile?: boolean;
  myMoodIsBasedOnProfit?: boolean;
  noncombatantKeyword?: boolean;
  oneStepAhead?: boolean;
  overrideKeyword?: boolean;
  permanent?: boolean;
  programmed?: boolean;
  pullingTheStrings?: boolean;
  reinforcements?: boolean;
  restore?: boolean;
  ruthless?: boolean;
  secretMission?: boolean;
  selfPreservation?: boolean;
  small?: boolean;
  smokeTokens?: boolean;
  tempted?: boolean;
  unconcerned?: boolean;
  unstoppable?: boolean;
  weighedDown?: boolean;
  wereNotRegs?: boolean;
  wheelMode?: boolean;
  immuneEnemyEffects?: boolean;
  immuneRange1Weapons?: boolean;

  // Numeric keywords
  tacticalX?: EnrichmentNumericValue;
  demoralizeX?: EnrichmentNumericValue;
  inspireX?: EnrichmentNumericValue;
  targetX?: EnrichmentNumericValue;
  spotterX?: EnrichmentNumericValue;
  bolsterX?: EnrichmentNumericValue;
  strategizeX?: EnrichmentNumericValue;
  rechargeX?: EnrichmentNumericValue;
  agileX?: EnrichmentNumericValue;
  reliableX?: EnrichmentNumericValue;
  scoutX?: EnrichmentNumericValue;
  jumpX?: EnrichmentNumericValue;
  speederX?: EnrichmentNumericValue;
  enrageX?: EnrichmentNumericValue;
  regenerateX?: EnrichmentNumericValue;
  masterOfTheForceX?: EnrichmentNumericValue;
  observeX?: EnrichmentNumericValue;
  contingenciesX?: EnrichmentNumericValue;
  commandVehicleX?: EnrichmentNumericValue;
  defendX?: EnrichmentNumericValue;
  disciplinedX?: EnrichmentNumericValue;
  flexibleResponseX?: EnrichmentNumericValue;
  generatorX?: EnrichmentNumericValue;
  readyX?: EnrichmentNumericValue;
  scoutingPartyX?: EnrichmentNumericValue;
  smokeX?: EnrichmentNumericValue;
  takeCoverX?: EnrichmentNumericValue;
  woundX?: EnrichmentNumericValue;
  advancedTargetingX?: EnrichmentNumericValue;
  lightTransportX?: EnrichmentNumericValue;

  // String (parameterized) keywords
  coordinate?: string;
  aid?: string;
  direct?: string;
  ai?: string;
  entourage?: string;
  equip?: string;
  retinue?: string;
  teamwork?: string;
  associate?: string;
  independent?: string;
  mercenary?: string;
  specialIssue?: string;
  repair?: string;
  treat?: string;
  hover?: string;
  transport?: string;
}

// ============================================================================
// Combined Unit Keywords (for enrichment that doesn't distinguish side)
// ============================================================================

/**
 * Combined attacker, defender, and display keywords for unit-level enrichment.
 * Allows specifying keywords that could apply to either attacking, defending,
 * or display/tagging.
 * 
 * Use this in UnitEnrichment.keywords when the unit could be both attacker/defender.
 */
export type UnitKeywords = AttackerUnitKeywords & DefenderUnitKeywords & DisplayUnitKeywords;

// ============================================================================
// Upgrade Keywords
// ============================================================================

/**
 * Keywords that upgrades can grant. Upgrades can grant weapon keywords,
 * display weapon keywords, attacker keywords, defender keywords, or
 * display unit keywords depending on the upgrade type.
 * 
 * Use this in UpgradeEnrichment.keywords.
 */
export type UpgradeKeywords = EnrichmentWeaponKeywords & DisplayWeaponKeywords & UnitKeywords;
