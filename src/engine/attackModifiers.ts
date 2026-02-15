import type { AttackConfig, AggregatedWeaponKeywords } from './types';
import { AttackType } from './types';

/**
 * Step 6 — Modify Attack Dice
 *
 * Applies attacker and defender modification keywords to the attack results.
 * This is the last step before defense dice are rolled.
 *
 * Operation order (CRITICAL):
 * 1. Ram X — Convert ANY results (blanks first, then hits) to crits (Melee/Overrun only)
 * 2. Impact X — Convert hits → crits (to bypass Armor)
 * 3. Armor X — Cancel hits (crits bypass)
 * 4. Shielded X — Cancel crits first, then hits (Ranged only)
 * 5. Backup — Cancel up to 2 hits (Ranged only)
 * 6. Guardian X — Absorb up to X hits (Ranged only, separate defense)
 * 7. Lethal X — Calculate Pierce bonus from remaining aims
 */
export function modifyAttackDice(
  attackResults: { hits: number; crits: number; blanks: number },
  config: AttackConfig,
  aimsSpent: number,
  aimsSavedForMarksman: number,
  poolKeywords: AggregatedWeaponKeywords
): { hits: number; crits: number; lethalPierce: number; guardianHits: number } {
  let { hits, crits, blanks } = attackResults;
  const { attacker, defender } = config;
  let lethalPierce = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Ram X — Convert up to X results (any face) to crits (Melee/Overrun only)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "While this unit is performing a melee or overrun attack, 
  // change X attack die results to crit results."
  // Priority: blanks first (free value), then hits (upgrade)
  // Crits are already crits — skipped.
  const isMeleeOrOverrun = config.attackType === AttackType.Melee || 
                           config.attackType === AttackType.Overrun;
  
  if (poolKeywords.ramX > 0 && isMeleeOrOverrun) {
    let ramRemaining = poolKeywords.ramX;

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
  if (poolKeywords.impactX > 0 && defender.armorX > 0) {
    const impactConversions = Math.min(hits, poolKeywords.impactX);
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
    config.attackType === AttackType.Ranged
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
    config.attackType === AttackType.Ranged
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
    config.attackType === AttackType.Ranged
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
  if (poolKeywords.lethalX > 0 && aimsLeftover > 0) {
    lethalPierce = Math.min(poolKeywords.lethalX, aimsLeftover);
  }

  return { hits, crits, lethalPierce, guardianHits };
}
