import type { ArmyStats, ResolvedList } from '../../data/listTypes';
import { StatCard } from '../shared/StatCard';
import { StatRow } from '../shared/StatRow';
import SectionHeader from '../shared/SectionHeader';
import RangeDiceTable from './RangeDiceTable';
import KeywordTallySection from './KeywordTallySection';

/** Tooltip descriptions for keyword tallies rendered via KeywordTallySection */
const KEYWORD_TOOLTIPS: Record<string, string> = {
  // Deployment Advantage
  scoutX: 'Scout X - after setup, this unit may make a speed-X move.',
  infiltrate: 'Infiltrate - this unit can deploy anywhere beyond range 3 of enemy units.',
  reposition: 'Reposition - after deploying, this unit may make a speed-1 move.',
  rapidReinforcements: 'Rapid Reinforcements - this unit may deploy from a board edge during the game.',
  outflank: 'Outflank - this unit may deploy from a side board edge on round 2+.',
  airdrop: 'Airdrop - this unit can deploy from reserve to anywhere on the battlefield.',
  transportX: 'Transport X - this unit can carry up to X other units during deployment.',
  transport: 'Transport - this unit can carry other units during deployment.',
  secretMission: 'Secret Mission - score victory points by moving a unit leader into the enemy deployment zone.',
  entourage: 'Entourage - this unit doesn\'t count toward rank requirements when paired with its entourage partner.',
  detachment: 'Detachment - this unit deploys as an attachment to a qualifying unit.',
  loadout: 'Loadout - this unit equips one of two upgrade configurations during setup.',
  pullingTheStrings: 'Pulling the Strings - lets another friendly unit perform a free action.',
  // Action Economy — Self
  charge: 'Charge - after a move action, this unit may perform a free melee attack.',
  relentless: 'Relentless - after a move action, this unit may perform a free ranged attack.',
  steady: 'Steady - after a move action, this unit may perform a free ranged attack.',
  gunslinger: 'Gunslinger - this unit can divide its ranged attack dice between two targets.',
  arsenalX: 'Arsenal X - this unit can use up to X weapons when attacking.',
  arsenal: 'Arsenal - this unit can use multiple weapons when attacking.',
  tactical: 'Tactical - this unit gains an aim token after performing a standard move.',
  nimble: 'Nimble - this unit gains a dodge token after being attacked.',
  agile: 'Agile - this unit gains a dodge token after performing a standard move.',
  takeCover: 'Take Cover - this unit may gain a dodge token as a free action.',
  cache: 'Cache - this unit begins the game with specified tokens.',
  calculateOdds: 'Calculate Odds - spend an action to gain 1 aim and 1 dodge token.',
  completeTheMission: 'Complete the Mission - spend a surge token for offensive or defensive benefits.',
  disengage: 'Disengage - this unit can move out of melee without penalty.',
  climbVehicle: 'Climb/Vehicle - this unit has the Climb keyword or is a vehicle.',
  jumpX: 'Jump X - this unit can make a move that ignores terrain up to height X.',
  jump: 'Jump - this unit can make a move that ignores terrain.',
  speeder: 'Speeder - this unit must perform a compulsory move.',
  makingHisWay: 'Making His Way in the Galaxy - special movement ability.',
  scaleX: 'Scale X - after a climb, this unit may make a speed-X move.',
  scale: 'Scale - after a climb, this unit may make a further move.',
  coverX: 'Cover X - this unit improves its own cover by X.',
  lowProfile: 'Low Profile - this unit improves its cover by 1 when it has cover.',
  // Action Economy — Support
  coordinate: 'Coordinate - when this unit is issued an order, a nearby friendly unit gains an aim or dodge token.',
  inspire: 'Inspire - when this unit activates, remove suppression from a nearby friendly unit.',
  directX: 'Direct X - after issuing orders, a nearby friendly trooper gains an order.',
  direct: 'Direct - after issuing orders, a nearby friendly trooper gains an order.',
  spotter: 'Spotter - when this unit aims, a nearby unit also gains an aim token.',
  commsRelay: 'Comms Relay - when issued an order, this unit may pass it to a nearby friendly unit.',
  aid: 'Aid - this unit can share tokens with friendly units.',
  compel: 'Compel - after a nearby friendly unit activates, it may gain 1 suppression to perform a free move.',
  // Defensive Tech
  armor: 'Armor - non-critical hits are blocked automatically.',
  armorX: 'Armor X - cancel up to X non-critical hit results during defense.',
  dangerSenseX: 'Danger Sense X - this unit rolls extra defense dice equal to its suppression tokens (up to X).',
  dangerSense: 'Danger Sense - this unit rolls extra defense dice based on suppression.',
  immunePierce: 'Immune: Pierce - Pierce cannot reduce this unit\'s defense.',
  immuneBlast: 'Immune: Blast - Blast does not remove this unit\'s cover.',
  immuneDeflect: 'Immune: Deflect - Deflect cannot be used against this unit.',
  immuneMelee: 'Immune: Melee Pierce - melee Pierce cannot reduce this unit\'s defense.',
  deflect: 'Deflect - when defending with a dodge token, gain surge: block and the attacker suffers a wound on a surge.',
  guardianX: 'Guardian X - this unit can absorb up to X wounds for a nearby friendly unit.',
  guardian: 'Guardian - this unit can absorb wounds for a nearby friendly unit.',
  shieldX: 'Shield X - this unit has X shield tokens that absorb hits before wounds.',
  shield: 'Shield - this unit has shield tokens that absorb hits.',
  impervious: 'Impervious - this unit rolls extra defense dice equal to the Pierce value.',
  uncannyLuckX: 'Uncanny Luck X - reroll up to X defense dice.',
  uncannyLuck: 'Uncanny Luck - reroll defense dice.',
  independentDodge: 'Independent: Dodge - if this unit has no order token, it gains a dodge token at activation.',
  independentSurge: 'Independent: Surge - if this unit has no order token, it gains a surge token at activation.',
  independentAim: 'Independent: Aim - if this unit has no order token, it gains an aim token at activation.',
  soresu: 'Soresu Mastery - when spending dodge tokens, each dodge cancels all hit results of one type.',
  djem: 'Djem So Mastery - when spending dodge tokens, gain an aim token.',
  block: 'Block - spend a dodge token to cancel a hit result during defense.',
  outmaneuver: 'Outmaneuver - spend a dodge token to cancel a crit result during defense.',
};

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
        <StatCard label="Points" value={String(stats.totalPoints)} accentColor="indigo" tooltip="Total army point cost including all upgrades" />
        <StatCard label="Activations" value={String(stats.activationCount)} accentColor="emerald" tooltip="Number of unit activations in the army" />
        <StatCard label="Miniatures" value={String(stats.totalMiniatures)} accentColor="emerald" tooltip="Total miniature count across all units" />
        <StatCard label="Wounds" value={String(stats.totalWounds)} accentColor="amber" tooltip="Total raw wound capacity across all units" />
        <StatCard
          label="Eff. Wounds"
          value={`~${stats.totalEffectiveWounds}`}
          accentColor="amber"
          tooltip="Effective wounds - raw wounds adjusted by defense die quality and surge conversion. Higher means harder to destroy."
        />
        <StatCard
          label="Pts/Eff. Wound"
          value={`~${stats.avgPointsPerEffectiveWound}`}
          accentColor="rose"
          tooltip="Points spent per effective wound - lower values indicate more durable armies for their cost."
        />
      </div>

      {/* Tier 2A: Dice output + courage breakdown side by side */}
      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
        <SectionHeader title="Dice Output by Range" tooltip="Total attack dice and expected successes the army can produce at each range band">
          <RangeDiceTable data={stats.diceByRange} />
        </SectionHeader>

        {stats.courageBreakdown.length > 0 && (
          <SectionHeader title="Courage Breakdown" tooltip="Distribution of units by courage value - affects panic and suppression vulnerability">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400">
                    <th className="px-2 py-1 text-left font-medium cursor-help" title="The unit's courage value - determines how many suppression tokens cause panic. Inf. = Fearless">Courage</th>
                    <th className="px-2 py-1 text-right font-medium cursor-help" title="Number of units at this courage level">Count</th>
                    <th className="px-2 py-1 text-right font-medium cursor-help" title="Total points invested in units at this courage level">Points</th>
                    <th className="px-2 py-1 text-right font-medium cursor-help" title="Percentage of total army points at this courage level">%</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.courageBreakdown.map((entry) => (
                    <tr
                      key={entry.label}
                      className="bg-gray-900/50 border-b border-gray-800/50"
                    >
                      <td
                        className={`px-2 py-1.5 font-medium ${
                          entry.courage === null
                            ? 'text-gray-500 italic'
                            : entry.courage === Infinity
                              ? 'text-sky-400'
                              : 'text-gray-300'
                        }`}
                      >
                        {entry.label}
                      </td>
                      <td className="px-2 py-1.5 text-right text-gray-200">
                        {entry.unitCount}
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

      {/* Units by Rank — full width below */}
      {stats.unitsByRank.length > 0 && (
        <SectionHeader title="Units by Rank" tooltip="Army composition by rank with offensive contribution and efficiency metrics">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="px-2 py-1 text-left font-medium cursor-help" title="Unit rank (Commander, Operative, Corps, Special Forces, Support, Heavy)">Rank</th>
                  <th className="px-2 py-1 text-right font-medium cursor-help" title="Number of units of this rank">Count</th>
                  <th className="px-2 py-1 text-right font-medium cursor-help" title="Total points invested in this rank">Points</th>
                  <th className="px-2 py-1 text-right font-medium cursor-help" title="Percentage of total army points spent on this rank">%</th>
                  <th
                    className="px-2 py-1 text-right font-medium text-blue-300 cursor-help"
                    title="This rank's share of the army's total expected successes across all range bands"
                  >
                    Exp. Dice %
                  </th>
                  <th
                    className="px-2 py-1 text-right font-medium text-amber-300 cursor-help"
                    title="This rank's share of the army's total adjusted expected successes (accounting for tokens and offensive keywords) across all range bands"
                  >
                    Adj. Dice %
                  </th>
                  <th
                    className="px-2 py-1 text-right font-medium text-emerald-300 cursor-help"
                    title="Ratio of adjusted dice contribution to points investment (Adj. Dice % ÷ Points %). Values above 1.0 indicate above-average offensive efficiency for the points spent."
                  >
                    Efficiency
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.unitsByRank.map((entry) => {
                  const efficiency =
                    entry.percentage > 0 && entry.adjustedContribution > 0
                      ? entry.adjustedContribution / entry.percentage
                      : 0;
                  return (
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
                    <td className="px-2 py-1.5 text-right font-semibold text-blue-300">
                      {entry.expectedContribution > 0
                        ? `${(entry.expectedContribution * 100).toFixed(0)}%`
                        : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold text-amber-300">
                      {entry.adjustedContribution > 0
                        ? `${(entry.adjustedContribution * 100).toFixed(0)}%`
                        : <span className="text-gray-600">—</span>}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-semibold ${efficiency >= 1.1 ? 'text-emerald-300' : efficiency > 0 && efficiency < 0.9 ? 'text-rose-400' : 'text-gray-300'}`}>
                      {efficiency > 0
                        ? `${efficiency.toFixed(2)}×`
                        : <span className="text-gray-600">—</span>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionHeader>
      )}

      {/* Tier 2B–G: Keyword sections — CSS columns for masonry packing on desktop */}
      <div className="space-y-4 md:space-y-0 md:columns-2 md:gap-4">
        {(stats.totalImpact > 0 ||
          stats.totalCritical > 0 ||
          stats.totalIon > 0 ||
          stats.surgeToCritUnitCount > 0) && (
          <div className="break-inside-avoid mb-4">
            <SectionHeader title="Anti-Armor Tech" tooltip="Keywords that help against armored and shielded targets">
              <div className="space-y-0.5 border-l-2 border-red-500/50 pl-3">
                {stats.totalImpact > 0 && (
                  <StatRow label="Impact" value={`${stats.impactUnits} units (total ${stats.totalImpact})`} tooltip="Impact X - converts hit results to critical results against armored targets (up to the Impact X value)" />
                )}
                {stats.totalCritical > 0 && (
                  <StatRow label="Critical" value={`${stats.criticalUnits} units`} tooltip="Critical X - converts hit results to critical results during the Modify Attack Dice step" />
                )}
                {stats.totalIon > 0 && (
                  <StatRow label="Ion" value={`${stats.ionUnits} units (total ${stats.totalIon})`} tooltip="Ion X - a unit that suffers wounds from an Ion attack gains X ion tokens" />
                )}
                {stats.surgeToCritUnitCount > 0 && (
                  <StatRow
                    label="Surge: Crit"
                    value={`${stats.surgeToCritUnitCount} units`}
                    tooltip="This unit converts attack surge results to critical results"
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
            <SectionHeader title="Cover Denial" tooltip="Keywords that reduce or ignore the defender's cover">
              <div className="space-y-0.5 border-l-2 border-emerald-500/50 pl-3">
                {stats.sharpshooterUnits > 0 && (
                  <StatRow
                    label="Sharpshooter"
                    value={`${stats.sharpshooterUnits} units (total ${stats.totalSharpshooter})`}
                    tooltip="Sharpshooter X - reduces the defender's cover value by X"
                  />
                )}
                {stats.blastWeaponCount > 0 && (
                  <StatRow
                    label="Blast"
                    value={`${stats.blastWeaponCount} weapons`}
                    tooltip="Blast - ignores cover entirely"
                  />
                )}
                {stats.highVelocityWeaponCount > 0 && (
                  <StatRow
                    label="High Velocity"
                    value={`${stats.highVelocityWeaponCount} weapons`}
                    tooltip="High Velocity - the defender cannot spend dodge tokens against this weapon"
                  />
                )}
              </div>
            </SectionHeader>
          </div>
        )}

        {(stats.suppressiveWeaponCount > 0 || stats.scatterWeaponCount > 0) && (
          <div className="break-inside-avoid mb-4">
            <SectionHeader title="Suppression & Control" tooltip="Weapons that inflict suppression or benefit against multi-mini units">
              <div className="space-y-0.5 border-l-2 border-amber-500/50 pl-3">
                {stats.suppressiveWeaponCount > 0 && (
                  <StatRow
                    label="Suppressive"
                    value={`${stats.suppressiveWeaponCount} weapons`}
                    tooltip="Suppressive - the defender gains a suppression token after the attack resolves"
                  />
                )}
                {stats.scatterWeaponCount > 0 && (
                  <StatRow
                    label="Scatter"
                    value={`${stats.scatterWeaponCount} weapons`}
                    tooltip="Scatter - adds 1 die per extra miniature in the defending unit beyond the first"
                  />
                )}
              </div>
            </SectionHeader>
          </div>
        )}

        {stats.deploymentKeywords.length > 0 && (
          <div className="break-inside-avoid mb-4">
            <SectionHeader title="Deployment Advantage" tooltip="Keywords affecting deployment, transport, and reinforcement">
              <KeywordTallySection tallies={stats.deploymentKeywords} tooltips={KEYWORD_TOOLTIPS} />
            </SectionHeader>
          </div>
        )}

        {(stats.actionEconomySelf.length > 0 ||
          stats.actionEconomySupport.length > 0) && (
          <div className="break-inside-avoid mb-4">
            <SectionHeader title="Action Economy" tooltip="Keywords that grant free actions or extra attacks">
              <div className="space-y-3">
                {stats.actionEconomySelf.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                      Self
                    </h4>
                    <KeywordTallySection tallies={stats.actionEconomySelf} tooltips={KEYWORD_TOOLTIPS} />
                  </div>
                )}
                {stats.actionEconomySupport.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                      Support
                    </h4>
                    <KeywordTallySection tallies={stats.actionEconomySupport} tooltips={KEYWORD_TOOLTIPS} />
                  </div>
                )}
              </div>
            </SectionHeader>
          </div>
        )}

        {stats.defensiveKeywords.length > 0 && (
          <div className="break-inside-avoid mb-4">
            <SectionHeader title="Defensive Tech" tooltip="Keywords that improve the army's survivability">
              <KeywordTallySection tallies={stats.defensiveKeywords} tooltips={KEYWORD_TOOLTIPS} />
            </SectionHeader>
          </div>
        )}
      </div>

      {/* Tier 2I: Command Cards */}
      {stats.commandCards.length > 0 && (
        <SectionHeader title="Command Cards" tooltip="Command cards and contingency cards in the army">
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
