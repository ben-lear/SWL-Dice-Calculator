import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ResolvedListUnit } from '../data/listTypes';
import type { AttackerPreset, DefenderPreset } from '../data/presets';
import {
  getAttackerPresets,
  getDefenderPresetById,
} from '../data/presetHelpers';
import { useAttackConfigStore } from '../stores/attackConfigStore';
import { useDefenseConfigStore } from '../stores/defenseConfigStore';
import { getResolvedUpgradeById } from '../data/upgradeResolver';

/**
 * Hook that returns callbacks to navigate to the simulator page
 * with a list-analyzer unit pre-loaded as attacker or defender.
 *
 * Flow:
 * 1. Find a matching preset (by unit slug id)
 * 2. Load the preset into the appropriate store
 * 3. Re-equip any upgrades the user had selected in the list
 * 4. Navigate to "/"
 */
export function useNavigateToSimulator() {
  const navigate = useNavigate();
  const loadAttackPreset = useAttackConfigStore((s) => s.loadPreset);
  const equipAttackUpgrade = useAttackConfigStore((s) => s.equipUpgrade);
  const loadDefensePreset = useDefenseConfigStore((s) => s.loadPreset);
  const equipDefenseUpgrade = useDefenseConfigStore((s) => s.equipUpgrade);

  const navigateAsAttacker = useCallback(
    (unit: ResolvedListUnit) => {
      const resolved = unit.resolvedUnit;
      if (!resolved) return;

      // Find first attacker preset for this unit
      const allAttacker = getAttackerPresets();
      const preset: AttackerPreset | undefined = allAttacker.find(
        (p) => p.unitApiId === resolved.apiId,
      );

      if (!preset) return;

      loadAttackPreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId, {
        rank: preset.rank,
        unitType: preset.unitType,
        affiliation: preset.unitAffiliation,
        faction: preset.faction,
      });

      // Re-equip upgrades from the list
      equipMatchingUpgrades(unit, preset.upgradeBar.length, (idx, id) =>
        equipAttackUpgrade(idx, id),
      );

      navigate('/');
    },
    [navigate, loadAttackPreset, equipAttackUpgrade],
  );

  const navigateAsDefender = useCallback(
    (unit: ResolvedListUnit) => {
      const resolved = unit.resolvedUnit;
      if (!resolved) return;

      const preset: DefenderPreset | undefined = getDefenderPresetById(
        resolved.id,
      );

      if (!preset) return;

      loadDefensePreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId, {
        rank: preset.rank,
        unitType: preset.unitType,
        affiliation: preset.unitAffiliation,
        faction: preset.faction,
      });

      // Re-equip upgrades from the list
      equipMatchingUpgrades(unit, preset.upgradeBar.length, (idx, id) =>
        equipDefenseUpgrade(idx, id),
      );

      navigate('/');
    },
    [navigate, loadDefensePreset, equipDefenseUpgrade],
  );

  return { navigateAsAttacker, navigateAsDefender };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * For each resolved upgrade in the unit, find the matching slot in the
 * preset's upgrade bar and equip it. Uses the slotMapping from the list
 * matcher when available, otherwise falls back to finding the first open
 * slot of the correct type.
 */
function equipMatchingUpgrades(
  unit: ResolvedListUnit,
  slotCount: number,
  equip: (slotIndex: number, upgradeId: string) => void,
) {
  const equipped = new Set<number>();

  for (let i = 0; i < unit.resolvedUpgrades.length; i++) {
    const upg = unit.resolvedUpgrades[i];
    if (!upg) continue;

    // Verify the upgrade exists in the resolver (defensive check)
    const checked = getResolvedUpgradeById(upg.id);
    if (!checked) continue;

    const slotIdx = unit.slotMapping[i];
    if (slotIdx !== undefined && slotIdx >= 0 && slotIdx < slotCount && !equipped.has(slotIdx)) {
      equip(slotIdx, upg.id);
      equipped.add(slotIdx);
    }
  }
}
