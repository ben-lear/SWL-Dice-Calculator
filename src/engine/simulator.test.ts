import { describe, it, expect } from 'vitest';
import { simulate, DEFAULT_ITERATIONS } from './simulator';
import type { AttackConfig, WeaponProfile } from './types';
import {
  DefenseDieColor,
  AttackSurgeChart,
  DefenseSurgeChart,
  CoverType,
  AttackType,
  MarksmanStrategy,
  RerollStrategy,
} from './types';

// ============================================================================
// Test Config Factory
// ============================================================================

/**
 * Creates a minimal valid WeaponProfile.
 */
function createWeapon(
  redDice = 0,
  blackDice = 0,
  whiteDice = 0,
  keywords: Partial<WeaponProfile['keywords']> = {}
): WeaponProfile {
  return {
    redDice,
    blackDice,
    whiteDice,
    keywords: {
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
      spray: false,
      cumbersome: false,
      antiMaterielX: 0,
      antiPersonnelX: 0,
      sidearmMelee: false,
      sidearmRanged: false,
      ...keywords,
    },
  };
}

/**
 * Creates a minimal valid AttackConfig with all defaults.
 * Override specific fields as needed.
 */
function createTestConfig(overrides?: {
  attacker?: Partial<AttackConfig['attacker']>;
  defender?: Partial<AttackConfig['defender']>;
  attackType?: AttackType;
  weapons?: WeaponProfile[];
}): AttackConfig {
  return {
    attacker: {
      weapons: overrides?.weapons ?? [],
      surgeChart: AttackSurgeChart.None,
      aimTokens: 0,
      surgeTokens: 0,
      observationTokens: 0,
      dodgeTokensAttacker: 0,
      preciseX: 0,
      sharpshooterX: 0,
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
      ...overrides?.attacker,
      arsenalX: overrides?.attacker?.arsenalX ?? 0,
    },
    defender: {
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
      guardianX: 0,
      completeTheMission: false,
      unitCost: 0,
      ...overrides?.defender,
    },
    attackType: overrides?.attackType ?? AttackType.Ranged,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('simulate', () => {
  it('returns a valid SimulationResult', () => {
    const config = createTestConfig({
      weapons: [createWeapon(2, 0, 0)],
    });
    const result = simulate(config, 100);

    expect(result.iterations).toBe(100);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.totalWounds.mean).toBeGreaterThanOrEqual(0);
    expect(result.totalWoundsDistribution.length).toBeGreaterThan(0);
    expect(result.totalWoundsDistribution[0].cumulative).toBe(1.0);
  });

  it('zero dice produces zero wounds', () => {
    const config = createTestConfig(); // No weapons
    const result = simulate(config, 1000);

    expect(result.totalWounds.mean).toBe(0);
    expect(result.totalWounds.max).toBe(0);
    expect(result.totalWoundsDistribution).toHaveLength(1);
    expect(result.totalWoundsDistribution[0].wounds).toBe(0);
    expect(result.totalWoundsDistribution[0].probability).toBe(1.0);
  });

  it('more dice produces more wounds on average', () => {
    const configLow = createTestConfig({
      weapons: [createWeapon(1, 0, 0)],
      defender: { dieColor: DefenseDieColor.White },
    });
    const configHigh = createTestConfig({
      weapons: [createWeapon(6, 0, 0)],
      defender: { dieColor: DefenseDieColor.White },
    });

    const resultLow = simulate(configLow, 5000);
    const resultHigh = simulate(configHigh, 5000);

    expect(resultHigh.totalWounds.mean).toBeGreaterThan(resultLow.totalWounds.mean);
  });

  it('distribution probabilities sum to approximately 1.0', () => {
    const config = createTestConfig({
      weapons: [createWeapon(4, 0, 0)],
    });
    const result = simulate(config, 5000);

    const totalProb = result.totalWoundsDistribution.reduce(
      (sum, entry) => sum + entry.probability, 0
    );
    expect(totalProb).toBeCloseTo(1.0, 5);
  });

  it('cumulative probability is monotonically non-increasing', () => {
    const config = createTestConfig({
      weapons: [createWeapon(0, 3, 0)],
    });
    const result = simulate(config, 5000);

    for (let i = 1; i < result.totalWoundsDistribution.length; i++) {
      expect(result.totalWoundsDistribution[i].cumulative)
        .toBeLessThanOrEqual(result.totalWoundsDistribution[i - 1].cumulative);
    }
  });

  it('computes efficiency metrics when unit costs are set', () => {
    const config = createTestConfig({
      weapons: [createWeapon(4, 0, 0)],
      attacker: { unitCost: 200 },
      defender: { dieColor: DefenseDieColor.White, unitCost: 50 },
    });
    const result = simulate(config, 5000);

    expect(result.efficiency.attackerWoundsPerPoint).toBeGreaterThan(0);
    expect(result.efficiency.attackerPointsPerWound).toBeGreaterThan(0);
    expect(result.efficiency.defenderWoundsPerPoint).toBeGreaterThan(0);
    expect(result.efficiency.defenderPointsPerWound).toBeGreaterThan(0);
    expect(result.efficiency.attackerEfficiencyRatio).toBeGreaterThan(0);
  });

  it('returns zero efficiency when costs are zero', () => {
    const config = createTestConfig({
      weapons: [createWeapon(4, 0, 0)],
      attacker: { unitCost: 0 },
      defender: { unitCost: 0 },
    });
    const result = simulate(config, 100);

    expect(result.efficiency.attackerWoundsPerPoint).toBe(0);
    expect(result.efficiency.defenderWoundsPerPoint).toBe(0);
    expect(result.efficiency.attackerEfficiencyRatio).toBe(0);
  });

  it('default iterations constant is 10,000', () => {
    expect(DEFAULT_ITERATIONS).toBe(10_000);
  });

  it('deflect/djemSo stats are populated (even if zero)', () => {
    const config = createTestConfig({
      weapons: [createWeapon(2, 0, 0)],
    });
    const result = simulate(config, 100);

    expect(result.deflectWounds).toBeDefined();
    expect(result.deflectWoundsDistribution).toBeDefined();
    expect(result.djemSoWounds).toBeDefined();
    expect(result.djemSoWoundsDistribution).toBeDefined();
  });

  it('suppression per attack is at least 1', () => {
    const config = createTestConfig({
      weapons: [createWeapon(1, 0, 0)],
    });
    const result = simulate(config, 100);
    expect(result.suppressionPerAttack).toBeGreaterThanOrEqual(1);
  });

  it('suppressive keyword adds +1 suppression', () => {
    const config = createTestConfig({
      weapons: [createWeapon(1, 0, 0, { suppressive: true })],
    });
    const result = simulate(config, 100);
    expect(result.suppressionPerAttack).toBe(2);
  });
});

// ============================================================================
// Statistical Validation Tests
// ============================================================================

describe('simulate — statistical validation', () => {
  /**
   * Known scenario: 1 red attack die vs white defense.
   * Red die: 5/8 hit, 1/8 crit, 1/8 surge(→blank), 1/8 blank
   * White defense: 1/6 block, 1/6 surge(→blank), 4/6 blank
   * Expected mean wounds ≈ 0.625 with no surge conversion
   */
  it('1 red die vs white defense, no surge conversion: mean ≈ 0.625', () => {
    const config = createTestConfig({
      weapons: [createWeapon(1, 0, 0)],
      attacker: {
        surgeChart: AttackSurgeChart.None,
      },
      defender: {
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
      },
    });

    // Use high iteration count for statistical accuracy
    const result = simulate(config, 50_000);

    // With no surge conversion:
    // P(hit or crit) = P(hit) + P(crit) = 5/8 + 1/8 = 6/8 = 0.75
    // Defender rolls 1 white die per remaining hit/crit
    // White defense: 1/6 block, so P(wound) = 0.75 * (1 - 1/6) = 0.75 * 5/6 ≈ 0.625
    expect(result.totalWounds.mean).toBeCloseTo(0.625, 1);
  });
});
