import type { AttackConfig } from './types';
import { rollDefenseDie } from './dice';
import { CoverType, DefenseDieColor, DefenseFace, AttackType } from './types';

/**
 * Determine the effective cover value (0-2) after all modifiers.
 */
export function determineCoverValue(
  config: AttackConfig,
  poolBlast: boolean
): number {
  const { attacker, defender } = config;

  // Cover only applies to Ranged attacks (per rulebook §03)
  if (config.attackType !== AttackType.Ranged) {
    return 0;
  }

  // ── Override checks ──
  // Blast sets cover to 0 (unless defender has Immune: Blast)
  if (poolBlast && !defender.immuneBlast) {
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
  if (config.attackType === AttackType.Ranged) {
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
export function rollCoverPool(
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
