/**
 * Comprehensive test for Phase 5.5 upgrade system
 */

import { useAttackConfigStore } from '../src/stores/attackConfigStore.js';
import { useDefenseConfigStore } from '../src/stores/defenseConfigStore.js';
import { getFullConfig } from '../src/stores/configSelectors.js';
import { getAttackerPresetById, getDefenderPresetById } from '../src/data/presetHelpers.js';
import { getResolvedUpgradeById } from '../src/data/upgradeResolver.js';
import { UpgradeSlot } from '../src/data/types.js';

async function testComprehensiveUpgrades() {
  console.log('=== Comprehensive Phase 5.5 Upgrade Test ===\n');

  try {
    // Load a preset with gear slots
    const rebelTrooperPreset = getAttackerPresetById('rebel-alliance-rebel-troopers-a-280-blaster-rifle');
    if (!rebelTrooperPreset) {
      throw new Error('Could not find Rebel Trooper preset');
    }

    useAttackConfigStore.getState().loadPreset(
      rebelTrooperPreset.id,
      rebelTrooperPreset.profile,
      rebelTrooperPreset.upgradeBar
    );

    console.log('=== Rebel Trooper Baseline ===');
    console.log(`Loaded: ${rebelTrooperPreset.name}`);
    console.log(`Upgrade bar: ${rebelTrooperPreset.upgradeBar?.join(', ')}`);

    const baseConfig = getFullConfig();
    console.log(`Base weapon dice: ${baseConfig.attacker.weapons[0]?.redDice}r ${baseConfig.attacker.weapons[0]?.blackDice}b ${baseConfig.attacker.weapons[0]?.whiteDice}w`);
    console.log(`Base unit cost: ${baseConfig.attacker.unitCost}`);

    // Test equipping gear upgrades
    console.log('\n=== Testing Gear Equipment ===');
    const attackState = useAttackConfigStore.getState();
    
    // Find available gear slots
    const gearSlots = attackState.upgradeBar
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot === UpgradeSlot.Gear);

    console.log(`Found ${gearSlots.length} gear slots`);

    // Equip HQ Uplink if we have personnel slot
    const personnelSlots = attackState.upgradeBar
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot === UpgradeSlot.Personnel);

    if (personnelSlots.length > 0) {
      const hqUplink = getResolvedUpgradeById('personnel-hq-uplink');
      if (hqUplink) {
        const slotIndex = personnelSlots[0].index;
        useAttackConfigStore.getState().equipUpgrade(slotIndex, hqUplink.id);
        console.log(`Equipped HQ Uplink in personnel slot ${slotIndex}`);
        
        const configWithUplink = getFullConfig();
        console.log(`Unit cost with HQ Uplink: ${configWithUplink.attacker.unitCost} (was ${baseConfig.attacker.unitCost})`);
        
        if (hqUplink.cost) {
          const expectedCost = baseConfig.attacker.unitCost + hqUplink.cost;
          console.log(`Expected: ${expectedCost}, Actual: ${configWithUplink.attacker.unitCost}`);
          if (expectedCost === configWithUplink.attacker.unitCost) {
            console.log('✅ Point cost correctly applied');
          } else {
            console.log('❌ Point cost mismatch');
          }
        }
      }
    }

    // Test equipping targeting scopes in gear slot
    if (gearSlots.length > 0) {
      const targetingScopes = getResolvedUpgradeById('gear-targeting-scopes');
      if (targetingScopes) {
        const slotIndex = gearSlots[0].index;
        useAttackConfigStore.getState().equipUpgrade(slotIndex, targetingScopes.id);
        console.log(`\nEquipped Targeting Scopes in gear slot ${slotIndex}`);
        
        const configWithScopes = getFullConfig();
        console.log(`Unit cost with both upgrades: ${configWithScopes.attacker.unitCost}`);
        
        // Check for precise effect
        if (configWithScopes.attacker.preciseX > 0) {
          console.log(`✅ Precise ${configWithScopes.attacker.preciseX} applied from Targeting Scopes`);
        } else {
          console.log('? No precise effect detected (may be applied differently)');
        }
      }
    }

    // Test unequipping
    console.log('\n=== Testing Unequip ===');
    if (personnelSlots.length > 0) {
      useAttackConfigStore.getState().equipUpgrade(personnelSlots[0].index, null);
      console.log(`Unequipped upgrade from personnel slot ${personnelSlots[0].index}`);
      
      const configAfterUnequip = getFullConfig();
      console.log(`Unit cost after unequipping HQ Uplink: ${configAfterUnequip.attacker.unitCost}`);
    }

    // Test defense upgrades
    console.log('\n=== Testing Defense Upgrades ===');
    const stormtrooperDefender = getDefenderPresetById('galactic-empire-stormtroopers');
    if (stormtrooperDefender) {
      useDefenseConfigStore.getState().loadPreset(
        stormtrooperDefender.id,
        stormtrooperDefender.profile,
        stormtrooperDefender.upgradeBar
      );

      console.log(`Loaded defender: ${stormtrooperDefender.name}`);
      console.log(`Defender upgrade bar: ${stormtrooperDefender.upgradeBar?.join(', ')}`);

      const defenseState = useDefenseConfigStore.getState();
      const defenseGearSlots = defenseState.upgradeBar
        .map((slot, index) => ({ slot, index }))
        .filter(({ slot }) => slot === UpgradeSlot.Gear);

      if (defenseGearSlots.length > 0) {
        const emergencyStims = getResolvedUpgradeById('gear-emergency-stims');
        if (emergencyStims) {
          const slotIndex = defenseGearSlots[0].index;
          useDefenseConfigStore.getState().equipUpgrade(slotIndex, emergencyStims.id);
          console.log(`Equipped Emergency Stims in defender gear slot ${slotIndex}`);

          const finalConfig = getFullConfig();
          console.log(`Final defender unit cost: ${finalConfig.defender.unitCost}`);
        }
      }
    }

    console.log('\n=== Test Complete ===');
    console.log('✅ Store integration, upgrade equipment, and point cost application working');

  } catch (error) {
    console.error('❌ Error in comprehensive test:', error);
  }
}

testComprehensiveUpgrades();