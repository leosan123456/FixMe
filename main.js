const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const optim = require('./src/optimizations');
const HardwareMonitor = require('./src/hardware');
const SuggestionsEngine = require('./src/suggestions');
const db = require('./src/database');
const AIOptimizer = require('./src/ai-optimizer');
const AppsCollector = require('./src/apps-collector');
const SystemDiagnostics = require('./src/diagnostics');

const hwMonitor = new HardwareMonitor();
const suggestionsEngine = new SuggestionsEngine();
const aiOptimizer = new AIOptimizer();
const appsCollector = new AppsCollector();
const diagnostics = new SystemDiagnostics();
let monitorInterval = null;
let mainWindow = null;

// Inicializar banco de dados na startup
db.initDatabase();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  if (isDev) mainWindow.webContents.openDevTools();
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

// AI Optimizer handlers
ipcMain.handle('ai:get-smart-recommendations', async () => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const sysInfo = await hwMonitor.getSystemInfo();
    const history = db.getOptimizationHistory(10);
    
    // Registrar perfil de hardware na primeira execução
    const existingProfile = db.getHardwareProfile();
    if (!existingProfile) {
      db.recordHardwareProfile(
        sysInfo.cpuModel,
        sysInfo.cpuCores,
        parseFloat(sysInfo.totalMemory),
        'GPU',
        'Windows'
      );
    }

    const hwProfile = {
      cpuModel: sysInfo.cpuModel,
      cpuCores: sysInfo.cpuCores,
      totalMemory: parseFloat(sysInfo.totalMemory),
      gpuModel: 'GPU',
      os: 'Windows'
    };

    const aiRecommendations = await aiOptimizer.getSmartRecommendations(stats, hwProfile, history);
    
    // Registrar recomendações no banco
    if (aiRecommendations.recommendations) {
      aiRecommendations.recommendations.forEach(rec => {
        db.recordAIRecommendation(hwProfile, JSON.stringify(rec), mapPriorityToNumber(rec.priority));
      });
    }

    return { success: true, data: aiRecommendations };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('ai:learn-from-feedback', async (_, optimizationId, rating, comment) => {
  try {
    await aiOptimizer.learnFromFeedback(optimizationId, rating, comment);
    return { success: true, message: 'Feedback registrado e aprendizado aplicado' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('ai:suggest-game-optimization', async (_, gameName) => {
  try {
    const sysInfo = await hwMonitor.getSystemInfo();
    const hwProfile = {
      cpuModel: sysInfo.cpuModel,
      cpuCores: sysInfo.cpuCores,
      totalMemory: parseFloat(sysInfo.totalMemory),
      gpuModel: 'GPU',
      os: 'Windows'
    };

    const gameOptimization = await aiOptimizer.suggestGameOptimization(gameName, hwProfile);
    return { success: true, data: gameOptimization };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('ai:get-analytics', async () => {
  try {
    const analytics = db.getAnalytics();
    return { success: true, data: analytics };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('optim:record-success', async (_, type, cpuUsage, memUsage, gpuUsage, notes) => {
  try {
    const sysInfo = await hwMonitor.getSystemInfo();
    db.recordOptimization(type, sysInfo, cpuUsage, memUsage, gpuUsage, true, notes);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

function mapPriorityToNumber(priority) {
  const priorityMap = {
    'crítico': 4,
    'alto': 3,
    'médio': 2,
    'baixo': 1
  };
  return priorityMap[priority] || 1;
}

// Apps Collector handlers
ipcMain.handle('apps:get-gallery', async () => {
  try {
    const apps = await appsCollector.collectAll();
    return { success: true, data: apps };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('apps:get-recent', async () => {
  try {
    const apps = await appsCollector.getRecentApps();
    return { success: true, data: apps };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('apps:get-games', async () => {
  try {
    const games = await appsCollector.discoverGames();
    return { success: true, data: games };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// Diagnostics handlers
ipcMain.handle('diag:run-diagnostics', async (event) => {
  try {
    const result = await diagnostics.runFullDiagnostics((progress) => {
      event.sender.send('diag:progress', progress);
    });
    
    // Enviar para IA análise dos problemas
    if (result.success && result.issues.length > 0) {
      const aiAnalysis = await analyzeIssuesWithAI(result.issues);
      return { success: true, data: result, aiAnalysis };
    }
    
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

async function analyzeIssuesWithAI(issues) {
  try {
    const prompt = `Analise os seguintes problemas detectados no sistema Windows e forneça recomendações prioritárias:

${issues.map((i, idx) => `${idx + 1}. [${i.severity.toUpperCase()}] ${i.category}: ${i.title}
   Descrição: ${i.description}
   Solução sugerida: ${i.solution}`).join('\n\n')}

Forneça um resumo executivo com:
1. Prioridades de ação (crítico → baixo)
2. Impacto de cada problema
3. Tempo estimado de resolução
4. Dicas de prevenção

Responda em JSON.`;

    const response = await aiOptimizer.getSmartRecommendations(null, null, null);
    
    return {
      analysis: issues,
      recommendations: response
    };
  } catch (err) {
    console.error('Erro na análise de IA:', err);
    return null;
  }
}
