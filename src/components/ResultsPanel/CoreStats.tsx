import { formatWoundStat } from '../../utils/format';
import type { StatsSummary } from '../../engine/types';

interface CoreStatsProps {
  stats: StatsSummary;
}

export default function CoreStats({ stats }: CoreStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Mean" value={formatWoundStat(stats.mean)} />
      <StatCard label="Median" value={formatWoundStat(stats.median)} />
      <StatCard label="Mode" value={formatWoundStat(stats.mode)} />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg bg-gray-800 p-3 text-center">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-gray-100">
        {value}
      </div>
    </div>
  );
}
