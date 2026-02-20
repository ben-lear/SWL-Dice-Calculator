import type {
  AttackerConfig,
  DefenderConfig,
  WeaponProfile,
  WeaponKeywords,
  AggregatedWeaponKeywords,
} from './types';
import {
  AttackSurgeChart,
  DefenseSurgeChart,
  CoverType,
  MarksmanStrategy,
  RerollStrategy,
  DefenseDieColor,
} from './types';

/**
 * Create a minimal valid weapon keywords object.
 * All keywords default to 0/false.
 */
export function createMinimalWeaponKeywords(
  overrides: Partial<WeaponKeywords> = {}
): WeaponKeywords {
  return {
    criticalX: 0,
    lethalX: 0,
    pierceX: 0,
    impactX: 0,
    ramX: 0,
    blast: false,
    highVelocity: false,
    suppressive: false,
    spray: false,
    antiMaterielX: 0,
    antiPersonnelX: 0,
    cumbersome: false,
    sidearmMelee: false,
    sidearmRanged: false,
    immuneDeflect: false,
    primitive: false,
    ionX: 0,
    blackOps: false,
    krakenBlaster: false,
    ...overrides,
  };
}

/**
 * Create a minimal valid weapon profile.
 * Defaults to 0 dice and no keywords.
 * Accepts flat keyword overrides for convenience:
 *   createMinimalWeapon({ redDice: 2, keywords: { pierceX: 3 } })
 */
export function createMinimalWeapon(
  overrides?: Partial<Omit<WeaponProfile, 'keywords'>> & { keywords?: Partial<WeaponKeywords> }
): WeaponProfile {
  if (!overrides) {
    return {
      redDice: 0,
      blackDice: 0,
      whiteDice: 0,
      keywords: createMinimalWeaponKeywords(),
    };
  }
  const { keywords: keywordOverrides, ...rest } = overrides;
  return {
    redDice: 0,
    blackDice: 0,
    whiteDice: 0,
    keywords: createMinimalWeaponKeywords(keywordOverrides),
    ...rest,
  };
}

/**
 * Helper to create a minimal valid attacker config for testing.
 * If weapons is not provided, creates a single weapon with no dice.
 *
 * Convenience: weapon-level overrides can be passed directly if only
 * testing a single weapon:
 *   createMinimalAttacker({ weapons: [createMinimalWeapon({ redDice: 6 })] })
 */
export function createMinimalAttacker(
  overrides: Partial<AttackerConfig> = {}
): AttackerConfig {
  return {
    weapons: [createMinimalWeapon()],
    surgeChart: AttackSurgeChart.None,
    aimTokens: 0,
    surgeTokens: 0,
    observationTokens: 0,
    dodgeTokensAttacker: 0,
    preciseX: 0,
    sharpshooterX: 0,
    arsenalX: 0,
    marksman: false,
    marksmanStrategy: MarksmanStrategy.Deterministic,
    rerollStrategy: RerollStrategy.Conservative,
    jediHunter: false,
    jarKaiMastery: false,
    duelistAttacker: false,
    makashiMastery: false,
    deathFromAbove: false,
    holdTheLine: false,
    completeTheMission: false,
    unitCost: 0,
    defeatedMinis: 0,
    ...overrides,
  };
}

/**
 * Convenience: create an attacker with a single weapon.
 * Merges weapon-level and unit-level overrides:
 *
 *   createAttackerWithWeapon(
 *     { redDice: 6, keywords: { pierceX: 3, impactX: 3 } },
 *     { surgeChart: AttackSurgeChart.ToCrit, preciseX: 1 }
 *   )
 */
export function createAttackerWithWeapon(
  weaponOverrides?: Partial<Omit<WeaponProfile, 'keywords'>> & { keywords?: Partial<WeaponKeywords> },
  unitOverrides?: Partial<Omit<AttackerConfig, 'weapons'>>
): AttackerConfig {
  return createMinimalAttacker({
    weapons: [createMinimalWeapon(weaponOverrides)],
    ...unitOverrides,
  });
}

/**
 * Create a minimal aggregated weapon keywords object for testing
 * step functions that take poolKeywords directly.
 */
export function createMinimalPoolKeywords(
  overrides: Partial<AggregatedWeaponKeywords> = {}
): AggregatedWeaponKeywords {
  return {
    criticalX: 0,
    lethalX: 0,
    pierceX: 0,
    impactX: 0,
    ramX: 0,
    blast: false,
    suppressive: false,
    highVelocity: false,
    immuneDeflect: false,
    primitive: false,
    ionX: 0,
    blackOps: false,
    krakenBlaster: false,
    ...overrides,
  };
}

/**
 * Helper to create a minimal valid defender config for testing.
 * Provides all required fields with sensible defaults, allowing specific
 * overrides for the test scenario.
 */
export function createMinimalDefender(overrides: Partial<DefenderConfig> = {}): DefenderConfig {
  return {
    dieColor: DefenseDieColor.White,
    surgeChart: DefenseSurgeChart.None,
    coverType: CoverType.None,
    coverX: 0,
    smokeTokens: 0,
    suppressed: false,
    dodgeTokens: 0,
    surgeTokens: 0,
    suppressionTokens: 0,
    minisInLOS: 1,
    armorX: 0,
    weakPointX: 0,
    immunePierce: false,
    immuneMeleePierce: false,
    immuneBlast: false,
    immuneMelee: false,
    impervious: false,
    dangerSenseX: 0,
    uncannyLuckX: 0,
    block: false,
    deflect: false,
    shienMastery: false,
    outmaneuver: false,
    lowProfile: false,
    shieldedX: 0,
    djemSoMastery: false,
    soresuMastery: false,
    duelistDefender: false,
    backup: false,
    holdTheLine: false,
    dugIn: false,
    completeTheMission: false,
    katarnPatternArmor: false,
    guardianX: 0,
    unitCost: 0,
    ...overrides,
  };
}
