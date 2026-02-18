import { useMemo } from 'react';
import { RerollStrategy } from '../../engine/types';
import { getAttackerPresetById, getAttackerPresets, getFactionOptions } from '../../data/presetHelpers';
import type { AttackerPreset, Faction } from '../../data/presets';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
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

export default function AttackerPanel() {
  const store = useAttackConfigStore();

  const factionOptions: SelectOption<string>[] = useMemo(
    () => [
      { value: '', label: 'All Factions' },
      ...getFactionOptions().map((faction) => ({ value: faction.value, label: faction.label })),
    ],
    [],
  );

  const unitOptions: ComboboxOption[] = useMemo(() => {
    // 10.1D: No attack type filter in Unit Builder mode — show all units regardless of attack type.
    // The weapon display layer (useDisplayWeapons) handles per-weapon attack type filtering.
    const filtered = getAttackerPresets(store.selectedFaction);

    // Deduplicate by unitApiId (one entry per unit, regardless of how many weapon presets exist)
    const uniqueUnits = new Map<string, AttackerPreset>();
    for (const preset of filtered) {
      const unitKey = `${preset.unitApiId}`;
      if (!uniqueUnits.has(unitKey)) {
        uniqueUnits.set(unitKey, preset);
      }
    }

    // 10.1C: Detect name+rank collisions that require subtitle disambiguation
    const nameRankCounts = new Map<string, number>();
    for (const preset of uniqueUnits.values()) {
      const baseUnitName = preset.name.replace(/\s*\([^)]*\)$/, '');
      const key = `${baseUnitName}|${preset.rank}`;
      nameRankCounts.set(key, (nameRankCounts.get(key) ?? 0) + 1);
    }

    return Array.from(uniqueUnits.values()).map((preset) => {
      const baseUnitName = preset.name.replace(/\s*\([^)]*\)$/, '');
      const rankLabel = preset.rank.charAt(0).toUpperCase() + preset.rank.slice(1);
      const key = `${baseUnitName}|${preset.rank}`;
      const needsSubtitle = (nameRankCounts.get(key) ?? 0) > 1 && preset.title;
      const label = needsSubtitle
        ? `${baseUnitName}, ${preset.title} (${rankLabel})`
        : `${baseUnitName} (${rankLabel})`;
      return { value: preset.id, label };
    });
  }, [store.selectedFaction]);

  const handlePresetChange = (presetId: string) => {
    if (!presetId || presetId === '') {
      // 10.1B: Full unit clear instead of just clearing the ID
      store.clearUnit();
      return;
    }
    // 10.1D: Don't filter by attack type — load the preset regardless of current attack type
    const preset = getAttackerPresetById(presetId);

    if (preset) {
      store.loadPreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId, {
        rank: preset.rank,
        unitType: preset.unitType,
        affiliation: preset.unitAffiliation,
      });
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
                onChange={(value) => {
                  const newFaction = value === '' ? null : (value as Faction);
                  if (newFaction !== store.selectedFaction) {
                    // 10.1B: Clear stale unit state when faction changes
                    store.clearUnit();
                  }
                  store.setSelectedFaction(newFaction);
                }}
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
