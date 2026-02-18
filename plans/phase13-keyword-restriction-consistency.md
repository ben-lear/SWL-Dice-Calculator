# Phase 13 — Keyword Attack-Type Restriction Consistency

## Problem

Ram X is silently ignored when the attack type is Ranged. The engine correctly gates Ram X behind a `isMeleeOrOverrun` check, but the UI restriction map marks it as `'all'`, so the control is never disabled. Users can set Ram X on a Ranged pool and see no effect, making it appear broken.

More broadly, several weapon keyword controls in `WeaponKeywordsSection` use `disabled={allDisabled}` instead of the component's own `isDisabled()` helper. While most of those keywords are currently `'all'`-restricted (so the behavior is identical today), this pattern is inconsistent and fragile — any future restriction change to the map would not be reflected in the UI without also touching the component code.

## Root Cause

1. **Missing restriction type:** The `KeywordRestriction` union (`'all' | 'ranged' | 'melee' | 'ranged-melee'`) has no `'melee-overrun'` variant required by Ram X.
2. **Incorrect restriction for `ramX`:** Set to `'all'` in `WEAPON_KEYWORD_RESTRICTIONS` instead of a melee+overrun restriction.
3. **Inconsistent `disabled` prop wiring:** 9 of 12 weapon keyword controls bypass the `isDisabled()` helper and use `allDisabled` directly.

## Scope

- **UI restriction infrastructure only** — no engine logic changes needed.
- Engine code in `attackModifiers.ts` and `woundEstimation.ts` correctly implements the Ram X melee/overrun guard per the rulebook.

## Changes

### 1. Add `'melee-overrun'` restriction type

**File:** `src/utils/keywordRestrictions.ts`

- Expand the `KeywordRestriction` type union:
  ```ts
  export type KeywordRestriction = 'all' | 'ranged' | 'melee' | 'ranged-melee' | 'melee-overrun';
  ```

- Add switch case in `isFieldActiveForAttackType`:
  ```ts
  case 'melee-overrun':
    return attackType === AttackType.Melee || attackType === AttackType.Overrun;
  ```

### 2. Update `ramX` restriction

**File:** `src/utils/keywordRestrictions.ts`

Change:
```ts
ramX: 'all',
```
To:
```ts
ramX: 'melee-overrun',  // Ram X only applies during Melee/Overrun attacks
```

### 3. Standardize `WeaponKeywordsSection` disabled props

**File:** `src/components/AttackerPanel/WeaponKeywordsSection.tsx`

The component already defines an `isDisabled()` helper at line 19–20 that combines `allDisabled` (read-only mode in Unit Builder) with `isKeywordDisabled` (attack-type restrictions). Switch all controls from `disabled={allDisabled}` to `disabled={isDisabled('keyName')}`:

| Control | Field | Current | New |
|---------|-------|---------|-----|
| Critical X | `criticalX` | `disabled={allDisabled}` | `disabled={isDisabled('criticalX')}` |
| Lethal X | `lethalX` | `disabled={allDisabled}` | `disabled={isDisabled('lethalX')}` |
| Pierce X | `pierceX` | `disabled={allDisabled}` | `disabled={isDisabled('pierceX')}` |
| Impact X | `impactX` | `disabled={allDisabled}` | `disabled={isDisabled('impactX')}` |
| Ram X | `ramX` | `disabled={allDisabled}` | `disabled={isDisabled('ramX')}` |
| Blast | `blast` | `disabled={allDisabled}` | `disabled={isDisabled('blast')}` |
| Suppressive | `suppressive` | `disabled={allDisabled}` | `disabled={isDisabled('suppressive')}` |
| Spray | `spray` | `disabled={allDisabled}` | `disabled={isDisabled('spray')}` |
| Primitive | `primitive` | `disabled={allDisabled}` | `disabled={isDisabled('primitive')}` |

Controls already using `isDisabled()` — no change needed: High Velocity, Immune: Deflect, Ion X.

### 4. Add tests for the new restriction type

**File:** `src/utils/keywordRestrictions.test.ts` (new or existing)

Test cases for `isFieldActiveForAttackType` with `'melee-overrun'`:
- Returns `true` for `AttackType.Melee`
- Returns `true` for `AttackType.Overrun`
- Returns `false` for `AttackType.Ranged`
- Returns `true` for `AttackType.Hybrid` (unrestricted by convention)

## Files Touched

| File | Type of Change |
|------|---------------|
| `src/utils/keywordRestrictions.ts` | Add restriction type, update `ramX`, add switch case |
| `src/components/AttackerPanel/WeaponKeywordsSection.tsx` | Standardize 9 controls to use `isDisabled()` |
| `src/utils/keywordRestrictions.test.ts` | Add test cases for `'melee-overrun'` |

## Verification

1. `npm run typecheck` — validates the new restriction type compiles
2. `npm run lint` — clean output
3. `npm run test` — no regressions, new restriction tests pass
4. Manual: select Ranged attack type → Ram X spinner is grayed out
5. Manual: select Melee or Overrun → Ram X spinner is enabled and visibly increases wound totals
6. Manual: Unit Builder mode → all weapon keywords remain read-only (disabled)

## Audit Summary

Full audit of all controls across both panels confirms this is the **only engine-vs-UI mismatch**:

| Keyword | Engine Gate | UI Restriction | Status |
|---------|------------|----------------|--------|
| Ram X | Melee + Overrun | `'all'` | **MISMATCH — fix in this phase** |
| All other keywords | — | — | Correct (verified) |

All other `NumberSpinner` and `Checkbox` controls with non-`'all'` restrictions already have proper `disabled={isDisabled('fieldName')}` props wired up. Keywords with `'all'` restrictions correctly omit the disabled prop (or, in `WeaponKeywordsSection`, will be switched to use `isDisabled()` for consistency without functional change).

## Non-Goals

- No engine logic changes — `attackModifiers.ts` and `woundEstimation.ts` are correct.
- No new keyword restrictions for other keywords — the audit confirmed all others are properly aligned.
- No changes to `AttackerUnitBuilderView.tsx` or `DefenderCustomPoolView.tsx` — their controls are already correctly wired.
