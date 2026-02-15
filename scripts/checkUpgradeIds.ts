/**
 * Check processed upgrade IDs for enrichment mapping
 */

import upgrades from '../src/data/processed/upgrades.json';

function findKeyUpgrades() {
  // Look for key upgrades from the enrichment plan
  const keyNames = ['targeting scopes', 'force push', 'tenacity', 'impact grenades', 'concussion grenades', 'environmental gear', 'saber throw'];
  
  console.log('=== Finding Key Upgrades for Enrichment ===\n');

  for (const keyName of keyNames) {
    const matches = upgrades.filter(u => u.name.toLowerCase().includes(keyName));
    if (matches.length > 0) {
      console.log(`Key: ${keyName}`);
      matches.forEach(m => console.log(`  - ID: ${m.id}, Name: ${m.name}, Slot: ${m.slot}`));
      console.log('');
    }
  }

  // Also look for dug in upgrades
  console.log('Looking for dug in upgrades...');
  const dugInUpgrades = upgrades.filter(u => u.name.toLowerCase().includes('dug in'));
  dugInUpgrades.forEach(m => console.log(`  - ID: ${m.id}, Name: ${m.name}, Slot: ${m.slot}`));
}

findKeyUpgrades();