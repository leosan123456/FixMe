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
  
  // AI Optimizer
  getSmartRecommendations: () => ipcRenderer.invoke('ai:get-smart-recommendations'),
  learnFromFeedback: (optimizationId, rating, comment) => ipcRenderer.invoke('ai:learn-from-feedback', optimizationId, rating, comment),
  suggestGameOptimization: (gameName) => ipcRenderer.invoke('ai:suggest-game-optimization', gameName),
  getAnalytics: () => ipcRenderer.invoke('ai:get-analytics'),
  recordOptimizationSuccess: (type, cpu, mem, gpu, notes) => ipcRenderer.invoke('optim:record-success', type, cpu, mem, gpu, notes),
  
  // Event listeners
  onStatsUpdate: (callback) => ipcRenderer.on('hw:stats-update', (_, data) => callback(data))
});
