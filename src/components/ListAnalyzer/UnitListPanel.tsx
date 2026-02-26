import { useState, useEffect } from 'react';
import { useListStore } from '../../stores/listStore';
import type { ResolvedListUnit } from '../../data/listTypes';
import UnitListItem from './UnitListItem';

/** Rank sort order for display */
const RANK_ORDER: Record<string, number> = {
  'commander': 0,
  'operative': 1,
  'corps': 2,
  'special-forces': 3,
  'support': 4,
  'heavy': 5,
};

const RANK_LABELS: Record<string, string> = {
  'commander': 'Commanders',
  'operative': 'Operatives',
  'corps': 'Corps',
  'special-forces': 'Special Forces',
  'support': 'Support',
  'heavy': 'Heavy',
};

interface RankGroup {
  rank: string;
  label: string;
  units: { unit: ResolvedListUnit; index: number }[];
}

function groupUnitsByRank(units: ResolvedListUnit[]): RankGroup[] {
  const groups = new Map<string, { unit: ResolvedListUnit; index: number }[]>();

  units.forEach((unit, index) => {
    const rank = unit.resolvedUnit?.rank ?? 'unknown';
    if (!groups.has(rank)) {
      groups.set(rank, []);
    }
    groups.get(rank)!.push({ unit, index });
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => (RANK_ORDER[a] ?? 99) - (RANK_ORDER[b] ?? 99))
    .map(([rank, units]) => ({
      rank,
      label: RANK_LABELS[rank] ?? rank,
      units,
    }));
}

/**
 * Left panel: JSON import section + unit list grouped by rank.
 */
export default function UnitListPanel() {
  const resolvedList = useListStore((s) => s.resolvedList);
  const selectedUnitIndex = useListStore((s) => s.selectedUnitIndex);
  const selectUnit = useListStore((s) => s.selectUnit);

  // Detect mobile for collapsed default state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const rankGroups = resolvedList ? groupUnitsByRank(resolvedList.units) : [];

  return (
    <div className="space-y-3">
      {rankGroups.map((group) => (
        <RankSection
          key={group.rank}
          group={group}
          defaultExpanded={!isMobile}
          selectedUnitIndex={selectedUnitIndex}
          onSelectUnit={selectUnit}
        />
      ))}

      {resolvedList && resolvedList.units.length === 0 && (
        <p className="text-sm text-gray-500">(no units)</p>
      )}
    </div>
  );
}

// ============================================================================
// Rank Section (collapsible)
// ============================================================================

interface RankSectionProps {
  group: RankGroup;
  defaultExpanded: boolean;
  selectedUnitIndex: number | null;
  onSelectUnit: (index: number) => void;
}

function RankSection({
  group,
  defaultExpanded,
  selectedUnitIndex,
  onSelectUnit,
}: RankSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 py-1 text-left text-sm font-semibold text-gray-300 transition-colors hover:text-gray-100"
        aria-expanded={expanded}
      >
        <span
          className={`inline-block text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          ▸
        </span>
        {group.label} ({group.units.length})
      </button>

      {expanded && (
        <div className="mt-1 space-y-1">
          {group.units.map(({ unit, index }) => (
            <UnitListItem
              key={index}
              unit={unit}
              index={index}
              isSelected={selectedUnitIndex === index}
              onSelect={onSelectUnit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
