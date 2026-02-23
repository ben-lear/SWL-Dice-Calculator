# Data Pipeline Instructions

> **Applies to:** `src/data/**`, `scripts/**`

## Purpose

The data layer transforms external API data (from TableTopAdmiral) into engine-compatible unit presets. It's a 5-stage pipeline with clear boundaries between each stage.

## Pipeline Overview

```
Stage 1         Stage 2           Stage 3             Stage 4          Stage 5
FETCH           PROCESS           ENRICH (manual)     RESOLVE          PRESETS
─────────────   ───────────────   ─────────────────   ──────────────   ────────────
API endpoints → src/data/raw/   → src/data/processed/ → enrichment  → ResolvedUnit[] → AttackerPreset[]
  (8 JSON)       *.json            *.json               overlay        ResolvedUpgrade[]  DefenderPreset[]
```

| Stage | Trigger | Input | Output | Module/Script |
|-------|---------|-------|--------|---------------|
| **1. Fetch** | Manual: `npx tsx scripts/fetchApiData.ts` | TableTopAdmiral REST API | 8 JSON files → `src/data/raw/` | `scripts/fetchApiData.ts` |
| **2. Process** | Manual: `npx tsx scripts/processApiData.ts` | Raw JSON | 3 files → `src/data/processed/` | `scripts/processApiData.ts` |
| **3. Enrich** | Manual curation | Human knowledge of weapon profiles, surge charts, keyword magnitudes | `UnitEnrichment` / `UpgradeEnrichment` records | `src/data/enrichment/units.ts`, `upgrades.ts` |
| **4. Resolve** | Automatic (lazy singleton) | Processed + enrichment | `ResolvedUnit[]`, `ResolvedUpgrade[]` | `src/data/unitResolver.ts`, `upgradeResolver.ts` |
| **5. Presets** | Automatic (lazy singleton) | Resolved data | `AttackerPreset[]`, `DefenderPreset[]` | `src/data/presetGenerator.ts`, `presetHelpers.ts` |

## Type Hierarchy

Each pipeline stage has its own types in `src/data/types.ts`:

| Layer | Types | Location |
|-------|-------|----------|
| **Raw** | `RawUnit`, `RawUpgrade`, `RawKeyword`, `RawUpgradeType` | API response shapes |
| **Processed** | `ProcessedUnit`, `ProcessedUpgrade`, `ProcessedKeyword` | Slugified IDs, resolved keyword names |
| **Resolved** | `ResolvedUnit`, `ResolvedUpgrade` | Processed + enrichment merged; `isEnriched` flag |
| **Preset** | `AttackerPreset`, `DefenderPreset` | Store-ready config partials for UI dropdowns |

Key enums: `UpgradeSlot` (27 members), `Faction` (5 values), `UnitRank`, `UnitType`.

## Directory Layout

```
src/data/
├── types.ts               # All type definitions across pipeline stages
├── presets.ts             # Faction enum, AttackerPreset/DefenderPreset interfaces
├── keywordMap.ts          # API keyword name → store field name mappings (singleton)
├── unitResolver.ts        # Stage 4: processed + enrichment → ResolvedUnit[]
├── upgradeResolver.ts     # Stage 4: processed + enrichment → ResolvedUpgrade[]
├── presetGenerator.ts     # Stage 5: resolved → presets (cached singleton)
├── presetHelpers.ts       # Preset search/filter API (by faction, ID, etc.)
├── upgradeApplicator.ts   # Bridge: applies equipped upgrades to engine config
├── index.ts               # Barrel export
├── raw/                   # Stage 1 output: 8 raw API JSON files
├── processed/             # Stage 2 output: units.json, upgrades.json, keywords.json
├── enrichment/            # Stage 3: manually curated weapon/keyword overlays
│   ├── types.ts           # UnitEnrichment, UpgradeEnrichment interfaces
│   ├── keywordTypes.ts    # Typed keyword interfaces for enrichment
│   ├── units.ts           # ~3700 lines of unit enrichment data
│   └── upgrades.ts        # ~3700 lines of upgrade enrichment data
└── __tests__/             # Resolver and preset tests
```

## Enrichment System

### The `'<need human>'` Sentinel

Enrichment files use the string `'<need human>'` as a placeholder for values that require manual curation. When you see this, it means the automated pipeline couldn't derive the value — a human needs to look up the game rules and fill it in.

### Adding a New Unit Enrichment

1. Run `npx tsx scripts/generateEnrichmentSkeleton.ts` to find units missing enrichment.
2. Add an entry in `src/data/enrichment/units.ts` keyed by the unit's **slugified ID** (matching `processed/units.json`).
3. Fill in:
   - `defenseStats` — die color, surge chart
   - `weapons` — array of weapon profiles with dice and keywords
   - `keywords` — unit-level keywords with typed values
4. Run validation: `npx tsx scripts/checkEnrichmentKeywords.ts`
5. Verify with: `npx tsx scripts/debugPresets.ts`

### Adding a New Upgrade Enrichment

Same flow but in `src/data/enrichment/upgrades.ts`. Upgrade enrichment primarily provides:
- `keywords` — combat-relevant keywords granted by the upgrade
- `weapons` — weapon profiles added by the upgrade (e.g., heavy weapons)

## Resolver Caching Pattern

Both `unitResolver.ts` and `upgradeResolver.ts` use lazy-initialized cached singletons:

```ts
let _cachedUnits: ResolvedUnit[] | null = null;
export function getResolvedUnits(): ResolvedUnit[] {
  if (!_cachedUnits) { _cachedUnits = /* compute */ }
  return _cachedUnits;
}
```

This means resolved data is computed once and reused for the app's lifetime. There is no cache invalidation — the app must be reloaded to see data changes.

## Upgrade Applicator (`upgradeApplicator.ts`)

This is the **critical bridge** between the data layer and engine:
- `applyAttackerUpgrades(config, upgradeIds, attackType, baseWeapons, miniCount)` — applies equipped upgrades to an `AttackerConfig`
- `applyDefenderUpgrades(config, upgradeIds, attackType)` — applies equipped upgrades to a `DefenderConfig`
- `normalizeToEngineWeapon(weapon)` — converts enrichment weapon format to engine `WeaponProfile`

Called by `configSelectors.ts` during the store → engine pipeline.

## Keyword Field Mapping Chain

API keyword names are mapped to engine/store field names through `keywordMap.ts`:

```
API name (e.g., "Pierce")
  → ATTACKER_KEYWORD_FIELD_MAP / DEFENDER_KEYWORD_FIELD_MAP
    → store field name (e.g., "pierceX")
      → engine config field
```

There's also a `DISPLAY_KEYWORD_FIELD_MAP` for non-combat keywords used only for display/tagging.

## Scripts Inventory

### Essential Pipeline Scripts
| Script | Purpose | When to Run |
|--------|---------|-------------|
| `fetchApiData.ts` | Download from TableTopAdmiral API | When API data updates |
| `processApiData.ts` | Transform raw → processed | After fetching new data |
| `generateEnrichmentSkeleton.ts` | Find units missing enrichment | When adding new units |
| `backfillEnrichmentKeywords.ts` | Pre-populate keyword data from API | After processing new data |

### Validation Scripts
| Script | Purpose |
|--------|---------|
| `checkUnitIds.ts` | Detect unit ID collisions between raw/processed/enrichment |
| `checkUpgradeIds.ts` | Detect upgrade ID collisions |
| `checkEnrichmentKeywords.ts` | Validate enrichment keywords against schema |
| `checkUpgradeKeywords.ts` | Validate upgrade keyword enrichment |
| `validateTypedKeywords.ts` | Type-check enrichment against keyword interfaces |

### Debug/Test Scripts
Scripts prefixed with `test*` or `debug*` are one-off validation scripts. They are not part of the CI pipeline and can be run for manual inspection.

All scripts are invoked with: `npx tsx scripts/<scriptName>.ts`

## Architectural Constraints

- **No React imports** in `src/data/`.
- **No direct store access** — data flows out through presets and the upgrade applicator.
- May import from `src/engine/types.ts` for type definitions.
- Processed JSON files and enrichment TS files are **committed to git** (they are the source of truth, not build artifacts).
- Raw JSON files are also committed as an API snapshot.

## Known TODOs in Enrichment

Several weapon/upgrade enrichments have `TODO` comments for complex effects not yet modeled:
- Saber Throw — dynamically derives weapon dice from equipped melee weapon
- Black Ops — defeated minis contribute dice
- Kraken's Blaster — upgrade dice based on defeated minis
- Frenzied Gunner — dice added based on a defense die roll
- Nanny Programming — unique equip interaction

These are tracked in `plans/phase17-enrichment-keyword-support.md`.
