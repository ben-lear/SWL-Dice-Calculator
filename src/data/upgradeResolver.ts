/**
 * Upgrade resolver - merges processed upgrade data with enrichment overlays to produce ResolvedUpgrade objects
 * Phase 5.5C.2: Create upgrade resolver
 */

import type { ProcessedUpgrade, ResolvedUpgrade, WeaponProfile } from './types';
import { UpgradeSlot } from './types';
import type { UpgradeEnrichment, EnrichmentWeaponProfile } from './enrichment/types';
import { UPGRADE_ENRICHMENTS } from './enrichment/upgrades';

import processedUpgradesJson from './processed/upgrades.json';

// ============================================================================
// Resolve All Upgrades
// ============================================================================

let _cachedUpgrades: ResolvedUpgrade[] | null = null;

type ProcessedUpgradeJson = Omit<ProcessedUpgrade, 'apiId' | 'restrictedToUnitApiId'> & {
  apiId: number | string;
  restrictedToUnitApiId: number | string | null;
};

function normalizeProcessedUpgrade(
  upgrade: ProcessedUpgradeJson,
): ProcessedUpgrade {
  return {
    ...upgrade,
    apiId: typeof upgrade.apiId === 'string' ? Number(upgrade.apiId) : upgrade.apiId,
    restrictedToUnitApiId:
      typeof upgrade.restrictedToUnitApiId === 'string'
        ? Number(upgrade.restrictedToUnitApiId)
        : upgrade.restrictedToUnitApiId,
  };
}

export function getAllResolvedUpgrades(): ResolvedUpgrade[] {
  if (_cachedUpgrades) return _cachedUpgrades;

  const processedUpgrades = (processedUpgradesJson as ProcessedUpgradeJson[])
    .map(normalizeProcessedUpgrade);
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

/**
 * Normalize enrichment weapon profiles to engine WeaponProfile format.
 */
function normalizeEnrichmentWeapons(
  weapons: EnrichmentWeaponProfile[] | undefined,
): WeaponProfile[] {
  if (!weapons || weapons.length === 0) return [];

  return weapons.map((weapon) => ({
    name: weapon.name,
    weaponType: weapon.weaponType,
    redDice: weapon.redDice ?? 0,
    blackDice: weapon.blackDice ?? 0,
    whiteDice: weapon.whiteDice ?? 0,
    keywords: {
      pierceX: 0,
      impactX: 0,
      criticalX: 0,
      lethalX: 0,
      ramX: 0,
      blast: false,
      suppressive: false,
      highVelocity: false,
      spray: false,
      antiMaterielX: 0,
      antiPersonnelX: 0,
      cumbersome: false,
      sidearmMelee: false,
      sidearmRanged: false,
      immuneDeflect: false,
      primitive: false,
      ionX: 0,
      ...weapon.keywords,
    },
    minRange: weapon.minRange,
    maxRange: weapon.maxRange,
  }));
}

/**
 * Resolve the addsMiniature value with slot-based defaults.
 * Heavy Weapon, Personnel, and Squad Leader slots default to 1.
 * All other slots default to 0.
 * Enrichment overrides take precedence when specified.
 */
function resolveAddsMiniature(
  enrichment: UpgradeEnrichment | undefined,
  slot: UpgradeSlot,
): number {
  // Explicit enrichment override always wins
  if (enrichment?.addsMiniature !== undefined) {
    return enrichment.addsMiniature;
  }
  // Slot-based implicit defaults
  const ADDS_MINI_SLOTS = new Set([
    UpgradeSlot.HeavyWeapon,
    UpgradeSlot.Personnel,
    UpgradeSlot.SquadLeader,
  ]);
  return ADDS_MINI_SLOTS.has(slot) ? 1 : 0;
}

function resolveUpgrade(processed: ProcessedUpgrade): ResolvedUpgrade {
  const enrichment: UpgradeEnrichment | undefined =
    UPGRADE_ENRICHMENTS[processed.id];
  const isEnriched = enrichment !== undefined;

  const normalizedKeywords: Record<string, number | boolean> = {};
  if (enrichment?.keywords) {
    for (const [key, value] of Object.entries(enrichment.keywords)) {
      if (typeof value === 'number' || typeof value === 'boolean') {
        normalizedKeywords[key] = value;
      }
    }
  }

  return {
    id: processed.id,
    apiId: processed.apiId,
    name: processed.name,
    cost: processed.cost,
    upgradeSlot: processed.upgradeSlot as UpgradeSlot,
    restrictedToUnitApiId: processed.restrictedToUnitApiId,
    keywords: normalizedKeywords,
    weapons: normalizeEnrichmentWeapons(enrichment?.weapons),
    addsMiniature: resolveAddsMiniature(enrichment, processed.upgradeSlot as UpgradeSlot),
    noncombatant: enrichment?.noncombatant ?? false,
    isGrenade: enrichment?.isGrenade ?? false,
    addsUpgradeSlot: enrichment?.addsUpgradeSlot ?? [],
    isEnriched,
  };
}