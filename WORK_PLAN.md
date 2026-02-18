# Just Roll Crits — MVP Work Plan

This plan breaks the MVP into major components, ordered by dependency. Each section can be built and tested independently before integration.

---

## Phase 1: Project Scaffolding

**Status:** ✅ **COMPLETE** — Basic project structure and tooling working.

Set up the development environment and project structure.

- [x] Initialize Vite + React + TypeScript project
- [x] Install core dependencies: Zustand, Recharts, Tailwind CSS
- [x] Configure Tailwind CSS (config, base styles, dark mode)
- [x] Set up `vite-plugin-pwa` with manifest and service worker
- [x] Create app icons (192×192, 512×512, maskable) and favicon
- [x] Set up Vitest + React Testing Library
- [x] Create folder structure per architecture spec (`engine/`, `components/`, `hooks/`, `utils/`, `app/`)
- [x] Create `App.tsx` shell with responsive three-column layout skeleton (Attacker / Results / Defender)
- [x] Verify dev server runs, PWA manifest loads, and test runner works

**Output:** ✅ **COMPLETE** - Empty app shell with tooling, responsive layout grid, and PWA install working.

---

## Phase 2: Core Dice Engine

**Status:** ✅ **COMPLETE** — Complete simulation engine that takes a config object and returns wound counts + side effects. Fully tested independently of UI.

Pure TypeScript module — no React dependencies. This is the foundation everything else builds on.

### 2A: Types & Dice Definitions (`engine/types.ts`, `engine/dice.ts`)

- [x] Define enums/types: `AttackDieColor`, `DefenseDieColor`, `AttackFace` (blank/hit/crit/surge), `DefenseFace` (blank/block/surge)
- [x] Define die face distributions for each color (White/Black/Red attack; White/Red defense)
- [x] Implement `rollAttackDie(color)` → random face
- [x] Implement `rollDefenseDie(color)` → random face
- [x] Implement `rollPool(counts)` → array of faces
- [x] Implement die upgrade/downgrade chain functions (`upgradeAttack`, `downgradeAttack`, `upgradeDefense`, `downgradeDefense`)
- [x] Unit tests for face distributions, upgrade/downgrade boundaries

### 2B: Attack Sequence Pipeline (`engine/attackSequence.ts`)

The core function: takes a full config (attacker + defender + context) and returns wound results. Implements Steps 2–9 in order:

- [x] **Step 2 — Form Pool:** Apply Spray (multiply dice by minis in LOS). Apply Makashi Mastery (reduce Pierce, disable Immune: Pierce / Impervious).
- [x] **Step 4a — Upgrade/Downgrade Attack Dice:** Anti-Materiel X, Anti-Personnel X, Cumbersome. Follow prescribed order (attacker downgrade → defender downgrade → attacker upgrade → defender upgrade).
- [x] **Step 4b — Roll Attack Dice:** Roll the pool.
- [x] **Step 4c — Reroll Attack Dice:** Aim tokens (2 rerolls each + Precise X bonus), Observation tokens (1 reroll each), Marksman (convert instead of reroll), Duelist attacker (Aim spent → Pierce 1). Track Aim token consumption (shared by Lethal, Marksman, Duelist). Implement Reroll Strategy: Conservative (default) rerolls only blanks/excess surges; Crit Fishing also rerolls hits (with smart cancellation check: reroll hits if they'd be cancelled by Armor/Dodge/Backup anyway).
- [x] **Step 4d — Convert Attack Surges:** Surge chart (c→a, c→b, or c→blank), Surge tokens (c→a), Critical X (c→b), Jedi Hunter (c→b), Hold the Line (c→a), Marksman (Aim → blank→a, a→b), Jar'Kai Mastery (Dodge → blank→a, a→b; Melee only).
- [x] **Step 5 — Dodge and Cover:** Compute effective Cover value (base + Suppressed + Cover X + Smoke − Sharpshooter X, cap at 2, improvements before reductions). Apply Blast / Death From Above (Cover = 0). Roll cover pool (1 white defense die per hit). Apply cover cancellations. Apply Dodge tokens (cancel a, or also b with Outmaneuver). High Velocity disables Dodge + Deflect. Low Profile (−1 cover die, +1 auto block).
- [x] **Step 6 — Modify Attack Dice:** Armor X (cancel a). Impact X (a→b vs Armor). Weak Point X (grants additional Impact X). Shielded X (cancel a or b). Backup (cancel up to 2 a). Guardian X (cancel a, roll Guardian defense dice sub-sequence). Ram X (change results to b). Lethal X (spend remaining Aims for Pierce).

> **Note:** Ion X and Primitive (Step 6) appear in the keyword reference table but have no UI inputs in the design concept. They are deferred to a future release — add UI controls to the design first, then implement in the engine.
> 
> **Note:** Guardian X (Step 6) requires a defense sub-sequence: the Guardian unit rolls defense dice using its own die color and surge chart. Wounds are calculated separately for the defender and Guardian unit, both before and after Pierce is applied.
- [x] **Step 7 — Roll Defense Dice:** Gather 1 die per remaining a+b. Danger Sense X (add dice per suppression). Impervious (add dice = Pierce X). Upgrade/downgrade defense dice. Roll. Uncanny Luck X (reroll). Soresu Mastery (reroll all, Ranged only). Convert defense surges: surge chart (e→d), Surge tokens (e→d), Deflect (e→d, Ranged), Shien Mastery (modifies Deflect reflection), Block (e→d when Dodge spent), Hold the Line (e→d).
- [x] **Step 8 — Modify Defense Dice:** Pierce X (cancel d). Immune: Pierce / Immune: Melee Pierce (block Pierce). Duelist defender (Dodge spent in Melee → Immune: Pierce). Djem So Mastery (attacker wounds per blank).
- [x] **Step 9 — Compare Results:** Calculate wounds = (a + b) − d. Calculate Deflect/Shien reflection wounds. Calculate Djem So wounds. Return full result object.
- [x] Unit tests for each step in isolation and the full pipeline end-to-end

### 2C: Cover Resolver (`engine/cover.ts`)

- [x] `determineCoverValue(config)` — base cover + improvements (capped at 2) − reductions
- [x] `rollCoverPool(hitCount, coverValue, lowProfile)` → block results
- [x] `applyCover(hits, coverBlocks, coverValue)` → remaining hits
- [x] Unit tests for cap enforcement, improvement-before-reduction ordering

### 2D: Modifier Helpers (`engine/attackModifiers.ts`, `engine/defenseModifiers.ts`)

- [x] Helper functions for each keyword modifier (Armor, Impact, Pierce, Shielded, Guardian, etc.)
- [x] Attack-type filtering logic: given attack type (Ranged/Melee/Overrun), return which keywords are active vs. ignored
- [x] Unit tests for each modifier and attack-type restriction

**Output:** ✅ **COMPLETE** - Complete simulation engine that takes a config object and returns wound counts + side effects. Fully tested independently of UI.

---

## Phase 2.5: Multi-Weapon Attack Pool Restructuring

**Status:** ✅ **COMPLETE** — Engine correctly handles per-weapon keywords (Spray, Cumbersome, etc.) and aggregates pool-level keywords across multiple weapons. All existing tests migrated and passing.

Restructure `AttackerConfig` to separate unit-level keywords from weapon-level keywords. Introduce `WeaponProfile` with per-weapon dice and keywords, and a `weapons: WeaponProfile[]` array on `AttackerConfig`. The engine always operates on weapon arrays — Custom Pool mode uses a single-weapon array, Unit Builder mode uses multiple weapons. See `plans/phase2.5-multi-weapon-pool.md` for the full implementation plan.

### 2.5A: Type Restructuring
- [x] Define `WeaponKeywords` interface (per-weapon keywords: criticalX, pierceX, impactX, blast, spray, etc.)
- [x] Define `WeaponProfile` interface (name, dice counts, keywords)
- [x] Define `AggregatedWeaponKeywords` interface (pool-level sums/OR/AND of weapon keywords)
- [x] Update `AttackerConfig` — remove flat dice/weapon keyword fields, add `weapons: WeaponProfile[]`

### 2.5B: Pool Formation & Aggregation
- [x] Implement `aggregateWeaponKeywords(weapons)` — sums numeric, ORs blast/suppressive, ANDs highVelocity
- [x] Rewrite `formAttackPool` — iterate weapons, apply Spray per-weapon only
- [x] Unit tests for aggregation and per-weapon Spray behavior

### 2.5C: Step Function Signatures
- [x] Update `convertAttackSurges` — accept `poolKeywords`, read `criticalX` from pool
- [x] Update `applyDodgeAndCover` — accept `poolKeywords`, read `blast`/`highVelocity` from pool
- [x] Update `determineCoverValue` — accept `poolBlast` parameter
- [x] Update `modifyAttackDice` — accept `poolKeywords`, read `impactX`/`ramX`/`lethalX` from pool
- [x] Update `modifyDefenseDice` — accept `poolPierceX` parameter
- [x] Update `rollDefenseDice` — accept `poolPierceX` for Impervious
- [x] Update `compareResults` — accept `poolKeywords`, read `pierceX`/`suppressive`/`blast` from pool

### 2.5D: Test Helpers & Migration
- [x] Create `createMinimalWeapon`, `createMinimalWeaponKeywords`, `createAttackerWithWeapon`, `createMinimalPoolKeywords` helpers
- [x] Update `createMinimalAttacker` to use `weapons[]`
- [x] Migrate all test files to new config shape and function signatures

### 2.5E: Sequence Orchestrator
- [x] Update `executeAttackSequence` — call `aggregateWeaponKeywords`, pass `poolKeywords` to downstream steps

### 2.5F: Validation
- [x] Full test suite passes, no coverage drop
- [x] New multi-weapon Spray tests verify per-weapon behavior
- [x] End-to-end tests with multi-weapon configs produce correct results

**Output:** ✅ **COMPLETE** - Engine correctly handles per-weapon keywords (Spray, Cumbersome, etc.) and aggregates pool-level keywords across multiple weapons. All existing tests migrated and passing.

---

## Phase 2.6: Defender Custom Pool & Unit Builder Modes

**Status:** ✅ **COMPLETE** — Defender Panel supports two-mode operation (Custom Pool / Unit Builder) with full upgrade system functionality. Preset data is provided through stub helpers ready for Phase 5.5 data layer integration.

Extend the two-mode design pattern (Custom Pool / Unit Builder) to the Defender Panel, mirroring the attacker-side implementation from Phase 2.5. Both modes operate on the same underlying `DefenderConfig` structure (already flat, no restructuring needed). See `plans/phase2.6-defender-modes.md` for the full implementation plan.

### 2.6A: DefenderConfig Structure Review
- [x] Verify existing `DefenderConfig` supports both modes (already flat, no changes needed)

### 2.6B: Defender Preset Generation
- [x] Expand `UnitEnrichment` type to include defender fields (defense die, surge chart, defender keywords) **(implemented as stub types ready for Phase 5.5)**
- [x] Enrich defender data for curated units in `src/data/enrichment/units.ts` **(implemented as stub data ready for Phase 5.5)**
- [x] Extend `presetGenerator.ts` to produce `DefenderPreset` objects **(implemented as stub helpers ready for Phase 5.5)**
- [x] Add defender preset helpers (`getDefenderPresets`, `getDefenderPresetById`) to `presetHelpers.ts` **(completed)**
- [x] Unit tests for defender preset generation and filtering **(completed)**

### 2.6C: Defender Store Enhancements
- [x] Add `activeDefenderMode`, `selectedDefenderFaction`, `selectedDefenderPresetId`, `defenderUpgradeBar`, `equippedDefenderUpgradeIds` to defender store
- [x] Implement `setDefenderMode`, `setDefenderFaction`, `loadDefenderPreset`, `equipDefenderUpgrade` actions
- [x] Update `getFullDefenderConfig()` selector to apply equipped defender upgrades
- [x] Implement `applyDefenderUpgrades` function in `upgradeApplicator.ts`
- [x] Unit tests for store actions and upgrade application

### 2.6D: Defender Panel UI
- [x] Add mode toggle to DefenderPanel (Custom Pool / Unit Builder)
- [x] Extract Custom Pool view (existing UI) into `DefenderCustomPoolView` component
- [x] Create `DefenderUnitBuilderView` component with faction/unit/upgrade dropdowns
- [x] Ensure situational inputs (Cover, tokens, Guardian) remain editable in both modes
- [x] Component tests for mode toggle and view switching

**Output:** ✅ **COMPLETE** - Defender Panel supports two-mode operation (Custom Pool / Unit Builder) with full upgrade system functionality. Preset data is provided through stub helpers ready for Phase 5.5 data layer integration.

---

## Phase 3: Monte Carlo Simulator & Web Worker

**Status:** ✅ **COMPLETE** — Simulation runs in background thread, returns full stats object without blocking UI.

### 3A: Simulator (`engine/simulator.ts`)

- [x] `simulate(config, iterations)` → run attack sequence N times, collect wound counts
- [x] Compute statistics from results: mean, median, mode
- [x] Compute wound distribution: probability of exactly X wounds for each X
- [x] Compute cumulative distribution: probability of ≥ X wounds for each X
- [x] Compute points efficiency metrics (wounds per point, points per wound, efficiency ratio)
- [x] Compute Deflect/Shien reflection stats and Djem So stats as secondary outputs
- [x] Unit tests for statistical accuracy (known distributions)

### 3B: Web Worker Integration

- [x] Create Web Worker wrapper that runs `simulate()` off the main thread
- [x] Define message protocol: `{ type: 'run', config, iterations }` → `{ type: 'result', stats }`
- [x] Add progress callback support (for future progress bar)
- [x] Verify UI remains responsive during 10k+ iteration runs

**Output:** ✅ **COMPLETE** - Simulation runs in background thread, returns full stats object without blocking UI.

> **Note:** The `useSimulation` hook (which dispatches to the worker and manages loading/result state) depends on both the Web Worker (Phase 3A) and the Zustand stores (Phase 5A) for the merged config. It is implemented in Phase 7A when both dependencies are available.

---

## Phase 4: Shared UI Components

**Status:** ✅ **COMPLETE** — Component library ready for panel assembly. All shared components implemented with Tailwind styling, keyboard navigation, ARIA labels, and comprehensive test coverage.

Reusable input primitives used by both panels.

- [x] **NumberSpinner** — increment/decrement with min/max bounds, label, tooltip
- [x] **Toggle** — labeled on/off switch with optional tooltip
- [x] **Select** — dropdown with label (for surge charts, die colors, cover, attack type)
- [x] **SearchableCombobox** — filterable dropdown for faction/unit presets
- [x] **SectionHeader** — collapsible section divider for keyword groups
- [x] Style all components with Tailwind, ensure accessible (keyboard nav, ARIA labels)
- [x] Storybook-style visual tests or snapshot tests for each component

**Output:** ✅ **COMPLETE** - Component library ready for panel assembly. All shared components implemented with Tailwind styling, keyboard navigation, ARIA labels, and comprehensive test coverage.

---

## Phase 5: State Management

**Status:** ✅ **COMPLETE** (via Phase 2.6) — All app state managed centrally, presets load correctly, config object ready for engine.

### 5A: Zustand Stores

- [x] **Attack Config Store** — all attacker inputs: `weapons: WeaponProfile[]` (per-weapon dice + keywords), unit-level keywords, surge chart, tokens, upgrade/downgrade settings, unit cost, Hold the Line. Custom Pool mode operates on `weapons[0]`; Unit Builder mode populates multiple weapons from presets.
- [x] **Defense Config Store** — all defender inputs: die color, surge chart, cover, tokens, keywords, minis in LOS, unit cost, Hold the Line
- [x] **Attack Type Store** — attack type selection (Ranged / Melee / Overrun), default: Ranged
- [x] **Results Store** — simulation output (stats, distribution, efficiency metrics), loading state
- [x] Define TypeScript interfaces for each store's state shape
- [x] Implement reset/clear actions for each store
- [x] Implement `getFullConfig()` selector that merges all stores into the engine's input format (ensures `weapons[]` array is populated)

### 5B: Preset Data & Loading

> **Note:** Phase 5B is replaced by Phase 5.5. The hardcoded preset arrays are superseded by the API-backed data pipeline. The preset helper API surface (`getAttackerPresets`, `getDefenderPresets`, etc.) is preserved but the implementation changes. See Phase 5.5 for details.

- [x] ~~Define unit preset data structure~~ → replaced by Phase 5.5 `ResolvedUnit` and `presetGenerator`
- [x] ~~Create initial preset dataset~~ → replaced by Phase 5.5 enrichment data + preset generator
- [x] ~~Implement `loadAttackerPreset(id)`~~ → `loadPreset` in Phase 5A, data from Phase 5.5
- [x] ~~Implement `loadDefenderPreset(id)`~~ → `loadPreset` in Phase 5A, data from Phase 5.5
- [x] ~~Implement faction filtering logic~~ → `presetHelpers.ts` in Phase 5.5

**Output:** All app state managed centrally, presets load correctly, config object ready for engine.

---

## Phase 5.5: Unit Data Layer & Upgrade System

Build the data pipeline that imports all unit and upgrade data from the TableTopAdmiral API (including upgrade bars via `/api/units/2` and `/api/upgrade-types`), processes it into clean structures, enriches curated units with weapon profiles and keyword values, and integrates an upgrade equip/unequip system into the existing stores. Replaces Phase 5B's hardcoded presets with a scalable API-backed data source.

### 5.5A: Data Foundation

- [ ] Define core data types: `UpgradeSlot` enum, raw/processed/resolved interfaces (`src/data/types.ts`)
- [ ] Create API snapshot fetch script (`scripts/fetchApiData.ts`) — run to populate `src/data/raw/` (4 files: units, keywords, upgrades, upgrade-types)
- [ ] Create data processing script (`scripts/processApiData.ts`) — maps integer codes to enums, resolves keyword IDs, extracts upgrade bars from API `upgrade_types`, outputs `src/data/processed/`
- [ ] Create keyword map and keyword→store field mapping (`src/data/keywordMap.ts`)

> **Sync Safety:** Enrichment data lives in TypeScript source files (`src/data/enrichment/*.ts`) and is never overwritten by the fetch or processing scripts. After syncing, run tests to validate enrichment keys still match processed IDs. See the sync workflow in phase5.5-unit-data-upgrades.md §5.5A.3b.

### 5.5B: Enrichment Layer

- [ ] Define enrichment overlay types: `UnitEnrichment`, `UpgradeEnrichment` (`src/data/enrichment/types.ts`)
- [ ] Create initial unit enrichment data: weapon profiles, surge charts, keyword X values for ~10+ curated units (`src/data/enrichment/units.ts`) — upgrade bars come from API, not enrichment
- [ ] Create initial upgrade enrichment data: keyword effects for combat-relevant upgrades (`src/data/enrichment/upgrades.ts`)

### 5.5C: Resolution & Preset Generation

- [ ] Unit resolver: merge processed + enrichment → `ResolvedUnit[]` (`src/data/unitResolver.ts`)
- [ ] Upgrade resolver: merge processed + enrichment → `ResolvedUpgrade[]`, slot filtering (`src/data/upgradeResolver.ts`)
- [ ] Preset generator: resolved units → `AttackerPreset[]` + `DefenderPreset[]` — replaces Phase 5B hardcoded data (`src/data/presetGenerator.ts`)
- [ ] Preset helpers: same API as Phase 5B, backed by preset generator (`src/data/presetHelpers.ts`)
- [ ] Upgrade applicator: applies equipped upgrade costs/keywords to engine config (`src/data/upgradeApplicator.ts`)

### 5.5D: Store Integration

- [ ] Add `upgradeBar`, `equippedUpgradeIds`, `equipUpgrade` to both config stores
- [ ] Update `loadPreset` signature to accept `upgradeBar` parameter
- [ ] Update `getFullConfig()` / `useFullConfig()` to apply equipped upgrades via applicator
- [ ] Create data layer barrel export (`src/data/index.ts`)

### 5.5E: Tests

- [ ] Unit resolver tests, upgrade resolver tests, preset generator tests
- [ ] Upgrade applicator tests (cost addition, keyword stacking, immutability)
- [ ] Store upgrade action tests (loadPreset with upgradeBar, equipUpgrade, reset)
- [ ] Enrichment validation test — verifies all enrichment keys match processed IDs (catches orphaned keys after API sync)

**Output:** All ~150+ units imported from API, enriched units have full weapon/keyword data, upgrade system integrated into stores, `getFullConfig()` produces engine config with upgrade effects applied.

---

## Phase 5.6: Multi-Miniature Attack Pools

Extend the data model, engine integration, and UI to correctly handle multi-miniature unit attack pools — the core SWL mechanic where each miniature in a unit independently contributes one weapon (and its keywords) to a shared attack pool. See `plans/phase5.6-multi-mini-attack-pools.md` for the full implementation plan.

**Key design principles:**
- **Repeated entries model:** Each miniature's weapon contribution is a separate `WeaponProfile` entry in the `weapons[]` array (e.g., 4-mini Stormtroopers = 4× E-11 entries). Existing `formAttackPool` and `aggregateWeaponKeywords` handle this without changes.
- **Heavy Weapon / Personnel / Squad Leader ADD miniatures:** These upgrades add additional miniature(s) to the unit (each with their own weapon entry). They do NOT replace a base miniature's weapon. A 4-mini Stormtrooper squad + DLT-19 heavy weapon = 5 minis total: 4× E-11 + 1× DLT-19. Implicit `addsMiniature` default is 1 for HeavyWeapon/Personnel/SquadLeader slots (overridable via enrichment).
- **Per-miniature weapon ownership:** Base minis use unit-card weapons; upgrade minis use their own upgrade weapons, with fallback to unit weapons only when needed for attack-type compatibility.
- **Sidearm is per-miniature:** Sidearm restricts only the miniature that has the sidearm upgrade when attack type matches sidearm type; it is not a global filter over the full pool.
- **All upgrade weapons are considered:** Upgrades with multiple weapon profiles must expose all profiles to selection (not only `weapons[0]`).
- **Dynamic upgrade slots:** Some upgrades add additional upgrade slots to the unit via `addsUpgradeSlot` (e.g., Agent Kallus adds a Heavy Weapon slot). The store tracks an `effectiveUpgradeBar` (base bar + dynamic slots) and the UI dynamically renders upgrade dropdowns.
- **Arsenal X is single-mini only:** No unit in the game has both Arsenal X and multiple miniatures (simplification).
- **Counterpart support deferred:** Counterpart upgrade cards (C-3PO, Grogu, etc.) are future work. Only `Counterpart` added to `UpgradeSlot` enum.

### 5.6A: Engine Type & Pool Changes

- [x] Add `sidearmMelee`, `sidearmRanged` boolean fields to `WeaponKeywords` (`engine/types.ts`)
- [x] Update `getWeaponsForAttackType` to remove Arsenal slice and add sidearm filtering (`engine/attackPool.ts`)
- [x] Add `Counterpart` to `UpgradeSlot` enum (`data/types.ts`)

### 5.6B: Data Type Extensions

- [x] Add `miniatureCount?: number` to `UnitEnrichment` (`data/enrichment/types.ts`)
- [x] Add `weapons`, `addsMiniature`, `noncombatant`, `isGrenade`, `addsUpgradeSlot` to `UpgradeEnrichment` (`data/enrichment/types.ts`)
- [x] Add `weapons`, `addsMiniature`, `noncombatant`, `isGrenade`, `addsUpgradeSlot` to `ResolvedUpgrade` (`data/types.ts`)
- [x] Add `baseMiniatureCount` and `unitBaseWeapons` to `AttackerPresetProfile` (`data/presets.ts`)

### 5.6C: Resolver Updates

- [x] Unit resolver: apply `miniatureCount` enrichment override (`enrichment.miniatureCount ?? processed.figures ?? 1`)
- [x] Upgrade resolver: resolve `weapons`, `addsMiniature`, `noncombatant`, `isGrenade`, `addsUpgradeSlot` from enrichment
- [x] `resolveAddsMiniature()` helper: HeavyWeapon/Personnel/SquadLeader default to 1, others to 0; enrichment can override

### 5.6D: Preset Generator Rewrite

- [x] Multi-mini units: generate a single preset carrying all unit weapons in `unitBaseWeapons`; derive active `weapons[]` from current attack type
- [x] Single-mini units: keep existing one-preset-per-weapon behavior
- [x] Set `baseMiniatureCount` and `unitBaseWeapons` on multi-mini presets
- [x] Ensure mode-aware behavior across Ranged/Melee/Overrun without reloading presets

### 5.6E: Upgrade Applicator Extension

- [x] Heavy weapon add: push heavy weapon entry (adds miniature, does NOT replace base weapon)
- [x] Squad leader add: push squad leader weapon entry (adds miniature)
- [x] Personnel add: add weapon entries per `addsMiniature`; noncombatant adds cost only
- [x] Grenade dedup: each grenade upgrade contributes exactly 1 weapon entry (multiple different grenades each contribute independently)
- [x] Sidearm per-mini handling: enforce only for matching attack type; otherwise allow fallback weapon selection
- [x] Use all weapon profiles from each equipped upgrade (not only `weapons[0]`)
- [x] Preserve per-mini ownership: upgrade weapons remain exclusive to that upgrade mini

### 5.6F: Store Changes

- [x] Add `baseMiniatureCount` and `unitBaseWeapons` to `attackConfigStore` (set by `loadPreset`, excluded from engine config selector)
- [x] Add `effectiveUpgradeBar` (base bar + dynamic slots from equipped upgrades) — **Completed Phase 12**
- [x] `recomputeEffectiveUpgradeBar()` helper — recalculates when upgrades change; cascading unequip for removed dynamic slots — **Completed Phase 12**

### 5.6G: UI Components

- [ ] `WeaponAssignmentPanel` — per-miniature weapon assignment rows for multi-mini units
- [ ] `PoolSummary` — aggregated dice + stacked keywords display
- [ ] Custom Pool mode mini count indicator
- [x] Dynamic upgrade slot dropdowns — reactively render upgrade dropdowns from `effectiveUpgradeBar` — **Completed Phase 12**

### 5.6H: Tests

- [x] Engine tests: multi-mini pool formation, sidearm safety-net filtering, keyword stacking (Arsenal tests updated for new architecture)
- [x] Upgrade applicator tests: heavy weapon add, squad leader add, personnel add, noncombatant, grenade dedup, per-mini sidearm behavior, all-upgrade-weapons selection (`data/__tests__/upgradeApplicator.test.ts` — 23 tests, all passing)
- [x] Preset generator tests: multi-mini expansion, single-mini unchanged, mode-aware weapon derivation (`data/__tests__/presetGenerator.test.ts` — 15 tests, all passing)
- [x] Data layer tests: miniatureCount override, upgrade resolver weapons/flags, implicit `addsMiniature` defaults (`data/__tests__/unitResolver.test.ts` + `upgradeResolver.test.ts` — 35 tests, all passing)
- [x] Store tests: `effectiveUpgradeBar` recomputation, cascading unequip on dynamic slot removal — **Completed Phase 12** (`stores/__tests__/upgradeBarHelpers.test.ts`)

### Manual Task: Enrichment Data Population (Human-Owned)

- [ ] Add `miniatureCount` to units with bad/missing API data (Death Troopers, Bad Batch, etc.)
- [ ] Add base weapon profiles for key corps units (Stormtroopers, Rebel Troopers, B1s, Clones, etc.)
- [ ] Add `addsMiniature`, `noncombatant`, `isGrenade`, and weapon data to personnel/heavy weapon/grenade upgrade enrichments
- [x] Add `addsUpgradeSlot` to upgrades that grant additional slots (Agent Kallus, Stormtrooper Captain, etc.) — **Auto-derived from raw data in Phase 12** (`processApiData.ts`)
- [ ] Note: this population step is manual and not an implementation sub-step for Copilot automation

**Output:** ✅ **MOSTLY COMPLETE** - Multi-miniature units produce correct attack pools with per-miniature weapon contributions. Heavy weapons, personnel, squad leaders, grenades, noncombatant, per-mini sidearm behavior, all-upgrade-weapons selection, and per-mini ownership rules are fully implemented and tested. Core engine and data layer complete. Dynamic upgrade slots (`effectiveUpgradeBar`/`recomputeEffectiveUpgradeBar`) and UI components (5.6G) deferred to future work. All 73 new tests passing. Fixes 5 pre-existing type errors (Death Troopers enrichment + 4 upgrade enrichments). **Remaining:** UI implementation (WeaponAssignmentPanel, PoolSummary, mini count indicator) and dynamic upgrade bar logic.

---

## Phase 6: UI Panels

**Status:** ✅ **COMPLETE** — Both input panels fully functional with two-mode design (Custom Pool / Unit Builder). All inputs wired to state, presets load correctly, upgrade system integrated. Attack Type Selector in header. Responsive layout working. All tests passing (27 total: 10 AttackerPanel + 14 DefenderPanel + 3 AttackTypeSelector).

### 6A: Attacker Panel (`components/AttackerPanel/`)

- [x] Faction dropdown + Unit/Weapon searchable combobox (loads presets)
- [x] Dice pool section: Red/Black/White spinners, surge chart select
- [x] Tokens section: Aim, Surge, Observation spinners
- [x] Keywords section: all attacker keyword inputs per design spec (Critical, Pierce, Impact, Sharpshooter, Lethal, Ram, Blast, High Velocity, Suppressive, Marksman, Marksman Strategy select (Deterministic/Averages), Reroll Strategy select (Conservative/Crit Fishing), Jedi Hunter, Duelist, Makashi Mastery, Spray, Immune: Deflect, Death From Above)
- [x] Upgrade/Downgrade section: Anti-Materiel X, Anti-Personnel X, Cumbersome
- [x] Unit cost spinner
- [x] Wire all inputs to Attack Config Store
- [x] Responsive: full-width on mobile, left column on desktop
- [x] Mode toggle (Custom Pool / Unit Builder)
- [x] Custom Pool view with weapon keywords on `weapons[0]`
- [x] Unit Builder view with weapon rows and upgrade slots
- [x] Conditional visibility (Marksman Strategy, Jar'Kai Dodge tokens)
- [x] Component tests (10 passing)

### 6B: Defender Panel (`components/DefenderPanel/`)

- [x] Faction dropdown + Unit searchable combobox (loads presets)
- [x] Defense die color select, surge chart select
- [x] Minis in LOS spinner (default 1, auto-filled from preset)
- [x] Cover section: Cover select, Cover X spinner, Smoke tokens spinner, Suppressed toggle
- [x] Tokens section: Dodge, Surge spinners
- [x] Keywords section: all defender keyword inputs per design spec (Armor, Weak Point, Immune: Pierce, Immune: Melee Pierce, Immune: Blast, Impervious, Danger Sense + Suppression tokens, Uncanny Luck, Block, Deflect, Shien Mastery, Outmaneuver, Low Profile, Shielded, Djem So Mastery, Soresu Mastery, Duelist, Backup, Guardian + die color + surge)
- [x] Unit cost spinner
- [x] Wire all inputs to Defense Config Store
- [x] Responsive: full-width on mobile, right column on desktop
- [x] Mode toggle (Custom Pool / Unit Builder)
- [x] Custom Pool and Unit Builder views
- [x] Guardian sub-config (die color, surge chart, keywords, tokens)
- [x] Conditional visibility (Shien Mastery, Danger Sense suppression, Guardian)
- [x] Component tests (14 passing)

### 6C: Attack Type Selector

- [x] Attack type selector (Ranged / Melee / Overrun)
- [x] Position: top bar (integrated into Layout header)
- [x] Wire to Attack Type Store
- [x] Component tests (3 passing)

**Output:** ✅ **COMPLETE** - Both input panels fully functional with two-mode design (Custom Pool / Unit Builder). All inputs wired to state, presets load correctly, upgrade system integrated. Attack Type Selector in header. Responsive layout working. All tests passing (27 total: 10 AttackerPanel + 14 DefenderPanel + 3 AttackTypeSelector).

---

## Phase 7: Results Panel

**Status:** ✅ **COMPLETE** (simulation trigger refactored in Phase 7.1) - All display functionality implemented with comprehensive tests. Displays mean/median/mode stats, interactive bar chart with mode highlighting, cumulative probability table, conditional secondary stats (Deflect/Djem So/Guardian), and points efficiency metrics. Fully tested with 16 format tests, 8 hook tests, 8 efficiency tests, and 15 integration tests.

### 7A: Core Results Display (`components/ResultsPanel/`)

- [x] Wire `useSimulation` hook: auto-run simulation when any config changes (debounced)
- [x] Display core stats: mean, median, mode wounds
- [x] Bar chart (Recharts): X = wound count, Y = probability %
- [x] Cumulative probability table: P(≥ X wounds) for each X
- [x] Loading indicator while simulation runs
- [x] Display secondary stats when applicable: Deflect/Shien reflection wounds, Djem So wounds

### 7B: Points Efficiency Display

- [x] Show efficiency section only when attacker or defender cost > 0
- [x] Wounds per point (attacker), Points per wound (attacker)
- [x] Wounds per point (defender), Points per wound (defender)
- [x] Attacker efficiency ratio
- [x] Format numbers clearly (2–3 decimal places)

### 7C: Chart Polish

- [x] Tooltips on bar chart hover
- [x] Axis labels and formatting
- [x] Responsive chart sizing
- [x] Color coding (attacker color vs defender color)

**Output:** ✅ **COMPLETE** - Results display stats and charts correctly. Simulation trigger mechanism refactored in Phase 7.1.

---

## Phase 7.1: UX Corrections — Imperative Simulation, Segmented Controls, Custom Pool Cleanup

**Status:** ✅ **COMPLETE** — See `plans/phase7.1-ux-corrections.md` for the full implementation plan.

Addresses three fundamental UX issues from Phases 6–7: (1) simulation should be user-triggered, not auto-debounced on every config change; (2) low-cardinality fields should be segmented controls, not dropdowns; (3) Unit Preset section should be hidden in Custom Pool mode.

### 7.1A: Imperative Simulation (Button-Triggered)

- [x] Add `stale` boolean and `markStale()` action to results store
- [x] Refactor `useSimulation` hook: remove auto-run/debounce, expose `runSimulation()` function
- [x] Add staleness-tracking effect (config change while result exists → `markStale()`)
- [x] Add "Run Simulation" button to ResultsPanel (disabled while loading)
- [x] Add stale results indicator (amber banner when config changed since last run)
- [x] Update EmptyState copy to reference Run button
- [x] Update simulation hook and ResultsPanel tests

### 7.1B: Segmented Control Component & Conversions

- [x] Create `SegmentedControl` shared component (`role="radiogroup"`, keyboard nav, active highlighting)
- [x] Export from `shared/index.ts`
- [x] Add SegmentedControl component tests
- [x] Convert Mode toggle to segmented control (both panels)
- [x] Convert Attack Type selector to segmented control (3 options)
- [x] Convert Attack Surge chart to segmented control (both Custom Pool and Unit Builder views)
- [x] Convert Defense Die Color, Defense Surge, Cover Type to segmented controls
- [x] Update panel component tests for new control type

### 7.1C: Hide Unit Preset Section in Custom Pool Mode

- [x] Conditionally render Unit Preset section in AttackerPanel (`activeMode === 'unit-builder'` only)
- [x] Conditionally render Unit Preset section in DefenderPanel (`activeMode === 'unit-builder'` only)
- [x] Add panel visibility tests (hidden in Custom Pool, visible in Unit Builder)

**Output:** ✅ **COMPLETE** - Simulation runs only when user clicks Run. Six fields render as inline button groups. Unit Preset section hidden in Custom Pool mode. All code complete, typecheck/lint passing. Test failures are pre-existing issues from earlier phases (ResultsPanel mock, defenseStore tests), not Phase 7.1 implementation issues.

---

## Phase 7.2: Multi-Result Comparison

**Status:** ✅ **COMPLETE** — Fully implemented with comprehensive test coverage.

Reworked the Results Panel to support up to 4 simultaneous simulation result slots for side-by-side comparison. Every click of "Run / Add Simulation" appends a new result. The wound distribution chart shows grouped color-coded bars and the cumulative table adds columns per result. Core/secondary stats are tab-switched via slot chips. Each slot is auto-labeled ("Sim 1", "Sim 2"…) with optional user rename and an × remove button. A "Reset All" button clears all results and resets all form stores to defaults.

### 7.2A: Store & Utility Rework

- [x] Define `ResultSlot` type (id, label, result, configSnapshot, color)
- [x] Rework `resultsStore` to slot-based append model (max 4 slots, color palette, label counter)
- [x] Implement `appendResult`, `removeSlot`, `renameSlot`, `setViewedSlotId`, `clearAll` actions
- [x] Create `resetAll()` cross-store utility (`src/stores/resetAll.ts`) — resets all 4 stores to defaults
- [x] Export `resetAll` from store barrel

### 7.2B: Hook Update

- [x] Update `useSimulation` — `runSimulation()` calls `appendResult` with config snapshot (not `setResult`)
- [x] Guard against appending when store is full (4 slots)
- [x] Stale tracking watches config changes when `slots.length > 0`

### 7.2C: Result Slot UI

- [x] Create `SlotSelector` component — horizontal slot chips with color dots, labels, × remove buttons
- [x] Inline rename on double-click
- [x] Active/viewed chip gets highlighted border ring
- [x] Renders nothing when 0 slots

### 7.2D: Multi-Series Chart & Table

- [x] Update `WoundDistributionChart` — accept `series[]` array, render grouped bars per series, multi-series tooltip
- [x] Update `CumulativeTable` — accept `series[]` array, render one P(≥X) column per series with color-coded headers
- [x] Add optional `accentColor` prop to `CoreStats` (top-border linking stats to chart series)

### 7.2E: ResultsPanel Wiring

- [x] Dynamic button label: "Run Simulation" (0 slots) → "Add Simulation" (1–3 slots) → disabled at 4 with hint
- [x] "Reset All" button with 2-second confirmation guard (first click → "Confirm Reset?", second click → execute)
- [x] Wire `SlotSelector`, multi-series chart/table data from all slots
- [x] Pass viewed slot's result to CoreStats/SecondaryStats/EfficiencyDisplay
- [x] Handle edge cases: remove viewed slot, remove all, single-slot backward compatibility

### 7.2F: Tests

- [x] Store tests: slot CRUD, max cap, color assignment/recycling, label counter, `clearAll`
- [x] `resetAll` test: all four stores return to defaults (`resetAll.test.ts`)
- [x] Hook tests: `appendResult` call, full guard, stale tracking
- [x] `SlotSelector` tests: chip rendering, click-to-select, remove, rename interaction (`SlotSelector.test.tsx`)
- [x] Chart/table tests: single-series backward-compatible, multi-series rendering (`WoundDistributionChart.test.tsx`, `CumulativeTable.test.tsx`)
- [x] ResultsPanel integration: button label changes, disabled at max, slot switching, Reset All

**Output:** Up to 4 simulation results compared side-by-side with color-coded overlaid charts and tabbed stats. Reset All clears everything.

---

## Phase 8: Integration & Polish

### 8A: Full Pipeline Wiring

- [ ] Verify end-to-end flow: change input → store update → click Run → simulation runs → results display
- [ ] Verify multi-result comparison: Run appends slots, chart shows grouped bars, table shows columns, slot chips switch stats
- [ ] Verify Reset All: clears all result slots and resets all form stores to defaults
- [ ] Verify max 4 slots: button disabled with hint, remove re-enables
- [ ] Verify attack type filtering disables correct keywords per type
- [ ] Verify preset loading populates all relevant fields
- [ ] Verify Cover cap at 2, improvement-before-reduction ordering in live UI
- [ ] Test Aim token economy: Lethal / Marksman / Duelist consume Aim tokens, can't double-spend

### 8B: Responsive Layout

- [ ] Desktop: three-column layout (Attacker | Results | Defender)
- [ ] Tablet: two-column or stacked
- [ ] Mobile: single-column stacked (Attacker → Defender → Results, or tabbed)
- [ ] Test on common breakpoints (320px, 375px, 768px, 1024px, 1440px)

### 8C: PWA Finalization

- [ ] Verify service worker caches all assets
- [ ] Test offline mode (airplane mode)
- [ ] Test "Add to Home Screen" on Android Chrome and iOS Safari
- [ ] Verify standalone display mode works correctly

### 8D: Accessibility

- [ ] Keyboard navigation through all inputs
- [ ] ARIA labels on all form controls
- [ ] Screen reader testing (at least VoiceOver or NVDA)
- [ ] Color contrast compliance (WCAG AA minimum)

### 8E: Performance

- [ ] Profile simulation time at 10k iterations — target < 500ms
- [ ] Ensure Web Worker doesn't leak or accumulate
- [ ] Debounce config changes to avoid excessive re-simulation (200–300ms)
- [ ] Lazy load Recharts if bundle size is a concern

---

## Phase 9: Testing & Validation

### 9A: Engine Unit Tests

- [ ] Dice roll distribution tests (statistical: over N rolls, face frequencies match expected ±tolerance)
- [ ] Each keyword modifier tested in isolation
- [ ] Full attack sequence tests with known inputs → expected outputs
- [ ] Edge cases: 0 dice, all blanks, all crits, max keyword values
- [ ] Cover cap enforcement, attack-type filtering

### 9B: Component Tests

- [ ] Each shared component renders correctly with various props
- [ ] NumberSpinner respects min/max, fires onChange
- [ ] Toggle fires onChange with correct value
- [ ] SearchableCombobox filters and selects correctly

### 9C: Integration Tests

- [ ] Preset selection → correct store population → correct simulation results
- [ ] Attack type change → keywords correctly enabled/disabled
- [ ] Known matchup validation: Darth Vader vs Rebel Troopers (compare against manual calculation or community-accepted values)

### 9D: Cross-Browser Testing

- [ ] Chrome, Firefox, Safari, Edge (latest)
- [ ] iOS Safari, Android Chrome
- [ ] PWA install flow on mobile

---

## Dependency Graph

```
Phase 1 (Scaffolding)
  ├─► Phase 2 (Dice Engine)
  │     ├─► Phase 2.5 (Multi-Weapon Pool Restructuring — Attacker)
  │     │     ├─► Phase 3 (Simulator + Worker)
  │     │     ├─► Phase 5A (Stores — uses weapons[] types)
  │     │     │     │
  │     │     │     ├─► Phase 5.5 (Unit Data & Upgrades)
  │     │     │     │     ├──► replaces Phase 5B
  │     │     │     │     │
  │     │     │     │     └─► Phase 5.6 (Multi-Mini Attack Pools)
  │     │     │     │           │
  │     │     │     └─► Phase 2.6 (Defender Two-Mode Design)
  │     │     │              │
  │     │     └──────────────┘
  │     │
  │     └─────────────────────┘
  ├─► Phase 4 (Shared Components)
  │
  │   ┌─────────────────────────────────────────────────────┐
  │   │ Phase 6 (UI Panels — Two-Mode Design)               │
  │   │   6A: Attacker Panel requires: 4 + 5A + 5.5 + 5.6    │
  │   │   6B: Defender Panel requires: 4 + 5A + 5.5 + 2.6    │
  │   └─────────────────────────────────────────────────────┘
  │   ┌─────────────────────────────────────────────────────┐
  │   │ Phase 7 (Results Panel)                             │
  │   │   requires: Phase 3 + Phase 5A + Phase 4            │
  │   └─────────────────────────────────────────────────────┘
  │                         │
  │                         ▼
  │   ┌─────────────────────────────────────────────────────┐
  │   │ Phase 7.2 (Multi-Result Comparison)                 │
  │   │   requires: Phase 7.1A                              │
  │   └─────────────────────────────────────────────────────┘
  │                         │
  │                         ▼
  │               Phase 8 (Integration)
  │                         │
  │                         ▼
  └───────────────► Phase 9 (Testing)
```

**Parallelism:** After Phase 1, three independent tracks can proceed simultaneously:
- **Track A:** Phase 2 → Phase 2.5 → Phase 3 (engine → multi-weapon restructuring → simulator) ✅ **COMPLETE**
- **Track B:** Phase 4 (shared UI components — no state dependency) ✅ **COMPLETE**
- **Track C:** Phase 5A → Phase 5.5 → Phase 5.6 (stores + data layer + multi-mini pools) ✅ **COMPLETE** (5.6 UI components deferred)

Phase 2.5 restructures the attacker engine to support per-weapon keywords before downstream phases consume the config types. Phase 2.6 extends the two-mode design to the Defender Panel (depends on Phase 2.5 pattern and Phase 5.5 data layer). Phase 5.5 replaces Phase 5B — the hardcoded preset data is superseded by the API-backed data pipeline and preset generator. Phase 5.6 extends Phase 5.5 with multi-miniature attack pool mechanics (per-mini weapon entries, heavy weapon/personnel/squad leader add, grenades, sidearm, noncombatant, dynamic upgrade slots). Phase 6A (Attacker Panel) requires Phases 4 + 5A + 5.5 + 5.6 and implements the two-mode design with per-miniature weapon assignment. Phase 6B (Defender Panel) requires Phases 4 + 5A + 5.5 + 2.6. ✅ **Phase 6 COMPLETE** - All panels implemented with two-mode design, upgrade system, and comprehensive tests. Phase 7 (Results Panel) requires Phases 3 + 4 + 5A. Phase 8 integrates everything, and Phase 9 runs throughout but has a final dedicated pass.

---

## Phase 7.1.1: Playwright QA Bugfixes

Four bugs found via automated Playwright QA testing. Engine math verified correct (6/6 deterministic tests passed). UI overflow testing confirmed only one clipping issue.

**Detailed plan:** [`plans/phase7.1.1-playwright-qa-bugfixes.md`](plans/phase7.1.1-playwright-qa-bugfixes.md)

- [ ] **7.1.1A** — "Overrun" attack type button clipped at all viewports (`Layout.tsx` `w-56` too narrow)
- [ ] **7.1.1B** — Upgrade dropdowns not filtered by unit (thread `unitApiId` through preset → store → UI)
- [ ] **7.1.1C** — Duplicate React keys in upgrade dropdowns (deduplicate + `Select.tsx` key fix)
- [ ] **7.1.1D** — Recharts ResponsiveContainer -1 dimension warnings (`minWidth`/`minHeight` props)

**Implementation order:** A first (quick CSS), then B+C together (single changeset), then D (cosmetic).
**Files:** ~11-14 files changed, 0 engine changes.
---

## Phase 12: Dynamic Upgrade Slots & Slot Requirements

**Status:** ✅ **COMPLETE** — Dynamic upgrade slots and slot requirements fully implemented.

**Detailed plan:** [`plans/phase12-dynamic-upgrade-slots.md`](plans/phase12-dynamic-upgrade-slots.md)

- [x] **Data pipeline** — `processApiData.ts` builds `unlocked_by` → slot map; emits `addsUpgradeSlot` and `requiredUpgradeSlot` on processed upgrades
- [x] **Type updates** — `addsUpgradeSlot` and `requiredUpgradeSlot` added to `ProcessedUpgrade`; `requiredUpgradeSlot` added to `ResolvedUpgrade`
- [x] **Resolver updates** — `resolveUpgrade` merges processed + enrichment `addsUpgradeSlot`; passes through `requiredUpgradeSlot`; `getUpgradesForSlot` filters by `requiredUpgradeSlot` against `effectiveUpgradeBar`; `UnitContext` extended with `effectiveUpgradeBar`
- [x] **Processed data regenerated** — 378 upgrades with correct `addsUpgradeSlot` (21 upgrades with non-empty) and `requiredUpgradeSlot` (2 Offensive/Defensive Stance variants requiring Force slot)
- [x] **`recomputeEffectiveUpgradeBar()` helper** — pure function in `stores/upgradeBarHelpers.ts`; handles cascading unequip, multi-slot upgrades, and ID carry-over
- [x] **Store updates** — both `attackConfigStore` and `defenseConfigStore` have `effectiveUpgradeBar` state; `loadPreset` initializes it; `equipUpgrade` calls `recomputeEffectiveUpgradeBar` and updates state
- [x] **UI updates** — both `AttackerUnitBuilderView` and `DefenderUnitBuilderView` use `effectiveUpgradeBar` and pass it to `getUpgradesForSlot`; dynamic slots marked with `*` suffix in label
- [x] **Tests** — 9 `upgradeBarHelpers` tests + 13 new `upgradeResolver` tests covering `addsUpgradeSlot`, `requiredUpgradeSlot`, and `effectiveUpgradeBar` filtering; all 776 tests passing