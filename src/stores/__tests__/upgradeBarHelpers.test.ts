/**
 * Tests for recomputeEffectiveUpgradeBar helper.
 *
 * Phase 12: Dynamic Upgrade Slots
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recomputeEffectiveUpgradeBar } from '../upgradeBarHelpers';
import { UpgradeSlot } from '../../data/types';
import type { ResolvedUpgrade } from '../../data/types';

// ── Mocking upgradeResolver ────────────────────────────────────────────────
// We mock getResolvedUpgradeById to avoid loading the full processed data
// in these pure helper tests.

vi.mock('../../data/upgradeResolver', () => ({
  getResolvedUpgradeById: (id: string) => MOCK_UPGRADES[id] ?? undefined,
}));

/** Minimal ResolvedUpgrade factory */
function makeUpgrade(
  id: string,
  addsUpgradeSlot: UpgradeSlot[] = [],
): ResolvedUpgrade {
  return {
    id,
    apiId: 0,
    name: id,
    cost: 10,
    upgradeSlot: UpgradeSlot.Personnel,
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
    addsUpgradeSlot,
    requiredUpgradeSlot: null,
    isEnriched: false,
  };
}

/** Mocked registry of upgrades by ID */
const MOCK_UPGRADES: Record<string, ResolvedUpgrade> = {
  'plain-upgrade': makeUpgrade('plain-upgrade'),
  'adds-training': makeUpgrade('adds-training', [UpgradeSlot.Training]),
  'adds-two-slots': makeUpgrade('adds-two-slots', [UpgradeSlot.Command, UpgradeSlot.Training]),
  'adds-gear': makeUpgrade('adds-gear', [UpgradeSlot.Gear]),
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('recomputeEffectiveUpgradeBar', () => {
  const baseBar: UpgradeSlot[] = [UpgradeSlot.Personnel, UpgradeSlot.Gear];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no equipped upgrades → effective bar equals base bar', () => {
    const result = recomputeEffectiveUpgradeBar(baseBar, [null, null]);
    expect(result.effectiveUpgradeBar).toEqual(baseBar);
    expect(result.equippedUpgradeIds).toEqual([null, null]);
    expect(result.removedUpgradeIds).toEqual([]);
  });

  it('equipping a plain upgrade (no addsUpgradeSlot) does not extend bar', () => {
    const result = recomputeEffectiveUpgradeBar(baseBar, ['plain-upgrade', null]);
    expect(result.effectiveUpgradeBar).toEqual(baseBar);
    expect(result.equippedUpgradeIds).toEqual(['plain-upgrade', null]);
    expect(result.removedUpgradeIds).toEqual([]);
  });

  it('equipping an upgrade with addsUpgradeSlot extends bar', () => {
    const result = recomputeEffectiveUpgradeBar(baseBar, ['adds-training', null]);
    expect(result.effectiveUpgradeBar).toEqual([
      UpgradeSlot.Personnel,
      UpgradeSlot.Gear,
      UpgradeSlot.Training,
    ]);
    expect(result.equippedUpgradeIds).toEqual(['adds-training', null, null]);
    expect(result.removedUpgradeIds).toEqual([]);
  });

  it('upgrade adding two slots appends both', () => {
    const result = recomputeEffectiveUpgradeBar(baseBar, ['adds-two-slots', null]);
    expect(result.effectiveUpgradeBar).toEqual([
      UpgradeSlot.Personnel,
      UpgradeSlot.Gear,
      UpgradeSlot.Command,
      UpgradeSlot.Training,
    ]);
    expect(result.equippedUpgradeIds).toHaveLength(4);
    expect(result.removedUpgradeIds).toEqual([]);
  });

  it('carries over previously-equipped ID in dynamic slot', () => {
    // Simulate: adds-training was equipped in slot 0, and 'adds-gear' is equipped in the dynamic slot
    const result = recomputeEffectiveUpgradeBar(
      baseBar,
      ['adds-training', null, 'adds-gear'], // index 2 = dynamic training slot
    );
    expect(result.effectiveUpgradeBar[2]).toBe(UpgradeSlot.Training);
    expect(result.equippedUpgradeIds[2]).toBe('adds-gear');
    expect(result.removedUpgradeIds).toEqual([]);
  });

  it('cascading unequip: removing parent removes dynamic slot contents', () => {
    // Old state had adds-training in slot 0 AND adds-gear in dynamic slot (index 2).
    // Now slot 0 is cleared — dynamic slot disappears.
    const result = recomputeEffectiveUpgradeBar(
      baseBar,
      [null, null, 'adds-gear'], // index 2 no longer valid (slot 0 cleared)
    );
    expect(result.effectiveUpgradeBar).toEqual(baseBar);
    expect(result.equippedUpgradeIds).toEqual([null, null]);
    expect(result.removedUpgradeIds).toContain('adds-gear');
  });

  it('equippedIds shorter than baseBar → padded with null', () => {
    const result = recomputeEffectiveUpgradeBar(baseBar, []);
    expect(result.effectiveUpgradeBar).toEqual(baseBar);
    expect(result.equippedUpgradeIds).toEqual([null, null]);
    expect(result.removedUpgradeIds).toEqual([]);
  });

  it('empty baseBar → empty effective bar regardless of equipped IDs', () => {
    const result = recomputeEffectiveUpgradeBar([], ['adds-training', null]);
    expect(result.effectiveUpgradeBar).toEqual([]);
    expect(result.equippedUpgradeIds).toEqual([]);
    expect(result.removedUpgradeIds).toContain('adds-training');
  });

  it('IDs that were beyond old effective bar length are reported as removed', () => {
    // base bar has 1 slot; equippedIds has 3 orphaned (no parent added them)
    const result = recomputeEffectiveUpgradeBar(
      [UpgradeSlot.Personnel],
      [null, 'plain-upgrade', 'adds-training'],
    );
    expect(result.removedUpgradeIds).toContain('plain-upgrade');
    expect(result.removedUpgradeIds).toContain('adds-training');
  });
});
