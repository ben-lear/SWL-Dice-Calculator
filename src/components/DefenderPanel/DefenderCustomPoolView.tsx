import {
  CoverType,
  DefenseDieColor,
  DefenseSurgeChart,
} from '../../engine/types';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import NumberSpinner from '../shared/NumberSpinner';
import SectionHeader from '../shared/SectionHeader';
import Select, { type SelectOption } from '../shared/Select';
import Toggle from '../shared/Toggle';

const DEFENSE_DIE_OPTIONS: SelectOption<DefenseDieColor>[] = [
  { value: DefenseDieColor.White, label: 'White' },
  { value: DefenseDieColor.Red, label: 'Red' },
];

const DEFENSE_SURGE_OPTIONS: SelectOption<DefenseSurgeChart>[] = [
  { value: DefenseSurgeChart.None, label: 'None' },
  { value: DefenseSurgeChart.ToBlock, label: 'e → d (Block)' },
];

const COVER_OPTIONS: SelectOption<CoverType>[] = [
  { value: CoverType.None, label: 'None' },
  { value: CoverType.Light, label: 'Light' },
  { value: CoverType.Heavy, label: 'Heavy' },
];

export default function DefenderCustomPoolView() {
  const store = useDefenseConfigStore();

  return (
    <>
      <SectionHeader title="Defense">
        <div className="space-y-3">
          <Toggle
            label="Disable Defense Dice"
            value={store.disableDefenseDice}
            onChange={(value) => store.setField('disableDefenseDice', value)}
          />

          {!store.disableDefenseDice && (
            <>
              <Select
                label="Defense Die Color"
                value={store.dieColor}
                onChange={(value) => store.setField('dieColor', value)}
                options={DEFENSE_DIE_OPTIONS}
              />
              <Select
                label="Surge Chart"
                value={store.surgeChart}
                onChange={(value) => store.setField('surgeChart', value)}
                options={DEFENSE_SURGE_OPTIONS}
              />
            </>
          )}

          <NumberSpinner
            label="Minis in LOS"
            value={store.minisInLOS}
            onChange={(value) => store.setField('minisInLOS', value)}
            min={1}
            max={12}
          />
        </div>
      </SectionHeader>

      <SectionHeader title="Cover">
        <div className="space-y-3">
          <Select
            label="Cover Type"
            value={store.coverType}
            onChange={(value) => store.setField('coverType', value)}
            options={COVER_OPTIONS}
          />
          <NumberSpinner
            label="Cover X"
            value={store.coverX}
            onChange={(value) => store.setField('coverX', value)}
            min={0}
            max={2}
          />
          <NumberSpinner
            label="Smoke Tokens"
            value={store.smokeTokens}
            onChange={(value) => store.setField('smokeTokens', value)}
            min={0}
            max={3}
          />
          <Toggle
            label="Suppressed"
            value={store.suppressed}
            onChange={(value) => store.setField('suppressed', value)}
          />
        </div>
      </SectionHeader>

      <SectionHeader title="Tokens">
        <div className="space-y-3">
          <NumberSpinner
            label="Dodge Tokens"
            value={store.dodgeTokens}
            onChange={(value) => store.setField('dodgeTokens', value)}
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
          {store.dangerSenseX > 0 && (
            <NumberSpinner
              label="Suppression Tokens"
              value={store.suppressionTokens}
              onChange={(value) => store.setField('suppressionTokens', value)}
              min={0}
              max={10}
            />
          )}
        </div>
      </SectionHeader>

      <SectionHeader title="Keywords">
        <div className="space-y-3">
          <NumberSpinner
            label="Armor X"
            value={store.armorX}
            onChange={(value) => store.setField('armorX', value)}
            min={0}
            max={6}
          />
          <NumberSpinner
            label="Weak Point X"
            value={store.weakPointX}
            onChange={(value) => store.setField('weakPointX', value)}
            min={0}
            max={2}
          />
          <NumberSpinner
            label="Danger Sense X"
            value={store.dangerSenseX}
            onChange={(value) => store.setField('dangerSenseX', value)}
            min={0}
            max={5}
          />
          <NumberSpinner
            label="Uncanny Luck X"
            value={store.uncannyLuckX}
            onChange={(value) => store.setField('uncannyLuckX', value)}
            min={0}
            max={5}
          />
          <NumberSpinner
            label="Shielded X"
            value={store.shieldedX}
            onChange={(value) => store.setField('shieldedX', value)}
            min={0}
            max={6}
          />

          <Toggle
            label="Block"
            value={store.block}
            onChange={(value) => store.setField('block', value)}
          />
          <Toggle
            label="Deflect"
            value={store.deflect}
            onChange={(value) => store.setField('deflect', value)}
          />
          {store.deflect && (
            <Toggle
              label="Shien Mastery"
              value={store.shienMastery}
              onChange={(value) => store.setField('shienMastery', value)}
            />
          )}
          <Toggle
            label="Soresu Mastery"
            value={store.soresuMastery}
            onChange={(value) => store.setField('soresuMastery', value)}
          />
          <Toggle
            label="Djem So Mastery"
            value={store.djemSoMastery}
            onChange={(value) => store.setField('djemSoMastery', value)}
          />
          <Toggle
            label="Outmaneuver"
            value={store.outmaneuver}
            onChange={(value) => store.setField('outmaneuver', value)}
          />
          <Toggle
            label="Low Profile"
            value={store.lowProfile}
            onChange={(value) => store.setField('lowProfile', value)}
          />
          <Toggle
            label="Impervious"
            value={store.impervious}
            onChange={(value) => store.setField('impervious', value)}
          />
          <Toggle
            label="Immune: Pierce"
            value={store.immunePierce}
            onChange={(value) => store.setField('immunePierce', value)}
          />
          <Toggle
            label="Immune: Melee Pierce"
            value={store.immuneMeleePierce}
            onChange={(value) => store.setField('immuneMeleePierce', value)}
          />
          <Toggle
            label="Immune: Blast"
            value={store.immuneBlast}
            onChange={(value) => store.setField('immuneBlast', value)}
          />
          <Toggle
            label="Duelist"
            value={store.duelistDefender}
            onChange={(value) => store.setField('duelistDefender', value)}
          />
          <Toggle
            label="Backup"
            value={store.backup}
            onChange={(value) => store.setField('backup', value)}
          />
          <Toggle
            label="Hold the Line"
            value={store.holdTheLine}
            onChange={(value) => store.setField('holdTheLine', value)}
          />
          <Toggle
            label="Dug In"
            value={store.dugIn}
            onChange={(value) => store.setField('dugIn', value)}
          />
        </div>
      </SectionHeader>

      <SectionHeader title="Guardian">
        <div className="space-y-3">
          <NumberSpinner
            label="Guardian X"
            value={store.guardianX}
            onChange={(value) => store.setField('guardianX', value)}
            min={0}
            max={3}
          />

          {store.guardianX > 0 && (
            <>
              <Select
                label="Guardian Die Color"
                value={store.guardianDieColor}
                onChange={(value) => store.setField('guardianDieColor', value)}
                options={DEFENSE_DIE_OPTIONS}
              />
              <Select
                label="Guardian Surge"
                value={store.guardianSurgeChart}
                onChange={(value) => store.setField('guardianSurgeChart', value)}
                options={DEFENSE_SURGE_OPTIONS}
              />
              <Toggle
                label="Guardian Deflect"
                value={store.guardianDeflect}
                onChange={(value) => store.setField('guardianDeflect', value)}
              />
              <Toggle
                label="Guardian Soresu Mastery"
                value={store.guardianSoresuMastery}
                onChange={(value) => store.setField('guardianSoresuMastery', value)}
              />
              <NumberSpinner
                label="Guardian Dodge Tokens"
                value={store.guardianDodgeTokens}
                onChange={(value) => store.setField('guardianDodgeTokens', value)}
                min={0}
                max={5}
              />
            </>
          )}
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
