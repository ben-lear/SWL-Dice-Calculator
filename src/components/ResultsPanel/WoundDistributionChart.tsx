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

interface WoundDistributionChartProps {
  distribution: DistributionEntry[];
  /** The mode (most probable wound count) to highlight */
  mode: number;
}

/** Transform distribution data for Recharts (probability → percentage). */
function toChartData(distribution: DistributionEntry[]) {
  return distribution.map((entry) => ({
    wounds: entry.wounds,
    probability: entry.probability * 100, // Chart shows 0–100
    raw: entry.probability,               // Keep raw for tooltip
    cumulative: entry.cumulative,         // For enhanced tooltip
  }));
}

/** Custom tooltip for bar hover. */
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { wounds: number; raw: number; cumulative: number };
  }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-md bg-gray-900 px-3 py-2 text-sm shadow-lg border border-gray-700">
      <div className="font-semibold text-gray-100">
        {data.wounds} wound{data.wounds !== 1 ? 's' : ''}
      </div>
      <div className="mt-1 space-y-0.5 text-gray-400">
        <div>Exactly: {formatPercent(data.raw)}</div>
        <div>At least: {formatPercent(data.cumulative)}</div>
      </div>
    </div>
  );
}

export default function WoundDistributionChart({
  distribution,
  mode,
}: WoundDistributionChartProps) {
  const data = toChartData(distribution);

  return (
    <div className="h-44 w-full sm:h-52 md:h-64">
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
            content={<ChartTooltip />}
            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
          />
          <Bar dataKey="probability" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.wounds === mode ? '#818cf8' : '#6366f1'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
