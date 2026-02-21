# Mobile UX Audit — Just Roll Crits

**Date:** 2026-02-20  
**Viewports Tested:** 320×568 (iPhone SE 1st gen), 375×667 (iPhone SE 2nd/3rd gen), 390×844 (iPhone 14/15), 667×375 (landscape)  
**Method:** Playwright MCP automated inspection — accessibility snapshots, element measurements, visual screenshots, overlap/overflow detection

---

## Critical Issues

### 1. Sticky Header Consumes Excessive Vertical Space

| Viewport | Header Height | % of Viewport |
|----------|--------------|---------------|
| 375×667 (iPhone SE) | 173px | **25.9%** |
| 320×568 (iPhone SE 1st gen) | 173px | **30.5%** |
| 390×844 (iPhone 14/15) | 173px | **20.5%** |
| 667×375 (landscape) | 89px | **23.7%** |

The header is `position: sticky; top: 0` with `z-index: 20`, meaning it **permanently** consumes this space during all scrolling. On an iPhone SE, nearly **1/3 of the screen** is header — leaving only ~494px for actual content.

**Root cause:** The header layout uses `flex items-center justify-between` with three competing elements that don't collapse on mobile:
- **Logo:** 64×64px `<img>` (fixed size `h-16 w-16`)
- **Title block:** H1 "Just Roll Crits" + subtitle "A SW:Legion Dice Calculator" — these are constrained to a ~56px-wide column and wrap to **3 lines + 4 lines** respectively (84px + 64px = 148px of text)
- **Attack Type selector:** ~262px wide radio group pushed to the right

**File:** `src/Layout.tsx` (lines 11–29)

**Recommendations:**
- Hide or significantly shrink the logo on mobile (`hidden sm:block` or `h-8 w-8`)
- Collapse title to single line or hide subtitle on mobile
- Move Attack Type selector below the logo/title row (stacked layout)
- Consider making the header non-sticky on mobile, or auto-hiding on scroll-down

---

### 2. "Attack Type" Label Overlaps Title and Subtitle Text

The "Attack Type" label (66×40px, positioned at left:100, top:66) **directly overlaps** with both:
- The H1 "Just Roll Crits" (left:108, top:12–96)
- The subtitle (left:108, top:96–160)

This creates an unreadable jumble of overlapping text visible in all mobile screenshots as "Atta\*k Cr\*ts / Type" mashup.

**Root cause:** The header's `flex items-center justify-between` wraps the Attack Type selector block into a tight space, and the label text collides with the title column.

**File:** `src/components/AttackTypeSelector/AttackTypeSelector.tsx` + `src/Layout.tsx`

---

### 3. "Overrun" Radio Button Clipped/Off-Screen

| Viewport | Overrun Right Edge | Viewport Width | Overflow |
|----------|-------------------|----------------|----------|
| 375px | 386px | 375px | **11px clipped** |
| 320px | 386px | 320px | **66px clipped** |

The Attack Type radio group is 188px wide and starts at left:173, pushing the "Overrun" button past the viewport edge. At 320px, "Overrun" is completely invisible; at 375px, it's partially cut off.

**File:** `src/components/shared/SegmentedControl.tsx` — the radio group uses `overflow-hidden` which hides the overflow silently.

---

## Major Issues

### 4. Widespread Label Text Wrapping in 2-Column Grids

All `grid-cols-2` sections force labels into ~55px-wide columns, causing wrapping on nearly every keyword/counter label:

**Attacker Panel:**
| Label | Width | Est. Lines | Section |
|-------|-------|------------|---------|
| Reroll Strategy | 90px | 2 | Attacker config |
| Defeated Minis | 58px | 2 | Tokens |
| Critical X | 55px | 2 | Weapon Keywords |
| Impact X | 55px | 2 | Weapon Keywords |
| Arsenal X | 55px | 2 | Unit Keywords |
| Precise X | 55px | 2 | Unit Keywords |
| Sharpshooter X | 85px | 2 | Unit Keywords |
| Complete the Mission | 117px | 2 | Unit Keywords (checkbox) |
| Death From Above | 115px | 2 | Unit Keywords (checkbox) |

**Defender Panel:**
| Label | Width | Est. Lines | Section |
|-------|-------|------------|---------|
| Danger Sense X | 55px | 2 | Keywords |
| Shielded X | 55px | 2 | Keywords |
| Uncanny Luck X | 55px | 2 | Keywords |
| Weak Point X | 55px | 2 | Keywords |
| Complete the Mission | 117px | 2 | Keywords (checkbox) |
| Immune: Melee Pierce | 117px | 2 | Keywords (checkbox) |
| Immune: Pierce | 117px | 2 | Keywords (checkbox) |

**Root cause:** All these sections use `grid grid-cols-2 gap-x-2 gap-y-2` which halves the available width (~147px per column at 375px viewport, minus padding). Combined with the `NumberSpinner` component's fixed control widths (buttons 24–32px + input 32–48px ≈ ~100px), labels get squeezed to ~47–55px.

**Files:** 
- `src/components/AttackerPanel/WeaponKeywordsSection.tsx`
- `src/components/AttackerPanel/AttackerUnitKeywordsSection.tsx`
- `src/components/AttackerPanel/AttackerTokensSection.tsx`
- `src/components/DefenderPanel/DefenderCustomPoolView.tsx`

**Recommendations:**
- Switch `grid-cols-2` to `grid-cols-1` on mobile for NumberSpinner grids (e.g., `grid-cols-1 sm:grid-cols-2`)
- Checkboxes can remain 2-column as they're less constrained, but longer labels (Complete the Mission, Immune: Melee Pierce) should use `col-span-2` or switch to single column on mobile

---

### 5. Results Panel Action Buttons Text Wrapping

The "Run Simulation" / "Add Simulation", "Clear Results", and "Clear All" buttons all wrap text to multiple lines:

| Button | Height | Est. Lines |
|--------|--------|------------|
| Run Simulation / Add Simulation | 64px | 2–3 |
| Clear Results | 64px | 3 |
| Clear All | 64px | 3 |

These tall buttons take excessive vertical space and look broken.

**Recommendation:** Reduce button text size on mobile, use icon-only for secondary buttons (Clear), or stack buttons vertically.

---

## Moderate Issues

### 6. Touch Targets Below Minimum Size (44×44px)

**151 out of 155** interactive elements fail the [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) minimum target size of 44×44px:

| Element Type | Actual Size | Count | Issue |
|-------------|-------------|-------|-------|
| +/− stepper buttons | 24×32px | ~60 | Both dimensions too small |
| Spinbutton inputs | 32×32px | ~30 | Both dimensions too small |
| Radio buttons (SegmentedControl) | varies × 30px | ~20 | Height too small |
| Section collapse headers | varies × 24–40px | ~10 | Height too small |

**Root cause:** `NumberSpinner` uses `h-8 w-6` for compact buttons (24×32px) and `h-8 w-8` for normal buttons (32×32px). `SegmentedControl` radio group uses `min-h-[2rem]` (32px).

**Files:**
- `src/components/shared/NumberSpinner.tsx` (line 119: `buttonSize = compact ? 'h-8 w-6' : 'h-8 w-8'`)
- `src/components/shared/SegmentedControl.tsx` (line 82: `min-h-[2rem]`)

**Recommendation:** Increase minimum heights to at least 44px on mobile. Use media queries or a mobile-aware sizing prop.

---

### 7. Horizontal Scrollbar Appears Intermittently

A horizontal scrollbar was observed in the panel content area at 375px viewport width. While `document.documentElement.scrollWidth` doesn't exceed viewport width at the page level, individual panels show a scrollbar, likely due to the Overrun button overflow in the header or tight content margins.

---

### 8. Recharts Width/Height Warning on Mobile

Two console warnings on simulation:
```
The width(-1) and height(-1) of chart should be greater than 0
```

This occurs during the initial render before the chart container is measured. The chart subsequently renders correctly at 296×176px. While not a visual bug, it indicates the responsive container briefly receives invalid dimensions.

---

## Minor Issues

### 9. "Crit Fishing" Text Truncated at 320px

At 320px viewport, the "Crit Fishing" option in the Reroll Strategy segmented control is truncated to "Crit Fi..." because the control runs out of horizontal space.

### 10. Page Total Height is 3,473px (iPhone SE, all sections expanded)

With all keyword sections expanded, the page requires scrolling through 3,473px of content while the sticky header permanently occupies 173px. This creates a ratio of ~5.2 full screen scrolls needed, which is fatiguing on a small device. Consider defaulting keyword sections to collapsed on mobile.

### 11. Cumulative Probability Table Header Wraps

The header "CUMULATIVE PROBABILITY (≥ X WOUNDS)" wraps to 2 lines at mobile width, taking extra vertical space in the results panel.

### 12. Landscape Mode Header Still Large

At 667×375 (landscape), the header is 89px — better than portrait, but still 23.7% of the limited 375px vertical space. In landscape, content below the header has only ~286px of visible area.

---

## Summary of Affected Files

| File | Issues |
|------|--------|
| `src/Layout.tsx` | #1 (header height), #2 (overlap) |
| `src/components/AttackTypeSelector/AttackTypeSelector.tsx` | #2 (overlap), #3 (overflow) |
| `src/components/shared/SegmentedControl.tsx` | #3 (overflow), #6 (touch targets) |
| `src/components/shared/NumberSpinner.tsx` | #6 (touch targets) |
| `src/components/AttackerPanel/WeaponKeywordsSection.tsx` | #4 (label wrapping) |
| `src/components/AttackerPanel/AttackerUnitKeywordsSection.tsx` | #4 (label wrapping) |
| `src/components/AttackerPanel/AttackerTokensSection.tsx` | #4 (label wrapping) |
| `src/components/DefenderPanel/DefenderCustomPoolView.tsx` | #4 (label wrapping) |
| `src/components/ResultsPanel/` | #5 (button wrapping), #8 (chart warning), #11 (table header) |
| `src/components/shared/PanelShell.tsx` | #10 (consider collapsed default on mobile) |

---

## Priority Ranking

1. **Header overhaul** (#1, #2, #3) — Biggest impact, affects every screen. Redesign mobile header layout.
2. **Grid column responsiveness** (#4) — Switch NumberSpinner grids to single-column on mobile.
3. **Touch target sizing** (#6) — Accessibility compliance, affects all interactive elements.
4. **Results button layout** (#5) — Visual polish for the primary action area.
5. **Remaining items** (#7–#12) — Lower priority polish.
