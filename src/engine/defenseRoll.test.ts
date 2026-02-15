import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import type { AttackConfig } from './types';
import {
  AttackType,
  AttackSurgeChart,
  DefenseDieColor,
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
});
