import type { AttackConfig, AttackResult, RolledAttackDie, RolledDefenseDie, AttackerConfig } from './types';
import { rollAttackDie, rollDefenseDie } from './dice';
import { AttackType, AttackSurgeChart, DefenseSurgeChart, AttackFace, DefenseFace, CoverType, DefenseDieColor, AttackDieColor } from './types';

/**
 * Execute the full Star Wars: Legion attack sequence (Steps 2–9).
 * Returns the final wound count and side effects.
 */
export function executeAttackSequence(config: AttackConfig): AttackResult {
  // Step 2 — Form Attack Pool
  const poolAfterStep2 = formAttackPool(config);

  // Step 4a — Upgrade/Downgrade Attack Dice
  const poolAfterStep4a = upgradeDowgradeAttackDice(poolAfterStep2, config);

  // Step 4b — Roll Attack Dice
  const rolledAttack = rollAttackDice(poolAfterStep4a);

  // Step 4c — Reroll Attack Dice (simplified for now)
  const { results: afterRerolls, aimsSpent, pierceBonus, aimsSavedForMarksman } =
    rerollAttackDice(rolledAttack, config);

  // Step 4d — Convert Attack Surges
  const afterSurgeConversion = convertAttackSurges(afterRerolls, config);

  // Step 4d.5 — Apply Marksman (post-surge conversion) - placeholder
  const afterMarksman = applyMarksman(afterSurgeConversion, config, aimsSavedForMarksman);

  // Step 4d.6 — Apply Jar'Kai Mastery (post-surge conversion, Melee only) - placeholder
  const afterJarKai = applyJarKai(afterMarksman, config);

  // Step 5 — Apply Dodge and Cover
  const { hits: hitsAfterDodgeCover, crits: critsAfterDodgeCover, blanks: blanksAfterDodgeCover, dodgeWasSpent } =
    applyDodgeAndCover(afterJarKai, config);

  // Step 6 — Modify Attack Dice
  const { hits, crits, lethalPierce, guardianHits } =
    modifyAttackDice({ hits: hitsAfterDodgeCover, crits: critsAfterDodgeCover, blanks: blanksAfterDodgeCover }, config, aimsSpent, aimsSavedForMarksman);

  // Step 6b — Roll Guardian Defense (if Guardian absorbed hits) - simplified
  let guardianWoundsNoPierce = 0;
  let guardianBlocks = 0;
  let guardianDeflectWounds = 0;
  if (guardianHits > 0 && config.defender.guardianX > 0) {
    const guardianResult = rollGuardianDefense(guardianHits, config);
    guardianWoundsNoPierce = guardianResult.guardianWoundsNoPierce;
    guardianBlocks = guardianResult.guardianBlocks;
    guardianDeflectWounds = guardianResult.guardianDeflectWounds;
  }

  // Step 7 — Roll Defense Dice
  const { results: defenseResults, surgeCountBeforeConversion } =
    rollDefenseDice({ hits, crits }, config, lethalPierce, pierceBonus, dodgeWasSpent);

  // Step 8 — Modify Defense Dice
  const { blocks: mainTargetBlocks } = modifyDefenseDice(defenseResults, config, dodgeWasSpent);

  // Step 9 — Compare Results
  const finalResult = compareResults(
    { hits, crits },
    { mainTargetBlocks, guardianBlocks, guardianHits },
    config,
    lethalPierce,
    pierceBonus,
    surgeCountBeforeConversion,
    rolledAttack,
    guardianWoundsNoPierce,
    guardianDeflectWounds,
    dodgeWasSpent
  );

  return finalResult;
}

// ============================================================================
// Step 2: Form Attack Pool
// ============================================================================

/**
 * Step 2 — Form Attack Pool
 * - Start with the dice specified in attacker config
 * - Apply Spray (multiply by minis in LOS if spray = true)
 */
function formAttackPool(config: AttackConfig): AttackDieColor[] {
  const { attacker, defender } = config;

  // Base dice counts
  let red = attacker.redDice;
  let black = attacker.blackDice;
  let white = attacker.whiteDice;

  // Spray: multiply weapon dice by minis in LOS
  if (attacker.spray) {
    const multiplier = Math.max(1, defender.minisInLOS);
    red *= multiplier;
    black *= multiplier;
    white *= multiplier;
  }

  // Build pool array
  const pool: AttackDieColor[] = [];
  for (let i = 0; i < red; i++) pool.push('red' as AttackDieColor);
  for (let i = 0; i < black; i++) pool.push('black' as AttackDieColor);
  for (let i = 0; i < white; i++) pool.push('white' as AttackDieColor);

  return pool;
}

// ============================================================================
// Step 4a: Upgrade/Downgrade Attack Dice
// ============================================================================

/**
 * Step 4a — Upgrade / Downgrade Attack Dice
 * Order: attacker downgrade → defender downgrade → attacker upgrade → defender upgrade
 * Currently no upgrades/downgrades in MVP (Anti-Materiel/Anti-Personnel require unit types)
 */
function upgradeDowgradeAttackDice(
  pool: AttackDieColor[],
  _config: AttackConfig
): AttackDieColor[] {
  // No modifications in MVP
  return pool;
}

// ============================================================================
// Step 4b: Roll Attack Dice
// ============================================================================

/**
 * Step 4b — Roll Attack Dice
 * Roll each die in the pool, preserving color information.
 */
function rollAttackDice(pool: AttackDieColor[]): RolledAttackDie[] {
  return pool.map(color => ({ color, face: rollAttackDie(color) }));
}

// ============================================================================
// Step 4c: Reroll Attack Dice — Helper Functions
// ============================================================================

/**
 * Calculate excess surge indices — surges that won't be converted.
 * Returns indices of surges that should be treated as blanks for rerolling.
 */
function calculateExcessSurgeIndices(
  surgeIndices: Array<{ idx: number; colorRank: number }>,
  attacker: AttackerConfig
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
  const totalConversions = attacker.surgeTokens + attacker.criticalX;

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
  attacker: AttackerConfig
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
  const excessSurgeIndices = calculateExcessSurgeIndices(surgeIndices, attacker);

  // Combine blanks + excess surges, sort by color rank descending (Red first)
  const allTargets = [...blankIndices, ...excessSurgeIndices];
  allTargets.sort((a, b) => b.colorRank - a.colorRank);

  return allTargets.map(t => t.idx);
}

// ============================================================================
// Step 4c: Reroll Attack Dice
// ============================================================================

function rerollAttackDice(
  results: RolledAttackDie[],
  config: AttackConfig
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
    const targetIndices = identifyRerollTargetIndices(workingResults, attacker);

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
      const targetIndices = identifyRerollTargetIndices(workingResults, attacker);
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
    const targetIndices = identifyRerollTargetIndices(workingResults, attacker);
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
    (config.attackType === AttackType.Melee || config.attackType === AttackType.All) &&
    aimsSpent > 0
  ) {
    pierceBonus = 1;
  }

  return { results: workingResults, aimsSpent, pierceBonus, aimsSavedForMarksman };
}

// ============================================================================
// Step 4d: Convert Attack Surges
// ============================================================================

/**
 * Step 4d — Convert Attack Surges
 * Apply surge chart, surge tokens, and keyword effects.
 */
/**
 * Step 4d — Convert Attack Surges
 *
 * Priority order (each source consumes surges):
 * 1. Critical X (surge → crit)
 * 2. Jedi Hunter (all remaining surges → crit)
 * 3. Surge Chart (all remaining surges)
 * 4. Hold the Line - Attacker (all remaining surges → hit, Melee only)
 * 5. Surge Tokens (surge → hit)
 */
function convertAttackSurges(
  results: RolledAttackDie[],
  config: AttackConfig
): RolledAttackDie[] {
  const { attacker } = config;
  let workingResults = results.map(d => ({ ...d })); // Clone

  // Track remaining surge count
  let surgeCount = workingResults.filter(d => d.face === AttackFace.Surge).length;
  if (surgeCount === 0) return workingResults;

  // ── Priority 1: Critical X (surge → crit) ──
  // Crits bypass Armor, Dodge (without Outmaneuver), and Cover.
  // Applied first to maximize crit conversions before other sources convert to hits.
  if (attacker.criticalX > 0 && surgeCount > 0) {
    let converted = 0;
    workingResults = workingResults.map(d => {
      if (d.face === AttackFace.Surge && converted < attacker.criticalX) {
        converted++;
        return { ...d, face: AttackFace.Critical };
      }
      return d;
    });
    surgeCount -= converted;
    if (surgeCount === 0) return workingResults;
  }

  // ── Priority 2: Jedi Hunter (all remaining surges → crit) ──
  if (attacker.jediHunter && surgeCount > 0) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Critical } : d
    );
    return workingResults; // All remaining surges consumed
  }

  // ── Priority 3: Surge Chart ──
  if (attacker.surgeChart === AttackSurgeChart.ToHit) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Hit } : d
    );
    return workingResults; // All remaining surges consumed
  }
  if (attacker.surgeChart === AttackSurgeChart.ToCrit) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Critical } : d
    );
    return workingResults; // All remaining surges consumed
  }
  // Chart is None — surges remain, fall through to keyword/token conversions

  // ── Priority 4: Hold the Line — Attacker (all remaining surges → hit) ──
  if (
    attacker.holdTheLine &&
    surgeCount > 0 &&
    (config.attackType === AttackType.Melee || config.attackType === AttackType.All)
  ) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Hit } : d
    );
    return workingResults; // All remaining surges consumed
  }

  // ── Priority 5: Surge Tokens (surge → hit) ──
  // Applied last to preserve tokens when keywords handle conversion.
  if (attacker.surgeTokens > 0 && surgeCount > 0) {
    let converted = 0;
    workingResults = workingResults.map(d => {
      if (d.face === AttackFace.Surge && converted < attacker.surgeTokens) {
        converted++;
        return { ...d, face: AttackFace.Hit };
      }
      return d;
    });
    surgeCount -= converted;
  }

  // Any remaining surges stay as surge faces (treated as blanks for wound counting)
  return workingResults;
}

// ============================================================================
// Step 4d.5: Apply Marksman
// ============================================================================

/**
 * Step 4d.5 — Apply Marksman (Post-Surge Conversion)
 *
 * Spends Aim tokens saved from Step 4c to convert die results:
 *   - blank → hit (1 Aim)
 *   - hit → crit (1 Aim)
 *   - blank → crit (2 Aims, via iterative loop)
 *
 * Strategy:
 * - Deterministic: Always convert when possible (prioritize hit→crit)
 * - Averages: (simplified - always convert for now)
 */
function applyMarksman(
  results: RolledAttackDie[],
  config: AttackConfig,
  aimsSavedForMarksman: number
): RolledAttackDie[] {
  // Guard: no saved aims or no Marksman keyword
  if (aimsSavedForMarksman <= 0 || !config.attacker.marksman) {
    return results;
  }

  let workingResults = results.map(d => ({ ...d })); // Clone
  let aimsRemaining = aimsSavedForMarksman;

  // Iterative conversion loop:
  // Each iteration spends 1 aim to convert 1 die (blank→hit or hit→crit).
  // The loop naturally handles blank→crit by taking 2 iterations.
  while (aimsRemaining > 0) {
    // Find convertible dice
    const blankIndices: number[] = [];
    const hitIndices: number[] = [];

    workingResults.forEach((die, index) => {
      if (die.face === AttackFace.Blank || die.face === AttackFace.Surge) {
        // Post-surge: remaining surges are effectively blanks
        blankIndices.push(index);
      } else if (die.face === AttackFace.Hit) {
        hitIndices.push(index);
      }
    });

    // Nothing to convert — stop
    if (blankIndices.length === 0 && hitIndices.length === 0) {
      break;
    }

    // Prioritize hit→crit over blank→hit (crits bypass more keywords)
    if (hitIndices.length > 0) {
      // Convert hit → crit
      workingResults[hitIndices[0]] = {
        ...workingResults[hitIndices[0]],
        face: AttackFace.Critical,
      };
      aimsRemaining--;
    } else if (blankIndices.length > 0) {
      // Convert blank → hit
      workingResults[blankIndices[0]] = {
        ...workingResults[blankIndices[0]],
        face: AttackFace.Hit,
      };
      aimsRemaining--;
    } else {
      break; // No convertible dice
    }
  }

  return workingResults;
}

// ============================================================================
// Step 4d.6: Apply Jar'Kai Mastery
// ============================================================================

/**
 * Step 4d.6 — Apply Jar'Kai Mastery
 *
 * Spend attacker's Dodge tokens to convert die results:
 *   - blank → hit (1 Dodge)
 *   - hit → crit (1 Dodge)
 *   - blank → crit (2 Dodges, via iterative loop)
 *
 * Only active when:
 *   - attacker.jarKaiMastery === true
 *   - attackType is Melee (or All)
 *   - attacker.dodgeTokensAttacker > 0
 */
function applyJarKai(
  results: RolledAttackDie[],
  config: AttackConfig
): RolledAttackDie[] {
  const { attacker } = config;

  // Guard conditions
  if (!attacker.jarKaiMastery) return results;
  if (config.attackType !== AttackType.Melee && config.attackType !== AttackType.All) return results;
  if (attacker.dodgeTokensAttacker <= 0) return results;

  let workingResults = results.map(d => ({ ...d })); // Clone
  let dodgeRemaining = attacker.dodgeTokensAttacker;

  while (dodgeRemaining > 0) {
    // Find convertible dice
    const blankIndices: number[] = [];
    const hitIndices: number[] = [];

    workingResults.forEach((die, index) => {
      if (die.face === AttackFace.Blank || die.face === AttackFace.Surge) {
        blankIndices.push(index);
      } else if (die.face === AttackFace.Hit) {
        hitIndices.push(index);
      }
    });

    // Nothing to convert — stop
    if (blankIndices.length === 0 && hitIndices.length === 0) {
      break;
    }

    // Prioritize hit→crit over blank→hit
    if (hitIndices.length > 0) {
      workingResults[hitIndices[0]] = {
        ...workingResults[hitIndices[0]],
        face: AttackFace.Critical,
      };
      dodgeRemaining--;
    } else if (blankIndices.length > 0) {
      workingResults[blankIndices[0]] = {
        ...workingResults[blankIndices[0]],
        face: AttackFace.Hit,
      };
      dodgeRemaining--;
    } else {
      break;
    }
  }

  return workingResults;
}

// ============================================================================
// Step 5: Apply Dodge and Cover
// ============================================================================

/**
 * Determine the effective cover value (0-2) after all modifiers.
 */
function determineCoverValue(config: AttackConfig): number {
  const { attacker, defender } = config;

  // ── Override checks ──
  // Blast sets cover to 0 (unless defender has Immune: Blast)
  if (attacker.blast && !defender.immuneBlast) {
    return 0;
  }
  // Death From Above sets cover to 0 (no immunity)
  if (attacker.deathFromAbove) {
    return 0;
  }

  // ── Base cover value ──
  let cover = 0;
  switch (defender.coverType) {
    case CoverType.None:
      cover = 0;
      break;
    case CoverType.Light:
      cover = 1;
      break;
    case CoverType.Heavy:
      cover = 2;
      break;
  }

  // ── Improvements (additive) ──
  // Suppressed: +1 cover
  if (defender.suppressed) {
    cover += 1;
  }

  // Cover X: +X (only applies to Ranged attacks per rulebook)
  if (config.attackType === AttackType.Ranged || config.attackType === AttackType.All) {
    cover += defender.coverX;
  }

  // Smoke tokens: +1 per token
  cover += defender.smokeTokens;

  // ── Cap at 2 ──
  cover = Math.min(cover, 2);

  // ── Reductions (after cap) ──
  cover -= attacker.sharpshooterX;

  // ── Floor at 0 ──
  cover = Math.max(cover, 0);

  return cover;
}

/**
 * Roll the cover pool and count cancellations.
 *
 * @param hitCount - Number of hit (a) results to roll cover for
 * @param coverValue - Effective cover (1=Light, 2=Heavy)
 * @param lowProfile - Whether defender has Low Profile keyword
 * @param dugIn - Whether defender has Dug In upgrade (red dice instead of white)
 * @returns Number of hits cancelled by cover
 */
function rollCoverPool(
  hitCount: number,
  coverValue: number,
  lowProfile: boolean,
  dugIn: boolean = false
): number {
  if (hitCount <= 0 || coverValue <= 0) return 0;

  let poolSize = hitCount;
  let autoBlocks = 0;

  // Low Profile: -1 die, +1 guaranteed block
  // Only applies when the defender would roll 1 or more cover dice.
  // If cover is 0 (due to Blast, Sharpshooter, or no cover), Low Profile has no effect.
  if (lowProfile && poolSize > 0) {
    autoBlocks = 1;
    poolSize = Math.max(0, poolSize - 1);
  }

  // Roll cover dice — normally white, but red if the defender has the Dug In upgrade
  const coverDieColor = dugIn ? DefenseDieColor.Red : DefenseDieColor.White;
  let blocks = autoBlocks;
  for (let i = 0; i < poolSize; i++) {
    const face = rollDefenseDie(coverDieColor);

    if (face === DefenseFace.Block) {
      // Block always cancels (Light or Heavy)
      blocks++;
    } else if (face === DefenseFace.Surge && coverValue >= 2) {
      // Surge only cancels with Heavy cover
      blocks++;
    }
    // Blanks never cancel
  }

  // Cover cancellations cannot exceed the number of hits
  return Math.min(blocks, hitCount);
}

/**
 * Step 5 — Apply Dodge and Cover
 * Full implementation with cover pool rolling and proper dodge logic.
 */
function applyDodgeAndCover(
  results: RolledAttackDie[],
  config: AttackConfig
): { hits: number; crits: number; blanks: number; dodgeWasSpent: boolean } {
  const { attacker, defender } = config;

  // ── Count results ──
  let hits = results.filter(r => r.face === AttackFace.Hit).length;
  let crits = results.filter(r => r.face === AttackFace.Critical).length;
  const blanks = results.filter(r => r.face === AttackFace.Blank).length;

  // ── Step 5a-d: Cover ──
  const coverValue = determineCoverValue(config);

  if (coverValue > 0 && hits > 0) {
    const coverBlocks = rollCoverPool(hits, coverValue, defender.lowProfile, defender.dugIn);
    hits = Math.max(0, hits - coverBlocks);
  }

  // ── Step 5e: Dodge ──
  let dodgeWasSpent = false;

  // High Velocity prevents Dodge spending entirely
  if (attacker.highVelocity) {
    // No Dodge processing — dodgeWasSpent stays false
    // This also prevents Block activation (Block requires Dodge spent)
    return { hits, crits, blanks, dodgeWasSpent };
  }

  if (defender.dodgeTokens > 0) {
    let dodgesRemaining = defender.dodgeTokens;

    // Cancel hits first
    if (hits > 0 && dodgesRemaining > 0) {
      const hitsCancelled = Math.min(hits, dodgesRemaining);
      hits -= hitsCancelled;
      dodgesRemaining -= hitsCancelled;
      dodgeWasSpent = true;
    }

    // Outmaneuver: cancel crits with remaining Dodge tokens
    if (defender.outmaneuver && crits > 0 && dodgesRemaining > 0) {
      const critsCancelled = Math.min(crits, dodgesRemaining);
      crits -= critsCancelled;
      dodgesRemaining -= critsCancelled;
      dodgeWasSpent = true;
    }

    // Block: spend Dodge even with nothing to cancel
    // This enables Block's defense surge conversion (e→d) in Step 7e.
    // Per rulebook: "Units may spend Dodge Tokens even if there are
    // no hit results to cancel."
    // Important: Block only matters if defender HAS the Block keyword.
    if (!dodgeWasSpent && defender.block && dodgesRemaining > 0) {
      dodgeWasSpent = true;
      // No actual cancellation occurs — just marks that a Dodge was spent
    }
  }

  return { hits, crits, blanks, dodgeWasSpent };
}

// ============================================================================
// Step 6: Modify Attack Dice
// ============================================================================

/**
 * Step 6 — Modify Attack Dice
 *
 * Applies attacker and defender modification keywords to the attack results.
 * This is the last step before defense dice are rolled.
 *
 * Operation order (CRITICAL):
 * 1. Ram X — Convert ANY results (blanks first, then hits) to crits
 * 2. Impact X — Convert hits → crits (to bypass Armor)
 * 3. Armor X — Cancel hits (crits bypass)
 * 4. Shielded X — Cancel crits first, then hits (Ranged only)
 * 5. Backup — Cancel up to 2 hits (Ranged only)
 * 6. Guardian X — Absorb up to X hits (Ranged only, separate defense)
 * 7. Lethal X — Calculate Pierce bonus from remaining aims
 */
function modifyAttackDice(
  attackResults: { hits: number; crits: number; blanks: number },
  config: AttackConfig,
  aimsSpent: number,
  aimsSavedForMarksman: number
): { hits: number; crits: number; lethalPierce: number; guardianHits: number } {
  let { hits, crits, blanks } = attackResults;
  const { attacker, defender } = config;
  let lethalPierce = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Ram X — Convert up to X results (any face) to crits
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "While this unit is performing an attack, change X attack die
  // results to crit results."
  // Priority: blanks first (free value), then hits (upgrade)
  // Crits are already crits — skipped.
  if (attacker.ramX > 0) {
    let ramRemaining = attacker.ramX;

    // Convert blanks → crits
    const blanksConverted = Math.min(blanks, ramRemaining);
    blanks -= blanksConverted;
    crits += blanksConverted;
    ramRemaining -= blanksConverted;

    // Convert hits → crits (only if Ram budget remains)
    if (ramRemaining > 0) {
      const hitsConverted = Math.min(hits, ramRemaining);
      hits -= hitsConverted;
      crits += hitsConverted;
      ramRemaining -= hitsConverted;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Impact X — Convert up to X hits → crits (only when defender has Armor)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "While attacking a unit that has Armor, change up to X hit
  // results to crit results."
  // Impact only activates when the defender has Armor X > 0.
  if (attacker.impactX > 0 && defender.armorX > 0) {
    const impactConversions = Math.min(hits, attacker.impactX);
    hits -= impactConversions;
    crits += impactConversions;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Armor X — Cancel up to X hits (crits bypass Armor)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "While a unit with Armor X is defending, cancel up to X hit
  // results." Crits are NOT cancelled by Armor.
  if (defender.armorX > 0) {
    const hitsCancelled = Math.min(hits, defender.armorX);
    hits -= hitsCancelled;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Shielded X — Cancel up to X results (crits first, then hits)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "Cancel up to X results" — applies to any result type.
  // Ranged attacks only.
  // Priority: cancel crits first (most valuable to attacker), then hits.
  if (
    defender.shieldedX > 0 &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)
  ) {
    let shieldRemaining = defender.shieldedX;

    // Cancel crits first
    const critsCancelled = Math.min(crits, shieldRemaining);
    crits -= critsCancelled;
    shieldRemaining -= critsCancelled;

    // Cancel hits with remaining shield
    if (shieldRemaining > 0) {
      const hitsCancelled = Math.min(hits, shieldRemaining);
      hits -= hitsCancelled;
      shieldRemaining -= hitsCancelled;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Backup — Cancel up to 2 hits (Ranged only)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "When a unit with the Backup keyword is attacked by a ranged
  // attack, 2 hit results are canceled."
  if (
    defender.backup &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)
  ) {
    const hitsCancelled = Math.min(hits, 2);
    hits -= hitsCancelled;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Guardian X — Absorb up to X hits (Ranged only)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "When a friendly unit is attacked, cancel up to X hit results."
  // Guardian absorbs hits but then rolls its OWN defense dice.
  // The absorbed hits are defended separately (Step 6b).
  // Pierce is NOT applied to Guardian — it's deferred to compareResults (Step 9).
  let guardianHits = 0;
  if (
    defender.guardianX > 0 &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)
  ) {
    guardianHits = Math.min(hits, defender.guardianX);
    hits -= guardianHits;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Lethal X — Calculate Pierce bonus from remaining Aim tokens
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "While attacking, if the attacking unit spends Aim tokens,
  // add Pierce X to the attack pool."
  //
  // Lethal X requires spending aim tokens SPECIFICALLY to gain Pierce.
  // Each aim dedicated to Lethal grants 1 Pierce, up to the Lethal X value.
  // Aims spent on rerolls or saved for Marksman do NOT count toward Lethal —
  // only aims that remain unspent after those steps are available for Lethal.
  //
  // lethalPierce = min(lethalX, aimsLeftover)
  // where aimsLeftover = aimTokens - aimsSpent - aimsSavedForMarksman
  const aimsLeftover = Math.max(0, attacker.aimTokens - aimsSpent - aimsSavedForMarksman);
  if (attacker.lethalX > 0 && aimsLeftover > 0) {
    lethalPierce = Math.min(attacker.lethalX, aimsLeftover);
  }

  return { hits, crits, lethalPierce, guardianHits };
}

// ============================================================================
// Step 6b: Roll Guardian Defense
// ============================================================================

/**
 * Step 6b — Roll Guardian Defense
 * When Guardian X absorbs hits, those hits are defended by the Guardian unit
 * with its own defense dice, surge chart, and keywords.
 */
function rollGuardianDefense(
  guardianHits: number,
  config: AttackConfig
): { guardianWoundsNoPierce: number; guardianBlocks: number; guardianDeflectWounds: number } {
  const { defender, attacker } = config;

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
  if (defender.guardianDeflect && !attacker.highVelocity && !attacker.immuneDeflect) {
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
    !attacker.highVelocity &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)
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

// ============================================================================
// Step 7: Roll Defense Dice
// ============================================================================

/**
 * Step 7 — Roll Defense Dice
 * - 7a. Gather defense dice count
 * - 7b. Add bonus dice (Danger Sense X, Impervious)
 * - 7c. Roll dice
 * - 7d. Reroll dice (Uncanny Luck X, Soresu Mastery)
 * - 7e. Convert defense surges
 */
function rollDefenseDice(
  attackResults: { hits: number; crits: number },
  config: AttackConfig,
  lethalPierce: number,
  duelistPierceBonus: number,
  dodgeWasSpent: boolean
): { results: RolledDefenseDie[]; surgeCountBeforeConversion: number } {
  const { defender, attacker } = config;
  const totalAttackResults = attackResults.hits + attackResults.crits;

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
    let effectivePierce = attacker.pierceX + lethalPierce + duelistPierceBonus;

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
  results = rerollDefenseDice(results, config);

  // ── Capture surge count BEFORE conversion ──
  // This is needed for Deflect/Shien wound calculation in Step 9.
  // Per rulebook, Deflect checks "before converting any e results."
  const surgeCountBeforeConversion = results.filter(d => d.face === DefenseFace.Surge).length;

  // ── 7e. Convert defense surges ──
  results = convertDefenseSurges(results, config, dodgeWasSpent);

  return { results, surgeCountBeforeConversion };
}

/**
 * Step 7d — Reroll Defense Dice
 * - Soresu Mastery: reroll ALL defense dice (Ranged attacks only)
 * - Uncanny Luck X: reroll up to X dice (blanks first, then surges if no conversion)
 */
function rerollDefenseDice(
  results: RolledDefenseDie[],
  config: AttackConfig
): RolledDefenseDie[] {
  const { defender, attacker } = config;
  let workingResults = results.map(d => ({ ...d }));

  // Track which dice have been rerolled (each die can only be rerolled once)
  const rerolled = new Set<number>();

  // ── Soresu Mastery ──
  // Ranged attacks only. Rerolls ALL defense dice.
  // Applied first since it's a full pool reroll.
  if (
    defender.soresuMastery &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)
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
      (defender.deflect && !attacker.highVelocity) ||
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

/**
 * Step 7e — Convert Defense Surges
 * Priority order:
 * 1. Surge Chart (ToBlock)
 * 2. Deflect (Ranged only, disabled by High Velocity)
 * 3. Block (requires Dodge spent)
 * 4. Hold the Line (defender)
 * 5. Surge Tokens
 */
function convertDefenseSurges(
  results: RolledDefenseDie[],
  config: AttackConfig,
  dodgeWasSpent: boolean
): RolledDefenseDie[] {
  const { defender, attacker } = config;
  let workingResults = results.map(d => ({ ...d }));

  let surgeCount = workingResults.filter(d => d.face === DefenseFace.Surge).length;
  if (surgeCount === 0) return workingResults;

  // ── 1. Surge Chart ──
  if (defender.surgeChart === DefenseSurgeChart.ToBlock) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    return workingResults; // All consumed
  }

  // ── 2. Deflect (Ranged only) ──
  // High Velocity completely disables Deflect (both surge conversion AND wound reflection).
  // Immune: Deflect on attacker does NOT prevent surge conversion —
  //       it only prevents the WOUND reflection. Deflect surge→block still works.
  // But High Velocity disables ALL Deflect effects.
  if (
    defender.deflect &&
    !attacker.highVelocity &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All) &&
    surgeCount > 0
  ) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    return workingResults; // All remaining surges consumed
  }

  // ── 3. Block (requires Dodge spent) ──
  // Block converts surges→blocks when a Dodge token was spent in Step 5.
  // High Velocity prevents Dodge spending, so Block won't activate.
  if (defender.block && dodgeWasSpent && surgeCount > 0) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    return workingResults; // All remaining surges consumed
  }

  // ── 4. Hold the Line (defender) ──
  // Grants surge:block while engaged (Melee attacks).
  if (defender.holdTheLine && surgeCount > 0) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    return workingResults; // All remaining surges consumed
  }

  // ── 5. Surge Tokens ──
  // Applied last to preserve tokens when keywords handle conversion.
  if (defender.surgeTokens > 0 && surgeCount > 0) {
    let converted = 0;
    workingResults = workingResults.map(d => {
      if (d.face === DefenseFace.Surge && converted < defender.surgeTokens) {
        converted++;
        return { ...d, face: DefenseFace.Block };
      }
      return d;
    });
    surgeCount -= converted;
  }

  // Remaining surges stay as surges (blanks for counting)
  return workingResults;
}

// ============================================================================
// Step 8: Modify Defense Dice
// ============================================================================

/**
 * Step 8 — Modify Defense Dice
 * Just count blocks. Pierce is NOT applied here (deferred to Step 9).
 */
function modifyDefenseDice(
  results: RolledDefenseDie[],
  _config: AttackConfig,
  _dodgeWasSpent: boolean
): { blocks: number } {
  const blocks = results.filter(d => d.face === DefenseFace.Block).length;
  return { blocks };
}

// ============================================================================
// Step 9: Compare Results
// ============================================================================

/**
 * Step 9 — Compare Results
 *
 * Three wound outputs:
 *   - guardianWoundsNoPierce: guardian hits − guardian blocks (pierce excluded)
 *   - mainTargetWoundsNoPierce: (hits + crits) − main target blocks (pierce excluded)
 *   - totalWounds: (all hits) − (combined blocks − pierce)
 *
 * Reflection wounds (dealt back to attacker):
 *   - deflectWounds: Deflect/Shien + Guardian Deflect
 *   - djemSoWounds: Djem So Mastery
 *
 * Suppression:
 *   - suppressionApplied: 1 (or 2 with Suppressive), 0 if Shien suppresses
 */
function compareResults(
  attackResults: { hits: number; crits: number },
  defenseInfo: { mainTargetBlocks: number; guardianBlocks: number; guardianHits: number },
  config: AttackConfig,
  lethalPierce: number,
  duelistPierceBonus: number,
  surgeCountBeforeConversion: number,
  originalAttackRollResults: RolledAttackDie[],
  guardianWoundsNoPierce: number,
  guardianDeflectWounds: number,
  dodgeWasSpent: boolean
): AttackResult {
  const { attacker, defender } = config;

  // ════════════════════════════════════════════════════════════════
  // 1. Individual target wounds WITHOUT Pierce
  // ════════════════════════════════════════════════════════════════

  const mainTargetHits = attackResults.hits + attackResults.crits;
  const mainTargetWoundsNoPierce = Math.max(0, mainTargetHits - defenseInfo.mainTargetBlocks);

  // guardianWoundsNoPierce is already computed in Step 6b and passed in.

  // ════════════════════════════════════════════════════════════════
  // 2. Calculate total Pierce from all sources
  // ════════════════════════════════════════════════════════════════

  let totalPierce = attacker.pierceX + lethalPierce + duelistPierceBonus;

  // ════════════════════════════════════════════════════════════════
  // 3. Makashi Mastery (attacker) — Reduce Pierce by 1 in Melee
  // ════════════════════════════════════════════════════════════════
  //
  // Makashi Mastery does two things:
  //   1. Reduce the attacker's total Pierce X by 1 (minimum 0) for Melee attacks.
  //      This is the "cost" of using Makashi — the attacker trades 1 Pierce
  //      for the ability to bypass Immune: Pierce and Impervious.
  //   2. Disable Immune: Pierce and Impervious on the defender for Melee attacks.
  //      This is handled in Steps 4 and 7b (Impervious check) — not here.
  //
  // The Pierce reduction is applied to the collective total from ALL sources
  // (keyword Pierce X + Lethal Pierce + Duelist Pierce), reduced by 1.
  if (
    attacker.makashiMastery &&
    (config.attackType === AttackType.Melee || config.attackType === AttackType.All)
  ) {
    totalPierce = Math.max(0, totalPierce - 1);
  }

  // ════════════════════════════════════════════════════════════════
  // 4. Immune: Pierce / Immune: Melee Pierce (defender)
  // ════════════════════════════════════════════════════════════════
  //
  // Immune: Pierce — ignores ALL Pierce (unless Makashi Mastery overrides in Melee)
  // Immune: Melee Pierce — ignores Pierce from Melee attacks only (unless Makashi)
  //
  // Check logic:
  //   immuneActive = (Immune: Pierce AND NOT (Makashi + Melee))
  //               OR (Immune: Melee Pierce AND Melee AND NOT (Makashi + Melee))
  //
  // Simplification: Makashi overrides BOTH Immune: Pierce and Immune: Melee Pierce
  // for Melee attacks only.

  const isMeleeWithMakashi =
    attacker.makashiMastery &&
    (config.attackType === AttackType.Melee || config.attackType === AttackType.All);

  const immuneToThisPierce =
    (defender.immunePierce && !isMeleeWithMakashi) ||
    (defender.immuneMeleePierce &&
      config.attackType === AttackType.Melee &&
      !isMeleeWithMakashi);

  if (immuneToThisPierce) {
    totalPierce = 0;
  }

  // ════════════════════════════════════════════════════════════════
  // 5. Duelist (defender) — Pierce immunity on Melee + Dodge spent
  // ════════════════════════════════════════════════════════════════
  //
  // Per rulebook: "When this unit defends against a Melee attack, if it
  // spends 1 or more Dodge tokens, its defense dice cannot be canceled
  // by Pierce X."
  //
  // *** MUST be checked BEFORE blocksAfterPierce calculation ***
  // (See BUG FIX section above)

  if (
    defender.duelistDefender &&
    config.attackType === AttackType.Melee &&
    dodgeWasSpent
  ) {
    totalPierce = 0;
  }

  // ════════════════════════════════════════════════════════════════
  // 6. Apply Pierce to combined blocks → total wounds
  // ════════════════════════════════════════════════════════════════

  const combinedBlocks = defenseInfo.mainTargetBlocks + defenseInfo.guardianBlocks;
  const totalHits = mainTargetHits + defenseInfo.guardianHits;

  const blocksAfterPierce = Math.max(0, combinedBlocks - totalPierce);
  const totalWounds = Math.max(0, totalHits - blocksAfterPierce);

  // ════════════════════════════════════════════════════════════════
  // 7. Deflect / Shien Mastery — Reflection wounds to attacker
  // ════════════════════════════════════════════════════════════════
  //
  // Conditions for Deflect activation:
  //   - defender.deflect = true
  //   - Attack is Ranged (or All)
  //   - Attacker does NOT have High Velocity (HV disables all Deflect effects)
  //   - Attacker does NOT have Immune: Deflect
  //   - At least 1 surge result existed BEFORE conversion (surgeCountBeforeConversion > 0)
  //
  // High Velocity completely disables Deflect — both surge conversion (Step 7e)
  // and wound reflection (here in Step 9). HV is effectively a stronger version
  // of Immune: Deflect. If HV is active, skip the Deflect check entirely.
  //
  // Shien Mastery upgrade: instead of 1 wound per attack, deal 1 wound PER surge.

  let deflectWounds = 0;

  if (
    defender.deflect &&
    !attacker.highVelocity &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All) &&
    !attacker.immuneDeflect
  ) {
    if (surgeCountBeforeConversion > 0) {
      if (defender.shienMastery) {
        // Shien Mastery: 1 wound per surge result (before conversion)
        deflectWounds = surgeCountBeforeConversion;
      } else {
        // Standard Deflect: exactly 1 wound if any surges existed
        deflectWounds = 1;
      }
    }
  }

  // Add Guardian Deflect wounds (calculated separately in Step 6b)
  deflectWounds += guardianDeflectWounds;

  // ════════════════════════════════════════════════════════════════
  // 8. Djem So Mastery — Reflection wound to attacker
  // ════════════════════════════════════════════════════════════════
  //
  // Conditions:
  //   - defender.djemSoMastery = true
  //   - Attack is Melee (or All)
  //   - ORIGINAL attack roll (before Marksman conversions) has blank results
  //   - Deals exactly 1 wound (not per-blank)
  //
  // The "original attack roll" is the roll from Step 4b, before any
  // Marksman blank→hit or hit→crit conversions in Step 4d.5.
  //
  // Design note: We pass originalAttackRollResults (from Step 4b) specifically
  // for this check. Do NOT use post-Marksman results.

  let djemSoWounds = 0;

  if (
    defender.djemSoMastery &&
    (config.attackType === AttackType.Melee || config.attackType === AttackType.All)
  ) {
    const attackBlanks = originalAttackRollResults.filter(
      d => d.face === AttackFace.Blank
    ).length;
    if (attackBlanks > 0) {
      djemSoWounds = 1; // Exactly 1, regardless of blank count
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 9. Suppression
  // ════════════════════════════════════════════════════════════════
  //
  // Base: 1 suppression per ranged attack
  // Suppressive keyword: 2 suppression instead of 1
  // Shien Mastery override: 0 suppression if defender took 0 wounds
  //
  // Melee and Overrun attacks do NOT cause suppression.
  //
  // Note: Shien uses totalWounds (the Pierce-adjusted combined value).
  // If totalWounds = 0, no suppression is applied.

  let suppressionApplied: number;

  if (config.attackType === AttackType.Melee || config.attackType === AttackType.Overrun) {
    // Melee and Overrun attacks do not cause suppression
    suppressionApplied = 0;
  } else {
    suppressionApplied = attacker.suppressive ? 2 : 1;
  }

  // Shien Mastery: no suppression if 0 wounds dealt
  if (defender.shienMastery && totalWounds === 0) {
    suppressionApplied = 0;
  }

  // ════════════════════════════════════════════════════════════════
  // Return
  // ════════════════════════════════════════════════════════════════

  return {
    guardianWoundsNoPierce,
    mainTargetWoundsNoPierce,
    totalWounds,
    deflectWounds,
    djemSoWounds,
    suppressionApplied,
  };
}
