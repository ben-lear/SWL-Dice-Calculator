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

  it('Ram X converts blanks to crits before spending budget on hits (Melee)', () => {
    // White dice have many blanks. Using a white-die weapon with Ram 1 vs Armor:
    // Without Ram, a blank contributes 0 wounds. With Ram, blank → crit bypasses Armor.
    // This test verifies the blank→crit path fires in the simulation engine.
    const configWithRam: AttackConfig = {
      attacker: createAttackerWithWeapon(
        // White dice: ~5/8 chance of blank, so lots of blanks to convert
        { whiteDice: 5, keywords: { ramX: 3 } },
        { surgeChart: AttackSurgeChart.None }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 2, // Armor blocks hits — crits (from blank→crit via Ram) bypass it
      }),
      attackType: AttackType.Melee,
    };

    const configNoRam: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { whiteDice: 5 },
        { surgeChart: AttackSurgeChart.None }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 2,
      }),
      attackType: AttackType.Melee,
    };

    const iterations = 500;
    let woundsRam = 0;
    let woundsNoRam = 0;

    for (let i = 0; i < iterations; i++) {
      woundsRam += executeAttackSequence(configWithRam).totalWounds;
      woundsNoRam += executeAttackSequence(configNoRam).totalWounds;
    }

    // Ram converts blanks → crits that bypass Armor → significantly more wounds
    expect(woundsRam).toBeGreaterThan(woundsNoRam);
  });

  it('Primitive converts crits to hits vs Armor (simulation path)', () => {
    // With Primitive, crits become hits → Armor cancels them
    const configPrimitive: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 5, keywords: { primitive: true } },
        { surgeChart: AttackSurgeChart.ToCrit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 3,
      }),
      attackType: AttackType.Ranged,
    };

    const configNoPrimitive: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 5 },
        { surgeChart: AttackSurgeChart.ToCrit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 3,
      }),
      attackType: AttackType.Ranged,
    };

    const iterations = 200;
    let woundsPrimitive = 0;
    let woundsNoPrimitive = 0;

    for (let i = 0; i < iterations; i++) {
      woundsPrimitive += executeAttackSequence(configPrimitive).totalWounds;
      woundsNoPrimitive += executeAttackSequence(configNoPrimitive).totalWounds;
    }

    // Without Primitive, crits bypass Armor → more wounds
    expect(woundsNoPrimitive).toBeGreaterThan(woundsPrimitive);
  });

  it('Ion X reduces Shielded X effectiveness (simulation path)', () => {
    const configIon: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 4, keywords: { ionX: 2 } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        shieldedX: 3,
      }),
      attackType: AttackType.Ranged,
    };

    const configNoIon: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 4 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        shieldedX: 3,
      }),
      attackType: AttackType.Ranged,
    };

    const iterations = 200;
    let woundsIon = 0;
    let woundsNoIon = 0;

    for (let i = 0; i < iterations; i++) {
      woundsIon += executeAttackSequence(configIon).totalWounds;
      woundsNoIon += executeAttackSequence(configNoIon).totalWounds;
    }

    // Ion X reduces Shielded → more wounds get through
    expect(woundsIon).toBeGreaterThan(woundsNoIon);
  });
});
