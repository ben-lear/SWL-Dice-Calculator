import type { AttackConfig, RolledAttackDie, AggregatedWeaponKeywords } from './types';
import { AttackFace } from './types';
import { determineCoverValue, rollCoverPool } from './cover';

/**
 * Step 5 — Apply Dodge and Cover
 * Full implementation with cover pool rolling and proper dodge logic.
 */
export function applyDodgeAndCover(
  results: RolledAttackDie[],
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords
): { hits: number; crits: number; blanks: number; dodgeWasSpent: boolean } {
  const { defender } = config;

  // ── Count results ──
  let hits = results.filter(r => r.face === AttackFace.Hit).length;
  let crits = results.filter(r => r.face === AttackFace.Critical).length;
  const blanks = results.filter(r => r.face === AttackFace.Blank).length;

  // ── Step 5a-d: Cover ──
  const coverValue = determineCoverValue(config, poolKeywords.blast);

  if (coverValue > 0 && hits > 0) {
    const coverBlocks = rollCoverPool(hits, coverValue, defender.lowProfile, defender.dugIn);
    hits = Math.max(0, hits - coverBlocks);
  }

  // ── Step 5e: Dodge ──
  let dodgeWasSpent = false;

  // High Velocity prevents Dodge spending entirely
  if (poolKeywords.highVelocity) {
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
