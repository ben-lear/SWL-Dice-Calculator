import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rollAttackDice, rerollAttackDice } from './attackRoll';
import { AttackDieColor, AttackFace, AttackSurgeChart, AttackType, MarksmanStrategy, RerollStrategy } from './types';
import { createMinimalAttacker, createMinimalWeapon, createMinimalWeaponKeywords } from './testHelpers';
import { rollAttackDie } from './dice';

// Mock the dice roll to get predictable results
vi.mock('./dice');
const mockRollAttackDie = vi.mocked(rollAttackDie);

describe('attackRoll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rollAttackDice', () => {
    it('rolls each die in the pool and preserves color', () => {
      const pool = [AttackDieColor.Red, AttackDieColor.Black, AttackDieColor.White];
      mockRollAttackDie
        .mockReturnValueOnce(AttackFace.Hit)
        .mockReturnValueOnce(AttackFace.Critical)
        .mockReturnValueOnce(AttackFace.Blank);

      const result = rollAttackDice(pool);

      expect(result).toEqual([
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Black, face: AttackFace.Critical },
        { color: AttackDieColor.White, face: AttackFace.Blank },
      ]);
      expect(mockRollAttackDie).toHaveBeenCalledTimes(3);
    });

    it('handles empty pool', () => {
      const result = rollAttackDice([]);
      expect(result).toEqual([]);
      expect(mockRollAttackDie).not.toHaveBeenCalled();
    });
  });

  describe('rerollAttackDice', () => {
    beforeEach(() => {
      mockRollAttackDie.mockReturnValue(AttackFace.Hit);
    });

    it('processes observation tokens before aim tokens', () => {
      const attacker = createMinimalAttacker({
        observationTokens: 1,
        aimTokens: 1,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Blank },
        { color: AttackDieColor.Black, face: AttackFace.Blank },
      ];

      const { results: finalResults, aimsSpent } = rerollAttackDice(results, config, poolKeywords);

      expect(mockRollAttackDie).toHaveBeenCalledTimes(2); // 1 observation + up to 2 from aim
      expect(aimsSpent).toBe(1);
      expect(finalResults).toHaveLength(2);
    });

    it('rerolls blanks with observation tokens', () => {
      const attacker = createMinimalAttacker({
        observationTokens: 2,
        aimTokens: 0,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Blank },
        { color: AttackDieColor.Black, face: AttackFace.Blank },
      ];

      rerollAttackDice(results, config, poolKeywords);

      expect(mockRollAttackDie).toHaveBeenCalledTimes(2);
    });

    it('rerolls excess surges when no conversion available', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 1,
        surgeChart: AttackSurgeChart.None,
        surgeTokens: 0,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Surge },
        { color: AttackDieColor.Black, face: AttackFace.Surge },
      ];

      rerollAttackDice(results, config, poolKeywords);

      expect(mockRollAttackDie).toHaveBeenCalledTimes(2); // Both surges rerolled
    });

    it('keeps surges when surge chart conversion available', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 1,
        surgeChart: AttackSurgeChart.ToHit,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Surge },
        { color: AttackDieColor.Black, face: AttackFace.Hit },
      ];

      rerollAttackDice(results, config, poolKeywords);

      // Only non-surge targets rerolled (none in this case)
      expect(mockRollAttackDie).not.toHaveBeenCalled();
    });

    it('keeps some surges with limited conversions', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 1,
        surgeChart: AttackSurgeChart.None,
        surgeTokens: 1,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 1, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Surge },
        { color: AttackDieColor.Black, face: AttackFace.Surge },
        { color: AttackDieColor.White, face: AttackFace.Surge },
      ];

      rerollAttackDice(results, config, poolKeywords);

      // Total conversions = 1 surge token + 1 critical keyword = 2
      // Should keep 2 surges, reroll 1 (the excess)
      expect(mockRollAttackDie).toHaveBeenCalledTimes(1);
    });

    it('respects Precise X for additional rerolls per aim', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 1,
        preciseX: 2, // 2 + 2 = 4 rerolls per aim
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Blank },
        { color: AttackDieColor.Black, face: AttackFace.Blank },
        { color: AttackDieColor.White, face: AttackFace.Blank },
        { color: AttackDieColor.Red, face: AttackFace.Blank },
      ];

      rerollAttackDice(results, config, poolKeywords);

      expect(mockRollAttackDie).toHaveBeenCalledTimes(4); // All 4 blanks rerolled with Precise 2
    });

    it('prioritizes red dice for rerolls', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 1, // 2 rerolls by default
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.White, face: AttackFace.Blank },
        { color: AttackDieColor.Red, face: AttackFace.Blank },
        { color: AttackDieColor.Black, face: AttackFace.Blank },
      ];

      rerollAttackDice(results, config, poolKeywords);

      // Should reroll Red first, then Black (not White due to limit)
      expect(mockRollAttackDie).toHaveBeenCalledTimes(2);
      expect(mockRollAttackDie).toHaveBeenNthCalledWith(1, AttackDieColor.Red);
      expect(mockRollAttackDie).toHaveBeenNthCalledWith(2, AttackDieColor.Black);
    });

    it('applies Duelist pierce bonus in Melee when aim spent', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 1,
        duelistAttacker: true,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Melee };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Blank },
      ];

      const { pierceBonus } = rerollAttackDice(results, config, poolKeywords);

      expect(pierceBonus).toBe(1);
    });

    it('does not apply Duelist pierce bonus in Ranged', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 1,
        duelistAttacker: true,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Blank },
      ];

      const { pierceBonus } = rerollAttackDice(results, config, poolKeywords);

      expect(pierceBonus).toBe(0);
    });

    it('saves aims for Marksman when beneficial', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 2,
        marksman: true,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Black, face: AttackFace.Blank },
      ];

      const { aimsSavedForMarksman, aimsSpent } = rerollAttackDice(results, config, poolKeywords);

      // Should save aims for Marksman when there are few reroll targets but good conversion targets
      expect(aimsSavedForMarksman).toBeGreaterThan(0);
      expect(aimsSpent + aimsSavedForMarksman).toBe(2);
    });

    it('handles Jedi Hunter unlimited surge conversion', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 1,
        jediHunter: true,
        surgeChart: AttackSurgeChart.None,
        surgeTokens: 0,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Surge },
        { color: AttackDieColor.Black, face: AttackFace.Surge },
        { color: AttackDieColor.White, face: AttackFace.Surge },
      ];

      rerollAttackDice(results, config, poolKeywords);

      // With Jedi Hunter, all surges can be converted, so none should be rerolled
      expect(mockRollAttackDie).not.toHaveBeenCalled();
    });

    it('handles Hold the Line unlimited surge conversion', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 1,
        holdTheLine: true,
        surgeChart: AttackSurgeChart.None,
        surgeTokens: 0,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Surge },
        { color: AttackDieColor.Black, face: AttackFace.Surge },
      ];

      rerollAttackDice(results, config, poolKeywords);

      // With Hold the Line, all surges can be converted, so none should be rerolled
      expect(mockRollAttackDie).not.toHaveBeenCalled();
    });

    it('wastes observation tokens when no targets available', () => {
      const attacker = createMinimalAttacker({
        observationTokens: 2,
        aimTokens: 0,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Black, face: AttackFace.Critical },
      ];

      rerollAttackDice(results, config, poolKeywords);

      // No reroll targets, observation tokens wasted
      expect(mockRollAttackDie).not.toHaveBeenCalled();
    });

    it('wastes aim tokens when no targets available', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 2,
      });
      const config = { attacker, defender: {} as any, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Black, face: AttackFace.Critical },
      ];

      const { aimsSpent } = rerollAttackDice(results, config, poolKeywords);

      // No reroll targets, aims wasted
      expect(aimsSpent).toBe(0);
      expect(mockRollAttackDie).not.toHaveBeenCalled();
    });
  });
});