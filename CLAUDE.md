# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the app (removes ELECTRON_RUN_AS_NODE, then spawns electron.exe)
npm start          # or: node launch.js

# Tests
npm test           # Electron window test + unit tests (requires display)
npm run test:unit  # Node-only unit tests, no display needed

# Build distributable
npm run dist       # Produces installer via electron-builder
npm run pack       # Dir-only build (no installer, faster)
```

> **Critical:** Never invoke `electron` or `node main.js` directly. The env var `ELECTRON_RUN_AS_NODE=1` is always set in the Claude Code shell, which puts Electron into Node-compat mode and makes `require('electron')` return the binary path string instead of the API. `launch.js` strips that var before spawning.

## Architecture

### Process split
- **Main process** (`main.js`) — Node.js/Electron backend. Owns all IPC handlers, file I/O, PowerShell execution, hardware polling, and the Gemini API call.  
- **Renderer process** (`dashboard.html` inline `<script>`) — all UI logic, a local kNN ML engine, and a local `requestParams` store backed by `localStorage`. These are *duplicates* of the main-process modules and exist so the UI works without IPC round-trips.
- **Preload bridge** (`preload.js`) — thin `contextBridge` that exposes `window.fixme.*` to the renderer. Every renderer→main call goes through this.

### IPC contract
All IPC handlers return `{ success: boolean, data?, error? }`. The renderer pattern-matches on `result.success`. Handlers are grouped in `main.js` by domain comment blocks (`===== Hardware =====`, `===== AI Optimizer =====`, etc.).

### Data persistence
`src/database.js` is the only persistence layer. It stores everything in a single JSON file at `app.getPath('userData')/fixme-data.json`. It is **synchronous on write** (`fs.writeFileSync`). Because `database.js` calls `app.getPath()` at require-time via `getDbPath()`, it **cannot be required outside Electron's browser process** — mock it in tests (see `test-modules.js` for the pattern).

### Rate limiting
`src/request-params.js` enforces cooldowns and daily caps per operation type. The renderer keeps its own copy in `localStorage`; the main process keeps the authoritative copy in the JSON database. Both must stay in sync — when adding a new operation type add it to `this.cooldowns` and `this.dailyLimits` in both the main-process class and the renderer-side `requestParams` object in `dashboard.html`.

### ML engine (kNN)
Two independent copies:
- `src/ml-engine.js` — main process, persists via `database.js`
- Inline kNN in `dashboard.html` — renderer, persists via `localStorage`

Feature vector: `[cpu/100, mem/100, gpu/100, hour/24, weekday/7, processCount/500]`. k=5.

### AI (Gemini)
`src/ai-optimizer.js` wraps `@google/generative-ai`. Requires `GEMINI_API_KEY` in `.env` at repo root. The key is loaded by `dotenv` at the top of `main.js` before any `require()` of the optimizer. The optimizer maintains `this.conversationHistory` across calls within a session, enabling multi-turn context.

### Diagnostics
`src/diagnostics.js` runs 10 checks sequentially, firing a `onProgress` callback after each. Checks use a mix of `systeminformation` and PowerShell `exec` calls. All checks are `async` and silently swallow errors to avoid partial failures killing the whole run.

### Elevation
All system-mutating operations go through `sudo-prompt` (`src/optimizations.js::execElevated`). This triggers a UAC prompt. Never call `execElevated` from the renderer — only from `main.js` IPC handlers.

## Key conventions

- `.env` is gitignored. Copy `.env.example` → `.env` and add your Gemini key.
- `ELECTRON_RUN_AS_NODE` must not be set when launching; `launch.js` handles this.
- The startup overlay (`#startupOverlay`) in `dashboard.html` runs `runStartupSequence()` on `DOMContentLoaded`, which replaces the old `electronIntegration()` IIFE. Do not add a second `DOMContentLoaded` listener.
- Translations live in the `TRANSLATIONS` object in `dashboard.html`. Use `t('key')` for any user-visible string. Add keys to both `pt` and `en` blocks simultaneously.
- `src/suggestions.js` is UI-only (no Electron dep). `(stats.topCpuProcesses || [])` guard is required — callers don't always populate that field.
