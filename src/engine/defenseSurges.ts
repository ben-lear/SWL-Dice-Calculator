import type { AttackConfig, RolledDefenseDie } from './types';
import { DefenseFace, AttackType, DefenseSurgeChart } from './types';

/**
 * Step 7e — Convert Defense Surges
 * Priority order:
 * 1. Surge Chart (ToBlock)
 * 2. Deflect (Ranged only, disabled by High Velocity)
 * 3. Block (requires Dodge spent)
 * 4. Hold the Line (defender)
 * 5. Surge Tokens
 */
export function convertDefenseSurges(
  results: RolledDefenseDie[],
  config: AttackConfig,
  dodgeWasSpent: boolean,
  highVelocity: boolean
): RolledDefenseDie[] {
  const { defender } = config;
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
    !highVelocity &&
    config.attackType === AttackType.Ranged &&
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
