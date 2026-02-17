import { useMemo } from 'react';
import { AttackType, RerollStrategy } from '../../engine/types';
import { getAttackerPresetById, getAttackerPresets, getFactionOptions } from '../../data/presetHelpers';
import type { Faction } from '../../data/presets';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import { useAttackTypeStore } from '../../stores/attackTypeStore';
import SearchableCombobox, { type ComboboxOption } from '../shared/SearchableCombobox';
import Select, { type SelectOption } from '../shared/Select';
import SegmentedControl, { type SegmentedControlOption } from '../shared/SegmentedControl';
import SectionHeader from '../shared/SectionHeader';
import AttackerCustomPoolView from './AttackerCustomPoolView';
import AttackerUnitBuilderView from './AttackerUnitBuilderView';

const MODE_OPTIONS: SegmentedControlOption<'custom' | 'unit-builder'>[] = [
  { value: 'custom', label: 'Custom Pool' },
  { value: 'unit-builder', label: 'Unit Builder' },
];

const REROLL_STRATEGY_OPTIONS: SegmentedControlOption<RerollStrategy>[] = [
  { value: RerollStrategy.Conservative, label: 'Conservative' },
  { value: RerollStrategy.CritFishing, label: 'Crit Fishing' },
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

    // Extract unique units (by base unit name, ignoring weapon suffix)
    const uniqueUnits = new Map<string, { value: string; label: string }>();
    for (const preset of filtered) {
      // Extract the unit name without the weapon suffix (e.g., "Darth Vader (Lightsaber)" → "Darth Vader")
      const baseUnitName = preset.name.replace(/\s*\([^)]*\)$/, '');
      const unitKey = `${preset.unitApiId}`;
      
      if (!uniqueUnits.has(unitKey)) {
        // Capitalize rank for display
        const rankLabel = preset.rank.charAt(0).toUpperCase() + preset.rank.slice(1);
        uniqueUnits.set(unitKey, {
          value: preset.id,
          label: `${baseUnitName} (${rankLabel})`,
        });
      }
    }

    return Array.from(uniqueUnits.values());
  }, [attackType, store.selectedFaction]);

  const handlePresetChange = (presetId: string) => {
    const preset = getAttackerPresetById(
      presetId,
      ATTACK_TYPE_TO_PRESET_TYPE[attackType],
    );

    if (preset) {
      store.loadPreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId);
    }
  };

  return (
    <div className="flex flex-col overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 lg:max-h-[calc(100vh-5rem)]" >
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">Attacker</h2>
      </div>

      <div className="space-y-4 px-4 py-4">
        <SegmentedControl
          label="Mode"
          value={store.activeMode}
          onChange={store.setActiveMode}
          options={MODE_OPTIONS}
        />

        <SegmentedControl
          label="Reroll Strategy"
          value={store.rerollStrategy}
          onChange={(value) => store.setField('rerollStrategy', value)}
          options={REROLL_STRATEGY_OPTIONS}
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

        {store.activeMode === 'custom' ? (
          <AttackerCustomPoolView />
        ) : (
          <AttackerUnitBuilderView />
        )}
      </div>
    </div>
  );
}
