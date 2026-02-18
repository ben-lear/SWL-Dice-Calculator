import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  useAttackerKeywordDisabled,
  useWeaponKeywordDisabled,
  useDefenderKeywordDisabled,
} from './useKeywordDisabled';
import { useAttackTypeStore } from '../stores/attackTypeStore';
import { AttackType } from '../engine/types';

describe('useAttackerKeywordDisabled', () => {
  beforeEach(() => {
    useAttackTypeStore.getState().reset(); // defaults to Ranged
  });

  it('enables ranged unit-level keywords for default (Ranged)', () => {
    const { result } = renderHook(() => useAttackerKeywordDisabled());
    expect(result.current('sharpshooterX')).toBe(false);
    expect(result.current('marksman')).toBe(false);
  });

  it('disables melee-only keywords for Ranged', () => {
    const { result } = renderHook(() => useAttackerKeywordDisabled());
    expect(result.current('duelistAttacker')).toBe(true);
    expect(result.current('makashiMastery')).toBe(true);
    expect(result.current('jarKaiMastery')).toBe(true);
    expect(result.current('holdTheLine')).toBe(true);
  });

  it('disables ranged-only unit keywords for Melee', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useAttackerKeywordDisabled());
    expect(result.current('sharpshooterX')).toBe(true);
    expect(result.current('deathFromAbove')).toBe(true);
  });

  it('enables melee-only keywords for Melee', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useAttackerKeywordDisabled());
    expect(result.current('duelistAttacker')).toBe(false);
    expect(result.current('makashiMastery')).toBe(false);
    expect(result.current('jarKaiMastery')).toBe(false);
  });

  it('enables all unit keywords for Hybrid', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Hybrid);
    const { result } = renderHook(() => useAttackerKeywordDisabled());
    expect(result.current('sharpshooterX')).toBe(false);
    expect(result.current('duelistAttacker')).toBe(false);
    expect(result.current('marksman')).toBe(false);
  });

  it('returns false for unknown fields', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useAttackerKeywordDisabled());
    expect(result.current('nonExistentField')).toBe(false);
  });

  it('disables all restricted keywords for Overrun', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Overrun);
    const { result } = renderHook(() => useAttackerKeywordDisabled());
    expect(result.current('sharpshooterX')).toBe(true);
    expect(result.current('duelistAttacker')).toBe(true);
    expect(result.current('holdTheLine')).toBe(true);
    // Unrestricted remain enabled
    expect(result.current('marksman')).toBe(false);
    expect(result.current('preciseX')).toBe(false);
  });
});

describe('useWeaponKeywordDisabled', () => {
  beforeEach(() => {
    useAttackTypeStore.getState().reset();
  });

  it('disables ranged-only weapon keywords for Melee', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useWeaponKeywordDisabled());
    expect(result.current('highVelocity')).toBe(true);
  });

  it('keeps unrestricted weapon keywords enabled for any type', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useWeaponKeywordDisabled());
    expect(result.current('pierceX')).toBe(false);
    expect(result.current('blast')).toBe(false);
    expect(result.current('criticalX')).toBe(false);
  });

  it('enables highVelocity for Ranged', () => {
    const { result } = renderHook(() => useWeaponKeywordDisabled());
    expect(result.current('highVelocity')).toBe(false);
  });
});

describe('useDefenderKeywordDisabled', () => {
  beforeEach(() => {
    useAttackTypeStore.getState().reset();
  });

  it('disables ranged-only defender keywords for Melee', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useDefenderKeywordDisabled());
    expect(result.current('deflect')).toBe(true);
    expect(result.current('soresuMastery')).toBe(true);
    expect(result.current('backup')).toBe(true);
    expect(result.current('coverType')).toBe(true);
    expect(result.current('guardianX')).toBe(true);
    expect(result.current('shieldedX')).toBe(true);
    expect(result.current('lowProfile')).toBe(true);
    expect(result.current('dugIn')).toBe(true);
  });

  it('disables melee-only defender keywords for Ranged', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Ranged);
    const { result } = renderHook(() => useDefenderKeywordDisabled());
    expect(result.current('djemSoMastery')).toBe(true);
    expect(result.current('duelistDefender')).toBe(true);
    expect(result.current('immuneMeleePierce')).toBe(true);
  });

  it('keeps unrestricted keywords enabled for any attack type', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Overrun);
    const { result } = renderHook(() => useDefenderKeywordDisabled());
    expect(result.current('armorX')).toBe(false);
    expect(result.current('immunePierce')).toBe(false);
    expect(result.current('dangerSenseX')).toBe(false);
    expect(result.current('dodgeTokens')).toBe(false);
  });

  it('disables ranged-melee keywords for Overrun', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Overrun);
    const { result } = renderHook(() => useDefenderKeywordDisabled());
    expect(result.current('holdTheLine')).toBe(true);
  });

  it('enables ranged-melee keywords for Melee', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useDefenderKeywordDisabled());
    expect(result.current('holdTheLine')).toBe(false);
  });
});
