# Stores & Hooks Instructions

> **Applies to:** `src/stores/**`, `src/hooks/**`

## Purpose

The state management layer holds all user-facing configuration, bridges stores to the engine via selectors, and manages simulation lifecycle.

## Store Architecture

Four independent Zustand stores — no middleware, no persistence, no devtools:

| Store | File | Responsibility |
|-------|------|----------------|
| `useAttackConfigStore` | `attackConfigStore.ts` | Attacker dice, tokens, keywords, weapons, upgrade bar, preset selection |
| `useDefenseConfigStore` | `defenseConfigStore.ts` | Defender die color, surge, cover, tokens, keywords, upgrade bar |
| `useAttackTypeStore` | `attackTypeStore.ts` | Attack type enum (Ranged/Melee/Hybrid/Overrun) |
| `useResultsStore` | `resultsStore.ts` | Simulation results — multi-slot (max 4), stale tracking, loading/error |

All stores use bare `create<StateType>((set, get) => ({...}))` — no middleware.

## State Shape: Engine Fields vs. UI-Only Fields

Each config store contains both **engine-relevant** fields (forwarded to `AttackerConfig`/`DefenderConfig`) and **UI-only** fields (used exclusively for the unit builder interface).

### Engine fields → stripped by `selectAttackerConfig()` / `selectDefenderConfig()`
These are the fields that become `AttackerConfig` or `DefenderConfig` for engine consumption.

### UI-only fields (NOT forwarded to engine)
```
selectedFaction, selectedPresetId, activeMode,
unitApiId, selectedUnitRank, selectedUnitType, selectedUnitAffiliation,
baseMiniatureCount, unitBaseWeapons[],
upgradeBar[], equippedUpgradeIds[], effectiveUpgradeBar[], grantedByIndex[],
weaponMiniCounts, builderKeywordOverrides
```

When adding new fields, decide which category they belong to and ensure `selectAttackerConfig()`/`selectDefenderConfig()` strip UI fields correctly.

## Selector Pipeline (`configSelectors.ts`)

The two-tier selector system merges all stores into the engine's `AttackConfig`:

### Tier 1: Store-Level Selectors
- `selectAttackerConfig(state)` — strips UI fields from attack store, returns engine `AttackerConfig`
- `selectDefenderConfig(state)` — strips UI fields from defense store, returns engine `DefenderConfig`

### Tier 2: Cross-Store Composition
Both `getFullConfig()` (imperative) and `useFullConfig()` (reactive hook) run the same pipeline:

```
selectAttackerConfig → applyAttackerUpgrades → rebuildWeaponsFromCounts → applyBuilderKeywordOverrides
selectDefenderConfig → applyDefenderUpgrades
→ { attacker, defender, attackType }
```

- **`getFullConfig()`** — reads `.getState()` from all 3 stores, non-reactive. Used imperatively in `useSimulation` hook.
- **`useFullConfig()`** — subscribes to individual field slices from all 3 stores via Zustand selectors, reactive. Used by components that need to display derived config.

These two functions **duplicate** the same upgrade → rebuild → override pipeline (~30 lines each). When modifying the pipeline, **update both**.

## Action Patterns

### Generic setter
```ts
setField: (field, value) => set({ [field]: value })
```
Used for single-field updates across both config stores.

### Weapon actions (attack store)
`setWeaponDice()`, `setWeaponKeyword()`, `setWeaponEnabled()`, `addWeapon()`, `removeWeapon()` — always produce a new weapons array (immutable).

### Preset loading
`loadPreset(id, profile, upgradeBar, ...)` — resets to defaults, applies preset overrides, initializes the upgrade bar. Triggers `recomputeEffectiveUpgradeBar()`.

### Upgrade equipping
`equipUpgrade(slotIndex, upgradeId)` — updates `equippedUpgradeIds`, calls `recomputeEffectiveUpgradeBar()` (from `upgradeBarHelpers.ts`), recalculates `unitCost`.

### Mode switching (snapshot/restore)
`setActiveMode('custom' | 'unit-builder')` — **snapshots** unit-builder state to a module-level variable when switching away, **restores** it when switching back.

> ⚠️ Module-level `let` variables (`_savedAttackerUBSnapshot`, `_savedDefenderUBSnapshot`) store these snapshots outside Zustand's tracking. In tests, call `_clearSnapshot()` between test cases.

## Results Store

Multi-slot architecture supporting up to 4 saved simulation results:

| Field | Type | Purpose |
|-------|------|---------|
| `slots` | `ResultSlot[]` | Array of saved results with labels and color assignments |
| `viewedSlotId` | `string \| null` | Currently displayed slot |
| `loading` | `boolean` | Simulation in progress |
| `error` | `string \| null` | Last error message |
| `stale` | `boolean` | Config changed since last simulation |

Slot IDs and sim numbers use module-level counters (`nextSlotId`, `nextSimNumber`).

## `useSimulation` Hook

The primary hook for triggering simulation:

1. Subscribes to all 3 input stores for stale-detection
2. Snapshots config via `getFullConfig()` (non-reactive read)
3. Dispatches to `SimulationWorkerClient` (Web Worker)
4. On success: calls `resultsStore.appendResult()`
5. On error: calls `resultsStore.setError()`
6. Checks `hasDice()` guard — calls `clearAll()` if pool is empty

### Stale tracking
When any config store field changes after results exist, the hook calls `markStale()`. This includes UI-only fields (limitation of subscribing to entire stores).

## Dead/Stub Files

These files in `src/stores/` are Phase 5.5 stubs **superseded** by `src/data/` modules. Do not extend them — the real upgrade/preset system lives in `src/data/`:

| File | Status |
|------|--------|
| `defenseTypes.ts` | Stub types — real types in `src/data/types.ts` |
| `defensePresetHelpers.ts` | Hardcoded sample data — real presets from `src/data/presetGenerator.ts` |
| `defenseUpgradeHelpers.ts` | Stub CRUD — real upgrades from `src/data/upgradeResolver.ts` |
| `defenseUpgradeApplicator.ts` | Stub merge — real applicator in `src/data/upgradeApplicator.ts` |
| `defenseStoreHelpers.ts` | Stub bridge — uses `defensePresetHelpers.ts` (stub data) |

## Anti-Patterns to Avoid

1. **Full-store subscriptions** — Always use a selector:
   ```ts
   // ❌ Bad: subscribes to ALL state changes
   const store = useAttackConfigStore();
   
   // ✅ Good: subscribes only to needed fields
   const aimTokens = useAttackConfigStore((s) => s.aimTokens);
   ```

2. **Engine calls in stores** — Engine functions are called in `configSelectors.ts` and `useSimulation.ts`, never in store actions.

3. **Duplicating derived state** — Don't compute wounds/probabilities in stores. The engine computes results; the results store just holds the output.

## Adding a New Store Field

1. Add the field to the store's state interface and initial state.
2. If engine-relevant: ensure `selectAttackerConfig()`/`selectDefenderConfig()` includes it.
3. If UI-only: ensure the selector strips it.
4. If it affects the upgrade pipeline: update both `getFullConfig()` and `useFullConfig()`.
5. Add a test for the new field's initial value and setter.
