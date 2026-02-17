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

  return (
    <>
      <SectionHeader title="Dice Pool">
        <div className="space-y-3">
          <NumberSpinner
            label="Red Dice"
            value={weapon.redDice}
            onChange={(value) => store.setWeaponDice(0, 'red', value)}
            min={0}
            max={12}
          />
          <NumberSpinner
            label="Black Dice"
            value={weapon.blackDice}
            onChange={(value) => store.setWeaponDice(0, 'black', value)}
            min={0}
            max={12}
          />
          <NumberSpinner
            label="White Dice"
            value={weapon.whiteDice}
            onChange={(value) => store.setWeaponDice(0, 'white', value)}
            min={0}
            max={12}
          />
          <SegmentedControl
            label="Attack Surge"
            value={store.surgeChart}
            onChange={(value) => store.setField('surgeChart', value)}
            options={ATTACK_SURGE_OPTIONS}
          />
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

      {store.marksman && (
        <div className="mb-4">
          <SegmentedControl
            label="Marksman Strategy"
            value={store.marksmanStrategy}
            onChange={(value) => store.setField('marksmanStrategy', value)}
            options={MARKSMAN_STRATEGY_OPTIONS}
          />
        </div>
      )}

      <SectionHeader title="Weapon Keywords">
        <div className="space-y-3">
          <NumberSpinner
            label="Critical X"
            value={weapon.keywords.criticalX}
            onChange={(value) => store.setWeaponKeyword(0, 'criticalX', value)}
            min={0}
            max={5}
          />
          <NumberSpinner
            label="Lethal X"
            value={weapon.keywords.lethalX}
            onChange={(value) => store.setWeaponKeyword(0, 'lethalX', value)}
            min={0}
            max={5}
          />
          <NumberSpinner
            label="Pierce X"
            value={weapon.keywords.pierceX}
            onChange={(value) => store.setWeaponKeyword(0, 'pierceX', value)}
            min={0}
            max={5}
          />
          <NumberSpinner
            label="Impact X"
            value={weapon.keywords.impactX}
            onChange={(value) => store.setWeaponKeyword(0, 'impactX', value)}
            min={0}
            max={6}
          />
          <NumberSpinner
            label="Ram X"
            value={weapon.keywords.ramX}
            onChange={(value) => store.setWeaponKeyword(0, 'ramX', value)}
            min={0}
            max={5}
          />

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
        <div className="space-y-3">
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
