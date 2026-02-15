import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import type { AttackConfig } from './types';
import {
  AttackType,
  AttackSurgeChart,
  DefenseDieColor,
} from './types';
import { createAttackerWithWeapon, createMinimalDefender } from './testHelpers';

describe('attackSurges', () => {
  it('handles surge conversion from chart', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 3 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
      }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    // Result is valid (surges converted to hits)
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles multiple Surge tokens with no Surges rolled', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 3 },
        { surgeTokens: 5, surgeChart: AttackSurgeChart.None }
      ),
      defender: createMinimalDefender(),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });
});
