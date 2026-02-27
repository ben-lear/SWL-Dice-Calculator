# Phase 21 — List Analyzer Simulation-Driven Stats with Defender Profile

## Overview

Replace the list analyzer's deterministic dice-weighting columns with full Monte Carlo simulation results. Each unit × range band gets **two** independent 5,000-iteration simulations:

1. **Standard simulation** ("Wounds" column, blue) — identical to main simulator logic with zero bonus tokens. Represents baseline combat output against the configured defender.
2. **Adjusted simulation** ("Adj. Wounds" column, amber) — same simulation with auto-incorporated token-generating keywords (Tactical X, Independent Aim/Surge/Dodge X, Target X, Cache Aim/Surge/Dodge X, Observe X). Represents realistic combat output accounting for the unit's self-buffing capabilities.

Both columns display `totalWounds.mean` from their respective `SimulationResult`.

A full **Defender Profile panel** appears below the army list and detail panels, reusing the existing `DefenderPanel` component tree via React context injection and a separate Zustand store. The defender defaults to "no defense dice, no cover, no keywords" (matching the current defense store defaults). Users can configure any defensive profile and click "Re-analyze" to re-run all simulations.

Simulation runs immediately on list import. Duplicate units (same unit + same upgrades) are deduplicated — only one set of simulations runs, and results are shared across identical copies.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Analysis mode | Full Monte Carlo simulation | User explicitly requested full simulation over deterministic EV estimation. Captures all keyword interactions including random reroll outcomes, surge conversion chains, and defense dice variance. |
| Iterations per job | 5,000 | ~1% noise on means. With deduplication, typical army = 40–80 unique jobs at ~40ms each ≈ 2–4s total. |
| Two columns | Standard sim (no bonus tokens) vs. Adjusted sim (with bonus tokens) | Isolates the impact of token-generating keywords. "Wounds" shows what the main simulator would output; "Adj. Wounds" shows the list analyzer's value-add from automatic keyword incorporation. |
| Trigger on import | Auto-run immediately | No pre-simulation phase. Users see a loading state for ~2–4s after import, then full simulation results. |
| Trigger on defender change | Manual "Re-analyze" button | Avoids ~2–4s recomputation on every defender slider tick. Visual stale indicator shows when results are outdated. |
| Defender panel reuse | React context injection + store factory | Zero component duplication. Existing `DefenderPanel` subtree auto-wires to the list analyzer's independent store via context. |
| Defender store | Independent `useListDefenderStore` via `createDefenseStore()` factory | List analyzer and main simulator don't interfere with each other. |
| Attack-type restrictions | Disabled in list analyzer defender | The list analyzer defender applies to all attack types simultaneously (overrun, melee, ranged), so all keyword controls must remain enabled. |
| Deduplication | Fingerprint: `unitId + ":" + sortedUpgradeIds` | Units with identical base definition and upgrades produce identical simulation results. 6× Phase I Clones → 1 simulation set. |
| Batch protocol | New `'batch'` worker message type | Single roundtrip for all ~70 jobs. Worker processes sequentially; results return atomically. No partial-result complexity. |
| Pre-existing deterministic stats | Preserved but not displayed | `parseListJson()` still computes `resolvedList.stats` internally. UI reads only from `simulatedStats` / `simulatedUnitResults` in the list store. |

---

## Current State

- **List analyzer exists** (Phase 20): Two-panel layout with JSON import, army stats, unit details, and "Simulate as Attacker/Defender" navigation buttons.
- **Deterministic EV columns**: "Expected" uses raw die-color success rates. "Adjusted" uses `estimateExpectedAttackSuccesses()` with auto-incorporated tokens from `extractAdjustedTokens()`.
- **No simulation in list analyzer**: All stats are computed synchronously at import time via `aggregateArmyStats()` in `src/data/armyStats.ts`.
- **No defender profile**: The list analyzer has no concept of a defensive target. All metrics are attack-output-only.
- **Single-flight worker client**: `SimulationWorkerClient` tracks one pending request. No batch support.
- **Defense store is monolithic**: `useDefenseConfigStore` is a single Zustand store with no factory pattern. Module-level `_savedDefenderUBSnapshot` variable prevents independent instances.
- **`DefenderPanel` calls `useDefenseConfigStore` directly**: 4 import + 4 hook calls across 4 component files (each uses `const store = useDefenseConfigStore()` full-store pattern). No indirection layer for store injection.
- **`useDefenderKeywordDisabled`** reads from `useAttackTypeStore` — always applies attack-type restrictions. No override mechanism.

---

## Architecture

### Data Flow

```
User pastes JSON → Import button
  │
  ▼
listStore.importList(json)
  ├── parseListJson(json) → ResolvedList { meta, units, stats }
  └── set resolvedList (stats are deterministic, computed eagerly)
  │
  ▼
useListAnalyzerSimulation hook detects resolvedList change
  │
  ▼
buildListSimulationJobs(units, defenderConfig)
  ├── Fingerprint each unit: unitId + ":" + sortedUpgradeIds
  ├── For first occurrence of each fingerprint:
  │     └── buildUnitRangeBandConfigs(unit, upgrades, defenderConfig)
  │           ├── categorizeUpgrades() → weapon pools per range band
  │           ├── normalizeToEngineWeapon() → engine WeaponProfile[]
  │           ├── Expand mini multiplicity (baseMiniCount copies, etc.)
  │           ├── Build TWO AttackerConfigs per band:
  │           │     ├── standardConfig: weapons + surgeChart + combat keywords + ZERO tokens
  │           │     └── adjustedConfig: same + bonus tokens from extractAdjustedTokens()
  │           └── Assemble AttackConfig = { attacker, defender: defenderConfig, attackType }
  ├── Generate BatchJob[] with jobIds: "fp-{fingerprint}-{band}-std" / "-adj"
  └── Return { jobs, jobMapping, diceCounts }
  │
  ▼
BatchSimulationClient.runBatch(jobs, 5000 iterations each)
  │ ← postMessage('batch', { jobs }) → Web Worker
  │
  ▼ (Worker thread — sequential, non-blocking to main thread)
For each job: simulate(config, 5000)
  ├── executeAttackSequence() × 5000
  │     ├── formAttackPool → rollAttackDice → rerollAttackDice
  │     ├── convertAttackSurges → modifyAttackDice
  │     ├── dodgeCover → rollDefenseDice → defenseSurges
  │     └── compareResults → { totalWounds, hitsBeforeDefense, critsBeforeDefense, ... }
  └── computeStatsSummary → SimulationResult
  │
  ▼ ← postMessage('batch-result', { results }) → Main thread
  │
Parse results using jobMapping:
  ├── expectedSuccesses = stdResult.totalWounds.mean
  ├── adjustedExpectedSuccesses = adjResult.totalWounds.mean
  ├── Merge into RangeBandDice[] per unit (preserving dice counts)
  ├── Duplicates share results via jobMapping
  └── aggregateSimulatedArmyStats(units, perUnitDice) → ArmyStats
  │
  ▼
listStore.setSimulatedResults(stats, perUnitResults)
  │
  ▼
UI renders simulation-derived stats in ArmyStatsView / UnitDetailView
```

### Defender Change Flow

```
User modifies defender config (die color, cover, keywords, etc.)
  │
  ▼
useListDefenderStore state updates
  │
  ▼
useListAnalyzerSimulation detects change → listStore.markSimulationStale()
  │
  ▼
UI shows stale indicator on "Re-analyze" button (amber outline)
  │
  ▼
User clicks "Re-analyze"
  │
  ▼
runSimulation() → same flow as import (rebuilds all jobs with new defenderConfig)
```

### File Map

```
src/
├── engine/
│   ├── index.ts                              MODIFIED — export BatchSimulationClient + BatchJob
│   └── worker/
│       ├── protocol.ts                       MODIFIED — add batch request/response types
│       ├── simulation.worker.ts              MODIFIED — add 'batch' case handler
│       └── batchSimulationClient.ts          NEW — batch-aware worker client
├── stores/
│   ├── defenseConfigStore.ts                 MODIFIED — extract createDefenseStore() factory
│   ├── listDefenderStore.ts                  NEW — independent defense config for list analyzer
│   ├── listStore.ts                          MODIFIED — add simulation state fields + actions
│   └── configSelectors.ts                    MODIFIED — add getListDefenderConfig() helper
├── data/
│   ├── armyStats.ts                          MODIFIED — add buildUnitRangeBandConfigs(), buildListSimulationJobs(), aggregateSimulatedArmyStats()
│   └── listTypes.ts                          NOT MODIFIED — RangeBandDice reused with new semantics
├── hooks/
│   ├── useListAnalyzerSimulation.ts          NEW — simulation lifecycle hook
│   ├── useKeywordDisabled.ts                 MODIFIED — add disableAttackTypeRestrictions support
│   └── useDefenderStoreContext.ts            NEW — React context for defender store injection
├── components/
│   ├── DefenderPanel/
│   │   ├── DefenderPanel.tsx                 MODIFIED — use context-based store access; extract DefenderPanelContent
│   │   ├── DefenderCustomPoolView.tsx        MODIFIED — use context-based store access
│   │   ├── DefenderDefenseSection.tsx        MODIFIED — use context-based store access
│   │   └── DefenderUnitBuilderView.tsx       MODIFIED — use context-based store access
│   └── ListAnalyzer/
│       ├── ListAnalyzerPage.tsx              MODIFIED — add defender panel + re-analyze button
│       ├── DetailPanel.tsx                   MODIFIED — read simulation results from store
│       ├── ArmyStatsView.tsx                 MODIFIED — accept isSimulated prop
│       ├── UnitDetailView.tsx                MODIFIED — accept simulated dice data prop
│       └── RangeDiceTable.tsx                MODIFIED — dynamic column labels
```

---

## Prerequisite Knowledge

### Existing Simulation Pipeline

The main simulator uses `SimulationWorkerClient.run(config, iterations)` which posts a single `'run'` message to the Web Worker. The worker calls `simulate(config, iterations)` which loops `executeAttackSequence(config)` N times, collecting wound counts into typed arrays. `computeStatsSummary()` and `computeDistribution()` produce the full `SimulationResult`.

Each `SimulationResult` contains `StatsSummary` objects for: `totalWounds`, `hitsBeforeDefense`, `critsBeforeDefense`, `guardianWounds`, `mainTargetWounds`, `deflectWounds`, `djemSoWounds`. Each `StatsSummary` has `mean`, `median`, `mode`, `min`, `max`, `standardDeviation`.

The worker client uses a "latest wins" design — calling `run()` while a previous request is pending silently supersedes it (old promise never resolves).

### Token-Generating Keywords

`extractAdjustedTokens()` in `src/data/armyStats.ts` reads resolved unit + upgrade keywords and maps them to bonus tokens:

| Source Keyword | Bonus Token |
|----------------|-------------|
| Tactical X | `aimTokens += X` |
| Independent: Aim X | `aimTokens += X` |
| Independent: Aim or Dodge X | `aimTokens += X` |
| Target X | `aimTokens += X` |
| Cache: Aim X | `aimTokens += X` |
| Observe X | `observationTokens += X` |
| Independent: Surge X | `surgeTokens += X` |
| Cache: Surge X | `surgeTokens += X` |
| Independent: Dodge X | `dodgeTokensAttacker += X` |
| Cache: Dodge X | `dodgeTokensAttacker += X` |

> **Simplification:** `Independent: Aim or Dodge X` is treated as providing aim tokens only (not dodge). This matches the actual `extractAdjustedTokens()` implementation — for offensive analysis purposes, aim tokens have higher value than dodge tokens.

The **standard** simulation uses zero for all of these. The **adjusted** simulation populates them.

### Weapon Data Layer Gap

Data-layer weapons (`src/data/types.ts`) use `Partial<WeaponKeywords>` and include `minRange`/`maxRange`. Engine weapons (`src/engine/types.ts`) use fully-required `WeaponKeywords` and have no range fields. The bridge function `normalizeToEngineWeapon()` in `src/data/upgradeApplicator.ts` converts between them by filling keyword defaults and stripping range/display fields.

### WorkerLike Interface Constraint

`simulationWorkerClient.ts` defines a `WorkerLike` interface where `postMessage(message: SimulationRequest)` only accepts `SimulationRequest` — not the full `WorkerRequest` union. To support sending `BatchSimulationRequest`, the interface must be widened to `postMessage(message: WorkerRequest): void`. This is a **breaking change** to the existing `SimulationWorkerClient` constructor type signature. The fix is straightforward: change the parameter type and update any tests that construct a `WorkerLike` mock.

### Defense Store Module-Level State

`defenseConfigStore.ts` has a module-level `let _savedDefenderUBSnapshot` variable that stores Unit Builder state during mode toggle. This prevents multiple independent store instances from the same module. Extracting a `createDefenseStore()` factory with closure-scoped snapshot variables solves this.

---

## Wireframes

### Desktop — After Import (Loading State)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  [🎲]  Just Roll Crits                            [Simulator]  [List Analyzer] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌── Army List ────────────────────┐  ┌── Details ─────────────────────────┐   │
│  │                                 │  │                                    │   │
│  │  Din Bikes — 999pts  [✕ Clear]  │  │  ARMY OVERVIEW                     │   │
│  │                                 │  │                                    │   │
│  │  ▾ Commanders (2)               │  │  ┌──────┐ ┌──────┐ ┌──────┐      │   │
│  │  · Imperial Officer       50pts │  │  │  999 │ │  14  │ │  47  │      │   │
│  │  · Agent Kallus           90pts │  │  │ Pts  │ │ Act. │ │ Mini │      │   │
│  │  ▾ Corps (4)                    │  │  └──────┘ └──────┘ └──────┘      │   │
│  │  · Shoretroopers         78pts │  │                                    │   │
│  │  · Shoretroopers         78pts │  │  ▾ Dice Output by Range            │   │
│  │  · ...                          │  │  ┌────────────────────────────┐    │   │
│  │                                 │  │  │  ⟳ Running simulations... │    │   │
│  │                                 │  │  │                            │    │   │
│  │                                 │  │  └────────────────────────────┘    │   │
│  │                                 │  │                                    │   │
│  └─────────────────────────────────┘  └────────────────────────────────────┘   │
│                                                                                 │
│  ┌── Defender Profile ──────────────────────────────────────────────────────┐   │
│  │  ┌─ Custom Pool ─┬─ Unit Builder ─┐                [Re-analyze ⟳]      │   │
│  │  │               │                │                                     │   │
│  │  │  Defense Die: [None ▾]   Surge: [None ▾]   Minis in LOS: [1]       │   │
│  │  │                                                                      │   │
│  │  │  ▸ Cover                                                             │   │
│  │  │  ▸ Tokens                                                            │   │
│  │  │  ▸ Keywords                                                          │   │
│  └──┴──────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Desktop — Simulations Complete (Army Stats)

```
┌── Details ─────────────────────────────────────────────────────┐
│                                                                │
│  ARMY OVERVIEW                                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │  999 │ │  14  │ │  47  │ │  84  │ │ ~112 │ │ ~8.9 │      │
│  │ Pts  │ │ Act. │ │ Mini │ │Wound │ │Eff.Wd│ │Pt/EWd│      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
│                                                                │
│  ▾ Dice Output by Range                                        │
│  Range│ 🔴  ⚫  ⚪  Dice│ Wounds │ Adj. Wounds                │
│  Melee│  2   4   0    6 │   3.2  │   3.2                      │
│  R1   │  4  12   8   24 │  10.4  │  12.1                      │
│  R2   │  4  12   4   20 │   8.6  │  10.3                      │
│  R3   │  4   8   4   16 │   6.8  │   8.2                      │
│  R4   │  0   6   0    6 │   2.1  │   2.4                      │
│                                                                │
│  ▾ Units by Rank                                               │
│  Rank  │ Count │ Points │   % │ Wnd % │Adj.Wnd%│ Efficiency   │
│  Cmdr  │     2 │    140 │ 14% │   12% │    11% │  0.79×       │
│  Corps │     4 │    312 │ 31% │   38% │    40% │  1.29×       │
│  ...                                                           │
│                                                                │
│  ▾ Anti-Armor Tech                                             │
│  ...                                                           │
└────────────────────────────────────────────────────────────────┘
```

### Desktop — Unit Detail View (Simulated)

```
┌── Details ─────────────────────────────────────────────────────┐
│                                                                │
│  [← Army Stats]                                                │
│                                                                │
│  DIN DJARIN — The Mandalorian                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│  │  105   │ │   1    │ │  1 fig │ │   ⬜   │ │  None  │      │
│  │ Points │ │ Health │ │ Minis  │ │Def. Die│ │Def.Surg│      │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                                │
│  ─── Keywords ─────────────────────────────────────────        │
│  Bounty · Gunslinger · Impervious · Independent: Surge 1       │
│                                                                │
│  ─── Weapons ──────────────────────────────────────────        │
│  IB-94 Blaster Pistol       R1-2   ◆◆ (2B) Pierce 1          │
│  Amban Phase-Pulse Blaster  R1-4   ◆◆◆ (2R,1W) Pierce 1      │
│                                                                │
│  ─── Dice Output by Range ─────────────────────────────        │
│  Range│ 🔴  ⚫  ⚪  Dice│Wounds│Adj.Wd│Wnd %│Adj %│Effic.    │
│  R1   │  4   4   1    9 │  5.1 │  5.8 │ 49% │ 48% │ 1.12×   │
│  R2   │  4   4   1    9 │  5.1 │  5.8 │ 59% │ 56% │ 1.31×   │
│  R3   │  2   0   1    3 │  1.6 │  1.6 │ 24% │ 20% │ 0.46×   │
│  R4   │  2   0   1    3 │  1.6 │  1.6 │ 76% │ 67% │ 1.56×   │
│                                                                │
│  ─── Equipped Upgrades ────────────────────────────────        │
│  ☑ Din's Jetpack  10pts  ☑ Beskar Spear  10pts                │
│  ────────────────────────────────────────────                  │
│  Total: 128pts (105 + 23 upgrades)                             │
│                                                                │
│  [ ⚔️ Simulate as Attacker ]  [ 🛡 Simulate as Defender ]     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Defender Panel — Stale Indicator

After changing defender config without re-analyzing:

```
┌── Defender Profile ──────────────────────────────────────────────────┐
│  ┌─ Custom Pool ─┬─ Unit Builder ─┐              ┌────────────────┐ │
│  │               │                │              │ ⚠ Re-analyze ⟳│ │
│  │  Defense Die: [White ▾]  Surge: [Block ▾]     │  (outdated)    │ │
│  │                                                └────────────────┘ │
│  │  ▾ Cover                                                         │
│  │     Cover: [Heavy ▾]   Cover X: [0]   Smoke: [0]                │
│  │  ▸ Tokens                                                        │
│  │  ▸ Keywords                                                       │
└──┴───────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Batch Protocol Messages

**File:** `src/engine/worker/protocol.ts`

Add three new types and extend the discriminated unions:

```typescript
// New request
export interface BatchSimulationRequest {
  type: 'batch';
  id: string;
  jobs: Array<{ jobId: string; config: AttackConfig; iterations: number }>;
}

// New responses
export interface BatchSimulationResponse {
  type: 'batch-result';
  id: string;
  results: Array<{ jobId: string; result: SimulationResult }>;
}

export interface BatchSimulationError {
  type: 'batch-error';
  id: string;
  error: string;
}

// Updated unions
export type WorkerRequest = SimulationRequest | CancelRequest | BatchSimulationRequest;
export type WorkerResponse = SimulationResponse | SimulationError | SimulationProgress
  | BatchSimulationResponse | BatchSimulationError;
```

### Step 2: Worker Batch Handler

**File:** `src/engine/worker/simulation.worker.ts`

Add `'batch'` case to the switch statement:

```typescript
case 'batch': {
  try {
    const results: Array<{ jobId: string; result: SimulationResult }> = [];
    for (const job of message.jobs) {
      const result = simulate(job.config, job.iterations);
      results.push({ jobId: job.jobId, result });
    }
    const response: WorkerResponse = {
      type: 'batch-result',
      id: message.id,
      results,
    };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = {
      type: 'batch-error',
      id: message.id,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
  break;
}
```

### Step 3: Batch Worker Client

**File:** `src/engine/worker/batchSimulationClient.ts` (NEW)

Class modeled on `SimulationWorkerClient` with request-ID staleness tracking:

```typescript
export interface BatchJob {
  jobId: string;
  config: AttackConfig;
  iterations: number;
}

export class BatchSimulationClient {
  private worker: WorkerLike;
  private currentRequestId: string | null = null;
  private pendingResolve: ((results: Map<string, SimulationResult>) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;
  private requestCounter = 0;

  constructor(injectedWorker?: WorkerLike);

  runBatch(jobs: BatchJob[]): Promise<Map<string, SimulationResult>>;
  terminate(): void;

  private handleMessage(message: WorkerResponse): void;  // handles 'batch-result' and 'batch-error'
}
```

Key behavior:
- `runBatch()` generates a unique request ID, stores resolve/reject, posts `BatchSimulationRequest`
- `handleMessage()` matches `'batch-result'`/`'batch-error'` by ID, resolves/rejects
- New `runBatch()` supersedes prior pending (same "latest wins" pattern)
- Uses the same worker file as the existing client (both message types handled by one worker)
- Import the same `WorkerLike` interface from `simulationWorkerClient.ts` (after widening `postMessage` to accept `WorkerRequest`)

**Prerequisite:** Step 1 must widen `WorkerLike.postMessage` from `SimulationRequest` to `WorkerRequest` in `simulationWorkerClient.ts`. Update any existing tests that construct mock `WorkerLike` objects.

Export from `src/engine/index.ts`:
```typescript
export { BatchSimulationClient } from './worker/batchSimulationClient';
export type { BatchJob } from './worker/batchSimulationClient';
```

### Step 4: Defense Store Factory

**File:** `src/stores/defenseConfigStore.ts` (MODIFIED)

Extract the store creation into a factory function with a closure-scoped snapshot variable:

```typescript
// Before:
let _savedDefenderUBSnapshot: Record<string, unknown> | null = null;
export const useDefenseConfigStore = create<DefenseConfigState>((set) => ({ ... }));

// After:
export function createDefenseStore() {
  let _savedUBSnapshot: Record<string, unknown> | null = null;

  const store = create<DefenseConfigState>((set) => ({
    ...DEFAULT_DEFENSE_CONFIG,
    // ... all same fields and actions, but reference _savedUBSnapshot (closure) instead of module-level var
  }));

  // Attach test helpers
  (store as unknown as Record<string, unknown>)._getSnapshot = () => _savedUBSnapshot;
  (store as unknown as Record<string, unknown>)._clearSnapshot = () => { _savedUBSnapshot = null; };

  return store;
}

// Backward-compatible: the main simulator's store
export const useDefenseConfigStore = createDefenseStore();

// Existing test helpers delegate to the main store's closure
export function _getDefenderUBSnapshot() { ... }
export function _clearDefenderUBSnapshot() { ... }
```

**Critical:** All references to `_savedDefenderUBSnapshot` inside the store actions (`setActiveMode`, `reset`) must use the closure variable `_savedUBSnapshot`, not a module-level variable.

Also export `DEFAULT_DEFENSE_CONFIG` (currently not exported) — needed by the list defender store and for constructing blank defender configs.

### Step 5: List Defender Store

**File:** `src/stores/listDefenderStore.ts` (NEW)

```typescript
import { createDefenseStore } from './defenseConfigStore';

export const useListDefenderStore = createDefenseStore();

/** @internal Test cleanup */
export function _clearListDefenderSnapshot() {
  (useListDefenderStore as unknown as Record<string, unknown>)._clearSnapshot?.();
}
```

Independent store instance — modifying it has no effect on `useDefenseConfigStore` and vice versa.

### Step 6: Extend List Store

**File:** `src/stores/listStore.ts` (MODIFIED)

Add simulation state fields and actions:

```typescript
interface ListState {
  // ... existing fields ...

  // Simulation state
  simulatedStats: ArmyStats | null;
  simulatedUnitResults: Map<number, RangeBandDice[]> | null;
  simulationLoading: boolean;
  simulationError: string | null;
  simulationStale: boolean;

  // Simulation actions
  setSimulatedResults: (stats: ArmyStats, unitResults: Map<number, RangeBandDice[]>) => void;
  setSimulationLoading: (loading: boolean) => void;
  setSimulationError: (error: string | null) => void;
  markSimulationStale: () => void;
  clearSimulationResults: () => void;

  // ... existing actions ...
}
```

Initial values: `null`, `null`, `false`, `null`, `false`.

`clearList()` also clears all simulation state. `importList()` clears simulation results (new import = new simulation needed).

### Step 7: Defender Store Context

**File:** `src/hooks/useDefenderStoreContext.ts` (NEW)

Placed in `src/hooks/` (not `src/components/`) to avoid a reverse dependency: `useKeywordDisabled.ts` (a hook) needs to import `useDisableAttackTypeRestrictions`, and hooks should not depend on component-layer modules.

```typescript
import { createContext, useContext } from 'react';
import { useDefenseConfigStore, type DefenseConfigState } from '../stores/defenseConfigStore';
import type { StoreApi, UseBoundStore } from 'zustand';

export interface DefenderStoreContextValue {
  useStore: UseBoundStore<StoreApi<DefenseConfigState>>;
  disableAttackTypeRestrictions?: boolean;
}

export const DefenderStoreContext = createContext<DefenderStoreContextValue>({
  useStore: useDefenseConfigStore,
  disableAttackTypeRestrictions: false,
});

export function useDefenderStore(): DefenseConfigState {
  const { useStore } = useContext(DefenderStoreContext);
  return useStore();
}

export function useDefenderStoreApi() {
  const { useStore } = useContext(DefenderStoreContext);
  return useStore;
}

export function useDisableAttackTypeRestrictions(): boolean {
  const { disableAttackTypeRestrictions } = useContext(DefenderStoreContext);
  return disableAttackTypeRestrictions ?? false;
}
```

**Note:** `useDefenderStore()` returns the full store object (no selector) to match the existing consumption pattern in all 4 DefenderPanel component files. The default context value points to `useDefenseConfigStore`, so the main simulator page works without any provider.

### Step 8: Refactor Defender Panel Store Access

**Files:** `DefenderPanel.tsx`, `DefenderCustomPoolView.tsx`, `DefenderDefenseSection.tsx`, `DefenderUnitBuilderView.tsx`

Mechanical replacement across 8 lines (4 imports + 4 hook calls). Each file currently uses the full-store pattern `const store = useDefenseConfigStore()`:

```typescript
// Before (in each of 4 files):
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
const store = useDefenseConfigStore();

// After:
import { useDefenderStore } from '../../hooks/useDefenderStoreContext';
const store = useDefenderStore();
```

Downstream `store.property` and `store.action()` usages remain unchanged — they operate on the same returned state object.

The default context value points to `useDefenseConfigStore`, so the main simulator page works unchanged without any provider.

**Impact on `DefenderPanel.test.tsx`:** The test file has ~15 direct `useDefenseConfigStore.getState()` calls for setup and assertions. These continue to work unchanged because the default context points to the same store. New tests for the list analyzer's defender panel will need to wrap components in a `DefenderStoreContext.Provider` with `useListDefenderStore`.

### Step 9: Attack-Type Restrictions Override

**File:** `src/hooks/useKeywordDisabled.ts` (MODIFIED)

Modify `useDefenderKeywordDisabled` to accept an optional override:

```typescript
import { useDisableAttackTypeRestrictions } from './useDefenderStoreContext';

export function useDefenderKeywordDisabled(): (field: string) => boolean {
  const attackType = useAttackTypeStore((s) => s.attackType);
  const disabled = useDisableAttackTypeRestrictions();

  return (field: string): boolean => {
    if (disabled) return false;  // All keywords enabled in list analyzer
    const restriction = DEFENDER_KEYWORD_RESTRICTIONS[field];
    if (!restriction) return false;
    return !isFieldActiveForAttackType(restriction, attackType);
  };
}
```

When `disableAttackTypeRestrictions` is `true` (list analyzer context), all keyword controls remain enabled regardless of attack type.

### Step 10: Build Simulation Configs

**File:** `src/data/armyStats.ts` (MODIFIED)

#### 10a: `buildUnitRangeBandConfigs()`

```typescript
export interface UnitRangeBandConfig {
  rangeBand: string;
  standardConfig: AttackConfig;  // zero bonus tokens — standard simulation
  adjustedConfig: AttackConfig;  // with bonus tokens from extractAdjustedTokens()
  redDice: number;
  blackDice: number;
  whiteDice: number;
  totalDice: number;
}

export function buildUnitRangeBandConfigs(
  unit: ResolvedUnit,
  upgrades: ResolvedUpgrade[],
  defenderConfig: DefenderConfig,
): UnitRangeBandConfig[]
```

**Implementation outline:**
1. Get `attackSurge` from unit
2. Call `categorizeUpgrades(unit, upgrades)` → weapon pools
3. Merge unit + upgrade keywords, call `extractAdjustedTokens()` → bonus tokens
4. For each of 7 range bands:
   a. Determine eligible weapons via `weaponCoversRange()`
   b. Apply weapon selection logic (same as `computeUnitDiceByRange`): best weapon for base minis, upgrade mini groups, grenades, other upgrade weapons, Gunslinger
   c. Convert each contributing weapon via `normalizeToEngineWeapon()` to engine `WeaponProfile`
   d. Expand multiplicity: `baseMiniCount` copies of base weapon, `group.count` per upgrade mini group, 1 per grenade/other-upgrade weapon
   e. Set `enabled: true` on all weapons
   f. Build `AttackerConfig` base: `weapons`, `surgeChart`, combat keywords (`preciseX`, `sharpshooterX`, `arsenalX`, `marksman`, `jarKaiMastery`, `jediHunter`, `duelistAttacker`, `makashiMastery`, `deathFromAbove`, `holdTheLine`, `completeTheMission`)
   g. **Standard config**: `aimTokens: 0, surgeTokens: 0, observationTokens: 0, dodgeTokensAttacker: 0`
   h. **Adjusted config**: `aimTokens: bonusTokens.bonusAimTokens, ...` etc.
   i. Determine `attackType`: Overrun / Melee / Ranged
   j. Assemble `{ attacker, defender: defenderConfig, attackType }`
   k. Track dice counts for display
5. Skip bands where no weapons contribute (no entry in output array)

**Key reuse:** The weapon selection logic closely mirrors `computeUnitDiceByRange()`. Extract shared helpers to avoid duplication. Alternatively, refactor `computeUnitDiceByRange()` to return `contributedWeapons[]` with multiplicity counts so `buildUnitRangeBandConfigs()` can consume them.

#### 10b: `buildListSimulationJobs()`

```typescript
export interface ListSimulationJobSet {
  jobs: BatchJob[];
  jobMapping: Map<number, Map<string, { stdJobId: string; adjJobId: string }>>;
  diceCounts: Map<number, RangeBandDice[]>;
}

export function buildListSimulationJobs(
  units: ResolvedListUnit[],
  defenderConfig: DefenderConfig,
): ListSimulationJobSet
```

**Deduplication:**
1. For each unit, compute fingerprint: `resolvedUnit.id + ":" + resolvedUpgrades.filter(u => u != null).map(u => u.id).sort().join(",")`
2. Build `Map<fingerprint, { unitIdx: number; configs: UnitRangeBandConfig[] }>`
3. First occurrence per fingerprint → call `buildUnitRangeBandConfigs()`, generate `BatchJob[]`:
   - `jobId = "fp-{fingerprint}-{band}-std"` with `standardConfig`
   - `jobId = "fp-{fingerprint}-{band}-adj"` with `adjustedConfig`
4. All units with matching fingerprint → same `jobId` entries in `jobMapping`
5. `diceCounts` skeleton: `RangeBandDice[]` per unit with `redDice/blackDice/whiteDice/totalDice` filled, `expectedSuccesses = 0`, `adjustedExpectedSuccesses = 0`

#### 10c: `aggregateSimulatedArmyStats()`

```typescript
export function aggregateSimulatedArmyStats(
  units: ResolvedListUnit[],
  perUnitDice: Map<number, RangeBandDice[]>,
  meta: { commandCards?: string[]; contingencies?: string[] },
): ArmyStats
```

Mirrors `aggregateArmyStats()` but accepts pre-built per-unit dice data:
- Sums `redDice`, `blackDice`, `whiteDice`, `totalDice`, `expectedSuccesses`, `adjustedExpectedSuccesses` per range band across all units
- Computes all non-dice fields: `totalPoints`, `activationCount`, `totalWounds`, `totalEffectiveWounds`, `totalMiniatures`, `avgPointsPerEffectiveWound`
- Reuses existing helpers: `computeAntiArmorStats()`, `computeCoverDenialStats()`, `computeSuppressionStats()`, `computeDeploymentKeywords()`, `computeActionEconomy()`, `computeDefensiveProfile()`, `computeRankBreakdown()`, `computeCourageBreakdown()`, `computeEffectiveWounds()`
- Rank breakdown: sums per-rank `expectedSuccesses` and `adjustedExpectedSuccesses` from per-unit dice for contribution percentages
- Returns full `ArmyStats`

### Step 11: Simulation Lifecycle Hook

**File:** `src/hooks/useListAnalyzerSimulation.ts` (NEW)

```typescript
export function useListAnalyzerSimulation(): {
  runSimulation: () => void;
  simulationLoading: boolean;
  simulationError: string | null;
  simulationStale: boolean;
}
```

**Implementation:**
- Lazy-create `BatchSimulationClient` on first `runSimulation()` call (via `useRef`)
- `runSimulation()`:
  1. Guard: if no `resolvedList`, return
  2. Build `DefenderConfig` from `useListDefenderStore`: read state → `selectDefenderConfig()` → `applyDefenderUpgrades()` (pass `AttackType.Ranged` as default since attack type varies per band — the per-band configs use correct attack types internally). **Edge case:** Defender upgrades with melee-specific conditional effects (e.g. melee surge:block) would resolve under ranged rules. This is acceptable because the per-band `AttackConfig` sets the correct `attackType` for the engine simulation, and very few defender upgrades have attack-type-conditional behavior.
  3. `buildListSimulationJobs(units, defenderConfig)` → `{ jobs, jobMapping, diceCounts }`
  4. `listStore`: `setSimulationLoading(true)`, `setSimulationError(null)`, `clearSimulationResults()`
  5. `batchClient.runBatch(jobs)` with 5,000 iterations per job
  6. **On success:** For each unit index, for each range band:
     - Look up `jobMapping[unitIdx][rangeBand]` → `{ stdJobId, adjJobId }`
     - `stdResult = results.get(stdJobId)`, `adjResult = results.get(adjJobId)`
     - `expectedSuccesses = stdResult.totalWounds.mean`
     - `adjustedExpectedSuccesses = adjResult.totalWounds.mean`
     - `attackingEfficacy = totalDice > 0 ? expectedSuccesses / totalDice : 0`
     - Merge into `diceCounts[unitIdx]` skeleton
  7. `aggregateSimulatedArmyStats(units, perUnitDice, meta)` → `ArmyStats`
  8. `listStore.setSimulatedResults(armyStats, perUnitDice)`
  9. `listStore.setSimulationLoading(false)`
  10. **On error:** `setSimulationError(message)`, `setSimulationLoading(false)`

- **Auto-trigger on import:** `useEffect` watches `resolvedList` — when it transitions from `null` to non-null (or changes identity), call `runSimulation()`
- **Stale marking:** Subscribe to `useListDefenderStore` — when any state changes and `resolvedList` exists, call `listStore.markSimulationStale()`
- **Cleanup:** `useEffect` cleanup calls `batchClient.terminate()` on unmount

### Step 12: Update ListAnalyzerPage Layout

**File:** `src/components/ListAnalyzer/ListAnalyzerPage.tsx` (MODIFIED)

```tsx
export default function ListAnalyzerPage() {
  const resolvedList = useListStore((s) => s.resolvedList);
  const { runSimulation, simulationLoading, simulationStale } = useListAnalyzerSimulation();

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Top: existing two-panel grid */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[minmax(280px,1fr)_minmax(320px,2fr)]">
        <PanelShell title="Army List">
          <div className="space-y-4">
            <JsonImportSection />
            {resolvedList && <UnitListPanel />}
          </div>
        </PanelShell>

        <PanelShell title="Details">
          <DetailPanel />
        </PanelShell>
      </div>

      {/* Bottom: Defender Profile panel (only when list imported) */}
      {resolvedList && (
        <DefenderStoreContext.Provider value={{ useStore: useListDefenderStore, disableAttackTypeRestrictions: true }}>
          <PanelShell
            title="Defender Profile"
            headerRight={
              <ReAnalyzeButton
                onClick={runSimulation}
                loading={simulationLoading}
                stale={simulationStale}
              />
            }
          >
            <DefenderPanelContent />
          </PanelShell>
        </DefenderStoreContext.Provider>
      )}
    </div>
  );
}
```

**`ReAnalyzeButton`** — small inline component or extracted to `ListAnalyzer/`:
- Default state: "Re-analyze" button (gray)
- Loading: disabled + spinner
- Stale: amber outline + "Results outdated" subtitle text

**Note:** `PanelShell` needs a `headerRight` prop (does not exist yet). Add `headerRight?: ReactNode` to `PanelShellProps` and render it inline in the header bar.

**Nested PanelShell fix:** `DefenderPanel` currently renders its own `<PanelShell title="Defender" collapsible>` wrapper internally. To avoid double-nested title bars in the list analyzer, extract a `DefenderPanelContent` component that renders everything *inside* the PanelShell (mode selector, preset section, custom pool view, defense section, unit builder view, unit cost spinner). The main simulator continues using `<DefenderPanel>` (which wraps `DefenderPanelContent` in its own `PanelShell`). The list analyzer uses `<DefenderPanelContent>` inside the list analyzer's own `PanelShell title="Defender Profile">`.

### Step 13: Update DetailPanel

**File:** `src/components/ListAnalyzer/DetailPanel.tsx` (MODIFIED)

```tsx
export default function DetailPanel() {
  const resolvedList = useListStore((s) => s.resolvedList);
  const selectedIndex = useListStore((s) => s.selectedUnitIndex);
  const showArmyStats = useListStore((s) => s.showArmyStats);
  const showArmyOverview = useListStore((s) => s.showArmyOverview);
  const simulatedStats = useListStore((s) => s.simulatedStats);
  const simulatedUnitResults = useListStore((s) => s.simulatedUnitResults);
  const simulationLoading = useListStore((s) => s.simulationLoading);

  if (!resolvedList) { /* ... empty state ... */ }

  // Use simulation results when available, fallback to deterministic for non-dice fields
  const stats = simulatedStats ?? resolvedList.stats;
  const isSimulated = simulatedStats !== null;

  if (showArmyStats) {
    return (
      <>
        {simulationLoading && <LoadingOverlay />}
        <ArmyStatsView stats={stats} meta={resolvedList.meta} isSimulated={isSimulated} />
      </>
    );
  }

  if (selectedIndex !== null && selectedIndex >= 0 && selectedIndex < resolvedList.units.length) {
    const unit = resolvedList.units[selectedIndex];
    const unitDice = simulatedUnitResults?.get(selectedIndex);
    return (
      <>
        {simulationLoading && <LoadingOverlay />}
        <UnitDetailView
          unit={unit}
          armyStats={stats}
          simulatedDiceByRange={unitDice}
          isSimulated={isSimulated}
          onBackToArmy={() => showArmyOverview()}
        />
      </>
    );
  }

  /* ... fallback ... */
}
```

### Step 14: Update ArmyStatsView

**File:** `src/components/ListAnalyzer/ArmyStatsView.tsx` (MODIFIED)

Accept `isSimulated?: boolean` prop, forward to `RangeDiceTable`:

```tsx
<RangeDiceTable data={stats.diceByRange} isSimulated={isSimulated} />
```

In the "Units by Rank" table, update column headers when `isSimulated`:
- "Exp. Dice %" → "Wnd %" 
- "Adj. Dice %" → "Adj. Wnd %"

### Step 15: Update UnitDetailView

**File:** `src/components/ListAnalyzer/UnitDetailView.tsx` (MODIFIED)

Accept new props:

```tsx
interface UnitDetailViewProps {
  unit: ResolvedListUnit;
  armyStats: ArmyStats;
  simulatedDiceByRange?: RangeBandDice[];
  isSimulated?: boolean;
  onBackToArmy: () => void;
}
```

When `simulatedDiceByRange` is provided, use it instead of calling `computeUnitDiceByRange()`:

```tsx
const diceByRange = simulatedDiceByRange ?? computeUnitDiceByRange(resolved, upgrades);
```

Forward `isSimulated` to `RangeDiceTable`.

### Step 16: Update RangeDiceTable

**File:** `src/components/ListAnalyzer/RangeDiceTable.tsx` (MODIFIED)

Accept `isSimulated?: boolean` prop. Update column headers and tooltips:

```tsx
// Column headers
const expectedHeader = isSimulated ? 'Wounds' : 'Expected';
const adjustedHeader = isSimulated ? 'Adj. Wounds' : 'Adjusted';
const expContribHeader = isSimulated ? 'Wnd %' : 'Exp. Dice %';
const adjContribHeader = isSimulated ? 'Adj. Wnd %' : 'Adj. Dice %';

// Tooltips
const expectedTooltip = isSimulated
  ? 'Mean wounds dealt per attack (standard simulation — no automatic token bonuses).'
  : TOOLTIPS.expectedSuccesses;
const adjustedTooltip = isSimulated
  ? 'Mean wounds dealt per attack (adjusted simulation — includes automatic token generation from Tactical, Independent, Target, Cache, Observe).'
  : TOOLTIPS.adjustedExpectedSuccesses;
```

### Step 17: Populate `sharpshooterX`

**File:** `src/data/armyStats.ts` (MODIFIED)

In `buildAttackerConfigForEstimation()` and `buildUnitRangeBandConfigs()`, populate `sharpshooterX` from merged keywords:

```typescript
sharpshooterX: getNumericKeyword(mergedKeywords, 'sharpshooterX'),
```

(also used for `arsenalX`, `preciseX`, etc.)

### Step 18: Config Selectors Helper

**File:** `src/stores/configSelectors.ts` (MODIFIED)

Add a helper for assembling a `DefenderConfig` from the list defender store:

```typescript
export function getListDefenderConfig(): DefenderConfig {
  const state = useListDefenderStore.getState();
  const baseConfig = selectDefenderConfig(state);
  // Apply equipped upgrades (using Ranged as default — per-band AttackConfigs set correct attackType
  // for the engine. Very few defender upgrades have attack-type-conditional effects.)
  return applyDefenderUpgrades(baseConfig, state.equippedUpgradeIds, AttackType.Ranged);
}
```

---

## Testing

### Engine / Worker Tests

**`src/engine/worker/protocol.test.ts`** (or inline type checks):
- Verify `BatchSimulationRequest`, `BatchSimulationResponse`, `BatchSimulationError` types compile correctly
- Verify `WorkerRequest` / `WorkerResponse` unions include batch types

**`src/engine/worker/batchSimulationClient.test.ts`** (NEW):
- `runBatch()` with mock worker → returns `Map<jobId, SimulationResult>`
- Multiple `runBatch()` calls → only latest resolves (staleness tracking)
- Worker error → promise rejects with meaningful message
- `terminate()` → cleans up state

**`src/engine/worker/simulation.worker.test.ts`** (MODIFIED):
- `'batch'` message with 3 jobs → responds with `'batch-result'` containing 3 results
- `'batch'` message with error-producing config → responds with `'batch-error'`

### Data Layer Tests

**`src/data/armyStats.test.ts`** (MODIFIED):

`buildUnitRangeBandConfigs()`:
- Returns configs for bands with eligible weapons; skips empty bands
- `standardConfig.attacker.aimTokens === 0` (no bonus tokens)
- `adjustedConfig.attacker.aimTokens > 0` for a unit with Tactical keyword
- Both configs share same `defender` and `weapons`
- `attackType` is correct per band (Overrun/Melee/Ranged)
- Gunslinger doubles best ranged weapon in weapons array
- Multi-mini unit produces correct weapon multiplicity
- `sharpshooterX` populated from merged keywords

`buildListSimulationJobs()`:
- 6 identical units → 1 fingerprint → one set of jobs; all 6 unit indices map to same jobIds
- 2 same units with different upgrades → 2 fingerprints → two sets of jobs
- Unresolved units (resolvedUnit === null) are skipped
- `diceCounts` skeletons have correct dice values, zero success fields

`aggregateSimulatedArmyStats()`:
- Sums per-band values correctly across units
- Non-dice fields (totalPoints, totalWounds, etc.) computed correctly
- Rank breakdown includes correct wound-based contribution percentages

### Store Tests

**`src/stores/defenseConfigStore.test.ts`** (MODIFIED):
- `createDefenseStore()` returns a working store with all actions
- Two stores from `createDefenseStore()` are independent: modifying one doesn't affect the other
- Mode toggle snapshots are isolated per instance

**`src/stores/listDefenderStore.test.ts`** (NEW):
- Initial state matches `DEFAULT_DEFENSE_CONFIG` defaults
- `_clearListDefenderSnapshot()` works
- Independent from `useDefenseConfigStore` (modify list defender → main defender unchanged)

**`src/stores/listStore.test.ts`** (NEW):
- `setSimulatedResults()` stores stats and per-unit results
- `clearSimulationResults()` clears simulation state
- `markSimulationStale()` sets `simulationStale = true`
- `setSimulatedResults()` clears `simulationStale`
- `clearList()` clears simulation state
- `importList()` clears prior simulation results

### Hook Tests

**`src/hooks/useListAnalyzerSimulation.test.ts`** (NEW):
- Auto-triggers when `resolvedList` transitions from null to non-null
- Builds correct batch jobs from resolved list
- Result parsing: `stdResult.totalWounds.mean` → `expectedSuccesses`, `adjResult.totalWounds.mean` → `adjustedExpectedSuccesses`
- Deduplication: identical units produce fewer jobs
- Stale marking on defender store change (no auto re-run)
- Error handling: worker error → `simulationError` in store

### Component Tests

**`src/components/ListAnalyzer/RangeDiceTable.test.tsx`** (NEW or MODIFIED):
- `isSimulated={true}` → renders "Wounds" and "Adj. Wounds" headers
- `isSimulated={false}` → renders "Expected" and "Adjusted" headers

**`src/components/ListAnalyzer/ListAnalyzerPage.test.tsx`** (MODIFIED):
- Defender panel renders when list is imported
- "Re-analyze" button present
- Button disabled during `simulationLoading`
- Stale indicator visible when `simulationStale`

**`src/hooks/useDefenderStoreContext.test.ts`** (NEW):
- `useDefenderStore` reads from context-provided store
- Default context uses `useDefenseConfigStore`
- `useDisableAttackTypeRestrictions` returns context value

---

## Verification Checklist

1. `npm run typecheck` — 0 errors
2. `npm run lint` — 0 errors
3. `npm run test:run` — all existing + new tests pass
4. Manual verification:
   - [ ] Import army list → loading indicator appears → stats populate (~2–4s)
   - [ ] Default defender (no dice/cover): Wounds ≈ Adj. Wounds (no defense = all hits wound; only difference is bonus tokens boosting Adj.)
   - [ ] Unit with Tactical 1: Adj. Wounds > Wounds (extra aim token in adjusted sim)
   - [ ] Unit with no token-generating keywords: Adj. Wounds ≈ Wounds
   - [ ] Configure defender: White die + no surge → click Re-analyze → Wounds and Adj. Wounds both decrease
   - [ ] Configure: Red die + surge + Heavy cover → Re-analyze → ranged wounds drop significantly; melee/overrun unaffected by cover
   - [ ] Defender panel shows Custom Pool and Unit Builder modes
   - [ ] All defender keywords are enabled (no attack-type graying out)
   - [ ] Import list with 6 identical units → simulations complete faster than 6 unique units; all 6 show identical values
   - [ ] Select individual unit → detail view shows that unit's simulated values with contribution/efficiency columns
   - [ ] Contribution columns (Wnd %, Adj. Wnd %, Efficiency) compute correctly relative to army totals
   - [ ] Navigate to main simulator → defender config is completely independent
   - [ ] Stale indicator appears after changing defender without re-analyzing
   - [ ] Re-analyze clears stale indicator and updates all stats
   - [ ] Mobile layout: defender panel stacks below detail panel
5. `npm run test:e2e` — existing specs pass

---

## Performance Estimates

| Scenario | Unique Units | Range Bands/Unit | Jobs (×2 for std/adj) | Est. Time |
|----------|-------------|-------------------|----------------------|-----------|
| Small list (6 corps) | 1 (all identical) | ~4 active | 8 jobs | ~0.4s |
| Typical list (10 units, 4 unique) | 4 | ~5 avg | 40 jobs | ~1.6s |
| Large diverse list (14 units, 10 unique) | 10 | ~5 avg | 100 jobs | ~4s |
| Worst case (14 unique, all 7 bands) | 14 | 7 | 196 jobs | ~8s |

Times assume ~40ms per 5,000-iteration simulation on mid-range hardware.

---

## Risk & Mitigations

| Risk | Mitigation |
|------|-----------|
| Long simulation times for large diverse lists | Deduplication reduces typical job count by 30–60%. 5,000 iterations (vs. 10,000) halves time. Could add progress reporting via unused `SimulationProgress` protocol message. |
| Worker blocked during batch | Worker processes jobs sequentially — UI stays responsive. Consider splitting into smaller batch chunks with progress callbacks in future. |
| Memory pressure from large result maps | `SimulationResult` objects are ~2KB each (stats + distributions). 200 results ≈ 400KB — minimal. |
| Context-based store injection breaks tests | Default context points to `useDefenseConfigStore`. Tests that don't wrap in a provider behave exactly as before. `DefenderPanel.test.tsx` (~15 direct `useDefenseConfigStore.getState()` calls) continues working unchanged via the default context. |
| Defender config for keyword disabling | `useDisableAttackTypeRestrictions()` reads from React context (defined in `src/hooks/useDefenderStoreContext.ts`), which is only set in the list analyzer. Main simulator components get `false` (no override) by default. |
| Store count documentation | This plan brings the total to 6 stores (adding `useListDefenderStore`). Update `.github/instructions/stores.instructions.md` to document the new store. |
