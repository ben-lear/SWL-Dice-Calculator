import { useAttackTypeStore } from '../stores/attackTypeStore';
import {
  ATTACKER_KEYWORD_RESTRICTIONS,
  WEAPON_KEYWORD_RESTRICTIONS,
  DEFENDER_KEYWORD_RESTRICTIONS,
  isFieldActiveForAttackType,
} from '../utils/keywordRestrictions';
import { useDisableAttackTypeRestrictions } from './useDefenderStoreContext';

/**
 * Returns a function that checks if a given attacker unit-level keyword field
 * should be disabled based on the current attack type.
 *
 * Usage:
 * ```tsx
 * const isDisabled = useAttackerKeywordDisabled();
 * <Checkbox label="Duelist" disabled={isDisabled('duelistAttacker')} ... />
 * ```
 */
export function useAttackerKeywordDisabled(): (field: string) => boolean {
  const attackType = useAttackTypeStore((s) => s.attackType);

  return (field: string): boolean => {
    const restriction = ATTACKER_KEYWORD_RESTRICTIONS[field];
    if (!restriction) return false; // Unknown fields are never disabled
    return !isFieldActiveForAttackType(restriction, attackType);
  };
}

/**
 * Returns a function that checks if a given weapon-level keyword field
 * should be disabled based on the current attack type.
 *
 * Usage:
 * ```tsx
 * const isWeaponDisabled = useWeaponKeywordDisabled();
 * <Checkbox label="High Velocity" disabled={isWeaponDisabled('highVelocity')} ... />
 * ```
 */
export function useWeaponKeywordDisabled(): (field: string) => boolean {
  const attackType = useAttackTypeStore((s) => s.attackType);

  return (field: string): boolean => {
    const restriction = WEAPON_KEYWORD_RESTRICTIONS[field];
    if (!restriction) return false;
    return !isFieldActiveForAttackType(restriction, attackType);
  };
}

/**
 * Returns a function that checks if a given defender keyword field
 * should be disabled based on the current attack type.
 * When rendered inside the list analyzer's DefenderStoreContext with
 * disableAttackTypeRestrictions=true, all keywords remain enabled.
 */
export function useDefenderKeywordDisabled(): (field: string) => boolean {
  const attackType = useAttackTypeStore((s) => s.attackType);
  const disabled = useDisableAttackTypeRestrictions();

  return (field: string): boolean => {
    if (disabled) return false; // All keywords enabled in list analyzer
    const restriction = DEFENDER_KEYWORD_RESTRICTIONS[field];
    if (!restriction) return false;
    return !isFieldActiveForAttackType(restriction, attackType);
  };
}
