import type {
  AttackConfig,
  AggregatedWeaponKeywords,
} from './types';
import { AttackType, DefenseDieColor, DefenseSurgeChart } from './types';
import type { DefenderConfig } from './types';
import { determineCoverValue } from './cover';

/**
 * Determine whether defense surges will convert to blocks, following the
 * priority chain from defenseSurges.ts:
 * 1. Surge Chart (ToBlock) — always converts
 * 2. Deflect — Ranged only, disabled by High Velocity
 * 3. Block — requires dodge spent
 * 4. Hold the Line — when defender engaged (simplified: always active)
 *
 * Note: Surge Tokens are handled separately in the estimator since they
 * provide limited conversion (not all surges), unlike the above which
 * convert all surges.
 */
function determineDefenseSurgeConversion(
  defender: DefenderConfig,
  attackType: AttackType,
  highVelocity: boolean,
  dodgeWasSpent: boolean
): boolean {
  // 1. Surge Chart
  if (defender.surgeChart === DefenseSurgeChart.ToBlock) return true;

  // 1b. Complete the Mission (defender): grants surge→block near Priority Mission Token
  if (defender.completeTheMission) return true;

  // 2. Deflect (Ranged only, disabled by HV)
  if (defender.deflect && !highVelocity && attackType === AttackType.Ranged) return true;

  // 3. Block (requires dodge spent — HV prevents dodge, so block won't activate)
  if (defender.block && dodgeWasSpent) return true;

  // 4. Hold the Line — when defender engaged (simplified: always active)
  if (defender.holdTheLine) return true;

  return false;
}

/**
 * Core shared helper to calculate expected wounds from a given number of hits and crits.
 * Exported for direct unit testing.
 * Accounts for all defender keywords and attack modifiers in correct sequence order.
 *
 * Follows the real attack sequence from attackSequence.ts:
 *
 * Step 5 — Apply Dodge and Cover (before Step 6 modifiers):
 *   5a-d. Cover: Roll cover pool against HITS only (not crits).
 *         Uses determineCoverValue() for effective cover (handles Sharpshooter,
 *         suppressed, Cover X, smoke, Death From Above, Blast + Immune Blast).
 *         Dug In changes cover die from white to red (affects block probability).
 *         Low Profile: −1 cover die, +1 guaranteed block.
 *   5e.   Dodge: Cancel hits first, then crits if Outmaneuver.
 *         High Velocity prevents ALL dodge spending.
 *
 * Step 6 — Modify Attack Dice:
 *   6.1  Ram X (blanks→crits first, then hits→crits; melee/overrun only)
 *        Note: blanks not tracked by this estimator — only hits→crits modeled.
 *   6.2  Impact X + Weak Point X (hits→crits vs Armor)
 *   6.3  Armor X (cancels hits, not crits)
 *   6.4  Shielded X (cancels crits first, then hits; Ranged only)
 *   6.5  Backup (cancels 2 hits; Ranged only)
 *   6.6  Guardian X (absorbs X hits; Ranged only; separate defense dice)
 *
 * Step 7 — Roll Defense Dice:
 *   7a.  Base dice = remaining hits + crits
 *   7b.  Danger Sense X: +min(X, suppressionTokens) bonus dice
 *         Impervious: +pierceX bonus dice (disabled by Makashi)
 *   7c-d. Roll + reroll (Soresu Mastery, Uncanny Luck X modeled as probability)
 *   7e.  Defense surge conversion: Surge Chart → Deflect → Block → Hold the Line → Surge Tokens
 *
 * Step 8 — Modify Defense Dice:
 *   Pierce X cancels blocks (reduced by Makashi, zeroed by Immune Pierce / Duelist Defender)
 *
 * Step 9 — Compare Results:
 *   wounds = totalSuccesses − blocksAfterPierce
 *
 * @param hits - Number of hit results
 * @param crits - Number of crit results
 * @param config - Attack configuration with attacker and defender
 * @param poolKeywords - Aggregated weapon keywords
 * @param additionalPierce - Extra Pierce beyond poolKeywords.pierceX (e.g., Lethal X, Duelist)
 * @returns Expected number of wounds
 */
export function estimateExpectedWounds(
  hits: number,
  crits: number,
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords,
  additionalPierce: number = 0
): number {
  const { attacker, defender, attackType } = config;
  let effectiveHits = hits;
  let effectiveCrits = crits;

  const isMeleeOrOverrun = attackType === AttackType.Melee || attackType === AttackType.Overrun;
  const isMelee = attackType === AttackType.Melee;
  const isRanged = attackType === AttackType.Ranged;

  // ═══════════════════════════════════════════════════════════════════════════
  // Immune: Melee — attack is impossible, zero wounds
  // ═══════════════════════════════════════════════════════════════════════════
  if (defender.immuneMelee && isMelee) {
    return 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 5 — Apply Dodge and Cover (BEFORE Step 6 modifiers)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 5a-d: Estimate cover blocks (only against HITS, not crits) ──
  let expectedCoverBlocks = 0;
  const effectiveCoverValue = determineCoverValue(config, poolKeywords.blast);

  if (effectiveCoverValue > 0 && effectiveHits > 0) {
    // Cover pool = 1 die per hit result
    let coverPoolSize = effectiveHits;
    let autoCoverBlocks = 0;

    // Low Profile: −1 cover die, +1 guaranteed block
    if (defender.lowProfile && coverPoolSize > 0) {
      autoCoverBlocks = 1;
      coverPoolSize = Math.max(0, coverPoolSize - 1);
    }

    // Cover die probabilities:
    // Dug In changes cover die from white to red (only affect for cover step).
    // White die: 1 block, 1 surge, 4 blank out of 6 faces
    // Red die:   3 block, 1 surge, 2 blank out of 6 faces
    //
    // Light cover (value 1): only blocks cancel hits
    // Heavy cover (value 2): blocks AND surges cancel hits
    let coverBlockProbPerDie: number;
    if (defender.dugIn) {
      // Red cover die: 3 blocks, 1 surge out of 6
      coverBlockProbPerDie = effectiveCoverValue >= 2 ? 4 / 6 : 3 / 6;
    } else {
      // White cover die: 1 block, 1 surge out of 6
      coverBlockProbPerDie = effectiveCoverValue >= 2 ? 2 / 6 : 1 / 6;
    }

    expectedCoverBlocks = autoCoverBlocks + coverPoolSize * coverBlockProbPerDie;
    // Cover can't cancel more hits than exist
    expectedCoverBlocks = Math.min(expectedCoverBlocks, effectiveHits);
    effectiveHits = Math.max(0, effectiveHits - expectedCoverBlocks);
  }

  // ── 5e: Dodge ──
  // High Velocity prevents ALL dodge spending (no hits OR crits cancelled)
  let dodgeWasSpent = false;
  if (!poolKeywords.highVelocity && defender.dodgeTokens > 0) {
    let dodgesRemaining = defender.dodgeTokens;

    // Cancel hits first
    if (effectiveHits > 0 && dodgesRemaining > 0) {
      const hitsCancelled = Math.min(effectiveHits, dodgesRemaining);
      effectiveHits -= hitsCancelled;
      dodgesRemaining -= hitsCancelled;
      dodgeWasSpent = true;
    }

    // Outmaneuver: cancel crits with remaining Dodge tokens
    if (defender.outmaneuver && effectiveCrits > 0 && dodgesRemaining > 0) {
      const critsCancelled = Math.min(effectiveCrits, dodgesRemaining);
      effectiveCrits -= critsCancelled;
      dodgesRemaining -= critsCancelled;
      dodgeWasSpent = true;
    }

    // Block keyword: spend Dodge even with nothing to cancel (enables surge→block)
    if (!dodgeWasSpent && defender.block && dodgesRemaining > 0) {
      dodgeWasSpent = true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 6 — Modify Attack Dice
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 6.0: Ion X (reduce effective Shielded X by flipping shield tokens) ──
  // Per rulebook: At the start of Modify Attack Dice, flip up to X active shield
  // tokens for each hit or crit result, reducing shields available in step 6.4.
  let effectiveShieldedX = defender.shieldedX;
  if (poolKeywords.ionX > 0 && effectiveShieldedX > 0 && isRanged) {
    const totalHitsCrits = effectiveHits + effectiveCrits;
    const shieldsFlipped = Math.min(effectiveShieldedX, totalHitsCrits, poolKeywords.ionX);
    effectiveShieldedX -= shieldsFlipped;
  }

  // ── 6.1: Ram X (converts blanks→crits first, then hits→crits; melee/overrun only) ──
  // Note: This estimator doesn't track blanks, so we can only convert hits→crits.
  // Blanks→crits is a structural limitation of the function signature.
  if (poolKeywords.ramX > 0 && isMeleeOrOverrun) {
    const hitsConverted = Math.min(effectiveHits, poolKeywords.ramX);
    effectiveHits -= hitsConverted;
    effectiveCrits += hitsConverted;
  }

  // ── 6.2: Impact X + Weak Point X (converts hits→crits vs Armor) ──
  const effectiveImpact = poolKeywords.impactX + defender.weakPointX;
  if (defender.armorX > 0 && effectiveImpact > 0) {
    const hitsConverted = Math.min(effectiveHits, effectiveImpact);
    effectiveHits -= hitsConverted;
    effectiveCrits += hitsConverted;
  }

  // ── 6.2.5: Primitive (converts all crits→hits when defender has Armor) ──
  // Per rulebook: After resolving Impact X, if the pool has Primitive and the
  // defender has Armor X, all crit results become hit results.
  if (poolKeywords.primitive && defender.armorX > 0) {
    effectiveHits += effectiveCrits;
    effectiveCrits = 0;
  }

  // ── 6.3: Armor X (cancels hits, crits bypass) ──
  effectiveHits = Math.max(0, effectiveHits - defender.armorX);

  // ── 6.4: Shielded X (cancels crits first, then hits; Ranged only) ──
  if (effectiveShieldedX > 0 && isRanged) {
    let shieldRemaining = effectiveShieldedX;
    const critsCancelled = Math.min(effectiveCrits, shieldRemaining);
    effectiveCrits -= critsCancelled;
    shieldRemaining -= critsCancelled;
    if (shieldRemaining > 0) {
      const hitsCancelled = Math.min(effectiveHits, shieldRemaining);
      effectiveHits -= hitsCancelled;
    }
  }

  // ── 6.5: Backup (cancels 2 hits; Ranged only) ──
  if (defender.backup && isRanged) {
    const hitsCancelled = Math.min(effectiveHits, 2);
    effectiveHits -= hitsCancelled;
  }

  // ── 6.6: Guardian X (absorbs X hits; Ranged only; separate defense) ──
  let guardianWounds = 0;
  if (defender.guardianX > 0 && isRanged) {
    const guardianAbsorbed = Math.min(effectiveHits, defender.guardianX);
    effectiveHits -= guardianAbsorbed;

    // Estimate guardian defense: guardian rolls its own defense dice
    const guardianDieColor = defender.guardianDieColor ?? defender.dieColor;
    const guardianSurgeChart = defender.guardianSurgeChart ?? DefenseSurgeChart.None;
    const guardianHasSurgeConversion = guardianSurgeChart === DefenseSurgeChart.ToBlock
      || (defender.guardianDeflect && isRanged && !poolKeywords.highVelocity);
    let guardianBlockProb: number;
    if (guardianDieColor === DefenseDieColor.White) {
      guardianBlockProb = guardianHasSurgeConversion ? 2 / 6 : 1 / 6;
    } else {
      guardianBlockProb = guardianHasSurgeConversion ? 4 / 6 : 3 / 6;
    }
    const expectedGuardianBlocks = guardianAbsorbed * guardianBlockProb;
    guardianWounds = Math.max(0, guardianAbsorbed - expectedGuardianBlocks);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 7 — Roll Defense Dice
  // ═══════════════════════════════════════════════════════════════════════════

  const totalSuccesses = effectiveHits + effectiveCrits;

  // ── 7a-b: Calculate defense die count ──
  let defenseDieCount = totalSuccesses;

  // disableDefenseDice: Custom mode sets defense dice to 0
  if (defender.disableDefenseDice) {
    defenseDieCount = 0;
  }

  // Danger Sense X: +min(X, suppressionTokens) bonus dice
  if (defender.dangerSenseX > 0 && defender.suppressionTokens > 0) {
    defenseDieCount += Math.min(defender.dangerSenseX, defender.suppressionTokens);
  }

  // Impervious: +pierceX bonus dice (disabled by Makashi Mastery in Melee)
  const isMeleeWithMakashi = attacker.makashiMastery && isMelee;
  if (defender.impervious && !isMeleeWithMakashi) {
    // Only adds dice for Pierce that would actually apply
    let effectivePierceForImpervious = poolKeywords.pierceX + additionalPierce;
    if (defender.immunePierce) {
      effectivePierceForImpervious = 0;
    }
    if (defender.immuneMeleePierce && isMelee) {
      effectivePierceForImpervious = 0;
    }
    defenseDieCount += effectivePierceForImpervious;
  }

  // ── 7c-e: Estimate defense blocks ──
  // Base block probability depends on die color and whether surges convert
  const hasSurgeConversion = determineDefenseSurgeConversion(
    defender, attackType, poolKeywords.highVelocity, dodgeWasSpent
  );

  let baseBlockProbability: number;
  if (defender.dieColor === DefenseDieColor.White) {
    // White: 1 block, 1 surge, 4 blank out of 6
    baseBlockProbability = hasSurgeConversion ? 2 / 6 : 1 / 6;
  } else {
    // Red: 3 block, 1 surge, 2 blank out of 6
    baseBlockProbability = hasSurgeConversion ? 4 / 6 : 3 / 6;
  }

  // ── 7d: Model Soresu Mastery (reroll ALL defense dice; Ranged only) ──
  // Effect: each die gets two chances to block → P(block) = 1 - (1 - P)^2
  if (defender.soresuMastery && isRanged) {
    baseBlockProbability = 1 - (1 - baseBlockProbability) ** 2;
  }

  // ── 7d: Model Uncanny Luck X (reroll X non-block dice) ──
  // Approximation: X dice get a second chance at blocking.
  // Effective improvement: X * P(blank_or_unconverted_surge) * P(block_on_reroll)
  // Simplified: add X * (1 - baseBlockProbability) * baseBlockProbability expected blocks
  // But cap at the number of dice that could be blanks (defenseDieCount - expected blocks)
  let uncannyLuckBonus = 0;
  if (defender.uncannyLuckX > 0 && defenseDieCount > 0) {
    const failProb = 1 - baseBlockProbability;
    const expectedBlanks = defenseDieCount * failProb;
    const rerollableDice = Math.min(defender.uncannyLuckX, expectedBlanks);
    uncannyLuckBonus = rerollableDice * baseBlockProbability;
  }

  let expectedDefenseBlocks = defender.disableDefenseDice
    ? 0
    : defenseDieCount * baseBlockProbability + uncannyLuckBonus;

  // ── Handle Surge Tokens (limited conversion — separate from surge chart) ──
  // If no surge chart conversion but surge tokens exist, some surges still convert.
  // Model as: min(surgeTokens, expected surges) additional blocks above base probability.
  // Only relevant if hasSurgeConversion is false (surge chart/deflect/block/HTL already converts all).
  if (!hasSurgeConversion && defender.surgeTokens > 0 && defenseDieCount > 0) {
    // Expected surges per die: 1/6 for any color defense die
    const expectedSurges = defenseDieCount * (1 / 6);
    const surgesConverted = Math.min(defender.surgeTokens, expectedSurges);
    expectedDefenseBlocks += surgesConverted;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 8–9 — Pierce and Compare Results
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Calculate total Pierce ──
  // poolKeywords.pierceX + additionalPierce (Lethal X, Duelist) when known.
  let totalPierce = poolKeywords.pierceX + additionalPierce;

  // Makashi Mastery: reduce Pierce by 1 in Melee, but overrides Immune Pierce & Impervious
  if (isMeleeWithMakashi) {
    totalPierce = Math.max(0, totalPierce - 1);
  }

  // Immune: Pierce / Immune: Melee Pierce
  // Makashi overrides both immunities in Melee
  const immuneToThisPierce =
    (defender.immunePierce && !isMeleeWithMakashi) ||
    (defender.immuneMeleePierce && isMelee && !isMeleeWithMakashi);
  if (immuneToThisPierce) {
    totalPierce = 0;
  }

  // Duelist Defender: Immune Pierce for Melee + dodge spent
  if (defender.duelistDefender && isMelee && dodgeWasSpent) {
    totalPierce = 0;
  }

  // ── Apply Pierce to defense blocks ──
  // Pierce cancels defense dice blocks (Step 8). Cover blocks are already
  // removed from effectiveHits in Step 5 and are NOT subject to Pierce.
  const defenseBlocksAfterPierce = Math.max(0, expectedDefenseBlocks - totalPierce);

  // ── Calculate expected wounds (main target + guardian wounds) ──
  const mainTargetWounds = Math.max(0, totalSuccesses - defenseBlocksAfterPierce);
  return mainTargetWounds + guardianWounds;
}
