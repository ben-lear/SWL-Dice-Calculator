import {
  AttackSurgeChart,
} from '../../engine/types';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import { useWeaponKeywordDisabled } from '../../hooks/useKeywordDisabled';
import NumberSpinner from '../shared/NumberSpinner';
import SectionHeader from '../shared/SectionHeader';
import WeaponKeywordsSection from './WeaponKeywordsSection';
import AttackerTokensSection from './AttackerTokensSection';
import AttackerUnitKeywordsSection from './AttackerUnitKeywordsSection';
import SegmentedControl, { type SegmentedControlOption } from '../shared/SegmentedControl';

const ATTACK_SURGE_OPTIONS: SegmentedControlOption<AttackSurgeChart>[] = [
  { value: AttackSurgeChart.None, label: 'None' },
  { value: AttackSurgeChart.ToHit, label: 'Hit' },
  { value: AttackSurgeChart.ToCrit, label: 'Crit' },
];

export default function AttackerCustomPoolView() {
  const store = useAttackConfigStore();
  const weapon = store.weapons[0];
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

      <AttackerTokensSection />

      <SectionHeader title="Weapon Keywords">
        <WeaponKeywordsSection
          keywords={weapon.keywords}
          onKeywordChange={(key, value) => store.setWeaponKeyword(0, key, value)}
          isKeywordDisabled={isWeaponDisabled}
        />
      </SectionHeader>

      <AttackerUnitKeywordsSection />
    </>
  );
}
