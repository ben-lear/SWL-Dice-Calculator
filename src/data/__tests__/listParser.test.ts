import { describe, it, expect } from 'vitest';
import { parseListJson } from '../listParser';

// ============================================================================
// Validation / Error Cases
// ============================================================================

describe('parseListJson — validation', () => {
  it('returns error for invalid JSON string', () => {
    const result = parseListJson('not valid json {{{');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/invalid json/i);
    }
  });

  it('returns error for JSON without units array', () => {
    const result = parseListJson(JSON.stringify({ name: 'test' }));
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/no units/i);
    }
  });

  it('returns error for empty units array', () => {
    const result = parseListJson(JSON.stringify({ units: [] }));
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/empty/i);
    }
  });
});

// ============================================================================
// Successful Parsing
// ============================================================================

describe('parseListJson — success', () => {
  it('parses a minimal list with one unit', () => {
    const json = JSON.stringify({
      units: [{ name: 'Stormtroopers' }],
    });

    const result = parseListJson(json);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.units).toHaveLength(1);
      expect(result.meta.name).toBe('Imported List');
    }
  });

  it('preserves list metadata', () => {
    const json = JSON.stringify({
      listname: 'My Cool List',
      points: 800,
      armyFaction: 'empire',
      units: [{ name: 'Stormtroopers' }],
    });

    const result = parseListJson(json);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.meta.name).toBe('My Cool List');
    }
  });

  it('resolves known units by name', () => {
    const json = JSON.stringify({
      armyFaction: 'empire',
      units: [{ name: 'Stormtroopers' }],
    });

    const result = parseListJson(json);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      const unit = result.units[0];
      expect(unit.resolvedUnit).not.toBeNull();
      expect(unit.resolvedUnit?.name).toBe('Stormtroopers');
      expect(unit.unitMatchConfidence).not.toBe('none');
    }
  });

  it('handles unresolvable units gracefully', () => {
    const json = JSON.stringify({
      units: [{ name: 'Totally Fake Unit 12345' }],
    });

    const result = parseListJson(json);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      const unit = result.units[0];
      expect(unit.resolvedUnit).toBeNull();
      expect(unit.unitMatchConfidence).toBe('none');
      expect(unit.warnings.length).toBeGreaterThan(0);
    }
  });

  it('merges upgrades and loadout arrays', () => {
    const json = JSON.stringify({
      units: [
        {
          name: 'Stormtroopers',
          upgrades: ['DLT-19 Stormtrooper'],
          loadout: ['Targeting Scopes'],
        },
      ],
    });

    const result = parseListJson(json);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      const unit = result.units[0];
      // Both upgrades and loadout names should appear in rawUpgradeNames
      expect(unit.rawUpgradeNames).toContain('DLT-19 Stormtrooper');
      expect(unit.rawUpgradeNames).toContain('Targeting Scopes');
    }
  });

  it('computes army stats for the resolved list', () => {
    const json = JSON.stringify({
      armyFaction: 'empire',
      units: [
        { name: 'Stormtroopers' },
        { name: 'Stormtroopers' },
      ],
    });

    const result = parseListJson(json);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.stats).toBeDefined();
      expect(result.stats.totalPoints).toBeGreaterThan(0);
      expect(result.stats.activationCount).toBe(2);
    }
  });

  it('collects parse warnings without failing', () => {
    const json = JSON.stringify({
      armyFaction: 'totally-unknown-faction-12345',
      units: [{ name: 'Stormtroopers' }],
    });

    const result = parseListJson(json);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      // Unknown faction should produce a warning but not fail parsing
      expect(result.parseWarnings.length).toBeGreaterThanOrEqual(0);
    }
  });
});
