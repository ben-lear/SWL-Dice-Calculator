# Phase 2.6: Defender Custom Pool & Unit Builder Modes — Implementation Plan

## Goal

Extend the two-mode design pattern (Custom Pool / Unit Builder) to the Defender Panel, mirroring the attacker-side implementation from Phase 2.5. Both modes operate on the same underlying `DefenderConfig` structure — Custom Pool provides a simple manual interface, while Unit Builder loads presets and auto-populates unit keywords, defense die, surge chart, and upgrade slots.

---

## Overview

Phase 2.6 consists of four sub-phases:

- **2.6A:** DefenderConfig Structure Review — verify current config supports both modes (already flat, no restructuring needed)
- **2.6B:** Defender Preset Generation — extend Phase 5.5 preset generator to include full defender keyword sets
- **2.6C:** Defender Store Enhancements — add `activeDefenderMode`, `selectedDefenderFaction`, `selectedDefenderPresetId`, `defenderUpgradeBar`, `equippedDefenderUpgradeIds`
- **2.6D:** Defender Panel UI — implement mode toggle, Custom Pool view (current UI), Unit Builder view (preset selection + upgrade slots)

Phase 2.6 depends on:
- **Phase 5.5** (complete) — preset data layer, unit resolver, upgrade system
- **Phase 2.5** (complete) — attacker two-mode design pattern
- **Phase 6B** (partial) — existing DefenderPanel component

Phase 2.6 impacts:
- **Phase 6B** — DefenderPanel gets mode toggle and two distinct sub-views
- **Phase 5A** — Defender store gains mode and preset tracking fields
- **Phase 7** — Results panel unchanged (still consumes merged config)

Phase 2.6 does **not** require:
- Engine changes — DefenderConfig is already flat, no type restructuring needed
- Simulation changes — simulator already handles defense config as-is
- New test helpers — defender config uses existing `createMinimalDefender` helper

---

## Design Decisions

1. **Flat Config Structure** — Unlike the attacker side which required `weapons[]` array restructuring in Phase 2.5, the DefenderConfig is already flat (no "defense weapon" concept exists in Legion). Custom Pool and Unit Builder both write to the same flat fields. No engine changes are required.

2. **Mode Parity** — The Defender Panel mirrors the Attacker Panel's two-mode design:
   - **Custom Pool** — User manually sets all fields (die color, surge chart, keywords, tokens). This is the existing DefenderPanel interface with a "Custom Pool" label and mode toggle added.
   - **Unit Builder** — User selects faction → unit preset → upgrades. Preset auto-populates defense die, surge chart, unit keywords (Armor, Danger Sense, Deflect, etc.). User can still adjust tokens and situational keywords (Cover, Suppressed, Dodge tokens).

3. **Preset Enrichment** — Defender presets require enriched unit data to include:
   - Defense die color (White/Red)
   - Defense surge chart (None / e→d)
   - Unit keywords with values: Armor X, Danger Sense X, Uncanny Luck X, Deflect, Soresu Mastery, Djem So Mastery, Block, etc.
   - Upgrade bar (already part of Phase 5.5 unit resolver)

4. **Upgrade Slots** — Defender upgrades work identically to attacker upgrades:
   - Equipping an upgrade adds its cost and any defender-relevant keywords (e.g., Gear upgrade granting Armor or a defensive keyword)
   - **Dug In** special case: when equipped, cover dice roll red defense dice instead of white (flagged in upgrade enrichment data)

5. **Situational Keywords Remain Editable** — Even in Unit Builder mode, the user can adjust:
   - Cover type (None/Light/Heavy)
   - Cover X, Smoke tokens, Suppressed (situational terrain/token state)
   - Dodge tokens, Surge tokens (current token count)
   - Suppression tokens (for Danger Sense)
   - Shielded X active count (if unit has shields, how many are active this attack)
   - Guardian configuration (nearby unit providing Guardian X)

6. **Store Mapping** — Defender store gains fields analogous to attacker store:
   - `activeDefenderMode: 'custom' | 'unit-builder'`
   - `selectedDefenderFaction: Faction | null`
   - `selectedDefenderPresetId: string | null`
   - `defenderUpgradeBar: UpgradeSlot[] | null` (auto-populated from preset)
   - `equippedDefenderUpgradeIds: (string | null)[]` (indexes match upgrade bar)
   - `disableDefenseDice: boolean` (Custom Pool only — when true, forces defense die count to 0)

7. **No Engine Changes** — The engine's `DefenderConfig` type is unchanged. The `getFullDefenderConfig()` selector applies equipped upgrade effects (just like attacker side) but the base config shape is already flat and compatible with both modes. When `disableDefenseDice` is true, the engine receives a config that effectively skips defense roll (0 dice rolled, showing only attack results).

---

## Defender Keyword Classification

### Unit Keywords (flat on DefenderConfig)

All defender keywords remain as flat fields on `DefenderConfig`. No restructuring is needed.

| Keyword | Engine Field | Type | Preset Source | User Adjustable |
|---------|-------------|------|---------------|-----------------|
| Disable defense dice | `disableDefenseDice` | `boolean` | — | Custom Pool only |
| Defense die color | `defenseColor` | `DefenseDieColor` | Preset | Custom Pool only |
| Defense surge chart | `defenseSurgeChart` | `DefenseSurgeChart` | Preset | Custom Pool only |
| Minis in LOS | `minisInLOS` | `number` | Preset | Always |
| Cover type | `cover` | `CoverType` | — | Always (situational) |
| Cover X | `coverX` | `number` | Preset | Always (situational) |
| Smoke tokens | `smokeTokens` | `number` | — | Always (situational) |
| Suppressed | `suppressed` | `boolean` | — | Always (situational) |
| Dodge tokens | `dodgeTokens` | `number` | — | Always (token count) |
| Surge tokens | `surgeTokensDefense` | `number` | — | Always (token count) |
| Armor X | `armorX` | `number` | Preset | Editable |
| Weak Point X | `weakPointX` | `number` | Preset | Editable (situational arc) |
| Immune: Pierce | `immunePierce` | `boolean` | Preset | Editable |
| Immune: Melee Pierce | `immuneMeleePierce` | `boolean` | Preset | Editable |
| Immune: Blast | `immuneBlast` | `boolean` | Preset | Editable |
| Impervious | `impervious` | `boolean` | Preset | Editable |
| Danger Sense X | `dangerSenseX` | `number` | Preset | Editable |
| Suppression tokens | `suppressionTokens` | `number` | — | Always (token count) |
| Uncanny Luck X | `uncannyLuckX` | `number` | Preset | Editable |
| Block | `block` | `boolean` | Preset | Editable |
| Deflect | `deflect` | `boolean` | Preset | Editable |
| Shien Mastery | `shienMastery` | `boolean` | Preset | Editable |
| Outmaneuver | `outmaneuver` | `boolean` | Preset | Editable |
| Low Profile | `lowProfile` | `boolean` | Preset | Editable |
| Shielded X | `shieldedX` | `number` | Preset (unit max) | Active count editable |
| Soresu Mastery | `soresuMastery` | `boolean` | Preset | Editable |
| Djem So Mastery | `djemSoMastery` | `boolean` | Preset | Editable |
| Duelist (defender) | `duelistDefender` | `boolean` | Preset | Editable |
| Backup | `backup` | `boolean` | Preset | Editable |
| Hold the Line | `holdTheLine` | `boolean` | Preset | Editable |
| Guardian X | `guardianX` | `number` | Preset (nearby unit) | Editable (situational) |
| Guardian die color | `guardianDefenseColor` | `DefenseDieColor` | — | Editable (situational) |
| Guardian surge | `guardianDefenseSurge` | `DefenseSurgeChart` | — | Editable (situational) |
| Guardian Deflect | `guardianDeflect` | `boolean` | — | Editable (situational) |
| Guardian Soresu | `guardianSoresuMastery` | `boolean` | — | Editable (situational) |
| Guardian Dodge tokens | `guardianDodgeTokens` | `number` | — | Editable (situational) |
| Unit cost | `defenderUnitCost` | `number` | Preset (base + upgrades) | Read-only in Unit Builder |

**Preset Source** = Auto-populated when loading a unit preset in Unit Builder mode.
**User Adjustable** = Can be changed by the user even in Unit Builder mode.

---

## Step 2.6A — DefenderConfig Structure Review

**File:** `src/engine/types.ts`

### 2.6A.1 — Verify Existing Structure

Review `DefenderConfig` to confirm all fields are flat (no nested weapon arrays or sub-objects). Add one new optional field: `disableDefenseDice?: boolean` to support Custom Pool mode's "disable defense dice" feature.

**Expected structure:**
```ts
export interface DefenderConfig {
  // Defense dice
  defenseColor: DefenseDieColor;
  defenseSurgeChart: DefenseSurgeChart;
  disableDefenseDice?: boolean; // NEW: when true, Step 7 returns 0 defense dice
  
  // Context
  minisInLOS: number;
  
  // Cover
  cover: CoverType;
  coverX: number;
  smokeTokens: number;
  suppressed: boolean;
  
  // Tokens
  dodgeTokens: number;
  surgeTokensDefense: number;
  suppressionTokens: number; // for Danger Sense
  
  // Unit keywords
  armorX: number;
  weakPointX: number;
  immunePierce: boolean;
  immuneMeleePierce: boolean;
  immuneBlast: boolean;
  impervious: boolean;
  dangerSenseX: number;
  uncannyLuckX: number;
  block: boolean;
  deflect: boolean;
  shienMastery: boolean;
  outmaneuver: boolean;
  lowProfile: boolean;
  shieldedX: number;
  soresuMastery: boolean;
  djemSoMastery: boolean;
  duelistDefender: boolean;
  backup: boolean;
  holdTheLine: boolean;
  
  // Guardian (situational)
  guardianX: number;
  guardianDefenseColor: DefenseDieColor;
  guardianDefenseSurge: DefenseSurgeChart;
  guardianDeflect: boolean;
  guardianSoresuMastery: boolean;
  guardianDodgeTokens: number;
  
  // Points
  defenderUnitCost: number;
}
```
One new optional field added: `disableDefenseDice?: boolean` for Custom Pool mode's "disable defense" feature
✅ Structure is already compatible with both modes. No changes needed.

---

## Step 2.6B — Defender Preset Generation

**Files:** `src/data/enrichment/units.ts`, `src/data/presetGenerator.ts`

### 2.6B.1 — Expand Unit Enrichment Schema

Update `UnitEnrichment` type to include defender-relevant fields:

```ts
export interface UnitEnrichment {
  // ... existing attacker fields ...
  
  // Defender fields
  defenseColor?: DefenseDieColor;
  defenseSurgeChart?: DefenseSurgeChart;
  defenderKeywords?: {
    armorX?: number;
    dangerSenseX?: number;
    uncannyLuckX?: number;
    deflect?: boolean;
    shienMastery?: boolean;
    soresuMastery?: boolean;
    djemSoMastery?: boolean;
    block?: boolean;
    outmaneuver?: boolean;
    lowProfile?: boolean;
    shieldedX?: number;
    impervious?: boolean;
    immunePierce?: boolean;
    immuneMeleePierce?: boolean;
    immuneBlast?: boolean;
    duelistDefender?: boolean;
    backup?: boolean;
    holdTheLine?: boolean;
    coverX?: number;
    weakPointX?: number;
  };
}
```

### 2.6B.2 — Enrich Defender Data

Add defender data to curated units in `src/data/enrichment/units.ts`. Example:

```ts
{
  id: 'bf',
  name: 'Darth Vader',
  enrichment: {
    // ... attacker fields ...
    
    // Defender fields
    defenseColor: DefenseDieColor.Red,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenderKeywords: {
      immunePierce: true,
      deflect: true,
    },
  },
},
{
  id: 'bc',
  name: 'Stormtroopers',
  enrichment: {
    // ... attacker fields ...
    
    defenseColor: DefenseDieColor.Red,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenderKeywords: {},
  },
},
{
  id: 'ba',
  name: 'Rebel Troopers',
  enrichment: {
    // ... attacker fields ...
    
    defenseColor: DefenseDieColor.White,
    defenseSurgeChart: DefenseSurgeChart.SurgeToBlock,
    defenderKeywords: {},
  },
},
// ... more units ...
```

### 2.6B.3 — Update Preset Generator

Extend `presetGenerator.ts` to produce `DefenderPreset` objects:

```ts
export interface DefenderPreset {
  id: string;
  name: string;
  faction: Faction;
  defenseColor: DefenseDieColor;
  defenseSurgeChart: DefenseSurgeChart;
  upgradeBar: UpgradeSlot[];
  minisInLOS: number; // default from unit data
  keywords: {
    armorX?: number;
    dangerSenseX?: number;
    uncannyLuckX?: number;
    deflect?: boolean;
    shienMastery?: boolean;
    soresuMastery?: boolean;
    djemSoMastery?: boolean;
    block?: boolean;
    outmaneuver?: boolean;
    lowProfile?: boolean;
    shieldedX?: number;
    impervious?: boolean;
    immunePierce?: boolean;
    immuneMeleePierce?: boolean;
    immuneBlast?: boolean;
    duelistDefender?: boolean;
    backup?: boolean;
    holdTheLine?: boolean;
    coverX?: number;
    weakPointX?: number;
  };
  unitCost: number; // base cost
}

export function generateDefenderPresets(resolvedUnits: ResolvedUnit[]): DefenderPreset[] {
  return resolvedUnits
    .filter(unit => unit.enrichment?.defenseColor != null) // only enriched units
    .map(unit => ({
      id: unit.id,
      name: unit.name,
      faction: unit.faction,
      defenseColor: unit.enrichment!.defenseColor!,
      defenseSurgeChart: unit.enrichment!.defenseSurgeChart ?? DefenseSurgeChart.None,
      upgradeBar: unit.upgradeBar,
      minisInLOS: unit.unitSize ?? 1, // default to 1 if not specified
      keywords: unit.enrichment!.defenderKeywords ?? {},
      unitCost: unit.pointsCost,
    }));
}
```

### 2.6B.4 — Update Preset Helpers

Add helper functions to `src/data/presetHelpers.ts`:

```ts
export function getDefenderPresets(faction?: Faction): DefenderPreset[] {
  const allPresets = generateDefenderPresets(resolveUnits());
  if (!faction) return allPresets;
  return allPresets.filter(p => p.faction === faction);
}

export function getDefenderPresetById(id: string): DefenderPreset | undefined {
  return getDefenderPresets().find(p => p.id === id);
}
```

### 2.6B.5 — Tests

Add tests to `src/data/presetGenerator.test.ts`:

```ts
describe('generateDefenderPresets', () => {
  it('generates defender presets for enriched units', () => {
    const presets = generateDefenderPresets(mockResolvedUnits);
    expect(presets.length).toBeGreaterThan(0);
    expect(presets[0]).toHaveProperty('defenseColor');
    expect(presets[0]).toHaveProperty('defenseSurgeChart');
    expect(presets[0]).toHaveProperty('keywords');
  });
  
  it('filters out units without defender enrichment data', () => {
    const presets = generateDefenderPresets(mockResolvedUnits);
    expect(presets.every(p => p.defenseColor != null)).toBe(true);
  });
  
  it('includes upgrade bar from unit data', () => {
    const presets = generateDefenderPresets(mockResolvedUnits);
    expect(presets[0].upgradeBar).toBeInstanceOf(Array);
  });
});

describe('getDefenderPresets', () => {
  it('returns all defender presets when no faction specified', () => {
    const presets = getDefenderPresets();
    expect(presets.length).toBeGreaterThan(0);
  });
  
  it('filters presets by faction', () => {
    const presets = getDefenderPresets(Faction.GalacticEmpire);
    expect(presets.every(p => p.faction === Faction.GalacticEmpire)).toBe(true);
  });
});
```

---

## Step 2.6C — Defender Store Enhancements

**File:** `src/hooks/useDefenseConfig.ts` (or wherever defender store is defined)

### 2.6C.1 — Add Mode and Preset Fields

Extend the defender store with mode tracking and preset fields:

```ts
interface DefenderStore {
  // ... existing flat config fields ...
  
  // Mode tracking
  activeDefenderMode: 'custom' | 'unit-builder';
  selectedDefenderFaction: Faction | null;
  selectedDefenderPresetId: string | null;
  defenderUpgradeBar: UpgradeSlot[] | null;
  equippedDefenderUpgradeIds: (string | null)[];
  
  // Actions
  setDefenderMode: (mode: 'custom' | 'unit-builder') => void;
  setDefenderFaction: (faction: Faction | null) => void;
  loadDefenderPreset: (id: string, preset: DefenderPreset) => void;
  equipDefenderUpgrade: (slotIndex: number, upgradeId: string | null) => void;
  resetDefenderConfig: () => void;
}
```

### 2.6C.2 — Implement Actions

```ts
export const useDefenseConfig = create<DefenderStore>((set) => ({
  // ... existing fields with defaults ...
  
  activeDefenderMode: 'custom',
  selectedDefenderFaction: null,
  selectedDefenderPresetId: null,
  defenderUpgradeBar: null,
  equippedDefenderUpgradeIds: [],
  disableDefenseDice: false,
  
  setDefenderMode: (mode) => set({ activeDefenderMode: mode }),
  
  setDefenderFaction: (faction) => set({ selectedDefenderFaction: faction }),
  
  loadDefenderPreset: (id, preset) => {
    set({
      selectedDefenderPresetId: id,
      defenseColor: preset.defenseColor,
      defenseSurgeChart: preset.defenseSurgeChart,
      minisInLOS: preset.minisInLOS,
      defenderUpgradeBar: preset.upgradeBar,
      equippedDefenderUpgradeIds: preset.upgradeBar.map(() => null),
      defenderUnitCost: preset.unitCost,
      
      // Populate keywords
      armorX: preset.keywords.armorX ?? 0,
      dangerSenseX: preset.keywords.dangerSenseX ?? 0,
      uncannyLuckX: preset.keywords.uncannyLuckX ?? 0,
      deflect: preset.keywords.deflect ?? false,
      shienMastery: preset.keywords.shienMastery ?? false,
      soresuMastery: preset.keywords.soresuMastery ?? false,
      djemSoMastery: preset.keywords.djemSoMastery ?? false,
      block: preset.keywords.block ?? false,
      outmaneuver: preset.keywords.outmaneuver ?? false,
      lowProfile: preset.keywords.lowProfile ?? false,
      shieldedX: preset.keywords.shieldedX ?? 0,
      impervious: preset.keywords.impervious ?? false,
      immunePierce: preset.keywords.immunePierce ?? false,
      immuneMeleePierce: preset.keywords.immuneMeleePierce ?? false,
      immuneBlast: preset.keywords.immuneBlast ?? false,
      duelistDefender: preset.keywords.duelistDefender ?? false,
      backup: preset.keywords.backup ?? false,
      holdTheLine: preset.keywords.holdTheLine ?? false,
      coverX: preset.keywords.coverX ?? 0,
      weakPointX: preset.keywords.weakPointX ?? 0,
      
      // Reset situational fields (user must set these per-attack)
      cover: CoverType.None,
      dodgeTokens: 0,
      surgeTokensDefense: 0,
      suppressionTokens: 0,
      suppressed: false,
      smokeTokens: 0,
      guardianX: 0,
    });
  },
  
  equipDefenderUpgrade: (slotIndex, upgradeId) => {
    set((state) => {
      const newIds = [...state.equippedDefenderUpgradeIds];
      newIds[slotIndex] = upgradeId;
      return { equippedDefenderUpgradeIds: newIds };
    });
  },
  
  resetDefenderConfig: () => {
    set({
      // Reset to defaults
      activeDefenderMode: 'custom',
      selectedDefenderFaction: null,
      selectedDefenderPresetId: null,
      defenderUpgradeBar: null,
      equippedDefenderUpgradeIds: [],
      // ... all config fields back to defaults ...
    });
  },
}));
```

### 2.6C.3 — Update getFullDefenderConfig Selector

Extend the `getFullDefenderConfig()` selector to apply equipped defender upgrades and handle the `disableDefenseDice` flag:

```ts
export function getFullDefenderConfig(): DefenderConfig {
  const state = useDefenseConfig.getState();
  let config: DefenderConfig = {
    defenseColor: state.defenseColor,
    defenseSurgeChart: state.defenseSurgeChart,
    // ... all flat fields ...
    defenderUnitCost: state.defenderUnitCost,
  };
  
  // If defense is disabled (Custom Pool mode), we can handle this in two ways:
  // Option 1: Set a flag on the config that the engine checks
  // Option 2: Force defenseColor to a special "None" value that makes engine skip defense roll
  // Recommended: Add a `disableDefenseDice` field to DefenderConfig
  if (state.disableDefenseDice) {
    config.disableDefenseDice = true;
  }
  
  // Apply equipped upgrades
  if (state.defenderUpgradeBar && state.equippedDefenderUpgradeIds.length > 0) {
    config = applyDefenderUpgrades(config, state.equippedDefenderUpgradeIds);
  }
  
  return config;
}
```

**Engine handling:** Add `disableDefenseDice?: boolean` to `DefenderConfig` type. When true, Step 7 (Roll Defense Dice) returns 0 defense dice immediately, showing only the attack results.

### 2.6C.4 — Upgrade Applicator

Add a `applyDefenderUpgrades` function (similar to attacker side) in `src/data/upgradeApplicator.ts`:

```ts
export function applyDefenderUpgrades(
  baseConfig: DefenderConfig,
  equippedUpgradeIds: (string | null)[]
): DefenderConfig {
  let config = { ...baseConfig };
  let additionalCost = 0;
  
  for (const upgradeId of equippedUpgradeIds) {
    if (!upgradeId) continue;
    const upgrade = getResolvedUpgradeById(upgradeId);
    if (!upgrade) continue;
    
    additionalCost += upgrade.pointsCost;
    
    // Apply defender keyword effects from upgrade enrichment
    if (upgrade.enrichment?.defenderKeywords) {
      const kw = upgrade.enrichment.defenderKeywords;
      if (kw.armorX) config.armorX += kw.armorX;
      if (kw.dangerSenseX) config.dangerSenseX += kw.dangerSenseX;
      if (kw.uncannyLuckX) config.uncannyLuckX += kw.uncannyLuckX;
      if (kw.deflect) config.deflect = true;
      if (kw.shienMastery) config.shienMastery = true;
      if (kw.soresuMastery) config.soresuMastery = true;
      if (kw.djemSoMastery) config.djemSoMastery = true;
      if (kw.block) config.block = true;
      if (kw.outmaneuver) config.outmaneuver = true;
      if (kw.lowProfile) config.lowProfile = true;
      if (kw.shieldedX) config.shieldedX += kw.shieldedX;
      if (kw.impervious) config.impervious = true;
      if (kw.immunePierce) config.immunePierce = true;
      if (kw.immuneMeleePierce) config.immuneMeleePierce = true;
      if (kw.immuneBlast) config.immuneBlast = true;
      if (kw.duelistDefender) config.duelistDefender = true;
      if (kw.backup) config.backup = true;
      if (kw.holdTheLine) config.holdTheLine = true;
      if (kw.coverX) config.coverX += kw.coverX;
      if (kw.weakPointX) config.weakPointX += kw.weakPointX;
    }
    
    // Special case: Dug In upgrade
    if (upgrade.enrichment?.dugIn) {
      // Flag that cover dice should roll red instead of white
      // (Implementation note: this requires a separate flag on DefenderConfig
      // or special handling in the cover resolver. Add `dugIn: boolean` to DefenderConfig.)
      config.dugIn = true;
    }
  }
  
  config.defenderUnitCost += additionalCost;
  return config;
}
```

**Note:** If Dug In is to be supported, add `dugIn?: boolean` to `DefenderConfig` in `src/engine/types.ts` and update the cover resolver to check this flag when rolling cover dice.

### 2.6C.5 — Tests

Add tests to `src/hooks/useDefenseConfig.test.ts`:

```ts
describe('defender mode actions', () => {
  beforeEach(() => {
    useDefenseConfig.getState().resetDefenderConfig();
  });
  
  it('sets defender mode', () => {
    const { setDefenderMode } = useDefenseConfig.getState();
    setDefenderMode('unit-builder');
    expect(useDefenseConfig.getState().activeDefenderMode).toBe('unit-builder');
  });
  
  it('loads defender preset', () => {
    const mockPreset: DefenderPreset = {
      id: 'ba',
      name: 'Rebel Troopers',
      faction: Faction.RebelAlliance,
      defenseColor: DefenseDieColor.White,
      defenseSurgeChart: DefenseSurgeChart.SurgeToBlock,
      upgradeBar: [UpgradeSlot.HeavyWeapon, UpgradeSlot.Personnel],
      minisInLOS: 5,
      keywords: {},
      unitCost: 40,
    };
    
    const { loadDefenderPreset } = useDefenseConfig.getState();
    loadDefenderPreset('ba', mockPreset);
    
    const state = useDefenseConfig.getState();
    expect(state.selectedDefenderPresetId).toBe('ba');
    expect(state.defenseColor).toBe(DefenseDieColor.White);
    expect(state.defenseSurgeChart).toBe(DefenseSurgeChart.SurgeToBlock);
    expect(state.minisInLOS).toBe(5);
    expect(state.defenderUpgradeBar).toEqual(mockPreset.upgradeBar);
    expect(state.defenderUnitCost).toBe(40);
  });
  
  it('equips defender upgrade', () => {
    const mockPreset: DefenderPreset = { /* ... */ };
    const { loadDefenderPreset, equipDefenderUpgrade } = useDefenseConfig.getState();
    loadDefenderPreset('ba', mockPreset);
    
    equipDefenderUpgrade(0, 'up123');
    expect(useDefenseConfig.getState().equippedDefenderUpgradeIds[0]).toBe('up123');
  });
});

describe('getFullDefenderConfig', () => {
  it('applies equipped defender upgrades', () => {
    const mockPreset: DefenderPreset = { /* ... */ };
    const { loadDefenderPreset, equipDefenderUpgrade } = useDefenseConfig.getState();
    loadDefenderPreset('ba', mockPreset);
    equipDefenderUpgrade(0, 'up-armor-1'); // mock upgrade that grants Armor 1
    
    const config = getFullDefenderConfig();
    expect(config.armorX).toBe(1); // base 0 + upgrade 1
    expect(config.defenderUnitCost).toBeGreaterThan(mockPreset.unitCost); // base + upgrade cost
  });
});
```

---

## Step 2.6D — Defender Panel UI

**Files:** `src/components/DefenderPanel/DefenderPanel.tsx`, new files for sub-views

### 2.6D.1 — Add Mode Toggle

At the top of DefenderPanel, add a segmented control (same pattern as AttackerPanel):

```tsx
<div className="flex gap-2 mb-4">
  <button
    className={activeDefenderMode === 'custom' ? 'active' : ''}
    onClick={() => setDefenderMode('custom')}
  >
    Custom Pool
  </button>
  <button
    className={activeDefenderMode === 'unit-builder' ? 'active' : ''}
    onClick={() => setDefenderMode('unit-builder')}
  >
    Unit Builder
  </button>
</div>
```

### 2.6D.2 — Custom Pool View

The Custom Pool view is the existing DefenderPanel interface with one addition: a **"Disable defense dice"** toggle at the top of the Defense section. When enabled, the defender rolls 0 defense dice, allowing the user to see the full attack results before any defense is applied (useful for understanding "how many dice is the defender rolling?").

```tsx
{activeDefenderMode === 'custom' && (
  <DefenderCustomPoolView />
)}
```

**DefenderCustomPoolView** includes:
- **Disable defense dice toggle** (Custom Pool only) — when checked, defense die count is forced to 0
- All existing spinners, toggles, and selects for defense configuration

### 2.6D.3 — Unit Builder View

Create a new component `DefenderUnitBuilderView.tsx`:

```tsx
export function DefenderUnitBuilderView() {
  const {
    selectedDefenderFaction,
    selectedDefenderPresetId,
    defenderUpgradeBar,
    equippedDefenderUpgradeIds,
    setDefenderFaction,
    loadDefenderPreset,
    equipDefenderUpgrade,
    // ... other fields for situational inputs ...
  } = useDefenseConfig();
  
  const factionPresets = getDefenderPresets(selectedDefenderFaction ?? undefined);
  const availableUpgrades = defenderUpgradeBar
    ? defenderUpgradeBar.map((slot, i) => getUpgradesBySlot(slot))
    : [];
  
  return (
    <div>
      {/* Faction Dropdown */}
      <SectionHeader>Unit Selection</SectionHeader>
      <Select
        label="Faction"
        value={selectedDefenderFaction ?? 'all'}
        options={[
          { value: 'all', label: 'All' },
          { value: Faction.GalacticEmpire, label: 'Galactic Empire' },
          { value: Faction.RebelAlliance, label: 'Rebel Alliance' },
          // ... other factions ...
        ]}
        onChange={(faction) => setDefenderFaction(faction === 'all' ? null : faction)}
      />
      
      {/* Unit Combobox */}
      <SearchableCombobox
        label="Unit"
        options={factionPresets.map(p => ({ value: p.id, label: p.name }))}
        value={selectedDefenderPresetId ?? ''}
        onChange={(id) => {
          const preset = getDefenderPresetById(id);
          if (preset) loadDefenderPreset(id, preset);
        }}
      />
      
      {/* Upgrade Slots */}
      {defenderUpgradeBar && defenderUpgradeBar.length > 0 && (
        <>
          <SectionHeader>Upgrades</SectionHeader>
          {defenderUpgradeBar.map((slot, index) => (
            <SearchableCombobox
              key={index}
              label={slot}
              options={[
                { value: '', label: 'None' },
                ...availableUpgrades[index].map(u => ({ value: u.id, label: u.name })),
              ]}
              value={equippedDefenderUpgradeIds[index] ?? ''}
              onChange={(upgradeId) => equipDefenderUpgrade(index, upgradeId || null)}
            />
          ))}
          <div className="text-sm text-gray-400">
            Base: {selectedPreset?.unitCost ?? 0} pts  Upgrades: +{upgradesCost} pts
          </div>
          <div className="font-semibold">
            Total: {totalCost} pts
          </div>
        </>
      )}
      
      {/* Unit Keywords (read-only display or editable spinners) */}
      <SectionHeader>Unit Keywords</SectionHeader>
      <div className="text-sm text-gray-400">Auto-populated from preset. Adjust as needed.</div>
      {/* Show keywords with values, e.g., Armor X, Danger Sense X, etc. */}
      {/* User can still adjust these if needed (e.g., unit loses Armor due to wounds) */}
      
      {/* Situational Inputs (always editable) */}
      <SectionHeader>Cover</SectionHeader>
      <Select label="Cover type" value={cover} onChange={setCover} options={...} />
      <NumberSpinner label="Cover X" value={coverX} onChange={setCoverX} min={0} max={2} />
      <NumberSpinner label="Smoke tokens" value={smokeTokens} onChange={setSmokeTokens} min={0} max={3} />
      <Toggle label="Suppressed" checked={suppressed} onChange={setSuppressed} />
      
      <SectionHeader>Tokens</SectionHeader>
      <NumberSpinner label="Dodge tokens" value={dodgeTokens} onChange={setDodgeTokens} min={0} max={5} />
      <NumberSpinner label="Surge tokens" value={surgeTokensDefense} onChange={setSurgeTokensDefense} min={0} max={5} />
      <NumberSpinner label="Suppression tokens" value={suppressionTokens} onChange={setSuppressionTokens} min={0} max={10} />
      
      {/* Guardian section (situational, user must configure nearby Guardian unit) */}
      <SectionHeader>Guardian</SectionHeader>
      <NumberSpinner label="Guardian X" value={guardianX} onChange={setGuardianX} min={0} max={3} />
      {guardianX > 0 && (
        <>
          <Select label="Guardian die color" value={guardianDefenseColor} onChange={setGuardianDefenseColor} options={...} />
          <Select label="Guardian surge" value={guardianDefenseSurge} onChange={setGuardianDefenseSurge} options={...} />
          <Toggle label="Guardian Deflect" checked={guardianDeflect} onChange={setGuardianDeflect} />
          <Toggle label="Guardian Soresu" checked={guardianSoresuMastery} onChange={setGuardianSoresuMastery} />
          <NumberSpinner label="Guardian Dodge tokens" value={guardianDodgeTokens} onChange={setGuardianDodgeTokens} min={0} max={5} />
        </>
      )}
    </div>
  );
}
```

### 2.6D.4 — Conditional Rendering in DefenderPanel

Update `DefenderPanel.tsx` to conditionally render the two views:

```tsx
export function DefenderPanel() {
  const { activeDefenderMode } = useDefenseConfig();
  
  return (
    <div className="defender-panel">
      <h2>Defender</h2>
      
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          className={activeDefenderMode === 'custom' ? 'active' : ''}
          onClick={() => useDefenseConfig.getState().setDefenderMode('custom')}
        >
          Custom Pool
        </button>
        <button
          className={activeDefenderMode === 'unit-builder' ? 'active' : ''}
          onClick={() => useDefenseConfig.getState().setDefenderMode('unit-builder')}
        >
          Unit Builder
        </button>
      </div>
      
      {/* Conditional View */}
      {activeDefenderMode === 'custom' && <DefenderCustomPoolView />}
      {activeDefenderMode === 'unit-builder' && <DefenderUnitBuilderView />}
    </div>
  );
}
```

### 2.6D.5 — Component Tests

Add tests to `src/components/DefenderPanel/DefenderPanel.test.tsx`:

```tsx
describe('DefenderPanel', () => {
  it('renders mode toggle', () => {
    render(<DefenderPanel />);
    expect(screen.getByText('Custom Pool')).toBeInTheDocument();
    expect(screen.getByText('Unit Builder')).toBeInTheDocument();
  });
  
  it('switches to unit builder mode on button click', () => {
    render(<DefenderPanel />);
    const unitBuilderButton = screen.getByText('Unit Builder');
    fireEvent.click(unitBuilderButton);
    expect(useDefenseConfig.getState().activeDefenderMode).toBe('unit-builder');
  });
  
  it('renders custom pool view by default', () => {
    render(<DefenderPanel />);
    // Check for custom pool-specific elements (e.g., manual die color select)
    expect(screen.getByLabelText('Defense die')).toBeInTheDocument();
  });
  
  it('renders unit builder view when mode is unit-builder', () => {
    useDefenseConfig.getState().setDefenderMode('unit-builder');
    render(<DefenderPanel />);
    // Check for unit builder-specific elements (e.g., faction dropdown)
    expect(screen.getByLabelText('Faction')).toBeInTheDocument();
  });
});
```

---

## Phase 2.6 Validation Checklist

- [ ] DefenderConfig structure verified (no changes needed)
- [ ] Unit enrichment schema extended with defender fields
- [ ] Defender keyword data added to enrichment files for curated units
- [ ] `generateDefenderPresets` function implemented and tested
- [ ] Defender preset helpers (`getDefenderPresets`, `getDefenderPresetById`) implemented and tested
- [ ] Defender store extended with mode, faction, preset, upgrade tracking fields
- [ ] `loadDefenderPreset` action populates all config fields from preset
- [ ] `equipDefenderUpgrade` action tracks equipped upgrades
- [ ] `getFullDefenderConfig` selector applies equipped upgrade effects
- [ ] `applyDefenderUpgrades` function adds costs and keywords from upgrades
- [ ] DefenderPanel mode toggle implemented
- [ ] DefenderCustomPoolView extracted (or rendered inline) with "Disable defense dice" toggle
- [ ] When "Disable defense dice" is enabled, getFullDefenderConfig returns config that forces 0 defense dice
- [ ] DefenderUnitBuilderView component created with faction/unit/upgrade dropdowns
- [ ] Situational inputs (Cover, Dodge tokens, Guardian) remain editable in both modes
- [ ] Component tests pass for mode toggle and view switching
- [ ] Integration test: load defender preset → verify config → add upgrade → verify cost increase
- [ ] Full test suite passes

---

## Dependency Graph for Phase 2.6

```
Phase 2.6A (Config Review)
  └─► Phase 2.6B (Preset Generation)
        └─► Phase 2.6C (Store Enhancements)
              └─► Phase 2.6D (UI Implementation)
```

Depends on:
- **Phase 5.5** (Unit Data Layer, Upgrade System)
- **Phase 2.5** (Attacker two-mode pattern)
- **Phase 6B** (Existing DefenderPanel component)

---

## Post-Phase 2.6 Work

After Phase 2.6 completes, both attacker and defender panels support two-mode operation (Custom Pool / Unit Builder). The full config pipeline is:

1. User selects mode and configures inputs
2. Store tracks mode, preset selection, equipped upgrades
3. `getFullConfig()` / `getFullDefenderConfig()` selectors apply upgrade effects
4. Merged config passed to engine for simulation
5. Results displayed in ResultsPanel

Next phases (unchanged):
- **Phase 7** — Results panel (already consumes merged config, no changes needed)
- **Phase 8** — Integration & polish
- **Phase 9** — Testing & validation

---

## Summary
plus a "Disable defense dice" toggle to see attack results before any defense is applied (useful for understanding "how many dice is the defender rolling?"). Unit Builder mode leverages the enriched unit data from Phase 5.5 to auto-populate defense die, surge chart, and unit keywords. The defender config structure requires minimal engine changes (just one optional field
Phase 2.6 brings two-mode design parity to the Defender Panel. Custom Pool mode provides the simple flat interface for manual configuration, while Unit Builder mode leverages the enriched unit data from Phase 5.5 to auto-populate defense die, surge chart, and unit keywords. The defender config structure requires no engine changes (it's already flat), making this phase primarily a UI and store enhancement. The upgrade system mirrors the attacker side, allowing users to equip upgrades per slot and see the cost and keyword effects applied automatically.
