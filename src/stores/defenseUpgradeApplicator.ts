import type { DefenderConfig } from '../engine/types';
import type { DefenderUpgrade } from './defenseTypes';
import { getDefenderUpgradeById } from './defenseUpgradeHelpers';

/**
 * Apply equipped defender upgrades to a base DefenderConfig.
 * 
 * This function takes a base defender configuration (from preset or custom)
 * and applies the effects of all equipped upgrades, returning the final
 * configuration that should be used by the simulation engine.
 * 
 * @param baseConfig - Base defender configuration before upgrades
 * @param equippedUpgrades - Array of upgrade objects to apply
 * @returns Modified configuration with upgrade effects applied
 */
export function applyDefenderUpgrades(
  baseConfig: DefenderConfig,
  equippedUpgrades: DefenderUpgrade[]
): DefenderConfig {
  if (equippedUpgrades.length === 0) {
    return baseConfig;
  }

  // Start with a copy of the base config
  let result = { ...baseConfig };

  // Apply each upgrade's effects
  for (const upgrade of equippedUpgrades) {
    const effects = upgrade.keywordEffects;

    // Add numeric keyword effects
    if (effects.armorX !== undefined) {
      result.armorX += effects.armorX;
    }
    if (effects.weakPointX !== undefined) {
      result.weakPointX += effects.weakPointX;
    }
    if (effects.dangerSenseX !== undefined) {
      result.dangerSenseX += effects.dangerSenseX;
    }
    if (effects.uncannyLuckX !== undefined) {
      result.uncannyLuckX += effects.uncannyLuckX;
    }
    if (effects.shieldedX !== undefined) {
      result.shieldedX += effects.shieldedX;
    }

    // Apply boolean keyword effects (OR logic - any upgrade grants the keyword)
    if (effects.immunePierce !== undefined) {
      result.immunePierce = result.immunePierce || effects.immunePierce;
    }
    if (effects.immuneMeleePierce !== undefined) {
      result.immuneMeleePierce = result.immuneMeleePierce || effects.immuneMeleePierce;
    }
    if (effects.immuneBlast !== undefined) {
      result.immuneBlast = result.immuneBlast || effects.immuneBlast;
    }
    if (effects.impervious !== undefined) {
      result.impervious = result.impervious || effects.impervious;
    }
    if (effects.block !== undefined) {
      result.block = result.block || effects.block;
    }
    if (effects.deflect !== undefined) {
      result.deflect = result.deflect || effects.deflect;
    }
    if (effects.shienMastery !== undefined) {
      result.shienMastery = result.shienMastery || effects.shienMastery;
    }
    if (effects.outmaneuver !== undefined) {
      result.outmaneuver = result.outmaneuver || effects.outmaneuver;
    }
    if (effects.lowProfile !== undefined) {
      result.lowProfile = result.lowProfile || effects.lowProfile;
    }
    if (effects.djemSoMastery !== undefined) {
      result.djemSoMastery = result.djemSoMastery || effects.djemSoMastery;
    }
    if (effects.soresuMastery !== undefined) {
      result.soresuMastery = result.soresuMastery || effects.soresuMastery;
    }
    if (effects.duelistDefender !== undefined) {
      result.duelistDefender = result.duelistDefender || effects.duelistDefender;
    }
    if (effects.backup !== undefined) {
      result.backup = result.backup || effects.backup;
    }
    if (effects.holdTheLine !== undefined) {
      result.holdTheLine = result.holdTheLine || effects.holdTheLine;
    }
    if (effects.dugIn !== undefined) {
      result.dugIn = result.dugIn || effects.dugIn;
    }

    // Add upgrade cost to total unit cost
    result.unitCost += upgrade.cost;
  }

  return result;
}

/**
 * Get equipped defender upgrades by their IDs.
 * This will be replaced with actual data loading in Phase 5.5.
 * 
 * @param equippedUpgradeIds - Array of upgrade IDs that are equipped
 * @returns Array of upgrade objects matching the IDs
 */
export function getEquippedDefenderUpgrades(equippedUpgradeIds: string[]): DefenderUpgrade[] {
  // Phase 5.5: This will load actual upgrade data from the data layer
  // For now, use the helper to look up stub upgrades
  const upgrades: DefenderUpgrade[] = [];
  
  for (const upgradeId of equippedUpgradeIds) {
    const upgrade = getDefenderUpgradeById(upgradeId);
    if (upgrade) {
      upgrades.push(upgrade);
    }
  }
  
  return upgrades;
}