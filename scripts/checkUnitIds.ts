/**
 * Check processed unit IDs for enrichment mapping
 */

import units from '../src/data/processed/units.json';

function findKeyUnits() {
  // Look for key units from the enrichment plan
  const keyNames = ['vader', 'stormtroopers', 'luke', 'rebel troopers', 'clone troopers', 'b1 battle droids', 'shore troopers'];
  
  console.log('=== Finding Key Units for Enrichment ===\n');

  for (const keyName of keyNames) {
    const matches = units.filter(u => u.name.toLowerCase().includes(keyName));
    if (matches.length > 0) {
      console.log(`Key: ${keyName}`);
      matches.forEach(m => console.log(`  - ID: ${m.id}, Name: ${m.name}, Faction: ${m.faction}`));
      console.log('');
    }
  }

  // Also look for AAT
  console.log('Looking for AAT vehicles...');
  const aats = units.filter(u => u.name.toLowerCase().includes('aat') || u.name.toLowerCase().includes('trade federation battle tank'));
  aats.forEach(m => console.log(`  - ID: ${m.id}, Name: ${m.name}, Faction: ${m.faction}`));
}

findKeyUnits();