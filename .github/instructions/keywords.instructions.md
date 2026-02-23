# Keyword System Instructions

> **Applies to:** Cross-cutting — `src/engine/types.ts`, `src/data/keywordMap.ts`, `src/data/enrichment/keywordTypes.ts`, `src/utils/keywordRestrictions.ts`, stores, components

## Purpose

Keywords are the core domain concept in Star Wars: Legion. The app models 40+ combat keywords across a multi-layered system. Adding or modifying a keyword touches 5–8 files across 3–4 layers. This document is the end-to-end guide.

## Keyword Categories

| Category | Location in Config | Examples |
|----------|-------------------|----------|
| **Weapon keywords** (per-weapon, aggregated into pool) | `WeaponKeywords` on `WeaponProfile` | Pierce X, Impact X, Critical X, Blast, High Velocity, Spray |
| **Attacker unit keywords** (unit-level) | Fields on `AttackerConfig` | Marksman, Jedi Hunter, Jar'Kai Mastery, Precise X, Arsenal X |
| **Defender keywords** (unit-level) | Fields on `DefenderConfig` | Armor X, Deflect, Impervious, Danger Sense X, Guardian X |
| **Display keywords** (non-combat, display only) | `DISPLAY_KEYWORD_FIELD_MAP` in `keywordMap.ts` | Charge, Relentless, Scout X, Jump X |

## Keyword Aggregation Rules

When multiple weapons contribute to an attack pool, their keywords aggregate via `aggregateWeaponKeywords()`:

| Rule | Keywords |
|------|----------|
| **Summed** across weapons | `criticalX`, `lethalX`, `pierceX`, `impactX`, `ramX`, `ionX` |
| **Boolean OR** (any weapon) | `blast`, `suppressive`, `immuneDeflect`, `primitive`, `blackOps`, `krakenBlaster` |
| **Boolean AND** (all weapons must have it) | `highVelocity` |
| **Per-weapon only** (not aggregated) | `spray`, `antiMaterielX`, `antiPersonnelX`, `cumbersome`, `sidearmMelee`, `sidearmRanged` |

## Attack-Type Restrictions

Keywords are enabled/disabled based on attack type via `src/utils/keywordRestrictions.ts`:

| Restriction | Meaning | Example Keywords |
|-------------|---------|-----------------|
| `'all'` | Active for all attack types | Pierce, Critical, Aim tokens |
| `'ranged'` | Ranged only | Cover, Guardian, Deflect, Sharpshooter, Shielded |
| `'melee'` | Melee only | Duelist, Makashi, Jar'Kai, Djem So, Immune: Melee Pierce |
| `'ranged-melee'` | Disabled for Overrun only | Hold the Line |
| `'melee-overrun'` | Melee + Overrun only | Ram X |

The helper `isFieldActiveForAttackType(restriction, attackType)` is used by the `useKeywordDisabled` hook to disable UI controls.

## Full Keyword Addition Checklist

When adding a new **combat-relevant** keyword, follow all applicable steps:

### Step 1: Engine Types (`src/engine/types.ts`)

Add the field to the appropriate interface:
- **Weapon keyword** → add to `WeaponKeywords` AND `AggregatedWeaponKeywords` (with aggregation rule comment)
- **Attacker unit keyword** → add to `AttackerConfig`
- **Defender keyword** → add to `DefenderConfig`

Use `number` for keywords with magnitude (X value), `boolean` for fixed keywords.

### Step 2: Engine Test Helpers (`src/engine/testHelpers.ts`)

Add the new field with its default value (0 or false) to the relevant `createMinimal*()` factory function.

### Step 3: Engine Logic

Implement the keyword's behavior in the appropriate attack step module (see `engine.instructions.md` for step→module mapping). Add focused unit tests.

### Step 4: Keyword Field Map (`src/data/keywordMap.ts`)

Add an entry in the appropriate map:
- `ATTACKER_KEYWORD_FIELD_MAP` — for attacker unit keywords
- `DEFENDER_KEYWORD_FIELD_MAP` — for defender keywords
- Weapon keywords don't need a field map entry (they're matched by field name directly)

Format: `'Keyword Display Name': 'fieldName'`

### Step 5: Enrichment Types (`src/data/enrichment/keywordTypes.ts`)

Add the field to the appropriate typed interface:
- `AttackerUnitKeywords` for attacker keywords
- `DefenderUnitKeywords` for defender keywords
- `EnrichmentWeaponKeywords` for weapon keywords

### Step 6: Attack-Type Restrictions (`src/utils/keywordRestrictions.ts`)

Add an entry in the appropriate restriction map:
- `ATTACKER_KEYWORD_RESTRICTIONS` for attacker keywords
- `WEAPON_KEYWORD_RESTRICTIONS` for weapon keywords
- `DEFENDER_KEYWORD_RESTRICTIONS` for defender keywords

Choose the correct restriction: `'all'`, `'ranged'`, `'melee'`, `'ranged-melee'`, or `'melee-overrun'`.

### Step 7: Store (`src/stores/attackConfigStore.ts` or `defenseConfigStore.ts`)

Add the field to:
1. The store's state interface
2. The initial state object (with default value)
3. The `reset()` action
4. The appropriate `select*Config()` selector mapping

### Step 8: UI Controls (`src/components/`)

Add the appropriate control in the relevant panel section:
- `NumberSpinner` for magnitude keywords (pierceX, armorX, etc.)
- `Checkbox` or `Toggle` for boolean keywords
- Place in the correct keyword grid section

### Step 9: Tests

- Engine unit test in the appropriate step module test file
- Integration test update in `src/integration/pipeline.test.ts` if the keyword significantly affects results
- Component test update if the keyword has special UI behavior

## Current Keyword Reference

### Weapon Keywords (on `WeaponKeywords`)
`criticalX`, `lethalX`, `pierceX`, `impactX`, `ramX`, `ionX`, `blast`, `suppressive`, `highVelocity`, `spray`, `antiMaterielX`, `antiPersonnelX`, `cumbersome`, `sidearmMelee`, `sidearmRanged`, `immuneDeflect`, `primitive`, `blackOps`, `krakenBlaster`

### Attacker Unit Keywords (on `AttackerConfig`)
`marksman`, `marksmanStrategy`, `rerollStrategy`, `jediHunter`, `jarKaiMastery`, `duelistAttacker`, `makashiMastery`, `deathFromAbove`, `holdTheLine`, `completeTheMission`, `preciseX`, `sharpshooterX`, `arsenalX`

### Defender Keywords (on `DefenderConfig`)
`armorX`, `weakPointX`, `immunePierce`, `immuneMeleePierce`, `immuneBlast`, `immuneMelee`, `impervious`, `dangerSenseX`, `uncannyLuckX`, `block`, `deflect`, `shienMastery`, `outmaneuver`, `lowProfile`, `shieldedX`, `djemSoMastery`, `soresuMastery`, `duelistDefender`, `backup`, `holdTheLine`, `dugIn`, `completeTheMission`, `katarnPatternArmor`, `guardianX` (+ guardian sub-config fields)

## Adding a Display-Only Keyword

For keywords that don't affect combat math but are used for unit tagging/display:

1. Add to `DISPLAY_KEYWORD_FIELD_MAP` in `src/data/keywordMap.ts`
2. Add to `DisplayUnitKeywords` or `DisplayWeaponKeywords` in `src/data/enrichment/keywordTypes.ts`
3. No engine, store, or restriction changes needed
