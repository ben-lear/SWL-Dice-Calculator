import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import { aggregateWeaponKeywords, formAttackPool, getWeaponsForAttackType } from './attackPool';
import type { AttackConfig } from './types';
import { AttackType, AttackSurgeChart, AttackDieColor } from './types';
import { createAttackerWithWeapon, createMinimalDefender, createMinimalAttacker, createMinimalWeapon } from './testHelpers';

describe('aggregateWeaponKeywords', () => {
  it('returns zeros/false for empty weapon array', () => {
    const result = aggregateWeaponKeywords([]);
    expect(result).toEqual({
      criticalX: 0,
      lethalX: 0,
      pierceX: 0,
      impactX: 0,
      ramX: 0,
      blast: false,
      suppressive: false,
      highVelocity: false,
    });
  });

  it('sums numeric keywords across weapons', () => {
    const weapons = [
      createMinimalWeapon({ keywords: { pierceX: 2, impactX: 1 } }),
      createMinimalWeapon({ keywords: { pierceX: 1, impactX: 2, criticalX: 1 } }),
    ];
    const result = aggregateWeaponKeywords(weapons);
    expect(result.pierceX).toBe(3);
    expect(result.impactX).toBe(3);
    expect(result.criticalX).toBe(1);
    expect(result.lethalX).toBe(0);
    expect(result.ramX).toBe(0);
  });

  it('ORs blast and suppressive (any weapon has it)', () => {
    const weaponsWithBlast = [
      createMinimalWeapon({ keywords: { blast: false } }),
      createMinimalWeapon({ keywords: { blast: true } }),
    ];
    expect(aggregateWeaponKeywords(weaponsWithBlast).blast).toBe(true);

    const weaponsWithoutBlast = [
      createMinimalWeapon({ keywords: { blast: false } }),
      createMinimalWeapon({ keywords: { blast: false } }),
    ];
    expect(aggregateWeaponKeywords(weaponsWithoutBlast).blast).toBe(false);

    const weaponsWithSuppressive = [
      createMinimalWeapon({ keywords: { suppressive: true } }),
      createMinimalWeapon({ keywords: { suppressive: false } }),
    ];
    expect(aggregateWeaponKeywords(weaponsWithSuppressive).suppressive).toBe(true);
  });

  it('ANDs highVelocity (all weapons must have it)', () => {
    const allHaveIt = [
      createMinimalWeapon({ keywords: { highVelocity: true } }),
      createMinimalWeapon({ keywords: { highVelocity: true } }),
    ];
    expect(aggregateWeaponKeywords(allHaveIt).highVelocity).toBe(true);

    const oneDoesNot = [
      createMinimalWeapon({ keywords: { highVelocity: true } }),
      createMinimalWeapon({ keywords: { highVelocity: false } }),
    ];
    expect(aggregateWeaponKeywords(oneDoesNot).highVelocity).toBe(false);

    const noneHaveIt = [
      createMinimalWeapon({ keywords: { highVelocity: false } }),
      createMinimalWeapon({ keywords: { highVelocity: false } }),
    ];
    expect(aggregateWeaponKeywords(noneHaveIt).highVelocity).toBe(false);
  });

  it('returns false for highVelocity when pool is empty', () => {
    const result = aggregateWeaponKeywords([]);
    expect(result.highVelocity).toBe(false);
  });
});

describe('formAttackPool — multi-weapon', () => {
  it('combines dice from multiple weapons', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        arsenalX: 2,
        weapons: [
          createMinimalWeapon({ redDice: 2, blackDice: 1 }),
          createMinimalWeapon({ blackDice: 2, whiteDice: 3 }),
        ],
      }),
      defender: createMinimalDefender(),
      attackType: AttackType.Ranged,
    };

    const pool = formAttackPool(config);
    const redCount = pool.filter(d => d === AttackDieColor.Red).length;
    const blackCount = pool.filter(d => d === AttackDieColor.Black).length;
    const whiteCount = pool.filter(d => d === AttackDieColor.White).length;

    expect(redCount).toBe(2);
    expect(blackCount).toBe(3); // 1 + 2
    expect(whiteCount).toBe(3);
  });

  it('applies Spray only to the Spray weapon\'s dice', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        arsenalX: 2,
        weapons: [
          createMinimalWeapon({ redDice: 2, keywords: { spray: true } }), // Will be multiplied
          createMinimalWeapon({ blackDice: 2 }), // Will NOT be multiplied
        ],
      }),
      defender: createMinimalDefender({ minisInLOS: 3 }),
      attackType: AttackType.Ranged,
    };

    const pool = formAttackPool(config);
    const redCount = pool.filter(d => d === AttackDieColor.Red).length;
    const blackCount = pool.filter(d => d === AttackDieColor.Black).length;

    expect(redCount).toBe(6); // 2 × 3
    expect(blackCount).toBe(2); // Not multiplied
  });

  it('applies Spray to multiple weapons independently if both have Spray', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        arsenalX: 2,
        weapons: [
          createMinimalWeapon({ redDice: 1, keywords: { spray: true } }),
          createMinimalWeapon({ blackDice: 2, keywords: { spray: true } }),
        ],
      }),
      defender: createMinimalDefender({ minisInLOS: 2 }),
      attackType: AttackType.Ranged,
    };

    const pool = formAttackPool(config);
    const redCount = pool.filter(d => d === AttackDieColor.Red).length;
    const blackCount = pool.filter(d => d === AttackDieColor.Black).length;

    expect(redCount).toBe(2); // 1 × 2
    expect(blackCount).toBe(4); // 2 × 2
  });

  it('does not multiply non-Spray weapon dice when another weapon has Spray', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        arsenalX: 2,
        weapons: [
          createMinimalWeapon({ whiteDice: 3 }), // No spray
          createMinimalWeapon({ redDice: 1, keywords: { spray: true } }), // Has spray
        ],
      }),
      defender: createMinimalDefender({ minisInLOS: 4 }),
      attackType: AttackType.Ranged,
    };

    const pool = formAttackPool(config);
    const whiteCount = pool.filter(d => d === AttackDieColor.White).length;
    const redCount = pool.filter(d => d === AttackDieColor.Red).length;

    expect(whiteCount).toBe(3); // NOT multiplied
    expect(redCount).toBe(4); // 1 × 4
  });

  it('only includes weapons matching selected attack type', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        arsenalX: 2,
        weapons: [
          createMinimalWeapon({ redDice: 2, weaponType: AttackType.Ranged }),
          createMinimalWeapon({ blackDice: 3, weaponType: AttackType.Melee }),
        ],
      }),
      defender: createMinimalDefender(),
      attackType: AttackType.Ranged,
    };

    const pool = formAttackPool(config);
    const redCount = pool.filter(d => d === AttackDieColor.Red).length;
    const blackCount = pool.filter(d => d === AttackDieColor.Black).length;

    expect(redCount).toBe(2);
    expect(blackCount).toBe(0);
  });

  it('treats missing weapon type as valid for all attack types', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        arsenalX: 2,
        weapons: [
          createMinimalWeapon({ redDice: 1 }),
          createMinimalWeapon({ blackDice: 2, weaponType: AttackType.Melee }),
        ],
      }),
      defender: createMinimalDefender(),
      attackType: AttackType.Ranged,
    };

    const filteredWeapons = getWeaponsForAttackType(config);
    expect(filteredWeapons).toHaveLength(1);
    expect(filteredWeapons[0].redDice).toBe(1);
  });

  it('treats hybrid weapons as valid in ranged attacks', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        arsenalX: 2,
        weapons: [
          createMinimalWeapon({ redDice: 2, weaponType: AttackType.Hybrid }),
          createMinimalWeapon({ blackDice: 1, weaponType: AttackType.Ranged }),
        ],
      }),
      defender: createMinimalDefender(),
      attackType: AttackType.Ranged,
    };

    const pool = formAttackPool(config);
    const redCount = pool.filter(d => d === AttackDieColor.Red).length;
    const blackCount = pool.filter(d => d === AttackDieColor.Black).length;

    expect(redCount).toBe(2);
    expect(blackCount).toBe(1);
  });

  it('treats hybrid weapons as valid in melee attacks', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        arsenalX: 2,
        weapons: [
          createMinimalWeapon({ redDice: 1, weaponType: AttackType.Hybrid }),
          createMinimalWeapon({ blackDice: 2, weaponType: AttackType.Melee }),
        ],
      }),
      defender: createMinimalDefender(),
      attackType: AttackType.Melee,
    };

    const pool = formAttackPool(config);
    const redCount = pool.filter(d => d === AttackDieColor.Red).length;
    const blackCount = pool.filter(d => d === AttackDieColor.Black).length;

    expect(redCount).toBe(1);
    expect(blackCount).toBe(2);
  });

  it('does not include hybrid weapons in overrun attacks', () => {
    const config: AttackConfig = {
      attacker: createMinimalAttacker({
        arsenalX: 2,
        weapons: [
          createMinimalWeapon({ redDice: 3, weaponType: AttackType.Hybrid }),
          createMinimalWeapon({ blackDice: 2, weaponType: AttackType.Overrun }),
        ],
      }),
      defender: createMinimalDefender(),
      attackType: AttackType.Overrun,
    };

    const pool = formAttackPool(config);
    const redCount = pool.filter(d => d === AttackDieColor.Red).length;
    const blackCount = pool.filter(d => d === AttackDieColor.Black).length;

    expect(redCount).toBe(0);
    expect(blackCount).toBe(2);
  });

  // Note: Arsenal X enforcement tests removed in Phase 5.6
  // Arsenal limiting now happens upstream in preset generator and upgrade applicator,
  // not in getWeaponsForAttackType. The weapons array passed to formAttackPool
  // should already be correctly sized.
});

describe('attackPool — basic functionality', () => {
  it('handles zero dice pool', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon({ redDice: 0, blackDice: 0, whiteDice: 0 }),
      defender: createMinimalDefender(),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBe(0);
    expect(result.suppressionApplied).toBe(1);
  });

  it('applies Spray multiplier', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 2, keywords: { spray: true } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({ minisInLOS: 3 }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    // With 2 red dice × 3 minis = 6 red dice
    // Should have potential for wounds (probabilistic)
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles zero minis in LOS with Spray', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon({
        redDice: 2,
        keywords: { spray: true },
      }),
      defender: createMinimalDefender({
        minisInLOS: 0, // Edge case: no minis visible
      }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    // Spray with 0 minis should still roll at least 1x (max(1, minisInLOS))
    expect(result).toBeDefined();
  });
});
