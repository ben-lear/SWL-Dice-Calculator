import type { ArmyStats, ResolvedListUnit } from '../../data/listTypes';
import type { ResolvedUpgrade } from '../../data/types';
import { computeUnitDiceByRange, computeEffectiveWounds } from '../../data/armyStats';
import { StatCard } from '../shared/StatCard';
import { DefenseDieColor, DefenseSurgeChart, AttackType } from '../../engine/types';
import DiceIconDisplay from '../shared/DiceIconDisplay';
import RangeDiceTable from './RangeDiceTable';
import SimulateButton from './SimulateButton';

interface UnitDetailViewProps {
  unit: ResolvedListUnit;
  armyStats: ArmyStats;
  onBackToArmy: () => void;
}

/**
 * Individual unit detail view — shown when a unit is selected
 * in the left panel.
 */
export default function UnitDetailView({
  unit,
  armyStats,
  onBackToArmy,
}: UnitDetailViewProps) {
  const resolved = unit.resolvedUnit;

  // Compute unit-level dice by range
  const upgrades = unit.resolvedUpgrades.filter(
    (u): u is ResolvedUpgrade => u !== null,
  );

  const diceByRange = resolved
    ? computeUnitDiceByRange(resolved, upgrades)
    : [];

  const effectiveWounds = resolved
    ? computeEffectiveWounds(resolved, upgrades)
    : 0;

  // Compute total cost
  let totalCost = resolved?.cost ?? 0;
  let upgradeCost = 0;
  for (const upg of unit.resolvedUpgrades) {
    if (upg) {
      upgradeCost += upg.cost;
    }
  }
  totalCost += upgradeCost;

  // Collect unit keywords for display — merge base unit keywords with
  // upgrade-granted unit keywords (same merging logic as tallyKeywords in armyStats.ts)
  const keywordEntries: string[] = [];
  if (resolved?.keywords) {
    const merged: Record<string, number | boolean | string> = { ...resolved.keywords };
    for (const upg of upgrades) {
      for (const [key, value] of Object.entries(upg.keywords)) {
        const existing = merged[key];
        if (typeof value === 'number' && typeof existing === 'number') {
          merged[key] = existing + value;
        } else if (typeof value === 'boolean' && value) {
          merged[key] = true;
        } else if (merged[key] === undefined) {
          merged[key] = value;
        }
      }
    }
    for (const [key, value] of Object.entries(merged)) {
      if (value === true) {
        keywordEntries.push(formatKeyword(key));
      } else if (typeof value === 'number' && value > 0) {
        keywordEntries.push(`${formatKeyword(key)} ${value}`);
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBackToArmy}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-600 bg-gray-700/80 px-3 py-1.5 text-sm font-medium text-gray-200 shadow-sm transition-colors hover:border-blue-500 hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <span aria-hidden="true">←</span>
        Army Overview
      </button>

      {/* Header */}
      {resolved ? (
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wide text-gray-100">
            {resolved.name}
          </h2>
          {resolved.title && (
            <p className="text-sm text-gray-400">{resolved.title}</p>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-bold text-amber-400">
            ⚠ {unit.rawName}
          </h2>
          <p className="text-sm text-amber-400/70">Unresolved unit</p>
        </div>
      )}

      {/* Stat Cards */}
      {resolved && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Points" value={String(totalCost)} tooltip="Total unit cost including equipped upgrades" />
          <StatCard label="Health" value={String(resolved.health)} tooltip="Wound threshold per miniature" />
          <StatCard label="Figures" value={String(resolved.figures)} tooltip="Number of miniatures in this unit" />
          <StatCard
            label="Def. Die"
            tooltip="Defense die color - Red saves on 3/6 results, White saves on 1/6 results"
            value={
              resolved.defenseDieColor === DefenseDieColor.Red ? (
                <span
                  className="inline-block h-5 w-5 rounded-sm bg-red-500"
                  aria-label="Red die"
                />
              ) : (
                <span
                  className="inline-block h-5 w-5 rounded-sm bg-white"
                  aria-label="White die"
                />
              )
            }
          />
          <StatCard
            label="Def. Surge"
            tooltip="Whether this unit converts defense surges to Block results"
            value={
              resolved.defenseSurgeChart === DefenseSurgeChart.ToBlock
                ? 'Block'
                : 'None'
            }
          />
          <StatCard
            label="Eff. Wounds"            tooltip="Effective wounds - health adjusted by defense die and surge. Higher means more durable."            value={`~${Math.round(effectiveWounds * 10) / 10}`}
          />
        </div>
      )}

      {/* Keywords */}
      {keywordEntries.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs uppercase tracking-wide text-gray-500">
            Keywords
          </h3>
          <p className="text-sm text-gray-300">
            {keywordEntries.join(' · ')}
          </p>
        </div>
      )}

      {/* Weapons */}
      {resolved && resolved.weapons.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-gray-500">
            Weapons
          </h3>
          <div className="space-y-2">
            {resolved.weapons.map((weapon, i) => (
              <div
                key={i}
                className="rounded bg-gray-800/50 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">
                    {weapon.name || 'Unnamed Weapon'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatWeaponRange(weapon.weaponType, weapon.minRange, weapon.maxRange)}
                  </span>
                </div>
                <div className="mt-1">
                  <DiceIconDisplay
                    redDice={weapon.redDice ?? 0}
                    blackDice={weapon.blackDice ?? 0}
                    whiteDice={weapon.whiteDice ?? 0}
                  />
                </div>
                {weapon.keywords && (
                  <div className="mt-1 text-xs italic text-gray-400">
                    {formatWeaponKeywords(weapon.keywords)}
                  </div>
                )}
              </div>
            ))}

            {/* Upgrade-granted weapons */}
            {upgrades.flatMap((upg) =>
              upg.weapons.map((weapon, i) => (
                <div
                  key={`${upg.id}-${i}`}
                  className="rounded bg-gray-800/50 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-200">
                      {weapon.name || upg.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatWeaponRange(weapon.weaponType, weapon.minRange, weapon.maxRange)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <DiceIconDisplay
                      redDice={weapon.redDice ?? 0}
                      blackDice={weapon.blackDice ?? 0}
                      whiteDice={weapon.whiteDice ?? 0}
                    />
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    via {upg.name}
                  </div>
                </div>
              )),
            )}
          </div>
        </div>
      )}

      {/* Dice by Range */}
      {diceByRange.some((r) => r.totalDice > 0) && (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-gray-500">
            Dice Output by Range
          </h3>
          <RangeDiceTable
            data={diceByRange}
            armyTotals={armyStats.diceByRange}
            unitCostPercentage={
              armyStats.totalPoints > 0
                ? totalCost / armyStats.totalPoints
                : 0
            }
          />
        </div>
      )}

      {/* Equipped Upgrades */}
      <div>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-gray-500">
          Equipped Upgrades
        </h3>
        {unit.rawUpgradeNames.length === 0 ? (
          <p className="text-sm text-gray-500">None</p>
        ) : (
          <div className="space-y-1">
            {unit.rawUpgradeNames.map((name, i) => {
              const resolvedUpg = unit.resolvedUpgrades[i];
              if (resolvedUpg) {
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-300">☑ {resolvedUpg.name}</span>
                    <span className="text-gray-500">{resolvedUpg.cost}pts</span>
                  </div>
                );
              }
              return (
                <div key={i} className="text-sm text-amber-400">
                  ⚠ {name} — not found
                </div>
              );
            })}
            {upgradeCost > 0 && (
              <div className="mt-1 border-t border-gray-700 pt-1 text-sm text-gray-400">
                Total: {resolved?.cost ?? 0} + {upgradeCost} = {totalCost}pts
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simulate Buttons */}
      <SimulateButton unit={unit} />
    </div>
  );
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatKeyword(key: string): string {
  // Convert camelCase to Title Case, remove trailing X for magnitude keywords
  return key
    .replace(/X$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatWeaponRange(
  weaponType?: AttackType,
  minRange?: number,
  maxRange?: number,
): string {
  if (weaponType === AttackType.Melee) return 'Melee';
  if (minRange !== undefined && maxRange !== undefined) {
    return minRange === maxRange ? `R${minRange}` : `R${minRange}–${maxRange}`;
  }
  if (maxRange !== undefined) return `R1–${maxRange}`;
  return '';
}

function formatWeaponKeywords(
  keywords: Record<string, unknown>,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(keywords)) {
    if (value === true) {
      parts.push(formatKeyword(key));
    } else if (typeof value === 'number' && value > 0) {
      parts.push(`${formatKeyword(key)} ${value}`);
    }
  }
  return parts.join(', ');
}
