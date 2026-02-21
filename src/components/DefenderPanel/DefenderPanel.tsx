import { useMemo } from 'react';
import {
  getDefenderPresetById,
  getDefenderPresets,
  getFactionOptions,
} from '../../data/presetHelpers';
import type { Faction } from '../../data/presets';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import SegmentedControl from '../shared/SegmentedControl';
import UnitPresetSection from '../shared/UnitPresetSection';
import PanelShell, { MODE_OPTIONS } from '../shared/PanelShell';
import DefenderCustomPoolView from './DefenderCustomPoolView';
import DefenderDefenseSection from './DefenderDefenseSection';
import DefenderUnitBuilderView from './DefenderUnitBuilderView';

export default function DefenderPanel() {
  const store = useDefenseConfigStore();

  const factionOptions = useMemo(
    () => [
      { value: '', label: 'All Factions' },
      ...getFactionOptions().map((faction) => ({ value: faction.value, label: faction.label })),
    ],
    [],
  );

  const unitOptions = useMemo(() => {
    const presets = getDefenderPresets(store.selectedFaction);

    // 10.1C: Detect name+rank collisions that require subtitle disambiguation
    const nameRankCounts = new Map<string, number>();
    for (const preset of presets) {
      const key = `${preset.name}|${preset.rank}`;
      nameRankCounts.set(key, (nameRankCounts.get(key) ?? 0) + 1);
    }

    return presets.map((preset) => {
      const rankLabel = preset.rank.charAt(0).toUpperCase() + preset.rank.slice(1);
      const key = `${preset.name}|${preset.rank}`;
      const needsSubtitle = (nameRankCounts.get(key) ?? 0) > 1 && preset.title;
      const label = needsSubtitle
        ? `${preset.name}, ${preset.title} (${rankLabel})`
        : `${preset.name} (${rankLabel})`;
      return { value: preset.id, label };
    });
  }, [store.selectedFaction]);

  const handleFactionChange = (value: string) => {
    const newFaction = value === '' ? null : (value as Faction);
    if (newFaction !== store.selectedFaction) {
      // 10.1B: Clear stale unit state when faction changes
      store.clearUnit();
    }
    store.setSelectedFaction(newFaction);
  };

  const handlePresetChange = (presetId: string) => {
    if (!presetId || presetId === '') {
      // 10.1B: Full unit clear instead of just clearing the ID
      store.clearUnit();
      return;
    }
    const preset = getDefenderPresetById(presetId);
    if (preset) {
      store.loadPreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId, {
        rank: preset.rank,
        unitType: preset.unitType,
        affiliation: preset.unitAffiliation,
        faction: preset.faction,
      });
    }
  };

  return (
    <PanelShell title="Defender" collapsible>
        <SegmentedControl
          label="Mode"
          value={store.activeMode}
          onChange={store.setActiveMode}
          options={MODE_OPTIONS}
        />

        {store.activeMode === 'unit-builder' && (
          <UnitPresetSection
            faction={store.selectedFaction ?? ''}
            onFactionChange={handleFactionChange}
            factionOptions={factionOptions}
            unitValue={store.selectedPresetId ?? ''}
            onUnitChange={handlePresetChange}
            unitOptions={unitOptions}
          />
        )}

        {store.activeMode === 'unit-builder' && (
          <>
            <DefenderDefenseSection />
            <DefenderUnitBuilderView />
          </>
        )}
        <DefenderCustomPoolView hideDefense={store.activeMode === 'unit-builder'} />
    </PanelShell>
  );
}
