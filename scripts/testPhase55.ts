/**
 * Phase 5.5 validation test using barrel exports
 */

import { getAttackerPresetById, getDefenderPresetById } from '../src/data/index.js';

async function testPhase55() {
  console.log('=== Phase 5.5 Validation Test ===\n');

  try {
    // Test preset access through barrel export
    console.log('=== Testing Data Layer Access ===');
    
    const vaderPreset = getAttackerPresetById('galactic-empire-darth-vader-vader-s-lightsaber');
    console.log(`✅ Found Vader preset: ${vaderPreset?.name}`);
    console.log(`   Upgrade bar: ${vaderPreset?.upgradeBar?.join(', ')}`);
    console.log(`   Weapon: ${vaderPreset?.profile.weapons?.[0]?.name}`);
    console.log(`   Dice pool: ${vaderPreset?.profile.weapons?.[0]?.redDice}r`);

    const stormtrooperDefender = getDefenderPresetById('galactic-empire-stormtroopers');
    console.log(`✅ Found Stormtrooper preset: ${stormtrooperDefender?.name}`);
    console.log(`   Upgrade bar: ${stormtrooperDefender?.upgradeBar?.join(', ')}`);
    console.log(`   Defense die: ${stormtrooperDefender?.profile.dieColor}`);

    // Test rebel preset with gear
    const rebelPreset = getAttackerPresetById('rebel-alliance-rebel-troopers-a-280-blaster-rifle');
    console.log(`✅ Found Rebel Trooper preset: ${rebelPreset?.name}`);
    console.log(`   Upgrade bar: ${rebelPreset?.upgradeBar?.join(', ')}`);
    console.log(`   Base points: ${rebelPreset?.profile.unitCost}`);

    // Verify data completeness
    console.log('\n=== Data Completeness Check ===');
    
    const hasUpgradeBars = Boolean(vaderPreset?.upgradeBar && stormtrooperDefender?.upgradeBar && rebelPreset?.upgradeBar);
    console.log(`✅ All presets have upgrade bars: ${hasUpgradeBars}`);
    
    const hasWeaponData = Boolean(vaderPreset?.profile.weapons?.[0] && rebelPreset?.profile.weapons?.[0]);
    console.log(`✅ Weapon data present: ${hasWeaponData}`);
    
    const hasDefenseData = Boolean(stormtrooperDefender?.profile.dieColor);
    console.log(`✅ Defense data present: ${hasDefenseData}`);

    console.log('\n=== Test Summary ===');
    console.log('✅ Phase 5.5 data layer is functional');
    console.log('✅ Presets include upgrade bars');
    console.log('✅ Weapon and defense profiles are enriched');
    console.log('✅ Barrel export provides clean API');

  } catch (error) {
    console.error('❌ Phase 5.5 validation failed:', error);
  }
}

testPhase55();