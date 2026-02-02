const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fixme', {
  setHighPerformance: () => ipcRenderer.invoke('optim:set-high-performance'),
  getActivePowerPlan: () => ipcRenderer.invoke('optim:get-active-powerplan'),
  setProcessPriority: (processName, priority) => ipcRenderer.invoke('optim:set-process-priority', processName, priority),
  clearStandbyList: () => ipcRenderer.invoke('optim:clear-standby-list'),
  
  // Hardware monitoring
  getSystemInfo: () => ipcRenderer.invoke('hw:get-system-info'),
  getHardwareStats: () => ipcRenderer.invoke('hw:get-stats'),
  startMonitoring: (intervalMs = 2000) => ipcRenderer.invoke('hw:start-monitoring', intervalMs),
  stopMonitoring: () => ipcRenderer.invoke('hw:stop-monitoring'),
  
  // Event listeners
  onStatsUpdate: (callback) => ipcRenderer.on('hw:stats-update', (_, data) => callback(data))
});
