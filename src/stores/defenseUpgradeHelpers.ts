import type { DefenderUpgrade } from './defenseTypes';

/**
 * Stub function to get all defender upgrades.
 * This will be replaced with actual data loading in Phase 5.5.
 * 
 * @returns Array of defender upgrades (currently returns sample data)
 */
export function getDefenderUpgrades(): DefenderUpgrade[] {
  // Phase 5.5: This will load actual upgrade data from the data layer
  // For now, return minimal sample data to support UI development
  return [
    {
      id: 'stub-armor-upgrade',
      name: 'Armor Plating',
      slotType: 'armor',
      cost: 12,
      keywordEffects: {
        armorX: 1,
      },
    },
    {
      id: 'stub-defensive-upgrade',
      name: 'Emergency Stims',
      slotType: 'gear',
      cost: 8,
      keywordEffects: {
        uncannyLuckX: 1,
      },
    },
    {
      id: 'stub-shield-generator',
      name: 'Shield Generator',
      slotType: 'generator',
      cost: 20,
      keywordEffects: {
        shieldedX: 2,
      },
    },
  ];
}

/**
 * Stub function to get upgrades filtered by type.
 * 
 * @param slotType - Slot type to filter by
 * @returns Array of defender upgrades for the specified slot type
 */
export function getDefenderUpgradesByType(slotType: string): DefenderUpgrade[] {
  return getDefenderUpgrades().filter(upgrade => upgrade.slotType === slotType);
}

/**
 * Stub function to get a specific defender upgrade by ID.
 * 
 * @param id - Upgrade ID to find
 * @returns DefenderUpgrade object or null if not found
 */
export function getDefenderUpgradeById(id: string): DefenderUpgrade | null {
  return getDefenderUpgrades().find(upgrade => upgrade.id === id) || null;
}

/**
 * Stub function to get all available upgrade slot types.
 * 
 * @returns Array of slot type names
 */
export function getDefenderUpgradeTypes(): string[] {
  const upgrades = getDefenderUpgrades();
  const types = [...new Set(upgrades.map(upgrade => upgrade.slotType))];
  return types.sort();
}

/**
 * Stub function to get upgrades by unit upgrade bar slots.
 * 
 * @param upgradeBar - Array of upgrade slot types available to the unit
 * @returns Array of defender upgrades matching the available slots
 */
export function getDefenderUpgradesByBar(upgradeBar: string[]): DefenderUpgrade[] {
  // Simple implementation for stub data - in Phase 5.5 this will include
  // proper upgrade bar matching logic
  return getDefenderUpgrades().filter(upgrade => 
    upgradeBar.some(barSlot => 
      barSlot === upgrade.slotType || 
      // Generic matching for similar categories
      (barSlot === 'gear' && ['armor', 'gear'].includes(upgrade.slotType)) ||
      (barSlot === 'generator' && upgrade.slotType === 'generator')
    )
  );
}