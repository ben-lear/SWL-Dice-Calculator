import type { AttackConfig, RolledDefenseDie, AggregatedWeaponKeywords } from './types';
import { rollDefenseDie } from './dice';
import { DefenseDieColor, DefenseFace, AttackType, DefenseSurgeChart } from './types';

/**
 * Step 6b — Roll Guardian Defense
 * When Guardian X absorbs hits, those hits are defended by the Guardian unit
 * with its own defense dice, surge chart, and keywords.
 */
export function rollGuardianDefense(
  guardianHits: number,
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords
): { guardianWoundsNoPierce: number; guardianBlocks: number; guardianDeflectWounds: number } {
  const { defender } = config;

  // ── Default die color if not specified ──
  const guardianDieColor = defender.guardianDieColor ?? DefenseDieColor.White;
  const guardianSurgeChart = defender.guardianSurgeChart ?? DefenseSurgeChart.None;

  // ── Roll defense dice ──
  // No Danger Sense or Impervious for Guardian — just base dice equal to absorbed hits.
  let guardianResults: RolledDefenseDie[] = [];
  for (let i = 0; i < guardianHits; i++) {
    guardianResults.push({
      color: guardianDieColor,
      face: rollDefenseDie(guardianDieColor),
    });
  }

  // ── Soresu Mastery (Guardian) ──
  // Per rulebook: "When a unit with Soresu Mastery uses Guardian X,
  // it may spend 1 Dodge Token to reroll all dice before converting surges."
  if (defender.guardianSoresuMastery && (defender.guardianDodgeTokens ?? 0) > 0) {
    guardianResults = guardianResults.map(d => ({
      ...d,
      face: rollDefenseDie(d.color),
    }));
    // Dodge token consumed (tracked conceptually, not mutated on config)
  }

  // ── Deflect (Guardian) — check BEFORE surge conversion ──
  // Per rulebook: "When using Guardian X with Deflect, before converting surges,
  // the attacker suffers 1 wound if at least 1 die has a surge result."
  // High Velocity completely disables Deflect (both conversion and wound reflection).
  let guardianDeflectWounds = 0;
  if (defender.guardianDeflect && !poolKeywords.highVelocity && !poolKeywords.immuneDeflect) {
    const hasSurge = guardianResults.some(d => d.face === DefenseFace.Surge);
    if (hasSurge) {
      guardianDeflectWounds = 1; // Exactly 1, regardless of surge count
    }
  }

  // ── Convert surges ──
  // Guardian surge chart
  if (guardianSurgeChart === DefenseSurgeChart.ToBlock) {
    guardianResults = guardianResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
  }

  // Guardian Deflect also grants surge→block for Ranged attacks
  // High Velocity disables Deflect entirely, including surge conversion.
  if (
    defender.guardianDeflect &&
    !poolKeywords.highVelocity &&
    config.attackType === AttackType.Ranged
  ) {
    guardianResults = guardianResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
  }

  // ── Count blocks ──
  const guardianBlocks = guardianResults.filter(d => d.face === DefenseFace.Block).length;

  // ── Calculate wounds WITHOUT pierce ──
  const guardianWoundsNoPierce = Math.max(0, guardianHits - guardianBlocks);

  return { guardianWoundsNoPierce, guardianBlocks, guardianDeflectWounds };
}

/**
 * Step 7 — Roll Defense Dice
 * - 7a. Gather defense dice count
 * - 7b. Add bonus dice (Danger Sense X, Impervious)
 * - 7c. Roll dice
 * - 7d. Reroll dice (Uncanny Luck X, Soresu Mastery)
 * - 7e. Convert defense surges
 */
export function rollDefenseDice(
  attackResults: { hits: number; crits: number },
  config: AttackConfig,
  lethalPierce: number,
  duelistPierceBonus: number,
  _dodgeWasSpent: boolean,
  poolPierceX: number,
  poolHighVelocity: boolean
): { results: RolledDefenseDie[]; surgeCountBeforeConversion: number } {
  const { defender, attacker } = config;
  const totalAttackResults = attackResults.hits + attackResults.crits;

  // ── Check if defense dice are disabled (Custom Pool mode) ──
  if (defender.disableDefenseDice) {
    return { results: [], surgeCountBeforeConversion: 0 };
  }

  // ── 7a. Base pool ──
  let dieCount = totalAttackResults;

  // ── 7b. Danger Sense X ──
  if (defender.dangerSenseX > 0 && defender.suppressionTokens > 0) {
    const bonusDice = Math.min(defender.dangerSenseX, defender.suppressionTokens);
    dieCount += bonusDice;
  }

  // ── 7b. Impervious ──
  // Adds dice = total Pierce from all sources.
  // Disabled by Makashi Mastery.
  // Also does nothing if defender has Immune: Pierce (pierce would be 0).
  if (defender.impervious && !attacker.makashiMastery) {
    // Calculate total Pierce that WOULD be applied
    let effectivePierce = poolPierceX + lethalPierce + duelistPierceBonus;

    // If defender has Immune: Pierce (not overridden by Makashi), Pierce = 0 → Impervious adds 0
    if (defender.immunePierce) {
      effectivePierce = 0;
    }
    // If defender has Immune: Melee Pierce and this is Melee, Pierce = 0
    if (defender.immuneMeleePierce && config.attackType === AttackType.Melee) {
      effectivePierce = 0;
    }

    dieCount += effectivePierce;
  }

  // ── 7c. Roll dice ──
  const dieColor = defender.dieColor;
  let results: RolledDefenseDie[] = [];
  for (let i = 0; i < dieCount; i++) {
    results.push({
      color: dieColor,
      face: rollDefenseDie(dieColor),
    });
  }

  // ── 7d. Reroll dice ──
  results = rerollDefenseDice(results, config, poolHighVelocity);

  // ── Capture surge count BEFORE conversion ──
  // This is needed for Deflect/Shien wound calculation in Step 9.
  // Per rulebook, Deflect checks "before converting any e results."
  const surgeCountBeforeConversion = results.filter(d => d.face === DefenseFace.Surge).length;

  return { results, surgeCountBeforeConversion };
}

/**
 * Step 7d — Reroll Defense Dice
 * - Soresu Mastery: reroll ALL defense dice (Ranged attacks only)
 * - Uncanny Luck X: reroll up to X dice (blanks first, then surges if no conversion)
 */
export function rerollDefenseDice(
  results: RolledDefenseDie[],
  config: AttackConfig,
  poolHighVelocity: boolean
): RolledDefenseDie[] {
  const { defender } = config;
  const workingResults = results.map(d => ({ ...d }));

  // Track which dice have been rerolled (each die can only be rerolled once)
  const rerolled = new Set<number>();

  // ── Soresu Mastery ──
  // Ranged attacks only. Rerolls ALL defense dice.
  // Applied first since it's a full pool reroll.
  if (
    defender.soresuMastery &&
    config.attackType === AttackType.Ranged
  ) {
    for (let i = 0; i < workingResults.length; i++) {
      workingResults[i] = {
        ...workingResults[i],
        face: rollDefenseDie(workingResults[i].color),
      };
      rerolled.add(i);
    }
  }

  // ── Uncanny Luck X ──
  // Reroll up to X defense dice that haven't been rerolled yet.
  if (defender.uncannyLuckX > 0) {
    let rerollsRemaining = defender.uncannyLuckX;

    // Check if defender has ANY surge conversion source
    // Note: Deflect is disabled by High Velocity, so don't count it as a conversion source when HV is active.
    const hasSurgeConversion =
      defender.surgeChart === DefenseSurgeChart.ToBlock ||
      (defender.deflect && !poolHighVelocity) ||
      (defender.block && defender.dodgeTokens > 0) ||
      defender.holdTheLine ||
      defender.surgeTokens > 0;

    // Pass 1: Reroll blanks (always worth rerolling)
    for (let i = 0; i < workingResults.length && rerollsRemaining > 0; i++) {
      if (rerolled.has(i)) continue; // Already rerolled by Soresu
      if (workingResults[i].face === DefenseFace.Blank) {
        workingResults[i] = {
          ...workingResults[i],
          face: rollDefenseDie(workingResults[i].color),
        };
        rerolled.add(i);
        rerollsRemaining--;
      }
    }

    // Pass 2: Reroll surges (only if no conversion available)
    if (!hasSurgeConversion && rerollsRemaining > 0) {
      for (let i = 0; i < workingResults.length && rerollsRemaining > 0; i++) {
        if (rerolled.has(i)) continue;
        if (workingResults[i].face === DefenseFace.Surge) {
          workingResults[i] = {
            ...workingResults[i],
            face: rollDefenseDie(workingResults[i].color),
          };
          rerolled.add(i);
          rerollsRemaining--;
        }
      }
    }
  }

  return workingResults;
}
