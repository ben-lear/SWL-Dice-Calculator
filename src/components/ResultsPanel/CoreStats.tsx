import { formatWoundStat } from '../../utils/format';
import type { StatsSummary } from '../../engine/types';

// ============================================================================
// Color Mapping
// ============================================================================

const COLOR_MAP: Record<string, string> = {
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
};

function getHexColor(colorName?: string): string | undefined {
  if (!colorName) return undefined;
  return COLOR_MAP[colorName];
}

// ============================================================================
// Types
// ============================================================================

interface CoreStatsProps {
  stats: StatsSummary;
  /** Optional accent color (color name like 'indigo', 'emerald') for visual linking */
  accentColor?: string;
}

interface StatCardProps {
  label: string;
  value: string;
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

function StatCard({ label, value, accentColor }: StatCardProps) {
  const hexColor = getHexColor(accentColor);
  const style = hexColor ? { borderTopColor: hexColor, borderTopWidth: '2px' } : undefined;

  return (
    <div className="rounded-lg bg-gray-800 p-3 text-center" style={style}>
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-gray-100">
        {value}
      </div>
    </div>
  );
}
