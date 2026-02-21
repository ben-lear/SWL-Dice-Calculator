import { formatWoundStat } from '../../utils/format';
import type { SimulationResult } from '../../engine/types';
import { StatRow } from '../shared/StatRow';

interface SecondaryStatsProps {
  result: SimulationResult;
  /** Whether Guardian X > 0 in the current config */
  guardianActive: boolean;
}

export default function SecondaryStats({
  result,
  guardianActive,
}: SecondaryStatsProps) {
  const showDeflect = result.deflectWounds.mean > 0;
  const showDjemSo = result.djemSoWounds.mean > 0;
  const showGuardian = guardianActive;

  // Nothing to show
  if (!showDeflect && !showDjemSo && !showGuardian) return null;

  return (
    <div className="space-y-2">
      <h3 className="section-heading">
        Additional Effects
      </h3>

      {showDeflect && (
        <StatRow
          label="Deflect/Shien wounds to attacker"
          value={formatWoundStat(result.deflectWounds.mean)}
        />
      )}

      {showDjemSo && (
        <StatRow
          label="Djem So wounds to attacker"
          value={formatWoundStat(result.djemSoWounds.mean)}
        />
      )}

      {showGuardian && (
        <>
          <StatRow
            label="Guardian wounds (no Pierce)"
            value={formatWoundStat(result.guardianWounds.mean)}
          />
          <StatRow
            label="Main target wounds (no Pierce)"
            value={formatWoundStat(result.mainTargetWounds.mean)}
          />
        </>
      )}
    </div>
  );
}
