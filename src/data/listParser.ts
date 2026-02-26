/**
 * List Parser — validates imported JSON and resolves units/upgrades
 * through the name matcher, then computes aggregate army stats.
 */

import type {
  ImportedListJson,
  ImportedUnitJson,
  ResolvedList,
  ResolvedListUnit,
} from './listTypes';
import type { ResolvedUpgrade } from './types';
import { resolveFaction } from './factionAliases';
import { matchUnitByName, matchUpgradeByName } from './listMatcher';
import { aggregateArmyStats } from './armyStats';

// ============================================================================
// Parser
// ============================================================================

/**
 * Parse a raw JSON string into a fully resolved army list with stats.
 * Returns either a ResolvedList or an error object.
 */
export function parseListJson(
  raw: string,
): ResolvedList | { error: string } {
  // 1. Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'Invalid JSON — could not parse the input.' };
  }

  // 2. Validate shape
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as ImportedListJson).units)
  ) {
    return { error: 'No units array found in the JSON.' };
  }

  const listJson = parsed as ImportedListJson;

  if (listJson.units.length === 0) {
    return { error: 'The units array is empty.' };
  }

  // 3. Resolve faction
  const faction = resolveFaction(listJson.armyFaction, listJson.battleForce);
  const parseWarnings: string[] = [];

  if (!faction && listJson.armyFaction) {
    parseWarnings.push(
      `Faction "${listJson.armyFaction}" could not be resolved.`,
    );
  }

  // 4. Resolve each unit
  const resolvedUnits: ResolvedListUnit[] = listJson.units.map(
    (unitJson: ImportedUnitJson) => {
      const unitMatch = matchUnitByName(unitJson.name, faction);
      const warnings = [...unitMatch.warnings];

      // Combine upgrades[] and loadout[] into a single list
      const allUpgradeNames = [
        ...(unitJson.upgrades ?? []),
        ...(unitJson.loadout ?? []),
      ];

      const resolvedUpgrades: (ResolvedUpgrade | null)[] = [];
      const slotMapping: number[] = [];
      const consumedSlots = new Set<number>();

      for (const upgradeName of allUpgradeNames) {
        const upgradeMatch = matchUpgradeByName(
          upgradeName,
          unitMatch.match,
          consumedSlots,
        );
        resolvedUpgrades.push(upgradeMatch.match);
        slotMapping.push(upgradeMatch.slotIndex);

        if (upgradeMatch.slotIndex >= 0) {
          consumedSlots.add(upgradeMatch.slotIndex);
        }

        warnings.push(...upgradeMatch.warnings);
      }

      return {
        rawName: unitJson.name,
        rawUpgradeNames: allUpgradeNames,
        resolvedUnit: unitMatch.match,
        resolvedUpgrades,
        slotMapping,
        unitMatchConfidence: unitMatch.confidence,
        warnings,
      };
    },
  );

  // Collect all unit-level warnings into parseWarnings
  for (const unit of resolvedUnits) {
    for (const w of unit.warnings) {
      parseWarnings.push(w);
    }
  }

  // 5. Compute army stats
  const stats = aggregateArmyStats(resolvedUnits, {
    commandCards: listJson.commandCards,
    contingencies: listJson.contingencies,
  });

  // 6. Build meta
  const meta = {
    name: listJson.listname ?? 'Imported List',
    points: listJson.points ?? stats.totalPoints,
    faction,
    battleForce: listJson.battleForce ?? null,
    author: listJson.author ?? null,
    listLink: listJson.listlink ?? null,
  };

  return {
    meta,
    units: resolvedUnits,
    stats,
    parseWarnings,
  };
}
