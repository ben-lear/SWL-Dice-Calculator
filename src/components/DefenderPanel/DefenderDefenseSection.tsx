import {
  DefenseDieColor,
  DefenseSurgeChart,
} from '../../engine/types';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import NumberSpinner from '../shared/NumberSpinner';
import SectionHeader from '../shared/SectionHeader';
import SegmentedControl, { type SegmentedControlOption } from '../shared/SegmentedControl';

// UI-only type for defense die selector (includes 'none' option)
type DefenseDieOption = 'none' | DefenseDieColor;

const DEFENSE_DIE_OPTIONS: SegmentedControlOption<DefenseDieOption>[] = [
  { value: 'none', label: 'None' },
  { value: DefenseDieColor.White, label: 'White' },
  { value: DefenseDieColor.Red, label: 'Red' },
];

const DEFENSE_SURGE_OPTIONS: SegmentedControlOption<DefenseSurgeChart>[] = [
  { value: DefenseSurgeChart.None, label: 'None' },
  { value: DefenseSurgeChart.ToBlock, label: 'Block' },
];

export default function DefenderDefenseSection() {
  const store = useDefenseConfigStore();

  return (
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
  );
}
