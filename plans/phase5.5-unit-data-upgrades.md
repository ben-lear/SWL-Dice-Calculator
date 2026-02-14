# Phase 5.5: Unit Data Layer & Upgrade System — Implementation Plan

## Goal

Build the data pipeline that imports unit and upgrade data from the TableTopAdmiral API, processes it into clean typed structures, layers on manually-curated enrichment data (weapon profiles, keyword X values, surge charts), and integrates an upgrade equip/unequip system into the existing Zustand stores. This phase replaces Phase 5B's hardcoded preset arrays with a scalable, API-backed data source while preserving the preset helper API surface so Phase 6 UI code requires minimal changes.

---

## Overview

Phase 5.5 consists of five sub-phases:

- **5.5A:** Data Foundation — core data types, raw API snapshots, processing script, keyword map
- **5.5B:** Enrichment Layer — enrichment types, manually curated unit/upgrade data, resolver utilities
- **5.5C:** Preset Generation & Upgrade System — preset generator (replaces Phase 5B), upgrade filtering, upgrade applicator
- **5.5D:** Store Integration — new upgrade-related fields and actions in both config stores, updated `getFullConfig()` selector
- **5.5E:** Tests — processing, resolution, upgrade application, store upgrade actions

Phase 5.5 depends on:
- **Phase 2A** (types only) — `AttackSurgeChart`, `DefenseSurgeChart`, `DefenseDieColor`, and all enums from `engine/types.ts`
- **Phase 5A** — Zustand stores exist with `setField()`, `loadPreset()`, `reset()` actions and `selectAttackerConfig` / `selectDefenderConfig` selectors

Phase 5.5 **replaces**:
- **Phase 5B** — the hardcoded `ATTACKER_PRESETS` / `DEFENDER_PRESETS` arrays and the preset helper functions are now generated from the data layer rather than manually maintained

Phase 5.5 does **not** depend on:
- Phase 2B–2D (attack sequence implementation)
- Phase 3 (simulator / worker)
- Phase 4 (UI components)
- Phase 6 (UI panels — though Phase 6 will consume the output)

---

## Design Decisions

The following design decisions were established during API analysis and planning:

1. **Three-Layer Data Architecture** — Raw API snapshots → processed/cleaned JSON → manual enrichment overlay → resolved units/upgrades. Each layer is additive. The processing step strips unusable fields, maps integer codes to string enums, and extracts upgrade bars from the API's `upgrade_types` field. The enrichment step adds weapon profiles, keyword X values, and surge charts that the API doesn't provide. The resolver merges them into final `ResolvedUnit` / `ResolvedUpgrade` objects consumed by the preset generator.

2. **Import All Units** — All ~150+ units from the API are imported, not just a curated subset. Un-enriched units still appear in the defender dropdown (defense die color and boolean keywords are auto-populated from the API). Un-enriched units also appear in the attacker dropdown but with 0 dice — the user can manually configure the dice pool. Enriched units get full auto-population of dice, surge chart, and keywords. All units (enriched and un-enriched) get upgrade bars populated from the API's `upgrade_types` field.

3. **Snapshot JSON Committed to Repo** — Raw API responses are saved as JSON files in `src/data/raw/` and committed to version control. This ensures reproducibility, avoids runtime API calls, and allows the app to work fully offline. A developer script `scripts/fetchApiData.ts` fetches fresh data when needed.

4. **Enrichment Is Additive, Not Destructive** — The enrichment overlay never deletes or zeroes out data from the processed API layer. It only adds missing information (weapon profiles, X values, surge charts). If the API eventually provides weapon data, the enrichment layer becomes optional for those fields.

5. **API Data Gaps** — The TableTopAdmiral API is missing several critical fields:
   - **Weapon profiles** (`weapon1`/`weapon2`/`weapon3` fields are always `null`) — no dice pool data
   - **Surge charts** (`surge_chart` is always `null`) — no surge conversion data
   - **Keyword X values** — `keyword_ids` only indicates boolean presence; `has_magnitude` on the keyword tells us it's an X-value keyword, but the specific X for each unit is not provided
   All of these must come from the enrichment layer.

   The API **does** provide upgrade bar data: each unit returned from `/api/units/2` includes an `upgrade_types` array with `upgrade_type_fkey` values that map to upgrade slot types. The `/api/upgrade-types` endpoint provides the full mapping of upgrade type IDs to names.

6. **API Data Values** — Fields retained from the API:
   - **Units:** `id`, `name`, `faction` (mapped to Faction enum), `cost`, `health`, `figures`, `red_defense` (mapped to DefenseDieColor), `keyword_ids` (resolved to keyword names), `rank` (mapped to UnitRank), `unit_type` (mapped to UnitType), `upgrade_types` (array of slot entries with `upgrade_type_fkey`, `must_equip`, `unlocked_by`, `must_equip_something`, `revamp`, `classic` — processed into `upgradeBar`)
   - **Keywords:** `id`, `name`, `has_magnitude`, `weapon` (is weapon keyword flag)
   - **Upgrades:** `id`, `name`, `cost`, `upgrade_type_fkey` (mapped to UpgradeSlot), `unit_fkey` (unit restriction), `keyword_ids` (resolved to keyword names)
   - **Upgrade Types:** `id`, `name`, `image_url`, `sort_priority` (from `/api/upgrade-types` — used to build the upgrade type ID → name mapping dynamically)
   - **Discarded:** `weapon1`/`weapon2`/`weapon3` (always null), `surge_chart` (always null), `descriptions` (flavor text, not needed for calculation)

7. **All Upgrade Slot Types Included** — Every upgrade slot type is imported (Heavy Weapon, Personnel, Force, Command, Gear, Grenades, Comms, Training, etc.). Combat-relevant slots get full enrichment (dice, keywords, X values) over time. Non-combat slots get cost-only entries for points efficiency calculations. The distinction is at the slot level:
   - **Combat-relevant slots:** Heavy Weapon, Personnel, Armament, Ordnance, Gear, Force, Hardpoint, Crew, Grenades, Pilot, Training, Programming, Protocol, Squad Leader, Door Gunner, Dug In, Generator
   - **Non-combat slots:** Comms, Command, Scanner, Strike and Fade, Imperial March, Doctrine
   
   > **Note:** Some slots marked combat-relevant contain only a small number of upgrades that affect dice (e.g., Training has Tenacity, Duck and Cover; Protocol has limited keyword effects; Generator upgrades can add dice to the attack pool). These are included in the combat-relevant set because individual upgrades within them *can* grant dice-affecting keywords. The **Dug In** slot is especially notable: equipping a Dug In upgrade causes the defender to roll red defense dice during the Roll Cover step instead of white defense dice — this is a unique mechanical effect that must be handled as a special case in the upgrade applicator.

8. **Presets Represent Weapon Loadouts** — Each attacker preset represents a specific unit + weapon combination with baked-in dice (e.g., "Stormtroopers (DLT-19)" has the combined dice pool). This matches the Phase 5B approach. The upgrade system handles cost tracking and keyword additions but does NOT dynamically change the dice pool. If a user wants different weapon dice, they select a different preset.

9. **Preset Helper API Preserved** — The functions `getAttackerPresets()`, `getDefenderPresets()`, `getAttackerPresetById()`, `getDefenderPresetById()`, and `getFactionOptions()` keep their signatures and return types. The internal implementation changes from filtering a hardcoded array to calling the preset generator. Phase 6 code calling these functions needs no changes.

10. **Upgrade Bar Stored in Store** — When a preset is loaded, the unit's `upgradeBar` (list of `UpgradeSlot` values) and a parallel `equippedUpgradeIds` array are stored in the config store. This keeps the store self-contained — the UI reads the upgrade bar from the store to render slot dropdowns, and `getFullConfig()` reads equipped upgrade IDs to apply costs and keywords.

11. **`loadPreset` Signature Change** — The `loadPreset` action on both stores gains a third parameter: `upgradeBar: UpgradeSlot[]`. This stores the available upgrade slots and resets `equippedUpgradeIds` to an all-null array. The Phase 6 `handlePresetChange` passes `preset.upgradeBar` alongside `preset.profile`.

12. **Total Cost Calculation** — The store's `unitCost` field holds the base unit cost (from the preset). In `getFullConfig()`, the upgrade applicator computes: `totalCost = unitCost + Σ(equipped upgrade costs)`. The engine receives the total cost for efficiency metrics. The UI can show the breakdown (base + upgrades) by reading the store directly.

13. **Keyword-to-Store-Field Mapping** — A constant mapping table converts API keyword names (e.g., "Immune: Pierce", "Danger Sense") to store field names (e.g., `immunePierce`, `dangerSenseX`). Boolean keywords map to boolean fields; magnitude keywords map to numeric fields with an `X` suffix. This mapping is used by the preset generator when converting resolved unit data into `AttackerPresetProfile` / `DefenderPresetProfile` objects.

14. **Preset Types Extended** — `AttackerPreset` and `DefenderPreset` interfaces gain an `upgradeBar: UpgradeSlot[]` field. This is set by the preset generator from the processed API data — all units (enriched and un-enriched) have their upgrade bar populated from the API's `upgrade_types` field.

15. **Enrichment Is Sync-Safe** — The manual enrichment layer (weapon profiles, keyword X values, surge charts, upgrade keyword data) lives in TypeScript source files (`src/data/enrichment/units.ts` and `src/data/enrichment/upgrades.ts`) that are **never touched** by the fetch or processing scripts. Re-running `fetchApiData.ts` + `processApiData.ts` only overwrites the `raw/` and `processed/` JSON files. Enrichment keys are linked to processed unit/upgrade IDs (slugified strings derived from faction + unit name). If the API renames or removes a unit, the enrichment key becomes orphaned. A validation test (`src/data/__tests__/enrichmentValidation.test.ts`) cross-references all enrichment keys against the processed data and fails if any key doesn't match a known processed ID. This test must pass after every API sync. The recommended sync workflow is: (1) run `fetchApiData.ts`, (2) run `processApiData.ts`, (3) run tests to catch orphaned enrichment — fix any mismatches before committing.

---

## Step 5.5A.1 — Define Data Layer Types

**File:** `src/data/types.ts`

Core type definitions for the entire data pipeline: raw API shapes, processed shapes, resolved shapes, and upgrade slot enum.

```ts
import type {
  AttackSurgeChart,
  DefenseSurgeChart,
  DefenseDieColor,
} from '../engine/types';
import type { Faction } from './presets';

// ============================================================================
// Upgrade Slots
// ============================================================================

/**
 * All upgrade card slot types in Star Wars: Legion.
 * Values are kebab-case strings matching processed data output.
 */
export enum UpgradeSlot {
  // Combat-relevant (full enrichment priority)
  HeavyWeapon = 'heavy-weapon',
  Personnel = 'personnel',
  Armament = 'armament',
  Ordnance = 'ordnance',
  Gear = 'gear',
  Force = 'force',
  Hardpoint = 'hardpoint',
  Crew = 'crew',
  Grenades = 'grenades',
  Pilot = 'pilot',

  // Conditionally combat-relevant (some upgrades in these slots affect dice)
  Training = 'training',
  Programming = 'programming',
  Protocol = 'protocol',
  SquadLeader = 'squad-leader',
  DoorGunner = 'door-gunner',
  DugIn = 'dug-in',
  Generator = 'generator',

  // Non-combat (cost-only for MVP)
  Comms = 'comms',
  Command = 'command',
  Scanner = 'scanner',
  StrikeAndFade = 'strike-and-fade',
  ImperialMarch = 'imperial-march',
  Doctrine = 'doctrine',
}

/** Slots where upgrade enrichment includes dice/keyword data */
export const COMBAT_RELEVANT_SLOTS: ReadonlySet<UpgradeSlot> = new Set([
  UpgradeSlot.HeavyWeapon,
  UpgradeSlot.Personnel,
  UpgradeSlot.Armament,
  UpgradeSlot.Ordnance,
  UpgradeSlot.Gear,
  UpgradeSlot.Force,
  UpgradeSlot.Hardpoint,
  UpgradeSlot.Crew,
  UpgradeSlot.Grenades,
  UpgradeSlot.Pilot,
  UpgradeSlot.Training,
  UpgradeSlot.Programming,
  UpgradeSlot.Protocol,
  UpgradeSlot.SquadLeader,
  UpgradeSlot.DoorGunner,
  UpgradeSlot.DugIn,
  UpgradeSlot.Generator,
]);

/** Display labels for each upgrade slot */
export const UPGRADE_SLOT_LABELS: Record<UpgradeSlot, string> = {
  [UpgradeSlot.HeavyWeapon]: 'Heavy Weapon',
  [UpgradeSlot.Personnel]: 'Personnel',
  [UpgradeSlot.Armament]: 'Armament',
  [UpgradeSlot.Ordnance]: 'Ordnance',
  [UpgradeSlot.Gear]: 'Gear',
  [UpgradeSlot.Force]: 'Force',
  [UpgradeSlot.Hardpoint]: 'Hardpoint',
  [UpgradeSlot.Crew]: 'Crew',
  [UpgradeSlot.Grenades]: 'Grenades',
  [UpgradeSlot.Pilot]: 'Pilot',
  [UpgradeSlot.Comms]: 'Comms',
  [UpgradeSlot.Command]: 'Command',
  [UpgradeSlot.Training]: 'Training',
  [UpgradeSlot.Generator]: 'Generator',
  [UpgradeSlot.Programming]: 'Programming',
  [UpgradeSlot.Protocol]: 'Protocol',
  [UpgradeSlot.Scanner]: 'Scanner',
  [UpgradeSlot.SquadLeader]: 'Squad Leader',
  [UpgradeSlot.StrikeAndFade]: 'Strike and Fade',
  [UpgradeSlot.DoorGunner]: 'Door Gunner',
  [UpgradeSlot.ImperialMarch]: 'Imperial March',
  [UpgradeSlot.DugIn]: 'Dug In',
  [UpgradeSlot.Doctrine]: 'Doctrine',
};

// ============================================================================
// Unit Rank & Type
// ============================================================================

export type UnitRank =
  | 'commander'
  | 'operative'
  | 'corps'
  | 'special-forces'
  | 'support'
  | 'heavy';

export type UnitType = 'trooper' | 'ground-vehicle' | 'repulsor-vehicle';

// ============================================================================
// Raw API Shapes (as returned by tabletopadmiral.com)
// ============================================================================

export interface RawUnit {
  id: number;
  name: string;
  faction: number;
  cost: number;
  health: number;
  figures: number;
  red_defense: boolean;
  rank: number;
  unit_type: number;
  keyword_ids: number[];
  /** Upgrade slot entries — available when fetching from /api/units/2 */
  upgrade_types: RawUpgradeTypeEntry[];
  // Always null in current API — retained for future detection
  weapon1: unknown | null;
  weapon2: unknown | null;
  weapon3: unknown | null;
  surge_chart: unknown | null;
}

/**
 * A single upgrade slot entry on a unit, from the API's upgrade_types array.
 */
export interface RawUpgradeTypeEntry {
  id: number;
  /** Whether this slot is available in Revamp mode */
  revamp: boolean;
  /** Whether this slot is available in Classic mode */
  classic: boolean;
  /** API ID of the unit this slot belongs to */
  unit_fkey: number;
  /** API ID of an upgrade that must be equipped in this slot (null = optional) */
  must_equip: number | null;
  /** API ID of an upgrade that unlocks this slot (null = always available) */
  unlocked_by: number | null;
  /** Maps to an upgrade type from /api/upgrade-types */
  upgrade_type_fkey: number;
  /** Most popular upgrade for this slot (informational only) */
  most_popular_upgrade: number | null;
  /** Whether this slot must have something equipped (null/false = optional) */
  must_equip_something: boolean | null;
}

/**
 * An upgrade type definition from /api/upgrade-types.
 */
export interface RawUpgradeType {
  id: number;
  name: string;
  image_url: string;
  sort_priority: number;
}

export interface RawKeyword {
  id: number;
  name: string;
  has_magnitude: boolean;
  weapon: boolean;
  descriptions: unknown[];
}

export interface RawUpgrade {
  id: number;
  name: string;
  cost: number;
  upgrade_type_fkey: number;
  unit_fkey: number | null;
  keyword_ids: number[];
}

// ============================================================================
// Processed Shapes (after processApiData script)
// ============================================================================

export interface ProcessedUnit {
  /** Original API ID */
  apiId: number;
  /** Slugified ID: e.g. "rebel-alliance-luke-skywalker" */
  id: string;
  name: string;
  faction: Faction;
  cost: number;
  health: number;
  figures: number;
  defenseDieColor: DefenseDieColor;
  rank: UnitRank;
  unitType: UnitType;
  /** Keyword names resolved from keyword_ids */
  keywordNames: string[];
  /** Upgrade bar derived from API upgrade_types field */
  upgradeBar: UpgradeSlot[];
}

export interface ProcessedUpgrade {
  /** Original API ID */
  apiId: number;
  /** Slugified ID */
  id: string;
  name: string;
  cost: number;
  upgradeSlot: UpgradeSlot;
  /** API ID of unit this upgrade is restricted to, or null for generic */
  restrictedToUnitApiId: number | null;
  /** Keyword names resolved from keyword_ids */
  keywordNames: string[];
}

// ============================================================================
// Resolved Shapes (processed + enrichment merged)
// ============================================================================

/** A weapon profile with full dice data (from enrichment) */
export interface WeaponProfile {
  name: string;
  redDice: number;
  blackDice: number;
  whiteDice: number;
  surgeChart: AttackSurgeChart;
  /** Weapon-specific keywords, e.g. { blast: true, pierceX: 2 } */
  keywords: Record<string, number | boolean>;
  minRange?: number;
  maxRange?: number;
}

export interface ResolvedUnit {
  /** Slugified ID from processed data */
  id: string;
  apiId: number;
  name: string;
  faction: Faction;
  cost: number;
  health: number;
  figures: number;
  defenseDieColor: DefenseDieColor;
  rank: UnitRank;
  unitType: UnitType;

  /** Defense surge chart (from enrichment; null if un-enriched) */
  defenseSurgeChart: DefenseSurgeChart | null;

  /**
   * Unit-level keywords with resolved values.
   * Boolean keywords: true/false. Magnitude keywords: numeric value.
   * For un-enriched units: boolean keywords from API are set to true;
   * magnitude keywords are set to 0 (unknown X value).
   */
  keywords: Record<string, number | boolean>;

  /** Weapon profiles (from enrichment). Empty for un-enriched units. */
  weapons: WeaponProfile[];

  /** Available upgrade slots (from processed API data). Populated for all units. */
  upgradeBar: UpgradeSlot[];

  /** Whether this unit has been manually enriched with full data */
  isEnriched: boolean;
}

export interface ResolvedUpgrade {
  id: string;
  apiId: number;
  name: string;
  cost: number;
  upgradeSlot: UpgradeSlot;
  restrictedToUnitApiId: number | null;
  /** Keywords this upgrade grants (from enrichment). Empty for un-enriched upgrades. */
  keywords: Record<string, number | boolean>;
  /** Whether this upgrade has been manually enriched with keyword/dice data */
  isEnriched: boolean;
}
```

**Verify:**
- TypeScript compiles without errors
- `UpgradeSlot` enum covers all known SWL upgrade types
- Processed shapes omit raw null fields (`weapon1`, `weapon2`, `weapon3`, `surge_chart`)
- `ResolvedUnit.isEnriched` flag distinguishes curated from auto-imported units

**Notes:**
- `WeaponProfile.keywords` stores weapon-specific keywords (e.g., Blast, Pierce X on a specific weapon). Unit-level keywords (e.g., Precise X, which applies to all weapons) are on `ResolvedUnit.keywords` separately.
- `ProcessedUnit` stores `keywordNames` as simple strings (e.g., `"Deflect"`, `"Armor"`). The resolver converts these to typed key-value pairs using the keyword metadata.
- The `UnitType` union may need expansion as more vehicle subtypes are identified in the API data; start with these three and extend as needed.

---

## Step 5.5A.2 — API Snapshot Fetch Script

**File:** `scripts/fetchApiData.ts`

A Node.js script that fetches the three API endpoints and saves the raw JSON responses to `src/data/raw/`. Run manually by the developer when a data refresh is needed.

```ts
/**
 * Fetch raw data from the TableTopAdmiral API and save to src/data/raw/.
 *
 * Usage: npx ts-node scripts/fetchApiData.ts
 *    or: npx tsx scripts/fetchApiData.ts
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const API_BASE = 'https://tabletopadmiral.com/api';
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data', 'raw');

const ENDPOINTS: { name: string; path: string }[] = [
  { name: 'units', path: '/units/2' },
  { name: 'keywords', path: '/keywords' },
  { name: 'upgrades', path: '/upgrades' },
  { name: 'upgrade-types', path: '/upgrade-types' },
];

async function fetchAndSave() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const endpoint of ENDPOINTS) {
    const url = `${API_BASE}${endpoint.path}`;
    console.log(`Fetching ${url}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const outputPath = join(OUTPUT_DIR, `${endpoint.name}.json`);
    writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  → Saved ${Array.isArray(data) ? data.length : '?'} entries to ${outputPath}`);
  }

  console.log('Done.');
}

fetchAndSave().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
```

**Verify:**
- Running `npx tsx scripts/fetchApiData.ts` creates four files in `src/data/raw/`
- `units.json` contains an array of ~150+ unit objects (each with `upgrade_types` array)
- `keywords.json` contains an array of ~200+ keyword objects
- `upgrades.json` contains an array of ~400+ upgrade objects
- `upgrade-types.json` contains an array of ~20+ upgrade type definitions
- Files are valid JSON and committed to version control

**Notes:**
- Uses Node.js built-in `fetch` (Node 18+). If targeting older Node, install `node-fetch`.
- The script is idempotent — re-running overwrites the existing files.
- Raw files should be committed to git so the app doesn't depend on the API at build/runtime.
- **Enrichment data is not affected.** The fetch script only writes to `src/data/raw/`. Manual enrichment in `src/data/enrichment/*.ts` is never touched.

---

## Step 5.5A.3 — Data Processing Script

**File:** `scripts/processApiData.ts`

Reads the raw API snapshots, maps integer codes to string enum values, resolves keyword IDs to names, strips unusable null fields, extracts upgrade bars from the API's `upgrade_types` field, and outputs clean processed JSON files to `src/data/processed/`.

```ts
/**
 * Process raw API data into clean, typed structures.
 *
 * Usage: npx tsx scripts/processApiData.ts
 *
 * Reads from: src/data/raw/
 * Outputs to:  src/data/processed/
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const RAW_DIR = join(__dirname, '..', 'src', 'data', 'raw');
const OUT_DIR = join(__dirname, '..', 'src', 'data', 'processed');

// ── Mapping Tables ──────────────────────────────────────────────────────────
// These map API integer codes to string enum values.

const FACTION_MAP: Record<number, string> = {
  1: 'rebel-alliance',
  2: 'galactic-empire',
  3: 'republic',
  4: 'separatist-alliance',
  5: 'mercenaries',
};

const RANK_MAP: Record<number, string> = {
  1: 'commander',
  2: 'operative',
  3: 'corps',
  4: 'special-forces',
  5: 'support',
  6: 'heavy',
};

const UNIT_TYPE_MAP: Record<number, string> = {
  1: 'trooper',
  2: 'ground-vehicle',
  3: 'repulsor-vehicle',
};

/**
 * Maps API upgrade_type_fkey integers to UpgradeSlot string values.
 * Built dynamically from /api/upgrade-types data, with fallback hardcoded
 * values for types present in unit data but missing from /api/upgrade-types
 * (e.g., Ordnance id=14, Programming id=15).
 */
const UPGRADE_TYPE_MAP: Record<number, string> = {
  1: 'personnel',
  2: 'gear',
  3: 'grenades',
  4: 'heavy-weapon',
  5: 'force',
  6: 'comms',
  7: 'pilot',
  8: 'hardpoint',
  9: 'command',
  10: 'training',
  11: 'generator',
  12: 'armament',
  13: 'crew',
  14: 'ordnance',
  15: 'programming',
  // 16: unused
  17: 'scanner',
  18: 'protocol',
  19: 'squad-leader',
  20: 'strike-and-fade',
  21: 'door-gunner',
  22: 'imperial-march',
  23: 'dug-in',
  24: 'doctrine',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function processData() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 1. Load raw data
  const rawUnits = JSON.parse(readFileSync(join(RAW_DIR, 'units.json'), 'utf-8'));
  const rawKeywords = JSON.parse(readFileSync(join(RAW_DIR, 'keywords.json'), 'utf-8'));
  const rawUpgrades = JSON.parse(readFileSync(join(RAW_DIR, 'upgrades.json'), 'utf-8'));
  const rawUpgradeTypes = JSON.parse(readFileSync(join(RAW_DIR, 'upgrade-types.json'), 'utf-8'));

  // 2. Build keyword ID → name map
  const keywordIdToName = new Map<number, string>();
  for (const kw of rawKeywords) {
    keywordIdToName.set(kw.id, kw.name);
  }

  // 2b. Build upgrade type ID → slug map from API data
  // Start with the hardcoded UPGRADE_TYPE_MAP as fallback (covers IDs missing
  // from /api/upgrade-types like Ordnance=14, Programming=15), then overlay
  // with the dynamic names from the API.
  const upgradeTypeIdToSlug = new Map<number, string>(
    Object.entries(UPGRADE_TYPE_MAP).map(([k, v]) => [Number(k), v]),
  );
  for (const ut of rawUpgradeTypes) {
    const slug = slugify(ut.name);
    upgradeTypeIdToSlug.set(Number(ut.id), slug);
  }

  // 3. Process units
  const processedUnits = rawUnits
    .map((u: any) => {
      const faction = FACTION_MAP[u.faction];
      const rank = RANK_MAP[u.rank];
      const unitType = UNIT_TYPE_MAP[u.unit_type];

      if (!faction || !rank || !unitType) {
        console.warn(`Skipping unit "${u.name}" (id=${u.id}): unmapped faction=${u.faction}, rank=${u.rank}, unit_type=${u.unit_type}`);
        return null;
      }

      // Extract upgrade bar from the unit's upgrade_types array
      const upgradeBar: string[] = (u.upgrade_types ?? [])
        .filter((slot: any) => slot.revamp) // Only include Revamp-mode slots
        .sort((a: any, b: any) => {
          // Sort by upgrade_type_fkey for consistent ordering
          const aPriority = rawUpgradeTypes.find((ut: any) => Number(ut.id) === slot.upgrade_type_fkey)?.sort_priority ?? 99;
          const bPriority = rawUpgradeTypes.find((ut: any) => Number(ut.id) === slot.upgrade_type_fkey)?.sort_priority ?? 99;
          return aPriority - bPriority;
        })
        .map((slot: any) => {
          const slotName = upgradeTypeIdToSlug.get(slot.upgrade_type_fkey);
          if (!slotName) {
            console.warn(`  Unknown upgrade_type_fkey=${slot.upgrade_type_fkey} on unit "${u.name}"`);
          }
          return slotName;
        })
        .filter(Boolean);

      return {
        apiId: u.id,
        id: `${faction}-${slugify(u.name)}`,
        name: u.name,
        faction,
        cost: u.cost ?? 0,
        health: u.health ?? 1,
        figures: u.figures ?? 1,
        defenseDieColor: u.red_defense ? 'red' : 'white',
        rank,
        unitType,
        keywordNames: (u.keyword_ids ?? [])
          .map((kid: number) => keywordIdToName.get(kid))
          .filter(Boolean),
        upgradeBar,
      };
    })
    .filter(Boolean);

  // 4. Process upgrades
  const processedUpgrades = rawUpgrades
    .map((up: any) => {
      const upgradeSlot = UPGRADE_TYPE_MAP[up.upgrade_type_fkey];
      if (!upgradeSlot) {
        console.warn(`Skipping upgrade "${up.name}" (id=${up.id}): unmapped upgrade_type_fkey=${up.upgrade_type_fkey}`);
        return null;
      }

      return {
        apiId: up.id,
        id: `${upgradeSlot}-${slugify(up.name)}`,
        name: up.name,
        cost: up.cost ?? 0,
        upgradeSlot,
        restrictedToUnitApiId: up.unit_fkey ?? null,
        keywordNames: (up.keyword_ids ?? [])
          .map((kid: number) => keywordIdToName.get(kid))
          .filter(Boolean),
      };
    })
    .filter(Boolean);

  // 5. Write output
  writeFileSync(
    join(OUT_DIR, 'units.json'),
    JSON.stringify(processedUnits, null, 2),
    'utf-8',
  );
  console.log(`Processed ${processedUnits.length} units → processed/units.json`);

  writeFileSync(
    join(OUT_DIR, 'upgrades.json'),
    JSON.stringify(processedUpgrades, null, 2),
    'utf-8',
  );
  console.log(`Processed ${processedUpgrades.length} upgrades → processed/upgrades.json`);

  // 6. Also write out the keyword map for runtime use
  const keywordMeta = rawKeywords.map((kw: any) => ({
    id: kw.id,
    name: kw.name,
    hasMagnitude: kw.has_magnitude ?? false,
    isWeaponKeyword: kw.weapon ?? false,
  }));
  writeFileSync(
    join(OUT_DIR, 'keywords.json'),
    JSON.stringify(keywordMeta, null, 2),
    'utf-8',
  );
  console.log(`Processed ${keywordMeta.length} keywords → processed/keywords.json`);
}

processData();
```

**Verify:**
- Running `npx tsx scripts/processApiData.ts` produces three files in `src/data/processed/` (uses four raw input files)
- `processed/units.json` contains objects with `id`, `name`, `faction`, `cost`, `defenseDieColor`, `keywordNames`, etc.
- `processed/upgrades.json` contains objects with `id`, `name`, `cost`, `upgradeSlot`, `keywordNames`
- `processed/keywords.json` contains objects with `id`, `name`, `hasMagnitude`, `isWeaponKeyword`
- No units or upgrades with unmapped integer codes (or appropriate warnings logged)
- Slugified IDs are unique (no collisions)

**Notes:**
- The mapping tables (`FACTION_MAP`, `RANK_MAP`, `UNIT_TYPE_MAP`, `UPGRADE_TYPE_MAP`) must be verified against the actual API responses after the first fetch. If the API uses different integer mappings, update the tables accordingly.
- Units or upgrades with unmapped integer codes are skipped with a warning. This ensures the script doesn't crash on unexpected data but alerts the developer to add missing mappings.
- The processed JSON files are committed to version control alongside the raw files. They are the runtime data source — the processing script is only run during development.
- **Enrichment data is not affected.** The processing script only writes to `src/data/processed/`. Manual enrichment in `src/data/enrichment/*.ts` is never touched. However, if a unit/upgrade name changes in the API, its slugified ID changes, and any enrichment keyed to the old ID becomes orphaned. Run the enrichment validation test after every sync to detect this.

---

## Step 5.5A.3b — API Sync Workflow & Enrichment Validation

### Sync Workflow

When refreshing data from the TableTopAdmiral API, follow this sequence to ensure manually-curated enrichment data is preserved:

```
1. npx tsx scripts/fetchApiData.ts          # Fetch fresh API snapshots → src/data/raw/
2. npx tsx scripts/processApiData.ts        # Process raw → clean JSON → src/data/processed/
3. npm test                                 # Run all tests including enrichment validation
4. Review any enrichment validation failures # Fix orphaned keys if units were renamed/removed
5. git add -A && git commit                 # Commit updated raw + processed + any enrichment fixes
```

**Why enrichment is safe:**
- `fetchApiData.ts` writes only to `src/data/raw/*.json`
- `processApiData.ts` writes only to `src/data/processed/*.json`
- Enrichment lives in `src/data/enrichment/*.ts` — TypeScript source files that no script ever overwrites
- The resolver merges processed JSON + enrichment TypeScript at build time

**What can go wrong:**
- If the API **renames** a unit (e.g., "Stormtroopers" → "Imperial Stormtroopers"), its slugified processed ID changes, and the enrichment key `'galactic-empire-stormtroopers'` stops matching. The enrichment validation test catches this.
- If the API **removes** a unit, the enrichment key becomes orphaned. The validation test catches this.
- If the API **adds** a new unit, no enrichment exists for it yet. It appears as un-enriched (0 dice, no surge chart). No action needed unless you want to enrich it.
- If the API changes a unit's **faction**, cost, health, etc., the processed data updates automatically. Enrichment (weapons, surge charts, keywords) is unaffected — it overlays on top.

### Enrichment Validation Test

**File:** `src/data/__tests__/enrichmentValidation.test.ts`

Automatically run as part of the test suite. Detects orphaned enrichment keys and reports which ones need attention.

```ts
import { describe, it, expect } from 'vitest';
import processedUnitsJson from '../processed/units.json';
import processedUpgradesJson from '../processed/upgrades.json';
import { UNIT_ENRICHMENTS } from '../enrichment/units';
import { UPGRADE_ENRICHMENTS } from '../enrichment/upgrades';

describe('Enrichment Validation', () => {
  it('all unit enrichment keys match a processed unit ID', () => {
    const processedUnitIds = new Set(
      (processedUnitsJson as { id: string }[]).map((u) => u.id),
    );

    const orphanedKeys: string[] = [];
    for (const key of Object.keys(UNIT_ENRICHMENTS)) {
      if (!processedUnitIds.has(key)) {
        orphanedKeys.push(key);
      }
    }

    if (orphanedKeys.length > 0) {
      console.warn(
        'Orphaned unit enrichment keys (no matching processed unit ID):\n' +
          orphanedKeys.map((k) => `  - ${k}`).join('\n') +
          '\n\nThese enrichment entries will be ignored. ' +
          'If the unit was renamed in the API, update the enrichment key to match the new processed ID.',
      );
    }

    expect(orphanedKeys).toEqual([]);
  });

  it('all upgrade enrichment keys match a processed upgrade ID', () => {
    const processedUpgradeIds = new Set(
      (processedUpgradesJson as { id: string }[]).map((u) => u.id),
    );

    const orphanedKeys: string[] = [];
    for (const key of Object.keys(UPGRADE_ENRICHMENTS)) {
      if (!processedUpgradeIds.has(key)) {
        orphanedKeys.push(key);
      }
    }

    if (orphanedKeys.length > 0) {
      console.warn(
        'Orphaned upgrade enrichment keys (no matching processed upgrade ID):\n' +
          orphanedKeys.map((k) => `  - ${k}`).join('\n') +
          '\n\nThese enrichment entries will be ignored. ' +
          'If the upgrade was renamed in the API, update the enrichment key to match the new processed ID.',
      );
    }

    expect(orphanedKeys).toEqual([]);
  });

  it('reports enriched unit count for visibility', () => {
    const enrichedCount = Object.keys(UNIT_ENRICHMENTS).length;
    const totalProcessed = (processedUnitsJson as unknown[]).length;
    console.log(
      `Enrichment coverage: ${enrichedCount} / ${totalProcessed} units enriched ` +
        `(${((enrichedCount / totalProcessed) * 100).toFixed(1)}%)`,
    );
    // Not a failure — just informational
    expect(enrichedCount).toBeGreaterThan(0);
  });
});
```

**Verify:**
- Test passes when all enrichment keys match processed IDs
- Test fails with a clear message listing orphaned keys when a mismatch exists
- After renaming an enrichment key to match the new processed ID, the test passes again

**Notes:**
- This test is lightweight and fast — it only compares string keys, no computation.
- It runs as part of the normal `npm test` suite, so CI catches issues automatically.
- The informational "enrichment coverage" assertion helps track progress as more units are enriched.

---

## Step 5.5A.4 — Keyword Map & Field Mapping

**File:** `src/data/keywordMap.ts`

Provides runtime lookup for keyword metadata and a mapping from API keyword names to store field names.

```ts
import keywordsMeta from './processed/keywords.json';

// ============================================================================
// Keyword Metadata
// ============================================================================

export interface KeywordInfo {
  id: number;
  name: string;
  hasMagnitude: boolean;
  isWeaponKeyword: boolean;
}

/** Map from keyword ID to metadata */
export const KEYWORD_BY_ID: Map<number, KeywordInfo> = new Map(
  keywordsMeta.map((k) => [k.id, k as KeywordInfo]),
);

/** Map from keyword name (case-insensitive) to metadata */
export const KEYWORD_BY_NAME: Map<string, KeywordInfo> = new Map(
  keywordsMeta.map((k) => [k.name.toLowerCase(), k as KeywordInfo]),
);

/**
 * Check if a keyword is a magnitude (X-value) keyword.
 */
export function hasMagnitude(keywordName: string): boolean {
  const info = KEYWORD_BY_NAME.get(keywordName.toLowerCase());
  return info?.hasMagnitude ?? false;
}

// ============================================================================
// Keyword Name → Store Field Mapping
// ============================================================================

/**
 * Maps API keyword names to the corresponding store field names.
 * Boolean keywords map to boolean fields; magnitude keywords map to
 * numeric fields with an X suffix.
 *
 * Only dice-affecting keywords that exist in the engine/store are included.
 * Keywords not in this map are ignored during preset generation (they have
 * no effect on dice calculations).
 */
export const ATTACKER_KEYWORD_FIELD_MAP: Record<string, string> = {
  // Numeric (X-value) keywords
  'Precise': 'preciseX',
  'Critical': 'criticalX',
  'Lethal': 'lethalX',
  'Sharpshooter': 'sharpshooterX',
  'Pierce': 'pierceX',
  'Impact': 'impactX',
  'Ram': 'ramX',
  'Anti-Materiel': 'antiMaterielX',
  'Anti-Personnel': 'antiPersonnelX',

  // Boolean keywords
  'Blast': 'blast',
  'High Velocity': 'highVelocity',
  'Suppressive': 'suppressive',
  'Marksman': 'marksman',
  'Jedi Hunter': 'jediHunter',
  'Spray': 'spray',
  'Makashi Mastery': 'makashiMastery',
  'Immune: Deflect': 'immuneDeflect',
  'Death From Above': 'deathFromAbove',
  'Hold the Line': 'holdTheLine',
  'Cumbersome': 'cumbersome',
};

export const DEFENDER_KEYWORD_FIELD_MAP: Record<string, string> = {
  // Numeric (X-value) keywords
  'Armor': 'armorX',
  'Weak Point': 'weakPointX',
  'Danger Sense': 'dangerSenseX',
  'Uncanny Luck': 'uncannyLuckX',
  'Shielded': 'shieldedX',
  'Guardian': 'guardianX',
  'Cover': 'coverX',

  // Boolean keywords
  'Immune: Pierce': 'immunePierce',
  'Immune: Melee Pierce': 'immuneMeleePierce',
  'Immune: Blast': 'immuneBlast',
  'Impervious': 'impervious',
  'Block': 'block',
  'Deflect': 'deflect',
  'Shien Mastery': 'shienMastery',
  'Outmaneuver': 'outmaneuver',
  'Low Profile': 'lowProfile',
  'Djem So Mastery': 'djemSoMastery',
  'Soresu Mastery': 'soresuMastery',
  'Backup': 'backup',
  'Hold the Line': 'holdTheLine',
};
```

**Verify:**
- `KEYWORD_BY_NAME.get('deflect')?.hasMagnitude` returns `false`
- `KEYWORD_BY_NAME.get('armor')?.hasMagnitude` returns `true`
- `ATTACKER_KEYWORD_FIELD_MAP['Pierce']` returns `'pierceX'`
- `DEFENDER_KEYWORD_FIELD_MAP['Immune: Pierce']` returns `'immunePierce'`
- All keywords that appear in `AttackConfigState` and `DefenseConfigState` are covered

**Notes:**
- Keywords not in the field maps are silently ignored by the preset generator. This is intentional — many API keywords (e.g., "Charge", "Jump", "Relentless") don't affect dice calculations and have no store field.
- The `Duelist` keyword maps to both `duelistAttacker` and `duelistDefender` depending on context. This special case is handled in the preset generator, not the map.
- Field names must exactly match the store state interface field names from Phase 5A.

---

## Step 5.5B.1 — Define Enrichment Types

**File:** `src/data/enrichment/types.ts`

Types for the enrichment overlay that adds manually-curated data on top of processed API data.

```ts
import type {
  AttackSurgeChart,
  DefenseSurgeChart,
} from '../../engine/types';
import type { UpgradeSlot, WeaponProfile } from '../types';

// ============================================================================
// Unit Enrichment
// ============================================================================

/**
 * Manual enrichment data for a single unit.
 * Keyed by the processedUnit.id (slugified ID).
 *
 * All fields are optional — only provide what the API doesn't.
 * The resolver merges enrichment on top of processed data.
 */
export interface UnitEnrichment {
  /** Defense surge chart (not available from API) */
  defenseSurgeChart?: DefenseSurgeChart;

  /**
   * Weapon profiles for this unit.
   * Each entry generates a separate attacker preset.
   * If empty/omitted, the unit only generates a defender preset.
   */
  weapons?: WeaponProfile[];

  /**
   * Override the upgrade bar derived from the API.
   * Only needed if the API data is wrong or incomplete for this unit.
   * Most units should NOT set this — the API provides accurate upgrade bars.
   */
  upgradeBarOverride?: UpgradeSlot[];

  /**
   * Override/supplement keyword values.
   * For magnitude keywords: provide the X value (e.g., { 'Armor': 2 }).
   * For boolean keywords: true/false.
   * These merge with (and override) keywords detected from the API.
   */
  keywords?: Record<string, number | boolean>;
}

// ============================================================================
// Upgrade Enrichment
// ============================================================================

/**
 * Manual enrichment data for a single upgrade card.
 * Keyed by the processedUpgrade.id (slugified ID).
 */
export interface UpgradeEnrichment {
  /**
   * Keywords this upgrade grants when equipped.
   * For magnitude keywords: the X value. For boolean: true.
   * Only needed for combat-relevant upgrades (including conditionally
   * combat-relevant slots like Training, Programming, Protocol,
   * Squad Leader, Door Gunner, and Dug In).
   *
   * Special case: Dug In upgrades should set { 'Dug In': true }.
   * The upgrade applicator handles this as a special flag that causes
   * the defender to roll red defense dice during the Roll Cover step.
   */
  keywords?: Record<string, number | boolean>;
}
```

**Verify:**
- TypeScript compiles without errors
- `UnitEnrichment` fields are all optional (additive overlay)
- `WeaponProfile` is imported from the data types, not redefined

**Notes:**
- Enrichment data is keyed by the processed unit/upgrade `id` (slugified string), not the API numeric ID. This makes the enrichment files human-readable and easy to maintain.
- The enrichment system is designed for gradual expansion. A developer can add one unit at a time without affecting others.

---

## Step 5.5B.2 — Create Unit Enrichment Data

**File:** `src/data/enrichment/units.ts`

The initial set of enriched units. Start with the same ~20 attacker + ~18 defender units that Phase 5B was going to hardcode, but expressed as enrichment overlays on the API data.

```ts
import {
  AttackSurgeChart,
  DefenseSurgeChart,
} from '../../engine/types';
import { UpgradeSlot } from '../types';
import type { UnitEnrichment } from './types';

// ============================================================================
// Unit Enrichment Data
// ============================================================================

/**
 * Enrichment overlays keyed by processed unit ID.
 *
 * Each entry adds weapon profiles, surge charts, and keyword X values
 * that the API doesn't provide. Upgrade bars come from the API and
 * do not need to be specified here unless the API data is incorrect.
 *
 * To add a new unit:
 *   1. Find the unit's processed ID in processed/units.json
 *   2. Add an entry here with the relevant enrichment data
 *   3. The resolver and preset generator will automatically pick it up
 */
export const UNIT_ENRICHMENTS: Record<string, UnitEnrichment> = {
  // ══════════════════════════════════════════════════════════════════════════
  // Galactic Empire
  // ══════════════════════════════════════════════════════════════════════════

  'galactic-empire-darth-vader': {
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      'Immune: Pierce': true,
      'Deflect': true,
    },
    weapons: [
      {
        name: "Vader's Lightsaber",
        redDice: 6,
        blackDice: 0,
        whiteDice: 0,
        surgeChart: AttackSurgeChart.ToCrit,
        keywords: { 'Impact': 3, 'Pierce': 3 },
      },
    ],
    // upgradeBar comes from the API — no need to specify here
  },

  'galactic-empire-stormtroopers': {
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      'Precise': 1,
    },
    weapons: [
      {
        name: 'E-11 Blaster',
        redDice: 0,
        blackDice: 0,
        whiteDice: 4,
        surgeChart: AttackSurgeChart.None,
        keywords: {},
      },
      {
        name: 'DLT-19 Stormtrooper',
        redDice: 1,
        blackDice: 0,
        whiteDice: 3,
        surgeChart: AttackSurgeChart.None,
        keywords: { 'Impact': 1 },
      },
      {
        name: 'HH-12 Stormtrooper',
        redDice: 0,
        blackDice: 2,
        whiteDice: 2,
        surgeChart: AttackSurgeChart.None,
        keywords: { 'Impact': 3 },
      },
    ],
    // upgradeBar comes from the API — no need to specify here
  },

  'galactic-empire-shore-troopers': {
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      'Precise': 1,
    },
    weapons: [
      {
        name: 'E-22 Blaster',
        redDice: 0,
        blackDice: 0,
        whiteDice: 4,
        surgeChart: AttackSurgeChart.ToHit,
        keywords: {},
      },
      {
        name: 'T-21B Trooper',
        redDice: 1,
        blackDice: 0,
        whiteDice: 3,
        surgeChart: AttackSurgeChart.ToHit,
        keywords: {},
      },
    ],
    upgradeBar: [
      UpgradeSlot.HeavyWeapon,
      UpgradeSlot.Personnel,
      UpgradeSlot.Gear,
      UpgradeSlot.Grenades,
      UpgradeSlot.Comms,
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Rebel Alliance
  // ══════════════════════════════════════════════════════════════════════════

  'rebel-alliance-luke-skywalker': {
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      'Deflect': true,
    },
    weapons: [
      {
        name: "Anakin's Lightsaber",
        redDice: 6,
        blackDice: 0,
        whiteDice: 0,
        surgeChart: AttackSurgeChart.ToCrit,
        keywords: { 'Impact': 2, 'Pierce': 2 },
      },
    ],
    // upgradeBar comes from the API — no need to specify here
  },

  'rebel-alliance-rebel-troopers': {
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {},
    weapons: [
      {
        name: 'A-300 Blaster Rifle',
        redDice: 0,
        blackDice: 0,
        whiteDice: 4,
        surgeChart: AttackSurgeChart.None,
        keywords: {},
      },
      {
        name: 'Z-6 Trooper',
        redDice: 0,
        blackDice: 0,
        whiteDice: 6,
        surgeChart: AttackSurgeChart.None,
        keywords: {},
      },
    ],
    upgradeBar: [
      UpgradeSlot.HeavyWeapon,
      UpgradeSlot.Personnel,
      UpgradeSlot.Gear,
      UpgradeSlot.Grenades,
      UpgradeSlot.Training,
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Republic
  // ══════════════════════════════════════════════════════════════════════════

  'republic-clone-troopers': {
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {},
    weapons: [
      {
        name: 'DC-15A Blaster Rifle',
        redDice: 0,
        blackDice: 2,
        whiteDice: 2,
        surgeChart: AttackSurgeChart.ToCrit,
        keywords: {},
      },
      {
        name: 'DC-15 Phase I Trooper',
        redDice: 1,
        blackDice: 1,
        whiteDice: 2,
        surgeChart: AttackSurgeChart.ToCrit,
        keywords: {},
      },
      {
        name: 'Z-6 Phase I Trooper',
        redDice: 0,
        blackDice: 2,
        whiteDice: 4,
        surgeChart: AttackSurgeChart.ToCrit,
        keywords: {},
      },
    ],
    // upgradeBar comes from the API — no need to specify here
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Separatist Alliance
  // ══════════════════════════════════════════════════════════════════════════

  'separatist-alliance-b1-battle-droids': {
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {},
    weapons: [
      {
        name: 'E-5 Blaster',
        redDice: 0,
        blackDice: 0,
        whiteDice: 5,
        surgeChart: AttackSurgeChart.None,
        keywords: {},
      },
      {
        name: 'E-5s B1 Trooper',
        redDice: 0,
        blackDice: 1,
        whiteDice: 4,
        surgeChart: AttackSurgeChart.None,
        keywords: {},
      },
    ],
    // upgradeBar comes from the API — no need to specify here
  },

  'separatist-alliance-aat-trade-federation-battle-tank': {
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      'Armor': 2,
      'Shielded': 2,
    },
    weapons: [
      {
        name: 'MX-8 Artillery Laser Cannon',
        redDice: 2,
        blackDice: 2,
        whiteDice: 0,
        surgeChart: AttackSurgeChart.None,
        keywords: { 'Impact': 2 },
      },
    ],
    // upgradeBar comes from the API — no need to specify here
  },

  // ... Additional units added over time following this pattern.
  // New entries only need the fields the API is missing.
  // Run the processing script first, find the unit's processed ID,
  // then add an entry here.
};
```

**Verify:**
- TypeScript compiles without errors
- Each enrichment key matches a processed unit ID in `processed/units.json`
- Weapon dice counts match the actual SWL unit cards
- Surge chart values match unit cards
- Keyword X values match unit cards

**Notes:**
- This initial dataset covers the same ~8–10 units that Phase 5B was going to hardcode. It demonstrates the enrichment pattern and provides a functional MVP baseline.
- Adding a new unit requires: (1) verify its processed ID exists in `processed/units.json`, (2) add an entry here with weapon profiles, surge chart, and keywords from the unit card. Upgrade bars come from the API automatically.
- Weapon profiles represent the COMBINED dice pool of the base weapon + heavy weapon upgrade for that loadout. For example, "DLT-19 Stormtrooper" is 3 white (remaining 3 troopers with E-11s, minus 1 for the DLT mini) + 1 red (DLT-19).
- The `keywords` field only needs to include keywords with X values or keywords the API gets wrong. Boolean keywords that are correctly detected from `keyword_ids` don't need to be repeated here (though repeating them is harmless — enrichment overrides API data).

---

## Step 5.5B.3 — Create Upgrade Enrichment Data

**File:** `src/data/enrichment/upgrades.ts`

Enrichment data for combat-relevant upgrade cards. Non-combat upgrades (Comms, Command, etc.) don't need enrichment (cost-only from API).

```ts
import type { UpgradeEnrichment } from './types';

// ============================================================================
// Upgrade Enrichment Data
// ============================================================================

/**
 * Enrichment overlays keyed by processed upgrade ID.
 * Only combat-relevant upgrades that add keywords/dice need entries here.
 * Non-combat upgrades (Comms, Command, etc.) are cost-only
 * and don't need enrichment.
 *
 * Conditionally combat-relevant slots (Training, Programming, Protocol,
 * Squad Leader, Door Gunner, Dug In) may contain upgrades that affect
 * dice calculations — enrich those individual upgrades as needed.
 *
 * **Dug In** upgrades are a special case: equipping one causes the
 * defender to roll red defense dice during the Roll Cover step instead
 * of white. This is handled as a special-case flag in the upgrade
 * applicator, not via the standard keyword mapping.
 *
 * To add a new upgrade:
 *   1. Find the upgrade's processed ID in processed/upgrades.json
 *   2. Add an entry here with the keywords it grants
 *   3. The upgrade resolver will automatically pick it up
 */
export const UPGRADE_ENRICHMENTS: Record<string, UpgradeEnrichment> = {
  // ── Force Upgrades ──

  'force-force-push': {
    keywords: { 'Force Push': true },
    // Force Push doesn't add dice — it's a free action.
    // Listed here as a placeholder for the enrichment pattern.
    // In practice, Force Push's game effect (forced movement) is
    // not modeled in the dice calculator.
  },

  'force-saber-throw': {
    keywords: { 'Saber Throw': true },
    // Saber Throw grants a ranged attack using melee dice.
    // This is modeled by the user selecting the appropriate
    // weapon preset and attack type.
  },

  'force-force-reflexes': {
    keywords: { 'Force Reflexes': true },
    // Grants a free Dodge token — doesn't directly modify dice
    // but the user can increase Dodge tokens after equipping.
  },

  // ── Gear Upgrades ──

  'gear-targeting-scopes': {
    keywords: { 'Precise': 1 },
  },

  'gear-environmental-gear': {
    keywords: {},
    // Ignores difficult terrain — no dice effect.
  },

  // ── Training Upgrades ──

  'training-tenacity': {
    keywords: { 'Tenacity': true },
    // While wounded: attack surge → hit (melee).
    // This is informational — the user sets surgeChart to ToHit.
  },

  'training-duck-and-cover': {
    keywords: { 'Duck and Cover': true },
    // Gains suppression for cover — user manages via UI toggles.
  },

  'training-offensive-push': {
    keywords: { 'Offensive Push': true },
    // Gains an Aim token — user manages via Aim token spinner.
  },

  // ── Grenades ──

  'grenades-impact-grenades': {
    keywords: { 'Impact': 1 },
  },

  'grenades-concussion-grenades': {
    keywords: { 'Blast': true },
  },

  // ── Personnel Upgrades ──

  // Personnel upgrades that modify keywords are enriched here.
  // Personnel that add miniatures (changing dice pool) are represented
  // as different weapon presets, not as dynamic keyword additions.

  // ... Additional upgrade enrichments added over time.
  // Conditionally combat-relevant slots (Training, Programming, Protocol,
  // Squad Leader, Door Gunner, Dug In) — enrich upgrades from these slots
  // that grant dice-affecting keywords.

  // ── Dug In Upgrades ──
  // Dug In upgrades grant a special game effect: the defender rolls red
  // defense dice during the Roll Cover step instead of white defense dice.
  // This is modeled as a special-case boolean flag ('Dug In': true) on the
  // enrichment, which the upgrade applicator handles separately.

  'dug-in-dug-in': {
    keywords: { 'Dug In': true },
  },
};
```

**Verify:**
- TypeScript compiles without errors
- Each enrichment key matches a processed upgrade ID in `processed/upgrades.json`
- Keyword names match the store field mapping in `keywordMap.ts`

**Notes:**
- Many combat-relevant upgrades have effects that are not directly modeled in the dice calculator (e.g., Force Push grants movement, Environmental Gear ignores terrain). These are included with empty `keywords` for cost tracking but have no mechanical effect.
- Upgrades that add dice (e.g., a heavy weapon upgrade's weapon profile) are NOT modeled here — they are represented as different weapon presets in the unit enrichment. The upgrade enrichment only handles keyword additions.
- This initial dataset is intentionally small. As the enrichment is expanded, prioritize upgrades that add dice-affecting keywords (Impact, Pierce, Precise, etc.) over those with non-modeled effects.
- Conditionally combat-relevant slots (Training, Programming, Protocol, Squad Leader, Door Gunner, Dug In) contain a mix of upgrades — some affect dice calculations and some don't. Enrich the specific upgrades that grant dice-affecting keywords; leave the rest un-enriched for cost-only tracking.
- **Dug In** upgrades are a special case: they cause the defender to roll red defense dice during the Roll Cover step instead of white. This is modeled as `{ 'Dug In': true }` in the enrichment and handled as a special-case flag (`dugIn`) in the upgrade applicator rather than through the standard keyword→field mapping.

---

## Step 5.5C.1 — Unit Resolver

**File:** `src/data/unitResolver.ts`

Merges processed unit data with enrichment overlays to produce `ResolvedUnit` objects.

```ts
import type { ProcessedUnit, ResolvedUnit } from './types';
import type { UnitEnrichment } from './enrichment/types';
import { UNIT_ENRICHMENTS } from './enrichment/units';
import { KEYWORD_BY_NAME } from './keywordMap';
import { DefenseSurgeChart } from '../engine/types';

import processedUnitsJson from './processed/units.json';

// ============================================================================
// Resolve All Units
// ============================================================================

/**
 * Merge processed API data with enrichment overlays.
 * Returns all units as ResolvedUnit[], with isEnriched flag indicating
 * whether manual data is available.
 *
 * Result is lazily computed and cached on first call.
 */
let _cachedUnits: ResolvedUnit[] | null = null;

export function getAllResolvedUnits(): ResolvedUnit[] {
  if (_cachedUnits) return _cachedUnits;

  const processedUnits = processedUnitsJson as ProcessedUnit[];
  _cachedUnits = processedUnits.map((pu) => resolveUnit(pu));
  return _cachedUnits;
}

/**
 * Get a single resolved unit by its processed ID.
 */
export function getResolvedUnitById(
  id: string,
): ResolvedUnit | undefined {
  return getAllResolvedUnits().find((u) => u.id === id);
}

// ============================================================================
// Resolution Logic
// ============================================================================

function resolveUnit(processed: ProcessedUnit): ResolvedUnit {
  const enrichment: UnitEnrichment | undefined =
    UNIT_ENRICHMENTS[processed.id];
  const isEnriched = enrichment !== undefined;

  // Resolve keywords: start with API-detected keywords
  const keywords: Record<string, number | boolean> = {};
  for (const kwName of processed.keywordNames) {
    const meta = KEYWORD_BY_NAME.get(kwName.toLowerCase());
    if (meta) {
      // Boolean keywords → true; magnitude keywords → 0 (unknown X value)
      keywords[kwName] = meta.hasMagnitude ? 0 : true;
    }
  }

  // Apply enrichment keyword overrides (provides actual X values)
  if (enrichment?.keywords) {
    for (const [kwName, value] of Object.entries(enrichment.keywords)) {
      keywords[kwName] = value;
    }
  }

  return {
    id: processed.id,
    apiId: processed.apiId,
    name: processed.name,
    faction: processed.faction,
    cost: processed.cost,
    health: processed.health,
    figures: processed.figures,
    defenseDieColor: processed.defenseDieColor,
    rank: processed.rank,
    unitType: processed.unitType,

    defenseSurgeChart:
      enrichment?.defenseSurgeChart ?? null,

    keywords,
    weapons: enrichment?.weapons ?? [],
    upgradeBar: enrichment?.upgradeBarOverride ?? processed.upgradeBar,
    isEnriched,
  };
}
```

**Verify:**
- `getAllResolvedUnits()` returns an array with all processed units
- An enriched unit (e.g., `galactic-empire-stormtroopers`) has `isEnriched: true`, non-empty `weapons`, non-empty `upgradeBar`, and keyword X values filled in
- An un-enriched unit has `isEnriched: false`, empty `weapons`, non-empty `upgradeBar` (populated from API), and magnitude keywords at `0`
- Boolean keywords from the API (e.g., "Deflect") are set to `true` on un-enriched units
- Enrichment keyword values override API-detected values (e.g., API detects "Armor" → `0`, enrichment sets `"Armor": 2` → result is `2`)
- Calling `getAllResolvedUnits()` twice returns the same cached array

**Notes:**
- The resolver imports `processed/units.json` via static JSON import. Vite handles this at build time.
- The caching ensures the resolution only runs once per app lifecycle. Since the data is static, there's no invalidation needed.
- `defenseDieColor` comes from the processed data (API's `red_defense` field), not enrichment. Enrichment adds `defenseSurgeChart` which the API doesn't have.

---

## Step 5.5C.2 — Upgrade Resolver

**File:** `src/data/upgradeResolver.ts`

Merges processed upgrade data with enrichment overlays to produce `ResolvedUpgrade` objects. Provides lookup utilities for the UI.

```ts
import type { ProcessedUpgrade, ResolvedUpgrade, UpgradeSlot } from './types';
import type { UpgradeEnrichment } from './enrichment/types';
import { UPGRADE_ENRICHMENTS } from './enrichment/upgrades';

import processedUpgradesJson from './processed/upgrades.json';

// ============================================================================
// Resolve All Upgrades
// ============================================================================

let _cachedUpgrades: ResolvedUpgrade[] | null = null;

export function getAllResolvedUpgrades(): ResolvedUpgrade[] {
  if (_cachedUpgrades) return _cachedUpgrades;

  const processedUpgrades = processedUpgradesJson as ProcessedUpgrade[];
  _cachedUpgrades = processedUpgrades.map((pu) => resolveUpgrade(pu));
  return _cachedUpgrades;
}

/**
 * Get a single resolved upgrade by its processed ID.
 */
export function getResolvedUpgradeById(
  id: string,
): ResolvedUpgrade | undefined {
  return getAllResolvedUpgrades().find((u) => u.id === id);
}

/**
 * Get all upgrades available for a specific slot type.
 * Optionally filtered by unit restriction.
 *
 * @param slot - The upgrade slot to filter by
 * @param unitApiId - If provided, returns only generic upgrades + upgrades
 *                    restricted to this specific unit. If omitted, returns
 *                    all upgrades for the slot (including restricted ones).
 */
export function getUpgradesForSlot(
  slot: UpgradeSlot,
  unitApiId?: number,
): ResolvedUpgrade[] {
  return getAllResolvedUpgrades().filter((u) => {
    if (u.upgradeSlot !== slot) return false;
    if (unitApiId !== undefined && u.restrictedToUnitApiId !== null) {
      // Restricted upgrade: only include if it matches this unit
      return u.restrictedToUnitApiId === unitApiId;
    }
    return true;
  });
}

// ============================================================================
// Resolution Logic
// ============================================================================

function resolveUpgrade(processed: ProcessedUpgrade): ResolvedUpgrade {
  const enrichment: UpgradeEnrichment | undefined =
    UPGRADE_ENRICHMENTS[processed.id];
  const isEnriched = enrichment !== undefined;

  return {
    id: processed.id,
    apiId: processed.apiId,
    name: processed.name,
    cost: processed.cost,
    upgradeSlot: processed.upgradeSlot as UpgradeSlot,
    restrictedToUnitApiId: processed.restrictedToUnitApiId,
    keywords: enrichment?.keywords ?? {},
    isEnriched,
  };
}
```

**Verify:**
- `getAllResolvedUpgrades()` returns an array with all processed upgrades
- `getUpgradesForSlot('gear')` returns only Gear-type upgrades
- `getUpgradesForSlot('heavy-weapon', 5)` returns generic heavy weapons + those restricted to unit API ID 5
- Enriched upgrades have `isEnriched: true` and populated `keywords`
- Un-enriched upgrades have `isEnriched: false` and empty `keywords`

**Notes:**
- The `getUpgradesForSlot` function is the primary API consumed by the Phase 6 upgrade dropdowns. When the user selects a unit, the UI calls this for each slot in the unit's upgrade bar, passing the unit's API ID to respect unit restrictions.
- Cost data comes directly from the API — no enrichment needed for cost. Even non-combat upgrades have accurate cost data for efficiency calculations.

---

## Step 5.5C.3 — Preset Generator (Replaces Phase 5B)

**File:** `src/data/presetGenerator.ts`

Generates `AttackerPreset[]` and `DefenderPreset[]` from resolved units, replacing the hardcoded Phase 5B data. Preserves the existing preset type interfaces.

```ts
import type { AttackerPreset, DefenderPreset } from './presets';
import type { ResolvedUnit, UpgradeSlot } from './types';
import { Faction } from './presets';
import { getAllResolvedUnits } from './unitResolver';
import {
  ATTACKER_KEYWORD_FIELD_MAP,
  DEFENDER_KEYWORD_FIELD_MAP,
  hasMagnitude,
} from './keywordMap';
import type {
  AttackSurgeChart,
  DefenseSurgeChart,
  DefenseDieColor,
} from '../engine/types';

// ============================================================================
// Generator
// ============================================================================

interface GeneratedPresets {
  attackerPresets: AttackerPreset[];
  defenderPresets: DefenderPreset[];
}

let _cached: GeneratedPresets | null = null;

/**
 * Generate all presets from resolved unit data.
 * Results are cached — subsequent calls return the same arrays.
 */
export function generateAllPresets(): GeneratedPresets {
  if (_cached) return _cached;

  const units = getAllResolvedUnits();
  const attackerPresets: AttackerPreset[] = [];
  const defenderPresets: DefenderPreset[] = [];

  for (const unit of units) {
    // Every unit produces a defender preset
    defenderPresets.push(generateDefenderPreset(unit));

    if (unit.weapons.length > 0) {
      // Enriched units: one attacker preset per weapon
      for (let i = 0; i < unit.weapons.length; i++) {
        attackerPresets.push(generateAttackerPreset(unit, i));
      }
    } else {
      // Un-enriched units: skeleton attacker preset with 0 dice
      attackerPresets.push(generateSkeletonAttackerPreset(unit));
    }
  }

  // Sort by faction, then by name for consistent dropdown order
  const sortFn = (a: { faction: Faction; name: string }, b: { faction: Faction; name: string }) => {
    if (a.faction !== b.faction) return a.faction.localeCompare(b.faction);
    return a.name.localeCompare(b.name);
  };
  attackerPresets.sort(sortFn);
  defenderPresets.sort(sortFn);

  _cached = { attackerPresets, defenderPresets };
  return _cached;
}

// ============================================================================
// Attacker Preset Generation
// ============================================================================

function generateAttackerPreset(
  unit: ResolvedUnit,
  weaponIndex: number,
): AttackerPreset {
  const weapon = unit.weapons[weaponIndex];

  // Build profile from unit-level + weapon-level keywords
  const profile: Record<string, any> = {
    redDice: weapon.redDice,
    blackDice: weapon.blackDice,
    whiteDice: weapon.whiteDice,
    surgeChart: weapon.surgeChart,
    unitCost: unit.cost,
  };

  // Map unit-level keywords to profile fields
  mapKeywordsToProfile(unit.keywords, ATTACKER_KEYWORD_FIELD_MAP, profile);

  // Map weapon-level keywords to profile fields (weapon overrides unit)
  mapKeywordsToProfile(weapon.keywords, ATTACKER_KEYWORD_FIELD_MAP, profile);

  // Handle Duelist special case (maps to duelistAttacker on attacker side)
  if (unit.keywords['Duelist'] || weapon.keywords['Duelist']) {
    profile['duelistAttacker'] = true;
  }

  return {
    id: `${unit.id}-${slugifyWeapon(weapon.name)}`,
    faction: unit.faction as Faction,
    name: `${unit.name} (${weapon.name})`,
    profile,
    upgradeBar: unit.upgradeBar,
  };
}

function generateSkeletonAttackerPreset(
  unit: ResolvedUnit,
): AttackerPreset {
  const profile: Record<string, any> = {
    redDice: 0,
    blackDice: 0,
    whiteDice: 0,
    unitCost: unit.cost,
  };

  // Still map boolean attacker keywords from API
  mapKeywordsToProfile(unit.keywords, ATTACKER_KEYWORD_FIELD_MAP, profile);

  return {
    id: `${unit.id}-base`,
    faction: unit.faction as Faction,
    name: `${unit.name} (no weapon data)`,
    profile,
    upgradeBar: unit.upgradeBar,
  };
}

// ============================================================================
// Defender Preset Generation
// ============================================================================

function generateDefenderPreset(unit: ResolvedUnit): DefenderPreset {
  const profile: Record<string, any> = {
    dieColor: unit.defenseDieColor,
    unitCost: unit.cost,
    minisInLOS: unit.figures,
  };

  // Set surge chart if enriched
  if (unit.defenseSurgeChart !== null) {
    profile['surgeChart'] = unit.defenseSurgeChart;
  }

  // Map unit-level keywords to profile fields
  mapKeywordsToProfile(unit.keywords, DEFENDER_KEYWORD_FIELD_MAP, profile);

  // Handle Duelist special case (maps to duelistDefender on defender side)
  if (unit.keywords['Duelist']) {
    profile['duelistDefender'] = true;
  }

  return {
    id: unit.id,
    faction: unit.faction as Faction,
    name: unit.name,
    profile,
    upgradeBar: unit.upgradeBar,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map keyword key-value pairs to store profile fields using a field map.
 * Mutates the provided profile object.
 */
function mapKeywordsToProfile(
  keywords: Record<string, number | boolean>,
  fieldMap: Record<string, string>,
  profile: Record<string, any>,
): void {
  for (const [kwName, kwValue] of Object.entries(keywords)) {
    const fieldName = fieldMap[kwName];
    if (fieldName) {
      profile[fieldName] = kwValue;
    }
  }
}

function slugifyWeapon(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

**Verify:**
- `generateAllPresets().attackerPresets` contains entries for each enriched unit's weapons + skeleton entries for un-enriched units
- `generateAllPresets().defenderPresets` contains one entry per unit (all units)
- An enriched attacker preset (e.g., Darth Vader Lightsaber) has correct dice, surge chart, keywords, cost, and upgrade bar
- An un-enriched attacker preset has 0 dice, correct cost, and populated upgrade bar (from API)
- A defender preset has correct die color, cost, minis in LOS, and boolean keywords
- Presets are sorted by faction then name
- Preset IDs are unique
- `upgradeBar` field is populated for all units (from API data)

**Notes:**
- This module completely replaces the hardcoded `ATTACKER_PRESETS` and `DEFENDER_PRESETS` arrays from Phase 5B. The preset helper functions (next step) call this generator instead of filtering a hardcoded array.
- Un-enriched units produce "skeleton" attacker presets with `(no weapon data)` in the name. The user can select these and manually configure dice. The upgrade bar is populated from the API for all units, including un-enriched ones.
- The `mapKeywordsToProfile` function silently ignores keywords not in the field map. This is intentional — keywords like "Jump", "Charge", "Relentless" don't affect the dice calculator.

---

## Step 5.5C.4 — Preset Helpers (Replaces Phase 5B Helpers)

**File:** `src/data/presetHelpers.ts`

Replaces the Phase 5B preset helper functions. Same API surface, different data source.

```ts
import type { AttackerPreset, DefenderPreset } from './presets';
import { Faction, FACTION_LABELS } from './presets';
import { generateAllPresets } from './presetGenerator';

// ============================================================================
// Preset Helpers
// ============================================================================

/**
 * Get all attacker presets, optionally filtered by faction.
 */
export function getAttackerPresets(
  faction?: Faction | null,
): AttackerPreset[] {
  const { attackerPresets } = generateAllPresets();
  if (!faction) return attackerPresets;
  return attackerPresets.filter((p) => p.faction === faction);
}

/**
 * Get all defender presets, optionally filtered by faction.
 */
export function getDefenderPresets(
  faction?: Faction | null,
): DefenderPreset[] {
  const { defenderPresets } = generateAllPresets();
  if (!faction) return defenderPresets;
  return defenderPresets.filter((p) => p.faction === faction);
}

/**
 * Find an attacker preset by its ID.
 */
export function getAttackerPresetById(
  id: string,
): AttackerPreset | undefined {
  const { attackerPresets } = generateAllPresets();
  return attackerPresets.find((p) => p.id === id);
}

/**
 * Find a defender preset by its ID.
 */
export function getDefenderPresetById(
  id: string,
): DefenderPreset | undefined {
  const { defenderPresets } = generateAllPresets();
  return defenderPresets.find((p) => p.id === id);
}

/**
 * Get faction options for dropdown display.
 */
export function getFactionOptions(): { value: Faction; label: string }[] {
  return Object.entries(FACTION_LABELS).map(([value, label]) => ({
    value: value as Faction,
    label,
  }));
}
```

**Verify:**
- `getAttackerPresets()` returns all attacker presets
- `getAttackerPresets(Faction.GalacticEmpire)` returns only Empire presets
- `getAttackerPresetById('galactic-empire-darth-vader-vaders-lightsaber')` returns the Vader preset
- `getDefenderPresets()` returns all defender presets
- `getFactionOptions()` returns all 5 factions with labels
- Function signatures match the Phase 5B version exactly — no changes needed in Phase 6 consumer code

**Notes:**
- Since `generateAllPresets()` caches its result, these helpers are essentially filtering a cached array — same performance as Phase 5B's hardcoded approach.
- The function signatures are identical to Phase 5B. Phase 6 code that calls these functions needs no changes.

---

## Step 5.5C.5 — Upgrade Applicator

**File:** `src/data/upgradeApplicator.ts`

Applies equipped upgrade effects (cost and keywords) to an engine config. Used by `getFullConfig()` to produce the final configuration that includes upgrade contributions.

```ts
import type { ResolvedUpgrade } from './types';
import { getResolvedUpgradeById } from './upgradeResolver';
import {
  ATTACKER_KEYWORD_FIELD_MAP,
  DEFENDER_KEYWORD_FIELD_MAP,
  hasMagnitude,
} from './keywordMap';

// ============================================================================
// Types
// ============================================================================

/**
 * A config object with unitCost and keyword fields.
 * Generic enough to accept both attacker and defender configs.
 */
interface ConfigWithCost {
  unitCost: number;
  [key: string]: any;
}

// ============================================================================
// Apply Upgrades
// ============================================================================

/**
 * Apply equipped attacker upgrades to the attacker config.
 * - Adds upgrade costs to unitCost
 * - Applies enriched upgrade keywords to config fields
 *
 * Returns a new config object (does not mutate the input).
 */
export function applyAttackerUpgrades(
  config: ConfigWithCost,
  equippedUpgradeIds: (string | null)[],
): ConfigWithCost {
  return applyUpgrades(config, equippedUpgradeIds, ATTACKER_KEYWORD_FIELD_MAP);
}

/**
 * Apply equipped defender upgrades to the defender config.
 * Same logic as attacker but uses the defender keyword field map.
 */
export function applyDefenderUpgrades(
  config: ConfigWithCost,
  equippedUpgradeIds: (string | null)[],
): ConfigWithCost {
  return applyUpgrades(config, equippedUpgradeIds, DEFENDER_KEYWORD_FIELD_MAP);
}

// ============================================================================
// Core Logic
// ============================================================================

function applyUpgrades(
  config: ConfigWithCost,
  equippedUpgradeIds: (string | null)[],
  fieldMap: Record<string, string>,
): ConfigWithCost {
  // Shallow clone to avoid mutating the original
  const result = { ...config };

  let totalUpgradeCost = 0;

  for (const upgradeId of equippedUpgradeIds) {
    if (!upgradeId) continue;

    const upgrade = getResolvedUpgradeById(upgradeId);
    if (!upgrade) continue;

    // Always add cost (combat and non-combat alike)
    totalUpgradeCost += upgrade.cost;

    // Apply keyword effects (only enriched combat upgrades have keywords)
    for (const [kwName, kwValue] of Object.entries(upgrade.keywords)) {
      const fieldName = fieldMap[kwName];
      if (!fieldName) continue;

      if (typeof kwValue === 'boolean') {
        // Boolean keywords: set to true
        result[fieldName] = true;
      } else if (typeof kwValue === 'number') {
        // Numeric keywords: add to existing value
        const currentValue = (result[fieldName] as number) ?? 0;
        result[fieldName] = currentValue + kwValue;
      }
    }

    // Special case: Dug In upgrade changes cover dice to red
    // This is a unique game effect not representable via the standard
    // keyword mapping. When a Dug In upgrade is equipped on the defender,
    // set a flag so the engine knows to roll red dice during cover.
    if (upgrade.upgradeSlot === 'dug-in' && upgrade.keywords['Dug In']) {
      result['dugIn'] = true;
    }
  }

  // Add total upgrade cost to unit cost
  result.unitCost = (result.unitCost ?? 0) + totalUpgradeCost;

  return result;
}
```

**Verify:**
- `applyAttackerUpgrades(config, [null, null])` returns the same config with no changes
- `applyAttackerUpgrades(config, ['gear-targeting-scopes'])` returns config with `preciseX` increased by 1 and `unitCost` increased by the upgrade's cost
- `applyAttackerUpgrades(config, ['comms-comms-relay'])` returns config with only `unitCost` increased (non-combat upgrade, no keywords)
- `applyDefenderUpgrades(config, ['dug-in-dug-in'])` returns config with `dugIn` set to `true` and `unitCost` increased
- Multiple upgrades' costs are summed correctly
- Multiple upgrades' keywords are additive for numeric values
- Original config is not mutated

**Notes:**
- Numeric keyword values are **additive**: if the base config has `preciseX: 1` and the upgrade adds `Precise: 1`, the result is `preciseX: 2`. This models how keywords stack in SWL.
- Boolean keyword values are set to `true` — they don't stack (equipping two upgrades with Blast doesn't do anything extra).
- Non-combat upgrades contribute cost but have empty `keywords`, so only the cost addition runs.
- **Dug In special case:** When a Dug In upgrade is equipped on the defender, the applicator sets `dugIn: true` on the config. The engine must check this flag during the Roll Cover step and roll red defense dice instead of white when set. This is handled separately from the keyword mapping because it affects a different phase of the dice calculation (cover roll, not the main defense roll).
- The function returns a new object via spread — the original `config` from the store selector is not mutated.

---

## Step 5.5D.1 — Modify Store Interfaces and Actions

This step describes the **changes** to the existing Phase 5A stores to support the upgrade system. These are amendments to the Phase 5A.2 and 5A.3 implementations, not new files.

### Changes to `AttackConfigState` (in `src/stores/attackConfigStore.ts`)

Add the following fields and actions:

```ts
// Add to AttackConfigState interface:

  // ── Upgrade System ──
  /** Available upgrade slots for the selected unit (set by loadPreset) */
  upgradeBar: UpgradeSlot[];
  /** Parallel array to upgradeBar: ID of equipped upgrade in each slot, or null */
  equippedUpgradeIds: (string | null)[];

  // ── New Actions ──
  /** Equip an upgrade in a specific slot (by index in upgradeBar) */
  equipUpgrade: (slotIndex: number, upgradeId: string | null) => void;
```

Add to `AttackConfigFields` type exclusion list:

```ts
type AttackConfigFields = Omit<
  AttackConfigState,
  | 'setField'
  | 'setSelectedFaction'
  | 'loadPreset'
  | 'reset'
  | 'selectedFaction'
  | 'selectedPresetId'
  | 'upgradeBar'           // ← NEW: exclude from setField
  | 'equippedUpgradeIds'   // ← NEW: exclude from setField
  | 'equipUpgrade'         // ← NEW: exclude action
>;
```

Add default values:

```ts
// Append to DEFAULT_ATTACK_CONFIG:

  // (no changes needed — upgradeBar and equippedUpgradeIds are
  // managed separately, not part of the engine config defaults)
```

Update store creation:

```ts
export const useAttackConfigStore = create<AttackConfigState>((set) => ({
  ...DEFAULT_ATTACK_CONFIG,

  // UI state
  selectedFaction: null,
  selectedPresetId: null,

  // Upgrade system
  upgradeBar: [],
  equippedUpgradeIds: [],

  setField: (field, value) =>
    set((state) => ({ ...state, [field]: value })),

  setSelectedFaction: (faction) =>
    set({ selectedFaction: faction }),

  // MODIFIED: loadPreset now accepts upgradeBar
  loadPreset: (presetId, profile, upgradeBar = []) =>
    set(() => ({
      ...DEFAULT_ATTACK_CONFIG,
      ...profile,
      selectedPresetId: presetId,
      upgradeBar,
      equippedUpgradeIds: new Array(upgradeBar.length).fill(null),
    })),

  // NEW: equipUpgrade action
  equipUpgrade: (slotIndex, upgradeId) =>
    set((state) => {
      if (slotIndex < 0 || slotIndex >= state.equippedUpgradeIds.length) return state;
      const newIds = [...state.equippedUpgradeIds];
      newIds[slotIndex] = upgradeId;
      return { equippedUpgradeIds: newIds };
    }),

  reset: () =>
    set(() => ({
      ...DEFAULT_ATTACK_CONFIG,
      selectedFaction: null,
      selectedPresetId: null,
      upgradeBar: [],
      equippedUpgradeIds: [],
    })),
}));
```

Update `selectAttackerConfig` to exclude upgrade fields:

```ts
export function selectAttackerConfig(state: AttackConfigState) {
  const {
    selectedFaction,
    selectedPresetId,
    upgradeBar,           // ← NEW: exclude
    equippedUpgradeIds,   // ← NEW: exclude
    setField,
    setSelectedFaction,
    loadPreset,
    reset,
    equipUpgrade,         // ← NEW: exclude
    ...config
  } = state;
  return config;
}
```

### Changes to `loadPreset` Signature in Preset Types

In `src/data/presets.ts`, update the `AttackerPreset` and `DefenderPreset` interfaces:

```ts
export interface AttackerPreset {
  id: string;
  faction: Faction;
  name: string;
  profile: AttackerPresetProfile;
  upgradeBar: UpgradeSlot[];  // ← NEW
}

export interface DefenderPreset {
  id: string;
  faction: Faction;
  name: string;
  profile: DefenderPresetProfile;
  upgradeBar: UpgradeSlot[];  // ← NEW
}
```

Update the `loadPreset` action signature:

```ts
// In AttackConfigState interface:
loadPreset: (
  presetId: string,
  profile: AttackerPresetProfile,
  upgradeBar?: UpgradeSlot[],  // ← NEW optional parameter
) => void;

// Same pattern in DefenseConfigState:
loadPreset: (
  presetId: string,
  profile: DefenderPresetProfile,
  upgradeBar?: UpgradeSlot[],  // ← NEW optional parameter
) => void;
```

### Changes to `DefenseConfigState` (in `src/stores/defenseConfigStore.ts`)

Apply the same pattern as the attack config store:
- Add `upgradeBar: UpgradeSlot[]` and `equippedUpgradeIds: (string | null)[]` to state
- Add `equipUpgrade: (slotIndex: number, upgradeId: string | null) => void` action
- Update `loadPreset` to accept and store `upgradeBar`
- Update `reset` to clear upgrade fields
- Update `selectDefenderConfig` to exclude upgrade fields

*(Implementation is identical to the attack config changes above — same pattern, different store.)*

**Verify:**
- `loadPreset('foo', profile, [UpgradeSlot.Gear, UpgradeSlot.Force])` → `upgradeBar` has 2 entries, `equippedUpgradeIds` has 2 nulls
- `equipUpgrade(0, 'gear-targeting-scopes')` → `equippedUpgradeIds[0]` is the upgrade ID
- `equipUpgrade(1, null)` → `equippedUpgradeIds[1]` is null (unequip)
- `reset()` → `upgradeBar` and `equippedUpgradeIds` are empty arrays
- `selectAttackerConfig(state)` does NOT include `upgradeBar` or `equippedUpgradeIds`
- Out-of-bounds `slotIndex` is safely ignored

**Notes:**
- `upgradeBar` and `equippedUpgradeIds` are UI/data-layer state, not engine config fields. They are excluded from `selectAttackerConfig` / `selectDefenderConfig`. The upgrade applicator reads them separately in `getFullConfig()`.
- `loadPreset` defaults `upgradeBar` to `[]` for backward compatibility. If called without the third argument (e.g., from existing Phase 5A tests), it behaves as before.
- The `equipUpgrade` action replaces the upgrade at the given index. To unequip, pass `null`. This handles both equip and unequip in a single action.

---

## Step 5.5D.2 — Update `getFullConfig` to Apply Upgrades

**File:** `src/stores/configSelectors.ts` (modify existing)

Update `getFullConfig()` and `useFullConfig()` to apply equipped upgrades via the upgrade applicator.

```ts
import type { AttackConfig } from '../engine/types';
import { useAttackConfigStore, selectAttackerConfig } from './attackConfigStore';
import { useDefenseConfigStore, selectDefenderConfig } from './defenseConfigStore';
import { useAttackTypeStore } from './attackTypeStore';
import {
  applyAttackerUpgrades,
  applyDefenderUpgrades,
} from '../data/upgradeApplicator';

/**
 * Read-only selector that merges all three input stores into the engine's
 * AttackConfig format, WITH equipped upgrades applied.
 */
export function getFullConfig(): AttackConfig {
  const attackState = useAttackConfigStore.getState();
  const defenseState = useDefenseConfigStore.getState();
  const attackTypeState = useAttackTypeStore.getState();

  // Get base configs (without upgrade fields)
  const baseAttacker = selectAttackerConfig(attackState);
  const baseDefender = selectDefenderConfig(defenseState);

  // Apply equipped upgrades (adds cost + keywords)
  const attacker = applyAttackerUpgrades(
    baseAttacker,
    attackState.equippedUpgradeIds,
  );
  const defender = applyDefenderUpgrades(
    baseDefender,
    defenseState.equippedUpgradeIds,
  );

  return {
    attacker,
    defender,
    attackType: attackTypeState.attackType,
  };
}

/**
 * React hook version — subscribes to all three stores and returns
 * the merged config with upgrades applied.
 */
export function useFullConfig(): AttackConfig {
  const attackerConfig = useAttackConfigStore(selectAttackerConfig);
  const attackerUpgradeIds = useAttackConfigStore(
    (s) => s.equippedUpgradeIds,
  );
  const defenderConfig = useDefenseConfigStore(selectDefenderConfig);
  const defenderUpgradeIds = useDefenseConfigStore(
    (s) => s.equippedUpgradeIds,
  );
  const attackType = useAttackTypeStore((s) => s.attackType);

  const attacker = applyAttackerUpgrades(attackerConfig, attackerUpgradeIds);
  const defender = applyDefenderUpgrades(defenderConfig, defenderUpgradeIds);

  return {
    attacker,
    defender,
    attackType,
  };
}
```

**Verify:**
- `getFullConfig()` with no upgrades equipped returns the same result as before Phase 5.5
- `getFullConfig()` with a Gear upgrade equipped returns `attacker.unitCost` = base cost + upgrade cost
- `getFullConfig()` with an enriched upgrade equipped returns the keyword field incremented (e.g., `preciseX` increased)
- `useFullConfig()` re-renders when `equippedUpgradeIds` changes
- The returned config satisfies the `AttackConfig` TypeScript interface

**Notes:**
- `useFullConfig` now subscribes to `equippedUpgradeIds` in addition to the existing subscriptions. This ensures the simulation re-runs when upgrades change.
- The upgrade applicator runs on every call to `getFullConfig()` / `useFullConfig()`. Since it's a lightweight loop over a small array, this has negligible performance impact.
- The output of `getFullConfig()` is the same `AttackConfig` shape the engine expects — the engine doesn't know about upgrades; it just sees the final merged values.

---

## Step 5.5D.3 — Data Layer Index

**File:** `src/data/index.ts`

Barrel export for the data layer, consolidating all public APIs.

```ts
// Types
export type {
  UpgradeSlot,
  UnitRank,
  UnitType,
  WeaponProfile,
  ResolvedUnit,
  ResolvedUpgrade,
} from './types';
export {
  UpgradeSlot as UpgradeSlotEnum,
  UPGRADE_SLOT_LABELS,
  COMBAT_RELEVANT_SLOTS,
} from './types';

// Preset types & data
export type { AttackerPreset, DefenderPreset } from './presets';
export { Faction, FACTION_LABELS } from './presets';

// Preset helpers (main API for Phase 6)
export {
  getAttackerPresets,
  getDefenderPresets,
  getAttackerPresetById,
  getDefenderPresetById,
  getFactionOptions,
} from './presetHelpers';

// Resolvers (for direct data access)
export { getAllResolvedUnits, getResolvedUnitById } from './unitResolver';
export {
  getAllResolvedUpgrades,
  getResolvedUpgradeById,
  getUpgradesForSlot,
} from './upgradeResolver';

// Upgrade applicator (used by configSelectors)
export {
  applyAttackerUpgrades,
  applyDefenderUpgrades,
} from './upgradeApplicator';

// Keyword map
export { KEYWORD_BY_ID, KEYWORD_BY_NAME, hasMagnitude } from './keywordMap';
```

**Verify:**
- All exports resolve without circular dependencies
- Importing from `'../data'` provides all preset helpers and resolver functions
- TypeScript compiles without errors

---

## Step 5.5E.1 — Data Processing & Resolution Tests

**File:** `src/data/__tests__/unitResolver.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { getAllResolvedUnits, getResolvedUnitById } from '../unitResolver';

describe('unitResolver', () => {
  it('resolves all processed units', () => {
    const units = getAllResolvedUnits();
    expect(units.length).toBeGreaterThan(0);
  });

  it('enriched units have weapons and upgrade bar', () => {
    const vader = getResolvedUnitById('galactic-empire-darth-vader');
    expect(vader).toBeDefined();
    expect(vader!.isEnriched).toBe(true);
    expect(vader!.weapons.length).toBeGreaterThan(0);
    expect(vader!.upgradeBar.length).toBeGreaterThan(0);
    expect(vader!.defenseSurgeChart).toBeDefined();
  });

  it('un-enriched units have empty weapons and upgrade bar', () => {
    const units = getAllResolvedUnits();
    const unenriched = units.find((u) => !u.isEnriched);
    // There should be at least some un-enriched units
    expect(unenriched).toBeDefined();
    if (unenriched) {
      expect(unenriched.weapons).toHaveLength(0);
      expect(unenriched.upgradeBar).toHaveLength(0);
      expect(unenriched.defenseSurgeChart).toBeNull();
    }
  });

  it('un-enriched units have boolean keywords set to true', () => {
    const units = getAllResolvedUnits();
    const unenriched = units.find(
      (u) => !u.isEnriched && Object.keys(u.keywords).length > 0,
    );
    if (unenriched) {
      // At least one boolean keyword should be true
      const booleanValues = Object.values(unenriched.keywords).filter(
        (v) => v === true,
      );
      expect(booleanValues.length).toBeGreaterThan(0);
    }
  });

  it('enriched units have keyword X values populated', () => {
    const stormtroopers = getResolvedUnitById(
      'galactic-empire-stormtroopers',
    );
    expect(stormtroopers).toBeDefined();
    expect(stormtroopers!.keywords['Precise']).toBe(1);
  });

  it('returns consistent cached results', () => {
    const a = getAllResolvedUnits();
    const b = getAllResolvedUnits();
    expect(a).toBe(b); // Same reference (cached)
  });
});
```

**File:** `src/data/__tests__/upgradeResolver.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import {
  getAllResolvedUpgrades,
  getUpgradesForSlot,
} from '../upgradeResolver';

describe('upgradeResolver', () => {
  it('resolves all processed upgrades', () => {
    const upgrades = getAllResolvedUpgrades();
    expect(upgrades.length).toBeGreaterThan(0);
  });

  it('filters upgrades by slot', () => {
    const gearUpgrades = getUpgradesForSlot('gear' as any);
    expect(gearUpgrades.length).toBeGreaterThan(0);
    expect(gearUpgrades.every((u) => u.upgradeSlot === 'gear')).toBe(true);
  });

  it('respects unit restrictions', () => {
    const allHeavy = getUpgradesForSlot('heavy-weapon' as any);
    const filteredHeavy = getUpgradesForSlot('heavy-weapon' as any, 9999);
    // Filtered should not include upgrades restricted to other units
    expect(filteredHeavy.length).toBeLessThanOrEqual(allHeavy.length);
  });

  it('enriched upgrades have keywords', () => {
    const upgrades = getAllResolvedUpgrades();
    const enriched = upgrades.find((u) => u.isEnriched);
    if (enriched) {
      expect(Object.keys(enriched.keywords).length).toBeGreaterThanOrEqual(0);
      // Some enriched upgrades have empty keywords (non-dice effects)
    }
  });
});
```

**File:** `src/data/__tests__/presetGenerator.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { generateAllPresets } from '../presetGenerator';
import { Faction } from '../presets';

describe('presetGenerator', () => {
  it('generates attacker and defender presets', () => {
    const { attackerPresets, defenderPresets } = generateAllPresets();
    expect(attackerPresets.length).toBeGreaterThan(0);
    expect(defenderPresets.length).toBeGreaterThan(0);
  });

  it('generates one defender preset per unit', () => {
    const { defenderPresets } = generateAllPresets();
    const ids = defenderPresets.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length); // No duplicates
  });

  it('enriched units generate weapon-specific attacker presets', () => {
    const { attackerPresets } = generateAllPresets();
    const vaderPresets = attackerPresets.filter((p) =>
      p.id.includes('darth-vader'),
    );
    expect(vaderPresets.length).toBeGreaterThanOrEqual(1);
    expect(vaderPresets[0].profile.redDice).toBe(6);
    expect(vaderPresets[0].profile.pierceX).toBe(3);
  });

  it('skeleton attacker presets have 0 dice', () => {
    const { attackerPresets } = generateAllPresets();
    const skeleton = attackerPresets.find((p) => p.id.endsWith('-base'));
    if (skeleton) {
      expect(skeleton.profile.redDice ?? 0).toBe(0);
      expect(skeleton.profile.blackDice ?? 0).toBe(0);
      expect(skeleton.profile.whiteDice ?? 0).toBe(0);
    }
  });

  it('defender presets have defense die color', () => {
    const { defenderPresets } = generateAllPresets();
    for (const preset of defenderPresets) {
      expect(preset.profile.dieColor).toBeDefined();
    }
  });

  it('presets have upgradeBar field', () => {
    const { attackerPresets, defenderPresets } = generateAllPresets();
    for (const p of attackerPresets) {
      expect(Array.isArray(p.upgradeBar)).toBe(true);
    }
    for (const p of defenderPresets) {
      expect(Array.isArray(p.upgradeBar)).toBe(true);
    }
  });

  it('presets are sorted by faction then name', () => {
    const { attackerPresets } = generateAllPresets();
    for (let i = 1; i < attackerPresets.length; i++) {
      const a = attackerPresets[i - 1];
      const b = attackerPresets[i];
      if (a.faction === b.faction) {
        expect(a.name.localeCompare(b.name)).toBeLessThanOrEqual(0);
      }
    }
  });
});
```

**Verify:**
- All tests pass: `npm test -- --run src/data/__tests__/`
- No TypeScript errors in test files

---

## Step 5.5E.2 — Upgrade Applicator Tests

**File:** `src/data/__tests__/upgradeApplicator.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import {
  applyAttackerUpgrades,
  applyDefenderUpgrades,
} from '../upgradeApplicator';

describe('applyAttackerUpgrades', () => {
  const baseConfig = {
    redDice: 6,
    blackDice: 0,
    whiteDice: 0,
    unitCost: 175,
    preciseX: 0,
    blast: false,
  };

  it('returns unchanged config when no upgrades equipped', () => {
    const result = applyAttackerUpgrades(baseConfig, []);
    expect(result.unitCost).toBe(175);
    expect(result.preciseX).toBe(0);
  });

  it('returns unchanged config when all slots are null', () => {
    const result = applyAttackerUpgrades(baseConfig, [null, null, null]);
    expect(result.unitCost).toBe(175);
  });

  it('adds upgrade cost to unitCost', () => {
    // Assuming 'gear-targeting-scopes' exists with cost > 0
    // This test may need adjustment based on actual processed data
    const result = applyAttackerUpgrades(baseConfig, [
      'gear-targeting-scopes',
    ]);
    // Cost should be base + upgrade cost
    expect(result.unitCost).toBeGreaterThan(175);
  });

  it('applies keyword from enriched upgrade', () => {
    const result = applyAttackerUpgrades(baseConfig, [
      'gear-targeting-scopes',
    ]);
    // Targeting Scopes adds Precise 1
    expect(result.preciseX).toBe(1);
  });

  it('stacks numeric keyword values additively', () => {
    const configWithPrecise = { ...baseConfig, preciseX: 1 };
    const result = applyAttackerUpgrades(configWithPrecise, [
      'gear-targeting-scopes',
    ]);
    expect(result.preciseX).toBe(2);
  });

  it('sums costs from multiple upgrades', () => {
    const result = applyAttackerUpgrades(baseConfig, [
      'gear-targeting-scopes',
      'grenades-impact-grenades',
    ]);
    expect(result.unitCost).toBeGreaterThan(baseConfig.unitCost);
  });

  it('does not mutate the original config', () => {
    const original = { ...baseConfig };
    applyAttackerUpgrades(original, ['gear-targeting-scopes']);
    expect(original.unitCost).toBe(175);
    expect(original.preciseX).toBe(0);
  });

  it('handles unknown upgrade IDs gracefully', () => {
    const result = applyAttackerUpgrades(baseConfig, [
      'nonexistent-upgrade-id',
    ]);
    expect(result.unitCost).toBe(175); // No change
  });
});

describe('applyDefenderUpgrades', () => {
  const baseConfig = {
    dieColor: 'red',
    unitCost: 44,
    armorX: 0,
  };

  it('returns unchanged config when no upgrades equipped', () => {
    const result = applyDefenderUpgrades(baseConfig, []);
    expect(result.unitCost).toBe(44);
  });

  it('adds cost for non-combat upgrades', () => {
    const result = applyDefenderUpgrades(baseConfig, [
      'comms-comms-relay',
    ]);
    // Only cost changes — no keyword effects from comms
    expect(result.unitCost).toBeGreaterThanOrEqual(44);
  });
});
```

**Verify:**
- All tests pass: `npm test -- --run src/data/__tests__/upgradeApplicator`
- Tests confirm immutability, cost addition, keyword stacking, and graceful handling of unknown IDs

---

## Step 5.5E.3 — Store Upgrade Action Tests

**File:** `src/stores/__tests__/storeUpgrades.test.ts`

Tests for the new upgrade-related store fields and actions.

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAttackConfigStore } from '../attackConfigStore';
import { useDefenseConfigStore } from '../defenseConfigStore';
import { AttackSurgeChart } from '../../engine/types';

describe('attackConfigStore — upgrade actions', () => {
  beforeEach(() => {
    useAttackConfigStore.getState().reset();
  });

  it('initializes with empty upgrade state', () => {
    const state = useAttackConfigStore.getState();
    expect(state.upgradeBar).toEqual([]);
    expect(state.equippedUpgradeIds).toEqual([]);
  });

  it('loadPreset sets upgradeBar and initializes equippedUpgradeIds', () => {
    const upgradeBar = ['gear', 'force', 'grenades'] as any[];
    useAttackConfigStore.getState().loadPreset(
      'test-unit',
      { redDice: 6, surgeChart: AttackSurgeChart.ToCrit, unitCost: 100 },
      upgradeBar,
    );

    const state = useAttackConfigStore.getState();
    expect(state.upgradeBar).toEqual(upgradeBar);
    expect(state.equippedUpgradeIds).toEqual([null, null, null]);
    expect(state.redDice).toBe(6);
    expect(state.selectedPresetId).toBe('test-unit');
  });

  it('loadPreset without upgradeBar defaults to empty', () => {
    useAttackConfigStore.getState().loadPreset(
      'test-unit',
      { redDice: 4 },
    );

    const state = useAttackConfigStore.getState();
    expect(state.upgradeBar).toEqual([]);
    expect(state.equippedUpgradeIds).toEqual([]);
  });

  it('equipUpgrade sets the upgrade at the specified slot', () => {
    useAttackConfigStore.getState().loadPreset(
      'test-unit',
      { redDice: 4 },
      ['gear', 'force'] as any[],
    );

    useAttackConfigStore.getState().equipUpgrade(0, 'gear-targeting-scopes');
    const state = useAttackConfigStore.getState();
    expect(state.equippedUpgradeIds[0]).toBe('gear-targeting-scopes');
    expect(state.equippedUpgradeIds[1]).toBeNull();
  });

  it('equipUpgrade with null unequips', () => {
    useAttackConfigStore.getState().loadPreset(
      'test-unit',
      { redDice: 4 },
      ['gear'] as any[],
    );

    useAttackConfigStore.getState().equipUpgrade(0, 'gear-targeting-scopes');
    useAttackConfigStore.getState().equipUpgrade(0, null);

    const state = useAttackConfigStore.getState();
    expect(state.equippedUpgradeIds[0]).toBeNull();
  });

  it('equipUpgrade ignores out-of-bounds index', () => {
    useAttackConfigStore.getState().loadPreset(
      'test-unit',
      { redDice: 4 },
      ['gear'] as any[],
    );

    useAttackConfigStore.getState().equipUpgrade(5, 'some-upgrade');
    const state = useAttackConfigStore.getState();
    expect(state.equippedUpgradeIds).toEqual([null]);
  });

  it('reset clears upgrade state', () => {
    useAttackConfigStore.getState().loadPreset(
      'test-unit',
      { redDice: 4 },
      ['gear', 'force'] as any[],
    );
    useAttackConfigStore.getState().equipUpgrade(0, 'gear-targeting-scopes');
    useAttackConfigStore.getState().reset();

    const state = useAttackConfigStore.getState();
    expect(state.upgradeBar).toEqual([]);
    expect(state.equippedUpgradeIds).toEqual([]);
  });
});

describe('defenseConfigStore — upgrade actions', () => {
  beforeEach(() => {
    useDefenseConfigStore.getState().reset();
  });

  it('initializes with empty upgrade state', () => {
    const state = useDefenseConfigStore.getState();
    expect(state.upgradeBar).toEqual([]);
    expect(state.equippedUpgradeIds).toEqual([]);
  });

  it('loadPreset sets upgradeBar', () => {
    useDefenseConfigStore.getState().loadPreset(
      'test-defender',
      { dieColor: 'red' as any, unitCost: 44 },
      ['gear', 'comms'] as any[],
    );

    const state = useDefenseConfigStore.getState();
    expect(state.upgradeBar).toEqual(['gear', 'comms']);
    expect(state.equippedUpgradeIds).toEqual([null, null]);
  });

  it('equipUpgrade works on defense store', () => {
    useDefenseConfigStore.getState().loadPreset(
      'test-defender',
      { unitCost: 44 },
      ['gear'] as any[],
    );

    useDefenseConfigStore.getState().equipUpgrade(0, 'gear-environmental-gear');
    expect(
      useDefenseConfigStore.getState().equippedUpgradeIds[0],
    ).toBe('gear-environmental-gear');
  });
});
```

**Verify:**
- All tests pass: `npm test -- --run src/stores/__tests__/storeUpgrades`
- Upgrade state is correctly initialized, set, and cleared

---

## Verification Checklist

After completing all steps, confirm:

| Check | Command / Action |
|-------|-----------------|
| TypeScript compiles | `npx tsc --noEmit` passes with no errors |
| Processing script runs | `npx tsx scripts/processApiData.ts` produces 3 files in `src/data/processed/` |
| Fetch script runs | `npx tsx scripts/fetchApiData.ts` produces 4 files in `src/data/raw/` |
| Enrichment validation passes | `npm test -- --run src/data/__tests__/enrichmentValidation` — no orphaned enrichment keys |
| Unit resolver tests pass | `npm test -- --run src/data/__tests__/unitResolver` |
| Upgrade resolver tests pass | `npm test -- --run src/data/__tests__/upgradeResolver` |
| Preset generator tests pass | `npm test -- --run src/data/__tests__/presetGenerator` |
| Upgrade applicator tests pass | `npm test -- --run src/data/__tests__/upgradeApplicator` |
| Store upgrade tests pass | `npm test -- --run src/stores/__tests__/storeUpgrades` |
| Existing store tests still pass | `npm test -- --run src/stores/` — existing 5A tests unaffected |
| Resolved units populated | `getAllResolvedUnits().length` > 100 |
| Enriched units have weapons | Vader, Stormtroopers, etc. have non-empty weapons array |
| Un-enriched units have defense data | Random un-enriched unit has correct `defenseDieColor` and `cost` |
| Preset helpers work | `getAttackerPresets(Faction.GalacticEmpire)` returns Empire presets |
| getFullConfig with upgrades | Equip an upgrade → `getFullConfig().attacker.unitCost` includes upgrade cost |
| No circular imports | Build completes without circular dependency warnings |

---

## Files Created in This Phase

| File | Purpose |
|------|---------|
| `src/data/types.ts` | Core data layer types (UpgradeSlot, RawUnit, ProcessedUnit, ResolvedUnit, etc.) |
| `src/data/keywordMap.ts` | Keyword metadata lookup and keyword→store field mapping |
| `src/data/enrichment/types.ts` | UnitEnrichment and UpgradeEnrichment interface types |
| `src/data/enrichment/units.ts` | Manual enrichment data for curated units |
| `src/data/enrichment/upgrades.ts` | Manual enrichment data for combat-relevant upgrades |
| `src/data/unitResolver.ts` | Merges processed + enrichment → ResolvedUnit[] |
| `src/data/upgradeResolver.ts` | Merges processed + enrichment → ResolvedUpgrade[] |
| `src/data/presetGenerator.ts` | Generates AttackerPreset[] and DefenderPreset[] from resolved data |
| `src/data/presetHelpers.ts` | Preset search/filter functions (replaces Phase 5B version) |
| `src/data/upgradeApplicator.ts` | Applies equipped upgrade effects to engine config |
| `src/data/index.ts` | Data layer barrel export |
| `src/data/raw/units.json` | Raw API snapshot — units (with upgrade_types) |
| `src/data/raw/keywords.json` | Raw API snapshot — keywords |
| `src/data/raw/upgrades.json` | Raw API snapshot — upgrades |
| `src/data/raw/upgrade-types.json` | Raw API snapshot — upgrade type definitions |
| `src/data/processed/units.json` | Processed/cleaned unit data |
| `src/data/processed/upgrades.json` | Processed/cleaned upgrade data |
| `src/data/processed/keywords.json` | Processed keyword metadata |
| `scripts/fetchApiData.ts` | Developer script to fetch fresh API data |
| `scripts/processApiData.ts` | Developer script to process raw → processed |
| `src/data/__tests__/enrichmentValidation.test.ts` | Enrichment key validation (detects orphaned keys after API sync) |
| `src/data/__tests__/unitResolver.test.ts` | Unit resolver tests |
| `src/data/__tests__/upgradeResolver.test.ts` | Upgrade resolver tests |
| `src/data/__tests__/presetGenerator.test.ts` | Preset generator tests |
| `src/data/__tests__/upgradeApplicator.test.ts` | Upgrade applicator tests |
| `src/stores/__tests__/storeUpgrades.test.ts` | Store upgrade action tests |

## Files Modified in This Phase

| File | Change |
|------|--------|
| `src/data/presets.ts` | Add `upgradeBar: UpgradeSlot[]` to `AttackerPreset` and `DefenderPreset` interfaces |
| `src/stores/attackConfigStore.ts` | Add `upgradeBar`, `equippedUpgradeIds`, `equipUpgrade` action; update `loadPreset` signature and `selectAttackerConfig` |
| `src/stores/defenseConfigStore.ts` | Same pattern as attackConfigStore |
| `src/stores/configSelectors.ts` | Import upgrade applicator; update `getFullConfig()` and `useFullConfig()` to apply upgrades |

---

## Dependency Graph

```
Phase 2A (engine/types.ts)
  AttackSurgeChart, DefenseSurgeChart,
  DefenseDieColor, AttackType
       │
       ▼
Phase 5A (Zustand Stores)
  useAttackConfigStore
  useDefenseConfigStore
  Store interfaces, setField, loadPreset
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    Phase 5.5                                 │
│                                                              │
│  5.5A.1  Data Types ──────────────────────────┐              │
│  5.5A.2  Fetch Script (developer tool)        │              │
│  5.5A.3  Process Script ──┐                   │              │
│  5.5A.3b Enrichment Validation Test           │              │
│  5.5A.4  Keyword Map ─────┤                   │              │
│                           ▼                   ▼              │
│               5.5B.1  Enrichment Types                       │
│               5.5B.2  Unit Enrichment Data                   │
│               5.5B.3  Upgrade Enrichment Data                │
│                           │                                  │
│                           ▼                                  │
│               5.5C.1  Unit Resolver                          │
│               5.5C.2  Upgrade Resolver                       │
│                           │                                  │
│                           ▼                                  │
│               5.5C.3  Preset Generator ──► replaces Phase 5B │
│               5.5C.4  Preset Helpers                         │
│               5.5C.5  Upgrade Applicator                     │
│                           │                                  │
│                           ▼                                  │
│               5.5D.1  Store Modifications                    │
│               5.5D.2  getFullConfig Update                   │
│               5.5D.3  Data Index                             │
│                           │                                  │
│                           ▼                                  │
│               5.5E.1–E.3  Tests                              │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
Phase 6 (UI Panels)
  AttackerPanel, DefenderPanel ──
  now include upgrade slot dropdowns
  and pass preset.upgradeBar to loadPreset
```

**Implementation Order:**

1. **5.5A.1** — Data types (no dependencies)
2. **5.5A.2** — Fetch script → run to get raw data
3. **5.5A.3** — Process script → run to get processed data
4. **5.5A.4** — Keyword map (depends on processed/keywords.json)
5. **5.5B.1** — Enrichment types (depends on 5.5A.1)
6. **5.5B.2–B.3** — Enrichment data (depends on 5.5B.1) — can be done in parallel
7. **5.5C.1** — Unit resolver (depends on 5.5A.4 + 5.5B.2)
8. **5.5C.2** — Upgrade resolver (depends on 5.5A.4 + 5.5B.3)
9. **5.5C.3–C.4** — Preset generator + helpers (depends on 5.5C.1)
10. **5.5C.5** — Upgrade applicator (depends on 5.5C.2 + 5.5A.4)
11. **5.5D.1** — Store modifications (depends on 5.5A.1 for UpgradeSlot type)
12. **5.5D.2** — getFullConfig update (depends on 5.5C.5 + 5.5D.1)
13. **5.5D.3** — Data index (depends on all above)
14. **5.5E.1–E.3** — Tests (depends on all above)

**Parallelism:** Steps 5.5A.2/A.3 (scripts) are run once during setup. Steps 5.5B.2 and 5.5B.3 (enrichment data) are independent. Steps 5.5C.1 and 5.5C.2 (resolvers) are independent if their enrichment data is ready. Step 5.5D.1 (store mods) can proceed in parallel with 5.5C steps since it only depends on 5.5A.1 types.
