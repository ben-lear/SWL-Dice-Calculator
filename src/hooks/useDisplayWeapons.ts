/**
 * useDisplayWeapons - derives the UI weapon list for AttackerUnitBuilderView.
 * Phase 10B: Display layer for weapon mini count controls.
 */

import { useMemo } from 'react';
import { useAttackConfigStore } from '../stores/attackConfigStore';
import { useAttackTypeStore } from '../stores/attackTypeStore';
import { getResolvedUpgradeById } from '../data/upgradeResolver';
import { UpgradeSlot } from '../data/types';
import type { WeaponProfile as DataLayerWeaponProfile } from '../data/types';
import { isWeaponUsableForAttackType } from '../engine/weaponUtils';
import { AttackType } from '../engine/types';
import type { WeaponKeywords } from '../engine/types';
import type { DisplayWeaponKeywords } from '../data/enrichment/keywordTypes';

// ============================================================================
// Types
// ============================================================================

/** Source of a weapon in the display list */
export type WeaponSource = 'base' | 'heavy' | 'personnel' | 'grenade' | 'armament' | 'hardpoint';

/** A unique weapon row in the display list */
export interface DisplayWeapon {
  /** Weapon name (used as identity key) */
  name: string;
  /** Weapon attack type (Ranged/Melee/Hybrid) */
  weaponType?: AttackType;
  /** Dice profile */
  redDice: number;
  blackDice: number;
  whiteDice: number;
  /** How many minis currently use this weapon (from overrides or defaults) */
  count: number;
  /** Maximum minis that CAN equip this weapon */
  maxCount: number;
  /**
   * Minimum minis that MUST use this weapon.
   * 0 for most weapons. 1 for sidearm weapons when the sidearm keyword
   * matches the current attack type.
   */
  minCount: number;
  /** Where this weapon comes from */
  source: WeaponSource;
  /** Weapon keywords (for tooltip/display) */
  keywords: Partial<WeaponKeywords & DisplayWeaponKeywords>;
}

export interface DisplayWeaponsResult {
  /** Unique weapon rows filtered by current attack type */
  weapons: DisplayWeapon[];
  /** True when totalMiniCount <= 1 (show checkboxes instead of spinners) */
  isSingleMini: boolean;
  /** Total minis: baseMiniatureCount + upgrade-added minis */
  totalMiniCount: number;
}

// ============================================================================
// Internal helper
// ============================================================================

interface UpgradeWeaponEntry {
  weapon: DataLayerWeaponProfile;
  source: WeaponSource;
  maxCount: number;
  /** For sidearm detection: keywords from the weapon */
  hasSidearmMelee: boolean;
  hasSidearmRanged: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useDisplayWeapons(): DisplayWeaponsResult {
  const unitBaseWeapons = useAttackConfigStore((s) => s.unitBaseWeapons);
  const baseMiniatureCount = useAttackConfigStore((s) => s.baseMiniatureCount);
  const equippedUpgradeIds = useAttackConfigStore((s) => s.equippedUpgradeIds);
  const weaponMiniCounts = useAttackConfigStore((s) => s.weaponMiniCounts);
  const arsenalX = useAttackConfigStore((s) => s.arsenalX);
  const attackType = useAttackTypeStore((s) => s.attackType);

  return useMemo((): DisplayWeaponsResult => {
    // ── Step 1: Filter base weapons by attack type ──────────────────────────
    const compatibleBaseWeapons = unitBaseWeapons.filter((w) =>
      isWeaponUsableForAttackType(w.weaponType, attackType),
    );

    // ── Step 2: Resolve upgrade weapons ────────────────────────────────────
    // Compute totalMiniCount (base + all non-noncombatant addsMiniature upgrades)
    let totalAddedMinis = 0;
    for (const id of equippedUpgradeIds) {
      if (!id) continue;
      const upgrade = getResolvedUpgradeById(id);
      if (upgrade && upgrade.addsMiniature > 0 && !upgrade.noncombatant) {
        totalAddedMinis += upgrade.addsMiniature;
      }
    }
    const totalMiniCount = baseMiniatureCount + totalAddedMinis;
    const isSingleMini = totalMiniCount <= 1;

    // Parse upgrades into display weapon entries + track fallback minis
    const upgradeWeaponEntries: UpgradeWeaponEntry[] = [];
    let fallbackMiniCount = 0; // Minis from incompatible heavy/personnel that fall back to base weapon
    let grenadeCount = 0;      // Number of equipped grenade upgrades with compatible weapons
    let firstArmamentAssigned = false; // Only the first armament gets auto-assignment

    for (const id of equippedUpgradeIds) {
      if (!id) continue;
      const upgrade = getResolvedUpgradeById(id);
      if (!upgrade) continue;

      if (upgrade.isGrenade && upgrade.weapons.length > 0) {
        // Grenade: add one entry for the first compatible weapon
        const compatible = upgrade.weapons.find((w) =>
          isWeaponUsableForAttackType(w.weaponType, attackType),
        );
        if (compatible) {
          grenadeCount += 1;
          upgradeWeaponEntries.push({
            weapon: compatible,
            source: 'grenade',
            maxCount: 1,
            hasSidearmMelee: compatible.keywords?.sidearmMelee ?? false,
            hasSidearmRanged: compatible.keywords?.sidearmRanged ?? false,
          });
        }
      } else if (upgrade.addsMiniature > 0 && !upgrade.noncombatant) {
        // Heavy weapon or personnel: determine if any weapon is compatible
        const compatibleUpgradeWeapons = upgrade.weapons.filter((w) =>
          isWeaponUsableForAttackType(w.weaponType, attackType),
        );

        if (compatibleUpgradeWeapons.length > 0) {
          // Compatible: show as upgrade weapon row
          const source: WeaponSource =
            upgrade.upgradeSlot === UpgradeSlot.HeavyWeapon ? 'heavy' : 'personnel';
          // Use the first compatible weapon (mirrors selectWeaponForUpgradeMini logic)
          const selectedWeapon = compatibleUpgradeWeapons[0];
          upgradeWeaponEntries.push({
            weapon: selectedWeapon,
            source,
            maxCount: upgrade.addsMiniature,
            hasSidearmMelee: selectedWeapon.keywords?.sidearmMelee ?? false,
            hasSidearmRanged: selectedWeapon.keywords?.sidearmRanged ?? false,
          });
        } else {
          // No compatible weapon: upgrade mini falls back to first base weapon
          fallbackMiniCount += upgrade.addsMiniature;
        }
      } else if (upgrade.upgradeSlot === UpgradeSlot.Armament) {
        // Armament: add all compatible weapon entries
        for (const w of upgrade.weapons) {
          if (isWeaponUsableForAttackType(w.weaponType, attackType)) {
            upgradeWeaponEntries.push({
              weapon: w,
              source: 'armament',
              maxCount: totalMiniCount,
              hasSidearmMelee: w.keywords?.sidearmMelee ?? false,
              hasSidearmRanged: w.keywords?.sidearmRanged ?? false,
            });
          }
        }
      } else if (upgrade.upgradeSlot === UpgradeSlot.Hardpoint && upgrade.weapons.length > 0) {
        // Hardpoint: add compatible weapon entries (vehicles with hardpoint slots)
        for (const w of upgrade.weapons) {
          if (isWeaponUsableForAttackType(w.weaponType, attackType)) {
            upgradeWeaponEntries.push({
              weapon: w,
              source: 'hardpoint',
              maxCount: totalMiniCount,
              hasSidearmMelee: w.keywords?.sidearmMelee ?? false,
              hasSidearmRanged: w.keywords?.sidearmRanged ?? false,
            });
          }
        }
      }
    }

    // ── Step 3: Compute default counts ─────────────────────────────────────
    // Start with base weapon defaults
    // First base weapon gets baseMiniatureCount + fallbackMiniCount
    // Subsequent base weapons get 0

    // Check if any armament is equipped (affects base weapon defaults)
    const hasArmament = upgradeWeaponEntries.some((e) => e.source === 'armament');

    // Compute how many minis from compatible heavy/personnel/squad-leader upgrade weapons
    // are currently unassigned. Unassigned upgrade minis should be allowed to fall back to
    // the base weapon — both as available slots (maxCount) and as auto-filled defaults.
    let totalCompatibleUpgradeMinis = 0;
    let unassignedCompatibleUpgradeMinis = 0;
    for (const entry of upgradeWeaponEntries) {
      if (entry.source === 'heavy' || entry.source === 'personnel') {
        totalCompatibleUpgradeMinis += entry.maxCount;
        // Default for heavy/personnel entries is their maxCount (all minis use the upgrade weapon)
        const defaultCount = entry.maxCount;
        const rawCount = weaponMiniCounts[entry.weapon.name] ?? defaultCount;
        const currentCount = Math.max(0, Math.min(rawCount, entry.maxCount));
        unassignedCompatibleUpgradeMinis += entry.maxCount - currentCount;
      }
    }

    // Build the display weapon list
    const displayWeapons: DisplayWeapon[] = [];

    // Base weapons
    // maxCount: base minis + fallback minis (from incompatible upgrades) + ALL compatible
    //           upgrade minis (in case any are unassigned and need a home).
    // default:  base minis + fallback minis + UNASSIGNED compatible upgrade minis
    //           so that unassigning a heavy weapon auto-falls back to the base weapon.
    let firstBaseWeaponDefault =
      baseMiniatureCount + fallbackMiniCount + unassignedCompatibleUpgradeMinis - grenadeCount;
    if (firstBaseWeaponDefault < 0) firstBaseWeaponDefault = 0;
    const firstBaseWeaponMaxCount =
      baseMiniatureCount + fallbackMiniCount + totalCompatibleUpgradeMinis;

    if (hasArmament) {
      // Armament: all base minis move to armament, first base weapon default = 0
      firstBaseWeaponDefault = 0;
    }

    for (let i = 0; i < compatibleBaseWeapons.length; i++) {
      const w = compatibleBaseWeapons[i];
      const defaultCount = i === 0 ? firstBaseWeaponDefault : 0;
      const maxCount = i === 0 ? firstBaseWeaponMaxCount : baseMiniatureCount;

      // Sidearm enforcement for base weapons (unusual but possible)
      const hasSidearmMelee = w.keywords?.sidearmMelee ?? false;
      const hasSidearmRanged = w.keywords?.sidearmRanged ?? false;
      const minCount =
        (hasSidearmMelee && attackType === AttackType.Melee) ||
        (hasSidearmRanged && attackType === AttackType.Ranged)
          ? 1
          : 0;

      const rawCount = weaponMiniCounts[w.name] ?? defaultCount;
      const count = Math.max(minCount, rawCount);

      displayWeapons.push({
        name: w.name,
        weaponType: w.weaponType,
        redDice: w.redDice ?? 0,
        blackDice: w.blackDice ?? 0,
        whiteDice: w.whiteDice ?? 0,
        count,
        maxCount,
        minCount,
        source: 'base',
        keywords: w.keywords ?? {},
      });
    }

    // Upgrade weapons
    for (const entry of upgradeWeaponEntries) {
      const { weapon, source, maxCount } = entry;

      // Sidearm enforcement
      const minCount =
        (entry.hasSidearmMelee && attackType === AttackType.Melee) ||
        (entry.hasSidearmRanged && attackType === AttackType.Ranged)
          ? 1
          : 0;

      // Default count logic per source
      let defaultCount: number;
      if (source === 'grenade') {
        defaultCount = 1;
      } else if (source === 'armament') {
        if (!firstArmamentAssigned) {
          defaultCount = baseMiniatureCount;
          firstArmamentAssigned = true;
        } else {
          defaultCount = 0;
        }
      } else if (source === 'hardpoint') {
        // Hardpoints default to enabled; Arsenal X cap (Step 4) auto-disables excess
        defaultCount = totalMiniCount;
      } else {
        // heavy or personnel: default = maxCount (typically addsMiniature)
        defaultCount = maxCount;
      }

      const rawCount = weaponMiniCounts[weapon.name] ?? defaultCount;
      const count = Math.max(minCount, rawCount);

      displayWeapons.push({
        name: weapon.name,
        weaponType: weapon.weaponType,
        redDice: weapon.redDice ?? 0,
        blackDice: weapon.blackDice ?? 0,
        whiteDice: weapon.whiteDice ?? 0,
        count,
        maxCount,
        minCount,
        source,
        keywords: weapon.keywords ?? {},
      });
    }

    // ── Step 4: Arsenal X cap (single-mini units only) ─────────────────────
    if (isSingleMini && arsenalX > 0) {
      // Count weapons that are currently enabled (count > 0)
      const enabledCount = displayWeapons.filter((w) => w.count > 0).length;

      if (enabledCount > arsenalX) {
        // Walk in reverse and disable excess weapons that don't have minCount enforcement
        let toDisable = enabledCount - arsenalX;
        for (let i = displayWeapons.length - 1; i >= 0 && toDisable > 0; i--) {
          const dw = displayWeapons[i];
          // Only auto-disable weapons that have no user override AND no sidearm enforcement
          if (dw.count > 0 && dw.minCount === 0 && !(dw.name in weaponMiniCounts)) {
            displayWeapons[i] = { ...dw, count: 0 };
            toDisable--;
          }
        }
      }
    }

    return { weapons: displayWeapons, isSingleMini, totalMiniCount };
  }, [
    unitBaseWeapons,
    baseMiniatureCount,
    equippedUpgradeIds,
    weaponMiniCounts,
    arsenalX,
    attackType,
  ]);
}
