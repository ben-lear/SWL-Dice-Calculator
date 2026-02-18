# Phase 15 — Display Keyword Expansion & Enrichment Backfill

## Problem

The enrichment files (`src/data/enrichment/units.ts`, `src/data/enrichment/upgrades.ts`) already use ~34 keywords that are **not defined** in the typed keyword interfaces (`keywordTypes.ts`). These untyped keywords bypass TypeScript safety, and string-valued keywords (e.g., `aid: 'emplacement trooper unit'`) are silently **dropped** by the upgrade resolver's type filter.

Additionally, the raw API provides ~175 keywords that are not mapped in the skeleton generator or runtime resolvers, meaning API keyword data is lost during processing. The skeleton generator's keyword maps also contain **7 broken key mismatches** (e.g., `'Pierce'` vs API's `'Pierce X'`) that silently prevent auto-population.

Three fields (`surgeCrit`, `meleeSurgeCrit`, `meleeSurgeBlock`) are stored as keywords but are actually surge chart overrides — they don't represent game keywords and belong in separate metadata.

## Scope

- **Type system expansion** — new `DisplayWeaponKeywords` and `DisplayUnitKeywords` interfaces for non-engine keywords
- **String keyword support** — widen `Record<string, number | boolean>` → `Record<string, number | boolean | string>` in resolved types
- **Surge override extraction** — move surge override fields from `keywords` to dedicated `surgeOverrides`
- **Skeleton generator fixes** — fix 7 broken map key mismatches + add ~125 new keyword mappings
- **Runtime resolver updates** — display keyword field map, applicator weapon-keyword routing
- **Backfill script** — new `scripts/backfillEnrichmentKeywords.ts` that additively populates missing API keywords into existing enrichment entries
- **No engine changes** — these keywords are display/tagging only; `WeaponKeywords`, `AttackerConfig`, `DefenderConfig` remain untouched

## Architecture

```
                    ┌───────────────────────────────────┐
                    │   Engine Types (UNCHANGED)        │
                    │   WeaponKeywords                  │
                    │   AttackerConfig / DefenderConfig  │
                    └───────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ EnrichmentWeapon     │ │ AttackerUnitKeywords │ │ DefenderUnitKeywords│
│ Keywords (engine)    │ │ (engine)             │ │ (engine)            │
│ + sidearmMelee/Rng   │ └──────────┬──────────┘ └──────────┬──────────┘
└─────────┬───────────┘            │                        │
          │                        ▼                        ▼
          │              ┌──────────────────────────────────────┐
          │              │  DisplayUnitKeywords (NEW)           │
          │              │  ~100 boolean + numeric + string     │
          │              └──────────────────┬───────────────────┘
          │                                 │
          ▼                                 ▼
┌─────────────────────┐           ┌─────────────────────┐
│ DisplayWeaponKeywords│           │ UnitKeywords         │
│ (NEW) ~15 fields     │           │ = Attacker & Defender│
└─────────┬───────────┘           │   & DisplayUnit      │
          │                        └──────────┬──────────┘
          │                                   │
          └────────────┬──────────────────────┘
                       ▼
             ┌─────────────────────┐
             │ UpgradeKeywords     │
             │ = EnrichmentWeapon  │
             │   & DisplayWeapon   │
             │   & UnitKeywords    │
             └─────────────────────┘
```

## All New Keyword Fields

### DisplayWeaponKeywords — 15 fields

Weapon-level keywords for tagging/display. None affect the combat engine.

| Field | Type | API Name(s) | Has Enrichment Examples? |
|---|---|---|---|
| `longshot` | `boolean` | Long Shot (205) | **Yes** — 6 units, 3 upgrades |
| `scatter` | `boolean` | Scatter (184) | **Yes** — 1 upgrade |
| `exhaust` | `boolean` | *(card mechanic, no API keyword)* | **Yes** — 6 upgrades |
| `expend` | `boolean` | *(card mechanic, no API keyword)* | **Yes** — 3 upgrades |
| `immobilizeX` | `EnrichmentNumericValue` | Immobilize X (200) | **Yes** — 3 upgrades |
| `overrunX` | `EnrichmentNumericValue` | Overrun X (206) | **Yes** — 1 upgrade |
| `fixed` | `string` | Fixed: Front/Rear (181) | **Yes** — 4 upgrades |
| `areaWeapon` | `boolean` | Area Weapon (174) | No |
| `beamX` | `EnrichmentNumericValue` | Beam X (176) | No |
| `poisonX` | `EnrichmentNumericValue` | Poison X (208) | No |
| `selfDestructX` | `EnrichmentNumericValue` | Self-Destruct X (185) | No |
| `towCable` | `boolean` | Tow Cable (188) | No |
| `versatile` | `boolean` | Versatile (189) | No |
| `armX` | `string` | Arm X: Charge Token Type (175) | No |
| `detonateX` | `string` | Detonate X: (Charge Type) (180) | No |

### DisplayUnitKeywords — ~115 fields

Unit/upgrade-level keywords for tagging/display. Organized by type.

#### Boolean — with enrichment examples (13 fields)

| Field | API Name | ID |
|---|---|---|
| `charge` | Charge | 2 |
| `dauntless` | Dauntless | 42 |
| `reconfigure` | Reconfigure | 195 |
| `cycle` | Cycle | 190 |
| `cunning` | Cunning | 66 |
| `alliesOfConvenience` | Allies of Convenience | 118 |
| `exemplar` | Exemplar | 95 |
| `preparedPosition` | Prepared Position | 141 |
| `indomitable` | Indomitable | 40 |
| `spur` | Spur | 71 |
| `quickThinking` | ➦Quick Thinking | 12 |
| `infiltrate` | Infiltrate | 14 |
| `relentless` | Relentless | 51 |

#### Numeric — with enrichment examples (8 fields)

| Field | Type | API Name | ID |
|---|---|---|---|
| `tacticalX` | `EnrichmentNumericValue` | Tactical X | 18 |
| `demoralizeX` | `EnrichmentNumericValue` | Demoralize | 115 |
| `inspireX` | `EnrichmentNumericValue` | Inspire | 6 |
| `targetX` | `EnrichmentNumericValue` | Target | 73 |
| `spotterX` | `EnrichmentNumericValue` | ➦Spotter | 61 |
| `bolsterX` | `EnrichmentNumericValue` | ➦Bolster | 107 |
| `strategizeX` | `EnrichmentNumericValue` | Strategize | 151 |
| `rechargeX` | `EnrichmentNumericValue` | Recharge | 143 |

#### String — with enrichment examples (3 fields)

| Field | Type | API Name | ID |
|---|---|---|---|
| `coordinate` | `string` | Coordinate: * | 81, 35, 210, 101 |
| `aid` | `string` | Aid / Aid: * | 161, 117 |
| `direct` | `string` | Direct / Direct: * | 164, 108, 109 |

#### Boolean — no enrichment examples (61 fields)

| Field | API Name | ID |
|---|---|---|
| `nimble` | Nimble | 7 |
| `gunslinger` | Gunslinger | 10 |
| `fireSupport` | Fire Support | 60 |
| `barrage` | Barrage | 93 |
| `ataruMastery` | Ataru Mastery | 114 |
| `juyoMastery` | Juyo Mastery | 106 |
| `steady` | Steady | 72 |
| `disengage` | Disengage | 27 |
| `scale` | Scale | 41 |
| `covertOps` | Covert Ops | 15 |
| `incognito` | Incognito | 98 |
| `loadout` | Loadout | 16 |
| `sentinel` | Sentinel | 48 |
| `stationary` | Stationary | 49 |
| `fullPivot` | Full Pivot | 47 |
| `climbingVehicle` | Climbing Vehicle | 45 |
| `expertClimber` | Expert Climber | 22 |
| `unhindered` | Unhindered | 25 |
| `plodding` | Plodding | 116 |
| `grounded` | Grounded | 32 |
| `reposition` | Reposition | 52 |
| `attackRun` | Attack Run | 120 |
| `authoritative` | Authoritative | 94 |
| `bounty` | Bounty | 68 |
| `cache` | Cache | 121 |
| `calculateOdds` | ➦Calculate Odds | 97 |
| `compel` | Compel | 65 |
| `detachment` | Detachment | 124 |
| `disgraced` | Disgraced | 219 |
| `distract` | Distract | 125 |
| `divineInfluence` | Divine Influence | 126 |
| `divulge` | Divulge | 191 |
| `faultyEquipment` | Faulty Equipment | 220 |
| `fieldCommander` | Field Commander | 127 |
| `flawed` | Flawed | 20 |
| `guidance` | Guidance | 129 |
| `heavyWeaponTeam` | Heavy Weapon Team | 38 |
| `hunted` | Hunted | 130 |
| `imPartOfTheSquadToo` | I'm Part of the Squad Too | 131 |
| `inconspicuous` | Inconspicuous | 33 |
| `insecure` | Insecure | 221 |
| `interrogate` | Interrogate | 135 |
| `latentPower` | Latent Power | 137 |
| `leader` | Leader | 192 |
| `masterStoryteller` | Master Storyteller | 138 |
| `mobile` | Mobile | 218 |
| `myMoodIsBasedOnProfit` | My Mood is Based On Profit | 216 |
| `noncombatantKeyword` | Noncombatant | 193 |
| `oneStepAhead` | One Step Ahead | 213 |
| `overrideKeyword` | Override | 140 |
| `permanent` | Permanent | 194 |
| `programmed` | Programmed | 142 |
| `pullingTheStrings` | ➦Pulling the Strings | 63 |
| `reinforcements` | Reinforcements | 144 |
| `restore` | Restore | 212 |
| `ruthless` | Ruthless | 146 |
| `secretMission` | Secret Mission | 31 |
| `selfPreservation` | Self-Preservation | 147 |
| `small` | Small | 198 |
| `smokeTokens` | Smoke Tokens | 149 |
| `tempted` | Tempted | 105 |
| `unconcerned` | Unconcerned | 153 |
| `unstoppable` | Unstoppable | 154 |
| `weighedDown` | Weighed Down | 156 |
| `wereNotRegs` | We're Not Regs | 160 |
| `wheelMode` | Wheel Mode | 86 |

#### Numeric — no enrichment examples (22 fields)

| Field | Type | API Name | ID |
|---|---|---|---|
| `agileX` | `EnrichmentNumericValue` | Agile | 50 |
| `reliableX` | `EnrichmentNumericValue` | Reliable | 75 |
| `scoutX` | `EnrichmentNumericValue` | Scout X | 37 |
| `jumpX` | `EnrichmentNumericValue` | Jump | 1 |
| `speederX` | `EnrichmentNumericValue` | Speeder | 58 |
| `enrageX` | `EnrichmentNumericValue` | Enrage | 21 |
| `regenerateX` | `EnrichmentNumericValue` | Regenerate | 69 |
| `masterOfTheForceX` | `EnrichmentNumericValue` | Master of the Force | 28 |
| `observeX` | `EnrichmentNumericValue` | Observe | 110 |
| `contingenciesX` | `EnrichmentNumericValue` | Contingencies | 19 |
| `commandVehicleX` | `EnrichmentNumericValue` | Command Vehicle X | 217 |
| `defendX` | `EnrichmentNumericValue` | Defend | 36 |
| `disciplinedX` | `EnrichmentNumericValue` | Disciplined | 74 |
| `flexibleResponseX` | `EnrichmentNumericValue` | Flexible Response X | 128 |
| `generatorX` | `EnrichmentNumericValue` | Generator | 84 |
| `readyX` | `EnrichmentNumericValue` | Ready | 34 |
| `scoutingPartyX` | `EnrichmentNumericValue` | Scouting Party | 90 |
| `smokeX` | `EnrichmentNumericValue` | Smoke | 148 |
| `takeCoverX` | `EnrichmentNumericValue` | ➦Take Cover | 5 |
| `woundX` | `EnrichmentNumericValue` | Wound | 157 |
| `advancedTargetingX` | `EnrichmentNumericValue` | Advanced Targeting: X | 215 |
| `lightTransportX` | `EnrichmentNumericValue` | Light Transport X: Open | 59 |

#### String (parameterized) — no enrichment examples (14 fields)

| Field | Type | API Name(s) | ID(s) |
|---|---|---|---|
| `ai` | `string` | AI: Attack, AI: Move, AI: Dodge, Move, etc. | 211, 80, 83, 96, 100 |
| `entourage` | `string` | Entourage / Entourage: * | 162, 67, 64 |
| `equip` | `string` | Equip / Equip: * | 159, 112, 102 |
| `retinue` | `string` | Retinue / Retinue: * | 145, 113, 43 |
| `teamwork` | `string` | Teamwork: * | 152, 99, 24 |
| `associate` | `string` | Associate: Unit Name | 119 |
| `independent` | `string` | Independent: Token X/Action | 134 |
| `mercenary` | `string` | Mercenary: Faction | 139 |
| `specialIssue` | `string` | Special Issue: Battle Force | 150 |
| `repair` | `string` | Repair X: Capacity Y, etc. | 196, 30, 29 |
| `treat` | `string` | Treat X: Capacity Y | 199 |
| `hover` | `string` | Hover: Ground, Hover: Air X | 91, 111 |
| `transport` | `string` | Transport / Transport X: Open | 158, 78 |
| `immuneEnemyEffects` | `boolean` | Immune: Enemy Effects | 132 |
| `immuneRange1Weapons` | `boolean` | Immune: Range 1 Weapons | 57 |

> Note: `immuneEnemyEffects` and `immuneRange1Weapons` are boolean (not string) — listed here because they're Immune: variants not in the engine. They could also go in the boolean section above; placed here for proximity to other Immune: keywords.

### EnrichmentWeaponKeywords additions — 2 fields

| Field | Type | Notes |
|---|---|---|
| `sidearmMelee` | `boolean` | Already in engine `WeaponKeywords`, missing from enrichment mirror |
| `sidearmRanged` | `boolean` | Already in engine `WeaponKeywords`, missing from enrichment mirror |

---

## Implementation Steps

### Step 1 — Expand keyword type interfaces

**File:** `src/data/enrichment/keywordTypes.ts`

**Changes:**

1. Add `sidearmMelee?: boolean` and `sidearmRanged?: boolean` to `EnrichmentWeaponKeywords`

2. Add new `DisplayWeaponKeywords` interface with all 15 fields from the table above. Type all fields ending in `X` as `EnrichmentNumericValue`. Type `fixed`, `armX`, `detonateX` as `string`. Type the rest as `boolean`.

3. Add new `DisplayUnitKeywords` interface with all ~115 fields from the tables above. Type all fields ending in `X` as `EnrichmentNumericValue`. Type `coordinate`, `aid`, `direct`, `ai`, `entourage`, `equip`, `retinue`, `teamwork`, `associate`, `independent`, `mercenary`, `specialIssue`, `repair`, `treat`, `hover`, `transport` as `string`. Type the rest as `boolean`.

4. Update composite types:
   - `UnitKeywords = AttackerUnitKeywords & DefenderUnitKeywords & DisplayUnitKeywords`
   - `UpgradeKeywords = EnrichmentWeaponKeywords & DisplayWeaponKeywords & UnitKeywords`

**Naming conventions:**
- `noncombatantKeyword` to avoid collision with `UpgradeEnrichment.noncombatant` metadata field
- `overrideKeyword` to avoid collision with the JavaScript reserved-word-adjacent `override`

---

### Step 2 — Update enrichment weapon profile type

**File:** `src/data/enrichment/types.ts`

**Changes:**

1. Import `DisplayWeaponKeywords` from `./keywordTypes`
2. Change `EnrichmentWeaponProfile.keywords` from `Partial<WeaponKeywords>` to `Partial<WeaponKeywords & DisplayWeaponKeywords>`

---

### Step 3 — Widen resolved data types for string keyword support

**File:** `src/data/types.ts`

**Changes:**

1. Import `DisplayWeaponKeywords` from `./enrichment/keywordTypes`
2. `ResolvedUnit.keywords`: `Record<string, number | boolean>` → `Record<string, number | boolean | string>`
3. `ResolvedUpgrade.keywords`: `Record<string, number | boolean>` → `Record<string, number | boolean | string>`
4. `WeaponProfile.keywords`: `Partial<WeaponKeywords>` → `Partial<WeaponKeywords & DisplayWeaponKeywords>`

---

### Step 4 — Add `surgeOverrides` field

**File:** `src/data/enrichment/types.ts`

Add to `UpgradeEnrichment`:
```ts
surgeOverrides?: {
  surgeCrit?: boolean;
  meleeSurgeCrit?: boolean;
  meleeSurgeBlock?: boolean;
};
```

**File:** `src/data/types.ts`

Add to `ResolvedUpgrade`:
```ts
surgeOverrides: {
  surgeCrit?: boolean;
  meleeSurgeCrit?: boolean;
  meleeSurgeBlock?: boolean;
} | null;
```

**File:** `src/data/upgradeResolver.ts`

Pass through `enrichment?.surgeOverrides ?? null` in the resolved upgrade object.

**File:** `src/data/enrichment/upgrades.ts`

Move 3 fields from `keywords` to `surgeOverrides`:
- `armament-the-darksaber-maul`: `surgeCrit: true` → `surgeOverrides: { surgeCrit: true }`
- `doctrine-platoon-commander`: `meleeSurgeCrit: true, meleeSurgeBlock: true` → `surgeOverrides: { meleeSurgeCrit: true, meleeSurgeBlock: true }`

---

### Step 5 — Fix upgrade resolver string filter

**File:** `src/data/upgradeResolver.ts`

Change the keyword value filter at ~line 246:

```ts
// Before:
if (typeof value === 'number' || typeof value === 'boolean') {

// After:
if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
```

This ensures string-valued keywords (e.g., `coordinate: 'trooper'`) survive resolution instead of being silently dropped.

---

### Step 6 — Fix skeleton generator keyword map mismatches

**File:** `scripts/generateEnrichmentSkeleton.ts`

Fix 7 broken map keys by adding alias entries (keep originals for backward compatibility):

| Add to Map | New Key | Value | Reason |
|---|---|---|---|
| `ATTACKER_KEYWORD_MAP` | `'Death From Above'` | `'deathFromAbove'` | API casing differs |
| `WEAPON_KEYWORD_MAP` | `'Pierce X'` | `'pierceX'` | API name has ` X` suffix |
| `WEAPON_KEYWORD_MAP` | `'Impact X'` | `'impactX'` | API name has ` X` suffix |
| `WEAPON_KEYWORD_MAP` | `'Critical X'` | `'criticalX'` | API name has ` X` suffix |
| `WEAPON_KEYWORD_MAP` | `'Lethal X'` | `'lethalX'` | API name has ` X` suffix |
| `WEAPON_KEYWORD_MAP` | `'Ram X'` | `'ramX'` | API name has ` X` suffix |
| `DEFENDER_KEYWORD_MAP` | `'Armor X'` | `'armorX'` | API uses `Armor X`, not `Armor [X]` |

---

### Step 7 — Add display keyword maps to skeleton generator

**File:** `scripts/generateEnrichmentSkeleton.ts`

Add two new maps:

**`DISPLAY_WEAPON_KEYWORD_MAP`** — maps API keyword names → display weapon field names:
```ts
const DISPLAY_WEAPON_KEYWORD_MAP: Record<string, string> = {
  'Long Shot': 'longshot',
  'Scatter': 'scatter',
  'Immobilize X': 'immobilizeX',
  'Overrun X': 'overrunX',
  'Area Weapon': 'areaWeapon',
  'Beam X': 'beamX',
  'Poison X': 'poisonX',
  'Self-Destruct X': 'selfDestructX',
  'Tow Cable': 'towCable',
  'Versatile': 'versatile',
  'Fixed: Front/Rear': 'fixed',
  'Arm X: Charge Token Type': 'armX',
  'Detonate X: (Charge Type)': 'detonateX',
};
```

**`DISPLAY_UNIT_KEYWORD_MAP`** — maps API keyword names → display unit field names:  
*(all ~115 entries from the DisplayUnitKeywords table, including parameterized keyword families)*

```ts
const DISPLAY_UNIT_KEYWORD_MAP: Record<string, string> = {
  // Boolean — with enrichment examples
  'Charge': 'charge',
  'Dauntless': 'dauntless',
  'Reconfigure': 'reconfigure',
  'Cycle': 'cycle',
  'Cunning': 'cunning',
  'Allies of Convenience': 'alliesOfConvenience',
  'Exemplar': 'exemplar',
  'Prepared Position': 'preparedPosition',
  'Indomitable': 'indomitable',
  'Spur': 'spur',
  '➦Quick Thinking': 'quickThinking',
  'Infiltrate': 'infiltrate',
  'Relentless': 'relentless',

  // Numeric — with enrichment examples
  'Tactical X': 'tacticalX',
  'Demoralize': 'demoralizeX',
  'Inspire': 'inspireX',
  'Target': 'targetX',
  '➦Spotter': 'spotterX',
  '➦Bolster': 'bolsterX',
  'Strategize': 'strategizeX',
  'Recharge': 'rechargeX',

  // String — with enrichment examples
  'Aid': 'aid',
  'Direct': 'direct',

  // Boolean — no enrichment examples
  'Nimble': 'nimble',
  'Gunslinger': 'gunslinger',
  'Fire Support': 'fireSupport',
  'Barrage': 'barrage',
  'Ataru Mastery': 'ataruMastery',
  'Juyo Mastery': 'juyoMastery',
  'Steady': 'steady',
  'Disengage': 'disengage',
  'Scale': 'scale',
  'Covert Ops': 'covertOps',
  'Incognito': 'incognito',
  'Loadout': 'loadout',
  'Sentinel': 'sentinel',
  'Stationary': 'stationary',
  'Full Pivot': 'fullPivot',
  'Climbing Vehicle': 'climbingVehicle',
  'Expert Climber': 'expertClimber',
  'Unhindered': 'unhindered',
  'Plodding': 'plodding',
  'Grounded': 'grounded',
  'Reposition': 'reposition',
  'Attack Run': 'attackRun',
  'Authoritative': 'authoritative',
  'Bounty': 'bounty',
  'Cache': 'cache',
  '➦Calculate Odds': 'calculateOdds',
  'Compel': 'compel',
  'Detachment': 'detachment',
  'Disgraced': 'disgraced',
  'Distract': 'distract',
  'Divine Influence': 'divineInfluence',
  'Divulge': 'divulge',
  'Faulty Equipment': 'faultyEquipment',
  'Field Commander': 'fieldCommander',
  'Flawed': 'flawed',
  'Guidance': 'guidance',
  'Heavy Weapon Team': 'heavyWeaponTeam',
  'Hunted': 'hunted',
  "I'm Part of the Squad Too": 'imPartOfTheSquadToo',
  'Inconspicuous': 'inconspicuous',
  'Insecure': 'insecure',
  'Interrogate': 'interrogate',
  'Latent Power': 'latentPower',
  'Leader': 'leader',
  'Master Storyteller': 'masterStoryteller',
  'Mobile': 'mobile',
  'My Mood is Based On Profit': 'myMoodIsBasedOnProfit',
  'Noncombatant': 'noncombatantKeyword',
  'One Step Ahead': 'oneStepAhead',
  'Override': 'overrideKeyword',
  'Permanent': 'permanent',
  'Programmed': 'programmed',
  '➦Pulling the Strings': 'pullingTheStrings',
  'Reinforcements': 'reinforcements',
  'Restore': 'restore',
  'Ruthless': 'ruthless',
  'Secret Mission': 'secretMission',
  'Self-Preservation': 'selfPreservation',
  'Small': 'small',
  'Smoke Tokens': 'smokeTokens',
  'Tempted': 'tempted',
  'Unconcerned': 'unconcerned',
  'Unstoppable': 'unstoppable',
  'Weighed Down': 'weighedDown',
  "We're Not Regs": 'wereNotRegs',
  'Wheel Mode': 'wheelMode',
  'Immune: Enemy Effects': 'immuneEnemyEffects',
  'Immune: Range 1 Weapons': 'immuneRange1Weapons',

  // Numeric — no enrichment examples
  'Agile': 'agileX',
  'Reliable': 'reliableX',
  'Scout X': 'scoutX',
  'Jump': 'jumpX',
  'Speeder': 'speederX',
  'Enrage': 'enrageX',
  'Regenerate': 'regenerateX',
  'Master of the Force': 'masterOfTheForceX',
  'Observe': 'observeX',
  'Contingencies': 'contingenciesX',
  'Command Vehicle X': 'commandVehicleX',
  'Defend': 'defendX',
  'Disciplined': 'disciplinedX',
  'Flexible Response X': 'flexibleResponseX',
  'Generator': 'generatorX',
  'Ready': 'readyX',
  'Scouting Party': 'scoutingPartyX',
  'Smoke': 'smokeX',
  '➦Take Cover': 'takeCoverX',
  'Wound': 'woundX',
  'Advanced Targeting: X': 'advancedTargetingX',
  'Light Transport X: Open': 'lightTransportX',

  // String/parameterized — no enrichment examples
  'AI: Action': 'ai',
  'AI: Attack': 'ai',
  'AI: Attack, Move': 'ai',
  'AI: Dodge, Move': 'ai',
  'AI: Move': 'ai',
  'Aid: Pyke Syndicate': 'aid',
  'Associate: Unit Name': 'associate',
  'Coordinate: Droid Trooper': 'coordinate',
  'Coordinate: Emplacement Trooper': 'coordinate',
  'Coordinate: Unit Name/Unit Type': 'coordinate',
  'Coordinate: Vehicle': 'coordinate',
  'Direct: ;r2 Clone Trooper Unit': 'direct',
  'Direct: ;r2 Droid Trooper Unit': 'direct',
  'Entourage': 'entourage',
  'Entourage: Imperial Death Troopers': 'entourage',
  'Entourage: Imperial Royal Guards': 'entourage',
  'Equip': 'equip',
  'Equip: Del Meeko, Gideon Hask': 'equip',
  'Equip: Tristan Wren, Ursa Wren': 'equip',
  'Hover: Air X': 'hover',
  'Hover: Ground': 'hover',
  'Independent: Token X/Action': 'independent',
  'Mercenary: Faction': 'mercenary',
  'Repair 1: Capacity 2': 'repair',
  'Repair 2: Capacity 2': 'repair',
  'Repair X: Capacity Y': 'repair',
  'Retinue': 'retinue',
  'Retinue: Iden Versio': 'retinue',
  'Retinue: Sabine Wren': 'retinue',
  'Special Issue: Battle Force': 'specialIssue',
  'Teamwork: Cassian Andor': 'teamwork',
  'Teamwork: Han Solo': 'teamwork',
  'Teamwork: Unit Name': 'teamwork',
  'Transport': 'transport',
  'Transport X: Open': 'transport',
  'Treat X: Capacity Y': 'treat',
};
```

Update `ALL_KEYWORD_MAP` to include both new maps.

Update `mapKeywordIdsToFields()` to handle:
- String-typed fields: emit `'<need human>'` as the value (can't auto-determine the qualifier)
- Magnitude fields with unreliable `hasMagnitude`: use field name convention (ends in `X`) as source of truth

---

### Step 8 — Add display keyword maps to runtime resolution

**File:** `src/data/keywordMap.ts`

Add `DISPLAY_KEYWORD_FIELD_MAP` with the same API-name → field-name mappings as the skeleton generator's `DISPLAY_UNIT_KEYWORD_MAP`.

Also fix the missing entry: `'Immune: Melee'` → `'immuneMelee'` in `DEFENDER_KEYWORD_FIELD_MAP`.

**File:** `src/data/unitResolver.ts`

Import `DISPLAY_KEYWORD_FIELD_MAP` and check it as a fallback when the attacker/defender maps don't match. This ensures display keywords on units resolve to canonical field names instead of raw API names:

```ts
const attackerField = ATTACKER_KEYWORD_FIELD_MAP[kwName];
const defenderField = DEFENDER_KEYWORD_FIELD_MAP[kwName];
const displayField = DISPLAY_KEYWORD_FIELD_MAP[kwName];  // NEW
const fieldName = attackerField || defenderField || displayField;
```

---

### Step 9 — Update `WEAPON_KEYWORD_FIELDS` in upgrade applicator

**File:** `src/data/upgradeApplicator.ts`

Add display weapon keyword field names to the `WEAPON_KEYWORD_FIELDS` set so upgrade keywords that are weapon-level get routed to weapons, not unit config:

Add: `'longshot'`, `'scatter'`, `'exhaust'`, `'expend'`, `'immobilizeX'`, `'overrunX'`, `'fixed'`, `'areaWeapon'`, `'beamX'`, `'poisonX'`, `'selfDestructX'`, `'towCable'`, `'versatile'`, `'armX'`, `'detonateX'`

---

### Step 10 — Create `scripts/backfillEnrichmentKeywords.ts`

New dedicated script that additively patches existing enrichment entries with missing API keywords.

**Algorithm:**

1. Read processed data (`units.json`, `upgrades.json`) and raw data (`units.json`, `upgrades.json`) for keyword IDs
2. Read keyword metadata (`keywords.json`)
3. Build the expanded `ALL_KEYWORD_MAP` (reuse logic from updated skeleton generator)
4. Import existing enrichment objects to determine which keywords are already present
5. For each **enriched** unit:
   a. Get `keywordNames` from processed data (or resolve from raw `keyword_ids`)
   b. Map each keyword name through `ALL_KEYWORD_MAP` to get enrichment field names
   c. Skip weapon keywords (they belong on weapon profiles, not the `keywords` block)
   d. Skip keywords already present in the enrichment entry
   e. Compute missing keyword fields with defaults: `true` for boolean, `'<need human>'` for magnitude (field ends in `X`), `'<need human>'` for string-typed
6. For each **enriched** upgrade, same process but include weapon keywords in the `keywords` block (per existing upgrade enrichment convention)
7. Read enrichment `.ts` files as raw text
8. For each entry with missing keywords, locate the `keywords: { ... }` block via text parsing and inject missing fields
9. Handle entries with empty `keywords: {}` — expand to multi-line with the new fields
10. Entries with no `keywords` property: add `keywords: { ... }` with default values
11. Write modified files back, preserving all human-curated data

**Flags:**
- `--dry-run` — print summary of changes without writing files
- Default: apply changes

**Run via:** `npx tsx scripts/backfillEnrichmentKeywords.ts`

**Key rules:**
- **Additive only** — never overwrite existing values, never remove fields
- **No structural changes** — don't touch weapons, surge charts, miniatureCount, etc.
- `exhaust` and `expend` are card mechanics with no API keyword ID — won't be auto-populated by this script (manual enrichment only)
- Parameterized keywords (AI, Coordinate, Entourage, etc.) get `'<need human>'` since the qualifier can't be determined from the keyword ID alone

---

### Step 11 — Typecheck and lint

Run after all changes:
```bash
npm run typecheck
npm run lint
npm run test
```

**Expected outcomes:**
- All enrichment files pass type checking with the expanded interfaces
- No lint regressions
- All existing tests pass (engine types unchanged)

---

## File Change Summary

| File | Change Type | Description |
|---|---|---|
| `src/data/enrichment/keywordTypes.ts` | **Modify** | Add `DisplayWeaponKeywords`, `DisplayUnitKeywords`; add `sidearmMelee`/`sidearmRanged` to `EnrichmentWeaponKeywords`; update composite types |
| `src/data/enrichment/types.ts` | **Modify** | Import `DisplayWeaponKeywords`; update weapon profile keyword type; add `surgeOverrides` to `UpgradeEnrichment` |
| `src/data/types.ts` | **Modify** | Widen keyword records to `string`; update `WeaponProfile.keywords`; add `surgeOverrides` to `ResolvedUpgrade` |
| `src/data/upgradeResolver.ts` | **Modify** | Widen value filter for strings; pass through `surgeOverrides` |
| `src/data/unitResolver.ts` | **Modify** | Import and use `DISPLAY_KEYWORD_FIELD_MAP` |
| `src/data/keywordMap.ts` | **Modify** | Add `DISPLAY_KEYWORD_FIELD_MAP`; fix `Immune: Melee` mapping |
| `src/data/upgradeApplicator.ts` | **Modify** | Add display weapon keywords to `WEAPON_KEYWORD_FIELDS` |
| `src/data/enrichment/upgrades.ts` | **Modify** | Move surge fields to `surgeOverrides`; backfill adds missing keywords |
| `src/data/enrichment/units.ts` | **Modify** | Backfill adds missing keywords |
| `scripts/generateEnrichmentSkeleton.ts` | **Modify** | Fix map mismatches; add display keyword maps |
| `scripts/backfillEnrichmentKeywords.ts` | **Create** | New dedicated backfill script |

## Decisions & Assumptions

1. **Engine types are untouched.** `WeaponKeywords`, `AttackerConfig`, `DefenderConfig` in `src/engine/types.ts` are not modified. Display keywords flow through the data layer only.
2. **`noncombatantKeyword`** avoids collision with the `UpgradeEnrichment.noncombatant` metadata boolean. Similarly **`overrideKeyword`** avoids future confusion with the JS keyword `override`.
3. **`hasMagnitude` API metadata is unreliable.** Several keywords with X in their name have `hasMagnitude: false` (Beam X, Immobilize X, Recharge, etc.). Field name convention (ends in `X`) is the source of truth for whether to use numeric typing.
4. **`exhaust`/`expend` have no API keyword ID.** They are card-usage mechanics and must remain manually enriched. The backfill script won't touch them.
5. **Surge override fields are NOT keywords.** `surgeCrit`, `meleeSurgeCrit`, `meleeSurgeBlock` move to a dedicated `surgeOverrides` object — they modify surge conversion behavior, not game keyword tagging.
6. **Backfill is additive only.** Existing human-curated values are never overwritten or removed. Only missing keyword fields are inserted with defaults (`true` / `'<need human>'`).
7. **Parameterized keywords** (Coordinate, AI, Entourage, etc.) are string-typed. The skeleton generator and backfill script emit `'<need human>'` since the qualifier text can't be auto-determined from the keyword ID alone.

## Non-Goals

- No UI changes (keyword badges, tooltips, etc.) — that's a separate phase
- No engine consumption of display keywords — they're for tagging/display only
- No refactoring of existing engine keyword interfaces
- No migration of existing tests
