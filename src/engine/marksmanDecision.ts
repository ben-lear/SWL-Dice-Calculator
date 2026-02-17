import type {
  AttackConfig,
  AttackerConfig,
  RolledAttackDie,
  MarksmanDecision,
  AggregatedWeaponKeywords,
} from './types';
import { AttackDieColor, AttackFace, MarksmanStrategy, AttackType, AttackSurgeChart } from './types';
import { calculateAvailableSurgeConversions } from './surgeConversionUtils';
import { estimateExpectedWounds } from './woundEstimation';

interface RerollEV {
  expectedHits: number;
  expectedCrits: number;
}

/**
 * Determine whether attack surges convert to crits (vs hits).
 *
 * Returns true if the dominant surge conversion produces crits:
 * - Critical X with remaining budget
 * - Jedi Hunter (all surges → crit)
 * - Surge Chart ToCrit
 *
 * Returns false for ToHit chart, Hold the Line, Surge Tokens, or no conversion.
 */
function surgesConvertToCrit(
  attacker: AttackerConfig,
  poolKeywords: AggregatedWeaponKeywords,
  currentSurgeCount: number
): boolean {
  // Priority 1: Critical X — converts up to X surges to crits
  if (poolKeywords.criticalX > 0 && poolKeywords.criticalX >= currentSurgeCount) {
    return true; // All surges will be consumed by Critical X → crits
  }

  // Priority 2: Jedi Hunter — all remaining surges → crit
  if (attacker.jediHunter) return true;

  // Priority 3: Surge Chart ToCrit
  if (attacker.surgeChart === AttackSurgeChart.ToCrit) return true;

  // Note: If Critical X handles some surges and the remainder go to a ToHit chart,
  // this returns false. The reroll EV for a single rerolled surge would depend on
  // the total surge count — for simplicity we use the dominant path (chart/tokens).
  // ToHit, Hold the Line, Surge Tokens, or None → hits (or blank)
  return false;
}

/**
 * Calculate expected value improvement (hits and crits) from rerolling the best available
 * blank or excess surge target.
 *
 * Die face distributions:
 *   White: 5 blank, 1 hit, 1 crit, 1 surge out of 8 faces
 *   Black: 3 blank, 3 hit, 1 crit, 1 surge out of 8 faces
 *   Red:   1 blank, 5 hit, 1 crit, 1 surge out of 8 faces
 *
 * Returns expected hits and crits from rerolling one die.
 */
function calculateRerollEV(
  results: RolledAttackDie[],
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords
): RerollEV {
  const { attacker, attackType } = config;
  const blankIndices: Array<{ idx: number; color: AttackDieColor }> = [];
  const surgeIndices: Array<{ idx: number; color: AttackDieColor }> = [];

  results.forEach((die, idx) => {
    if (die.face === AttackFace.Blank) {
      blankIndices.push({ idx, color: die.color });
    } else if (die.face === AttackFace.Surge) {
      surgeIndices.push({ idx, color: die.color });
    }
  });

  // ── Calculate total available surge conversions using shared utility ──
  const availableConversions = calculateAvailableSurgeConversions(
    attacker,
    poolKeywords,
    attackType
  );

  // ── Calculate excess surges ──
  const totalSurges = surgeIndices.length;
  const excessSurgeCount = Math.max(0, totalSurges - availableConversions);

  // ── Combine blanks and excess surges, prioritize by die color (Red > Black > White) ──
  const rerollTargets: Array<{ idx: number; color: AttackDieColor }> = [];

  // Add all blanks
  rerollTargets.push(...blankIndices);

  // Add excess surges (highest value ones)
  if (excessSurgeCount > 0) {
    const colorValue: Record<string, number> = {
      [AttackDieColor.Red]: 3,
      [AttackDieColor.Black]: 2,
      [AttackDieColor.White]: 1,
    };
    const sortedSurges = [...surgeIndices].sort((a, b) => colorValue[b.color] - colorValue[a.color]);
    rerollTargets.push(...sortedSurges.slice(0, excessSurgeCount));
  }

  // No valid reroll targets
  if (rerollTargets.length === 0) {
    return { expectedHits: 0, expectedCrits: 0 };
  }

  // Sort by die color: prioritize Red > Black > White for reroll
  const colorValue: Record<string, number> = {
    [AttackDieColor.Red]: 3,
    [AttackDieColor.Black]: 2,
    [AttackDieColor.White]: 1,
  };
  rerollTargets.sort((a, b) => colorValue[b.color] - colorValue[a.color]);

  const targetColor = rerollTargets[0].color;

  // ── Calculate expected hits and crits from rerolling this die ──
  // Account for whether surges will be converted
  const surgesWillConvert = 
    availableConversions === Infinity || 
    (totalSurges - excessSurgeCount) < availableConversions;

  // Determine whether converted surges become crits or hits
  // We check with currentSurgeCount + 1 because the rerolled die may land on surge
  const surgeBecomeCrit = surgesWillConvert &&
    surgesConvertToCrit(attacker, poolKeywords, totalSurges + 1);

  let expectedHits = 0;
  let expectedCrits = 0;

  switch (targetColor) {
    case AttackDieColor.White:
      // White: 1 hit, 1 crit, 1 surge out of 8 faces
      expectedHits = 1 / 8;
      expectedCrits = 1 / 8;
      if (surgesWillConvert) {
        if (surgeBecomeCrit) {
          expectedCrits += 1 / 8;
        } else {
          expectedHits += 1 / 8;
        }
      }
      break;

    case AttackDieColor.Black:
      // Black: 3 hit, 1 crit, 1 surge out of 8 faces
      expectedHits = 3 / 8;
      expectedCrits = 1 / 8;
      if (surgesWillConvert) {
        if (surgeBecomeCrit) {
          expectedCrits += 1 / 8;
        } else {
          expectedHits += 1 / 8;
        }
      }
      break;

    case AttackDieColor.Red:
      // Red: 5 hit, 1 crit, 1 surge out of 8 faces
      expectedHits = 5 / 8;
      expectedCrits = 1 / 8;
      if (surgesWillConvert) {
        if (surgeBecomeCrit) {
          expectedCrits += 1 / 8;
        } else {
          expectedHits += 1 / 8;
        }
      }
      break;
  }

  return { expectedHits, expectedCrits };
}

/**
 * Estimate the improvement in expected wounds from adding deltaHits and deltaCrits
 * to the current attack pool.
 * 
 * Returns the net improvement compared to the baseline (current state without deltas).
 * @param additionalPierce - Extra Pierce beyond poolKeywords.pierceX (e.g., Lethal X, Duelist)
 */
function estimateWoundImprovement(
  results: RolledAttackDie[],
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords,
  deltaHits: number,
  deltaCrits: number,
  additionalPierce: number = 0
): number {
  // Count current successes
  const currentHits = results.filter(r => r.face === AttackFace.Hit).length;
  const currentCrits = results.filter(r => r.face === AttackFace.Critical).length;

  // Calculate new totals
  const newHits = currentHits + deltaHits;
  const newCrits = currentCrits + deltaCrits;

  // Calculate expected wounds with and without deltas using shared helper
  const expectedWounds = estimateExpectedWounds(newHits, newCrits, config, poolKeywords, additionalPierce);
  const baselineWounds = estimateExpectedWounds(currentHits, currentCrits, config, poolKeywords, additionalPierce);

  // Return net improvement
  return expectedWounds - baselineWounds;
}

/**
 * Will converting blank→hit actually improve expected wounds?
 *
 * Delegates to estimateExpectedWounds to account for ALL defender keywords
 * (Armor, Cover, Dodge, Shielded, Backup, Guardian, defense dice, Pierce, etc.).
 * This ensures the gate is consistent with the full EV calculation and doesn't
 * miss keyword interactions that would cancel the new hit.
 */
function willBlankConversionHelp(
  results: RolledAttackDie[],
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords,
  additionalPierce: number = 0
): boolean {
  return estimateWoundImprovement(results, config, poolKeywords, 1, 0, additionalPierce) > 0;
}

/**
 * Will converting hit→crit improve expected wounds beyond leaving it as a hit?
 *
 * Delegates to estimateExpectedWounds to account for ALL defender keywords.
 * This correctly handles cases where hit→crit is detrimental (e.g., Shielded X
 * cancels crits first) as well as cases where it helps (Armor bypass, Cover
 * bypass, Dodge bypass without Outmaneuver).
 */
function willHitConversionHelp(
  results: RolledAttackDie[],
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords,
  additionalPierce: number = 0
): boolean {
  return estimateWoundImprovement(results, config, poolKeywords, -1, 1, additionalPierce) > 0;
}

/**
 * Core decision engine for Marksman keyword.
 * Evaluates whether to save an aim token for Marksman conversion (Step 4d.5)
 * or use it for rerolling (Step 4c).
 *
 * Returns a MarksmanDecision with:
 * - Specific die indices to convert (blank→hit or hit→crit)
 * - OR `useRerollInstead: true` if reroll is better
 *
 * Strategy:
 * - Deterministic: Always save for Marksman if conversion helps (guaranteed value)
 * - Averages: Compare reroll EV vs conversion EV, choose the better option
 *
 * @param aimsSpent - Number of aim tokens already spent on rerolls this attack
 * @param aimsRemaining - Number of aim tokens remaining (including the current one being decided)
 */
export function calculateMarksmanDecision(
  results: RolledAttackDie[],
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords,
  aimsSpent: number = 0,
  aimsRemaining: number = 1
): MarksmanDecision {
  const { attacker, attackType } = config;
  const isMelee = attackType === AttackType.Melee;

  // ── Calculate Pierce from Lethal X and Duelist for each path ──
  // Reroll path: this aim is spent on rerolling (aimsSpent + 1), remaining - 1 available for Lethal
  // Marksman path: all remaining aims saved for Marksman, 0 available for Lethal

  // Lethal Pierce = min(lethalX, aims leftover after rerolls and Marksman)
  const aimsForLethalIfReroll = Math.max(0, aimsRemaining - 1); // current aim used for reroll, rest could be Lethal
  const lethalPierceIfReroll = poolKeywords.lethalX > 0
    ? Math.min(poolKeywords.lethalX, aimsForLethalIfReroll)
    : 0;

  // If saving for Marksman, ALL remaining aims are saved — 0 leftover for Lethal
  const lethalPierceIfMarksman = 0;

  // Duelist Attacker: +1 Pierce if any aim was spent in Melee
  const duelistPierceIfReroll = (attacker.duelistAttacker && isMelee) ? 1 : 0;
  const duelistPierceIfMarksman = (attacker.duelistAttacker && isMelee && aimsSpent > 0) ? 1 : 0;

  const rerollPathPierce = lethalPierceIfReroll + duelistPierceIfReroll;
  const marksmanPathPierce = lethalPierceIfMarksman + duelistPierceIfMarksman;

  // ── Calculate available surge conversions using shared utility ──
  const availableConversions = calculateAvailableSurgeConversions(
    attacker,
    poolKeywords,
    attackType
  );

  // ── Find convertible dice by index ──
  const blankIndices: Array<{ index: number; color: AttackDieColor }> = [];
  const surgeIndices: Array<{ index: number; color: AttackDieColor }> = [];
  const hitIndices: Array<{ index: number; color: AttackDieColor }> = [];

  results.forEach((die, index) => {
    if (die.face === AttackFace.Blank) {
      blankIndices.push({ index, color: die.color });
    } else if (die.face === AttackFace.Surge) {
      surgeIndices.push({ index, color: die.color });
    } else if (die.face === AttackFace.Hit) {
      hitIndices.push({ index, color: die.color });
    }
  });

  // ── Calculate excess surges (surges that cannot be converted) ──
  const totalSurges = surgeIndices.length;
  const excessSurgeCount = Math.max(0, totalSurges - availableConversions);

  // Add excess surges to blank conversion targets (prioritize by die color)
  if (excessSurgeCount > 0) {
    const colorValue: Record<string, number> = {
      [AttackDieColor.Red]: 3,
      [AttackDieColor.Black]: 2,
      [AttackDieColor.White]: 1,
    };
    // Sort surges by color value descending, take the lowest value excess surges
    const sortedSurges = [...surgeIndices].sort((a, b) => colorValue[a.color] - colorValue[b.color]);
    // Take the lowest-value excess surges (White > Black > Red) for conversion
    const excessSurges = sortedSurges.slice(0, excessSurgeCount);
    blankIndices.push(...excessSurges);
  }

  // Nothing to convert → use reroll instead
  if (blankIndices.length === 0 && hitIndices.length === 0) {
    return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
  }

  // ── Evaluate conversion value (using Marksman path Pierce for gate decisions) ──
  const blankToHitHelps = blankIndices.length > 0 && willBlankConversionHelp(results, config, poolKeywords, marksmanPathPierce);
  const hitToCritHelps = hitIndices.length > 0 && willHitConversionHelp(results, config, poolKeywords, marksmanPathPierce);

  // Neither conversion helps → use reroll
  if (!blankToHitHelps && !hitToCritHelps) {
    return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
  }

  // ── Sort by die color: White first (lowest reroll value sacrificed) ──
  const colorValue: Record<string, number> = {
    [AttackDieColor.White]: 1,
    [AttackDieColor.Black]: 2,
    [AttackDieColor.Red]: 3,
  };
  blankIndices.sort((a, b) => colorValue[a.color] - colorValue[b.color]);
  hitIndices.sort((a, b) => colorValue[a.color] - colorValue[b.color]);

  // ── Deterministic Mode ──
  if (attacker.marksmanStrategy === MarksmanStrategy.Deterministic) {
    // Always convert when helpful (guaranteed value over probabilistic reroll)
    // Priority: hit→crit is more impactful when it bypasses keywords
    if (hitToCritHelps && hitIndices.length > 0) {
      return { convertBlankIndex: null, convertHitIndex: hitIndices[0].index, useRerollInstead: false };
    }
    if (blankToHitHelps && blankIndices.length > 0) {
      return { convertBlankIndex: blankIndices[0].index, convertHitIndex: null, useRerollInstead: false };
    }
  }

  // ── Averages Mode ──
  // Calculate the value of each option: reroll, blank→hit, or hit→crit
  // Compare based on expected improvement in wounds accounting for defender keywords
  // Each path uses its own Pierce value (reroll path keeps aims for Lethal; Marksman saves them)

  // Option 1: Reroll EV (uses rerollPathPierce — this aim spent on reroll, rest for Lethal)
  const rerollEV = calculateRerollEV(results, config, poolKeywords);
  const rerollValue = estimateWoundImprovement(
    results,
    config,
    poolKeywords,
    rerollEV.expectedHits,
    rerollEV.expectedCrits,
    rerollPathPierce
  );

  // Option 2: Blank→Hit conversion value (uses marksmanPathPierce — all aims saved)
  let blankToHitValue = 0;
  if (blankToHitHelps && blankIndices.length > 0) {
    blankToHitValue = estimateWoundImprovement(
      results,
      config,
      poolKeywords,
      1.0, // Guaranteed +1 hit
      0,
      marksmanPathPierce
    );
  }

  // Option 3: Hit→Crit conversion value (uses marksmanPathPierce — all aims saved)
  let hitToCritValue = 0;
  if (hitToCritHelps && hitIndices.length > 0) {
    // Converting hit→crit is -1 hit, +1 crit (net improvement due to bypass)
    hitToCritValue = estimateWoundImprovement(
      results,
      config,
      poolKeywords,
      -1, // Lose 1 hit
      1,   // Gain 1 crit
      marksmanPathPierce
    );
  }

  // Choose the best option
  const maxValue = Math.max(rerollValue, blankToHitValue, hitToCritValue);

  // If reroll is best, use reroll
  if (rerollValue >= maxValue && rerollValue > 0) {
    return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
  }

  // If hit→crit is best, convert hit
  if (hitToCritValue >= maxValue && hitToCritValue > 0 && hitIndices.length > 0) {
    return { convertBlankIndex: null, convertHitIndex: hitIndices[0].index, useRerollInstead: false };
  }

  // If blank→hit is best, convert blank
  if (blankToHitValue > 0 && blankIndices.length > 0) {
    return { convertBlankIndex: blankIndices[0].index, convertHitIndex: null, useRerollInstead: false };
  }

  // No good options, use reroll as fallback
  return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
}
