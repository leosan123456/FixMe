const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fixme', {
  setHighPerformance: () => ipcRenderer.invoke('optim:set-high-performance'),
  getActivePowerPlan: () => ipcRenderer.invoke('optim:get-active-powerplan'),
  setProcessPriority: (processName, priority) => ipcRenderer.invoke('optim:set-process-priority', processName, priority),
  clearStandbyList: () => ipcRenderer.invoke('optim:clear-standby-list')
});
