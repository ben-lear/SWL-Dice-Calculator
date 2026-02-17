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
The attack pool is formed from one or more **weapons**, each contributing its own dice and weapon keywords. Each **miniature** in a unit contributes exactly one eligible weapon to the pool.

**Multi-miniature units** (trooper squads): Each mini independently contributes one weapon entry to the `weapons[]` array. A 4-miniature Stormtrooper squad produces 4× E-11 entries. Keyword values are additive across all entries — 4× Impact 1 = Impact 4 in the aggregated pool. This is the natural result of the engine iterating all weapon entries.

**Single-miniature units** (heroes, vehicles, operatives): One mini contributes one weapon (or multiple weapons with Arsenal X). In **Custom Pool mode**, the user defines a single weapon with all dice and keywords. In **Unit Builder mode**, the user selects from the unit's weapon options.

**Upgrade effects on the weapon pool:**
- **Heavy Weapon upgrade**: Adds a miniature (the heavy weapon specialist) that contributes the heavy weapon to the pool alongside base minis. A 4-mini Stormtrooper squad with a DLT-19 becomes 5 minis total: 4× E-11 + 1× DLT-19.
- **Personnel upgrade**: Adds additional miniature(s) to the unit, each contributing their own weapon to the pool. Noncombatant personnel (medical droids, astromechs) add a miniature for model/wound count purposes but do NOT contribute a weapon.
- **Squad Leader upgrade**: Adds a miniature (the squad leader) that contributes its weapon to the pool.
- **Grenade upgrade**: Adds exactly one grenade weapon entry to the pool per grenade instance, regardless of unit size (rules: "only one miniature in the unit may add a grenade weapon"). A unit may equip multiple different grenade upgrades — each contributes its weapon once independently.
- **Sidearm weapons**: Sidearm is enforced per-miniature. When the sidearm type matches the current attack type, that miniature must use its sidearm weapon; when not enforced, that miniature may use any compatible weapon available to it.
- **Dynamic upgrade slots**: Some upgrades add additional upgrade slots to the unit when equipped (e.g., Agent Kallus adds a Heavy Weapon slot; Stormtrooper Captain adds a Training slot). The UI dynamically updates the available upgrade slots as selections change.

Per-weapon keywords (Spray, Cumbersome, Anti-Materiel X, Anti-Personnel X) are applied to each weapon's dice individually during pool formation. Pool-level weapon keywords (Impact X, Pierce X, Lethal X, Critical X, Ram X, Blast, High Velocity, Suppressive) are aggregated across all weapons for use in later steps.

- **Spray** multiplies only the Spray weapon's dice by the number of defending miniatures in LOS — it does NOT multiply the entire pool.
- **High Velocity** requires ALL weapons in the pool to have it; if any weapon lacks it, the defender can spend Dodge tokens.
- **Blast** and **Suppressive** apply if ANY weapon in the pool has them.
- Numeric weapon keywords (**Impact X**, **Pierce X**, **Lethal X**, **Critical X**, **Ram X**) are **summed** across all weapons.

- **2b. Choose Weapons and Gather Dice** — Makashi Mastery (attacker) may reduce Pierce X by 1 here to disable Immune: Pierce and Impervious for the attack.

**Arsenal X simplification:** No unit in the game simultaneously has Arsenal X and multiple miniatures. All Arsenal X units are single-figure vehicles or heroes. This eliminates the need for per-miniature multi-weapon selection.

**Counterpart (deferred):** Counterpart upgrade cards (C-3PO, Grogu, ID10 Seeker Droid, Omega) add a miniature that may only use weapons from its own card. Full counterpart support is deferred to a future release.

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

The UI is divided into two main columns — **Attacker** and **Defender** — with a central results area. Both panels support two operating modes.

### 4.0 Two-Mode Design

Both the Attacker and Defender panels support two modes, selectable via a **segmented control** (inline button group) at the top of each panel:

- **Custom Pool** (default) — The user manually builds a single attack pool (attacker) or defense configuration (defender) by setting dice counts and all keywords directly. This is the simple, fast-configuration mode for quick calculations.

- **Unit Builder** — The user selects a unit from preset data, equips upgrades, and the app auto-populates dice, surge chart, and keywords. On the attacker side, the user can choose which weapon(s) contribute to the attack pool. On the defender side, situational settings (Cover, tokens, Guardian) remain user-editable.

Both modes produce the same engine input structures: `AttackerConfig` with `weapons: WeaponProfile[]` for the attacker, and `DefenderConfig` (flat fields) for the defender.

**Custom Pool mode hides unit preset controls.** When a panel is in Custom Pool mode, the Faction dropdown and Unit/Weapon searchable combobox are hidden — the user is manually building a pool, not selecting a preset. Switching to Unit Builder mode reveals these controls. Store state (`selectedFaction`, `selectedPresetId`) persists across mode changes.

### 4.1 Attacker Panel — Custom Pool Mode

In Custom Pool mode, the user configures a single flat dice pool and all keywords. This maps to `weapons: [singleWeapon]` in the engine. Weapon keywords and unit keywords are shown together for simplicity — the engine handles the separation internally.

#### Manual Configuration

##### Dice Pool (maps to `weapons[0]`)

| Input | Type | Notes |
|-------|------|-------|
| **Red attack dice** | Number spinner (0–12) | |
| **Black attack dice** | Number spinner (0–12) | |
| **White attack dice** | Number spinner (0–12) | |

##### Unit Settings

| Input | Type | Notes |
|-------|------|-------|
| **Attack surge conversion** | Segmented: None / c→a / c→b | Unit card surge chart |
| **Aim tokens** | Number spinner (0–5) | Each rerolls up to 2 dice |
| **Surge tokens (attack)** | Number spinner (0–5) | Each converts 1 c→a |
| **Observation tokens** | Number spinner (0–5) | Each rerolls 1 die |
| **Dodge tokens (attacker)** | Number spinner (0–5) | For Jar'Kai Mastery; each converts blank→hit or hit→crit (shown only when Jar'Kai Mastery is enabled) |

##### Unit Keywords

| Input | Type | Notes |
|-------|------|-------|
| **Precise X** | Number spinner (0–3) | Extra rerolls per Aim |
| **Sharpshooter X** | Number spinner (0–3) | Reduces defender's Cover value |
| **Marksman** | Toggle | Aim tokens convert blanks→a or a→b |
| **Marksman strategy** | Select: Deterministic / Averages | Choose when to use Marksman (shown only when Marksman is enabled) |
| **Reroll strategy** | Select: Conservative / Crit Fishing | Conservative (default): reroll blanks and excess surges only. Crit Fishing: also reroll hits to fish for crits |
| **Jar'Kai Mastery** | Toggle | Melee: spend attacker Dodge tokens for blank→hit, hit→crit conversions after surge step |
| **Jedi Hunter** | Toggle | Gains c→b |
| **Duelist** (attacker) | Toggle | Melee: spend Aim → attack pool gains Pierce 1 |
| **Makashi Mastery** | Toggle | Melee: reduce Pierce X by 1 at Step 2b → disables Immune: Pierce and Impervious for the attack |
| **Immune: Deflect** | Toggle | Attacker cannot suffer wounds from Deflect/Shien Mastery reflection |
| **Death From Above** | Toggle | Defender can't use Cover (height advantage condition) |
| **Hold the Line** | Toggle | While Engaged: gains c→a for attack and e→d for defense |

##### Weapon Keywords (maps to `weapons[0].keywords`)

| Input | Type | Notes |
|-------|------|-------|
| **Critical X** | Number spinner (0–5) | Converts up to X c→b |
| **Lethal X** | Number spinner (0–3) | Spend Aim for Pierce instead of reroll |
| **Pierce X** | Number spinner (0–5) | Cancels d results |
| **Impact X** | Number spinner (0–5) | Converts a→b vs Armor |
| **Ram X** | Number spinner (0–3) | Changes results to b |
| **Blast** | Toggle | Defender ignores Cover |
| **High Velocity** | Toggle | Defender can't spend Dodge tokens; Deflect has no effect |
| **Suppressive** | Toggle | +1 extra Suppression (informational) |
| **Spray** | Toggle | Weapon dice are multiplied by number of defending minis in LOS |
| **Sidearm: Melee** | Toggle | Weapon can only be used in Melee attack pools |
| **Sidearm: Ranged** | Toggle | Weapon can only be used in Ranged attack pools |

##### Dice Upgrade/Downgrade (maps to `weapons[0].keywords`)

| Input | Type | Notes |
|-------|------|-------|
| **Anti-Materiel X** | Number spinner (0–3) | Upgrade X of weapon's dice (vs Vehicles only) |
| **Anti-Personnel X** | Number spinner (0–3) | Upgrade X of weapon's dice (vs Troopers only) |
| **Cumbersome** | Toggle | Downgrade each of that weapon's dice (if unit moved this activation) |

##### Points

| Input | Type | Notes |
|-------|------|-------|
| **Attacker unit cost** | Number spinner (0–999) | Points value; user-editable |

### 4.1b Attacker Panel — Unit Builder Mode

In Unit Builder mode, the user selects a unit preset and configures its weapon loadout. This produces a multi-weapon `weapons[]` array where each miniature contributes one weapon entry.

#### Unit Preset Dropdowns
Two **searchable dropdowns** at the top:

1. **Faction** — Select: All (default) / Rebel Alliance / Galactic Empire / Republic / Separatist Alliance / Mercenaries.
2. **Unit** — Searchable combobox listing units within the selected faction. Selecting a unit auto-populates unit keywords, surge chart, and the weapon pool with per-miniature weapon entries.

#### Weapon Assignment Panel (Multi-Mini Units)
For multi-miniature units (trooper squads), the panel displays a **per-miniature weapon assignment view**. Each miniature is shown as a row with its weapon contribution:

- **Base miniature rows** (1 to `baseMiniatureCount`): Show the unit's default weapon with dice and keyword badges. If the unit has multiple weapon options for the current attack type, a dropdown allows choosing between them.
- **Heavy Weapon row**: Shown when a heavy weapon upgrade is equipped. Labeled with ◆ indicator, locked to the heavy weapon's profile. Adds an additional miniature beyond the base count (does NOT replace a base mini).
- **Squad Leader row**: Shown when a squad leader upgrade is equipped. Labeled with ★ indicator, locked to the squad leader's weapon profile. Adds an additional miniature beyond the base count.
- **Personnel row(s)**: Shown when a personnel upgrade is equipped. Adds additional miniature rows with the personnel's weapon.
- **Noncombatant row**: Shown when a noncombatant personnel upgrade is equipped (medical droids, astromechs). Grayed out — noncombatant miniatures cannot contribute weapons to the attack pool.
- **Grenade row**: Shown when a grenade upgrade is equipped. Separate from miniature rows, with a "1 per pool" constraint indicator.
- **Pool summary**: Aggregated dice totals by color and stacked keywords across all contributing weapons.

#### Weapon Selection (Single-Mini Units)
For single-miniature units (heroes, vehicles, operatives), the panel shows the unit's available weapons. Each weapon shows weapon name, dice profile, and keyword tags. Multiple weapons can be included per Arsenal X rules. The combined pool and aggregated weapon keywords are computed automatically.

If Spray is on a weapon, dice are auto-multiplied by Minis in LOS from the defender panel.

#### Upgrade Slots
When a unit is selected, upgrade slots appear as searchable dropdowns based on the unit's **effective upgrade bar** (base upgrade bar + any slots added dynamically by equipped upgrades). Equipping an upgrade adds its cost and keywords. If an upgrade adds additional upgrade slots (e.g., Agent Kallus adds a Heavy Weapon slot), the UI immediately shows new dropdowns for those slots. Unequipping such an upgrade cascades: any upgrade in the dynamically-added slot is also unequipped.

#### Unit Keywords (auto-populated, manually adjustable)
Unit-level keywords (Precise X, Marksman, Sharpshooter X, etc.) are auto-populated from the preset but remain editable.

Example presets:
| Faction | Unit / Weapon | Dice | Keywords |
|---------|---------------|------|----------|
| Empire | Commander Darth Vader (Lightsaber) | 6 Red | Impact 3, Pierce 3, c→b |
| Empire | Stormtroopers (DLT-19) | 4 White + 1 Red | Precise 1, c→blank |
| Empire | Shore Troopers (T-21B) | 4 White + 1 Red | Precise 1, c→a |
| Rebels | Luke Skywalker (Lightsaber) | 6 Red | Impact 2, Pierce 2, c→b |
| Separatists | B1 Battle Droids (E-5s) | 5 White | c→blank |
| *(more added over time)* | | | |

### 4.2 Defender Panel — Two-Mode Design

The Defender panel supports two modes, selectable via a toggle/tab at the top of the panel (mirroring the Attacker panel design):

- **Custom Pool** (default) — The user manually configures all defense settings: die color, surge chart, cover, tokens, and keywords directly. This is the simple, fast-configuration mode for quick calculations. All fields are editable.

- **Unit Builder** — The user selects a unit from preset data, which auto-populates defense die color, surge chart, and unit keywords (Armor, Danger Sense, Deflect, etc.). Upgrades can be equipped from the unit's upgrade bar. Situational settings (Cover type, Dodge tokens, Suppressed, Guardian configuration) remain user-editable since they depend on battlefield conditions.

Both modes write to the same underlying `DefenderConfig` structure (flat fields, no nested arrays).

#### 4.2a Defender Panel — Custom Pool Mode

In Custom Pool mode, the user manually sets all fields. This is the existing interface with a mode toggle added.

Example presets (available in Unit Builder mode):
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

##### Manual Configuration

| Input | Type | Notes |
|-------|------|-------|
| **Disable defense dice** | Toggle | When enabled, defender rolls 0 defense dice (shows attack results before any defense is applied) |
| **Defense die color** | Segmented: White / Red | Unit card |
| **Defense surge conversion** | Segmented: None / e→d | Unit card surge chart |
| **Cover** | Segmented: None / Light / Heavy | Terrain-based |
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

| **Defender unit cost** | Number spinner (0–999) | Points value; user-editable |

#### 4.2b Defender Panel — Unit Builder Mode

In Unit Builder mode, the user selects a unit preset and configures its defense profile. This produces a fully populated `DefenderConfig` with unit keywords and upgrade effects applied.

##### Unit Preset Dropdowns
Two **searchable dropdowns** at the top:

1. **Faction** — Select: All (default) / Rebel Alliance / Galactic Empire / Republic / Separatist Alliance / Mercenaries.
2. **Unit** — Searchable combobox listing units within the selected faction. Selecting a unit auto-populates defense die color, surge chart, and unit keywords.

##### Upgrade Slots
When a unit is selected, upgrade slots appear as searchable dropdowns (one per slot in the unit's upgrade bar). Equipping an upgrade adds its cost and any defender-relevant combat keywords (e.g., a Gear upgrade granting Armor or a defensive keyword). **Dug In** upgrades are a special case — equipping one causes the defender to roll red defense dice during the Roll Cover step instead of white.

##### Unit Keywords (auto-populated, manually adjustable)
Unit-level keywords (Armor X, Danger Sense X, Deflect, Impervious, etc.) are auto-populated from the preset but remain editable. This allows users to model units that have lost keywords due to wounds or other effects.

##### Situational Inputs (always editable)
Even in Unit Builder mode, the user must set situational battlefield conditions:
- **Cover** — Cover type (None/Light/Heavy), Cover X, Smoke tokens, Suppressed
- **Tokens** — Dodge tokens, Surge tokens, Suppression tokens (for Danger Sense)
- **Guardian** — Guardian X and Guardian unit configuration (die color, surge chart, keywords)
- **Shielded active count** — If the unit has Shielded X, how many shields are currently active

### 4.3 Attack Type

| Input | Type | Notes |
|-------|------|-------|
| **Attack type** | Segmented: Ranged (default) / Melee / Overrun | See behavior below |

**Attack type behavior:**
- **Ranged** (default) — Melee-only keywords are ignored: Djem So Mastery, Duelist (Immune: Pierce), Immune: Melee Pierce. Defender may use Cover, Dodge, Deflect, Soresu Mastery.
- **Melee** — Ranged-only keywords are ignored: Cover, Deflect, Soresu Mastery, Backup, Shielded (cancel), Guardian, Low Profile, High Velocity has no effect. Defender CAN spend Dodge tokens to cancel hits normally. Djem So Mastery and Duelist apply.
- **Overrun** — Neither Ranged nor Melee. Cover, Deflect, Guardian, Low Profile, Soresu Mastery, and Hold the Line do not apply and Engaged rules do not apply. Defender CAN still spend Dodge tokens (unless High Velocity). Only 1 attack pool allowed; weapon dice added once regardless of unit size.

---

## 5. Output / Results Panel

Simulation is **user-triggered** — the user clicks a **"Run Simulation"** button in the Results Panel to execute a Monte Carlo run (10,000+ iterations). Results are NOT auto-computed on every config change.

### Simulation Trigger
- A prominent **"Run Simulation"** / **"Add Simulation"** button at the top of the Results Panel dispatches to the Web Worker.
- The button is disabled while a simulation is in progress (shows "Simulating..." with spinner).
- When no simulation has been run yet, an **empty state** prompts: *"Configure your attack and defense, then click Run Simulation to see results."*

### Multi-Result Comparison (up to 4 slots)

Every click of the Run/Add button **appends** a new result slot (up to 4 maximum). All saved results are displayed simultaneously for side-by-side comparison:

- **Button label transitions:** "Run Simulation" (0 results) → "Add Simulation" (1–3 results) → disabled at 4 with hint "Remove a result to run another."
- Each result is assigned a **color** from a fixed 4-color palette (indigo, emerald, amber, rose) and an **auto-label** ("Sim 1", "Sim 2"…) with optional user rename.
- A **slot selector** row of color-coded chips lets the user:
  - Click a chip to **view** that result's detail stats (CoreStats, SecondaryStats, Efficiency).
  - Double-click a chip label to **rename** it.
  - Click **×** on a chip to **remove** that result from the comparison.

### Chart & Table Comparison
- **Wound Distribution Chart** — grouped/side-by-side color-coded bars at each wound count, one bar group per saved result. Tooltip shows all series values.
- **Cumulative Probability Table** — one P(≥X) column per saved result, with color-coded headers.
- Single-result display is visually identical to pre-comparison design.

### Tabbed Detail Stats
- **Core Stats (Mean / Median / Mode)**, **Secondary Stats**, and **Efficiency** are shown for **one result at a time**, controlled by the slot selector. A color accent on the stat cards links them to the corresponding chart series.

### Stale Results Indicator
- When the user changes any config value after a simulation has completed, existing results are **preserved** but marked as **stale** with a subtle amber banner: *"⚠ Config changed — results may be outdated. Click Run to update."*
- Re-running the simulation clears the stale indicator.
- This preserves the last results for reference while signaling they don't reflect current config.

### Reset All
- A **"Reset All"** button clears all result slots AND resets all form stores (attacker, defender, attack type) to factory defaults.
- A 2-second confirmation guard prevents accidental data loss: first click changes the button to "Confirm Reset?" (red), requiring a second click to execute.

### Core Stats
All results are computed via Monte Carlo simulation and displayed together:
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
│   ├── ResultsPanel/       # Output display (Run button, stale indicator, stats/charts)
│   ├── DiceDisplay/        # Visual dice rendering
│   └── shared/             # NumberSpinner, Toggle, Select, SegmentedControl, etc.
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
*(In Custom Pool mode, the user manually configures a single-weapon attack pool. In Unit Builder mode, each miniature contributes one weapon entry to the pool — multi-mini units produce multiple weapon entries with additive keyword stacking. Step 3—Declare Additional Defender—is skipped; Arsenal X, Gunslinger, and Beam X are not modeled in MVP.)*

**Multi-mini weapon contribution:** Each miniature independently adds one weapon entry to `weapons[]`. 4× E-11 (Impact 1) = Impact 4 in the aggregated pool. Heavy Weapon, Personnel, and Squad Leader upgrades each add additional miniature(s) (and their weapon entries) beyond the base count. Grenades add exactly 1 entry per pool.

**Per-weapon keyword handling:** Spray multiplies only that weapon's dice. Cumbersome, Anti-Materiel X, and Anti-Personnel X apply per-weapon during pool formation. Pool-level keywords (Impact X, Pierce X, etc.) are summed across all weapons. High Velocity requires ALL weapons to have it. Blast and Suppressive apply if ANY weapon has them.

**Sidearm handling:** Sidearm is applied per-miniature during weapon selection. It is not a global pool filter. The sidearm miniature is restricted only when the sidearm type matches the current attack type; otherwise it can use other compatible weapons.

**Noncombatant:** Miniatures with Noncombatant (e.g., medical droids) do not contribute weapons to the pool.

**Grenade restriction:** Only one miniature in the unit may add a grenade weapon to the attack pool per attack. Each grenade upgrade contributes independently — a unit with multiple different grenade upgrades adds one entry per grenade instance.

| Keyword | Effect |
|---------|--------|
| **Spray** | Multiply weapon dice by number of defending minis in LOS |
| **Makashi Mastery** | (Step 2b) Attacker reduces Pierce X by 1 → disables Immune: Pierce and Impervious |
| **Sidearm: Melee** | In melee attacks, that miniature can only add melee sidearm weapons from its upgrade card |
| **Sidearm: Ranged** | In ranged attacks, that miniature can only add ranged sidearm weapons from its upgrade card |
| **Noncombatant** | Miniature cannot add weapons to the attack pool |

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
- **Two-mode attacker panel:** Custom Pool (manual single-weapon config) and Unit Builder (preset-based multi-weapon config)
- **Per-weapon keyword engine:** weapons array with per-weapon Spray, aggregated pool-level keywords (Impact, Pierce, Blast, etc.)
- **Multi-miniature attack pools:** Each miniature contributes one weapon entry to `weapons[]`; keyword values stack additively across entries (4× Impact 1 = Impact 4)
- **Upgrade weapon effects:** Heavy weapon / personnel / squad leader add (each adds miniature(s) with their weapon), grenade dedup (1 per pool), per-mini sidearm handling, noncombatant exclusion, dynamic upgrade slots (`addsUpgradeSlot`)
- **Per-miniature weapon assignment UI:** Unit Builder mode shows per-mini weapon rows with pool summary for multi-mini units
- Manual dice pool configuration (red/black/white counts) in Custom Pool mode
- All core keywords that affect dice rolls (classified as unit vs weapon keywords)
- Cover (none/light/heavy) + Suppressed cover bonus
- Aim, Dodge, Surge tokens
- Surge conversion charts
- Pierce, Impact, Armor, Critical
- Precise, Lethal, Sharpshooter, Blast, High Velocity
- Danger Sense, Uncanny Luck, Impervious, Deflect, Block, Shien Mastery
- Guardian (basic), Backup, Weak Point
- Spray (weapon keyword) with correct per-weapon dice multiplication
- Cover X (unit keyword), Smoke tokens
- Immune: Deflect, Death From Above
- Duelist (attacker + defender), Makashi Mastery (attacker)
- Sidearm: Melee / Sidearm: Ranged (per-miniature weapon restriction during matching attack type)
- Ranged vs Melee toggle
- **Unit preset dropdowns** for quick attacker/defender configuration (Unit Builder mode)
- **API-backed unit database** — all ~150+ units imported from TableTopAdmiral API
- **Enriched unit data** — curated subset with full weapon profiles, keyword X values, surge charts, miniature counts
- **Upgrade slot system** — equip upgrades per slot for cost tracking, keyword additions, and weapon pool manipulation
- Monte Carlo simulation with bar chart + stats
- **PWA support** — installable on Android/iOS, offline-capable
- Responsive UI

### Future (v2.0+)
- **Expanded unit enrichment**: comprehensive weapon profiles for all units, not just the curated subset
- **Counterpart support**: Counterpart upgrade cards (C-3PO, Grogu, ID10, Omega) — weapon-locked miniatures with separate defeat tracking
- **Wound assignment**: model multi-wound units and wound thresholds
- **Token economy**: model full token flow (Aim/Dodge generation from keywords like Tactical, Agile, Defend, Target, etc.)
- **Standby / Fire Support** scenarios
- **Save/Share**: URL-encodable configs for sharing attack scenarios
- **Theme**: Star Wars visual theme with faction colors
- **Clone Trooper token sharing**: model spending ally's green tokens
- **Guardian sub-sequence**: detailed Guardian wound resolution with Pierce carry-over
- **Multi-target keywords**: Beam X, Arsenal X (split fire), Fire Support
- **Capacitor wrapper**: package as native Android/iOS app for App Store / Play Store distribution

---

## 10. UX Wireframe (Conceptual)

Detailed wireframes for both Custom Pool mode and Unit Builder mode are in `plans/wireframe-two-modes.md`.

> **Phase 7.1 note:** The conceptual wireframe below shows a Unit Builder layout. In Custom Pool mode, the Faction/Unit dropdowns and Upgrades section are hidden. Attack Type, Mode toggles, Surge, Defense Die Color, and Cover Type are rendered as segmented controls (inline button groups), not dropdowns. The Results Panel uses an imperative "Run Simulation" button with stale-result indicators.

> **Phase 7.2 note:** The Results Panel supports up to 4 simultaneous result slots. Each Run/Add appends a new color-coded result. The chart shows grouped bars per result, the cumulative table adds a column per result, and stat cards switch via slot chip tabs. A "Reset All" button clears all results and form data.

High-level layout (Unit Builder mode shown, with two result slots):

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚔️  Just Roll Crits              [Ranged] [Melee] [Overrun]   │
├──────────────────────┬────────────────────┬──────────────────────┤
│   ATTACKER           │     RESULTS        │     DEFENDER         │
│ [Custom][Unit Builder]│                    │ [Custom][Unit Builder]│
│ Faction: [Empire ▼]  │ [Add Simulation]   │ Faction: [Rebels ▼]  │
│ Unit: [Darth Vader▼] │       [Reset All]  │ Unit: [Reb.Troop. ▼]│
│                      │                    │                      │
│ ─── Upgrades ───     │ ⚠ Config changed — │ ─── Upgrades ───     │
│ Force: [Force Push▼] │ results may be     │ HvyWpn:[Z-6 Troop▼] │
│ Force: [Saber Thr▼]  │ outdated.          │ Pers:  [None      ▼] │
│ Force: [Force Ref▼]  │                    │ Gear:  [None      ▼] │
│ Command:[None     ▼] │ [● Sim 1 ×]       │ Grenad:[Imp.Gren. ▼] │
│ Total: 195 pts       │ [● Sim 2 ×]       │ Training:[None    ▼]  │
│                      │                    │ Total: 57 pts        │
│ ─── Dice Pool ───    │                    │                      │
│ 🔴 Red dice:  [6]   │  ┌──────────────┐  │ ─── Defense ───      │
│ ⚫ Black dice: [0]   │  │ ▌▌ █▌ ██ ███│  │ Die: [White] [Red]   │
│ ⚪ White dice: [0]   │  │ (grouped bars│  │ Surge: [None] [e→d] │
│ Surge [None][c→a]   │  │  per result) │  │ Minis in LOS:  [5]  │
│       [c→b]         │  └──────────────┘  │                      │
│ ─── Tokens ───       │  0 1 2 3 4 5 6 7  │ ─── Cover ───       │
│ Aim tokens:   [1]   │                    │ [None][Light][Heavy] │
│ Surge tokens: [0]   │  Wounds│●Sim1│●Sim2│ Cover X:       [0]  │
│ Observation:  [0]   │  ≥ 1   │94.2%│87.3%│ Smoke tokens:  [0]  │
│                      │  ≥ 2   │78.1%│64.5%│ Suppressed:       □ │
│                      │  ≥ 3   │51.3%│42.1%│                      │
│                      │                    │ ─── Tokens ───      │
│ ─── Keywords ───     │ ── Sim 1 (viewed) ─│ Dodge tokens:  [1]  │
│ Precise:      [0]    │  Mean: 3.21        │ Surge tokens:  [0]  │
│ Critical:     [0]    │  Median: 3         │                      │
│ Pierce:       [3]    │  Mode: 3           │ ─── Keywords ───     │
│ Impact:       [3]    │                    │ Armor:         [0]  │
│ Sharpshooter: [0]    │  10,000 sims · 42ms│ Weak Point:    [0]  │
│ Lethal:       [0]    │                    │ Imm.Pierce:       □ │
│ Ram:          [0]    │                    │ Imm.Melee P:      □ │
│ Blast:           □   │                    │ Imm.Blast:        □ │
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

This application faithfully models the Star Wars: Legion attack sequence from Form Attack Pool through Compare Results. Every keyword that modifies dice — whether upgrading, downgrading, rerolling, converting, or canceling — is accounted for in the design. The engine separates unit keywords from weapon keywords and supports multi-weapon attack pools where per-weapon effects (like Spray) apply correctly to individual weapons' dice.

The React UI presents two modes: **Custom Pool** for quick manual calculations, and **Unit Builder** for preset-based unit configuration with accurate per-miniature weapon modeling. Multi-miniature units produce attack pools with per-mini weapon entries and additive keyword stacking. Upgrade effects (heavy weapons, personnel, squad leaders, grenades, sidearm) modify the weapon pool according to game rules — heavy weapons, personnel, and squad leaders each add miniatures with their own weapon contribution, and sidearm is applied as a per-miniature restriction rather than a global filter. Some upgrades dynamically add upgrade slots to the unit. Both modes feed the same pure TypeScript engine, which supports both exact probability math and Monte Carlo simulation.
