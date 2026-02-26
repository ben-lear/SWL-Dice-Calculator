/**
 * Army Stats Calculator — pure computation functions for aggregating
 * army-level statistics from resolved list units.
 *
 * Lives in src/data (not src/engine) because it operates on data-layer
 * types (ResolvedUnit, ResolvedUpgrade). May import engine enums for
 * type discrimination.
 */

import type { ResolvedUnit, ResolvedUpgrade, WeaponProfile } from './types';
import { UpgradeSlot } from './types';
import type {
  ResolvedListUnit,
  ArmyStats,
  RangeBandDice,
  KeywordTally,
  SaveTier,
  RankBreakdown,
} from './listTypes';
import {
  AttackSurgeChart,
  DefenseDieColor,
  DefenseSurgeChart,
  AttackType,
} from '../engine/types';

// ============================================================================
// Defense Probability Helpers
// ============================================================================

/**
 * Compute the probability of rolling a block on a single defense die.
 *
 * White die: 1 block, 1 surge, 4 blanks out of 6 faces
 * Red die:   3 blocks, 1 surge, 2 blanks out of 6 faces
 */
export function computeBaseSaveProbability(
  defenseDieColor: DefenseDieColor | null,
  defenseSurgeChart: DefenseSurgeChart | null,
): number {
  if (!defenseDieColor) return 0;

  const isRed = defenseDieColor === DefenseDieColor.Red;
  const blockFaces = isRed ? 3 : 1;
  const surgeFaces = defenseSurgeChart === DefenseSurgeChart.ToBlock ? 1 : 0;
  return (blockFaces + surgeFaces) / 6;
}

/**
 * Compute effective wounds for a unit — a rough heuristic for how much
 * damage a unit can absorb accounting for its save quality and keywords.
 */
export function computeEffectiveWounds(
  unit: ResolvedUnit,
  upgrades: ResolvedUpgrade[],
): number {
  const baseSave = Math.min(
    computeBaseSaveProbability(unit.defenseDieColor, unit.defenseSurgeChart),
    0.95,
  );

  // Count figures including non-noncombatant upgrade minis
  const extraMinis = upgrades.reduce(
    (sum, u) => sum + (u.noncombatant ? 0 : u.addsMiniature),
    0,
  );
  const figures = unit.figures + extraMinis;
  const totalHealth = unit.health * figures;

  // Keyword-based bonus health
  let bonusHealth = 0;
  const keywords = unit.keywords;

  // Merge upgrade keywords
  const mergedKeywords: Record<string, number | boolean | string> = { ...keywords };
  for (const upg of upgrades) {
    for (const [key, value] of Object.entries(upg.keywords)) {
      const existing = mergedKeywords[key];
      if (typeof value === 'number' && typeof existing === 'number') {
        mergedKeywords[key] = existing + value;
      } else if (typeof value === 'boolean' && value) {
        mergedKeywords[key] = true;
      } else if (mergedKeywords[key] === undefined) {
        mergedKeywords[key] = value;
      }
    }
  }

  const shieldedX = typeof mergedKeywords['shieldedX'] === 'number' ? mergedKeywords['shieldedX'] : 0;
  if (shieldedX > 0) {
    bonusHealth += shieldedX * figures;
  }

  const armorX = typeof mergedKeywords['armorX'] === 'number' ? mergedKeywords['armorX'] : 0;
  if (armorX > 0) {
    bonusHealth += totalHealth * 0.2;
  }

  if (mergedKeywords['impervious'] === true) {
    bonusHealth += totalHealth * 0.1;
  }

  const dangerSenseX = typeof mergedKeywords['dangerSenseX'] === 'number' ? mergedKeywords['dangerSenseX'] : 0;
  if (dangerSenseX > 0) {
    const bonusDice = Math.min(dangerSenseX, 1);
    bonusHealth += bonusDice * baseSave * totalHealth;
  }

  return (totalHealth + bonusHealth) / (1 - baseSave);
}

// ============================================================================
// Attack Dice Success Weighting
// ============================================================================

/**
 * Compute the probability of a "success" (hit or crit) per attack die,
 * factoring in surge conversion.
 *
 * 8-sided attack dice:
 *   Red:   5 hits, 1 crit, 1 surge, 1 blank
 *   Black: 3 hits, 1 crit, 1 surge, 3 blanks
 *   White: 1 hit,  1 crit, 1 surge, 5 blanks
 */
export function computeAttackDieSuccessRate(
  dieColor: 'red' | 'black' | 'white',
  attackSurgeChart: AttackSurgeChart | null,
): number {
  const successFaces: Record<string, number> = {
    red: 6,   // 5 hits + 1 crit
    black: 4, // 3 hits + 1 crit
    white: 2, // 1 hit + 1 crit
  };

  const base = successFaces[dieColor] ?? 2;
  const surgeBonus =
    attackSurgeChart === AttackSurgeChart.ToHit ||
    attackSurgeChart === AttackSurgeChart.ToCrit
      ? 1
      : 0;

  return (base + surgeBonus) / 8;
}

// ============================================================================
// Dice Output by Range
// ============================================================================

/** Range bands used for aggregation */
const RANGE_BANDS = ['Melee', 'R1', 'R2', 'R3', 'R4', 'R5'] as const;

/** Check if a weapon is eligible for a given range band */
function weaponCoversRange(
  weapon: WeaponProfile,
  rangeBand: string,
): boolean {
  if (rangeBand === 'Melee') {
    return (
      weapon.weaponType === AttackType.Melee ||
      weapon.weaponType === AttackType.Hybrid
    );
  }

  // Ranged bands
  const band = parseInt(rangeBand.slice(1), 10);
  if (
    weapon.weaponType === AttackType.Melee
  ) {
    return false;
  }

  const minRange = weapon.minRange ?? 1;
  const maxRange = weapon.maxRange ?? 0;
  return band >= minRange && band <= maxRange;
}

/**
 * Compute the expected successes (hits) for a single weapon profile,
 * used to rank weapons when optimizing per-mini weapon selection.
 */
export function computeWeaponExpectedSuccesses(
  weapon: WeaponProfile,
  attackSurge: AttackSurgeChart,
): number {
  return (
    (weapon.redDice ?? 0) * computeAttackDieSuccessRate('red', attackSurge) +
    (weapon.blackDice ?? 0) * computeAttackDieSuccessRate('black', attackSurge) +
    (weapon.whiteDice ?? 0) * computeAttackDieSuccessRate('white', attackSurge)
  );
}

/** Represents a group of miniatures added by an upgrade that have their own weapon(s) */
interface UpgradeMiniGroup {
  weapons: WeaponProfile[];
  count: number;
}

/**
 * Categorize upgrades and compute correct mini counts for base vs upgrade minis.
 *
 * This is the shared helper used by computeUnitDiceByRange and the keyword
 * stat functions to avoid double-counting minis that have their own weapons.
 */
export function categorizeUpgrades(
  unit: ResolvedUnit,
  upgrades: ResolvedUpgrade[],
): {
  baseMiniCount: number;
  upgradeMiniGroups: UpgradeMiniGroup[];
  armamentWeapons: WeaponProfile[];
  grenadeWeapons: WeaponProfile[];
  otherUpgradeWeapons: WeaponProfile[];
  hasGunslinger: boolean;
  arsenalX: number;
} {
  const upgradeMiniGroups: UpgradeMiniGroup[] = [];
  const armamentWeapons: WeaponProfile[] = [];
  const grenadeWeapons: WeaponProfile[] = [];
  const otherUpgradeWeapons: WeaponProfile[] = [];
  let baseMiniExtras = 0;

  // Check for gunslinger on unit or upgrades
  let hasGunslinger = unit.keywords['gunslinger'] === true;

  // Check for arsenalX on unit keywords
  let arsenalX = typeof unit.keywords['arsenalX'] === 'number'
    ? unit.keywords['arsenalX']
    : 0;

  for (const upg of upgrades) {
    // Accumulate gunslinger from upgrades
    if (upg.keywords['gunslinger'] === true) {
      hasGunslinger = true;
    }
    // Accumulate arsenalX from upgrades
    if (typeof upg.keywords['arsenalX'] === 'number') {
      arsenalX += upg.keywords['arsenalX'];
    }

    if (upg.noncombatant) continue;

    if (upg.isGrenade && upg.weapons.length > 0) {
      // Grenades: one weapon entry per grenade instance
      for (const w of upg.weapons) {
        grenadeWeapons.push(w);
        break; // Only one weapon per grenade upgrade
      }
    } else if (upg.upgradeSlot === UpgradeSlot.Armament && upg.weapons.length > 0) {
      // Armament upgrades: add weapons as choices for the base mini
      for (const w of upg.weapons) {
        armamentWeapons.push(w);
      }
    } else if (upg.addsMiniature > 0) {
      if (upg.weapons.length > 0) {
        // Upgrade mini with its own weapons (heavy weapon, armed personnel, counterpart)
        // These minis do NOT fire the base weapon — they fire their own.
        upgradeMiniGroups.push({
          weapons: upg.weapons,
          count: upg.addsMiniature,
        });
      } else {
        // Upgrade mini without own weapons (un-enriched personnel):
        // These minis fire the base weapon, so they increase baseMiniCount.
        baseMiniExtras += upg.addsMiniature;
      }
    } else if (upg.weapons.length > 0) {
      // Other upgrade weapons (ordnance, hardpoint, gear, etc.): add once each
      for (const w of upg.weapons) {
        otherUpgradeWeapons.push(w);
      }
    }
  }

  // Arsenal X default: if no explicit arsenalX, each mini can use 1 weapon.
  // Arsenal X only applies to single-mini units (WORK_PLAN simplification).
  if (arsenalX === 0) arsenalX = 1;

  const baseMiniCount = unit.figures + baseMiniExtras;

  return {
    baseMiniCount,
    upgradeMiniGroups,
    armamentWeapons,
    grenadeWeapons,
    otherUpgradeWeapons,
    hasGunslinger,
    arsenalX,
  };
}

/** Add a weapon's dice to accumulators, multiplied by count */
function addWeaponDice(
  weapon: WeaponProfile,
  count: number,
  acc: { redDice: number; blackDice: number; whiteDice: number },
): void {
  acc.redDice += (weapon.redDice ?? 0) * count;
  acc.blackDice += (weapon.blackDice ?? 0) * count;
  acc.whiteDice += (weapon.whiteDice ?? 0) * count;
}

/**
 * Select the best N weapons from a pool for a given range band,
 * sorted by expected successes (descending).
 */
function selectBestWeapons(
  weaponPool: WeaponProfile[],
  rangeBand: string,
  attackSurge: AttackSurgeChart,
  maxWeapons: number,
): WeaponProfile[] {
  const eligible = weaponPool.filter(w => weaponCoversRange(w, rangeBand));
  if (eligible.length <= maxWeapons) return eligible;

  // Sort by expected successes descending, pick top N
  return eligible
    .sort((a, b) =>
      computeWeaponExpectedSuccesses(b, attackSurge) -
      computeWeaponExpectedSuccesses(a, attackSurge)
    )
    .slice(0, maxWeapons);
}

/**
 * Compute dice output by range band for a single unit (with upgrades).
 *
 * Uses per-miniature weapon assignment:
 * - Each base mini selects the best available weapon at each range band
 *   (from unit weapons + armament weapons).
 * - Upgrade minis (heavy weapon, armed personnel, counterpart) use their
 *   own weapon, falling back to base weapons when their weapon doesn't
 *   cover a range band.
 * - Arsenal X (single-mini only) lets a mini contribute up to X weapons.
 * - Gunslinger doubles the best single ranged weapon's dice.
 * - Grenades and other non-mini upgrade weapons are added once each.
 */
export function computeUnitDiceByRange(
  unit: ResolvedUnit,
  upgrades: ResolvedUpgrade[],
): RangeBandDice[] {
  const attackSurge = unit.attackSurgeChart ?? AttackSurgeChart.None;

  const {
    baseMiniCount,
    upgradeMiniGroups,
    armamentWeapons,
    grenadeWeapons,
    otherUpgradeWeapons,
    hasGunslinger,
    arsenalX,
  } = categorizeUpgrades(unit, upgrades);

  // The pool of weapons available to base minis: unit weapons + armament weapons
  const baseMiniWeaponPool = [...unit.weapons, ...armamentWeapons];

  return RANGE_BANDS.map((rangeBand) => {
    const acc = { redDice: 0, blackDice: 0, whiteDice: 0 };

    // --- Base minis ---
    if (baseMiniCount === 1) {
      // Single-mini unit: pick top arsenalX weapons from the pool
      const chosen = selectBestWeapons(
        baseMiniWeaponPool, rangeBand, attackSurge, arsenalX,
      );
      for (const w of chosen) {
        addWeaponDice(w, 1, acc);
      }
    } else if (baseMiniCount > 1) {
      // Multi-mini unit: all base minis use the single best weapon
      const chosen = selectBestWeapons(
        baseMiniWeaponPool, rangeBand, attackSurge, 1,
      );
      if (chosen.length > 0) {
        addWeaponDice(chosen[0], baseMiniCount, acc);
      }
    }

    // --- Upgrade mini groups (heavy weapon, counterpart, etc.) ---
    for (const group of upgradeMiniGroups) {
      // Find the best weapon this upgrade mini has at this range
      const upgradeEligible = selectBestWeapons(
        group.weapons, rangeBand, attackSurge, 1,
      );
      if (upgradeEligible.length > 0) {
        addWeaponDice(upgradeEligible[0], group.count, acc);
      } else if (rangeBand === 'Melee') {
        // Melee fallback: upgrade minis can use the unit's melee weapon
        // (e.g., heavy weapon specialist uses Unarmed in melee)
        // At ranged bands, if their weapon doesn't cover the range, they
        // contribute nothing — they don't carry the unit's ranged weapon.
        const fallback = selectBestWeapons(
          unit.weapons, rangeBand, attackSurge, 1,
        );
        if (fallback.length > 0) {
          addWeaponDice(fallback[0], group.count, acc);
        }
      }
    }

    // --- Grenade weapons: one entry per grenade upgrade ---
    for (const w of grenadeWeapons) {
      if (weaponCoversRange(w, rangeBand)) {
        addWeaponDice(w, 1, acc);
      }
    }

    // --- Other upgrade weapons (ordnance, hardpoint, etc.): once each ---
    for (const w of otherUpgradeWeapons) {
      if (weaponCoversRange(w, rangeBand)) {
        addWeaponDice(w, 1, acc);
      }
    }

    // --- Gunslinger: double the best single ranged weapon in the pool ---
    // Gunslinger lets the unit declare an additional attack with a ranged
    // weapon already in the pool, effectively doubling that weapon's output.
    // Only applies at ranged bands (not melee).
    if (hasGunslinger && rangeBand !== 'Melee') {
      // Collect ALL ranged weapons that were actually contributed at this range
      // (base pool + upgrade weapons), and double the best one.
      const allContributedRanged: WeaponProfile[] = [];

      // From base minis: the weapon(s) that were chosen
      if (baseMiniCount === 1) {
        const chosen = selectBestWeapons(
          baseMiniWeaponPool, rangeBand, attackSurge, arsenalX,
        );
        allContributedRanged.push(...chosen.filter(
          w => w.weaponType === AttackType.Ranged || w.weaponType === AttackType.Hybrid,
        ));
      } else if (baseMiniCount > 1) {
        const chosen = selectBestWeapons(
          baseMiniWeaponPool, rangeBand, attackSurge, 1,
        );
        allContributedRanged.push(...chosen.filter(
          w => w.weaponType === AttackType.Ranged || w.weaponType === AttackType.Hybrid,
        ));
      }

      // From upgrade mini groups
      for (const group of upgradeMiniGroups) {
        const chosen = selectBestWeapons(
          group.weapons, rangeBand, attackSurge, 1,
        );
        allContributedRanged.push(...chosen.filter(
          w => w.weaponType === AttackType.Ranged || w.weaponType === AttackType.Hybrid,
        ));
      }

      // Pick the best single ranged weapon and add its dice again
      if (allContributedRanged.length > 0) {
        const best = allContributedRanged.sort(
          (a, b) =>
            computeWeaponExpectedSuccesses(b, attackSurge) -
            computeWeaponExpectedSuccesses(a, attackSurge),
        )[0];
        addWeaponDice(best, 1, acc);
      }
    }

    const { redDice, blackDice, whiteDice } = acc;
    const totalDice = redDice + blackDice + whiteDice;
    const expectedSuccesses =
      redDice * computeAttackDieSuccessRate('red', attackSurge) +
      blackDice * computeAttackDieSuccessRate('black', attackSurge) +
      whiteDice * computeAttackDieSuccessRate('white', attackSurge);
    const attackingEfficacy = totalDice > 0 ? expectedSuccesses / totalDice : 0;

    return {
      rangeBand,
      redDice,
      blackDice,
      whiteDice,
      totalDice,
      expectedSuccesses: Math.round(expectedSuccesses * 100) / 100,
      attackingEfficacy: Math.round(attackingEfficacy * 1000) / 1000,
    };
  });
}

// ============================================================================
// Anti-Armor Tech
// ============================================================================

function computeAntiArmorStats(units: ResolvedListUnit[]) {
  let totalImpact = 0;
  let totalCritical = 0;
  let totalIon = 0;
  let impactUnits = 0;
  let criticalUnits = 0;
  let ionUnits = 0;
  let surgeToCritUnitCount = 0;

  for (const listUnit of units) {
    const unit = listUnit.resolvedUnit;
    if (!unit) continue;

    if (unit.attackSurgeChart === AttackSurgeChart.ToCrit) {
      surgeToCritUnitCount++;
    }

    const upgrades = listUnit.resolvedUpgrades.filter(
      (u): u is ResolvedUpgrade => u !== null && !u.noncombatant,
    );

    // Use categorizeUpgrades for correct base mini count
    const { baseMiniCount } = categorizeUpgrades(unit, upgrades);

    let unitHasImpact = false;
    let unitHasCritical = false;
    let unitHasIon = false;

    // Base weapons — only base minis carry them (not upgrade minis with own weapons)
    for (const w of unit.weapons) {
      const impact = (w.keywords?.impactX ?? 0) * baseMiniCount;
      const critical = (w.keywords?.criticalX ?? 0) * baseMiniCount;
      const ion = (w.keywords?.ionX ?? 0) * baseMiniCount;
      totalImpact += impact;
      totalCritical += critical;
      totalIon += ion;
      if (impact > 0) unitHasImpact = true;
      if (critical > 0) unitHasCritical = true;
      if (ion > 0) unitHasIon = true;
    }

    // Upgrade weapons — unique, not multiplied
    for (const upg of upgrades) {
      for (const w of upg.weapons) {
        const impact = w.keywords?.impactX ?? 0;
        const critical = w.keywords?.criticalX ?? 0;
        const ion = w.keywords?.ionX ?? 0;
        totalImpact += impact;
        totalCritical += critical;
        totalIon += ion;
        if (impact > 0) unitHasImpact = true;
        if (critical > 0) unitHasCritical = true;
        if (ion > 0) unitHasIon = true;
      }
    }

    if (unitHasImpact) impactUnits++;
    if (unitHasCritical) criticalUnits++;
    if (unitHasIon) ionUnits++;
  }

  return { totalImpact, totalCritical, totalIon, impactUnits, criticalUnits, ionUnits, surgeToCritUnitCount };
}

// ============================================================================
// Cover Denial
// ============================================================================

function computeCoverDenialStats(units: ResolvedListUnit[]) {
  let sharpshooterUnits = 0;
  let totalSharpshooter = 0;
  let blastWeaponCount = 0;
  let highVelocityWeaponCount = 0;

  for (const listUnit of units) {
    const unit = listUnit.resolvedUnit;
    if (!unit) continue;

    // Unit-level sharpshooter
    const ss = typeof unit.keywords['sharpshooterX'] === 'number' ? unit.keywords['sharpshooterX'] : 0;
    // Also check upgrades
    let upgSs = 0;
    for (const upg of listUnit.resolvedUpgrades) {
      if (!upg) continue;
      const uSs = typeof upg.keywords['sharpshooterX'] === 'number' ? upg.keywords['sharpshooterX'] : 0;
      upgSs += uSs;
    }

    const unitSs = ss + upgSs;
    if (unitSs > 0) {
      sharpshooterUnits++;
      totalSharpshooter += unitSs;
    }

    // Weapon-level blast and high velocity
    // Base weapons are multiplied by base mini count (not upgrade minis with own weapons)
    const upgrades = listUnit.resolvedUpgrades.filter(
      (u): u is ResolvedUpgrade => u !== null,
    );
    const { baseMiniCount: coverFigures } = categorizeUpgrades(unit, upgrades);

    for (const w of unit.weapons) {
      if (w.keywords?.blast) blastWeaponCount += coverFigures;
      if (w.keywords?.highVelocity) highVelocityWeaponCount += coverFigures;
    }
    for (const upg of upgrades) {
      if (upg.noncombatant) continue;
      for (const w of upg.weapons) {
        if (w.keywords?.blast) blastWeaponCount++;
        if (w.keywords?.highVelocity) highVelocityWeaponCount++;
      }
    }
  }

  return {
    sharpshooterUnits,
    totalSharpshooter,
    blastWeaponCount,
    highVelocityWeaponCount,
  };
}

// ============================================================================
// Suppression & Control
// ============================================================================

function computeSuppressionStats(units: ResolvedListUnit[]) {
  let suppressiveWeaponCount = 0;
  let scatterWeaponCount = 0;

  for (const listUnit of units) {
    const unit = listUnit.resolvedUnit;
    if (!unit) continue;

    const upgrades = listUnit.resolvedUpgrades.filter(
      (u): u is ResolvedUpgrade => u !== null,
    );
    const { baseMiniCount: suppFigures } = categorizeUpgrades(unit, upgrades);

    // Base weapons — only base minis carry them
    for (const w of unit.weapons) {
      if (w.weaponType === AttackType.Melee) continue;
      if (w.keywords?.suppressive) suppressiveWeaponCount += suppFigures;
      if (w.keywords && 'scatter' in w.keywords && w.keywords.scatter)
        scatterWeaponCount += suppFigures;
    }

    // Upgrade weapons — unique, not multiplied
    for (const upg of upgrades) {
      if (upg.noncombatant) continue;
      for (const w of upg.weapons) {
        if (w.weaponType === AttackType.Melee) continue;
        if (w.keywords?.suppressive) suppressiveWeaponCount++;
        if (w.keywords && 'scatter' in w.keywords && w.keywords.scatter)
          scatterWeaponCount++;
      }
    }
  }

  return { suppressiveWeaponCount, scatterWeaponCount };
}

// ============================================================================
// Keyword Tally Helper
// ============================================================================

interface TallyConfig {
  keyword: string;
  label: string;
  type: 'boolean' | 'numeric' | 'truthy';
}

function tallyKeywords(
  units: ResolvedListUnit[],
  configs: TallyConfig[],
): KeywordTally[] {
  const tallies = new Map<string, KeywordTally>();

  for (const cfg of configs) {
    tallies.set(cfg.keyword, {
      keyword: cfg.keyword,
      label: cfg.label,
      unitCount: 0,
      totalValue: cfg.type === 'numeric' ? 0 : undefined,
    });
  }

  for (const listUnit of units) {
    const unit = listUnit.resolvedUnit;
    if (!unit) continue;

    // Merge unit + upgrade keywords
    const merged: Record<string, number | boolean | string> = { ...unit.keywords };
    for (const upg of listUnit.resolvedUpgrades) {
      if (!upg) continue;
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

    for (const cfg of configs) {
      const value = merged[cfg.keyword];
      const tally = tallies.get(cfg.keyword)!;

      if (cfg.type === 'boolean' && value === true) {
        tally.unitCount++;
      } else if (cfg.type === 'numeric' && typeof value === 'number' && value > 0) {
        tally.unitCount++;
        tally.totalValue = (tally.totalValue ?? 0) + value;
      } else if (cfg.type === 'truthy' && !!value) {
        tally.unitCount++;
      }
    }
  }

  // Only return tallies with at least one unit
  return Array.from(tallies.values()).filter((t) => t.unitCount > 0);
}

// ============================================================================
// Deployment Advantage
// ============================================================================

const DEPLOYMENT_KEYWORDS: TallyConfig[] = [
  { keyword: 'infiltrate', label: 'Infiltrate', type: 'boolean' },
  { keyword: 'scoutX', label: 'Scout', type: 'numeric' },
  { keyword: 'scoutingPartyX', label: 'Scouting Party', type: 'numeric' },
  { keyword: 'reinforcements', label: 'Reinforcements', type: 'boolean' },
  { keyword: 'covertOps', label: 'Covert Ops', type: 'boolean' },
  { keyword: 'preparedPosition', label: 'Prepared Position', type: 'boolean' },
  { keyword: 'incognito', label: 'Incognito', type: 'boolean' },
];

function computeDeploymentKeywords(units: ResolvedListUnit[]): KeywordTally[] {
  return tallyKeywords(units, DEPLOYMENT_KEYWORDS);
}

// ============================================================================
// Action Economy
// ============================================================================

const ACTION_ECONOMY_SELF: TallyConfig[] = [
  { keyword: 'relentless', label: 'Relentless', type: 'boolean' },
  { keyword: 'steady', label: 'Steady', type: 'boolean' },
  { keyword: 'charge', label: 'Charge', type: 'boolean' },
  { keyword: 'tacticalX', label: 'Tactical', type: 'numeric' },
  { keyword: 'agileX', label: 'Agile', type: 'numeric' },
  { keyword: 'reposition', label: 'Reposition', type: 'boolean' },
  { keyword: 'attackRun', label: 'Attack Run', type: 'boolean' },
  { keyword: 'quickThinking', label: 'Quick Thinking', type: 'boolean' },
  { keyword: 'dauntless', label: 'Dauntless', type: 'boolean' },
  { keyword: 'readyX', label: 'Ready', type: 'numeric' },
  { keyword: 'spur', label: 'Spur', type: 'boolean' },
  { keyword: 'gunslinger', label: 'Gunslinger', type: 'boolean' },
  { keyword: 'jarKaiMastery', label: "Jar'Kai Mastery", type: 'boolean' },
  { keyword: 'combatMastery', label: 'Combat Mastery', type: 'boolean' },
  // Token generation keywords (free tokens at start of round/activation)
  { keyword: 'independent', label: 'Independent', type: 'truthy' },
  { keyword: 'independentAimX', label: 'Independent: Aim', type: 'numeric' },
  { keyword: 'independentDodgeX', label: 'Independent: Dodge', type: 'numeric' },
  { keyword: 'independentSurgeX', label: 'Independent: Surge', type: 'numeric' },
  { keyword: 'independentStandbyX', label: 'Independent: Standby', type: 'numeric' },
  { keyword: 'independentAimOrDodgeX', label: 'Independent: Aim/Dodge', type: 'numeric' },
  { keyword: 'cacheAimX', label: 'Cache Aim', type: 'numeric' },
  { keyword: 'cacheDodgeX', label: 'Cache Dodge', type: 'numeric' },
  { keyword: 'cacheSurgeX', label: 'Cache Surge', type: 'numeric' },
  { keyword: 'defendX', label: 'Defend', type: 'numeric' },
  { keyword: 'targetX', label: 'Target', type: 'numeric' },
];

const ACTION_ECONOMY_SUPPORT: TallyConfig[] = [
  { keyword: 'guidance', label: 'Guidance', type: 'boolean' },
  { keyword: 'pullingTheStrings', label: 'Pulling the Strings', type: 'boolean' },
  { keyword: 'coordinate', label: 'Coordinate', type: 'boolean' },
  { keyword: 'direct', label: 'Direct', type: 'boolean' },
  { keyword: 'spotterX', label: 'Spotter', type: 'numeric' },
  { keyword: 'fireSupport', label: 'Fire Support', type: 'boolean' },
  { keyword: 'barrage', label: 'Barrage', type: 'boolean' },
  { keyword: 'compel', label: 'Compel', type: 'boolean' },
  { keyword: 'authoritative', label: 'Authoritative', type: 'boolean' },
  { keyword: 'masterOfTheForceX', label: 'Master of the Force', type: 'numeric' },
  { keyword: 'observeX', label: 'Observe', type: 'numeric' },
  { keyword: 'inspireX', label: 'Inspire', type: 'numeric' },
  { keyword: 'demoralizeX', label: 'Demoralize', type: 'numeric' },
];

function computeActionEconomy(units: ResolvedListUnit[]) {
  return {
    actionEconomySelf: tallyKeywords(units, ACTION_ECONOMY_SELF),
    actionEconomySupport: tallyKeywords(units, ACTION_ECONOMY_SUPPORT),
  };
}

// ============================================================================
// Defensive Profile
// ============================================================================

const SAVE_TIERS: {
  label: string;
  dieColor: DefenseDieColor;
  surgeChart: DefenseSurgeChart;
}[] = [
  { label: 'Red', dieColor: DefenseDieColor.Red, surgeChart: DefenseSurgeChart.None },
  { label: 'White', dieColor: DefenseDieColor.White, surgeChart: DefenseSurgeChart.None },
];

const DEFENSIVE_KEYWORDS: TallyConfig[] = [
  { keyword: 'nimble', label: 'Nimble', type: 'boolean' },
  { keyword: 'agileX', label: 'Agile', type: 'numeric' },
  { keyword: 'block', label: 'Block', type: 'boolean' },
  { keyword: 'deflect', label: 'Deflect', type: 'boolean' },
  { keyword: 'outmaneuver', label: 'Outmaneuver', type: 'boolean' },
  { keyword: 'soresuMastery', label: 'Soresu Mastery', type: 'boolean' },
  { keyword: 'duelistDefender', label: 'Duelist', type: 'boolean' },
  { keyword: 'backup', label: 'Backup', type: 'boolean' },
  { keyword: 'armorX', label: 'Armor', type: 'numeric' },
  { keyword: 'shieldedX', label: 'Shielded', type: 'numeric' },
  { keyword: 'guardianX', label: 'Guardian', type: 'numeric' },
  { keyword: 'immunePierce', label: 'Immune: Pierce', type: 'boolean' },
  { keyword: 'immuneBlast', label: 'Immune: Blast', type: 'boolean' },
  { keyword: 'immuneMelee', label: 'Immune: Melee', type: 'boolean' },
  { keyword: 'impervious', label: 'Impervious', type: 'boolean' },
  { keyword: 'lowProfile', label: 'Low Profile', type: 'boolean' },
  { keyword: 'dangerSenseX', label: 'Danger Sense', type: 'numeric' },
  { keyword: 'uncannyLuckX', label: 'Uncanny Luck', type: 'numeric' },
  { keyword: 'katarnPatternArmor', label: 'Katarn Armor', type: 'boolean' },
  { keyword: 'coverX', label: 'Cover', type: 'numeric' },
  { keyword: 'regenerateX', label: 'Regenerate', type: 'numeric' },
];

function computeDefensiveProfile(units: ResolvedListUnit[]) {
  const saveTierBreakdown: SaveTier[] = [];

  for (const tier of SAVE_TIERS) {
    let unitCount = 0;
    let totalWounds = 0;

    for (const listUnit of units) {
      const unit = listUnit.resolvedUnit;
      if (!unit) continue;

      if (unit.defenseDieColor === tier.dieColor) {
        unitCount++;
        const extraMinis = listUnit.resolvedUpgrades
          .filter((u): u is ResolvedUpgrade => u !== null && !u.noncombatant)
          .reduce((sum, u) => sum + u.addsMiniature, 0);
        totalWounds += unit.health * (unit.figures + extraMinis);
      }
    }

    if (unitCount > 0) {
      saveTierBreakdown.push({
        label: tier.label,
        saveProbability: computeBaseSaveProbability(tier.dieColor, tier.surgeChart),
        unitCount,
        totalWounds,
      });
    }
  }

  const defensiveKeywords = tallyKeywords(units, DEFENSIVE_KEYWORDS);

  return { saveTierBreakdown, defensiveKeywords };
}

// ============================================================================
// Rank Breakdown
// ============================================================================

const RANK_ORDER = ['commander', 'operative', 'corps', 'special-forces', 'support', 'heavy'];
const RANK_LABELS: Record<string, string> = {
  'commander': 'Commander',
  'operative': 'Operative',
  'corps': 'Corps',
  'special-forces': 'Special Forces',
  'support': 'Support',
  'heavy': 'Heavy',
};

function computeRankBreakdown(
  units: ResolvedListUnit[],
  totalPoints: number,
): RankBreakdown[] {
  const byRank = new Map<string, { count: number; points: number }>();

  for (const listUnit of units) {
    const unit = listUnit.resolvedUnit;
    if (!unit) continue;

    const rank = unit.rank;
    const entry = byRank.get(rank) ?? { count: 0, points: 0 };
    entry.count++;

    // Unit cost + upgrade costs
    let unitPoints = unit.cost;
    for (const upg of listUnit.resolvedUpgrades) {
      if (upg) unitPoints += upg.cost;
    }
    entry.points += unitPoints;
    byRank.set(rank, entry);
  }

  return RANK_ORDER.filter((r) => byRank.has(r)).map((rank) => {
    const entry = byRank.get(rank)!;
    return {
      rank: RANK_LABELS[rank] ?? rank,
      count: entry.count,
      points: entry.points,
      percentage:
        totalPoints > 0
          ? Math.round((entry.points / totalPoints) * 1000) / 1000
          : 0,
    };
  });
}

// ============================================================================
// Aggregate Entry Point
// ============================================================================

/**
 * Compute all army-level statistics from resolved list units.
 */
export function aggregateArmyStats(
  units: ResolvedListUnit[],
  meta: {
    commandCards?: string[];
    contingencies?: string[];
  },
): ArmyStats {
  // Tier 1: Key stat cards
  let totalPoints = 0;
  let totalWounds = 0;
  let totalEffectiveWounds = 0;
  let totalMiniatures = 0;

  for (const listUnit of units) {
    const unit = listUnit.resolvedUnit;
    if (!unit) continue;

    const upgrades = listUnit.resolvedUpgrades.filter(
      (u): u is ResolvedUpgrade => u !== null,
    );

    // Points
    let unitCost = unit.cost;
    for (const upg of upgrades) {
      unitCost += upg.cost;
    }
    totalPoints += unitCost;

    // Figures
    const extraMinis = upgrades.reduce(
      (sum, u) => sum + (u.noncombatant ? 0 : u.addsMiniature),
      0,
    );
    const noncombatantMinis = upgrades.reduce(
      (sum, u) => sum + (u.noncombatant ? u.addsMiniature : 0),
      0,
    );
    const combatFigures = unit.figures + extraMinis;
    const allFigures = combatFigures + noncombatantMinis;

    totalMiniatures += allFigures;
    totalWounds += unit.health * (unit.figures + extraMinis + noncombatantMinis);
    totalEffectiveWounds += computeEffectiveWounds(unit, upgrades);
  }

  const activationCount = units.length;
  const avgPointsPerActivation =
    activationCount > 0
      ? Math.round((totalPoints / activationCount) * 10) / 10
      : 0;

  // Tier 2A: Dice by range (aggregate across all units)
  const perUnitDice = units
    .filter((lu) => lu.resolvedUnit !== null)
    .map((lu) =>
      computeUnitDiceByRange(
        lu.resolvedUnit!,
        lu.resolvedUpgrades.filter((u): u is ResolvedUpgrade => u !== null),
      ),
    );

  const diceByRange: RangeBandDice[] = RANGE_BANDS.map((rangeBand, i) => {
    let redDice = 0;
    let blackDice = 0;
    let whiteDice = 0;
    let expectedSuccesses = 0;

    for (const unitDice of perUnitDice) {
      const band = unitDice[i];
      redDice += band.redDice;
      blackDice += band.blackDice;
      whiteDice += band.whiteDice;
      expectedSuccesses += band.expectedSuccesses;
    }

    const totalDice = redDice + blackDice + whiteDice;
    const attackingEfficacy = totalDice > 0 ? expectedSuccesses / totalDice : 0;

    return {
      rangeBand,
      redDice,
      blackDice,
      whiteDice,
      totalDice,
      expectedSuccesses: Math.round(expectedSuccesses * 100) / 100,
      attackingEfficacy: Math.round(attackingEfficacy * 1000) / 1000,
    };
  });

  // Tier 2B–2I
  const antiArmor = computeAntiArmorStats(units);
  const coverDenial = computeCoverDenialStats(units);
  const suppression = computeSuppressionStats(units);
  const deploymentKeywords = computeDeploymentKeywords(units);
  const actionEconomy = computeActionEconomy(units);
  const defensiveProfile = computeDefensiveProfile(units);
  const unitsByRank = computeRankBreakdown(units, totalPoints);

  return {
    totalPoints,
    activationCount,
    totalWounds,
    totalEffectiveWounds: Math.round(totalEffectiveWounds * 10) / 10,
    totalMiniatures,
    avgPointsPerActivation,
    diceByRange,
    ...antiArmor,
    ...coverDenial,
    ...suppression,
    deploymentKeywords,
    ...actionEconomy,
    ...defensiveProfile,
    unitsByRank,
    commandCards: meta.commandCards ?? [],
    contingencies: meta.contingencies ?? [],
  };
}
