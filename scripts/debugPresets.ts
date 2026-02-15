/**
 * Debug available presets
 */

import { getAttackerPresets, getDefenderPresets } from '../src/data/index.js';

async function debugPresets() {
  console.log('=== Debugging Available Presets ===\n');

  try {
    const attackerPresets = getAttackerPresets();
    const defenderPresets = getDefenderPresets();

    console.log(`Total attacker presets: ${attackerPresets.length}`);
    console.log(`Total defender presets: ${defenderPresets.length}`);

    // Show first few attacker presets
    console.log('\n=== First 10 Attacker Presets ===');
    attackerPresets.slice(0, 10).forEach(preset => {
      console.log(`- ${preset.id}: ${preset.name}`);
      console.log(`  Upgrade bar: ${preset.upgradeBar?.join(', ') || 'none'}`);
    });

    // Find Rebel presets
    console.log('\n=== Rebel Presets ===');
    const rebelPresets = attackerPresets.filter(p => p.id.includes('rebel'));
    rebelPresets.slice(0, 5).forEach(preset => {
      console.log(`- ${preset.id}: ${preset.name}`);
      console.log(`  Upgrade bar: ${preset.upgradeBar?.join(', ') || 'none'}`);
    });

    // Show first few defender presets
    console.log('\n=== First 10 Defender Presets ===');
    defenderPresets.slice(0, 10).forEach(preset => {
      console.log(`- ${preset.id}: ${preset.name}`);
      console.log(`  Upgrade bar: ${preset.upgradeBar?.join(', ') || 'none'}`);
    });

  } catch (error) {
    console.error('❌ Error debugging presets:', error);
  }
}

debugPresets();