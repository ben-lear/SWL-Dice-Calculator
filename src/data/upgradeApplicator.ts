/**
 * Upgrade applicator - applies equipped upgrade effects to engine configs
 * Phase 5.5C.5: Create upgrade applicator
 */

import { getResolvedUpgradeById } from './upgradeResolver';

// ============================================================================
// Types
// ============================================================================

/**
 * A config object with unitCost and keyword fields.
 * Generic enough to accept both attacker and defender configs.
 */
interface ConfigWithCost {
  unitCost: number;
  [key: string]: any;
}

// ============================================================================
// Apply Upgrades
// ============================================================================

/**
 * Apply equipped attacker upgrades to the attacker config.
 * - Adds upgrade costs to unitCost
 * - Applies enriched upgrade keywords to config fields
 *
 * Returns a new config object (does not mutate the input).
 */
export function applyAttackerUpgrades<T extends ConfigWithCost>(
  config: T,
  equippedUpgradeIds: (string | null)[],
): T {
  return applyUpgrades(config, equippedUpgradeIds);
}

/**
 * Apply equipped defender upgrades to the defender config.
 * Same logic as attacker.
 */
export function applyDefenderUpgrades<T extends ConfigWithCost>(
  config: T,
  equippedUpgradeIds: (string | null)[],
): T {
  return applyUpgrades(config, equippedUpgradeIds);
}

// ============================================================================
// Core Logic
// ============================================================================

function applyUpgrades<T extends ConfigWithCost>(
  config: T,
  equippedUpgradeIds: (string | null)[],
): T {
  // Shallow clone to avoid mutating the original
  const result: ConfigWithCost = { ...config };

  let totalUpgradeCost = 0;

  for (const upgradeId of equippedUpgradeIds) {
    if (!upgradeId) continue;

    const upgrade = getResolvedUpgradeById(upgradeId);
    if (!upgrade) continue;

    // Always add cost (combat and non-combat alike)
    totalUpgradeCost += upgrade.cost;

    // Apply keyword effects (only enriched combat upgrades have keywords)
    // Keywords are already stored using typed field names that match config fields
    for (const [fieldName, kwValue] of Object.entries(upgrade.keywords)) {
      if (typeof kwValue === 'boolean') {
        // Boolean keywords: set to true
        result[fieldName] = true;
      } else if (typeof kwValue === 'number') {
        // Numeric keywords: add to existing value
        const currentValue = (result[fieldName] as number) ?? 0;
        result[fieldName] = currentValue + kwValue;
      }
    }

    // Special case: Dug In upgrade changes cover dice to red
    // This is a unique game effect not representable via the standard
    // keyword mapping. When a Dug In upgrade is equipped on the defender,
    // the dugIn flag is already set by the keyword above (dugIn: true).
    // The engine knows to roll red dice during cover when this flag is set.
  }

  // Add total upgrade cost to unit cost
  result.unitCost = (result.unitCost ?? 0) + totalUpgradeCost;

  return result as T;
}