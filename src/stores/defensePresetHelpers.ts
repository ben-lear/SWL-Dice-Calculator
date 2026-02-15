import type { DefenderPreset } from './defenseTypes';
import { DefenseDieColor, DefenseSurgeChart } from '../engine/types';

/**
 * Stub function to get all defender presets.
 * This will be replaced with actual data loading in Phase 5.5.
 * 
 * @returns Array of defender presets (currently returns sample data)
 */
export function getDefenderPresets(): DefenderPreset[] {
  // Phase 5.5: This will load actual preset data from the data layer
  // For now, return minimal sample data to support UI development
  return [
    {
      id: 'stub-stormtrooper',
      name: 'Stormtroopers',
      faction: 'Empire',
      unitType: 'trooper',
      dieColor: DefenseDieColor.White,
      surgeChart: DefenseSurgeChart.None,
      unitCost: 44,
      armorX: 0,
      weakPointX: 0,
      dangerSenseX: 0,
      uncannyLuckX: 0,
      shieldedX: 0,
      immunePierce: false,
      immuneMeleePierce: false,
      immuneBlast: false,
      impervious: false,
      block: false,
      deflect: false,
      shienMastery: false,
      outmaneuver: false,
      lowProfile: false,
      djemSoMastery: false,
      soresuMastery: false,
      duelistDefender: false,
      backup: false,
      holdTheLine: false,
      dugIn: false,
      guardianX: 0,
      guardianDieColor: DefenseDieColor.White,
      guardianSurgeChart: DefenseSurgeChart.None,
      guardianDeflect: false,
      guardianSoresuMastery: false,
      upgradeBar: ['heavy-weapon', 'personnel', 'gear', 'grenades'],
    },
    {
      id: 'stub-rebel-trooper',
      name: 'Rebel Troopers',
      faction: 'Rebel',
      unitType: 'trooper',
      dieColor: DefenseDieColor.White,
      surgeChart: DefenseSurgeChart.None,
      unitCost: 40,
      armorX: 0,
      weakPointX: 0,
      dangerSenseX: 0,
      uncannyLuckX: 0,
      shieldedX: 0,
      immunePierce: false,
      immuneMeleePierce: false,
      immuneBlast: false,
      impervious: false,
      block: false,
      deflect: false,
      shienMastery: false,
      outmaneuver: false,
      lowProfile: false,
      djemSoMastery: false,
      soresuMastery: false,
      duelistDefender: false,
      backup: false,
      holdTheLine: false,
      dugIn: false,
      guardianX: 0,
      guardianDieColor: DefenseDieColor.White,
      guardianSurgeChart: DefenseSurgeChart.None,
      guardianDeflect: false,
      guardianSoresuMastery: false,
      upgradeBar: ['heavy-weapon', 'personnel', 'gear', 'grenades'],
    },
  ];
}

/**
 * Stub function to get defender presets filtered by faction.
 * 
 * @param faction - Faction name to filter by
 * @returns Array of defender presets for the specified faction
 */
export function getDefenderPresetsByFaction(faction: string): DefenderPreset[] {
  return getDefenderPresets().filter(preset => preset.faction === faction);
}

/**
 * Stub function to get a specific defender preset by ID.
 * 
 * @param id - Preset ID to find
 * @returns DefenderPreset object or null if not found
 */
export function getDefenderPresetById(id: string): DefenderPreset | null {
  return getDefenderPresets().find(preset => preset.id === id) || null;
}

/**
 * Stub function to get all available defender factions.
 * 
 * @returns Array of faction names
 */
export function getDefenderFactions(): string[] {
  const presets = getDefenderPresets();
  const factions = [...new Set(presets.map(preset => preset.faction))];
  return factions.sort();
}