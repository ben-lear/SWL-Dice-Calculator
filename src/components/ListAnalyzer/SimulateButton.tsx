import type { ResolvedListUnit } from '../../data/listTypes';
import { useNavigateToSimulator } from '../../hooks/useNavigateToSimulator';

interface SimulateButtonProps {
  unit: ResolvedListUnit;
}

/**
 * Pair of action buttons that navigate to the Simulator page with
 * the selected unit pre-loaded as attacker or defender.
 */
export default function SimulateButton({ unit }: SimulateButtonProps) {
  const { navigateAsAttacker, navigateAsDefender } =
    useNavigateToSimulator();

  const resolved = unit.resolvedUnit;
  const isEnriched = resolved?.isEnriched ?? false;
  const isResolved = resolved !== null;

  const disabled = !isResolved;
  const showUnenrichedHint = isResolved && !isEnriched;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => navigateAsAttacker(unit)}
          disabled={disabled}
          className="flex-1 rounded bg-red-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          title="Load this unit as the attacker in the Dice Simulator"
        >
          Simulate as Attacker
        </button>
        <button
          onClick={() => navigateAsDefender(unit)}
          disabled={disabled}
          className="flex-1 rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          title="Load this unit as the defender in the Dice Simulator"
        >
          Simulate as Defender
        </button>
      </div>
      {showUnenrichedHint && (
        <p className="text-center text-xs text-amber-400/70">
          This unit has no enriched weapon data — simulator will use base
          preset only.
        </p>
      )}
      {disabled && (
        <p className="text-center text-xs text-gray-500">
          Cannot simulate unresolved units.
        </p>
      )}
    </div>
  );
}
