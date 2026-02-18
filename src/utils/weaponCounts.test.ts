/**
 * Tests for rebuildWeaponsFromCounts utility.
 * Phase 10F-2
 */

import { describe, it, expect } from 'vitest';
import { rebuildWeaponsFromCounts } from './weaponCounts';
import type { WeaponProfile } from '../engine/types';

// ============================================================================
// Test Helpers
// ============================================================================

function makeWeapon(name: string, redDice = 0, blackDice = 0, whiteDice = 0): WeaponProfile {
  return {
    name,
    redDice,
    blackDice,
    whiteDice,
    keywords: {
      criticalX: 0,
      lethalX: 0,
      pierceX: 0,
      impactX: 0,
      ramX: 0,
      blast: false,
      suppressive: false,
      highVelocity: false,
      ionX: 0,
      spray: false,
      antiMaterielX: 0,
      antiPersonnelX: 0,
      cumbersome: false,
      sidearmMelee: false,
      sidearmRanged: false,
      immuneDeflect: false,
      primitive: false,
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('rebuildWeaponsFromCounts', () => {
  it('returns defaultWeapons unchanged when overrides is empty', () => {
    const defaults = [makeWeapon('A-295'), makeWeapon('A-295'), makeWeapon('A-295')];
    const result = rebuildWeaponsFromCounts(defaults, {}, []);
    expect(result).toBe(defaults); // identity check — same reference
  });

  it('reduces weapon count via override (4 → 2)', () => {
    const defaults = [
      makeWeapon('E-11'),
      makeWeapon('E-11'),
      makeWeapon('E-11'),
      makeWeapon('E-11'),
    ];
    const result = rebuildWeaponsFromCounts(defaults, { 'E-11': 2 }, defaults);
    expect(result).toHaveLength(2);
    expect(result.every((w) => w.name === 'E-11')).toBe(true);
  });

  it('increases weapon count via override (0 → 2) using allAvailableWeapons template', () => {
    const template = makeWeapon('Grenade', 2, 0, 0);
    const defaults = [makeWeapon('E-11'), makeWeapon('E-11')];
    const result = rebuildWeaponsFromCounts(
      defaults,
      { 'Grenade': 2 },
      [makeWeapon('E-11'), template],
    );
    // Should include 2 E-11 (original default) + 2 Grenade (override)
    expect(result.filter((w) => w.name === 'Grenade')).toHaveLength(2);
    expect(result.filter((w) => w.name === 'E-11')).toHaveLength(2);
  });

  it('excludes a weapon when override sets count to 0', () => {
    const defaults = [makeWeapon('E-11'), makeWeapon('E-11'), makeWeapon('DLT-19')];
    const result = rebuildWeaponsFromCounts(defaults, { 'DLT-19': 0 }, defaults);
    expect(result.some((w) => w.name === 'DLT-19')).toBe(false);
    expect(result.filter((w) => w.name === 'E-11')).toHaveLength(2);
  });

  it('handles multiple weapons with mixed overrides', () => {
    const defaults = [
      makeWeapon('A'),
      makeWeapon('A'),
      makeWeapon('B'),
      makeWeapon('B'),
      makeWeapon('C'),
    ];
    const result = rebuildWeaponsFromCounts(
      defaults,
      { 'A': 1, 'B': 3, 'C': 0 },
      defaults,
    );
    expect(result.filter((w) => w.name === 'A')).toHaveLength(1);
    expect(result.filter((w) => w.name === 'B')).toHaveLength(3);
    expect(result.filter((w) => w.name === 'C')).toHaveLength(0);
  });

  it('deep-copies weapon profiles to avoid shared keyword objects', () => {
    const defaults = [makeWeapon('E-11')];
    const result = rebuildWeaponsFromCounts(defaults, { 'E-11': 1 }, defaults);
    expect(result[0]).not.toBe(defaults[0]);
    expect(result[0].keywords).not.toBe(defaults[0].keywords);
  });
});
