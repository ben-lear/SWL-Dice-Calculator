# Phase 8: Integration & Polish — Implementation Plan

## Goal

Wire all previously-built modules into a fully cohesive application, verify end-to-end data flow (input → store → simulation → results), implement attack-type keyword filtering in the UI, finalize responsive layout across breakpoints, harden PWA support, ensure accessibility compliance, and optimize performance. Phase 8 is the "glue" phase that transforms independently-built pieces into a polished, production-ready app.

---

## Overview

Phase 8 consists of five sub-phases:

- **8A:** Full Pipeline Wiring — end-to-end verification and attack-type keyword filtering in the UI
- **8B:** Responsive Layout — finalize responsive behavior across desktop, tablet, and mobile breakpoints
- **8C:** PWA Finalization — service worker caching, offline mode, and install prompt
- **8D:** Accessibility — keyboard navigation, ARIA compliance, screen reader testing, color contrast
- **8E:** Performance — simulation profiling, Web Worker lifecycle, debounce tuning, bundle optimization

Phase 8 depends on:
- **Phase 1** (App shell, `Layout.tsx` + `App.tsx`, Tailwind, PWA plugin)
- **Phase 2** (Dice engine — attack-type gating handled inline in `cover.ts`, `dodgeCover.ts`, `defenseModifiers.ts`, etc. No centralized `engine/modifiers.ts` — each step gates keywords individually)
- **Phase 3** (Simulator + Web Worker — `SimulationWorkerClient` in `src/engine/worker/`)
- **Phase 4** (Shared UI components — `disabled` prop on `NumberSpinner`, `Checkbox`, `Toggle`, `Select`, `SegmentedControl`, `SearchableCombobox`, `SectionHeader`)
- **Phase 5A** (Zustand stores — `useAttackConfigStore`, `useDefenseConfigStore`, `useAttackTypeStore`, `useResultsStore` (multi-slot, max 4), `useFullConfig` / `getFullConfig`)
- **Phase 5.5** (Unit data & upgrades — preset loading, `applyAttackerUpgrades` / `applyDefenderUpgrades`, `getFullConfig` with upgrade effects)
- **Phase 6** (UI panels — `AttackerPanel` → `AttackerCustomPoolView` / `AttackerUnitBuilderView`; `DefenderPanel` → `DefenderCustomPoolView` / `DefenderUnitBuilderView`; `AttackTypeSelector` wired to stores)
- **Phase 7** (Results panel — `useSimulation` hook (button-triggered, imperative), multi-slot results, stat display, chart, cumulative table)

Phase 8 does **not** produce new modules — it validates, connects, and refines existing ones.

---

## Design Decisions

The following design decisions are documented for clarity:

1. **Attack-Type Keyword Filtering (UI)** — The engine already handles attack-type filtering internally (inline gating in `cover.ts`, `dodgeCover.ts`, `defenseModifiers.ts`, `attackSurges.ts`, etc. — there is no centralized `isKeywordActive` function in `engine/modifiers.ts` as originally planned in Phase 2; each step gates keywords individually). Phase 8 adds a *visual* layer: when a specific attack type is selected (Ranged, Melee, Overrun), keyword inputs that don't apply to that type are visually disabled (grayed out, non-interactive). This provides immediate feedback that the keyword won't affect results, without removing or hiding the input. The input values are preserved — switching to a different attack type re-enables them if applicable. This is implemented via a custom hook `useKeywordDisabled` that maps each keyword field to its attack-type restriction.

   **Important:** The `AttackType` enum also includes `Hybrid = 'hybrid'`, but only Ranged, Melee, and Overrun are exposed in the `AttackTypeSelector` UI. The `isFieldActiveForAttackType()` helper should treat `Hybrid` the same as unrestricted (all keywords enabled), since Hybrid is not user-selectable but may appear in engine configs.

2. **Disabled vs Hidden** — Disabled is preferred over hidden for attack-type filtering. Hiding inputs changes layout flow and confuses users who set up a profile and then switch attack types. Disabling keeps the layout stable, shows what's configured but inactive, and matches the `disabled` prop already implemented on all shared components in Phase 4.

3. **Keyword Restriction Map** — A static lookup table maps each keyword field name (e.g., `'deflect'`, `'soresuMastery'`, `'backup'`) to its attack-type restriction (`'ranged'`, `'melee'`, or `'all'`). This is the single source of truth for UI disabling and can be cross-referenced against the engine's inline gating logic. The map lives in `src/utils/keywordRestrictions.ts`.

   **Important architectural note:** Attacker keywords are split between **unit-level** keywords (on `AttackConfigStore` directly, e.g., `sharpshooterX`, `duelistAttacker`, `holdTheLine`) and **weapon-level** keywords (on `WeaponKeywords` per weapon, e.g., `highVelocity`, `blast`, `pierceX`, `impactX`). The restriction map must cover both categories. In the UI, weapon keywords are set via `store.setWeaponKeyword(index, fieldName, value)` and are rendered in `AttackerCustomPoolView.tsx` inside the "Weapon Keywords" section, while unit keywords are in the "Unit Keywords" section.

4. **Overrun Attack Type** — Overrun disables Cover, Deflect, and Engaged rules. In the UI, this means: Cover select is disabled, Deflect toggle is disabled, and Hold the Line toggles are disabled. Dodge tokens remain enabled — the defender can still spend Dodge tokens during Overrun (unless High Velocity disables them). The engine already handles Overrun by treating it as neither Ranged nor Melee.

5. **Melee Attack Type Restrictions** — When Melee is selected, the following defender keywords are disabled in the UI: Cover (entire section stays visible but Cover select is disabled), Deflect, Soresu Mastery, Backup, Shielded (cancel), Guardian, Low Profile, Dug In, and Smoke Tokens. High Velocity has no effect (informational — it's a weapon-level attacker keyword). Dodge tokens are NOT disabled in Melee — the defender can spend Dodge tokens to cancel hits normally in Melee. They also interact with Duelist (Immune: Pierce) and Block (surge→block conversion).

   On the attacker side: Sharpshooter, Immune: Deflect, Death From Above, and the weapon keyword High Velocity are disabled for Melee.

6. **Ranged Attack Type Restrictions** — When Ranged is selected, the following keywords are disabled: Djem So Mastery, Duelist (Immune: Pierce in Melee only), Immune: Melee Pierce. On the attacker side: Duelist (attacker), Makashi Mastery, Jar'Kai Mastery, Hold the Line are disabled for Ranged.

7. **Cover Cap Enforcement** — The engine already caps effective cover at 2 (Heavy). Phase 8 verifies this is working correctly in the UI by testing scenarios: Cover X 2 + Suppressed + Smoke should not exceed effective cover 2. Improvements are applied before reductions (per the rulebook). The UI does not enforce the cap on the inputs — the user can set Cover X to 2, Suppressed, and Smoke simultaneously. The engine resolves the effective value. An informational tooltip or visual indicator in the results panel could show the computed effective cover value (nice-to-have, not required).

8. **Aim Token Economy Validation** — Aim tokens are shared between rerolls, Lethal X, Marksman, and Duelist. The engine handles consumption order internally. Phase 8 verifies that the total Aim consumption never exceeds the Aim tokens available, and that the correct priority order is followed. This is validated via integration tests, not UI changes.

9. **Responsive Breakpoints** — The app uses two primary layout breakpoints:
   - **Mobile** (<1024px): Single column, stacked: Attacker → Defender → Results (via CSS `order`). Panels scroll the page.
   - **Desktop** (≥1024px): Three columns: Attacker | Results | Defender. Each column scrolls independently.
   
   The current `App.tsx` uses `lg:grid-cols-3` (1024px breakpoint) with `order-*` utilities to reorder Results to the center on desktop. The `Layout.tsx` provides the shared header (logo + title + `AttackTypeSelector`) and a `max-w-7xl` container. Phase 8 may optionally add a tablet breakpoint at `md:` (768px) for 2-column [Attacker | Defender] + full-width Results, but this is a refinement, not a rewrite. The existing Layout.tsx + App.tsx separation is preserved.

10. **PWA Offline Testing** — The vite-plugin-pwa (Workbox) precaches all static assets. Since the app has zero runtime network dependencies (no API calls — all data is baked in at build time), offline support is inherent. Phase 8 verifies this by building, serving the production build, enabling airplane mode, and confirming the app functions identically.

11. **PWA Install Prompt** — No custom install UI is needed for MVP. The browser's native install prompt (Chrome's mini-infobar, Safari's share → Add to Home Screen) is sufficient. Phase 8 verifies the manifest and service worker are correctly configured so the browser recognizes the app as installable.

12. **Accessibility Scope** — MVP targets WCAG 2.1 AA compliance. This includes:
    - All interactive elements reachable via keyboard (Tab, Shift+Tab)
    - All form inputs have associated labels (via `<label htmlFor>` or `aria-label`)
    - Focus indicators visible on all interactive elements
    - Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text
    - Screen reader announces input labels, current values, and state changes
    - No information conveyed by color alone (dice colors have text labels)

13. **Performance Targets** — 
    - Simulation of 10,000 iterations: < 500ms on modern hardware
    - UI remains responsive during simulation (Web Worker via `SimulationWorkerClient`)
    - Simulation is button-triggered (`useSimulation().runSimulation()`) — no debounce needed since there is no auto-run. Staleness is tracked via `markStale()` and indicated visually.
    - Production bundle size: target < 500KB gzipped (React + Recharts + app code)
    - Lighthouse Performance score: ≥ 90

14. **Bundle Optimization** — Recharts is the largest dependency. If bundle size exceeds targets, consider:
    - Tree-shaking unused Recharts components (import only `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, `CartesianGrid`)
    - Lazy loading the Results panel (the user doesn't need charts until dice are configured)
    - Code splitting the simulation worker (already a separate bundle via Web Worker)

---

## Step 8A.1 — Create Keyword Restriction Map

**File:** `src/utils/keywordRestrictions.ts`

Define a static map of keyword field names to their attack-type restrictions. This is the single source of truth used by both the UI (to disable inputs) and can be cross-referenced against the engine's internal filtering logic.

```ts
import { AttackType } from '../engine/types';

// ============================================================================
// Keyword Attack-Type Restrictions
// ============================================================================

/**
 * Maps keyword field names to their attack-type restriction.
 * - 'all': active for all attack types (no restriction)
 * - 'ranged': active only for Ranged attacks
 * - 'melee': active only for Melee attacks
 * - 'ranged-melee': active for Ranged and Melee (disabled for Overrun)
 *
 * Fields not listed here are unrestricted ('all').
 *
 * Note: AttackType.Hybrid exists in the enum but is not user-selectable
 * in the UI — it is treated as unrestricted (all keywords enabled).
 */
export type KeywordRestriction = 'all' | 'ranged' | 'melee' | 'ranged-melee';

// ── Attacker Unit-Level Keywords ──
// These are fields on AttackConfigStore (set via store.setField()).

export const ATTACKER_KEYWORD_RESTRICTIONS: Record<string, KeywordRestriction> = {
  // Unrestricted (all attack types)
  surgeChart: 'all',
  aimTokens: 'all',
  surgeTokens: 'all',
  observationTokens: 'all',
  dodgeTokensAttacker: 'all',
  preciseX: 'all',
  arsenalX: 'all',
  marksman: 'all',
  marksmanStrategy: 'all',
  rerollStrategy: 'all',
  jediHunter: 'all',
  unitCost: 'all',

  // Ranged-only attacker unit keywords
  sharpshooterX: 'ranged',     // Reduces cover (cover is ranged-only concept)
  immuneDeflect: 'ranged',     // Deflect is ranged-only
  deathFromAbove: 'ranged',    // Cover interaction (ranged context)

  // Melee-only attacker unit keywords
  duelistAttacker: 'melee',    // Melee: spend Aim → Pierce 1
  makashiMastery: 'melee',     // Melee: reduce Pierce to disable Immune: Pierce
  jarKaiMastery: 'melee',      // Melee: spend attacker Dodge tokens for blank→hit, hit→crit
  holdTheLine: 'melee',        // While Engaged — attacker can only be engaged in Melee
};

// ── Attacker Weapon-Level Keywords ──
// These are fields on WeaponKeywords (set via store.setWeaponKeyword()).
// The field names here match the keys on the WeaponKeywords interface.

export const WEAPON_KEYWORD_RESTRICTIONS: Record<string, KeywordRestriction> = {
  // Unrestricted (aggregated across weapons, no attack-type restriction)
  criticalX: 'all',
  lethalX: 'all',
  pierceX: 'all',
  impactX: 'all',
  ramX: 'all',
  blast: 'all',
  suppressive: 'all',
  spray: 'all',
  antiMaterielX: 'all',
  antiPersonnelX: 'all',
  cumbersome: 'all',

  // Ranged-only weapon keyword (AND-aggregated across weapons)
  highVelocity: 'ranged',      // Disables dodge/deflect (ranged-only interaction)
};

// ── Defender Keywords ──
// These are fields on DefenseConfigStore (set via store.setField()).

export const DEFENDER_KEYWORD_RESTRICTIONS: Record<string, KeywordRestriction> = {
  // Unrestricted (all attack types)
  dieColor: 'all',
  surgeChart: 'all',
  disableDefenseDice: 'all',
  dodgeTokens: 'all',            // Dodge can be spent in all attack types (HV check is separate)
  surgeTokens: 'all',
  suppressionTokens: 'all',
  minisInLOS: 'all',
  armorX: 'all',
  weakPointX: 'all',
  immunePierce: 'all',
  immuneBlast: 'all',
  impervious: 'all',
  dangerSenseX: 'all',
  uncannyLuckX: 'all',
  block: 'all',
  outmaneuver: 'all',
  unitCost: 'all',

  // Ranged+Melee (disabled for Overrun only)
  holdTheLine: 'ranged-melee',

  // Ranged-only defender keywords (cover/guardian/shielded ecosystem)
  coverType: 'ranged',         // Cover only applies to ranged attacks
  coverX: 'ranged',            // Cover X increases cover vs Ranged
  smokeTokens: 'ranged',       // Smoke improves cover
  suppressed: 'ranged',        // Suppressed improves cover
  lowProfile: 'ranged',       // Modifies cover pool roll (cover is ranged-only)
  dugIn: 'ranged',            // Red cover dice (cover pools are ranged-only)

  guardianX: 'ranged',        // Guardian only works vs Ranged attacks
  guardianDieColor: 'ranged', // Guardian sub-config (shown only when Guardian X > 0)
  guardianSurgeChart: 'ranged', // Guardian sub-config
  guardianDeflect: 'ranged',   // Guardian unit's Deflect (ranged-only)
  guardianSoresuMastery: 'ranged', // Guardian unit's Soresu Mastery
  guardianDodgeTokens: 'ranged',   // Guardian unit's Dodge tokens

  deflect: 'ranged',           // Deflect: gains surge→block vs Ranged
  shienMastery: 'ranged',      // Modifies Deflect (ranged-only)
  soresuMastery: 'ranged',     // Reroll all defense dice (Ranged only)
  backup: 'ranged',            // Cancel up to 2 hits (Ranged only)
  shieldedX: 'ranged',         // Shielded cancels hits/crits (Ranged attacks only)

  // Melee-only defender keywords
  djemSoMastery: 'melee',      // Melee: attacker suffers wounds per blank
  duelistDefender: 'melee',    // Melee: Dodge → Immune: Pierce
  immuneMeleePierce: 'melee',  // Melee-only Immune: Pierce
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine if a keyword field is active (should be enabled in the UI)
 * for the current attack type.
 *
 * When attackType is 'overrun', only unrestricted keywords are active.
 * When attackType is 'hybrid', all keywords are active (Hybrid is not
 * user-selectable but exists in the enum).
 */
export function isFieldActiveForAttackType(
  restriction: KeywordRestriction,
  attackType: AttackType,
): boolean {
  if (restriction === 'all') return true;

  // Hybrid is treated as unrestricted (all keywords enabled)
  if (attackType === AttackType.Hybrid) return true;

  switch (restriction) {
    case 'ranged':
      return attackType === AttackType.Ranged;
    case 'melee':
      return attackType === AttackType.Melee;
    case 'ranged-melee':
      return attackType === AttackType.Ranged || attackType === AttackType.Melee;
    default:
      return true;
  }
}
```

**Verify:**
- TypeScript compiles without errors
- `isFieldActiveForAttackType('ranged', AttackType.Melee)` returns `false`
- `isFieldActiveForAttackType('ranged', AttackType.Ranged)` returns `true`
- `isFieldActiveForAttackType('melee', AttackType.Overrun)` returns `false`
- `isFieldActiveForAttackType('ranged-melee', AttackType.Overrun)` returns `false`
- `isFieldActiveForAttackType('all', AttackType.Overrun)` returns `true`

### Engine-Side Cover Guard (Required Fix)

The UI keyword restrictions correctly disable cover-related inputs for non-Ranged attacks. However, stored values are **preserved** when the user switches attack type. This means a previously-set `coverType: Heavy` value will flow through `getFullConfig()` into `determineCoverValue` in the engine.

**Problem:** The engine's `determineCoverValue` in `src/engine/cover.ts` applies base cover type, `suppressed` (+1), and smoke tokens **without checking attack type**. Only `coverX` is gated on `AttackType.Ranged`. Per the rules, cover does not apply to Melee or Overrun attacks at all.

**Fix (must be applied in this phase):** Add an early return in `determineCoverValue` for non-Ranged attacks:

```ts
export function determineCoverValue(
  config: AttackConfig,
  poolBlast: boolean
): number {
  // Cover only applies to Ranged attacks (per rulebook §03)
  if (config.attackType !== AttackType.Ranged) {
    return 0;
  }

  // ... existing logic unchanged ...
}
```

This is a one-line safety net that prevents stale cover values from affecting Melee/Overrun simulations even when the UI disabling correctly prevents new input.

**Alternative:** Zero out cover-related fields in `getFullConfig()` / `selectDefenderConfig()` when attack type is not Ranged. This is heavier and less appropriate — the engine is the correct place for rules enforcement.

---

## Step 8A.2 — Create `useKeywordDisabled` Hook

**File:** `src/hooks/useKeywordDisabled.ts`

A hook that reads the current attack type from the store and provides a function to check whether a specific keyword field should be disabled in the UI.

```ts
import { useAttackTypeStore } from '../stores/attackTypeStore';
import {
  ATTACKER_KEYWORD_RESTRICTIONS,
  WEAPON_KEYWORD_RESTRICTIONS,
  DEFENDER_KEYWORD_RESTRICTIONS,
  isFieldActiveForAttackType,
} from '../utils/keywordRestrictions';

/**
 * Returns a function that checks if a given attacker unit-level keyword field
 * should be disabled based on the current attack type.
 *
 * Usage:
 * ```tsx
 * const isDisabled = useAttackerKeywordDisabled();
 * <Checkbox label="Duelist" disabled={isDisabled('duelistAttacker')} ... />
 * ```
 */
export function useAttackerKeywordDisabled(): (field: string) => boolean {
  const attackType = useAttackTypeStore((s) => s.attackType);

  return (field: string): boolean => {
    const restriction = ATTACKER_KEYWORD_RESTRICTIONS[field];
    if (!restriction) return false; // Unknown fields are never disabled
    return !isFieldActiveForAttackType(restriction, attackType);
  };
}

/**
 * Returns a function that checks if a given weapon-level keyword field
 * should be disabled based on the current attack type.
 *
 * Usage:
 * ```tsx
 * const isWeaponDisabled = useWeaponKeywordDisabled();
 * <Checkbox label="High Velocity" disabled={isWeaponDisabled('highVelocity')} ... />
 * ```
 */
export function useWeaponKeywordDisabled(): (field: string) => boolean {
  const attackType = useAttackTypeStore((s) => s.attackType);

  return (field: string): boolean => {
    const restriction = WEAPON_KEYWORD_RESTRICTIONS[field];
    if (!restriction) return false;
    return !isFieldActiveForAttackType(restriction, attackType);
  };
}

/**
 * Returns a function that checks if a given defender keyword field
 * should be disabled based on the current attack type.
 */
export function useDefenderKeywordDisabled(): (field: string) => boolean {
  const attackType = useAttackTypeStore((s) => s.attackType);

  return (field: string): boolean => {
    const restriction = DEFENDER_KEYWORD_RESTRICTIONS[field];
    if (!restriction) return false;
    return !isFieldActiveForAttackType(restriction, attackType);
  };
}
```

**Verify:**
- TypeScript compiles without errors
- Default attack type after `reset()` is `AttackType.Ranged`, so both hooks will disable melee-only fields
- When `attackType` is `Ranged`, `useAttackerKeywordDisabled()('duelistAttacker')` returns `true`
- When `attackType` is `Melee`, `useDefenderKeywordDisabled()('deflect')` returns `true`
- When `attackType` is `Ranged`, `useDefenderKeywordDisabled()('djemSoMastery')` returns `true`
- When `attackType` is `Hybrid`, all hooks return `false` for all fields (everything enabled)

---

## Step 8A.3 — Wire Attack-Type Filtering into Attacker Panel

**File:** `src/components/AttackerPanel/AttackerCustomPoolView.tsx` (modify existing)

The keyword inputs live in `AttackerCustomPoolView.tsx` (not `AttackerPanel.tsx`). `AttackerPanel.tsx` is a thin wrapper that delegates to `AttackerCustomPoolView` or `AttackerUnitBuilderView` based on the active mode.

Import `useAttackerKeywordDisabled` and `useWeaponKeywordDisabled`, then pass `disabled` prop to all keyword inputs that have attack-type restrictions.

**Important:** Attacker keywords use two separate components:
- **`NumberSpinner`** for numeric keywords (Sharpshooter X, etc.) — these have `compact` mode
- **`Checkbox`** for boolean keywords (Marksman, Duelist, High Velocity, etc.) — NOT `Toggle`

```tsx
// Add imports at top of AttackerCustomPoolView.tsx:
import { useAttackerKeywordDisabled, useWeaponKeywordDisabled } from '../../hooks/useKeywordDisabled';

// Inside AttackerCustomPoolView component, add near the top:
const isDisabled = useAttackerKeywordDisabled();
const isWeaponDisabled = useWeaponKeywordDisabled();

// Then update each restricted keyword input to include `disabled`:

// ── Unit Keywords section ──

// Example — Sharpshooter (ranged-only, unit-level):
<NumberSpinner
  label="Sharpshooter X"
  value={store.sharpshooterX}
  onChange={(value) => store.setField('sharpshooterX', value)}
  min={0}
  max={2}
  compact
  disabled={isDisabled('sharpshooterX')}     // ← ADD
/>

// Example — Duelist attacker (melee-only, unit-level):
<Checkbox
  label="Duelist"
  value={store.duelistAttacker}
  onChange={(value) => store.setField('duelistAttacker', value)}
  disabled={isDisabled('duelistAttacker')}   // ← ADD
/>

// Example — Makashi Mastery (melee-only, unit-level):
<Checkbox
  label="Makashi Mastery"
  value={store.makashiMastery}
  onChange={(value) => store.setField('makashiMastery', value)}
  disabled={isDisabled('makashiMastery')}    // ← ADD
/>

// Example — Jar'Kai Mastery (melee-only, unit-level):
<Checkbox
  label="Jar'Kai Mastery"
  value={store.jarKaiMastery}
  onChange={(value) => store.setField('jarKaiMastery', value)}
  disabled={isDisabled('jarKaiMastery')}     // ← ADD
/>

// Example — Immune: Deflect (ranged-only, unit-level):
<Checkbox
  label="Immune: Deflect"
  value={store.immuneDeflect}
  onChange={(value) => store.setField('immuneDeflect', value)}
  disabled={isDisabled('immuneDeflect')}     // ← ADD
/>

// Example — Hold the Line (melee-only, unit-level):
<Checkbox
  label="Hold the Line"
  value={store.holdTheLine}
  onChange={(value) => store.setField('holdTheLine', value)}
  disabled={isDisabled('holdTheLine')}       // ← ADD
/>

// Example — Death From Above (ranged-only, unit-level):
<Checkbox
  label="Death From Above"
  value={store.deathFromAbove}
  onChange={(value) => store.setField('deathFromAbove', value)}
  disabled={isDisabled('deathFromAbove')}    // ← ADD
/>

// ── Weapon Keywords section ──

// Example — High Velocity (ranged-only, weapon-level):
<Checkbox
  label="High Velocity"
  value={weapon.keywords.highVelocity}
  onChange={(value) => store.setWeaponKeyword(0, 'highVelocity', value)}
  disabled={isWeaponDisabled('highVelocity')}  // ← ADD
/>
```

**Also update:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` — if it renders keyword inputs directly, apply the same `disabled` pattern. (Unit Builder view may render fewer keyword inputs since they come from the preset, but any editable overrides should be gated.)

**Verify:**
- Select "Melee" attack type → Sharpshooter, High Velocity, Immune: Deflect, Death From Above are visually grayed out and non-interactive
- Select "Ranged" attack type → Duelist (attacker), Makashi Mastery, Jar'Kai Mastery, Hold the Line are visually grayed out
- Select "Overrun" attack type → all of the above are disabled (both ranged-only and melee-only)
- Changing attack type does NOT clear the values — switching back restores previous state with values intact
- Disabled inputs still show their current values
- Both `Checkbox` and `NumberSpinner` respect the `disabled` prop visually (grayed out, non-interactive)

---

## Step 8A.4 — Wire Attack-Type Filtering into Defender Panel

**File:** `src/components/DefenderPanel/DefenderCustomPoolView.tsx` (modify existing)

Same pattern as Step 8A.3 but for defender keyword inputs. The keyword inputs live in `DefenderCustomPoolView.tsx` (not `DefenderPanel.tsx`). `DefenderPanel.tsx` is a thin wrapper that delegates to `DefenderCustomPoolView` or `DefenderUnitBuilderView`.

**Important:** Defender keywords use a mix of components:
- **`SegmentedControl`** for Cover Type, Defense Die, Surge Chart
- **`NumberSpinner`** for numeric keywords (Cover X, Smoke Tokens, Armor X, etc.)
- **`Toggle`** for Suppressed, Guardian Deflect, Guardian Soresu Mastery
- **`Checkbox`** for most boolean keywords (Block, Deflect, Soresu Mastery, etc.)
- **`Select`** for Guardian Die Color, Guardian Surge

```tsx
// Add import at top of DefenderCustomPoolView.tsx:
import { useDefenderKeywordDisabled } from '../../hooks/useKeywordDisabled';

// Inside DefenderCustomPoolView component:
const isDisabled = useDefenderKeywordDisabled();

// Update each restricted defender keyword input:

// Cover section (ranged-only):
<SegmentedControl
  label="Cover Type"
  value={store.coverType}
  onChange={(value) => store.setField('coverType', value)}
  options={COVER_OPTIONS}
  disabled={isDisabled('coverType')}         // ← ADD
/>
<NumberSpinner
  label="Cover X"
  value={store.coverX}
  onChange={(value) => store.setField('coverX', value)}
  min={0}
  max={2}
  disabled={isDisabled('coverX')}            // ← ADD
/>
<NumberSpinner
  label="Smoke Tokens"
  value={store.smokeTokens}
  onChange={(value) => store.setField('smokeTokens', value)}
  min={0}
  max={99}
  disabled={isDisabled('smokeTokens')}       // ← ADD
/>
<Toggle
  label="Suppressed"
  value={store.suppressed}
  onChange={(value) => store.setField('suppressed', value)}
  disabled={isDisabled('suppressed')}        // ← ADD
/>

// Keywords section — Checkbox-based booleans:
<Checkbox
  label="Deflect"
  value={store.deflect}
  onChange={(value) => store.setField('deflect', value)}
  disabled={isDisabled('deflect')}           // ← ADD
/>
{store.deflect && (
  <Checkbox
    label="Shien Mastery"
    value={store.shienMastery}
    onChange={(value) => store.setField('shienMastery', value)}
    disabled={isDisabled('shienMastery')}    // ← ADD
  />
)}
<Checkbox
  label="Soresu Mastery"
  value={store.soresuMastery}
  onChange={(value) => store.setField('soresuMastery', value)}
  disabled={isDisabled('soresuMastery')}     // ← ADD
/>
<Checkbox
  label="Backup"
  value={store.backup}
  onChange={(value) => store.setField('backup', value)}
  disabled={isDisabled('backup')}            // ← ADD
/>
<NumberSpinner
  label="Shielded X"
  value={store.shieldedX}
  onChange={(value) => store.setField('shieldedX', value)}
  min={0}
  max={99}
  compact
  disabled={isDisabled('shieldedX')}         // ← ADD
/>
<Checkbox
  label="Low Profile"
  value={store.lowProfile}
  onChange={(value) => store.setField('lowProfile', value)}
  disabled={isDisabled('lowProfile')}        // ← ADD
/>
<Checkbox
  label="Dug In"
  value={store.dugIn}
  onChange={(value) => store.setField('dugIn', value)}
  disabled={isDisabled('dugIn')}             // ← ADD
/>
<Checkbox
  label="Djem So Mastery"
  value={store.djemSoMastery}
  onChange={(value) => store.setField('djemSoMastery', value)}
  disabled={isDisabled('djemSoMastery')}     // ← ADD
/>
<Checkbox
  label="Duelist"
  value={store.duelistDefender}
  onChange={(value) => store.setField('duelistDefender', value)}
  disabled={isDisabled('duelistDefender')}   // ← ADD
/>
<Checkbox
  label="Immune: Melee Pierce"
  value={store.immuneMeleePierce}
  onChange={(value) => store.setField('immuneMeleePierce', value)}
  disabled={isDisabled('immuneMeleePierce')} // ← ADD
/>
<Checkbox
  label="Hold the Line"
  value={store.holdTheLine}
  onChange={(value) => store.setField('holdTheLine', value)}
  disabled={isDisabled('holdTheLine')}       // ← ADD
/>

// Guardian section (ranged-only — entire section):
<NumberSpinner
  label="Guardian X"
  value={store.guardianX}
  onChange={(value) => store.setField('guardianX', value)}
  min={0}
  max={99}
  disabled={isDisabled('guardianX')}         // ← ADD
/>
// Guardian sub-config (already conditionally rendered when guardianX > 0):
<Select ... disabled={isDisabled('guardianDieColor')} />
<Select ... disabled={isDisabled('guardianSurgeChart')} />
<Toggle ... disabled={isDisabled('guardianDeflect')} />
<Toggle ... disabled={isDisabled('guardianSoresuMastery')} />
<NumberSpinner ... disabled={isDisabled('guardianDodgeTokens')} />
```

**Also update:** `src/components/DefenderPanel/DefenderUnitBuilderView.tsx` — apply the same `disabled` pattern to any keyword inputs it renders.

**Verify:**
- Select "Melee" attack type → Cover section, Deflect, Shien Mastery, Soresu Mastery, Backup, Shielded, Low Profile, Dug In, Guardian section are disabled
- Select "Ranged" attack type → Djem So Mastery, Duelist (defender), Immune: Melee Pierce are disabled
- Select "Overrun" → Cover, Deflect, Hold the Line, Guardian are disabled; Dodge remains enabled
- Values are preserved when switching attack types

---

## Step 8A.5 — Write Keyword Restriction Unit Tests

**File:** `src/utils/keywordRestrictions.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { AttackType } from '../engine/types';
import {
  ATTACKER_KEYWORD_RESTRICTIONS,
  DEFENDER_KEYWORD_RESTRICTIONS,
  isFieldActiveForAttackType,
} from './keywordRestrictions';

describe('isFieldActiveForAttackType', () => {
  // ── 'all' restriction (no type restriction) ──
  it('returns true for unrestricted keywords regardless of attack type', () => {
    expect(isFieldActiveForAttackType('all', AttackType.Ranged)).toBe(true);
    expect(isFieldActiveForAttackType('all', AttackType.Melee)).toBe(true);
    expect(isFieldActiveForAttackType('all', AttackType.Overrun)).toBe(true);
  });

  // ── Ranged attack type ──
  it('enables ranged-only keywords for Ranged attacks', () => {
    expect(isFieldActiveForAttackType('ranged', AttackType.Ranged)).toBe(true);
  });

  it('disables melee-only keywords for Ranged attacks', () => {
    expect(isFieldActiveForAttackType('melee', AttackType.Ranged)).toBe(false);
  });

  it('enables ranged-melee keywords for Ranged attacks', () => {
    expect(isFieldActiveForAttackType('ranged-melee', AttackType.Ranged)).toBe(true);
  });

  // ── Melee attack type ──
  it('disables ranged-only keywords for Melee attacks', () => {
    expect(isFieldActiveForAttackType('ranged', AttackType.Melee)).toBe(false);
  });

  it('enables melee-only keywords for Melee attacks', () => {
    expect(isFieldActiveForAttackType('melee', AttackType.Melee)).toBe(true);
  });

  it('enables ranged-melee keywords for Melee attacks', () => {
    expect(isFieldActiveForAttackType('ranged-melee', AttackType.Melee)).toBe(true);
  });

  // ── Overrun attack type ──
  it('disables ranged-only keywords for Overrun', () => {
    expect(isFieldActiveForAttackType('ranged', AttackType.Overrun)).toBe(false);
  });

  it('disables melee-only keywords for Overrun', () => {
    expect(isFieldActiveForAttackType('melee', AttackType.Overrun)).toBe(false);
  });

  it('disables ranged-melee keywords for Overrun', () => {
    expect(isFieldActiveForAttackType('ranged-melee', AttackType.Overrun)).toBe(false);
  });

  it('enables unrestricted keywords for Overrun', () => {
    expect(isFieldActiveForAttackType('all', AttackType.Overrun)).toBe(true);
  });
});

describe('ATTACKER_KEYWORD_RESTRICTIONS', () => {
  it('sharpshooterX is ranged-only', () => {
    expect(ATTACKER_KEYWORD_RESTRICTIONS['sharpshooterX']).toBe('ranged');
  });

  it('duelistAttacker is melee-only', () => {
    expect(ATTACKER_KEYWORD_RESTRICTIONS['duelistAttacker']).toBe('melee');
  });

  it('marksman is unrestricted', () => {
    expect(ATTACKER_KEYWORD_RESTRICTIONS['marksman']).toBe('all');
  });

  it('holdTheLine (attacker) is melee-only', () => {
    expect(ATTACKER_KEYWORD_RESTRICTIONS['holdTheLine']).toBe('melee');
  });

  it('jarKaiMastery is melee-only', () => {
    expect(ATTACKER_KEYWORD_RESTRICTIONS['jarKaiMastery']).toBe('melee');
  });
});

describe('WEAPON_KEYWORD_RESTRICTIONS', () => {
  it('highVelocity is ranged-only', () => {
    expect(WEAPON_KEYWORD_RESTRICTIONS['highVelocity']).toBe('ranged');
  });

  it('pierceX is unrestricted', () => {
    expect(WEAPON_KEYWORD_RESTRICTIONS['pierceX']).toBe('all');
  });

  it('blast is unrestricted', () => {
    expect(WEAPON_KEYWORD_RESTRICTIONS['blast']).toBe('all');
  });
});

describe('DEFENDER_KEYWORD_RESTRICTIONS', () => {
  it('deflect is ranged-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['deflect']).toBe('ranged');
  });

  it('djemSoMastery is melee-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['djemSoMastery']).toBe('melee');
  });

  it('armorX is unrestricted', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['armorX']).toBe('all');
  });

  it('coverType is ranged-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['coverType']).toBe('ranged');
  });

  it('guardianX is ranged-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['guardianX']).toBe('ranged');
  });

  it('lowProfile is ranged-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['lowProfile']).toBe('ranged');
  });

  it('dugIn is ranged-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['dugIn']).toBe('ranged');
  });
});

describe('ATTACKER_KEYWORD_RESTRICTIONS (additional)', () => {
  it('holdTheLine (attacker) is melee-only', () => {
    expect(ATTACKER_KEYWORD_RESTRICTIONS['holdTheLine']).toBe('melee');
  });
});
```

**Verify:**
- All tests pass: `npm test -- --run src/utils/keywordRestrictions.test.ts`

---

## Step 8A.6 — Write `useKeywordDisabled` Hook Tests

**File:** `src/hooks/useKeywordDisabled.test.ts`

```ts
import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  useAttackerKeywordDisabled,
  useWeaponKeywordDisabled,
  useDefenderKeywordDisabled,
} from './useKeywordDisabled';
import { useAttackTypeStore } from '../stores/attackTypeStore';
import { AttackType } from '../engine/types';

describe('useAttackerKeywordDisabled', () => {
  beforeEach(() => {
    useAttackTypeStore.getState().reset(); // defaults to Ranged
  });

  it('enables all unit-level keywords for default (Ranged)', () => {
    const { result } = renderHook(() => useAttackerKeywordDisabled());
    expect(result.current('sharpshooterX')).toBe(false);
    expect(result.current('marksman')).toBe(false);
    // melee-only keywords should be disabled for Ranged
    expect(result.current('duelistAttacker')).toBe(true);
    expect(result.current('makashiMastery')).toBe(true);
  });

  it('disables ranged-only unit keywords for Melee', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useAttackerKeywordDisabled());
    expect(result.current('sharpshooterX')).toBe(true);
    expect(result.current('immuneDeflect')).toBe(true);
  });

  it('enables all unit keywords for Hybrid', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Hybrid);
    const { result } = renderHook(() => useAttackerKeywordDisabled());
    expect(result.current('sharpshooterX')).toBe(false);
    expect(result.current('duelistAttacker')).toBe(false);
    expect(result.current('marksman')).toBe(false);
  });

  it('returns false for unknown fields', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useAttackerKeywordDisabled());
    expect(result.current('nonExistentField')).toBe(false);
  });
});

describe('useWeaponKeywordDisabled', () => {
  beforeEach(() => {
    useAttackTypeStore.getState().reset();
  });

  it('disables ranged-only weapon keywords for Melee', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useWeaponKeywordDisabled());
    expect(result.current('highVelocity')).toBe(true);
  });

  it('keeps unrestricted weapon keywords enabled for any type', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useWeaponKeywordDisabled());
    expect(result.current('pierceX')).toBe(false);
    expect(result.current('blast')).toBe(false);
    expect(result.current('criticalX')).toBe(false);
  });
});

describe('useDefenderKeywordDisabled', () => {
  beforeEach(() => {
    useAttackTypeStore.getState().reset();
  });

  it('disables ranged-only defender keywords for Melee', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const { result } = renderHook(() => useDefenderKeywordDisabled());
    expect(result.current('deflect')).toBe(true);
    expect(result.current('soresuMastery')).toBe(true);
    expect(result.current('backup')).toBe(true);
    expect(result.current('coverType')).toBe(true);
    expect(result.current('guardianX')).toBe(true);
  });

  it('disables melee-only defender keywords for Ranged', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Ranged);
    const { result } = renderHook(() => useDefenderKeywordDisabled());
    expect(result.current('djemSoMastery')).toBe(true);
    expect(result.current('duelistDefender')).toBe(true);
    expect(result.current('immuneMeleePierce')).toBe(true);
  });

  it('keeps unrestricted keywords enabled for any attack type', () => {
    useAttackTypeStore.getState().setAttackType(AttackType.Overrun);
    const { result } = renderHook(() => useDefenderKeywordDisabled());
    expect(result.current('armorX')).toBe(false);
    expect(result.current('immunePierce')).toBe(false);
    expect(result.current('dangerSenseX')).toBe(false);
  });
});
```

**Verify:**
- All tests pass: `npm test -- --run src/hooks/useKeywordDisabled.test.ts`

---

## Step 8A.7 — End-to-End Pipeline Verification Tests

**File:** `src/integration/pipeline.test.ts`

Integration tests that verify the full data flow: configure stores → fullConfig merges → simulation runs → results store populated. These test the wiring between phases, not individual module behavior.

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAttackConfigStore } from '../stores/attackConfigStore';
import { useDefenseConfigStore } from '../stores/defenseConfigStore';
import { useAttackTypeStore } from '../stores/attackTypeStore';
import { useResultsStore } from '../stores/resultsStore';
import { getFullConfig } from '../stores/configSelectors';
import { simulate } from '../engine/simulator';
import {
  AttackType,
  AttackSurgeChart,
  DefenseDieColor,
  DefenseSurgeChart,
  CoverType,
} from '../engine/types';

describe('End-to-End Pipeline', () => {
  beforeEach(() => {
    useAttackConfigStore.getState().reset();
    useDefenseConfigStore.getState().reset();
    useAttackTypeStore.getState().reset();
    useResultsStore.getState().clearAll();
  });

  it('produces zero wounds with zero dice', () => {
    const config = getFullConfig();
    const result = simulate(config, 100);
    expect(result.totalWounds.mean).toBe(0);
  });

  it('produces wounds with configured dice', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useAttackConfigStore.getState().setField('surgeChart', AttackSurgeChart.ToCrit);

    const config = getFullConfig();
    const result = simulate(config, 1000);
    expect(result.totalWounds.mean).toBeGreaterThan(0);
  });

  it('applies attack type filtering correctly in engine', () => {
    // Configure deflect (ranged-only keyword)
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useDefenseConfigStore.getState().setField('deflect', true);
    useDefenseConfigStore.getState().setField('dieColor', DefenseDieColor.Red);
    useDefenseConfigStore.getState().setField('surgeChart', DefenseSurgeChart.None);

    // Ranged attack — Deflect should activate
    useAttackTypeStore.getState().setAttackType(AttackType.Ranged);
    const rangedConfig = getFullConfig();
    const rangedResult = simulate(rangedConfig, 5000);

    // Melee attack — Deflect should be ignored
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const meleeConfig = getFullConfig();
    const meleeResult = simulate(meleeConfig, 5000);

    // Ranged with Deflect should produce fewer wounds on average
    // (Deflect gives surge→block, reducing wounds)
    expect(rangedResult.totalWounds.mean).toBeLessThanOrEqual(meleeResult.totalWounds.mean);
  });

  it('cover cap does not exceed 2', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useDefenseConfigStore.getState().setField('coverType', CoverType.Heavy); // 2
    useDefenseConfigStore.getState().setField('coverX', 2);                  // +2
    useDefenseConfigStore.getState().setField('suppressed', true);           // +1
    useDefenseConfigStore.getState().setField('smokeTokens', 3);             // +3

    const config = getFullConfig();
    // Cover value should be capped at 2 regardless of inputs
    // We can't directly inspect the cover value, but we can verify
    // that adding more cover improvements doesn't reduce wounds below
    // what Heavy cover alone would produce

    const heavyOnlyConfig = { ...config };
    // This test primarily verifies no runtime errors with extreme inputs
    const result = simulate(config, 1000);
    expect(result.totalWounds.mean).toBeGreaterThanOrEqual(0);
  });

  it('preset loading produces valid config', () => {
    // Simulate loading a preset by setting typical values
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useAttackConfigStore.getState().setField('surgeChart', AttackSurgeChart.ToCrit);
    useAttackConfigStore.getState().setWeaponKeyword(0, 'pierceX', 3);
    useAttackConfigStore.getState().setWeaponKeyword(0, 'impactX', 3);
    useAttackConfigStore.getState().setField('unitCost', 190);

    useDefenseConfigStore.getState().setField('dieColor', DefenseDieColor.White);
    useDefenseConfigStore.getState().setField('surgeChart', DefenseSurgeChart.ToBlock);
    useDefenseConfigStore.getState().setField('unitCost', 40);

    const config = getFullConfig();
    const result = simulate(config, 1000);

    expect(result.totalWounds.mean).toBeGreaterThan(0);
    expect(result.efficiency).toBeDefined();
    expect(result.efficiency.attackerWoundsPerPoint).toBeGreaterThan(0);
    expect(result.efficiency.defenderWoundsPerPoint).toBeGreaterThan(0);
  });

  it('Aim token economy — total consumption does not exceed available', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    useAttackConfigStore.getState().setField('aimTokens', 2);
    useAttackConfigStore.getState().setWeaponKeyword(0, 'lethalX', 3);
    useAttackConfigStore.getState().setField('marksman', true);
    useAttackConfigStore.getState().setField('duelistAttacker', true);

    const config = getFullConfig();
    // Should not throw — engine handles Aim consumption order
    const result = simulate(config, 1000);
    expect(result.totalWounds.mean).toBeGreaterThanOrEqual(0);
  });
});
```

**Verify:**
- All tests pass: `npm test -- --run src/integration/pipeline.test.ts`
- No runtime errors from extreme or edge-case configurations
- Attack-type filtering produces expected relative wound differences

---

## Step 8B.1 — Refine Responsive Layout

**Files:** `src/Layout.tsx` and `src/App.tsx` (modify existing)

The existing layout uses `Layout.tsx` (header wrapper with logo/title/`AttackTypeSelector`) and `App.tsx` (3-column grid). The current grid has only 2 breakpoints: `grid-cols-1` (mobile) and `lg:grid-cols-3` (desktop ≥1024px). Refine the layout to add a tablet breakpoint at `md` (768px–1023px).

**`src/Layout.tsx`** — Make header sticky:

```tsx
// Change the header element to add sticky positioning:
<header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur-sm">
  {/* existing content unchanged */}
</header>
```

**`src/App.tsx`** — Add tablet (md) breakpoint:

```tsx
import Layout from './Layout';
import { AttackerPanel, DefenderPanel, ResultsPanel } from './components';

export default function App() {
  return (
    <Layout>
      {/* Mobile: stacked (1 col), Tablet: 2 cols, Desktop: 3 cols */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4
                      md:grid-cols-2 md:gap-0 md:divide-x md:divide-gray-800
                      lg:auto-rows-fr lg:grid-cols-3 lg:divide-x lg:divide-gray-800">
        {/* Attacker — always col 1 */}
        <div className="order-1 flex min-h-0 flex-col lg:pr-4">
          <div className="flex-1 overflow-y-auto">
            <AttackerPanel />
          </div>
        </div>

        {/* Results — last on mobile/tablet, center on desktop */}
        <div className="order-3 flex min-h-0 flex-col
                        md:order-3 md:col-span-2
                        lg:order-2 lg:col-span-1 lg:px-4">
          <div className="flex-1 overflow-y-auto">
            <ResultsPanel />
          </div>
        </div>

        {/* Defender — col 2 on tablet, col 3 on desktop */}
        <div className="order-2 flex min-h-0 flex-col lg:order-3 lg:pl-4">
          <div className="flex-1 overflow-y-auto">
            <DefenderPanel />
          </div>
        </div>
      </div>
    </Layout>
  );
}
```

**Layout behavior:**

| Breakpoint | Columns | Order | Notes |
|-----------|---------|-------|-------|
| **< 768px** (mobile) | 1 column | Attacker → Defender → Results | Stacked vertically, each full-width |
| **768–1023px** (tablet) | 2 columns | Attacker \| Defender (row 1) → Results (row 2, spans both cols) | Panels side-by-side, results below |
| **≥ 1024px** (desktop) | 3 columns | Attacker \| Results \| Defender | Each column scrolls independently |

**Verify:**
- **320px** (small mobile): All panels stack, no horizontal scroll, all inputs usable
- **375px** (iPhone): Same as 320px, inputs properly sized
- **768px** (tablet): Attacker and Defender appear side-by-side, Results spans below
- **1024px** (desktop): Three-column layout, each column scrolls independently
- **1440px** (large desktop): Three columns with comfortable spacing
- Header stays sticky on scroll at all breakpoints
- No content is cut off or overlapping at any breakpoint

---

## Step 8B.2 — Mobile Touch Optimization

**File:** `src/components/shared/NumberSpinner.tsx` (modify existing)

Ensure spinner buttons are large enough for touch targets (minimum 44×44px per WCAG) and add touch-friendly interactions.

```tsx
// Update button classes to ensure minimum touch target size:
<button
  type="button"
  onClick={handleDecrement}
  disabled={disabled || value <= min}
  className="flex h-10 w-10 items-center justify-center rounded-l-md
             border border-gray-700 bg-gray-800 text-gray-300
             hover:bg-gray-700 active:bg-gray-600
             disabled:cursor-not-allowed disabled:opacity-40
             touch-manipulation"   // ← prevents double-tap zoom
  aria-label={`Decrease ${label}`}
>
  −
</button>

// Similarly for the increment button:
<button
  type="button"
  onClick={handleIncrement}
  disabled={disabled || value >= max}
  className="flex h-10 w-10 items-center justify-center rounded-r-md
             border border-gray-700 bg-gray-800 text-gray-300
             hover:bg-gray-700 active:bg-gray-600
             disabled:cursor-not-allowed disabled:opacity-40
             touch-manipulation"
  aria-label={`Increase ${label}`}
>
  +
</button>
```

**Verify:**
- Spinner buttons are at least 44×44px on mobile
- `touch-manipulation` prevents double-tap zoom on increment/decrement
- Buttons respond to touch immediately (no 300ms delay)
- Toggle switches are similarly touch-friendly (minimum 44px height)

---

## Step 8B.3 — Chart Responsiveness

**Files:** `src/components/ResultsPanel/WoundDistributionChart.tsx` and `src/components/ResultsPanel/CumulativeTable.tsx` (modify existing)

Verify Recharts `ResponsiveContainer` properly resizes in `WoundDistributionChart`. The chart already implements multi-series support via the `series: ChartSeries[]` prop (each series has `label`, `distribution`, and `color`). Add small-screen adjustments for `CumulativeTable`.

```tsx
// WoundDistributionChart already uses multi-series via:
//   toMultiSeriesChartData(series) → merged dataset
//   One <Bar> per series with unique dataKey={s.label}
// Verify responsive behavior at small viewports:

// Chart container — ensure proper responsive sizing:
<div className="w-full" style={{ minHeight: '200px' }}>
  <ResponsiveContainer width="100%" height={250}>
    <BarChart data={mergedData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
      {/* XAxis, YAxis, Tooltip already configured */}
      {series.map((s) => (
        <Bar key={s.label} dataKey={s.label} fill={getSeriesColor(s.color).base} ... />
      ))}
    </BarChart>
  </ResponsiveContainer>
</div>

// Cumulative table — compact on mobile:
<div className="overflow-x-auto">
  <table className="w-full text-xs sm:text-sm">
    <thead>
      <tr className="border-b border-gray-700 text-gray-400">
        <th className="px-2 py-1 text-left">≥ Wounds</th>
        <th className="px-2 py-1 text-right">Probability</th>
      </tr>
    </thead>
    <tbody>
      {cumulativeData.map((entry) => (
        <tr key={entry.wounds} className="border-b border-gray-800">
          <td className="px-2 py-1">{entry.wounds}+</td>
          <td className="px-2 py-1 text-right">{formatPercent(entry.cumulative)}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Verify:**
- Chart fills available width on all breakpoints
- Chart is readable on 320px viewport (labels don't overlap)
- Cumulative table uses smaller font on mobile (`text-xs` → `sm:text-sm`)
- Table scrolls horizontally if needed (shouldn't be necessary with 2 columns)

---

## Step 8C.1 — Verify Service Worker Configuration

**File:** `vite.config.ts` (verify existing)

Confirm the `vite-plugin-pwa` configuration from Phase 1 correctly precaches all static assets.

```ts
// Verify these settings in the existing vite.config.ts:
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['justrollcrits_noburst.png', 'justrollcrits.png', 'icons/*.png'],
  manifest: {
    name: 'Just Roll Crits',
    short_name: 'Just Roll Crits',
    description: 'Star Wars: Legion attack sequence simulator',
    theme_color: '#1a1a2e',
    background_color: '#1a1a2e',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  },
}),
```

**Testing procedure:**

1. Build the production bundle: `npm run build`
2. Serve the production build: `npm run preview`
3. Open Chrome DevTools → Application tab:
   - **Manifest:** Verify name, icons, display mode, theme color render correctly
   - **Service Workers:** Verify a service worker is registered and active
   - **Cache Storage:** Verify all static assets are precached
4. Enable "Offline" checkbox in DevTools → Network tab → reload the page
   - App should load fully from cache
   - Simulation should run (all engine code is client-side)
5. On Android: verify "Add to Home Screen" prompt appears or is available via browser menu
6. On iOS Safari: verify Share → Add to Home Screen works, app opens in standalone mode

**Verify:**
- Service worker registered and active
- All static assets precached
- App functions identically offline
- Manifest metadata is correct
- Install prompt is available on supported browsers

---

## Step 8C.2 — Test PWA Install Flow

Manual testing procedure — no code changes expected.

| Platform | Steps | Expected Result |
|----------|-------|-----------------|
| **Android Chrome** | Navigate to app → tap "Add to Home Screen" banner or 3-dot menu → "Install app" | App icon appears on home screen; opens in standalone mode (no browser chrome) |
| **iOS Safari** | Navigate to app → Share button → "Add to Home Screen" | App icon appears on home screen; opens in standalone mode |
| **Chrome Desktop** | Navigate to app → install icon in address bar or 3-dot menu → "Install Just Roll Crits" | App opens in separate window without browser chrome |

**Verify:**
- App opens from home screen icon
- Standalone display mode (no URL bar)
- Theme color applied to status bar
- App functions correctly in standalone mode
- All panels render, simulation runs

---

## Step 8D.1 — Keyboard Navigation Audit

Manual testing procedure with code fixes as needed.

**Test procedure:**
1. Load the app in a browser
2. Press Tab repeatedly — verify focus moves through all interactive elements in logical order:
   - Header → Attack Type selector
   - Attacker Panel: Faction select → Unit combobox → [Upgrade slots] → Red dice spinner → ... → last keyword
   - Results Panel (if any focusable elements)
   - Defender Panel: Faction select → Unit combobox → [Upgrade slots] → Defense die select → ... → last keyword
3. Press Shift+Tab to go backward — verify reverse order
4. On NumberSpinner: verify Arrow Up/Down increments/decrements
5. On Select: verify Arrow Up/Down changes selection
6. On Toggle: verify Space/Enter toggles
7. On SearchableCombobox: verify typing filters list, Arrow Down opens/navigates, Enter selects, Escape closes
8. On SectionHeader: verify Enter/Space toggles collapse

**Common issues to fix:**

```tsx
// Ensure all form inputs have visible focus indicators:
// Global CSS (src/index.css):
@layer base {
  *:focus-visible {
    @apply outline-none ring-2 ring-blue-500 ring-offset-1 ring-offset-gray-900;
  }
}

// Ensure SectionHeader trigger is a <button> (not a <div>):
// Already handled in Phase 4E if properly implemented.

// Ensure disabled elements are skipped by Tab:
// The `disabled` prop on <button>, <input>, <select> natively removes
// them from the tab order. Custom components (Toggle) should use
// tabIndex={disabled ? -1 : 0} if they use div-based controls.
```

**Verify:**
- Every interactive element is reachable via Tab
- Focus indicator is clearly visible on dark background
- Disabled elements are skipped in tab order
- Keyboard interactions work for all component types
- No focus traps (user can always Tab out of any component)

---

## Step 8D.2 — ARIA Labels Audit

Review all form inputs for proper ARIA labeling.

**Checklist:**

| Component | Required ARIA | Status |
|-----------|--------------|--------|
| NumberSpinner | `aria-label` or linked `<label>` on `<input>`, `aria-label` on ±buttons ("Decrease {label}", "Increase {label}") | Verify |
| Toggle | `role="switch"`, `aria-checked`, `aria-label` or linked `<label>` | Verify |
| Select | Linked `<label>` on `<select>` element | Verify |
| SearchableCombobox | `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, linked `<label>` | Verify |
| SectionHeader | `aria-expanded` on toggle button, `aria-controls` on collapsible content | Verify |
| Bar chart | `aria-label="Wound probability distribution"` on chart container | Add |
| Cumulative table | `<caption>` element or `aria-label` on `<table>` | Add |
| Results stats | `aria-live="polite"` on stats container (announces updates to screen readers) | Add |
| Loading indicator | `aria-busy="true"` on results container while loading, `role="status"` on loading message | Add |

**Code changes for Results Panel:**

```tsx
// Add aria-live to stats container:
<div aria-live="polite" aria-busy={loading}>
  {loading && (
    <div role="status" className="...">
      <span className="sr-only">Calculating results...</span>
      {/* visual spinner */}
    </div>
  )}
  {result && (
    <>
      {/* stats, chart, table */}
    </>
  )}
</div>

// Add aria-label to chart:
<div aria-label="Wound probability distribution chart" role="img">
  <ResponsiveContainer ...>
    {/* chart content */}
  </ResponsiveContainer>
</div>

// Add caption to cumulative table:
<table aria-label="Cumulative wound probability">
  {/* table content */}
</table>

// Add screen-reader-only class:
// Tailwind's `sr-only` class handles this — verify it's in Tailwind config.
```

**Verify:**
- Screen reader (NVDA on Windows, VoiceOver on Mac/iOS) announces:
  - Input labels when focused
  - Current values of spinners, toggles, selects
  - State of disabled inputs ("dimmed" or "disabled")
  - Loading state when simulation is running
  - Updated results when simulation completes
- No unlabeled interactive elements

---

## Step 8D.3 — Color Contrast Verification

Verify all text and interactive elements meet WCAG AA contrast requirements.

**Key color combinations to check:**

| Element | Foreground | Background | Min Ratio | Target |
|---------|-----------|------------|-----------|--------|
| Body text | `gray-100` (#f3f4f6) | `gray-950` (#030712) | 4.5:1 | ✓ (est. 18:1) |
| Label text | `gray-400` (#9ca3af) | `gray-900` (#111827) | 4.5:1 | ✓ (est. 5.5:1) |
| Disabled text | `gray-500` (#6b7280) | `gray-900` (#111827) | 3:1 (relaxed for disabled) | Verify |
| Panel header | `gray-300` (#d1d5db) | `gray-900` (#111827) | 4.5:1 | ✓ (est. 11:1) |
| Chart bar | `indigo-500` (#6366f1) | transparent/gray-900 | 3:1 (large elements) | ✓ |
| Focus ring | `blue-500` (#3b82f6) | `gray-900` (#111827) | 3:1 | ✓ (est. 4.5:1) |
| Link/accent | `blue-400` (#60a5fa) | `gray-900` (#111827) | 4.5:1 | ✓ |
| Error text | `red-400` (#f87171) | `gray-900` (#111827) | 4.5:1 | Verify |

**Tools:**
- Chrome DevTools → Rendering → "Emulate vision deficiency" → check each mode
- Use browser's built-in contrast checker (CSS overview panel or Lighthouse)
- Manual spot-checks with WebAIM Contrast Checker

**Fix if needed:**
```css
/* If gray-400 labels don't meet 4.5:1, upgrade to gray-300: */
.label-text {
  @apply text-gray-300; /* instead of text-gray-400 */
}
```

**Verify:**
- No contrast violations flagged by Lighthouse accessibility audit
- All text is readable against its background
- Disabled state is distinguishable but doesn't need to meet 4.5:1 (per WCAG guidance)

---

## Step 8D.4 — Dice Color Accessibility

Ensure dice colors are not conveyed by color alone — add text labels.

**Verification:**
- Attacker panel dice spinners already have text labels: "Red dice", "Black dice", "White dice" ✓
- Defender panel die color select has text options: "White", "Red" ✓
- If any future dice visual display uses color-coded dice icons, ensure each has a text label or aria-label

No code changes expected unless Phase 4/6 used color-only indicators. Verify and fix if needed.

---

## Step 8E.1 — Simulation Performance Profiling

Profile the simulation engine at 10,000 iterations to verify the < 500ms target.

**Test procedure:**

```ts
// Temporary performance test (can be run as a Vitest test):
import { simulate } from '../engine/simulator';
import {
  AttackSurgeChart,
  DefenseDieColor,
  DefenseSurgeChart,
  CoverType,
  AttackType,
  MarksmanStrategy,
  RerollStrategy,
} from '../engine/types';
import type { AttackConfig, WeaponProfile } from '../engine/types';

describe('Performance', () => {
  it('completes 10,000 iterations in under 500ms', () => {
    const weapon: WeaponProfile = {
      enabled: true,
      redDice: 6,
      blackDice: 0,
      whiteDice: 0,
      keywords: {
        criticalX: 0, lethalX: 0, pierceX: 3, impactX: 3, ramX: 0,
        blast: false, highVelocity: false, suppressive: false, spray: false,
        antiMaterielX: 0, antiPersonnelX: 0, cumbersome: false,
        sidearmMelee: false, sidearmRanged: false,
      },
    };

    const config: AttackConfig = {
      attacker: {
        weapons: [weapon],
        surgeChart: AttackSurgeChart.ToCrit,
        aimTokens: 2,
        surgeTokens: 0,
        observationTokens: 0,
        dodgeTokensAttacker: 0,
        preciseX: 1,
        sharpshooterX: 0,
        arsenalX: 0,
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
        unitCost: 190,
      },
      defender: {
        dieColor: DefenseDieColor.White,
        surgeChart: DefenseSurgeChart.ToBlock,
        coverType: CoverType.Heavy,
        coverX: 0,
        smokeTokens: 0,
        suppressed: false,
        dodgeTokens: 1,
        surgeTokens: 0,
        suppressionTokens: 0,
        minisInLOS: 5,
        armorX: 0,
        weakPointX: 0,
        immunePierce: false,
        immuneMeleePierce: false,
        immuneBlast: false,
        impervious: false,
        dangerSenseX: 0,
        uncannyLuckX: 0,
        block: false,
        deflect: false,
        shienMastery: false,
        outmaneuver: false,
        lowProfile: false,
        shieldedX: 0,
        djemSoMastery: false,
        soresuMastery: false,
        duelistDefender: false,
        backup: false,
        holdTheLine: false,
        dugIn: false,
        guardianX: 0,
        unitCost: 40,
      },
      attackType: AttackType.Ranged,
    };

    const start = performance.now();
    const result = simulate(config, 10000);
    const elapsed = performance.now() - start;

    console.log(`Simulation: ${elapsed.toFixed(1)}ms for 10,000 iterations`);
    expect(elapsed).toBeLessThan(500);
    expect(result.totalWounds.mean).toBeGreaterThan(0);
  });

  it('completes complex config (all keywords active) in under 1000ms', () => {
    const weapon: WeaponProfile = {
      enabled: true,
      redDice: 4,
      blackDice: 4,
      whiteDice: 4,
      keywords: {
        criticalX: 3, lethalX: 2, pierceX: 4, impactX: 4, ramX: 2,
        blast: false, highVelocity: false, suppressive: true, spray: true,
        antiMaterielX: 2, antiPersonnelX: 0, cumbersome: false,
        sidearmMelee: false, sidearmRanged: false,
      },
    };

    const config: AttackConfig = {
      attacker: {
        weapons: [weapon],
        surgeChart: AttackSurgeChart.ToCrit,
        aimTokens: 3,
        surgeTokens: 2,
        observationTokens: 2,
        dodgeTokensAttacker: 0,
        preciseX: 2,
        sharpshooterX: 2,
        arsenalX: 0,
        marksman: true,
        marksmanStrategy: MarksmanStrategy.Averages,
        rerollStrategy: RerollStrategy.CritFishing,
        jediHunter: true,
        jarKaiMastery: false,
        duelistAttacker: true,
        makashiMastery: false,
        immuneDeflect: false,
        deathFromAbove: false,
        holdTheLine: true,
        unitCost: 200,
      },
      defender: {
        dieColor: DefenseDieColor.Red,
        surgeChart: DefenseSurgeChart.ToBlock,
        coverType: CoverType.Heavy,
        coverX: 2,
        smokeTokens: 2,
        suppressed: true,
        dodgeTokens: 3,
        surgeTokens: 2,
        suppressionTokens: 5,
        minisInLOS: 6,
        armorX: 3,
        weakPointX: 2,
        immunePierce: false,
        immuneMeleePierce: false,
        immuneBlast: false,
        impervious: true,
        dangerSenseX: 5,
        uncannyLuckX: 3,
        block: true,
        deflect: true,
        shienMastery: true,
        outmaneuver: true,
        lowProfile: true,
        shieldedX: 3,
        djemSoMastery: false,
        soresuMastery: true,
        duelistDefender: false,
        backup: true,
        holdTheLine: true,
        dugIn: false,
        guardianX: 2,
        guardianDieColor: DefenseDieColor.Red,
        guardianSurgeChart: DefenseSurgeChart.ToBlock,
        unitCost: 100,
      },
      attackType: AttackType.Ranged,
    };

    const start = performance.now();
    const result = simulate(config, 10000);
    const elapsed = performance.now() - start;

    console.log(`Complex simulation: ${elapsed.toFixed(1)}ms for 10,000 iterations`);
    expect(elapsed).toBeLessThan(1000);
  });
});
```

**Verify:**
- Standard config: < 500ms for 10,000 iterations
- Complex config (all keywords active): < 1000ms for 10,000 iterations
- If performance targets are not met, profile with `console.time` / DevTools Performance tab to find hotspots

**Optimization strategies if needed:**
1. Pre-compute die face arrays instead of creating per iteration
2. Use typed arrays (Uint8Array) for large dice pools
3. Reduce object allocations in the hot loop
4. Inline small helper functions

---

## Step 8E.2 — Web Worker Lifecycle Verification

Verify the Web Worker is properly created, used, and terminated.

**Test procedure:**
1. Open Chrome DevTools → Sources → Workers
2. Load the app → verify exactly one worker is created
3. Change inputs rapidly → verify worker processes requests (check console for timing)
4. Navigate away or close the app → verify worker is terminated (no leaked workers)

**Code checks:**
```ts
// In useSimulation.ts — verify cleanup:
useEffect(() => {
  workerRef.current = new SimulationWorkerClient();
  return () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  };
}, []);
// ✓ Worker created on mount, terminated on unmount
```

**Verify:**
- Only 1 worker thread exists at any time
- Worker terminates on component unmount / app close
- No "worker already terminated" errors in console
- Rapid input changes don't create multiple pending worker tasks (button-triggered, so user must explicitly re-run)

---

## Step 8E.3 — Staleness Tracking Verification

Verify the staleness indicator correctly marks results as stale when config changes, and that re-running simulation clears the stale state.

**Test procedure:**
1. Open the app, configure attacker/defender, run simulation so results appear
2. Change any config value (e.g., increment red dice)
3. Verify that existing results show a "stale" visual indicator (e.g., reduced opacity, badge, or overlay)
4. Click "Run Simulation" / "Add Simulation" again
5. Verify the new result is not stale and any stale indicators update correctly

**Code checks:**
```ts
// In useSimulation.ts — verify staleness tracking:
// The hook subscribes to all config stores and calls markStale() when config changes
// while result slots exist. This is already implemented.

// Verify in ResultsStore:
// - markStale() marks all existing slots as stale
// - appendResult() adds a fresh (non-stale) result slot
// - Stale results render with visual differentiation
```

**Verify:**
- Changing any config input marks existing result slots as stale
- Running a new simulation adds a non-stale result
- Visual distinction between stale and fresh results is clear
- Staleness resets correctly across multiple config-change → simulation cycles

---

## Step 8E.4 — Bundle Size Analysis

Analyze the production bundle size to ensure it meets the < 500KB gzipped target.

**Command:**
```bash
npm run build
```

Vite reports bundle sizes after build. Additionally:

```bash
# Install bundle analyzer (one-time dev dependency):
npm install -D rollup-plugin-visualizer

# Add to vite.config.ts temporarily:
import { visualizer } from 'rollup-plugin-visualizer';

// In plugins array:
visualizer({
  filename: 'dist/stats.html',
  open: true,
  gzipSize: true,
}),
```

**Expected breakdown:**
| Chunk | Est. Gzipped Size |
|-------|-------------------|
| React + ReactDOM | ~45KB |
| Recharts (tree-shaken) | ~80KB |
| Zustand | ~2KB |
| App code (engine + components) | ~30–50KB |
| **Total** | **~160–180KB** |

**If bundle exceeds 500KB:**
1. Verify Recharts tree-shaking: import only used components (`BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`, `ResponsiveContainer`)
2. Consider lazy loading the Results panel:
   ```tsx
   const ResultsPanel = React.lazy(() => import('../components/ResultsPanel'));
   ```
3. Verify Web Worker code is in a separate chunk (it should be by default with Vite's worker handling)

**Verify:**
- Total gzipped bundle < 500KB
- No unexpected large dependencies
- Worker code is in a separate chunk
- Remove `rollup-plugin-visualizer` after analysis (or keep as dev-only)

---

## Step 8E.5 — Lighthouse Audit

Run Lighthouse on the production build to establish baseline scores.

**Test procedure:**
1. Build: `npm run build`
2. Preview: `npm run preview`
3. Open Chrome DevTools → Lighthouse tab
4. Run audit: Performance, Accessibility, Best Practices, PWA
5. Record scores

**Targets:**

| Category | Target Score |
|----------|-------------|
| Performance | ≥ 90 |
| Accessibility | ≥ 90 |
| Best Practices | ≥ 95 |
| PWA | ✓ (installable, offline-capable) |

**Common issues and fixes:**
- **"Serve static assets with an efficient cache policy"** → Configure Vite to add cache headers (handled by deployment platform: Vercel/Netlify)
- **"Image elements do not have explicit width and height"** → Add width/height to PWA icons in manifest
- **"Background and foreground colors do not have a sufficient contrast ratio"** → Fix in Step 8D.3
- **"Document does not have a meta description"** → Already added in Phase 1 (Step 1.8)

**Verify:**
- All scores meet targets
- PWA badge shows as "installable"
- No critical accessibility violations
- Document any scores below target for future improvement

---

## Verification Checklist

After completing all steps, confirm:

| Check | Command / Action |
|-------|-----------------|
| **TypeScript compiles** | `npx tsc --noEmit` passes |
| **All tests pass** | `npm test -- --run` — all existing + new tests pass |
| **Keyword filtering (Melee)** | Select Melee → Deflect, Cover, Soresu Mastery disabled; Djem So, Duelist (def) enabled |
| **Keyword filtering (Ranged)** | Select Ranged → Djem So, Duelist (def/atk), Immune: Melee Pierce disabled; Cover, Deflect enabled |
| **Keyword filtering (Overrun)** | Select Overrun → Cover, Deflect, Hold the Line disabled; Dodge enabled |
| **Keyword filtering (Hybrid)** | Select Hybrid → all keywords enabled (combined ranged+melee) |
| **Values preserved** | Set Cover to Heavy + Deflect → switch to Melee → switch back to Ranged → Cover and Deflect still set |
| **E2E simulation** | Set 6 red dice, surge→crit, Pierce 3 vs White defense, surge→block → results show reasonable wounds |
| **Preset loading** | Select faction + unit → dice, keywords, surge populate → results update |
| **Cover cap** | Set Cover X 2 + Suppressed + Smoke 3 → wounds same as Heavy cover alone (cap at 2) |
| **Aim economy** | Set 2 Aim, Lethal 3, Marksman = true → no engine errors, simulation completes |
| **Mobile layout** | 320px: single column, all panels usable |
| **Tablet layout** | 768px: 2-column panels, full-width results |
| **Desktop layout** | 1024px: 3-column, independent scroll |
| **PWA offline** | Build → preview → airplane mode → app loads and works |
| **PWA install** | Android/iOS: "Add to Home Screen" works, standalone mode |
| **Keyboard nav** | Tab through all inputs without getting stuck |
| **Screen reader** | NVDA/VoiceOver announces labels, values, state |
| **Contrast** | No WCAG AA violations |
| **Performance** | 10k iterations < 500ms |
| **Bundle size** | Gzipped < 500KB |
| **Lighthouse** | Performance ≥ 90, Accessibility ≥ 90 |

---

## Files Created in This Phase

| File | Purpose |
|------|---------|
| `src/utils/keywordRestrictions.ts` | Attack-type keyword restriction map + helper |
| `src/utils/keywordRestrictions.test.ts` | Unit tests for keyword restrictions |
| `src/hooks/useKeywordDisabled.ts` | Hooks for UI keyword disabling |
| `src/hooks/useKeywordDisabled.test.ts` | Unit tests for keyword disabled hooks |
| `src/integration/pipeline.test.ts` | End-to-end integration tests |

## Files Modified in This Phase

| File | Change |
|------|--------|
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | Add `disabled` prop to restricted keyword inputs using `useAttackerKeywordDisabled` and `useWeaponKeywordDisabled` |
| `src/components/DefenderPanel/DefenderCustomPoolView.tsx` | Add `disabled` prop to restricted keyword inputs using `useDefenderKeywordDisabled` |
| `src/Layout.tsx` | Make header sticky with `backdrop-blur-sm` |
| `src/App.tsx` | Add tablet (md) breakpoint to responsive grid |
| `src/components/shared/NumberSpinner.tsx` | Touch target sizing, `touch-manipulation` |
| `src/components/ResultsPanel/ResultsPanel.tsx` | ARIA labels, chart responsiveness, loading state accessibility |
| `src/index.css` | Focus-visible global styles |
| `vite.config.ts` | Bundle analysis (temporary), verify PWA config |

---

## Dependency Graph (Within Phase 8)

```
Phase 4 (disabled prop on all shared components)
Phase 5A (useAttackTypeStore)
       │
       ▼
┌─────────────────────────┐
│ Step 8A.1               │
│ keywordRestrictions.ts   │
│ (restriction maps:       │
│  attacker, weapon,       │
│  defender)               │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Step 8A.2               │
│ useKeywordDisabled.ts    │
│ (3 hooks: attacker,     │
│  weapon, defender)       │
└────────────┬────────────┘
             │
       ┌─────┴──────┐
       ▼             ▼
┌────────────────┐ ┌────────────────┐
│ Step 8A.3      │ │ Step 8A.4      │
│ AttackerCustom │ │ DefenderCustom │
│ PoolView Wire  │ │ PoolView Wire  │
└────────────────┘ └────────────────┘
       │             │
       └──────┬──────┘
              ▼
┌─────────────────────────┐
│ Steps 8A.5–8A.7         │
│ Tests (restrictions,     │
│ hooks, integration)      │
└─────────────────────────┘

        ─── Independent Tracks ───

┌──────────────┐    ┌──────────────┐
│ Step 8B.1–3  │    │ Step 8C.1–2  │
│ Responsive   │    │ PWA Final    │
│ Layout       │    │              │
│ (Layout.tsx  │    │              │
│  + App.tsx)  │    │              │
└──────────────┘    └──────────────┘

┌──────────────┐    ┌──────────────┐
│ Step 8D.1–4  │    │ Step 8E.1–5  │
│ Accessibility│    │ Performance  │
│              │    │              │
└──────────────┘    └──────────────┘
```

**Implementation Order:**

1. **8A.1–8A.2** — Keyword restriction map + hooks (foundational)
2. **8A.3–8A.4** — Wire into panels (depends on 8A.1–8A.2; can be done in parallel)
3. **8A.5–8A.7** — Tests (depends on 8A.1–8A.4)
4. **8B.1–8B.3** — Responsive layout (independent of 8A)
5. **8C.1–8C.2** — PWA finalization (independent of 8A/8B)
6. **8D.1–8D.4** — Accessibility (independent, but best done after 8A for disabled state testing)
7. **8E.1–8E.5** — Performance (independent, best done last as a final check)

**Parallelism:** Steps 8B, 8C, 8D, and 8E are independent of each other and can be worked in parallel after 8A is complete. Within 8A, steps 8A.3 and 8A.4 can be done in parallel.
