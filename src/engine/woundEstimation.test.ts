import { describe, it, expect } from 'vitest';
import { estimateExpectedWounds } from './woundEstimation';
import { AttackType, DefenseDieColor, DefenseSurgeChart, CoverType } from './types';
import { createMinimalAttacker, createMinimalDefender, createMinimalPoolKeywords } from './testHelpers';
import type { AttackConfig } from './types';

describe('woundEstimation', () => {
  describe('estimateExpectedWounds', () => {
    // Helper to build a config quickly
    function makeConfig(
      attackerOverrides: Partial<Parameters<typeof createMinimalAttacker>[0]> = {},
      defenderOverrides: Partial<Parameters<typeof createMinimalDefender>[0]> = {},
      attackType: AttackType = AttackType.Ranged
    ): AttackConfig {
      return {
        attackType,
        attacker: createMinimalAttacker(attackerOverrides),
        defender: createMinimalDefender(defenderOverrides),
      };
    }

    describe('basic wound calculation', () => {
      it('returns hits + crits with no defender keywords (white die, no surge conversion)', () => {
        const config = makeConfig({}, { dieColor: DefenseDieColor.White });
        const pool = createMinimalPoolKeywords();
        // 3 hits, 1 crit against white die with no surge chart
        // Defense: 4 dice * 1/6 block = 0.667 expected blocks
        // Wounds = 4 - 0.667 = 3.333
        const result = estimateExpectedWounds(3, 1, config, pool);
        expect(result).toBeCloseTo(4 - 4 * (1 / 6), 5);
      });

      it('returns 0 when no hits or crits', () => {
        const config = makeConfig();
        const pool = createMinimalPoolKeywords();
        expect(estimateExpectedWounds(0, 0, config, pool)).toBe(0);
      });

      it('accounts for red defense die higher block probability', () => {
        const config = makeConfig({}, { dieColor: DefenseDieColor.Red });
        const pool = createMinimalPoolKeywords();
        // 4 successes: 4 * 3/6 = 2 expected blocks → 2 wounds
        expect(estimateExpectedWounds(2, 2, config, pool)).toBeCloseTo(4 - 4 * (3 / 6), 5);
      });

      it('accounts for defense surge chart ToBlock', () => {
        const config = makeConfig({}, {
          dieColor: DefenseDieColor.White,
          surgeChart: DefenseSurgeChart.ToBlock,
        });
        const pool = createMinimalPoolKeywords();
        // White + surge:block → 2/6 block prob. 4 dice * 2/6 = 1.333 blocks
        const result = estimateExpectedWounds(2, 2, config, pool);
        expect(result).toBeCloseTo(4 - 4 * (2 / 6), 5);
      });
    });

    describe('sequence order: Cover + Dodge before Step 6 modifiers', () => {
      it('applies cover BEFORE Armor (Step 5 before Step 6)', () => {
        // 3 hits vs Light Cover + Armor 2 (white die, no surge)
        // Correct order: Cover first reduces hits, then Armor
        // Cover: 3 hits * 1/6 = 0.5 cover blocks → ~2.5 hits survive cover
        // Armor: 2.5 - 2 = 0.5 hits survive armor, 0 crits
        // Defense: 0.5 dice * 1/6 = ~0.083 blocks
        // Wounds: 0.5 - 0.083 ≈ 0.417
        //
        // WRONG old order: Armor first → 3 - 2 = 1 hit, then cover: 1 * 1/6 = 0.167 blocks
        // → 0.833 hits, defense: 0.833 * 1/6 → ~0.694 wounds
        const config = makeConfig(
          {},
          { coverType: CoverType.Light, armorX: 2, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();
        const result = estimateExpectedWounds(3, 0, config, pool);

        // With correct order, result should be less than the wrong order result
        // We verify by checking against the formula:
        // hitsAfterCover = 3 - 3*(1/6) = 2.5
        // hitsAfterArmor = max(0, 2.5 - 2) = 0.5
        // defenseBlocks = 0.5 * 1/6 = 0.0833
        // wounds = 0.5 - 0.0833 = 0.4167
        expect(result).toBeCloseTo(0.4167, 3);
      });

      it('applies dodge BEFORE Ram/Impact/Armor', () => {
        // 2 hits, 1 crit vs Dodge 1 + Armor 1 (white die, no surge)
        // Correct: Dodge cancels 1 hit → 1 hit, 1 crit. Then Armor cancels 1 hit → 0 hits, 1 crit
        // Defense: 1 die * 1/6 = 0.167. Wounds = 1 - 0.167 = 0.833
        const config = makeConfig(
          {},
          { dodgeTokens: 1, armorX: 1, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();
        const result = estimateExpectedWounds(2, 1, config, pool);
        expect(result).toBeCloseTo(1 - 1 * (1 / 6), 3);
      });
    });

    describe('High Velocity prevents ALL dodge spending', () => {
      it('does not cancel any hits or crits when HV is active', () => {
        const config = makeConfig(
          {},
          { dodgeTokens: 3, dieColor: DefenseDieColor.White }
        );
        const poolHV = createMinimalPoolKeywords({ highVelocity: true });
        const poolNoHV = createMinimalPoolKeywords({ highVelocity: false });

        const withHV = estimateExpectedWounds(2, 1, config, poolHV);
        const withoutHV = estimateExpectedWounds(2, 1, config, poolNoHV);

        // With HV: no dodge → more wounds
        expect(withHV).toBeGreaterThan(withoutHV);
        // With HV: 3 successes, 3 dice * 1/6 = 0.5 blocks, wounds = 2.5
        expect(withHV).toBeCloseTo(3 - 3 * (1 / 6), 5);
      });
    });

    describe('cover estimation', () => {
      it('uses determineCoverValue which integrates Sharpshooter', () => {
        const configNoSharp = makeConfig(
          { sharpshooterX: 0 },
          { coverType: CoverType.Light, dieColor: DefenseDieColor.White }
        );
        const configWithSharp = makeConfig(
          { sharpshooterX: 1 },
          { coverType: CoverType.Light, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        const withoutSharp = estimateExpectedWounds(3, 0, configNoSharp, pool);
        const withSharp = estimateExpectedWounds(3, 0, configWithSharp, pool);

        // Sharpshooter 1 reduces Light cover (value 1) to 0 → more wounds
        expect(withSharp).toBeGreaterThan(withoutSharp);
      });

      it('uses determineCoverValue which integrates Death From Above', () => {
        const configNoDFA = makeConfig(
          { deathFromAbove: false },
          { coverType: CoverType.Heavy, dieColor: DefenseDieColor.White }
        );
        const configWithDFA = makeConfig(
          { deathFromAbove: true },
          { coverType: CoverType.Heavy, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        const withoutDFA = estimateExpectedWounds(3, 0, configNoDFA, pool);
        const withDFA = estimateExpectedWounds(3, 0, configWithDFA, pool);

        // Death From Above sets cover to 0 → more wounds
        expect(withDFA).toBeGreaterThan(withoutDFA);
      });

      it('Blast + Immune: Blast still applies cover', () => {
        const configBlastImBlast = makeConfig(
          {},
          { coverType: CoverType.Heavy, immuneBlast: true, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords({ blast: true });

        // Immune Blast means Blast doesn't negate cover
        // Heavy cover: 3 hits * 2/6 = 1.0 cover blocks
        const result = estimateExpectedWounds(3, 0, configBlastImBlast, pool);
        const noCoverResult = estimateExpectedWounds(3, 0,
          makeConfig({}, { dieColor: DefenseDieColor.White }),
          pool
        );

        expect(result).toBeLessThan(noCoverResult);
      });

      it('Dug In changes cover die to red for Light cover (blocks only)', () => {
        // Light cover: only block faces cancel (not surges)
        // White die light: 1/6 block prob
        // Red die light (dugIn): 3/6 block prob (3 block faces, surges don't count for light)
        const configWhite = makeConfig(
          {},
          { coverType: CoverType.Light, dugIn: false, dieColor: DefenseDieColor.White }
        );
        const configDugIn = makeConfig(
          {},
          { coverType: CoverType.Light, dugIn: true, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        const whiteCover = estimateExpectedWounds(3, 0, configWhite, pool);
        const dugInCover = estimateExpectedWounds(3, 0, configDugIn, pool);

        // Dug In (red cover die) blocks more → fewer wounds
        expect(dugInCover).toBeLessThan(whiteCover);

        // Verify exact probabilities:
        // White light: coverBlocks = 3 * 1/6 = 0.5, hitsAfterCover = 2.5
        // DugIn light: coverBlocks = 3 * 3/6 = 1.5, hitsAfterCover = 1.5
        // (Then defense dice differ based on remaining successes)
      });

      it('Dug In changes cover die to red for Heavy cover (blocks + surges)', () => {
        // Heavy cover: blocks AND surges cancel
        // White die heavy: 2/6 prob (1 block + 1 surge)
        // Red die heavy (dugIn): 4/6 prob (3 blocks + 1 surge)
        const configWhite = makeConfig(
          {},
          { coverType: CoverType.Heavy, dugIn: false, dieColor: DefenseDieColor.White }
        );
        const configDugIn = makeConfig(
          {},
          { coverType: CoverType.Heavy, dugIn: true, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        const whiteCover = estimateExpectedWounds(6, 0, configWhite, pool);
        const dugInCover = estimateExpectedWounds(6, 0, configDugIn, pool);

        // Dug In heavy should block significantly more
        expect(dugInCover).toBeLessThan(whiteCover);
      });

      it('Low Profile reduces cover pool by 1 die and adds 1 guaranteed block', () => {
        const configNoLP = makeConfig(
          {},
          { coverType: CoverType.Light, lowProfile: false, dieColor: DefenseDieColor.White }
        );
        const configLP = makeConfig(
          {},
          { coverType: CoverType.Light, lowProfile: true, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        const noLP = estimateExpectedWounds(3, 0, configNoLP, pool);
        const withLP = estimateExpectedWounds(3, 0, configLP, pool);

        // Low Profile should block more → fewer wounds
        // LP: 1 auto block + (3-1)=2 dice * 1/6 = 1.333 cover blocks
        // No LP: 3 dice * 1/6 = 0.5 cover blocks
        expect(withLP).toBeLessThan(noLP);
      });
    });

    describe('Step 6 modifier keywords', () => {
      it('Ram X converts hits to crits in melee', () => {
        // 3 hits, 0 crits with Ram 2 in melee vs no armor
        // Ram converts 2 hits → crits: 1 hit, 2 crits
        // Total successes same but crits bypass things
        const configMelee = makeConfig(
          {},
          { armorX: 2, dieColor: DefenseDieColor.White },
          AttackType.Melee
        );
        const poolNoRam = createMinimalPoolKeywords();
        const poolRam = createMinimalPoolKeywords({ ramX: 2 });

        const noRam = estimateExpectedWounds(3, 0, configMelee, poolNoRam);
        const withRam = estimateExpectedWounds(3, 0, configMelee, poolRam);

        // Ram makes crits bypass Armor → more wounds
        expect(withRam).toBeGreaterThan(noRam);
      });

      it('Weak Point X adds to effective Impact', () => {
        const config = makeConfig(
          {},
          { armorX: 2, weakPointX: 1, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords({ impactX: 1 });

        // Effective impact = 1 + 1 = 2 → converts 2 of 3 hits to crits
        // Then Armor 2 cancels remaining 1 hit → but 2 crits survive
        const result = estimateExpectedWounds(3, 0, config, pool);

        // Without Weak Point: impact 1, converts 1 hit. Armor cancels 2 hits → 0 hits + 1 crit
        const configNoWP = makeConfig(
          {},
          { armorX: 2, weakPointX: 0, dieColor: DefenseDieColor.White }
        );
        const resultNoWP = estimateExpectedWounds(3, 0, configNoWP, pool);

        expect(result).toBeGreaterThan(resultNoWP);
      });

      it('Shielded X cancels crits first then hits (Ranged only)', () => {
        const config = makeConfig(
          {},
          { shieldedX: 2, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        // 2 hits, 2 crits → Shielded 2 cancels 2 crits → 2 hits, 0 crits
        const result = estimateExpectedWounds(2, 2, config, pool);
        // Compare to no shield:
        const configNoShield = makeConfig({}, { dieColor: DefenseDieColor.White });
        const resultNoShield = estimateExpectedWounds(2, 2, configNoShield, pool);

        expect(result).toBeLessThan(resultNoShield);
      });

      it('Shielded X does not apply to Melee', () => {
        const config = makeConfig(
          {},
          { shieldedX: 2, dieColor: DefenseDieColor.White },
          AttackType.Melee
        );
        const pool = createMinimalPoolKeywords();

        const configNoShield = makeConfig(
          {},
          { dieColor: DefenseDieColor.White },
          AttackType.Melee
        );

        const shielded = estimateExpectedWounds(2, 2, config, pool);
        const noShield = estimateExpectedWounds(2, 2, configNoShield, pool);

        // Shielded doesn't apply to Melee → same result
        expect(shielded).toBeCloseTo(noShield, 5);
      });

      it('Backup cancels 2 hits (Ranged only)', () => {
        const config = makeConfig(
          {},
          { backup: true, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        // 4 hits → Backup cancels 2 → 2 hits
        const result = estimateExpectedWounds(4, 0, config, pool);
        const configNoBackup = makeConfig({}, { dieColor: DefenseDieColor.White });
        const resultNoBackup = estimateExpectedWounds(4, 0, configNoBackup, pool);

        expect(result).toBeLessThan(resultNoBackup);
      });

      it('Guardian X absorbs hits with separate defense (Ranged only)', () => {
        const config = makeConfig(
          {},
          {
            guardianX: 2,
            guardianDieColor: DefenseDieColor.Red,
            guardianSurgeChart: DefenseSurgeChart.None,
            dieColor: DefenseDieColor.White,
          }
        );
        const pool = createMinimalPoolKeywords();

        // 4 hits → Guardian absorbs 2 (defended by red dice: 3/6 block each)
        // Guardian: 2 absorbed, 2 * 3/6 = 1 expected blocks → 1 guardian wound
        // Main: 2 hits remain, 2 * 1/6 = 0.333 blocks → 1.667 main wounds
        // Total = 1 + 1.667 = 2.667
        const result = estimateExpectedWounds(4, 0, config, pool);

        // Without guardian: 4 * 1/6 = 0.667 blocks → 3.333 wounds
        const configNoGuardian = makeConfig({}, { dieColor: DefenseDieColor.White });
        const resultNoGuardian = estimateExpectedWounds(4, 0, configNoGuardian, pool);

        expect(result).toBeLessThan(resultNoGuardian);
      });
    });

    describe('defense dice estimation', () => {
      it('Danger Sense X adds bonus defense dice', () => {
        const config = makeConfig(
          {},
          {
            dangerSenseX: 3,
            suppressionTokens: 2,
            dieColor: DefenseDieColor.White,
          }
        );
        const pool = createMinimalPoolKeywords();

        // min(3, 2) = 2 bonus dice
        // 2 hits: 2 base dice + 2 danger sense = 4 dice
        const result = estimateExpectedWounds(2, 0, config, pool);

        const configNoDanger = makeConfig({}, { dieColor: DefenseDieColor.White });
        const resultNoDanger = estimateExpectedWounds(2, 0, configNoDanger, pool);

        expect(result).toBeLessThan(resultNoDanger);
      });

      it('disableDefenseDice skips defense dice entirely', () => {
        const config = makeConfig(
          {},
          { disableDefenseDice: true, dieColor: DefenseDieColor.Red }
        );
        const pool = createMinimalPoolKeywords();

        // No defense dice → wounds = successes (minus cover/dodge)
        const result = estimateExpectedWounds(3, 1, config, pool);
        expect(result).toBe(4);
      });

      it('Soresu Mastery improves defense block probability (Ranged only)', () => {
        const configSoresu = makeConfig(
          {},
          { soresuMastery: true, dieColor: DefenseDieColor.White }
        );
        const configNoSoresu = makeConfig(
          {},
          { dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        const withSoresu = estimateExpectedWounds(3, 0, configSoresu, pool);
        const withoutSoresu = estimateExpectedWounds(3, 0, configNoSoresu, pool);

        // Soresu → better defense → fewer wounds
        expect(withSoresu).toBeLessThan(withoutSoresu);
      });

      it('Soresu Mastery does not apply to Melee', () => {
        const configSoresu = makeConfig(
          {},
          { soresuMastery: true, dieColor: DefenseDieColor.White },
          AttackType.Melee
        );
        const configNoSoresu = makeConfig(
          {},
          { dieColor: DefenseDieColor.White },
          AttackType.Melee
        );
        const pool = createMinimalPoolKeywords();

        const withSoresu = estimateExpectedWounds(3, 0, configSoresu, pool);
        const withoutSoresu = estimateExpectedWounds(3, 0, configNoSoresu, pool);

        expect(withSoresu).toBeCloseTo(withoutSoresu, 5);
      });

      it('Uncanny Luck X improves defense', () => {
        const configUL = makeConfig(
          {},
          { uncannyLuckX: 2, dieColor: DefenseDieColor.White }
        );
        const configNoUL = makeConfig(
          {},
          { dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        const withUL = estimateExpectedWounds(4, 0, configUL, pool);
        const withoutUL = estimateExpectedWounds(4, 0, configNoUL, pool);

        // Uncanny Luck rerolls → better defense → fewer wounds
        expect(withUL).toBeLessThan(withoutUL);
      });
    });

    describe('defense surge conversion sources', () => {
      it('Deflect provides surge conversion for Ranged attacks', () => {
        const configDeflect = makeConfig(
          {},
          { deflect: true, dieColor: DefenseDieColor.White }
        );
        const configNoDeflect = makeConfig(
          {},
          { dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        const withDeflect = estimateExpectedWounds(3, 0, configDeflect, pool);
        const withoutDeflect = estimateExpectedWounds(3, 0, configNoDeflect, pool);

        // Deflect → surge:block for Ranged → better defense
        expect(withDeflect).toBeLessThan(withoutDeflect);
      });

      it('Deflect is disabled by High Velocity', () => {
        const config = makeConfig(
          {},
          { deflect: true, dieColor: DefenseDieColor.White }
        );
        const poolHV = createMinimalPoolKeywords({ highVelocity: true });
        const poolNoHV = createMinimalPoolKeywords({ highVelocity: false });

        const withHV = estimateExpectedWounds(3, 0, config, poolHV);
        const withoutHV = estimateExpectedWounds(3, 0, config, poolNoHV);

        // HV disables Deflect → more wounds
        expect(withHV).toBeGreaterThan(withoutHV);
      });

      it('Block keyword provides surge conversion when dodge would be spent', () => {
        const config = makeConfig(
          {},
          { block: true, dodgeTokens: 1, dieColor: DefenseDieColor.White }
        );
        const configNoBlock = makeConfig(
          {},
          { dodgeTokens: 1, dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        // With Block: dodge is spent (cancels 1 hit), then surges convert to blocks
        // Without Block: dodge spent but no surge conversion
        const withBlock = estimateExpectedWounds(3, 0, config, pool);
        const withoutBlock = estimateExpectedWounds(3, 0, configNoBlock, pool);

        expect(withBlock).toBeLessThan(withoutBlock);
      });

      it('Hold the Line provides surge conversion', () => {
        const config = makeConfig(
          {},
          { holdTheLine: true, dieColor: DefenseDieColor.White }
        );
        const configNoHTL = makeConfig(
          {},
          { dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        const withHTL = estimateExpectedWounds(3, 0, config, pool);
        const withoutHTL = estimateExpectedWounds(3, 0, configNoHTL, pool);

        // Hold the Line → surge:block → better defense
        expect(withHTL).toBeLessThan(withoutHTL);
      });

      it('Surge Tokens provide limited surge conversion', () => {
        const config = makeConfig(
          {},
          { surgeTokens: 1, dieColor: DefenseDieColor.White }
        );
        const configNoTokens = makeConfig(
          {},
          { dieColor: DefenseDieColor.White }
        );
        const pool = createMinimalPoolKeywords();

        const withTokens = estimateExpectedWounds(4, 0, config, pool);
        const withoutTokens = estimateExpectedWounds(4, 0, configNoTokens, pool);

        // Surge tokens convert some surges → better defense
        expect(withTokens).toBeLessThan(withoutTokens);
      });
    });

    describe('Pierce and immunities', () => {
      it('Pierce X reduces blocks', () => {
        const config = makeConfig({}, { dieColor: DefenseDieColor.Red });
        const poolPierce = createMinimalPoolKeywords({ pierceX: 2 });
        const poolNoPierce = createMinimalPoolKeywords();

        const withPierce = estimateExpectedWounds(3, 0, config, poolPierce);
        const withoutPierce = estimateExpectedWounds(3, 0, config, poolNoPierce);

        expect(withPierce).toBeGreaterThan(withoutPierce);
      });

      it('Immune: Pierce negates Pierce', () => {
        const config = makeConfig({}, {
          immunePierce: true,
          dieColor: DefenseDieColor.Red,
        });
        const pool = createMinimalPoolKeywords({ pierceX: 3 });

        const withImmune = estimateExpectedWounds(3, 0, config, pool);

        // Compare to no pierce at all (should be same)
        const configNoImmune = makeConfig({}, { dieColor: DefenseDieColor.Red });
        const noPierce = estimateExpectedWounds(3, 0, configNoImmune, createMinimalPoolKeywords());

        expect(withImmune).toBeCloseTo(noPierce, 5);
      });

      it('Makashi Mastery reduces Pierce by 1 and overrides Immune: Pierce in Melee', () => {
        const config = makeConfig(
          { makashiMastery: true },
          { immunePierce: true, dieColor: DefenseDieColor.Red },
          AttackType.Melee
        );
        const pool = createMinimalPoolKeywords({ pierceX: 3 });

        // Makashi: pierce = 3 - 1 = 2; Immune Pierce disabled by Makashi
        const result = estimateExpectedWounds(3, 0, config, pool);

        // Compare to no Makashi + Immune Pierce → pierce = 0
        const configNoMakashi = makeConfig(
          {},
          { immunePierce: true, dieColor: DefenseDieColor.Red },
          AttackType.Melee
        );
        const noMakashi = estimateExpectedWounds(3, 0, configNoMakashi, pool);

        // Makashi → actually gets pierce through → more wounds
        expect(result).toBeGreaterThan(noMakashi);
      });

      it('Makashi Mastery disables Impervious in Melee', () => {
        // Use red defense die + high pierce + enough hits so the Impervious
        // bonus dice difference outweighs the 1 pierce Makashi costs.
        const config = makeConfig(
          { makashiMastery: true },
          { impervious: true, dieColor: DefenseDieColor.Red },
          AttackType.Melee
        );
        const pool = createMinimalPoolKeywords({ pierceX: 3 });

        // With Makashi: pierce=3-1=2, no Impervious bonus dice
        // 6 dice * 3/6 = 3 blocks - 2 pierce = 1 → 5 wounds
        const result = estimateExpectedWounds(6, 0, config, pool);

        // Without Makashi: pierce=3, Impervious adds 3 bonus dice → 9 dice
        // 9 * 3/6 = 4.5 blocks - 3 pierce = 1.5 → 4.5 wounds
        const configNoMakashi = makeConfig(
          {},
          { impervious: true, dieColor: DefenseDieColor.Red },
          AttackType.Melee
        );
        const noMakashi = estimateExpectedWounds(6, 0, configNoMakashi, pool);

        // Makashi → disables Impervious (fewer bonus dice) → more wounds
        expect(result).toBeGreaterThan(noMakashi);
      });

      it('Duelist Defender grants Immune Pierce for Melee + dodge spent', () => {
        const config = makeConfig(
          {},
          { duelistDefender: true, dodgeTokens: 1, dieColor: DefenseDieColor.Red },
          AttackType.Melee
        );
        const pool = createMinimalPoolKeywords({ pierceX: 3 });

        // Dodge spent on hit + duelist → pierce zeroed
        const result = estimateExpectedWounds(3, 0, config, pool);

        // Compare to no duelist (pierce applies)
        const configNoDuelist = makeConfig(
          {},
          { dodgeTokens: 1, dieColor: DefenseDieColor.Red },
          AttackType.Melee
        );
        const noDuelist = estimateExpectedWounds(3, 0, configNoDuelist, pool);

        // Duelist blocks pierce → fewer wounds
        expect(result).toBeLessThan(noDuelist);
      });
    });

    describe('Impervious', () => {
      it('adds bonus defense dice equal to Pierce X', () => {
        // Use red defense die + enough hits so bonus dice blocks aren't fully
        // consumed by pierce, making the impervious difference observable.
        const configImpervious = makeConfig(
          {},
          { impervious: true, dieColor: DefenseDieColor.Red }
        );
        const configNoImpervious = makeConfig(
          {},
          { dieColor: DefenseDieColor.Red }
        );
        const pool = createMinimalPoolKeywords({ pierceX: 2 });

        const withImpervious = estimateExpectedWounds(6, 0, configImpervious, pool);
        const withoutImpervious = estimateExpectedWounds(6, 0, configNoImpervious, pool);

        // Impervious adds 2 bonus red dice → more blocks → fewer wounds
        // 8 dice * 3/6 = 4 blocks - 2 pierce = 2 effective (with impervious)
        // 6 dice * 3/6 = 3 blocks - 2 pierce = 1 effective (without)
        expect(withImpervious).toBeLessThan(withoutImpervious);
      });
    });

    describe('additionalPierce parameter', () => {
      it('additionalPierce increases wounds via extra Pierce', () => {
        const config = makeConfig({}, { dieColor: DefenseDieColor.Red });
        const pool = createMinimalPoolKeywords();

        const withoutExtra = estimateExpectedWounds(4, 0, config, pool);
        const withExtra = estimateExpectedWounds(4, 0, config, pool, 2);

        // Additional Pierce 2 cancels 2 more blocks → more wounds
        expect(withExtra).toBeGreaterThan(withoutExtra);
        expect(withExtra - withoutExtra).toBeCloseTo(2, 5);
      });

      it('additionalPierce is used for Impervious bonus dice', () => {
        const config = makeConfig(
          {},
          { impervious: true, dieColor: DefenseDieColor.Red }
        );
        const pool = createMinimalPoolKeywords({ pierceX: 1 });

        // With additionalPierce=2, total pierce = 3 → Impervious adds 3 bonus dice
        const moreImpervious = estimateExpectedWounds(6, 0, config, pool, 2);
        // With additionalPierce=0, total pierce = 1 → Impervious adds 1 bonus die
        const lessImpervious = estimateExpectedWounds(6, 0, config, pool, 0);

        // More Pierce means more Impervious dice, but also more Pierce cancel.
        // Net effect depends on specifics, but at least they should differ.
        expect(moreImpervious).not.toEqual(lessImpervious);
      });
    });
  });
});
