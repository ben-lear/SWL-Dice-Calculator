# Phase 6: UI Panels — Implementation Plan

## Goal

Build the Attacker Panel, Defender Panel, and Attack Type Selector — the three interactive input areas that let users configure dice pools, keywords, tokens, cover, and other modifiers. Each panel composes the shared UI components from Phase 4 with the Zustand stores from Phase 5A and the preset system from Phase 5.5. All inputs are wired to their respective stores so that any change immediately propagates to the simulation engine (via Phase 7's `useSimulation` hook).

---

## Overview

Phase 6 consists of three sub-phases:

- **6A:** Attacker Panel — faction/unit preset selection, dice pool, tokens, all attacker keywords, upgrade/downgrade section, and unit cost
- **6B:** Defender Panel — faction/unit preset selection, defense die, cover, tokens, all defender keywords (including Guardian sub-config), and unit cost
- **6C:** Attack Type Selector — global attack type toggle (All / Ranged / Melee / Overrun)

Phase 6 depends on:
- **Phase 1** (Project scaffolding) — React, TypeScript, Tailwind CSS, Vite
- **Phase 4** (Shared UI components) — `NumberSpinner`, `Toggle`, `Select`, `SearchableCombobox`, `SectionHeader`
- **Phase 5A** (Zustand stores) — `useAttackConfigStore`, `useDefenseConfigStore`, `useAttackTypeStore`
- **Phase 5.5** (Unit data & presets) — `getAttackerPresets`, `getDefenderPresets`, `getFactionOptions`, preset helpers, upgrade system

Phase 6 does **not** depend on:
- Phase 2 (Dice engine — panels don't call the engine directly; they write to stores)
- Phase 3 (Simulator / Web Worker — that's Phase 7's concern)
- Phase 7 (Results Panel — reads from the same stores but is built independently)

---

## Design Decisions

The following design decisions are documented for clarity:

1. **Store Wiring Pattern** — Each input is wired to its store via a consistent pattern: read the current value from the store using a selector, and write back via `setField('fieldName', value)`. This keeps components thin — they don't contain business logic, only define which store field maps to which UI component.

2. **Preset Loading Flow** — Both panels follow the same preset interaction pattern:
   - **Faction Select** → filters the Unit/Weapon combobox options; stored as `selectedFaction` (UI-only state)
   - **Unit/Weapon Combobox** → on selection, calls `store.loadPreset(presetId, preset.profile)` which resets all fields to defaults and then overlays the preset's partial profile
   - After preset loading, all fields remain editable — the user can tweak any value
   - Changing the Faction dropdown does **not** clear the current config (only filters the combobox). Selecting a new unit/weapon **does** reset and reload.
   - A special "Custom" option (value `''`) in the combobox clears the preset selection without changing any fields, allowing freeform editing.

3. **Conditional Visibility** — Some inputs are shown only when a prerequisite is met:
   - **Marksman Strategy** select is shown only when `marksman === true`
   - **Dodge tokens (attacker)** spinner is shown only when `jarKaiMastery === true`
   - **Guardian sub-config** (die color, surge chart, Deflect, Soresu Mastery, Dodge tokens) is shown only when `guardianX > 0`
   - **Shien Mastery** toggle is shown only when `deflect === true` (Shien requires Deflect)
   - **Suppression tokens** (for Danger Sense) spinner is shown only when `dangerSenseX > 0`
   - All other inputs are always visible, even if currently irrelevant — the user may want to pre-configure them before setting other options.

4. **Section Organization** — Inputs are grouped into collapsible sections using `SectionHeader`:
   - **Attacker:** Preset, Dice Pool, Tokens, Keywords, Upgrade/Downgrade, Points
   - **Defender:** Preset, Defense, Cover, Tokens, Keywords, Guardian, Points
   - Sections default to expanded on first load. SectionHeader manages its own collapse state internally (per Phase 4E spec).

5. **Disabled State for Attack-Type Filtering** — Phase 6 does **not** implement keyword disabling based on attack type. That logic is deferred to Phase 8 (Integration) where the attack type store's value is used to determine which keyword inputs should be visually disabled. In Phase 6, all inputs are always enabled. This simplifies the initial build and keeps Phase 6 focused on layout and store wiring.

6. **Panel Layout** — Each panel is a scrollable column with a fixed header (panel title). On desktop (≥1024px), panels sit in the left and right columns of the 3-column grid established in Phase 1. On mobile (<1024px), panels stack vertically (Attacker → Defender) with the Results panel below. The panels themselves don't manage the grid — they render as full-width flex columns and the parent `App.tsx` layout handles column placement.

7. **Panel Header Styling** — Each panel has a sticky title bar at the top: "ATTACKER" (left panel) and "DEFENDER" (right panel). The header uses `text-xs font-bold uppercase tracking-wider` with a subtle bottom border, matching the SectionHeader typography pattern but larger in scale.

8. **Input Spacing** — Inputs within a section use `space-y-3` (12px vertical gap) for consistent density. Sections themselves use `space-y-4` (16px gap) between them. This provides visual grouping without excessive whitespace.

9. **Combobox Options Format** — For the SearchableCombobox options, each preset is mapped to `{ value: preset.id, label: preset.name }`. The "Custom" option uses `{ value: '', label: 'Custom' }` and appears first in the list. When no preset is selected (`selectedPresetId === null`), the combobox value is `''` (showing "Custom" or the placeholder).

10. **Faction "All" Option** — The faction Select includes an "All" option (value `''`) that shows units across all factions. When "All" is selected, `setSelectedFaction(null)` is called and the combobox shows the full unfiltered preset list.

11. **Hold the Line** — This keyword appears on both the Attacker and Defender panels because it grants both `c→a` (attack surge conversion) and `e→d` (defense surge conversion) when the unit is engaged. Each panel's toggle independently sets its respective store field.

12. **Number Spinner Bounds** — All spinners use the bounds from the DESIGN_CONCEPT:
    - Dice counts: 0–12
    - Token counts: 0–5 (Aim, Dodge, Surge, Observation), 0–3 (Smoke)
    - Suppression tokens (for Danger Sense): 0–10
    - Keyword X values: per spec (e.g., Pierce 0–5, Precise 0–3, Guardian 0–3, etc.)
    - Minis in LOS: 1–12
    - Unit cost: 0–999

---

## Step 6A.1 — Create Attacker Panel Component

**File:** `src/components/AttackerPanel/AttackerPanel.tsx`

The main container component for all attacker inputs. Composes shared components and wires them to `useAttackConfigStore`.

```tsx
import { useCallback, useMemo } from 'react';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import {
  AttackSurgeChart,
  MarksmanStrategy,
  RerollStrategy,
} from '../../engine/types';
import { Faction } from '../../data/presets';
import {
  getAttackerPresets,
  getAttackerPresetById,
  getFactionOptions,
} from '../../data/presetHelpers';
import { getUpgradesForSlot } from '../../data/upgradeResolver';
import { UPGRADE_SLOT_LABELS } from '../../data/types';
import { getResolvedUnitById } from '../../data/unitResolver';
import NumberSpinner from '../shared/NumberSpinner';
import Toggle from '../shared/Toggle';
import Select from '../shared/Select';
import SearchableCombobox from '../shared/SearchableCombobox';
import SectionHeader from '../shared/SectionHeader';
import type { SelectOption } from '../shared/Select';
import type { ComboboxOption } from '../shared/SearchableCombobox';

// ============================================================================
// Option Constants
// ============================================================================

const ATTACK_SURGE_OPTIONS: SelectOption<string>[] = [
  { value: AttackSurgeChart.None, label: 'None' },
  { value: AttackSurgeChart.ToHit, label: 'c → a (Hit)' },
  { value: AttackSurgeChart.ToCrit, label: 'c → b (Crit)' },
];

const MARKSMAN_STRATEGY_OPTIONS: SelectOption<string>[] = [
  { value: MarksmanStrategy.Deterministic, label: 'Deterministic' },
  { value: MarksmanStrategy.Averages, label: 'Averages' },
];

const REROLL_STRATEGY_OPTIONS: SelectOption<string>[] = [
  { value: RerollStrategy.Conservative, label: 'Conservative' },
  { value: RerollStrategy.CritFishing, label: 'Crit Fishing' },
];

const FACTION_OPTIONS: SelectOption<string>[] = [
  { value: '', label: 'All Factions' },
  ...getFactionOptions().map((f) => ({ value: f.value, label: f.label })),
];

// ============================================================================
// Component
// ============================================================================

export default function AttackerPanel() {
  const store = useAttackConfigStore();

  // ── Derived state ──

  const factionValue = store.selectedFaction ?? '';

  const unitOptions: ComboboxOption[] = useMemo(() => {
    const presets = getAttackerPresets(store.selectedFaction);
    return [
      { value: '', label: 'Custom' },
      ...presets.map((p) => ({ value: p.id, label: p.name })),
    ];
  }, [store.selectedFaction]);

  const presetValue = store.selectedPresetId ?? '';

  // ── Handlers ──

  const handleFactionChange = useCallback(
    (value: string) => {
      store.setSelectedFaction(value === '' ? null : (value as Faction));
    },
    [store],
  );

  const handlePresetChange = useCallback(
    (presetId: string) => {
      if (presetId === '') {
        // "Custom" selected — clear preset ID but don't reset fields
        store.setField('selectedPresetId' as any, null);
        return;
      }
      const preset = getAttackerPresetById(presetId);
      if (preset) {
        store.loadPreset(preset.id, preset.profile, preset.upgradeBar);
      }
    },
    [store],
  );

  // ── Render ──

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Panel Header */}
      <div className="sticky top-0 z-10 border-b border-gray-700 bg-gray-900 px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
          Attacker
        </h2>
      </div>

      <div className="flex-1 space-y-4 px-4 py-4">
        {/* ── Preset Section ── */}
        <SectionHeader title="Unit Preset">
          <div className="space-y-3">
            <Select
              label="Faction"
              value={factionValue}
              onChange={handleFactionChange}
              options={FACTION_OPTIONS}
            />
            <SearchableCombobox
              label="Unit / Weapon"
              value={presetValue}
              onChange={handlePresetChange}
              options={unitOptions}
              placeholder="Search units..."
            />
          </div>
        </SectionHeader>

        {/* ── Upgrade Slots Section (shown when preset has upgrade bar) ── */}
        {store.upgradeBar.length > 0 && (
          <SectionHeader title="Upgrades">
            <div className="space-y-3">
              {store.upgradeBar.map((slot, index) => {
                const slotLabel = UPGRADE_SLOT_LABELS[slot] ?? slot;
                // Get available upgrades for this slot type
                // unitApiId can be derived from the selected preset's resolved unit
                const upgradeOptions: ComboboxOption[] = useMemo(() => {
                  const upgrades = getUpgradesForSlot(slot);
                  return [
                    { value: '', label: 'None' },
                    ...upgrades.map((u) => ({
                      value: u.id,
                      label: `${u.name} (${u.cost} pts)`,
                    })),
                  ];
                }, [slot]);

                return (
                  <SearchableCombobox
                    key={`${slot}-${index}`}
                    label={slotLabel}
                    value={store.equippedUpgradeIds[index] ?? ''}
                    onChange={(upgradeId) =>
                      store.equipUpgrade(index, upgradeId === '' ? null : upgradeId)
                    }
                    options={upgradeOptions}
                    placeholder={`Search ${slotLabel}...`}
                  />
                );
              })}
              {/* Total cost display */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Base cost: {store.unitCost} pts</span>
              </div>
            </div>
          </SectionHeader>
        )}

        {/* ── Dice Pool Section ── */}
        <SectionHeader title="Dice Pool">
          <div className="space-y-3">
            <NumberSpinner
              label="Red dice"
              value={store.redDice}
              onChange={(v) => store.setField('redDice', v)}
              min={0}
              max={12}
              tooltip="Red attack dice (5/8 hit, 1/8 crit, 1/8 surge)"
            />
            <NumberSpinner
              label="Black dice"
              value={store.blackDice}
              onChange={(v) => store.setField('blackDice', v)}
              min={0}
              max={12}
              tooltip="Black attack dice (3/8 hit, 1/8 crit, 1/8 surge)"
            />
            <NumberSpinner
              label="White dice"
              value={store.whiteDice}
              onChange={(v) => store.setField('whiteDice', v)}
              min={0}
              max={12}
              tooltip="White attack dice (1/8 hit, 1/8 crit, 1/8 surge)"
            />
            <Select
              label="Surge chart"
              value={store.surgeChart}
              onChange={(v) => store.setField('surgeChart', v as AttackSurgeChart)}
              options={ATTACK_SURGE_OPTIONS}
              tooltip="How attack surge results are converted"
            />
          </div>
        </SectionHeader>

        {/* ── Tokens Section ── */}
        <SectionHeader title="Tokens">
          <div className="space-y-3">
            <NumberSpinner
              label="Aim tokens"
              value={store.aimTokens}
              onChange={(v) => store.setField('aimTokens', v)}
              min={0}
              max={5}
              tooltip="Each Aim rerolls up to 2 dice (+ Precise X bonus)"
            />
            <NumberSpinner
              label="Surge tokens"
              value={store.surgeTokens}
              onChange={(v) => store.setField('surgeTokens', v)}
              min={0}
              max={5}
              tooltip="Each converts 1 surge → hit"
            />
            <NumberSpinner
              label="Observation tokens"
              value={store.observationTokens}
              onChange={(v) => store.setField('observationTokens', v)}
              min={0}
              max={5}
              tooltip="Each rerolls 1 die (on defender)"
            />
          </div>
        </SectionHeader>

        {/* ── Keywords Section ── */}
        <SectionHeader title="Keywords">
          <div className="space-y-3">
            {/* Numeric keywords */}
            <NumberSpinner
              label="Precise X"
              value={store.preciseX}
              onChange={(v) => store.setField('preciseX', v)}
              min={0}
              max={3}
              tooltip="Extra rerolls per Aim token"
            />
            <NumberSpinner
              label="Critical X"
              value={store.criticalX}
              onChange={(v) => store.setField('criticalX', v)}
              min={0}
              max={5}
              tooltip="Convert up to X surge → crit"
            />
            <NumberSpinner
              label="Lethal X"
              value={store.lethalX}
              onChange={(v) => store.setField('lethalX', v)}
              min={0}
              max={3}
              tooltip="Spend Aim for Pierce instead of reroll"
            />
            <NumberSpinner
              label="Sharpshooter X"
              value={store.sharpshooterX}
              onChange={(v) => store.setField('sharpshooterX', v)}
              min={0}
              max={3}
              tooltip="Reduce defender's Cover value by X"
            />
            <NumberSpinner
              label="Pierce X"
              value={store.pierceX}
              onChange={(v) => store.setField('pierceX', v)}
              min={0}
              max={5}
              tooltip="Cancel up to X block results"
            />
            <NumberSpinner
              label="Impact X"
              value={store.impactX}
              onChange={(v) => store.setField('impactX', v)}
              min={0}
              max={5}
              tooltip="Convert hit → crit vs Armor"
            />
            <NumberSpinner
              label="Ram X"
              value={store.ramX}
              onChange={(v) => store.setField('ramX', v)}
              min={0}
              max={3}
              tooltip="Change X results to crit"
            />

            {/* Boolean keywords */}
            <Toggle
              label="Blast"
              value={store.blast}
              onChange={(v) => store.setField('blast', v)}
              tooltip="Defender ignores Cover"
            />
            <Toggle
              label="High Velocity"
              value={store.highVelocity}
              onChange={(v) => store.setField('highVelocity', v)}
              tooltip="Defender can't spend Dodge; Deflect disabled"
            />
            <Toggle
              label="Suppressive"
              value={store.suppressive}
              onChange={(v) => store.setField('suppressive', v)}
              tooltip="+1 extra Suppression (informational)"
            />
            <Toggle
              label="Marksman"
              value={store.marksman}
              onChange={(v) => store.setField('marksman', v)}
              tooltip="Spend Aim to convert: blank → hit, hit → crit"
            />
            {/* Marksman Strategy — only shown when Marksman is enabled */}
            {store.marksman && (
              <Select
                label="Marksman strategy"
                value={store.marksmanStrategy}
                onChange={(v) =>
                  store.setField('marksmanStrategy', v as MarksmanStrategy)
                }
                options={MARKSMAN_STRATEGY_OPTIONS}
                tooltip="When to use Marksman instead of reroll"
              />
            )}
            <Toggle
              label="Jar'Kai Mastery"
              value={store.jarKaiMastery}
              onChange={(v) => store.setField('jarKaiMastery', v)}
              tooltip="Melee: spend attacker Dodge tokens for blank→hit, hit→crit"
            />
            {/* Dodge tokens (attacker) — only shown when Jar'Kai Mastery is enabled */}
            {store.jarKaiMastery && (
              <NumberSpinner
                label="Dodge tokens (attacker)"
                value={store.dodgeTokensAttacker}
                onChange={(v) => store.setField('dodgeTokensAttacker', v)}
                min={0}
                max={5}
                tooltip="Each converts blank→hit or hit→crit after surge conversion"
              />
            )}
            <Select
              label="Reroll strategy"
              value={store.rerollStrategy}
              onChange={(v) =>
                store.setField('rerollStrategy', v as RerollStrategy)
              }
              options={REROLL_STRATEGY_OPTIONS}
              tooltip="Conservative: reroll blanks/surges. Crit Fishing: also reroll hits"
            />
            <Toggle
              label="Jedi Hunter"
              value={store.jediHunter}
              onChange={(v) => store.setField('jediHunter', v)}
              tooltip="Gains surge → crit vs Force users"
            />
            <Toggle
              label="Duelist (attacker)"
              value={store.duelistAttacker}
              onChange={(v) => store.setField('duelistAttacker', v)}
              tooltip="Melee: spend Aim → attack gains Pierce 1"
            />
            <Toggle
              label="Makashi Mastery"
              value={store.makashiMastery}
              onChange={(v) => store.setField('makashiMastery', v)}
              tooltip="Melee: reduce Pierce X by 1 → disables Immune: Pierce and Impervious"
            />
            <Toggle
              label="Spray"
              value={store.spray}
              onChange={(v) => store.setField('spray', v)}
              tooltip="Weapon dice multiplied by minis in LOS"
            />
            <Toggle
              label="Immune: Deflect"
              value={store.immuneDeflect}
              onChange={(v) => store.setField('immuneDeflect', v)}
              tooltip="Cannot suffer wounds from Deflect/Shien reflection"
            />
            <Toggle
              label="Death From Above"
              value={store.deathFromAbove}
              onChange={(v) => store.setField('deathFromAbove', v)}
              tooltip="Defender can't use Cover (height advantage)"
            />
            <Toggle
              label="Hold the Line"
              value={store.holdTheLine}
              onChange={(v) => store.setField('holdTheLine', v)}
              tooltip="While Engaged: gains surge → hit (attack) and surge → block (defense)"
            />
          </div>
        </SectionHeader>

        {/* ── Upgrade / Downgrade Section ── */}
        <SectionHeader title="Upgrade / Downgrade">
          <div className="space-y-3">
            <NumberSpinner
              label="Anti-Materiel X"
              value={store.antiMaterielX}
              onChange={(v) => store.setField('antiMaterielX', v)}
              min={0}
              max={3}
              tooltip="Upgrade X dice (vs Vehicles)"
            />
            <NumberSpinner
              label="Anti-Personnel X"
              value={store.antiPersonnelX}
              onChange={(v) => store.setField('antiPersonnelX', v)}
              min={0}
              max={3}
              tooltip="Upgrade X dice (vs Troopers)"
            />
            <Toggle
              label="Cumbersome"
              value={store.cumbersome}
              onChange={(v) => store.setField('cumbersome', v)}
              tooltip="Downgrade each weapon die (if unit moved)"
            />
          </div>
        </SectionHeader>

        {/* ── Points Section ── */}
        <SectionHeader title="Points">
          <div className="space-y-3">
            <NumberSpinner
              label="Unit cost"
              value={store.unitCost}
              onChange={(v) => store.setField('unitCost', v)}
              min={0}
              max={999}
              tooltip="Points value for efficiency calculations"
            />
          </div>
        </SectionHeader>
      </div>
    </div>
  );
}
```

### Behavior

- **Faction Select** → filters Unit/Weapon combobox; stores `selectedFaction` in UI-only state
- **Unit/Weapon Combobox** → selecting a preset calls `loadPreset()` which resets to defaults then overlays the preset's profile values. Selecting "Custom" clears the preset ID without resetting fields.
- All spinner/toggle/select inputs call `store.setField(fieldName, value)` on change
- Marksman Strategy select is conditionally rendered only when Marksman toggle is on
- Sections collapse/expand via SectionHeader's internal state
- The panel scrolls independently when content overflows its column height

### Verify

- Renders all sections: Preset, Dice Pool, Tokens, Keywords, Upgrade/Downgrade, Points
- Faction dropdown shows 6 options (All + 5 factions)
- Changing faction filters the unit combobox
- Selecting a preset populates dice, surge chart, keywords, and unit cost
- All inputs update the attack config store
- Marksman Strategy appears/disappears when Marksman is toggled
- SectionHeaders collapse and expand

---

## Step 6A.2 — Write Attacker Panel Unit Tests

**File:** `src/components/AttackerPanel/AttackerPanel.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import AttackerPanel from './AttackerPanel';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import { AttackSurgeChart } from '../../engine/types';

describe('AttackerPanel', () => {
  beforeEach(() => {
    useAttackConfigStore.getState().reset();
  });

  // --- Rendering ---

  it('renders the panel header', () => {
    render(<AttackerPanel />);
    expect(screen.getByText('Attacker')).toBeInTheDocument();
  });

  it('renders all section headers', () => {
    render(<AttackerPanel />);
    expect(screen.getByText('Unit Preset')).toBeInTheDocument();
    expect(screen.getByText('Dice Pool')).toBeInTheDocument();
    expect(screen.getByText('Tokens')).toBeInTheDocument();
    expect(screen.getByText('Keywords')).toBeInTheDocument();
    expect(screen.getByText('Upgrade / Downgrade')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();
  });

  it('renders dice pool inputs with default values', () => {
    render(<AttackerPanel />);
    expect(screen.getByText('Red dice')).toBeInTheDocument();
    expect(screen.getByText('Black dice')).toBeInTheDocument();
    expect(screen.getByText('White dice')).toBeInTheDocument();
    expect(screen.getByText('Surge chart')).toBeInTheDocument();
  });

  it('renders token inputs', () => {
    render(<AttackerPanel />);
    expect(screen.getByText('Aim tokens')).toBeInTheDocument();
    expect(screen.getByText('Surge tokens')).toBeInTheDocument();
    expect(screen.getByText('Observation tokens')).toBeInTheDocument();
  });

  it('renders keyword inputs', () => {
    render(<AttackerPanel />);
    expect(screen.getByText('Precise X')).toBeInTheDocument();
    expect(screen.getByText('Critical X')).toBeInTheDocument();
    expect(screen.getByText('Pierce X')).toBeInTheDocument();
    expect(screen.getByText('Impact X')).toBeInTheDocument();
    expect(screen.getByText('Blast')).toBeInTheDocument();
    expect(screen.getByText('High Velocity')).toBeInTheDocument();
    expect(screen.getByText('Marksman')).toBeInTheDocument();
  });

  // --- Store Wiring ---

  it('updates store when red dice spinner is incremented', async () => {
    const user = userEvent.setup();
    render(<AttackerPanel />);

    // Find the increment button for Red dice
    const redDiceLabel = screen.getByText('Red dice');
    const container = redDiceLabel.closest('div')!.parentElement!;
    const incrementBtn = container.querySelector('button[aria-label="Increase Red dice"]')!;

    await user.click(incrementBtn);
    expect(useAttackConfigStore.getState().redDice).toBe(1);
  });

  it('updates store when Blast toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<AttackerPanel />);

    const blastToggle = screen.getByRole('switch', { name: /blast/i });
    await user.click(blastToggle);

    expect(useAttackConfigStore.getState().blast).toBe(true);
  });

  // --- Conditional Rendering ---

  it('does not show Marksman Strategy when Marksman is off', () => {
    render(<AttackerPanel />);
    expect(screen.queryByText('Marksman strategy')).not.toBeInTheDocument();
  });

  it('shows Marksman Strategy when Marksman is on', () => {
    useAttackConfigStore.getState().setField('marksman', true);
    render(<AttackerPanel />);
    expect(screen.getByText('Marksman strategy')).toBeInTheDocument();
  });

  // --- Preset Loading ---

  it('loads a preset when a unit is selected', async () => {
    const user = userEvent.setup();
    render(<AttackerPanel />);

    // This test verifies the integration: selecting a preset from the combobox
    // should call loadPreset() and update store values.
    // The exact interaction depends on SearchableCombobox's behavior.
    // For now, verify the store action works:
    const vaderPreset = {
      redDice: 6,
      pierceX: 3,
      impactX: 3,
      surgeChart: AttackSurgeChart.ToCrit,
      immuneDeflect: true,
      unitCost: 175,
    };

    useAttackConfigStore.getState().loadPreset('empire-vader-lightsaber', vaderPreset);

    expect(useAttackConfigStore.getState().redDice).toBe(6);
    expect(useAttackConfigStore.getState().pierceX).toBe(3);
    expect(useAttackConfigStore.getState().impactX).toBe(3);
    expect(useAttackConfigStore.getState().surgeChart).toBe(AttackSurgeChart.ToCrit);
    expect(useAttackConfigStore.getState().unitCost).toBe(175);
    // Fields not in preset should be defaults
    expect(useAttackConfigStore.getState().blackDice).toBe(0);
    expect(useAttackConfigStore.getState().blast).toBe(false);
  });
});
```

**Verify:**
- All tests pass: `npm test -- --run src/components/AttackerPanel/`
- Tests verify rendering, store wiring, conditional display, and preset loading

---

## Step 6A.3 — Create Attacker Panel Index File

**File:** `src/components/AttackerPanel/index.ts`

```ts
export { default as AttackerPanel } from './AttackerPanel';
```

---

## Step 6B.1 — Create Defender Panel Component

**File:** `src/components/DefenderPanel/DefenderPanel.tsx`

The main container component for all defender inputs. Composes shared components and wires them to `useDefenseConfigStore`.

```tsx
import { useCallback, useMemo } from 'react';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import {
  DefenseDieColor,
  DefenseSurgeChart,
  CoverType,
} from '../../engine/types';
import { Faction } from '../../data/presets';
import {
  getDefenderPresets,
  getDefenderPresetById,
  getFactionOptions,
} from '../../data/presetHelpers';
import { getUpgradesForSlot } from '../../data/upgradeResolver';
import { UPGRADE_SLOT_LABELS } from '../../data/types';
import { getResolvedUnitById } from '../../data/unitResolver';
import NumberSpinner from '../shared/NumberSpinner';
import Toggle from '../shared/Toggle';
import Select from '../shared/Select';
import SearchableCombobox from '../shared/SearchableCombobox';
import SectionHeader from '../shared/SectionHeader';
import type { SelectOption } from '../shared/Select';
import type { ComboboxOption } from '../shared/SearchableCombobox';

// ============================================================================
// Option Constants
// ============================================================================

const DEFENSE_DIE_OPTIONS: SelectOption<string>[] = [
  { value: DefenseDieColor.White, label: 'White' },
  { value: DefenseDieColor.Red, label: 'Red' },
];

const DEFENSE_SURGE_OPTIONS: SelectOption<string>[] = [
  { value: DefenseSurgeChart.None, label: 'None' },
  { value: DefenseSurgeChart.ToBlock, label: 'e → d (Block)' },
];

const COVER_OPTIONS: SelectOption<string>[] = [
  { value: CoverType.None, label: 'None' },
  { value: CoverType.Light, label: 'Light' },
  { value: CoverType.Heavy, label: 'Heavy' },
];

const FACTION_OPTIONS: SelectOption<string>[] = [
  { value: '', label: 'All Factions' },
  ...getFactionOptions().map((f) => ({ value: f.value, label: f.label })),
];

// ============================================================================
// Component
// ============================================================================

export default function DefenderPanel() {
  const store = useDefenseConfigStore();

  // ── Derived state ──

  const factionValue = store.selectedFaction ?? '';

  const unitOptions: ComboboxOption[] = useMemo(() => {
    const presets = getDefenderPresets(store.selectedFaction);
    return [
      { value: '', label: 'Custom' },
      ...presets.map((p) => ({ value: p.id, label: p.name })),
    ];
  }, [store.selectedFaction]);

  const presetValue = store.selectedPresetId ?? '';

  // ── Handlers ──

  const handleFactionChange = useCallback(
    (value: string) => {
      store.setSelectedFaction(value === '' ? null : (value as Faction));
    },
    [store],
  );

  const handlePresetChange = useCallback(
    (presetId: string) => {
      if (presetId === '') {
        store.setField('selectedPresetId' as any, null);
        return;
      }
      const preset = getDefenderPresetById(presetId);
      if (preset) {
        store.loadPreset(preset.id, preset.profile, preset.upgradeBar);
      }
    },
    [store],
  );

  // ── Render ──

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Panel Header */}
      <div className="sticky top-0 z-10 border-b border-gray-700 bg-gray-900 px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
          Defender
        </h2>
      </div>

      <div className="flex-1 space-y-4 px-4 py-4">
        {/* ── Preset Section ── */}
        <SectionHeader title="Unit Preset">
          <div className="space-y-3">
            <Select
              label="Faction"
              value={factionValue}
              onChange={handleFactionChange}
              options={FACTION_OPTIONS}
            />
            <SearchableCombobox
              label="Unit"
              value={presetValue}
              onChange={handlePresetChange}
              options={unitOptions}
              placeholder="Search units..."
            />
          </div>
        </SectionHeader>

        {/* ── Upgrade Slots Section ── */}
        {store.upgradeBar.length > 0 && (
          <SectionHeader title="Upgrades">
            <div className="space-y-3">
              {store.upgradeBar.map((slot, index) => {
                const options: SelectOption<string>[] = [
                  { value: '', label: 'None' },
                  ...getUpgradesForSlot(slot).map((u) => ({
                    value: u.id,
                    label: `${u.name} (${u.cost}pts)`,
                  })),
                ];
                return (
                  <Select
                    key={`${slot}-${index}`}
                    label={UPGRADE_SLOT_LABELS[slot]}
                    value={store.equippedUpgradeIds[index] ?? ''}
                    onChange={(v) =>
                      store.equipUpgrade(index, v === '' ? null : v)
                    }
                    options={options}
                    tooltip={`Equip a ${UPGRADE_SLOT_LABELS[slot]} upgrade`}
                  />
                );
              })}
            </div>
          </SectionHeader>
        )}

        {/* ── Defense Section ── */}
        <SectionHeader title="Defense">
          <div className="space-y-3">
            <Select
              label="Defense die"
              value={store.dieColor}
              onChange={(v) => store.setField('dieColor', v as DefenseDieColor)}
              options={DEFENSE_DIE_OPTIONS}
              tooltip="Unit's defense die color"
            />
            <Select
              label="Surge chart"
              value={store.surgeChart}
              onChange={(v) =>
                store.setField('surgeChart', v as DefenseSurgeChart)
              }
              options={DEFENSE_SURGE_OPTIONS}
              tooltip="How defense surge results are converted"
            />
            <NumberSpinner
              label="Minis in LOS"
              value={store.minisInLOS}
              onChange={(v) => store.setField('minisInLOS', v)}
              min={1}
              max={12}
              tooltip="Number of defending miniatures in line of sight (used by Spray)"
            />
          </div>
        </SectionHeader>

        {/* ── Cover Section ── */}
        <SectionHeader title="Cover">
          <div className="space-y-3">
            <Select
              label="Cover"
              value={store.coverType}
              onChange={(v) => store.setField('coverType', v as CoverType)}
              options={COVER_OPTIONS}
              tooltip="Terrain-based cover (None / Light / Heavy)"
            />
            <NumberSpinner
              label="Cover X"
              value={store.coverX}
              onChange={(v) => store.setField('coverX', v)}
              min={0}
              max={2}
              tooltip="Unit keyword: +X Cover vs Ranged (cap 2)"
            />
            <NumberSpinner
              label="Smoke tokens"
              value={store.smokeTokens}
              onChange={(v) => store.setField('smokeTokens', v)}
              min={0}
              max={3}
              tooltip="Each improves Cover by 1 (cap 2)"
            />
            <Toggle
              label="Suppressed"
              value={store.suppressed}
              onChange={(v) => store.setField('suppressed', v)}
              tooltip="Improves Cover by 1 (max Cover 2)"
            />
          </div>
        </SectionHeader>

        {/* ── Tokens Section ── */}
        <SectionHeader title="Tokens">
          <div className="space-y-3">
            <NumberSpinner
              label="Dodge tokens"
              value={store.dodgeTokens}
              onChange={(v) => store.setField('dodgeTokens', v)}
              min={0}
              max={5}
              tooltip="Each cancels 1 hit result"
            />
            <NumberSpinner
              label="Surge tokens"
              value={store.surgeTokens}
              onChange={(v) => store.setField('surgeTokens', v)}
              min={0}
              max={5}
              tooltip="Each converts 1 surge → block"
            />
          </div>
        </SectionHeader>

        {/* ── Keywords Section ── */}
        <SectionHeader title="Keywords">
          <div className="space-y-3">
            {/* Numeric keywords */}
            <NumberSpinner
              label="Armor X"
              value={store.armorX}
              onChange={(v) => store.setField('armorX', v)}
              min={0}
              max={5}
              tooltip="Cancel up to X hit results"
            />
            <NumberSpinner
              label="Weak Point X"
              value={store.weakPointX}
              onChange={(v) => store.setField('weakPointX', v)}
              min={0}
              max={5}
              tooltip="Grants attacker Impact X from specified arc"
            />
            <Toggle
              label="Immune: Pierce"
              value={store.immunePierce}
              onChange={(v) => store.setField('immunePierce', v)}
              tooltip="Pierce cannot cancel block results"
            />
            <Toggle
              label="Immune: Melee Pierce"
              value={store.immuneMeleePierce}
              onChange={(v) => store.setField('immuneMeleePierce', v)}
              tooltip="Pierce cannot cancel block results in Melee"
            />
            <Toggle
              label="Immune: Blast"
              value={store.immuneBlast}
              onChange={(v) => store.setField('immuneBlast', v)}
              tooltip="Blast has no effect"
            />
            <Toggle
              label="Impervious"
              value={store.impervious}
              onChange={(v) => store.setField('impervious', v)}
              tooltip="Roll extra defense dice equal to total Pierce X"
            />
            <NumberSpinner
              label="Danger Sense X"
              value={store.dangerSenseX}
              onChange={(v) => store.setField('dangerSenseX', v)}
              min={0}
              max={7}
              tooltip="+1 defense die per Suppression (up to X)"
            />
            {/* Suppression tokens — only shown when Danger Sense X > 0 */}
            {store.dangerSenseX > 0 && (
              <NumberSpinner
                label="Suppression tokens"
                value={store.suppressionTokens}
                onChange={(v) => store.setField('suppressionTokens', v)}
                min={0}
                max={10}
                tooltip="Current Suppression tokens (used by Danger Sense)"
              />
            )}
            <NumberSpinner
              label="Uncanny Luck X"
              value={store.uncannyLuckX}
              onChange={(v) => store.setField('uncannyLuckX', v)}
              min={0}
              max={3}
              tooltip="Reroll up to X defense dice"
            />
            <Toggle
              label="Block"
              value={store.block}
              onChange={(v) => store.setField('block', v)}
              tooltip="When spending Dodge → gains surge → block"
            />
            <Toggle
              label="Deflect"
              value={store.deflect}
              onChange={(v) => store.setField('deflect', v)}
              tooltip="Ranged: gains surge → block (+ attacker suffers 1 wound)"
            />
            {/* Shien Mastery — only shown when Deflect is enabled */}
            {store.deflect && (
              <Toggle
                label="Shien Mastery"
                value={store.shienMastery}
                onChange={(v) => store.setField('shienMastery', v)}
                tooltip="Deflect reflects 1 wound per surge (instead of 1 total)"
              />
            )}
            <Toggle
              label="Outmaneuver"
              value={store.outmaneuver}
              onChange={(v) => store.setField('outmaneuver', v)}
              tooltip="Dodge tokens can also cancel crit results"
            />
            <Toggle
              label="Low Profile"
              value={store.lowProfile}
              onChange={(v) => store.setField('lowProfile', v)}
              tooltip="Cover roll: −1 die, +1 auto block"
            />
            <NumberSpinner
              label="Shielded X"
              value={store.shieldedX}
              onChange={(v) => store.setField('shieldedX', v)}
              min={0}
              max={5}
              tooltip="Flip shields to cancel hit or crit results"
            />
            <Toggle
              label="Djem So Mastery"
              value={store.djemSoMastery}
              onChange={(v) => store.setField('djemSoMastery', v)}
              tooltip="Melee: attacker suffers 1 wound per blank in attack roll"
            />
            <Toggle
              label="Soresu Mastery"
              value={store.soresuMastery}
              onChange={(v) => store.setField('soresuMastery', v)}
              tooltip="Reroll all defense dice (Ranged only)"
            />
            <Toggle
              label="Duelist (defender)"
              value={store.duelistDefender}
              onChange={(v) => store.setField('duelistDefender', v)}
              tooltip="Spend Dodge → Immune: Pierce in Melee"
            />
            <Toggle
              label="Backup"
              value={store.backup}
              onChange={(v) => store.setField('backup', v)}
              tooltip="Cancel up to 2 hits (Ranged; operative/special forces)"
            />
            <Toggle
              label="Hold the Line"
              value={store.holdTheLine}
              onChange={(v) => store.setField('holdTheLine', v)}
              tooltip="While Engaged: gains surge → hit (attack) and surge → block (defense)"
            />
          </div>
        </SectionHeader>

        {/* ── Guardian Section ── */}
        <SectionHeader title="Guardian">
          <div className="space-y-3">
            <NumberSpinner
              label="Guardian X"
              value={store.guardianX}
              onChange={(v) => store.setField('guardianX', v)}
              min={0}
              max={3}
              tooltip="Nearby unit absorbs up to X hits and rolls defense dice"
            />
            {/* Guardian sub-config — only shown when Guardian X > 0 */}
            {store.guardianX > 0 && (
              <>
                <Select
                  label="Guardian die color"
                  value={store.guardianDieColor}
                  onChange={(v) =>
                    store.setField('guardianDieColor', v as DefenseDieColor)
                  }
                  options={DEFENSE_DIE_OPTIONS}
                  tooltip="The Guardian unit's defense die"
                />
                <Select
                  label="Guardian surge"
                  value={store.guardianSurgeChart}
                  onChange={(v) =>
                    store.setField(
                      'guardianSurgeChart',
                      v as DefenseSurgeChart,
                    )
                  }
                  options={DEFENSE_SURGE_OPTIONS}
                  tooltip="The Guardian unit's surge chart"
                />
                <Toggle
                  label="Guardian Deflect"
                  value={store.guardianDeflect}
                  onChange={(v) => store.setField('guardianDeflect', v)}
                  tooltip="Guardian unit has Deflect"
                />
                <Toggle
                  label="Guardian Soresu Mastery"
                  value={store.guardianSoresuMastery}
                  onChange={(v) => store.setField('guardianSoresuMastery', v)}
                  tooltip="Guardian unit has Soresu Mastery"
                />
                <NumberSpinner
                  label="Guardian Dodge tokens"
                  value={store.guardianDodgeTokens}
                  onChange={(v) => store.setField('guardianDodgeTokens', v)}
                  min={0}
                  max={5}
                  tooltip="Guardian unit's Dodge tokens"
                />
              </>
            )}
          </div>
        </SectionHeader>

        {/* ── Points Section ── */}
        <SectionHeader title="Points">
          <div className="space-y-3">
            <NumberSpinner
              label="Unit cost"
              value={store.unitCost}
              onChange={(v) => store.setField('unitCost', v)}
              min={0}
              max={999}
              tooltip="Points value for efficiency calculations"
            />
          </div>
        </SectionHeader>
      </div>
    </div>
  );
}
```

### Behavior

- Mirrors the Attacker Panel structure: Preset → Defense → Cover → Tokens → Keywords → Guardian → Points
- Faction and Unit combobox follow the same preset loading flow as the Attacker Panel
- **Conditional visibility:**
  - Suppression tokens spinner shown only when `dangerSenseX > 0`
  - Shien Mastery toggle shown only when `deflect === true`
  - Guardian sub-config (die color, surge, Deflect, Soresu, Dodge) shown only when `guardianX > 0`
- Guardian fields are always manually configured (never populated by presets) because Guardian represents a separate nearby unit
- `minisInLOS` defaults to 1 and is auto-filled when a preset with `minisInLOS` is loaded

### Verify

- Renders all sections: Preset, Defense, Cover, Tokens, Keywords, Guardian, Points
- Changing defense die updates `dieColor` in store
- Cover select updates `coverType` in store
- Guardian sub-config appears when Guardian X > 0, hides when Guardian X = 0
- Shien Mastery appears when Deflect is toggled on
- Suppression tokens appear when Danger Sense X > 0
- Selecting a defender preset populates die color, surge chart, keywords, and unit cost

---

## Step 6B.2 — Write Defender Panel Unit Tests

**File:** `src/components/DefenderPanel/DefenderPanel.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import DefenderPanel from './DefenderPanel';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import { DefenseDieColor, DefenseSurgeChart } from '../../engine/types';

describe('DefenderPanel', () => {
  beforeEach(() => {
    useDefenseConfigStore.getState().reset();
  });

  // --- Rendering ---

  it('renders the panel header', () => {
    render(<DefenderPanel />);
    expect(screen.getByText('Defender')).toBeInTheDocument();
  });

  it('renders all section headers', () => {
    render(<DefenderPanel />);
    expect(screen.getByText('Unit Preset')).toBeInTheDocument();
    expect(screen.getByText('Defense')).toBeInTheDocument();
    expect(screen.getByText('Cover')).toBeInTheDocument();
    expect(screen.getByText('Tokens')).toBeInTheDocument();
    expect(screen.getByText('Keywords')).toBeInTheDocument();
    expect(screen.getByText('Guardian')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();
  });

  it('renders defense inputs', () => {
    render(<DefenderPanel />);
    expect(screen.getByText('Defense die')).toBeInTheDocument();
    expect(screen.getByText('Surge chart')).toBeInTheDocument();
    expect(screen.getByText('Minis in LOS')).toBeInTheDocument();
  });

  it('renders cover inputs', () => {
    render(<DefenderPanel />);
    expect(screen.getByText('Cover')).toBeInTheDocument();
    expect(screen.getByText('Cover X')).toBeInTheDocument();
    expect(screen.getByText('Smoke tokens')).toBeInTheDocument();
    expect(screen.getByText('Suppressed')).toBeInTheDocument();
  });

  it('renders keyword inputs', () => {
    render(<DefenderPanel />);
    expect(screen.getByText('Armor X')).toBeInTheDocument();
    expect(screen.getByText('Immune: Pierce')).toBeInTheDocument();
    expect(screen.getByText('Deflect')).toBeInTheDocument();
    expect(screen.getByText('Guardian X')).toBeInTheDocument();
  });

  // --- Conditional Rendering ---

  it('does not show Guardian sub-config when Guardian X is 0', () => {
    render(<DefenderPanel />);
    expect(screen.queryByText('Guardian die color')).not.toBeInTheDocument();
    expect(screen.queryByText('Guardian surge')).not.toBeInTheDocument();
  });

  it('shows Guardian sub-config when Guardian X > 0', () => {
    useDefenseConfigStore.getState().setField('guardianX', 2);
    render(<DefenderPanel />);
    expect(screen.getByText('Guardian die color')).toBeInTheDocument();
    expect(screen.getByText('Guardian surge')).toBeInTheDocument();
    expect(screen.getByText('Guardian Deflect')).toBeInTheDocument();
    expect(screen.getByText('Guardian Soresu Mastery')).toBeInTheDocument();
    expect(screen.getByText('Guardian Dodge tokens')).toBeInTheDocument();
  });

  it('does not show Shien Mastery when Deflect is off', () => {
    render(<DefenderPanel />);
    expect(screen.queryByText('Shien Mastery')).not.toBeInTheDocument();
  });

  it('shows Shien Mastery when Deflect is on', () => {
    useDefenseConfigStore.getState().setField('deflect', true);
    render(<DefenderPanel />);
    expect(screen.getByText('Shien Mastery')).toBeInTheDocument();
  });

  it('does not show Suppression tokens when Danger Sense X is 0', () => {
    render(<DefenderPanel />);
    expect(screen.queryByText('Suppression tokens')).not.toBeInTheDocument();
  });

  it('shows Suppression tokens when Danger Sense X > 0', () => {
    useDefenseConfigStore.getState().setField('dangerSenseX', 3);
    render(<DefenderPanel />);
    expect(screen.getByText('Suppression tokens')).toBeInTheDocument();
  });

  // --- Store Wiring ---

  it('updates store when Dodge spinner is incremented', async () => {
    const user = userEvent.setup();
    render(<DefenderPanel />);

    const incrementBtn = screen.getByRole('button', {
      name: /increase dodge tokens/i,
    });
    await user.click(incrementBtn);

    expect(useDefenseConfigStore.getState().dodgeTokens).toBe(1);
  });

  it('updates store when Immune: Pierce is toggled', async () => {
    const user = userEvent.setup();
    render(<DefenderPanel />);

    const toggle = screen.getByRole('switch', { name: /immune: pierce/i });
    await user.click(toggle);

    expect(useDefenseConfigStore.getState().immunePierce).toBe(true);
  });

  // --- Preset Loading ---

  it('loads a defender preset correctly', () => {
    const stormtrooperProfile = {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
      minisInLOS: 4,
      unitCost: 44,
    };

    useDefenseConfigStore
      .getState()
      .loadPreset('empire-stormtroopers-def', stormtrooperProfile);

    const state = useDefenseConfigStore.getState();
    expect(state.dieColor).toBe(DefenseDieColor.Red);
    expect(state.surgeChart).toBe(DefenseSurgeChart.None);
    expect(state.minisInLOS).toBe(4);
    expect(state.unitCost).toBe(44);
    // Fields not in preset → defaults
    expect(state.armorX).toBe(0);
    expect(state.deflect).toBe(false);
    expect(state.guardianX).toBe(0);
  });
});
```

**Verify:**
- All tests pass: `npm test -- --run src/components/DefenderPanel/`
- Tests verify rendering, conditional display, store wiring, and preset loading

---

## Step 6B.3 — Create Defender Panel Index File

**File:** `src/components/DefenderPanel/index.ts`

```ts
export { default as DefenderPanel } from './DefenderPanel';
```

---

## Step 6C.1 — Create Attack Type Selector Component

**File:** `src/components/AttackTypeSelector/AttackTypeSelector.tsx`

A compact, self-contained selector for the global attack type. Positioned in the top bar area between the panels. Uses the `Select` shared component wired to `useAttackTypeStore`.

```tsx
import { useAttackTypeStore } from '../../stores/attackTypeStore';
import { AttackType } from '../../engine/types';
import Select from '../shared/Select';
import type { SelectOption } from '../shared/Select';

// ============================================================================
// Option Constants
// ============================================================================

const ATTACK_TYPE_OPTIONS: SelectOption<string>[] = [
  { value: AttackType.All, label: 'All' },
  { value: AttackType.Ranged, label: 'Ranged' },
  { value: AttackType.Melee, label: 'Melee' },
  { value: AttackType.Overrun, label: 'Overrun' },
];

// ============================================================================
// Component
// ============================================================================

export default function AttackTypeSelector() {
  const { attackType, setAttackType } = useAttackTypeStore();

  return (
    <div className="flex items-center gap-3">
      <Select
        label="Attack Type"
        value={attackType}
        onChange={(v) => setAttackType(v as AttackType)}
        options={ATTACK_TYPE_OPTIONS}
        tooltip="All: no restrictions. Ranged/Melee/Overrun: type-specific keywords apply."
      />
    </div>
  );
}
```

### Behavior

- Renders a single Select dropdown with four options
- Default value is `AttackType.All` (from store default)
- Changing the selection calls `setAttackType()` which updates the store
- The stored attack type is read by the simulation engine (via `getFullConfig` → `config.attackType`) to determine which keywords are active
- In Phase 6, this selector does **not** disable keywords in the panels. That wiring is deferred to Phase 8 (Integration).

### Verify

- Renders with "All" selected by default
- Changing selection updates `useAttackTypeStore`
- All four options are available: All, Ranged, Melee, Overrun

---

## Step 6C.2 — Write Attack Type Selector Unit Tests

**File:** `src/components/AttackTypeSelector/AttackTypeSelector.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import AttackTypeSelector from './AttackTypeSelector';
import { useAttackTypeStore } from '../../stores/attackTypeStore';
import { AttackType } from '../../engine/types';

describe('AttackTypeSelector', () => {
  beforeEach(() => {
    useAttackTypeStore.getState().reset();
  });

  it('renders with default value of All', () => {
    render(<AttackTypeSelector />);
    expect(screen.getByText('Attack Type')).toBeInTheDocument();
    // The select should show "All" as the current selection
    const select = screen.getByRole('combobox', { name: /attack type/i });
    expect(select).toHaveValue(AttackType.All);
  });

  it('renders all four options', () => {
    render(<AttackTypeSelector />);
    const select = screen.getByRole('combobox', { name: /attack type/i });
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(4);
  });

  it('updates store when selection changes', async () => {
    const user = userEvent.setup();
    render(<AttackTypeSelector />);

    const select = screen.getByRole('combobox', { name: /attack type/i });
    await user.selectOptions(select, AttackType.Melee);

    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.Melee);
  });

  it('reflects store changes', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Ranged);
    render(<AttackTypeSelector />);

    const select = screen.getByRole('combobox', { name: /attack type/i });
    expect(select).toHaveValue(AttackType.Ranged);
  });
});
```

**Verify:**
- All tests pass: `npm test -- --run src/components/AttackTypeSelector/`
- Default value is "All"
- Changing selection updates the store

---

## Step 6C.3 — Create Attack Type Selector Index File

**File:** `src/components/AttackTypeSelector/index.ts`

```ts
export { default as AttackTypeSelector } from './AttackTypeSelector';
```

---

## Step 6D.1 — Wire Panels into App Shell

**File:** `src/app/App.tsx` (modify existing)

Update the App shell from Phase 1 to render the Attacker Panel, Defender Panel, Attack Type Selector, and a placeholder for the Results Panel. This step connects the Phase 6 components into the responsive 3-column layout.

```tsx
import { AttackerPanel } from '../components/AttackerPanel';
import { DefenderPanel } from '../components/DefenderPanel';
import { AttackTypeSelector } from '../components/AttackTypeSelector';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h1 className="text-sm font-bold tracking-wide text-gray-200">
          ⚔️ Just Roll Crits
        </h1>
        <AttackTypeSelector />
      </header>

      {/* Main Content — 3-column layout on desktop, stacked on mobile */}
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-3 lg:divide-x lg:divide-gray-800">
        {/* Left Column: Attacker */}
        <div className="min-h-0 lg:h-[calc(100vh-49px)] lg:overflow-y-auto">
          <AttackerPanel />
        </div>

        {/* Center Column: Results (placeholder until Phase 7) */}
        <div className="flex min-h-0 items-center justify-center border-y border-gray-800 p-8 text-gray-500 lg:h-[calc(100vh-49px)] lg:overflow-y-auto lg:border-y-0">
          <p className="text-sm italic">Results will appear here</p>
        </div>

        {/* Right Column: Defender */}
        <div className="min-h-0 lg:h-[calc(100vh-49px)] lg:overflow-y-auto">
          <DefenderPanel />
        </div>
      </main>
    </div>
  );
}
```

### Behavior

- **Desktop (≥1024px / `lg:`):** Three equal-width columns with independent scrolling. The header bar spans the full width with the Attack Type selector on the right.
- **Mobile (<1024px):** Single column, stacked in order: Header → Attacker → Results placeholder → Defender. Each panel expands to full width.
- The `lg:h-[calc(100vh-49px)]` constrains each column to the viewport height minus the header, enabling independent scrolling within each panel.
- The Results placeholder will be replaced with the actual `ResultsPanel` component in Phase 7.

### Verify

- App renders with all three columns visible on desktop
- Attack Type selector appears in the header
- Each panel scrolls independently when content overflows
- On mobile viewport, panels stack vertically
- No TypeScript or runtime errors

---

## Step 6D.2 — Create Components Index File

**File:** `src/components/index.ts`

Barrel export for all panel components, supplementing the shared component exports from Phase 4.

```ts
// Panel components (Phase 6)
export { AttackerPanel } from './AttackerPanel';
export { DefenderPanel } from './DefenderPanel';
export { AttackTypeSelector } from './AttackTypeSelector';

// Shared components (Phase 4 — re-export for convenience)
export { default as NumberSpinner } from './shared/NumberSpinner';
export { default as Toggle } from './shared/Toggle';
export { default as Select } from './shared/Select';
export { default as SearchableCombobox } from './shared/SearchableCombobox';
export { default as SectionHeader } from './shared/SectionHeader';
```

---

## Verification Checklist

After completing all steps, confirm:

| Check | Command / Action |
|-------|-----------------|
| TypeScript compiles | `npx tsc --noEmit` passes with no errors |
| All panel tests pass | `npm test -- --run src/components/AttackerPanel/` |
| All defender tests pass | `npm test -- --run src/components/DefenderPanel/` |
| Attack type tests pass | `npm test -- --run src/components/AttackTypeSelector/` |
| App renders | `npm run dev` — app shell renders with both panels and attack type selector |
| Attacker preset loading | Select a faction → select a unit → dice, surge, keywords, cost, and upgrade slots populate correctly |
| Defender preset loading | Select a faction → select a unit → die color, surge, keywords, cost, and upgrade slots populate correctly |
| Upgrade slot equipping | Select an upgrade from a slot dropdown → store's `equippedUpgradeIds` updates; selecting "None" clears it |
| Conditional visibility | Marksman Strategy appears when Marksman toggled on; Guardian sub-config appears when Guardian X > 0; Shien Mastery appears when Deflect toggled on; Suppression tokens appear when Danger Sense X > 0 |
| Store wiring | Change any input → verify matching store field updates via React DevTools or console |
| Scroll behavior | On desktop, each panel column scrolls independently |
| Mobile layout | On mobile viewport, panels stack vertically |
| Section collapse | Click SectionHeader → content collapses/expands |
| Keyboard nav | Tab through all inputs; spinners respond to Arrow keys |
| No console errors | Browser console is clean (no warnings about missing keys, invalid props, etc.) |

---

## Files Created in This Phase

| File | Purpose |
|------|---------|
| `src/components/AttackerPanel/AttackerPanel.tsx` | Attacker input panel component |
| `src/components/AttackerPanel/AttackerPanel.test.tsx` | Attacker panel unit tests |
| `src/components/AttackerPanel/index.ts` | Attacker panel barrel export |
| `src/components/DefenderPanel/DefenderPanel.tsx` | Defender input panel component |
| `src/components/DefenderPanel/DefenderPanel.test.tsx` | Defender panel unit tests |
| `src/components/DefenderPanel/index.ts` | Defender panel barrel export |
| `src/components/AttackTypeSelector/AttackTypeSelector.tsx` | Attack type selector component |
| `src/components/AttackTypeSelector/AttackTypeSelector.test.tsx` | Attack type selector unit tests |
| `src/components/AttackTypeSelector/index.ts` | Attack type selector barrel export |
| `src/components/index.ts` | Components barrel export (panels + shared) |
| `src/app/App.tsx` | Modified — wires panels into 3-column layout |

---

## Files Modified in This Phase

| File | Change |
|------|--------|
| `src/app/App.tsx` | Replace layout placeholder with AttackerPanel, DefenderPanel, AttackTypeSelector, and Results placeholder |

---

## Dependency Graph (Within Phase 6)

```
Phase 4 (Shared UI Components)
  NumberSpinner, Toggle, Select,
  SearchableCombobox, SectionHeader
       │
       ▼
Phase 5A (Zustand Stores)           Phase 5.5 (Unit Data & Upgrades)
  useAttackConfigStore               getAttackerPresets()
  useDefenseConfigStore              getDefenderPresets()
  useAttackTypeStore                 getUpgradesForSlot()
  store.equipUpgrade()               UPGRADE_SLOT_LABELS
       │                                    │
       └────────────┬───────────────────────┘
                    │
                    ▼
           ┌────────────────┐
           │   Phase 6A     │
           │ AttackerPanel   │
           │ (6A.1 → 6A.3) │
           └────────────────┘
           ┌────────────────┐
           │   Phase 6B     │
           │ DefenderPanel   │
           │ (6B.1 → 6B.3) │
           └────────────────┘
           ┌────────────────┐
           │   Phase 6C     │
           │ AttackTypeSel.  │
           │ (6C.1 → 6C.3) │
           └────────────────┘
                    │
                    ▼
           ┌────────────────┐
           │   Phase 6D     │
           │ App Shell Wire  │
           │ (6D.1 → 6D.2) │
           └────────────────┘
```

**Implementation Order:**

1. **6A.1–6A.3** — Attacker Panel (component, tests, index)
2. **6B.1–6B.3** — Defender Panel (component, tests, index) — can be done in parallel with 6A
3. **6C.1–6C.3** — Attack Type Selector (component, tests, index) — can be done in parallel with 6A/6B
4. **6D.1–6D.2** — Wire into App shell (depends on 6A + 6B + 6C)

**Parallelism:** Steps 6A, 6B, and 6C are fully independent and can be implemented simultaneously. Step 6D requires all three to be complete.
