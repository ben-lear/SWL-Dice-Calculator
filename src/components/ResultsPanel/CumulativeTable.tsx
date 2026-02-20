import { useState } from 'react';
import type { DistributionEntry } from '../../engine/types';
import { formatPercent } from '../../utils/format';

// ============================================================================
// Types
// ============================================================================

interface TableSeries {
  label: string;
  distribution: DistributionEntry[];
  color: string; // color name for header accent
}

interface CumulativeTableProps {
  series: TableSeries[];
}

// ============================================================================
// Color Mapping
// ============================================================================

const COLOR_MAP: Record<string, string> = {
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
};

function getSeriesHexColor(colorName: string): string {
  return COLOR_MAP[colorName] || '#6366f1';
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum cumulative probability to display a row.
 * Rows below this threshold are omitted for cleanliness.
 * 0.0005 = 0.05% — anything rounding to 0.0% is hidden.
 */
const MIN_CUMULATIVE = 0.0005;

// ============================================================================
// Component
// ============================================================================

export default function CumulativeTable({ series }: CumulativeTableProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (series.length === 0) return null;

  // Union all wound counts across all series
  const woundCounts = new Set<number>();
  series.forEach((s) => {
    s.distribution.forEach((entry) => {
      if (entry.cumulative >= MIN_CUMULATIVE) {
        woundCounts.add(entry.wounds);
      }
    });
  });

  const sortedWounds = Array.from(woundCounts).sort((a, b) => a - b);

  // Build lookup maps for each series
  const seriesMaps = series.map((s) => {
    const map = new Map<number, number>();
    s.distribution.forEach((entry) => {
      map.set(entry.wounds, entry.cumulative);
    });
    return map;
  });

  return (
    <div className="overflow-hidden rounded-lg bg-gray-800">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Cumulative Probability (≥ X Wounds)
        </span>
        <span
          className={`text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {/* Collapsible body */}
      <div
        className={`transition-all duration-200 ease-in-out ${
          isExpanded
            ? 'max-h-[2000px] opacity-100 overflow-visible'
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="border-t border-b border-gray-700">
              <th className="px-3 py-2 text-left font-semibold text-gray-300">
                Wounds
              </th>
              {series.map((s) => {
                const hexColor = getSeriesHexColor(s.color);
                return (
                  <th
                    key={s.label}
                    className="px-3 py-2 text-right font-semibold text-gray-300"
                  >
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: hexColor }}
                      />
                      <span>{s.label}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedWounds.map((wounds) => (
              <tr
                key={wounds}
                className="border-b border-gray-700/50 last:border-0"
              >
                <td className="px-3 py-1.5 text-gray-100">≥ {wounds}</td>
                {seriesMaps.map((map, idx) => {
                  const cumulative = map.get(wounds);
                  return (
                    <td
                      key={idx}
                      className="px-3 py-1.5 text-right font-mono text-gray-100"
                    >
                      {cumulative !== undefined ? formatPercent(cumulative) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
