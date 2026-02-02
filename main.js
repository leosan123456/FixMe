const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const optim = require('./src/optimizations');
const HardwareMonitor = require('./src/hardware');
const SuggestionsEngine = require('./src/suggestions');

const hwMonitor = new HardwareMonitor();
const suggestionsEngine = new SuggestionsEngine();
let monitorInterval = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
  if (isDev) win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('optim:set-high-performance', async () => {
  try {
    const res = await optim.setHighPerformance();
    return { success: true, out: res };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('optim:get-active-powerplan', async () => {
  try {
    const res = await optim.getActivePowerPlan();
    return { success: true, out: res };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('optim:set-process-priority', async (_, processName, priority) => {
  try {
    const res = await optim.setProcessPriority(processName, priority);
    return { success: true, out: res };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('optim:clear-standby-list', async () => {
  try {
    const res = await optim.clearStandbyList();
    return { success: true, out: res };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// Hardware monitoring
ipcMain.handle('hw:get-system-info', async () => {
  try {
    const info = await hwMonitor.getSystemInfo();
    return { success: true, data: info };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('hw:get-stats', async () => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const suggestions = suggestionsEngine.getSuggestions(stats);
    return { success: true, data: { stats, suggestions } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('hw:start-monitoring', async (event, intervalMs = 2000) => {
  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(async () => {
    try {
      const stats = await hwMonitor.getHardwareStats();
      const suggestions = suggestionsEngine.getSuggestions(stats);
      event.sender.send('hw:stats-update', { stats, suggestions });
    } catch (err) {
      console.error('Erro no monitoramento:', err);
    }
  }, intervalMs);
  return { success: true, message: 'Monitoramento iniciado' };
});

ipcMain.handle('hw:stop-monitoring', async () => {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  return { success: true, message: 'Monitoramento parado' };
});
