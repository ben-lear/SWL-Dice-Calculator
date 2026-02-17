import { AttackType } from '../../engine/types';
import { useAttackTypeStore } from '../../stores/attackTypeStore';
import SegmentedControl, { type SegmentedControlOption } from '../shared/SegmentedControl';

const ATTACK_TYPE_OPTIONS: SegmentedControlOption<AttackType>[] = [
  { value: AttackType.Ranged, label: 'Ranged' },
  { value: AttackType.Melee, label: 'Melee' },
  { value: AttackType.Overrun, label: 'Overrun' },
];

export default function AttackTypeSelector() {
  const { attackType, setAttackType } = useAttackTypeStore();

  return (
    <SegmentedControl
      label="Attack Type"
      value={attackType}
      onChange={setAttackType}
      options={ATTACK_TYPE_OPTIONS}
    />
  );
}
