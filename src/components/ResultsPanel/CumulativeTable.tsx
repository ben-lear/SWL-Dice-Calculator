import type { DistributionEntry } from '../../engine/types';
import { formatPercent } from '../../utils/format';

interface CumulativeTableProps {
  distribution: DistributionEntry[];
}

/**
 * Minimum cumulative probability to display a row.
 * Rows below this threshold are omitted for cleanliness.
 * 0.001 = 0.1% — anything rounding to 0.0% is hidden.
 */
const MIN_CUMULATIVE = 0.0005;

export default function CumulativeTable({
  distribution,
}: CumulativeTableProps) {
  // Filter out rows where cumulative rounds to 0.0%
  const visibleRows = distribution.filter(
    (entry) => entry.cumulative >= MIN_CUMULATIVE
  );

  return (
    <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-800">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-800">
          <tr className="border-b border-gray-700">
            <th className="px-3 py-2 text-left font-medium text-gray-400">
              Wounds
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-400">
              P(≥ X)
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((entry) => (
            <tr
              key={entry.wounds}
              className="border-b border-gray-700/50 last:border-0"
            >
              <td className="px-3 py-1.5 text-gray-100">
                ≥ {entry.wounds}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-gray-100">
                {formatPercent(entry.cumulative)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
