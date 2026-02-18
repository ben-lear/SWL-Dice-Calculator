# Phase 16.1 — Upgrade ID Collision Fix

## Problem

`processApiData.ts` generates upgrade IDs as `${upgradeSlot}-${slugify(name)}`. This intentionally collapses entries that represent the same physical upgrade card scoped to different units. However, the TTA API contains genuinely **different cards** that share the same name and upgrade slot but have different costs, keywords, or mechanical behavior. These produce ID collisions where `getResolvedUpgradeById()` (which uses `.find()`) silently returns only the first match, making the second variant unreachable.

## Collision Inventory

### True Collisions — different mechanics, require disambiguation

| # | Current ID | Entry A | Entry B | Difference |
|---|---|---|---|---|
| 1 | `armament-the-darksaber` | apiId 71, unit: Sabine Wren (33), cost 15, keywords: Dauntless / Immune:Pierce / Impact X / Pierce X | apiId 6132, unit: Moff Gideon (11258), cost 15, keywords: Demoralize / Immune:Pierce / Impact X / Pierce X | Different keywords (Dauntless vs Demoralize) |
| 2 | `armament-heavy-blaster-pistol` | apiId 20275, units: Imperial Agent (31667) + Imperial Officer (31668), cost 5, keywords: Sharpshooter / Target | apiId 20284, units: Rebel Officer (31669) + Rebel Agent (31670), cost 8, keywords: Arsenal X | Different cost AND keywords |
| 3 | `hardpoint-twin-blaster-cannons` | apiId 964, unit: Infantry Support Platform (2108), cost 25, keywords: Gunslinger / Critical X / Fixed | apiId 16578, unit: LM-432 Crab Droid (25966), cost 5, keywords: Fixed | Different cost AND keywords |
| 4 | `heavy-weapon-kraken` | apiId 20841, unit: IG-100 MagnaGuard (19077), cost 30, no keywords, no addsUpgradeSlot | apiId 20803, faction: Separatist, rank: corps, cost 30, addsUpgradeSlot: heavy-weapon | **TTA API bug**: these are likely the same card with fragmented data in the API, but since they have different unit restrictions and `addsUpgradeSlot`, keep them as separate disambiguated entries rather than merging. |

### Benign Duplicates — same stats, leave collapsed (no action)

| ID | Count | Notes |
|---|---|---|
| `armament-a-180` | 2 | Identical stats (apiIds 69, 59) |
| `armament-a280-rifle-config` | 2 | Identical stats (apiIds 142, 165) |
| `armament-a-300` | 2 | Identical stats (apiIds 73, 60) |
| `armament-e-11d` | 2 | Identical stats (apiIds 86, 85) |
| `armament-j-19-bo-rifle` | 2 | Identical stats (apiIds 186, 187) |
| `heavy-weapon-crosshair` | 2 | Identical stats (apiIds 15989, 15009) |
| `training-offensive-defensive-stance` | 2 | Identical stats (apiIds 183, 179) |
| `training-dug-in` | 4 | Same keywords, different unit restrictions |
| `training-imperial-march` | 2 | Same keywords, different restrictions |
| `gear-combat-armor` | 2 | Same keywords, different restrictions |

## Decisions

1. **Disambiguation convention**: `upgradeType-name-firstUnitName` using the first `unitRestrictions` entry's unit name, slugified. Example: `armament-the-darksaber-sabine-wren`.
2. **Both variants get suffixed**: When a collision is detected, ALL entries in the collision group get a unit-name suffix. There is no "default" that keeps the base ID.
3. **Kraken**: Although likely a TTA API bug (fragmented data for the same card), the two entries have different unit restrictions and `addsUpgradeSlot` values, so they are kept as separate disambiguated entries. The generic one (apiId 20803, no `unitRestrictions`, faction/rank restricted) gets a special suffix since it has no unit to derive a name from — use the faction as suffix: `heavy-weapon-kraken-separatist-corps`.
4. **Benign duplicates left collapsed**: Entries with identical cost, keywords, and `addsUpgradeSlot` remain under a shared ID.

## Expected New IDs

| Old ID | New ID | Source |
|---|---|---|
| `armament-the-darksaber` (Sabine) | `armament-the-darksaber-sabine-wren` | apiId 71 |
| `armament-the-darksaber` (Gideon) | `armament-the-darksaber-moff-gideon` | apiId 6132 |
| `armament-heavy-blaster-pistol` (Imperial) | `armament-heavy-blaster-pistol-imperial-agent` | apiId 20275 |
| `armament-heavy-blaster-pistol` (Rebel) | `armament-heavy-blaster-pistol-rebel-officer` | apiId 20284 |
| `hardpoint-twin-blaster-cannons` (ISP) | `hardpoint-twin-blaster-cannons-infantry-support-platform` | apiId 964 |
| `hardpoint-twin-blaster-cannons` (Crab) | `hardpoint-twin-blaster-cannons-lm-432-crab-droid` | apiId 16578 |
| `heavy-weapon-kraken` (MagnaGuard) | `heavy-weapon-kraken-ig-100-magnaguard` | apiId 20841 |
| `heavy-weapon-kraken` (Sep corps) | `heavy-weapon-kraken-separatist-corps` | apiId 20803 |

## Implementation Steps

### Step 1: Update `scripts/processApiData.ts`

**1a. Add collision detection + disambiguation (second pass)**

After the initial ID assignment pass (`id: ${upgradeSlot}-${slugify(up.name)}`), add a second pass:

1. Group all entries by `id`.
2. For groups with >1 entry, check if they are "benign" (identical `cost`, `keywordNames` set, and `addsUpgradeSlot`).
3. For true collisions (non-benign groups), load the processed units data to resolve `unitRestrictions[0]` → unit name.
4. Append `-${slugify(unitName)}` to each entry's ID in the collision group.
5. If an entry has no `unitRestrictions`, fall back to using faction + rank restrictions as suffix (e.g., `separatist-corps` for the generic Kraken entry). If neither is available, fall back to `apiId`.

**Files changed**: `scripts/processApiData.ts`

### Step 2: Re-run the processing pipeline

```bash
npx tsx scripts/processApiData.ts
```

This regenerates `src/data/processed/upgrades.json` with the new disambiguated IDs.

**Verify**: grep for the old colliding IDs and confirm only benign duplicates remain.

**Files changed**: `src/data/processed/upgrades.json` (regenerated)

### Step 3: Update `src/data/enrichment/upgrades.ts`

Split/rename existing enrichment entries for the 4 collision groups. The existing `armament-the-darksaber-moff-gideon` entry is already in the file (user had manually added it), but `armament-the-darksaber` still contains the Sabine version's data — rename its key to `armament-the-darksaber-sabine-wren`.

| Old key | Action | New key |
|---|---|---|
| `armament-the-darksaber` | Rename | `armament-the-darksaber-sabine-wren` |
| `armament-the-darksaber-moff-gideon` | Keep as-is | `armament-the-darksaber-moff-gideon` |
| `armament-heavy-blaster-pistol` | Split | `armament-heavy-blaster-pistol-imperial-agent` + `armament-heavy-blaster-pistol-rebel-officer` |
| `hardpoint-twin-blaster-cannons` | Rename | `hardpoint-twin-blaster-cannons-infantry-support-platform` |
| `hardpoint-twin-blaster-cannons-lm-432-crab-droid` | Keep as-is | `hardpoint-twin-blaster-cannons-lm-432-crab-droid` |
| `heavy-weapon-kraken` | Split | `heavy-weapon-kraken-ig-100-magnaguard` + `heavy-weapon-kraken-separatist-corps` |

For the new `armament-heavy-blaster-pistol-rebel-officer` entry, populate with correct enrichment data (Arsenal X keyword, appropriate weapon profile).

For the Kraken split, `heavy-weapon-kraken-ig-100-magnaguard` keeps the existing enrichment data (if any); `heavy-weapon-kraken-separatist-corps` gets a new entry with `addsUpgradeSlot` noted.

**Files changed**: `src/data/enrichment/upgrades.ts`

### Step 4: Update `scripts/generateEnrichmentSkeleton.ts` comment

The existing comment about merging same-ID entries is still correct for benign duplicates. Add a note that true collisions are now disambiguated upstream in `processApiData.ts`, so the merge logic only ever encounters benign duplicates.

**Files changed**: `scripts/generateEnrichmentSkeleton.ts` (comment only)

### Step 5: No downstream code changes needed

The following files use upgrade IDs as **opaque strings** and require no changes:

- `src/data/upgradeResolver.ts` — `getResolvedUpgradeById()`, `getAllResolvedUpgrades()`, `getUpgradesForSlot()`
- `src/data/upgradeApplicator.ts` — `applyAttackerUpgrades()`, `applyDefenderUpgrades()`
- `src/stores/attackConfigStore.ts`, `defenseConfigStore.ts`, `configSelectors.ts`
- `src/stores/upgradeBarHelpers.ts`, `defenseUpgradeApplicator.ts`, `defenseUpgradeHelpers.ts`  
- `src/components/shared/UpgradeSlotsSection.tsx`
- `src/hooks/useDisplayWeapons.ts`

The `getResolvedUpgradeById()` `.find()` bug is inherently fixed: colliding entries no longer share an ID.

### Step 6: Update tests

- Check `src/data/__tests__/upgradeResolver.test.ts` and `src/data/__tests__/upgradeApplicator.test.ts` for references to old colliding IDs. Update any that reference `armament-the-darksaber`, `armament-heavy-blaster-pistol`, `hardpoint-twin-blaster-cannons`, or `heavy-weapon-kraken` to use the new disambiguated IDs.
- Consider adding a test or script assertion that verifies no true collisions remain in the processed data (entries sharing an ID must have identical cost + keywords).

### Step 7: Quality gates

```bash
npm run typecheck   # must pass with 0 errors
npm run lint        # must pass with 0 errors
npm run test        # all tests pass
```

## Architecture Notes

- **No changes to resolver/store/UI architecture.** IDs are opaque strings throughout the system; disambiguation is purely a data-pipeline concern.
- **`generateEnrichmentSkeleton.ts` does not need logic changes.** Since collisions are resolved before the skeleton generator runs, its existing merge-by-ID strategy only encounters benign duplicates (which is correct behavior).
- **Future-proofing**: The collision detection in `processApiData.ts` is generic — if new API data introduces additional true collisions, they will be automatically disambiguated on next processing run. Entries with `unitRestrictions` use the first unit's name; entries without fall back to faction+rank or apiId.

## Risk Assessment

- **Low risk**: All changes are in the data pipeline (`scripts/`) and static enrichment data. No engine, store, or UI logic changes.
- **Edge case**: If a future collision has entries with NO `unitRestrictions` and no faction/rank restrictions, the disambiguation logic falls back to using `apiId` as suffix. The current Kraken case (no `unitRestrictions` but has faction+rank) is handled by the faction+rank fallback.
- **Enrichment data**: Manual enrichment entries must be carefully split/renamed to preserve weapons and keyword data that was hand-authored. The skeleton generator should NOT be blindly re-run over the enrichment file (it would overwrite hand-authored weapon profiles).
