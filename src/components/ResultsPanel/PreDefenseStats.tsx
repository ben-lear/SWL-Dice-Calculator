import { formatWoundStat } from '../../utils/format';
import type { StatsSummary } from '../../engine/types';
import { StatCard } from '../shared/StatCard';

// ============================================================================
// Types
// ============================================================================

interface PreDefenseStatsProps {
  hitsBeforeDefense: StatsSummary;
  critsBeforeDefense: StatsSummary;
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
      <h3 className="section-heading mb-2">
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
