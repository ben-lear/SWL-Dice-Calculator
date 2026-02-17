import {
  AttackSurgeChart,
  MarksmanStrategy,
} from '../../engine/types';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
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
          />
          <NumberSpinner
            label="Surge"
            value={store.surgeTokens}
            onChange={(value) => store.setField('surgeTokens', value)}
            min={0}
            max={99}
            compact
          />
          <NumberSpinner
            label="Observation"
            value={store.observationTokens}
            onChange={(value) => store.setField('observationTokens', value)}
            min={0}
            max={99}
            compact
          />
          {store.jarKaiMastery && (
            <NumberSpinner
              label="Dodge"
              value={store.dodgeTokensAttacker}
              onChange={(value) => store.setField('dodgeTokensAttacker', value)}
              min={0}
              max={99}
              compact
              tooltip="Dodge Tokens (Jar'Kai Mastery)"
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
            />
            <NumberSpinner
              label="Lethal X"
              value={weapon.keywords.lethalX}
              onChange={(value) => store.setWeaponKeyword(0, 'lethalX', value)}
              min={0}
              max={99}
              compact
            />
            <NumberSpinner
              label="Pierce X"
              value={weapon.keywords.pierceX}
              onChange={(value) => store.setWeaponKeyword(0, 'pierceX', value)}
              min={0}
              max={99}
              compact
            />
            <NumberSpinner
              label="Impact X"
              value={weapon.keywords.impactX}
              onChange={(value) => store.setWeaponKeyword(0, 'impactX', value)}
              min={0}
              max={99}
              compact
            />
            <NumberSpinner
              label="Ram X"
              value={weapon.keywords.ramX}
              onChange={(value) => store.setWeaponKeyword(0, 'ramX', value)}
              min={0}
              max={99}
              compact
            />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Checkbox
              label="Blast"
              value={weapon.keywords.blast}
              onChange={(value) => store.setWeaponKeyword(0, 'blast', value)}
            />
            <Checkbox
              label="Suppressive"
              value={weapon.keywords.suppressive}
              onChange={(value) => store.setWeaponKeyword(0, 'suppressive', value)}
            />
            <Checkbox
              label="High Velocity"
              value={weapon.keywords.highVelocity}
              onChange={(value) => store.setWeaponKeyword(0, 'highVelocity', value)}
            />
            <Checkbox
              label="Spray"
              value={weapon.keywords.spray}
              onChange={(value) => store.setWeaponKeyword(0, 'spray', value)}
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
            />
            <NumberSpinner
              label="Sharpshooter X"
              value={store.sharpshooterX}
              onChange={(value) => store.setField('sharpshooterX', value)}
              min={0}
              max={2}
              compact
            />
            <NumberSpinner
              label="Arsenal X"
              value={store.arsenalX}
              onChange={(value) => store.setField('arsenalX', value)}
              min={0}
              max={99}
              compact
            />
          </div>

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
              label="Immune: Deflect"
              value={store.immuneDeflect}
              onChange={(value) => store.setField('immuneDeflect', value)}
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
            <div className="mb-2">
              <SegmentedControl
                label="Marksman Strategy"
                value={store.marksmanStrategy}
                onChange={(value) => store.setField('marksmanStrategy', value)}
                options={MARKSMAN_STRATEGY_OPTIONS}
              />
            </div>
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
