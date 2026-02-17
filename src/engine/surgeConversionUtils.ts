import type { AttackerConfig, AggregatedWeaponKeywords, AttackType } from './types';
import { AttackSurgeChart, AttackType as AttackTypeEnum } from './types';

/**
 * Calculate total available surge conversions for the given attacker configuration.
 * 
 * Returns the number of surge conversions available, accounting for (in priority order):
 * 1. Jedi Hunter (unlimited)
 * 2. Unit surge chart (unlimited if ToHit or ToCrit)
 * 3. Critical X from weapon pool (limited)
 * 4. Hold the Line (unlimited, melee only)
 * 5. Surge tokens (limited)
 * 
 * @returns Number of conversions available, or Infinity for unlimited sources
 */
export function calculateAvailableSurgeConversions(
  attacker: AttackerConfig,
  poolKeywords: AggregatedWeaponKeywords,
  attackType: AttackType
): number {
  // Priority 1: Jedi Hunter (unlimited)
  if (attacker.jediHunter) {
    return Infinity;
  }

  // Priority 2: Unit surge chart (unlimited)
  const hasChartConversion =
    attacker.surgeChart === AttackSurgeChart.ToHit ||
    attacker.surgeChart === AttackSurgeChart.ToCrit;
  if (hasChartConversion) {
    return Infinity;
  }

  let availableConversions = 0;

  // Priority 3: Critical X from pool keywords (limited)
  availableConversions += poolKeywords.criticalX;

  // Priority 4: Hold the Line (unlimited, melee only)
  if (attacker.holdTheLine && attackType === AttackTypeEnum.Melee) {
    return Infinity;
  }

  // Priority 5: Surge tokens (limited)
  availableConversions += attacker.surgeTokens;

  return availableConversions;
}

/**
 * Calculate available surge conversions separated by destination type (crit vs hit).
 * 
 * Used for Crit Fishing reroll logic to distinguish surges that would convert to crits
 * (which should be protected from rerolling) versus surges that would convert to hits
 * (which can be rerolled in search of crits).
 * 
 * @returns Object with critConversions and hitConversions counts (Infinity if unlimited)
 */
export function calculateSurgeConversionsByType(
  attacker: AttackerConfig,
  poolKeywords: AggregatedWeaponKeywords,
  attackType: AttackType
): { critConversions: number; hitConversions: number } {
  // Check for unlimited crit sources (highest priority)
  if (attacker.jediHunter) {
    return { critConversions: Infinity, hitConversions: 0 };
  }
  if (attacker.surgeChart === AttackSurgeChart.ToCrit) {
    return { critConversions: Infinity, hitConversions: 0 };
  }

  // Check for unlimited hit sources
  if (attacker.surgeChart === AttackSurgeChart.ToHit) {
    return { critConversions: 0, hitConversions: Infinity };
  }
  if (attacker.holdTheLine && attackType === AttackTypeEnum.Melee) {
    return { critConversions: 0, hitConversions: Infinity };
  }

  // Count limited conversions
  const critConversions = poolKeywords.criticalX;
  const hitConversions = attacker.surgeTokens;

  return { critConversions, hitConversions };
}
