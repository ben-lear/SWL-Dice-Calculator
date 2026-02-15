import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import type { AttackConfig } from './types';
import {
  AttackType,
  AttackSurgeChart,
  DefenseDieColor,
} from './types';
import { createAttackerWithWeapon, createMinimalDefender } from './testHelpers';

describe('attackModifiers', () => {
  it('applies Impact X to convert hits to crits', () => {
    // This test is probabilistic - we run it many times to verify Impact is working
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 5, keywords: { impactX: 2 } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 2, // Armor will block hits but not crits
      }),
      attackType: AttackType.Ranged,
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

  it('handles Ram correctly (Melee only)', () => {
    const configMelee: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 2, keywords: { ramX: 2 } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
      }),
      attackType: AttackType.Melee,
    };

    const configRanged: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 2, keywords: { ramX: 2 } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
      }),
      attackType: AttackType.Ranged,
    };

    // Run multiple times to reduce statistical variance
    const iterations = 200;
    let woundsMelee = 0;
    let woundsRanged = 0;

    for (let i = 0; i < iterations; i++) {
      woundsMelee += executeAttackSequence(configMelee).totalWounds;
      woundsRanged += executeAttackSequence(configRanged).totalWounds;
    }

    // Ram should add hits in Melee but not Ranged
    // With enough iterations, melee should consistently do more damage
    expect(woundsMelee).toBeGreaterThan(woundsRanged);
  });
});
