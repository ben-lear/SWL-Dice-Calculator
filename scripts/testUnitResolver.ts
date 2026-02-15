/**
 * Test script for unit resolver
 */

import { getAllResolvedUnits, getResolvedUnitById } from '../src/data/unitResolver.js';

async function testUnitResolver() {
  console.log('=== Unit Resolver Test ===\n');

  try {
    const allUnits = getAllResolvedUnits();
    console.log(`Total resolved units: ${allUnits.length}`);

    // Test enriched units
    const vaderUnit = getResolvedUnitById('galactic-empire-darth-vader');
    if (vaderUnit) {
      console.log('\n=== Enriched Unit: Vader ===');
      console.log(`Name: ${vaderUnit.name}`);
      console.log(`isEnriched: ${vaderUnit.isEnriched}`);
      console.log(`Weapons count: ${vaderUnit.weapons.length}`);
      console.log(`Defense surge chart: ${vaderUnit.defenseSurgeChart}`);
      console.log('Keywords:', vaderUnit.keywords);
      if (vaderUnit.weapons.length > 0) {
        console.log('Weapon 1:', vaderUnit.weapons[0]);
      }
    }

    // Test non-enriched unit
    const allUnenriched = allUnits.filter(u => !u.isEnriched);
    if (allUnenriched.length > 0) {
      console.log('\n=== Non-Enriched Unit Example ===');
      const example = allUnenriched[0];
      console.log(`Name: ${example.name}`);
      console.log(`isEnriched: ${example.isEnriched}`);
      console.log(`Weapons count: ${example.weapons.length}`);
      console.log(`Defense surge chart: ${example.defenseSurgeChart}`);
      console.log('Keywords:', example.keywords);
    }

    // Test caching
    console.log('\n=== Testing Cache ===');
    const allUnits2 = getAllResolvedUnits();
    console.log(`Cache works: ${allUnits === allUnits2}`);

    console.log('\n=== Enriched Units Summary ===');
    const enriched = allUnits.filter(u => u.isEnriched);
    enriched.forEach(u => console.log(`- ${u.name} (${u.weapons.length} weapons)`));

  } catch (error) {
    console.error('Error testing unit resolver:', error);
  }
}

testUnitResolver();