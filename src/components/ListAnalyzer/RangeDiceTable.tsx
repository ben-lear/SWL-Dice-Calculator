import type { RangeBandDice } from '../../data/listTypes';

interface RangeDiceTableProps {
  data: RangeBandDice[];
  /** Army-wide dice totals per range band — enables contribution columns when provided */
  armyTotals?: RangeBandDice[];
  /** This unit's fraction of total army points (0–1) — used for efficiency calc */
  unitCostPercentage?: number;
}

const TOOLTIPS = {
  range:
    'The range band at which these weapons can fire. Melee requires base contact. R1–R5 are increasing distances.',
  red: 'Red attack dice. 5 hits, 1 crit, 1 surge, 1 blank per die (8 faces). Highest quality attack die.',
  black:
    'Black attack dice. 3 hits, 1 crit, 1 surge, 3 blanks per die (8 faces). Medium quality.',
  white:
    'White attack dice. 1 hit, 1 crit, 1 surge, 5 blanks per die (8 faces). Lowest quality attack die.',
  totalDice:
    'Total attack dice the army can throw at this range band, combining all eligible weapons across all units.',
  expectedSuccesses:
    'Expected successful results (hits + crits) per attack at this range. Each die is weighted by its color and the firing unit\'s surge conversion.',
  adjustedExpectedSuccesses:
    'Expected successes adjusted for automatic token generation (Tactical, Independent, Target, Cache, Observe) and offensive keywords (Ram, Critical, Marksman, Jar\'Kai, Hold the Line, Precise, Complete the Mission).',
  expectedContribution:
    'This unit\'s share of the army\'s total expected successes at this range band.',
  adjustedContribution:
    'This unit\'s share of the army\'s total adjusted expected successes at this range band.',
  efficiency:
    'Ratio of adjusted dice contribution to points investment (Adj. % ÷ Cost %). Values above 1.0× indicate above-average offensive efficiency for the points spent at this range.',
};

/**
 * Table showing dice output by range band with raw dice counts
 * and weighted success metrics (expected successes + efficacy).
 */
export default function RangeDiceTable({ data, armyTotals, unitCostPercentage }: RangeDiceTableProps) {
  const showContribution = !!armyTotals;
  const visibleRows = data.filter((row) => row.totalDice > 0);

  // Build a lookup from range band → army totals for contribution calc
  const armyByBand = new Map(
    (armyTotals ?? []).map((b) => [b.rangeBand, b]),
  );

  if (visibleRows.length === 0) {
    return <p className="text-sm text-gray-500">No weapons with dice data.</p>;
  }

  // Best-row highlighting uses adjusted values
  const bestValue = Math.max(
    ...visibleRows.map((r) => r.adjustedExpectedSuccesses),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
            <th className="px-2 py-1.5 text-left font-medium cursor-help" title={TOOLTIPS.range}>
              Range
            </th>
            <th className="px-2 py-1.5 font-medium cursor-help" title={TOOLTIPS.red}>
              <div className="flex items-center justify-end">
                <span className="inline-block h-2.5 w-2.5 rotate-45 bg-red-500 ring-1 ring-red-600" />
              </div>
            </th>
            <th className="px-2 py-1.5 font-medium cursor-help" title={TOOLTIPS.black}>
              <div className="flex items-center justify-end">
                <span className="inline-block h-2.5 w-2.5 rotate-45 bg-gray-900 ring-1 ring-gray-500" />
              </div>
            </th>
            <th className="px-2 py-1.5 font-medium cursor-help" title={TOOLTIPS.white}>
              <div className="flex items-center justify-end">
                <span className="inline-block h-2.5 w-2.5 rotate-45 bg-gray-100 ring-1 ring-gray-300" />
              </div>
            </th>
            <th className="px-2 py-1.5 text-right font-medium cursor-help" title={TOOLTIPS.totalDice}>
              Dice
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-blue-300 cursor-help" title={TOOLTIPS.expectedSuccesses}>
              Wounds
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-amber-300 cursor-help" title={TOOLTIPS.adjustedExpectedSuccesses}>
              Adjusted
            </th>
            {showContribution && (
              <>
                <th className="px-2 py-1.5 text-right font-medium text-blue-300 cursor-help" title={TOOLTIPS.expectedContribution}>
                  Wound %
                </th>
                <th className="px-2 py-1.5 text-right font-medium text-amber-300 cursor-help" title={TOOLTIPS.adjustedContribution}>
                  Adj. Wound %
                </th>
                <th className="px-2 py-1.5 text-right font-medium text-emerald-300 cursor-help" title={TOOLTIPS.efficiency}>
                  Efficiency
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, i) => {
            const isBest = row.adjustedExpectedSuccesses === bestValue && bestValue > 0;
            const adjustedHigher = row.adjustedExpectedSuccesses > row.expectedSuccesses + 0.05;

            // Contribution calculations (only when armyTotals provided)
            const armyBand = armyByBand.get(row.rangeBand);
            const expContrib = armyBand && armyBand.expectedSuccesses > 0
              ? row.expectedSuccesses / armyBand.expectedSuccesses
              : 0;
            const adjContrib = armyBand && armyBand.adjustedExpectedSuccesses > 0
              ? row.adjustedExpectedSuccesses / armyBand.adjustedExpectedSuccesses
              : 0;
            const costPct = unitCostPercentage ?? 0;
            const efficiency = costPct > 0 && adjContrib > 0 ? adjContrib / costPct : 0;

            return (
              <tr
                key={row.rangeBand}
                className={`${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/30'} transition-colors hover:bg-gray-800/50 ${isBest ? 'border-l-2 border-amber-400' : ''}`}
              >
                <td className="px-2 py-1 text-gray-300">{row.rangeBand}</td>
                <td className="px-2 py-1 text-right text-red-400">
                  {row.redDice > 0 ? row.redDice : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-2 py-1 text-right text-gray-100">
                  {row.blackDice > 0 ? row.blackDice : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-2 py-1 text-right text-gray-400">
                  {row.whiteDice > 0 ? row.whiteDice : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-2 py-1 text-right font-medium text-gray-200">
                  {row.totalDice}
                </td>
                <td className="px-2 py-1 text-right font-semibold text-blue-300">
                  {row.expectedSuccesses.toFixed(1)}
                </td>
                <td className={`px-2 py-1 text-right font-semibold ${isBest ? 'text-amber-200' : adjustedHigher ? 'text-amber-300' : 'text-amber-400/70'}`}>
                  {row.adjustedExpectedSuccesses.toFixed(1)}
                </td>
                {showContribution && (
                  <>
                    <td className="px-2 py-1 text-right font-semibold text-blue-300">
                      {expContrib > 0
                        ? `${(expContrib * 100).toFixed(0)}%`
                        : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-2 py-1 text-right font-semibold text-amber-300">
                      {adjContrib > 0
                        ? `${(adjContrib * 100).toFixed(0)}%`
                        : <span className="text-gray-600">—</span>}
                    </td>
                    <td className={`px-2 py-1 text-right font-semibold ${efficiency >= 1.1 ? 'text-emerald-300' : efficiency > 0 && efficiency < 0.9 ? 'text-rose-400' : 'text-gray-300'}`}>
                      {efficiency > 0
                        ? `${efficiency.toFixed(2)}×`
                        : <span className="text-gray-600">—</span>}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
