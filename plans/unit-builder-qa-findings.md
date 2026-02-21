# Unit Builder QA Findings — February 2026

## Summary

Full interactive review of both Attacker and Defender Unit Builder modes using Playwright browser automation. Custom Pool mode, keyword gating, upgrade slots, faction filtering, and multiple sim comparison all passed. Four issues identified.

---

## Issue 1: Weapon Pool Not Expanded on Initial Unit Preset Selection

**Severity:** Critical — produces incorrect simulation results  
**Affects:** Attacker Unit Builder mode  
**Reproducible:** 100%

### Description

When a unit preset is selected in the Attacker Unit Builder, each weapon loads with the correct **display count** (e.g., "4" for Rebel Troopers' A280 Blaster Rifle) but only **1 copy** of the weapon is actually submitted to the dice pool for simulation. The weapon array rebuild only triggers when the user manually changes the count via the +/− buttons — not on initial preset load.

### Steps to Reproduce

1. Open the app fresh (or hard refresh)
2. Set Attacker Mode → Unit Builder
3. Select any multi-mini unit (e.g., Rebel Troopers)
4. Observe: Weapons section shows "A280 Blaster Rifle" with count **4** and a single black die icon
5. Set Defender → Defense Die: None (to isolate attacker output)
6. Click **Run Simulation**
7. Observe: Results show ~0.38 hits, ~0.12 crits, mean ~0.50 — consistent with **1 black die**, not 4

### Expected Behavior

Simulation should use 4 black dice (one per mini), producing ~1.50 hits, ~0.50 crits, mean ~2.00.

### Workaround

After selecting a unit, decrement any weapon count by 1, then increment it back. This triggers the rebuild and corrects the pool. With the workaround applied, results match the expected 4-die output exactly.

### Verification Data

| Scenario | Hits (avg) | Crits (avg) | Mean Wounds | ≥1 Wound |
|---|---|---|---|---|
| Unit Builder, initial load (count shows 4) | 0.38 | 0.12 | 0.50 | 50.3% |
| Unit Builder, after manual count toggle back to 4 | 1.50 | 0.49 | 1.99 | 94.0% |
| Custom Pool, 4 black dice (fresh page) | 1.51 | 0.50 | 2.01 | 93.5% |

### Likely Root Cause

The initial weapon array from the preset/upgrade applicator pipeline creates only 1 `WeaponProfile` entry per weapon name, with the count stored as display metadata. The `rebuildWeaponsFromCounts()` function in `src/utils/weaponCounts.ts` expands the single entry into N copies, but it is only called reactively on user count changes — not on the initial preset application path.

---

## Issue 2: State Leakage from Unit Builder to Custom Pool Mode (Defender)

**Severity:** Moderate — silently corrupts Custom Pool calculations  
**Affects:** Defender panel, mode switching  
**Reproducible:** 100%

### Description

When switching the Defender from Unit Builder mode (with a unit selected) to Custom Pool mode, keyword values and unit cost from the previously selected unit persist in the Custom Pool form. These stale values are used in subsequent simulations, producing incorrect results.

### Steps to Reproduce

1. Set Defender Mode → Unit Builder
2. Select AT-ST (Heavy) — sets Armor X: 5, Unit Cost: 145, Defense Die: White, Surge: Block
3. Switch Defender Mode → Custom Pool
4. Observe: Armor X still reads **5**, Unit Cost still reads **145**

### Expected Behavior

Switching to Custom Pool mode should either:
- Reset all keyword/unit-cost values to 0/defaults, OR
- Maintain a separate state for Custom Pool vs Unit Builder that doesn't cross-contaminate

### Impact

A user who selects a vehicle in Unit Builder, then switches to Custom Pool to test a custom scenario, will unknowingly have Armor 5 applied to their defender — drastically reducing the calculated wound output.

---

## Issue 3: State Corruption on Attacker Mode Switch

**Severity:** Moderate — requires page refresh to recover  
**Affects:** Attacker panel, mode switching  
**Reproducible:** Observed once during testing; may be intermittent

### Description

After using the Attacker in Unit Builder mode (Rebel Troopers selected) and then switching back to Custom Pool mode, the dice pool showed "1 black die" in the UI. After manually increasing to 4 black dice and running a simulation, results still matched only ~1 die output (mean 0.50, ≥1 wound 49.6%). The Custom Pool mode appeared to read the correct spinbutton values but the engine received stale/incorrect input.

A fresh page reload resolved the corruption; Custom Pool mode then worked correctly on its own.

### Steps to Reproduce

1. Start fresh
2. Set Attacker Mode → Custom Pool, add 4 black dice, run simulation — works correctly (mean ~2.01)
3. Switch Attacker Mode → Unit Builder, select Rebel Troopers
4. Run simulation — shows 1-die results (Issue 1)
5. Switch Attacker Mode → Custom Pool
6. Add 4 black dice, run simulation
7. Observe: Results still show ~0.50 mean, matching 1 die instead of 4

### Expected Behavior

Custom Pool mode should always compute results from the dice counts shown in its own spinbuttons, independent of any prior Unit Builder state.

### Likely Root Cause

Shared Zustand store state between modes — the `weapons` array or dice pool from the Unit Builder (containing only 1 weapon entry per Issue 1) may not be fully replaced when switching back to Custom Pool mode.

---

## Issue 4: Recharts Sizing Warnings in Console

**Severity:** Cosmetic  
**Affects:** Results panel chart rendering

### Description

The browser console shows repeated Recharts library warnings on every simulation run:

```
The width(-1) and height(-1) of chart should be greater than 0,
please check the style of container, or the props width(100%) and height(100%),
or add a minWidth(1) or minHeight(1) or use aspect(undefined) to control the height and width.
```

### Impact

No functional impact. Charts render correctly after the initial layout pass. The warnings add console noise that may obscure real errors during development/debugging.

### Likely Cause

The `ResponsiveContainer` wrapping the Recharts chart is rendered before the parent container has non-zero dimensions (e.g., during an expand/collapse transition or before the results panel is visible).

---

## Items Verified as Working Correctly

- **Custom Pool mode math** — fully accurate on a fresh page
- **Defender Unit Builder auto-population** — defense die, surge chart, minis in LOS, unit cost, upgrade slots, and keywords all load correctly for tested units (Stormtroopers, Rebel Troopers, AT-ST)
- **Keyword gating by attack type** — Ranged, Melee, and Overrun all correctly enable/disable the appropriate attacker and defender keywords
- **Faction auto-detection** — selecting a unit auto-selects its faction in the filter
- **Unit search/filter** — text input and faction dropdown work correctly together
- **Upgrade slot options** — correct options load per unit type (trooper vs vehicle)
- **Heavy weapon equip** — correctly adds weapon to pool and updates unit cost; base weapon count correctly remains unchanged (heavy adds a new mini)
- **Points efficiency calculations** — internally consistent when both attacker and defender costs are set
- **Multiple sim comparison** — tab navigation, cumulative table, and per-sim stats all display correctly
- **Overrun attack type** — correctly shows no weapons when unit has no overrun weapons, correctly enables Ram X
