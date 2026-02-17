import { useMemo } from 'react';
import {
  getDefenderPresetById,
  getDefenderPresets,
  getFactionOptions,
} from '../../data/presetHelpers';
import type { Faction } from '../../data/presets';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import SearchableCombobox, { type ComboboxOption } from '../shared/SearchableCombobox';
import SectionHeader from '../shared/SectionHeader';
import Select, { type SelectOption } from '../shared/Select';
import SegmentedControl, { type SegmentedControlOption } from '../shared/SegmentedControl';
import DefenderCustomPoolView from './DefenderCustomPoolView';
import DefenderUnitBuilderView from './DefenderUnitBuilderView';

const MODE_OPTIONS: SegmentedControlOption<'custom' | 'unit-builder'>[] = [
  { value: 'custom', label: 'Custom Pool' },
  { value: 'unit-builder', label: 'Unit Builder' },
];

export default function DefenderPanel() {
  const store = useDefenseConfigStore();

  const factionOptions: SelectOption<string>[] = useMemo(
    () => [
      { value: '', label: 'All Factions' },
      ...getFactionOptions().map((faction) => ({ value: faction.value, label: faction.label })),
    ],
    [],
  );

  const unitOptions: ComboboxOption[] = useMemo(() => {
    const presets = getDefenderPresets(store.selectedFaction);
    return presets.map((preset) => {
      // Capitalize rank for display
      const rankLabel = preset.rank.charAt(0).toUpperCase() + preset.rank.slice(1);
      return {
        value: preset.id,
        label: `${preset.name} (${rankLabel})`,
      };
    });
  }, [store.selectedFaction]);

  const handlePresetChange = (presetId: string) => {
    const preset = getDefenderPresetById(presetId);
    if (preset) {
      store.loadPreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId);
    }
  };

  return (
    <div className="flex flex-col overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 lg:max-h-[calc(100vh-5rem)]" >
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">Defender</h2>
      </div>

      <div className="space-y-4 px-4 py-4">
        <SegmentedControl
          label="Mode"
          value={store.activeMode}
          onChange={store.setActiveMode}
          options={MODE_OPTIONS}
        />

        {store.activeMode === 'unit-builder' && (
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
                label="Unit"
                value={store.selectedPresetId ?? ''}
                onChange={handlePresetChange}
                options={unitOptions}
                placeholder="Search units..."
              />
            </div>
          </SectionHeader>
        )}

        {store.activeMode === 'unit-builder' && <DefenderUnitBuilderView />}
        <DefenderCustomPoolView />
      </div>
    </div>
  );
}
