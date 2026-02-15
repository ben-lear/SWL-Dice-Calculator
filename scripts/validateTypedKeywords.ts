/**
 * Smoke validation for processed + enrichment keyword wiring.
 *
 * Usage: npx tsx scripts/validateTypedKeywords.ts
 */

import { getAllResolvedUnits } from '../src/data/unitResolver';
import { generateAllPresets } from '../src/data/presetGenerator';
import { getAllResolvedUpgrades } from '../src/data/upgradeResolver';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function main(): void {
  console.log('=== validateTypedKeywords ===');

  const resolvedUnits = getAllResolvedUnits();
  const resolvedUpgrades = getAllResolvedUpgrades();
  const { attackerPresets, defenderPresets } = generateAllPresets();

  assert(resolvedUnits.length > 0, 'Expected resolved units');
  assert(resolvedUpgrades.length > 0, 'Expected resolved upgrades');
  assert(attackerPresets.length > 0, 'Expected attacker presets');
  assert(defenderPresets.length > 0, 'Expected defender presets');

  const luke = resolvedUnits.find((unit) => unit.id === 'luke-skywalker-jedi-knight');
  assert(luke, 'Expected Luke (Jedi Knight) unit by current slug strategy');

  const targetingScopes = resolvedUpgrades.find((upgrade) => upgrade.id === 'gear-targeting-scopes');
  assert(targetingScopes, 'Expected Targeting Scopes upgrade');

  const dugIn = resolvedUpgrades.find((upgrade) => upgrade.id === 'training-dug-in');
  assert(dugIn, 'Expected Dug In upgrade');

  console.log(`Units: ${resolvedUnits.length}`);
  console.log(`Upgrades: ${resolvedUpgrades.length}`);
  console.log(`Attacker presets: ${attackerPresets.length}`);
  console.log(`Defender presets: ${defenderPresets.length}`);
  console.log('Status: PASS');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Status: FAIL - ${message}`);
  process.exitCode = 1;
}
