import { useMemo } from 'react';
import {
  AttackSurgeChart,
  MarksmanStrategy,
} from '../../engine/types';
import { getUpgradesForSlot } from '../../data/upgradeResolver';
import { UPGRADE_SLOT_LABELS, type UpgradeSlot } from '../../data/types';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import { useDisplayWeapons } from '../../hooks/useDisplayWeapons';
import NumberSpinner from '../shared/NumberSpinner';
import SectionHeader from '../shared/SectionHeader';
import Select, { type SelectOption } from '../shared/Select';
import SegmentedControl, { type SegmentedControlOption } from '../shared/SegmentedControl';
import Checkbox from '../shared/Checkbox';
import DiceIconDisplay from '../shared/DiceIconDisplay';

const ATTACK_SURGE_OPTIONS: SegmentedControlOption<AttackSurgeChart>[] = [
  { value: AttackSurgeChart.None, label: 'None' },
  { value: AttackSurgeChart.ToHit, label: 'Hit' },
  { value: AttackSurgeChart.ToCrit, label: 'Crit' },
];

const MARKSMAN_STRATEGY_OPTIONS: SegmentedControlOption<MarksmanStrategy>[] = [
  { value: MarksmanStrategy.Deterministic, label: 'Deterministic' },
  { value: MarksmanStrategy.Averages, label: 'Averages' },
];

export default function AttackerUnitBuilderView() {
  const store = useAttackConfigStore();
  const { weapons: displayWeapons, isSingleMini } = useDisplayWeapons();

  const slotRows = useMemo(
    () => store.upgradeBar.map((slot, index) => ({ slot, index })),
    [store.upgradeBar],
  );

  return (
    <>
      <SectionHeader title="Weapons">
        <div className="space-y-2 text-sm text-gray-400">
          {displayWeapons.length === 0 ? (
            <p>No weapons loaded. Select a preset to populate this list.</p>
          ) : (
            displayWeapons.map((weapon) => {
              const isActive = weapon.count > 0;
              return (
                <div
                  key={weapon.name}
                  className={`rounded border px-3 py-2 ${
                    isActive
                      ? 'border-gray-700'
                      : 'border-gray-800 bg-gray-950/60 text-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isSingleMini ? (
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) =>
                            store.setWeaponMiniCount(
                              weapon.name,
                              e.target.checked ? 1 : 0,
                            )
                          }
                          disabled={weapon.minCount > 0}
                          className="h-4 w-4 rounded border-gray-600 bg-gray-800
                                     text-blue-600 focus:ring-2 focus:ring-blue-500
                                     focus:ring-offset-0"
                        />
                      ) : (
                        <NumberSpinner
                          value={weapon.count}
                          onChange={(v) => store.setWeaponMiniCount(weapon.name, v)}
                          min={weapon.minCount}
                          max={weapon.maxCount}
                          compact
                        />
                      )}
                      <span>{weapon.name}</span>
                    </div>
                    <DiceIconDisplay
                      redDice={weapon.redDice}
                      blackDice={weapon.blackDice}
                      whiteDice={weapon.whiteDice}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SectionHeader>

      <SectionHeader title="Upgrade Slots">
        <div className="space-y-3">
          {store.selectedPresetId === null && (
            <p className="text-sm text-gray-500">Select a unit preset to enable upgrade slots.</p>
          )}

          {slotRows.length === 0 && store.selectedPresetId !== null && (
            <p className="text-sm text-gray-500">This unit has no upgrade slots.</p>
          )}

          {slotRows.map(({ slot, index }) => {
            const upgrades = getUpgradesForSlot(slot as UpgradeSlot, store.unitApiId ?? undefined);
            // Deduplicate: keep first occurrence of each upgrade ID
            const uniqueUpgrades = upgrades.filter(
              (u, i, arr) => arr.findIndex(x => x.id === u.id) === i
            );
            const selectedValue = store.equippedUpgradeIds[index] ?? '';
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

      <SectionHeader title="Tokens">
        <div className="space-y-3">
          <NumberSpinner
            label="Aim Tokens"
            value={store.aimTokens}
            onChange={(value) => store.setField('aimTokens', value)}
            min={0}
            max={5}
          />
          <NumberSpinner
            label="Surge Tokens"
            value={store.surgeTokens}
            onChange={(value) => store.setField('surgeTokens', value)}
            min={0}
            max={5}
          />
          <NumberSpinner
            label="Observation Tokens"
            value={store.observationTokens}
            onChange={(value) => store.setField('observationTokens', value)}
            min={0}
            max={5}
          />
          {store.jarKaiMastery && (
            <NumberSpinner
              label="Dodge Tokens (Jar'Kai)"
              value={store.dodgeTokensAttacker}
              onChange={(value) => store.setField('dodgeTokensAttacker', value)}
              min={0}
              max={5}
            />
          )}
        </div>
      </SectionHeader>

      <SectionHeader title="Unit Keywords">
        <div className="space-y-3">
          <SegmentedControl
            label="Attack Surge"
            value={store.surgeChart}
            onChange={(value) => store.setField('surgeChart', value)}
            options={ATTACK_SURGE_OPTIONS}
          />
          <NumberSpinner
            label="Precise X"
            value={store.preciseX}
            onChange={(value) => store.setField('preciseX', value)}
            min={0}
            max={3}
          />
          <NumberSpinner
            label="Sharpshooter X"
            value={store.sharpshooterX}
            onChange={(value) => store.setField('sharpshooterX', value)}
            min={0}
            max={3}
          />
          <NumberSpinner
            label="Arsenal X"
            value={store.arsenalX}
            onChange={(value) => store.setField('arsenalX', value)}
            min={0}
            max={4}
          />

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Checkbox
              label="Marksman"
              value={store.marksman}
              onChange={(value) => store.setField('marksman', value)}
            />
            <Checkbox
              label="Jedi Hunter"
              value={store.jediHunter}
              onChange={(value) => store.setField('jediHunter', value)}
            />
            <Checkbox
              label="Jar'Kai Mastery"
              value={store.jarKaiMastery}
              onChange={(value) => store.setField('jarKaiMastery', value)}
            />
            <Checkbox
              label="Duelist"
              value={store.duelistAttacker}
              onChange={(value) => store.setField('duelistAttacker', value)}
            />
            <Checkbox
              label="Makashi Mastery"
              value={store.makashiMastery}
              onChange={(value) => store.setField('makashiMastery', value)}
            />
            <Checkbox
              label="Death From Above"
              value={store.deathFromAbove}
              onChange={(value) => store.setField('deathFromAbove', value)}
            />
            <Checkbox
              label="Hold the Line"
              value={store.holdTheLine}
              onChange={(value) => store.setField('holdTheLine', value)}
            />
          </div>

          {store.marksman && (
            <SegmentedControl
              label="Marksman Strategy"
              value={store.marksmanStrategy}
              onChange={(value) => store.setField('marksmanStrategy', value)}
              options={MARKSMAN_STRATEGY_OPTIONS}
            />
          )}

          <NumberSpinner
            label="Unit Cost"
            value={store.unitCost}
            onChange={(value) => store.setField('unitCost', value)}
            min={0}
            max={999}
          />
        </div>
      </SectionHeader>
    </>
  );
}
