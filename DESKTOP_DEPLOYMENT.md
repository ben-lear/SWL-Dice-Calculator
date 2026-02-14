# Desktop Executable Deployment

This document explains how to deploy **Just Roll Crits** as a standalone desktop executable application.

## Recommended Solution: Tauri

**Tauri** is the recommended approach for this project. It's a modern framework for building desktop applications using web technologies with a Rust backend.

### Why Tauri?

- ✅ **Small bundle size** — Uses system webview instead of bundling Chromium (~3-5 MB vs 100+ MB with Electron)
- ✅ **Better performance** — Lower memory footprint and faster startup
- ✅ **Native feel** — Uses OS-native rendering
- ✅ **Excellent Vite integration** — First-class support for Vite projects
- ✅ **Cross-platform** — Build for Windows, macOS, and Linux from one codebase
- ✅ **Security** — Secure IPC between frontend and backend
- ✅ **Active development** — Modern, well-maintained project

### Prerequisites

1. **Node.js 18+** (already installed)
2. **Rust** — Install from [rustup.rs](https://rustup.rs/)
   ```bash
   # Windows (PowerShell)
   winget install Rustlang.Rustup
   ```
3. **C++ Build Tools** (Windows only)
   - Install Visual Studio Build Tools or Visual Studio with "Desktop development with C++" workload
   - Alternatively: `winget install Microsoft.VisualStudio.2022.BuildTools`

### Setup Instructions

#### 1. Install Tauri CLI

```bash
npm install -D @tauri-apps/cli
```

#### 2. Initialize Tauri

```bash
npx tauri init
```

When prompted, use these settings:
- **App name:** `Just Roll Crits`
- **Window title:** `Just Roll Crits`
- **Web assets location:** `dist`
- **Dev server URL:** `http://localhost:8080`
- **Frontend dev command:** `npm run dev`
- **Frontend build command:** `npm run build`

This creates:
- `src-tauri/` — Rust backend code and configuration
- `src-tauri/tauri.conf.json` — Tauri app configuration
- `src-tauri/Cargo.toml` — Rust dependencies

#### 3. Update package.json Scripts

Add Tauri commands to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

#### 4. Configure Tauri

Edit `src-tauri/tauri.conf.json` to customize:

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:8080",
    "distDir": "../dist"
  },
  "package": {
    "productName": "Just Roll Crits",
    "version": "0.0.0"
  },
  "tauri": {
    "bundle": {
      "identifier": "com.justrollcrits.app",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "windows": {
        "certificateThumbprint": null,
        "webviewInstallMode": {
          "type": "downloadBootstrapper"
        }
      }
    },
    "windows": [
      {
        "title": "Just Roll Crits",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

#### 5. Generate App Icons

Tauri requires platform-specific icons. Use the Tauri icon generator:

```bash
npm install -D @tauri-apps/cli
npx tauri icon path/to/icon.png
```

This generates all required icon formats in `src-tauri/icons/`.

**Requirements:**
- Source image: 1024x1024 PNG with transparency
- Will generate: `.ico` (Windows), `.icns` (macOS), various PNG sizes

### Development Workflow

#### Run in Development Mode

```bash
npm run tauri:dev
```

This:
1. Starts Vite dev server on port 8080
2. Launches Tauri desktop app
3. Enables hot-reload for frontend changes
4. Shows Rust compilation output

#### Build for Production

```bash
npm run tauri:build
```

Output locations:
- **Windows:** `src-tauri/target/release/bundle/msi/` (`.msi` installer) and `src-tauri/target/release/bundle/nsis/` (`.exe` installer)
- **macOS:** `src-tauri/target/release/bundle/dmg/` (`.dmg`)
- **Linux:** `src-tauri/target/release/bundle/deb/` (`.deb`), `src-tauri/target/release/bundle/appimage/` (`.AppImage`)

### Distribution

The built executable can be distributed:
- **Windows:** Distribute `.msi` or `.exe` installer
- **macOS:** Distribute `.dmg` or notarize for App Store
- **Linux:** Distribute `.deb` or `.AppImage`

Users don't need to install anything extra (except WebView2 on Windows, which Tauri can auto-install).

---

## Alternative: Electron

If you prefer **Electron** (more mature ecosystem, but larger bundles):

### Setup

```bash
npm install -D electron electron-builder
npm install -D vite-plugin-electron
```

### Configuration

Create `electron/main.js`:

```js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:8080');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
```

Update `vite.config.ts`:

```ts
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron({
      entry: 'electron/main.js',
    }),
    VitePWA({ /* ... */ }),
  ],
  // ...
});
```

Add to `package.json`:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "vite",
    "electron:build": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.justrollcrits.app",
    "files": ["dist/**/*", "electron/**/*"],
    "directories": {
      "output": "release"
    }
  }
}
```

---

## Comparison

| Feature | Tauri | Electron |
|---------|-------|----------|
| **Bundle Size** | 3-5 MB | 100-150 MB |
| **Memory Usage** | Low (50-100 MB) | High (100-300 MB) |
| **Startup Time** | Fast | Slower |
| **Backend Language** | Rust | Node.js |
| **Maturity** | Newer (v1.0 in 2022) | Mature (since 2013) |
| **Community** | Growing | Large |
| **Best For** | Modern apps, smaller bundles | Apps needing Node.js ecosystem |

---

## Recommendation

**Start with Tauri** — It's the modern choice, integrates seamlessly with Vite, and produces much smaller executables. The app doesn't need Node.js backend features, making Tauri ideal.

If you encounter platform-specific issues or need extensive Node.js libraries, Electron is a proven fallback.

---

## Next Steps

1. Install Rust: `winget install Rustlang.Rustup`
2. Install Tauri: `npm install -D @tauri-apps/cli`
3. Initialize: `npx tauri init`
4. Test: `npm run tauri:dev`
5. Build: `npm run tauri:build`

The app will work both as a web app (PWA) and desktop executable!
