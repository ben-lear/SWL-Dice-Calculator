import {
  CoverType,
  DefenseDieColor,
  DefenseSurgeChart,
} from '../../engine/types';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import { useDefenderKeywordDisabled } from '../../hooks/useKeywordDisabled';
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

interface DefenderCustomPoolViewProps {
  /** When true, the Defense section is rendered elsewhere and hidden here. */
  hideDefense?: boolean;
}

export default function DefenderCustomPoolView({ hideDefense = false }: DefenderCustomPoolViewProps) {
  const store = useDefenseConfigStore();
  const isDisabled = useDefenderKeywordDisabled();

  return (
    <>
      {!hideDefense && (
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
              tooltip="The color of defense die rolled for this unit. Red dice have a higher block chance than white."
            />

            {!store.disableDefenseDice && (
              <SegmentedControl
                label="Surge Chart"
                value={store.surgeChart}
                onChange={(value) => store.setField('surgeChart', value)}
                options={DEFENSE_SURGE_OPTIONS}
                tooltip="Whether defense surge results convert to blocks."
              />
            )}

            <NumberSpinner
              label="Minis in LOS"
              value={store.minisInLOS}
              onChange={(value) => store.setField('minisInLOS', value)}
              min={1}
              max={99}
              tooltip="Number of defending miniatures in line of sight — used to multiply the dice of Spray weapons."
            />
          </div>
        </SectionHeader>
      )}

      <SectionHeader title="Cover">
        <div className="space-y-3">
          <SegmentedControl
            label="Cover Type"
            value={store.coverType}
            onChange={(value) => store.setField('coverType', value)}
            options={COVER_OPTIONS}
            disabled={isDisabled('coverType')}
            tooltip="Terrain-based cover that reduces incoming hit results before defense dice are rolled."
          />
          <NumberSpinner
            label="Cover X"
            value={store.coverX}
            onChange={(value) => store.setField('coverX', value)}
            min={0}
            max={2}
            disabled={isDisabled('coverX')}
            tooltip="The Cover X keyword improves this unit's cover level by X, stacking with terrain cover (capped at heavy)."
          />
          <NumberSpinner
            label="Smoke Tokens"
            value={store.smokeTokens}
            onChange={(value) => store.setField('smokeTokens', value)}
            min={0}
            max={99}
            disabled={isDisabled('smokeTokens')}
            tooltip="Each smoke token grants this unit light cover against ranged attacks."
          />
          <Toggle
            label="Suppressed"
            value={store.suppressed}
            onChange={(value) => store.setField('suppressed', value)}
            disabled={isDisabled('suppressed')}
            tooltip="This unit is suppressed: it improves its cover by 1 (e.g. no cover → light, light → heavy)."
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
            max={99}
            compact
            tooltip="Spend dodge tokens to cancel hit results before defense dice are rolled. Each token cancels 1 hit."
          />
          <NumberSpinner
            label="Surge"
            value={store.surgeTokens}
            onChange={(value) => store.setField('surgeTokens', value)}
            min={0}
            max={99}
            compact
            tooltip="Spend surge tokens to convert defense surge results to blocks."
          />
          {(store.dangerSenseX > 0 || store.suppressionTokens > 0) && (
            <NumberSpinner
              label="Suppression"
              value={store.suppressionTokens}
              onChange={(value) => store.setField('suppressionTokens', value)}
              min={0}
              max={99}
              compact
              tooltip="Current suppression tokens on this unit; used by Danger Sense X to roll additional defense dice."
            />
          )}
        </div>
      </SectionHeader>

      <SectionHeader title="Keywords" defaultExpanded={false}>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            <NumberSpinner
              label="Armor X"
              value={store.armorX}
              onChange={(value) => store.setField('armorX', value)}
              min={0}
              max={99}
              compact
              tooltip="Cancel up to X non-critical hit results before rolling defense dice. Critical hits bypass Armor."
            />
            <NumberSpinner
              label="Danger Sense X"
              value={store.dangerSenseX}
              onChange={(value) => store.setField('dangerSenseX', value)}
              min={0}
              max={99}
              compact
              tooltip="Roll 1 additional defense die per suppression token on this unit, up to X additional dice total."
            />
            <NumberSpinner
              label="Shielded X"
              value={store.shieldedX}
              onChange={(value) => store.setField('shieldedX', value)}
              min={0}
              max={99}
              compact
              disabled={isDisabled('shieldedX')}
              tooltip="This unit has X active shield tokens. Flip shields to cancel hit or critical results before defense dice are rolled (ranged attacks only)."
            />
            <NumberSpinner
              label="Uncanny Luck X"
              value={store.uncannyLuckX}
              onChange={(value) => store.setField('uncannyLuckX', value)}
              min={0}
              max={99}
              compact
              tooltip="After rolling defense dice, reroll up to X results once per attack."
            />
            <NumberSpinner
              label="Weak Point X"
              value={store.weakPointX}
              onChange={(value) => store.setField('weakPointX', value)}
              min={0}
              max={99}
              compact
              tooltip="When attacked from this unit's weak-point arc, the attacker's attack pool gains Impact X, converting up to X hits into crits."
            />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Checkbox
              label="Backup"
              value={store.backup}
              onChange={(value) => store.setField('backup', value)}
              disabled={isDisabled('backup')}
              tooltip="While defending against a ranged attack, cancel up to 2 hit results."
            />
            <Checkbox
              label="Block"
              value={store.block}
              onChange={(value) => store.setField('block', value)}
              tooltip="When this unit spends a dodge token, its defense surge results convert to blocks for this attack."
            />
            <Checkbox
              label="Complete the Mission"
              value={store.completeTheMission}
              onChange={(value) => store.setField('completeTheMission', value)}
              tooltip="While near an allied Priority Mission Token, this unit gains surge→block on defense."
            />
            <Checkbox
              label="Deflect"
              value={store.deflect}
              onChange={(value) => store.setField('deflect', value)}
              disabled={isDisabled('deflect')}
              tooltip="While defending against ranged attacks, surge results convert to blocks. If at least 1 surge was rolled, the attacker suffers 1 wound."
            />
            {store.deflect && (
              <Checkbox
                label="Shien Mastery"
                value={store.shienMastery}
                onChange={(value) => store.setField('shienMastery', value)}
                disabled={isDisabled('shienMastery')}
                tooltip="Enhances Deflect: the attacker suffers 1 wound per defense surge result instead of 1 total. If no wounds are dealt, no suppression is applied."
              />
            )}
            <Checkbox
              label="Djem So Mastery"
              value={store.djemSoMastery}
              onChange={(value) => store.setField('djemSoMastery', value)}
              disabled={isDisabled('djemSoMastery')}
              tooltip="While defending against a melee attack, if the attacker's roll contained any blank results, the attacker suffers 1 wound."
            />
            <Checkbox
              label="Duelist"
              value={store.duelistDefender}
              onChange={(value) => store.setField('duelistDefender', value)}
              disabled={isDisabled('duelistDefender')}
              tooltip="While defending against a melee attack, if you spend a dodge token, you gain Immune: Pierce for this attack."
            />
            <Checkbox
              label="Dug In"
              value={store.dugIn}
              onChange={(value) => store.setField('dugIn', value)}
              disabled={isDisabled('dugIn')}
              tooltip="This unit's cover pool rolls red defense dice instead of white (higher chance to block with cover)."
            />
            <Checkbox
              label="Hold the Line"
              value={store.holdTheLine}
              onChange={(value) => store.setField('holdTheLine', value)}
              disabled={isDisabled('holdTheLine')}
              tooltip="While this unit is engaged in melee, defense surge results convert to blocks."
            />
            <Checkbox
              label="Immune: Blast"
              value={store.immuneBlast}
              onChange={(value) => store.setField('immuneBlast', value)}
              tooltip="Blast has no effect against this unit."
            />
            <Checkbox
              label="Immune: Melee"
              value={store.immuneMelee}
              onChange={(value) => store.setField('immuneMelee', value)}
              disabled={isDisabled('immuneMelee')}
              tooltip="Enemy units cannot engage this unit in melee. Melee attacks deal zero damage."
            />
            <Checkbox
              label="Immune: Melee Pierce"
              value={store.immuneMeleePierce}
              onChange={(value) => store.setField('immuneMeleePierce', value)}
              disabled={isDisabled('immuneMeleePierce')}
              tooltip="Pierce has no effect when the attacker is in melee with this unit."
            />
            <Checkbox
              label="Immune: Pierce"
              value={store.immunePierce}
              onChange={(value) => store.setField('immunePierce', value)}
              tooltip="Pierce has no effect when attacking this unit."
            />
            <Checkbox
              label="Impervious"
              value={store.impervious}
              onChange={(value) => store.setField('impervious', value)}
              tooltip="While defending, roll additional defense dice equal to the attacker's total Pierce value."
            />
            <Checkbox
              label="Katarn Armor"
              value={store.katarnPatternArmor}
              onChange={(value) => store.setField('katarnPatternArmor', value)}
              disabled={isDisabled('katarnPatternArmor')}
              tooltip="Expend: when suffering 1 or more wounds from a non-melee attack, suffer only 1 wound instead."
            />
            <Checkbox
              label="Low Profile"
              value={store.lowProfile}
              onChange={(value) => store.setField('lowProfile', value)}
              disabled={isDisabled('lowProfile')}
              tooltip="While this unit has cover, it gains 1 additional cover result."
            />
            <Checkbox
              label="Outmaneuver"
              value={store.outmaneuver}
              onChange={(value) => store.setField('outmaneuver', value)}
              tooltip="While defending, your dodge tokens can also cancel critical hit results (normally they only cancel hits)."
            />
            <Checkbox
              label="Soresu Mastery"
              value={store.soresuMastery}
              onChange={(value) => store.setField('soresuMastery', value)}
              disabled={isDisabled('soresuMastery')}
              tooltip="While defending against a ranged attack, reroll all your defense dice."
            />
          </div>

          <NumberSpinner
            label="Unit Cost"
            value={store.unitCost}
            onChange={(value) => store.setField('unitCost', value)}
            min={0}
            max={999}
            tooltip="Points cost of this unit, used for cost-efficiency comparisons in the results panel."
          />
        </div>
      </SectionHeader>

      <SectionHeader title="Guardian" defaultExpanded={false}>
        <div className="space-y-3">
          <NumberSpinner
            label="Guardian X"
            value={store.guardianX}
            onChange={(value) => store.setField('guardianX', value)}
            min={0}
            max={99}
            disabled={isDisabled('guardianX')}
            tooltip="Cancel up to X hit results from an attack targeting an adjacent friendly unit; this unit rolls 1 defense die per hit absorbed."
          />

          {store.guardianX > 0 && (
            <>
              <Select
                label="Guardian Die Color"
                value={store.guardianDieColor}
                onChange={(value) => store.setField('guardianDieColor', value)}
                options={GUARDIAN_DIE_OPTIONS}
                disabled={isDisabled('guardianDieColor')}
                tooltip="The color of defense die rolled when this unit uses Guardian."
              />
              <Select
                label="Guardian Surge"
                value={store.guardianSurgeChart}
                onChange={(value) => store.setField('guardianSurgeChart', value)}
                options={DEFENSE_SURGE_OPTIONS}
                disabled={isDisabled('guardianSurgeChart')}
                tooltip="Whether the Guardian unit's defense surge results convert to blocks."
              />
              <Toggle
                label="Guardian Deflect"
                value={store.guardianDeflect}
                onChange={(value) => store.setField('guardianDeflect', value)}
                disabled={isDisabled('guardianDeflect')}
                tooltip="While using Guardian, surge results count as blocks. If at least 1 surge was rolled, the attacker suffers 1 wound."
              />
              <Toggle
                label="Guardian Soresu Mastery"
                value={store.guardianSoresuMastery}
                onChange={(value) => store.setField('guardianSoresuMastery', value)}
                disabled={isDisabled('guardianSoresuMastery')}
                tooltip="While using Guardian, spend a dodge token to reroll all Guardian defense dice before converting surges."
              />
              <NumberSpinner
                label="Guardian Dodge Tokens"
                value={store.guardianDodgeTokens}
                onChange={(value) => store.setField('guardianDodgeTokens', value)}
                min={0}
                max={99}
                disabled={isDisabled('guardianDodgeTokens')}
                tooltip="Dodge tokens available to the Guardian unit when making Guardian defense rolls."
              />
            </>
          )}
        </div>
      </SectionHeader>
    </>
  );
}
