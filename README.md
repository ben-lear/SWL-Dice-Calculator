# ⚔️ Just Roll Crits

A Star Wars: Legion attack sequence dice calculator and Monte Carlo simulator. Configure attacker and defender dice pools, keywords, and tokens, then calculate expected wounds or run simulations.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (http://localhost:8080)
npm run dev

# Run tests
npm test

# Validate code quality
npm run lint
npm run typecheck

# Build for production
npm run build
```

## 🛠️ Tech Stack

- **Framework:** React 18 + TypeScript (strict mode)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (dark theme, utility-first)
- **State Management:** Zustand
- **Testing:** Vitest + React Testing Library + happy-dom
- **Charts:** Recharts
- **PWA:** vite-plugin-pwa (offline support, installable)

## 📦 Deployment Options

### Web App (PWA)
The app is a Progressive Web App that can be installed on any device:
- Deploy `dist/` folder to any static hosting (Vercel, Netlify, GitHub Pages)
- Users can install it to their home screen for offline access

### Desktop Executable ✨ CONFIGURED
The app is **ready to build** as a native desktop application using Tauri!

**To run the desktop app:**
1. Install Rust: `winget install Rustlang.Rustup`
2. Run: `npm run tauri:dev`

**To build executables:**
```bash
npm run tauri:build
```

See [TAURI_QUICKSTART.md](TAURI_QUICKSTART.md) for detailed instructions.

Key features:
- ✅ Already configured and ready to use
- 📦 ~3-5 MB executables (not 100+ MB!)
- 🚀 Fast startup, low memory usage
- 💻 Windows, macOS, and Linux support
- 🔄 Same codebase as web app (zero extra code)

## 🧪 Testing

```bash
# Watch mode
npm test

# Run once
npm run test:run

# Coverage report
npm run test:coverage

# Required for code changes
npm run lint
npm run typecheck
```

## ✅ Required Checks

Every code change must pass both commands before it is considered complete:

```bash
npm run typecheck
npm run lint
```

If either command fails, resolve those issues before submitting or merging changes.

## 📁 Project Structure

```
src/
├── components/        # UI panels and shared components
│   ├── AttackerPanel/
│   ├── DefenderPanel/
│   ├── ResultsPanel/
│   ├── DiceDisplay/
│   └── shared/
├── engine/           # Pure dice logic and probability math
├── hooks/            # Custom React hooks
├── utils/            # Helper functions
├── data/             # Unit preset data
└── test/             # Test setup
```

## 🎲 Game Rules

The app models the full Star Wars: Legion attack sequence (Steps 1-9):
- Attack dice: White, Black, Red (d8)
- Defense dice: White, Red (d6)
- Keywords: Impact, Pierce, Critical, Surge conversions, Cover, Dodge, Armor, etc.

See `rulebook_markdown/` for detailed game rules reference.

## 📋 Development Phases

Implementation follows a structured plan:
- **Phase 1:** Project scaffolding ✅
- **Phase 2:** Core dice engine
- **Phase 3:** Monte Carlo simulator
- **Phase 4-8:** UI components and integration
- **Phase 9:** Testing and validation

See `plans/` directory for detailed phase documentation.

## 🤝 Contributing

This project uses:
- Functional components only (no class components)
- Named exports for components
- Co-located tests (`.test.tsx` next to source files)
- Tailwind utilities only (no CSS modules or styled-components)
- GitHub Copilot instructions in `.github/copilot-instructions.md`

## 📄 License

[Add license information]

## 🔗 Resources

- [Star Wars: Legion Official Rules](https://www.atomicmassgames.com/star-wars-legion-documents)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Tauri Desktop Apps](https://tauri.app/)
