# Phase 22 — Site Footer with Bug Report Overlay

## Goal

Add a persistent website footer to all pages containing contact information, a bug report form (as a modal overlay), and miscellaneous site info (disclaimer, tagline, copyright).

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/components/Footer/Footer.tsx` | Footer component with three-column responsive layout |
| `src/components/Footer/BugReportModal.tsx` | Modal overlay with summary + description form, submits via `mailto:` |
| `src/components/Footer/index.ts` | Barrel re-export |
| `src/components/Footer/Footer.test.tsx` | Co-located tests for footer and modal |

### Modified Files

| File | Change |
|------|--------|
| `src/Layout.tsx` | Import and render `<Footer />` after `</main>` |

## Component Details

### Footer (`Footer.tsx`)

Three-section responsive grid inside the app's outer `flex flex-col min-h-screen` wrapper.

**Layout:**
- Outer: `<footer>` with `bg-gray-900 border-t border-gray-700`
- Inner: `max-w-7xl mx-auto w-full` → `grid grid-cols-1 sm:grid-cols-3 gap-8` with padding
- Existing `flex-1` on `<main>` ensures footer stays at the page bottom

**Sections:**

| Column | Content |
|--------|---------|
| **Contact** | Heading "Contact", email link `imperialsympathizer@gmail.com` as a `mailto:` anchor |
| **Bug Report** | Heading "Found a Bug?", brief prompt text, "Report a Bug" button (`bg-blue-600 hover:bg-blue-500`) that opens `BugReportModal` via local `useState` |
| **About** | "Just Roll Crits" app name, tagline "Star Wars: Legion attack sequence simulator", disclaimer "This tool is not affiliated with or endorsed by Atomic Mass Games or Lucasfilm Ltd.", copyright line |

**Export:** `export default function Footer`

### BugReportModal (`BugReportModal.tsx`)

A viewport-level overlay opened by the footer's "Report a Bug" button.

**Props:**
- `isOpen: boolean` — controls visibility (`null` rendered when `false`)
- `onClose: () => void` — callback to close the modal

**Visual structure:**
- Backdrop: `fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-sm` — click to dismiss
- Card: centered `bg-gray-900 border border-gray-700 rounded-lg` with padding, `max-w-lg w-full`
- Title: "Report a Bug" with close button (×)

**Form fields:**
- **Summary** — single-line `<input type="text">` with `useId()` for label association
- **Description** — `<textarea>` (4–5 rows) with `useId()` for label association
- **Submit button** — "Send Report" (`bg-blue-600 hover:bg-blue-500`)

**Behavior:**
- On submit: construct `mailto:imperialsympathizer@gmail.com` with `subject=` from Summary and `body=` from Description (URI-encoded), open via `window.location.href`, reset form, close modal
- Close on Escape key (`useEffect` with `keydown` listener when `isOpen`)
- Close on backdrop click (click handler on backdrop element, `stopPropagation` on card)

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the modal title element
- Focus management: focus the summary input when modal opens

**Export:** Named export `export function BugReportModal` (consumed only by Footer)

### Layout Integration (`Layout.tsx`)

```tsx
// After </main>, inside the outermost flex-col div:
import Footer from './components/Footer';

// ...
  </main>
  <Footer />
</div>
```

## Styling Reference

Follows existing dark theme palette:

| Role | Class |
|------|-------|
| Footer background | `bg-gray-900` |
| Separator | `border-t border-gray-700` |
| Section headings | `text-gray-100 font-semibold` |
| Body text | `text-gray-400` |
| Links | `text-blue-400 hover:text-blue-300 underline` |
| Input surfaces | `bg-gray-800 border border-gray-700 rounded text-gray-100` |
| Primary button | `bg-blue-600 hover:bg-blue-500 text-white rounded px-4 py-2` |
| Modal backdrop | `bg-gray-950/70 backdrop-blur-sm` |
| Modal card | `bg-gray-900 border border-gray-700 rounded-lg` |

## Responsive Behavior

- **Desktop (sm+):** Three columns side by side (`sm:grid-cols-3`)
- **Mobile:** Columns stack vertically (`grid-cols-1`)
- Footer is always visible (no collapse/accordion)
- Modal is centered viewport overlay on all screen sizes, with `mx-4` margin on mobile to prevent edge clipping

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| `mailto:` for bug reports | No backend needed; user's email client opens with subject/body pre-filled from form fields. Can be upgraded to GitHub Issues API or external service later. |
| No GitHub/Discord links | Omitted per user request; can be added later alongside the email. |
| No portal for modal | No portal pattern exists in the codebase and there's no z-index conflict — highest existing z-index is `z-50` on `SearchableCombobox` (positioned `absolute`, not `fixed`). The modal uses `fixed z-50` which layers above all existing content. Simple conditional rendering avoids new infrastructure. |
| Email hardcoded | `imperialsympathizer@gmail.com` used directly in both the footer link and bug report `mailto:` target. Can be extracted to a shared constant if reuse grows. |
| Component at `src/components/Footer/` | Treated as app chrome (like the header in Layout), not a feature panel. Gets its own subdirectory following panel directory conventions. |
| `useId()` for form labels | Per component conventions in `.github/instructions/components.instructions.md`. |

## Test Plan

Co-located at `src/components/Footer/Footer.test.tsx`, wrapped in `MemoryRouter` for routing context.

| Test | Assertion |
|------|-----------|
| Renders contact email | `mailto:imperialsympathizer@gmail.com` link present |
| Renders disclaimer | Disclaimer text present in the document |
| Renders about info | "Just Roll Crits" and tagline visible |
| Opens bug report modal | Clicking "Report a Bug" shows modal with `role="dialog"` |
| Modal has form fields | Summary input and Description textarea present |
| Submit constructs mailto | Form submit generates correct `mailto:` URL with encoded subject/body |
| Escape closes modal | Pressing Escape key hides the modal |
| Backdrop click closes modal | Clicking the backdrop (outside the card) hides the modal |

## Quality Gates

- `npm run typecheck` — 0 errors
- `npm run lint` — 0 errors
- `npm run test:run -- src/components/Footer` — all tests pass

## Verification

- `npm run dev` — footer visible at bottom of both Simulator and List Analyzer pages
- "Report a Bug" button opens modal overlay
- Submitting the form opens email client with pre-filled subject/body
- Escape key and backdrop click dismiss the overlay
- Responsive layout correct on mobile and desktop viewports
