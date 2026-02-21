import { useMemo } from 'react';
import { AttackSurgeChart, RerollStrategy } from '../../engine/types';
import { getAttackerPresetById, getAttackerPresets, getFactionOptions } from '../../data/presetHelpers';
import type { AttackerPreset, Faction } from '../../data/presets';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import SegmentedControl, { type SegmentedControlOption } from '../shared/SegmentedControl';
import UnitPresetSection from '../shared/UnitPresetSection';
import PanelShell, { MODE_OPTIONS } from '../shared/PanelShell';
import NumberSpinner from '../shared/NumberSpinner';
import AttackerCustomPoolView from './AttackerCustomPoolView';
import AttackerUnitBuilderView from './AttackerUnitBuilderView';

const REROLL_STRATEGY_OPTIONS: SegmentedControlOption<RerollStrategy>[] = [
  { value: RerollStrategy.Conservative, label: 'Conservative' },
  { value: RerollStrategy.CritFishing, label: 'Crit Fishing' },
];

const ATTACK_SURGE_OPTIONS: SegmentedControlOption<AttackSurgeChart>[] = [
  { value: AttackSurgeChart.None, label: 'None' },
  { value: AttackSurgeChart.ToHit, label: 'Hit' },
  { value: AttackSurgeChart.ToCrit, label: 'Crit' },
];

export default function AttackerPanel() {
  const store = useAttackConfigStore();

  const factionOptions = useMemo(
    () => [
      { value: '', label: 'All Factions' },
      ...getFactionOptions().map((faction) => ({ value: faction.value, label: faction.label })),
    ],
    [],
  );

  const unitOptions = useMemo(() => {
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
    // 10.1D: Don't filter by attack type — load the preset regardless of current attack type
    const preset = getAttackerPresetById(presetId);

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
    <PanelShell title="Attacker" collapsible>
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
          <UnitPresetSection
            faction={store.selectedFaction ?? ''}
            onFactionChange={handleFactionChange}
            factionOptions={factionOptions}
            unitValue={store.selectedPresetId ?? ''}
            onUnitChange={handlePresetChange}
            unitOptions={unitOptions}
          >
            <SegmentedControl
              label="Attack Surge"
              value={store.surgeChart}
              onChange={(value) => store.setField('surgeChart', value)}
              options={ATTACK_SURGE_OPTIONS}
              tooltip="What attack surge results convert to: nothing, hits, or critical hits."
            />
          </UnitPresetSection>
        )}

        {store.activeMode === 'custom' ? (
          <AttackerCustomPoolView />
        ) : (
          <AttackerUnitBuilderView />
        )}

        <div className="border-t border-gray-700 pt-3">
          <NumberSpinner
            label="Unit Cost"
            value={store.unitCost}
            onChange={(value) => store.setField('unitCost', value)}
            min={0}
            max={999}
            tooltip="Points cost of this unit, used for cost-efficiency comparisons in the results panel."
          />
        </div>
    </PanelShell>
  );
}
