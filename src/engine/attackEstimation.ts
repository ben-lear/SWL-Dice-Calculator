/**
 * Deterministic expected attack output estimator.
 *
 * Computes expected hits + crits from a dice pool and attacker configuration
 * WITHOUT rolling dice. Reuses the engine's surge conversion utilities for
 * consistency with the simulation path.
 *
 * This is the attack-side complement to woundEstimation.ts (which handles
 * defense-side EV from given hits/crits). Together they cover Steps 4–9 of
 * the attack sequence deterministically.
 *
 * Die face distributions (8-sided):
 *   Red:   5 hit, 1 crit, 1 surge, 1 blank
 *   Black: 3 hit, 1 crit, 1 surge, 3 blank
 *   White: 1 hit, 1 crit, 1 surge, 5 blank
 */

import type { AttackerConfig, AggregatedWeaponKeywords } from './types';
import { AttackType } from './types';
import { calculateSurgeConversionsByType } from './surgeConversionUtils';

// ============================================================================
// Die Face Probabilities (per 8-sided attack die)
// ============================================================================

/** Expected hits per die color (out of 8 faces) */
const HITS_PER_DIE: Record<string, number> = { red: 5 / 8, black: 3 / 8, white: 1 / 8 };
/** Expected crits per die color (out of 8 faces) */
const CRITS_PER_DIE: Record<string, number> = { red: 1 / 8, black: 1 / 8, white: 1 / 8 };
/** Expected surges per die color (out of 8 faces) */
const SURGES_PER_DIE: Record<string, number> = { red: 1 / 8, black: 1 / 8, white: 1 / 8 };
/** Expected blanks per die color (out of 8 faces) */
const BLANKS_PER_DIE: Record<string, number> = { red: 1 / 8, black: 3 / 8, white: 5 / 8 };

/** Result of attack output estimation */
export interface AttackEstimationResult {
  /** Expected hit results (after surge conversion, rerolls, and conversions) */
  expectedHits: number;
  /** Expected crit results (after surge conversion, rerolls, and conversions) */
  expectedCrits: number;
  /** Total expected successes (hits + crits) */
  expectedSuccesses: number;
}

/**
 * Estimate expected attack output (hits + crits) deterministically from a
 * dice pool composition, attacker configuration, and weapon pool keywords.
 *
 * Models the following attack sequence steps:
 * - Step 4d: Surge conversion (via calculateSurgeConversionsByType)
 * - Step 4c: Observation token rerolls (1 reroll each, before aims)
 * - Step 4c: Aim token rerolls (2 + preciseX per aim) OR Marksman conversion
 * - Step 4d.6: Jar'Kai Mastery (melee: dodge tokens → blank→hit)
 * - Step 6.1: Ram X (melee/overrun: blank→crit, then hit→crit)
 *
 * Does NOT model defense-side effects (Pierce, Impact, Cover, Dodge, Armor,
 * Shielded, etc.) — those are handled by estimateExpectedWounds().
 *
 * @param redDice - Number of red attack dice in the pool
 * @param blackDice - Number of black attack dice in the pool
 * @param whiteDice - Number of white attack dice in the pool
 * @param attacker - Attacker configuration (surge chart, tokens, unit keywords)
 * @param poolKeywords - Aggregated weapon keywords (criticalX, ramX, etc.)
 * @param attackType - The attack type for this range band
 * @returns Expected hits, crits, and total successes
 */
export function estimateExpectedAttackSuccesses(
  redDice: number,
  blackDice: number,
  whiteDice: number,
  attacker: AttackerConfig,
  poolKeywords: AggregatedWeaponKeywords,
  attackType: AttackType,
): AttackEstimationResult {
  const totalDice = redDice + blackDice + whiteDice;
  if (totalDice === 0) {
    return { expectedHits: 0, expectedCrits: 0, expectedSuccesses: 0 };
  }

  const isMeleeOrOverrun = attackType === AttackType.Melee || attackType === AttackType.Overrun;
  const isMelee = attackType === AttackType.Melee;

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Compute base expected results per die color
  // ═══════════════════════════════════════════════════════════════════════════

  let expectedHits =
    redDice * HITS_PER_DIE.red +
    blackDice * HITS_PER_DIE.black +
    whiteDice * HITS_PER_DIE.white;

  let expectedCrits =
    redDice * CRITS_PER_DIE.red +
    blackDice * CRITS_PER_DIE.black +
    whiteDice * CRITS_PER_DIE.white;

  const expectedSurges =
    redDice * SURGES_PER_DIE.red +
    blackDice * SURGES_PER_DIE.black +
    whiteDice * SURGES_PER_DIE.white;

  let expectedBlanks =
    redDice * BLANKS_PER_DIE.red +
    blackDice * BLANKS_PER_DIE.black +
    whiteDice * BLANKS_PER_DIE.white;

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: Surge conversion (Step 4d)
  // Uses engine's calculateSurgeConversionsByType for consistency with the
  // simulation path's surge priority chain:
  //   Jedi Hunter → ToCrit chart → ToHit chart → Critical X → Hold the Line → Surge Tokens
  // ═══════════════════════════════════════════════════════════════════════════

  // Complete the Mission adds Critical 2; we temporarily increase criticalX
  // for the surge conversion calculation, then restore it.
  const effectiveCriticalX = poolKeywords.criticalX +
    (attacker.completeTheMission ? 2 : 0);

  const effectivePoolKeywords = effectiveCriticalX !== poolKeywords.criticalX
    ? { ...poolKeywords, criticalX: effectiveCriticalX }
    : poolKeywords;

  const { critConversions, hitConversions } = calculateSurgeConversionsByType(
    attacker,
    effectivePoolKeywords,
    attackType,
  );

  // Distribute expected surges across conversion types
  const surgesToCrits = critConversions === Infinity
    ? expectedSurges
    : Math.min(expectedSurges, critConversions);
  const remainingAfterCrits = Math.max(0, expectedSurges - surgesToCrits);
  const surgesToHits = hitConversions === Infinity
    ? remainingAfterCrits
    : Math.min(remainingAfterCrits, hitConversions);

  expectedCrits += surgesToCrits;
  expectedHits += surgesToHits;

  // Unconverted surges are effectively wasted (treated like blanks for reroll purposes)
  const unconvertedSurges = Math.max(0, expectedSurges - surgesToCrits - surgesToHits);
  expectedBlanks += unconvertedSurges;

  // Fixed success rate computed once after surge conversion, before any reroll
  // modifications. Using a single rate prevents observation gains from inflating
  // the success rate used by subsequent aim rerolls.
  const initialSuccessRate = (expectedHits + expectedCrits) / totalDice;

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 3: Observation token rerolls (Step 4c — processed before aim tokens)
  // Each observation token provides exactly 1 reroll of a blank/wasted die.
  // ═══════════════════════════════════════════════════════════════════════════

  if (attacker.observationTokens > 0 && expectedBlanks > 0) {
    const obsRerolls = Math.min(attacker.observationTokens, expectedBlanks);
    const obsGain = obsRerolls * initialSuccessRate;
    expectedHits += obsGain;    // Simplified: observation gains go to hits
    expectedBlanks = Math.max(0, expectedBlanks - obsGain);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 4: Aim token rerolls / Marksman conversion (Step 4c/4d.5)
  // ═══════════════════════════════════════════════════════════════════════════

  if (attacker.aimTokens > 0 && expectedBlanks > 0) {
    if (attacker.marksman) {
      // Marksman: each aim = +1 guaranteed success (blank→hit)
      const marksmanConversions = Math.min(attacker.aimTokens, expectedBlanks);
      expectedHits += marksmanConversions;
      expectedBlanks = Math.max(0, expectedBlanks - marksmanConversions);
    } else {
      // Standard rerolls: 2 + preciseX rerolls per aim token
      const rerollsPerAim = 2 + attacker.preciseX;

      let blanksRemaining = expectedBlanks;
      for (let i = 0; i < attacker.aimTokens && blanksRemaining > 0; i++) {
        const rerollCount = Math.min(rerollsPerAim, blanksRemaining);
        const gain = rerollCount * initialSuccessRate;
        expectedHits += gain;   // Simplified: reroll gains go to hits
        blanksRemaining = Math.max(0, blanksRemaining - gain);
      }
      expectedBlanks = blanksRemaining;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 5: Jar'Kai Mastery (Step 4d.6 — melee only)
  // Each dodge token converts one blank→hit
  // ═══════════════════════════════════════════════════════════════════════════

  if (attacker.jarKaiMastery && isMelee && attacker.dodgeTokensAttacker > 0 && expectedBlanks > 0) {
    const jarKaiConversions = Math.min(attacker.dodgeTokensAttacker, expectedBlanks);
    expectedHits += jarKaiConversions;
    expectedBlanks = Math.max(0, expectedBlanks - jarKaiConversions);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 6: Ram X (Step 6.1 — melee/overrun only)
  // Mirrors woundEstimation.ts: blank→crit first (adds successes),
  // then hit→crit (no net success change).
  // ═══════════════════════════════════════════════════════════════════════════

  if (poolKeywords.ramX > 0 && isMeleeOrOverrun) {
    let ramRemaining = poolKeywords.ramX;

    // Convert blanks → crits first (net addition to successes)
    const blanksConverted = Math.min(expectedBlanks, ramRemaining);
    expectedCrits += blanksConverted;
    expectedBlanks = Math.max(0, expectedBlanks - blanksConverted);
    ramRemaining -= blanksConverted;

    // Convert hits → crits with remaining Ram budget (no net success change)
    if (ramRemaining > 0) {
      const hitsConverted = Math.min(expectedHits, ramRemaining);
      expectedHits -= hitsConverted;
      expectedCrits += hitsConverted;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Final: clamp and return
  // ═══════════════════════════════════════════════════════════════════════════

  expectedHits = Math.max(0, expectedHits);
  expectedCrits = Math.max(0, expectedCrits);
  const expectedSuccesses = expectedHits + expectedCrits;

  return {
    expectedHits: Math.round(expectedHits * 1000) / 1000,
    expectedCrits: Math.round(expectedCrits * 1000) / 1000,
    expectedSuccesses: Math.round(expectedSuccesses * 100) / 100,
  };
}
