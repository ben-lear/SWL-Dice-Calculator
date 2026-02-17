import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rollAttackDice, rerollAttackDice } from './attackRoll';
import { AttackDieColor, AttackFace, AttackSurgeChart, AttackType, MarksmanStrategy, RerollStrategy } from './types';
import { createMinimalAttacker, createMinimalDefender } from './testHelpers';
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
      const defender = createMinimalDefender(); // Use proper minimal defender
      const config = { attacker, defender, attackType: AttackType.Ranged };
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
      const config = { attacker, defender: {} as any, attackType: AttackType.Melee }; // Hold the Line is melee-only
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Surge },
        { color: AttackDieColor.Black, face: AttackFace.Surge },
      ];

      rerollAttackDice(results, config, poolKeywords);

      // With Hold the Line (melee only), all surges can be converted, so none should be rerolled
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

    it('Deterministic mode: always saves aims for Marksman when conversion helps', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 2,
        marksman: true,
        marksmanStrategy: MarksmanStrategy.Deterministic,
      });
      const defender = createMinimalDefender({ armorX: 1 }); // Makes hit→crit valuable
      const config = { attacker, defender, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.White, face: AttackFace.Blank }, // Good reroll target
      ];

      const { aimsSavedForMarksman, aimsSpent } = rerollAttackDice(results, config, poolKeywords);

      // Deterministic mode: saves all aims for Marksman (guaranteed value > probabilistic reroll)
      expect(aimsSavedForMarksman).toBe(2);
      expect(aimsSpent).toBe(0);
    });

    it('Averages mode: chooses reroll when EV is better than conversion', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 2,
        marksman: true,
        marksmanStrategy: MarksmanStrategy.Averages,
        surgeChart: AttackSurgeChart.ToHit, // Makes rerolls more valuable
      });
      const defender = createMinimalDefender({ armorX: 2 }); // Would cancel new hits from blank→hit
      const config = { attacker, defender, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Blank }, // Good reroll: 6/8 favorable faces with surge conversion
        { color: AttackDieColor.White, face: AttackFace.Blank }, // Conversion would be cancelled by Armor 2
      ];

      const { aimsSavedForMarksman, aimsSpent } = rerollAttackDice(results, config, poolKeywords);

      // Averages mode: prefers reroll (high EV Red die) over conversion (would be cancelled by Armor)
      expect(aimsSpent).toBeGreaterThan(0); // Should spend at least some aims on rerolls
      expect(aimsSavedForMarksman).toBeLessThan(2); // Should not save all aims
    });

    it('Averages mode: saves aims for Marksman when conversion EV beats reroll', () => {
      const attacker = createMinimalAttacker({
        aimTokens: 2,
        marksman: true,
        marksmanStrategy: MarksmanStrategy.Averages,
      });
      const defender = createMinimalDefender({ 
        armorX: 2, // Makes hit→crit highly valuable (bypasses Armor)
        dodgeTokens: 1, // Further boosts crit value (can't be dodged)
      });
      const config = { attacker, defender, attackType: AttackType.Ranged };
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Hit }, // hit→crit has very high EV (bypasses Armor + Dodge)
        { color: AttackDieColor.White, face: AttackFace.Blank }, // Low reroll EV (White: 2/8 = 0.25)
      ];

      const { aimsSavedForMarksman, aimsSpent } = rerollAttackDice(results, config, poolKeywords);

      // Averages mode: saves aims for Marksman (high conversion EV > low reroll EV)
      expect(aimsSavedForMarksman).toBe(2);
      expect(aimsSpent).toBe(0);
    });

    it('MarksmanStrategy setting changes decision behavior', () => {
      const baseAttacker = {
        aimTokens: 1,
        marksman: true,
      };
      const defender = createMinimalDefender({ armorX: 1 });
      const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

      const results = [
        { color: AttackDieColor.Red, face: AttackFace.Hit },
      ];

      // Deterministic mode
      const attackerDeterministic = createMinimalAttacker({
        ...baseAttacker,
        marksmanStrategy: MarksmanStrategy.Deterministic,
      });
      const configDeterministic = { attacker: attackerDeterministic, defender, attackType: AttackType.Ranged };
      const { aimsSavedForMarksman: savedDeterministic } = rerollAttackDice(results, configDeterministic, poolKeywords);

      // Averages mode (with no Armor, hit→crit doesn't help, so might reroll instead)
      const attackerAverages = createMinimalAttacker({
        ...baseAttacker,
        marksmanStrategy: MarksmanStrategy.Averages,
      });
      const defenderNoArmor = createMinimalDefender({ armorX: 0 }); // Makes conversion less valuable
      const configAverages = { attacker: attackerAverages, defender: defenderNoArmor, attackType: AttackType.Ranged };
      const { aimsSavedForMarksman: savedAverages } = rerollAttackDice(results, configAverages, poolKeywords);

      // Deterministic mode should save (guaranteed > probabilistic)
      expect(savedDeterministic).toBe(1);
      // Averages mode without Armor should potentially not save (hit→crit doesn't help)
      expect(savedAverages).toBe(0); // Should use for reroll instead
    });

    describe('Crit Fishing mode', () => {
      beforeEach(() => {
        mockRollAttackDie.mockReturnValue(AttackFace.Critical); // Rerolls succeed
      });

      it('Conservative mode does NOT reroll hits', () => {
        const attacker = createMinimalAttacker({
          aimTokens: 1,
          rerollStrategy: RerollStrategy.Conservative,
        });
        const defender = createMinimalDefender();
        const config = { attacker, defender, attackType: AttackType.Ranged };
        const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

        const results = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
          { color: AttackDieColor.Black, face: AttackFace.Hit },
        ];

        const { results: after } = rerollAttackDice(results, config, poolKeywords);

        // In Conservative mode, hits should NOT be rerolled
        expect(after).toEqual([
          { color: AttackDieColor.Red, face: AttackFace.Hit },
          { color: AttackDieColor.Black, face: AttackFace.Hit },
        ]);
        expect(mockRollAttackDie).not.toHaveBeenCalled();
      });

      it('Crit Fishing mode rerolls hits after blanks', () => {
        const attacker = createMinimalAttacker({
          aimTokens: 1,
          rerollStrategy: RerollStrategy.CritFishing,
        });
        const defender = createMinimalDefender();
        const config = { attacker, defender, attackType: AttackType.Ranged };
        const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

        const results = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
          { color: AttackDieColor.Black, face: AttackFace.Hit },
        ];

        const { results: after } = rerollAttackDice(results, config, poolKeywords);

        // In Crit Fishing mode, hits should be rerolled (2 rerolls per aim)
        expect(after).toEqual([
          { color: AttackDieColor.Red, face: AttackFace.Critical },
          { color: AttackDieColor.Black, face: AttackFace.Critical },
        ]);
        expect(mockRollAttackDie).toHaveBeenCalledTimes(2);
      });

      it('Crit Fishing prioritizes blanks over hits', () => {
        const attacker = createMinimalAttacker({
          aimTokens: 1, // 2 rerolls available
          rerollStrategy: RerollStrategy.CritFishing,
        });
        const defender = createMinimalDefender();
        const config = { attacker, defender, attackType: AttackType.Ranged };
        const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

        const results = [
          { color: AttackDieColor.Red, face: AttackFace.Blank },
          { color: AttackDieColor.Black, face: AttackFace.Hit },
          { color: AttackDieColor.White, face: AttackFace.Hit },
        ];

        const { results: after } = rerollAttackDice(results, config, poolKeywords);

        // Should reroll: blank first, then one hit (prioritize Red hit)
        expect(after).toEqual([
          { color: AttackDieColor.Red, face: AttackFace.Critical }, // blank → crit
          { color: AttackDieColor.Black, face: AttackFace.Critical }, // hit → crit
          { color: AttackDieColor.White, face: AttackFace.Hit }, // not rerolled (out of rerolls)
        ]);
        expect(mockRollAttackDie).toHaveBeenCalledTimes(2);
      });

      it('Crit Fishing never rerolls critical results', () => {
        const attacker = createMinimalAttacker({
          aimTokens: 1,
          rerollStrategy: RerollStrategy.CritFishing,
        });
        const defender = createMinimalDefender();
        const config = { attacker, defender, attackType: AttackType.Ranged };
        const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

        const results = [
          { color: AttackDieColor.Red, face: AttackFace.Critical },
          { color: AttackDieColor.Black, face: AttackFace.Hit },
        ];

        const { results: after } = rerollAttackDice(results, config, poolKeywords);

        // Should reroll hit, but NOT the crit
        expect(after).toEqual([
          { color: AttackDieColor.Red, face: AttackFace.Critical }, // kept
          { color: AttackDieColor.Black, face: AttackFace.Critical }, // hit → crit
        ]);
        expect(mockRollAttackDie).toHaveBeenCalledTimes(1);
      });

      it('Crit Fishing protects surges that convert to crits via criticalX', () => {
        const attacker = createMinimalAttacker({
          aimTokens: 1,
          rerollStrategy: RerollStrategy.CritFishing,
        });
        const defender = createMinimalDefender();
        const config = { attacker, defender, attackType: AttackType.Ranged };
        const poolKeywords = { criticalX: 1, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

        const results = [
          { color: AttackDieColor.White, face: AttackFace.Surge }, // Protected (converts to crit)
          { color: AttackDieColor.Red, face: AttackFace.Surge }, // Excess (rerollable)
        ];

        const { results: after } = rerollAttackDice(results, config, poolKeywords);

        // Should keep White surge (for crit conversion), reroll Red surge (excess)
        // Note: Priority is by color rank descending, so Red surge gets rerolled
        expect(after).toEqual([
          { color: AttackDieColor.White, face: AttackFace.Surge }, // kept for conversion
          { color: AttackDieColor.Red, face: AttackFace.Critical }, // excess → rerolled
        ]);
        expect(mockRollAttackDie).toHaveBeenCalledTimes(1);
      });

      it('Crit Fishing rerolls surges that convert to hits (surge tokens)', () => {
        const attacker = createMinimalAttacker({
          aimTokens: 1,
          surgeTokens: 2,
          rerollStrategy: RerollStrategy.CritFishing,
        });
        const defender = createMinimalDefender();
        const config = { attacker, defender, attackType: AttackType.Ranged };
        const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

        const results = [
          { color: AttackDieColor.Red, face: AttackFace.Surge }, // Would convert to hit (rerollable)
          { color: AttackDieColor.White, face: AttackFace.Surge }, // Would convert to hit (rerollable)
        ];

        const { results: after } = rerollAttackDice(results, config, poolKeywords);

        // Should reroll both surges (they'd only become hits, not crits)
        expect(after).toEqual([
          { color: AttackDieColor.Red, face: AttackFace.Critical },
          { color: AttackDieColor.White, face: AttackFace.Critical },
        ]);
        expect(mockRollAttackDie).toHaveBeenCalledTimes(2);
      });

      it('Crit Fishing with mixed surge conversions: protects crit surges, rerolls hit surges', () => {
        const attacker = createMinimalAttacker({
          aimTokens: 2, // 4 rerolls
          surgeTokens: 2,
          rerollStrategy: RerollStrategy.CritFishing,
        });
        const defender = createMinimalDefender();
        const config = { attacker, defender, attackType: AttackType.Ranged };
        const poolKeywords = { criticalX: 1, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

        const results = [
          { color: AttackDieColor.White, face: AttackFace.Surge }, // #1: Protected (crit conversion)
          { color: AttackDieColor.Black, face: AttackFace.Surge }, // #2: Hit conversion (rerollable)
          { color: AttackDieColor.Red, face: AttackFace.Surge },   // #3: Hit conversion (rerollable)
          { color: AttackDieColor.Black, face: AttackFace.Surge }, // #4: Excess (rerollable)
        ];

        const { results: after } = rerollAttackDice(results, config, poolKeywords);

        // White surge kept for crit conversion, others rerolled
        expect(after.filter(d => d.face === AttackFace.Surge).length).toBe(1);
        expect(after.find(d => d.color === AttackDieColor.White && d.face === AttackFace.Surge)).toBeDefined();
        expect(mockRollAttackDie).toHaveBeenCalledTimes(3); // 3 surges rerolled
      });

      it('Crit Fishing respects color priority within hit rerolls', () => {
        const attacker = createMinimalAttacker({
          aimTokens: 1, // 2 rerolls
          rerollStrategy: RerollStrategy.CritFishing,
        });
        const defender = createMinimalDefender();
        const config = { attacker, defender, attackType: AttackType.Ranged };
        const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

        const results = [
          { color: AttackDieColor.White, face: AttackFace.Hit },
          { color: AttackDieColor.Black, face: AttackFace.Hit },
          { color: AttackDieColor.Red, face: AttackFace.Hit },
        ];

        const { results: after } = rerollAttackDice(results, config, poolKeywords);

        // Should reroll Red and Black first (higher value)
        expect(after).toEqual([
          { color: AttackDieColor.White, face: AttackFace.Hit }, // not rerolled
          { color: AttackDieColor.Black, face: AttackFace.Critical },
          { color: AttackDieColor.Red, face: AttackFace.Critical },
        ]);
        expect(mockRollAttackDie).toHaveBeenCalledTimes(2);
      });

      it('Crit Fishing with ToHit chart: rerolls surges (they become hits, not crits)', () => {
        const attacker = createMinimalAttacker({
          aimTokens: 1,
          surgeChart: AttackSurgeChart.ToHit,
          rerollStrategy: RerollStrategy.CritFishing,
        });
        const defender = createMinimalDefender();
        const config = { attacker, defender, attackType: AttackType.Ranged };
        const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

        const results = [
          { color: AttackDieColor.Red, face: AttackFace.Surge },
          { color: AttackDieColor.White, face: AttackFace.Surge },
        ];

        rerollAttackDice(results, config, poolKeywords);

        // ToHit chart converts to hits, not crits → reroll them in Crit Fishing
        expect(mockRollAttackDie).toHaveBeenCalledTimes(2);
      });

      it('Crit Fishing with ToCrit chart: protects surges (they become crits)', () => {
        const attacker = createMinimalAttacker({
          aimTokens: 1,
          surgeChart: AttackSurgeChart.ToCrit,
          rerollStrategy: RerollStrategy.CritFishing,
        });
        const defender = createMinimalDefender();
        const config = { attacker, defender, attackType: AttackType.Ranged };
        const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

        const results = [
          { color: AttackDieColor.Red, face: AttackFace.Surge },
          { color: AttackDieColor.White, face: AttackFace.Surge },
        ];

        const { results: after } = rerollAttackDice(results, config, poolKeywords);

        // ToCrit chart converts to crits → keep them (don't reroll)
        expect(after).toEqual([
          { color: AttackDieColor.Red, face: AttackFace.Surge },
          { color: AttackDieColor.White, face: AttackFace.Surge },
        ]);
        expect(mockRollAttackDie).not.toHaveBeenCalled();
      });

      it('Crit Fishing with Jedi Hunter: protects surges (unlimited crit conversions)', () => {
        const attacker = createMinimalAttacker({
          aimTokens: 1,
          jediHunter: true,
          rerollStrategy: RerollStrategy.CritFishing,
        });
        const defender = createMinimalDefender();
        const config = { attacker, defender, attackType: AttackType.Ranged };
        const poolKeywords = { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false };

        const results = [
          { color: AttackDieColor.Red, face: AttackFace.Surge },
          { color: AttackDieColor.Black, face: AttackFace.Surge },
        ];

        const { results: after } = rerollAttackDice(results, config, poolKeywords);

        // Jedi Hunter converts all surges to crits → don't reroll
        expect(after).toEqual(results);
        expect(mockRollAttackDie).not.toHaveBeenCalled();
      });
    });
  });
});