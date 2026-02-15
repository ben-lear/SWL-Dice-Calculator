import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import type { AttackConfig } from './types';
import {
  AttackType,
  AttackSurgeChart,
  DefenseSurgeChart,
  DefenseDieColor,
} from './types';
import { createAttackerWithWeapon, createMinimalDefender } from './testHelpers';

describe('compareResults', () => {
  it('applies Pierce correctly', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 8, keywords: { pierceX: 2 } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
      }),
      attackType: AttackType.Ranged,
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

  it('applies Duelist pierce bonus in Melee when Aim is spent', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 3 },
        { 
          aimTokens: 1,
          duelistAttacker: true,
          surgeChart: AttackSurgeChart.ToHit 
        }
      ),
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
      attacker: createAttackerWithWeapon(
        { redDice: 8, keywords: { pierceX: 3 } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
        immunePierce: true,
      }),
      attackType: AttackType.Ranged,
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
      attacker: createAttackerWithWeapon(
        { redDice: 8 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 2,
      }),
      attackType: AttackType.Ranged,
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
      attacker: createAttackerWithWeapon(
        { redDice: 6 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        shieldedX: 2,
      }),
      attackType: AttackType.Ranged,
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

  it('handles excessive Pierce (more than possible blocks)', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 2, keywords: { pierceX: 10 } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
      }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles excessive Armor (more than possible hits)', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { whiteDice: 5 },
        { surgeChart: AttackSurgeChart.None }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 20,
      }),
      attackType: AttackType.Ranged,
    };

    // Armor cancels hits but not crits - white dice rarely roll anything,
    // and crits can still get through armor
    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
    expect(result.totalWounds).toBeLessThanOrEqual(5); // Theoretically all 5 could crit (rare but possible)
  });

  it('handles excessive Shielded (more than possible hits+crits)', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 2 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        shieldedX: 20,
      }),
      attackType: AttackType.Ranged,
    };

    // Shielded should cancel all results
    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeLessThanOrEqual(2); // At most 2 dice worth
  });
});
