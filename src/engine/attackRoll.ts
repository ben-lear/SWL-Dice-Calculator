import type { AttackConfig, RolledAttackDie, AttackerConfig, AggregatedWeaponKeywords } from './types';
import { rollAttackDie } from './dice';
import { AttackDieColor, AttackFace, AttackSurgeChart, AttackType } from './types';

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
  poolKeywords: AggregatedWeaponKeywords
): Array<{ idx: number; colorRank: number }> {
  if (surgeIndices.length === 0) return [];

  // Check for unlimited conversion sources
  const hasChartConversion =
    attacker.surgeChart === AttackSurgeChart.ToHit ||
    attacker.surgeChart === AttackSurgeChart.ToCrit;
  const hasUnlimitedConversion = attacker.jediHunter || attacker.holdTheLine;

  if (hasChartConversion || hasUnlimitedConversion) {
    // All surges will be converted → none are excess
    return [];
  }

  // Limited conversion: surgeTokens + criticalX
  const totalConversions = attacker.surgeTokens + poolKeywords.criticalX;

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
 * Identify indices of dice worth rerolling.
 * Returns indices sorted by die color priority: Red > Black > White.
 *
 * Targets:
 * - All blanks
 * - Excess surges (surges beyond available conversions)
 */
function identifyRerollTargetIndices(
  results: RolledAttackDie[],
  attacker: AttackerConfig,
  poolKeywords: AggregatedWeaponKeywords
): number[] {
  const blankIndices: Array<{ idx: number; colorRank: number }> = [];
  const surgeIndices: Array<{ idx: number; colorRank: number }> = [];

  const colorRank: Record<string, number> = {
    [AttackDieColor.Red]: 3,
    [AttackDieColor.Black]: 2,
    [AttackDieColor.White]: 1,
  };

  results.forEach((die, idx) => {
    if (die.face === AttackFace.Blank) {
      blankIndices.push({ idx, colorRank: colorRank[die.color] });
    } else if (die.face === AttackFace.Surge) {
      surgeIndices.push({ idx, colorRank: colorRank[die.color] });
    }
  });

  // Determine which surges are "excess" (won't be converted)
  const excessSurgeIndices = calculateExcessSurgeIndices(surgeIndices, attacker, poolKeywords);

  // Combine blanks + excess surges, sort by color rank descending (Red first)
  const allTargets = [...blankIndices, ...excessSurgeIndices];
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
  let workingResults = results.map(d => ({ ...d })); // Deep clone
  let aimsSpent = 0;
  let pierceBonus = 0;
  let aimsSavedForMarksman = 0;

  const rerollsPerAim = 2 + attacker.preciseX;

  // ── Observation Tokens ──
  // Each Observation token provides exactly 1 reroll.
  // Processed FIRST (before Aim tokens) so Marksman decisions see post-observation state.
  for (let obs = 0; obs < attacker.observationTokens; obs++) {
    const targetIndices = identifyRerollTargetIndices(workingResults, attacker, poolKeywords);

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
      // Simplified decision: if we have blanks or hits that Marksman could convert,
      // and we have few reroll targets, save for Marksman.
      const targetIndices = identifyRerollTargetIndices(workingResults, attacker, poolKeywords);
      const blankCount = workingResults.filter(d => d.face === AttackFace.Blank).length;
      const hitCount = workingResults.filter(d => d.face === AttackFace.Hit).length;
      const canConvert = blankCount > 0 || hitCount > 0;

      // If we have convertible dice and few/no reroll targets, save for Marksman
      if (canConvert && targetIndices.length <= 1) {
        aimsSavedForMarksman = attacker.aimTokens - aimIndex;
        break; // Exit aim loop
      }
    }

    // ── Execute Rerolls ──
    const selectedIndices: number[] = [];

    // Select blanks and excess surges
    const targetIndices = identifyRerollTargetIndices(workingResults, attacker, poolKeywords);
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
