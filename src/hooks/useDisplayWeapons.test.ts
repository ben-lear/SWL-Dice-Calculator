/**
 * Tests for useDisplayWeapons hook.
 * Phase 10F-1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDisplayWeapons } from './useDisplayWeapons';
import { useAttackConfigStore } from '../stores/attackConfigStore';
import { useAttackTypeStore } from '../stores/attackTypeStore';
import { AttackType } from '../engine/types';
import { UpgradeSlot } from '../data/types';
import type { WeaponProfile as DataLayerWeaponProfile } from '../data/types';
import type { ResolvedUpgrade } from '../data/types';

// ============================================================================
// Mock upgrade resolver
// ============================================================================

const mockUpgradeMap = new Map<string, ResolvedUpgrade>();

vi.mock('../data/upgradeResolver', () => ({
  getResolvedUpgradeById: (id: string) => mockUpgradeMap.get(id),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function makeDataWeapon(
  name: string,
  weaponType: AttackType = AttackType.Ranged,
  opts: Partial<DataLayerWeaponProfile> = {},
): DataLayerWeaponProfile {
  return {
    name,
    weaponType,
    redDice: 1,
    blackDice: 0,
    whiteDice: 0,
    keywords: {},
    ...opts,
  };
}

function makeUpgrade(
  id: string,
  overrides: Partial<ResolvedUpgrade>,
): ResolvedUpgrade {
  return {
    id,
    apiId: 0,
    name: id,
    cost: 5,
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
    courageModifier: 0,
    isEnriched: true,
    ...overrides,
  };
}

function setAttackType(type: AttackType) {
  useAttackTypeStore.setState({ attackType: type });
}

function setStoreState(opts: {
  unitBaseWeapons?: DataLayerWeaponProfile[];
  baseMiniatureCount?: number;
  equippedUpgradeIds?: (string | null)[];
  weaponMiniCounts?: Record<string, number>;
  arsenalX?: number;
}) {
  useAttackConfigStore.setState({
    unitBaseWeapons: opts.unitBaseWeapons ?? [],
    baseMiniatureCount: opts.baseMiniatureCount ?? 1,
    equippedUpgradeIds: opts.equippedUpgradeIds ?? [],
    weaponMiniCounts: opts.weaponMiniCounts ?? {},
    arsenalX: opts.arsenalX ?? 0,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('useDisplayWeapons', () => {
  beforeEach(() => {
    mockUpgradeMap.clear();
    useAttackConfigStore.getState().reset();
    setAttackType(AttackType.Ranged);
  });

  // ── Empty / no preset ───────────────────────────────────────────────────

  it('returns empty weapons when no preset is loaded', () => {
    setStoreState({});
    const { result } = renderHook(() => useDisplayWeapons());
    expect(result.current.weapons).toHaveLength(0);
  });

  // ── Single-mini unit ────────────────────────────────────────────────────

  it('single-mini unit: isSingleMini=true, 1 weapon with count=1, maxCount=1', () => {
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('Blaster')],
      baseMiniatureCount: 1,
    });
    const { result } = renderHook(() => useDisplayWeapons());
    expect(result.current.isSingleMini).toBe(true);
    expect(result.current.weapons).toHaveLength(1);
    expect(result.current.weapons[0].count).toBe(1);
    expect(result.current.weapons[0].maxCount).toBe(1);
    expect(result.current.weapons[0].source).toBe('base');
  });

  it('single-mini unit: only ranged weapon shown in Ranged mode', () => {
    setAttackType(AttackType.Ranged);
    setStoreState({
      unitBaseWeapons: [
        makeDataWeapon('Blaster', AttackType.Ranged),
        makeDataWeapon('Lightsaber', AttackType.Melee),
      ],
      baseMiniatureCount: 1,
    });
    const { result } = renderHook(() => useDisplayWeapons());
    expect(result.current.weapons).toHaveLength(1);
    expect(result.current.weapons[0].name).toBe('Blaster');
  });

  // ── Multi-mini unit ─────────────────────────────────────────────────────

  it('multi-mini unit: isSingleMini=false, 1 weapon with count=4, maxCount=4', () => {
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('E-11')],
      baseMiniatureCount: 4,
    });
    const { result } = renderHook(() => useDisplayWeapons());
    expect(result.current.isSingleMini).toBe(false);
    expect(result.current.weapons).toHaveLength(1);
    expect(result.current.weapons[0].count).toBe(4);
    expect(result.current.weapons[0].maxCount).toBe(4);
  });

  it('multi-mini unit: first base weapon gets count=4, additional base gets count=0', () => {
    setAttackType(AttackType.Ranged);
    setStoreState({
      unitBaseWeapons: [
        makeDataWeapon('E-11', AttackType.Ranged),
        makeDataWeapon('EC-17', AttackType.Ranged),
      ],
      baseMiniatureCount: 4,
    });
    const { result } = renderHook(() => useDisplayWeapons());
    expect(result.current.weapons).toHaveLength(2);
    expect(result.current.weapons[0].name).toBe('E-11');
    expect(result.current.weapons[0].count).toBe(4);
    expect(result.current.weapons[1].name).toBe('EC-17');
    expect(result.current.weapons[1].count).toBe(0);
  });

  // ── Heavy weapon upgrade ────────────────────────────────────────────────

  it('equipping compatible heavy weapon: base unchanged, HW row added', () => {
    const hw = makeUpgrade('hw-1', {
      upgradeSlot: UpgradeSlot.HeavyWeapon,
      addsMiniature: 1,
      weapons: [makeDataWeapon('RT-97C', AttackType.Ranged)],
    });
    mockUpgradeMap.set('hw-1', hw);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('E-11')],
      baseMiniatureCount: 4,
      equippedUpgradeIds: ['hw-1'],
    });
    const { result } = renderHook(() => useDisplayWeapons());
    const baseRow = result.current.weapons.find((w) => w.name === 'E-11');
    const hwRow = result.current.weapons.find((w) => w.name === 'RT-97C');
    expect(baseRow?.count).toBe(4); // unchanged
    expect(hwRow?.count).toBe(1);   // heavy weapon mini
    expect(hwRow?.maxCount).toBe(1);
    expect(hwRow?.source).toBe('heavy');
    expect(result.current.totalMiniCount).toBe(5);
    // Base weapon maxCount should include the heavy weapon mini slot
    expect(baseRow?.maxCount).toBe(5); // 4 base + 1 from heavy weapon
  });

  it('unassigning compatible heavy weapon: base weapon allows re-assignment', () => {
    // Regression: when a heavy weapon is unassigned (count=0), its mini should be
    // re-assignable to the default base weapon (maxCount and default count must reflect this).
    const hw = makeUpgrade('hw-unassign', {
      upgradeSlot: UpgradeSlot.HeavyWeapon,
      addsMiniature: 1,
      weapons: [makeDataWeapon('RT-97C', AttackType.Ranged)],
    });
    mockUpgradeMap.set('hw-unassign', hw);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('E-11')],
      baseMiniatureCount: 4,
      equippedUpgradeIds: ['hw-unassign'],
      // User explicitly unassigned the heavy weapon
      weaponMiniCounts: { 'RT-97C': 0 },
    });
    const { result } = renderHook(() => useDisplayWeapons());
    const baseRow = result.current.weapons.find((w) => w.name === 'E-11');
    const hwRow = result.current.weapons.find((w) => w.name === 'RT-97C');
    // Heavy weapon is unassigned
    expect(hwRow?.count).toBe(0);
    // Base weapon should now show 5 (4 base + 1 unassigned heavy mini)
    expect(baseRow?.count).toBe(5);
    // Base weapon maxCount must allow up to 5
    expect(baseRow?.maxCount).toBe(5);
  });

  it('incompatible heavy weapon: row not shown, base weapon count increased', () => {
    const meleeHW = makeUpgrade('melee-hw', {
      upgradeSlot: UpgradeSlot.HeavyWeapon,
      addsMiniature: 1,
      weapons: [makeDataWeapon('Vibro-Axe', AttackType.Melee)],
    });
    mockUpgradeMap.set('melee-hw', meleeHW);
    setAttackType(AttackType.Ranged);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('E-11')],
      baseMiniatureCount: 4,
      equippedUpgradeIds: ['melee-hw'],
    });
    const { result } = renderHook(() => useDisplayWeapons());
    const vibroRow = result.current.weapons.find((w) => w.name === 'Vibro-Axe');
    const baseRow = result.current.weapons.find((w) => w.name === 'E-11');
    expect(vibroRow).toBeUndefined();
    expect(baseRow?.count).toBe(5); // 4 base + 1 fallback
    expect(baseRow?.maxCount).toBe(5);
  });

  // ── Grenade upgrade ─────────────────────────────────────────────────────

  it('equipping grenade: grenade row added, base count reduced by 1', () => {
    const grenade = makeUpgrade('grenade-1', {
      upgradeSlot: UpgradeSlot.Grenades,
      isGrenade: true,
      weapons: [makeDataWeapon('Impact Grenade', AttackType.Ranged)],
    });
    mockUpgradeMap.set('grenade-1', grenade);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('E-11')],
      baseMiniatureCount: 4,
      equippedUpgradeIds: ['grenade-1'],
    });
    const { result } = renderHook(() => useDisplayWeapons());
    const grenadeRow = result.current.weapons.find((w) => w.name === 'Impact Grenade');
    const baseRow = result.current.weapons.find((w) => w.name === 'E-11');
    expect(grenadeRow?.count).toBe(1);
    expect(grenadeRow?.source).toBe('grenade');
    expect(baseRow?.count).toBe(3); // 4 - 1 for grenade
  });

  it('two grenades: base count reduced by 2', () => {
    const g1 = makeUpgrade('g1', {
      upgradeSlot: UpgradeSlot.Grenades,
      isGrenade: true,
      weapons: [makeDataWeapon('Concussion Grenade', AttackType.Ranged)],
    });
    const g2 = makeUpgrade('g2', {
      upgradeSlot: UpgradeSlot.Grenades,
      isGrenade: true,
      weapons: [makeDataWeapon('Impact Grenade', AttackType.Ranged)],
    });
    mockUpgradeMap.set('g1', g1);
    mockUpgradeMap.set('g2', g2);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('E-11')],
      baseMiniatureCount: 4,
      equippedUpgradeIds: ['g1', 'g2'],
    });
    const { result } = renderHook(() => useDisplayWeapons());
    const baseRow = result.current.weapons.find((w) => w.name === 'E-11');
    expect(baseRow?.count).toBe(2); // 4 - 2 grenades
    expect(result.current.weapons.filter((w) => w.source === 'grenade')).toHaveLength(2);
  });

  // ── Armament upgrade ────────────────────────────────────────────────────

  it('equipping armament: base count=0, armament count=baseMiniatureCount', () => {
    const armament = makeUpgrade('armament-1', {
      upgradeSlot: UpgradeSlot.Armament,
      weapons: [makeDataWeapon('Scatter Gun', AttackType.Ranged)],
    });
    mockUpgradeMap.set('armament-1', armament);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('A-295')],
      baseMiniatureCount: 4,
      equippedUpgradeIds: ['armament-1'],
    });
    const { result } = renderHook(() => useDisplayWeapons());
    const baseRow = result.current.weapons.find((w) => w.name === 'A-295');
    const armRow = result.current.weapons.find((w) => w.name === 'Scatter Gun');
    expect(baseRow?.count).toBe(0);
    expect(armRow?.count).toBe(4); // baseMiniatureCount
    expect(armRow?.source).toBe('armament');
  });

  // ── Sidearm enforcement ─────────────────────────────────────────────────

  it('sidearm melee weapon: minCount=1 when attackType=Melee', () => {
    const sidearmHW = makeUpgrade('sidearm-hw', {
      upgradeSlot: UpgradeSlot.HeavyWeapon,
      addsMiniature: 1,
      weapons: [makeDataWeapon('Vibroblade', AttackType.Melee, { keywords: { sidearmMelee: true } })],
    });
    mockUpgradeMap.set('sidearm-hw', sidearmHW);
    setAttackType(AttackType.Melee);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('Unarmed', AttackType.Melee)],
      baseMiniatureCount: 4,
      equippedUpgradeIds: ['sidearm-hw'],
    });
    const { result } = renderHook(() => useDisplayWeapons());
    const sidearmRow = result.current.weapons.find((w) => w.name === 'Vibroblade');
    expect(sidearmRow?.minCount).toBe(1);
  });

  it('sidearm melee weapon: minCount=0 when attackType=Ranged', () => {
    const sidearmHW = makeUpgrade('sidearm-hw', {
      upgradeSlot: UpgradeSlot.HeavyWeapon,
      addsMiniature: 1,
      weapons: [makeDataWeapon('Vibroblade', AttackType.Melee, { keywords: { sidearmMelee: true } })],
    });
    mockUpgradeMap.set('sidearm-hw', sidearmHW);
    setAttackType(AttackType.Ranged);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('E-11')],
      baseMiniatureCount: 4,
      equippedUpgradeIds: ['sidearm-hw'],
    });
    const { result } = renderHook(() => useDisplayWeapons());
    // Incompatible in ranged mode → not shown as a weapon row
    const sidearmRow = result.current.weapons.find((w) => w.name === 'Vibroblade');
    expect(sidearmRow).toBeUndefined();
  });

  // ── Arsenal X cap ───────────────────────────────────────────────────────

  // Note: Arsenal X and multi-mini (addsMiniature > 0) are mutually exclusive in the
  // game rules. Arsenal X tests use grenade upgrades — they contribute a weapon row
  // without adding a miniature, keeping totalMiniCount=1 (isSingleMini=true).
  // For a single-mini unit with 2 grenades: base count = max(0, 1 - 2) = 0,
  // grenade1 count = 1, grenade2 count = 1 → 2 enabled weapons by default.

  it('arsenalX=2: two grenades both enabled (2 \u2264 arsenalX)', () => {
    const g1 = makeUpgrade('arsenal-g1', {
      upgradeSlot: UpgradeSlot.Grenades,
      isGrenade: true,
      weapons: [makeDataWeapon('Grenade A', AttackType.Ranged)],
    });
    const g2 = makeUpgrade('arsenal-g2', {
      upgradeSlot: UpgradeSlot.Grenades,
      isGrenade: true,
      weapons: [makeDataWeapon('Grenade B', AttackType.Ranged)],
    });
    mockUpgradeMap.set('arsenal-g1', g1);
    mockUpgradeMap.set('arsenal-g2', g2);
    setAttackType(AttackType.Ranged);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('DLT-19')],
      baseMiniatureCount: 1,
      equippedUpgradeIds: ['arsenal-g1', 'arsenal-g2'],
      arsenalX: 2,
    });
    const { result } = renderHook(() => useDisplayWeapons());
    const enabled = result.current.weapons.filter((w) => w.count > 0);
    expect(enabled).toHaveLength(2); // both grenades enabled, base = 0
  });

  it('arsenalX=1: two grenades but cap reduces to 1 enabled', () => {
    const g1 = makeUpgrade('cap-g1', {
      upgradeSlot: UpgradeSlot.Grenades,
      isGrenade: true,
      weapons: [makeDataWeapon('Grenade A', AttackType.Ranged)],
    });
    const g2 = makeUpgrade('cap-g2', {
      upgradeSlot: UpgradeSlot.Grenades,
      isGrenade: true,
      weapons: [makeDataWeapon('Grenade B', AttackType.Ranged)],
    });
    mockUpgradeMap.set('cap-g1', g1);
    mockUpgradeMap.set('cap-g2', g2);
    setAttackType(AttackType.Ranged);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('DLT-19')],
      baseMiniatureCount: 1,
      equippedUpgradeIds: ['cap-g1', 'cap-g2'],
      arsenalX: 1,
    });
    const { result } = renderHook(() => useDisplayWeapons());
    const enabled = result.current.weapons.filter((w) => w.count > 0);
    expect(enabled).toHaveLength(1); // cap reduces from 2 to 1
  });

  it('arsenalX=0: no cap applied, both grenades enabled', () => {
    const g1 = makeUpgrade('nocap-g1', {
      upgradeSlot: UpgradeSlot.Grenades,
      isGrenade: true,
      weapons: [makeDataWeapon('Grenade A', AttackType.Ranged)],
    });
    const g2 = makeUpgrade('nocap-g2', {
      upgradeSlot: UpgradeSlot.Grenades,
      isGrenade: true,
      weapons: [makeDataWeapon('Grenade B', AttackType.Ranged)],
    });
    mockUpgradeMap.set('nocap-g1', g1);
    mockUpgradeMap.set('nocap-g2', g2);
    setAttackType(AttackType.Ranged);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('DLT-19')],
      baseMiniatureCount: 1,
      equippedUpgradeIds: ['nocap-g1', 'nocap-g2'],
      arsenalX: 0,
    });
    const { result } = renderHook(() => useDisplayWeapons());
    const enabled = result.current.weapons.filter((w) => w.count > 0);
    expect(enabled).toHaveLength(2); // arsenalX=0 means no cap
  });

  // ── Attack type filter ──────────────────────────────────────────────────

  it('switch to Melee: only melee-compatible weapons shown', () => {
    setAttackType(AttackType.Melee);
    setStoreState({
      unitBaseWeapons: [
        makeDataWeapon('E-11', AttackType.Ranged),
        makeDataWeapon('Lightsaber', AttackType.Melee),
      ],
      baseMiniatureCount: 4,
    });
    const { result } = renderHook(() => useDisplayWeapons());
    expect(result.current.weapons).toHaveLength(1);
    expect(result.current.weapons[0].name).toBe('Lightsaber');
  });

  // ── Count overrides ─────────────────────────────────────────────────────

  it('weaponMiniCounts override replaces default count', () => {
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('A-295')],
      baseMiniatureCount: 4,
      weaponMiniCounts: { 'A-295': 2 },
    });
    const { result } = renderHook(() => useDisplayWeapons());
    expect(result.current.weapons[0].count).toBe(2);
  });

  // ── totalMiniCount ──────────────────────────────────────────────────────

  it('totalMiniCount = baseMiniatureCount + addsMiniature upgrades', () => {
    const hw = makeUpgrade('hw-x', {
      upgradeSlot: UpgradeSlot.HeavyWeapon,
      addsMiniature: 1,
      weapons: [makeDataWeapon('T-21', AttackType.Ranged)],
    });
    mockUpgradeMap.set('hw-x', hw);
    setStoreState({
      unitBaseWeapons: [makeDataWeapon('E-11')],
      baseMiniatureCount: 4,
      equippedUpgradeIds: ['hw-x'],
    });
    const { result } = renderHook(() => useDisplayWeapons());
    expect(result.current.totalMiniCount).toBe(5);
  });
});
