import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DistributionEntry } from '../../engine/types';
import { formatPercent } from '../../utils/format';
import DeferredMount from '../shared/DeferredMount';

// ============================================================================
// Types
// ============================================================================

interface ChartSeries {
  label: string;
  distribution: DistributionEntry[];
  color: string; // hex color for this series
  mode: number;
}

interface WoundDistributionChartProps {
  series: ChartSeries[];
}

// ============================================================================
// Color Mapping
// ============================================================================

const COLOR_MAP: Record<string, { base: string; light: string }> = {
  indigo: { base: '#6366f1', light: '#818cf8' },
  emerald: { base: '#10b981', light: '#34d399' },
  amber: { base: '#f59e0b', light: '#fbbf24' },
  rose: { base: '#f43f5e', light: '#fb7185' },
};

function getSeriesColor(colorName: string): { base: string; light: string } {
  return COLOR_MAP[colorName] || { base: '#6366f1', light: '#818cf8' };
}

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Transform multiple series into a unified chart dataset.
 * Returns: [{ wounds: number, [seriesLabel]: probability, ... }]
 */
function toMultiSeriesChartData(series: ChartSeries[]) {
  // Union all wound counts across series
  const woundCounts = new Set<number>();
  series.forEach((s) => {
    s.distribution.forEach((entry) => woundCounts.add(entry.wounds));
  });

  const sortedWounds = Array.from(woundCounts).sort((a, b) => a - b);

  // Build unified data structure
  return sortedWounds.map((wounds) => {
    const dataPoint: Record<string, number | string> = { wounds };

    series.forEach((s) => {
      const entry = s.distribution.find((e) => e.wounds === wounds);
      // Store probability as percentage (0-100) for chart display
      dataPoint[s.label] = entry ? entry.probability * 100 : 0;
      // Store raw probability and cumulative for tooltip
      dataPoint[`${s.label}_raw`] = entry ? entry.probability : 0;
      dataPoint[`${s.label}_cumulative`] = entry ? entry.cumulative : 0;
    });

    return dataPoint;
  });
}

// ============================================================================
// Custom Tooltip
// ============================================================================

function MultiSeriesTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    payload: Record<string, number | string>;
  }>;
  series: ChartSeries[];
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const wounds = data.wounds as number;

  return (
    <div className="rounded-md bg-gray-900 px-3 py-2 text-sm shadow-lg border border-gray-700">
      <div className="font-semibold text-gray-100 mb-1">
        {wounds} wound{wounds !== 1 ? 's' : ''}
      </div>
      <div className="space-y-0.5 text-xs">
        {series.map((s) => {
          const raw = data[`${s.label}_raw`] as number;
          const cumulative = data[`${s.label}_cumulative`] as number;
          const colors = getSeriesColor(s.color);

          return (
            <div key={s.label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colors.base }}
              />
              <span className="text-gray-300">
                {s.label}: {formatPercent(raw)} (≥{formatPercent(cumulative)})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function WoundDistributionChart({
  series,
}: WoundDistributionChartProps) {
  if (series.length === 0) return null;

  const data = toMultiSeriesChartData(series);

  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
        Wound Probability Distribution
      </h3>
      <div className="h-44 w-full sm:h-52 md:h-64">
        <DeferredMount>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#374151"
            vertical={false}
          />
          <XAxis
            dataKey="wounds"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
            label={{
              value: 'Wounds',
              position: 'insideBottom',
              offset: -2,
              fill: '#9ca3af',
              fontSize: 12,
            }}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
            tickFormatter={(v: number) => `${v}%`}
            label={{
              value: 'Probability',
              angle: -90,
              position: 'insideLeft',
              offset: 20,
              fill: '#9ca3af',
              fontSize: 12,
            }}
          />
          <Tooltip
            content={<MultiSeriesTooltip series={series} />}
            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
          />

          {/* Render one Bar per series */}
          {series.map((s) => {
            const colors = getSeriesColor(s.color);
            return (
              <Bar
                key={s.label}
                dataKey={s.label}
                radius={[2, 2, 0, 0]}
                fill={colors.base}
              >
                {data.map((entry, index) => {
                  const wounds = entry.wounds as number;
                  const isMode = wounds === s.mode;
                  return (
                    <Cell
                      key={index}
                      fill={isMode ? colors.light : colors.base}
                    />
                  );
                })}
              </Bar>
            );
          })}
        </BarChart>
        </ResponsiveContainer>
        </DeferredMount>
      </div>
    </div>
  );
}
