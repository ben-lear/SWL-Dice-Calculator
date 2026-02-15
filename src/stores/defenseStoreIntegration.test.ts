import { describe, it, expect, beforeEach } from 'vitest';
import { useDefenseConfigStore, getFullDefenderConfig } from './defenseConfigStore';

describe('Defense Store Integration', () => {
  beforeEach(() => {
    // Reset store before each test
    useDefenseConfigStore.getState().resetDefenderConfig();
  });

  it('should track equipped upgrades', () => {
    const store = useDefenseConfigStore.getState();
    
    // Initially no upgrades
    expect(store.equippedDefenderUpgradeIds).toHaveLength(0);
    
    // Equip an upgrade
    store.equipDefenderUpgrade('stub-armor-upgrade');
    expect(store.equippedDefenderUpgradeIds).toContain('stub-armor-upgrade');
    
    // Equip another upgrade
    store.equipDefenderUpgrade('stub-defensive-upgrade');
    expect(store.equippedDefenderUpgradeIds).toHaveLength(2);
    
    // Unequip an upgrade
    store.unequipDefenderUpgrade('stub-armor-upgrade');
    expect(store.equippedDefenderUpgradeIds).toHaveLength(1);
    expect(store.equippedDefenderUpgradeIds).not.toContain('stub-armor-upgrade');
  });

  it('should apply upgrades to full defender config', () => {
    const store = useDefenseConfigStore.getState();
    
    // Set base armor to 1
    store.setField('armorX', 1);
    
    // Equip armor upgrade that adds +1 armor
    store.equipDefenderUpgrade('stub-armor-upgrade');
    
    // Get full config should apply upgrades
    const fullConfig = getFullDefenderConfig();
    
    // Should have base armor (1) + upgrade armor (1) = 2
    expect(fullConfig.armorX).toBe(2);
  });

  it('should reset equipped upgrades when resetting config', () => {
    const store = useDefenseConfigStore.getState();
    
    // Equip some upgrades
    store.equipDefenderUpgrade('stub-armor-upgrade');
    store.equipDefenderUpgrade('stub-defensive-upgrade');
    expect(store.equippedDefenderUpgradeIds).toHaveLength(2);
    
    // Reset should clear upgrades
    store.resetDefenderConfig();
    expect(store.equippedDefenderUpgradeIds).toHaveLength(0);
  });

  it('should not equip the same upgrade twice', () => {
    const store = useDefenseConfigStore.getState();
    
    // Equip upgrade twice
    store.equipDefenderUpgrade('stub-armor-upgrade');
    store.equipDefenderUpgrade('stub-armor-upgrade');
    
    // Should only appear once in the list
    expect(store.equippedDefenderUpgradeIds).toHaveLength(1);
    expect(store.equippedDefenderUpgradeIds).toContain('stub-armor-upgrade');
  });

  it('should handle mode switching', () => {
    const store = useDefenseConfigStore.getState();
    
    expect(store.activeDefenderMode).toBe('custom');
    
    store.setDefenderMode('unit-builder');
    expect(store.activeDefenderMode).toBe('unit-builder');
    
    store.setDefenderMode('custom');
    expect(store.activeDefenderMode).toBe('custom');
  });

  it('should track selected faction and preset', () => {
    const store = useDefenseConfigStore.getState();
    
    expect(store.selectedDefenderFaction).toBeNull();
    expect(store.selectedDefenderPresetId).toBeNull();
    
    store.setDefenderFaction('Empire');
    expect(store.selectedDefenderFaction).toBe('Empire');
    
    // Load a preset
    store.loadDefenderPreset('test-preset', { unitCost: 50 }, ['heavy-weapon']);
    expect(store.selectedDefenderPresetId).toBe('test-preset');
    expect(store.unitCost).toBe(50);
    expect(store.defenderUpgradeBar).toEqual(['heavy-weapon']);
  });
});