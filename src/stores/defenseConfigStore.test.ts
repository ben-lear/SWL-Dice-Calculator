import { describe, it, expect, beforeEach } from 'vitest';
import { useDefenseConfigStore, selectDefenderConfig } from './defenseConfigStore';
import { DefenseDieColor, DefenseSurgeChart, CoverType } from '../engine/types';

describe('defenseConfigStore', () => {
  beforeEach(() => {
    useDefenseConfigStore.getState().resetDefenderConfig();
  });

  // ── Default Values ──

  it('initializes with white defense die', () => {
    expect(useDefenseConfigStore.getState().dieColor).toBe(DefenseDieColor.White);
  });

  it('initializes with no cover', () => {
    expect(useDefenseConfigStore.getState().coverType).toBe(CoverType.None);
  });

  it('initializes with minis in LOS = 1', () => {
    expect(useDefenseConfigStore.getState().minisInLOS).toBe(1);
  });

  it('initializes with no guardian', () => {
    const state = useDefenseConfigStore.getState();
    expect(state.guardianX).toBe(0);
    expect(state.guardianDieColor).toBe(DefenseDieColor.White);
  });

  it('initializes with custom mode', () => {
    expect(useDefenseConfigStore.getState().activeDefenderMode).toBe('custom');
  });

  it('initializes with defense dice enabled', () => {
    expect(useDefenseConfigStore.getState().disableDefenseDice).toBe(false);
  });

  // ── setField ──

  it('sets defense die color', () => {
    useDefenseConfigStore.getState().setField('dieColor', DefenseDieColor.Red);
    expect(useDefenseConfigStore.getState().dieColor).toBe(DefenseDieColor.Red);
  });

  it('sets cover type', () => {
    useDefenseConfigStore.getState().setField('coverType', CoverType.Heavy);
    expect(useDefenseConfigStore.getState().coverType).toBe(CoverType.Heavy);
  });

  it('sets boolean keyword', () => {
    useDefenseConfigStore.getState().setField('deflect', true);
    expect(useDefenseConfigStore.getState().deflect).toBe(true);
  });

  it('sets numeric keyword', () => {
    useDefenseConfigStore.getState().setField('armorX', 2);
    expect(useDefenseConfigStore.getState().armorX).toBe(2);
  });

  it('sets disableDefenseDice flag', () => {
    useDefenseConfigStore.getState().setField('disableDefenseDice', true);
    expect(useDefenseConfigStore.getState().disableDefenseDice).toBe(true);
  });

  // ── Mode Actions (Phase 2.6) ──

  it('sets defender mode', () => {
    const { setDefenderMode } = useDefenseConfigStore.getState();
    setDefenderMode('unit-builder');
    expect(useDefenseConfigStore.getState().activeDefenderMode).toBe('unit-builder');
  });

  it('sets defender faction', () => {
    const { setDefenderFaction } = useDefenseConfigStore.getState();
    setDefenderFaction('GalacticEmpire');
    expect(useDefenseConfigStore.getState().selectedDefenderFaction).toBe('GalacticEmpire');
  });

  // ── loadDefenderPreset (Phase 2.6) ──

  it('loads defender preset with basic config', () => {
    const mockConfig = {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      minisInLOS: 4,
      unitCost: 44,
    };

    const { loadDefenderPreset } = useDefenseConfigStore.getState();
    loadDefenderPreset('test-preset', mockConfig);

    const state = useDefenseConfigStore.getState();
    expect(state.selectedDefenderPresetId).toBe('test-preset');
    expect(state.dieColor).toBe(DefenseDieColor.Red);
    expect(state.surgeChart).toBe(DefenseSurgeChart.None);
    expect(state.minisInLOS).toBe(4);
    expect(state.unitCost).toBe(44);
  });

  it('loads defender preset with keywords', () => {
    const mockConfig = {
      armorX: 2,
      deflect: true,
      immunePierce: true,
      unitCost: 195,
    };

    const { loadDefenderPreset } = useDefenseConfigStore.getState();
    loadDefenderPreset('darth-vader', mockConfig);

    const state = useDefenseConfigStore.getState();
    expect(state.armorX).toBe(2);
    expect(state.deflect).toBe(true);
    expect(state.immunePierce).toBe(true);
  });

  it('resets situational fields when loading preset', () => {
    // Set some situational fields
    const { setField, loadDefenderPreset } = useDefenseConfigStore.getState();
    setField('dodgeTokens', 3);
    setField('coverType', CoverType.Heavy);
    setField('guardianX', 2);

    // Load preset
    loadDefenderPreset('test-preset', { unitCost: 50 });

    const state = useDefenseConfigStore.getState();
    expect(state.dodgeTokens).toBe(0);
    expect(state.coverType).toBe(CoverType.None);
    expect(state.guardianX).toBe(0);
  });

  // ── reset ──

  it('resets all fields to defaults', () => {
    useDefenseConfigStore.getState().setField('dieColor', DefenseDieColor.Red);
    useDefenseConfigStore.getState().setField('armorX', 5);
    useDefenseConfigStore.getState().setDefenderMode('unit-builder');
    useDefenseConfigStore.getState().setField('disableDefenseDice', true);
    useDefenseConfigStore.getState().resetDefenderConfig();

    const state = useDefenseConfigStore.getState();
    expect(state.dieColor).toBe(DefenseDieColor.White);
    expect(state.armorX).toBe(0);
    expect(state.activeDefenderMode).toBe('custom');
    expect(state.disableDefenseDice).toBe(false);
    expect(state.selectedDefenderPresetId).toBe(null);
  });

  // ── selectDefenderConfig ──

  it('extracts engine-compatible config without UI fields', () => {
    const config = selectDefenderConfig(useDefenseConfigStore.getState());

    expect(config).toHaveProperty('dieColor');
    expect(config).toHaveProperty('minisInLOS');
    expect(config).toHaveProperty('disableDefenseDice');
    expect(config).not.toHaveProperty('activeDefenderMode');
    expect(config).not.toHaveProperty('selectedDefenderFaction');
    expect(config).not.toHaveProperty('selectedDefenderPresetId');
    expect(config).not.toHaveProperty('setField');
  });

  it('includes optional disableDefenseDice field when true', () => {
    useDefenseConfigStore.getState().setField('disableDefenseDice', true);
    const config = selectDefenderConfig(useDefenseConfigStore.getState());

    expect(config.disableDefenseDice).toBe(true);
  });
});
