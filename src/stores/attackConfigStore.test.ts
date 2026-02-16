import { describe, it, expect, beforeEach } from 'vitest';
import { useAttackConfigStore, selectAttackerConfig } from './attackConfigStore';
import { AttackSurgeChart, MarksmanStrategy, RerollStrategy } from '../engine/types';

describe('attackConfigStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useAttackConfigStore.getState().reset();
  });

  // ── Default Values ──

  it('initializes with one empty weapon', () => {
    const state = useAttackConfigStore.getState();
    expect(state.weapons).toHaveLength(1);
    expect(state.weapons[0].enabled).toBe(true);
    expect(state.weapons[0].redDice).toBe(0);
    expect(state.weapons[0].blackDice).toBe(0);
    expect(state.weapons[0].whiteDice).toBe(0);
  });

  it('initializes with no surge conversion', () => {
    const state = useAttackConfigStore.getState();
    expect(state.surgeChart).toBe(AttackSurgeChart.None);
  });

  it('initializes with zero tokens', () => {
    const state = useAttackConfigStore.getState();
    expect(state.aimTokens).toBe(0);
    expect(state.surgeTokens).toBe(0);
    expect(state.observationTokens).toBe(0);
  });

  it('initializes with all boolean keywords false', () => {
    const state = useAttackConfigStore.getState();
    expect(state.marksman).toBe(false);
    expect(state.jediHunter).toBe(false);
    expect(state.jarKaiMastery).toBe(false);
    expect(state.immuneDeflect).toBe(false);
  });

  it('initializes with default strategies', () => {
    const state = useAttackConfigStore.getState();
    expect(state.marksmanStrategy).toBe(MarksmanStrategy.Deterministic);
    expect(state.rerollStrategy).toBe(RerollStrategy.Conservative);
  });

  it('initializes with no preset selected', () => {
    const state = useAttackConfigStore.getState();
    expect(state.selectedFaction).toBeNull();
    expect(state.selectedPresetId).toBeNull();
  });

  it('initializes in custom mode', () => {
    const state = useAttackConfigStore.getState();
    expect(state.activeMode).toBe('custom');
  });

  // ── setField ──

  it('sets a numeric field', () => {
    useAttackConfigStore.getState().setField('preciseX', 2);
    expect(useAttackConfigStore.getState().preciseX).toBe(2);
  });

  it('sets a boolean field', () => {
    useAttackConfigStore.getState().setField('marksman', true);
    expect(useAttackConfigStore.getState().marksman).toBe(true);
  });

  it('sets an enum field', () => {
    useAttackConfigStore.getState().setField('surgeChart', AttackSurgeChart.ToCrit);
    expect(useAttackConfigStore.getState().surgeChart).toBe(AttackSurgeChart.ToCrit);
  });

  it('preserves other fields when setting one field', () => {
    useAttackConfigStore.getState().setField('preciseX', 2);
    useAttackConfigStore.getState().setField('sharpshooterX', 1);
    const state = useAttackConfigStore.getState();
    expect(state.preciseX).toBe(2);
    expect(state.sharpshooterX).toBe(1);
  });

  // ── Weapon Actions ──

  it('sets weapon dice count', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    expect(useAttackConfigStore.getState().weapons[0].redDice).toBe(6);
  });

  it('sets weapon keyword', () => {
    useAttackConfigStore.getState().setWeaponKeyword(0, 'pierceX', 3);
    expect(useAttackConfigStore.getState().weapons[0].keywords.pierceX).toBe(3);
  });

  it('sets weapon enabled state', () => {
    useAttackConfigStore.getState().setWeaponEnabled(0, false);
    expect(useAttackConfigStore.getState().weapons[0].enabled).toBe(false);
  });

  it('adds a new weapon', () => {
    useAttackConfigStore.getState().addWeapon();
    const state = useAttackConfigStore.getState();
    expect(state.weapons).toHaveLength(2);
    expect(state.weapons[1].redDice).toBe(0);
  });

  it('adds a weapon with initial values', () => {
    useAttackConfigStore.getState().addWeapon({ name: 'Test Weapon', redDice: 4 });
    const state = useAttackConfigStore.getState();
    expect(state.weapons).toHaveLength(2);
    expect(state.weapons[1].name).toBe('Test Weapon');
    expect(state.weapons[1].redDice).toBe(4);
  });

  it('removes a weapon', () => {
    useAttackConfigStore.getState().addWeapon();
    useAttackConfigStore.getState().removeWeapon(1);
    expect(useAttackConfigStore.getState().weapons).toHaveLength(1);
  });

  it('does not remove the last weapon', () => {
    useAttackConfigStore.getState().removeWeapon(0);
    expect(useAttackConfigStore.getState().weapons).toHaveLength(1);
  });

  // ── loadPreset ──

  it('applies preset profile over defaults', () => {
    useAttackConfigStore.getState().loadPreset('test-preset', {
      weapons: [{
        redDice: 6,
        blackDice: 0,
        whiteDice: 0,
        keywords: {
          criticalX: 1,
          lethalX: 0,
          pierceX: 3,
          impactX: 3,
          ramX: 0,
          blast: false,
          suppressive: false,
          highVelocity: false,
          spray: false,
          antiMaterielX: 0,
          antiPersonnelX: 0,
          cumbersome: false,
          sidearmMelee: false,
          sidearmRanged: false,
        },
      }],
      surgeChart: AttackSurgeChart.ToCrit,
      preciseX: 1,
    });

    const state = useAttackConfigStore.getState();
    expect(state.weapons).toHaveLength(1);
    expect(state.weapons[0].redDice).toBe(6);
    expect(state.weapons[0].keywords.pierceX).toBe(3);
    expect(state.surgeChart).toBe(AttackSurgeChart.ToCrit);
    expect(state.preciseX).toBe(1);
    expect(state.selectedPresetId).toBe('test-preset');
  });

  it('resets non-preset fields to defaults when loading preset', () => {
    // First set some custom values
    useAttackConfigStore.getState().setField('aimTokens', 3);
    useAttackConfigStore.getState().setField('marksman', true);

    // Load a preset that doesn't include these fields
    useAttackConfigStore.getState().loadPreset('test-preset', {
      preciseX: 1,
    });

    const state = useAttackConfigStore.getState();
    expect(state.aimTokens).toBe(0); // Reset to default
    expect(state.marksman).toBe(false); // Reset to default
    expect(state.preciseX).toBe(1); // From preset
  });

  // ── reset ──

  it('resets all fields to defaults', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useAttackConfigStore.getState().setField('marksman', true);
    useAttackConfigStore.getState().setField('aimTokens', 3);
    useAttackConfigStore.getState().setSelectedFaction('empire' as any);

    useAttackConfigStore.getState().reset();

    const state = useAttackConfigStore.getState();
    expect(state.weapons[0].redDice).toBe(0);
    expect(state.marksman).toBe(false);
    expect(state.aimTokens).toBe(0);
    expect(state.selectedFaction).toBeNull();
    expect(state.selectedPresetId).toBeNull();
  });

  // ── selectAttackerConfig ──

  it('extracts engine-compatible config without UI fields', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useAttackConfigStore.getState().setField('preciseX', 2);
    useAttackConfigStore.getState().setSelectedFaction('empire' as any);

    const config = selectAttackerConfig(useAttackConfigStore.getState());
    expect(config.weapons[0].redDice).toBe(6);
    expect(config.preciseX).toBe(2);
    expect(config).not.toHaveProperty('selectedFaction');
    expect(config).not.toHaveProperty('selectedPresetId');
    expect(config).not.toHaveProperty('activeMode');
    expect(config).not.toHaveProperty('setField');
    expect(config).not.toHaveProperty('reset');
  });

  it('filters disabled weapons from selected attacker config', () => {
    const state = useAttackConfigStore.getState();
    state.addWeapon({ redDice: 3 });
    state.setWeaponEnabled(0, false);
    state.setWeaponEnabled(1, true);

    const config = selectAttackerConfig(useAttackConfigStore.getState());
    expect(config.weapons).toHaveLength(1);
    expect(config.weapons[0].redDice).toBe(3);
  });

  it('returns an empty fallback weapon when all weapons are disabled', () => {
    useAttackConfigStore.getState().setWeaponEnabled(0, false);

    const config = selectAttackerConfig(useAttackConfigStore.getState());
    expect(config.weapons).toHaveLength(1);
    expect(config.weapons[0].enabled).toBe(true);
    expect(config.weapons[0].redDice).toBe(0);
    expect(config.weapons[0].blackDice).toBe(0);
    expect(config.weapons[0].whiteDice).toBe(0);
  });
});
