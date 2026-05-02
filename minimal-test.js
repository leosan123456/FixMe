// Electron window smoke test
// Must be run as app main process (without ELECTRON_RUN_AS_NODE)
// via: node test-runner.js OR temporarily set as package.json "main"
const { app, BrowserWindow } = require('electron');

if (!app) {
  console.error('FAIL: Electron APIs not available. Run without ELECTRON_RUN_AS_NODE.');
  process.exit(1);
}

console.log('Starting minimal Electron test...');
console.log('Electron version:', process.versions.electron);
console.log('process.type:', process.type);

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.error(`  FAIL: ${name}`);
    failed++;
  }
}

app.whenReady().then(() => {
  assert(typeof app.getVersion === 'function', 'app.getVersion is a function');
  assert(typeof app.getPath === 'function', 'app.getPath is a function');
  assert(typeof BrowserWindow === 'function', 'BrowserWindow is a constructor');

  const win = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  assert(win !== null, 'BrowserWindow created');
  assert(typeof win.loadURL === 'function', 'win.loadURL is a function');

  win.loadURL('data:text/html,<h1>Electron Test</h1>');

  win.webContents.on('did-finish-load', () => {
    assert(true, 'Window content loaded');
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    win.close();
  });

  win.on('closed', () => {
    app.quit();
    process.exit(failed > 0 ? 1 : 0);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
