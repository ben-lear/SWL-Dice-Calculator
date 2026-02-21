import { formatWoundStat } from '../../utils/format';
import type { StatsSummary } from '../../engine/types';
import { StatCard } from '../shared/StatCard';

// ============================================================================
// Types
// ============================================================================

interface CoreStatsProps {
  stats: StatsSummary;
  /** Optional accent color (color name like 'indigo', 'emerald') for visual linking */
  accentColor?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function CoreStats({ stats, accentColor }: CoreStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Mean" value={formatWoundStat(stats.mean)} accentColor={accentColor} />
      <StatCard label="Median" value={formatWoundStat(stats.median)} accentColor={accentColor} />
      <StatCard label="Mode" value={formatWoundStat(stats.mode)} accentColor={accentColor} />
    </div>
  );
}
