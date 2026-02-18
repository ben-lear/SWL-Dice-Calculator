# Phase 14 — Shared Section Components

## Problem

Multiple view files across the Attacker and Defender panels contain large blocks of duplicated or near-identical JSX, store wiring, and layout code. This duplication is a maintenance risk: any keyword, tooltip, or layout change must be replicated across 2–3 files, and divergence is easy to introduce silently.

The recent `WeaponKeywordsSection` extraction (used by both `AttackerCustomPoolView` and `AttackerUnitBuilderView`) established a working pattern. This phase extends that pattern to all remaining duplicated sections.

## Scope

**UI refactor only** — no engine logic, store shape, or behavioral changes. Every extraction must produce pixel-identical rendering and identical store interactions before and after.

## Extraction Candidates

### Step 1 — `AttackerTokensSection` (~35 lines saved)

**Duplication:**

| File | Lines |
|------|-------|
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | L89–L126 |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | L196–L234 |

**What it contains:**
- `SectionHeader title="Tokens"` wrapping a 2-column grid
- `NumberSpinner` for Aim (min 0, max 99, compact)
- `NumberSpinner` for Surge (min 0, max 99, compact)
- `NumberSpinner` for Observation (min 0, max 99, compact)
- Conditional `NumberSpinner` for Dodge (shown when `store.jarKaiMastery` is true)

**Similarity:** Character-for-character identical. Both call `useAttackConfigStore()` with the same fields, same tooltips, same min/max, same conditional logic.

**Design:** The component calls `useAttackConfigStore()` internally — no props needed.

**Create:** `src/components/AttackerPanel/AttackerTokensSection.tsx`

```tsx
// Signature
export default function AttackerTokensSection(): JSX.Element
```

**Changes to consumers:**
- `AttackerCustomPoolView.tsx`: Replace L89–L126 with `<AttackerTokensSection />`
- `AttackerUnitBuilderView.tsx`: Replace L196–L234 with `<AttackerTokensSection />`

---

### Step 2 — `AttackerUnitKeywordsSection` (~110 lines saved)

**Duplication:**

| File | Lines |
|------|-------|
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | L135–L251 |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | L236–L362 |

**What it contains:**
- `SectionHeader title="Unit Keywords"` wrapping:
  - Optional Attack Surge `SegmentedControl` (only in Unit Builder view)
  - `NumberSpinner` × 3: Precise X, Sharpshooter X, Arsenal X
  - `Checkbox` × 8: Marksman, Jedi Hunter, Jar'Kai Mastery, Duelist, Makashi Mastery, Death From Above, Hold the Line, Complete the Mission
  - Conditional Marksman Strategy `SegmentedControl` (shown when `store.marksman` is true)
  - `NumberSpinner` for Unit Cost

**Similarity:** Nearly identical. Every spinner, checkbox, tooltip, and conditional block matches between the two files.

**One difference:** In `AttackerUnitBuilderView`, the Attack Surge `SegmentedControl` is the first child inside the "Unit Keywords" section. In `AttackerCustomPoolView`, the surge chart lives in the separate "Dice Pool" section instead.

**Design:** The component calls `useAttackConfigStore()` and `useAttackerKeywordDisabled()` internally. A single boolean prop controls the surge chart inclusion:

**Create:** `src/components/AttackerPanel/AttackerUnitKeywordsSection.tsx`

```tsx
interface AttackerUnitKeywordsSectionProps {
  /** When true, render the Attack Surge SegmentedControl inside this section. */
  includeSurgeChart?: boolean;
}

export default function AttackerUnitKeywordsSection({
  includeSurgeChart = false,
}: AttackerUnitKeywordsSectionProps): JSX.Element
```

**Constants to move into this file:**
- `MARKSMAN_STRATEGY_OPTIONS` — currently duplicated in both view files

**Constants that stay in their current files:**
- `ATTACK_SURGE_OPTIONS` — currently duplicated in both view files; move into this file since it's only referenced here after extraction

**Changes to consumers:**
- `AttackerCustomPoolView.tsx`: Replace L135–L251 with `<AttackerUnitKeywordsSection />`
- `AttackerUnitBuilderView.tsx`: Replace L236–L362 with `<AttackerUnitKeywordsSection includeSurgeChart />`
- Remove now-unused `ATTACK_SURGE_OPTIONS` and `MARKSMAN_STRATEGY_OPTIONS` constants from both view files
- Remove now-unused imports (`Checkbox`, `SegmentedControl` types, etc.) from both view files

---

### Step 3 — `UpgradeSlotsSection` (~50 lines saved)

**Duplication:**

| File | Lines |
|------|-------|
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | L68–L117 |
| `src/components/DefenderPanel/DefenderUnitBuilderView.tsx` | L8–L66 (entire component) |

**What it contains:**
- `SectionHeader title="Upgrade Slots"` wrapping:
  - Empty-state message when no preset is selected
  - Empty-state message when upgrade bar is empty
  - `useMemo` over `effectiveUpgradeBar` to produce `slotRows`
  - Per-slot: `getUpgradesForSlot()` call → deduplication → `SelectOption[]` with "None" default → `Select` component
  - Disabled state when no preset is selected
  - Asterisk suffix (`*`) for dynamically-added slots (index >= `upgradeBar.length`)

**Similarity:** Nearly identical. Same `getUpgradesForSlot` call shape, same deduplication, same `Select` rendering, same empty-state messages, same disable logic.

**Key difference:** The two files call different stores (`useAttackConfigStore` vs `useDefenseConfigStore`). The shared component must be store-agnostic.

**Design:** Accept a props interface with all needed values/callbacks:

**Create:** `src/components/shared/UpgradeSlotsSection.tsx`

```tsx
interface UpgradeSlotsProps {
  selectedPresetId: string | null;
  effectiveUpgradeBar: string[];
  upgradeBar: string[];
  equippedUpgradeIds: (string | null)[];
  equipUpgrade: (index: number, upgradeId: string | null) => void;
  // Context for getUpgradesForSlot filtering
  unitApiId?: string;
  selectedFaction?: string;
  selectedUnitRank?: string;
  selectedUnitType?: string;
  selectedUnitAffiliation?: string | null;
}

export default function UpgradeSlotsSection(props: UpgradeSlotsProps): JSX.Element
```

**Changes to consumers:**
- `AttackerUnitBuilderView.tsx`: Replace L68–L117 with `<UpgradeSlotsSection {...storeProps} />`, remove `slotRows` useMemo, remove `getUpgradesForSlot` / `UPGRADE_SLOT_LABELS` / `Select` imports if no longer used elsewhere
- `DefenderUnitBuilderView.tsx`: Replace the entire component body with `<UpgradeSlotsSection {...storeProps} />`, keeping only the store hook call and prop mapping. This file may become a thin wrapper or could be inlined into `DefenderPanel.tsx`.

---

### Step 4 — `UnitPresetSection` (~35 lines saved)

**Duplication:**

| File | Lines |
|------|-------|
| `src/components/AttackerPanel/AttackerPanel.tsx` | L110–L130 |
| `src/components/DefenderPanel/DefenderPanel.tsx` | L92–L112 |

**What it contains:**
- `SectionHeader title="Unit Preset"` wrapping:
  - `Select` for Faction (with "All Factions" default, clear-unit-on-change logic)
  - `SearchableCombobox` for Unit (with "Search units..." placeholder)

**Similarity:** Mostly identical. The JSX structure, layout, conditional rendering (only shown in `unit-builder` mode), and even the inline comment (`// 10.1B: Clear stale unit state when faction changes`) are the same.

**Key difference:** The `unitOptions` computation and `handlePresetChange` callback differ between panels (attacker does extra deduplication by `unitApiId` and strips parenthetical suffixes). These stay in the parent — the shared component only receives the computed options and callbacks.

**Design:** Accept pre-computed options and callbacks:

**Create:** `src/components/shared/UnitPresetSection.tsx`

```tsx
interface UnitPresetSectionProps {
  faction: string;
  onFactionChange: (faction: string) => void;
  factionOptions: SelectOption<string>[];
  unitValue: string;
  onUnitChange: (unitId: string) => void;
  unitOptions: ComboboxOption[];
}

export default function UnitPresetSection(props: UnitPresetSectionProps): JSX.Element
```

**Changes to consumers:**
- `AttackerPanel.tsx`: Replace L110–L130 with `<UnitPresetSection ... />`
- `DefenderPanel.tsx`: Replace L92–L112 with `<UnitPresetSection ... />`
- Both: may be able to remove `SectionHeader` import if no longer used directly

---

### Step 5 — `PanelShell` (~15 lines saved per panel)

**Duplication:**

| File | Lines |
|------|-------|
| `src/components/AttackerPanel/AttackerPanel.tsx` | L86–L91 (outer div + sticky header) + L93 (content wrapper) |
| `src/components/DefenderPanel/DefenderPanel.tsx` | L70–L76 (outer div + sticky header) + L78 (content wrapper) |

**What it contains:**
- Outer `div` with `flex flex-col overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 lg:max-h-[calc(100vh-5rem)]`
- Sticky header `div` with `sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3` containing an `h2` with the panel title
- Content wrapper `div` with `space-y-4 px-4 py-4`

**Similarity:** Structurally identical. Only the title string ("Attacker" vs "Defender") and `children` differ.

**Create:** `src/components/shared/PanelShell.tsx`

```tsx
interface PanelShellProps {
  title: string;
  children: React.ReactNode;
}

export default function PanelShell({ title, children }: PanelShellProps): JSX.Element
```

**Changes to consumers:**
- `AttackerPanel.tsx`: Wrap content in `<PanelShell title="Attacker">...</PanelShell>`
- `DefenderPanel.tsx`: Wrap content in `<PanelShell title="Defender">...</PanelShell>`

---

### Step 6 — `MODE_OPTIONS` constant deduplication (~3 lines)

**Duplication:**

| File | Lines |
|------|-------|
| `src/components/AttackerPanel/AttackerPanel.tsx` | L13–L16 |
| `src/components/DefenderPanel/DefenderPanel.tsx` | L17–L20 |

Both define an identical `MODE_OPTIONS` array:
```ts
const MODE_OPTIONS: SegmentedControlOption<'custom' | 'unit-builder'>[] = [
  { value: 'custom', label: 'Custom Pool' },
  { value: 'unit-builder', label: 'Unit Builder' },
];
```

**Design:** Export from `PanelShell.tsx` (or a separate `src/components/shared/panelConstants.ts`) since it's closely related to the panel mode concept.

**Changes to consumers:**
- Both panel files: Import `MODE_OPTIONS` from the shared location; remove local definition.

---

## Sections NOT Worth Extracting

| Section | Location | Reason |
|---------|----------|--------|
| Defender Keywords (Armor, Deflect, Impervious, etc.) | `DefenderCustomPoolView.tsx` L150–L330 | Entirely different keyword set from attacker; no overlap. |
| Defender Defense / Cover / Guardian | `DefenderCustomPoolView.tsx` L48–L148, L332–L397 | Unique to defender, no attacker counterpart. |
| Weapons display | `AttackerUnitBuilderView.tsx` L119–L177 | Unique to attacker unit builder, no defender equivalent. |
| Dice Pool (red/black/white spinners) | `AttackerCustomPoolView.tsx` L43–L87 | Unique to attacker custom pool mode. |
| Reroll Strategy | `AttackerPanel.tsx` L103–L108 | Attacker-only, single inline `SegmentedControl`. |
| Defender Tokens (Dodge, Surge, Suppression) | `DefenderCustomPoolView.tsx` L122–L148 | Different token set from attacker tokens; no overlap. |

---

## Files Touched

| File | Type of Change |
|------|---------------|
| `src/components/AttackerPanel/AttackerTokensSection.tsx` | **New** — extract attacker tokens grid |
| `src/components/AttackerPanel/AttackerUnitKeywordsSection.tsx` | **New** — extract attacker unit keywords block |
| `src/components/shared/UpgradeSlotsSection.tsx` | **New** — extract store-agnostic upgrade slots |
| `src/components/shared/UnitPresetSection.tsx` | **New** — extract faction + unit selector |
| `src/components/shared/PanelShell.tsx` | **New** — extract panel outer chrome |
| `src/components/shared/index.ts` | **Update** — export new shared components |
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | **Update** — replace inline sections with shared components |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | **Update** — replace inline sections with shared components |
| `src/components/AttackerPanel/AttackerPanel.tsx` | **Update** — use `PanelShell`, `UnitPresetSection`, shared `MODE_OPTIONS` |
| `src/components/AttackerPanel/index.ts` | **Update** — export new attacker section components (if needed) |
| `src/components/DefenderPanel/DefenderPanel.tsx` | **Update** — use `PanelShell`, `UnitPresetSection`, shared `MODE_OPTIONS` |
| `src/components/DefenderPanel/DefenderUnitBuilderView.tsx` | **Update** — use `UpgradeSlotsSection`, may become thin wrapper |

## Implementation Order

Execute steps sequentially. Each step is independently shippable and verifiable:

1. **Step 1: `AttackerTokensSection`** — Smallest, zero-parameterization extraction. Good warm-up.
2. **Step 2: `AttackerUnitKeywordsSection`** — Largest duplication, biggest payoff. Depends on Step 1 being done first so the view files are already simplified.
3. **Step 3: `UpgradeSlotsSection`** — Cross-panel extraction; introduces the props-based pattern.
4. **Step 4: `UnitPresetSection`** — Cross-panel; similar props-based pattern.
5. **Step 5: `PanelShell`** — Structural wrapper; touches the same panel files as Step 4.
6. **Step 6: `MODE_OPTIONS`** — Trivial constant extraction; natural companion to Step 5.

After each step:
- `npm run typecheck` — must pass
- `npm run lint` — must pass (0 errors)
- Visually confirm no rendering changes

After all steps:
- `npm run test` — all existing tests pass
- Visual smoke test in `npm run dev` — both panels render identically to before

## Testing Strategy

This is a pure refactor with no behavioral changes. The primary verification is:

1. **Existing tests** — `AttackerPanel.test.tsx` and `DefenderPanel.test.tsx` must continue to pass with zero changes. If any test breaks, it indicates a rendering regression.
2. **Type safety** — `npm run typecheck` catches any prop mismatches or missing exports.
3. **Lint** — `npm run lint` catches unused imports, missing dependencies, etc.
4. **No new tests required** — the shared components are purely presentational wrappers around existing logic. They don't introduce new behavior to test.

If a shared component introduces a non-trivial prop interface (e.g., `UpgradeSlotsSection`), a focused unit test may be added to verify prop-to-render mapping, but this is optional.

## Architectural Notes

- **Attacker-only shared components** (`AttackerTokensSection`, `AttackerUnitKeywordsSection`) live in `src/components/AttackerPanel/` because they call `useAttackConfigStore()` directly. This follows the existing `WeaponKeywordsSection` pattern.
- **Cross-panel shared components** (`UpgradeSlotsSection`, `UnitPresetSection`, `PanelShell`) live in `src/components/shared/` because they are store-agnostic and accept props.
- No store shape changes — all components consume the same store fields via the same hooks.
- No new dependencies or framework additions.

## Non-Goals

- Do not refactor defender-specific sections (defense keywords, cover, guardian) — they have no cross-panel counterpart.
- Do not change store APIs or engine logic.
- Do not add new features or behavioral changes.
- Do not reorganize the file/folder structure beyond the new component files.
- Do not convert any components to class components.
