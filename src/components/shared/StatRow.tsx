interface StatRowProps {
  label: string;
  value: string;
  tooltip?: string;
  mono?: boolean;
  className?: string;
}

export function StatRow({ label, value, tooltip, mono, className }: StatRowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded bg-gray-800/50 px-3 py-1.5 text-sm ${className ?? ''}`}
      title={tooltip}
    >
      <span className="text-gray-300">{label}</span>
      <span className={`font-semibold text-gray-200 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
