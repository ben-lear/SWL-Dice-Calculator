/**
 * Shared weapon utility functions for use across engine, data, and hook layers.
 */

import { AttackType } from './types';

/**
 * Check if a weapon is usable for a given attack type.
 * Handles undefined (always usable) and Hybrid (usable for Ranged + Melee).
 */
export function isWeaponUsableForAttackType(
  weaponType: AttackType | undefined,
  attackType: AttackType,
): boolean {
  if (weaponType === undefined) return true;
  if (weaponType === attackType) return true;
  if (
    weaponType === AttackType.Hybrid &&
    (attackType === AttackType.Ranged || attackType === AttackType.Melee)
  ) {
    return true;
  }
  return false;
}
