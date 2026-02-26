# Phase 20 — Legion List Import & Army Analyzer

## Overview

Add a new **List Analyzer** page where users can paste JSON exported from any Legion list builder (Tabletop Admiral, Legion HQ, or any tool using the same schema). The app fuzzy-matches unit/upgrade names against its resolved data, then presents a **two-panel layout**: a scrollable unit list (left) and a context-sensitive detail panel (right).

The detail panel **defaults to army-level aggregate stats** organized in two tiers: key stat cards (points, activations, wounds, effective wounds, miniature count, avg pts/activation) and categorized breakdowns (weighted dice output by range, anti-armor tech, cover denial, suppression pressure, deployment advantage, action economy, defensive profile, and rank composition). Clicking a unit switches the detail panel to individual unit information. An "Army Stats" button returns to the aggregate view at any time.

On mobile, the panels stack vertically: the unit list (with sections collapsed) on top, detail panel below.

**This is read-only analysis** — no list editing.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation | React Router (`react-router-dom`) with `createHashRouter` | Hash-based routing (`/#/`, `/#/list`) avoids SPA fallback requirements for PWA offline, static hosting (GitHub Pages), and Tauri webview. `createHashRouter` + `RouterProvider` API (React Router v6.4+). |
| Name matching | Generic fuzzy matching | Both TTA and LegionHQ share the same `units[].name` / `units[].upgrades[]` shape — one matcher handles both |
| Detail panel default | Army-level aggregate stats | Solves the "empty panel" problem of vanilla Option B; provides immediate value before any unit is clicked |
| Effective wounds model | Naive probability model | `health × figures / (1 − baseSaveProbability)` — no specific attacker needed; refineable later |
| Range data source | Data-layer `WeaponProfile.minRange/maxRange` | Already preserved through the resolver pipeline; no engine changes needed |
| List persistence | Ephemeral (paste-to-analyze) | No localStorage; deferred to future enhancement |
| Mobile layout | Stacked single-column | Left panel first (sections collapsed by default), detail panel below |
| New store | `useListStore` | Separate Zustand store — consistent with 4-store architecture pattern (becomes 5th store) |
| Loadout handling | Treat same as upgrades | `loadout[]` entries matched using the same upgrade name matcher as `upgrades[]`; no loadout-specific logic |
| Contingencies display | Show alongside command cards | Rendered as a separate labeled list below command cards in `ArmyStatsView` |
| Army stat tiers | Two-tier layout | Tier 1: key stat cards (6 numbers). Tier 2: collapsible categorized breakdowns (offense, anti-armor, cover denial, suppression, deployment, action economy, defense, composition, cards) |
| Dice output metric | Weighted success rate ("Attacking Efficacy") | Raw dice counts are misleading (6 red ≠ 6 white). Weight each die by its hit+crit+surge-conversion probability per the firing unit's `attackSurgeChart`. Display both raw dice and expected successes. |
| Anti-vehicle grouping | Impact + Critical + Ion + Surge→Crit | All mechanics that bypass or interact with Armor keyword grouped as "Anti-Armor Tech" |
| Cover denial grouping | Sharpshooter + Blast + High Velocity | Mechanics that bypass cover saves and dodge tokens grouped as "Cover Denial" |
| Deployment advantage | Scout + Infiltrate + Reinforcements + Scouting Party + Covert Ops | Pre-game positioning capabilities — critical competitive metric |
| Action economy grouping | Self (move-and-X) + Support (force multipliers) | Keywords providing action compression split into self-benefit and army-support sub-categories |

---

## Current State

- **No routing**: The app is a single-page SPA with no `react-router`. `App.tsx` renders a 3-column grid directly.
- **No army concept**: The app models individual unit attacker/defender configs but has no concept of a multi-unit army list.
- **No import/export**: No clipboard paste, file upload, URL parsing, or serialization features.
- **Full enrichment coverage**: All ~155 processed units have enrichment entries (though a few non-combatant units have empty `weapons[]`).
- **Range data exists**: `ResolvedUnit.weapons[].minRange`/`maxRange` are populated from enrichment and preserved through the resolver.
- **Preset loading flow exists**: `loadPreset()` + `equipUpgrade()` on both stores allow programmatic unit configuration.
- **Unit matching gap**: List builders export flattened display names ("Din Djarin The Mandalorian") while the app stores separate `name` + `title` fields. Upgrades export names only (no slot or ID).
- **No runtime slugify utility**: `slugify()` exists only in build-time scripts (`scripts/processApiData.ts`) and as a private function in `presetGenerator.ts`. A shared runtime utility is needed for the name matcher.
- **No fuzzy matching library**: No `fuse.js` or similar is installed. Matching will use custom normalized-string comparison.
- **Faction enum location**: `Faction` is defined in `src/data/presets.ts`, not in engine types. All list-analyzer data modules import it from there.
- **Noncombatant miniatures**: Some upgrades have `addsMiniature: 1` with `noncombatant: true` (e.g., medical droids). These contribute to health/wounds but NOT to dice pools. Existing `useDisplayWeapons.ts` already filters these.
- **Multiple attacker presets per unit**: Single-mini units generate one preset per weapon (e.g., `luke-skywalker-jedi-knight-anakins-lightsaber`). Multi-mini units generate one merged preset. The simulate flow must handle this.
- **`woundEstimation.ts` exists**: The engine has a sophisticated `estimateExpectedWounds()` function modeling the full defense sequence. It requires complete `AttackConfig`/`DefenderConfig` inputs — too heavy for army-level aggregation, but potentially reusable for per-unit detail in a future enhancement.

---

## Wireframes

### Desktop Layout (≥ 768px) — Army Stats View (Default)

This is the initial view after a successful import, before any unit is selected.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  [🎲]  Just Roll Crits                            [Simulator]  [List Analyzer] │
│         A SW:Legion Dice Calculator                     ▲ nav links             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌── Left Panel (scrollable) ──────────┐  ┌── Detail Panel ────────────────┐   │
│  │                                     │  │                                │   │
│  │  ┌ JSON Import ───────────────────┐ │  │  ARMY OVERVIEW                 │   │
│  │  │ Din Bikes — 999pts  [✕ Clear]  │ │  │  ────────────────────────────  │   │
│  │  └────────────────────────────────┘ │  │                                │   │
│  │                                     │  │  ┌──────┐ ┌──────┐ ┌──────┐  │   │
│  │  ▾ Commanders (2)                   │  │  │  999 │ │  14  │ │  47  │  │   │
│  │  ┌────────────────────────────────┐ │  │  │ Pts  │ │ Act. │ │ Mini │  │   │
│  │  │ Imperial Officer         50pts │ │  │  └──────┘ └──────┘ └──────┘  │   │
│  │  │ ⬜ 1♥ · 2 upgrades            │ │  │  ┌──────┐ ┌──────┐ ┌──────┐  │   │
│  │  └────────────────────────────────┘ │  │  │  84  │ │ ~112 │ │  ~71 │  │   │
│  │  ┌────────────────────────────────┐ │  │  │Wound │ │Eff.Wd│ │Pt/Act│  │   │
│  │  │ Agent Kallus             90pts │ │  │  └──────┘ └──────┘ └──────┘  │   │
│  │  │ ⬜ 5♥ · 0 upgrades            │ │  │                                │   │
│  │  └────────────────────────────────┘ │  │  ▾ Dice Output by Range ───── │   │
│  │                                     │  │  Range│ 🔴 ⚫ ⚪ Dice│Exp│Eff │   │
│  │  ▾ Operatives (1)                   │  │  R1   │ 4 12  8  24│14.8│62% │   │
│  │  ┌────────────────────────────────┐ │  │  R2   │ 4 12  4  20│12.1│61% │   │
│  │  │ Din Djarin              105pts │ │  │  R3   │ 4  8  4  16│ 9.6│60% │   │
│  │  │ The Mandalorian                │ │  │  R4   │ 0  6  0   6│ 3.0│50% │   │
│  │  │ ⬜ 1♥ · 3 upgrades            │ │  │                                │   │
│  │  └────────────────────────────────┘ │  │  ▾ Anti-Armor Tech ────────── │   │
│  │                                     │  │  Impact: 6 · Critical: 2      │   │
│  │  ▾ Corps (4)                        │  │  Ion: 3 · Surge→Crit: 4/14   │   │
│  │  ┌────────────────────────────────┐ │  │                                │   │
│  │  │ Shoretroopers            78pts │ │  │  ▾ Cover Denial ──────────── │   │
│  │  │ 🟥 4♥ · 1 upgrade             │ │  │  Sharpshooter: 3u (total 4)  │   │
│  │  └────────────────────────────────┘ │  │  Blast: 5 · High Velocity: 2 │   │
│  │  ┌────────────────────────────────┐ │  │                                │   │
│  │  │ Shoretroopers            78pts │ │  │  ▾ Suppression & Control ──── │   │
│  │  │ 🟥 4♥ · 1 upgrade             │ │  │  Suppressive: 6 · Scatter: 2 │   │
│  │  └────────────────────────────────┘ │  │                                │   │
│  │  ┌────────────────────────────────┐ │  │  ▾ Deployment Advantage ───── │   │
│  │  │ Shoretroopers            78pts │ │  │  Infiltrate: 2 · Scout: 3    │   │
│  │  │ 🟥 4♥ · 1 upgrade             │ │  │  Reinforcements: 1            │   │
│  │  └────────────────────────────────┘ │  │                                │   │
│  │  ┌────────────────────────────────┐ │  │  ▾ Action Economy ─────────── │   │
│  │  │ Shoretroopers            78pts │ │  │  Self: Relentless 3 ·         │   │
│  │  │ 🟥 4♥ · 1 upgrade             │ │  │    Steady 2 · Charge 1        │   │
│  │  └────────────────────────────────┘ │  │  Support: Fire Support 3 ·    │   │
│  │                                     │  │    Guidance 1                  │   │
│  │  ▸ Support (3)  ← collapsed         │  │                                │   │
│  │  ▸ Heavy (3)    ← collapsed         │  │  ▾ Defensive Profile ──────── │   │
│  │                                     │  │  Red+Surge: 3u/24w            │   │
│  │                                     │  │  White+Surge: 5u/28w          │   │
│  │                                     │  │  Dodge econ: 5u · Armor: 4   │   │
│  │                                     │  │                                │   │
│  │                                     │  │  ▾ Units by Rank ──────────── │   │
│  │                                     │  │  Cmdr  2  140pts  14%         │   │
│  │                                     │  │  Corps 4  312pts  31%         │   │
│  │                                     │  │  ...                           │   │
│  │                                     │  │                                │   │
│  │                                     │  │  ▾ Command Cards ──────────── │   │
│  │                                     │  │  • Face Me!                   │   │
│  │                                     │  │  • This is the Way            │   │
│  │                                     │  │  • Standing Orders            │   │
│  │                                     │  │                                │   │
│  │                                     │  │  ▾ Battlefield Deck ───────── │   │
│  │                                     │  │  Conditions: Advanced Intel   │   │
│  │                                     │  │  Deployment: Recover the...   │   │
│  └─────────────────────────────────────┘  └────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Desktop Layout — Unit Detail View (after clicking a unit)

Clicking "Din Djarin" in the left panel highlights it and switches the detail panel:

```
┌── Left Panel ──────────────────────┐  ┌── Detail Panel ────────────────────────┐
│                                    │  │                                        │
│  Din Bikes — 999pts  [✕ Clear]     │  │  [← Army Stats]                       │
│                                    │  │                                        │
│  ▾ Commanders (2)                  │  │  DIN DJARIN                            │
│  ┌────────────────────────────────┐│  │  The Mandalorian                       │
│  │ Imperial Officer         50pts ││  │  ──────────────────────────────────    │
│  │ ⬜ 1♥ · 2 upgrades            ││  │                                        │
│  └────────────────────────────────┘│  │  ┌────────┐ ┌────────┐ ┌────────┐    │
│                                    │  │  │  105   │ │  1♥    │ │   ⬜   │    │
│  ▾ Operatives (1)                  │  │  │ Points │ │ Health │ │ Def.Die│    │
│  ┌────────────────────────────────┐│  │  └────────┘ └────────┘ └────────┘    │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░││  │  ┌────────┐ ┌────────┐               │
│  │░ Din Djarin           105pts ░││  │  │  1 fig │ │ ~1.9   │               │
│  │░ The Mandalorian             ░││  │  │ Minis  │ │ Eff.Wds│               │
│  │░ ⬜ 1♥ · 3 upgrades         ░││  │  └────────┘ └────────┘               │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░││  │                                        │
│  └────────────────────────────────┘│  │  ─── Keywords ─────────────────────── │
│                                    │  │  Bounty · Gunslinger · Impervious     │
│  ▾ Corps (4)                       │  │  Independent: Surge 1 · Nimble        │
│  ...                               │  │                                        │
│                                    │  │  ─── Weapons ──────────────────────── │
│                                    │  │                                        │
│                                    │  │  IB-94 Blaster Pistol       R1-2      │
│                                    │  │  ◆◆ (2 black)                         │
│                                    │  │  Pierce 1                              │
│                                    │  │                                        │
│                                    │  │  Amban Phase-Pulse Blaster  R1-4      │
│                                    │  │  ◆◆ (2 red, 1 white)                  │
│                                    │  │  Pierce 1, Suppressive                 │
│                                    │  │                                        │
│                                    │  │  Whistling Birds             R1-2      │
│                                    │  │  ◆◆◆◆◆ (5 black)                     │
│                                    │  │  Blast                                 │
│                                    │  │                                        │
│                                    │  │  ─── Equipped Upgrades ──────────────  │
│                                    │  │  ☑ Din's Jetpack           10pts      │
│                                    │  │  ☑ Din's Flame Projector    3pts      │
│                                    │  │  ☑ Beskar Spear            10pts      │
│                                    │  │  ────────────────────────────          │
│                                    │  │  Total: 128pts (105 + 23 upgrades)    │
│                                    │  │                                        │
│                                    │  │  ┌─────────────────────────────────┐  │
│                                    │  │  │  ⚔️ Simulate as Attacker         │  │
│                                    │  │  ├─────────────────────────────────┤  │
│                                    │  │  │  🛡 Simulate as Defender         │  │
│                                    │  │  └─────────────────────────────────┘  │
│                                    │  │                                        │
└────────────────────────────────────┘  └────────────────────────────────────────┘
```

### Desktop Layout — Pre-Import State (Empty)

Before any JSON is pasted, the page shows an inviting import area:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  [🎲]  Just Roll Crits                            [Simulator]  [List Analyzer] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌── Left Panel ───────────────────┐  ┌── Detail Panel ────────────────────┐   │
│  │                                 │  │                                    │   │
│  │  ┌ JSON Import ──────────────┐  │  │                                    │   │
│  │  │                           │  │  │                                    │   │
│  │  │  Paste your army list     │  │  │    Import an army list to see     │   │
│  │  │  JSON from Tabletop       │  │  │    army-level statistics and      │   │
│  │  │  Admiral, Legion HQ,      │  │  │    simulate individual units.     │   │
│  │  │  or any compatible        │  │  │                                    │   │
│  │  │  list builder...          │  │  │    Supported formats:              │   │
│  │  │                           │  │  │    • Tabletop Admiral              │   │
│  │  │  ┌─────────────────────┐  │  │  │    • Legion HQ                    │   │
│  │  │  │                     │  │  │  │    • Any builder using the         │   │
│  │  │  │   (textarea)        │  │  │  │      standard JSON format          │   │
│  │  │  │                     │  │  │  │                                    │   │
│  │  │  │                     │  │  │  │                                    │   │
│  │  │  └─────────────────────┘  │  │  │                                    │   │
│  │  │                           │  │  │                                    │   │
│  │  │  [     Import List     ]  │  │  │                                    │   │
│  │  │                           │  │  │                                    │   │
│  │  └───────────────────────────┘  │  │                                    │   │
│  │                                 │  │                                    │   │
│  │  (no units yet)                 │  │                                    │   │
│  │                                 │  │                                    │   │
│  └─────────────────────────────────┘  └────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 768px) — Army Stats View

On mobile, the two panels stack vertically. The left panel's rank sections are **collapsed by default**
to keep the army stats visible without excessive scrolling.

```
┌──────────────────────────────────────┐
│  [🎲] Just Roll Crits                │
│  [Simulator]  [■ List Analyzer]      │
├──────────────────────────────────────┤
│                                      │
│  Din Bikes — 999pts  [✕ Clear]       │
│                                      │
│  ▸ Commanders (2)    ← collapsed     │
│  ▸ Operatives (1)    ← collapsed     │
│  ▸ Corps (4)         ← collapsed     │
│  ▸ Support (3)       ← collapsed     │
│  ▸ Heavy (3)         ← collapsed     │
│                                      │
│  ──────────────────────────────────  │
│                                      │
│  ARMY OVERVIEW                       │
│  ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │   999   │ │   14    │ │  47   │ │
│  │  Points │ │ Activ.  │ │ Minis │ │
│  └─────────┘ └─────────┘ └───────┘ │
│  ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │    84   │ │  ~112   │ │  ~71  │ │
│  │  Wounds │ │ Eff.Wds │ │Pts/Act│ │
│  └─────────┘ └─────────┘ └───────┘ │
│                                      │
│  ▾ Dice Output by Range              │
│  Range│ 🔴 ⚫ ⚪ Dice│ Exp │ Eff    │
│  R1   │ 4 12  8  24 │14.8 │ 62%    │
│  R2   │ 4 12  4  20 │12.1 │ 61%    │
│  R3   │ 4  8  4  16 │ 9.6 │ 60%    │
│  R4   │ 0  6  0   6 │ 3.0 │ 50%    │
│                                      │
│  ▾ Anti-Armor Tech                   │
│  Impact: 6 · Critical: 2            │
│  Ion: 3 · Surge→Crit: 4/14 units   │
│                                      │
│  ▾ Cover Denial                      │
│  Sharpshooter: 3u (total 4)         │
│  Blast: 5 · High Velocity: 2        │
│                                      │
│  ▾ Suppression & Control             │
│  Suppressive: 6 · Scatter: 2        │
│                                      │
│  ▾ Deployment Advantage              │
│  Infiltrate: 2 · Scout: 3           │
│  Reinforcements: 1                   │
│                                      │
│  ▾ Action Economy                    │
│  Self: Relentless 3 · Steady 2      │
│  Support: Fire Support 3 ·          │
│    Guidance 1                        │
│                                      │
│  ▾ Defensive Profile                 │
│  Red+Surge: 3u/24w · Red: 2u/16w   │
│  White+Surge: 5u/28w · Wht: 4u/16w │
│  Dodge econ: 5u · Armor: 4          │
│                                      │
│  ▾ Units by Rank                     │
│  Cmdr  2  140pts  14%               │
│  Corps 4  312pts  31%               │
│  ...                                 │
│                                      │
│  ▾ Command Cards                     │
│  • Face Me!                          │
│  • This is the Way                   │
│  ...                                 │
│                                      │
└──────────────────────────────────────┘
```

### Mobile Layout — Unit Selected

Tapping a unit expands its section and scrolls to the unit detail below:

```
┌──────────────────────────────────────┐
│  [🎲] Just Roll Crits                │
│  [Simulator]  [■ List Analyzer]      │
├──────────────────────────────────────┤
│                                      │
│  Din Bikes — 999pts  [✕ Clear]       │
│                                      │
│  ▸ Commanders (2)                    │
│  ▾ Operatives (1)                    │
│  ┌──────────────────────────────────┐│
│  │░ Din Djarin           105pts   ░││
│  │░ ⬜ 1♥ · 3 upgrades           ░││
│  └──────────────────────────────────┘│
│  ▸ Corps (4)                         │
│  ▸ Support (3)                       │
│  ▸ Heavy (3)                         │
│                                      │
│  ──────────────────────────────────  │
│                                      │
│  [← Army Stats]                      │
│                                      │
│  DIN DJARIN                          │
│  The Mandalorian                     │
│  ────────────────────────────────    │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │  105   │ │  1♥    │ │   ⬜   │  │
│  │ Points │ │ Health │ │ Def Die│  │
│  └────────┘ └────────┘ └────────┘  │
│                                      │
│  ─── Weapons ────────────────────    │
│  IB-94 Blaster Pistol      R1-2     │
│  ◆◆ (2 black) · Pierce 1            │
│                                      │
│  Amban Phase-Pulse Blaster  R1-4    │
│  ◆◆◆ (2 red, 1 white)               │
│  Pierce 1, Suppressive               │
│                                      │
│  ─── Upgrades ───────────────────    │
│  ☑ Din's Jetpack            10pts   │
│  ☑ Din's Flame Projector     3pts   │
│  ☑ Beskar Spear             10pts   │
│  Total: 128pts                       │
│                                      │
│  [ ⚔️ Simulate as Attacker ]         │
│  [ 🛡 Simulate as Defender ]         │
│                                      │
└──────────────────────────────────────┘
```

### Nav Bar Detail

The existing header gains navigation links without changing the header structure:

```
Desktop (sm+):                                   Mobile:
┌─────────────────────────────────────┐          ┌──────────────────────┐
│ [🎲] Just Roll Crits    [Sim] [LA] │          │ [🎲] Just Roll Crits │
│       A SW:Legion...                │          │ [Simulator] [List…]  │
│            [Ranged][Melee][Overrun] │←on /     └──────────────────────┘
│   OR       (hidden on /list)        │  only
└─────────────────────────────────────┘
```

- `AttackTypeSelector` is **only shown on the `/` (Simulator) route**, since it affects the attacker store which the List Analyzer doesn't use directly.
- Nav links use `NavLink` from `react-router-dom` with active styling (`text-white font-semibold` vs `text-gray-400 hover:text-gray-200`).

---

## Architecture

### Data Flow

```
User pastes JSON string
  │
  ▼
listParser.parseListJson(raw)
  │
  ├── Validate JSON shape (units[], armyFaction/battleForce, etc.)
  ├── Resolve faction via factionAliases.ts
  │
  ├── For each unit in units[]:
  │     ├── listMatcher.matchUnitByName(name, faction) → ResolvedUnit | null
  │     └── For each upgrade:
  │           └── listMatcher.matchUpgradeByName(name, unitContext) → ResolvedUpgrade | null
  │
  ├── armyStats.aggregateArmyStats(resolvedUnits)      // in src/data/armyStats.ts
  │     ├── Sum total wounds, effective wounds, miniatures, avg pts/activation
  │     ├── Compute weighted dice output per range band (raw + expected successes + efficacy)
  │     ├── Tally anti-armor (impact, critical, ion, surge→crit), cover denial, suppression
  │     ├── Tally deployment advantage keywords (infiltrate, scout, reinforcements, etc.)
  │     ├── Tally action economy keywords (self: relentless, steady, etc.; support: guidance, etc.)
  │     ├── Compute defensive profile (save tiers, dodge economy, armor, shields, guardian)
  │     └── Count units by rank with points and percentage
  │
  └── Return ResolvedList { meta, units, stats, warnings }
        │
        ▼
  useListStore.importList() stores the result
        │
        ▼
  UI renders left panel (unit list) + detail panel (army stats or unit detail)
        │
        ▼
  User clicks "Simulate" → loadPreset() + equipUpgrade() → navigate('/')
```

### File Map

```
src/
├── router.tsx                          NEW — React Router config
├── pages/
│   ├── SimulatorPage.tsx               NEW — extracted from App.tsx
│   └── ListAnalyzerPage.tsx            NEW — route component for /list
├── data/
│   ├── factionAliases.ts               NEW — list-builder faction → Faction mapping
│   ├── listTypes.ts                    NEW — ImportedListJson, ResolvedListUnit, ArmyStats, etc.
│   ├── listMatcher.ts                  NEW — fuzzy unit/upgrade name matching
│   ├── listMatcher.test.ts             NEW — matching tests
│   ├── listParser.ts                   NEW — JSON validation + resolution pipeline
│   ├── listParser.test.ts             NEW — parser tests
│   ├── armyStats.ts                    NEW — effective wounds, dice-by-range, aggregation (data layer, not engine)
│   └── armyStats.test.ts              NEW — army stats tests
├── utils/
│   └── slugify.ts                      NEW — shared runtime slugify utility (exported)
├── stores/
│   └── listStore.ts                    NEW — Zustand store for list state
├── components/
│   └── ListAnalyzer/
│       ├── index.ts                    NEW — barrel exports
│       ├── JsonImportSection.tsx        NEW — textarea + import button
│       ├── UnitListPanel.tsx           NEW — left panel with rank groups
│       ├── UnitListItem.tsx            NEW — single unit row in list
│       ├── DetailPanel.tsx             NEW — conditional army stats / unit detail
│       ├── ArmyStatsView.tsx           NEW — aggregate army statistics
│       ├── UnitDetailView.tsx          NEW — individual unit information
│       ├── RangeDiceTable.tsx          NEW — dice output by range (raw + expected successes + efficacy)
│       ├── KeywordTallySection.tsx     NEW — reusable keyword tally display for stat breakdowns
│       ├── SaveTierBreakdown.tsx       NEW — defense save quality breakdown (tiers × wounds)
│       ├── SimulateButton.tsx          NEW — attacker/defender choice + navigation
│       └── ListAnalyzerPage.test.tsx   NEW — component tests
├── hooks/
│   └── useNavigateToSimulator.ts       NEW — cross-store preset loading + navigation logic
├── data/__tests__/fixtures/
│   ├── tta-sample.json                 NEW — Tabletop Admiral sample list JSON for tests
│   └── legionhq-sample.json           NEW — LegionHQ sample list JSON for tests
├── main.tsx                            MODIFIED — use RouterProvider with createHashRouter
├── App.tsx                             MODIFIED — render Layout + Outlet
└── Layout.tsx                          MODIFIED — add nav links, conditional AttackTypeSelector
```

### Modified Files

| File | Change |
|------|--------|
| `src/main.tsx` | Replace `<App />` render with `<RouterProvider router={router} />` using `createHashRouter` |
| `src/App.tsx` | Replace inline grid with `<Layout><Outlet /></Layout>` |
| `src/Layout.tsx` | Add `NavLink` elements to header, conditionally show `AttackTypeSelector` on `/` only (use `useLocation()`) |
| `package.json` | Add `react-router-dom` dependency |
| `vite.config.ts` | Add `navigateFallback: '/index.html'` to workbox config for offline PWA support |
| `e2e/app.spec.ts` | Verify/update E2E tests — routing changes may affect initial page load expectations |

---

## Implementation Steps

### Step 1 — React Router Setup

**Files:** `package.json`, `src/main.tsx`, `src/App.tsx`, `src/Layout.tsx`, `src/router.tsx`, `src/pages/SimulatorPage.tsx`, `src/pages/ListAnalyzerPage.tsx`

1. Install `react-router-dom`:
   ```
   npm install react-router-dom
   ```

2. Create `src/router.tsx`:
   ```tsx
   import { createHashRouter } from 'react-router-dom';
   import App from './App';
   import SimulatorPage from './pages/SimulatorPage';
   import ListAnalyzerPage from './pages/ListAnalyzerPage';

   export const router = createHashRouter([
     {
       path: '/',
       element: <App />,           // App becomes the layout wrapper
       children: [
         { index: true, element: <SimulatorPage /> },
         { path: 'list', element: <ListAnalyzerPage /> },
       ],
     },
   ]);
   ```

   **Why `createHashRouter`**: Hash-based routing (`/#/list` instead of `/list`) avoids:
   - PWA offline navigation failures (no server-side fallback needed)
   - Static hosting configuration (GitHub Pages, Netlify `_redirects`, etc.)
   - Tauri webview compatibility issues (loads `file://` protocol locally)
   - The tradeoff is slightly less clean URLs, which is acceptable for a tool app.

3. Extract current `App.tsx` grid content into `src/pages/SimulatorPage.tsx` — this becomes the `/` index route.

4. Create `src/pages/ListAnalyzerPage.tsx` as a stub rendering the List Analyzer component tree.

5. Update `src/App.tsx` to render `<Layout><Outlet /></Layout>`.

6. Update `src/main.tsx` to use `<RouterProvider router={router} />` instead of directly rendering `<App />`.

   ```tsx
   import { RouterProvider } from 'react-router-dom';
   import { router } from './router';

   createRoot(document.getElementById('root')!).render(
     <StrictMode>
       <RouterProvider router={router} />
     </StrictMode>
   );
   ```

7. Update `src/Layout.tsx`:
   - Add navigation links between **Simulator** and **List Analyzer** using `NavLink`
   - Conditionally render `AttackTypeSelector` only when on the `/` route (use `useLocation()`)
   - Style active nav link: `text-white font-semibold` vs inactive `text-gray-400 hover:text-gray-200`
   - Add `document.title` updates per route via `useEffect`: `"Just Roll Crits — Simulator"` / `"Just Roll Crits — List Analyzer"`

8. Update `vite.config.ts` — add `navigateFallback` to workbox config:
   ```ts
   workbox: {
     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
     navigateFallback: '/index.html',
   },
   ```
   This ensures the service worker returns `index.html` for any navigation request when offline. Even with hash routing this is good practice for PWA reliability.

9. Update E2E tests (`e2e/app.spec.ts`):
   - Verify existing tests still pass with hash-based routing (URLs change from `/` to `/#/`)
   - Add basic navigation test: click "List Analyzer" link → verify import section visible

### Step 2 — Faction Alias Mapping

**File:** `src/data/factionAliases.ts`

Build a lookup from common list-builder faction strings to the app's `Faction` enum (imported from `../presets`):

```ts
const FACTION_ALIASES: Record<string, Faction> = {
  // Tabletop Admiral
  'empire': Faction.GalacticEmpire,
  'rebels': Faction.RebelAlliance,
  'republic': Faction.Republic,
  'separatists': Faction.SeparatistAlliance,
  'mercenary': Faction.Mercenaries,
  // Legion HQ (may send empty string with battleForce)
  'galactic empire': Faction.GalacticEmpire,
  'rebel alliance': Faction.RebelAlliance,
  'galactic republic': Faction.Republic,
  'separatist alliance': Faction.SeparatistAlliance,
  'mercenaries': Faction.Mercenaries,
  // Normalized slug forms
  'galactic-empire': Faction.GalacticEmpire,
  'rebel-alliance': Faction.RebelAlliance,
  'separatist-alliance': Faction.SeparatistAlliance,
};

const BATTLE_FORCE_FACTION: Record<string, Faction> = {
  'Shadow Collective': Faction.Mercenaries,
  'Bright Tree Village': Faction.RebelAlliance,
  // ... extend as needed
};

export function resolveFaction(armyFaction: string, battleForce?: string | null): Faction | null
```

### Step 3 — List Data Types

**File:** `src/data/listTypes.ts`

```ts
/** Raw JSON shape from list builders (union of known formats) */
export interface ImportedListJson {
  listname?: string;
  points?: number;
  numActivations?: number;
  armyFaction?: string;
  battleForce?: string | null;
  commandCards?: string[];
  contingencies?: string[];
  units: ImportedUnitJson[];
  battlefieldDeck?: {
    scenario?: string;
    conditions?: string[];
    deployment?: string[];
    objective?: string[];
  };
  listlink?: string;
  author?: string;
}

export interface ImportedUnitJson {
  name: string;
  upgrades?: string[];
  loadout?: string[];   // Treated same as upgrades[] for matching purposes
}

/** A unit from the imported list after name-matching resolution */
export interface ResolvedListUnit {
  /** The raw name from the imported JSON */
  rawName: string;
  /** The raw upgrade names from the imported JSON */
  rawUpgradeNames: string[];
  /** Matched unit data from the app's resolved units (null = unmatched) */
  resolvedUnit: ResolvedUnit | null;
  /** Matched upgrades (null entries = unmatched) */
  resolvedUpgrades: (ResolvedUpgrade | null)[];
  /** Which upgrade bar slot each resolved upgrade maps to (parallel to resolvedUpgrades) */
  slotMapping: number[];
  /** Match quality for the unit itself */
  unitMatchConfidence: 'exact' | 'fuzzy' | 'none';
  /** Warnings generated during matching (e.g., "Upgrade 'X' not found") */
  warnings: string[];
}

/** Dice counts and weighted success metrics for a single range band */
export interface RangeBandDice {
  rangeBand: string;          // 'Melee', 'R1', 'R2', 'R3', 'R4', 'R5'
  redDice: number;
  blackDice: number;
  whiteDice: number;
  totalDice: number;
  expectedSuccesses: number;  // weighted by die quality + unit's attackSurgeChart
  attackingEfficacy: number;  // expectedSuccesses / totalDice (0–1)
}

/** Tally of a keyword across the army */
export interface KeywordTally {
  keyword: string;            // internal keyword name (e.g., 'relentless', 'impactX')
  label: string;              // human-readable display (e.g., 'Relentless', 'Impact')
  unitCount: number;          // how many units have this keyword
  totalValue?: number;        // for numeric keywords (e.g., tacticalX sum = 3)
}

/** Defensive save tier grouping */
export interface SaveTier {
  label: string;              // e.g., 'Red + Surge→Block'
  saveProbability: number;    // 0–1 (e.g., 0.667 for red+surge)
  unitCount: number;
  totalWounds: number;        // wounds in this tier (health × figures)
}

/** Rank composition with points breakdown */
export interface RankBreakdown {
  rank: string;               // e.g., 'Commander', 'Corps'
  count: number;
  points: number;             // total points invested in this rank
  percentage: number;         // points / totalArmyPoints (0–1)
}

/** Aggregate army-level statistics */
export interface ArmyStats {
  // — Tier 1: Key stat cards —
  totalPoints: number;
  activationCount: number;
  totalWounds: number;
  totalEffectiveWounds: number;
  totalMiniatures: number;                // Σ(figures + non-noncombatant addsMiniature)
  avgPointsPerActivation: number;         // totalPoints / activationCount

  // — Tier 2A: Dice output by range —
  diceByRange: RangeBandDice[];           // per range band: raw dice + expected successes + efficacy

  // — Tier 2B: Anti-armor tech —
  totalImpact: number;                    // Σ impactX across weapons
  totalCritical: number;                  // Σ criticalX across weapons
  totalIon: number;                       // Σ ionX across weapons
  surgeToCritUnitCount: number;           // count of units with attackSurgeChart === ToCrit

  // — Tier 2C: Cover denial —
  sharpshooterUnits: number;              // units with sharpshooterX
  totalSharpshooter: number;              // Σ sharpshooterX values
  blastWeaponCount: number;               // weapons with blast
  highVelocityWeaponCount: number;        // weapons with highVelocity

  // — Tier 2D: Suppression & control —
  suppressiveWeaponCount: number;
  scatterWeaponCount: number;

  // — Tier 2E: Deployment advantage —
  deploymentKeywords: KeywordTally[];     // infiltrate, scoutX, scoutingPartyX, reinforcements, covertOps, preparedPosition

  // — Tier 2F: Action economy —
  actionEconomySelf: KeywordTally[];      // relentless, steady, charge, tacticalX, agileX, etc.
  actionEconomySupport: KeywordTally[];   // guidance, pullingTheStrings, coordinate, direct, fireSupport, etc.

  // — Tier 2G: Defensive profile —
  saveTierBreakdown: SaveTier[];          // units grouped by save quality
  defensiveKeywords: KeywordTally[];      // dodge economy, armorX, shieldedX, guardianX, immunePierce, etc.

  // — Tier 2H: Composition —
  unitsByRank: RankBreakdown[];           // rank, count, points, percentage

  // — Tier 2I: Cards —
  commandCards: string[];
  contingencies: string[];
}

/** Fully resolved imported list */
export interface ResolvedList {
  meta: {
    name: string;
    points: number;
    faction: Faction | null;
    battleForce: string | null;
    author: string | null;
    listLink: string | null;
  };
  units: ResolvedListUnit[];
  stats: ArmyStats;
  parseWarnings: string[];
}
```

### Step 3b — Shared Slugify Utility

**File:** `src/utils/slugify.ts`

The name matcher needs a runtime `slugify()` function. Currently `slugify()` only exists in build-time scripts (`scripts/processApiData.ts`) and as a private function in `presetGenerator.ts`. Extract a shared version:

```ts
/** Lowercase, replace non-alphanumeric runs with hyphens, trim leading/trailing hyphens */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
```

This is used by `listMatcher.ts` for slug-based matching and can replace the private copies in other files over time.

### Step 4 — Name Matching Module

**File:** `src/data/listMatcher.ts`

Core matching strategy:

```
matchUnitByName(displayName, faction?):
  1. Build lookup: for each ResolvedUnit, create display string:
     - title ? `${name} ${title}` : name
  2. Normalize both sides: lowercase, strip non-alphanumeric, collapse whitespace
  3. Try exact match first (normalized display string equality)
  4. Try slug match: slugify(displayName) === unit.id (using shared `src/utils/slugify.ts`)
  5. Try substring containment (display name contains unit name+title or vice versa)
  6. If faction is provided, filter candidates to that faction (+ mercenaries) first
  7. If faction-scoped search fails, fallback to faction-agnostic search (handles mercenary cross-faction)
  8. Return { match, confidence: 'exact' | 'fuzzy' | 'none', warnings }

matchUpgradeByName(upgradeName, unit):
  1. Combine `upgrades[]` and `loadout[]` entries into a single list for matching
  2. For each slot in unit.upgradeBar:
     - Get legal upgrades via getUpgradesForSlot(slot, unitContext)
     - Try exact name match (case-insensitive)
  3. If no slot-scoped match, try getAllResolvedUpgrades() with name match
  4. Track which slots have been consumed to handle sequential assignment:
     - When a unit has 2 gear slots and 2 gear upgrades, assign first-come-first-served
     - Return the first unfilled slot index matching the upgrade's `upgradeSlot` type
  5. Return { match, slotIndex, confidence, warnings }
```

**Edge cases to handle:**
- **Benign duplicates**: Multiple `ResolvedUpgrade` entries with same name (same card for different unit restrictions) — any match is equivalent
- **Unit name with "Ruthless Efficiency"**: This is the title, not upgrades. Matcher handles `"Imperial Officer Ruthless Efficiency"` by matching `name="Imperial Officer" + title="Ruthless Efficiency"`
- **Mercenary cross-faction**: Units like Din Djarin can appear in Empire lists. The matcher should fallback to faction-agnostic search if faction-scoped search fails
- **Empty upgrade names**: Skip gracefully

**Test cases** (`listMatcher.test.ts`):
- Exact match: `"Shoretroopers"` → `shoretroopers`
- Name+title: `"Din Djarin The Mandalorian"` → `din-djarin-the-mandalorian`
- Name+title with subtitle: `"Imperial Officer Ruthless Efficiency"` → `imperial-officer-ruthless-efficiency`
- Upgrade exact: `"T-21B Shoretrooper"` → `heavy-weapon-t-21b-shoretrooper`
- Unknown unit returns `confidence: 'none'` with warning
- Faction-scoped: Empire list finds Empire units before mercenaries

### Step 5 — Army Stats Calculator

**File:** `src/data/armyStats.ts`

Pure computation functions in the **data layer** (not `src/engine/`). These functions accept `ResolvedUnit` and `ResolvedUpgrade` types which are data-layer types (`src/data/types.ts`). Placing them in `src/engine/` would violate the engine purity constraint (engine must have no data-layer imports). They may import engine enums (`DefenseDieColor`, `DefenseSurgeChart`, `AttackType`, `AttackSurgeChart`) from `src/engine/types.ts` for type discrimination.

---

#### 5a — Defense Probability Helpers

##### `computeBaseSaveProbability(defenseDieColor, defenseSurgeChart)`

Uses the defense die face distributions:
- **White die**: 1 block, 1 surge, 4 blanks out of 6 faces
- **Red die**: 3 blocks, 1 surge, 2 blanks out of 6 faces
- Surge converts to block if `surgeChart === DefenseSurgeChart.ToBlock`

Returns probability of rolling a block on a single die.

##### `computeEffectiveWounds(unit, upgrades)`

```
baseSave = computeBaseSaveProbability(unit.defenseDieColor, unit.defenseSurgeChart)
figures = unit.figures + Σ(upgrade.addsMiniature for each upgrade WHERE noncombatant === false)
health = unit.health
keywords = merge(unit.keywords, ...upgrade.keywords)
bonusHealth = 0

// Keyword adjustments (additive to effective health, not multiplicative on save)
if keywords.shieldedX:
  bonusHealth += keywords.shieldedX * figures  // shields are extra "health"
if keywords.armorX:
  bonusHealth += (health * figures) * 0.2      // heuristic: armor adds ~20% virtual health
if keywords.impervious:
  bonusHealth += (health * figures) * 0.1      // heuristic: crits→hits is ~10% benefit
if keywords.dangerSenseX:
  // adds extra defense dice when suppressed (assume 1 suppression on average)
  bonusDice = min(keywords.dangerSenseX, 1)
  bonusHealth += bonusDice * baseSave * (health * figures)  // extra dice boost

effectiveWounds = (health * figures + bonusHealth) / (1 - baseSave)
```

**Design note:** Keyword adjustments use **additive effective-health bonuses** rather than multiplicative save-factor modifiers. This avoids the mathematical issue where stacking multiplicative modifiers on the save probability can push the denominator toward zero, producing absurd results for high-save units with multiple keywords. The base formula `totalHealth / (1 - baseSave)` stays clean, and keyword benefits are expressed as bonus virtual health. As a safety net, the final `baseSave` value is clamped: `Math.min(baseSave, 0.95)` to prevent division-by-near-zero.

This is deliberately a **rough heuristic** — it gives useful relative rankings without needing a full Monte Carlo simulation. The tooltip should say "approximate". For more accurate per-unit estimates, a future enhancement could use the existing `woundEstimation.ts` engine function which models the full defense sequence.

---

#### 5b — Attack Dice Success Weighting

##### `computeAttackDieSuccessRate(dieColor, attackSurgeChart)`

Uses the 8-sided attack die face distributions to compute the probability of a "success" (hit or crit) per die:

| Die Color | Hits | Crits | Surges | Blanks |
|-----------|------|-------|--------|--------|
| **Red**   | 5    | 1     | 1      | 1      |
| **Black** | 3    | 1     | 1      | 3      |
| **White** | 1    | 1     | 1      | 5      |

Surge conversion depends on the unit's `attackSurgeChart`:
- `AttackSurgeChart.None` → surge is a blank (0 value)
- `AttackSurgeChart.ToHit` → surge counts as a hit (+1 success)
- `AttackSurgeChart.ToCrit` → surge counts as a crit (+1 success)

**Effective success rate per die:**

| Die Color | Surge→None | Surge→Hit | Surge→Crit |
|-----------|-----------|-----------|------------|
| **White** | 2/8 = 0.250 | 3/8 = 0.375 | 3/8 = 0.375 |
| **Black** | 4/8 = 0.500 | 5/8 = 0.625 | 5/8 = 0.625 |
| **Red**   | 6/8 = 0.750 | 7/8 = 0.875 | 7/8 = 0.875 |

Returns the success rate (0–1) for a given die color and surge chart.

---

#### 5c — Dice Output by Range

##### `computeDiceByRange(unit, upgrades)`

For each range band (Melee, 1, 2, 3, 4, 5):

1. Collect all weapons from `unit.weapons` + `upgrade.weapons` (excluding weapons from upgrades where `noncombatant === true`) that cover this range band:
   - Melee weapons: `weaponType === AttackType.Melee` → count in the "Melee" band regardless of range fields
   - Ranged weapons: `minRange <= band <= maxRange` (where `minRange` defaults to 1 if absent, `maxRange` required)
   - Hybrid weapons: contribute to both Melee band AND ranged bands within their min/max range
2. Sum dice across all eligible weapons (each weapon contributes its full dice to the pool at that range)
3. For multi-mini units: multiply base weapon dice by `figures` (+ non-noncombatant `addsMiniature` upgrades) — only for weapons that are the unit's "base" weapon (typically the unnamed/default weapon that every mini carries). Named/unique weapons are not multiplied.
4. **Compute expected successes**: For each die in the pool, multiply by `computeAttackDieSuccessRate(color, unit.attackSurgeChart)` and sum:
   ```
   expectedSuccesses = redDice × redRate + blackDice × blackRate + whiteDice × whiteRate
   ```
5. **Compute attacking efficacy**: `expectedSuccesses / totalDice` (0 if totalDice is 0)
6. Return `{ rangeBand, redDice, blackDice, whiteDice, totalDice, expectedSuccesses, attackingEfficacy }`

**Important**: Arsenal X limits how many weapons a unit can use. The function should respect `unit.keywords.arsenalX` if present — only the top X weapons by total dice contribute. If no Arsenal keyword, multi-weapon units add all eligible weapons (the game default for most multi-weapon units is Arsenal 2 or similar, but this is already reflected in enrichment keywords).

---

#### 5d — Anti-Armor Tech

##### `computeAntiArmorStats(resolvedListUnits)`

Tallies across all units in the army:
- **`totalImpact`**: Σ `impactX` from all eligible weapons (respecting Arsenal limits per unit)
- **`totalCritical`**: Σ `criticalX` from all eligible weapons
- **`totalIon`**: Σ `ionX` from all eligible weapons
- **`surgeToCritUnitCount`**: Count of units where `attackSurgeChart === AttackSurgeChart.ToCrit`

These mechanics all interact with the Armor keyword — Impact converts hits→crits, Critical converts surges→crits, Ion deals ion tokens (disabling vehicles), and surge→crit produces natural crits that bypass armor.

---

#### 5e — Cover Denial

##### `computeCoverDenialStats(resolvedListUnits)`

- **`sharpshooterUnits`**: Count of units with `sharpshooterX` keyword (from unit or equipped upgrades)
- **`totalSharpshooter`**: Σ `sharpshooterX` values across those units
- **`blastWeaponCount`**: Count of weapons with `blast` keyword across all units
- **`highVelocityWeaponCount`**: Count of weapons with `highVelocity` keyword (cannot be dodged)

These mechanics bypass or reduce cover saves — Sharpshooter reduces cover, Blast ignores cover entirely, High Velocity prevents dodge spending.

---

#### 5f — Suppression & Control

##### `computeSuppressionStats(resolvedListUnits)`

- **`suppressiveWeaponCount`**: Count of weapons with `suppressive` keyword
- **`scatterWeaponCount`**: Count of weapons with `scatter` keyword

Suppression degrades enemy activations and forces panic tests. Scatter applies suppression to multiple units.

---

#### 5g — Deployment Advantage

##### `computeDeploymentKeywords(resolvedListUnits)`

Returns `KeywordTally[]` for deployment-related keywords. Only keywords actually present in the army are included (no zero-count entries).

**Keywords tracked:**

| Keyword | Label | Type | Description |
|---------|-------|------|-------------|
| `infiltrate` | Infiltrate | boolean | Deploy anywhere beyond range 3 of enemies |
| `scoutX` | Scout | numeric | Free speed-X move before first round |
| `scoutingPartyX` | Scouting Party | numeric | Grant Scout X to nearby non-Scout units |
| `reinforcements` | Reinforcements | boolean | Set aside, deploy later in game |
| `covertOps` | Covert Ops | boolean | Deploy after all other units placed |
| `preparedPosition` | Prepared Position | boolean | Deploy with a standby or dodge token |
| `incognito` | Incognito | boolean | Cannot be attacked until revealed |

---

#### 5h — Action Economy

##### `computeActionEconomy(resolvedListUnits)`

Returns two `KeywordTally[]` arrays: **self-benefit** keywords (the unit itself gets more value per action) and **support** keywords (the unit grants actions/tokens to other units).

**Self-benefit keywords (action compression for the unit itself):**

| Keyword | Label | Type | Effect |
|---------|-------|------|--------|
| `relentless` | Relentless | boolean | Attack after move |
| `steady` | Steady | boolean | Gain aim token after move |
| `charge` | Charge | boolean | Melee attack after move |
| `tacticalX` | Tactical | numeric | Gain X aim tokens after move |
| `agileX` | Agile | numeric | Gain X dodge tokens after move |
| `reposition` | Reposition | boolean | Free pivot |
| `attackRun` | Attack Run | boolean | Attack during a move |
| `quickThinking` | Quick Thinking | boolean | Gain aim + dodge on standby trigger |
| `dauntless` | Dauntless | boolean | Free move when suppressed |
| `readyX` | Ready | numeric | Recover exhausted cards without action |
| `spur` | Spur | boolean | Extra move at cost of suppression |
| `gunslinger` | Gunslinger | boolean | Extra ranged attack action |
| `jarKaiMastery` | Jar'Kai Mastery | boolean | Extra melee attack with second weapon |
| `combat mastery` | Combat Mastery | boolean | Extra attack action in melee |

**Support keywords (force multipliers for other units):**

| Keyword | Label | Type | Effect |
|---------|-------|------|--------|
| `guidance` | Guidance | boolean/string | Grant free non-attack action to nearby unit |
| `pullingTheStrings` | Pulling the Strings | boolean | Fully control another unit's activation |
| `coordinate` | Coordinate | string | Issue order to unit type when receiving order |
| `direct` | Direct | string | Issue order to unit type when receiving order |
| `spotterX` | Spotter | numeric | Grant aim tokens to nearby units |
| `fireSupport` | Fire Support | boolean | Contribute dice to another unit's ranged attack |
| `barrage` | Barrage | boolean | Contribute dice to another unit's attack |
| `compel` | Compel | boolean | Force suppressed nearby unit to move |
| `authoritative` | Authoritative | boolean | Return and reissue orders |
| `masterOfTheForceX` | Master of the Force | numeric | Ready exhausted Force upgrade cards |
| `observeX` | Observe | numeric | Grant observation tokens to enemy units |
| `inspireX` | Inspire | numeric | Remove suppression from nearby units |
| `demoralizeX` | Demoralize | numeric | Add suppression to nearby enemy units |

Only keywords present on at least one unit in the army are included.

---

#### 5i — Defensive Profile

##### `computeDefensiveProfile(resolvedListUnits)`

**Save Tier Breakdown** — groups units into save-quality tiers:

| Tier | Die Color | Surge Chart | Save Probability |
|------|-----------|-------------|-----------------|
| Red + Surge→Block | Red | ToBlock | 4/6 ≈ 0.667 |
| Red, No Surge | Red | None | 3/6 = 0.500 |
| White + Surge→Block | White | ToBlock | 2/6 ≈ 0.333 |
| White, No Surge | White | None | 1/6 ≈ 0.167 |

For each tier: count of units and total wounds (health × figures + non-noncombatant upgrades) in that tier. Returns `SaveTier[]`.

**Defensive Keywords** — returns `KeywordTally[]` for defense-relevant keywords:

| Keyword | Label | Type | Description |
|---------|-------|------|-------------|
| `nimble` | Nimble | boolean | Regain dodge after being attacked (dodge economy) |
| `agileX` | Agile | numeric | Gain dodge after move (dodge economy) |
| `block` | Block | boolean | Spend dodge → cancel hit (dodge economy) |
| `deflect` | Deflect | boolean | Reflect + surge→block with dodge (dodge economy) |
| `outmaneuver` | Outmaneuver | boolean | Cancel crit with dodge (dodge economy) |
| `soresuMastery` | Soresu Mastery | boolean | Reroll defense dice with dodge (dodge economy) |
| `duelistDefender` | Duelist | boolean | Extra dodge in melee (dodge economy) |
| `backup` | Backup | boolean | Gain dodge from nearby units (dodge economy) |
| `armorX` | Armor | numeric | Cancel X non-crit hits |
| `shieldedX` | Shielded | numeric | Shield tokens |
| `guardianX` | Guardian | numeric | Intercept hits for nearby unit |
| `immunePierce` | Immune: Pierce | boolean | Pierce has no effect |
| `immuneBlast` | Immune: Blast | boolean | Blast has no effect |
| `immuneMelee` | Immune: Melee | boolean | Cannot be engaged in melee |
| `impervious` | Impervious | boolean | Crits→hits for defense |
| `lowProfile` | Low Profile | boolean | Light cover → heavy cover |
| `dangerSenseX` | Danger Sense | numeric | Roll extra defense dice per suppression |
| `uncannyLuckX` | Uncanny Luck | numeric | Free defense die rerolls |
| `katarnPatternArmor` | Katarn Armor | boolean | Cap wounds to 1 from non-melee |
| `coverX` | Cover | numeric | Innate cover |
| `regenerateX` | Regenerate | numeric | Heal X wounds per activation |

Only keywords present in the army are included.

---

#### 5j — Composition (Rank Breakdown)

##### `computeRankBreakdown(resolvedListUnits, totalPoints)`

Groups units by rank and computes:
- Count of units per rank
- Total points invested per rank (unit base cost + equipped upgrade costs)
- Percentage of army points: `rankPoints / totalPoints`

Returns `RankBreakdown[]` in display order: Commander → Operative → Corps → Special Forces → Support → Heavy.

---

#### 5k — Aggregate Entry Point

##### `aggregateArmyStats(resolvedListUnits, importedMeta)`

Orchestrates all computation functions and returns a complete `ArmyStats` object:

```
totalPoints = Σ(unit.cost + Σ(upgrade.cost)) for all resolved units
activationCount = number of units
totalWounds = Σ(unit.health × figures + non-noncombatant addsMiniature)
totalEffectiveWounds = Σ(computeEffectiveWounds per unit)
totalMiniatures = Σ(unit.figures + non-noncombatant addsMiniature)
avgPointsPerActivation = totalPoints / activationCount

diceByRange = aggregate computeDiceByRange per unit, per band
  → sum raw dice per color per band
  → recompute expectedSuccesses & attackingEfficacy for aggregated totals
    (note: army-level efficacy is a weighted average, not a simple mean,
     because each unit contributes different surge charts — the aggregated
     expectedSuccesses is the true sum, and efficacy = sum / totalDice)

antiArmor = computeAntiArmorStats(units)
coverDenial = computeCoverDenialStats(units)
suppression = computeSuppressionStats(units)
deploymentKeywords = computeDeploymentKeywords(units)
actionEconomy = computeActionEconomy(units)
defensiveProfile = computeDefensiveProfile(units)
unitsByRank = computeRankBreakdown(units, totalPoints)

commandCards = importedMeta.commandCards ?? []
contingencies = importedMeta.contingencies ?? []
```

**Test cases** (`armyStats.test.ts`):

| Test | Assertion |
|------|-----------|
| White die no surge: save probability | ≈ 0.167 |
| Red die with surge→block: save probability | ≈ 0.667 |
| Effective wounds: 1-health white-die 1-fig unit | ≈ 1.2 |
| Effective wounds: 8-health red-die-with-surge unit (Vader) | ≈ 24 |
| Attack die success rate: red + surge→crit | 7/8 = 0.875 |
| Attack die success rate: white + no surge | 2/8 = 0.250 |
| Attack die success rate: black + surge→hit | 5/8 = 0.625 |
| Dice-by-range: R1-3 weapon | Non-zero at R1/R2/R3, zero at R4+ |
| Dice-by-range: melee weapon | Non-zero at Melee, zero at all ranged bands |
| Expected successes: 6 red dice + surge→crit | 6 × 0.875 = 5.25 |
| Attacking efficacy: all red + surge→crit | 0.875 |
| Attacking efficacy: mixed pool (red+white) | Weighted average, not simple average |
| Noncombatant mini excluded from dice | `addsMiniature=1, noncombatant=true` upgrade does not increase dice |
| Anti-armor: unit with Impact 2 weapon | `totalImpact` includes 2 |
| Anti-armor: surge→crit unit counted | `surgeToCritUnitCount` increments |
| Cover denial: sharpshooter 1 unit | `sharpshooterUnits: 1, totalSharpshooter: 1` |
| Cover denial: blast weapon counted | `blastWeaponCount` increments |
| Deployment: infiltrate + scout 2 unit | `deploymentKeywords` includes both |
| Action economy: relentless unit | Appears in `actionEconomySelf` |
| Action economy: fire support unit | Appears in `actionEconomySupport` |
| Save tier: red+surge unit | Grouped in "Red + Surge→Block" tier |
| Save tier: white no-surge unit | Grouped in "White, No Surge" tier |
| Rank breakdown: 2 commanders at 70pts each | `{ rank: 'Commander', count: 2, points: 140, percentage: 0.14 }` |
| Army aggregation sums correctly | Two units' wounds + dice + keywords aggregate |

### Step 6 — List Parser

**File:** `src/data/listParser.ts`

```ts
export function parseListJson(raw: string): ResolvedList | { error: string }
```

Steps:
1. **Parse JSON**: `try { JSON.parse(raw) } catch → { error: "Invalid JSON" }`
2. **Validate shape**: Check `typeof parsed.units === 'array'` and `parsed.units.length > 0`. Return error if missing.
3. **Resolve faction**: `resolveFaction(parsed.armyFaction, parsed.battleForce)` — null if unknown (proceed with faction-agnostic matching)
4. **Resolve each unit**:
   ```
   for each unitJson in parsed.units:
     unitMatch = matchUnitByName(unitJson.name, faction)
     upgradeMatches = []
     // Combine upgrades[] and loadout[] into a single list for matching
     allUpgradeNames = [...(unitJson.upgrades ?? []), ...(unitJson.loadout ?? [])]
     for each upgradeName in allUpgradeNames:
       upgradeMatch = matchUpgradeByName(upgradeName, unitContext)
       upgradeMatches.push(upgradeMatch)
     → ResolvedListUnit
   ```
5. **Compute army stats**: `aggregateArmyStats(resolvedUnits)`
6. **Collect warnings**: Unmatched units, unmatched upgrades, faction resolution failures
7. **Return** `ResolvedList`

**Test cases** (`listParser.test.ts`):

**Prerequisite: Sample JSON fixtures** — Capture and commit real exported JSON from Tabletop Admiral and LegionHQ as test fixtures in `src/data/__tests__/fixtures/tta-sample.json` and `legionhq-sample.json`. These are the source-of-truth for the `ImportedListJson` interface validation and parser tests.

- Parse Tabletop Admiral sample JSON → 14 units resolved, points = 999
- Parse Legion HQ sample JSON → 10 units resolved
- Invalid JSON string → `{ error: "Invalid JSON..." }`
- JSON with no `units` array → `{ error: "No units array found" }`
- JSON with unknown faction → resolves with null faction, adds warning
- Partially matched list → warnings for unresolved upgrades but successfully parsed units

### Step 7 — List Store

**File:** `src/stores/listStore.ts`

```ts
interface ListState {
  rawJson: string;
  resolvedList: ResolvedList | null;
  parseError: string | null;
  selectedUnitIndex: number | null;
  showArmyStats: boolean;

  importList: (json: string) => void;
  selectUnit: (index: number) => void;
  showArmyOverview: () => void;
  clearList: () => void;
}
```

**`rawJson` note:** Stored for potential future re-import or "copy JSON" features. Not displayed in the current UI — if this field proves unnecessary, it can be removed.
```

| Action | Behavior |
|--------|----------|
| `importList(json)` | Calls `parseListJson(json)`. On success: sets `resolvedList`, clears `parseError`, sets `showArmyStats: true`, clears `selectedUnitIndex`. On error: sets `parseError`, clears `resolvedList`. |
| `selectUnit(index)` | Sets `selectedUnitIndex`, sets `showArmyStats: false` |
| `showArmyOverview()` | Clears `selectedUnitIndex`, sets `showArmyStats: true` |
| `clearList()` | Resets all fields to initial state |

### Step 8 — List Analyzer Components

**Directory:** `src/components/ListAnalyzer/`

#### 8a — `JsonImportSection.tsx`

Two visual states:

**Pre-import**: Full textarea (6-8 rows) with placeholder text describing the format. "Import List" button below. Error message display (red text) if parse fails.

**Post-import**: Collapsed summary bar showing `{listName} — {points}pts` with a "✕ Clear" button. Clicking Clear calls `clearList()`.

#### 8b — `UnitListPanel.tsx`

Left-side scrollable panel. Contains:
- `JsonImportSection` at top
- Units grouped by rank using `SectionHeader` (collapsible):
  - Group order: Commanders → Operatives → Corps → Special Forces → Support → Heavy
  - Group header: `"Commanders (2)"` with chevron
  - On mobile: sections start **collapsed**. On desktop: sections start **expanded**.
- Each unit renders as a `UnitListItem`

#### 8c — `UnitListItem.tsx`

Compact row:
```
┌──────────────────────────────────────┐
│  Din Djarin                  105pts  │
│  The Mandalorian                     │
│  ⬜ 1♥ · 3 upgrades                 │
└──────────────────────────────────────┘
```

- Name in `text-sm font-semibold text-gray-100`
- Title (if present) in `text-xs text-gray-400`
- Bottom row: defense die icon (⬜ or 🟥 — small colored square), health, upgrade count
- Click handler: `selectUnit(index)`
- **Keyboard accessibility**: Use `<button>` element (or `role="button"` with `tabIndex={0}` and `onKeyDown` for Enter/Space) to ensure keyboard navigability, consistent with existing shared components (SectionHeader, Toggle)
- Selected state: `ring-2 ring-blue-500 bg-gray-800` (vs default `bg-gray-900`)
- Unmatched units: `ring-1 ring-amber-500/50` with warning icon, showing raw name + "⚠ Unresolved"

#### 8d — `DetailPanel.tsx`

Conditional renderer:
```tsx
function DetailPanel() {
  const { resolvedList, selectedUnitIndex, showArmyStats } = useListStore();

  if (!resolvedList) return <EmptyState />;
  if (showArmyStats) return <ArmyStatsView stats={resolvedList.stats} meta={resolvedList.meta} />;
  if (selectedUnitIndex !== null) return <UnitDetailView unit={resolvedList.units[selectedUnitIndex]} />;
  return <ArmyStatsView stats={resolvedList.stats} meta={resolvedList.meta} />;
}
```

#### 8e — `ArmyStatsView.tsx`

Two-tier layout using existing shared components. All Tier 2 sections use `SectionHeader` (collapsible).

**Tier 1 — Key Stat Cards** (2×3 grid using `StatCard`):
- Total Points, Activations, Total Miniatures
- Total Wounds, Effective Wounds (with "≈" prefix), Avg Pts/Activation

**Tier 2A — Dice Output by Range** (`RangeDiceTable` component):
- Collapsible section header: `"Dice Output by Range"`
- Table with two column groups:
  - **Raw Dice**: Range Band, 🔴, ⚫, ⚪, Total Dice
  - **Effectiveness**: Exp. Successes, Atk. Efficacy
- Each column header has a tooltip (see §8g for tooltip text)
- Rows with 0 total dice are hidden
- Used by both `ArmyStatsView` (army totals) and `UnitDetailView` (per-unit dice)

**Tier 2B — Anti-Armor Tech** (stat rows):
- Collapsible section header: `"Anti-Armor Tech"`
- `StatRow` entries: Impact (total), Critical (total), Ion (total), Surge→Crit (units/total)
- Only show rows with non-zero values

**Tier 2C — Cover Denial** (stat rows):
- Collapsible section header: `"Cover Denial"`
- `StatRow` entries: Sharpshooter (units + total value), Blast (weapon count), High Velocity (weapon count)
- Only show rows with non-zero values

**Tier 2D — Suppression & Control** (stat rows):
- Collapsible section header: `"Suppression & Control"`
- `StatRow` entries: Suppressive (weapon count), Scatter (weapon count)
- Only show rows with non-zero values. Entire section hidden if both are zero.

**Tier 2E — Deployment Advantage** (`KeywordTallySection` component):
- Collapsible section header: `"Deployment Advantage"`
- Renders `KeywordTally[]` as stat rows: label, unit count, and total value (for numeric keywords)
- Only keywords present in the army are shown. Entire section hidden if no deployment keywords.

**Tier 2F — Action Economy** (`KeywordTallySection` × 2):
- Collapsible section header: `"Action Economy"`
- Two sub-groups with subtle sub-headers (`text-xs text-gray-500 uppercase tracking-wide`):
  - **"Self"** — keywords that give the unit itself more value per action
  - **"Support"** — keywords that grant actions/tokens to other units
- Only keywords present in the army are shown per sub-group. Entire section hidden if no action economy keywords.

**Tier 2G — Defensive Profile** (`SaveTierBreakdown` + `KeywordTallySection`):
- Collapsible section header: `"Defensive Profile"`
- **Save Tier Breakdown** — compact bar or rows showing each tier: label, unit count, wound count
  - Color-coded: red tiers in `text-red-400`, white tiers in `text-gray-300`
  - Only tiers with at least one unit are shown
- **Defensive Keywords** — stat rows for dodge economy, armor, shields, guardian, immune keywords
- Only keywords present in the army are shown.

**Tier 2H — Units by Rank** (table):
- Collapsible section header: `"Units by Rank"`
- Table with columns: Rank, Count, Points, % of Army
- One row per rank present in the army
- Display order: Commander → Operative → Corps → Special Forces → Support → Heavy

**Tier 2I — Command Cards** (simple list):
- Collapsible section header: `"Command Cards"`
- Bullet list of command card names in `text-sm text-gray-300`
- **Contingencies** (if present): Rendered as a separate labeled sub-list below command cards with `"Contingencies"` heading

**Tier 2J — Battlefield Deck** (if present):
- Collapsible section header: `"Battlefield Deck"`
- Conditions, Deployments, Objectives as labeled lists
- Each category rendered as a comma-separated inline list with a bold label or as a bullet list if items are long

#### 8f — `UnitDetailView.tsx`

Sections:

1. **Header**: Unit name (large), title (smaller), with **"← Army Stats"** button in top-left
2. **Stat Cards** (row of `StatCard`s):
   - Points (base + upgrades), Health, Figures, Defense Die (colored icon), Eff. Wounds
3. **Keywords** (if any):
   - Comma-separated keyword list from unit + relevant upgrades
   - Keywords with numeric values shown as `"Pierce 2"`, boolean as just the name
4. **Weapons Table**:
   - Each weapon as a row:
     - Name, range string (e.g., `"R1–3"` or `"Melee"`), dice via `DiceIconDisplay`
     - Weapon keywords below dice (italic, `text-xs text-gray-400`)
   - Includes upgrade-granted weapons (marked with upgrade name)
5. **Equipped Upgrades**:
   - List of resolved upgrades with cost each
   - Unresolved upgrades show `"⚠ {rawName} — not found"` in amber text
   - Total cost line: `"Total: {base} + {upgradeTotal} = {total}pts"`
6. **Simulate Buttons**:
   - Two full-width buttons stacked vertically:
     - `"⚔️ Simulate as Attacker"` — blue primary button style
     - `"🛡 Simulate as Defender"` — gray secondary button style
   - Only enabled if unit was successfully resolved (`resolvedUnit !== null`) **and** `resolvedUnit.isEnriched === true` (units without enriched weapon data would load as empty skeleton presets)
   - Disabled state shows tooltip: "Unit data not available for simulation"

#### 8g — `RangeDiceTable.tsx`

Dedicated component for the range-band dice output table with both raw dice and weighted success metrics:

```tsx
// Column groups:
//   Raw Dice:      Range | 🔴 | ⚫ | ⚪ | Total Dice
//   Effectiveness: Exp. Successes | Atk. Efficacy
//
// Rows:  R1 |  4  | 12  |  8  |  24  | 14.8 | 62%
//        R2 |  4  | 12  |  4  |  20  | 12.1 | 61%
//        ...
```

**Styling:**
- Dark table styling: `bg-gray-800` header row, alternating `bg-gray-900`/`bg-gray-850` rows
- Range band labels in first column
- Dice counts as numbers with subtle color coding (red text `text-red-400` for red dice column, `text-gray-100` for black, `text-gray-400` for white)
- Expected successes in `text-blue-300 font-semibold` (the headline number)
- Attacking efficacy as percentage in `text-gray-300`
- Zero values shown as `—` or faded `text-gray-600`
- Rows with 0 total dice are hidden

**Column header tooltips** (rendered via `title` attribute or a small `?` hover icon with popover, using `bg-gray-800 text-gray-200 text-xs rounded px-2 py-1` styling):

| Header | Tooltip Text |
|--------|-------------|
| **Range** | "The range band at which these weapons can fire. Melee requires base contact. R1–R5 are increasing distances." |
| **🔴** | "Red attack dice. 5 hits, 1 crit, 1 surge, 1 blank per die (8 faces). Highest quality attack die." |
| **⚫** | "Black attack dice. 3 hits, 1 crit, 1 surge, 3 blanks per die (8 faces). Medium quality." |
| **⚪** | "White attack dice. 1 hit, 1 crit, 1 surge, 5 blanks per die (8 faces). Lowest quality attack die." |
| **Total Dice** | "Total attack dice the army can throw at this range band, combining all eligible weapons across all units." |
| **Exp. Successes** | "Expected successful results (hits + crits) per attack at this range. Each die is weighted by its color and the firing unit's surge conversion (surge→hit and surge→crit count as successes; surge→blank does not)." |
| **Atk. Efficacy** | "Attacking Efficacy — the percentage of dice that produce a successful result (hit or crit) at this range. Higher values mean better quality dice and surge conversion. Ranges from ~25% (all white, no surge) to ~88% (all red, surge→crit)." |

- Used by both `ArmyStatsView` (army totals) and `UnitDetailView` (per-unit dice)
- In `UnitDetailView`, the table shows the single unit's dice output (not aggregated). The efficacy reflects that individual unit's `attackSurgeChart`.

#### 8h — `SimulateButton.tsx`

The navigate-to-simulator logic is **extracted into a hook** (`src/hooks/useNavigateToSimulator.ts`) per the component instruction that components should not contain complex cross-store logic. The component calls the hook and renders the buttons.

**Hook:** `useNavigateToSimulator(resolvedListUnit)`

Handles the navigate-to-simulator flow:

```ts
function handleSimulate(target: 'attacker' | 'defender') {
  const unit = resolvedListUnit;
  if (!unit.resolvedUnit) return;

  if (target === 'attacker') {
    // Find the attacker preset for this unit
    // For single-mini units: multiple presets exist (one per weapon). Use the first one
    // matching the current attackType, or fall back to the first available preset.
    // For multi-mini units: one merged preset exists with ID = unit.id.
    const presets = getAttackerPresets(unit.resolvedUnit.faction);
    const preset = presets.find(p => p.id === unit.resolvedUnit!.id)
                || presets.find(p => p.id.startsWith(unit.resolvedUnit!.id));
    if (preset) {
      attackStore.loadPreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId, {
        rank: preset.rank, unitType: preset.unitType,
        affiliation: preset.unitAffiliation, faction: preset.faction,
      });
      // Equip upgrades in order
      unit.resolvedUpgrades.forEach((upgrade, i) => {
        if (upgrade) {
          attackStore.equipUpgrade(unit.slotMapping[i], upgrade.id);
        }
      });
      attackStore.setActiveMode('unit-builder');
      attackStore.setSelectedFaction(preset.faction);
    }
  } else {
    // Similar flow for defender using defenseConfigStore
    const preset = getDefenderPresetById(unit.resolvedUnit.id);
    if (preset) {
      defenseStore.loadPreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId, {
        rank: preset.rank, unitType: preset.unitType,
        affiliation: preset.unitAffiliation, faction: preset.faction,
      });
      unit.resolvedUpgrades.forEach((upgrade, i) => {
        if (upgrade) {
          defenseStore.equipUpgrade(unit.slotMapping[i], upgrade.id);
        }
      });
      defenseStore.setActiveMode('unit-builder');
      defenseStore.setSelectedFaction(preset.faction);
    }
  }

  navigate('/');
}
```

### Step 9 — ListAnalyzerPage Assembly

**File:** `src/pages/ListAnalyzerPage.tsx`

```tsx
export default function ListAnalyzerPage() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[minmax(280px,1fr)_minmax(320px,2fr)] md:gap-0 md:divide-x md:divide-gray-800">
      <div className="order-1 flex min-h-0 flex-col overflow-y-auto md:pr-4">
        <UnitListPanel />
      </div>
      <div className="order-2 flex min-h-0 flex-col overflow-y-auto md:pl-4">
        <DetailPanel />
      </div>
    </div>
  );
}
```

- On screens ≥ `md` (768px): two-column layout with the left panel taking ~1/3 and detail panel ~2/3
- On screens < `md`: single column, left panel stacked above detail panel
- **Note on breakpoints**: The existing simulator uses `lg:` (1024px) for its full 3-column desktop layout. The List Analyzer uses `md:` (768px) for its simpler 2-column split. At 768px, the left panel gets ~280px and the detail panel gets ~480px, which is adequate. If testing reveals the 2-panel layout is too cramped at 768px, consider bumping to `lg:` breakpoint.

### Step 10 — Tests

#### `src/data/listMatcher.test.ts`
| Test | Assertion |
|------|-----------|
| Exact unit match: `"Shoretroopers"` | Returns unit with id `shoretroopers`, confidence `exact` |
| Name+title: `"Din Djarin The Mandalorian"` | Returns `din-djarin-the-mandalorian`, confidence `exact` |
| Name+title: `"Imperial Officer Ruthless Efficiency"` | Returns correctly |
| Unknown unit: `"Nonexistent Unit"` | Returns `null`, confidence `none`, warning present |
| Upgrade exact: `"T-21B Shoretrooper"` in shoretroopers context | Returns the heavy-weapon upgrade |
| Upgrade not found: `"Fake Upgrade"` | Returns `null` with warning |
| Faction-scoped: Empire faction filters to Empire + mercenary units | Correct match |

#### `src/data/listParser.test.ts`  
| Test | Assertion |
|------|-----------|
| TTA format (14 units, 999pts) | Resolves all units, stats.totalPoints = 999 |
| LegionHQ format (10 units, battleForce) | Resolves units, faction inferred from battleForce |
| Invalid JSON | Returns `{ error }` with message |
| Missing `units` array | Returns `{ error }` |
| Partially matched list | Returns resolved list with warnings for unmatched entries |

#### `src/data/armyStats.test.ts`
| Test | Assertion |
|------|-----------|
| White die save probability | ≈ 0.167 |
| Red die + surge→block save probability | ≈ 0.667 |
| Effective wounds: 1-health white-die 1-fig unit | ≈ 1.2 |
| Effective wounds: multi-fig unit | Scales with figure count |
| Dice-by-range: R1-3 weapon | Non-zero at R1/R2/R3, zero at R4+ |
| Dice-by-range: melee weapon | Non-zero at Melee, zero at all ranged bands |
| Noncombatant mini excluded from dice | `addsMiniature=1, noncombatant=true` upgrade does not increase dice | 
| Army aggregation sums correctly | Two units' wounds + dice aggregate |

#### `src/components/ListAnalyzer/ListAnalyzerPage.test.tsx`
| Test | Assertion |
|------|-----------|
| Renders import section on load | Textarea and Import button visible |
| Paste + Import shows unit list | Unit names visible in left panel |
| Army stats shown by default | "Army Overview" heading visible, stat cards rendered |
| Click unit → detail view | Unit name visible, "Army Stats" button visible |
| Click "Army Stats" → returns to aggregate | Army stat cards visible again |
| Simulate button navigates | Calls `navigate('/')` and store `loadPreset` |

### Step 11 — Polish & Integration

1. **Styling consistency**: All new components use existing dark theme tokens:
   - Backgrounds: `bg-gray-950` (page), `bg-gray-900` (panels), `bg-gray-800` (cards/table headers)
   - Borders: `border-gray-800`, `border-gray-700`
   - Text: `text-gray-100` (primary), `text-gray-300` (secondary), `text-gray-400` (muted)
   - Accents: `text-blue-400` (links), `bg-blue-600` (primary buttons), `text-amber-400` (warnings)

2. **Reuse shared components**: `PanelShell` (for left panel wrapper), `SectionHeader` (for rank groups), `StatCard` (for stat boxes), `StatRow` (for rank counts), `DiceIconDisplay` (for weapon dice in unit detail)

3. **Defense die indicator**: Small colored square inline:
   - White die: `bg-gray-100 ring-1 ring-gray-400` (4×4px rotated diamond, like `DiceIconDisplay`)
   - Red die: `bg-red-500 ring-1 ring-red-600`

4. **Error states**: Red-tinted error message below textarea on parse failure. Amber warning badges on unresolved units/upgrades.

5. **Loading state**: Brief spinner while parsing (for large lists). Most parsing is synchronous and fast, so this may not be visually necessary.

6. **Tauri compatibility**: `createHashRouter` avoids `file://` protocol issues in Tauri's webview. No special configuration needed — hash routing works natively.

---

## Verification Checklist

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run test:run` — all new and existing tests pass
- [ ] `npm run test:e2e` — existing E2E tests still pass with hash routing
- [ ] Manual: paste TTA sample JSON → 14 units resolve → army stats display 999pts, 14 activations
- [ ] Manual: paste LegionHQ sample JSON → 10 units resolve → faction inferred from "Shadow Collective"
- [ ] Manual: army stats view shows effective wounds, dice-by-range table (with expected successes + attacking efficacy), rank breakdown
- [ ] Manual: dice output table column headers have hover tooltips explaining each metric
- [ ] Manual: anti-armor tech section shows impact/critical/ion totals and surge→crit count
- [ ] Manual: cover denial section shows sharpshooter/blast/high velocity counts
- [ ] Manual: suppression section shows suppressive/scatter weapon counts (hidden if zero)
- [ ] Manual: deployment advantage section shows infiltrate/scout/reinforcements/scouting party tallies
- [ ] Manual: action economy section shows self and support sub-groups with keyword tallies
- [ ] Manual: defensive profile shows save tier breakdown (red+surge, red, white+surge, white) with unit/wound counts
- [ ] Manual: units by rank section shows count, points, and percentage per rank
- [ ] Manual: stat card row shows 6 cards: Points, Activations, Miniatures, Wounds, Eff. Wounds, Pts/Activation
- [ ] Manual: Tier 2 sections are collapsible and only show rows with non-zero values
- [ ] Manual: contingencies displayed below command cards when present
- [ ] Manual: click a unit → detail panel switches to unit info with weapons, upgrades, keywords
- [ ] Manual: click "← Army Stats" → returns to aggregate view
- [ ] Manual: click "Simulate as Attacker" → navigates to `/#/`, unit + upgrades loaded in attacker panel
- [ ] Manual: click "Simulate as Defender" → same flow for defender panel
- [ ] Manual: simulate buttons disabled for un-enriched units with appropriate tooltip
- [ ] Manual: paste malformed JSON → clear error message, no crash
- [ ] Manual: mobile viewport (< 768px) → panels stack, rank sections collapsed by default
- [ ] Manual: desktop viewport → two-panel side-by-side layout
- [ ] Manual: unit list items are keyboard-accessible (Tab, Enter/Space to select)
- [ ] Nav links work: Simulator ↔ List Analyzer, browser back/forward (hash routes)
- [ ] Existing simulator functionality unaffected (no regressions)
- [ ] `npm run build` — production build succeeds
- [ ] Noncombatant miniatures excluded from dice pool calculations
- [ ] Noncombatant miniatures included in health/wound totals

---

## Future Enhancements (Out of Scope)

- **Drag-and-drop JSON file import** alongside paste
- **URL import**: Parse list builder links to extract list data
- **Persistent list storage**: Save imported lists to localStorage
- **Compare two lists side-by-side**: Import two army lists and compare stats
- **Light list editing**: Swap upgrades or toggle loadout options within the analyzer
- **"Simulate vs."**: Auto-load one unit as attacker and another as defender for head-to-head analysis
- **Enhanced effective wounds via `woundEstimation.ts`**: The existing engine function `estimateExpectedWounds()` models the full defense sequence (cover, dodge, armor, shields, danger sense, defense dice, surge conversion, rerolls, pierce). It requires full `AttackConfig`/`DefenderConfig` inputs — too heavy for army-level aggregation, but could power more accurate per-unit effective wounds in the Unit Detail view. Would need a "typical attacker" config generation helper.
- **Export army analysis**: As shareable image or text summary
- **Weapon selection for single-mini simulate**: When a single-mini unit has multiple weapon presets, present a picker before navigating to the simulator instead of auto-selecting the first
