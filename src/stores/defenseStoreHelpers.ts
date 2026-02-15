import type { DefenderConfig } from '../engine/types';
import type { DefenderPreset } from './defenseTypes';
import type { UpgradeSlot } from '../data/types';
import { getDefenderPresetById } from './defensePresetHelpers';
import { useDefenseConfigStore } from './defenseConfigStore';

/**
 * Loads a defender preset by ID into the store.
 * This function bridges the preset data layer with the store actions.
 * 
 * @param presetId - ID of the preset to load
 * @returns boolean indicating if the preset was found and loaded
 */
export function loadDefenderPresetById(presetId: string): boolean {
  const preset = getDefenderPresetById(presetId);
  
  if (!preset) {
    console.warn(`Defender preset with ID "${presetId}" not found`);
    return false;
  }
  
  // Convert preset to engine-compatible config
  const config: Partial<DefenderConfig> = {
    dieColor: preset.dieColor,
    surgeChart: preset.surgeChart,
    unitCost: preset.unitCost,
    armorX: preset.armorX,
    weakPointX: preset.weakPointX,
    dangerSenseX: preset.dangerSenseX,
    uncannyLuckX: preset.uncannyLuckX,
    shieldedX: preset.shieldedX,
    immunePierce: preset.immunePierce,
    immuneMeleePierce: preset.immuneMeleePierce,
    immuneBlast: preset.immuneBlast,
    impervious: preset.impervious,
    block: preset.block,
    deflect: preset.deflect,
    shienMastery: preset.shienMastery,
    outmaneuver: preset.outmaneuver,
    lowProfile: preset.lowProfile,
    djemSoMastery: preset.djemSoMastery,
    soresuMastery: preset.soresuMastery,
    duelistDefender: preset.duelistDefender,
    backup: preset.backup,
    holdTheLine: preset.holdTheLine,
    dugIn: preset.dugIn,
    guardianX: preset.guardianX,
    guardianDieColor: preset.guardianDieColor,
    guardianSurgeChart: preset.guardianSurgeChart,
    guardianDeflect: preset.guardianDeflect,
    guardianSoresuMastery: preset.guardianSoresuMastery,
  };
  
  // Load the preset into the store
  useDefenseConfigStore.getState().loadPreset(
    presetId,
    config,
    preset.upgradeBar as UpgradeSlot[],
  );
  
  return true;
}

/**
 * Helper to convert a DefenderPreset to a partial DefenderConfig.
 * Useful for UI components that need to preview preset data.
 * 
 * @param preset - Defender preset to convert
 * @returns Partial DefenderConfig with preset values
 */
export function convertPresetToConfig(preset: DefenderPreset): Partial<DefenderConfig> {
  return {
    dieColor: preset.dieColor,
    surgeChart: preset.surgeChart,
    unitCost: preset.unitCost,
    armorX: preset.armorX,
    weakPointX: preset.weakPointX,
    dangerSenseX: preset.dangerSenseX,
    uncannyLuckX: preset.uncannyLuckX,
    shieldedX: preset.shieldedX,
    immunePierce: preset.immunePierce,
    immuneMeleePierce: preset.immuneMeleePierce,
    immuneBlast: preset.immuneBlast,
    impervious: preset.impervious,
    block: preset.block,
    deflect: preset.deflect,
    shienMastery: preset.shienMastery,
    outmaneuver: preset.outmaneuver,
    lowProfile: preset.lowProfile,
    djemSoMastery: preset.djemSoMastery,
    soresuMastery: preset.soresuMastery,
    duelistDefender: preset.duelistDefender,
    backup: preset.backup,
    holdTheLine: preset.holdTheLine,
    dugIn: preset.dugIn,
    guardianX: preset.guardianX,
    guardianDieColor: preset.guardianDieColor,
    guardianSurgeChart: preset.guardianSurgeChart,
    guardianDeflect: preset.guardianDeflect,
    guardianSoresuMastery: preset.guardianSoresuMastery,
  };
}