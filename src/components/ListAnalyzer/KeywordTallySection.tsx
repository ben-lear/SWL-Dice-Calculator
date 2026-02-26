import type { KeywordTally } from '../../data/listTypes';
import { StatRow } from '../shared/StatRow';

interface KeywordTallySectionProps {
  tallies: KeywordTally[];
}

/**
 * Renders a list of keyword tallies as StatRow entries.
 * Shows unit count and optional total value for numeric keywords.
 */
export default function KeywordTallySection({ tallies }: KeywordTallySectionProps) {
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
          />
        );
      })}
    </div>
  );
}
