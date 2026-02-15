/**
 * Test script for upgrade applicator
 */

import { applyAttackerUpgrades, applyDefenderUpgrades } from '../src/data/upgradeApplicator.js';

async function testUpgradeApplicator() {
  console.log('=== Upgrade Applicator Test ===\n');

  try {
    // Test base configs
    const attackerConfig = {
      unitCost: 50,
      preciseX: 0,
      marksman: false,
    };

    const defenderConfig = {
      unitCost: 100,
      armorX: 1,
      deflect: false,
    };

    // Test no upgrades
    console.log('=== No Upgrades Test ===');
    const noUpgradesAttacker = applyAttackerUpgrades(attackerConfig, []);
    const noUpgradesDefender = applyDefenderUpgrades(defenderConfig, []);
    
    console.log('No upgrades attacker:', noUpgradesAttacker);
    console.log('No upgrades defender:', noUpgradesDefender);
    console.log('Original attacker unchanged:', attackerConfig.unitCost === 50);
    console.log('Original defender unchanged:', defenderConfig.unitCost === 100);

    // Test null upgrades
    console.log('\n=== Null Upgrades Test ===');
    const nullUpgradesAttacker = applyAttackerUpgrades(attackerConfig, [null, null]);
    console.log('Null upgrades result:', nullUpgradesAttacker);

    // Test enriched upgrade
    console.log('\n=== Enriched Upgrade Test ===');
    const targetingScopesAttacker = applyAttackerUpgrades(attackerConfig, ['gear-targeting-scopes']);
    console.log('With targeting scopes:', targetingScopesAttacker);
    console.log('Precise increased:', targetingScopesAttacker.preciseX === 1);

    // Test non-existent upgrade gracefully handled
    console.log('\n=== Non-existent Upgrade Test ===');
    const badUpgradeResult = applyAttackerUpgrades(attackerConfig, ['does-not-exist']);
    console.log('Non-existent upgrade result:', badUpgradeResult);
    console.log('Only original cost:', badUpgradeResult.unitCost === attackerConfig.unitCost);

    // Test multiple upgrades
    console.log('\n=== Multiple Upgrades Test ===');
    const multipleUpgrades = applyAttackerUpgrades(attackerConfig, [
      'gear-targeting-scopes',
      'force-force-push'
    ]);
    console.log('Multiple upgrades result:', multipleUpgrades);

    // Test defender upgrades with dug in
    console.log('\n=== Defender Dug In Test ===');
    const dugInDefender = applyDefenderUpgrades(defenderConfig, ['training-dug-in']);
    console.log('With dug in upgrade:', dugInDefender);
    console.log('Dug in flag set:', dugInDefender.dugIn === true);

    // Test additive numeric keywords
    console.log('\n=== Additive Keywords Test ===');
    const baseWithPrecise = { ...attackerConfig, preciseX: 1 };
    const additiveResult = applyAttackerUpgrades(baseWithPrecise, ['gear-targeting-scopes']);
    console.log('Base precise 1 + upgrade precise 1 =', additiveResult.preciseX);
    console.log('Additive works:', additiveResult.preciseX === 2);

  } catch (error) {
    console.error('Error testing upgrade applicator:', error);
  }
}

testUpgradeApplicator();