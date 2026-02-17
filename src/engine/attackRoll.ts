import type { AttackConfig, RolledAttackDie, AttackerConfig, AggregatedWeaponKeywords } from './types';
import { rollAttackDie } from './dice';
import { AttackDieColor, AttackFace, AttackType, RerollStrategy } from './types';
import { calculateMarksmanDecision } from './marksmanDecision';
import { calculateAvailableSurgeConversions, calculateSurgeConversionsByType } from './surgeConversionUtils';

/**
 * Step 4b — Roll Attack Dice
 * Roll each die in the pool, preserving color information.
 */
export function rollAttackDice(pool: AttackDieColor[]): RolledAttackDie[] {
  return pool.map(color => ({ color, face: rollAttackDie(color) }));
}

/**
 * Calculate excess surge indices — surges that won't be converted.
 * Returns indices of surges that should be treated as blanks for rerolling.
 */
function calculateExcessSurgeIndices(
  surgeIndices: Array<{ idx: number; colorRank: number }>,
  attacker: AttackerConfig,
  poolKeywords: AggregatedWeaponKeywords,
  attackType: AttackType
): Array<{ idx: number; colorRank: number }> {
  if (surgeIndices.length === 0) return [];

  // Calculate total available surge conversions using shared utility
  const totalConversions = calculateAvailableSurgeConversions(
    attacker,
    poolKeywords,
    attackType
  );

  // If unlimited conversions, all surges will be converted
  if (totalConversions === Infinity) {
    return [];
  }

  if (totalConversions === 0) {
    // No conversions at all → ALL surges are excess
    return [...surgeIndices];
  }

  if (totalConversions >= surgeIndices.length) {
    // Enough conversions for all surges → none are excess
    return [];
  }

  // Partial conversion: keep lowest-value surges, excess the highest-value
  // Sort ascending by color rank (White=1 first → kept for conversion)
  const sorted = [...surgeIndices].sort((a, b) => a.colorRank - b.colorRank);

  // Keep the first `totalConversions` (lowest value), excess the rest
  const excessSurges = sorted.slice(totalConversions);

  return excessSurges;
}

/**
 * Identify surge indices that would convert to hits (not crits) for Crit Fishing mode.
 * These surges are valid reroll targets because they won't become crits.
 * 
 * Protects surges that would convert to crits via Critical X, Jedi Hunter, or ToCrit chart.
 */
function identifySurgeToHitIndices(
  surgeIndices: Array<{ idx: number; colorRank: number }>,
  attacker: AttackerConfig,
  poolKeywords: AggregatedWeaponKeywords,
  attackType: AttackType
): Array<{ idx: number; colorRank: number }> {
  if (surgeIndices.length === 0) return [];

  const { critConversions, hitConversions } = calculateSurgeConversionsByType(
    attacker,
    poolKeywords,
    attackType
  );

  // If unlimited hit conversions, all surges would become hits (rerollable)
  if (hitConversions === Infinity) {
    return [...surgeIndices];
  }

  // If unlimited crit conversions, all surges become crits (protected)
  if (critConversions === Infinity) {
    return [];
  }

  // Sort by color rank ascending (White=1 first, lowest value)
  // This matches conversion priority: lowest-value surges converted first
  const sorted = [...surgeIndices].sort((a, b) => a.colorRank - b.colorRank);

  // First N surges are protected for crit conversion
  const protectedCount = Math.min(critConversions, sorted.length);
  
  // Next M surges would convert to hits (rerollable in Crit Fishing)
  const hitConversionStart = protectedCount;
  const hitConversionEnd = Math.min(protectedCount + hitConversions, sorted.length);
  
  return sorted.slice(hitConversionStart, hitConversionEnd);
}

/**
 * Identify indices of dice worth rerolling.
 * Returns indices sorted by die color priority: Red > Black > White.
 *
 * Conservative mode targets:
 * - All blanks
 * - Excess surges (surges beyond available conversions)
 * 
 * Crit Fishing mode adds:
 * - Surges that would convert to hits (not crits)
 * - Regular hits
 */
function identifyRerollTargetIndices(
  results: RolledAttackDie[],
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords
): number[] {
  const { attacker, attackType } = config;
  const blankIndices: Array<{ idx: number; colorRank: number }> = [];
  const surgeIndices: Array<{ idx: number; colorRank: number }> = [];
  const hitIndices: Array<{ idx: number; colorRank: number }> = [];

  const colorRank: Record<string, number> = {
    [AttackDieColor.Red]: 3,
    [AttackDieColor.Black]: 2,
    [AttackDieColor.White]: 1,
  };

  const isCritFishing = attacker.rerollStrategy === RerollStrategy.CritFishing;

  results.forEach((die, idx) => {
    if (die.face === AttackFace.Blank) {
      blankIndices.push({ idx, colorRank: colorRank[die.color] });
    } else if (die.face === AttackFace.Surge) {
      surgeIndices.push({ idx, colorRank: colorRank[die.color] });
    } else if (die.face === AttackFace.Hit && isCritFishing) {
      hitIndices.push({ idx, colorRank: colorRank[die.color] });
    }
    // Critical results are never rerolled
  });

  // Determine which surges are "excess" (won't be converted)
  const excessSurgeIndices = calculateExcessSurgeIndices(surgeIndices, attacker, poolKeywords, attackType);

  // In Crit Fishing mode, also identify surges that would convert to hits (not crits)
  const surgeToHitIndices = isCritFishing
    ? identifySurgeToHitIndices(surgeIndices, attacker, poolKeywords, attackType)
    : [];

  // Combine targets: blanks > excess surges > surge-to-hit > regular hits
  // Sort by color rank descending (Red first) within combined list
  const allTargets = [...blankIndices, ...excessSurgeIndices, ...surgeToHitIndices, ...hitIndices];
  allTargets.sort((a, b) => b.colorRank - a.colorRank);

  return allTargets.map(t => t.idx);
}

/**
 * Step 4c — Reroll Attack Dice
 */
export function rerollAttackDice(
  results: RolledAttackDie[],
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords
): { results: RolledAttackDie[]; aimsSpent: number; pierceBonus: number; aimsSavedForMarksman: number } {
  const { attacker } = config;
  const workingResults = results.map(d => ({ ...d })); // Deep clone
  let aimsSpent = 0;
  let pierceBonus = 0;
  let aimsSavedForMarksman = 0;

  const rerollsPerAim = 2 + attacker.preciseX;

  // ── Observation Tokens ──
  // Each Observation token provides exactly 1 reroll.
  // Processed FIRST (before Aim tokens) so Marksman decisions see post-observation state.
  // FWIW, in the real world players would likely spend observation tokens last against healthy enemy units, this is a "greedier" approach to maximize damage for a single attack sequence.
  for (let obs = 0; obs < attacker.observationTokens; obs++) {
    const targetIndices = identifyRerollTargetIndices(workingResults, config, poolKeywords);

    if (targetIndices.length > 0) {
      // Reroll the highest-priority target (1 reroll per observation token)
      const idx = targetIndices[0];
      workingResults[idx] = {
        color: workingResults[idx].color,
        face: rollAttackDie(workingResults[idx].color),
      };
    }
    // else: no targets worth rerolling, observation token is wasted
  }

  // ── Aim Tokens ──
  // Process each aim token with Marksman save-vs-reroll decision
  for (let aimIndex = 0; aimIndex < attacker.aimTokens; aimIndex++) {
    // ── Marksman Decision ──
    // If Marksman is active and it's better to save aims for post-surge conversion,
    // save this aim and ALL remaining aims for Marksman.
    if (attacker.marksman) {
      const decision = calculateMarksmanDecision(
        workingResults, config, poolKeywords,
        aimsSpent,                          // aims already spent on rerolls
        attacker.aimTokens - aimIndex        // aims remaining (including this one)
      );

      if (!decision.useRerollInstead) {
        // Save this aim and ALL remaining aims for Marksman post-surge conversion
        aimsSavedForMarksman = attacker.aimTokens - aimIndex;
        break; // Exit aim loop
      }
      // else: decision says reroll is better, fall through to reroll below
    }

    // ── Execute Rerolls ──
    const selectedIndices: number[] = [];

    // Select blanks and excess surges
    const targetIndices = identifyRerollTargetIndices(workingResults, config, poolKeywords);
    for (const idx of targetIndices) {
      if (selectedIndices.length >= rerollsPerAim) break;
      selectedIndices.push(idx);
    }

    // If no targets selected, this aim is wasted
    if (selectedIndices.length === 0) {
      continue;
    }

    // Execute all selected rerolls
    for (const idx of selectedIndices) {
      workingResults[idx] = {
        color: workingResults[idx].color,
        face: rollAttackDie(workingResults[idx].color),
      };
    }

    aimsSpent++;
  }

  // ── Duelist (attacker): Pierce +1 if any Aim was spent in Melee ──
  if (
    attacker.duelistAttacker &&
    config.attackType === AttackType.Melee &&
    aimsSpent > 0
  ) {
    pierceBonus = 1;
  }

  return { results: workingResults, aimsSpent, pierceBonus, aimsSavedForMarksman };
}
