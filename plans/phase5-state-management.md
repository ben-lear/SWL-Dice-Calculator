# Phase 5: State Management — Implementation Plan

## Goal

Build centralized state management using Zustand stores that hold all attacker, defender, attack type, and simulation result state. Create a preset data system that lets users quickly load pre-configured unit profiles. The stores bridge the UI (Phase 6) and the engine (Phase 2) by exposing typed state + actions for the UI and a `getFullConfig()` selector that produces the engine's `AttackConfig` input format.

---

## Overview

Phase 5 consists of two sub-phases:

- **5A:** Zustand Stores — four stores managing attacker config, defender config, attack type, and simulation results
- **5B:** Preset Data & Loading — **replaced by Phase 5.5.** The hardcoded preset arrays and preset helper functions are superseded by the API-backed data pipeline and preset generator in Phase 5.5. See `plans/phase5.5-unit-data-upgrades.md` for the full implementation plan.

> **Phase 5.5 Amendments:** Phase 5.5 introduces modifications to the stores defined in 5A:
> - `AttackConfigState` and `DefenseConfigState` gain `upgradeBar`, `equippedUpgradeIds`, and `equipUpgrade` fields/actions
> - `loadPreset` signature gains an optional `upgradeBar` parameter
> - `selectAttackerConfig` / `selectDefenderConfig` exclude upgrade fields
> - `getFullConfig()` / `useFullConfig()` apply equipped upgrades via the upgrade applicator
> - `AttackerPreset` and `DefenderPreset` interfaces gain an `upgradeBar: UpgradeSlot[]` field
> 
> These changes are detailed in Phase 5.5 Steps 5.5D.1–5.5D.2. They are backward-compatible: stores work without upgrades when `upgradeBar` is empty.

Phase 5 depends on:
- **Phase 2A** (types only) — `AttackerConfig`, `DefenderConfig`, `AttackConfig`, `AttackType`, and all enums from `engine/types.ts`
- **Phase 3A** (types only) — `SimulationResult` type from `engine/types.ts`

Phase 5 does **not** depend on:
- Phase 2B–2D (attack sequence implementation)
- Phase 3B (Web Worker)
- Phase 4 (UI components)

---

## Design Clarifications

The following design decisions are documented for clarity:

1. **Store Shape vs. Engine Config Shape** — The Zustand stores mirror the engine's `AttackerConfig` and `DefenderConfig` exactly. This avoids a mapping/translation layer and keeps the `getFullConfig()` selector trivially simple (just assemble the three pieces). UI-specific state (like which preset is selected) lives alongside the engine-compatible fields but is excluded from `getFullConfig()`.

2. **Default Values** — Each store defines sensible defaults for all fields. Numeric fields default to `0`, booleans to `false`, enums to their "none" or "neutral" variant. These defaults produce a no-op attack (0 dice, no keywords, no tokens) — the user must add dice or load a preset to see results. This prevents confusing initial results from an unconfigured state.

3. **Reset vs. Clear** — `reset()` restores all fields to their defaults (as if the app just loaded). This is distinct from `loadPreset()` which first resets, then applies the preset's values on top. Resetting also clears the selected preset ID back to `null` (Custom).

4. **Preset Selection State** — Each panel stores `selectedFaction` and `selectedPresetId` as UI state. These control what's shown in the faction/unit dropdowns but don't feed into the engine config. When the user modifies any field after selecting a preset, the preset selection is **not** cleared — the user can see which preset they started from. Only explicitly selecting "Custom" or calling `reset()` clears the selection.

5. **Store Separation** — Four separate stores (attacker, defender, attack type, results) rather than one monolithic store. This enables fine-grained subscriptions — changing an attacker field won't trigger re-renders in defender components. The `getFullConfig()` function reads from all three input stores (attacker, defender, attack type) to assemble the engine's `AttackConfig`.

6. **Results Store** — Holds the `SimulationResult` from Phase 3, plus a `loading` flag and an optional `error` string. The `useSimulation` hook (Phase 7) writes to this store after each simulation completes. The store itself has no simulation logic — it's a passive container.

7. **Faction Enum** — A `Faction` enum is defined in the preset data module (not in `engine/types.ts`) since factions are a UI/data concern, not an engine concern. The engine doesn't care about factions.

8. **Preset Data Structure** — Each preset contains an `id`, `faction`, `name`, and either an `attackProfile` (partial `AttackerConfig`) or a `defenseProfile` (partial `DefenderConfig`). Using `Partial<>` means a preset only overrides the fields it specifies — everything else keeps the store's default value. This makes presets concise and maintainable. Guardian fields are intentionally excluded from defender presets because Guardian always represents a separate nearby unit, not the selected defender itself — Guardian settings are configured manually via the store's `setField()` action.

9. **Individual Field Setters** — Each store exposes a `setField(field, value)` generic setter that accepts any field name from the state shape. This avoids writing dozens of individual setter actions (one per field). The UI components call `setField('pierceX', 3)` instead of `setPierceX(3)`. Type safety is preserved via TypeScript generics.

10. **Hold the Line** — This keyword appears in both attacker and defender configs (`holdTheLine: boolean`). It is stored separately in each store because the attacker and defender may be different units. The engine reads both values independently.

---

## Step 5A.1 — Define Faction Enum and Preset Types

**File:** `src/data/presets.ts`

Define the `Faction` enum and preset data types. These are data-layer types, not engine types.

```ts
import type {
  AttackSurgeChart,
  DefenseSurgeChart,
  DefenseDieColor,
  MarksmanStrategy,
  RerollStrategy,
} from '../engine/types';

// ============================================================================
// Factions
// ============================================================================

export enum Faction {
  RebelAlliance = 'rebel-alliance',
  GalacticEmpire = 'galactic-empire',
  Republic = 'republic',
  SeparatistAlliance = 'separatist-alliance',
  Mercenaries = 'mercenaries',
}

/** Display labels for each faction */
export const FACTION_LABELS: Record<Faction, string> = {
  [Faction.RebelAlliance]: 'Rebel Alliance',
  [Faction.GalacticEmpire]: 'Galactic Empire',
  [Faction.Republic]: 'Republic',
  [Faction.SeparatistAlliance]: 'Separatist Alliance',
  [Faction.Mercenaries]: 'Mercenaries',
};

// ============================================================================
// Preset Profile Types
// ============================================================================

/**
 * Partial attacker profile for a preset.
 * Only includes fields that the preset overrides from defaults.
 * Omitted fields keep their default value in the store.
 */
export interface AttackerPresetProfile {
  redDice?: number;
  blackDice?: number;
  whiteDice?: number;
  surgeChart?: AttackSurgeChart;

  // Keywords (only include non-default values)
  preciseX?: number;
  criticalX?: number;
  lethalX?: number;
  sharpshooterX?: number;
  pierceX?: number;
  impactX?: number;
  ramX?: number;
  blast?: boolean;
  highVelocity?: boolean;
  suppressive?: boolean;
  marksman?: boolean;
  marksmanStrategy?: MarksmanStrategy;
  rerollStrategy?: RerollStrategy;
  jediHunter?: boolean;
  jarKaiMastery?: boolean;
  duelistAttacker?: boolean;
  makashiMastery?: boolean;
  spray?: boolean;
  immuneDeflect?: boolean;
  deathFromAbove?: boolean;
  holdTheLine?: boolean;
  antiMaterielX?: number;
  antiPersonnelX?: number;
  cumbersome?: boolean;

  // Points
  unitCost?: number;
}

/**
 * Partial defender profile for a preset.
 * Only includes fields that the preset overrides from defaults.
 */
export interface DefenderPresetProfile {
  dieColor?: DefenseDieColor;
  surgeChart?: DefenseSurgeChart;

  // Miniatures
  minisInLOS?: number;

  // Keywords (only include non-default values)
  armorX?: number;
  weakPointX?: number;
  immunePierce?: boolean;
  immuneMeleePierce?: boolean;
  immuneBlast?: boolean;
  impervious?: boolean;
  dangerSenseX?: number;
  uncannyLuckX?: number;
  block?: boolean;
  deflect?: boolean;
  shienMastery?: boolean;
  outmaneuver?: boolean;
  lowProfile?: boolean;
  shieldedX?: number;
  djemSoMastery?: boolean;
  soresuMastery?: boolean;
  duelistDefender?: boolean;
  backup?: boolean;
  holdTheLine?: boolean;
  dugIn?: boolean;
  coverX?: number;

  // Points
  unitCost?: number;
}

// Note: Guardian fields (guardianX, guardianDieColor, guardianSurgeChart,
// guardianDeflect, guardianSoresuMastery, guardianDodgeTokens) are intentionally
// excluded from DefenderPresetProfile. Guardian always represents a *separate*
// unit nearby — it is never part of the selected defender's own unit profile.
// Guardian settings are configured manually in the store via setField().

// ============================================================================
// Preset Entry Types
// ============================================================================

export interface AttackerPreset {
  id: string;
  faction: Faction;
  name: string;             // e.g., "Darth Vader (Lightsaber)"
  profile: AttackerPresetProfile;
}

export interface DefenderPreset {
  id: string;
  faction: Faction;
  name: string;             // e.g., "Stormtroopers"
  profile: DefenderPresetProfile;
}
```

**Verify:**
- TypeScript compiles without errors
- All profile fields are optional (Partial by design)
- Enum values are lowercase kebab-case strings for serialization friendliness

---

## Step 5A.2 — Create Attack Config Store

**File:** `src/stores/attackConfigStore.ts`

Zustand store managing all attacker inputs. The state shape matches `AttackerConfig` from `engine/types.ts` plus UI-specific preset selection fields.

```ts
import { create } from 'zustand';
import {
  AttackSurgeChart,
  MarksmanStrategy,
  RerollStrategy,
} from '../engine/types';
import type { Faction, AttackerPresetProfile } from '../data/presets';

// ============================================================================
// State Interface
// ============================================================================

export interface AttackConfigState {
  // ── Dice Pool ──
  redDice: number;
  blackDice: number;
  whiteDice: number;
  surgeChart: AttackSurgeChart;

  // ── Tokens ──
  aimTokens: number;
  surgeTokens: number;
  observationTokens: number;
  dodgeTokensAttacker: number;

  // ── Keywords (numeric) ──
  preciseX: number;
  criticalX: number;
  lethalX: number;
  sharpshooterX: number;
  pierceX: number;
  impactX: number;
  ramX: number;

  // ── Keywords (boolean) ──
  blast: boolean;
  highVelocity: boolean;
  suppressive: boolean;
  marksman: boolean;
  marksmanStrategy: MarksmanStrategy;
  rerollStrategy: RerollStrategy;
  jediHunter: boolean;
  jarKaiMastery: boolean;
  duelistAttacker: boolean;
  makashiMastery: boolean;
  spray: boolean;
  immuneDeflect: boolean;
  deathFromAbove: boolean;
  holdTheLine: boolean;

  // ── Dice Modification Keywords ──
  antiMaterielX: number;
  antiPersonnelX: number;
  cumbersome: boolean;

  // ── Points ──
  unitCost: number;

  // ── UI State (not sent to engine) ──
  selectedFaction: Faction | null;
  selectedPresetId: string | null;

  // ── Actions ──
  setField: <K extends keyof AttackConfigFields>(
    field: K,
    value: AttackConfigFields[K]
  ) => void;
  setSelectedFaction: (faction: Faction | null) => void;
  loadPreset: (presetId: string, profile: AttackerPresetProfile) => void;
  reset: () => void;
}

/**
 * All settable fields (excludes actions and UI-only state).
 * Used for type-safe generic setter.
 */
type AttackConfigFields = Omit<
  AttackConfigState,
  'setField' | 'setSelectedFaction' | 'loadPreset' | 'reset' | 'selectedFaction' | 'selectedPresetId'
>;

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_ATTACK_CONFIG: AttackConfigFields = {
  // Dice pool
  redDice: 0,
  blackDice: 0,
  whiteDice: 0,
  surgeChart: AttackSurgeChart.None,

  // Tokens
  aimTokens: 0,
  surgeTokens: 0,
  observationTokens: 0,
  dodgeTokensAttacker: 0,

  // Keywords (numeric)
  preciseX: 0,
  criticalX: 0,
  lethalX: 0,
  sharpshooterX: 0,
  pierceX: 0,
  impactX: 0,
  ramX: 0,

  // Keywords (boolean)
  blast: false,
  highVelocity: false,
  suppressive: false,
  marksman: false,
  marksmanStrategy: MarksmanStrategy.Deterministic,
  rerollStrategy: RerollStrategy.Conservative,
  jediHunter: false,
  jarKaiMastery: false,
  duelistAttacker: false,
  makashiMastery: false,
  spray: false,
  immuneDeflect: false,
  deathFromAbove: false,
  holdTheLine: false,

  // Dice modification keywords
  antiMaterielX: 0,
  antiPersonnelX: 0,
  cumbersome: false,

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

  // Generic setter for any field
  setField: (field, value) =>
    set((state) => ({
      ...state,
      [field]: value,
    })),

  // Setter for faction dropdown (UI-only state)
  setSelectedFaction: (faction) =>
    set({ selectedFaction: faction }),

  // Load a preset: reset to defaults, then apply preset overrides
  loadPreset: (presetId, profile) =>
    set(() => ({
      ...DEFAULT_ATTACK_CONFIG,
      ...profile,
      selectedPresetId: presetId,
      // selectedFaction is set separately by the UI when faction dropdown changes
    })),

  // Full reset to defaults
  reset: () =>
    set(() => ({
      ...DEFAULT_ATTACK_CONFIG,
      selectedFaction: null,
      selectedPresetId: null,
    })),
}));

/**
 * Selector: extract the engine-compatible AttackerConfig from the store.
 * Excludes UI-only fields (selectedFaction, selectedPresetId).
 */
export function selectAttackerConfig(state: AttackConfigState) {
  const { selectedFaction, selectedPresetId, setField, setSelectedFaction, loadPreset, reset, ...config } = state;
  return config;
}
```

**Verify:**
- `useAttackConfigStore.getState().redDice` returns `0`
- `useAttackConfigStore.getState().setField('redDice', 6)` → `redDice` is now `6`
- `useAttackConfigStore.getState().reset()` → all fields back to defaults
- `selectAttackerConfig(useAttackConfigStore.getState())` returns an object matching `AttackerConfig` shape
- TypeScript enforces correct field names and value types via the generic setter

**Notes:**
- The `setField` generic setter uses TypeScript's mapped types to enforce that the value type matches the field. Calling `setField('blast', 3)` would produce a type error (expects `boolean`).
- `loadPreset` uses object spread: defaults first, then preset overrides. Any field not in the preset profile keeps its default value.
- `selectedFaction` is set by the UI (faction dropdown `onChange`) independently of preset loading, because the user may change factions without selecting a specific unit yet.

---

## Step 5A.3 — Create Defense Config Store

**File:** `src/stores/defenseConfigStore.ts`

Zustand store managing all defender inputs. Mirrors the pattern from `attackConfigStore.ts`.

```ts
import { create } from 'zustand';
import {
  DefenseDieColor,
  DefenseSurgeChart,
  CoverType,
} from '../engine/types';
import type { Faction, DefenderPresetProfile } from '../data/presets';

// ============================================================================
// State Interface
// ============================================================================

export interface DefenseConfigState {
  // ── Defense ──
  dieColor: DefenseDieColor;
  surgeChart: DefenseSurgeChart;

  // ── Cover ──
  coverType: CoverType;
  coverX: number;
  smokeTokens: number;
  suppressed: boolean;

  // ── Tokens ──
  dodgeTokens: number;
  surgeTokens: number;
  suppressionTokens: number;

  // ── Miniatures ──
  minisInLOS: number;

  // ── Keywords (numeric) ──
  armorX: number;
  weakPointX: number;
  dangerSenseX: number;
  uncannyLuckX: number;
  shieldedX: number;
  guardianX: number;

  // ── Keywords (boolean) ──
  immunePierce: boolean;
  immuneMeleePierce: boolean;
  immuneBlast: boolean;
  impervious: boolean;
  block: boolean;
  deflect: boolean;
  shienMastery: boolean;
  outmaneuver: boolean;
  lowProfile: boolean;
  djemSoMastery: boolean;
  soresuMastery: boolean;
  duelistDefender: boolean;
  backup: boolean;
  holdTheLine: boolean;
  dugIn: boolean;  // Dug In upgrade: cover dice become red instead of white

  // ── Guardian Sub-config ──
  guardianDieColor: DefenseDieColor;
  guardianSurgeChart: DefenseSurgeChart;
  guardianDeflect: boolean;
  guardianSoresuMastery: boolean;
  guardianDodgeTokens: number;

  // ── Points ──
  unitCost: number;

  // ── UI State (not sent to engine) ──
  selectedFaction: Faction | null;
  selectedPresetId: string | null;

  // ── Actions ──
  setField: <K extends keyof DefenseConfigFields>(
    field: K,
    value: DefenseConfigFields[K]
  ) => void;
  setSelectedFaction: (faction: Faction | null) => void;
  loadPreset: (presetId: string, profile: DefenderPresetProfile) => void;
  reset: () => void;
}

/**
 * All settable fields (excludes actions and UI-only state).
 */
type DefenseConfigFields = Omit<
  DefenseConfigState,
  'setField' | 'setSelectedFaction' | 'loadPreset' | 'reset' | 'selectedFaction' | 'selectedPresetId'
>;

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_DEFENSE_CONFIG: DefenseConfigFields = {
  // Defense
  dieColor: DefenseDieColor.White,
  surgeChart: DefenseSurgeChart.None,

  // Cover
  coverType: CoverType.None,
  coverX: 0,
  smokeTokens: 0,
  suppressed: false,

  // Tokens
  dodgeTokens: 0,
  surgeTokens: 0,
  suppressionTokens: 0,

  // Miniatures
  minisInLOS: 1,

  // Keywords (numeric)
  armorX: 0,
  weakPointX: 0,
  dangerSenseX: 0,
  uncannyLuckX: 0,
  shieldedX: 0,
  guardianX: 0,

  // Keywords (boolean)
  immunePierce: false,
  immuneMeleePierce: false,
  immuneBlast: false,
  impervious: false,
  block: false,
  deflect: false,
  shienMastery: false,
  outmaneuver: false,
  lowProfile: false,
  djemSoMastery: false,
  soresuMastery: false,
  duelistDefender: false,
  backup: false,
  holdTheLine: false,
  dugIn: false,

  // Guardian sub-config
  guardianDieColor: DefenseDieColor.White,
  guardianSurgeChart: DefenseSurgeChart.None,
  guardianDeflect: false,
  guardianSoresuMastery: false,
  guardianDodgeTokens: 0,

  // Points
  unitCost: 0,
};

// ============================================================================
// Store
// ============================================================================

export const useDefenseConfigStore = create<DefenseConfigState>((set) => ({
  // Spread defaults as initial state
  ...DEFAULT_DEFENSE_CONFIG,

  // UI state
  selectedFaction: null,
  selectedPresetId: null,

  // Generic setter for any field
  setField: (field, value) =>
    set((state) => ({
      ...state,
      [field]: value,
    })),

  // Setter for faction dropdown (UI-only state)
  setSelectedFaction: (faction) =>
    set({ selectedFaction: faction }),

  // Load a preset: reset to defaults, then apply preset overrides
  loadPreset: (presetId, profile) =>
    set(() => ({
      ...DEFAULT_DEFENSE_CONFIG,
      ...profile,
      selectedPresetId: presetId,
    })),

  // Full reset to defaults
  reset: () =>
    set(() => ({
      ...DEFAULT_DEFENSE_CONFIG,
      selectedFaction: null,
      selectedPresetId: null,
    })),
}));

/**
 * Selector: extract the engine-compatible DefenderConfig from the store.
 * Excludes UI-only fields.
 */
export function selectDefenderConfig(state: DefenseConfigState) {
  const { selectedFaction, selectedPresetId, setField, setSelectedFaction, loadPreset, reset, ...config } = state;
  return config;
}
```

**Verify:**
- `useDefenseConfigStore.getState().dieColor` returns `DefenseDieColor.White`
- `useDefenseConfigStore.getState().minisInLOS` returns `1`
- `setField('armorX', 2)` → `armorX` is now `2`
- `loadPreset('empire-stormtroopers', { dieColor: DefenseDieColor.Red })` → dieColor is Red, all other fields are defaults
- `selectDefenderConfig()` returns an object matching `DefenderConfig` shape

**Notes:**
- `minisInLOS` defaults to `1` (not `0`) because there must be at least 1 mini in LOS for an attack to occur.
- Guardian sub-config fields (`guardianX`, `guardianDieColor`, `guardianSurgeChart`, etc.) always exist in the store but are only meaningful when `guardianX > 0`. The UI conditionally shows/hides these inputs based on `guardianX`. These fields are always configured manually — they are never part of a defender preset because Guardian represents a separate nearby unit, not the selected defender itself.
- The engine types define `guardianDieColor` and `guardianSurgeChart` as optional on `DefenderConfig`, but the store always has concrete values. The `selectDefenderConfig` selector can optionally strip these when `guardianX === 0`, but it's simpler to always pass them and let the engine ignore them when Guardian is inactive.

---

## Step 5A.4 — Create Attack Type Store

**File:** `src/stores/attackTypeStore.ts`

Minimal store for the global attack type selection.

```ts
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
  attackType: AttackType.All,

  setAttackType: (type) => set({ attackType: type }),

  reset: () => set({ attackType: AttackType.All }),
}));
```

**Verify:**
- `useAttackTypeStore.getState().attackType` returns `AttackType.All`
- `setAttackType(AttackType.Melee)` → attackType is `AttackType.Melee`
- `reset()` → attackType is back to `AttackType.All`

**Notes:**
- This is intentionally a separate store from attacker/defender because attack type is a global setting that affects both panels' keyword applicability. It lives in the header/top bar, not inside either panel.

---

## Step 5A.5 — Create Results Store

**File:** `src/stores/resultsStore.ts`

Holds the simulation output. Written to by the `useSimulation` hook (Phase 7) after each simulation completes.

```ts
import { create } from 'zustand';
import type { SimulationResult } from '../engine/types';

// ============================================================================
// State Interface
// ============================================================================

export interface ResultsState {
  /** The latest simulation result, or null if no simulation has run yet */
  result: SimulationResult | null;

  /** True while a simulation is in progress */
  loading: boolean;

  /** Error message if the last simulation failed */
  error: string | null;

  // ── Actions ──
  setResult: (result: SimulationResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useResultsStore = create<ResultsState>((set) => ({
  result: null,
  loading: false,
  error: null,

  setResult: (result) =>
    set({
      result,
      loading: false,
      error: null,
    }),

  setLoading: (loading) =>
    set({ loading }),

  setError: (error) =>
    set({
      error,
      loading: false,
    }),

  clear: () =>
    set({
      result: null,
      loading: false,
      error: null,
    }),
}));
```

**Verify:**
- Initial state: `result: null`, `loading: false`, `error: null`
- `setLoading(true)` → loading is `true`
- `setResult(mockResult)` → result is set, loading is `false`, error is `null`
- `setError('Worker failed')` → error is set, loading is `false`
- `clear()` → all fields back to initial

**Notes:**
- `setResult` automatically clears `loading` and `error` — a successful result implies the operation completed without error.
- `setError` automatically clears `loading` — an error also means the operation is no longer in progress.
- The store is passive (no simulation logic). The `useSimulation` hook (Phase 7) is responsible for dispatching to the Web Worker and writing results here.

---

## Step 5A.6 — Create `getFullConfig` Selector

**File:** `src/stores/configSelectors.ts`

A selector function that reads from all three input stores and assembles the engine's `AttackConfig` object. Used by the `useSimulation` hook to get the current configuration for the simulation.

```ts
import type { AttackConfig } from '../engine/types';
import { useAttackConfigStore, selectAttackerConfig } from './attackConfigStore';
import { useDefenseConfigStore, selectDefenderConfig } from './defenseConfigStore';
import { useAttackTypeStore } from './attackTypeStore';

/**
 * Read-only selector that merges all three input stores into
 * the engine's AttackConfig format.
 *
 * Usage in React components:
 *   const config = useFullConfig();
 *
 * Usage outside React (e.g., tests):
 *   const config = getFullConfig();
 */
export function getFullConfig(): AttackConfig {
  const attackState = useAttackConfigStore.getState();
  const defenseState = useDefenseConfigStore.getState();
  const attackTypeState = useAttackTypeStore.getState();

  return {
    attacker: selectAttackerConfig(attackState),
    defender: selectDefenderConfig(defenseState),
    attackType: attackTypeState.attackType,
  };
}

/**
 * React hook version — subscribes to all three stores and returns
 * the merged config. Re-renders when any input changes.
 *
 * This performs a shallow merge on every render. For the simulation
 * hook (Phase 7), this is acceptable because the simulation is
 * debounced anyway. For components that only need part of the config,
 * subscribe to individual stores directly (e.g., useAttackConfigStore).
 */
export function useFullConfig(): AttackConfig {
  const attackerConfig = useAttackConfigStore(selectAttackerConfig);
  const defenderConfig = useDefenseConfigStore(selectDefenderConfig);
  const attackType = useAttackTypeStore((state) => state.attackType);

  return {
    attacker: attackerConfig,
    defender: defenderConfig,
    attackType,
  };
}
```

**Verify:**
- `getFullConfig()` returns `{ attacker: {...}, defender: {...}, attackType: 'all' }` matching `AttackConfig` shape
- Setting a field in the attack store and calling `getFullConfig()` reflects the change
- The `useFullConfig` hook subscribes to all three stores (test by verifying re-render on store change)

**Notes:**
- `getFullConfig()` is the non-reactive version for use outside React (tests, worker dispatch). It reads `.getState()` directly.
- `useFullConfig()` is the reactive hook version that subscribes to store changes. It uses Zustand's selector pattern to extract only engine-relevant fields.
- The returned `attacker` object should satisfy the `AttackerConfig` interface from `engine/types.ts`. If there's a mismatch (extra/missing fields), TypeScript will catch it at compile time.

---

## Step 5A.7 — Create Store Index File

**File:** `src/stores/index.ts`

Re-export all stores, selectors, and types from a single entry point.

```ts
// Stores
export { useAttackConfigStore } from './attackConfigStore';
export { useDefenseConfigStore } from './defenseConfigStore';
export { useAttackTypeStore } from './attackTypeStore';
export { useResultsStore } from './resultsStore';

// Selectors
export { selectAttackerConfig } from './attackConfigStore';
export { selectDefenderConfig } from './defenseConfigStore';
export { getFullConfig, useFullConfig } from './configSelectors';

// State types
export type { AttackConfigState } from './attackConfigStore';
export type { DefenseConfigState } from './defenseConfigStore';
export type { AttackTypeState } from './attackTypeStore';
export type { ResultsState } from './resultsStore';
```

**Verify:**
- Importing from `'../stores'` provides all stores and selectors
- No circular dependencies

---

## Step 5A.8 — Write Unit Tests for Stores

**File:** `src/stores/attackConfigStore.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAttackConfigStore, selectAttackerConfig } from './attackConfigStore';
import { AttackSurgeChart, MarksmanStrategy, RerollStrategy } from '../engine/types';

describe('attackConfigStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useAttackConfigStore.getState().reset();
  });

  // ── Default Values ──

  it('initializes with zero dice', () => {
    const state = useAttackConfigStore.getState();
    expect(state.redDice).toBe(0);
    expect(state.blackDice).toBe(0);
    expect(state.whiteDice).toBe(0);
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
    expect(state.blast).toBe(false);
    expect(state.highVelocity).toBe(false);
    expect(state.marksman).toBe(false);
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

  // ── setField ──

  it('sets a numeric field', () => {
    useAttackConfigStore.getState().setField('redDice', 6);
    expect(useAttackConfigStore.getState().redDice).toBe(6);
  });

  it('sets a boolean field', () => {
    useAttackConfigStore.getState().setField('blast', true);
    expect(useAttackConfigStore.getState().blast).toBe(true);
  });

  it('sets an enum field', () => {
    useAttackConfigStore.getState().setField('surgeChart', AttackSurgeChart.ToCrit);
    expect(useAttackConfigStore.getState().surgeChart).toBe(AttackSurgeChart.ToCrit);
  });

  it('preserves other fields when setting one field', () => {
    useAttackConfigStore.getState().setField('redDice', 6);
    useAttackConfigStore.getState().setField('pierceX', 3);
    const state = useAttackConfigStore.getState();
    expect(state.redDice).toBe(6);
    expect(state.pierceX).toBe(3);
  });

  // ── loadPreset ──

  it('applies preset profile over defaults', () => {
    useAttackConfigStore.getState().loadPreset('vader-lightsaber', {
      redDice: 6,
      surgeChart: AttackSurgeChart.ToCrit,
      pierceX: 3,
      impactX: 3,
      unitCost: 175,
    });

    const state = useAttackConfigStore.getState();
    expect(state.redDice).toBe(6);
    expect(state.surgeChart).toBe(AttackSurgeChart.ToCrit);
    expect(state.pierceX).toBe(3);
    expect(state.impactX).toBe(3);
    expect(state.unitCost).toBe(175);
    expect(state.selectedPresetId).toBe('vader-lightsaber');
  });

  it('resets non-preset fields to defaults when loading preset', () => {
    // First set some custom values
    useAttackConfigStore.getState().setField('blast', true);
    useAttackConfigStore.getState().setField('aimTokens', 3);

    // Then load a preset that doesn't include those fields
    useAttackConfigStore.getState().loadPreset('stormtroopers-dlt19', {
      whiteDice: 4,
      redDice: 1,
      preciseX: 1,
    });

    const state = useAttackConfigStore.getState();
    expect(state.blast).toBe(false);      // Reset to default
    expect(state.aimTokens).toBe(0);      // Reset to default
    expect(state.whiteDice).toBe(4);      // From preset
    expect(state.redDice).toBe(1);        // From preset
    expect(state.preciseX).toBe(1);       // From preset
  });

  // ── reset ──

  it('resets all fields to defaults', () => {
    useAttackConfigStore.getState().setField('redDice', 6);
    useAttackConfigStore.getState().setField('blast', true);
    useAttackConfigStore.getState().setField('pierceX', 3);

    useAttackConfigStore.getState().reset();

    const state = useAttackConfigStore.getState();
    expect(state.redDice).toBe(0);
    expect(state.blast).toBe(false);
    expect(state.pierceX).toBe(0);
    expect(state.selectedFaction).toBeNull();
    expect(state.selectedPresetId).toBeNull();
  });

  // ── selectAttackerConfig ──

  it('extracts engine-compatible config without UI fields', () => {
    useAttackConfigStore.getState().setField('redDice', 6);
    const config = selectAttackerConfig(useAttackConfigStore.getState());

    expect(config.redDice).toBe(6);
    expect(config).not.toHaveProperty('selectedFaction');
    expect(config).not.toHaveProperty('selectedPresetId');
    expect(config).not.toHaveProperty('setField');
    expect(config).not.toHaveProperty('loadPreset');
    expect(config).not.toHaveProperty('reset');
  });
});
```

**File:** `src/stores/defenseConfigStore.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useDefenseConfigStore, selectDefenderConfig } from './defenseConfigStore';
import { DefenseDieColor, DefenseSurgeChart, CoverType } from '../engine/types';

describe('defenseConfigStore', () => {
  beforeEach(() => {
    useDefenseConfigStore.getState().reset();
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

  // ── loadPreset ──

  it('applies defender preset correctly', () => {
    useDefenseConfigStore.getState().loadPreset('empire-stormtroopers', {
      dieColor: DefenseDieColor.Red,
      unitCost: 44,
    });

    const state = useDefenseConfigStore.getState();
    expect(state.dieColor).toBe(DefenseDieColor.Red);
    expect(state.surgeChart).toBe(DefenseSurgeChart.None);  // Default (not in preset)
    expect(state.unitCost).toBe(44);
    expect(state.selectedPresetId).toBe('empire-stormtroopers');
  });

  it('applies defender preset with keywords', () => {
    useDefenseConfigStore.getState().loadPreset('sep-aat', {
      dieColor: DefenseDieColor.Red,
      armorX: 2,
      shieldedX: 2,
      unitCost: 170,
    });

    const state = useDefenseConfigStore.getState();
    expect(state.armorX).toBe(2);
    expect(state.shieldedX).toBe(2);
    expect(state.deflect).toBe(false);  // Not in preset → default
  });

  // ── reset ──

  it('resets all fields to defaults', () => {
    useDefenseConfigStore.getState().setField('dieColor', DefenseDieColor.Red);
    useDefenseConfigStore.getState().setField('armorX', 5);
    useDefenseConfigStore.getState().reset();

    const state = useDefenseConfigStore.getState();
    expect(state.dieColor).toBe(DefenseDieColor.White);
    expect(state.armorX).toBe(0);
  });

  // ── selectDefenderConfig ──

  it('extracts engine-compatible config without UI fields', () => {
    const config = selectDefenderConfig(useDefenseConfigStore.getState());

    expect(config).toHaveProperty('dieColor');
    expect(config).toHaveProperty('minisInLOS');
    expect(config).not.toHaveProperty('selectedFaction');
    expect(config).not.toHaveProperty('selectedPresetId');
    expect(config).not.toHaveProperty('setField');
  });
});
```

**File:** `src/stores/attackTypeStore.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAttackTypeStore } from './attackTypeStore';
import { AttackType } from '../engine/types';

describe('attackTypeStore', () => {
  beforeEach(() => {
    useAttackTypeStore.getState().reset();
  });

  it('initializes with AttackType.All', () => {
    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.All);
  });

  it('sets attack type', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.Melee);
  });

  it('resets to All', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Ranged);
    useAttackTypeStore.getState().reset();
    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.All);
  });
});
```

**File:** `src/stores/resultsStore.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useResultsStore } from './resultsStore';
import type { SimulationResult } from '../engine/types';

// Minimal mock result for testing
const mockResult: SimulationResult = {
  iterations: 100,
  durationMs: 50,
  totalWounds: { mean: 3, median: 3, mode: 3, min: 0, max: 7, standardDeviation: 1.2 },
  totalWoundsDistribution: [],
  guardianWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  guardianWoundsDistribution: [],
  mainTargetWounds: { mean: 3, median: 3, mode: 3, min: 0, max: 7, standardDeviation: 1.2 },
  mainTargetWoundsDistribution: [],
  deflectWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  deflectWoundsDistribution: [],
  djemSoWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  djemSoWoundsDistribution: [],
  suppressionPerAttack: 1,
  efficiency: {
    attackerWoundsPerPoint: 0,
    attackerPointsPerWound: 0,
    defenderWoundsPerPoint: 0,
    defenderPointsPerWound: 0,
    attackerEfficiencyRatio: 0,
  },
};

describe('resultsStore', () => {
  beforeEach(() => {
    useResultsStore.getState().clear();
  });

  it('initializes with null result and not loading', () => {
    const state = useResultsStore.getState();
    expect(state.result).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets loading state', () => {
    useResultsStore.getState().setLoading(true);
    expect(useResultsStore.getState().loading).toBe(true);
  });

  it('sets result and clears loading/error', () => {
    useResultsStore.getState().setLoading(true);
    useResultsStore.getState().setResult(mockResult);

    const state = useResultsStore.getState();
    expect(state.result).toBe(mockResult);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets error and clears loading', () => {
    useResultsStore.getState().setLoading(true);
    useResultsStore.getState().setError('Simulation failed');

    const state = useResultsStore.getState();
    expect(state.error).toBe('Simulation failed');
    expect(state.loading).toBe(false);
  });

  it('clears all state', () => {
    useResultsStore.getState().setResult(mockResult);
    useResultsStore.getState().clear();

    const state = useResultsStore.getState();
    expect(state.result).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
```

**File:** `src/stores/configSelectors.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAttackConfigStore } from './attackConfigStore';
import { useDefenseConfigStore } from './defenseConfigStore';
import { useAttackTypeStore } from './attackTypeStore';
import { getFullConfig } from './configSelectors';
import { AttackType, AttackSurgeChart, DefenseDieColor } from '../engine/types';

describe('getFullConfig', () => {
  beforeEach(() => {
    useAttackConfigStore.getState().reset();
    useDefenseConfigStore.getState().reset();
    useAttackTypeStore.getState().reset();
  });

  it('returns a valid AttackConfig from default stores', () => {
    const config = getFullConfig();

    expect(config).toHaveProperty('attacker');
    expect(config).toHaveProperty('defender');
    expect(config).toHaveProperty('attackType');
    expect(config.attackType).toBe(AttackType.All);
    expect(config.attacker.redDice).toBe(0);
    expect(config.defender.dieColor).toBe(DefenseDieColor.White);
  });

  it('reflects changes from individual stores', () => {
    useAttackConfigStore.getState().setField('redDice', 6);
    useAttackConfigStore.getState().setField('surgeChart', AttackSurgeChart.ToCrit);
    useDefenseConfigStore.getState().setField('dieColor', DefenseDieColor.Red);
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);

    const config = getFullConfig();

    expect(config.attacker.redDice).toBe(6);
    expect(config.attacker.surgeChart).toBe(AttackSurgeChart.ToCrit);
    expect(config.defender.dieColor).toBe(DefenseDieColor.Red);
    expect(config.attackType).toBe(AttackType.Melee);
  });

  it('does not include UI-only fields', () => {
    const config = getFullConfig();

    expect(config.attacker).not.toHaveProperty('selectedFaction');
    expect(config.attacker).not.toHaveProperty('selectedPresetId');
    expect(config.defender).not.toHaveProperty('selectedFaction');
    expect(config.defender).not.toHaveProperty('selectedPresetId');
  });
});
```

**Verify:**
- All tests pass: `npm test -- --run src/stores/`
- No TypeScript errors
- Store tests run standalone (no React rendering needed — Zustand stores are plain JS objects)

---

> ## ⚠️ Phase 5B — Replaced by Phase 5.5
>
> **The entire Phase 5B section below is superseded by Phase 5.5 (Unit Data Layer & Upgrade System).** The hardcoded preset arrays (`ATTACKER_PRESETS`, `DEFENDER_PRESETS`), the preset helper functions, and the data index file are all replaced by the API-backed data pipeline, preset generator, and preset helpers in Phase 5.5.
>
> **Do not implement the steps below.** Instead, implement the corresponding Phase 5.5 steps:
> - 5B.1 (Attacker Presets) → 5.5B.2 (Unit Enrichment Data) + 5.5C.3 (Preset Generator)
> - 5B.2 (Defender Presets) → 5.5B.2 (Unit Enrichment Data) + 5.5C.3 (Preset Generator)
> - 5B.3 (Preset Helpers) → 5.5C.4 (Preset Helpers)
> - 5B.4 (Data Index) → 5.5D.3 (Data Layer Index)
> - 5B.5 (Preset Tests) → 5.5E.1 (Preset Generator Tests)
>
> The preset helper API surface (`getAttackerPresets`, `getDefenderPresets`, etc.) is preserved with identical signatures. Phase 6 code calling these functions needs no changes.
>
> See `plans/phase5.5-unit-data-upgrades.md` for the full implementation plan.

## Step 5B.1 — Create Attacker Preset Data

**File:** `src/data/attackerPresets.ts`

The MVP attacker preset dataset. Each entry defines a unit/weapon loadout with its dice pool, surge chart, relevant keywords, and point cost.

```ts
import { AttackSurgeChart } from '../engine/types';
import type { AttackerPreset } from './presets';
import { Faction } from './presets';

// ============================================================================
// Attacker Presets — MVP Dataset
// ============================================================================

export const ATTACKER_PRESETS: AttackerPreset[] = [
  // ── Galactic Empire ──
  {
    id: 'empire-vader-lightsaber',
    faction: Faction.GalacticEmpire,
    name: 'Darth Vader (Lightsaber)',
    profile: {
      redDice: 6,
      surgeChart: AttackSurgeChart.ToCrit,
      pierceX: 3,
      impactX: 3,
      immuneDeflect: true,
      unitCost: 175,
    },
  },
  {
    id: 'empire-stormtroopers-e11',
    faction: Faction.GalacticEmpire,
    name: 'Stormtroopers (E-11)',
    profile: {
      whiteDice: 4,
      surgeChart: AttackSurgeChart.None,
      preciseX: 1,
      unitCost: 44,
    },
  },
  {
    id: 'empire-stormtroopers-dlt19',
    faction: Faction.GalacticEmpire,
    name: 'Stormtroopers (DLT-19)',
    profile: {
      whiteDice: 4,
      redDice: 1,
      surgeChart: AttackSurgeChart.None,
      preciseX: 1,
      impactX: 1,
      unitCost: 62,
    },
  },
  {
    id: 'empire-shore-t21b',
    faction: Faction.GalacticEmpire,
    name: 'Shore Troopers (T-21B)',
    profile: {
      whiteDice: 4,
      redDice: 1,
      surgeChart: AttackSurgeChart.ToHit,
      preciseX: 1,
      unitCost: 68,
    },
  },
  {
    id: 'empire-death-troopers-e11d',
    faction: Faction.GalacticEmpire,
    name: 'Death Troopers (E-11D)',
    profile: {
      blackDice: 4,
      surgeChart: AttackSurgeChart.ToCrit,
      preciseX: 1,
      unitCost: 76,
    },
  },
  {
    id: 'empire-palpatine-lightning',
    faction: Faction.GalacticEmpire,
    name: 'Emperor Palpatine (Lightning)',
    profile: {
      redDice: 3,
      blackDice: 3,
      surgeChart: AttackSurgeChart.ToCrit,
      pierceX: 1,
      suppressive: true,
      immuneDeflect: true,
      unitCost: 200,
    },
  },

  // ── Rebel Alliance ──
  {
    id: 'rebels-luke-lightsaber',
    faction: Faction.RebelAlliance,
    name: 'Luke Skywalker (Lightsaber)',
    profile: {
      redDice: 6,
      surgeChart: AttackSurgeChart.ToCrit,
      pierceX: 2,
      impactX: 2,
      unitCost: 160,
    },
  },
  {
    id: 'rebels-rebel-troopers-a280',
    faction: Faction.RebelAlliance,
    name: 'Rebel Troopers (A-280)',
    profile: {
      whiteDice: 4,
      surgeChart: AttackSurgeChart.ToCrit,
      unitCost: 40,
    },
  },
  {
    id: 'rebels-rebel-troopers-z6',
    faction: Faction.RebelAlliance,
    name: 'Rebel Troopers (Z-6)',
    profile: {
      whiteDice: 10,
      surgeChart: AttackSurgeChart.ToCrit,
      unitCost: 52,
    },
  },
  {
    id: 'rebels-wookiees-bowcaster',
    faction: Faction.RebelAlliance,
    name: 'Wookiee Warriors (Bowcaster)',
    profile: {
      blackDice: 4,
      redDice: 1,
      surgeChart: AttackSurgeChart.ToCrit,
      pierceX: 1,
      impactX: 1,
      unitCost: 74,
    },
  },
  {
    id: 'rebels-han-solo-dl44',
    faction: Faction.RebelAlliance,
    name: 'Han Solo (DL-44)',
    profile: {
      redDice: 2,
      surgeChart: AttackSurgeChart.ToCrit,
      pierceX: 2,
      sharpshooterX: 1,
      unitCost: 120,
    },
  },

  // ── Republic ──
  {
    id: 'republic-clone-troopers-dc15a',
    faction: Faction.Republic,
    name: 'Clone Troopers (DC-15A)',
    profile: {
      blackDice: 4,
      surgeChart: AttackSurgeChart.ToCrit,
      preciseX: 1,
      unitCost: 52,
    },
  },
  {
    id: 'republic-clone-troopers-z6',
    faction: Faction.Republic,
    name: 'Clone Troopers (DC-15A + Z-6)',
    profile: {
      blackDice: 4,
      whiteDice: 6,
      surgeChart: AttackSurgeChart.ToCrit,
      preciseX: 1,
      unitCost: 68,
    },
  },
  {
    id: 'republic-obi-wan-lightsaber',
    faction: Faction.Republic,
    name: 'Obi-Wan Kenobi (Lightsaber)',
    profile: {
      redDice: 6,
      surgeChart: AttackSurgeChart.ToCrit,
      pierceX: 2,
      impactX: 2,
      unitCost: 170,
    },
  },

  // ── Separatist Alliance ──
  {
    id: 'sep-b1-e5',
    faction: Faction.SeparatistAlliance,
    name: 'B1 Battle Droids (E-5)',
    profile: {
      whiteDice: 5,
      surgeChart: AttackSurgeChart.None,
      unitCost: 36,
    },
  },
  {
    id: 'sep-b1-e5s',
    faction: Faction.SeparatistAlliance,
    name: 'B1 Battle Droids (E-5s)',
    profile: {
      whiteDice: 5,
      blackDice: 1,
      surgeChart: AttackSurgeChart.None,
      criticalX: 1,
      unitCost: 46,
    },
  },
  {
    id: 'sep-b2-e5',
    faction: Faction.SeparatistAlliance,
    name: 'B2 Battle Droids (E-5)',
    profile: {
      blackDice: 4,
      surgeChart: AttackSurgeChart.None,
      impactX: 1,
      unitCost: 48,
    },
  },
  {
    id: 'sep-grievous-lightsabers',
    faction: Faction.SeparatistAlliance,
    name: 'General Grievous (Lightsabers)',
    profile: {
      redDice: 4,
      blackDice: 2,
      surgeChart: AttackSurgeChart.ToCrit,
      pierceX: 2,
      impactX: 2,
      immuneDeflect: true,
      unitCost: 170,
    },
  },
  {
    id: 'sep-dooku-lightsaber',
    faction: Faction.SeparatistAlliance,
    name: 'Count Dooku (Lightsaber)',
    profile: {
      redDice: 5,
      surgeChart: AttackSurgeChart.ToCrit,
      pierceX: 2,
      impactX: 2,
      makashiMastery: true,
      unitCost: 195,
    },
  },

  // ── Mercenaries ──
  {
    id: 'merc-boba-fett-ee3',
    faction: Faction.Mercenaries,
    name: 'Boba Fett (EE-3)',
    profile: {
      blackDice: 2,
      surgeChart: AttackSurgeChart.ToCrit,
      sharpshooterX: 2,
      pierceX: 1,
      unitCost: 125,
    },
  },
  {
    id: 'merc-mandalorian-resistance',
    faction: Faction.Mercenaries,
    name: 'Mandalorian Resistance (Weapons)',
    profile: {
      blackDice: 4,
      surgeChart: AttackSurgeChart.ToHit,
      preciseX: 1,
      unitCost: 68,
    },
  },
];
```

**Verify:**
- TypeScript compiles — all profiles match `AttackerPresetProfile`
- Each preset has a unique `id`
- Faction assignments are correct
- Dice counts and keywords match known unit card data

**Notes:**
- Point costs are approximate and based on publicly available unit data. They can be refined later.
- Presets only include the weapon's contributed dice; the unit's base dice (if separate) would be additional presets.
- Additional presets can be added incrementally in future updates — the system is designed for easy expansion.

---

## Step 5B.2 — Create Defender Preset Data

**File:** `src/data/defenderPresets.ts`

The MVP defender preset dataset. Each entry defines a unit's defense profile.

```ts
import { DefenseDieColor, DefenseSurgeChart } from '../engine/types';
import type { DefenderPreset } from './presets';
import { Faction } from './presets';

// ============================================================================
// Defender Presets — MVP Dataset
// ============================================================================

export const DEFENDER_PRESETS: DefenderPreset[] = [
  // ── Galactic Empire ──
  {
    id: 'empire-stormtroopers-def',
    faction: Faction.GalacticEmpire,
    name: 'Stormtroopers',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      minisInLOS: 4,
      unitCost: 44,
    },
  },
  {
    id: 'empire-shore-troopers-def',
    faction: Faction.GalacticEmpire,
    name: 'Shore Troopers',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      minisInLOS: 4,
      unitCost: 52,
    },
  },
  {
    id: 'empire-death-troopers-def',
    faction: Faction.GalacticEmpire,
    name: 'Death Troopers',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      minisInLOS: 4,
      unitCost: 76,
    },
  },
  {
    id: 'empire-vader-def',
    faction: Faction.GalacticEmpire,
    name: 'Darth Vader',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      immunePierce: true,
      deflect: true,
      minisInLOS: 1,
      unitCost: 175,
    },
  },
  {
    id: 'empire-palpatine-def',
    faction: Faction.GalacticEmpire,
    name: 'Emperor Palpatine',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      deflect: true,
      immunePierce: true,
      minisInLOS: 1,
      unitCost: 200,
    },
  },

  // ── Rebel Alliance ──
  {
    id: 'rebels-rebel-troopers-def',
    faction: Faction.RebelAlliance,
    name: 'Rebel Troopers',
    profile: {
      dieColor: DefenseDieColor.White,
      surgeChart: DefenseSurgeChart.ToBlock,
      minisInLOS: 4,
      unitCost: 40,
    },
  },
  {
    id: 'rebels-wookiees-def',
    faction: Faction.RebelAlliance,
    name: 'Wookiee Warriors',
    profile: {
      dieColor: DefenseDieColor.White,
      surgeChart: DefenseSurgeChart.ToBlock,
      minisInLOS: 4,
      unitCost: 74,
    },
  },
  {
    id: 'rebels-luke-def',
    faction: Faction.RebelAlliance,
    name: 'Luke Skywalker',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.ToBlock,
      deflect: true,
      minisInLOS: 1,
      unitCost: 160,
    },
  },
  {
    id: 'rebels-han-def',
    faction: Faction.RebelAlliance,
    name: 'Han Solo',
    profile: {
      dieColor: DefenseDieColor.White,
      surgeChart: DefenseSurgeChart.ToBlock,
      uncannyLuckX: 1,
      lowProfile: true,
      minisInLOS: 1,
      unitCost: 120,
    },
  },

  // ── Republic ──
  {
    id: 'republic-clone-troopers-def',
    faction: Faction.Republic,
    name: 'Clone Troopers',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.ToBlock,
      minisInLOS: 4,
      unitCost: 52,
    },
  },
  {
    id: 'republic-arc-troopers-def',
    faction: Faction.Republic,
    name: 'ARC Troopers',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      minisInLOS: 4,
      unitCost: 72,
    },
  },
  {
    id: 'republic-obi-wan-def',
    faction: Faction.Republic,
    name: 'Obi-Wan Kenobi',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.ToBlock,
      deflect: true,
      soresuMastery: true,
      immunePierce: true,
      minisInLOS: 1,
      unitCost: 170,
    },
  },

  // ── Separatist Alliance ──
  {
    id: 'sep-b1-def',
    faction: Faction.SeparatistAlliance,
    name: 'B1 Battle Droids',
    profile: {
      dieColor: DefenseDieColor.White,
      surgeChart: DefenseSurgeChart.None,
      minisInLOS: 6,
      unitCost: 36,
    },
  },
  {
    id: 'sep-b2-def',
    faction: Faction.SeparatistAlliance,
    name: 'B2 Battle Droids',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      armorX: 1,
      minisInLOS: 4,
      unitCost: 48,
    },
  },
  {
    id: 'sep-aat-def',
    faction: Faction.SeparatistAlliance,
    name: 'AAT Tank',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      armorX: 2,
      shieldedX: 2,
      weakPointX: 1,
      minisInLOS: 1,
      unitCost: 170,
    },
  },
  {
    id: 'sep-grievous-def',
    faction: Faction.SeparatistAlliance,
    name: 'General Grievous',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      impervious: true,
      minisInLOS: 1,
      unitCost: 170,
    },
  },
  {
    id: 'sep-dooku-def',
    faction: Faction.SeparatistAlliance,
    name: 'Count Dooku',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      deflect: true,
      immunePierce: true,
      minisInLOS: 1,
      unitCost: 195,
    },
  },

  // ── Mercenaries ──
  {
    id: 'merc-boba-fett-def',
    faction: Faction.Mercenaries,
    name: 'Boba Fett',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      impervious: true,
      minisInLOS: 1,
      unitCost: 125,
    },
  },
  {
    id: 'merc-mandalorians-def',
    faction: Faction.Mercenaries,
    name: 'Mandalorian Resistance',
    profile: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      minisInLOS: 4,
      unitCost: 68,
    },
  },
];
```

**Verify:**
- TypeScript compiles — all profiles match `DefenderPresetProfile`
- Each preset has a unique `id`
- Faction assignments are correct
- Defense die colors and surge charts match known unit card data

**Notes:**
- Defender presets include `minisInLOS` as a convenience default showing the unit's standard squad size. Users can adjust this for partial squads.
- Makashi Mastery is an attacker-only keyword and does not appear on defender presets. Count Dooku's defender profile only includes `deflect` and `immunePierce`. His Makashi Mastery is on his attacker preset.

---

## Step 5B.3 — Create Preset Lookup and Filter Functions

**File:** `src/data/presetHelpers.ts`

Utility functions for filtering and looking up presets. Used by the SearchableCombobox in the UI panels.

```ts
import type { AttackerPreset, DefenderPreset } from './presets';
import { Faction, FACTION_LABELS } from './presets';
import { ATTACKER_PRESETS } from './attackerPresets';
import { DEFENDER_PRESETS } from './defenderPresets';

// ============================================================================
// Attacker Preset Helpers
// ============================================================================

/**
 * Get all attacker presets, optionally filtered by faction.
 * Returns presets sorted by faction, then by name.
 */
export function getAttackerPresets(faction?: Faction | null): AttackerPreset[] {
  let presets: AttackerPreset[] = faction
    ? ATTACKER_PRESETS.filter((p) => p.faction === faction)
    : [...ATTACKER_PRESETS];

  return presets.sort((a, b) => {
    // Sort by faction first, then by name
    if (a.faction !== b.faction) {
      return a.faction.localeCompare(b.faction);
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Find an attacker preset by ID.
 */
export function getAttackerPresetById(id: string): AttackerPreset | undefined {
  return ATTACKER_PRESETS.find((p) => p.id === id);
}

// ============================================================================
// Defender Preset Helpers
// ============================================================================

/**
 * Get all defender presets, optionally filtered by faction.
 * Returns presets sorted by faction, then by name.
 */
export function getDefenderPresets(faction?: Faction | null): DefenderPreset[] {
  let presets: DefenderPreset[] = faction
    ? DEFENDER_PRESETS.filter((p) => p.faction === faction)
    : [...DEFENDER_PRESETS];

  return presets.sort((a, b) => {
    if (a.faction !== b.faction) {
      return a.faction.localeCompare(b.faction);
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Find a defender preset by ID.
 */
export function getDefenderPresetById(id: string): DefenderPreset | undefined {
  return DEFENDER_PRESETS.find((p) => p.id === id);
}

// ============================================================================
// Faction List
// ============================================================================

/**
 * Get all factions as an array of { value, label } for dropdown options.
 */
export function getFactionOptions(): Array<{ value: Faction; label: string }> {
  return Object.values(Faction).map((f) => ({
    value: f,
    label: FACTION_LABELS[f],
  }));
}
```

**Verify:**
- `getAttackerPresets()` returns all presets sorted
- `getAttackerPresets(Faction.GalacticEmpire)` returns only Empire presets
- `getAttackerPresetById('empire-vader-lightsaber')` returns the Vader preset
- `getDefenderPresets(Faction.SeparatistAlliance)` returns only Separatist defender presets
- `getDefenderPresetById('nonexistent')` returns `undefined`
- `getFactionOptions()` returns 5 entries with value/label pairs

---

## Step 5B.4 — Create Data Index File

**File:** `src/data/index.ts`

Re-export all preset data and helpers from a single entry point.

```ts
// Types
export { Faction, FACTION_LABELS } from './presets';
export type {
  AttackerPreset,
  DefenderPreset,
  AttackerPresetProfile,
  DefenderPresetProfile,
} from './presets';

// Preset data
export { ATTACKER_PRESETS } from './attackerPresets';
export { DEFENDER_PRESETS } from './defenderPresets';

// Helpers
export {
  getAttackerPresets,
  getAttackerPresetById,
  getDefenderPresets,
  getDefenderPresetById,
  getFactionOptions,
} from './presetHelpers';
```

---

## Step 5B.5 — Write Unit Tests for Preset Data and Helpers

**File:** `src/data/presetHelpers.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import {
  getAttackerPresets,
  getAttackerPresetById,
  getDefenderPresets,
  getDefenderPresetById,
  getFactionOptions,
} from './presetHelpers';
import { ATTACKER_PRESETS } from './attackerPresets';
import { DEFENDER_PRESETS } from './defenderPresets';
import { Faction } from './presets';

describe('preset data integrity', () => {
  it('all attacker presets have unique IDs', () => {
    const ids = ATTACKER_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all defender presets have unique IDs', () => {
    const ids = DEFENDER_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all attacker presets have a valid faction', () => {
    const validFactions = Object.values(Faction);
    for (const preset of ATTACKER_PRESETS) {
      expect(validFactions).toContain(preset.faction);
    }
  });

  it('all defender presets have a valid faction', () => {
    const validFactions = Object.values(Faction);
    for (const preset of DEFENDER_PRESETS) {
      expect(validFactions).toContain(preset.faction);
    }
  });

  it('all presets have non-empty names', () => {
    for (const preset of [...ATTACKER_PRESETS, ...DEFENDER_PRESETS]) {
      expect(preset.name.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('getAttackerPresets', () => {
  it('returns all presets when no faction is specified', () => {
    const presets = getAttackerPresets();
    expect(presets.length).toBe(ATTACKER_PRESETS.length);
  });

  it('filters by faction', () => {
    const empirePresets = getAttackerPresets(Faction.GalacticEmpire);
    expect(empirePresets.length).toBeGreaterThan(0);
    expect(empirePresets.every((p) => p.faction === Faction.GalacticEmpire)).toBe(true);
  });

  it('returns empty array for faction with no presets', () => {
    // All factions should have presets in MVP, but test the filtering logic
    const all = getAttackerPresets();
    const byFaction = Object.values(Faction).reduce(
      (sum, f) => sum + getAttackerPresets(f).length,
      0
    );
    expect(byFaction).toBe(all.length);
  });

  it('returns sorted results', () => {
    const presets = getAttackerPresets();
    for (let i = 1; i < presets.length; i++) {
      const prev = presets[i - 1];
      const curr = presets[i];
      if (prev.faction === curr.faction) {
        expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0);
      }
    }
  });
});

describe('getAttackerPresetById', () => {
  it('finds a preset by ID', () => {
    const preset = getAttackerPresetById('empire-vader-lightsaber');
    expect(preset).toBeDefined();
    expect(preset?.name).toBe('Darth Vader (Lightsaber)');
  });

  it('returns undefined for unknown ID', () => {
    expect(getAttackerPresetById('nonexistent')).toBeUndefined();
  });
});

describe('getDefenderPresets', () => {
  it('returns all presets when no faction is specified', () => {
    const presets = getDefenderPresets();
    expect(presets.length).toBe(DEFENDER_PRESETS.length);
  });

  it('filters by faction', () => {
    const rebelPresets = getDefenderPresets(Faction.RebelAlliance);
    expect(rebelPresets.length).toBeGreaterThan(0);
    expect(rebelPresets.every((p) => p.faction === Faction.RebelAlliance)).toBe(true);
  });
});

describe('getDefenderPresetById', () => {
  it('finds a preset by ID', () => {
    const preset = getDefenderPresetById('sep-aat-def');
    expect(preset).toBeDefined();
    expect(preset?.name).toBe('AAT Tank');
  });

  it('returns undefined for unknown ID', () => {
    expect(getDefenderPresetById('unknown')).toBeUndefined();
  });
});

describe('getFactionOptions', () => {
  it('returns 5 factions', () => {
    const options = getFactionOptions();
    expect(options.length).toBe(5);
  });

  it('each option has value and label', () => {
    const options = getFactionOptions();
    for (const opt of options) {
      expect(opt.value).toBeDefined();
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });
});
```

**File:** `src/data/presets.test.ts`

Test that preset profiles type-check against the engine config by simulating what `loadPreset` does:

```ts
import { describe, it, expect } from 'vitest';
import { ATTACKER_PRESETS } from './attackerPresets';
import { DEFENDER_PRESETS } from './defenderPresets';
import { useAttackConfigStore } from '../stores/attackConfigStore';
import { useDefenseConfigStore } from '../stores/defenseConfigStore';

describe('preset loading integration', () => {
  it('loads every attacker preset without error', () => {
    for (const preset of ATTACKER_PRESETS) {
      useAttackConfigStore.getState().reset();
      expect(() => {
        useAttackConfigStore.getState().loadPreset(preset.id, preset.profile);
      }).not.toThrow();
    }
  });

  it('loads every defender preset without error', () => {
    for (const preset of DEFENDER_PRESETS) {
      useDefenseConfigStore.getState().reset();
      expect(() => {
        useDefenseConfigStore.getState().loadPreset(preset.id, preset.profile);
      }).not.toThrow();
    }
  });

  it('attacker preset values are reflected in store', () => {
    useAttackConfigStore.getState().loadPreset('empire-vader-lightsaber', {
      redDice: 6,
      pierceX: 3,
      impactX: 3,
    });

    const state = useAttackConfigStore.getState();
    expect(state.redDice).toBe(6);
    expect(state.pierceX).toBe(3);
    expect(state.impactX).toBe(3);
    expect(state.blackDice).toBe(0);  // Not in preset → default
  });

  it('defender preset values are reflected in store', () => {
    useDefenseConfigStore.getState().loadPreset('sep-aat-def', {
      armorX: 2,
      shieldedX: 2,
    });

    const state = useDefenseConfigStore.getState();
    expect(state.armorX).toBe(2);
    expect(state.shieldedX).toBe(2);
    expect(state.deflect).toBe(false);  // Not in preset → default
  });
});
```

**Verify:**
- All tests pass: `npm test -- --run src/data/`
- Every preset can be loaded into its respective store without errors
- Data integrity checks pass (unique IDs, valid factions, non-empty names)

---

## Verification Checklist

After completing all steps, confirm:

| Check | Command / Action |
|-------|-----------------|
| TypeScript compiles | `npx tsc --noEmit` passes with no errors |
| All store tests pass | `npm test -- --run src/stores/` |
| All data tests pass | `npm test -- --run src/data/` |
| Attack store defaults | All numeric fields = 0, booleans = false, enums = None/default |
| Defense store defaults | `dieColor` = White, `minisInLOS` = 1, all keywords = 0/false |
| Attack type default | `AttackType.All` |
| Results store default | `result: null`, `loading: false`, `error: null` |
| Preset loading | Loading a preset applies values + resets non-preset fields |
| Reset clears everything | After `reset()`, all fields match defaults, preset selection = null |
| `getFullConfig()` | Returns `AttackConfig`-shaped object without UI fields |
| Faction filtering | `getAttackerPresets(Faction.GalacticEmpire)` returns only Empire presets |
| Preset lookup | `getAttackerPresetById(id)` returns correct preset or undefined |
| No circular deps | Imports flow: `data/presets` ← stores ← `data/presetHelpers` (no cycles) |

---

## Files Created in This Phase

| File | Purpose |
|------|---------|
| `src/data/presets.ts` | Faction enum, preset type definitions |
| `src/stores/attackConfigStore.ts` | Zustand store for attacker config |
| `src/stores/defenseConfigStore.ts` | Zustand store for defender config |
| `src/stores/attackTypeStore.ts` | Zustand store for attack type selection |
| `src/stores/resultsStore.ts` | Zustand store for simulation results |
| `src/stores/configSelectors.ts` | `getFullConfig()` and `useFullConfig()` selectors |
| `src/stores/index.ts` | Store module re-exports |
| `src/stores/attackConfigStore.test.ts` | Attack store unit tests |
| `src/stores/defenseConfigStore.test.ts` | Defense store unit tests |
| `src/stores/attackTypeStore.test.ts` | Attack type store unit tests |
| `src/stores/resultsStore.test.ts` | Results store unit tests |
| `src/stores/configSelectors.test.ts` | Config selector tests |

> **Note:** Phase 5B files (`attackerPresets.ts`, `defenderPresets.ts`, `presetHelpers.ts`, `data/index.ts`, preset tests) are replaced by Phase 5.5. See Phase 5.5 for the files created in that phase.

---

## Dependency Graph (Within Phase 5)

```
engine/types.ts (Phase 2A — read-only dependency)
       │
       ▼
data/presets.ts (5A.1 — types + Faction enum)
       │
       ▼
stores/attackConfigStore.ts (5A.2)
stores/defenseConfigStore.ts (5A.3)
stores/attackTypeStore.ts (5A.4)
stores/resultsStore.ts (5A.5)
       │
       ▼
stores/configSelectors.ts (5A.6)
       │
       ▼
stores/index.ts (5A.7)

                    ║
                    ▼
         Phase 5.5 (Unit Data & Upgrades)
           ├── Preset data replaces 5B
           ├── Modifies stores (5A.2, 5A.3)
           └── Modifies configSelectors (5A.6)
```

**Implementation Order:**

1. **5A.1** — Preset types (needed by both stores and Phase 5.5)
2. **5A.2–5A.5** — All four stores (can be done in parallel)
3. **5A.6** — Config selectors (depends on stores)
4. **5A.7** — Store index
5. **5A.8** — Store tests
6. **Phase 5.5** — Unit data layer, upgrade system, preset generation (replaces 5B)
