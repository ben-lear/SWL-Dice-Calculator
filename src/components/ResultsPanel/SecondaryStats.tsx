import { formatWoundStat } from '../../utils/format';
import type { SimulationResult } from '../../engine/types';

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
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
        Additional Effects
      </h3>

      {showDeflect && (
        <SecondaryStatLine
          label="Deflect/Shien wounds to attacker"
          value={formatWoundStat(result.deflectWounds.mean)}
        />
      )}

      {showDjemSo && (
        <SecondaryStatLine
          label="Djem So wounds to attacker"
          value={formatWoundStat(result.djemSoWounds.mean)}
        />
      )}

      {showGuardian && (
        <>
          <SecondaryStatLine
            label="Guardian wounds (no Pierce)"
            value={formatWoundStat(result.guardianWounds.mean)}
          />
          <SecondaryStatLine
            label="Main target wounds (no Pierce)"
            value={formatWoundStat(result.mainTargetWounds.mean)}
          />
        </>
      )}
    </div>
  );
}

interface SecondaryStatLineProps {
  label: string;
  value: string;
}

function SecondaryStatLine({ label, value }: SecondaryStatLineProps) {
  return (
    <div className="flex items-center justify-between rounded bg-gray-800/50 px-3 py-1.5 text-sm">
      <span className="text-gray-300">{label}</span>
      <span className="font-semibold text-gray-200">{value}</span>
    </div>
  );
}
