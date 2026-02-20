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

interface PreDefenseStatsProps {
  hitsBeforeDefense: StatsSummary;
  critsBeforeDefense: StatsSummary;
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

export default function PreDefenseStats({
  hitsBeforeDefense,
  critsBeforeDefense,
  accentColor,
}: PreDefenseStatsProps) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
        Pre-defense results (avg)
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Hits"
          value={formatWoundStat(hitsBeforeDefense.mean)}
          accentColor={accentColor}
        />
        <StatCard
          label="Crits"
          value={formatWoundStat(critsBeforeDefense.mean)}
          accentColor={accentColor}
        />
      </div>
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
