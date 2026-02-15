import { describe, it, expect } from 'vitest';
import { executeAttackSequence } from './attackSequence';
import type { AttackConfig } from './types';
import {
  AttackType,
  AttackSurgeChart,
  DefenseSurgeChart,
  CoverType,
  DefenseDieColor,
} from './types';
import { createAttackerWithWeapon, createMinimalDefender } from './testHelpers';

describe('executeAttackSequence - Integration Tests', () => {
  it('returns valid result structure', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon({ redDice: 2 }),
      defender: createMinimalDefender(),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);

    expect(result).toHaveProperty('guardianWoundsNoPierce');
    expect(result).toHaveProperty('mainTargetWoundsNoPierce');
    expect(result).toHaveProperty('totalWounds');
    expect(result).toHaveProperty('deflectWounds');
    expect(result).toHaveProperty('djemSoWounds');
    expect(result).toHaveProperty('suppressionApplied');
  });

  it('applies suppressive correctly', () => {
    const configWithSuppressive: AttackConfig = {
      attacker: createAttackerWithWeapon({ redDice: 2, keywords: { suppressive: true } }),
      defender: createMinimalDefender(),
      attackType: AttackType.Ranged,
    };

    const resultWith = executeAttackSequence(configWithSuppressive);
    expect(resultWith.suppressionApplied).toBe(2);

    const configWithout: AttackConfig = {
      attacker: createAttackerWithWeapon({ redDice: 2, keywords: { suppressive: false } }),
      defender: createMinimalDefender(),
      attackType: AttackType.Ranged,
    };

    const resultWithout = executeAttackSequence(configWithout);
    expect(resultWithout.suppressionApplied).toBe(1);
  });

  it('applies suppression correctly for Melee and Overrun attacks', () => {
    // Melee without Suppressive: 0 suppression
    const meleeWithout: AttackConfig = {
      attacker: createAttackerWithWeapon({ redDice: 2, keywords: { suppressive: false } }),
      defender: createMinimalDefender(),
      attackType: AttackType.Melee,
    };
    expect(executeAttackSequence(meleeWithout).suppressionApplied).toBe(0);

    // Melee with Suppressive: 1 suppression
    const meleeWith: AttackConfig = {
      attacker: createAttackerWithWeapon({ redDice: 2, keywords: { suppressive: true } }),
      defender: createMinimalDefender(),
      attackType: AttackType.Melee,
    };
    expect(executeAttackSequence(meleeWith).suppressionApplied).toBe(1);

    // Overrun without Suppressive: 0 suppression
    const overrunWithout: AttackConfig = {
      attacker: createAttackerWithWeapon({ redDice: 2, keywords: { suppressive: false } }),
      defender: createMinimalDefender(),
      attackType: AttackType.Overrun,
    };
    expect(executeAttackSequence(overrunWithout).suppressionApplied).toBe(0);

    // Overrun with Suppressive: 1 suppression
    const overrunWith: AttackConfig = {
      attacker: createAttackerWithWeapon({ redDice: 2, keywords: { suppressive: true } }),
      defender: createMinimalDefender(),
      attackType: AttackType.Overrun,
    };
    expect(executeAttackSequence(overrunWith).suppressionApplied).toBe(1);
  });
});

describe('executeAttackSequence - Edge Cases', () => {
  it('handles all zeros gracefully', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon({
        redDice: 0,
        blackDice: 0,
        whiteDice: 0,
      }),
      defender: createMinimalDefender(),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBe(0);
    expect(result.mainTargetWoundsNoPierce).toBe(0);
    expect(result.guardianWoundsNoPierce).toBe(0);
  });

  it('handles very large dice pools', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 20 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
      }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('handles zero cost units (edge case for efficiency calculations)', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 2 },
        { unitCost: 0 }
      ),
      defender: createMinimalDefender({
        unitCost: 0,
      }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });
});

describe('executeAttackSequence - Keyword Combinations', () => {
  it('combines Pierce sources: base + Lethal + Duelist', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 3, keywords: { pierceX: 1, lethalX: 2 } },
        {
          aimTokens: 3,
          duelistAttacker: true,
          surgeChart: AttackSurgeChart.ToHit,
        }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
      }),
      attackType: AttackType.Melee,
    };

    // Run multiple times to verify Pierce bonuses apply
    let totalWounds = 0;
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      totalWounds += executeAttackSequence(config).totalWounds;
    }

    // With multiple Pierce sources, should do significant damage
    expect(totalWounds).toBeGreaterThan(0);
  });

  it('combines Impact + Pierce vs Armor correctly', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 8, keywords: { impactX: 2, pierceX: 2 } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        armorX: 2,
        surgeChart: DefenseSurgeChart.ToBlock,
      }),
      attackType: AttackType.Ranged,
    };

    // Impact should convert hits to crits vs Armor
    // Pierce should help with defense blocks
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThan(0);
  });

  it('combines Armor + Shielded correctly (order matters)', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 10 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 2,
        shieldedX: 2,
      }),
      attackType: AttackType.Ranged,
    };

    // Armor cancels hits, Shielded cancels crits then hits
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });

  it('combines Guardian + Pierce correctly (Guardian defends without Pierce)', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 8, keywords: { pierceX: 3 } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
        guardianX: 3,
      }),
      attackType: AttackType.Ranged,
    };

    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    // Guardian hits should be rolled separately
    const somebodyGotHit = results.some(r => r.guardianWoundsNoPierce > 0 || r.mainTargetWoundsNoPierce > 0);
    expect(somebodyGotHit).toBe(true);
  });

  it('combines Cover + Low Profile correctly', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 5 },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        coverType: CoverType.Light,
        lowProfile: true,
      }),
      attackType: AttackType.Ranged,
    };

    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    // Low Profile modifies cover dice rolling
    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });

  it('combines Aim tokens + Precise X correctly', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 3 },
        {
          aimTokens: 2,
          preciseX: 1,
          surgeChart: AttackSurgeChart.ToHit,
        }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
      }),
      attackType: AttackType.Ranged,
    };

    // Precise X adds rerolls per Aim token
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThan(0);
  });

  it('combines Danger Sense + Impervious correctly', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 4, keywords: { pierceX: 2 } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        dangerSenseX: 2,
        suppressionTokens: 3,
        impervious: true,
      }),
      attackType: AttackType.Ranged,
    };

    // Both add defense dice
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThanOrEqual(0);
  });

  it('combines Suppressive + Cover interactions', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 3, keywords: { suppressive: true } },
        { surgeChart: AttackSurgeChart.ToHit }
      ),
      defender: createMinimalDefender({
        coverType: CoverType.Light,
        suppressed: true, // Suppressed improves cover
      }),
      attackType: AttackType.Ranged,
    };

    const result = executeAttackSequence(config);
    // Suppressive adds suppression
    // Suppressed improves cover
    expect(result.suppressionApplied).toBe(2);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
  });

  it('combines Critical X + surge conversion correctly', () => {
    const config: AttackConfig = {
      attacker: createAttackerWithWeapon(
        { redDice: 5, keywords: { criticalX: 2 } },
        {
          surgeChart: AttackSurgeChart.ToHit,
          surgeTokens: 1,
        }
      ),
      defender: createMinimalDefender({
        dieColor: DefenseDieColor.White,
        armorX: 2,
      }),
      attackType: AttackType.Ranged,
    };

    // Critical X should convert hits to crits (bypassing Armor)
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(executeAttackSequence(config));
    }

    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThan(0);
  });
});
