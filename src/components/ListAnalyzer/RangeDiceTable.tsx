import type { RangeBandDice } from '../../data/listTypes';

interface RangeDiceTableProps {
  data: RangeBandDice[];
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
  attackingEfficacy:
    'Attacking Efficacy — the percentage of dice that produce a successful result (hit or crit) at this range. Higher values mean better quality dice and surge conversion.',
};

/**
 * Table showing dice output by range band with raw dice counts
 * and weighted success metrics (expected successes + efficacy).
 */
export default function RangeDiceTable({ data }: RangeDiceTableProps) {
  const visibleRows = data.filter((row) => row.totalDice > 0);

  if (visibleRows.length === 0) {
    return <p className="text-sm text-gray-500">No weapons with dice data.</p>;
  }

  // Find the row with the highest expected successes for highlighting
  const bestExpected = Math.max(...visibleRows.map((r) => r.expectedSuccesses));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 text-xs text-gray-400">
            <th className="px-2 py-1.5 text-left font-medium" title={TOOLTIPS.range}>
              Range
            </th>
            <th className="px-2 py-1.5 font-medium" title={TOOLTIPS.red}>
              <div className="flex items-center justify-end">
                <span className="inline-block h-2.5 w-2.5 rotate-45 bg-red-500 ring-1 ring-red-600" />
              </div>
            </th>
            <th className="px-2 py-1.5 font-medium" title={TOOLTIPS.black}>
              <div className="flex items-center justify-end">
                <span className="inline-block h-2.5 w-2.5 rotate-45 bg-gray-900 ring-1 ring-gray-500" />
              </div>
            </th>
            <th className="px-2 py-1.5 font-medium" title={TOOLTIPS.white}>
              <div className="flex items-center justify-end">
                <span className="inline-block h-2.5 w-2.5 rotate-45 bg-gray-100 ring-1 ring-gray-300" />
              </div>
            </th>
            <th className="px-2 py-1.5 text-right font-medium" title={TOOLTIPS.totalDice}>
              Dice
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-blue-300" title={TOOLTIPS.expectedSuccesses}>
              Expected
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, i) => {
            const isBest = row.expectedSuccesses === bestExpected && bestExpected > 0;
            return (
              <tr
                key={row.rangeBand}
                className={`${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/30'} ${isBest ? 'border-l-2 border-blue-400' : ''}`}
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
                <td className={`px-2 py-1 text-right font-semibold ${isBest ? 'text-blue-200' : 'text-blue-300'}`}>
                  {row.expectedSuccesses.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
