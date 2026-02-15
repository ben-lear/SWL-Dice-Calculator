# Just Roll Crits — MVP Work Plan

This plan breaks the MVP into major components, ordered by dependency. Each section can be built and tested independently before integration.

---

## Phase 1: Project Scaffolding

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

Reusable input primitives used by both panels.

- [ ] **NumberSpinner** — increment/decrement with min/max bounds, label, tooltip
- [ ] **Toggle** — labeled on/off switch with optional tooltip
- [ ] **Select** — dropdown with label (for surge charts, die colors, cover, attack type)
- [ ] **SearchableCombobox** — filterable dropdown for faction/unit presets
- [ ] **SectionHeader** — collapsible section divider for keyword groups
- [ ] Style all components with Tailwind, ensure accessible (keyboard nav, ARIA labels)
- [ ] Storybook-style visual tests or snapshot tests for each component

**Output:** Component library ready for panel assembly.

---

## Phase 5: State Management

### 5A: Zustand Stores

- [ ] **Attack Config Store** — all attacker inputs: `weapons: WeaponProfile[]` (per-weapon dice + keywords), unit-level keywords, surge chart, tokens, upgrade/downgrade settings, unit cost, Hold the Line. Custom Pool mode operates on `weapons[0]`; Unit Builder mode populates multiple weapons from presets.
- [ ] **Defense Config Store** — all defender inputs: die color, surge chart, cover, tokens, keywords, minis in LOS, unit cost, Hold the Line
- [ ] **Attack Type Store** — attack type selection (Ranged / Melee / Overrun), default: Ranged
- [ ] **Results Store** — simulation output (stats, distribution, efficiency metrics), loading state
- [ ] Define TypeScript interfaces for each store's state shape
- [ ] Implement reset/clear actions for each store
- [ ] Implement `getFullConfig()` selector that merges all stores into the engine's input format (ensures `weapons[]` array is populated)

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

## Phase 6: UI Panels

### 6A: Attacker Panel (`components/AttackerPanel/`)

- [ ] Faction dropdown + Unit/Weapon searchable combobox (loads presets)
- [ ] Dice pool section: Red/Black/White spinners, surge chart select
- [ ] Tokens section: Aim, Surge, Observation spinners
- [ ] Keywords section: all attacker keyword inputs per design spec (Critical, Pierce, Impact, Sharpshooter, Lethal, Ram, Blast, High Velocity, Suppressive, Marksman, Marksman Strategy select (Deterministic/Averages), Reroll Strategy select (Conservative/Crit Fishing), Jedi Hunter, Duelist, Makashi Mastery, Spray, Immune: Deflect, Death From Above)
- [ ] Upgrade/Downgrade section: Anti-Materiel X, Anti-Personnel X, Cumbersome
- [ ] Unit cost spinner
- [ ] Wire all inputs to Attack Config Store
- [ ] Responsive: full-width on mobile, left column on desktop

### 6B: Defender Panel (`components/DefenderPanel/`)

- [ ] Faction dropdown + Unit searchable combobox (loads presets)
- [ ] Defense die color select, surge chart select
- [ ] Minis in LOS spinner (default 1, auto-filled from preset)
- [ ] Cover section: Cover select, Cover X spinner, Smoke tokens spinner, Suppressed toggle
- [ ] Tokens section: Dodge, Surge spinners
- [ ] Keywords section: all defender keyword inputs per design spec (Armor, Weak Point, Immune: Pierce, Immune: Melee Pierce, Immune: Blast, Impervious, Danger Sense + Suppression tokens, Uncanny Luck, Block, Deflect, Shien Mastery, Outmaneuver, Low Profile, Shielded, Djem So Mastery, Soresu Mastery, Duelist, Backup, Guardian + die color + surge)
- [ ] Unit cost spinner
- [ ] Wire all inputs to Defense Config Store
- [ ] Responsive: full-width on mobile, right column on desktop

### 6C: Attack Type Selector

- [ ] Attack type selector (Ranged / Melee / Overrun)
- [ ] Position: top bar or between panels
- [ ] Wire to Attack Type Store

**Output:** Both input panels fully functional, all inputs wired to state, presets load correctly.

---

## Phase 7: Results Panel

### 7A: Core Results Display (`components/ResultsPanel/`)

- [ ] Wire `useSimulation` hook: auto-run simulation when any config changes (debounced)
- [ ] Display core stats: mean, median, mode wounds
- [ ] Bar chart (Recharts): X = wound count, Y = probability %
- [ ] Cumulative probability table: P(≥ X wounds) for each X
- [ ] Loading indicator while simulation runs
- [ ] Display secondary stats when applicable: Deflect/Shien reflection wounds, Djem So wounds

### 7B: Points Efficiency Display

- [ ] Show efficiency section only when attacker or defender cost > 0
- [ ] Wounds per point (attacker), Points per wound (attacker)
- [ ] Wounds per point (defender), Points per wound (defender)
- [ ] Attacker efficiency ratio
- [ ] Format numbers clearly (2–3 decimal places)

### 7C: Chart Polish

- [ ] Tooltips on bar chart hover
- [ ] Axis labels and formatting
- [ ] Responsive chart sizing
- [ ] Color coding (attacker color vs defender color)

**Output:** Results update live as user changes inputs, all stats and charts render correctly.

---

## Phase 8: Integration & Polish

### 8A: Full Pipeline Wiring

- [ ] Verify end-to-end flow: change input → store update → simulation runs → results display
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
  │     │     │     │     └──► replaces Phase 5B
  │     │     │     │
  │     │     │     └─► Phase 2.6 (Defender Two-Mode Design)
  │     │     │              │
  │     │     └──────────────┘
  │     │
  │     └─────────────────────┘
  ├─► Phase 4 (Shared Components)
  │
  │   ┌─────────────────────────────────────────────────────┐
  │   │ Phase 6 (UI Panels — Two-Mode Design)               │
  │   │   6A: Attacker Panel requires: 4 + 5A + 5.5 + 2.5   │
  │   │   6B: Defender Panel requires: 4 + 5A + 5.5 + 2.6   │
  │   └─────────────────────────────────────────────────────┘
  │   ┌─────────────────────────────────────────────────────┐
  │   │ Phase 7 (Results Panel)                             │
  │   │   requires: Phase 3 + Phase 5A + Phase 4            │
  │   └─────────────────────────────────────────────────────┘
  │                         │
  │                         ▼
  │               Phase 8 (Integration)
  │                         │
  │                         ▼
  └───────────────► Phase 9 (Testing)
```

**Parallelism:** After Phase 1, three independent tracks can proceed simultaneously:
- **Track A:** Phase 2 → Phase 2.5 → Phase 3 (engine → multi-weapon restructuring → simulator)
- **Track B:** Phase 4 (shared UI components — no state dependency)
- **Track C:** Phase 5A → Phase 5.5 (stores + data layer, depends on Phase 2.5 for `weapons[]` types)

Phase 2.5 restructures the attacker engine to support per-weapon keywords before downstream phases consume the config types. Phase 2.6 extends the two-mode design to the Defender Panel (depends on Phase 2.5 pattern and Phase 5.5 data layer). Phase 5.5 replaces Phase 5B — the hardcoded preset data is superseded by the API-backed data pipeline and preset generator. Phase 6A (Attacker Panel) requires Phases 4 + 5A + 5.5 + 2.5 and implements the two-mode design (Custom Pool / Unit Builder). Phase 6B (Defender Panel) requires Phases 4 + 5A + 5.5 + 2.6 and implements the two-mode design. Phase 7 (Results Panel) requires Phases 3 + 4 + 5A. Phase 8 integrates everything, and Phase 9 runs throughout but has a final dedicated pass.
