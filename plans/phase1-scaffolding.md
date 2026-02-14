# Phase 1: Project Scaffolding — Implementation Plan

## Goal

A running dev environment with an empty app shell, responsive layout, PWA support, and all tooling configured. No business logic — just the skeleton that all subsequent phases build into.

---

## Step 1.1 — Initialize Vite + React + TypeScript Project

**Command:**
```bash
npm create vite@latest . -- --template react-ts
npm install
```

**Verify:**
- `npm run dev` starts dev server on localhost
- Default Vite React page renders
- TypeScript compiles without errors

**Notes:**
- Run inside the project workspace root directory. The `.` in the command scaffolds directly into the current folder.
- Use Node 18+ / npm 9+
- Add `.nvmrc` with node version for team consistency

---

## Step 1.2 — Clean Up Vite Defaults & Install Dependencies

Remove boilerplate files from the Vite template **before** creating our own structure, to avoid conflicts:

- Delete `src/App.css`
- Delete `src/App.tsx`
- Delete `src/assets/react.svg`
- Delete `public/vite.svg`
- Clear the contents of `src/index.css` (will be replaced with Tailwind import)
- Leave `src/main.tsx` and `index.html` in place for now (updated in later steps)

**Then install dependencies.**

Production dependencies:
```bash
npm install zustand recharts
```

Dev dependencies:
```bash
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom vite-plugin-pwa
```

> **Note:** `@testing-library/react` requires `react` and `react-dom` as peer dependencies. These are already installed by the Vite template in Step 1.1 — ensure `npm install` from Step 1.1 completes successfully before running these installs.

**Package summary:**

| Package | Purpose |
|---------|---------|
| `zustand` | Lightweight state management |
| `recharts` | Bar chart for results panel |
| `tailwindcss` | Utility-first CSS |
| `@tailwindcss/vite` | Tailwind Vite plugin |
| `vitest` | Unit test runner (Vite-native) |
| `@testing-library/react` | Component testing utilities |
| `@testing-library/jest-dom` | DOM assertion matchers |
| `@testing-library/user-event` | User interaction simulation |
| `jsdom` | DOM environment for tests |
| `vite-plugin-pwa` | PWA manifest + service worker generation |

---

## Step 1.3 — Configure Tailwind CSS

**`src/index.css`** — Replace contents with:
```css
@import "tailwindcss";
```

**`vite.config.ts`** — Add Tailwind plugin:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
});
```

**Verify:**
- After Step 1.6 creates `App.tsx`, add a Tailwind class (e.g., `className="text-red-500"`) and confirm it renders with the correct style

---

## Step 1.4 — Configure Vitest

**`vite.config.ts`** — Add test configuration (merge with existing):
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

**`src/test/setup.ts`** — Test setup file:
```ts
import '@testing-library/jest-dom';
```

**`tsconfig.app.json`** — Add Vitest globals to compiler options:
```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

**`package.json`** — Add test scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Create a smoke test** at `src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the app shell', () => {
    render(<App />);
    expect(screen.getByText(/Just Roll Crits/i)).toBeInTheDocument();
  });
});
```

> **Note:** This test file and the `App.tsx` it imports are both created in Steps 1.5–1.6. Write this file when the folder structure is in place.

**Verify:** `npm test` runs and the smoke test passes (after Steps 1.5–1.6 are complete).

---

## Step 1.5 — Create Folder Structure

Create the full directory tree per the architecture spec. All files are placeholder/empty except where noted.

```
src/
├── App.tsx                    ← layout shell (Step 1.6)
├── App.test.tsx               ← smoke test (Step 1.4)
├── Layout.tsx                 ← responsive grid wrapper (Step 1.6)
├── components/
│   ├── AttackerPanel/
│   │   └── .gitignore
│   ├── DefenderPanel/
│   │   └── .gitignore
│   ├── ResultsPanel/
│   │   └── .gitignore
│   ├── DiceDisplay/
│   │   └── .gitignore
│   └── shared/
│       └── .gitignore
├── engine/
│   └── .gitignore
├── hooks/
│   └── .gitignore
├── utils/
│   └── .gitignore
├── data/
│   └── .gitignore            ← unit preset data (Phase 5B)
├── test/
│   └── setup.ts             ← test setup (Step 1.4)
└── index.css                ← Tailwind import
```

**Notes:**
- `.gitignore` files are used as directory placeholders so empty directories are tracked in Git. Each contains `*` and `!.gitignore` to ignore future contents until real files are added, at which point the `.gitignore` is removed.
- `data/` is added for unit preset JSON (not in original architecture but needed for Phase 5B)
- The Vite-generated `src/main.tsx` remains as the entry point (updated in Step 1.6 to import our `App`)

---

## Step 1.6 — Create App Shell with Responsive Layout

This creates the visible skeleton. No functional inputs — just the three-panel structure with placeholder content.

**`src/Layout.tsx`:**
```tsx
interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">
            ⚔️ Just Roll Crits
          </h1>
          {/* Attack type selector goes here (Phase 6C) */}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl p-4">
        {children}
      </main>
    </div>
  );
}
```

**`src/App.tsx`:**
```tsx
import Layout from './Layout';

export default function App() {
  return (
    <Layout>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
        {/* Attacker Panel */}
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-red-400">
            Attacker
          </h2>
          <p className="text-sm text-gray-500">Attacker inputs go here</p>
        </section>

        {/* Results Panel */}
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4 lg:w-72">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-yellow-400">
            Results
          </h2>
          <p className="text-sm text-gray-500">Simulation results go here</p>
        </section>

        {/* Defender Panel */}
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-400">
            Defender
          </h2>
          <p className="text-sm text-gray-500">Defender inputs go here</p>
        </section>
      </div>
    </Layout>
  );
}
```

**`src/main.tsx`** — Update the existing Vite entry point:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**Responsive behavior:**
- **Desktop (lg+):** Three columns — Attacker | Results | Defender
- **Mobile (<lg):** Single column, stacked: Attacker → Results → Defender

**Verify:**
- Dev server shows three panels with dark theme
- Resize browser: panels stack on narrow viewports, side-by-side on wide
- Header renders app title
- Smoke test still passes

---

## Step 1.7 — Configure PWA

**`vite.config.ts`** — Add PWA plugin (merge with existing config):
```ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Just Roll Crits',
        short_name: 'Just Roll Crits',
        description: 'Star Wars: Legion attack sequence simulator',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
});
```

**Create placeholder icons:**
- `public/favicon.svg` — simple SVG placeholder (dice icon or ⚔️)
- `public/icons/icon-192.png` — 192×192 placeholder
- `public/icons/icon-512.png` — 512×512 placeholder
- `public/icons/icon-512-maskable.png` — 512×512 with safe zone padding

For now, generate simple colored squares or use a placeholder generator. Final branded icons come later.

**Verify:**
- `npm run build` generates `dist/` with manifest and service worker files
- `manifest.webmanifest` in build output contains correct metadata
- Preview build (`npm run preview`) shows PWA install prompt in Chrome DevTools → Application → Manifest

---

## Step 1.8 — Update index.html

Update `index.html` to set the page title and meta tags (the `src/main.tsx` script reference is already correct from the Vite template):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Star Wars: Legion attack sequence dice calculator and simulator" />
    <meta name="theme-color" content="#1a1a2e" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>Just Roll Crits</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Step 1.9 — Git Init & First Commit

```bash
git init
```

**`.gitignore`** (Vite template provides most of this, ensure it includes):
```
node_modules/
dist/
*.local
.env*
coverage/
```

```bash
git add .
git commit -m "Phase 1: project scaffolding — Vite, React, TS, Tailwind, PWA, Vitest"
```

---

## Step 1.10 — Create Copilot Instructions

Create instructions files so GitHub Copilot has project-specific context when generating code.

**`.github/copilot-instructions.md`** — Workspace-level instructions:
```markdown
# Copilot Instructions — Just Roll Crits

## Project Overview
A React + TypeScript web app that simulates Star Wars: Legion attack dice sequences. Users configure attacker/defender dice pools, keywords, and tokens, then calculate expected wounds or run Monte Carlo simulations.

## Tech Stack
- **Framework:** React 18+ with TypeScript (strict mode)
- **Build:** Vite
- **Styling:** Tailwind CSS (utility-first, dark theme — gray-950 background, gray-100 text)
- **State Management:** Zustand
- **Testing:** Vitest + React Testing Library
- **Charts:** Recharts
- **PWA:** vite-plugin-pwa

## Code Conventions
- Functional components only — no class components
- Named exports for components, default exports for page-level components (App, Layout)
- Co-locate tests next to source files as `*.test.tsx` / `*.test.ts`
- Test setup file at `src/test/setup.ts` (imports `@testing-library/jest-dom`)
- Use Tailwind utility classes for all styling — no CSS modules or styled-components

## Project Structure
- `src/` — App entry point, App shell, Layout
- `src/components/` — UI panels (AttackerPanel, DefenderPanel, ResultsPanel, DiceDisplay, shared)
- `src/engine/` — Pure dice logic, probability math, Monte Carlo simulator
- `src/hooks/` — Custom React hooks
- `src/utils/` — Helper functions
- `src/data/` — Unit preset JSON data
- `src/test/` — Test setup

## Domain Context
- The app models the full Star Wars: Legion attack sequence (Steps 1–9)
- Key dice types: Attack (White/Black/Red, d8), Defense (White/Red, d6)
- Important keywords: Impact, Pierce, Critical, Surge conversions, Cover, Dodge, Armor, etc.
- Refer to files in `rulebook_markdown/` for detailed game rules
```

**`.vscode/settings.json`** — Ensure Copilot uses the instructions (create if it doesn't exist, merge if it does):
```json
{
  "github.copilot.chat.codeGeneration.useInstructionFiles": true
}
```

**Verify:**
- Open Copilot Chat and confirm workspace instructions are being picked up

---

## Verification Checklist

After completing all steps, confirm:

| Check | Command / Action |
|-------|-----------------|
| Dev server runs | `npm run dev` → opens in browser, dark three-panel layout visible |
| TypeScript compiles | No red squiggles in editor, `npx tsc --noEmit` passes |
| Tailwind works | Utility classes render correctly (colors, spacing, grid) |
| Tests run | `npm test` → smoke test passes |
| Build succeeds | `npm run build` → `dist/` contains HTML, JS, CSS, manifest, SW |
| PWA manifest | Chrome DevTools → Application → Manifest shows correct metadata |
| Responsive layout | Narrow viewport: stacked panels. Wide viewport: 3-column grid |
| Folder structure | All directories exist per architecture spec |
| No Vite boilerplate | No default logos, counter component, or sample CSS remain |
| Copilot instructions | `.github/copilot-instructions.md` exists, Copilot Chat picks up workspace context |

---

## Files Created/Modified in This Phase

| File | Status |
|------|--------|
| `package.json` | Created (via Vite) + modified (scripts, deps) |
| `vite.config.ts` | Created + configured (React, Tailwind, Vitest, PWA) |
| `tsconfig.json` | Created (via Vite) |
| `tsconfig.app.json` | Modified (Vitest globals type) |
| `index.html` | Modified (title, meta tags) |
| `src/main.tsx` | Modified (imports our App component) |
| `src/index.css` | Modified (Tailwind import) |
| `src/App.tsx` | Created (three-panel layout shell) |
| `src/App.test.tsx` | Created (smoke test) |
| `src/Layout.tsx` | Created (responsive wrapper) |
| `src/test/setup.ts` | Created (testing-library setup) |
| `public/favicon.svg` | Created (placeholder) |
| `public/icons/icon-192.png` | Created (placeholder) |
| `public/icons/icon-512.png` | Created (placeholder) |
| `public/icons/icon-512-maskable.png` | Created (placeholder) |
| `src/components/**/.gitignore` | Created (directory placeholders) |
| `src/engine/.gitignore` | Created |
| `src/hooks/.gitignore` | Created |
| `src/utils/.gitignore` | Created |
| `src/data/.gitignore` | Created |
| `.gitignore` | Created/verified |
| `.github/copilot-instructions.md` | Created (workspace Copilot context) |
| `.vscode/settings.json` | Created/updated (enable instruction files) |
