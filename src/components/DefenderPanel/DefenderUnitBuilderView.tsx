import { useMemo } from 'react';
import { getUpgradesForSlot } from '../../data/upgradeResolver';
import { UPGRADE_SLOT_LABELS, type UpgradeSlot } from '../../data/types';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import SectionHeader from '../shared/SectionHeader';
import Select, { type SelectOption } from '../shared/Select';

export default function DefenderUnitBuilderView() {
  const store = useDefenseConfigStore();

  const slotRows = useMemo(
    () => store.upgradeBar.map((slot, index) => ({ slot, index })),
    [store.upgradeBar],
  );

  return (
    <SectionHeader title="Upgrade Slots">
      <div className="space-y-3">
        {store.selectedPresetId === null && (
          <p className="text-sm text-gray-500">Select a unit preset to enable upgrade slots.</p>
        )}

        {slotRows.length === 0 && store.selectedPresetId !== null && (
          <p className="text-sm text-gray-500">This unit has no upgrade slots.</p>
        )}

        {slotRows.map(({ slot, index }) => {
          const upgrades = getUpgradesForSlot(slot as UpgradeSlot);
          const selectedValue = store.equippedUpgradeIds[index] ?? '';
          const options: SelectOption<string>[] = [
            { value: '', label: 'None' },
            ...upgrades.map((upgrade) => ({
              value: upgrade.id,
              label: `${upgrade.name} (${upgrade.cost})`,
            })),
          ];

          return (
            <Select
              key={`${slot}-${index}`}
              label={UPGRADE_SLOT_LABELS[slot as UpgradeSlot]}
              value={selectedValue}
              onChange={(value) => store.equipUpgrade(index, value === '' ? null : value)}
              options={options}
              disabled={store.selectedPresetId === null}
            />
          );
        })}
      </div>
    </SectionHeader>
  );
}
