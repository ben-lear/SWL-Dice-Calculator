/**
 * Unit resolver - merges processed unit data with enrichment overlays to produce ResolvedUnit objects
 * Phase 5.5C.1: Create unit resolver
 */

import type { ProcessedUnit, ResolvedUnit } from './types';
import type { UnitEnrichment } from './enrichment/types';
import { UNIT_ENRICHMENTS } from './enrichment/units';
import { KEYWORD_MAP, ATTACKER_KEYWORD_FIELD_MAP, DEFENDER_KEYWORD_FIELD_MAP } from './keywordMap';

import processedUnitsJson from './processed/units.json';

// ============================================================================
// Resolve All Units
// ============================================================================

/**
 * Merge processed API data with enrichment overlays.
 * Returns all units as ResolvedUnit[], with isEnriched flag indicating
 * whether manual data is available.
 *
 * Result is lazily computed and cached on first call.
 */
let _cachedUnits: ResolvedUnit[] | null = null;

export function getAllResolvedUnits(): ResolvedUnit[] {
  if (_cachedUnits) return _cachedUnits;

  const processedUnits = processedUnitsJson as ProcessedUnit[];
  _cachedUnits = processedUnits.map((pu) => resolveUnit(pu));
  return _cachedUnits;
}

/**
 * Get a single resolved unit by its processed ID.
 */
export function getResolvedUnitById(
  id: string,
): ResolvedUnit | undefined {
  return getAllResolvedUnits().find((u) => u.id === id);
}

// ============================================================================
// Resolution Logic
// ============================================================================

function resolveUnit(processed: ProcessedUnit): ResolvedUnit {
  const enrichment: UnitEnrichment | undefined =
    UNIT_ENRICHMENTS[processed.id];
  const isEnriched = enrichment !== undefined;

  // Resolve keywords: start with API-detected keywords, converting to field names
  const keywords: Record<string, number | boolean> = {};
  
  for (const kwName of processed.keywordNames) {
    const meta = KEYWORD_MAP.get(kwName);
    if (meta) {
      // Try to map to attacker or defender field name
      const attackerField = ATTACKER_KEYWORD_FIELD_MAP[kwName];
      const defenderField = DEFENDER_KEYWORD_FIELD_MAP[kwName];
      const fieldName = attackerField || defenderField;
      
      if (fieldName) {
        // Store under the field name, not the API keyword name
        // Boolean keywords → true; magnitude keywords → 0 (unknown X value)
        keywords[fieldName] = meta.hasMagnitude ? 0 : true;
      } else {
        // Unmapped API keyword - store as-is for debugging
        keywords[kwName] = meta.hasMagnitude ? 0 : true;
      }
    }
  }

  // Apply enrichment keyword overrides (already using typed field names)
  // These will override any API keywords mapped to the same field name
  if (enrichment?.keywords) {
    for (const [kwName, value] of Object.entries(enrichment.keywords)) {
      keywords[kwName] = value;
    }
  }

  return {
    id: processed.id,
    apiId: processed.apiId,
    name: processed.name,
    faction: processed.faction,
    cost: processed.cost,
    health: processed.health,
    figures: processed.figures,
    defenseDieColor: processed.defenseDieColor,
    rank: processed.rank,
    unitType: processed.unitType,

    defenseSurgeChart:
      enrichment?.defenseSurgeChart ?? null,

    keywords,
    weapons: enrichment?.weapons ?? [],
    upgradeBar: enrichment?.upgradeBarOverride ?? processed.upgradeBar,
    isEnriched,
  };
}