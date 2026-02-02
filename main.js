const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const optim = require('./src/optimizations');

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
