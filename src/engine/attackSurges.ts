import type { AttackConfig, RolledAttackDie, AggregatedWeaponKeywords } from './types';
import { AttackFace, AttackSurgeChart, AttackType } from './types';

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
export function convertAttackSurges(
  results: RolledAttackDie[],
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords
): RolledAttackDie[] {
  const { attacker } = config;
  let workingResults = results.map(d => ({ ...d })); // Clone

  // Track remaining surge count
  let surgeCount = workingResults.filter(d => d.face === AttackFace.Surge).length;
  if (surgeCount === 0) return workingResults;

  // ── Priority 1: Critical X (surge → crit) ──
  // Crits bypass Armor, Dodge (without Outmaneuver), and Cover.
  // Applied first to maximize crit conversions before other sources convert to hits.
  if (poolKeywords.criticalX > 0 && surgeCount > 0) {
    let converted = 0;
    workingResults = workingResults.map(d => {
      if (d.face === AttackFace.Surge && converted < poolKeywords.criticalX) {
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
    config.attackType === AttackType.Melee
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
export function applyMarksman(
  results: RolledAttackDie[],
  config: AttackConfig,
  aimsSavedForMarksman: number
): RolledAttackDie[] {
  // Guard: no saved aims or no Marksman keyword
  if (aimsSavedForMarksman <= 0 || !config.attacker.marksman) {
    return results;
  }

  const workingResults = results.map(d => ({ ...d })); // Clone
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
export function applyJarKai(
  results: RolledAttackDie[],
  config: AttackConfig
): RolledAttackDie[] {
  const { attacker } = config;

  // Guard conditions
  if (!attacker.jarKaiMastery) return results;
  if (config.attackType !== AttackType.Melee) return results;
  if (attacker.dodgeTokensAttacker <= 0) return results;

  const workingResults = results.map(d => ({ ...d })); // Clone
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
