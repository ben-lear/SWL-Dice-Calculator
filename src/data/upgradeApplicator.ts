/**
 * Upgrade applicator - applies equipped upgrade effects to engine configs
 * Phase 5.5C.5: Create upgrade applicator
 */

import { getResolvedUpgradeById } from './upgradeResolver';
import { AttackType, AttackSurgeChart, DefenseSurgeChart } from '../engine/types';
import type { WeaponProfile } from '../engine/types';
import type { WeaponProfile as DataLayerWeaponProfile } from './types';
import { UpgradeSlot } from './types';
import { isWeaponUsableForAttackType } from '../engine/weaponUtils';

// ============================================================================
// Types
// ============================================================================

/**
 * A config object with unitCost and keyword fields.
 * Generic enough to accept both attacker and defender configs.
 */
interface ConfigWithCost {
  unitCost: number;
  weapons?: WeaponProfile[];
  [key: string]: any;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Weapon keyword field names that should be applied to weapons rather than
 * the unit config when encountered in upgrade keywords.
 */
const WEAPON_KEYWORD_FIELDS = new Set<string>([
  'pierceX', 'impactX', 'criticalX', 'lethalX', 'ramX', 'ionX',
  'blast', 'suppressive', 'highVelocity', 'spray',
  'antiMaterielX', 'antiPersonnelX', 'cumbersome',
  'immuneDeflect', 'primitive',
  'sidearmMelee', 'sidearmRanged',
  // Pool formation modifiers (per-weapon)
  'blackOps', 'krakenBlaster',
  // Display weapon keywords
  'longshot', 'scatter', 'exhaust', 'expend',
  'immobilizeX', 'overrunX', 'fixed',
  'areaWeapon', 'beamX', 'poisonX', 'selfDestructX',
  'towCable', 'versatile', 'armX', 'detonateX',
  'saberThrow',
]);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a data-layer weapon profile to engine format with all keyword defaults.
 */
export function normalizeToEngineWeapon(
  weapon: DataLayerWeaponProfile,
): WeaponProfile {
  return {
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
  };
}

/**
 * Select the weapon an upgrade-added miniature contributes to the attack pool.
 *
 * Rules:
 * 1. Upgrade mini primarily uses its own upgrade's weapon profiles.
 * 2. If the upgrade has no weapon matching the attack type, the mini
 *    falls back to unit base weapons (e.g., Unarmed melee).
 * 3. Sidearm restriction: when the sidearm type matches the attack type
 *    (enforced), the mini MUST use only the upgrade's weapons of that type
 *    and CANNOT fall back to unit weapons.
 * 4. Sidearm non-enforced: when the sidearm type does NOT match the attack
 *    type, the mini CAN use any compatible weapon from upgrade + unit.
 */
function selectWeaponForUpgradeMini(
  upgradeWeapons: DataLayerWeaponProfile[],
  attackType: AttackType,
  unitBaseWeapons: DataLayerWeaponProfile[],
): DataLayerWeaponProfile | null {
  const hasSidearmMelee = upgradeWeapons.some(w => w.keywords?.sidearmMelee);
  const hasSidearmRanged = upgradeWeapons.some(w => w.keywords?.sidearmRanged);

  // Case 1: Sidearm: Ranged is NOT enforced (attack is melee/overrun)
  // → mini can use any compatible weapon from upgrade + unit
  if (hasSidearmRanged && attackType !== AttackType.Ranged) {
    const candidates = [...upgradeWeapons, ...unitBaseWeapons]
      .filter(w => isWeaponUsableForAttackType(w.weaponType, attackType));
    return candidates[0] ?? null;
  }

  // Case 2: Sidearm: Melee is NOT enforced (attack is ranged/overrun)
  // → mini can use any compatible weapon from upgrade + unit
  if (hasSidearmMelee && attackType !== AttackType.Melee) {
    const candidates = [...upgradeWeapons, ...unitBaseWeapons]
      .filter(w => isWeaponUsableForAttackType(w.weaponType, attackType));
    return candidates[0] ?? null;
  }

  // Case 3: No sidearm, or sidearm IS enforced → use upgrade weapons only
  const compatible = upgradeWeapons
    .filter(w => isWeaponUsableForAttackType(w.weaponType, attackType));
  if (compatible.length > 0) return compatible[0];

  // Case 4: No compatible upgrade weapon → fall back to unit base weapons
  // (e.g., a pure-ranged heavy weapon mini during a melee attack uses Unarmed)
  // Note: this fallback does NOT apply when sidearm IS enforced — that case
  // was handled in Cases 1-2 above (the enforced path stays in Case 3).
  const fallback = unitBaseWeapons
    .filter(w => isWeaponUsableForAttackType(w.weaponType, attackType));
  return fallback[0] ?? null;
}

// ============================================================================
// Apply Upgrades
// ============================================================================

/**
 * Apply equipped attacker upgrades to the attacker config.
 * - Adds upgrade costs to unitCost
 * - Applies enriched upgrade keywords to config fields
 * - Builds per-miniature weapon array based on attack type
 *
 * Returns a new config object (does not mutate the input).
 */
export function applyAttackerUpgrades<T extends ConfigWithCost>(
  config: T,
  equippedUpgradeIds: (string | null)[],
  attackType?: AttackType,
  unitBaseWeapons?: DataLayerWeaponProfile[],
  baseMiniatureCount?: number,
): T {
  return applyUpgrades(config, equippedUpgradeIds, attackType, unitBaseWeapons, false, baseMiniatureCount);
}

/**
 * Apply equipped defender upgrades to the defender config.
 * Same logic as attacker (no weapon manipulation for defenders).
 * @param attackType - When provided, enables conditional surge overrides (e.g. meleySurgeBlock).
 */
export function applyDefenderUpgrades<T extends ConfigWithCost>(
  config: T,
  equippedUpgradeIds: (string | null)[],
  attackType?: AttackType,
): T {
  return applyUpgrades(config, equippedUpgradeIds, attackType, undefined, true);
}

// ============================================================================
// Core Logic
// ============================================================================

function applyUpgrades<T extends ConfigWithCost>(
  config: T,
  equippedUpgradeIds: (string | null)[],
  attackType?: AttackType,
  unitBaseWeapons?: DataLayerWeaponProfile[],
  isDefender = false,
  baseMiniatureCount?: number,
): T {
  // Shallow clone to avoid mutating the original
  const result: ConfigWithCost = { ...config };

  // Re-derive base weapons from unitBaseWeapons and baseMiniatureCount
  // if we have unit context (Unit Builder mode). This ensures that
  // changing attack type produces the correct base weapon expansion.
  const baseMiniCount = baseMiniatureCount ?? 1;
  let weapons: WeaponProfile[];

  if (unitBaseWeapons && unitBaseWeapons.length > 0 && attackType !== undefined) {
    // Unit Builder mode: expand base minis with attack-type-appropriate weapons
    const baseWeaponForAttackType = unitBaseWeapons
      .filter(w => isWeaponUsableForAttackType(w.weaponType, attackType));

    if (baseMiniCount === 1) {
      // Single-mini unit: Arsenal X allows firing multiple weapons.
      // Include up to arsenalX compatible base weapons by default so
      // the engine pool matches what the display hook shows.
      const arsenalX = typeof config['arsenalX'] === 'number' ? config['arsenalX'] as number : 0;
      const weaponLimit = Math.max(1, arsenalX);
      const weaponsToInclude = baseWeaponForAttackType.slice(0, weaponLimit);
      weapons = weaponsToInclude.map(w => normalizeToEngineWeapon(w));
    } else {
      // Multi-mini unit: each mini uses the first compatible base weapon
      const defaultBaseWeapon = baseWeaponForAttackType[0];
      if (defaultBaseWeapon) {
        weapons = Array.from({ length: baseMiniCount }, () =>
          normalizeToEngineWeapon(defaultBaseWeapon)
        );
      } else {
        weapons = [];
      }
    }
  } else {
    // Custom Pool mode or no unit context: use config.weapons as-is
    weapons = [...(config.weapons ?? [])];
  }

  let totalUpgradeCost = 0;

  // Collect weapon keywords from upgrades that grant pool-level weapon keywords
  // (e.g., Immune: Deflect, Suppressive). These are applied to all weapons after processing.
  const pendingWeaponKeywords: Record<string, unknown> = {};

  for (const upgradeId of equippedUpgradeIds) {
    if (!upgradeId) continue;

    const upgrade = getResolvedUpgradeById(upgradeId);
    if (!upgrade) continue;

    // Always add cost (combat and non-combat alike)
    totalUpgradeCost += upgrade.cost;

    // Apply keyword effects (only enriched combat upgrades have keywords)
    // Keywords are stored using typed field names. Some may be weapon keywords
    // (applied to all weapons in pool) vs unit keywords (applied to config).
    for (const [fieldName, kwValue] of Object.entries(upgrade.keywords)) {
      // Special case: duckAndCover → +1 suppressionTokens (applies only on defender side)
      if (fieldName === 'duckAndCover' && kwValue === true) {
        const current = (result['suppressionTokens'] as number) ?? 0;
        result['suppressionTokens'] = current + 1;
        continue;
      }

      // Special case: missionObjective → +1 observationTokens (reroll approximation)
      if (fieldName === 'missionObjective' && kwValue === true) {
        const current = (result['observationTokens'] as number) ?? 0;
        result['observationTokens'] = current + 1;
        continue;
      }

      if (WEAPON_KEYWORD_FIELDS.has(fieldName)) {
        // Weapon keywords: will be applied to all weapons after the loop
        pendingWeaponKeywords[fieldName] = kwValue;
      } else if (typeof kwValue === 'boolean') {
        // Boolean unit keywords: set to true
        result[fieldName] = true;
      } else if (typeof kwValue === 'number') {
        // Numeric unit keywords: add to existing value
        const currentValue = (result[fieldName] as number) ?? 0;
        result[fieldName] = currentValue + kwValue;
      }
    }

    // Apply surge overrides from enrichment data
    if (upgrade.surgeOverrides) {
      if (!isDefender) {
        // Attacker-side surge chart modifications
        if (upgrade.surgeOverrides.surgeCrit) {
          result['surgeChart'] = AttackSurgeChart.ToCrit;
        }
        if (upgrade.surgeOverrides.surgeHit) {
          result['surgeChart'] = AttackSurgeChart.ToHit;
        }
        // meleeSurgeCrit: only override surge chart when in a melee attack context
        if (upgrade.surgeOverrides.meleeSurgeCrit && attackType === AttackType.Melee) {
          result['surgeChart'] = AttackSurgeChart.ToCrit;
        }
      } else {
        // Defender-side surge chart modifications (melee conditional)
        if (upgrade.surgeOverrides.meleeSurgeBlock && attackType === AttackType.Melee) {
          result['surgeChart'] = DefenseSurgeChart.ToBlock;
        }
      }
    }

    // Apply defense stat overrides (defender-side only)
    if (isDefender && upgrade.defenseOverrides) {
      if (upgrade.defenseOverrides.dieColor !== undefined) {
        result['dieColor'] = upgrade.defenseOverrides.dieColor;
      }
      if (upgrade.defenseOverrides.surgeChart !== undefined) {
        result['surgeChart'] = upgrade.defenseOverrides.surgeChart;
      }
    }

    // Weapon array manipulation — per-miniature weapon selection
    if (upgrade.isGrenade && upgrade.weapons.length > 0) {
      // Grenade: add exactly one weapon entry for THIS grenade upgrade.
      // Each grenade upgrade contributes independently — a unit with
      // Impact Grenades and Concussion Grenades adds both. But each
      // individual grenade adds only 1 entry (not 1 per miniature).
      for (const w of upgrade.weapons) {
        if (isWeaponUsableForAttackType(w.weaponType, attackType ?? AttackType.Ranged)) {
          weapons.push(normalizeToEngineWeapon(w));
          break; // Only one weapon entry per grenade instance
        }
      }
    } else if (upgrade.addsMiniature > 0) {
      if (upgrade.noncombatant) {
        // Noncombatant: no weapon added (cost + keywords only)
        continue;
      }

      // Combatant upgrade that adds mini(s):
      // Select the best weapon for each added miniature from ALL of the
      // upgrade's weapons, considering attack type and sidearm rules.
      for (let i = 0; i < upgrade.addsMiniature; i++) {
        const selectedWeapon = upgrade.weapons.length > 0
          ? selectWeaponForUpgradeMini(
              upgrade.weapons,          // ALL upgrade weapons
              attackType ?? AttackType.Ranged,
              unitBaseWeapons ?? [],     // unit weapons for sidearm fallback
            )
          : null;

        if (selectedWeapon) {
          weapons.push(normalizeToEngineWeapon(selectedWeapon));
        } else if (unitBaseWeapons && unitBaseWeapons.length > 0) {
          // Upgrade has no weapons at all: use a unit base weapon
          // (unenriched upgrade fallback)
          const fallback = unitBaseWeapons.filter(w =>
            isWeaponUsableForAttackType(w.weaponType, attackType ?? AttackType.Ranged)
          );
          if (fallback.length > 0) {
            weapons.push(normalizeToEngineWeapon(fallback[0]));
          }
        }
      }
    } else if (upgrade.upgradeSlot === UpgradeSlot.Armament) {
      // Armament: add ALL weapon options as additional choices
      for (const w of upgrade.weapons) {
        if (isWeaponUsableForAttackType(w.weaponType, attackType ?? AttackType.Ranged)) {
          weapons.push(normalizeToEngineWeapon(w));
        }
      }
    }

    // Special case: Dug In upgrade changes cover dice to red
    // This is a unique game effect not representable via the standard
    // keyword mapping. When a Dug In upgrade is equipped on the defender,
    // the dugIn flag is already set by the keyword above (dugIn: true).
    // The engine knows to roll red dice during cover when this flag is set.
  }

  // Apply pending weapon keywords to ALL weapons in the pool.
  // This handles upgrades that grant pool-level weapon keywords
  // (e.g., crew/pilot upgrades that add Immune: Deflect or Suppressive).
  if (Object.keys(pendingWeaponKeywords).length > 0) {
    for (const weapon of weapons) {
      for (const [fieldName, kwValue] of Object.entries(pendingWeaponKeywords)) {
        (weapon.keywords as unknown as Record<string, unknown>)[fieldName] = kwValue;
      }
    }
  }

  // Update weapons array and total cost
  result.weapons = weapons;
  result.unitCost = (result.unitCost ?? 0) + totalUpgradeCost;

  return result as T;
}