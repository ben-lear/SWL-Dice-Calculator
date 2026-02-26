import type { KeywordTally } from '../../data/listTypes';
import { StatRow } from '../shared/StatRow';

interface KeywordTallySectionProps {
  tallies: KeywordTally[];
  /** Optional map of keyword slug → tooltip description */
  tooltips?: Record<string, string>;
}

/**
 * Renders a list of keyword tallies as StatRow entries.
 * Shows unit count and optional total value for numeric keywords.
 */
export default function KeywordTallySection({ tallies, tooltips }: KeywordTallySectionProps) {
  if (tallies.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {tallies.map((tally) => {
        const value =
          tally.totalValue !== undefined
            ? `${tally.unitCount} units (total ${tally.totalValue})`
            : `${tally.unitCount} units`;
        return (
          <StatRow
            key={tally.keyword}
            label={tally.label}
            value={value}
            tooltip={tooltips?.[tally.keyword]}
          />
        );
      })}
    </div>
  );
}
