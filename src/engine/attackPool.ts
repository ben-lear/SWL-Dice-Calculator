import type { AttackConfig, WeaponProfile, AggregatedWeaponKeywords } from './types';
import { AttackDieColor, AttackType } from './types';
import { isWeaponUsableForAttackType } from './weaponUtils';

export function getWeaponsForAttackType(config: AttackConfig): WeaponProfile[] {
  return config.attacker.weapons.filter((weapon) => {
    if (weapon.enabled === false) {
      return false;
    }

    // Basic attack type compatibility
    if (!isWeaponUsableForAttackType(weapon.weaponType, config.attackType)) {
      return false;
    }
    // Sidearm safety net: exclude sidearm weapons that don't match attack type
    if (weapon.keywords.sidearmMelee && config.attackType !== AttackType.Melee) {
      return false;
    }
    if (weapon.keywords.sidearmRanged && config.attackType !== AttackType.Ranged) {
      return false;
    }
    return true;
  });
}

/**
 * Aggregate weapon keywords across all weapons in an attack pool.
 * - Numeric keywords: summed
 * - blast, suppressive: OR (any weapon has it → pool has it)
 * - highVelocity: AND (all weapons must have it; false if pool is empty)
 *
 * Per-weapon keywords (spray, cumbersome, antiMaterielX, antiPersonnelX)
 * are NOT included — they are handled during pool formation.
 */
export function aggregateWeaponKeywords(
  weapons: WeaponProfile[]
): AggregatedWeaponKeywords {
  if (weapons.length === 0) {
    return {
      criticalX: 0,
      lethalX: 0,
      pierceX: 0,
      impactX: 0,
      ramX: 0,
      ionX: 0,
      blast: false,
      suppressive: false,
      highVelocity: false,
      immuneDeflect: false,
      primitive: false,
    };
  }

  let criticalX = 0;
  let lethalX = 0;
  let pierceX = 0;
  let impactX = 0;
  let ramX = 0;
  let ionX = 0;
  let blast = false;
  let suppressive = false;
  let highVelocity = true; // AND: start true, flip false if any weapon lacks it
  let immuneDeflect = false;
  let primitive = false;

  for (const weapon of weapons) {
    const kw = weapon.keywords;
    criticalX += kw.criticalX;
    lethalX += kw.lethalX;
    pierceX += kw.pierceX;
    impactX += kw.impactX;
    ramX += kw.ramX;
    ionX += kw.ionX;
    blast = blast || kw.blast;
    suppressive = suppressive || kw.suppressive;
    highVelocity = highVelocity && kw.highVelocity;
    immuneDeflect = immuneDeflect || kw.immuneDeflect;
    primitive = primitive || kw.primitive;
  }

  return {
    criticalX,
    lethalX,
    pierceX,
    impactX,
    ramX,
    ionX,
    blast,
    suppressive,
    highVelocity,
    immuneDeflect,
    primitive,
  };
}

/**
 * Step 2 — Form Attack Pool
 *
 * Iterates over all weapons in config.attacker.weapons[].
 * For each weapon:
 *   - If weapon.keywords.spray === true, multiply that weapon's dice
 *     by defender.minisInLOS
 *   - Append the weapon's dice to the pool
 *
 * This correctly handles mixed pools where only some weapons have Spray.
 */
export function formAttackPool(config: AttackConfig): AttackDieColor[] {
  const { defender } = config;
  const pool: AttackDieColor[] = [];
  const weaponsForAttackType = getWeaponsForAttackType(config);

  for (const weapon of weaponsForAttackType) {
    let red = weapon.redDice;
    let black = weapon.blackDice;
    let white = weapon.whiteDice;

    // Spray: multiply THIS weapon's dice by minis in LOS
    if (weapon.keywords.spray) {
      const multiplier = Math.max(1, defender.minisInLOS);
      red *= multiplier;
      black *= multiplier;
      white *= multiplier;
    }

    // Append dice to pool
    for (let i = 0; i < red; i++) pool.push(AttackDieColor.Red);
    for (let i = 0; i < black; i++) pool.push(AttackDieColor.Black);
    for (let i = 0; i < white; i++) pool.push(AttackDieColor.White);
  }

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
