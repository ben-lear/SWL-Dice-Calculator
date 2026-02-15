/**
 * Preset helpers - replaces Phase 5B preset helper functions with API-backed data
 * Phase 5.5C.4: Create preset helpers
 */

import type { AttackerPreset, DefenderPreset } from './presets';
import { Faction, FACTION_LABELS } from './presets';
import { generateAllPresets } from './presetGenerator';

// ============================================================================
// Preset Helpers
// ============================================================================

/**
 * Get all attacker presets, optionally filtered by faction.
 */
export function getAttackerPresets(
  faction?: Faction | null,
): AttackerPreset[] {
  const { attackerPresets } = generateAllPresets();
  if (!faction) return attackerPresets;
  return attackerPresets.filter((p) => p.faction === faction);
}

/**
 * Get all defender presets, optionally filtered by faction.
 */
export function getDefenderPresets(
  faction?: Faction | null,
): DefenderPreset[] {
  const { defenderPresets } = generateAllPresets();
  if (!faction) return defenderPresets;
  return defenderPresets.filter((p) => p.faction === faction);
}

/**
 * Find an attacker preset by its ID.
 */
export function getAttackerPresetById(
  id: string,
): AttackerPreset | undefined {
  const { attackerPresets } = generateAllPresets();
  return attackerPresets.find((p) => p.id === id);
}

/**
 * Find a defender preset by its ID.
 */
export function getDefenderPresetById(
  id: string,
): DefenderPreset | undefined {
  const { defenderPresets } = generateAllPresets();
  return defenderPresets.find((p) => p.id === id);
}

/**
 * Get faction options for dropdown display.
 */
export function getFactionOptions(): { value: Faction; label: string }[] {
  return Object.entries(FACTION_LABELS).map(([value, label]) => ({
    value: value as Faction,
    label,
  }));
}