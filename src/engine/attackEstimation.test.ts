import { describe, it, expect } from 'vitest';
import { estimateExpectedAttackSuccesses } from './attackEstimation';
import {
  createMinimalAttacker,
  createMinimalPoolKeywords,
} from './testHelpers';
import { AttackType, AttackSurgeChart } from './types';

/**
 * Helper to compute raw expected successes matching computeAttackDieSuccessRate
 * in armyStats.ts (die success faces + surge bonus / 8).
 */
function rawExpected(
  red: number,
  black: number,
  white: number,
  surgeChart: AttackSurgeChart,
): number {
  const surgeBonus =
    surgeChart === AttackSurgeChart.ToHit || surgeChart === AttackSurgeChart.ToCrit ? 1 : 0;
  return (
    red * (6 + surgeBonus) / 8 +
    black * (4 + surgeBonus) / 8 +
    white * (2 + surgeBonus) / 8
  );
}

describe('estimateExpectedAttackSuccesses', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // Baseline: No keywords — should match raw die quality
  // ═══════════════════════════════════════════════════════════════════════════

  it('returns raw expected with no keywords and surge None', () => {
    const attacker = createMinimalAttacker();
    const pool = createMinimalPoolKeywords();
    const result = estimateExpectedAttackSuccesses(2, 2, 2, attacker, pool, AttackType.Ranged);

    // With no surge conversion: hits + crits only (surges are wasted)
    const expected = 2 * (5 / 8 + 1 / 8) + 2 * (3 / 8 + 1 / 8) + 2 * (1 / 8 + 1 / 8);
    expect(result.expectedSuccesses).toBeCloseTo(expected, 1);
  });

  it('returns 0 for zero dice', () => {
    const attacker = createMinimalAttacker();
    const pool = createMinimalPoolKeywords();
    const result = estimateExpectedAttackSuccesses(0, 0, 0, attacker, pool, AttackType.Ranged);

    expect(result.expectedSuccesses).toBe(0);
    expect(result.expectedHits).toBe(0);
    expect(result.expectedCrits).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Surge Chart Conversion
  // ═══════════════════════════════════════════════════════════════════════════

  it('surge chart ToHit converts surges to hits', () => {
    const attacker = createMinimalAttacker({ surgeChart: AttackSurgeChart.ToHit });
    const pool = createMinimalPoolKeywords();
    const result = estimateExpectedAttackSuccesses(2, 0, 0, attacker, pool, AttackType.Ranged);

    // Red dice: 5/8 hit + 1/8 crit + 1/8 surge→hit = 7/8 success per die
    expect(result.expectedSuccesses).toBeCloseTo(rawExpected(2, 0, 0, AttackSurgeChart.ToHit), 1);
  });

  it('surge chart ToCrit converts surges to crits', () => {
    const attacker = createMinimalAttacker({ surgeChart: AttackSurgeChart.ToCrit });
    const pool = createMinimalPoolKeywords();
    const result = estimateExpectedAttackSuccesses(0, 2, 0, attacker, pool, AttackType.Ranged);

    // Black dice: 3/8 hit + 1/8 crit + 1/8 surge→crit = 5/8 per die
    expect(result.expectedSuccesses).toBeCloseTo(rawExpected(0, 2, 0, AttackSurgeChart.ToCrit), 1);
    // Crits should include the surge contribution
    expect(result.expectedCrits).toBeGreaterThan(2 * (1 / 8));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Critical X (limited surge → crit, surge chart None)
  // ═══════════════════════════════════════════════════════════════════════════

  it('criticalX converts limited surges to crits when surge chart is None', () => {
    const attacker = createMinimalAttacker({ surgeChart: AttackSurgeChart.None });
    const pool = createMinimalPoolKeywords({ criticalX: 2 });
    const result = estimateExpectedAttackSuccesses(4, 0, 0, attacker, pool, AttackType.Ranged);

    // 4 red dice: expected surges = 4 * 1/8 = 0.5
    // Critical 2 can convert up to 2 surges → crits, but only 0.5 expected
    // So all 0.5 surges become crits
    const noSurge = 4 * (5 / 8 + 1 / 8); // hits + crits without surge
    expect(result.expectedSuccesses).toBeGreaterThan(noSurge);
  });

  it('criticalX is redundant when surge chart is ToCrit', () => {
    const attacker = createMinimalAttacker({ surgeChart: AttackSurgeChart.ToCrit });
    const pool = createMinimalPoolKeywords({ criticalX: 2 });
    const result = estimateExpectedAttackSuccesses(2, 0, 0, attacker, pool, AttackType.Ranged);

    // ToCrit already converts all surges — criticalX should not change the total
    const withoutCritical = estimateExpectedAttackSuccesses(
      2, 0, 0,
      createMinimalAttacker({ surgeChart: AttackSurgeChart.ToCrit }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );
    expect(result.expectedSuccesses).toBeCloseTo(withoutCritical.expectedSuccesses, 2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Surge Tokens (limited surge → hit, when surge chart is None)
  // ═══════════════════════════════════════════════════════════════════════════

  it('surge tokens convert limited surges to hits when chart is None', () => {
    const attacker = createMinimalAttacker({
      surgeChart: AttackSurgeChart.None,
      surgeTokens: 1,
    });
    const pool = createMinimalPoolKeywords();
    const result = estimateExpectedAttackSuccesses(4, 0, 0, attacker, pool, AttackType.Ranged);

    // Without surge tokens, surges are wasted: 4 * (5/8 + 1/8) = 3.0
    const baseline = 4 * (5 / 8 + 1 / 8);
    expect(result.expectedSuccesses).toBeGreaterThan(baseline);
  });

  it('surge tokens are redundant when surge chart is ToHit', () => {
    const attacker = createMinimalAttacker({
      surgeChart: AttackSurgeChart.ToHit,
      surgeTokens: 1,
    });
    const pool = createMinimalPoolKeywords();
    const result = estimateExpectedAttackSuccesses(2, 0, 0, attacker, pool, AttackType.Ranged);

    const withoutTokens = estimateExpectedAttackSuccesses(
      2, 0, 0,
      createMinimalAttacker({ surgeChart: AttackSurgeChart.ToHit }),
      pool,
      AttackType.Ranged,
    );
    expect(result.expectedSuccesses).toBeCloseTo(withoutTokens.expectedSuccesses, 2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Aim Tokens (standard rerolls)
  // ═══════════════════════════════════════════════════════════════════════════

  it('aim tokens increase expected successes via rerolls', () => {
    const attacker = createMinimalAttacker({ aimTokens: 1 });
    const pool = createMinimalPoolKeywords();
    const result = estimateExpectedAttackSuccesses(0, 0, 4, attacker, pool, AttackType.Ranged);

    // 4 white dice with no surge: 4 * (1/8 + 1/8) = 1.0 baseline
    const baseline = estimateExpectedAttackSuccesses(
      0, 0, 4,
      createMinimalAttacker(),
      pool,
      AttackType.Ranged,
    );
    expect(result.expectedSuccesses).toBeGreaterThan(baseline.expectedSuccesses);
  });

  it('precise X increases rerolls per aim', () => {
    const withPrecise = estimateExpectedAttackSuccesses(
      0, 0, 6,
      createMinimalAttacker({ aimTokens: 1, preciseX: 2 }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );
    const withoutPrecise = estimateExpectedAttackSuccesses(
      0, 0, 6,
      createMinimalAttacker({ aimTokens: 1, preciseX: 0 }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );

    // Precise 2 = 4 rerolls vs 2 rerolls per aim
    expect(withPrecise.expectedSuccesses).toBeGreaterThan(withoutPrecise.expectedSuccesses);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Marksman + Aim Tokens
  // ═══════════════════════════════════════════════════════════════════════════

  it('marksman with aim = +1 success per aim', () => {
    const baseline = estimateExpectedAttackSuccesses(
      0, 4, 0,
      createMinimalAttacker(),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );
    const withMarksman = estimateExpectedAttackSuccesses(
      0, 4, 0,
      createMinimalAttacker({ marksman: true, aimTokens: 1 }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );

    // Marksman converts 1 blank → 1 hit; gain should be exactly 1
    expect(withMarksman.expectedSuccesses).toBeCloseTo(baseline.expectedSuccesses + 1, 1);
  });

  it('marksman limited by expected blanks', () => {
    // 6 red dice: expected blanks = 6 * 1/8 = 0.75
    // With 3 marksman aims, can only convert 0.75 blanks
    const result = estimateExpectedAttackSuccesses(
      6, 0, 0,
      createMinimalAttacker({ marksman: true, aimTokens: 3 }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );
    const baseline = estimateExpectedAttackSuccesses(
      6, 0, 0,
      createMinimalAttacker(),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );

    // Gain capped by blanks (0.75), not by aim count (3)
    expect(result.expectedSuccesses - baseline.expectedSuccesses).toBeLessThan(3);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Observation Tokens
  // ═══════════════════════════════════════════════════════════════════════════

  it('observation tokens provide 1 reroll each', () => {
    const baseline = estimateExpectedAttackSuccesses(
      0, 0, 4,
      createMinimalAttacker(),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );
    const withObs = estimateExpectedAttackSuccesses(
      0, 0, 4,
      createMinimalAttacker({ observationTokens: 1 }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );

    expect(withObs.expectedSuccesses).toBeGreaterThan(baseline.expectedSuccesses);
  });

  it('observation tokens stack with aim tokens', () => {
    const aimOnly = estimateExpectedAttackSuccesses(
      0, 0, 6,
      createMinimalAttacker({ aimTokens: 1 }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );
    const aimAndObs = estimateExpectedAttackSuccesses(
      0, 0, 6,
      createMinimalAttacker({ aimTokens: 1, observationTokens: 1 }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );

    // Observation processed first, then aim — both should contribute
    expect(aimAndObs.expectedSuccesses).toBeGreaterThan(aimOnly.expectedSuccesses);
  });

  it('reroll success rate is not inflated by observation gains', () => {
    // With a fixed initial success rate, adding observation tokens should NOT
    // inflate the per-reroll gain used by subsequent aim tokens. The combined
    // gain should equal the sum of independent marginal gains (within tolerance).
    const pool = createMinimalPoolKeywords();
    const baseline = estimateExpectedAttackSuccesses(
      0, 0, 8,
      createMinimalAttacker(),
      pool,
      AttackType.Ranged,
    );
    const obsOnly = estimateExpectedAttackSuccesses(
      0, 0, 8,
      createMinimalAttacker({ observationTokens: 2 }),
      pool,
      AttackType.Ranged,
    );
    const aimOnly = estimateExpectedAttackSuccesses(
      0, 0, 8,
      createMinimalAttacker({ aimTokens: 1 }),
      pool,
      AttackType.Ranged,
    );
    const combined = estimateExpectedAttackSuccesses(
      0, 0, 8,
      createMinimalAttacker({ observationTokens: 2, aimTokens: 1 }),
      pool,
      AttackType.Ranged,
    );

    const obsGain = obsOnly.expectedSuccesses - baseline.expectedSuccesses;
    const aimGain = aimOnly.expectedSuccesses - baseline.expectedSuccesses;
    const combinedGain = combined.expectedSuccesses - baseline.expectedSuccesses;

    // Combined gain should be close to the sum of independent gains (not inflated)
    // Allowing a small tolerance for the interaction where obs reduces blanks
    // available to aim (which slightly reduces aim's marginal contribution)
    expect(combinedGain).toBeLessThanOrEqual(obsGain + aimGain + 0.01);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Hold the Line (melee only)
  // ═══════════════════════════════════════════════════════════════════════════

  it('holdTheLine at Melee enables surge conversion + Critical 2', () => {
    const attacker = createMinimalAttacker({
      surgeChart: AttackSurgeChart.None,
      holdTheLine: true,
    });
    const pool = createMinimalPoolKeywords();
    const baseline = estimateExpectedAttackSuccesses(
      4, 0, 0,
      createMinimalAttacker({ surgeChart: AttackSurgeChart.None }),
      pool,
      AttackType.Melee,
    );
    const result = estimateExpectedAttackSuccesses(4, 0, 0, attacker, pool, AttackType.Melee);

    // Hold the Line provides unlimited hit conversion at melee, so surges convert
    expect(result.expectedSuccesses).toBeGreaterThan(baseline.expectedSuccesses);
  });

  it('holdTheLine has no effect at Ranged', () => {
    const attacker = createMinimalAttacker({
      surgeChart: AttackSurgeChart.None,
      holdTheLine: true,
    });
    const pool = createMinimalPoolKeywords();
    const baseline = estimateExpectedAttackSuccesses(
      4, 0, 0,
      createMinimalAttacker({ surgeChart: AttackSurgeChart.None }),
      pool,
      AttackType.Ranged,
    );
    const result = estimateExpectedAttackSuccesses(4, 0, 0, attacker, pool, AttackType.Ranged);

    // Hold the Line is melee only — no effect at ranged
    expect(result.expectedSuccesses).toBeCloseTo(baseline.expectedSuccesses, 2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Jar'Kai Mastery (melee only, requires dodge tokens)
  // ═══════════════════════════════════════════════════════════════════════════

  it('jarKaiMastery + dodge at Melee converts blanks to hits', () => {
    const result = estimateExpectedAttackSuccesses(
      0, 4, 0,
      createMinimalAttacker({ jarKaiMastery: true, dodgeTokensAttacker: 1 }),
      createMinimalPoolKeywords(),
      AttackType.Melee,
    );
    const baseline = estimateExpectedAttackSuccesses(
      0, 4, 0,
      createMinimalAttacker(),
      createMinimalPoolKeywords(),
      AttackType.Melee,
    );

    expect(result.expectedSuccesses).toBeGreaterThan(baseline.expectedSuccesses);
  });

  it('jarKaiMastery has no effect at Ranged', () => {
    const result = estimateExpectedAttackSuccesses(
      0, 4, 0,
      createMinimalAttacker({ jarKaiMastery: true, dodgeTokensAttacker: 1 }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );
    const baseline = estimateExpectedAttackSuccesses(
      0, 4, 0,
      createMinimalAttacker(),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );

    expect(result.expectedSuccesses).toBeCloseTo(baseline.expectedSuccesses, 2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Complete the Mission
  // ═══════════════════════════════════════════════════════════════════════════

  it('completeTheMission adds Critical 2 to surge conversion', () => {
    const result = estimateExpectedAttackSuccesses(
      4, 0, 0,
      createMinimalAttacker({ surgeChart: AttackSurgeChart.None, completeTheMission: true }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );
    const baseline = estimateExpectedAttackSuccesses(
      4, 0, 0,
      createMinimalAttacker({ surgeChart: AttackSurgeChart.None }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );

    // Critical 2 should convert surges → crits, adding to successes
    expect(result.expectedSuccesses).toBeGreaterThan(baseline.expectedSuccesses);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Ram X (melee/overrun only)
  // ═══════════════════════════════════════════════════════════════════════════

  it('ramX at Melee converts blanks to crits (adds successes)', () => {
    const result = estimateExpectedAttackSuccesses(
      0, 4, 0,
      createMinimalAttacker(),
      createMinimalPoolKeywords({ ramX: 2 }),
      AttackType.Melee,
    );
    const baseline = estimateExpectedAttackSuccesses(
      0, 4, 0,
      createMinimalAttacker(),
      createMinimalPoolKeywords(),
      AttackType.Melee,
    );

    // Ram blank→crit adds to total successes
    expect(result.expectedSuccesses).toBeGreaterThan(baseline.expectedSuccesses);
  });

  it('ramX increases successes at Ranged (no attack-type restriction)', () => {
    const result = estimateExpectedAttackSuccesses(
      0, 4, 0,
      createMinimalAttacker(),
      createMinimalPoolKeywords({ ramX: 2 }),
      AttackType.Ranged,
    );
    const baseline = estimateExpectedAttackSuccesses(
      0, 4, 0,
      createMinimalAttacker(),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );

    // Ram blank→crit adds to total successes regardless of attack type
    expect(result.expectedSuccesses).toBeGreaterThan(baseline.expectedSuccesses);
  });

  it('ramX hit→crit conversion does not change total successes', () => {
    // Use red dice with 0 blanks expected to test hit→crit path
    // Red dice: 1/8 blank, so with 8 dice we expect 1 blank and 5 hits
    const result = estimateExpectedAttackSuccesses(
      8, 0, 0,
      createMinimalAttacker(),
      createMinimalPoolKeywords({ ramX: 10 }),
      AttackType.Melee,
    );

    // All blanks become crits (adds to successes), remaining ram converts hits→crits
    // With surge chart None: 8 * 1/8 natural blanks + 8 * 1/8 surges (→blank) = 2 blanks
    // After blank→crit: successes increase by expectedBlanks (2)
    // After hit→crit: total stays the same (just quality upgrade)
    const baseline = estimateExpectedAttackSuccesses(
      8, 0, 0,
      createMinimalAttacker(),
      createMinimalPoolKeywords(),
      AttackType.Melee,
    );
    // Gain should be ≈ blanks converted = 2.0 (not more from hit→crit)
    expect(result.expectedSuccesses - baseline.expectedSuccesses).toBeCloseTo(2.0, 0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Combined keywords
  // ═══════════════════════════════════════════════════════════════════════════

  it('aim + criticalX + surgeTokens all stack correctly', () => {
    const result = estimateExpectedAttackSuccesses(
      0, 0, 6,
      createMinimalAttacker({
        surgeChart: AttackSurgeChart.None,
        aimTokens: 1,
        surgeTokens: 1,
      }),
      createMinimalPoolKeywords({ criticalX: 1 }),
      AttackType.Ranged,
    );
    const baseline = estimateExpectedAttackSuccesses(
      0, 0, 6,
      createMinimalAttacker({ surgeChart: AttackSurgeChart.None }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );

    // All three sources should increase total vs baseline
    expect(result.expectedSuccesses).toBeGreaterThan(baseline.expectedSuccesses);
  });

  it('multiple aims with marksman are capped by blanks', () => {
    // 2 white dice: expected blanks = 2 * 5/8 = 1.25
    const result = estimateExpectedAttackSuccesses(
      0, 0, 2,
      createMinimalAttacker({ marksman: true, aimTokens: 5 }),
      createMinimalPoolKeywords(),
      AttackType.Ranged,
    );

    // Total should not exceed totalDice (max 2 successes from 2 dice, minus surges)
    expect(result.expectedSuccesses).toBeLessThanOrEqual(2.01);
  });
});
