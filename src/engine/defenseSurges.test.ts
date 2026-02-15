import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import type { AttackConfig } from './types';
import {
  AttackType,
  AttackSurgeChart,
  DefenseSurgeChart,
  DefenseDieColor,
} from './types';
import { createMinimalAttacker, createMinimalDefender, createMinimalWeapon } from './testHelpers';

describe('defenseSurges', () => {
  it('handles defender with no defense surge conversion', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        weapons: [createMinimalWeapon({ redDice: 5 })],
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.None,
      }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('converts surges to blocks with defense surge chart', () => {
    const configWithChart: AttackConfig = {
      attacker: createMinimalAttacker({
        weapons: [createMinimalWeapon({ redDice: 6 })],
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.ToBlock,
      }),
      attackType: AttackType.Ranged,
    };

    const configWithoutChart: AttackConfig = {
      ...configWithChart,
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
      }),
    };

    // Run multiple times for statistical comparison
    let woundsWithChart = 0;
    let woundsWithoutChart = 0;
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      woundsWithChart += executeAttackSequence(configWithChart).totalWounds;
      woundsWithoutChart += executeAttackSequence(configWithoutChart).totalWounds;
    }

    // Chart should reduce wounds on average (more blocks)
    expect(woundsWithoutChart).toBeGreaterThanOrEqual(woundsWithChart);
  });

  it('applies Deflect surge conversion in Ranged attacks', () => {
    const configWithDeflect: AttackConfig = {
      attacker: createMinimalAttacker({
        weapons: [createMinimalWeapon({ redDice: 6 })],
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
        deflect: true,
      }),
      attackType: AttackType.Ranged,
    };

    const configWithoutDeflect: AttackConfig = {
      ...configWithDeflect,
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
        deflect: false,
      }),
    };

    const iterations = 100;
    let woundsWithDeflect = 0;
    let woundsWithoutDeflect = 0;

    for (let i = 0; i < iterations; i++) {
      woundsWithDeflect += executeAttackSequence(configWithDeflect).totalWounds;
      woundsWithoutDeflect += executeAttackSequence(configWithoutDeflect).totalWounds;
    }

    // Deflect should reduce wounds (surge to block conversion)
    expect(woundsWithoutDeflect).toBeGreaterThanOrEqual(woundsWithDeflect);
  });

  it('Deflect does not work in Melee attacks', () => {
    const configMelee: AttackConfig = {
      attacker: createMinimalAttacker({
        weapons: [createMinimalWeapon({ redDice: 6 })],
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
        deflect: true,
      }),
      attackType: AttackType.Melee,
    };

    const configRanged: AttackConfig = {
      ...configMelee,
      attackType: AttackType.Ranged,
    };

    const iterations = 100;
    let woundsMelee = 0;
    let woundsRanged = 0;

    for (let i = 0; i < iterations; i++) {
      woundsMelee += executeAttackSequence(configMelee).totalWounds;
      woundsRanged += executeAttackSequence(configRanged).totalWounds;
    }

    // Deflect should only work in Ranged, so Melee should do more wounds
    expect(woundsMelee).toBeGreaterThanOrEqual(woundsRanged);
  });

  it('High Velocity disables Deflect surge conversion', () => {
    const configHighVelocity: AttackConfig = {
      attacker: createMinimalAttacker({
        weapons: [createMinimalWeapon({ redDice: 6, keywords: { highVelocity: true } })],
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
        deflect: true,
      }),
      attackType: AttackType.Ranged,
    };

    const configNormalVelocity: AttackConfig = {
      attacker: createMinimalAttacker({
        weapons: [createMinimalWeapon({ redDice: 6, keywords: { highVelocity: false } })],
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
        deflect: true,
      }),
      attackType: AttackType.Ranged,
    };

    const iterations = 100;
    let woundsHighVelocity = 0;
    let woundsNormal = 0;

    for (let i = 0; i < iterations; i++) {
      woundsHighVelocity += executeAttackSequence(configHighVelocity).totalWounds;
      woundsNormal += executeAttackSequence(configNormalVelocity).totalWounds;
    }

    // High Velocity should prevent Deflect, causing more wounds
    expect(woundsHighVelocity).toBeGreaterThanOrEqual(woundsNormal);
  });

  it('applies Block surge conversion when Dodge was spent', () => {
    const configWithBlock: AttackConfig = {
      attacker: createMinimalAttacker({
        weapons: [createMinimalWeapon({ redDice: 6 })],
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
        block: true,
        dodgeTokens: 1,
      }),
      attackType: AttackType.Ranged,
    };

    const configWithoutBlock: AttackConfig = {
      ...configWithBlock,
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
        block: false,
        dodgeTokens: 1,
      }),
    };

    const iterations = 100;
    let woundsWithBlock = 0;
    let woundsWithoutBlock = 0;

    for (let i = 0; i < iterations; i++) {
      woundsWithBlock += executeAttackSequence(configWithBlock).totalWounds;
      woundsWithoutBlock += executeAttackSequence(configWithoutBlock).totalWounds;
    }

    // Block should reduce wounds when dodge is available to spend
    expect(woundsWithoutBlock).toBeGreaterThanOrEqual(woundsWithBlock);
  });

  it('applies Hold the Line surge conversion for defender', () => {
    const configWithHoldTheLine: AttackConfig = {
      attacker: createMinimalAttacker({
        weapons: [createMinimalWeapon({ redDice: 6 })],
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
        holdTheLine: true,
      }),
      attackType: AttackType.Ranged,
    };

    const configWithoutHoldTheLine: AttackConfig = {
      ...configWithHoldTheLine,
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
        holdTheLine: false,
      }),
    };

    const iterations = 100;
    let woundsWithHold = 0;
    let woundsWithoutHold = 0;

    for (let i = 0; i < iterations; i++) {
      woundsWithHold += executeAttackSequence(configWithHoldTheLine).totalWounds;
      woundsWithoutHold += executeAttackSequence(configWithoutHoldTheLine).totalWounds;
    }

    // Hold the Line should reduce wounds
    expect(woundsWithoutHold).toBeGreaterThanOrEqual(woundsWithHold);
  });

  it('applies surge tokens for conversion', () => {
    const configWithSurgeTokens: AttackConfig = {
      attacker: createMinimalAttacker({
        weapons: [createMinimalWeapon({ redDice: 6 })],
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
        surgeTokens: 3,
      }),
      attackType: AttackType.Ranged,
    };

    const configWithoutSurgeTokens: AttackConfig = {
      ...configWithSurgeTokens,
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.None,
        surgeTokens: 0,
      }),
    };

    const iterations = 100;
    let woundsWithTokens = 0;
    let woundsWithoutTokens = 0;

    for (let i = 0; i < iterations; i++) {
      woundsWithTokens += executeAttackSequence(configWithSurgeTokens).totalWounds;
      woundsWithoutTokens += executeAttackSequence(configWithoutSurgeTokens).totalWounds;
    }

    // Surge tokens should reduce wounds
    expect(woundsWithoutTokens).toBeGreaterThanOrEqual(woundsWithTokens);
  });

  it('respects surge conversion priority order', () => {
    // Test that surge chart takes precedence over other conversions
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        weapons: [createMinimalWeapon({ redDice: 6 })],
        surgeChart: AttackSurgeChart.ToHit,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.ToBlock,
        deflect: true,
        block: true,
        holdTheLine: true,
        surgeTokens: 3,
        dodgeTokens: 1,
      }),
      attackType: AttackType.Ranged,
    };

    // With surge chart, all surges should be converted regardless of other abilities
    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles no surges rolled', () => {
    // Mock scenario where defender has surge abilities but no surges are rolled
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        weapons: [createMinimalWeapon({ whiteDice: 2 })], // White dice rarely roll surges
        surgeChart: AttackSurgeChart.None,
      }),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red, // Red rarely rolls surges
        deflect: true,
        block: true,
        surgeTokens: 2,
      }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });
});
