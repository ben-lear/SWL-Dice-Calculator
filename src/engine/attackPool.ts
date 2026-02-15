import type { AttackConfig } from './types';
import { AttackDieColor } from './types';

/**
 * Step 2 — Form Attack Pool
 * - Start with the dice specified in attacker config
 * - Apply Spray (multiply by minis in LOS if spray = true)
 */
export function formAttackPool(config: AttackConfig): AttackDieColor[] {
  const { attacker, defender } = config;

  // Base dice counts
  let red = attacker.redDice;
  let black = attacker.blackDice;
  let white = attacker.whiteDice;

  // Spray: multiply weapon dice by minis in LOS
  if (attacker.spray) {
    const multiplier = Math.max(1, defender.minisInLOS);
    red *= multiplier;
    black *= multiplier;
    white *= multiplier;
  }

  // Build pool array
  const pool: AttackDieColor[] = [];
  for (let i = 0; i < red; i++) pool.push('red' as AttackDieColor);
  for (let i = 0; i < black; i++) pool.push('black' as AttackDieColor);
  for (let i = 0; i < white; i++) pool.push('white' as AttackDieColor);

  return pool;
}

/**
 * Step 4a — Upgrade / Downgrade Attack Dice
 * Order: attacker downgrade → defender downgrade → attacker upgrade → defender upgrade
 * Currently no upgrades/downgrades in MVP (Anti-Materiel/Anti-Personnel require unit types)
 */
export function upgradeDowgradeAttackDice(
  pool: AttackDieColor[],
  _config: AttackConfig
): AttackDieColor[] {
  // No modifications in MVP
  return pool;
}
