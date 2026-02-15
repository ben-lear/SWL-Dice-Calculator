/**
 * Test script for preset generator
 */

import { generateAllPresets } from '../src/data/presetGenerator.js';

async function testPresetGenerator() {
  console.log('=== Preset Generator Test ===\n');

  try {
    const presets = generateAllPresets();
    
    console.log(`Total attacker presets: ${presets.attackerPresets.length}`);
    console.log(`Total defender presets: ${presets.defenderPresets.length}`);

    // Test enriched attacker preset
    const vaderLightsaber = presets.attackerPresets.find(p => 
      p.name.includes('Darth Vader') && p.name.includes('Lightsaber')
    );
    if (vaderLightsaber) {
      console.log('\n=== Enriched Attacker: Vader Lightsaber ===');
      console.log(`ID: ${vaderLightsaber.id}`);
      console.log(`Name: ${vaderLightsaber.name}`);
      console.log(`Faction: ${vaderLightsaber.faction}`);
      console.log('Profile:', JSON.stringify(vaderLightsaber.profile, null, 2));
      console.log(`Upgrade bar: ${vaderLightsaber.upgradeBar?.join(', ')}`);
    }

    // Test skeleton attacker preset
    const skeletonPresets = presets.attackerPresets.filter(p => 
      p.name.includes('no weapon data')
    );
    if (skeletonPresets.length > 0) {
      console.log('\n=== Skeleton Attacker Example ===');
      const example = skeletonPresets[0];
      console.log(`Name: ${example.name}`);
      console.log('Weapon dice:', example.profile.weapons?.[0]);
    }

    // Test defender preset
    const vaderDefender = presets.defenderPresets.find(p => 
      p.name.includes('Darth Vader')
    );
    if (vaderDefender) {
      console.log('\n=== Defender: Vader ===');
      console.log(`Name: ${vaderDefender.name}`);
      console.log('Profile:', JSON.stringify(vaderDefender.profile, null, 2));
    }

    // Test caching
    console.log('\n=== Testing Cache ===');
    const presets2 = generateAllPresets();
    console.log(`Cache works: ${presets === presets2}`);

    // Faction distribution
    console.log('\n=== Faction Distribution ===');
    const attackerByFaction: Record<string, number> = {};
    const defenderByFaction: Record<string, number> = {};
    
    presets.attackerPresets.forEach(p => {
      attackerByFaction[p.faction] = (attackerByFaction[p.faction] || 0) + 1;
    });
    
    presets.defenderPresets.forEach(p => {
      defenderByFaction[p.faction] = (defenderByFaction[p.faction] || 0) + 1;
    });

    console.log('Attackers by faction:', attackerByFaction);
    console.log('Defenders by faction:', defenderByFaction);

  } catch (error) {
    console.error('Error testing preset generator:', error);
  }
}

testPresetGenerator();