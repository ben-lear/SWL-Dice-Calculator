import { describe, it, expect, beforeEach } from 'vitest';
import { useAttackTypeStore } from './attackTypeStore';
import { AttackType } from '../engine/types';

describe('attackTypeStore', () => {
  beforeEach(() => {
    useAttackTypeStore.getState().reset();
  });

  it('initializes with AttackType.Ranged', () => {
    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.Ranged);
  });

  it('sets attack type', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.Melee);
  });

  it('sets attack type to overrun', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Overrun);
    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.Overrun);
  });

  it('resets to Ranged', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    useAttackTypeStore.getState().reset();
    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.Ranged);
  });
});
