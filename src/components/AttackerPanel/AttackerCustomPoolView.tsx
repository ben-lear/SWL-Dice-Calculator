import {
  AttackSurgeChart,
  MarksmanStrategy,
  RerollStrategy,
} from '../../engine/types';
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
          <Select
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
          <Toggle
            label="Blast"
            value={weapon.keywords.blast}
            onChange={(value) => store.setWeaponKeyword(0, 'blast', value)}
          />
          <Toggle
            label="Suppressive"
            value={weapon.keywords.suppressive}
            onChange={(value) => store.setWeaponKeyword(0, 'suppressive', value)}
          />
          <Toggle
            label="High Velocity"
            value={weapon.keywords.highVelocity}
            onChange={(value) => store.setWeaponKeyword(0, 'highVelocity', value)}
          />
          <Toggle
            label="Spray"
            value={weapon.keywords.spray}
            onChange={(value) => store.setWeaponKeyword(0, 'spray', value)}
          />
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
