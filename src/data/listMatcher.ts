/**
 * List matcher — fuzzy name matching for imported army list units and upgrades
 * against the app's resolved data.
 */

import type { ResolvedUnit, ResolvedUpgrade } from './types';
import type { Faction } from './presets';
import { getAllResolvedUnits } from './unitResolver';
import { getAllResolvedUpgrades } from './upgradeResolver';
import { slugify } from '../utils/slugify';

// ============================================================================
// Normalization Helpers
// ============================================================================

/** Normalize a string for comparison: lowercase, strip non-alphanumeric, collapse spaces */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build the display name for a unit: "Name Title" or just "Name" */
function unitDisplayName(unit: ResolvedUnit): string {
  return unit.title ? `${unit.name} ${unit.title}` : unit.name;
}

// ============================================================================
// Unit Matching
// ============================================================================

export interface UnitMatchResult {
  match: ResolvedUnit | null;
  confidence: 'exact' | 'fuzzy' | 'none';
  warnings: string[];
}

/**
 * Match a display name from a list builder to a ResolvedUnit.
 *
 * Strategy:
 * 1. Try exact normalized match on displayName
 * 2. Try slug match: slugify(input) === unit.id
 * 3. Try substring containment
 * 4. If faction provided, filter to faction + mercenaries first, then fallback
 */
export function matchUnitByName(
  displayName: string,
  faction?: Faction | null,
): UnitMatchResult {
  const allUnits = getAllResolvedUnits();
  const normalizedInput = normalize(displayName);
  const slugInput = slugify(displayName);

  // Build faction-scoped and full candidate lists
  const factionScoped = faction
    ? allUnits.filter(
        (u) => u.faction === faction || u.faction === 'mercenaries',
      )
    : allUnits;

  // Try faction-scoped first, then all
  const candidateSets = faction ? [factionScoped, allUnits] : [allUnits];

  for (const candidates of candidateSets) {
    // 1. Exact normalized display name match
    const exactMatch = candidates.find(
      (u) => normalize(unitDisplayName(u)) === normalizedInput,
    );
    if (exactMatch) {
      return { match: exactMatch, confidence: 'exact', warnings: [] };
    }

    // 2. Slug match: slugify(input) === unit.id
    const slugMatch = candidates.find((u) => u.id === slugInput);
    if (slugMatch) {
      return { match: slugMatch, confidence: 'exact', warnings: [] };
    }

    // 3. Exact name-only match (no title)
    const nameOnlyMatch = candidates.find(
      (u) => normalize(u.name) === normalizedInput,
    );
    if (nameOnlyMatch) {
      return { match: nameOnlyMatch, confidence: 'exact', warnings: [] };
    }

    // 4. Token containment — all tokens of one name appear in the other
    //    (handles cases like "Clone Commandos Delta Squad" matching
    //     "Clone Commandos (DS) Delta Squad" where substring fails due to "(DS)")
    const inputTokens = normalizedInput.split(' ');
    const tokenMatches = candidates
      .map((u) => {
        const unitNorm = normalize(unitDisplayName(u));
        const unitTokens = unitNorm.split(' ');
        const inputInUnit = inputTokens.every((t) => unitTokens.includes(t));
        const unitInInput = unitTokens.every((t) => inputTokens.includes(t));
        if (!inputInUnit && !unitInInput) return null;
        // Score: count of shared tokens (higher = more specific match)
        const shared = inputTokens.filter((t) => unitTokens.includes(t)).length;
        return { unit: u, shared };
      })
      .filter(Boolean) as { unit: ResolvedUnit; shared: number }[];

    if (tokenMatches.length > 0) {
      // Pick the candidate with the most shared tokens
      tokenMatches.sort((a, b) => b.shared - a.shared);
      return {
        match: tokenMatches[0].unit,
        confidence: 'fuzzy',
        warnings: [],
      };
    }

    // 5. Substring containment — prefer the longest (most specific) match
    const substringMatches = candidates
      .map((u) => {
        const unitNorm = normalize(unitDisplayName(u));
        const matches =
          unitNorm.includes(normalizedInput) ||
          normalizedInput.includes(unitNorm);
        return matches ? { unit: u, len: unitNorm.length } : null;
      })
      .filter(Boolean) as { unit: ResolvedUnit; len: number }[];

    if (substringMatches.length > 0) {
      // Prefer longest normalized name (most specific unit)
      substringMatches.sort((a, b) => b.len - a.len);
      return {
        match: substringMatches[0].unit,
        confidence: 'fuzzy',
        warnings: [],
      };
    }
  }

  return {
    match: null,
    confidence: 'none',
    warnings: [`Unit "${displayName}" could not be matched`],
  };
}

// ============================================================================
// Upgrade Matching
// ============================================================================

export interface UpgradeMatchResult {
  match: ResolvedUpgrade | null;
  slotIndex: number;
  confidence: 'exact' | 'fuzzy' | 'none';
  warnings: string[];
}

/**
 * When multiple upgrade candidates match, prefer the one restricted to the
 * current unit (via unitRestrictions) to disambiguate variants like
 * "The Darksaber" for Sabine vs Moff Gideon.
 */
function preferUnitRestricted(
  candidates: ResolvedUpgrade[],
  resolvedUnit: ResolvedUnit | null,
): ResolvedUpgrade {
  if (resolvedUnit && candidates.length > 1) {
    const unitScoped = candidates.find(
      (u) =>
        u.unitRestrictions.length > 0 &&
        u.unitRestrictions.includes(resolvedUnit.apiId),
    );
    if (unitScoped) return unitScoped;
  }
  return candidates[0];
}

/**
 * Match an upgrade name from a list builder to a ResolvedUpgrade.
 *
 * Strategy:
 * 1. Exact normalized name match (prefer unit-restricted if ambiguous)
 * 2. Slug match: slugify(input) contained in upgrade.id
 * 3. Substring/fuzzy (prefer unit-restricted, then longest match)
 *
 * @param upgradeName - The raw upgrade name from the imported JSON
 * @param resolvedUnit - The matched unit this upgrade belongs to (for context filtering)
 * @param consumedSlots - Set of slot indices already assigned (for sequential assignment)
 */
export function matchUpgradeByName(
  upgradeName: string,
  resolvedUnit: ResolvedUnit | null,
  consumedSlots: Set<number>,
): UpgradeMatchResult {
  if (!upgradeName.trim()) {
    return { match: null, slotIndex: -1, confidence: 'none', warnings: [] };
  }

  const normalizedInput = normalize(upgradeName);
  const slugInput = slugify(upgradeName);
  const allUpgrades = getAllResolvedUpgrades();

  // 1. Exact normalized name match — collect all candidates and disambiguate
  const exactNameMatches = allUpgrades.filter(
    (u) => normalize(u.name) === normalizedInput,
  );

  if (exactNameMatches.length > 0) {
    const best = preferUnitRestricted(exactNameMatches, resolvedUnit);
    const slotIndex = findAvailableSlot(best, resolvedUnit, consumedSlots);
    return {
      match: best,
      slotIndex,
      confidence: 'exact',
      warnings: [],
    };
  }

  // 2. Slug match: slugify(input) matches or is contained in upgrade.id
  const slugMatch = allUpgrades.find((u) => u.id === slugInput);
  if (slugMatch) {
    const slotIndex = findAvailableSlot(slugMatch, resolvedUnit, consumedSlots);
    return {
      match: slugMatch,
      slotIndex,
      confidence: 'exact',
      warnings: [],
    };
  }

  // 3. Substring/fuzzy — collect all candidates, prefer unit-restricted, then longest
  const fuzzyMatches = allUpgrades
    .map((u) => {
      const upgNorm = normalize(u.name);
      const matches =
        upgNorm.includes(normalizedInput) ||
        normalizedInput.includes(upgNorm);
      return matches ? { upgrade: u, len: upgNorm.length } : null;
    })
    .filter(Boolean) as { upgrade: ResolvedUpgrade; len: number }[];

  if (fuzzyMatches.length > 0) {
    // First try unit-restricted disambiguation
    if (resolvedUnit && fuzzyMatches.length > 1) {
      const unitScoped = fuzzyMatches.find(
        (m) =>
          m.upgrade.unitRestrictions.length > 0 &&
          m.upgrade.unitRestrictions.includes(resolvedUnit.apiId),
      );
      if (unitScoped) {
        const slotIndex = findAvailableSlot(
          unitScoped.upgrade,
          resolvedUnit,
          consumedSlots,
        );
        return {
          match: unitScoped.upgrade,
          slotIndex,
          confidence: 'fuzzy',
          warnings: [],
        };
      }
    }

    // Fall back to longest (most specific) match
    fuzzyMatches.sort((a, b) => b.len - a.len);
    const best = fuzzyMatches[0].upgrade;
    const slotIndex = findAvailableSlot(best, resolvedUnit, consumedSlots);
    return {
      match: best,
      slotIndex,
      confidence: 'fuzzy',
      warnings: [],
    };
  }

  return {
    match: null,
    slotIndex: -1,
    confidence: 'none',
    warnings: [`Upgrade "${upgradeName}" could not be matched`],
  };
}

/**
 * Find the first available slot index on the unit's upgrade bar that matches
 * the upgrade's slot type and hasn't been consumed yet.
 */
function findAvailableSlot(
  upgrade: ResolvedUpgrade,
  resolvedUnit: ResolvedUnit | null,
  consumedSlots: Set<number>,
): number {
  if (!resolvedUnit) return -1;

  const upgradeBar = resolvedUnit.upgradeBar;
  for (let i = 0; i < upgradeBar.length; i++) {
    if (consumedSlots.has(i)) continue;
    if (upgradeBar[i] === upgrade.upgradeSlot) {
      return i;
    }
  }

  // No matching slot found — still return -1 but the upgrade was matched
  return -1;
}
