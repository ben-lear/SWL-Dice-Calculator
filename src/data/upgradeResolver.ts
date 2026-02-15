/**
 * Upgrade resolver - merges processed upgrade data with enrichment overlays to produce ResolvedUpgrade objects
 * Phase 5.5C.2: Create upgrade resolver
 */

import type { ProcessedUpgrade, ResolvedUpgrade, UpgradeSlot } from './types';
import type { UpgradeEnrichment } from './enrichment/types';
import { UPGRADE_ENRICHMENTS } from './enrichment/upgrades';

import processedUpgradesJson from './processed/upgrades.json';

// ============================================================================
// Resolve All Upgrades
// ============================================================================

let _cachedUpgrades: ResolvedUpgrade[] | null = null;

export function getAllResolvedUpgrades(): ResolvedUpgrade[] {
  if (_cachedUpgrades) return _cachedUpgrades;

  const processedUpgrades = processedUpgradesJson as ProcessedUpgrade[];
  _cachedUpgrades = processedUpgrades.map((pu) => resolveUpgrade(pu));
  return _cachedUpgrades;
}

/**
 * Get a single resolved upgrade by its processed ID.
 */
export function getResolvedUpgradeById(
  id: string,
): ResolvedUpgrade | undefined {
  return getAllResolvedUpgrades().find((u) => u.id === id);
}

/**
 * Get all upgrades available for a specific slot type.
 * Optionally filtered by unit restriction.
 *
 * @param slot - The upgrade slot to filter by
 * @param unitApiId - If provided, returns only generic upgrades + upgrades
 *                    restricted to this specific unit. If omitted, returns
 *                    all upgrades for the slot (including restricted ones).
 */
export function getUpgradesForSlot(
  slot: UpgradeSlot,
  unitApiId?: number,
): ResolvedUpgrade[] {
  return getAllResolvedUpgrades().filter((u) => {
    if (u.upgradeSlot !== slot) return false;
    if (unitApiId !== undefined && u.restrictedToUnitApiId !== null) {
      // Restricted upgrade: only include if it matches this unit
      return u.restrictedToUnitApiId === unitApiId;
    }
    return true;
  });
}

// ============================================================================
// Resolution Logic
// ============================================================================

function resolveUpgrade(processed: ProcessedUpgrade): ResolvedUpgrade {
  const enrichment: UpgradeEnrichment | undefined =
    UPGRADE_ENRICHMENTS[processed.id];
  const isEnriched = enrichment !== undefined;

  return {
    id: processed.id,
    apiId: processed.apiId,
    name: processed.name,
    cost: processed.cost,
    upgradeSlot: processed.upgradeSlot as UpgradeSlot,
    restrictedToUnitApiId: processed.restrictedToUnitApiId,
    keywords: enrichment?.keywords ?? {},
    isEnriched,
  };
}