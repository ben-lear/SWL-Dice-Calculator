# Phase 11 — Upgrade Restriction Parsing & Enforcement

## Goal

Parse all eligibility and exclusion fields from raw `upgrades.json` into typed arrays on
processed/resolved upgrades, then enforce those restrictions in the unit builder upgrade
slot dropdowns (attacker and defender sides).

---

## Background: Raw Fields Surveyed

All unique keys on raw upgrade records were enumerated. The fields relevant to eligibility are:

### Inclusion restrictions (upgrade allowed only if unit matches all non-empty arrays)

| Raw field(s) | Semantics | Example |
|---|---|---|
| `faction_fkey` | Must belong to this faction | 2-1B Medical Droid → Rebel only |
| `rank_fkey`, `rank_fkey2` | Must be one of these ranks | Agent Kallus → Corps or Spec Forces |
| `unit_type_fkey`, `unit_type_fkey2`, `unit_type_fkey3` | Must be one of these unit types | Attack Protocols → Repulsor or Ground vehicle |
| `unit_fkey`, `unit_fkey2`, `unit_fkey3`, `unit_fkey4` | Must be one of these specific units | Pilot cards tied to a single vehicle |
| `affiliation_fkey` | Must belong to this mercenary affiliation | Call to Arms → Ewoks only |
| `alignment` (`'Light'`/`'Dark'`) | Must belong to a Force-aligned faction | Force Choke → Dark side only |

### Exclusion restrictions (upgrade hidden if unit matches)

| Raw field | Semantics | Example |
|---|---|---|
| `units_disallowed_on` (array of unit API IDs) | Must NOT be one of these specific units | Comms Relay → forbidden on emplacement heavy weapons teams |

### Out of scope for this phase

| Field | Reason deferred |
|---|---|
| `battle_force_fkey` | Single entry (Imperial March); battle forces are a separate list-building mode |
| `required_upgrade_type` | 2 upgrades; requires slot-state awareness at equip time — complex |
| `cheaper_*` fields | Cost modifiers, not eligibility |
| `is_unique`, `max` | Army-level list-building limits, not per-unit eligibility |
| `upgrade_type_fkey2` | Secondary slot type (e.g., Door Gunners fits two slot types); inform slot matching, handled separately |

---

## Filtering Logic

For a given unit context `{ apiId, faction, rank, unitType, affiliation }`, an upgrade is
**shown** if and only if **all** of the following are true:

1. **Not excluded by unit:** `unitsDisallowedOn` is empty **OR** `unitApiId` is not in it
2. **Faction matches:** `factionRestrictions` is empty **OR** unit's faction is in it
3. **Rank matches:** `rankRestrictions` is empty **OR** unit's rank is in it
4. **Unit type matches:** `unitTypeRestrictions` is empty **OR** unit's unitType is in it
5. **Unit matches:** `unitRestrictions` is empty **OR** `unitApiId` is in it
6. **Affiliation matches:** `affiliationRestrictions` is empty **OR** unit's affiliation is in it
7. **Alignment matches:** `alignmentRestriction` is null **OR** unit's faction maps to that alignment

Alignment is derived at filter time from faction string — not stored on units — via a local
`FACTION_ALIGNMENT` map:

```ts
const FACTION_ALIGNMENT: Record<string, 'Light' | 'Dark'> = {
  'rebel-alliance': 'Light',
  'republic': 'Light',
  'galactic-empire': 'Dark',
  'separatist-alliance': 'Dark',
  // Mercenaries: no entry → blocked by any alignment restriction
};
```

When `unitApiId` (or `faction`, `rank`, etc.) is **not known** (no unit selected), inclusion
restrictions pass silently so the full slot list appears. Exclusion (`unitsDisallowedOn`)
only fires when `unitApiId` is known.

---

## Files Changed

### 1. `scripts/fetchApiData.ts`

Add 4 new endpoints to `ENDPOINTS`:

```ts
{ name: 'factions',     path: '/factions' },
{ name: 'affiliations', path: '/affiliations' },
{ name: 'unit-types',   path: '/unit-types' },
{ name: 'ranks',        path: '/ranks' },
```

Outputs: `src/data/raw/factions.json`, `affiliations.json`, `unit-types.json`, `ranks.json`.

---

### 2. `scripts/processApiData.ts`

**Add `AFFILIATION_MAP`:** Load `raw/affiliations.json` and build
`Record<number, string>` keyed by API `id`, values are slugified `name` fields
(e.g., `7 → 'ewoks'`, `1 → 'pyke-syndicate'`, `2 → 'black-sun'`).

**Unit processing block** — add one field to the output object:

```ts
affiliation: AFFILIATION_MAP[u.affiliation_fkey] ?? null,
```

**Upgrade processing block** — replace:

```ts
restrictedToUnitApiId: up.unit_fkey ?? null,
```

with:

```ts
factionRestrictions:    compact([up.faction_fkey], FACTION_MAP),
rankRestrictions:       compact([up.rank_fkey, up.rank_fkey2], RANK_MAP),
unitTypeRestrictions:   unique(compact([up.unit_type_fkey, up.unit_type_fkey2, up.unit_type_fkey3], UNIT_TYPE_MAP)),
unitRestrictions:       [up.unit_fkey, up.unit_fkey2, up.unit_fkey3, up.unit_fkey4].filter(isNumber),
affiliationRestrictions: compact([up.affiliation_fkey], AFFILIATION_MAP),
alignmentRestriction:   up.alignment ?? null,
unitsDisallowedOn:      up.units_disallowed_on ?? [],
```

Where `compact(ids, map)` filters nulls then maps through the lookup table (dropping unmapped
IDs with a `console.warn`), and `isNumber` = `(x: unknown): x is number => typeof x === 'number'`.

---

### 3. `src/data/types.ts`

**`ProcessedUnit`** — add:

```ts
affiliation: string | null;
```

**`ResolvedUnit`** — add:

```ts
affiliation: string | null;
```

**`ProcessedUpgrade`** — remove `restrictedToUnitApiId`, add:

```ts
factionRestrictions: string[];
rankRestrictions: string[];
unitTypeRestrictions: string[];
unitRestrictions: number[];
affiliationRestrictions: string[];
alignmentRestriction: 'Light' | 'Dark' | null;
unitsDisallowedOn: number[];
```

**`ResolvedUpgrade`** — same removals and additions (fields pass through from processed).

---

### 4. Re-run data processing

```
npx tsx scripts/fetchApiData.ts
npx tsx scripts/processApiData.ts
```

Regenerates `processed/units.json` and `processed/upgrades.json` with the new schema.

---

### 5. `src/data/upgradeResolver.ts`

**Update `ProcessedUpgradeJson` normalizer type:** remove `restrictedToUnitApiId`, add the 7
new fields. `unitRestrictions` and `unitsDisallowedOn` arrive as `number[]` from JSON with no
normalization needed. `apiId` normalization stays as-is.

**Define local `UnitContext` interface** (not exported):

```ts
interface UnitContext {
  unitApiId?: number;
  faction?: string | null;
  rank?: string | null;
  unitType?: string | null;
  affiliation?: string | null;
}
```

**Define local `FACTION_ALIGNMENT` map** (see Filtering Logic section above).

**Update `resolveUpgrade`:** pass all 7 new restriction fields from `ProcessedUpgrade` straight
through to `ResolvedUpgrade` (no transformation).

**Update `getUpgradesForSlot` signature:**

```ts
// Before
export function getUpgradesForSlot(slot: UpgradeSlot, unitApiId?: number): ResolvedUpgrade[]

// After
export function getUpgradesForSlot(slot: UpgradeSlot, context?: UnitContext): ResolvedUpgrade[]
```

**Replace filter body** with 7-condition check (see Filtering Logic above).

---

### 6. `src/stores/attackConfigStore.ts`

Add UI-only state fields:

```ts
selectedUnitRank: UnitRank | null;
selectedUnitType: UnitType | null;
selectedUnitAffiliation: string | null;
```

Update `loadPreset` — add 5th parameter (object to avoid growing positional list):

```ts
loadPreset: (
  presetId: string,
  profile: AttackerPresetProfile,
  upgradeBar?: UpgradeSlot[],
  unitApiId?: number,
  unitMeta?: { rank: UnitRank; unitType: UnitType; affiliation: string | null }
) => void;
```

In `loadPreset` implementation, set from `unitMeta`:

```ts
selectedUnitRank: unitMeta?.rank ?? null,
selectedUnitType: unitMeta?.unitType ?? null,
selectedUnitAffiliation: unitMeta?.affiliation ?? null,
```

In `clearUnit`, reset all three to `null`.

In `reset()`, reset all three to `null`.

Exclude all three from `AttackConfigFields` (UI-only, same pattern as `unitApiId`).

---

### 7. `src/stores/defenseConfigStore.ts`

Mirror the same additions and `loadPreset` signature change from step 6, applied to the
defender store.

---

### 8. `src/data/presets.ts`

Add to `AttackerPreset` and `DefenderPreset`:

```ts
unitType: UnitType;
unitAffiliation: string | null;
```

(`rank` already exists on both preset types.)

---

### 9. `src/data/presetGenerator.ts`

In all preset-generating functions (`generateSingleMiniAttackerPreset`,
`generateMultiMiniAttackerPreset`, `generateSkeletonAttackerPreset`, and their defender
counterparts), add to the returned preset object:

```ts
unitType: unit.unitType,
unitAffiliation: unit.affiliation ?? null,
```

---

### 10. `src/components/AttackerPanel/AttackerPanel.tsx`

Update the `store.loadPreset` call to pass `unitMeta`:

```ts
store.loadPreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId, {
  rank: preset.rank,
  unitType: preset.unitType,
  affiliation: preset.unitAffiliation,
});
```

---

### 11. `src/components/DefenderPanel/DefenderPanel.tsx`

Same change as step 10.

---

### 12. `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

Update the `getUpgradesForSlot` call:

```ts
// Before
const upgrades = getUpgradesForSlot(slot as UpgradeSlot, store.unitApiId ?? undefined);

// After
const upgrades = getUpgradesForSlot(slot as UpgradeSlot, {
  unitApiId:   store.unitApiId ?? undefined,
  faction:     store.selectedFaction,
  rank:        store.selectedUnitRank,
  unitType:    store.selectedUnitType,
  affiliation: store.selectedUnitAffiliation,
});
```

---

### 13. `src/components/DefenderPanel/DefenderUnitBuilderView.tsx`

Same change as step 12, using `useDefenseConfigStore`.

---

### 14. `src/data/upgradeResolver.test.ts` _(new file)_

Co-located with `upgradeResolver.ts`. Uses a mock `getAllResolvedUpgrades` via `vi.mock`.

Test cases:

| Scenario | Expected |
|---|---|
| No context provided, upgrade has faction restriction | **pass** (restrict only when context known) |
| Empire unit, upgrade has `factionRestrictions: ['galactic-empire']` | **pass** |
| Rebel unit, upgrade has `factionRestrictions: ['galactic-empire']` | **fail** |
| Commander unit, upgrade has `rankRestrictions: ['corps']` | **fail** |
| Corps unit, upgrade has `rankRestrictions: ['corps', 'special-forces']` | **pass** |
| Trooper unit, upgrade has `unitTypeRestrictions: ['repulsor-vehicle', 'ground-vehicle']` | **fail** |
| Ground vehicle unit, same upgrade | **pass** |
| Unit 999, upgrade has `unitRestrictions: [999, 1000]` | **pass** |
| Unit 888, upgrade has `unitRestrictions: [999, 1000]` | **fail** |
| Unit 999, upgrade has `unitsDisallowedOn: [999]` | **fail** |
| Unit 888, upgrade has `unitsDisallowedOn: [999]` | **pass** |
| Empire unit, upgrade has `alignmentRestriction: 'Dark'` | **pass** |
| Rebel unit, upgrade has `alignmentRestriction: 'Dark'` | **fail** |
| Mercenary unit, upgrade has `alignmentRestriction: 'Light'` | **fail** |
| Republic unit, upgrade has `alignmentRestriction: 'Light'` | **pass** |
| Ewok-affiliated unit, upgrade has `affiliationRestrictions: ['ewoks']` | **pass** |
| Non-affiliated unit, upgrade has `affiliationRestrictions: ['ewoks']` | **fail** |
| All restriction arrays empty | **pass** for any context |

---

## Verification Checklist

- [ ] `npx tsx scripts/fetchApiData.ts` — all 8 endpoints fetch successfully
- [ ] `npx tsx scripts/processApiData.ts` — processed JSON regenerated, spot-check a known
      faction-restricted upgrade (e.g., "2-1B Medical Droid") has `factionRestrictions: ["rebel-alliance"]`
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — all tests pass including new resolver tests
- [ ] Manual: load a Galactic Empire Corps unit in unit builder → "2-1B Medical Droid" absent
      from Personnel slot; load a Rebel Corps unit → it appears
- [ ] Manual: load any non-force-user unit → Force Choke/Tranquility absent from Force slots

---

## Key Decisions

- **`unitMeta` object for `loadPreset`** rather than 3 more positional params — keeps the
  signature manageable; existing callers that pass no `unitMeta` get `null` for all three fields
  (safe — restrictions collapse to open when context is unknown).
- **Alignment derived from faction at filter time** — not stored as a field on `ProcessedUnit`
  to avoid duplication. The `FACTION_ALIGNMENT` map lives in `upgradeResolver.ts`.
- **`unitRestrictions` replaces `restrictedToUnitApiId`** — breaking schema change, but the only
  consumer was `getUpgradesForSlot`, which is updated in this phase.
- **`unit_type_fkey2/3` dedup** — after mapping through `UNIT_TYPE_MAP`, values are deduplicated
  (several subtypes like clone/droid/wookiee troopers all map to `'trooper'`).
- **No `UnitContext` export** — it's a purely internal type used only by `getUpgradesForSlot`.
