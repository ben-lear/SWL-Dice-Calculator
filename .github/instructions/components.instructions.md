# UI Components Instructions

> **Applies to:** `src/components/**`

## Purpose

The components layer handles all presentation and user interaction. Components consume Zustand stores for state, use shared primitives for consistency, and never contain game logic.

## Directory Layout

```
src/components/
├── index.ts                    # Top-level barrel re-exports all panels
├── AttackerPanel/              # Left column — attacker configuration
│   ├── AttackerPanel.tsx       # Mode toggle (Custom/Unit Builder) + view switching
│   ├── AttackerCustomPoolView  # Manual dice pool + keyword config
│   ├── AttackerUnitBuilderView # Preset-based unit/weapon/upgrade config
│   ├── AttackerTokensSection   # Aim/Surge/Observation tokens
│   ├── AttackerUnitKeywordsSection # Unit-level keywords
│   └── WeaponKeywordsSection   # Per-weapon keywords
├── DefenderPanel/              # Right column — defender configuration
│   ├── DefenderPanel.tsx       # Mode toggle + view switching
│   ├── DefenderCustomPoolView  # Manual defense config
│   ├── DefenderUnitBuilderView # Preset-based defense config
│   └── DefenderDefenseSection  # Die color, surge, cover section
├── ResultsPanel/               # Center column — simulation output
│   ├── ResultsPanel.tsx        # Main orchestrator
│   ├── SlotSelector.tsx        # Result slot chips (up to 4)
│   ├── WoundDistributionChart  # Recharts bar chart (multi-series)
│   ├── CumulativeTable.tsx     # Probability table
│   ├── CoreStats.tsx           # Mean/Median/Mode
│   ├── PreDefenseStats.tsx     # Pre-defense attack results
│   ├── SecondaryStats.tsx      # Deflect/Djem So stats
│   ├── EfficiencyDisplay.tsx   # Points efficiency metrics
│   ├── EmptyState / ErrorDisplay / LoadingOverlay
│   └── index.ts
├── AttackTypeSelector/         # Header control — Ranged/Melee/Overrun
└── shared/                     # Reusable UI primitives (see inventory below)
```

> **Note:** `DiceDisplay/` exists but is **empty** — vestigial from Phase 1 scaffolding.

## Panel Architecture

Three-tier nesting pattern used throughout:

```
PanelShell (sticky title bar + overflow scroll + collapse)
  └── SectionHeader (collapsible section with chevron)
        └── Form controls (NumberSpinner, Toggle, Select, etc.)
```

### Two-Mode Pattern

Both `AttackerPanel` and `DefenderPanel` support two modes via `SegmentedControl`:
- **Custom Pool** — manual dice/keyword entry
- **Unit Builder** — preset selection with upgrade equipping

Mode switching uses store-level snapshot/restore (see `stores.instructions.md`).

## Shared Component Inventory

Reuse these before introducing new primitives:

### Form Controls
| Component | Usage |
|-----------|-------|
| `NumberSpinner` | Numeric input with +/- buttons, hold-to-repeat, compact mode |
| `Toggle` | Boolean switch (`role="switch"`, `aria-checked`) |
| `Checkbox` | Standard checkbox with label |
| `Select` | Native `<select>` wrapper, generic over value type `<T>` |
| `SegmentedControl` | Radio button group as pill tabs, generic `<T extends string>`, full keyboard nav |
| `SearchableCombobox` | Typeahead dropdown with keyboard navigation |

### Layout
| Component | Usage |
|-----------|-------|
| `PanelShell` | Top-level panel wrapper with sticky title, collapse support |
| `SectionHeader` | Collapsible section divider with animated chevron |
| `DynamicDivider` | ResizeObserver-based vertical divider between columns |
| `CollapseChevron` | Animated ▾ icon for collapse state |

### Display
| Component | Usage |
|-----------|-------|
| `StatCard` | Metric card with label/value and optional accent border |
| `StatRow` | Inline stat row (label + value) for secondary metrics |
| `DiceIconDisplay` | Colored diamond icons representing red/black/white dice |

### Composite
| Component | Usage |
|-----------|-------|
| `UnitPresetSection` | Faction `Select` + Unit `SearchableCombobox` |
| `UpgradeSlotsSection` | Dynamic upgrade slot selectors with restriction/dedup logic |

### Utility
| Component | Usage |
|-----------|-------|
| `DeferredMount` | `requestAnimationFrame`-delayed wrapper (used for Recharts sizing) |

## Dark Theme Palette

Maintain these consistently — do not introduce ad-hoc colors:

| Role | Classes |
|------|---------|
| Panel backgrounds | `bg-gray-900` |
| Input/card surfaces | `bg-gray-800` |
| Stat row backgrounds | `bg-gray-800/50` |
| Primary text | `text-gray-100` |
| Label text | `text-gray-300` |
| Heading text | `text-gray-400` |
| Muted text | `text-gray-500` |
| Primary borders | `border-gray-700` |
| Subtle borders | `border-gray-800` |
| Active/focus accent | `bg-blue-600`, `bg-blue-500` |
| Focus ring | `ring-2 ring-blue-500 ring-offset-1 ring-offset-gray-900` |
| Destructive actions | `bg-red-500`, `bg-amber-700` |

## Tailwind Custom Utilities

Defined in `src/index.css` via `@layer components`:

| Utility | Purpose |
|---------|---------|
| `.section-heading` | Section title styling |
| `.control-label` | Form control label styling |
| `.input-surface` | Input background and border styling |
| `.keyword-grid` | CSS grid for `NumberSpinner` keyword controls |
| `.checkbox-grid` | CSS grid for `Checkbox` keyword controls |

## Responsive Patterns

Mobile-first approach:

| Pattern | Example |
|---------|---------|
| Touch-friendly sizing | `h-11 w-11 sm:h-8 sm:w-8` |
| Min heights | `min-h-[2.75rem] sm:min-h-[2rem]` |
| Grid breakpoints | `grid-cols-1 sm:grid-cols-2` |
| Flex wrapping | `flex-wrap sm:flex-nowrap` |

## Accessibility Requirements

- Use `useId()` for label-input associations (not hardcoded IDs).
- ARIA roles on custom controls: `radiogroup`/`radio` on `SegmentedControl`, `switch` on `Toggle`, `spinbutton` on `NumberSpinner`.
- `aria-expanded` on all collapsible sections.
- `aria-label` on icon-only buttons.
- Keyboard navigation on composite controls (Arrow keys, Home/End).
- Global `focus-visible` ring styling (defined in `index.css`).

## Engine Imports in Components

- **Type-only imports are OK**: `import type { StatsSummary } from '../../engine/types'` and enum value imports for UI option definitions.
- **Function calls should NOT be in components**: Engine logic should go through hooks or selectors. If a component needs computed data, add a hook or selector instead.

> Current exception: `AttackerUnitBuilderView.tsx` calls `aggregateWeaponKeywords()` directly — this should ideally be moved to a hook/selector.

## Export Convention

- Shared components: `export default function ComponentName` + named re-export from barrel index.
- Feature panels: `export default function PanelName` + re-export from barrel.
- Types: co-exported alongside their component via named exports.

## Known Duplications

These constants are duplicated across files and should be consolidated if modified:

| Constant | Duplicated In |
|----------|--------------|
| `DEFENSE_DIE_OPTIONS` | `DefenderDefenseSection.tsx`, `DefenderCustomPoolView.tsx` |
| `DEFENSE_SURGE_OPTIONS` | `DefenderDefenseSection.tsx`, `DefenderCustomPoolView.tsx` |
| `ATTACK_SURGE_OPTIONS` | `AttackerPanel.tsx`, `AttackerCustomPoolView.tsx` |
| `EMPTY_KEYWORDS` | `configSelectors.ts`, `AttackerUnitBuilderView.tsx` |

## Confirmation Pattern

Destructive actions (Clear Results, Clear All) use a "click to arm, click again to confirm" pattern with a 2-second auto-reset timeout. Maintain this UX pattern for any new destructive actions.
