import {
  MarksmanStrategy,
} from '../../engine/types';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import { useAttackerKeywordDisabled } from '../../hooks/useKeywordDisabled';
import NumberSpinner from '../shared/NumberSpinner';
import SectionHeader from '../shared/SectionHeader';
import SegmentedControl, { type SegmentedControlOption } from '../shared/SegmentedControl';
import Checkbox from '../shared/Checkbox';

const MARKSMAN_STRATEGY_OPTIONS: SegmentedControlOption<MarksmanStrategy>[] = [
  { value: MarksmanStrategy.Deterministic, label: 'Deterministic' },
  { value: MarksmanStrategy.Averages, label: 'Averages' },
];

export default function AttackerUnitKeywordsSection() {
  const store = useAttackConfigStore();
  const isDisabled = useAttackerKeywordDisabled();

  return (
    <SectionHeader title="Unit Keywords">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-2 gap-y-2">
          <NumberSpinner
            label="Arsenal X"
            value={store.arsenalX}
            onChange={(value) => store.setField('arsenalX', value)}
            min={0}
            max={99}
            compact
            tooltip="This unit may attack with up to X different weapons in a single attack action."
          />
          <NumberSpinner
            label="Precise X"
            value={store.preciseX}
            onChange={(value) => store.setField('preciseX', value)}
            min={0}
            max={99}
            compact
            tooltip="Each aim token lets you reroll X additional dice beyond the normal 2-die reroll limit."
          />
          <NumberSpinner
            label="Sharpshooter X"
            value={store.sharpshooterX}
            onChange={(value) => store.setField('sharpshooterX', value)}
            min={0}
            max={2}
            compact
            disabled={isDisabled('sharpshooterX')}
            tooltip="Reduce the defender's cover by X (minimum 0) when making ranged attacks."
          />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Checkbox
            label="Complete the Mission"
            value={store.completeTheMission}
            onChange={(value) => store.setField('completeTheMission', value)}
            tooltip="While attacking near an allied Priority Mission Token, this unit's attack pool gains Critical 2."
          />
          <Checkbox
            label="Death From Above"
            value={store.deathFromAbove}
            onChange={(value) => store.setField('deathFromAbove', value)}
            disabled={isDisabled('deathFromAbove')}
            tooltip="The defending unit cannot benefit from cover if this unit's leader is at a higher elevation."
          />
          <Checkbox
            label="Duelist"
            value={store.duelistAttacker}
            onChange={(value) => store.setField('duelistAttacker', value)}
            disabled={isDisabled('duelistAttacker')}
            tooltip="While making a melee attack, if you spend 1 or more aim tokens to reroll, the attack pool gains Pierce 1."
          />
          <Checkbox
            label="Hold the Line"
            value={store.holdTheLine}
            onChange={(value) => store.setField('holdTheLine', value)}
            disabled={isDisabled('holdTheLine')}
            tooltip="While engaged in melee, your attack surge results convert to hits."
          />
          <Checkbox
            label="Jar'Kai Mastery"
            value={store.jarKaiMastery}
            onChange={(value) => store.setField('jarKaiMastery', value)}
            disabled={isDisabled('jarKaiMastery')}
            tooltip="While making a melee attack, spend dodge tokens to upgrade results: blank → hit (1 token), hit → crit (1 token), or blank → crit (2 tokens)."
          />
          <Checkbox
            label="Jedi Hunter"
            value={store.jediHunter}
            onChange={(value) => store.setField('jediHunter', value)}
            tooltip="While attacking a unit with a Force upgrade slot, all attack surge results convert to critical hits."
          />
          <Checkbox
            label="Makashi Mastery"
            value={store.makashiMastery}
            onChange={(value) => store.setField('makashiMastery', value)}
            disabled={isDisabled('makashiMastery')}
            tooltip="While making a melee attack, reduce your Pierce by 1 to disable the defender's Immune: Pierce, Immune: Melee Pierce, and Impervious."
          />
          <Checkbox
            label="Marksman"
            value={store.marksman}
            onChange={(value) => store.setField('marksman', value)}
            tooltip="After converting surges, spend saved aim tokens to upgrade results: blank → hit (1 aim), hit → crit (1 aim), or blank → crit (2 aims)."
          />
        </div>

        {store.marksman && (
          <div className="mb-2">
            <SegmentedControl
              label="Marksman Strategy"
              value={store.marksmanStrategy}
              onChange={(value) => store.setField('marksmanStrategy', value)}
              options={MARKSMAN_STRATEGY_OPTIONS}
              tooltip="How to evaluate Marksman aim-token conversions: Deterministic uses exact math; Averages uses expected-value comparison."
            />
          </div>
        )}

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
  );
}
