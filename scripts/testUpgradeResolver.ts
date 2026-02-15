/**
 * Test script for upgrade resolver
 */

import { getAllResolvedUpgrades, getResolvedUpgradeById, getUpgradesForSlot } from '../src/data/upgradeResolver.js';
import { UpgradeSlot } from '../src/data/types.js';

async function testUpgradeResolver() {
  console.log('=== Upgrade Resolver Test ===\n');

  try {
    const allUpgrades = getAllResolvedUpgrades();
    console.log(`Total resolved upgrades: ${allUpgrades.length}`);

    // Test enriched upgrades
    const targetingScopes = getResolvedUpgradeById('gear-targeting-scopes');
    if (targetingScopes) {
      console.log('\n=== Enriched Upgrade: Targeting Scopes ===');
      console.log(`Name: ${targetingScopes.name}`);
      console.log(`Cost: ${targetingScopes.cost}`);
      console.log(`Slot: ${targetingScopes.upgradeSlot}`);
      console.log(`isEnriched: ${targetingScopes.isEnriched}`);
      console.log('Keywords:', targetingScopes.keywords);
    }

    // Test slot filtering
    console.log('\n=== Gear Upgrades (sample) ===');
    const gearUpgrades = getUpgradesForSlot(UpgradeSlot.Gear).slice(0, 5);
    gearUpgrades.forEach(u => console.log(`- ${u.name} (${u.cost} pts)`));

    console.log('\n=== Force Upgrades (sample) ===');
    const forceUpgrades = getUpgradesForSlot(UpgradeSlot.Force).slice(0, 5);
    forceUpgrades.forEach(u => console.log(`- ${u.name} (${u.cost} pts)`));

    // Test caching
    console.log('\n=== Testing Cache ===');
    const allUpgrades2 = getAllResolvedUpgrades();
    console.log(`Cache works: ${allUpgrades === allUpgrades2}`);

    console.log('\n=== Enriched Upgrades Summary ===');
    const enriched = allUpgrades.filter(u => u.isEnriched);
    enriched.forEach(u => console.log(`- ${u.name} (${u.upgradeSlot})`));

    // Test slot usage
    console.log('\n=== Slot Distribution (first few) ===');
    const slotCounts: Record<string, number> = {};
    allUpgrades.forEach(u => {
      if (u.upgradeSlot) {
        slotCounts[u.upgradeSlot] = (slotCounts[u.upgradeSlot] || 0) + 1;
      }
    });
    Object.entries(slotCounts).slice(0, 10).forEach(([slot, count]) => 
      console.log(`  - ${slot}: ${count} upgrades`));

  } catch (error) {
    console.error('Error testing upgrade resolver:', error);
  }
}

testUpgradeResolver();