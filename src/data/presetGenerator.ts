/**
 * Preset generator - generates AttackerPreset[] and DefenderPreset[] from resolved units
 * Phase 5.5C.3: Create preset generator (Replaces Phase 5B)
 */

import type { AttackerPreset, DefenderPreset } from './presets';
import type { ResolvedUnit } from './types';
import { Faction } from './presets';
import { getAllResolvedUnits } from './unitResolver';
import { AttackSurgeChart } from '../engine/types';

// ============================================================================
// Generator
// ============================================================================

interface GeneratedPresets {
  attackerPresets: AttackerPreset[];
  defenderPresets: DefenderPreset[];
}

let _cached: GeneratedPresets | null = null;

/**
 * Generate all presets from resolved unit data.
 * Results are cached — subsequent calls return the same arrays.
 */
export function generateAllPresets(): GeneratedPresets {
  if (_cached) return _cached;

  const units = getAllResolvedUnits();
  const attackerPresets: AttackerPreset[] = [];
  const defenderPresets: DefenderPreset[] = [];

  for (const unit of units) {
    // Every unit produces a defender preset
    defenderPresets.push(generateDefenderPreset(unit));

    if (unit.weapons.length > 0) {
      // Enriched units: one attacker preset per weapon
      for (let i = 0; i < unit.weapons.length; i++) {
        attackerPresets.push(generateAttackerPreset(unit, i));
      }
    } else {
      // Un-enriched units: skeleton attacker preset with 0 dice
      attackerPresets.push(generateSkeletonAttackerPreset(unit));
    }
  }

  // Sort by faction, then by name for consistent dropdown order
  const sortFn = (a: { faction: Faction; name: string }, b: { faction: Faction; name: string }) => {
    if (a.faction !== b.faction) return a.faction.localeCompare(b.faction);
    return a.name.localeCompare(b.name);
  };
  attackerPresets.sort(sortFn);
  defenderPresets.sort(sortFn);

  _cached = { attackerPresets, defenderPresets };
  return _cached;
}

// ============================================================================
// Attacker Preset Generation
// ============================================================================

function generateAttackerPreset(
  unit: ResolvedUnit,
  weaponIndex: number,
): AttackerPreset {
  const weapon = unit.weapons[weaponIndex];

  // Build profile — weapons[] replaces flat dice fields (Phase 2.5)
  // Data-layer WeaponProfile now uses typed Partial<WeaponKeywords>, so we can
  // directly use the keywords (fill in defaults for missing fields)
  const engineWeapon: import('../engine/types').WeaponProfile = {
    name: weapon.name,
    redDice: weapon.redDice,
    blackDice: weapon.blackDice,
    whiteDice: weapon.whiteDice,
    keywords: {
      // Fill in defaults for all WeaponKeywords fields
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
      // Override with enrichment values
      ...weapon.keywords,
    },
  };

  const profile: Record<string, any> = {
    weapons: [engineWeapon],
    surgeChart: weapon.surgeChart,
    unitCost: unit.cost,
  };

  // Copy unit-level keywords to profile (keywords are already field names)
  copyKeywordsToProfile(unit.keywords, profile);

  // Copy weapon-level keywords to profile (weapon overrides unit)
  copyKeywordsToProfile(weapon.keywords, profile);

  // Handle Duelist special case (field name is duelistAttacker on attacker side,
  // but enrichment might use either duelistAttacker or duelistDefender as this is
  // a dual-role keyword)
  if (unit.keywords['duelistAttacker'] || unit.keywords['duelistDefender']) {
    profile['duelistAttacker'] = true;
  }

  return {
    id: `${unit.id}-${slugifyWeapon(weapon.name)}`,
    faction: unit.faction as Faction,
    name: `${unit.name} (${weapon.name})`,
    profile,
    upgradeBar: unit.upgradeBar,
  };
}

function generateSkeletonAttackerPreset(
  unit: ResolvedUnit,
): AttackerPreset {
  // Create empty weapon profile for un-enriched units
  const emptyWeapon: import('../engine/types').WeaponProfile = {
    name: 'Unknown',
    redDice: 0,
    blackDice: 0,
    whiteDice: 0,
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
    },
  };

  const profile: Record<string, any> = {
    weapons: [emptyWeapon],
    surgeChart: unit.attackSurgeChart ?? AttackSurgeChart.None,
    unitCost: unit.cost,
  };

  // Copy unit-level attacker keywords (keywords are already field names)
  copyKeywordsToProfile(unit.keywords, profile);

  return {
    id: `${unit.id}-base`,
    faction: unit.faction as Faction,
    name: `${unit.name} (no weapon data)`,
    profile,
    upgradeBar: unit.upgradeBar,
  };
}

// ============================================================================
// Defender Preset Generation
// ============================================================================

function generateDefenderPreset(unit: ResolvedUnit): DefenderPreset {
  const profile: Record<string, any> = {
    dieColor: unit.defenseDieColor,
    unitCost: unit.cost,
    minisInLOS: unit.figures,
  };

  // Set surge chart if enriched
  if (unit.defenseSurgeChart !== null) {
    profile['surgeChart'] = unit.defenseSurgeChart;
  }

  // Copy unit-level keywords to profile (keywords are already field names)
  copyKeywordsToProfile(unit.keywords, profile);

  // Handle Duelist special case (field name is duelistDefender on defender side)
  if (unit.keywords['duelistDefender'] || unit.keywords['duelistAttacker']) {
    profile['duelistDefender'] = true;
  }

  return {
    id: unit.id,
    faction: unit.faction as Faction,
    name: unit.name,
    profile,
    upgradeBar: unit.upgradeBar,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Copy keyword key-value pairs directly to the profile.
 * Since keywords are now stored using typed field names (matching config field names),
 * we can copy them directly without mapping.
 */
function copyKeywordsToProfile(
  keywords: Record<string, number | boolean>,
  profile: Record<string, any>,
): void {
  for (const [fieldName, value] of Object.entries(keywords)) {
    profile[fieldName] = value;
  }
}

function slugifyWeapon(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}