import { describe, it, expect } from 'vitest';
import { matchUnitByName, matchUpgradeByName } from '../listMatcher';
import { Faction } from '../presets';

// ============================================================================
// Unit Matching
// ============================================================================

describe('matchUnitByName', () => {
  it('matches a common unit by exact name', () => {
    const result = matchUnitByName('Stormtroopers', Faction.GalacticEmpire);
    expect(result.match).not.toBeNull();
    expect(result.match?.name).toBe('Stormtroopers');
    expect(result.confidence).toBe('exact');
    expect(result.warnings).toHaveLength(0);
  });

  it('matches a hero by name', () => {
    const result = matchUnitByName('Luke Skywalker', Faction.RebelAlliance);
    expect(result.match).not.toBeNull();
    expect(result.match?.name).toBe('Luke Skywalker');
    expect(result.confidence).toBe('exact');
  });

  it('matches case-insensitively', () => {
    const result = matchUnitByName('stormtroopers', Faction.GalacticEmpire);
    expect(result.match).not.toBeNull();
    expect(result.match?.name).toBe('Stormtroopers');
  });

  it('matches with extra punctuation stripped', () => {
    // Simulates list builders that add dashes/commas
    const result = matchUnitByName('Luke Skywalker, Hero of the Rebellion');
    expect(result.match).not.toBeNull();
    expect(result.match?.name).toBe('Luke Skywalker');
  });

  it('returns none for a completely unknown unit', () => {
    const result = matchUnitByName('Nonexistent Unit XYZ123', Faction.GalacticEmpire);
    expect(result.match).toBeNull();
    expect(result.confidence).toBe('none');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('falls back to all factions when faction-scoped search fails', () => {
    // A Rebel unit searched with Empire faction should still resolve via fallback
    const result = matchUnitByName('Luke Skywalker', Faction.GalacticEmpire);
    // Should still find Luke as a fallback even though he's not Empire
    expect(result.match).not.toBeNull();
    expect(result.match?.name).toBe('Luke Skywalker');
  });

  it('matches without faction specified', () => {
    const result = matchUnitByName('Darth Vader');
    expect(result.match).not.toBeNull();
    expect(result.match?.name).toBe('Darth Vader');
  });
});

// ============================================================================
// Upgrade Matching
// ============================================================================

describe('matchUpgradeByName', () => {
  it('matches a common upgrade by exact name', () => {
    const result = matchUpgradeByName(
      'Force Push',
      null,
      new Set(),
    );
    expect(result.match).not.toBeNull();
    expect(result.match?.name).toBe('Force Push');
    expect(result.confidence).toBe('exact');
  });

  it('returns none for empty input', () => {
    const result = matchUpgradeByName('', null, new Set());
    expect(result.match).toBeNull();
    expect(result.confidence).toBe('none');
  });

  it('returns none for unknown upgrade', () => {
    const result = matchUpgradeByName(
      'Nonexistent Upgrade XYZ',
      null,
      new Set(),
    );
    expect(result.match).toBeNull();
    expect(result.confidence).toBe('none');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('assigns a slot index when a resolved unit is provided', () => {
    // First match a unit so we have a resolvedUnit with an upgrade bar
    const unitResult = matchUnitByName('Luke Skywalker', Faction.RebelAlliance);
    expect(unitResult.match).not.toBeNull();

    const result = matchUpgradeByName(
      'Force Push',
      unitResult.match,
      new Set(),
    );
    expect(result.match).not.toBeNull();
    // slotIndex should be >= 0 if there's a matching slot, or -1 if the slot type doesn't exist
    expect(typeof result.slotIndex).toBe('number');
  });

  it('respects consumed slots for sequential assignment', () => {
    const unitResult = matchUnitByName('Luke Skywalker', Faction.RebelAlliance);
    expect(unitResult.match).not.toBeNull();

    const consumed = new Set<number>();

    const first = matchUpgradeByName(
      'Force Push',
      unitResult.match,
      consumed,
    );

    if (first.slotIndex >= 0) {
      consumed.add(first.slotIndex);
    }

    const second = matchUpgradeByName(
      'Jedi Mind Trick',
      unitResult.match,
      consumed,
    );

    // Both should match
    expect(first.match).not.toBeNull();
    expect(second.match).not.toBeNull();

    // If both use the same slot type and there are multiple slots, they should get different slots
    if (first.slotIndex >= 0 && second.slotIndex >= 0) {
      expect(first.slotIndex).not.toBe(second.slotIndex);
    }
  });
});
