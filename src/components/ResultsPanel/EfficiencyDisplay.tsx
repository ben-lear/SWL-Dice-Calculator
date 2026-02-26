import type { EfficiencyMetrics } from '../../engine/types';
import {
  formatPerPoint,
  formatPerWound,
  formatEfficiencyRatio,
} from '../../utils/format';
import { StatRow } from '../shared/StatRow';

interface EfficiencyDisplayProps {
  efficiency: EfficiencyMetrics;
}

export default function EfficiencyDisplay({
  efficiency,
}: EfficiencyDisplayProps) {
  // Don't render if all metrics are zero (no costs set)
  const hasAnyMetric =
    efficiency.attackerWoundsPerPoint > 0 ||
    efficiency.defenderWoundsPerPoint > 0;

  if (!hasAnyMetric) return null;

  return (
    <div className="space-y-2">
      <h3 className="section-heading">
        Points Efficiency
      </h3>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        <StatRow
          label="Wounds / attacker pt"
          value={formatPerPoint(efficiency.attackerWoundsPerPoint)}
          tooltip="Average wounds dealt per point of attacker cost"
          mono
        />
        <StatRow
          label="Attacker pts / wound"
          value={formatPerWound(efficiency.attackerPointsPerWound)}
          tooltip="Attacker cost per wound dealt"
          mono
        />
        <StatRow
          label="Wounds / defender pt"
          value={formatPerPoint(efficiency.defenderWoundsPerPoint)}
          tooltip="Average wounds dealt per point of defender cost"
          mono
        />
        <StatRow
          label="Defender pts / wound"
          value={formatPerWound(efficiency.defenderPointsPerWound)}
          tooltip="Defender cost per wound absorbed"
          mono
        />
        <StatRow
          label="Efficiency ratio"
          value={formatEfficiencyRatio(efficiency.attackerEfficiencyRatio)}
          tooltip="(Wounds / attacker cost) / defender cost - higher = better trade for attacker"
          mono
          className="sm:col-span-2"
        />
      </div>
    </div>
  );
}
