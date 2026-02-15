/**
 * Test script for preset helpers
 */

import { 
  getAttackerPresets, 
  getDefenderPresets, 
  getAttackerPresetById, 
  getDefenderPresetById, 
  getFactionOptions 
} from '../src/data/presetHelpers.js';
import { Faction } from '../src/data/presets.js';

async function testPresetHelpers() {
  console.log('=== Preset Helpers Test ===\n');

  try {
    // Test faction filtering
    console.log('=== Faction Filtering ===');
    const allAttackers = getAttackerPresets();
    const empireAttackers = getAttackerPresets(Faction.GalacticEmpire);
    const allDefenders = getDefenderPresets();
    const rebelDefenders = getDefenderPresets(Faction.RebelAlliance);

    console.log(`All attackers: ${allAttackers.length}`);
    console.log(`Empire attackers: ${empireAttackers.length}`);
    console.log(`All defenders: ${allDefenders.length}`);
    console.log(`Rebel defenders: ${rebelDefenders.length}`);

    // Verify faction filtering works
    const empireCheck = empireAttackers.every(p => p.faction === Faction.GalacticEmpire);
    const rebelCheck = rebelDefenders.every(p => p.faction === Faction.RebelAlliance);
    console.log(`Empire filtering correct: ${empireCheck}`);
    console.log(`Rebel filtering correct: ${rebelCheck}`);

    // Test preset lookup by ID
    console.log('\n=== Preset Lookup ===');
    const vaderAttacker = getAttackerPresetById('galactic-empire-darth-vader-vader-s-lightsaber');
    const vaderDefender = getDefenderPresetById('galactic-empire-darth-vader');

    if (vaderAttacker) {
      console.log(`✓ Found Vader attacker: ${vaderAttacker.name}`);
    } else {
      console.log('✗ Vader attacker not found');
    }

    if (vaderDefender) {
      console.log(`✓ Found Vader defender: ${vaderDefender.name}`);
    } else {
      console.log('✗ Vader defender not found');
    }

    // Test faction options
    console.log('\n=== Faction Options ===');
    const factionOptions = getFactionOptions();
    console.log('Faction options:');
    factionOptions.forEach(option => {
      console.log(`  - ${option.value}: ${option.label}`);
    });

    // Test null faction (should return all)
    console.log('\n=== Null Faction Test ===');
    const allAttackersViaNull = getAttackerPresets(null);
    const allDefendersViaNull = getDefenderPresets(null);
    console.log(`Null faction = all attackers: ${allAttackers.length === allAttackersViaNull.length}`);
    console.log(`Null faction = all defenders: ${allDefenders.length === allDefendersViaNull.length}`);

    // Test non-existent ID
    console.log('\n=== Non-existent ID Test ===');
    const notFound = getAttackerPresetById('does-not-exist');
    console.log(`Non-existent ID returns undefined: ${notFound === undefined}`);

  } catch (error) {
    console.error('Error testing preset helpers:', error);
  }
}

testPresetHelpers();