// Loads the real app and preload with isolated user data. Windows actions are stubbed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');
// Exercise a delayed optimization through real IPC without touching Windows.
const winOptimizer = require('./src/win-optimizer');
let overlappingActions = 0;
winOptimizer.optimizeVisualEffects = async () => new Promise(resolve => setTimeout(() => resolve({ applied: 'visual_effects' }), 1500));
winOptimizer.optimizeGPU = async () => { overlappingActions++; return { applied: 'gpu' }; };
const dataPath = path.join(__dirname, 'qa', 'electron-smoke-data');
fs.mkdirSync(dataPath, { recursive: true });
app.setPath('userData', dataPath);
const errors = [];
let finished = false;
const deadline = setTimeout(() => finish(new Error('App startup timed out')), 25000);
function finish(error) {
  if (finished) return;
  finished = true;
  clearTimeout(deadline);
  if (error) console.error('FAIL: real app startup:', error.stack || error);
  else console.log('PASS: real dashboard, preload, read-only IPC and responsive delayed optimization with mocked Windows action');
  app.exit(error ? 1 : 0);
}
require('./main');
app.whenReady().then(async () => {
  const win = BrowserWindow.getAllWindows()[0];
  assert.ok(win, 'App created its window');
  win.webContents.on('console-message', (_event, level, message) => { if (level === 3) errors.push(message); });
  if (win.webContents.isLoading()) await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
  const state = await win.webContents.executeJavaScript(`(async () => ({
    title: document.title,
    panels: document.querySelectorAll('[data-panel]').length,
    background: getComputedStyle(document.body).backgroundColor,
    overlayHidden: !document.getElementById('startupOverlay') || document.getElementById('startupOverlay').hidden,
    bridge: typeof window.fixme?.killProcess,
    model: await window.fixme.getMLModelStats(),
    optimization: await window.fixme.getOptimizationState(),
    stats: await window.fixme.getHardwareStats()
  }))()`);
  assert.equal(state.panels, 4);
  assert.equal(state.background, 'rgb(17, 22, 29)');
  assert.equal(state.overlayHidden, true);
  assert.equal(state.bridge, 'function');
  assert.equal(state.model.success, true);
  assert.equal(state.stats.success, true);
  assert.ok(state.stats.data.stats.cpu);
  assert.equal(state.optimization.success, true);
  assert.equal(state.optimization.data, null);
  const mutation = await win.webContents.executeJavaScript(`(async () => {
    // Initial state recovery may still be updating the renderer.
    for (let attempt = 0; attempt < 100 && document.getElementById('togVisual').disabled; attempt++) await new Promise(resolve => setTimeout(resolve, 20));
    const pending = applyWinOpt('visual', true);
    await new Promise(resolve => setTimeout(resolve, 100));
    document.querySelector('.primary-nav [data-view="insights"]').click();
    const during = {
      panelVisible: !document.getElementById('optimizationProgress').hidden,
      running: document.getElementById('optimizationProgress').dataset.state,
      controlsDisabled: document.getElementById('togGPU').disabled,
      navigationWorked: !document.querySelector('[data-panel="insights"]').hidden,
      overlap: await window.fixme.winOptGPU()
    };
    await pending;
    return { during, terminal: document.getElementById('optimizationProgress').dataset.state, unlocked: !document.getElementById('togVisual').disabled };
  })()`);
  assert.equal(mutation.during.running, 'running');
  assert.equal(mutation.during.panelVisible, true);
  assert.equal(mutation.during.controlsDisabled, true);
  assert.equal(mutation.during.navigationWorked, true);
  assert.equal(mutation.during.overlap.code, 'OPTIMIZATION_BUSY');
  assert.equal(overlappingActions, 0);
  assert.equal(mutation.terminal, 'completed');
  assert.equal(mutation.unlocked, true);
  assert.equal(errors.filter(message => /Uncaught|SyntaxError|ReferenceError/.test(message)).length, 0);
  const screenshot = await win.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, 'qa', 'fixme-electron.png'), screenshot.toPNG());
  finish();
}).catch(finish);
