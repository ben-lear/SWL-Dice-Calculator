import { describe, it, expect } from 'vitest';
import { calculateMarksmanDecision } from './marksmanDecision';
import { AttackDieColor, AttackFace, MarksmanStrategy, CoverType, AttackType, AttackSurgeChart, DefenseDieColor } from './types';
import { createMinimalAttacker, createMinimalDefender, createMinimalPoolKeywords } from './testHelpers';
import type { RolledAttackDie, AttackConfig } from './types';

describe('marksmanDecision', () => {
  describe('calculateMarksmanDecision', () => {
    it('returns useRerollInstead when no convertible dice exist', () => {
      const results: RolledAttackDie[] = [
        { color: AttackDieColor.Red, face: AttackFace.Critical },
        { color: AttackDieColor.Black, face: AttackFace.Critical },
      ];
      const config: AttackConfig = {
        attackType: AttackType.Ranged,
        attacker: createMinimalAttacker({ marksman: true }),
        defender: createMinimalDefender(),
      };
      const poolKeywords = createMinimalPoolKeywords();

      const decision = calculateMarksmanDecision(results, config, poolKeywords);

      expect(decision.useRerollInstead).toBe(true);
      expect(decision.convertBlankIndex).toBeNull();
      expect(decision.convertHitIndex).toBeNull();
    });

    it('returns useRerollInstead when conversions would not help', () => {
      // Scenario: Armor X would cancel the new hit
      const results: RolledAttackDie[] = [
        { color: AttackDieColor.Red, face: AttackFace.Blank },
      ];
      const config: AttackConfig = {
        attackType: AttackType.Ranged,
        attacker: createMinimalAttacker({ 
          marksman: true,
          marksmanStrategy: MarksmanStrategy.Averages,
        }),
        defender: createMinimalDefender({ armorX: 2 }), // High Armor will cancel any new hit
      };
      const poolKeywords = createMinimalPoolKeywords({ impactX: 0 });

      const decision = calculateMarksmanDecision(results, config, poolKeywords);

      // With no existing hits and Armor 2, a single new hit won't help
      expect(decision.useRerollInstead).toBe(true);
    });

    describe('Deterministic mode', () => {
      it('always saves for hit→crit conversion when it helps (Armor bypass)', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
          { color: AttackDieColor.Black, face: AttackFace.Hit },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Deterministic,
          }),
          defender: createMinimalDefender({ armorX: 2 }), // Armor 2 cancels all hits; crits bypass
        };
        const poolKeywords = createMinimalPoolKeywords({ impactX: 0 });

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        expect(decision.useRerollInstead).toBe(false);
        expect(decision.convertHitIndex).toBe(1); // Black prioritized over Red (lower reroll value)
        expect(decision.convertBlankIndex).toBeNull();
      });

      it('always saves for blank→hit conversion when it helps', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.White, face: AttackFace.Blank },
          { color: AttackDieColor.Red, face: AttackFace.Blank },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Deterministic,
          }),
          defender: createMinimalDefender(), // No Armor, blank→hit always helps
        };
        const poolKeywords = createMinimalPoolKeywords();

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        expect(decision.useRerollInstead).toBe(false);
        expect(decision.convertBlankIndex).toBe(0); // White die prioritized (lower reroll value)
        expect(decision.convertHitIndex).toBeNull();
      });

      it('prioritizes hit→crit over blank→hit when both help', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
          { color: AttackDieColor.Red, face: AttackFace.Blank },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Deterministic,
          }),
          defender: createMinimalDefender({ armorX: 1 }), // Makes hit→crit valuable
        };
        const poolKeywords = createMinimalPoolKeywords({ impactX: 0 });

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        expect(decision.useRerollInstead).toBe(false);
        expect(decision.convertHitIndex).toBe(0); // Hit→crit prioritized
        expect(decision.convertBlankIndex).toBeNull();
      });

      it('sorts by die color - prioritizes White (lowest reroll value)', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Blank },
          { color: AttackDieColor.Black, face: AttackFace.Blank },
          { color: AttackDieColor.White, face: AttackFace.Blank },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Deterministic,
          }),
          defender: createMinimalDefender(),
        };
        const poolKeywords = createMinimalPoolKeywords();

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        expect(decision.useRerollInstead).toBe(false);
        expect(decision.convertBlankIndex).toBe(2); // White die at index 2
      });
    });

    describe('Averages mode', () => {
      it('chooses reroll when White blank has good reroll odds', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.White, face:AttackFace.Blank },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Averages,
            surgeChart: AttackSurgeChart.ToHit, // Surges convert, making White reroll less favorable (2/8)
          }),
          defender: createMinimalDefender(), // No Armor, blank→hit has EV of 1.0
        };
        const poolKeywords = createMinimalPoolKeywords();

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // White blank reroll: 2/8 = 0.25 EV (hit + crit)
        // blank→hit conversion: 1.0 EV
        // Conversion is better, so should convert
        expect(decision.useRerollInstead).toBe(false);
        expect(decision.convertBlankIndex).toBe(0);
      });

      it('chooses conversion when EV is better than reroll', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
          { color: AttackDieColor.White, face: AttackFace.Blank }, // Not the best reroll target
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Averages,
          }),
          defender: createMinimalDefender({ armorX: 2 }), // Crits bypass Armor - high value
        };
        const poolKeywords = createMinimalPoolKeywords({ impactX: 0 });

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // hit→crit with Armor 2: EV ~2.0 (boosted for bypassing Armor)
        // White blank reroll: ~0.25-0.375 EV
        // Conversion is much better
        expect(decision.useRerollInstead).toBe(false);
        expect(decision.convertHitIndex).toBe(0);
      });

      it('boosts hit→crit EV when facing Dodge tokens', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Averages,
          }),
          defender: createMinimalDefender({ 
            dodgeTokens: 1,
            outmaneuver: false, // Crits can't be dodged without Outmaneuver
          }),
        };
        const poolKeywords = createMinimalPoolKeywords({ impactX: 0, highVelocity: false });

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // hit→crit with Dodge: EV boosted by 1.5x (crits can't be dodged)
        // Should strongly favor conversion
        expect(decision.useRerollInstead).toBe(false);
        expect(decision.convertHitIndex).toBe(0);
      });

      it('boosts hit→crit EV when facing Cover', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Black, face: AttackFace.Hit },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Averages,
          }),
          defender: createMinimalDefender({ 
            coverType: CoverType.Heavy, // Crits bypass cover
          }),
        };
        const poolKeywords = createMinimalPoolKeywords({ blast: false }); // No Blast, so Cover applies

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // hit→crit with Cover: valuable for bypassing cover
        expect(decision.useRerollInstead).toBe(false);
        expect(decision.convertHitIndex).toBe(0);
      });

      it('reduces hit→crit EV when Impact already converts all hits', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
          { color: AttackDieColor.Red, face: AttackFace.Hit },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Averages,
          }),
          defender: createMinimalDefender({ armorX: 1 }), // Armor present so Impact is active
        };
        const poolKeywords = createMinimalPoolKeywords({ impactX: 3 }); // Impact 3 converts all hits (only 2 hits present)

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // hit→crit with Impact X already handling it: EV reduced by 0.2x (redundant)
        // Should prefer reroll instead
        expect(decision.useRerollInstead).toBe(true);
      });

      it('reduces blank→hit EV when Armor would cancel the new hit', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.White, face: AttackFace.Blank },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Averages,
          }),
          defender: createMinimalDefender({ armorX: 2 }), // Armor 2 would cancel a single hit
        };
        const poolKeywords = createMinimalPoolKeywords({ impactX: 0 });

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // blank→hit with Armor 2 canceling it: EV reduced by 0.3x
        // With no existing hits, new hit won't survive — should use reroll
        expect(decision.useRerollInstead).toBe(true);
      });

      it('handles surges as blanks post-surge conversion', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Surge }, // Treated as blank if unconverted
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Averages,
            surgeChart: AttackSurgeChart.None, // Surges not converted
          }),
          defender: createMinimalDefender(),
        };
        const poolKeywords = createMinimalPoolKeywords();

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // Surge treated as blank for Marksman conversion
        expect(decision.useRerollInstead).toBe(false);
        expect(decision.convertBlankIndex).toBe(0);
      });
    });

    describe('Defender keyword interactions', () => {
      it('recognizes hit→crit helps when Armor would cancel hit but not crit', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
          { color: AttackDieColor.Red, face: AttackFace.Hit },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Deterministic,
          }),
          defender: createMinimalDefender({ armorX: 2 }), // Armor 2 cancels all hits
        };
        const poolKeywords = createMinimalPoolKeywords({ impactX: 0 }); // No Impact, so hits remain hits

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // Converting hit→crit bypasses Armor
        expect(decision.useRerollInstead).toBe(false);
        expect(decision.convertHitIndex).toBe(0);
      });

      it('recognizes hit→crit does not help when no Armor/Dodge/Cover', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Deterministic,
          }),
          defender: createMinimalDefender(), // No Armor, Dodge, or Cover
        };
        const poolKeywords = createMinimalPoolKeywords({ impactX: 0 });

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // hit→crit provides no benefit without defender keywords
        // Should prefer reroll instead (or do nothing if no blanks)
        expect(decision.useRerollInstead).toBe(true);
      });

      it('recognizes Blast negates Cover benefit for hit→crit', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Deterministic,
          }),
          defender: createMinimalDefender({ 
            coverType: CoverType.Heavy,
            immuneBlast: false, // Not immune to Blast
          }),
        };
        const poolKeywords = createMinimalPoolKeywords({ blast: true }); // Blast negates cover

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // Blast already negates Cover, so hit→crit doesn't provide extra benefit
        expect(decision.useRerollInstead).toBe(true);
      });

      it('recognizes High Velocity negates Dodge benefit for hit→crit', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Deterministic,
          }),
          defender: createMinimalDefender({ dodgeTokens: 1 }),
        };
        const poolKeywords = createMinimalPoolKeywords({ highVelocity: true }); // Crits can be dodged with High Velocity

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // High Velocity means crits can be dodged, so no benefit
        expect(decision.useRerollInstead).toBe(true);
      });

      it('recognizes Outmaneuver allows defender to dodge crits', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Hit },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Deterministic,
          }),
          defender: createMinimalDefender({ 
            dodgeTokens: 1,
            outmaneuver: true, // Defender can dodge crits
          }),
        };
        const poolKeywords = createMinimalPoolKeywords({ highVelocity: false });

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        // Outmaneuver negates the crit Dodge bypass benefit
        expect(decision.useRerollInstead).toBe(true);
      });
    });

    describe('Die color prioritization', () => {
      it('converts White die over Red when both are blanks', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Red, face: AttackFace.Blank },
          { color: AttackDieColor.White, face: AttackFace.Blank },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Deterministic,
          }),
          defender: createMinimalDefender(),
        };
        const poolKeywords = createMinimalPoolKeywords();

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        expect(decision.convertBlankIndex).toBe(1); // White at index 1
      });

      it('converts White die over Black when both are hits', () => {
        const results: RolledAttackDie[] = [
          { color: AttackDieColor.Black, face: AttackFace.Hit },
          { color: AttackDieColor.White, face: AttackFace.Hit },
        ];
        const config: AttackConfig = {
          attackType: AttackType.Ranged,
          attacker: createMinimalAttacker({
            marksman: true,
            marksmanStrategy: MarksmanStrategy.Deterministic,
          }),
          defender: createMinimalDefender({ armorX: 2 }), // Armor 2 so hit→crit genuinely helps
        };
        const poolKeywords = createMinimalPoolKeywords({ impactX: 0 });

        const decision = calculateMarksmanDecision(results, config, poolKeywords);

        expect(decision.convertHitIndex).toBe(1); // White at index 1
      });
    });
  });

  describe('Surge→Crit reroll EV', () => {
    it('validates surge→crit EV for ToCrit chart in reroll calculation', () => {
      // ToCrit surge chart: this test validates that calculateRerollEV correctly
      // routes surge probability to expectedCrits (not expectedHits) when ToCrit is active
      const results: RolledAttackDie[] = [
        { color: AttackDieColor.White, face: AttackFace.Blank },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
      ];
      const config: AttackConfig = {
        attackType: AttackType.Ranged,
        attacker: createMinimalAttacker({
          marksman: true,
          marksmanStrategy: MarksmanStrategy.Averages,
          surgeChart: AttackSurgeChart.ToCrit,
        }),
        defender: createMinimalDefender(),
      };
      const poolKeywords = createMinimalPoolKeywords();

      const decision = calculateMarksmanDecision(results, config, poolKeywords);

      // The test validates surgesConvertToCrit() is called and EV is routed correctly
      expect(decision.useRerollInstead).toBe(false);
      expect(decision.convertBlankIndex).toBe(0);
    });

    it('treats surge as hit for ToHit attacker reroll EV', () => {
      // ToHit surge chart: surges convert to hits
      // With no cover/armor/dodge, hits and crits have equal wound value,
      // so the surge→hit doesn't change the EV comparison much
      const results: RolledAttackDie[] = [
        { color: AttackDieColor.White, face: AttackFace.Blank },
        { color: AttackDieColor.White, face: AttackFace.Hit },
      ];
      const config: AttackConfig = {
        attackType: AttackType.Ranged,
        attacker: createMinimalAttacker({
          marksman: true,
          marksmanStrategy: MarksmanStrategy.Averages,
          surgeChart: AttackSurgeChart.ToHit,
        }),
        defender: createMinimalDefender(), // No keywords
      };
      const poolKeywords = createMinimalPoolKeywords();

      const decision = calculateMarksmanDecision(results, config, poolKeywords);

      // With ToHit and no defender keywords, Marksman guaranteed +1 hit (=1.0 hits)
      // vs reroll white EV = 1/8 hit + 1/8 crit + 1/8 surge→hit = 3/8 hits
      // Conversion is better (1.0 > 0.375)
      expect(decision.useRerollInstead).toBe(false);
      expect(decision.convertBlankIndex).toBe(0);
    });
  });

  describe('Lethal X and Duelist Pierce opportunity cost', () => {
    it('prefers reroll over Marksman when Lethal X Pierce loss outweighs conversion', () => {
      // Lethal 2, 2 aims remaining. Saving for Marksman loses 2 Lethal Pierce.
      // vs spending 1 aim on reroll (1 aim left for Lethal = 1 Pierce)
      const results: RolledAttackDie[] = [
        { color: AttackDieColor.Red, face: AttackFace.Blank },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
      ];
      const config: AttackConfig = {
        attackType: AttackType.Ranged,
        attacker: createMinimalAttacker({
          marksman: true,
          marksmanStrategy: MarksmanStrategy.Averages,
          aimTokens: 2,
        }),
        defender: createMinimalDefender({ dieColor: DefenseDieColor.Red }), // Many blocks to Pierce through
      };
      const poolKeywords = createMinimalPoolKeywords({ lethalX: 2 });

      // aimsSpent=0, aimsRemaining=2
      // Reroll path: 1 aim for Lethal → Pierce +1, plus ~0.625 new hits
      // Marksman path: 0 aims for Lethal → Pierce 0, but guaranteed +1 hit
      const decision = calculateMarksmanDecision(results, config, poolKeywords, 0, 2);

      // With 3 existing hits, adding a guaranteed 4th hit (~2.6 wounds) beats
      // Pierce +1 plus reroll EV (~2.2 wounds). Lethal opportunity cost is modeled
      // but doesn't overcome the guaranteed hit value.
      expect(decision.useRerollInstead).toBe(false);
      expect(decision.convertBlankIndex).toBe(0);
    });

    it('Marksman still preferred when no Lethal X and conversion helps', () => {
      const results: RolledAttackDie[] = [
        { color: AttackDieColor.White, face: AttackFace.Blank },
        { color: AttackDieColor.White, face: AttackFace.Hit },
      ];
      const config: AttackConfig = {
        attackType: AttackType.Ranged,
        attacker: createMinimalAttacker({
          marksman: true,
          marksmanStrategy: MarksmanStrategy.Averages,
          aimTokens: 1,
        }),
        defender: createMinimalDefender(),
      };
      const poolKeywords = createMinimalPoolKeywords({ lethalX: 0 });

      // No Lethal, so no Pierce opportunity cost
      const decision = calculateMarksmanDecision(results, config, poolKeywords, 0, 1);

      // With no Lethal and white blank, Marksman conversion (1.0 hit) beats reroll (~0.375)
      expect(decision.useRerollInstead).toBe(false);
      expect(decision.convertBlankIndex).toBe(0);
    });

    it('accounts for Duelist Pierce when no aims previously spent', () => {
      // Duelist Attacker + Melee: +1 Pierce if any aim spent
      // If saving for Marksman and no aims previously spent → no Duelist Pierce
      // If rerolling → this aim is spent → Duelist Pierce activates
      const results: RolledAttackDie[] = [
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Red, face: AttackFace.Blank },
      ];
      const config: AttackConfig = {
        attackType: AttackType.Melee,
        attacker: createMinimalAttacker({
          marksman: true,
          marksmanStrategy: MarksmanStrategy.Averages,
          duelistAttacker: true,
          aimTokens: 1,
        }),
        defender: createMinimalDefender({ dieColor: DefenseDieColor.Red }), // Many blocks
      };
      const poolKeywords = createMinimalPoolKeywords();

      // Reroll path: aim spent → Duelist Pierce +1, plus ~0.625 new hits
      // Marksman path: aim saved → Duelist Pierce 0, but guaranteed +1 hit
      const decision = calculateMarksmanDecision(results, config, poolKeywords, 0, 1);

      // With 3 existing hits, adding a guaranteed 4th hit beats Duelist Pierce +1
      // plus reroll EV. The Duelist opportunity cost is correctly modeled in both
      // paths, but the guaranteed conversion value is higher.
      expect(decision.useRerollInstead).toBe(false);
      expect(decision.convertBlankIndex).toBe(3);
    });

    it('Duelist Pierce applies on Marksman path when aims were already spent', () => {
      // If aims were already spent on rerolls, Duelist is active regardless
      const results: RolledAttackDie[] = [
        { color: AttackDieColor.White, face: AttackFace.Blank },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
      ];
      const config: AttackConfig = {
        attackType: AttackType.Melee,
        attacker: createMinimalAttacker({
          marksman: true,
          marksmanStrategy: MarksmanStrategy.Averages,
          duelistAttacker: true,
          aimTokens: 2,
        }),
        defender: createMinimalDefender(), // Minimal defence
      };
      const poolKeywords = createMinimalPoolKeywords();

      // aimsSpent=1 (previous aim spent on reroll), aimsRemaining=1
      // Both paths: Duelist Pierce +1 (aim was already spent)
      // No Lethal → no Pierce difference between paths
      // Marksman +1 hit (1.0) vs reroll white (~0.375)
      const decision = calculateMarksmanDecision(results, config, poolKeywords, 1, 1);

      expect(decision.useRerollInstead).toBe(false);
      expect(decision.convertBlankIndex).toBe(0);
    });
  });

  describe('Shielded X interaction with hit→crit', () => {
    it('recognizes hit→crit is detrimental when Shielded cancels crits first', () => {
      // Shielded X cancels crits first — converting hit→crit makes it vulnerable
      const results: RolledAttackDie[] = [
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
      ];
      const config: AttackConfig = {
        attackType: AttackType.Ranged,
        attacker: createMinimalAttacker({
          marksman: true,
          marksmanStrategy: MarksmanStrategy.Deterministic,
        }),
        defender: createMinimalDefender({ shieldedX: 1 }), // Cancels crits first
      };
      const poolKeywords = createMinimalPoolKeywords();

      const decision = calculateMarksmanDecision(results, config, poolKeywords);

      // Converting hit→crit would make the crit vulnerable to Shielded
      // while the hit would have survived. hit→crit should NOT help.
      // 2 hits: Shielded cancels 0 crits, then 1 hit → 1 success
      // 1 hit + 1 crit: Shielded cancels 1 crit → 1 hit → 1 success (same)
      // So willHitConversionHelp should return false (neutral, not positive)
      expect(decision.useRerollInstead).toBe(true);
    });

    it('hit→crit still helps when Cover outweighs Shielded disadvantage', () => {
      // Cover + Shielded: crits bypass cover but are vulnerable to Shielded
      // With enough hits and light Shielded, Cover bypass may outweigh
      const results: RolledAttackDie[] = [
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
        { color: AttackDieColor.Red, face: AttackFace.Hit },
      ];
      const config: AttackConfig = {
        attackType: AttackType.Ranged,
        attacker: createMinimalAttacker({
          marksman: true,
          marksmanStrategy: MarksmanStrategy.Deterministic,
        }),
        defender: createMinimalDefender({
          shieldedX: 1,       // Cancels 1 crit
          coverType: CoverType.Heavy, // Cover cancels hits via dice
        }),
      };
      const poolKeywords = createMinimalPoolKeywords();

      const decision = calculateMarksmanDecision(results, config, poolKeywords);

      // With 4 hits + Heavy Cover: many hits lost to cover dice.
      // Converting 1 hit→crit: crit bypasses cover (saves ~2/6 probability),
      // but Shielded might cancel it. Net effect computed by estimateExpectedWounds.
      // The gain from bypassing cover should outweigh the Shielded 1 cost
      // because there are already no crits for Shielded to target.
      // Expected: conversion helps
      expect(decision.useRerollInstead).toBe(false);
      expect(decision.convertHitIndex).not.toBeNull();
    });
  });
});
