import { useMemo } from 'react';
import { getUpgradesForSlot } from '../../data/upgradeResolver';
import { UPGRADE_SLOT_LABELS, type UpgradeSlot } from '../../data/types';
import SectionHeader from './SectionHeader';
import Select, { type SelectOption } from './Select';

export interface UpgradeSlotsSectionProps {
  selectedPresetId: string | null;
  effectiveUpgradeBar: UpgradeSlot[];
  upgradeBar: UpgradeSlot[];
  equippedUpgradeIds: (string | null)[];
  equipUpgrade: (index: number, upgradeId: string | null) => void;
  unitApiId?: number;
  selectedFaction?: string | null;
  selectedUnitRank?: string | null;
  selectedUnitType?: string | null;
  selectedUnitAffiliation?: string | null;
}

export default function UpgradeSlotsSection({
  selectedPresetId,
  effectiveUpgradeBar,
  upgradeBar,
  equippedUpgradeIds,
  equipUpgrade,
  unitApiId,
  selectedFaction,
  selectedUnitRank,
  selectedUnitType,
  selectedUnitAffiliation,
}: UpgradeSlotsSectionProps) {
  const slotRows = useMemo(
    () => effectiveUpgradeBar.map((slot, index) => ({ slot, index })),
    [effectiveUpgradeBar],
  );

  return (
    <SectionHeader title="Upgrade Slots">
      <div className="space-y-3">
        {selectedPresetId === null && (
          <p className="text-sm text-gray-500">Select a unit preset to enable upgrade slots.</p>
        )}

        {slotRows.length === 0 && selectedPresetId !== null && (
          <p className="text-sm text-gray-500">This unit has no upgrade slots.</p>
        )}

        {slotRows.map(({ slot, index }) => {
          const upgrades = getUpgradesForSlot(slot as UpgradeSlot, {
            unitApiId:   unitApiId ?? undefined,
            faction:     selectedFaction ?? undefined,
            rank:        selectedUnitRank ?? undefined,
            unitType:    selectedUnitType ?? undefined,
            affiliation: selectedUnitAffiliation,
            effectiveUpgradeBar,
          });
          // Deduplicate: keep first occurrence of each upgrade ID
          const uniqueUpgrades = upgrades.filter(
            (u, i, arr) => arr.findIndex(x => x.id === u.id) === i
          );
          const selectedValue = equippedUpgradeIds[index] ?? '';
          const options: SelectOption<string>[] = [
            { value: '', label: 'None' },
            ...uniqueUpgrades.map((upgrade) => ({
              value: upgrade.id,
              label: `${upgrade.name} (${upgrade.cost})`,
            })),
          ];

          return (
            <Select
              key={`${slot}-${index}`}
              label={`${UPGRADE_SLOT_LABELS[slot as UpgradeSlot]}${
                index >= upgradeBar.length ? ' *' : ''
              }`}
              value={selectedValue}
              onChange={(value) => equipUpgrade(index, value === '' ? null : value)}
              options={options}
              disabled={selectedPresetId === null}
            />
          );
        })}
      </div>
    </SectionHeader>
  );
}
