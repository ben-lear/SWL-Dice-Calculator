import { describe, it, expect } from 'vitest';
import {
  computeBaseSaveProbability,
  computeEffectiveWounds,
  computeAttackDieSuccessRate,
  computeUnitDiceByRange,
  computeWeaponExpectedSuccesses,
  categorizeUpgrades,
  aggregateArmyStats,
  extractAdjustedTokens,
  buildAttackerConfigForEstimation,
  computeEffectiveCourage,
} from '../armyStats';
import { AttackSurgeChart, AttackType, DefenseDieColor, DefenseSurgeChart } from '../../engine/types';
import type { ResolvedUnit, ResolvedUpgrade, WeaponProfile } from '../types';
import { UpgradeSlot } from '../types';
import type { ResolvedListUnit } from '../listTypes';
import { Faction } from '../presets';

// ============================================================================
// Helpers
// ============================================================================

function makeMinimalUnit(overrides: Partial<ResolvedUnit> = {}): ResolvedUnit {
  return {
    id: 'test-unit',
    apiId: 999,
    name: 'Test Unit',
    title: null,
    faction: Faction.GalacticEmpire,
    cost: 50,
    health: 1,
    figures: 4,
    defenseDieColor: DefenseDieColor.White,
    rank: 'corps',
    unitType: 'trooper',
    affiliation: null,
    attackSurgeChart: null,
    defenseSurgeChart: null,
    keywords: {},
    weapons: [],
    upgradeBar: [],
    isEnriched: false,
    courage: null,
    ...overrides,
  };
}

function makeListUnit(
  unit: ResolvedUnit,
  options: Partial<ResolvedListUnit> = {},
): ResolvedListUnit {
  return {
    rawName: unit.name,
    rawUpgradeNames: [],
    resolvedUnit: unit,
    resolvedUpgrades: [],
    slotMapping: [],
    unitMatchConfidence: 'exact',
    warnings: [],
    ...options,
  };
}

// ============================================================================
// computeBaseSaveProbability
// ============================================================================

describe('computeBaseSaveProbability', () => {
  it('returns 1/6 for white die with no surge', () => {
    const prob = computeBaseSaveProbability(
      DefenseDieColor.White,
      DefenseSurgeChart.None,
    );
    // White die: 1 block face out of 6
    expect(prob).toBeCloseTo(1 / 6, 5);
  });

  it('returns higher probability for white die WITH surge to block', () => {
    const prob = computeBaseSaveProbability(
      DefenseDieColor.White,
      DefenseSurgeChart.ToBlock,
    );
    // White die: 1 block + 1 surge = 2/6
    expect(prob).toBeCloseTo(2 / 6, 5);
  });

  it('returns 3/6 for red die with no surge', () => {
    const prob = computeBaseSaveProbability(
      DefenseDieColor.Red,
      DefenseSurgeChart.None,
    );
    // Red die: 3 block faces out of 6
    expect(prob).toBeCloseTo(3 / 6, 5);
  });

  it('returns 4/6 for red die WITH surge to block', () => {
    const prob = computeBaseSaveProbability(
      DefenseDieColor.Red,
      DefenseSurgeChart.ToBlock,
    );
    // Red die: 3 block + 1 surge = 4/6
    expect(prob).toBeCloseTo(4 / 6, 5);
  });
});

// ============================================================================
// computeAttackDieSuccessRate
// ============================================================================

describe('computeAttackDieSuccessRate', () => {
  it('returns correct hit probability for dice types', () => {
    // Each die type has known face distributions
    const redRate = computeAttackDieSuccessRate('red', null);
    const blackRate = computeAttackDieSuccessRate('black', null);
    const whiteRate = computeAttackDieSuccessRate('white', null);

    // Red: highest hit rate, White: lowest
    expect(redRate).toBeGreaterThan(blackRate);
    expect(blackRate).toBeGreaterThan(whiteRate);
    expect(whiteRate).toBeGreaterThan(0);
  });

  it('accounts for surge-to-hit', () => {
    const withoutSurge = computeAttackDieSuccessRate('white', null);
    const withSurge = computeAttackDieSuccessRate(
      'white',
      AttackSurgeChart.ToHit,
    );

    expect(withSurge).toBeGreaterThan(withoutSurge);
  });
});

// ============================================================================
// computeEffectiveWounds
// ============================================================================

describe('computeEffectiveWounds', () => {
  it('increases with more health', () => {
    const unit2hp = makeMinimalUnit({ health: 2 });
    const unit4hp = makeMinimalUnit({ health: 4 });

    const ew2 = computeEffectiveWounds(unit2hp, []);
    const ew4 = computeEffectiveWounds(unit4hp, []);

    expect(ew4).toBeGreaterThan(ew2);
  });

  it('is higher for red save vs white save', () => {
    const whiteSave = makeMinimalUnit({
      health: 3,
      defenseDieColor: DefenseDieColor.White,
    });
    const redSave = makeMinimalUnit({
      health: 3,
      defenseDieColor: DefenseDieColor.Red,
    });

    const ewWhite = computeEffectiveWounds(whiteSave, []);
    const ewRed = computeEffectiveWounds(redSave, []);

    expect(ewRed).toBeGreaterThan(ewWhite);
  });

  it('accounts for surge-to-block', () => {
    const noSurge = makeMinimalUnit({
      health: 3,
      defenseSurgeChart: DefenseSurgeChart.None,
    });
    const withSurge = makeMinimalUnit({
      health: 3,
      defenseSurgeChart: DefenseSurgeChart.ToBlock,
    });

    const ewNoSurge = computeEffectiveWounds(noSurge, []);
    const ewWithSurge = computeEffectiveWounds(withSurge, []);

    expect(ewWithSurge).toBeGreaterThan(ewNoSurge);
  });

  it('accounts for armor keyword', () => {
    const noArmor = makeMinimalUnit({ health: 3, keywords: {} });
    const withArmor = makeMinimalUnit({
      health: 3,
      keywords: { armorX: 1 },
    });

    const ewNoArmor = computeEffectiveWounds(noArmor, []);
    const ewArmor = computeEffectiveWounds(withArmor, []);

    expect(ewArmor).toBeGreaterThan(ewNoArmor);
  });
});

// ============================================================================
// aggregateArmyStats
// ============================================================================

describe('aggregateArmyStats', () => {
  it('computes correct total points', () => {
    const unit1 = makeMinimalUnit({ cost: 50 });
    const unit2 = makeMinimalUnit({ cost: 80 });
    const listUnits: ResolvedListUnit[] = [
      makeListUnit(unit1),
      makeListUnit(unit2),
    ];

    const stats = aggregateArmyStats(listUnits, {});
    expect(stats.totalPoints).toBe(130);
  });

  it('sums total wounds across all units', () => {
    const unit1 = makeMinimalUnit({ health: 3, figures: 1 });
    const unit2 = makeMinimalUnit({ health: 1, figures: 4 });
    const listUnits: ResolvedListUnit[] = [
      makeListUnit(unit1),
      makeListUnit(unit2),
    ];

    const stats = aggregateArmyStats(listUnits, {});
    // Unit1: 3 health * 1 figure = 3, Unit2: 1 health * 4 figures = 4
    expect(stats.totalWounds).toBe(7);
  });

  it('counts activations (all list entries)', () => {
    const unit1 = makeMinimalUnit({});
    const unit2 = makeMinimalUnit({});
    const listUnits: ResolvedListUnit[] = [
      makeListUnit(unit1),
      makeListUnit(unit2),
    ];

    const stats = aggregateArmyStats(listUnits, {});
    expect(stats.activationCount).toBe(2);
  });

  it('counts command cards', () => {
    const unit = makeMinimalUnit({});
    const listUnits: ResolvedListUnit[] = [makeListUnit(unit)];

    const stats = aggregateArmyStats(listUnits, {
      commandCards: ['Ambush', 'Push', 'Standing Orders'],
    });
    expect(stats.commandCards).toEqual(['Ambush', 'Push', 'Standing Orders']);
  });

  it('handles unresolved units gracefully', () => {
    const resolved = makeMinimalUnit({ cost: 50 });
    const listUnits: ResolvedListUnit[] = [
      makeListUnit(resolved),
      {
        rawName: 'Unknown Unit',
        rawUpgradeNames: [],
        resolvedUnit: null,
        resolvedUpgrades: [],
        slotMapping: [],
        unitMatchConfidence: 'none',
        warnings: ['Could not match'],
      },
    ];

    const stats = aggregateArmyStats(listUnits, {});
    // Only resolved unit's cost should count
    expect(stats.totalPoints).toBe(50);
    // activationCount counts all list entries (including unresolved)
    expect(stats.activationCount).toBe(2);
  });
});

// ============================================================================
// Upgrade test helper
// ============================================================================

function makeMinimalUpgrade(overrides: Partial<ResolvedUpgrade> = {}): ResolvedUpgrade {
  return {
    id: 'test-upgrade',
    apiId: 888,
    name: 'Test Upgrade',
    cost: 0,
    upgradeSlot: UpgradeSlot.HeavyWeapon,
    factionRestrictions: [],
    rankRestrictions: [],
    unitTypeRestrictions: [],
    unitRestrictions: [],
    affiliationRestrictions: [],
    alignmentRestriction: null,
    unitsDisallowedOn: [],
    keywords: {},
    weapons: [],
    addsMiniature: 0,
    noncombatant: false,
    isGrenade: false,
    addsUpgradeSlot: [],
    requiredUpgradeSlot: null,
    surgeOverrides: null,
    defenseOverrides: null,
    isEnriched: false,
    courageModifier: 0,
    ...overrides,
  };
}

function makeWeapon(overrides: Partial<WeaponProfile> = {}): WeaponProfile {
  return {
    name: 'Test Weapon',
    weaponType: AttackType.Ranged,
    redDice: 0,
    blackDice: 0,
    whiteDice: 0,
    keywords: {},
    ...overrides,
  };
}

/** Helper to find a specific range band from computeUnitDiceByRange results */
function getDiceAtRange(
  results: ReturnType<typeof computeUnitDiceByRange>,
  rangeBand: string,
) {
  return results.find(r => r.rangeBand === rangeBand)!;
}

// ============================================================================
// computeWeaponExpectedSuccesses
// ============================================================================

describe('computeWeaponExpectedSuccesses', () => {
  it('ranks red dice higher than black higher than white', () => {
    const red = makeWeapon({ redDice: 1 });
    const black = makeWeapon({ blackDice: 1 });
    const white = makeWeapon({ whiteDice: 1 });

    const redScore = computeWeaponExpectedSuccesses(red, AttackSurgeChart.None);
    const blackScore = computeWeaponExpectedSuccesses(black, AttackSurgeChart.None);
    const whiteScore = computeWeaponExpectedSuccesses(white, AttackSurgeChart.None);

    expect(redScore).toBeGreaterThan(blackScore);
    expect(blackScore).toBeGreaterThan(whiteScore);
    expect(whiteScore).toBeGreaterThan(0);
  });

  it('accounts for surge conversion in scoring', () => {
    const weapon = makeWeapon({ whiteDice: 3 });
    const withoutSurge = computeWeaponExpectedSuccesses(weapon, AttackSurgeChart.None);
    const withSurge = computeWeaponExpectedSuccesses(weapon, AttackSurgeChart.ToHit);

    expect(withSurge).toBeGreaterThan(withoutSurge);
  });

  it('returns 0 for a weapon with no dice', () => {
    const empty = makeWeapon({});
    expect(computeWeaponExpectedSuccesses(empty, AttackSurgeChart.None)).toBe(0);
  });
});

// ============================================================================
// categorizeUpgrades
// ============================================================================

describe('categorizeUpgrades', () => {
  it('counts base minis correctly without upgrades', () => {
    const unit = makeMinimalUnit({ figures: 4 });
    const { baseMiniCount, upgradeMiniGroups } = categorizeUpgrades(unit, []);
    expect(baseMiniCount).toBe(4);
    expect(upgradeMiniGroups).toHaveLength(0);
  });

  it('does not add upgrade minis with own weapons to baseMiniCount', () => {
    const unit = makeMinimalUnit({ figures: 4 });
    const hw = makeMinimalUpgrade({
      addsMiniature: 1,
      weapons: [makeWeapon({ blackDice: 2, maxRange: 4 })],
    });
    const { baseMiniCount, upgradeMiniGroups } = categorizeUpgrades(unit, [hw]);
    expect(baseMiniCount).toBe(4); // NOT 5
    expect(upgradeMiniGroups).toHaveLength(1);
    expect(upgradeMiniGroups[0].count).toBe(1);
  });

  it('adds upgrade minis without weapons to baseMiniCount', () => {
    const unit = makeMinimalUnit({ figures: 4 });
    const personnel = makeMinimalUpgrade({
      upgradeSlot: UpgradeSlot.Personnel,
      addsMiniature: 1,
      weapons: [], // un-enriched, no weapons
    });
    const { baseMiniCount, upgradeMiniGroups } = categorizeUpgrades(unit, [personnel]);
    expect(baseMiniCount).toBe(5); // These minis fire the base weapon
    expect(upgradeMiniGroups).toHaveLength(0);
  });

  it('identifies armament weapons', () => {
    const unit = makeMinimalUnit({ figures: 1 });
    const arm = makeMinimalUpgrade({
      upgradeSlot: UpgradeSlot.Armament,
      addsMiniature: 0,
      weapons: [makeWeapon({ name: 'Armament Gun', redDice: 2, maxRange: 3 })],
    });
    const { armamentWeapons } = categorizeUpgrades(unit, [arm]);
    expect(armamentWeapons).toHaveLength(1);
    expect(armamentWeapons[0].name).toBe('Armament Gun');
  });

  it('identifies grenade weapons', () => {
    const unit = makeMinimalUnit({ figures: 4 });
    const grenade = makeMinimalUpgrade({
      upgradeSlot: UpgradeSlot.Grenades,
      isGrenade: true,
      weapons: [makeWeapon({ name: 'Frag Grenade', blackDice: 1, maxRange: 1 })],
    });
    const { grenadeWeapons } = categorizeUpgrades(unit, [grenade]);
    expect(grenadeWeapons).toHaveLength(1);
    expect(grenadeWeapons[0].name).toBe('Frag Grenade');
  });

  it('excludes noncombatant upgrades from all categories', () => {
    const unit = makeMinimalUnit({ figures: 1 });
    const nc = makeMinimalUpgrade({
      noncombatant: true,
      addsMiniature: 1,
      weapons: [makeWeapon({ blackDice: 1 })],
    });
    const result = categorizeUpgrades(unit, [nc]);
    expect(result.baseMiniCount).toBe(1);
    expect(result.upgradeMiniGroups).toHaveLength(0);
    expect(result.otherUpgradeWeapons).toHaveLength(0);
  });

  it('detects arsenalX from unit keywords', () => {
    const unit = makeMinimalUnit({ figures: 1, keywords: { arsenalX: 2 } });
    const { arsenalX } = categorizeUpgrades(unit, []);
    expect(arsenalX).toBe(2);
  });

  it('sums arsenalX from unit + upgrade keywords', () => {
    const unit = makeMinimalUnit({ figures: 1, keywords: { arsenalX: 2 } });
    const upg = makeMinimalUpgrade({ keywords: { arsenalX: 1 } });
    const { arsenalX } = categorizeUpgrades(unit, [upg]);
    expect(arsenalX).toBe(3);
  });

  it('defaults arsenalX to 1 when not present', () => {
    const unit = makeMinimalUnit({ figures: 1 });
    const { arsenalX } = categorizeUpgrades(unit, []);
    expect(arsenalX).toBe(1);
  });

  it('detects gunslinger from unit keywords', () => {
    const unit = makeMinimalUnit({ figures: 1, keywords: { gunslinger: true } });
    const { hasGunslinger } = categorizeUpgrades(unit, []);
    expect(hasGunslinger).toBe(true);
  });

  it('detects gunslinger from upgrade keywords', () => {
    const unit = makeMinimalUnit({ figures: 1 });
    const upg = makeMinimalUpgrade({ keywords: { gunslinger: true } });
    const { hasGunslinger } = categorizeUpgrades(unit, [upg]);
    expect(hasGunslinger).toBe(true);
  });
});

// ============================================================================
// computeUnitDiceByRange
// ============================================================================

describe('computeUnitDiceByRange', () => {
  // -------------------------------------------------------------------
  // Basic cases
  // -------------------------------------------------------------------

  it('returns zeroes for a unit with no weapons', () => {
    const unit = makeMinimalUnit({ figures: 4, weapons: [] });
    const results = computeUnitDiceByRange(unit, []);
    for (const r of results) {
      expect(r.totalDice).toBe(0);
    }
  });

  it('single-mini with one ranged weapon: dice = weapon dice × 1', () => {
    const unit = makeMinimalUnit({
      figures: 1,
      weapons: [makeWeapon({ blackDice: 2, maxRange: 3 })],
    });
    const r2 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R2');
    expect(r2.blackDice).toBe(2);
    expect(r2.totalDice).toBe(2);
  });

  it('multi-mini with one ranged weapon: dice = weapon dice × figures', () => {
    const unit = makeMinimalUnit({
      figures: 4,
      weapons: [makeWeapon({ blackDice: 1, maxRange: 3 })],
    });
    const r1 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R1');
    expect(r1.blackDice).toBe(4);
    expect(r1.totalDice).toBe(4);
  });

  // -------------------------------------------------------------------
  // Bug 1: Single-mini with multiple ranged weapons (Iden Versio case)
  // -------------------------------------------------------------------

  it('single-mini with two ranged weapons picks the best one (no Arsenal)', () => {
    // Simulates Iden: Two ranged weapons at R1-3 overlap, should pick best.
    const unit = makeMinimalUnit({
      figures: 1,
      attackSurgeChart: AttackSurgeChart.ToHit,
      weapons: [
        makeWeapon({ name: 'Melee', weaponType: AttackType.Melee, blackDice: 3 }),
        makeWeapon({ name: 'DLT-20A', blackDice: 2, maxRange: Infinity }),
        // TL-50: 2R+1B+2W = more expected successes than 2B
        makeWeapon({ name: 'TL-50', redDice: 2, blackDice: 1, whiteDice: 2, maxRange: 3 }),
      ],
    });

    const results = computeUnitDiceByRange(unit, []);

    // At R1-3: should pick TL-50 (2R+1B+2W) NOT sum of both weapons
    const r2 = getDiceAtRange(results, 'R2');
    expect(r2.redDice).toBe(2);
    expect(r2.blackDice).toBe(1);
    expect(r2.whiteDice).toBe(2);
    expect(r2.totalDice).toBe(5); // Not 7 (which was the old bug)

    // At R4+: only DLT-20A available (TL-50 maxRange=3)
    const r4 = getDiceAtRange(results, 'R4');
    expect(r4.blackDice).toBe(2);
    expect(r4.totalDice).toBe(2);

    // At Melee: only Melee weapon
    const melee = getDiceAtRange(results, 'Melee');
    expect(melee.blackDice).toBe(3);
    expect(melee.totalDice).toBe(3);
  });

  it('single-mini with Arsenal 2 uses both weapons at overlapping ranges', () => {
    const unit = makeMinimalUnit({
      figures: 1,
      keywords: { arsenalX: 2 },
      weapons: [
        makeWeapon({ name: 'Gun A', blackDice: 2, maxRange: 3 }),
        makeWeapon({ name: 'Gun B', redDice: 1, whiteDice: 1, maxRange: 3 }),
      ],
    });

    const r2 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R2');
    // Arsenal 2: both weapons contribute
    expect(r2.blackDice).toBe(2);
    expect(r2.redDice).toBe(1);
    expect(r2.whiteDice).toBe(1);
    expect(r2.totalDice).toBe(4);
  });

  // -------------------------------------------------------------------
  // Bug 1 extended: with counterpart (ID10 adds its own weapon)
  // -------------------------------------------------------------------

  it('single-mini with counterpart: counterpart weapon is additive', () => {
    // Iden (1 figure) + ID10 counterpart (addsMiniature=1, own weapon)
    const unit = makeMinimalUnit({
      figures: 1,
      attackSurgeChart: AttackSurgeChart.ToHit,
      weapons: [
        makeWeapon({ name: 'TL-50', redDice: 2, blackDice: 1, whiteDice: 2, maxRange: 3 }),
        makeWeapon({ name: 'DLT-20A', blackDice: 2, maxRange: Infinity }),
      ],
    });

    const counterpart = makeMinimalUpgrade({
      id: 'id10',
      upgradeSlot: UpgradeSlot.Counterpart,
      addsMiniature: 1,
      weapons: [makeWeapon({
        name: 'Electro-Shock',
        weaponType: AttackType.Hybrid,
        whiteDice: 3,
        maxRange: 1,
      })],
    });

    const results = computeUnitDiceByRange(unit, [counterpart]);

    // At R1: Iden's best weapon (TL-50: 2R+1B+2W) + ID10's Electro-Shock (3W)
    const r1 = getDiceAtRange(results, 'R1');
    expect(r1.redDice).toBe(2);
    expect(r1.blackDice).toBe(1);
    expect(r1.whiteDice).toBe(5); // 2W from TL-50 + 3W from ID10
    expect(r1.totalDice).toBe(8);

    // At R2-3: ID10 out of range, only TL-50
    const r2 = getDiceAtRange(results, 'R2');
    expect(r2.redDice).toBe(2);
    expect(r2.blackDice).toBe(1);
    expect(r2.whiteDice).toBe(2);
    expect(r2.totalDice).toBe(5);

    // At R4+: only DLT-20A (no ID10, no TL-50)
    const r4 = getDiceAtRange(results, 'R4');
    expect(r4.blackDice).toBe(2);
    expect(r4.totalDice).toBe(2);
  });

  // -------------------------------------------------------------------
  // Bug 2: Multi-mini with heavy weapon (Shoretrooper case)
  // -------------------------------------------------------------------

  it('multi-mini with heavy weapon: base weapon NOT multiplied by heavy mini', () => {
    // Shoretroopers: 4 figures + T-21B heavy weapon (addsMiniature=1)
    const unit = makeMinimalUnit({
      figures: 4,
      weapons: [
        makeWeapon({ name: 'Unarmed', weaponType: AttackType.Melee, blackDice: 1 }),
        makeWeapon({ name: 'E-22 Blaster', blackDice: 1, maxRange: 3 }),
      ],
    });

    const heavyWeapon = makeMinimalUpgrade({
      upgradeSlot: UpgradeSlot.HeavyWeapon,
      addsMiniature: 1,
      weapons: [makeWeapon({
        name: 'T-21B',
        blackDice: 2,
        whiteDice: 2,
        maxRange: 4,
      })],
    });

    const results = computeUnitDiceByRange(unit, [heavyWeapon]);

    // At R1-3: 4 base minis × 1B (E-22) + 1 HW mini × (2B+2W) = 6B + 2W
    const r1 = getDiceAtRange(results, 'R1');
    expect(r1.blackDice).toBe(6); // NOT 7 (old bug)
    expect(r1.whiteDice).toBe(2);
    expect(r1.totalDice).toBe(8);

    // At R4: only T-21B covers this (E-22 maxRange=3)
    // HW mini's weapon + base minis have no weapon at R4 = only HW dice
    const r4 = getDiceAtRange(results, 'R4');
    expect(r4.blackDice).toBe(2);
    expect(r4.whiteDice).toBe(2);
    expect(r4.totalDice).toBe(4);

    // At Melee: 4 base × 1B (Unarmed) + 1 HW mini falls back to Unarmed = 5B
    const melee = getDiceAtRange(results, 'Melee');
    expect(melee.blackDice).toBe(5);
    expect(melee.totalDice).toBe(5);
  });

  // -------------------------------------------------------------------
  // Un-enriched personnel (no weapons → fires base weapon)
  // -------------------------------------------------------------------

  it('personnel without own weapons increases base weapon multiplier', () => {
    const unit = makeMinimalUnit({
      figures: 4,
      weapons: [makeWeapon({ blackDice: 1, maxRange: 3 })],
    });

    const personnel = makeMinimalUpgrade({
      upgradeSlot: UpgradeSlot.Personnel,
      addsMiniature: 1,
      weapons: [], // un-enriched, fires base weapon
    });

    const r1 = getDiceAtRange(computeUnitDiceByRange(unit, [personnel]), 'R1');
    expect(r1.blackDice).toBe(5); // 4 + 1 extra = 5 base minis × 1B
    expect(r1.totalDice).toBe(5);
  });

  // -------------------------------------------------------------------
  // Armament weapons replace base weapon for single-mini units
  // -------------------------------------------------------------------

  it('armament weapon is considered in weapon pool for single-mini', () => {
    const unit = makeMinimalUnit({
      figures: 1,
      weapons: [makeWeapon({ name: 'Pistol', blackDice: 1, maxRange: 2 })],
    });

    const armament = makeMinimalUpgrade({
      upgradeSlot: UpgradeSlot.Armament,
      weapons: [makeWeapon({ name: 'Big Gun', redDice: 3, maxRange: 3 })],
    });

    const r2 = getDiceAtRange(computeUnitDiceByRange(unit, [armament]), 'R2');
    // Arsenal 1 default: picks Big Gun (3R > 1B)
    expect(r2.redDice).toBe(3);
    expect(r2.blackDice).toBe(0);
    expect(r2.totalDice).toBe(3);
  });

  // -------------------------------------------------------------------
  // Grenade weapons: one entry per grenade
  // -------------------------------------------------------------------

  it('grenade adds one weapon entry at covered ranges', () => {
    const unit = makeMinimalUnit({
      figures: 4,
      weapons: [makeWeapon({ blackDice: 1, maxRange: 3 })],
    });

    const grenade = makeMinimalUpgrade({
      upgradeSlot: UpgradeSlot.Grenades,
      isGrenade: true,
      weapons: [makeWeapon({ name: 'Impact Grenade', blackDice: 1, maxRange: 1 })],
    });

    const r1 = getDiceAtRange(computeUnitDiceByRange(unit, [grenade]), 'R1');
    // 4 base × 1B + 1 grenade × 1B = 5B
    expect(r1.blackDice).toBe(5);

    // Grenade out of range at R2
    const r2 = getDiceAtRange(computeUnitDiceByRange(unit, [grenade]), 'R2');
    expect(r2.blackDice).toBe(4);
  });

  // -------------------------------------------------------------------
  // Noncombatant exclusion
  // -------------------------------------------------------------------

  it('noncombatant upgrade contributes no dice', () => {
    const unit = makeMinimalUnit({
      figures: 1,
      weapons: [makeWeapon({ blackDice: 2, maxRange: 3 })],
    });

    const noncombatant = makeMinimalUpgrade({
      noncombatant: true,
      addsMiniature: 1,
      weapons: [makeWeapon({ blackDice: 5, maxRange: 3 })],
    });

    const r1 = getDiceAtRange(computeUnitDiceByRange(unit, [noncombatant]), 'R1');
    expect(r1.blackDice).toBe(2); // Only base mini
    expect(r1.totalDice).toBe(2);
  });

  // -------------------------------------------------------------------
  // Gunslinger: doubles best single ranged weapon
  // -------------------------------------------------------------------

  it('gunslinger doubles the best ranged weapon at ranged bands', () => {
    const unit = makeMinimalUnit({
      figures: 1,
      keywords: { gunslinger: true },
      weapons: [
        makeWeapon({ name: 'Pistol', blackDice: 2, maxRange: 2 }),
      ],
    });

    // R1: 2B from pistol + 2B gunslinger bonus = 4B
    const r1 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R1');
    expect(r1.blackDice).toBe(4);
    expect(r1.totalDice).toBe(4);

    // Out of range at R3: no weapon, no gunslinger
    const r3 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R3');
    expect(r3.totalDice).toBe(0);
  });

  it('gunslinger does not apply at melee range', () => {
    const unit = makeMinimalUnit({
      figures: 1,
      keywords: { gunslinger: true },
      weapons: [
        makeWeapon({ name: 'Melee', weaponType: AttackType.Melee, blackDice: 3 }),
        makeWeapon({ name: 'Pistol', blackDice: 2, maxRange: 2 }),
      ],
    });

    const melee = getDiceAtRange(computeUnitDiceByRange(unit, []), 'Melee');
    expect(melee.blackDice).toBe(3); // Only melee weapon, no gunslinger doubling
  });

  it('gunslinger doubles the best weapon among multiple choices', () => {
    const unit = makeMinimalUnit({
      figures: 1,
      keywords: { gunslinger: true, arsenalX: 2 },
      weapons: [
        makeWeapon({ name: 'Weak Gun', whiteDice: 1, maxRange: 3 }),
        makeWeapon({ name: 'Strong Gun', redDice: 2, maxRange: 3 }),
      ],
    });

    const r2 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R2');
    // Arsenal 2: both guns contribute (2R + 1W), gunslinger duplicates Strong Gun (+2R)
    expect(r2.redDice).toBe(4); // 2 from Strong Gun + 2 gunslinger
    expect(r2.whiteDice).toBe(1);
    expect(r2.totalDice).toBe(5);
  });

  // -------------------------------------------------------------------
  // Other upgrade weapons (ordnance, hardpoint)
  // -------------------------------------------------------------------

  it('other upgrade weapons are added once each', () => {
    const unit = makeMinimalUnit({
      figures: 1,
      weapons: [makeWeapon({ blackDice: 1, maxRange: 3 })],
    });

    const ordnance = makeMinimalUpgrade({
      upgradeSlot: UpgradeSlot.Ordnance,
      addsMiniature: 0,
      weapons: [makeWeapon({ name: 'Rocket', redDice: 2, maxRange: 4 })],
    });

    const r2 = getDiceAtRange(computeUnitDiceByRange(unit, [ordnance]), 'R2');
    // Base weapon: 1B, Ordnance: 2R — both eligible.
    // But base mini picks best weapon (1B), ordnance is "other upgrade weapon" added once.
    expect(r2.blackDice).toBe(1);
    expect(r2.redDice).toBe(2);
    expect(r2.totalDice).toBe(3);
  });

  // -------------------------------------------------------------------
  // Hybrid weapons (cover both melee and ranged)
  // -------------------------------------------------------------------

  it('hybrid weapon is eligible at both melee and ranged bands', () => {
    const unit = makeMinimalUnit({
      figures: 1,
      weapons: [makeWeapon({
        name: 'Lightsaber',
        weaponType: AttackType.Hybrid,
        blackDice: 3,
        maxRange: 1,
      })],
    });

    const melee = getDiceAtRange(computeUnitDiceByRange(unit, []), 'Melee');
    expect(melee.blackDice).toBe(3);

    const r1 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R1');
    expect(r1.blackDice).toBe(3);

    const r2 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R2');
    expect(r2.totalDice).toBe(0); // Out of range
  });

  // -------------------------------------------------------------------
  // Edge case: multi-mini with armament (armament replaces base weapon)
  // -------------------------------------------------------------------

  it('multi-mini with armament picks best of base + armament for all base minis', () => {
    const unit = makeMinimalUnit({
      figures: 3,
      weapons: [makeWeapon({ name: 'Weak Gun', whiteDice: 1, maxRange: 3 })],
    });

    const armament = makeMinimalUpgrade({
      upgradeSlot: UpgradeSlot.Armament,
      weapons: [makeWeapon({ name: 'Better Gun', blackDice: 2, maxRange: 3 })],
    });

    const r1 = getDiceAtRange(computeUnitDiceByRange(unit, [armament]), 'R1');
    // All 3 base minis pick the better weapon: 3 × 2B = 6B
    expect(r1.blackDice).toBe(6);
    expect(r1.whiteDice).toBe(0);
    expect(r1.totalDice).toBe(6);
  });
});

// ============================================================================
// extractAdjustedTokens
// ============================================================================

describe('extractAdjustedTokens', () => {
  it('returns all zeroes for empty keywords', () => {
    const tokens = extractAdjustedTokens({});
    expect(tokens.bonusAimTokens).toBe(0);
    expect(tokens.bonusObservationTokens).toBe(0);
    expect(tokens.bonusSurgeTokens).toBe(0);
    expect(tokens.bonusDodgeTokens).toBe(0);
  });

  it('sums aim-related keywords correctly', () => {
    const tokens = extractAdjustedTokens({
      tacticalX: 1,
      independentAimX: 1,
      independentAimOrDodgeX: 1,
      targetX: 2,
      cacheAimX: 1,
    });
    // 1 + 1 + 1 + 2 + 1 = 6
    expect(tokens.bonusAimTokens).toBe(6);
  });

  it('extracts observeX into observation tokens', () => {
    const tokens = extractAdjustedTokens({ observeX: 3 });
    expect(tokens.bonusObservationTokens).toBe(3);
    expect(tokens.bonusAimTokens).toBe(0);
  });

  it('sums surge-related keywords correctly', () => {
    const tokens = extractAdjustedTokens({
      independentSurgeX: 2,
      cacheSurgeX: 1,
    });
    expect(tokens.bonusSurgeTokens).toBe(3);
  });

  it('sums dodge-related keywords correctly', () => {
    const tokens = extractAdjustedTokens({
      independentDodgeX: 1,
      cacheDodgeX: 2,
    });
    expect(tokens.bonusDodgeTokens).toBe(3);
  });

  it('ignores non-numeric keyword values', () => {
    const tokens = extractAdjustedTokens({
      tacticalX: true as unknown as number,
      observeX: 'abc' as unknown as number,
    });
    expect(tokens.bonusAimTokens).toBe(0);
    expect(tokens.bonusObservationTokens).toBe(0);
  });
});

// ============================================================================
// buildAttackerConfigForEstimation
// ============================================================================

describe('buildAttackerConfigForEstimation', () => {
  it('produces config with correct surge chart and zero tokens when no keywords', () => {
    const config = buildAttackerConfigForEstimation(
      AttackSurgeChart.ToHit,
      {},
      { bonusAimTokens: 0, bonusObservationTokens: 0, bonusSurgeTokens: 0, bonusDodgeTokens: 0 },
    );
    expect(config.surgeChart).toBe(AttackSurgeChart.ToHit);
    expect(config.aimTokens).toBe(0);
    expect(config.marksman).toBe(false);
    expect(config.preciseX).toBe(0);
  });

  it('maps bonus tokens into AttackerConfig fields', () => {
    const config = buildAttackerConfigForEstimation(
      AttackSurgeChart.None,
      {},
      { bonusAimTokens: 3, bonusObservationTokens: 2, bonusSurgeTokens: 1, bonusDodgeTokens: 1 },
    );
    expect(config.aimTokens).toBe(3);
    expect(config.observationTokens).toBe(2);
    expect(config.surgeTokens).toBe(1);
    expect(config.dodgeTokensAttacker).toBe(1);
  });

  it('maps combat keywords from merged keyword record', () => {
    const config = buildAttackerConfigForEstimation(
      AttackSurgeChart.ToCrit,
      { marksman: true, preciseX: 2, jarKaiMastery: true, holdTheLine: true, completeTheMission: true },
      { bonusAimTokens: 0, bonusObservationTokens: 0, bonusSurgeTokens: 0, bonusDodgeTokens: 0 },
    );
    expect(config.marksman).toBe(true);
    expect(config.preciseX).toBe(2);
    expect(config.jarKaiMastery).toBe(true);
    expect(config.holdTheLine).toBe(true);
    expect(config.completeTheMission).toBe(true);
  });
});

// ============================================================================
// computeUnitDiceByRange — adjusted expected successes
// ============================================================================

describe('computeUnitDiceByRange — adjusted successes', () => {
  it('adjusted equals expected when unit has no token-granting keywords', () => {
    const unit = makeMinimalUnit({
      figures: 4,
      weapons: [makeWeapon({ blackDice: 1, maxRange: 3 })],
      attackSurgeChart: AttackSurgeChart.None,
    });
    const r2 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R2');
    expect(r2.adjustedExpectedSuccesses).toBeCloseTo(r2.expectedSuccesses, 5);
  });

  it('adjusted > expected when unit has tacticalX', () => {
    const unit = makeMinimalUnit({
      figures: 4,
      weapons: [makeWeapon({ blackDice: 1, maxRange: 3 })],
      attackSurgeChart: AttackSurgeChart.ToHit,
      keywords: { tacticalX: 1 },
    });
    const r2 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R2');
    expect(r2.adjustedExpectedSuccesses).toBeGreaterThan(r2.expectedSuccesses);
  });

  it('adjusted reflects marksman keyword boost', () => {
    const unit = makeMinimalUnit({
      figures: 4,
      weapons: [makeWeapon({ blackDice: 1, maxRange: 3 })],
      attackSurgeChart: AttackSurgeChart.ToHit,
      keywords: { tacticalX: 1, marksman: true },
    });
    const r2 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R2');
    // Marksman with 1 aim → +1 hit instead of rerolls, so adjusted should be higher
    expect(r2.adjustedExpectedSuccesses).toBeGreaterThan(r2.expectedSuccesses);
  });

  it('adjusted is populated for melee range bands', () => {
    const unit = makeMinimalUnit({
      figures: 3,
      weapons: [makeWeapon({ redDice: 1, weaponType: AttackType.Melee })],
      keywords: { tacticalX: 1 },
      attackSurgeChart: AttackSurgeChart.ToCrit,
    });
    const melee = getDiceAtRange(computeUnitDiceByRange(unit, []), 'Melee');
    expect(melee.adjustedExpectedSuccesses).toBeGreaterThan(0);
    expect(melee.adjustedExpectedSuccesses).toBeGreaterThan(melee.expectedSuccesses);
  });

  it('gunslinger weapon keywords contribute to adjusted calculation', () => {
    // Gunslinger unit with a weapon that has Critical 1.
    // The duplicated weapon's keywords should feed into the adjusted calculation.
    const unit = makeMinimalUnit({
      figures: 1,
      keywords: { gunslinger: true },
      attackSurgeChart: AttackSurgeChart.None,
      weapons: [
        makeWeapon({
          name: 'Blaster',
          blackDice: 2,
          maxRange: 2,
          keywords: { criticalX: 1 },
        }),
      ],
    });

    const r1 = getDiceAtRange(computeUnitDiceByRange(unit, []), 'R1');
    // Gunslinger doubles dice: 4B total. Critical 1 from TWO weapon contributions
    // → Critical 2 for surge conversion in the adjusted calculation.
    // With no surge chart but Critical 2, surges convert → crits → more successes.
    expect(r1.adjustedExpectedSuccesses).toBeGreaterThan(r1.expectedSuccesses);
  });
});

// ============================================================================
// computeEffectiveCourage
// ============================================================================

describe('computeEffectiveCourage', () => {
  it('returns base courage when no upgrades modify it', () => {
    expect(computeEffectiveCourage(2, [])).toBe(2);
  });

  it('returns null when base courage is null and no Infinity modifier', () => {
    expect(computeEffectiveCourage(null, [])).toBeNull();
  });

  it('adds finite modifiers to base courage', () => {
    const upg = makeMinimalUpgrade({ courageModifier: 1 });
    expect(computeEffectiveCourage(2, [upg])).toBe(3);
  });

  it('sums multiple modifiers', () => {
    const upg1 = makeMinimalUpgrade({ courageModifier: 1 });
    const upg2 = makeMinimalUpgrade({ courageModifier: 1 });
    expect(computeEffectiveCourage(1, [upg1, upg2])).toBe(3);
  });

  it('clamps negative results to 0', () => {
    const upg = makeMinimalUpgrade({ courageModifier: -5 });
    expect(computeEffectiveCourage(2, [upg])).toBe(0);
  });

  it('Infinity modifier overrides finite base courage', () => {
    const upg = makeMinimalUpgrade({ courageModifier: Infinity });
    expect(computeEffectiveCourage(2, [upg])).toBe(Infinity);
  });

  it('Infinity modifier overrides null base courage', () => {
    const upg = makeMinimalUpgrade({ courageModifier: Infinity });
    expect(computeEffectiveCourage(null, [upg])).toBe(Infinity);
  });

  it('preserves Infinity base courage without modifiers', () => {
    expect(computeEffectiveCourage(Infinity, [])).toBe(Infinity);
  });

  it('preserves Infinity base courage with finite modifier', () => {
    const upg = makeMinimalUpgrade({ courageModifier: 1 });
    expect(computeEffectiveCourage(Infinity, [upg])).toBe(Infinity);
  });
});

// ============================================================================
// aggregateArmyStats — courageBreakdown
// ============================================================================

describe('aggregateArmyStats — courageBreakdown', () => {
  it('produces courage breakdown from units with known courage', () => {
    const unit1 = makeMinimalUnit({ courage: 1, cost: 40 });
    const unit2 = makeMinimalUnit({ courage: 2, cost: 60 });
    const units = [makeListUnit(unit1), makeListUnit(unit2)];

    const stats = aggregateArmyStats(units, {});
    expect(stats.courageBreakdown).toHaveLength(2);

    const c1 = stats.courageBreakdown.find(c => c.courage === 1);
    const c2 = stats.courageBreakdown.find(c => c.courage === 2);
    expect(c1).toBeDefined();
    expect(c1!.unitCount).toBe(1);
    expect(c1!.label).toBe('1');
    expect(c2).toBeDefined();
    expect(c2!.unitCount).toBe(1);
    expect(c2!.label).toBe('2');
  });

  it('groups unknown courage units under null', () => {
    const unit = makeMinimalUnit({ courage: null, cost: 50 });
    const stats = aggregateArmyStats([makeListUnit(unit)], {});
    const unknown = stats.courageBreakdown.find(c => c.courage === null);
    expect(unknown).toBeDefined();
    expect(unknown!.label).toBe('Unknown');
    expect(unknown!.unitCount).toBe(1);
  });

  it('groups Infinity courage units with label \u221E', () => {
    const unit = makeMinimalUnit({ courage: Infinity, cost: 100 });
    const stats = aggregateArmyStats([makeListUnit(unit)], {});
    const inf = stats.courageBreakdown.find(c => c.courage === Infinity);
    expect(inf).toBeDefined();
    expect(inf!.label).toBe('\u221E');
    expect(inf!.unitCount).toBe(1);
  });

  it('sorts finite < Infinity < Unknown', () => {
    const units = [
      makeListUnit(makeMinimalUnit({ courage: null, cost: 10 })),
      makeListUnit(makeMinimalUnit({ courage: Infinity, cost: 20 })),
      makeListUnit(makeMinimalUnit({ courage: 1, cost: 30 })),
      makeListUnit(makeMinimalUnit({ courage: 3, cost: 40 })),
    ];
    const stats = aggregateArmyStats(units, {});
    const labels = stats.courageBreakdown.map(c => c.label);
    expect(labels).toEqual(['1', '3', '\u221E', 'Unknown']);
  });

  it('applies upgrade courageModifier to unit courage', () => {
    const unit = makeMinimalUnit({ courage: 1, cost: 50 });
    const upg = makeMinimalUpgrade({ courageModifier: 1, cost: 10 });
    const listUnit = makeListUnit(unit, { resolvedUpgrades: [upg] });

    const stats = aggregateArmyStats([listUnit], {});
    const c2 = stats.courageBreakdown.find(c => c.courage === 2);
    expect(c2).toBeDefined();
    expect(c2!.unitCount).toBe(1);
    expect(c2!.points).toBe(60);
  });

  it('Infinity upgrade modifier overrides finite base courage in breakdown', () => {
    const unit = makeMinimalUnit({ courage: 2, cost: 50 });
    const upg = makeMinimalUpgrade({ courageModifier: Infinity });
    const listUnit = makeListUnit(unit, { resolvedUpgrades: [upg] });

    const stats = aggregateArmyStats([listUnit], {});
    const inf = stats.courageBreakdown.find(c => c.courage === Infinity);
    expect(inf).toBeDefined();
    expect(inf!.unitCount).toBe(1);
  });

  it('calculates percentage based on total points', () => {
    const unit1 = makeMinimalUnit({ courage: 1, cost: 25 });
    const unit2 = makeMinimalUnit({ courage: 1, cost: 75 });
    const stats = aggregateArmyStats(
      [makeListUnit(unit1), makeListUnit(unit2)],
      {},
    );
    const c1 = stats.courageBreakdown.find(c => c.courage === 1);
    expect(c1).toBeDefined();
    expect(c1!.percentage).toBe(1);
    expect(c1!.points).toBe(100);
  });
});

// ============================================================================
// aggregateArmyStats — unitsByRank dice contribution
// ============================================================================

describe('aggregateArmyStats — unitsByRank dice contribution', () => {
  it('computes expectedContribution and adjustedContribution that sum to ~1', () => {
    const commander = makeMinimalUnit({
      id: 'cmdr',
      rank: 'commander',
      cost: 100,
      figures: 1,
      weapons: [makeWeapon({ redDice: 2, maxRange: 3 })],
    });
    const corps1 = makeMinimalUnit({
      id: 'corps1',
      rank: 'corps',
      cost: 50,
      figures: 4,
      weapons: [makeWeapon({ blackDice: 1, maxRange: 3 })],
    });
    const corps2 = makeMinimalUnit({
      id: 'corps2',
      rank: 'corps',
      cost: 50,
      figures: 4,
      weapons: [makeWeapon({ blackDice: 1, maxRange: 3 })],
    });

    const stats = aggregateArmyStats(
      [makeListUnit(commander), makeListUnit(corps1), makeListUnit(corps2)],
      {},
    );

    expect(stats.unitsByRank.length).toBeGreaterThanOrEqual(2);

    const cmdrRank = stats.unitsByRank.find(r => r.rank === 'Commander');
    const corpsRank = stats.unitsByRank.find(r => r.rank === 'Corps');
    expect(cmdrRank).toBeDefined();
    expect(corpsRank).toBeDefined();

    // Contributions should be between 0 and 1
    expect(cmdrRank!.expectedContribution).toBeGreaterThan(0);
    expect(cmdrRank!.expectedContribution).toBeLessThanOrEqual(1);
    expect(corpsRank!.expectedContribution).toBeGreaterThan(0);
    expect(corpsRank!.expectedContribution).toBeLessThanOrEqual(1);

    // Sum of contributions should be ~1
    const expectedSum = cmdrRank!.expectedContribution + corpsRank!.expectedContribution;
    expect(expectedSum).toBeCloseTo(1, 2);

    const adjustedSum = cmdrRank!.adjustedContribution + corpsRank!.adjustedContribution;
    expect(adjustedSum).toBeCloseTo(1, 2);
  });

  it('returns 0 contribution for ranks with no weapons', () => {
    const commander = makeMinimalUnit({
      id: 'cmdr',
      rank: 'commander',
      cost: 100,
      figures: 1,
      weapons: [],
    });
    const corps = makeMinimalUnit({
      id: 'corps',
      rank: 'corps',
      cost: 50,
      figures: 4,
      weapons: [makeWeapon({ blackDice: 2, maxRange: 3 })],
    });

    const stats = aggregateArmyStats(
      [makeListUnit(commander), makeListUnit(corps)],
      {},
    );

    const cmdrRank = stats.unitsByRank.find(r => r.rank === 'Commander');
    const corpsRank = stats.unitsByRank.find(r => r.rank === 'Corps');
    expect(cmdrRank).toBeDefined();
    expect(corpsRank).toBeDefined();

    // Commander has no weapons → 0 contribution
    expect(cmdrRank!.expectedContribution).toBe(0);
    expect(cmdrRank!.adjustedContribution).toBe(0);

    // Corps should own 100% of dice output
    expect(corpsRank!.expectedContribution).toBe(1);
    expect(corpsRank!.adjustedContribution).toBe(1);
  });

  it('returns 0 contribution when no units have weapons', () => {
    const unit = makeMinimalUnit({
      id: 'empty',
      rank: 'corps',
      cost: 50,
      weapons: [],
    });

    const stats = aggregateArmyStats([makeListUnit(unit)], {});
    const corpsRank = stats.unitsByRank.find(r => r.rank === 'Corps');
    expect(corpsRank).toBeDefined();
    expect(corpsRank!.expectedContribution).toBe(0);
    expect(corpsRank!.adjustedContribution).toBe(0);
  });
});
