# Two-Mode Attacker Panel — Wireframes

This document provides detailed ASCII wireframes for both operating modes of the Attacker Panel. Both modes write to the same `weapons: WeaponProfile[]` array in the Zustand store — the engine doesn't distinguish between them.

---

## Mode Toggle

A segmented control at the very top of the Attacker Panel switches between modes:

```
┌──────────────────────────────┐
│  [Custom Pool] [Unit Builder]│
└──────────────────────────────┘
```

- **Custom Pool** is the default (active on first load)
- The toggle sets `store.activeMode` to `'custom'` or `'unit-builder'`
- Switching modes does NOT reset the current configuration — the user can toggle back and forth
- Both modes share the same underlying `weapons[]` state

---

## Custom Pool Mode

The "power user" mode. The user manually configures a single weapon's dice pool and keywords. Equivalent to the original flat-field design but operating on `weapons[0]`.

Keywords are split into two sections:
- **Weapon Keywords** — per-weapon keywords stored on `weapons[0].keywords` (Pierce, Impact, Blast, etc.)
- **Unit Keywords** — unit-level keywords stored flat on the store (Precise, Marksman, Sharpshooter, etc.)

```
┌──────────────────────────────────────┐
│  ⚔️  Just Roll Crits   [Ranged ▼]   │
├──────────────────────────────────────┤
│  ATTACKER                            │
│  [Custom Pool] [Unit Builder]        │
│                                      │
│  ─── Dice Pool ──────────────────    │
│  🔴 Red dice:      [0]  ◀ ─ ▶      │
│  ⚫ Black dice:     [0]  ◀ ─ ▶      │
│  ⚪ White dice:     [0]  ◀ ─ ▶      │
│  Surge chart:   [None ▼]            │
│                                      │
│  ─── Tokens ─────────────────────    │
│  Aim tokens:        [0]  ◀ ─ ▶      │
│  Surge tokens:      [0]  ◀ ─ ▶      │
│  Observation:       [0]  ◀ ─ ▶      │
│                                      │
│  ─── Weapon Keywords ────────────    │
│  (These apply to the weapon's dice)  │
│  Critical:          [0]  ◀ ─ ▶      │
│  Pierce:            [0]  ◀ ─ ▶      │
│  Impact:            [0]  ◀ ─ ▶      │
│  Ram:               [0]  ◀ ─ ▶      │
│  Lethal:            [0]  ◀ ─ ▶      │
│  Blast:                □             │
│  High Velocity:        □             │
│  Suppressive:          □             │
│  Spray:                □             │
│  Cumbersome:           □             │
│  Anti-Materiel:     [0]  ◀ ─ ▶      │
│  Anti-Personnel:    [0]  ◀ ─ ▶      │
│                                      │
│  ─── Unit Keywords ──────────────    │
│  (These apply to the whole unit)     │
│  Precise:           [0]  ◀ ─ ▶      │
│  Sharpshooter:      [0]  ◀ ─ ▶      │
│  Marksman:             □             │
│  ├ Strategy:  [Deterministic ▼]      │
│  Jar'Kai Mastery:      □             │
│  ├ Dodge tokens:    [0]  ◀ ─ ▶      │
│  Jedi Hunter:          □             │
│  Duelist (attack):     □             │
│  Makashi Mastery:      □             │
│  Death From Above:     □             │
│  Immune: Deflect:      □             │
│  Hold the Line:        □             │
│                                      │
│  ─── Reroll Strategy ────────────    │
│  Strategy: [Conservative ▼]         │
│                                      │
│  ─── Points ─────────────────────    │
│  Unit cost:       [  0] pts          │
│                                      │
└──────────────────────────────────────┘
```

### Custom Pool Store Mapping

| UI Element         | Store Field                            |
|--------------------|-----------------------------------------|
| Red dice spinner   | `store.weapons[0].redDice` via `setWeaponDice(0, 'red', v)` |
| Black dice spinner | `store.weapons[0].blackDice` via `setWeaponDice(0, 'black', v)` |
| White dice spinner | `store.weapons[0].whiteDice` via `setWeaponDice(0, 'white', v)` |
| Surge chart select | `store.surgeChart` via `setField('surgeChart', v)` |
| Pierce spinner     | `store.weapons[0].keywords.pierceX` via `setWeaponKeyword(0, 'pierceX', v)` |
| Blast toggle       | `store.weapons[0].keywords.blast` via `setWeaponKeyword(0, 'blast', v)` |
| Spray toggle       | `store.weapons[0].keywords.spray` via `setWeaponKeyword(0, 'spray', v)` |
| Precise spinner    | `store.preciseX` via `setField('preciseX', v)` |
| Marksman toggle    | `store.marksman` via `setField('marksman', v)` |
| Aim tokens spinner | `store.aimTokens` via `setField('aimTokens', v)` |

---

## Unit Builder Mode

The preset-driven mode. The user selects a unit and weapon loadout, and the app auto-populates dice, keywords, and upgrade slots from the data layer.

Weapons are displayed as individual rows, each showing their dice contribution and weapon-level keywords. A checkbox on each row enables/disables that weapon's contribution to the pool. This lets the user model "I'm only shooting with these weapons" scenarios.

```
┌──────────────────────────────────────┐
│  ⚔️  Just Roll Crits   [Ranged ▼]   │
├──────────────────────────────────────┤
│  ATTACKER                            │
│  [Custom Pool] [Unit Builder]        │
│                                      │
│  ─── Unit Selection ─────────────    │
│  Faction:    [Galactic Empire ▼]     │
│  Unit:       [Stormtroopers    ▼]    │
│                                      │
│  ─── Upgrades ───────────────────    │
│  Heavy Wpn:  [DLT-19 Stormtpr ▼]    │
│  Personnel:  [None             ▼]    │
│  Gear:       [None             ▼]    │
│  Grenades:   [Impact Grenades  ▼]    │
│  Training:   [None             ▼]    │
│  Base: 44 pts  Upgrades: +38 pts     │
│  Total: 82 pts                       │
│                                      │
│  ─── Weapon Pool ────────────────    │
│  ☑ E-11 Blaster Rifle               │
│    🔴 0  ⚫ 0  ⚪ 3                  │
│    (no weapon keywords)              │
│                                      │
│  ☑ DLT-19                           │
│    🔴 1  ⚫ 0  ⚪ 1                  │
│    Impact 1, Spray                   │
│                                      │
│  ───────────────────────────────     │
│  Pool total: 🔴 1  ⚫ 0  ⚪ 4       │
│  (spray applied: DLT multiplied      │
│   by minis in LOS on its dice only)  │
│                                      │
│  ─── Tokens ─────────────────────    │
│  Aim tokens:        [1]  ◀ ─ ▶      │
│  Surge tokens:      [0]  ◀ ─ ▶      │
│  Observation:       [0]  ◀ ─ ▶      │
│                                      │
│  ─── Unit Keywords ──────────────    │
│  (auto-populated from unit data)     │
│  Precise:           [1]  ◀ ─ ▶      │
│  Surge chart:   [None ▼]            │
│  (other unit keywords as applicable) │
│                                      │
│  ─── Reroll Strategy ────────────    │
│  Strategy: [Conservative ▼]         │
│                                      │
│  ─── Points ─────────────────────    │
│  Total: 82 pts                       │
│                                      │
└──────────────────────────────────────┘
```

### Weapon Row Detail

Each weapon row in Unit Builder mode displays:

```
┌─────────────────────────────────────────────┐
│ ☑ DLT-19 Stormtrooper                      │
│   🔴 1  ⚫ 0  ⚪ 1    Impact 1 · Spray     │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│ ☐ Impact Grenades (if equipped)             │
│   🔴 0  ⚫ 0  ⚪ 1    Blast · Impact 1     │
└─────────────────────────────────────────────┘
```

- **Checkbox** (☑/☐): Enables/disables weapon in the pool. Disabled weapons are excluded from aggregation.
- **Weapon name**: From the `WeaponProfile.name` field.
- **Dice icons**: Compact display of dice counts. 🔴 = red, ⚫ = black, ⚪ = white.
- **Keyword badges**: Inline display of weapon-level keywords with values (e.g., "Impact 1", "Blast", "Spray"). Only non-default keywords are shown.
- Weapon rows are read-only in Unit Builder mode — dice and keywords come from the data layer. The user adjusts the pool by checking/unchecking weapons or selecting different upgrades.

### Unit Builder Store Mapping

| UI Element          | Store Field                             |
|---------------------|------------------------------------------|
| Faction select      | `store.selectedFaction` via `setSelectedFaction(v)` |
| Unit combobox       | `store.selectedPresetId` via `loadPreset(id, profile)` |
| Upgrade combobox    | `store.equippedUpgradeIds[i]` via `equipUpgrade(i, id)` |
| Weapon checkbox     | `store.weapons[i].enabled` (boolean flag on each weapon) |
| Precise spinner     | `store.preciseX` via `setField('preciseX', v)` |
| Aim tokens spinner  | `store.aimTokens` via `setField('aimTokens', v)` |
| Reroll strategy     | `store.rerollStrategy` via `setField('rerollStrategy', v)` |

---

## Defender Panel — Two Modes

The Defender Panel mirrors the Attacker Panel's two-mode design. A segmented control at the top switches between Custom Pool and Unit Builder modes.

### Mode Toggle

```
┌──────────────────────────────┐
│  [Custom Pool] [Unit Builder]│
└──────────────────────────────┘
```

- **Custom Pool** is the default (active on first load)
- The toggle sets `store.activeDefenderMode` to `'custom'` or `'unit-builder'`
- Switching modes does NOT reset the current configuration
- Both modes write to the same underlying flat `DefenderConfig` fields

---

## Defender Custom Pool Mode

The user manually configures all defense settings. All fields are editable.

```
┌──────────────────────────────────────┐
│  DEFENDER                            │
│  [Custom Pool] [Unit Builder]        │
│                                      │
│  ─── Defense ────────────────────    │
│  Disable defense dice:     □         │
│  (Shows attack results before        │
│   any defense is applied)            │
│  Defense die: [White ▼]             │
│  Surge chart: [None ▼]              │
│  Minis in LOS:      [1]  ◀ ─ ▶      │
│                                      │
│  ─── Cover ──────────────────────    │
│  Cover type:  [None ▼]              │
│  Cover X:           [0]  ◀ ─ ▶      │
│  Smoke tokens:      [0]  ◀ ─ ▶      │
│  Suppressed:           □             │
│                                      │
│  ─── Tokens ─────────────────────    │
│  Dodge tokens:      [0]  ◀ ─ ▶      │
│  Surge tokens:      [0]  ◀ ─ ▶      │
│                                      │
│  ─── Keywords ───────────────────    │
│  Armor:             [0]  ◀ ─ ▶      │
│  Weak Point:        [0]  ◀ ─ ▶      │
│  Immune: Pierce:       □             │
│  Immune: Melee P:      □             │
│  Immune: Blast:        □             │
│  Impervious:           □             │
│  Danger Sense:      [0]  ◀ ─ ▶      │
│  ├ Suppression:     [0]  ◀ ─ ▶      │
│  Uncanny Luck:      [0]  ◀ ─ ▶      │
│  Deflect:              □             │
│  ├ Shien Mastery:      □             │
│  Block:                □             │
│  Outmaneuver:          □             │
│  Low Profile:          □             │
│  Shielded:          [0]  ◀ ─ ▶      │
│  Soresu Mastery:       □             │
│  Djem So Mastery:      □             │
│  Duelist (defense):    □             │
│  Backup:               □             │
│  Hold the Line:        □             │
│                                      │
│  ─── Guardian ───────────────────    │
│  Guardian:          [0]  ◀ ─ ▶      │
│  ├ Die color:  [White ▼]            │
│  ├ Surge:      [None ▼]             │
│  ├ Deflect:        □                │
│  ├ Soresu:         □                │
│  ├ Dodge tokens: [0]  ◀ ─ ▶        │
│                                      │
│  ─── Points ─────────────────────    │
│  Unit cost:       [  0] pts          │
│                                      │
└──────────────────────────────────────┘
```

### Defender Custom Pool Store Mapping

| UI Element          | Store Field                            |
|---------------------|----------------------------------------|
| Disable defense toggle | `store.disableDefenseDice` via `setField('disableDefenseDice', v)` |
| Defense die select  | `store.defenseColor` via `setField('defenseColor', v)` |
| Surge chart select  | `store.defenseSurgeChart` via `setField('defenseSurgeChart', v)` |
| Minis in LOS spinner| `store.minisInLOS` via `setField('minisInLOS', v)` |
| Cover type select   | `store.cover` via `setField('cover', v)` |
| Armor spinner       | `store.armorX` via `setField('armorX', v)` |
| Deflect toggle      | `store.deflect` via `setField('deflect', v)` |
| Dodge tokens spinner| `store.dodgeTokens` via `setField('dodgeTokens', v)` |

---

## Defender Unit Builder Mode

The preset-driven mode. The user selects a unit and the app auto-populates defense die, surge chart, and unit keywords from the data layer. Situational settings (Cover, tokens, Guardian) remain user-editable.

```
┌──────────────────────────────────────┐
│  DEFENDER                            │
│  [Custom Pool] [Unit Builder]        │
│                                      │
│  ─── Unit Selection ─────────────    │
│  Faction:    [Rebel Alliance ▼]      │
│  Unit:       [Rebel Troopers  ▼]     │
│                                      │
│  ─── Upgrades ───────────────────    │
│  Heavy Wpn: [Z-6 Trooper      ▼]    │
│  Personnel: [None              ▼]    │
│  Gear:      [None              ▼]    │
│  Grenades:  [Impact Grenades   ▼]    │
│  Training:  [None              ▼]    │
│  Base: 40 pts  Upgrades: +17 pts     │
│  Total: 57 pts                       │
│                                      │
│  ─── Defense ────────────────────    │
│  (auto-populated from preset)        │
│  Defense die:  White                 │
│  Surge chart:  e→d                  │
│  Minis in LOS:      [5]  ◀ ─ ▶      │
│                                      │
│  ─── Unit Keywords ──────────────    │
│  (auto-populated, adjustable)        │
│  Armor:             [0]  ◀ ─ ▶      │
│  Danger Sense:      [0]  ◀ ─ ▶      │
│  Deflect:              □             │
│  Uncanny Luck:      [0]  ◀ ─ ▶      │
│  (other keywords as applicable)      │
│                                      │
│  ─── Cover ──────────────────────    │
│  (situational — user must set)       │
│  Cover type:  [Heavy ▼]             │
│  Cover X:           [0]  ◀ ─ ▶      │
│  Smoke tokens:      [0]  ◀ ─ ▶      │
│  Suppressed:           □             │
│                                      │
│  ─── Tokens ─────────────────────    │
│  (situational — user must set)       │
│  Dodge tokens:      [1]  ◀ ─ ▶      │
│  Surge tokens:      [0]  ◀ ─ ▶      │
│  Suppression:       [0]  ◀ ─ ▶      │
│                                      │
│  ─── Guardian ───────────────────    │
│  (situational — user must configure) │
│  Guardian:          [0]  ◀ ─ ▶      │
│  ├ Die color:  [White ▼]            │
│  ├ Surge:      [None ▼]             │
│  ├ Deflect:        □                │
│  ├ Soresu:         □                │
│  ├ Dodge tokens: [0]  ◀ ─ ▶        │
│                                      │
│  ─── Points ─────────────────────    │
│  Total: 57 pts                       │
│                                      │
└──────────────────────────────────────┘
```

### Defender Unit Builder Store Mapping

| UI Element          | Store Field                             |
|---------------------|------------------------------------------|
| Faction select      | `store.selectedDefenderFaction` via `setDefenderFaction(v)` |
| Unit combobox       | `store.selectedDefenderPresetId` via `loadDefenderPreset(id, profile)` |
| Upgrade combobox    | `store.equippedDefenderUpgradeIds[i]` via `equipDefenderUpgrade(i, id)` |
| Armor spinner       | `store.armorX` via `setField('armorX', v)` (editable) |
| Deflect toggle      | `store.deflect` via `setField('deflect', v)` (editable) |
| Cover type select   | `store.cover` via `setField('cover', v)` (situational) |
| Dodge tokens spinner| `store.dodgeTokens` via `setField('dodgeTokens', v)` (situational) |

---

## Full Three-Column Layout (Desktop)

On desktop (≥1024px), the three panels sit side by side. The center Results panel is narrower than the input panels. Both Attacker and Defender panels have mode toggles.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚔️  Just Roll Crits                                       [Ranged ▼]      │
├─────────────────────────┬──────────────────────┬─────────────────────────────┤
│     ATTACKER            │      RESULTS         │       DEFENDER              │
│  [Custom] [Unit Builder]│                      │  [Custom] [Unit Builder]    │
│                         │   Mean: 3.21         │                             │
│  (mode-specific         │   Median: 3          │  (mode-specific             │
│   content — see         │   Mode: 3            │   content — see             │
│   wireframes above)     │                      │   wireframes above)         │
│                         │   ┌──────────────┐   │                             │
│                         │   │  ▌           │   │                             │
│                         │   │  █▌          │   │                             │
│                         │   │  ██          │   │                             │
│                         │   │  ███▌        │   │                             │
│                         │   │  █████       │   │                             │
│                         │   │  ███▌        │   │                             │
│                         │   │  ██          │   │                             │
│                         │   │  █▌          │   │                             │
│                         │   │  ▌           │   │                             │
│                         │   └──────────────┘   │                             │
│                         │   0 1 2 3 4 5 6 7    │                             │
│                         │                      │                             │
│                         │   P(≥1W): 94.2%      │                             │
│                         │   P(≥2W): 78.1%      │                             │
│                         │   P(≥3W): 51.3%      │                             │
│                         │   P(≥4W): 24.7%      │                             │
│                         │   P(≥5W):  8.1%      │                             │
│                         │                      │                             │
└─────────────────────────┴──────────────────────┴─────────────────────────────┘
```

---

## Mobile Layout (< 768px)

On mobile, panels stack vertically in a single column. The mode toggle and all sections remain the same, just full-width.

```
┌──────────────────────────────────────┐
│  ⚔️  Just Roll Crits   [Ranged ▼]   │
├──────────────────────────────────────┤
│  ATTACKER                            │
│  [Custom Pool] [Unit Builder]        │
│  (full attacker content)             │
├──────────────────────────────────────┤
│  DEFENDER                            │
│  [Custom Pool] [Unit Builder]        │
│  (full defender content)             │
├──────────────────────────────────────┤
│  RESULTS                             │
│  (stats + chart)                     │
└──────────────────────────────────────┘
```

---

## Keyword Classification Reference

For implementors — which keywords appear in which section:

### Attacker — Weapon Keywords (on `weapons[i].keywords`)
| Keyword | Type | Custom Pool UI | Unit Builder UI |
|---------|------|----------------|-----------------|
| Critical X | numeric | Spinner | Read-only badge |
| Pierce X | numeric | Spinner | Read-only badge |
| Impact X | numeric | Spinner | Read-only badge |
| Ram X | numeric | Spinner | Read-only badge |
| Lethal X | numeric | Spinner | Read-only badge |
| Blast | boolean | Toggle | Read-only badge |
| High Velocity | boolean | Toggle | Read-only badge |
| Suppressive | boolean | Toggle | Read-only badge |
| Spray | boolean | Toggle | Read-only badge |
| Cumbersome | boolean | Toggle | Read-only badge |
| Anti-Materiel X | numeric | Spinner | Read-only badge |
| Anti-Personnel X | numeric | Spinner | Read-only badge |

### Attacker — Unit Keywords (flat on store)
| Keyword | Type | Both Modes UI |
|---------|------|---------------|
| Precise X | numeric | Spinner (editable) |
| Sharpshooter X | numeric | Spinner (editable) |
| Marksman | boolean | Toggle (editable) |
| Jar'Kai Mastery | boolean | Toggle (editable) |
| Jedi Hunter | boolean | Toggle (editable) |
| Duelist (attack) | boolean | Toggle (editable) |
| Makashi Mastery | boolean | Toggle (editable) |
| Death From Above | boolean | Toggle (editable) |
| Immune: Deflect | boolean | Toggle (editable) |
| Hold the Line | boolean | Toggle (editable) |

### Defender — All Keywords (flat on `DefenderConfig`)

The defender side has no weapon array — all keywords are flat fields on the config. In both modes, keywords are editable (though Unit Builder mode auto-populates them from presets).

| Keyword | Type | Custom Pool UI | Unit Builder UI |
|---------|------|----------------|-----------------|
| Disable defense dice | boolean | Toggle | Not shown (always false) |
| Defense die color | enum | Select | Read-only (from preset) |
| Defense surge chart | enum | Select | Read-only (from preset) |
| Minis in LOS | numeric | Spinner | Spinner (editable) |
| Cover type | enum | Select | Select (situational) |
| Cover X | numeric | Spinner | Spinner (editable) |
| Smoke tokens | numeric | Spinner | Spinner (situational) |
| Suppressed | boolean | Toggle | Toggle (situational) |
| Dodge tokens | numeric | Spinner | Spinner (situational) |
| Surge tokens | numeric | Spinner | Spinner (situational) |
| Armor X | numeric | Spinner | Spinner (editable) |
| Weak Point X | numeric | Spinner | Spinner (editable) |
| Immune: Pierce | boolean | Toggle | Toggle (editable) |
| Immune: Melee Pierce | boolean | Toggle | Toggle (editable) |
| Immune: Blast | boolean | Toggle | Toggle (editable) |
| Impervious | boolean | Toggle | Toggle (editable) |
| Danger Sense X | numeric | Spinner | Spinner (editable) |
| Suppression tokens | numeric | Spinner | Spinner (situational) |
| Uncanny Luck X | numeric | Spinner | Spinner (editable) |
| Block | boolean | Toggle | Toggle (editable) |
| Deflect | boolean | Toggle | Toggle (editable) |
| Shien Mastery | boolean | Toggle | Toggle (editable) |
| Outmaneuver | boolean | Toggle | Toggle (editable) |
| Low Profile | boolean | Toggle | Toggle (editable) |
| Shielded X | numeric | Spinner | Spinner (editable, active count) |
| Soresu Mastery | boolean | Toggle | Toggle (editable) |
| Djem So Mastery | boolean | Toggle | Toggle (editable) |
| Duelist (defense) | boolean | Toggle | Toggle (editable) |
| Backup | boolean | Toggle | Toggle (editable) |
| Hold the Line | boolean | Toggle | Toggle (editable) |
| Guardian X | numeric | Spinner | Spinner (situational) |
| Guardian die color | enum | Select | Select (situational) |
| Guardian surge | enum | Select | Select (situational) |
| Guardian Deflect | boolean | Toggle | Toggle (situational) |
| Guardian Soresu | boolean | Toggle | Toggle (situational) |
| Guardian Dodge tokens | numeric | Spinner | Spinner (situational) |
| Unit cost | numeric | Spinner | Read-only (computed) |
