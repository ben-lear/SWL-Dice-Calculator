import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import type { AttackConfig } from './types';
import {
  AttackType,
  AttackSurgeChart,
  CoverType,
} from './types';
import { createAttackerWithWeapon, createMinimalDefender } from './testHelpers';

describe('cover', () => {
  it('applies Cover correctly', () => {
    const configWithCover: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 5 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        coverType: CoverType.Heavy,
      }),
      attackType: AttackType.Ranged,
    };

    const configNoCover: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 5 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        coverType: CoverType.None,
      }),
      attackType: AttackType.Ranged,
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
});
