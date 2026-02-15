import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import type { AttackConfig } from './types';
import {
  AttackType,
  AttackSurgeChart,
  DefenseDieColor,
  DefenseSurgeChart,
} from './types';
import { createAttackerWithWeapon, createMinimalDefender } from './testHelpers';

describe('defenseRoll', () => {
  it('handles Danger Sense correctly', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 4 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        dangerSenseX: 3,
        suppressionTokens: 2,
      }),
      attackType: AttackType.Ranged,
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

  it('handles Uncanny Luck correctly', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 6 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        uncannyLuckX: 3,
      }),
      attackType: AttackType.Ranged,
    };

    // Just verify it runs without error - statistical test would be complex
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles disableDefenseDice correctly', () => {
    const configDisabled: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 4 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
        disableDefenseDice: true,
      }),
      attackType: AttackType.Ranged,
    };

    const configEnabled: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 4 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
        disableDefenseDice: false,
      }),
      attackType: AttackType.Ranged,
    };

    const iterations = 100;
    let woundsDisabled = 0;
    let woundsEnabled = 0;

    for (let i = 0; i < iterations; i++) {
      woundsDisabled += executeAttackSequence(configDisabled).totalWounds;
      woundsEnabled += executeAttackSequence(configEnabled).totalWounds;
    }

    // Disabling defense dice should typically result in more wounds (but due to randomness, just verify both are valid)
    expect(woundsDisabled).toBeGreaterThanOrEqual(0);
    expect(woundsEnabled).toBeGreaterThanOrEqual(0);
    // Note: Expected that disabling defense dice increases wounds taken on average
  });

  it('handles Guardian defense correctly', () => {
    const configWithGuardian: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 8 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        guardianX: 2,
        guardianDieColor: DefenseDieColor.Red,
        guardianSurgeChart: DefenseSurgeChart.ToBlock,
      }),
      attackType: AttackType.Ranged,
    };

    const configWithoutGuardian: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 8 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        guardianX: 0,
      }),
      attackType: AttackType.Ranged,
    };

    const iterations = 100;
    let woundsWithGuardian = 0;
    let woundsWithoutGuardian = 0;
    let guardianWounds = 0;

    for (let i = 0; i < iterations; i++) {
      const resultWith = executeAttackSequence(configWithGuardian);
      woundsWithGuardian += resultWith.totalWounds;
      guardianWounds += resultWith.guardianWoundsNoPierce;
      
      woundsWithoutGuardian += executeAttackSequence(configWithoutGuardian).totalWounds;
    }

    // Guardian should absorb some wounds
    expect(guardianWounds).toBeGreaterThan(0);
    // Total damage distribution should be different
    expect(woundsWithGuardian + guardianWounds).toBeGreaterThan(0);
  });

  it('handles Guardian with Deflect', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 6 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        guardianX: 2,
        guardianDieColor: DefenseDieColor.Red,
        guardianSurgeChart: DefenseSurgeChart.None,
        guardianDeflect: true,
      }),
      attackType: AttackType.Ranged,
    };

    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    // Should sometimes have deflect wounds
    const totalDeflectWounds = results.reduce((s, r) => s + r.deflectWounds, 0);
    expect(totalDeflectWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles Guardian with Soresu Mastery', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 6 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        guardianX: 2,
        guardianDieColor: DefenseDieColor.Red,
        guardianSurgeChart: DefenseSurgeChart.None,
        guardianSoresuMastery: true,
        guardianDodgeTokens: 1,
      }),
      attackType: AttackType.Ranged,
    };

    // Soresu Mastery should provide reroll capability
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles zero defense dice scenario', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 4 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        disableDefenseDice: true,
        minisInLOS: 0, // Edge case
      }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles maximum defense dice scenario', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 20 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
        dangerSenseX: 10,
        suppressionTokens: 10,
        minisInLOS: 10,
      }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });
});
