import { create } from 'zustand';
import { AttackType } from '../engine/types';

// ============================================================================
// State Interface
// ============================================================================

export interface AttackTypeState {
  attackType: AttackType;
  setAttackType: (type: AttackType) => void;
  reset: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useAttackTypeStore = create<AttackTypeState>((set) => ({
  attackType: AttackType.Ranged,

  setAttackType: (type) => set({ attackType: type }),

  reset: () => set({ attackType: AttackType.Ranged }),
}));
