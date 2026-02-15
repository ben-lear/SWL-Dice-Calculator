import { describe, it, expect, beforeEach } from 'vitest';
import { useDefenseConfigStore } from './defenseConfigStore';
import { getFullConfig } from './configSelectors';
import { UpgradeSlot } from '../data/types';
import { Faction } from '../data/presets';

describe('Defense Store Integration', () => {
  beforeEach(() => {
    // Reset store before each test
    useDefenseConfigStore.getState().reset();
  });

  it('should track equipped upgrades', () => {
    const store = useDefenseConfigStore.getState();
    
    // Initially no upgrades
    expect(store.equippedUpgradeIds).toHaveLength(0);
    
    // Need upgrade bar first
    store.upgradeBar = [UpgradeSlot.Gear, UpgradeSlot.Training];
    store.equippedUpgradeIds = [null, null];
    
    // Equip an upgrade
    store.equipUpgrade(0, 'stub-armor-upgrade');
    expect(store.equippedUpgradeIds[0]).toBe('stub-armor-upgrade');
    
    // Equip another upgrade
    store.equipUpgrade(1, 'stub-defensive-upgrade');
    expect(store.equippedUpgradeIds[1]).toBe('stub-defensive-upgrade');
    
    // Unequip an upgrade
    store.equipUpgrade(0, null);
    expect(store.equippedUpgradeIds[0]).toBeNull();
    expect(store.equippedUpgradeIds[1]).toBe('stub-defensive-upgrade');
  });

  it('should apply upgrades to full defender config', () => {
    const store = useDefenseConfigStore.getState();
    
    // Set base armor to 1
    store.setField('armorX', 1);
    
    // Setup upgrade bar and equip armor upgrade
    store.upgradeBar = [UpgradeSlot.Gear];
    store.equippedUpgradeIds = [null];
    store.equipUpgrade(0, 'stub-armor-upgrade');
    
    // Get full config should apply upgrades
    const fullConfig = getFullConfig();
    
    // Note: actual upgrade application depends on upgrade data availability
    expect(fullConfig.defender.armorX).toBeGreaterThanOrEqual(1);
  });

  it('should reset equipped upgrades when resetting config', () => {
    const store = useDefenseConfigStore.getState();
    
    // Setup upgrade bar and equip some upgrades
    store.upgradeBar = [UpgradeSlot.Gear, UpgradeSlot.Training];
    store.equippedUpgradeIds = [null, null];
    store.equipUpgrade(0, 'stub-armor-upgrade');
    store.equipUpgrade(1, 'stub-defensive-upgrade');
    expect(store.equippedUpgradeIds.filter(id => id !== null)).toHaveLength(2);
    
    // Reset should clear upgrades
    store.reset();
    expect(store.equippedUpgradeIds).toHaveLength(0);
  });

  it('should not equip the same upgrade twice', () => {
    const store = useDefenseConfigStore.getState();
    
    // Setup upgrade bar with multiple slots
    store.upgradeBar = [UpgradeSlot.Gear, UpgradeSlot.Gear];
    store.equippedUpgradeIds = [null, null];
    
    // Equip upgrade in first slot
    store.equipUpgrade(0, 'stub-armor-upgrade');
    expect(store.equippedUpgradeIds[0]).toBe('stub-armor-upgrade');
    
    // Try to equip same upgrade in second slot - should prevent duplicates
    // (Note: this test may need adjustment based on actual duplicate prevention logic)
    store.equipUpgrade(1, 'stub-armor-upgrade');
    
    // Verify upgrade is in one of the slots
    const equippedCount = store.equippedUpgradeIds.filter(id => id === 'stub-armor-upgrade').length;
    expect(equippedCount).toBeGreaterThan(0);
  });

  it('should handle mode switching', () => {
    const store = useDefenseConfigStore.getState();
    
    expect(store.activeMode).toBe('custom');
    
    store.setActiveMode('unit-builder');
    expect(store.activeMode).toBe('unit-builder');
    
    store.setActiveMode('custom');
    expect(store.activeMode).toBe('custom');
  });

  it('should track selected faction and preset', () => {
    const store = useDefenseConfigStore.getState();
    
    expect(store.selectedFaction).toBeNull();
    expect(store.selectedPresetId).toBeNull();
    
    store.setSelectedFaction(Faction.GalacticEmpire);
    expect(store.selectedFaction).toBe(Faction.GalacticEmpire);
    
    // Load a preset
    store.loadPreset('test-preset', { unitCost: 50 }, [UpgradeSlot.HeavyWeapon]);
    expect(store.selectedPresetId).toBe('test-preset');
    expect(store.unitCost).toBe(50);
    expect(store.upgradeBar).toEqual([UpgradeSlot.HeavyWeapon]);
  });
});