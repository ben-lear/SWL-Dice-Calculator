import type { ArmyStats, ResolvedList } from '../../data/listTypes';
import { StatCard } from '../shared/StatCard';
import { StatRow } from '../shared/StatRow';
import SectionHeader from '../shared/SectionHeader';
import RangeDiceTable from './RangeDiceTable';
import KeywordTallySection from './KeywordTallySection';

interface ArmyStatsViewProps {
  stats: ArmyStats;
  meta: ResolvedList['meta'];
}

/**
 * Army-level aggregate statistics view — the default detail panel
 * content after importing a list.
 */
export default function ArmyStatsView({ stats, meta }: ArmyStatsViewProps) {
  return (
    <div className="space-y-4 md:space-y-3">
      <div>
        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-300">
          Army Overview
        </h2>

        {meta.faction && (
          <p className="mt-1 text-xs text-gray-500">
            {meta.battleForce ? `${meta.battleForce} · ` : ''}
            {meta.faction}
          </p>
        )}
      </div>

      {/* Tier 1: Key Stat Cards */}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        <StatCard label="Points" value={String(stats.totalPoints)} accentColor="indigo" />
        <StatCard label="Activations" value={String(stats.activationCount)} accentColor="emerald" />
        <StatCard label="Miniatures" value={String(stats.totalMiniatures)} accentColor="emerald" />
        <StatCard label="Wounds" value={String(stats.totalWounds)} accentColor="amber" />
        <StatCard
          label="Eff. Wounds"
          value={`≈${stats.totalEffectiveWounds}`}
          accentColor="amber"
        />
        <StatCard
          label="Pts/Activation"
          value={`≈${stats.avgPointsPerActivation}`}
          accentColor="rose"
        />
      </div>

      {/* Tier 2A: Tables — side by side on desktop */}
      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
        <SectionHeader title="Dice Output by Range">
          <RangeDiceTable data={stats.diceByRange} />
        </SectionHeader>

        {stats.unitsByRank.length > 0 && (
          <SectionHeader title="Units by Rank">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400">
                    <th className="px-2 py-1 text-left font-medium">Rank</th>
                    <th className="px-2 py-1 text-right font-medium">Count</th>
                    <th className="px-2 py-1 text-right font-medium">Points</th>
                    <th className="px-2 py-1 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.unitsByRank.map((entry) => (
                    <tr key={entry.rank} className="bg-gray-900/50 border-b border-gray-800/50">
                      <td className="px-2 py-1.5 text-gray-300 font-medium">{entry.rank}</td>
                      <td className="px-2 py-1.5 text-right text-gray-200">
                        {entry.count}
                      </td>
                      <td className="px-2 py-1.5 text-right text-gray-200">
                        {entry.points}pts
                      </td>
                      <td className="px-2 py-1.5 text-right text-gray-400">
                        {(entry.percentage * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionHeader>
        )}
      </div>

      {/* Tier 2B–G: Keyword sections — CSS columns for masonry packing on desktop */}
      <div className="space-y-4 md:space-y-0 md:columns-2 md:gap-4">
        {(stats.totalImpact > 0 ||
          stats.totalCritical > 0 ||
          stats.totalIon > 0 ||
          stats.surgeToCritUnitCount > 0) && (
          <div className="break-inside-avoid mb-4">
            <SectionHeader title="Anti-Armor Tech">
              <div className="space-y-0.5 border-l-2 border-red-500/50 pl-3">
                {stats.totalImpact > 0 && (
                  <StatRow label="Impact" value={`${stats.impactUnits} units (total ${stats.totalImpact})`} />
                )}
                {stats.totalCritical > 0 && (
                  <StatRow label="Critical" value={`${stats.criticalUnits} units`} />
                )}
                {stats.totalIon > 0 && (
                  <StatRow label="Ion" value={`${stats.ionUnits} units (total ${stats.totalIon})`} />
                )}
                {stats.surgeToCritUnitCount > 0 && (
                  <StatRow
                    label="Surge→Crit"
                    value={`${stats.surgeToCritUnitCount} units`}
                  />
                )}
              </div>
            </SectionHeader>
          </div>
        )}

        {(stats.sharpshooterUnits > 0 ||
          stats.blastWeaponCount > 0 ||
          stats.highVelocityWeaponCount > 0) && (
          <div className="break-inside-avoid mb-4">
            <SectionHeader title="Cover Denial">
              <div className="space-y-0.5 border-l-2 border-emerald-500/50 pl-3">
                {stats.sharpshooterUnits > 0 && (
                  <StatRow
                    label="Sharpshooter"
                    value={`${stats.sharpshooterUnits} units (total ${stats.totalSharpshooter})`}
                  />
                )}
                {stats.blastWeaponCount > 0 && (
                  <StatRow
                    label="Blast"
                    value={`${stats.blastWeaponCount} weapons`}
                  />
                )}
                {stats.highVelocityWeaponCount > 0 && (
                  <StatRow
                    label="High Velocity"
                    value={`${stats.highVelocityWeaponCount} weapons`}
                  />
                )}
              </div>
            </SectionHeader>
          </div>
        )}

        {(stats.suppressiveWeaponCount > 0 || stats.scatterWeaponCount > 0) && (
          <div className="break-inside-avoid mb-4">
            <SectionHeader title="Suppression & Control">
              <div className="space-y-0.5 border-l-2 border-amber-500/50 pl-3">
                {stats.suppressiveWeaponCount > 0 && (
                  <StatRow
                    label="Suppressive"
                    value={`${stats.suppressiveWeaponCount} weapons`}
                  />
                )}
                {stats.scatterWeaponCount > 0 && (
                  <StatRow
                    label="Scatter"
                    value={`${stats.scatterWeaponCount} weapons`}
                  />
                )}
              </div>
            </SectionHeader>
          </div>
        )}

        {stats.deploymentKeywords.length > 0 && (
          <div className="break-inside-avoid mb-4">
            <SectionHeader title="Deployment Advantage">
              <KeywordTallySection tallies={stats.deploymentKeywords} />
            </SectionHeader>
          </div>
        )}

        {(stats.actionEconomySelf.length > 0 ||
          stats.actionEconomySupport.length > 0) && (
          <div className="break-inside-avoid mb-4">
            <SectionHeader title="Action Economy">
              <div className="space-y-3">
                {stats.actionEconomySelf.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                      Self
                    </h4>
                    <KeywordTallySection tallies={stats.actionEconomySelf} />
                  </div>
                )}
                {stats.actionEconomySupport.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                      Support
                    </h4>
                    <KeywordTallySection tallies={stats.actionEconomySupport} />
                  </div>
                )}
              </div>
            </SectionHeader>
          </div>
        )}

        {stats.defensiveKeywords.length > 0 && (
          <div className="break-inside-avoid mb-4">
            <SectionHeader title="Defensive Tech">
              <KeywordTallySection tallies={stats.defensiveKeywords} />
            </SectionHeader>
          </div>
        )}
      </div>

      {/* Tier 2I: Command Cards */}
      {stats.commandCards.length > 0 && (
        <SectionHeader title="Command Cards">
          <ul className="space-y-0.5 text-sm text-gray-300">
            {stats.commandCards.map((card, i) => (
              <li key={i}>• {card}</li>
            ))}
          </ul>
          {stats.contingencies.length > 0 && (
            <div className="mt-2">
              <h4 className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Contingencies
              </h4>
              <ul className="space-y-0.5 text-sm text-gray-300">
                {stats.contingencies.map((card, i) => (
                  <li key={i}>• {card}</li>
                ))}
              </ul>
            </div>
          )}
        </SectionHeader>
      )}
    </div>
  );
}
