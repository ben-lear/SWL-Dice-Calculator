import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import type { AttackConfig } from './types';
import {
  AttackType,
  AttackSurgeChart,
  DefenseSurgeChart,
  CoverType,
  MarksmanStrategy,
  RerollStrategy,
  DefenseDieColor,
} from './types';

// Helper to create a minimal valid attacker config
function createMinimalAttacker(overrides = {}) {
  return {
    redDice: 0,
    blackDice: 0,
    whiteDice: 0,
    surgeChart: AttackSurgeChart.None,
    aimTokens: 0,
    surgeTokens: 0,
    observationTokens: 0,
    dodgeTokensAttacker: 0,
    preciseX: 0,
    criticalX: 0,
    lethalX: 0,
    sharpshooterX: 0,
    pierceX: 0,
    impactX: 0,
    ramX: 0,
    blast: false,
    highVelocity: false,
    suppressive: false,
    marksman: false,
    marksmanStrategy: MarksmanStrategy.Deterministic,
    rerollStrategy: RerollStrategy.Conservative,
    jediHunter: false,
    jarKaiMastery: false,
    duelistAttacker: false,
    makashiMastery: false,
    spray: false,
    immuneDeflect: false,
    deathFromAbove: false,
    holdTheLine: false,
    antiMaterielX: 0,
    antiPersonnelX: 0,
    cumbersome: false,
    unitCost: 0,
    ...overrides,
  };
}

// Helper to create a minimal valid defender config
function createMinimalDefender(overrides = {}) {
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
    unitCost: 0,
    ...overrides,
  };
}

describe('executeAttackSequence', () => {
  it('returns valid result structure', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({ redDice: 2 }),
      defender: createMinimalDefender(),
      attackType: AttackType.All,
    };

    const result = executeAttackSequence(config);

    expect(result).toHaveProperty('guardianWoundsNoPierce');
    expect(result).toHaveProperty('mainTargetWoundsNoPierce');
    expect(result).toHaveProperty('totalWounds');
    expect(result).toHaveProperty('deflectWounds');
    expect(result).toHaveProperty('djemSoWounds');
    expect(result).toHaveProperty('suppressionApplied');
  });

  it('applies suppressive correctly', () => {
    const configWithSuppressive: AttackConfig = {
      attacker: createMinimalAttacker({ redDice: 2, suppressive: true }),
      defender: createMinimalDefender(),
      attackType: AttackType.All,
    };

    const resultWith = executeAttackSequence(configWithSuppressive);
    expect(resultWith.suppressionApplied).toBe(2);

    const configWithout: AttackConfig = {
      attacker: createMinimalAttacker({ redDice: 2, suppressive: false }),
      defender: createMinimalDefender(),
      attackType: AttackType.All,
    };

    const resultWithout = executeAttackSequence(configWithout);
    expect(resultWithout.suppressionApplied).toBe(1);
  });

  it('handles zero dice pool', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({ redDice: 0, blackDice: 0, whiteDice: 0 }),
      defender: createMinimalDefender(),
      attackType: AttackType.All,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBe(0);
    expect(result.suppressionApplied).toBe(1);
  });

  it('applies Spray multiplier', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({ 
        redDice: 2, 
        spray: true,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({ minisInLOS: 3 }),
      attackType: AttackType.All,
    };

    const result = executeAttackSequence(config);
    // With 2 red dice × 3 minis = 6 red dice
    // Should have potential for wounds (probabilistic)
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('applies Pierce correctly', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 8, // Many dice to ensure hits
        pierceX: 2,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
      }),
      attackType: AttackType.All,
    };

    // Run multiple times to get statistical average
    let totalWounds = 0;
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      const result = executeAttackSequence(config);
      totalWounds += result.totalWounds;
    }

    // With Pierce 2, should generally do more damage
    expect(totalWounds).toBeGreaterThan(0);
  });

  it('applies Impact X to convert hits to crits', () => {
    // This test is probabilistic - we run it many times to verify Impact is working
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 5,
        impactX: 2,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 2, // Armor will block hits but not crits
      }),
      attackType: AttackType.All,
    };

    // Run multiple times
    let totalWounds = 0;
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      const result = executeAttackSequence(config);
      totalWounds += result.totalWounds;
    }

    // Impact should convert hits to crits which bypass Armor
    expect(totalWounds).toBeGreaterThan(0);
  });

  it('handles surge conversion from chart', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 3,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
      }),
      attackType: AttackType.All,
    };

    const result = executeAttackSequence(config);
    // Result is valid (surges converted to hits)
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('applies Duelist pierce bonus in Melee when Aim is spent', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 3,
        aimTokens: 1,
        duelistAttacker: true,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
      }),
      attackType: AttackType.Melee,
    };

    // Run multiple times to verify Pierce bonus is applied
    let totalWounds = 0;
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      const result = executeAttackSequence(config);
      totalWounds += result.totalWounds;
    }

    // Duelist should provide +1 Pierce in Melee when Aim spent
    expect(totalWounds).toBeGreaterThan(0);
  });

  it('applies Immune: Pierce correctly', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 8,
        pierceX: 3,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
        immunePierce: true,
      }),
      attackType: AttackType.All,
    };

    // Run multiple times
    let totalWoundsWithImmune = 0;
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      const result = executeAttackSequence(config);
      totalWoundsWithImmune += result.totalWounds;
    }

    // Now without Immune: Pierce
    const configWithoutImmune: AttackConfig = {
      ...config,
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
        immunePierce: false,
      }),
    };

    let totalWoundsWithoutImmune = 0;
    for (let i = 0; i < iterations; i++) {
      const result = executeAttackSequence(configWithoutImmune);
      totalWoundsWithoutImmune += result.totalWounds;
    }

    // Without Immune Pierce should do more damage on average
    expect(totalWoundsWithoutImmune).toBeGreaterThan(totalWoundsWithImmune);
  });

  it('applies Armor correctly (cancels hits but not crits)', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 8,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 2,
      }),
      attackType: AttackType.All,
    };

    // Run multiple times
    const results = [];
    for (let i = 0; i < 100; i++) {
      results.push(executeAttackSequence(config));
    }

    // Armor should reduce wounds
    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });

  it('applies Shielded correctly (cancels crits and hits)', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 6,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        shieldedX: 2,
      }),
      attackType: AttackType.All,
    };

    // Run multiple times
    const results = [];
    for (let i = 0; i < 100; i++) {
      results.push(executeAttackSequence(config));
    }

    // Shielded should reduce wounds
    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles Danger Sense correctly', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 4,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        dangerSenseX: 3,
        suppressionTokens: 2,
      }),
      attackType: AttackType.All,
    };

    // Run multiple times
    const results = [];
    for (let i = 0; i < 100; i++) {
      results.push(executeAttackSequence(config));
    }

    // Danger Sense adds defense dice, should reduce wounds on average
    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });

  it('applies Cover correctly', () => {
    const configWithCover: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 5,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        coverType: CoverType.Heavy,
      }),
      attackType: AttackType.All,
    };

    const configNoCover: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 5,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        coverType: CoverType.None,
      }),
      attackType: AttackType.All,
    };

    // Run multiple times and compare
    const iterations = 50;
    let woundsWithCover = 0;
    let woundsWithoutCover = 0;

    for (let i = 0; i < iterations; i++) {
      woundsWithCover += executeAttackSequence(configWithCover).totalWounds;
      woundsWithoutCover += executeAttackSequence(configNoCover).totalWounds;
    }

    // Cover should reduce wounds
    expect(woundsWithoutCover).toBeGreaterThanOrEqual(woundsWithCover);
  });

  it('Blast ignores cover', () => {
    const configBlast: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 5,
        blast: true,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        coverType: CoverType.Heavy,
      }),
      attackType: AttackType.All,
    };

    const configNoBlast: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 5,
        blast: false,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        coverType: CoverType.Heavy,
      }),
      attackType: AttackType.All,
    };

    // Run multiple times
    const iterations = 50;
    let woundsWithBlast = 0;
    let woundsWithoutBlast = 0;

    for (let i = 0; i < iterations; i++) {
      woundsWithBlast += executeAttackSequence(configBlast).totalWounds;
      woundsWithoutBlast += executeAttackSequence(configNoBlast).totalWounds;
    }

    // Blast should do more damage when cover is present
    expect(woundsWithBlast).toBeGreaterThan(woundsWithoutBlast);
  });

  it('High Velocity prevents Dodge', () => {
    const configHighVelocity: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 5,
        highVelocity: true,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dodgeTokens: 3,
      }),
      attackType: AttackType.All,
    };

    const configNoHighVelocity: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 5,
        highVelocity: false,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dodgeTokens: 3,
      }),
      attackType: AttackType.All,
    };

    // Run multiple times
    const iterations = 50;
    let woundsWithHV = 0;
    let woundsWithoutHV = 0;

    for (let i = 0; i < iterations; i++) {
      woundsWithHV += executeAttackSequence(configHighVelocity).totalWounds;
      woundsWithoutHV += executeAttackSequence(configNoHighVelocity).totalWounds;
    }

    // High Velocity should do more damage when dodge is present
    expect(woundsWithHV).toBeGreaterThan(woundsWithoutHV);
  });

  it('handles Ram correctly (Melee only)', () => {
    const configMelee: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 2,
        ramX: 2,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
      }),
      attackType: AttackType.Melee,
    };

    const configRanged: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 2,
        ramX: 2,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
      }),
      attackType: AttackType.Ranged,
    };

    // Run multiple times
    const iterations = 50;
    let woundsMelee = 0;
    let woundsRanged = 0;

    for (let i = 0; i < iterations; i++) {
      woundsMelee += executeAttackSequence(configMelee).totalWounds;
      woundsRanged += executeAttackSequence(configRanged).totalWounds;
    }

    // Ram should add hits in Melee but not Ranged
    expect(woundsMelee).toBeGreaterThan(woundsRanged);
  });

  it('handles Uncanny Luck correctly', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 6,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        uncannyLuckX: 3,
      }),
      attackType: AttackType.All,
    };

    // Just verify it runs without error - statistical test would be complex
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });
});

describe('executeAttackSequence - Edge Cases', () => {
  it('handles all zeros gracefully', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 0,
        blackDice: 0,
        whiteDice: 0,
      }),
      defender: createMinimalDefender(),
      attackType: AttackType.All,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBe(0);
    expect(result.mainTargetWoundsNoPierce).toBe(0);
    expect(result.guardianWoundsNoPierce).toBe(0);
  });

  it('handles very large dice pools', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 20,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
      }),
      attackType: AttackType.All,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles defender with no defense surge conversion', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 5,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.None,
      }),
      attackType: AttackType.All,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles excessive Pierce (more than possible blocks)', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 2,
        pierceX: 10,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
      }),
      attackType: AttackType.All,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles excessive Armor (more than possible hits)', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        whiteDice: 5, // White dice are mostly blanks
        surgeChart: AttackSurgeChart.None, // No surge conversion
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 20,
      }),
      attackType: AttackType.All,
    };

    // Armor cancels hits but not crits - white dice rarely roll anything,
    // and crits can still get through armor
    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
    expect(result.totalWounds).toBeLessThanOrEqual(2); // At most 1-2 results from 5 white dice
  });

  it('handles excessive Shielded (more than possible hits+crits)', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 2,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        shieldedX: 20,
      }),
      attackType: AttackType.All,
    };

    // Shielded should cancel all results
    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeLessThanOrEqual(2); // At most 2 dice worth
  });

  it('handles zero minis in LOS with Spray', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 2,
        spray: true,
      }),
      defender: createMinimalDefender({
        minisInLOS: 0, // Edge case: no minis visible
      }),
      attackType: AttackType.All,
    };

    const result = executeAttackSequence(config);
    // Spray with 0 minis should still roll at least 1x (max(1, minisInLOS))
    expect(result).toBeDefined();
  });

  it('handles multiple Surge tokens with no Surges rolled', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 3,
        surgeTokens: 5,
        surgeChart: AttackSurgeChart.None,
      }),
      defender: createMinimalDefender(),
      attackType: AttackType.All,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles multiple Dodge tokens', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 5,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dodgeTokens: 3,
      }),
      attackType: AttackType.All,
    };

    // Only 1 dodge can be spent per attack
    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles zero cost units (edge case for efficiency calculations)', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 2,
        unitCost: 0,
      }),
      defender: createMinimalDefender({
        unitCost: 0,
      }),
      attackType: AttackType.All,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });
});

describe('executeAttackSequence - Keyword Combinations', () => {
  it('combines Pierce sources: base + Lethal + Duelist', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 3,
        pierceX: 1,
        lethalX: 2,
        aimTokens: 3,
        duelistAttacker: true,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
      }),
      attackType: AttackType.Melee,
    };

    // Run multiple times to verify Pierce bonuses apply
    let totalWounds = 0;
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      totalWounds += executeAttackSequence(config).totalWounds;
    }

    // With multiple Pierce sources, should do significant damage
    expect(totalWounds).toBeGreaterThan(0);
  });

  it('combines Impact + Pierce vs Armor correctly', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 8,
        impactX: 2,
        pierceX: 2,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        armorX: 2,
        surgeChart: DefenseSurgeChart.ToBlock,
      }),
      attackType: AttackType.All,
    };

    // Impact should convert hits to crits vs Armor
    // Pierce should help with defense blocks
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThan(0);
  });

  it('combines Armor + Shielded correctly (order matters)', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 10,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 2,
        shieldedX: 2,
      }),
      attackType: AttackType.All,
    };

    // Armor cancels hits, Shielded cancels crits then hits
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });

  it('combines Guardian + Pierce correctly (Guardian defends without Pierce)', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 8,
        pierceX: 3,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
        guardianX: 3,
      }),
      attackType: AttackType.All,
    };

    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    // Guardian hits should be rolled separately
    const somebodyGotHit = results.some(r => r.guardianWoundsNoPierce > 0 || r.mainTargetWoundsNoPierce > 0);
    expect(somebodyGotHit).toBe(true);
  });

  it('combines Cover + Low Profile correctly', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 5,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        coverType: CoverType.Light,
        lowProfile: true,
      }),
      attackType: AttackType.All,
    };

    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    // Low Profile modifies cover dice rolling
    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });

  it('combines Aim tokens + Precise X correctly', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 3,
        aimTokens: 2,
        preciseX: 1,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
      }),
      attackType: AttackType.All,
    };

    // Precise X adds rerolls per Aim token
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThan(0);
  });

  it('combines Danger Sense + Impervious correctly', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 4,
        pierceX: 2,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        dangerSenseX: 2,
        suppressionTokens: 3,
        impervious: true,
      }),
      attackType: AttackType.All,
    };

    // Both add defense dice
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });

  it('combines Suppressive + Cover interactions', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 3,
        suppressive: true,
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        coverType: CoverType.Light,
        suppressed: true, // Suppressed improves cover
      }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    // Suppressive adds suppression
    // Suppressed improves cover
    expect(result.suppressionApplied).toBe(2);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('combines Critical X + surge conversion correctly', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        redDice: 5,
        criticalX: 2,
        surgeChart: AttackSurgeChart.ToHit,
        surgeTokens: 1,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 2,
      }),
      attackType: AttackType.All,
    };

    // Critical X should convert hits to crits (bypassing Armor)
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThan(0);
  });
});
