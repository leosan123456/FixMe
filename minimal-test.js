const { app, BrowserWindow } = require('electron');

console.log('Starting minimal Electron test...');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 400, height: 300 });
  win.loadURL('data:text/html,<h1>Electron Works!</h1>');
  console.log('Window created!');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
