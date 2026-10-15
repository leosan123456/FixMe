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
- **Renderer process** (`dashboard.html`, `dashboard.js`, `dashboard.css`) — four workspace views with shared diagnostic drawer. Hardware, ML data and usage limits come from `window.fixme`; the renderer never simulates measurements or trains its own model. Outside Electron it provides an interface preview with system actions disabled.
- **Preload bridge** (`preload.js`) — thin `contextBridge` that exposes `window.fixme.*` to the renderer. Every renderer→main call goes through this.

### IPC contract
All IPC handlers return `{ success: boolean, data?, error? }`. The renderer pattern-matches on `result.success`. Handlers are grouped in `main.js` by domain comment blocks (`===== Hardware =====`, `===== AI Optimizer =====`, etc.).

### Data persistence
`src/database.js` is the only persistence layer. It stores everything in a single JSON file at `app.getPath('userData')/fixme-data.json`. It is **synchronous on write** (`fs.writeFileSync`). Because `database.js` calls `app.getPath()` at require-time via `getDbPath()`, it **cannot be required outside Electron's browser process** — mock it in tests (see `test-modules.js` for the pattern).

### Rate limiting
`src/request-params.js` enforces cooldowns and daily caps per operation type in the main process. The renderer reads authoritative usage through `getUsageStats()`.

### ML engine (kNN)
`src/ml-engine.js` runs in the main process and persists through `database.js`. The renderer reads its predictions and sample statistics through IPC. Never seed it with generated samples or claim that a recommendation was applied before an actual successful backend action.

Feature vector: `[cpu/100, mem/100, gpu/100, hour/24, weekday/7, processCount/500]`. k=5.

### AI (Gemini)
`src/ai-optimizer.js` wraps `@google/generative-ai`. Requires `GEMINI_API_KEY` in `.env` at repo root. The key is loaded by `dotenv` at the top of `main.js` before any `require()` of the optimizer. The optimizer maintains `this.conversationHistory` across calls within a session, enabling multi-turn context.

### Diagnostics
`src/diagnostics.js` runs 10 checks sequentially, firing a `onProgress` callback after each. Checks use a mix of `systeminformation` and PowerShell `exec` calls. All checks are `async` and silently swallow errors to avoid partial failures killing the whole run.

### Elevation
All system-mutating operations go through `src/execution.js`, re-exported by `src/optimizations.js`. A private PowerShell watchdog bounds the elevated command tree. Related PowerShell commands use `runElevatedPowerShellBatch()` to request UAC once per group. `src/optimization-runner.js` owns the app-wide mutation lock and broadcasts `optim:progress`; keep every system mutation behind `handleOptimization()`. A caller timeout is not cancellation: retain the lock until completion is confirmed. Never call elevation from the renderer.

## Key conventions

- `.env` is gitignored. Copy `.env.example` → `.env` and add your Gemini key.
- `ELECTRON_RUN_AS_NODE` must not be set when launching; `launch.js` handles this.
- `runStartupSequence()` in `dashboard.js` starts independent read-only requests without blocking the interface. Never run a diagnostic or Windows adjustment automatically on startup. Do not add a second `DOMContentLoaded` listener.
- Translations live in the `TRANSLATIONS` object in `dashboard.js`. Use `t('key')` or `data-i18n` for user-visible strings. Add keys to both `pt` and `en` blocks simultaneously.
- Use `null` for unavailable hardware readings; measured `0` is valid. VRAM allocation is not GPU utilization.
- `src/monitoring.js` schedules sequential samples and discards readings from stopped sessions. New event subscriptions should return a cleanup function.
- The default bundle contains only visual effects and power. Do not restore bulk working-set trimming, compression disabling or automatic timer/service changes to this preset.
- Optimization snapshots/training/history use `getCachedHardwareStats()` without awaiting sensors. Never train a before/after outcome from the same timestamp.
- Test Windows actions through mocks in `test-backend.js`, `test-dashboard.js`, `test-execution.js` and `test-optimization-runner.js`. The Electron smoke test uses isolated data under ignored `qa/`, read-only IPC and a delayed mock mutation to verify responsiveness. `test-execution-windows.js` exercises only harmless child commands without UAC.
- `src/suggestions.js` is UI-only (no Electron dep). `(stats.topCpuProcesses || [])` guard is required — callers don't always populate that field.
