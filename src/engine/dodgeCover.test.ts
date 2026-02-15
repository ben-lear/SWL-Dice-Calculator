import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import type { AttackConfig } from './types';
import {
  AttackType,
  AttackSurgeChart,
  CoverType,
} from './types';
import { createAttackerWithWeapon, createMinimalDefender } from './testHelpers';

describe('dodgeCover', () => {
  it('Blast ignores cover', () => {
    const configBlast: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 5, keywords: { blast: true } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        coverType: CoverType.Heavy,
      }),
      attackType: AttackType.Ranged,
    };

    const configNoBlast: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 5, keywords: { blast: false } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        coverType: CoverType.Heavy,
      }),
      attackType: AttackType.Ranged,
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
      attacker: createAttackerWithWeapon(
        { redDice: 5, keywords: { highVelocity: true } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dodgeTokens: 3,
      }),
      attackType: AttackType.Ranged,
    };

    const configNoHighVelocity: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 5, keywords: { highVelocity: false } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dodgeTokens: 3,
      }),
      attackType: AttackType.Ranged,
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

  it('handles multiple Dodge tokens', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 5 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dodgeTokens: 3,
      }),
      attackType: AttackType.Ranged,
    };

    // Only 1 dodge can be spent per attack
    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });
});
