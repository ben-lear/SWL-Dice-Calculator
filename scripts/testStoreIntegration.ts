/**
 * Test script for store integration with Phase 5.5
 */

import { useAttackConfigStore } from '../src/stores/attackConfigStore.js';
import { useDefenseConfigStore } from '../src/stores/defenseConfigStore.js';
import { getFullConfig } from '../src/stores/configSelectors.js';
import { getAttackerPresetById, getDefenderPresetById } from '../src/data/presetHelpers.js';
import { UpgradeSlot } from '../src/data/types.js';

async function testStoreIntegration() {
  console.log('=== Store Integration Test ===\n');

  try {
    // Test loading a preset with upgrade bar
    console.log('=== Testing Preset Loading ===');
    const vaderPreset = getAttackerPresetById('galactic-empire-darth-vader-vader-s-lightsaber');
    const vaderDefenderPreset = getDefenderPresetById('galactic-empire-darth-vader');

    if (!vaderPreset || !vaderDefenderPreset) {
      throw new Error('Could not find Vader presets');
    }

    console.log(`Vader attacker preset found: ${vaderPreset.name}`);
    console.log(`Upgrade bar: ${vaderPreset.upgradeBar?.join(', ')}`);
    console.log(`Vader defender preset found: ${vaderDefenderPreset.name}`);
    console.log(`Defender upgrade bar: ${vaderDefenderPreset.upgradeBar?.join(', ')}`);

    // Load the presets into stores
    useAttackConfigStore.getState().loadPreset(
      vaderPreset.id, 
      vaderPreset.profile, 
      vaderPreset.upgradeBar
    );

    useDefenseConfigStore.getState().loadPreset(
      vaderDefenderPreset.id,
      vaderDefenderPreset.profile,
      vaderDefenderPreset.upgradeBar
    );

    // Check store state
    const attackState = useAttackConfigStore.getState();
    const defenseState = useDefenseConfigStore.getState();

    console.log('\n=== Store State After Loading ===');
    console.log(`Attack store upgrade bar: ${attackState.upgradeBar.join(', ')}`);
    console.log(`Attack store equipped upgrades: ${attackState.equippedUpgradeIds.length} slots`);
    console.log(`Defense store upgrade bar: ${defenseState.upgradeBar.join(', ')}`);
    console.log(`Defense store equipped upgrades: ${defenseState.equippedUpgradeIds.length} slots`);

    // Test equipping an upgrade
    console.log('\n=== Testing Upgrade Equipment ===');
    if (attackState.upgradeBar.includes(UpgradeSlot.Gear)) {
      const gearSlotIndex = attackState.upgradeBar.indexOf(UpgradeSlot.Gear);
      useAttackConfigStore.getState().equipUpgrade(gearSlotIndex, 'gear-targeting-scopes');
      
      const newAttackState = useAttackConfigStore.getState();
      console.log(`Equipped targeting scopes in slot ${gearSlotIndex}`);
      console.log(`Equipped upgrade: ${newAttackState.equippedUpgradeIds[gearSlotIndex]}`);
    }

    // Test getFullConfig with upgrades
    console.log('\n=== Testing getFullConfig ===');
    const fullConfig = getFullConfig();
    
    console.log('Attacker config (with upgrades):');
    console.log(`  - Unit cost: ${fullConfig.attacker.unitCost}`);
    console.log(`  - Precise X: ${fullConfig.attacker.preciseX}`);
    console.log(`  - Weapon count: ${fullConfig.attacker.weapons.length}`);
    if (fullConfig.attacker.weapons.length > 0) {
      console.log(`  - First weapon: ${fullConfig.attacker.weapons[0].name}`);
      console.log(`  - Weapon dice: ${fullConfig.attacker.weapons[0].redDice}r ${fullConfig.attacker.weapons[0].blackDice}b ${fullConfig.attacker.weapons[0].whiteDice}w`);
    }

    console.log('\nDefender config (with upgrades):');
    console.log(`  - Unit cost: ${fullConfig.defender.unitCost}`);
    console.log(`  - Defense die color: ${fullConfig.defender.dieColor}`);
    console.log(`  - Minis in LOS: ${fullConfig.defender.minisInLOS}`);

    // Test reset
    console.log('\n=== Testing Reset ===');
    useAttackConfigStore.getState().reset();
    useDefenseConfigStore.getState().reset();

    const resetAttackState = useAttackConfigStore.getState();
    const resetDefenseState = useDefenseConfigStore.getState();

    console.log(`Attack state reset - upgrade bar length: ${resetAttackState.upgradeBar.length}`);
    console.log(`Defense state reset - upgrade bar length: ${resetDefenseState.upgradeBar.length}`);

  } catch (error) {
    console.error('Error testing store integration:', error);
  }
}

testStoreIntegration();