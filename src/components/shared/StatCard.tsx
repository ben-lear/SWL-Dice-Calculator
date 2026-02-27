import type { ReactNode } from 'react';
import { getHexColor } from '../../utils/seriesColors';

interface StatCardProps {
  label: string;
  value: ReactNode;
  accentColor?: string;
  tooltip?: string;
}

export function StatCard({ label, value, accentColor, tooltip }: StatCardProps) {
  const hexColor = getHexColor(accentColor);
  const style = hexColor ? { borderTopColor: hexColor, borderTopWidth: '2px' } : undefined;

  return (
    <div
      className={`rounded-lg bg-gray-800 p-3 md:p-2 shadow-sm text-center ${tooltip ? 'cursor-help' : ''}`}
      style={style}
      title={tooltip}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-2xl md:text-lg font-bold text-gray-100">
        {value}
      </div>
    </div>
  );
}
