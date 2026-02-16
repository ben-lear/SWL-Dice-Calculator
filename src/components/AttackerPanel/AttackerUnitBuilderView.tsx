import { useMemo } from 'react';
import {
  AttackSurgeChart,
  MarksmanStrategy,
  RerollStrategy,
} from '../../engine/types';
import { getUpgradesForSlot } from '../../data/upgradeResolver';
import { UPGRADE_SLOT_LABELS, type UpgradeSlot } from '../../data/types';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import NumberSpinner from '../shared/NumberSpinner';
import SectionHeader from '../shared/SectionHeader';
import Select, { type SelectOption } from '../shared/Select';
import Toggle from '../shared/Toggle';

const ATTACK_SURGE_OPTIONS: SelectOption<AttackSurgeChart>[] = [
  { value: AttackSurgeChart.None, label: 'None' },
  { value: AttackSurgeChart.ToHit, label: 'c → a (Hit)' },
  { value: AttackSurgeChart.ToCrit, label: 'c → b (Crit)' },
];

const MARKSMAN_STRATEGY_OPTIONS: SelectOption<MarksmanStrategy>[] = [
  { value: MarksmanStrategy.Deterministic, label: 'Deterministic' },
  { value: MarksmanStrategy.Averages, label: 'Averages' },
];

const REROLL_STRATEGY_OPTIONS: SelectOption<RerollStrategy>[] = [
  { value: RerollStrategy.Conservative, label: 'Conservative' },
  { value: RerollStrategy.CritFishing, label: 'Crit Fishing' },
];

export default function AttackerUnitBuilderView() {
  const store = useAttackConfigStore();

  const slotRows = useMemo(
    () => store.upgradeBar.map((slot, index) => ({ slot, index })),
    [store.upgradeBar],
  );

  return (
    <>
      <SectionHeader title="Weapons">
        <div className="space-y-2 text-sm text-gray-400">
          {store.weapons.length === 0 ? (
            <p>No weapons loaded. Select a preset to populate this list.</p>
          ) : (
            store.weapons.map((weapon, index) => (
              <div
                key={`${weapon.name ?? 'weapon'}-${index}`}
                className={`rounded border px-3 py-2 ${
                  weapon.enabled === false
                    ? 'border-gray-800 bg-gray-950/60 text-gray-500'
                    : 'border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{weapon.name ?? `Weapon ${index + 1}`}</span>
                  <span className="text-gray-500">
                    R{weapon.redDice} B{weapon.blackDice} W{weapon.whiteDice}
                  </span>
                </div>
                <div className="mt-2">
                  <Toggle
                    label="Enabled"
                    value={weapon.enabled !== false}
                    onChange={(value) => store.setWeaponEnabled(index, value)}
                  />
                </div>
              </div>
            ))
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
          <Select
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

          <Toggle
            label="Marksman"
            value={store.marksman}
            onChange={(value) => store.setField('marksman', value)}
          />
          {store.marksman && (
            <Select
              label="Marksman Strategy"
              value={store.marksmanStrategy}
              onChange={(value) => store.setField('marksmanStrategy', value)}
              options={MARKSMAN_STRATEGY_OPTIONS}
            />
          )}

          <Select
            label="Reroll Strategy"
            value={store.rerollStrategy}
            onChange={(value) => store.setField('rerollStrategy', value)}
            options={REROLL_STRATEGY_OPTIONS}
          />

          <Toggle
            label="Jedi Hunter"
            value={store.jediHunter}
            onChange={(value) => store.setField('jediHunter', value)}
          />
          <Toggle
            label="Jar'Kai Mastery"
            value={store.jarKaiMastery}
            onChange={(value) => store.setField('jarKaiMastery', value)}
          />
          <Toggle
            label="Duelist"
            value={store.duelistAttacker}
            onChange={(value) => store.setField('duelistAttacker', value)}
          />
          <Toggle
            label="Makashi Mastery"
            value={store.makashiMastery}
            onChange={(value) => store.setField('makashiMastery', value)}
          />
          <Toggle
            label="Immune: Deflect"
            value={store.immuneDeflect}
            onChange={(value) => store.setField('immuneDeflect', value)}
          />
          <Toggle
            label="Death From Above"
            value={store.deathFromAbove}
            onChange={(value) => store.setField('deathFromAbove', value)}
          />
          <Toggle
            label="Hold the Line"
            value={store.holdTheLine}
            onChange={(value) => store.setField('holdTheLine', value)}
          />
        </div>
      </SectionHeader>

      <SectionHeader title="Points">
        <NumberSpinner
          label="Unit Cost"
          value={store.unitCost}
          onChange={(value) => store.setField('unitCost', value)}
          min={0}
          max={999}
        />
      </SectionHeader>
    </>
  );
}
