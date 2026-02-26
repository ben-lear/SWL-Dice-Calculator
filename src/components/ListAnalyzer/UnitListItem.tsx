import type { ResolvedListUnit } from '../../data/listTypes';

interface UnitListItemProps {
  unit: ResolvedListUnit;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

/**
 * Compact row displaying a single unit in the list panel.
 * Shows unit name, cost, title, and individual upgrade tags.
 */
export default function UnitListItem({
  unit,
  index,
  isSelected,
  onSelect,
}: UnitListItemProps) {
  const resolved = unit.resolvedUnit;
  const isUnmatched = !resolved;

  // Calculate cost
  let totalCost = resolved?.cost ?? 0;
  for (const upg of unit.resolvedUpgrades) {
    if (upg) totalCost += upg.cost;
  }

  // Build upgrade display names — use resolved name when available, raw name as fallback
  const upgradeNames: { name: string; isResolved: boolean }[] =
    unit.rawUpgradeNames.map((rawName, i) => {
      const resolvedUpg = unit.resolvedUpgrades[i];
      return {
        name: resolvedUpg?.name ?? rawName,
        isResolved: resolvedUpg !== null,
      };
    });

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
        isSelected
          ? 'bg-gray-800 ring-2 ring-blue-500'
          : isUnmatched
            ? 'bg-gray-900 ring-1 ring-amber-500/50 hover:bg-gray-800'
            : 'bg-gray-900 hover:bg-gray-800'
      }`}
    >
      {/* Top row: name + cost */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-semibold text-gray-100">
          {isUnmatched && <span className="mr-1">⚠</span>}
          {resolved?.name ?? unit.rawName}
        </span>
        <span className="shrink-0 text-xs text-gray-400">
          {totalCost}pts
        </span>
      </div>

      {/* Title row (if present) */}
      {resolved?.title && (
        <div className="text-xs text-gray-400">{resolved.title}</div>
      )}

      {/* Unresolved indicator */}
      {isUnmatched && (
        <div className="mt-1 text-xs text-amber-400">Unresolved</div>
      )}

      {/* Upgrade tags */}
      {upgradeNames.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {upgradeNames.map((upg, i) => (
            <span
              key={i}
              className={`inline-block rounded px-1.5 py-0.5 text-[10px] leading-tight ${
                upg.isResolved
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-amber-900/40 text-amber-300'
              }`}
            >
              {upg.name}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
