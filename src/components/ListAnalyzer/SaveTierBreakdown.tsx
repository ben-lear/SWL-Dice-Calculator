import type { SaveTier } from '../../data/listTypes';

interface SaveTierBreakdownProps {
  tiers: SaveTier[];
}

/**
 * Compact display of defensive save tiers — each tier shows its
 * label, unit count, and total wounds.
 */
export default function SaveTierBreakdown({ tiers }: SaveTierBreakdownProps) {
  if (tiers.length === 0) return null;

  return (
    <div className="space-y-1">
      {tiers.map((tier) => {
        const isRed = tier.label.startsWith('Red');
        return (
          <div
            key={tier.label}
            className="flex items-center justify-between rounded bg-gray-800/50 px-2 py-1 text-sm"
          >
            <span className={isRed ? 'text-red-400' : 'text-gray-300'}>
              {tier.label}
            </span>
            <span className="text-gray-400">
              {tier.unitCount}u / {tier.totalWounds}w
            </span>
          </div>
        );
      })}
    </div>
  );
}
