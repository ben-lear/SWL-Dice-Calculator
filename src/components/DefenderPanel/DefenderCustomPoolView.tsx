import {
  CoverType,
  DefenseDieColor,
  DefenseSurgeChart,
} from '../../engine/types';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import NumberSpinner from '../shared/NumberSpinner';
import SectionHeader from '../shared/SectionHeader';
import Select from '../shared/Select';
import SegmentedControl, { type SegmentedControlOption } from '../shared/SegmentedControl';
import Toggle from '../shared/Toggle';
import Checkbox from '../shared/Checkbox';

// UI-only type for defense die selector (includes 'none' option)
type DefenseDieOption = 'none' | DefenseDieColor;

const DEFENSE_DIE_OPTIONS: SegmentedControlOption<DefenseDieOption>[] = [
  { value: 'none', label: 'None' },
  { value: DefenseDieColor.White, label: 'White' },
  { value: DefenseDieColor.Red, label: 'Red' },
];

// Guardian die color options (no 'none' option for Guardian)
const GUARDIAN_DIE_OPTIONS = [
  { value: DefenseDieColor.White, label: 'White' },
  { value: DefenseDieColor.Red, label: 'Red' },
];

const DEFENSE_SURGE_OPTIONS: SegmentedControlOption<DefenseSurgeChart>[] = [
  { value: DefenseSurgeChart.None, label: 'None' },
  { value: DefenseSurgeChart.ToBlock, label: 'Block' },
];

const COVER_OPTIONS: SegmentedControlOption<CoverType>[] = [
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
          <SegmentedControl
            label="Defense Die"
            value={store.disableDefenseDice ? 'none' : store.dieColor}
            onChange={(value: DefenseDieOption) => {
              if (value === 'none') {
                store.setField('disableDefenseDice', true);
              } else {
                store.setField('disableDefenseDice', false);
                store.setField('dieColor', value);
              }
            }}
            options={DEFENSE_DIE_OPTIONS}
          />

          {!store.disableDefenseDice && (
            <SegmentedControl
              label="Surge Chart"
              value={store.surgeChart}
              onChange={(value) => store.setField('surgeChart', value)}
              options={DEFENSE_SURGE_OPTIONS}
            />
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
          <SegmentedControl
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
        <div className="grid grid-cols-2 gap-x-2 gap-y-2">
          <NumberSpinner
            label="Dodge"
            value={store.dodgeTokens}
            onChange={(value) => store.setField('dodgeTokens', value)}
            min={0}
            max={5}
            compact
          />
          <NumberSpinner
            label="Surge"
            value={store.surgeTokens}
            onChange={(value) => store.setField('surgeTokens', value)}
            min={0}
            max={5}
            compact
          />
          {store.dangerSenseX > 0 && (
            <NumberSpinner
              label="Suppression"
              value={store.suppressionTokens}
              onChange={(value) => store.setField('suppressionTokens', value)}
              min={0}
              max={10}
              compact
              tooltip="Suppression Tokens"
            />
          )}
        </div>
      </SectionHeader>

      <SectionHeader title="Keywords">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            <NumberSpinner
              label="Armor X"
              value={store.armorX}
              onChange={(value) => store.setField('armorX', value)}
              min={0}
              max={6}
              compact
            />
            <NumberSpinner
              label="Weak Point X"
              value={store.weakPointX}
              onChange={(value) => store.setField('weakPointX', value)}
              min={0}
              max={2}
              compact
            />
            <NumberSpinner
              label="Danger Sense X"
              value={store.dangerSenseX}
              onChange={(value) => store.setField('dangerSenseX', value)}
              min={0}
              max={5}
              compact
            />
            <NumberSpinner
              label="Uncanny Luck X"
              value={store.uncannyLuckX}
              onChange={(value) => store.setField('uncannyLuckX', value)}
              min={0}
              max={5}
              compact
            />
            <NumberSpinner
              label="Shielded X"
              value={store.shieldedX}
              onChange={(value) => store.setField('shieldedX', value)}
              min={0}
              max={6}
              compact
            />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Checkbox
              label="Block"
              value={store.block}
              onChange={(value) => store.setField('block', value)}
            />
            <Checkbox
              label="Deflect"
              value={store.deflect}
              onChange={(value) => store.setField('deflect', value)}
            />
            {store.deflect && (
              <Checkbox
                label="Shien Mastery"
                value={store.shienMastery}
                onChange={(value) => store.setField('shienMastery', value)}
              />
            )}
            <Checkbox
              label="Soresu Mastery"
              value={store.soresuMastery}
              onChange={(value) => store.setField('soresuMastery', value)}
            />
            <Checkbox
              label="Djem So Mastery"
              value={store.djemSoMastery}
              onChange={(value) => store.setField('djemSoMastery', value)}
            />
            <Checkbox
              label="Outmaneuver"
              value={store.outmaneuver}
              onChange={(value) => store.setField('outmaneuver', value)}
            />
            <Checkbox
              label="Low Profile"
              value={store.lowProfile}
              onChange={(value) => store.setField('lowProfile', value)}
            />
            <Checkbox
              label="Impervious"
              value={store.impervious}
              onChange={(value) => store.setField('impervious', value)}
            />
            <Checkbox
              label="Immune: Pierce"
              value={store.immunePierce}
              onChange={(value) => store.setField('immunePierce', value)}
            />
            <Checkbox
              label="Immune: Melee Pierce"
              value={store.immuneMeleePierce}
              onChange={(value) => store.setField('immuneMeleePierce', value)}
            />
            <Checkbox
              label="Immune: Blast"
              value={store.immuneBlast}
              onChange={(value) => store.setField('immuneBlast', value)}
            />
            <Checkbox
              label="Duelist"
              value={store.duelistDefender}
              onChange={(value) => store.setField('duelistDefender', value)}
            />
            <Checkbox
              label="Backup"
              value={store.backup}
              onChange={(value) => store.setField('backup', value)}
            />
            <Checkbox
              label="Hold the Line"
              value={store.holdTheLine}
              onChange={(value) => store.setField('holdTheLine', value)}
            />
            <Checkbox
              label="Dug In"
              value={store.dugIn}
              onChange={(value) => store.setField('dugIn', value)}
            />
          </div>

          <NumberSpinner
            label="Unit Cost"
            value={store.unitCost}
            onChange={(value) => store.setField('unitCost', value)}
            min={0}
            max={999}
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
                options={GUARDIAN_DIE_OPTIONS}
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
    </>
  );
}
