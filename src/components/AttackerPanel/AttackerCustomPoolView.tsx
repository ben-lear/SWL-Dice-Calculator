import {
  AttackSurgeChart,
  MarksmanStrategy,
} from '../../engine/types';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import { useAttackerKeywordDisabled, useWeaponKeywordDisabled } from '../../hooks/useKeywordDisabled';
import NumberSpinner from '../shared/NumberSpinner';
import SectionHeader from '../shared/SectionHeader';
import SegmentedControl, { type SegmentedControlOption } from '../shared/SegmentedControl';
import Checkbox from '../shared/Checkbox';

const ATTACK_SURGE_OPTIONS: SegmentedControlOption<AttackSurgeChart>[] = [
  { value: AttackSurgeChart.None, label: 'None' },
  { value: AttackSurgeChart.ToHit, label: 'Hit' },
  { value: AttackSurgeChart.ToCrit, label: 'Crit' },
];

const MARKSMAN_STRATEGY_OPTIONS: SegmentedControlOption<MarksmanStrategy>[] = [
  { value: MarksmanStrategy.Deterministic, label: 'Deterministic' },
  { value: MarksmanStrategy.Averages, label: 'Averages' },
];

export default function AttackerCustomPoolView() {
  const store = useAttackConfigStore();
  const weapon = store.weapons[0];
  const isDisabled = useAttackerKeywordDisabled();
  const isWeaponDisabled = useWeaponKeywordDisabled();

  if (!weapon) return null;

  // Diamond icon components for dice
  const DiceIcon = ({ color, title }: { color: string; title: string }) => (
    <div
      className={`h-3.5 w-3.5 rotate-45 ${color}`}
      title={title}
    />
  );

  return (
    <>
      <SectionHeader title="Dice Pool">
        <div className="space-y-3">
          {/* Compact dice pool row with icons */}
          <div className="flex items-center justify-between">
            <NumberSpinner
              labelContent={<DiceIcon color="bg-red-500 ring-2 ring-red-600" title="Red Dice" />}
              label="Red Dice"
              value={weapon.redDice}
              onChange={(value) => store.setWeaponDice(0, 'red', value)}
              min={0}
              max={99}
              compact
              gap="gap-3"
            />
            <NumberSpinner
              labelContent={<DiceIcon color="bg-gray-900 ring-2 ring-gray-600" title="Black Dice" />}
              label="Black Dice"
              value={weapon.blackDice}
              onChange={(value) => store.setWeaponDice(0, 'black', value)}
              min={0}
              max={99}
              compact
              gap="gap-3"
            />
            <NumberSpinner
              labelContent={<DiceIcon color="bg-gray-100 ring-2 ring-gray-300" title="White Dice" />}
              label="White Dice"
              value={weapon.whiteDice}
              onChange={(value) => store.setWeaponDice(0, 'white', value)}
              min={0}
              max={99}
              compact
              gap="gap-3"
            />
          </div>
          <SegmentedControl
            label="Surge Chart"
            value={store.surgeChart}
            onChange={(value) => store.setField('surgeChart', value)}
            options={ATTACK_SURGE_OPTIONS}
            tooltip="What attack surge results convert to: nothing, hits, or critical hits."
          />
        </div>
      </SectionHeader>

      <SectionHeader title="Tokens">
        <div className="grid grid-cols-2 gap-x-2 gap-y-2">
          <NumberSpinner
            label="Aim"
            value={store.aimTokens}
            onChange={(value) => store.setField('aimTokens', value)}
            min={0}
            max={99}
            compact
            tooltip="Spend aim tokens to reroll attack dice. Each token lets you reroll up to 2 dice."
          />
          <NumberSpinner
            label="Surge"
            value={store.surgeTokens}
            onChange={(value) => store.setField('surgeTokens', value)}
            min={0}
            max={99}
            compact
            tooltip="Spend surge tokens to convert attack surge results to hits."
          />
          <NumberSpinner
            label="Observation"
            value={store.observationTokens}
            onChange={(value) => store.setField('observationTokens', value)}
            min={0}
            max={99}
            compact
            tooltip="Spend observation tokens on the defending unit to reroll 1 attack die per token spent."
          />
          {store.jarKaiMastery && (
            <NumberSpinner
              label="Dodge"
              value={store.dodgeTokensAttacker}
              onChange={(value) => store.setField('dodgeTokensAttacker', value)}
              min={0}
              max={99}
              compact
              tooltip="Spend dodge tokens to upgrade results in melee: blank → hit (1 token), hit → crit (1 token), or blank → crit (2 tokens)."
            />
          )}
        </div>
      </SectionHeader>

      <SectionHeader title="Weapon Keywords">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            <NumberSpinner
              label="Critical X"
              value={weapon.keywords.criticalX}
              onChange={(value) => store.setWeaponKeyword(0, 'criticalX', value)}
              min={0}
              max={99}
              compact
              tooltip="Convert the first X attack surge results into critical hits. Remaining surges still convert via the surge chart."
            />
            <NumberSpinner
              label="Lethal X"
              value={weapon.keywords.lethalX}
              onChange={(value) => store.setWeaponKeyword(0, 'lethalX', value)}
              min={0}
              max={99}
              compact
              tooltip="Spend unspent aim tokens (up to X) to gain Pierce 1 per token. Aims spent this way cannot be used for rerolling."
            />
            <NumberSpinner
              label="Pierce X"
              value={weapon.keywords.pierceX}
              onChange={(value) => store.setWeaponKeyword(0, 'pierceX', value)}
              min={0}
              max={99}
              compact
              tooltip="Cancel X of the defender's block results after defense dice are rolled."
            />
            <NumberSpinner
              label="Impact X"
              value={weapon.keywords.impactX}
              onChange={(value) => store.setWeaponKeyword(0, 'impactX', value)}
              min={0}
              max={99}
              compact
              tooltip="Convert up to X hit results into critical hits when attacking a unit with the Armor keyword."
            />
            <NumberSpinner
              label="Ram X"
              value={weapon.keywords.ramX}
              onChange={(value) => store.setWeaponKeyword(0, 'ramX', value)}
              min={0}
              max={99}
              compact
              tooltip="While performing a melee or overrun attack, convert up to X attack die results (blanks first, then hits) into critical hits."
            />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Checkbox
              label="Blast"
              value={weapon.keywords.blast}
              onChange={(value) => store.setWeaponKeyword(0, 'blast', value)}
              tooltip="This weapon ignores all cover when attacking."
            />
            <Checkbox
              label="Suppressive"
              value={weapon.keywords.suppressive}
              onChange={(value) => store.setWeaponKeyword(0, 'suppressive', value)}
              tooltip="This weapon applies 1 additional suppression token to the defender beyond the normal amount."
            />
            <Checkbox
              label="High Velocity"
              value={weapon.keywords.highVelocity}
              onChange={(value) => store.setWeaponKeyword(0, 'highVelocity', value)}
              disabled={isWeaponDisabled('highVelocity')}
              tooltip="The defender cannot spend dodge tokens when defending against this weapon."
            />
            <Checkbox
              label="Spray"
              value={weapon.keywords.spray}
              onChange={(value) => store.setWeaponKeyword(0, 'spray', value)}
              tooltip="This weapon's dice are added once per defending miniature in line of sight, multiplying its contribution to the attack pool."
            />
          </div>
        </div>
      </SectionHeader>

      <SectionHeader title="Unit Keywords">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
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
            <NumberSpinner
              label="Arsenal X"
              value={store.arsenalX}
              onChange={(value) => store.setField('arsenalX', value)}
              min={0}
              max={99}
              compact
              tooltip="This unit may attack with up to X different weapons in a single attack action."
            />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Checkbox
              label="Marksman"
              value={store.marksman}
              onChange={(value) => store.setField('marksman', value)}
              tooltip="After converting surges, spend saved aim tokens to upgrade results: blank → hit (1 aim), hit → crit (1 aim), or blank → crit (2 aims)."
            />
            <Checkbox
              label="Jedi Hunter"
              value={store.jediHunter}
              onChange={(value) => store.setField('jediHunter', value)}
              tooltip="While attacking a unit with a Force upgrade slot, all attack surge results convert to critical hits."
            />
            <Checkbox
              label="Jar'Kai Mastery"
              value={store.jarKaiMastery}
              onChange={(value) => store.setField('jarKaiMastery', value)}
              disabled={isDisabled('jarKaiMastery')}
              tooltip="While making a melee attack, spend dodge tokens to upgrade results: blank → hit (1 token), hit → crit (1 token), or blank → crit (2 tokens)."
            />
            <Checkbox
              label="Duelist"
              value={store.duelistAttacker}
              onChange={(value) => store.setField('duelistAttacker', value)}
              disabled={isDisabled('duelistAttacker')}
              tooltip="While making a melee attack, if you spend 1 or more aim tokens to reroll, the attack pool gains Pierce 1."
            />
            <Checkbox
              label="Makashi Mastery"
              value={store.makashiMastery}
              onChange={(value) => store.setField('makashiMastery', value)}
              disabled={isDisabled('makashiMastery')}
              tooltip="While making a melee attack, reduce your Pierce by 1 to disable the defender's Immune: Pierce, Immune: Melee Pierce, and Impervious."
            />
            <Checkbox
              label="Immune: Deflect"
              value={store.immuneDeflect}
              onChange={(value) => store.setField('immuneDeflect', value)}
              disabled={isDisabled('immuneDeflect')}
              tooltip="This unit's attacks cannot be deflected back at the attacker by Deflect."
            />
            <Checkbox
              label="Death From Above"
              value={store.deathFromAbove}
              onChange={(value) => store.setField('deathFromAbove', value)}
              disabled={isDisabled('deathFromAbove')}
              tooltip="The defending unit cannot benefit from cover if this unit's leader is at a higher elevation."
            />
            <Checkbox
              label="Hold the Line"
              value={store.holdTheLine}
              onChange={(value) => store.setField('holdTheLine', value)}
              disabled={isDisabled('holdTheLine')}
              tooltip="While engaged in melee, your attack surge results convert to hits."
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
    </>
  );
}
