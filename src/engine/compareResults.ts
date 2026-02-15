import type { AttackConfig, AttackResult, RolledAttackDie, AggregatedWeaponKeywords } from './types';
import { AttackFace, AttackType } from './types';

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
 *   - Ranged: 1 base (2 with Suppressive)
 *   - Melee/Overrun: 0 base (1 with Suppressive)
 *   - 0 if Shien Mastery + 0 wounds
 */
export function compareResults(
  attackResults: { hits: number; crits: number },
  defenseInfo: { mainTargetBlocks: number; guardianBlocks: number; guardianHits: number },
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords,
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

  let totalPierce = poolKeywords.pierceX + lethalPierce + duelistPierceBonus;

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
    config.attackType === AttackType.Melee
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
    config.attackType === AttackType.Melee;

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
    !poolKeywords.highVelocity &&
    config.attackType === AttackType.Ranged &&
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
    config.attackType === AttackType.Melee
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
  // Ranged attacks: 1 suppression (or 2 with Suppressive keyword)
  // Melee and Overrun attacks: 0 suppression by default
  //   BUT: Suppressive weapons still apply 1 suppression in Melee/Overrun
  // Shien Mastery override: 0 suppression if defender took 0 wounds
  //
  // Note: Shien uses totalWounds (the Pierce-adjusted combined value).
  // If totalWounds = 0, no suppression is applied.

  let suppressionApplied: number;

  if (config.attackType === AttackType.Melee || config.attackType === AttackType.Overrun) {
    // Melee and Overrun attacks do not cause suppression by default
    // BUT Suppressive weapons still apply 1 suppression
    suppressionApplied = poolKeywords.suppressive ? 1 : 0;
  } else {
    // Ranged attacks: 1 base, or 2 with Suppressive
    suppressionApplied = poolKeywords.suppressive ? 2 : 1;
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
