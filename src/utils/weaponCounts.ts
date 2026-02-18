/**
 * rebuildWeaponsFromCounts - post-processing utility for weapon mini count overrides.
 * Phase 10C: Engine layer for applying weaponMiniCounts store state.
 */

import type { WeaponProfile } from '../engine/types';

/**
 * Given an array of weapon profiles (from applyAttackerUpgrades) and a
 * name→count map of user overrides, produce a flat WeaponProfile[] with the
 * correct number of copies for each weapon.
 *
 * If overrides is empty, returns defaultWeapons unchanged (preserving
 * the output of applyAttackerUpgrades exactly, with zero overhead).
 *
 * @param defaultWeapons - The weapon array from applyAttackerUpgrades (flat, with duplicates).
 * @param overrides - User-specified weaponMiniCounts (name → count).
 * @param allAvailableWeapons - All weapon templates that may appear in the result
 *   (used to include weapons that have count 0 in defaultWeapons but a positive override).
 */
export function rebuildWeaponsFromCounts(
  defaultWeapons: WeaponProfile[],
  overrides: Record<string, number>,
  allAvailableWeapons: WeaponProfile[],
): WeaponProfile[] {
  if (Object.keys(overrides).length === 0) {
    return defaultWeapons;
  }

  // Build a map of weapon name → template (first occurrence wins)
  const templateMap = new Map<string, WeaponProfile>();
  for (const w of allAvailableWeapons) {
    const name = w.name ?? '';
    if (name && !templateMap.has(name)) {
      templateMap.set(name, w);
    }
  }

  // Also add templates from defaultWeapons so we don't miss any
  for (const w of defaultWeapons) {
    const name = w.name ?? '';
    if (name && !templateMap.has(name)) {
      templateMap.set(name, w);
    }
  }

  // Count how many of each weapon name appear in defaultWeapons
  const defaultCounts = new Map<string, number>();
  for (const w of defaultWeapons) {
    const name = w.name ?? '';
    defaultCounts.set(name, (defaultCounts.get(name) ?? 0) + 1);
  }

  // Determine final count for each weapon, preferring overrides
  const result: WeaponProfile[] = [];
  const processedNames = new Set<string>();

  // Process weapons in template order (ensures stable ordering)
  for (const [name, template] of templateMap) {
    processedNames.add(name);
    const count = overrides[name] ?? defaultCounts.get(name) ?? 0;
    for (let i = 0; i < count; i++) {
      result.push({ ...template, keywords: { ...template.keywords } });
    }
  }

  // Safety net: include any default weapons whose name wasn't in template map
  // (e.g., unnamed weapons — treated as a single unique entry)
  for (const w of defaultWeapons) {
    const name = w.name ?? '';
    if (!processedNames.has(name)) {
      result.push(w);
    }
  }

  return result;
}
