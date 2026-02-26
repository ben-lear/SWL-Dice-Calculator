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
// Internal Types
// ============================================================================

interface UnitContext {
  unitApiId?: number;
  faction?: string | null;
  rank?: string | null;
  unitType?: string | null;
  affiliation?: string | null;
  /** Effective upgrade bar (base + dynamic slots) used for requiredUpgradeSlot checks */
  effectiveUpgradeBar?: UpgradeSlot[];
}

const FACTION_ALIGNMENT: Record<string, 'Light' | 'Dark'> = {
  'rebel-alliance': 'Light',
  'republic': 'Light',
  'galactic-empire': 'Dark',
  'separatist-alliance': 'Dark',
  // Mercenaries: no entry → blocked by any alignment restriction
};

// ============================================================================
// Resolve All Upgrades
// ============================================================================

let _cachedUpgrades: ResolvedUpgrade[] | null = null;

type ProcessedUpgradeJson = Omit<ProcessedUpgrade, 'apiId'> & {
  apiId: number | string;
  addsUpgradeSlot?: string[];
  requiredUpgradeSlot?: string | null;
};

function normalizeProcessedUpgrade(
  upgrade: ProcessedUpgradeJson,
): ProcessedUpgrade {
  return {
    ...upgrade,
    apiId: typeof upgrade.apiId === 'string' ? Number(upgrade.apiId) : upgrade.apiId,
    addsUpgradeSlot: (upgrade.addsUpgradeSlot ?? []) as UpgradeSlot[],
    requiredUpgradeSlot: (upgrade.requiredUpgradeSlot ?? null) as UpgradeSlot | null,
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
 * Some unit slots accept upgrade cards categorised under a different slot type.
 * Key = slot on the unit card, Value = upgrade card slot type to also search.
 * Name-based filtering ensures exclusive slots only get the right card.
 */
const SLOT_ALIASES: Partial<Record<UpgradeSlot, UpgradeSlot>> = {
  [UpgradeSlot.ImperialMarch]: UpgradeSlot.Training,
  [UpgradeSlot.Electrobinoculars]: UpgradeSlot.Gear,
  [UpgradeSlot.PortableScanner]: UpgradeSlot.Gear,
};

/**
 * For aliased slots, the upgrade name must match the slot name (title-cased).
 * Used to prevent all Training upgrades from appearing in the Imperial March slot.
 */
const SLOT_ALIAS_NAME_FILTER: Partial<Record<UpgradeSlot, string>> = {
  [UpgradeSlot.ImperialMarch]: 'Imperial March',
  [UpgradeSlot.Electrobinoculars]: 'Electrobinoculars',
  [UpgradeSlot.PortableScanner]: 'Portable Scanner',
};

/**
 * Get all upgrades available for a specific slot type.
 * Optionally filtered by unit context (faction, rank, unit type, unit ID, affiliation).
 *
 * @param slot - The upgrade slot to filter by
 * @param context - If provided, restricts results to upgrades eligible for this unit context.
 *                  When context is absent (no unit selected), inclusion restrictions are
 *                  silently skipped so the full list appears.
 */
export function getUpgradesForSlot(
  slot: UpgradeSlot,
  context?: UnitContext,
): ResolvedUpgrade[] {
  const aliasSlot = SLOT_ALIASES[slot];
  const aliasNameFilter = SLOT_ALIAS_NAME_FILTER[slot];

  return getAllResolvedUpgrades().filter((u) => {
    const matchesDirectSlot = u.upgradeSlot === slot;
    const matchesAliasSlot =
      aliasSlot !== undefined &&
      u.upgradeSlot === aliasSlot &&
      (aliasNameFilter === undefined || u.name === aliasNameFilter);

    if (!matchesDirectSlot && !matchesAliasSlot) return false;

    // Without a context, inclusion restrictions pass silently
    if (!context) return true;

    const { unitApiId, faction, rank, unitType, affiliation } = context;

    // 1. Exclusion: unit must not be on the disallowed list (only when unitApiId known)
    if (unitApiId !== undefined && u.unitsDisallowedOn.length > 0) {
      if (u.unitsDisallowedOn.includes(unitApiId)) return false;
    }

    // 2. Faction restriction
    if (faction && u.factionRestrictions.length > 0) {
      if (!u.factionRestrictions.includes(faction)) return false;
    }

    // 3. Rank restriction
    if (rank && u.rankRestrictions.length > 0) {
      if (!u.rankRestrictions.includes(rank)) return false;
    }

    // 4. Unit type restriction
    if (unitType && u.unitTypeRestrictions.length > 0) {
      if (!u.unitTypeRestrictions.includes(unitType)) return false;
    }

    // 5. Specific unit restriction
    if (unitApiId !== undefined && u.unitRestrictions.length > 0) {
      if (!u.unitRestrictions.includes(unitApiId)) return false;
    }

    // 6. Affiliation restriction
    if (u.affiliationRestrictions.length > 0) {
      if (!affiliation || !u.affiliationRestrictions.includes(affiliation)) return false;
    }

    // 7. Alignment restriction
    if (u.alignmentRestriction !== null && faction) {
      const unitAlignment = FACTION_ALIGNMENT[faction] ?? null;
      if (unitAlignment !== u.alignmentRestriction) return false;
    }

    // 8. Required upgrade slot — unit must have the required slot in its effective upgrade bar
    if (u.requiredUpgradeSlot !== null) {
      const availableSlots = context.effectiveUpgradeBar;
      if (availableSlots && !availableSlots.includes(u.requiredUpgradeSlot)) {
        return false;
      }
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
      blackOps: false,
      krakenBlaster: false,
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

/**
 * Resolve the courageModifier value from enrichment.
 * '<need human>' sentinel and undefined → 0 (no modification).
 * Finite number or Infinity → pass through.
 */
function resolveCourageModifier(value: number | string | undefined): number {
  if (typeof value === 'number') return value;
  return 0;
}

function resolveUpgrade(processed: ProcessedUpgrade): ResolvedUpgrade {
  const enrichment: UpgradeEnrichment | undefined =
    UPGRADE_ENRICHMENTS[processed.id];
  const isEnriched = enrichment !== undefined;

  const normalizedKeywords: Record<string, number | boolean | string> = {};
  if (enrichment?.keywords) {
    for (const [key, value] of Object.entries(enrichment.keywords)) {
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
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
    factionRestrictions: processed.factionRestrictions,
    rankRestrictions: processed.rankRestrictions,
    unitTypeRestrictions: processed.unitTypeRestrictions,
    unitRestrictions: processed.unitRestrictions,
    affiliationRestrictions: processed.affiliationRestrictions,
    alignmentRestriction: processed.alignmentRestriction,
    unitsDisallowedOn: processed.unitsDisallowedOn,
    keywords: normalizedKeywords,
    weapons: normalizeEnrichmentWeapons(enrichment?.weapons),
    addsMiniature: resolveAddsMiniature(enrichment, processed.upgradeSlot as UpgradeSlot),
    noncombatant: enrichment?.noncombatant ?? false,
    isGrenade: enrichment?.isGrenade ?? false,
    addsUpgradeSlot: [
      ...new Set([
        ...(processed.addsUpgradeSlot ?? []),
        ...(enrichment?.addsUpgradeSlot ?? []),
      ]),
    ] as UpgradeSlot[],
    surgeOverrides: enrichment?.surgeOverrides ?? null,
    defenseOverrides: enrichment?.defenseOverrides ?? null,
    courageModifier: resolveCourageModifier(enrichment?.courageModifier),
    isEnriched,
    requiredUpgradeSlot: processed.requiredUpgradeSlot ?? null,
  };
}