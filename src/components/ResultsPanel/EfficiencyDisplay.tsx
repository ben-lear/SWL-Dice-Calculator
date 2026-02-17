import type { EfficiencyMetrics } from '../../engine/types';
import {
  formatPerPoint,
  formatPerWound,
  formatEfficiencyRatio,
} from '../../utils/format';

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
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
        Points Efficiency
      </h3>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        <EfficiencyRow
          label="Wounds / attacker pt"
          value={formatPerPoint(efficiency.attackerWoundsPerPoint)}
          tooltip="Average wounds dealt per point of attacker cost"
        />
        <EfficiencyRow
          label="Attacker pts / wound"
          value={formatPerWound(efficiency.attackerPointsPerWound)}
          tooltip="Attacker cost per wound dealt"
        />
        <EfficiencyRow
          label="Wounds / defender pt"
          value={formatPerPoint(efficiency.defenderWoundsPerPoint)}
          tooltip="Average wounds dealt per point of defender cost"
        />
        <EfficiencyRow
          label="Defender pts / wound"
          value={formatPerWound(efficiency.defenderPointsPerWound)}
          tooltip="Defender cost per wound absorbed"
        />
        <EfficiencyRow
          label="Efficiency ratio"
          value={formatEfficiencyRatio(efficiency.attackerEfficiencyRatio)}
          tooltip="(Wounds / attacker cost) / defender cost — higher = better trade for attacker"
          span2
        />
      </div>
    </div>
  );
}

interface EfficiencyRowProps {
  label: string;
  value: string;
  tooltip: string;
  /** Span full width (2 columns) on sm+ screens */
  span2?: boolean;
}

function EfficiencyRow({ label, value, tooltip, span2 }: EfficiencyRowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded bg-gray-800/50 px-3 py-1.5 text-sm ${
        span2 ? 'sm:col-span-2' : ''
      }`}
      title={tooltip}
    >
      <span className="text-gray-300">{label}</span>
      <span className="font-mono font-semibold text-gray-200">{value}</span>
    </div>
  );
}
