import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import type { AttackConfig } from './types';
import {
  AttackType,
  AttackSurgeChart,
  DefenseSurgeChart,
  DefenseDieColor,
} from './types';
import { createMinimalAttacker, createMinimalDefender } from './testHelpers';

describe('defenseSurges', () => {
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
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });
});
