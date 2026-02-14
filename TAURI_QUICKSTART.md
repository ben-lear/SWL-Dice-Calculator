# Tauri Desktop App - Quick Start

Tauri has been successfully configured! The desktop app shares the same codebase as the web app.

## ✅ What's Already Configured

- ✅ Tauri CLI installed (`@tauri-apps/cli`)
- ✅ Project structure created (`src-tauri/` directory)
- ✅ Configuration set up (`src-tauri/tauri.conf.json`)
- ✅ App icons generated (all platforms)
- ✅ Package scripts added (`npm run tauri:dev`, `npm run tauri:build`)
- ✅ Window settings: 1280x800, resizable, min 800x600

## 📋 Prerequisites to Run Desktop App

You need to install **Rust** (one-time setup):

### Windows

**Option 1: Using winget (recommended)**
```powershell
winget install Rustlang.Rustup
```

**Option 2: Manual install**
1. Download from [rustup.rs](https://rustup.rs/)
2. Run the installer
3. Restart your terminal/PowerShell

**Option 3: Using Chocolatey**
```powershell
choco install rust
```

After installing, verify:
```powershell
rustc --version
```

You should see something like `rustc 1.xx.x`

## 🚀 Running the Desktop App

### Development Mode

```bash
npm run tauri:dev
```

This will:
1. Start the Vite dev server (http://localhost:8080)
2. Compile the Rust backend
3. Launch the desktop app window
4. Enable hot-reload for frontend changes

**First run takes longer** (~2-5 minutes) as Rust compiles dependencies. Subsequent runs are much faster.

### Build Production Executable

```bash
npm run tauri:build
```

Output locations:
- **Windows:** `src-tauri/target/release/bundle/msi/` (installer)
- **Windows:** `src-tauri/target/release/bundle/nsis/` (installer)
- Executable: `src-tauri/target/release/just-roll-crits.exe`

## 🎯 Configuration

The app is configured via `src-tauri/tauri.conf.json`:

- **Product Name:** Just Roll Crits
- **Identifier:** com.justrollcrits.app
- **Window Size:** 1280x800 (minimum 800x600)
- **Frontend:** Loads from `../dist` (Vite build output)
- **Dev Server:** http://localhost:8080

## 🔧 Customization Options

### Change Window Defaults

Edit `src-tauri/tauri.conf.json`:

```json
{
  "app": {
    "windows": [
      {
        "title": "Your Title",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false
      }
    ]
  }
}
```

### Custom App Icons

Icons are in `src-tauri/icons/`. To regenerate from a custom image:

```bash
# Place your 1024x1024 PNG in the project root
npm run tauri icon your-icon.png
```

## 🐛 Troubleshooting

### "rustc not found"
Install Rust via rustup (see Prerequisites above)

### Build takes forever
First build compiles all dependencies (~2-5 min). Subsequent builds are faster.

### "WebView2 not found" (Windows)
Tauri will auto-download WebView2 on first run. If issues persist, manually install from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### Port 8080 already in use
Change the port in both:
- `vite.config.ts` → `server.port`
- `src-tauri/tauri.conf.json` → `build.devUrl`

## 📦 Distribution

After building, distribute the installer:

**Windows:**
- `.msi` installer in `src-tauri/target/release/bundle/msi/`
- Or `.exe` installer in `src-tauri/target/release/bundle/nsis/`
- Users need Windows 10+ (WebView2)

**macOS:**
- `.dmg` in `src-tauri/target/release/bundle/dmg/`
- May need code signing for distribution

**Linux:**
- `.deb` in `src-tauri/target/release/bundle/deb/`
- `.AppImage` for universal distribution

## 🔄 Dual Deployment

You can deploy as **both**:
1. **Web App (PWA):** Deploy `dist/` folder to any static host
2. **Desktop App:** Distribute the built executable

Both use the same codebase with zero code changes!

## 📚 Next Steps

1. Install Rust: `winget install Rustlang.Rustup`
2. Restart terminal
3. Run: `npm run tauri:dev`
4. Wait for first build (2-5 minutes)
5. Desktop app launches!

For more details, see [DESKTOP_DEPLOYMENT.md](DESKTOP_DEPLOYMENT.md)
