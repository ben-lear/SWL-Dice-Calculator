import type { ReactNode } from 'react';
import { getHexColor } from '../../utils/seriesColors';

interface StatCardProps {
  label: string;
  value: ReactNode;
  accentColor?: string;
}

export function StatCard({ label, value, accentColor }: StatCardProps) {
  const hexColor = getHexColor(accentColor);
  const style = hexColor ? { borderTopColor: hexColor, borderTopWidth: '2px' } : undefined;

  return (
    <div className="rounded-lg bg-gray-800 p-3 md:p-2 text-center" style={style}>
      <div className="section-heading text-xs font-medium">
        {label}
      </div>
      <div className="mt-1 text-2xl md:text-lg font-bold text-gray-100">
        {value}
      </div>
    </div>
  );
}
