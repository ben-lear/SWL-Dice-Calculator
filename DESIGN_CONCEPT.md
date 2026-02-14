# Just Roll Crits — Design Concept

## 1. Overview

A **React + TypeScript** web application that simulates the full attack sequence from Star Wars: Legion. The user configures an attacking unit's dice pool, the defending unit's profile, and all relevant keywords/tokens — then the app either:

- **Calculates** the expected (average) wounds via probability math, or
- **Simulates** the attack N times via Monte Carlo and shows distributions.

Both modes are available; the user can toggle between **Expected Value** and **Simulate N Rolls**.

---

## 2. Core Dice Model

### 2.1 Attack Dice

| Die Color | Faces (8-sided) |
|-----------|----------------|
| **White** | Blank ×5, Hit (a) ×1, Critical (b) ×1, Surge (c) ×1 |
| **Black** | Blank ×3, Hit (a) ×3, Critical (b) ×1, Surge (c) ×1 |
| **Red** | Blank ×1, Hit (a) ×5, Critical (b) ×1, Surge (c) ×1 |

### 2.2 Defense Dice

| Die Color | Faces (6-sided) |
|-----------|-----------------|
| **White** | Blank ×4, Block (d) ×1, Surge (e) ×1 |
| **Red** | Blank ×2, Block (d) ×3, Surge (e) ×1 |

### 2.3 Die Upgrade / Downgrade Chain

**Attack:** White → Black → Red (upgrade direction)
**Defense:** White → Red (upgrade direction)

Downgrade is the reverse. A die already at the end of the chain cannot be further upgraded/downgraded. A die cannot be upgraded or downgraded more than once by the same effect. The attack timing specifies the order:

1. Attacker downgrades attack dice
2. Defender downgrades attack dice
3. Attacker upgrades attack dice
4. Defender upgrades attack dice

(Same pattern for defense dice.)

---

## 3. Attack Sequence — Steps Modeled

The app follows the official attack timing:

### Step 1 — Declare Defender
*(Implicit — the user sets up the pools.)*

### Step 2 — Form Attack Pool
User selects the dice that make up the pool (e.g., 4 white + 1 black + 1 red), plus weapon keywords. Spray multiplies the weapon's dice by the number of defending miniatures in LOS.

- **2b. Choose Weapons and Gather Dice** — Makashi Mastery (attacker) may reduce Pierce X by 1 here to disable Immune: Pierce and Impervious for the attack.

### Step 3 — Declare Additional Defender
*(Skipped — this calculator models a single attack pool. Arsenal X, Gunslinger, and Beam X interactions are not modeled in MVP.)*

### Step 4 — Roll Attack Dice
- **4a. Upgrade / Downgrade Attack Dice** — apply keyword effects in order.
- **4b. Roll Dice** — resolve the pool.
- **4c. Reroll Dice** — Aim tokens, Precise X, Observation tokens.
- **4d. Convert Attack Surges** — surge chart (c→a, c→b, or c→blank), Surge tokens, Critical X.

### Step 5 — Apply Dodge and Cover
- **5a–b. Determine Cover** — user selects: None / Light / Heavy. Cover value is improved by Suppressed (+1), Cover X (+X), and Smoke tokens (+1 each), then reduced by Sharpshooter X. **Cover value caps at 2 (Heavy) — it cannot be increased above 2 for any reason.** Improvements are resolved before reductions.
- **5c. Roll Cover Pool** — 1 white defense die per hit (a) result.
- **5d. Apply Cover** — Light cancels a per d; Heavy cancels a per d or e.
- **5e. Apply Dodge** — each Dodge token cancels 1 a.

### Step 6 — Modify Attack Dice
Apply attacker/defender modification effects (Armor X, Impact X, Shielded, Guardian X, Backup, etc.)

### Step 7 — Roll Defense Dice
- **7a. Gather Defense Dice** — 1 die per remaining a + b result.
- **7b. Upgrade / Downgrade Defense Dice** — in order.
- **7c. Roll Dice.**
- **7d. Reroll Dice** — Uncanny Luck X, Soresu Mastery, etc.
- **7e. Convert Defense Surges** — surge chart (e→d or e→blank), Surge tokens.

### Step 8 — Modify Defense Dice
Apply effects (Pierce X cancels d results, Immune: Pierce, Impervious, etc.)

### Step 9 — Compare Results
`Wounds = (a + b results) − d results`

---

## 4. User Input Panels

The UI is divided into two main columns — **Attacker** and **Defender** — with a central results area.

### 4.1 Attacker Panel

#### Unit Preset Dropdowns
Two **searchable dropdowns** at the top of the Attacker panel let the user quickly load a pre-configured attack profile:

1. **Faction** — Select: All (default) / Rebel Alliance / Galactic Empire / Republic / Separatist Alliance / Mercenaries. Filters the unit list.
2. **Unit / Weapon** — Searchable combobox listing units (and their weapon loadouts) within the selected faction. Typing filters the list in real time. Selecting a unit auto-populates all attacker fields (dice, surge chart, keywords). Selecting "Custom" (default) leaves all fields blank.

The user can freely modify any setting after selecting a preset.

Example presets:
| Faction | Unit / Weapon | Dice | Keywords |
|---------|---------------|------|----------|
| Empire | Commander Darth Vader (Lightsaber) | 6 Red | Impact 3, Pierce 3, c→b |
| Empire | Stormtroopers (DLT-19) | 4 White + 1 Red | Precise 1, c→blank |
| Empire | Shore Troopers (T-21B) | 4 White + 1 Red | Precise 1, c→a |
| Rebels | Luke Skywalker (Lightsaber) | 6 Red | Impact 2, Pierce 2, c→b |
| Separatists | B1 Battle Droids (E-5s) | 5 White | c→blank |
| *(more added over time)* | | | |

#### Manual Configuration

| Input | Type | Notes |
|-------|------|-------|
| **Red attack dice** | Number spinner (0–12) | |
| **Black attack dice** | Number spinner (0–12) | |
| **White attack dice** | Number spinner (0–12) | |
| **Attack surge conversion** | Select: None / c→a / c→b | Unit card surge chart |
| **Aim tokens** | Number spinner (0–5) | Each rerolls up to 2 dice |
| **Surge tokens (attack)** | Number spinner (0–5) | Each converts 1 c→a |
| **Observation tokens** | Number spinner (0–5) | Each rerolls 1 die |
| **Dodge tokens (attacker)** | Number spinner (0–5) | For Jar'Kai Mastery; each converts blank→hit or hit→crit (shown only when Jar'Kai Mastery is enabled) |
| **Precise X** | Number spinner (0–3) | Extra rerolls per Aim |
| **Critical X** | Number spinner (0–5) | Converts up to X c→b |
| **Lethal X** | Number spinner (0–3) | Spend Aim for Pierce instead of reroll |
| **Sharpshooter X** | Number spinner (0–3) | Reduces defender's Cover value |
| **Pierce X** | Number spinner (0–5) | Cancels d results |
| **Impact X** | Number spinner (0–5) | Converts a→b vs Armor |
| **Ram X** | Number spinner (0–3) | Changes results to b |
| **Blast** | Toggle | Defender ignores Cover |
| **High Velocity** | Toggle | Defender can't spend Dodge tokens; Deflect has no effect |
| **Suppressive** | Toggle | +1 extra Suppression (informational) |
| **Marksman** | Toggle | Aim tokens convert blanks→a or a→b |
| **Marksman strategy** | Select: Deterministic / Averages | Choose when to use Marksman (shown only when Marksman is enabled) |
| **Jar'Kai Mastery** | Toggle | Melee: spend attacker Dodge tokens for blank→hit, hit→crit conversions after surge step |
| **Reroll strategy** | Select: Conservative / Crit Fishing | Conservative (default): reroll blanks and excess surges only. Crit Fishing: also reroll hits to fish for crits |
| **Jedi Hunter** | Toggle | Gains c→b |
| **Duelist** (attacker) | Toggle | Melee: spend Aim → attack pool gains Pierce 1 |
| **Makashi Mastery** | Toggle | Melee: reduce Pierce X by 1 at Step 2b → disables Immune: Pierce and Impervious for the attack |
| **Spray** | Toggle | Weapon dice are multiplied by number of defending minis in LOS |
| **Immune: Deflect** | Toggle | Attacker cannot suffer wounds from Deflect/Shien Mastery reflection |
| **Death From Above** | Toggle | Defender can't use Cover (height advantage condition) |
| **Hold the Line** | Toggle | While Engaged: gains c→a for attack and e→d for defense |
| **Attacker unit cost** | Number spinner (0–999) | Points value; auto-filled from preset, user-editable |

#### Upgrade Slots (shown when a unit preset is selected)
When a unit is selected from the preset dropdown, the upgrade slots available for that unit are displayed as searchable dropdowns. Each slot shows upgrades of the matching type, filtered to those valid for the selected unit.

| Input | Type | Notes |
|-------|------|-------|
| **[Slot Name] upgrade** | Searchable combobox per slot | One per slot in the unit's upgrade bar. Selecting an upgrade adds its point cost to the total and applies its combat keywords (if enriched). Selecting "None" unequips. |

Upgrade slots fall into two categories:
- **Combat-relevant** (Heavy Weapon, Personnel, Armament, Ordnance, Gear, Force, Hardpoint, Crew, Grenades, Pilot, Training, Programming, Protocol, Squad Leader, Door Gunner, Dug In, Generator) — enriched upgrades add keywords to the attack/defense calculation AND cost to the total. **Dug In** is a special case: equipping it causes the defender to roll red defense dice during the Roll Cover step. **Generator** upgrades can add dice to the attack pool.
- **Non-combat** (Comms, Command, Scanner, Strike and Fade, Imperial March, Doctrine) — upgrades add cost only (for points efficiency tracking).

The total unit cost displayed = base unit cost + Σ equipped upgrade costs.

> **Note:** Equipping a weapon-slot upgrade (Heavy Weapon, etc.) does NOT dynamically change the dice pool — the dice pool is determined by the selected preset (unit + weapon loadout). To model a different weapon, select a different preset. Upgrade slots are primarily for cost tracking and keyword additions.

#### Attack Dice Upgrade/Downgrade Keywords
| Input | Type | Notes |
|-------|------|-------|
| **Anti-Materiel X** | Number spinner (0–3) | Upgrade X of weapon’s dice (vs Vehicles only) |
| **Anti-Personnel X** | Number spinner (0–3) | Upgrade X of weapon’s dice (vs Troopers only) |
| **Cumbersome** | Toggle | Downgrade each of that weapon’s dice (if unit moved this activation) |

### 4.2 Defender Panel

#### Unit Preset Dropdowns
Two **searchable dropdowns** at the top of the Defender panel let the user quickly load a pre-configured defense profile:

1. **Faction** — Select: All (default) / Rebel Alliance / Galactic Empire / Republic / Separatist Alliance / Mercenaries. Filters the unit list.
2. **Unit** — Searchable combobox listing units within the selected faction. Typing filters the list in real time. Selecting a unit auto-populates defense die color, surge chart, and relevant keywords. Selecting "Custom" (default) leaves all fields blank.

The user can then adjust Cover, tokens, and other situational settings.

Example presets:
| Faction | Unit | Die | Surge | Keywords |
|---------|------|-----|-------|----------|
| Empire | Stormtroopers | Red | — | |
| Empire | Darth Vader | Red | — | Immune: Pierce, Deflect |
| Rebels | Rebel Troopers | White | e→d | |
| Rebels | Wookiee Warriors | White | e→d | |
| Republic | Clone Troopers | Red | e→d | |
| Separatists | B1 Battle Droids | White | — | |
| Separatists | AAT Tank | Red | — | Armor 2, Shielded 2 |
| *(more added over time)* | | | | |

#### Manual Configuration

| Input | Type | Notes |
|-------|------|-------|
| **Defense die color** | Select: White / Red | Unit card |
| **Defense surge conversion** | Select: None / e→d | Unit card surge chart |
| **Cover** | Select: None / Light / Heavy | Terrain-based |
| **Dodge tokens** | Number spinner (0–5) | Each cancels 1 a |
| **Surge tokens (defense)** | Number spinner (0–5) | Each converts 1 e→d |
| **Suppressed** | Toggle | Improves Cover by 1 (max Cover 2) |
| **Cover X** | Number spinner (0–2) | Unit keyword: increases Cover by X vs Ranged (max Cover 2) |
| **Smoke tokens** | Number spinner (0–3) | Each improves Cover by 1 (max Cover 2) |
| **Minis in LOS** | Number spinner (1–12) | Number of defending miniatures in LOS; used by Spray. Default: 1. Auto-filled from preset. |
| **Armor X** | Number spinner (0–5) | Cancels up to X a results |
| **Weak Point X** | Number spinner (0–5) | Grants attacker Impact X from specified arc |
| **Immune: Pierce** | Toggle | Pierce cannot cancel d results (all attack types) |
| **Immune: Melee Pierce** | Toggle | Pierce cannot cancel d in Melee attacks only |
| **Immune: Blast** | Toggle | Blast has no effect |
| **Impervious** | Toggle | Rolls extra defense dice = total Pierce X |
| **Danger Sense X** | Number spinner (0–7) | +1 defense die per Suppression (up to X) |
| **Suppression tokens (for Danger Sense)** | Number spinner (0–10) | |
| **Uncanny Luck X** | Number spinner (0–3) | Reroll up to X defense dice |
| **Block** | Toggle | When spending Dodge → gains e→d |
| **Deflect** | Toggle | While defending Ranged → gains e→d (+ attacker suffers 1 wound if at least 1 e result). Disabled by High Velocity. |
| **Shien Mastery** | Toggle | Modifies Deflect: attacker suffers 1 wound per e result (instead of 1 total). Requires Deflect. |
| **Outmaneuver** | Toggle | Dodge tokens can cancel b results too |
| **Low Profile** | Toggle | Cover roll: −1 die, +1 auto d |
| **Shielded X (active)** | Number spinner (0–5) | Each can cancel 1 a or b |
| **Djem So Mastery** | Toggle | Melee only: attacker suffers 1 wound if the attack roll contains 1 or more blank results |
| **Soresu Mastery** | Toggle | Reroll all defense dice (Ranged only) |
| **Duelist** | Toggle (with Dodge) | Spends Dodge → gains Immune: Pierce in Melee |
| **Backup** | Toggle | Cancels up to 2 a (Ranged only; defender must be operative/special forces rank; attacker must not be within Range 2) |
| **Guardian X** | Number spinner (0–3) | Nearby unit absorbs up to X hits and rolls defense dice |
| **Guardian die color** | Select: White / Red | The Guardian unit's defense die (shown only when Guardian X > 0) |
| **Guardian surge conversion** | Select: None / e→d | The Guardian unit's surge chart (shown only when Guardian X > 0) |
| **Guardian Deflect** | Toggle | Guardian unit has Deflect (shown only when Guardian X > 0) |
| **Guardian Soresu Mastery** | Toggle | Guardian unit has Soresu Mastery (shown only when Guardian X > 0) |
| **Guardian Dodge tokens** | Number spinner (0–5) | Guardian unit's Dodge tokens for Soresu reroll (shown only when Guardian X > 0) |
| **Hold the Line** | Toggle | While Engaged: gains c→a for attack and e→d for defense |

| **Defender unit cost** | Number spinner (0–999) | Points value; auto-filled from preset, user-editable |

#### Upgrade Slots (shown when a unit preset is selected)
Same pattern as the Attacker panel: one searchable dropdown per upgrade slot in the unit's upgrade bar. Equipping an upgrade adds its cost and any defender-relevant combat keywords (e.g., a Gear upgrade granting a defensive keyword). **Dug In** upgrades are a special case — equipping one causes the defender to roll red defense dice during the Roll Cover step instead of white.

#### Defense Dice Upgrade/Downgrade Keywords
*No common keywords upgrade or downgrade defense die color. Danger Sense and Impervious (above) add extra dice rather than changing die color. The **Dug In** upgrade is a special case — it changes cover dice (not main defense dice) to red during the Roll Cover step. Rare command card effects that upgrade/downgrade defense dice are not modeled in MVP.*

### 4.3 Attack Type

| Input | Type | Notes |
|-------|------|-------|
| **Attack type** | Select: All (default) / Ranged / Melee / Overrun | See behavior below |

**Attack type behavior:**
- **All** (default) — No keywords are restricted. All enabled keywords take effect regardless of attack type (Cover, Dodge, Deflect, Soresu Mastery, Djem So Mastery, Duelist, etc. all apply simultaneously). Use this for a quick general-purpose calculation.
- **Ranged** — Melee-only keywords are ignored: Djem So Mastery, Duelist (Immune: Pierce), Immune: Melee Pierce. Defender may use Cover, Dodge, Deflect, Soresu Mastery.
- **Melee** — Ranged-only keywords are ignored: Cover, Deflect, Soresu Mastery, Backup, Shielded (cancel), High Velocity has no effect. Defender CAN spend Dodge tokens to cancel hits normally. Djem So Mastery and Duelist apply.
- **Overrun** — Neither Ranged nor Melee. Cover and Deflect do not apply and Engaged rules do not apply. Defender CAN still spend Dodge tokens (unless High Velocity). Only 1 attack pool allowed; weapon dice added once regardless of unit size.

---

## 5. Output / Results Panel

All results are computed via Monte Carlo simulation (10,000+ iterations) and displayed together:

### Core Stats
- **Average (mean) wounds** dealt
- **Median wounds**
- **Mode wounds** (most likely outcome)
- **Bar chart** — X-axis: wound count (0, 1, 2, 3, …N), Y-axis: probability (%) of that exact outcome
- **Cumulative probability table** — chance of dealing ≥ X wounds for each X

### Points Efficiency Stats (shown when unit costs are set)
When either the attacker or defender unit cost is greater than 0, the results panel also displays:

- **Wounds per point (attacker)** — average wounds ÷ attacker cost. How efficiently the attacker converts points into damage.
- **Points per wound (attacker)** — attacker cost ÷ average wounds. How many points it costs for each wound dealt.
- **Wounds per point (defender)** — average wounds ÷ defender cost. How much damage the defender absorbs per point invested.
- **Points per wound (defender)** — defender cost ÷ average wounds. The defender's cost efficiency at absorbing damage.
- **Attacker efficiency ratio** — (average wounds ÷ attacker cost) ÷ (defender cost). Normalizes attacker output against what the defender costs — higher = better trade for the attacker.

These metrics help players evaluate whether an attack is a good "points trade" and compare different attacker/defender matchups on a cost basis.

### Future (out of MVP scope)
- **Visual Dice Display**: show rolled dice with face icons in a "Roll Once" mode with step-by-step walkthrough

---

## 6. Application Architecture

```
src/
├── app/                    # App shell, routing, layout
│   ├── App.tsx
│   └── Layout.tsx
├── components/
│   ├── AttackerPanel/      # All attacker inputs
│   ├── DefenderPanel/      # All defender inputs
│   ├── ResultsPanel/       # Output display
│   ├── DiceDisplay/        # Visual dice rendering
│   └── shared/             # NumberSpinner, Toggle, Select, etc.
├── data/
│   ├── types.ts            # UpgradeSlot, RawUnit, ProcessedUnit, ResolvedUnit
│   ├── keywordMap.ts       # Keyword metadata + keyword→store field mapping
│   ├── unitResolver.ts     # Processed + enrichment → ResolvedUnit[]
│   ├── upgradeResolver.ts  # Processed + enrichment → ResolvedUpgrade[]
│   ├── presetGenerator.ts  # ResolvedUnit[] → AttackerPreset[] + DefenderPreset[]
│   ├── presetHelpers.ts    # Preset search/filter API (faction, ID lookup)
│   ├── presets.ts          # Faction enum, preset type interfaces
│   ├── upgradeApplicator.ts # Applies equipped upgrade effects to config
│   ├── raw/                # Raw API snapshots (committed JSON)
│   │   ├── units.json
│   │   ├── keywords.json
│   │   ├── upgrades.json
│   │   └── upgrade-types.json
│   ├── processed/          # Cleaned/mapped data (committed JSON)
│   │   ├── units.json
│   │   ├── upgrades.json
│   │   └── keywords.json
│   ├── enrichment/         # Manual enrichment overlays
│   │   ├── types.ts
│   │   ├── units.ts        # Curated weapon profiles, surge charts, keyword X values
│   │   └── upgrades.ts     # Combat-relevant upgrade keyword data (incl. Dug In special case)
│   └── index.ts            # Data layer barrel export
├── engine/
│   ├── types.ts            # Die faces, dice colors, pool types
│   ├── dice.ts             # Die definitions, roll functions
│   ├── attackSequence.ts   # Full attack sequence logic
│   ├── coverResolver.ts    # Cover pool logic
│   ├── modifiers.ts        # Keyword modifier applications
│   ├── probability.ts      # Exact probability calculations
│   └── simulator.ts        # Monte Carlo simulation runner
├── hooks/
│   ├── useAttackConfig.ts  # Attacker state management
│   ├── useDefenseConfig.ts # Defender state management
│   └── useSimulation.ts    # Simulation execution + results
├── utils/
│   └── math.ts             # Combinatorics helpers
├── public/
│   ├── manifest.webmanifest # PWA manifest (name, icons, theme)
│   ├── icons/               # App icons (192×192, 512×512, maskable)
│   └── favicon.svg
├── scripts/
│   ├── fetchApiData.ts     # Fetch raw API data (developer tool)
│   └── processApiData.ts   # Process raw → processed (developer tool)
└── index.tsx
```

### Key Principles
- **Engine is pure TypeScript** — no React dependencies. Fully testable.
- **State management** via Zustand for shared attacker/defender config.
- **Web Workers** for simulation (10k+ rolls won't block UI).
- **Responsive layout** — works on mobile (stacked panels) and desktop (side-by-side).
- **PWA** — installable on Android/iOS home screens with offline support via service worker.

### PWA Configuration
The app ships as a Progressive Web App using `vite-plugin-pwa`:

- **Web App Manifest** (`manifest.webmanifest`) — app name, short name, theme color, background color, display mode (`standalone`), app icons.
- **Service Worker** (Workbox, auto-generated) — precaches all static assets for full offline functionality. Runtime caching strategy: stale-while-revalidate for any future API calls.
- **Install prompt** — on supported browsers, a subtle "Add to Home Screen" banner or button is shown.
- **Icons** — 192×192 and 512×512 PNG icons, plus a maskable variant for Android adaptive icons.
- **Offline-ready** — the entire app (UI + simulation engine) runs client-side with no network dependency, making it naturally suited for offline use.

This allows users on Android and iOS to install the app to their home screen and use it like a native app, with no app store required. For future App Store / Play Store distribution, Capacitor can wrap the same codebase with minimal additional setup.

---

## 7. Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | React 18+ with TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS or CSS Modules |
| State | Zustand |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |
| PWA | vite-plugin-pwa (Workbox) |
| Deployment | Vercel / Netlify (static site + PWA) |

---

## 8. Keyword Quick-Reference (Dice-Affecting)

The following is a distilled list of every keyword from the rulebook that modifies dice during the attack sequence, organized by when they take effect:

### Form Attack Pool (Step 2)
*(User manually configures the single attack pool — no split fire. Step 3—Declare Additional Defender—is skipped; Arsenal X, Gunslinger, and Beam X are not modeled in MVP.)*

| Keyword | Effect |
|---------|--------|
| **Spray** | Multiply weapon dice by number of defending minis in LOS |
| **Makashi Mastery** | (Step 2b) Attacker reduces Pierce X by 1 → disables Immune: Pierce and Impervious |

### Upgrade/Downgrade Attack Dice (Step 4a)
| Keyword | Effect |
|---------|--------|
| **Anti-Materiel X** | Upgrade X of that weapon's dice vs Vehicles |
| **Anti-Personnel X** | Upgrade X of that weapon's dice vs Troopers |
| **Cumbersome** | Downgrade each of that weapon's dice if unit moved |

### Reroll Attack Dice (Step 4c)
| Keyword | Effect |
|---------|--------|
| **Aim token** | Reroll up to 2 dice per token |
| **Precise X** | +X extra rerolls per Aim token |
| **Observation token** | Reroll 1 die per token (on defender) |
| **Marksman** | Spend Aim to convert: blank→a, a→b (instead of reroll) |
| **Reroll strategy** | Conservative: only reroll blanks/surges. Crit Fishing: also reroll hits (intelligently checks if hits would be cancelled) |

### Convert Attack Surges (Step 4d)
| Keyword | Effect |
|---------|--------|
| **Surge chart (c→a or c→b)** | Unit card |
| **Surge tokens** | Each converts 1 c→a |
| **Critical X** | Convert up to X c→b |
| **Jedi Hunter** | Gains c→b vs Force users |
| **Hold the Line** (attacker) | Gains c→a while Engaged |
| **Jar'Kai Mastery** | Spend Dodge tokens after surges: blank→a, a→b |
| **Marksman** | (also here) Spend Aim: blank→a, a→b |

### Apply Dodge and Cover (Step 5)
| Keyword | Effect |
|---------|--------|
| **Sharpshooter X** | Reduce Cover value by X |
| **Blast** | Defender can't use Cover |
| **High Velocity** | Defender can't spend Dodge tokens; Deflect has no effect |
| **Death From Above** | Defender can't use Cover (height condition) |
| **Low Profile** | Roll 1 fewer cover die, add 1 auto d |
| **Cover X** (unit keyword) | Increases Cover by X vs Ranged |
| **Suppressed** | Improves Cover by 1 |
| **Smoke token** | Improves Cover by 1 per token within 1 |
| **Outmaneuver** | Dodge tokens can also cancel b |
| **Block** | When Dodge spent → gains e→d for that attack |

### Modify Attack Dice (Step 6)
| Keyword | Effect |
|---------|--------|
| **Armor X** | Cancel up to X a results |
| **Impact X** | Convert up to X a→b (only vs Armor) |
| **Shielded X** | Flip active shields to cancel a or b |
| **Backup** | Cancel up to 2 a (conditions apply) |
| **Guardian X** | Cancel up to X a, Guardian unit rolls defense dice separately (wounds tracked for both defender and Guardian) |
| **Primitive** | After Impact, convert all b→a (vs Armor) |
| **Ram X** | Change X results to b (conditions apply) |
| **Ion X** | Flip 1 active shield per a or b result (max X) at start of Modify step, before Armor/Impact/Shielded |
| **Lethal X** | Spend X Aim tokens for Pierce 1 each |

### Upgrade/Downgrade Defense Dice (Step 7b)
| Keyword | Effect |
|---------|--------|
| **Danger Sense X** | +1 defense die per Suppression token (up to X) |
| **Impervious** | +extra defense dice = total Pierce X value |
| *(Generic upgrade/downgrade effects)* | Apply in order |

### Reroll Defense Dice (Step 7d)
| Keyword | Effect |
|---------|--------|
| **Uncanny Luck X** | Reroll up to X defense dice |
| **Soresu Mastery** | Reroll all defense dice (Ranged only) |

### Convert Defense Surges (Step 7e)
| Keyword | Effect |
|---------|--------|
| **Surge chart (e→d)** | Unit card |
| **Surge tokens** | Each converts 1 e→d |
| **Deflect** | Gains e→d vs Ranged (+ attacker suffers 1 wound if at least 1 e result). Disabled by High Velocity. |
| **Shien Mastery** | Modifies Deflect: attacker suffers 1 wound per e result (instead of 1 total) |
| **Hold the Line** (defender) | Gains e→d while Engaged |
| **Block** | When Dodge spent → gains e→d |

### Modify Defense Dice (Step 8)
| Keyword | Effect |
|---------|--------|
| **Pierce X** | Cancel up to X d results |
| **Immune: Pierce** | Pierce cannot cancel d results |
| **Immune: Melee Pierce** | Pierce cannot cancel d in Melee |
| **Immune: Deflect** | Attacker cannot suffer wounds from Deflect/Shien Mastery reflection |
| **Duelist** (defender) | If Dodge spent in Melee → gains Immune: Pierce |
| **Duelist** (attacker) | Melee: if Aim spent during rerolls → attack pool gains Pierce 1 |
| **Djem So Mastery** | Melee only: attacker suffers 1 wound if the attack roll contains 1 or more blank results |

---

## 9. MVP Scope vs. Future Features

### MVP (v1.0)
- Manual dice pool configuration (red/black/white counts)
- All core keywords that affect dice rolls
- Cover (none/light/heavy) + Suppressed cover bonus
- Aim, Dodge, Surge tokens
- Surge conversion charts
- Pierce, Impact, Armor, Critical
- Precise, Lethal, Sharpshooter, Blast, High Velocity
- Danger Sense, Uncanny Luck, Impervious, Deflect, Block, Shien Mastery
- Guardian (basic), Backup, Weak Point
- Spray (weapon keyword) with defender minis-in-LOS input
- Cover X (unit keyword), Smoke tokens
- Immune: Deflect, Death From Above
- Duelist (attacker + defender), Makashi Mastery (attacker)
- Ranged vs Melee toggle
- **Unit preset dropdowns** for quick attacker/defender configuration
- **API-backed unit database** — all ~150+ units imported from TableTopAdmiral API
- **Enriched unit data** — curated subset with full weapon profiles, keyword X values, surge charts
- **Upgrade slot system** — equip upgrades per slot for cost tracking and keyword additions
- Monte Carlo simulation with bar chart + stats
- **PWA support** — installable on Android/iOS, offline-capable
- Responsive UI

### Future (v2.0+)
- **Expanded unit enrichment**: comprehensive weapon profiles for all units, not just the curated subset
- **Wound assignment**: model multi-wound units and wound thresholds
- **Token economy**: model full token flow (Aim/Dodge generation from keywords like Tactical, Agile, Defend, Target, etc.)
- **Standby / Fire Support** scenarios
- **Save/Share**: URL-encodable configs for sharing attack scenarios
- **Theme**: Star Wars visual theme with faction colors
- **Clone Trooper token sharing**: model spending ally's green tokens
- **Guardian sub-sequence**: detailed Guardian wound resolution with Pierce carry-over
- **Multi-target keywords**: Spray (auto-pool expansion), Beam X, Arsenal X, Fire Support
- **Capacitor wrapper**: package as native Android/iOS app for App Store / Play Store distribution

---

## 10. UX Wireframe (Conceptual)

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚔️  Just Roll Crits                              [All ▼]      │
├──────────────────────┬────────────────────┬──────────────────────┤
│   ATTACKER           │     RESULTS        │     DEFENDER         │
│ Faction: [Empire ▼]  │                    │ Faction: [Rebels ▼]  │
│ Unit: [Darth Vader▼] │                    │ Unit: [Reb.Troop. ▼]│
│                      │                    │                      │
│ ─── Upgrades ───     │                    │ ─── Upgrades ───     │
│ Force: [Force Push▼] │                    │ HvyWpn:[Z-6 Troop▼] │
│ Force: [Saber Thr▼]  │                    │ Pers:  [None      ▼] │
│ Force: [Force Ref▼]  │                    │ Gear:  [None      ▼] │
│ Command:[None     ▼] │                    │ Grenad:[Imp.Gren. ▼] │
│ Total: 195 pts       │                    │ Training:[None    ▼]  │
│                      │                    │ Total: 57 pts        │
│ ─── Dice Pool ───    │  Mean: 3.21        │                      │
│ 🔴 Red dice:  [6]   │  Median: 3         │ ─── Defense ───      │
│ ⚫ Black dice: [0]   │  Mode: 3           │ Defense: [White ▼]   │
│ ⚪ White dice: [0]   │                    │ Surge:  [e→d ▼]     │
│ Surge: [c→b ▼]     │  ┌──────────────┐  │ Minis in LOS:  [5]  │
│                      │  │  ▌           │  │                      │
│ ─── Tokens ───       │  │  █▌          │  │ ─── Cover ───       │
│ Aim tokens:   [1]   │  │  ██          │  │ Cover: [Heavy ▼]    │
│ Surge tokens: [0]   │  │  ███▌        │  │ Cover X:       [0]  │
│ Observation:  [0]   │  │  █████       │  │ Smoke tokens:  [0]  │
│                      │  │  ███▌        │  │ Suppressed:       □ │
│                      │  │  ██          │  │                      │
│ ─── Keywords ───     │  │  █▌          │  │ ─── Tokens ───      │
│ Precise:      [0]    │  │  ▌           │  │ Dodge tokens:  [1]  │
│ Critical:     [0]    │  └──────────────┘  │ Surge tokens:  [0]  │
│ Pierce:       [3]    │  0 1 2 3 4 5 6 7   │                      │
│ Impact:       [3]    │                    │ ─── Keywords ───     │
│ Sharpshooter: [0]    │  P(≥1W): 94.2%    │ Armor:         [0]  │
│ Lethal:       [0]    │  P(≥2W): 78.1%    │ Weak Point:    [0]  │
│ Ram:          [0]    │  P(≥3W): 51.3%    │ Imm.Pierce:       □ │
│ Blast:           □   │  P(≥4W): 24.7%    │ Imm.Melee P:      □ │
│ High Velocity:   □   │  P(≥5W):  8.1%    │ Imm.Blast:        □ │
│ Marksman:        □   │                    │ Impervious:       □ │
│ Jar'Kai Mast:    □   │                    │ Danger Sense:  [0]  │
│ Jedi Hunter:     □   │                    │ Uncanny Luck:  [0]  │
│ Spray:           □   │                    │ Deflect:          □ │
│ Duelist (atk):   □   │                    │ Shien Mast:       □ │
│ Makashi Mast:    □   │                    │ Block:            □ │
│ Death From Above:□   │                    │ Outmaneuver:      □ │
│ Imm.Deflect:     □   │                    │ Low Profile:      □ │
│ Hold the Line:   □   │                    │ Shielded:      [0]  │
│ ─── Dice Mods ───    │                    │ Soresu Mast:      □ │
│ Anti-Mat:     [0]    │                    │ Djem So Mast:     □ │
│ Anti-Per:     [0]    │                    │ Duelist (def):    □ │
│ Cumbersome:      □   │                    │ Backup:           □ │
│                      │                    │ Hold the Line:    □ │
│                      │                    │ Guardian:      [0]  │
└──────────────────────┴────────────────────┴──────────────────────┘
```

---

## 11. Summary

This application faithfully models the Star Wars: Legion attack sequence from Form Attack Pool through Compare Results. Every keyword that modifies dice — whether upgrading, downgrading, rerolling, converting, or canceling — is accounted for in the design. The engine is a pure TypeScript module fully decoupled from UI, enabling both exact probability math and Monte Carlo simulation. The React UI presents attacker and defender as two input panels with a central results display, making it intuitive for players to quickly test "what if" scenarios.
