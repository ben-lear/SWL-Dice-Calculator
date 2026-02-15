import { create } from 'zustand';
import {
  AttackSurgeChart,
  MarksmanStrategy,
  RerollStrategy,
  WeaponProfile,
  WeaponKeywords,
} from '../engine/types';
import type { Faction, AttackerPresetProfile } from '../data/presets';
import type { UpgradeSlot, WeaponProfile as DataLayerWeaponProfile } from '../data/types';

// ============================================================================
// State Interface
// ============================================================================

export interface AttackConfigState {
  // ── Weapons Array (dice pool + weapon keywords) ──
  weapons: WeaponProfile[];  // In Custom Pool mode: single weapon at index 0
                              // In Unit Builder mode: multiple weapons from preset
  
  // ── Surge Chart (unit-level) ──
  surgeChart: AttackSurgeChart;

  // ── Tokens ──
  aimTokens: number;
  surgeTokens: number;
  observationTokens: number;
  dodgeTokensAttacker: number;

  // ── Unit-Level Keywords (numeric) ──
  preciseX: number;
  sharpshooterX: number;
  arsenalX: number;

  // ── Unit-Level Keywords (boolean) ──
  marksman: boolean;
  marksmanStrategy: MarksmanStrategy;
  rerollStrategy: RerollStrategy;
  jediHunter: boolean;
  jarKaiMastery: boolean;
  duelistAttacker: boolean;
  makashiMastery: boolean;
  immuneDeflect: boolean;
  deathFromAbove: boolean;
  holdTheLine: boolean;

  // ── Points ──
  unitCost: number;

  // ── UI State (not sent to engine) ──
  selectedFaction: Faction | null;
  selectedPresetId: string | null;
  activeMode: 'custom' | 'unit-builder';  // Track which mode is active

  /**
   * Base miniature count for the selected unit (before upgrades).
   * Determines how many weapon entries start in the weapons array.
   * Set by loadPreset from the preset's baseMiniatureCount field.
   * Defaults to 1 for Custom Pool mode.
   */
  baseMiniatureCount: number;

  /**
   * All weapon profiles available on the unit card (ALL attack types).
   * Used by the config selector to pass to applyAttackerUpgrades for
   * per-miniature weapon resolution (base weapon expansion + sidearm fallback).
   * Set by loadPreset from the preset's unitBaseWeapons field.
   * Not used in Custom Pool mode (empty array).
   */
  unitBaseWeapons: DataLayerWeaponProfile[];

  // ── Upgrade System ──
  /** Available upgrade slots for the selected unit (set by loadPreset) */
  upgradeBar: UpgradeSlot[];
  /** Parallel array to upgradeBar: ID of equipped upgrade in each slot, or null */
  equippedUpgradeIds: (string | null)[];

  // ── Actions ──
  setField: <K extends keyof AttackConfigFields>(
    field: K,
    value: AttackConfigFields[K]
  ) => void;
  
  // Weapon mutation actions
  setWeaponDice: (weaponIndex: number, color: 'red' | 'black' | 'white', count: number) => void;
  setWeaponKeyword: (weaponIndex: number, keyword: keyof WeaponKeywords, value: number | boolean) => void;
  addWeapon: (weapon?: Partial<WeaponProfile>) => void;
  removeWeapon: (weaponIndex: number) => void;
  
  setSelectedFaction: (faction: Faction | null) => void;
  setActiveMode: (mode: 'custom' | 'unit-builder') => void;
  loadPreset: (
    presetId: string,
    profile: AttackerPresetProfile,
    upgradeBar?: UpgradeSlot[]
  ) => void;
  /** Equip an upgrade in a specific slot (by index in upgradeBar) */
  equipUpgrade: (slotIndex: number, upgradeId: string | null) => void;
  reset: () => void;
}

/**
 * All settable fields (excludes actions and UI-only state).
 * Used for type-safe generic setter.
 */
type AttackConfigFields = Omit<
  AttackConfigState,
  | 'setField'
  | 'setWeaponDice'
  | 'setWeaponKeyword'
  | 'addWeapon'
  | 'removeWeapon'
  | 'setSelectedFaction'
  | 'setActiveMode'
  | 'loadPreset'
  | 'reset'
  | 'selectedFaction'
  | 'selectedPresetId'
  | 'activeMode'
  | 'baseMiniatureCount'
  | 'unitBaseWeapons'
  | 'upgradeBar'
  | 'equippedUpgradeIds'
  | 'equipUpgrade'
>;

// ============================================================================
// Default Values
// ============================================================================

/** Helper: create an empty weapon profile */
function createEmptyWeapon(): WeaponProfile {
  return {
    redDice: 0,
    blackDice: 0,
    whiteDice: 0,
    keywords: {
      criticalX: 0,
      lethalX: 0,
      pierceX: 0,
      impactX: 0,
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
  };
}

const DEFAULT_ATTACK_CONFIG: AttackConfigFields = {
  // Weapons array: starts with one empty weapon for Custom Pool mode
  weapons: [createEmptyWeapon()],
  
  // Surge chart
  surgeChart: AttackSurgeChart.None,

  // Tokens
  aimTokens: 0,
  surgeTokens: 0,
  observationTokens: 0,
  dodgeTokensAttacker: 0,

  // Unit-level keywords (numeric)
  preciseX: 0,
  sharpshooterX: 0,
  arsenalX: 0,

  // Unit-level keywords (boolean)
  marksman: false,
  marksmanStrategy: MarksmanStrategy.Deterministic,
  rerollStrategy: RerollStrategy.Conservative,
  jediHunter: false,
  jarKaiMastery: false,
  duelistAttacker: false,
  makashiMastery: false,
  immuneDeflect: false,
  deathFromAbove: false,
  holdTheLine: false,

  // Points
  unitCost: 0,
};

// ============================================================================
// Store
// ============================================================================

export const useAttackConfigStore = create<AttackConfigState>((set) => ({
  // Spread defaults as initial state
  ...DEFAULT_ATTACK_CONFIG,

  // UI state
  selectedFaction: null,
  selectedPresetId: null,
  activeMode: 'custom',  // Default to Custom Pool mode
  baseMiniatureCount: 1,    // ← NEW: default for Custom Pool
  unitBaseWeapons: [],      // ← NEW: empty in Custom Pool mode

  // Upgrade system
  upgradeBar: [],
  equippedUpgradeIds: [],

  // Generic setter for any unit-level field
  setField: (field, value) =>
    set((state) => ({
      ...state,
      [field]: value,
    })),

  // Weapon mutation actions
  setWeaponDice: (weaponIndex, color, count) =>
    set((state) => {
      const weapons = [...state.weapons];
      weapons[weaponIndex] = { ...weapons[weaponIndex], [`${color}Dice`]: count };
      return { weapons };
    }),

  setWeaponKeyword: (weaponIndex, keyword, value) =>
    set((state) => {
      const weapons = [...state.weapons];
      weapons[weaponIndex] = {
        ...weapons[weaponIndex],
        keywords: { ...weapons[weaponIndex].keywords, [keyword]: value },
      };
      return { weapons };
    }),

  addWeapon: (weapon) =>
    set((state) => ({
      weapons: [...state.weapons, { ...createEmptyWeapon(), ...weapon }],
    })),

  removeWeapon: (weaponIndex) =>
    set((state) => {
      if (state.weapons.length <= 1) return state; // Don't remove the last weapon
      return { weapons: state.weapons.filter((_, i) => i !== weaponIndex) };
    }),

  // Setter for faction dropdown (UI-only state)
  setSelectedFaction: (faction) =>
    set({ selectedFaction: faction }),

  // Setter for mode toggle
  setActiveMode: (mode) =>
    set({ activeMode: mode }),

  // Load a preset: reset to defaults, then apply preset overrides
  loadPreset: (presetId, profile, upgradeBar = []) =>
    set(() => ({
      ...DEFAULT_ATTACK_CONFIG,
      ...profile,
      baseMiniatureCount: profile.baseMiniatureCount ?? 1,  // ← NEW
      unitBaseWeapons: profile.unitBaseWeapons ?? [],        // ← NEW
      selectedPresetId: presetId,
      upgradeBar,
      equippedUpgradeIds: new Array(upgradeBar.length).fill(null),
    })),

  // Equip an upgrade in a specific slot (by index in upgradeBar)
  equipUpgrade: (slotIndex, upgradeId) =>
    set((state) => {
      if (slotIndex < 0 || slotIndex >= state.equippedUpgradeIds.length) return state;
      const newIds = [...state.equippedUpgradeIds];
      newIds[slotIndex] = upgradeId;
      return { equippedUpgradeIds: newIds };
    }),

  // Full reset to defaults
  reset: () =>
    set(() => ({
      ...DEFAULT_ATTACK_CONFIG,
      selectedFaction: null,
      selectedPresetId: null,
      activeMode: 'custom',
      baseMiniatureCount: 1,
      unitBaseWeapons: [],
      upgradeBar: [],
      equippedUpgradeIds: [],
    })),
}));

/**
 * Selector: extract the engine-compatible AttackerConfig from the store.
 * Excludes UI-only fields (selectedFaction, selectedPresetId, activeMode).
 * Excludes action functions.
 */
export function selectAttackerConfig(state: AttackConfigState) {
  const {
    selectedFaction,
    selectedPresetId,
    activeMode,
    baseMiniatureCount,      // ← NEW: exclude from engine config
    unitBaseWeapons,          // ← NEW: exclude (passed separately)
    upgradeBar,
    equippedUpgradeIds,
    setField,
    setWeaponDice,
    setWeaponKeyword,
    addWeapon,
    removeWeapon,
    setSelectedFaction,
    setActiveMode,
    loadPreset,
    reset,
    equipUpgrade,
    ...config
  } = state;
  return config;
}
