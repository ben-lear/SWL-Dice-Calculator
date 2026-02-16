import { useMemo } from 'react';
import { AttackType } from '../../engine/types';
import { getAttackerPresetById, getAttackerPresets, getFactionOptions } from '../../data/presetHelpers';
import type { Faction } from '../../data/presets';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import { useAttackTypeStore } from '../../stores/attackTypeStore';
import SearchableCombobox, { type ComboboxOption } from '../shared/SearchableCombobox';
import Select, { type SelectOption } from '../shared/Select';
import SectionHeader from '../shared/SectionHeader';
import AttackerCustomPoolView from './AttackerCustomPoolView';
import AttackerUnitBuilderView from './AttackerUnitBuilderView';

const MODE_OPTIONS: SelectOption<'custom' | 'unit-builder'>[] = [
  { value: 'custom', label: 'Custom Pool' },
  { value: 'unit-builder', label: 'Unit Builder' },
];

const ATTACK_TYPE_TO_PRESET_TYPE: Record<AttackType, AttackType> = {
  [AttackType.Ranged]: AttackType.Ranged,
  [AttackType.Melee]: AttackType.Melee,
  [AttackType.Hybrid]: AttackType.Ranged,
  [AttackType.Overrun]: AttackType.Overrun,
};

export default function AttackerPanel() {
  const store = useAttackConfigStore();
  const attackType = useAttackTypeStore((state) => state.attackType);

  const factionOptions: SelectOption<string>[] = useMemo(
    () => [
      { value: '', label: 'All Factions' },
      ...getFactionOptions().map((faction) => ({ value: faction.value, label: faction.label })),
    ],
    [],
  );

  const unitOptions: ComboboxOption[] = useMemo(() => {
    const filtered = getAttackerPresets(
      store.selectedFaction,
      ATTACK_TYPE_TO_PRESET_TYPE[attackType],
    );

    return [
      { value: '', label: 'Custom' },
      ...filtered.map((preset) => ({ value: preset.id, label: preset.name })),
    ];
  }, [attackType, store.selectedFaction]);

  const handlePresetChange = (presetId: string) => {
    if (presetId === '') {
      store.setSelectedPresetId(null);
      return;
    }

    const preset = getAttackerPresetById(
      presetId,
      ATTACK_TYPE_TO_PRESET_TYPE[attackType],
    );

    if (preset) {
      store.loadPreset(preset.id, preset.profile, preset.upgradeBar);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-lg border border-gray-800 bg-gray-900">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">Attacker</h2>
      </div>

      <div className="space-y-4 px-4 py-4">
        <Select
          label="Mode"
          value={store.activeMode}
          onChange={store.setActiveMode}
          options={MODE_OPTIONS}
        />

        <SectionHeader title="Unit Preset">
          <div className="space-y-3">
            <Select
              label="Faction"
              value={store.selectedFaction ?? ''}
              onChange={(value) =>
                store.setSelectedFaction(value === '' ? null : (value as Faction))
              }
              options={factionOptions}
            />
            <SearchableCombobox
              label="Unit / Weapon"
              value={store.selectedPresetId ?? ''}
              onChange={handlePresetChange}
              options={unitOptions}
              placeholder="Search units..."
            />
          </div>
        </SectionHeader>

        {store.activeMode === 'custom' ? (
          <AttackerCustomPoolView />
        ) : (
          <AttackerUnitBuilderView />
        )}
      </div>
    </div>
  );
}
