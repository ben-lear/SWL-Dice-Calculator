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
