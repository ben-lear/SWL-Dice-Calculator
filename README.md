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

### Desktop Executable
The app can be packaged as a native desktop application using **Tauri**:
- See [DESKTOP_DEPLOYMENT.md](DESKTOP_DEPLOYMENT.md) for full setup instructions
- Produces ~3-5 MB executables for Windows, macOS, and Linux
- Uses system webview (no Chromium bundling)

Quick setup:
```bash
npm install -D @tauri-apps/cli
npx tauri init
npm run tauri:dev
```

## 🧪 Testing

```bash
# Watch mode
npm test

# Run once
npm run test:run

# Coverage report
npm run test:coverage
```

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
