import { describe, it, expect } from 'vitest';
import { AttackType } from '../engine/types';
import { getAttackerPresets } from './presetHelpers';

describe('presetHelpers attacker filtering', () => {
  it('returns only ranged presets when AttackType.Ranged is requested', () => {
    const presets = getAttackerPresets(undefined, AttackType.Ranged);
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.every((preset) => preset.attackType === AttackType.Ranged)).toBe(true);
  });

  it('returns only melee presets when AttackType.Melee is requested', () => {
    const presets = getAttackerPresets(undefined, AttackType.Melee);
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.every((preset) => preset.attackType === AttackType.Melee)).toBe(true);
  });

  it('returns all presets when no attack type filter is provided', () => {
    const allPresets = getAttackerPresets();
    const rangedPresets = getAttackerPresets(undefined, AttackType.Ranged);
    const meleePresets = getAttackerPresets(undefined, AttackType.Melee);

    expect(allPresets.length).toBeGreaterThanOrEqual(rangedPresets.length + meleePresets.length);
  });
});
