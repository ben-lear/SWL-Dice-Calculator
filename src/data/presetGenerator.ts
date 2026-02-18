/**
 * Preset generator - generates AttackerPreset[] and DefenderPreset[] from resolved units
 * Phase 5.5C.3: Create preset generator (Replaces Phase 5B)
 */

import type { AttackerPreset, DefenderPreset } from './presets';
import type { ResolvedUnit } from './types';
import { Faction } from './presets';
import { getAllResolvedUnits } from './unitResolver';
import type { WeaponProfile } from '../engine/types';
import { AttackSurgeChart, AttackType } from '../engine/types';

// ============================================================================
// Generator
// ============================================================================

interface GeneratedPresets {
  attackerPresets: AttackerPreset[];
  defenderPresets: DefenderPreset[];
}

let _cached: GeneratedPresets | null = null;

/**
 * Helper: Check if a weapon is usable for a given attack type.
 */
function isWeaponUsableForAttackType(
  weaponType: AttackType | undefined,
  attackType: AttackType,
): boolean {
  if (weaponType === undefined) return true;
  if (weaponType === attackType) return true;

  if (
    weaponType === AttackType.Hybrid &&
    (attackType === AttackType.Ranged || attackType === AttackType.Melee)
  ) {
    return true;
  }

  return false;
}

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
      if (unit.figures <= 1) {
        // Single-mini: one preset per weapon (existing behavior)
        for (let i = 0; i < unit.weapons.length; i++) {
          attackerPresets.push(generateAttackerPreset(unit, i));
        }
      } else {
        // Multi-mini: single preset with all unit weapons + expanded base pool
        attackerPresets.push(generateMultiMiniAttackerPreset(unit));
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
  const engineWeapon: WeaponProfile = {
    name: weapon.name,
    weaponType: weapon.weaponType,
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
      immuneDeflect: false,
      primitive: false,
      ionX: 0,
      spray: false,
      antiMaterielX: 0,
      antiPersonnelX: 0,
      cumbersome: false,
      sidearmMelee: false,
      sidearmRanged: false,
      // Override with enrichment values
      ...weapon.keywords,
    },
  };

  // Convert all unit weapons to data-layer format for unitBaseWeapons
  // This ensures useDisplayWeapons can populate the weapon list for single-mini units
  const unitBaseWeapons = unit.weapons.map((w) => ({
    name: w.name,
    weaponType: w.weaponType,
    redDice: w.redDice,
    blackDice: w.blackDice,
    whiteDice: w.whiteDice,
    keywords: w.keywords,
    minRange: w.minRange,
    maxRange: w.maxRange,
  }));

  const profile: Record<string, any> = {
    weapons: [engineWeapon],
    baseMiniatureCount: unit.figures,
    unitBaseWeapons: unitBaseWeapons,
    surgeChart: unit.attackSurgeChart ?? AttackSurgeChart.None,
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
    title: unit.title ?? null,
    attackType: weapon.weaponType,
    rank: unit.rank,
    unitType: unit.unitType,
    unitAffiliation: unit.affiliation ?? null,
    profile,
    upgradeBar: unit.upgradeBar,
    unitApiId: unit.apiId,
  };
}

function generateMultiMiniAttackerPreset(unit: ResolvedUnit): AttackerPreset {
  // Determine the default attack type (prefer ranged if available)
  const rangedWeapons = unit.weapons.filter(w =>
    isWeaponUsableForAttackType(w.weaponType, AttackType.Ranged)
  );
  const defaultAttackType = rangedWeapons.length > 0
    ? AttackType.Ranged
    : AttackType.Melee;

  // Pick the default weapon for the default attack type
  const defaultWeapon = rangedWeapons.length > 0
    ? rangedWeapons[0]
    : unit.weapons.filter(w =>
        isWeaponUsableForAttackType(w.weaponType, AttackType.Melee)
      )[0];

  // Expand: N copies of the default weapon for the base pool
  const expandedWeapons: WeaponProfile[] = Array.from({ length: unit.figures }, () => ({
    name: defaultWeapon.name,
    weaponType: defaultWeapon.weaponType,
    redDice: defaultWeapon.redDice,
    blackDice: defaultWeapon.blackDice,
    whiteDice: defaultWeapon.whiteDice,
    keywords: {
      pierceX: 0,
      impactX: 0,
      criticalX: 0,
      lethalX: 0,
      ramX: 0,
      blast: false,
      suppressive: false,
      highVelocity: false,
      immuneDeflect: false,
      primitive: false,
      ionX: 0,
      spray: false,
      antiMaterielX: 0,
      antiPersonnelX: 0,
      cumbersome: false,
      sidearmMelee: false,
      sidearmRanged: false,
      ...defaultWeapon.keywords,
    },
  }));

  // Convert all unit weapons to data-layer format for unitBaseWeapons
  // (keeps full weapon profile with minRange/maxRange for upgrade applicator)
  const unitBaseWeapons = unit.weapons.map(weapon => ({
    name: weapon.name,
    weaponType: weapon.weaponType,
    redDice: weapon.redDice,
    blackDice: weapon.blackDice,
    whiteDice: weapon.whiteDice,
    keywords: weapon.keywords,
    minRange: weapon.minRange,
    maxRange: weapon.maxRange,
  }));

  const profile: Record<string, any> = {
    weapons: expandedWeapons,
    baseMiniatureCount: unit.figures,
    unitBaseWeapons: unitBaseWeapons,  // ALL unit weapon profiles (all attack types)
    surgeChart: unit.attackSurgeChart ?? AttackSurgeChart.None,
    unitCost: unit.cost,
  };

  // Copy unit-level keywords to profile
  copyKeywordsToProfile(unit.keywords, profile);

  // Handle Duelist special case
  if (unit.keywords['duelistAttacker'] || unit.keywords['duelistDefender']) {
    profile['duelistAttacker'] = true;
  }

  return {
    id: unit.id,
    faction: unit.faction as Faction,
    name: `${unit.name} (${defaultWeapon.name})`,
    title: unit.title ?? null,
    attackType: defaultAttackType,
    rank: unit.rank,
    unitType: unit.unitType,
    unitAffiliation: unit.affiliation ?? null,
    profile,
    upgradeBar: unit.upgradeBar,
    unitApiId: unit.apiId,
  };
}

function generateSkeletonAttackerPreset(
  unit: ResolvedUnit,
): AttackerPreset {
  // Create empty weapon profile for un-enriched units
  const emptyWeapon: WeaponProfile = {
    name: 'Unknown',
    weaponType: AttackType.Ranged,
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
      immuneDeflect: false,
      primitive: false,
      ionX: 0,
      spray: false,
      antiMaterielX: 0,
      antiPersonnelX: 0,
      cumbersome: false,
      sidearmMelee: false,
      sidearmRanged: false,
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
    title: unit.title ?? null,
    attackType: AttackType.Ranged,
    rank: unit.rank,
    unitType: unit.unitType,
    unitAffiliation: unit.affiliation ?? null,
    profile,
    upgradeBar: unit.upgradeBar,
    unitApiId: unit.apiId,
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
    title: unit.title ?? null,
    rank: unit.rank,
    unitType: unit.unitType,
    unitAffiliation: unit.affiliation ?? null,
    profile,
    upgradeBar: unit.upgradeBar,
    unitApiId: unit.apiId,
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