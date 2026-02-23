# Engine Layer Instructions

> **Applies to:** `src/engine/**`

## Purpose

The engine is the **pure game-logic** layer — it models the full Star Wars: Legion attack sequence (Steps 2–9), runs Monte Carlo simulation, and provides deterministic EV estimation. It has **zero** React, Zustand, or browser dependencies.

## Module → Attack Step Mapping

| Game Step | Module | Key Function(s) |
|-----------|--------|-----------------|
| Step 2: Form Attack Pool | `attackPool.ts` | `formAttackPool()`, `aggregateWeaponKeywords()` |
| Step 4a: Upgrade/Downgrade Dice | `dice.ts` | `upgradeAttack()`, `downgradeAttack()` |
| Step 4b: Roll Attack Dice | `attackRoll.ts` | `rollAttackDice()` |
| Step 4c: Reroll (Aim, Observation, Precise, Marksman) | `attackRoll.ts`, `marksmanDecision.ts` | `rerollAttackDice()`, `makeMarksmanDecision()` |
| Step 4d: Convert Attack Surges (Critical X, Jedi Hunter, Chart, Surge Tokens) | `attackSurges.ts` | `convertAttackSurges()` |
| Step 4d.5: Marksman Conversions | `attackSurges.ts` | Inline within surge conversion |
| Step 4d.6: Jar'Kai Mastery | `attackSurges.ts` | Inline within surge conversion |
| Step 5: Dodge & Cover | `dodgeCover.ts`, `cover.ts` | `applyDodgeAndCover()`, `rollCoverPool()` |
| Step 6: Modify Attack Dice (Impact, Armor, Shielded, Guardian, Ram, Lethal) | `attackModifiers.ts` | `modifyAttackDice()` |
| Step 6b–7: Roll Defense Dice (Danger Sense, Soresu, Uncanny Luck, Impervious) | `defenseRoll.ts` | `rollDefenseDice()`, `gatherGuardianDefense()` |
| Step 7e: Convert Defense Surges (Chart, Deflect, Block, Hold the Line) | `defenseSurges.ts` | `convertDefenseSurges()` |
| Step 8: Modify Defense Dice | `defenseModifiers.ts` | `modifyDefenseDice()` |
| Step 9: Compare Results (Pierce, Immune Pierce, Deflect/Shien, Djem So, Wounds) | `compareResults.ts` | `compareResults()` |
| Orchestrator | `attackSequence.ts` | `executeAttackSequence()` |

## Dual Analysis Modes

1. **Monte Carlo** (`simulator.ts`): Runs `executeAttackSequence()` N times, collects wound arrays, computes `StatsSummary` + distributions via `simulatorStats.ts`.
2. **Deterministic EV** (`woundEstimation.ts`): Uses die probability math to estimate expected wounds without randomness. Consumed by the Marksman decision engine.

## Key Patterns

### Pure functions, no classes
Every combat step is a standalone exported function with explicit inputs and outputs. The only class is `SimulationWorkerClient` at the worker boundary — not game logic.

### Immutable die cloning
Functions that modify dice arrays always clone first:
```ts
const workingResults = results.map(d => ({ ...d }));
```
Never mutate input arrays.

### Randomness localized to `dice.ts`
`rollAttackDie()` and `rollDefenseDie()` in `dice.ts` are the **only** sources of randomness. All other functions are deterministic given their inputs.

### Clamping, never throwing
The engine uses `Math.max(0, ...)` to prevent negative values at every step. Engine functions **never throw**. Wounds, blocks, pierce counts, etc. are always clamped to >= 0.

### Worker boundary
`src/engine/worker/` contains the Web Worker infrastructure:
- `protocol.ts` — Message types (`SimulationRequest`, `SimulationResponse`)
- `simulation.worker.ts` — Worker entry point (receives messages, calls `simulate()`)
- `simulationWorkerClient.ts` — Promise-based client with request-ID staleness tracking

The worker boundary is the **only** place where browser APIs (`Worker`, `self.onmessage`) are used. `performance.now()` in `simulator.ts` is allowed (available in both browser and Worker contexts).

## Test Helpers (`testHelpers.ts`)

Always use these factory functions in engine tests — never construct raw config objects by hand:

| Factory | Purpose |
|---------|---------|
| `createMinimalAttacker(overrides?)` | Full `AttackerConfig` with sensible defaults |
| `createMinimalDefender(overrides?)` | Full `DefenderConfig` with sensible defaults |
| `createMinimalWeapon(overrides?)` | `WeaponProfile` — accepts nested `keywords` partial |
| `createAttackerWithWeapon(weaponOvr?, unitOvr?)` | Single-weapon attacker convenience helper |
| `createMinimalPoolKeywords(overrides?)` | `AggregatedWeaponKeywords` for step functions |

Usage pattern:
```ts
const attacker = createAttackerWithWeapon(
  { redDice: 5, keywords: { pierceX: 2 } },
  { surgeChart: AttackSurgeChart.ToCrit, aimTokens: 1 }
);
const defender = createMinimalDefender({ armorX: 1, dieColor: DefenseDieColor.Red });
```

## Strict Constraints

- **No React imports** — not even types.
- **No Zustand/store access** — all data comes through function parameters.
- **No DOM/browser APIs** — exception: Worker boundary files only.
- **No global mutable state** — no module-level `let` variables.
- **No `throw` statements** — clamp and continue.
- **Always use enum members** — `AttackSurgeChart.ToCrit`, never `'to-crit'`.

## Rules Reference

When a game rule interaction is ambiguous, consult `rulebook_markdown/` (especially `06-keyword-glossary/`). If still unclear, preserve existing engine/test behavior and note the assumption in a test comment.

## Adding a New Engine Feature

1. Identify which attack step owns the behavior.
2. Add types to `types.ts` if new config fields are needed.
3. Implement in the owning step module as a pure function.
4. Wire into `attackSequence.ts` orchestrator.
5. Ensure `woundEstimation.ts` handles the new path if it affects EV calculations.
6. Add focused unit tests using `testHelpers.ts` factories.
7. Verify `simulator.ts` exercises the new code path (it calls `executeAttackSequence()`).
8. Export new public API from `index.ts` if needed.
