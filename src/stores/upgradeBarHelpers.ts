/**
 * Pure helper for computing the effective upgrade bar.
 *
 * The effective upgrade bar = base bar + any dynamic slots added by equipped upgrades
 * that have `addsUpgradeSlot` populated. When an upgrade is removed, any dynamic
 * slots it introduced (and their contents) are cascading-removed.
 *
 * Phase 12: Dynamic Upgrade Slots
 */

import type { UpgradeSlot } from '../data/types';
import { getResolvedUpgradeById } from '../data/upgradeResolver';

export interface EffectiveUpgradeBarResult {
  /** The computed effective upgrade bar: base slots + any dynamically added slots */
  effectiveUpgradeBar: UpgradeSlot[];
  /** Trimmed/extended equipped IDs parallel to effectiveUpgradeBar */
  equippedUpgradeIds: (string | null)[];
  /** IDs that were cascading-unequipped (e.g. upgrade in a removed dynamic slot) */
  removedUpgradeIds: string[];
  /**
   * Parallel to effectiveUpgradeBar.
   * `null` for base (static) slots; for dynamic slots, the index of the
   * granting upgrade slot in `effectiveUpgradeBar`.
   */
  grantedByIndex: (number | null)[];
}

/**
 * Recompute the effective upgrade bar from the base bar and current equipped upgrade IDs.
 *
 * Algorithm:
 * 1. Start with effectiveBar = baseBar, effectiveIds = equippedIds sliced to baseBar length.
 * 2. Walk through effectiveBar; for each equipped upgrade with addsUpgradeSlot, append
 *    those slot types to effectiveBar and carry over any corresponding equipped IDs.
 * 3. Any IDs from the old equippedIds that fall beyond the new effectiveBar are orphaned
 *    (cascading-removed) and collected in removedUpgradeIds.
 *
 * @param baseBar     The unit's static upgrade bar from the preset.
 * @param equippedIds Current equipped upgrade IDs (may be longer than baseBar due to
 *                    previously dynamically added slots).
 */
export function recomputeEffectiveUpgradeBar(
  baseBar: UpgradeSlot[],
  equippedIds: (string | null)[],
): EffectiveUpgradeBarResult {
  const effectiveBar: UpgradeSlot[] = [...baseBar];
  const effectiveIds: (string | null)[] = equippedIds.slice(0, baseBar.length);
  const grantedByIndex: (number | null)[] = new Array(baseBar.length).fill(null);
  // Pad with nulls if equippedIds is shorter than baseBar
  while (effectiveIds.length < baseBar.length) effectiveIds.push(null);

  // Walk forward through effectiveBar (which may grow as we process).
  // At each index, if the equipped upgrade adds slots, append them.
  let i = 0;
  while (i < effectiveBar.length) {
    const upgradeId = effectiveIds[i] ?? null;
    if (upgradeId !== null) {
      const upgrade = getResolvedUpgradeById(upgradeId);
      if (upgrade && upgrade.addsUpgradeSlot.length > 0) {
        for (const addedSlot of upgrade.addsUpgradeSlot) {
          const dynamicIndex = effectiveBar.length;
          effectiveBar.push(addedSlot);
          grantedByIndex.push(i);
          // Carry over the previously-equipped ID at this position if it exists
          const carried = equippedIds[dynamicIndex] ?? null;
          effectiveIds.push(carried);
        }
      }
    }
    i++;
  }

  // Any IDs from the original equippedIds that are now beyond effectiveBar.length
  // have been orphaned by cascading removal.
  const removedUpgradeIds: string[] = [];
  for (let j = effectiveBar.length; j < equippedIds.length; j++) {
    const orphan = equippedIds[j];
    if (orphan !== null) removedUpgradeIds.push(orphan);
  }

  return {
    effectiveUpgradeBar: effectiveBar,
    equippedUpgradeIds: effectiveIds,
    removedUpgradeIds,
    grantedByIndex,
  };
}
