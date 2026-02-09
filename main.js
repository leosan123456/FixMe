const path0 = require('path');
require('dotenv').config({ path: path0.join(__dirname, '.env') });
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';
const optim = require('./src/optimizations');
const HardwareMonitor = require('./src/hardware');
const SuggestionsEngine = require('./src/suggestions');
const db = require('./src/database');
const AIOptimizer = require('./src/ai-optimizer');
const AppsCollector = require('./src/apps-collector');
const SystemDiagnostics = require('./src/diagnostics');
const MLEngine = require('./src/ml-engine');
const RequestParams = require('./src/request-params');

const hwMonitor = new HardwareMonitor();
const suggestionsEngine = new SuggestionsEngine();
const aiOptimizer = new AIOptimizer();
const appsCollector = new AppsCollector();
const diagnostics = new SystemDiagnostics();
const mlEngine = new MLEngine();
const requestParams = new RequestParams();
let monitorInterval = null;
let mainWindow = null;

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
  mainWindow.loadFile('dashboard.html');
  if (isDev) mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  db.initDatabase();
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// ── Helper: treinar ML após execução ──
async function trainML(type, success) {
  try {
    const stats = await hwMonitor.getHardwareStats();
    mlEngine.train(stats, type, success ? 0.6 : 0.2);
  } catch (e) { /* silenciar */ }
}

// ── Helper: resposta bloqueada por cooldown/limite ──
function blockedResponse(check) {
  return {
    success: false,
    error: check.reason === 'cooldown'
      ? `Aguarde ${check.remainingSeconds}s antes de usar novamente`
      : 'Limite diário atingido'
  };
}

// ===== Otimizações =====
ipcMain.handle('optim:set-high-performance', async () => {
  const check = requestParams.canExecute('high_performance');
  if (!check.allowed) return blockedResponse(check);
  try {
    const res = await optim.setHighPerformance();
    requestParams.logRequest('high_performance', true);
    await trainML('high_performance', true);
    return { success: true, out: res };
  } catch (err) {
    requestParams.logRequest('high_performance', false);
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
  const check = requestParams.canExecute('process_priority');
  if (!check.allowed) return blockedResponse(check);
  try {
    const res = await optim.setProcessPriority(processName, priority);
    requestParams.logRequest('process_priority', true);
    await trainML('process_priority', true);
    return { success: true, out: res };
  } catch (err) {
    requestParams.logRequest('process_priority', false);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('optim:clear-standby-list', async () => {
  const check = requestParams.canExecute('clear_ram');
  if (!check.allowed) return blockedResponse(check);
  try {
    const res = await optim.clearStandbyList();
    requestParams.logRequest('clear_ram', true);
    await trainML('clear_ram', true);
    return { success: true, out: res };
  } catch (err) {
    requestParams.logRequest('clear_ram', false);
    return { success: false, error: String(err) };
  }
});

// ===== Hardware =====
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

// ===== AI Optimizer =====
ipcMain.handle('ai:get-smart-recommendations', async () => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const sysInfo = await hwMonitor.getSystemInfo();
    const history = db.getOptimizationHistory(10);

    const existingProfile = db.getHardwareProfile();
    if (!existingProfile) {
      db.recordHardwareProfile(sysInfo.cpuModel, sysInfo.cpuCores, parseFloat(sysInfo.totalMemory), 'GPU', 'Windows');
    }

    const hwProfile = {
      cpuModel: sysInfo.cpuModel,
      cpuCores: sysInfo.cpuCores,
      totalMemory: parseFloat(sysInfo.totalMemory),
      gpuModel: 'GPU',
      os: 'Windows'
    };

    const aiRecommendations = await aiOptimizer.getSmartRecommendations(stats, hwProfile, history);

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
  const check = requestParams.canExecute('game_optimization');
  if (!check.allowed) return blockedResponse(check);
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
    requestParams.logRequest('game_optimization', true);
    await trainML('game_optimization', true);
    return { success: true, data: gameOptimization };
  } catch (err) {
    requestParams.logRequest('game_optimization', false);
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
  const map = { 'crítico': 4, 'alto': 3, 'médio': 2, 'baixo': 1 };
  return map[priority] || 1;
}

// ===== Apps =====
ipcMain.handle('apps:get-gallery', async () => {
  try { return { success: true, data: await appsCollector.collectAll() }; }
  catch (err) { return { success: false, error: String(err) }; }
});

ipcMain.handle('apps:get-recent', async () => {
  try { return { success: true, data: await appsCollector.getRecentApps() }; }
  catch (err) { return { success: false, error: String(err) }; }
});

ipcMain.handle('apps:get-games', async () => {
  try { return { success: true, data: await appsCollector.discoverGames() }; }
  catch (err) { return { success: false, error: String(err) }; }
});

// ===== Diagnósticos =====
ipcMain.handle('diag:run-diagnostics', async (event) => {
  const check = requestParams.canExecute('diagnostico');
  if (!check.allowed) return blockedResponse(check);
  try {
    const result = await diagnostics.runFullDiagnostics((progress) => {
      event.sender.send('diag:progress', progress);
    });
    requestParams.logRequest('diagnostico', true);
    await trainML('diagnostico', true);

    if (result.success && result.issues.length > 0) {
      const aiAnalysis = await analyzeIssuesWithAI(result.issues);
      return { success: true, data: result, aiAnalysis };
    }
    return { success: true, data: result };
  } catch (err) {
    requestParams.logRequest('diagnostico', false);
    return { success: false, error: String(err) };
  }
});

async function analyzeIssuesWithAI(issues) {
  try {
    const response = await aiOptimizer.getSmartRecommendations(null, null, null);
    return { analysis: issues, recommendations: response };
  } catch (err) {
    console.error('Erro na análise de IA:', err);
    return null;
  }
}

// ===== Análise IA Completa (Dashboard) =====
ipcMain.handle('ai:full-analysis', async (event) => {
  const check = requestParams.canExecute('diagnostico');
  if (!check.allowed) return blockedResponse(check);

  const send = (step, data) => {
    try { event.sender.send('ai:analysis-progress', { step, ...data }); } catch (e) {}
  };

  try {
    // ── Step 1: Coleta de Hardware ──
    send(1, { status: 'active', detail: 'Coletando dados de hardware...' });
    let hwStats, sysInfo;
    try {
      [hwStats, sysInfo] = await Promise.all([
        hwMonitor.getHardwareStats(),
        hwMonitor.getSystemInfo()
      ]);
    } catch (e) {
      hwStats = { cpu: { current: 0 }, memory: { current: 0, used: 0, total: 0 }, gpu: { current: 0 }, processCount: 0, topCpuProcesses: [], topMemoryProcesses: [] };
      sysInfo = { cpuModel: 'Desconhecido', cpuCores: 0, totalMemory: '0' };
    }
    send(1, {
      status: 'completed',
      detail: `CPU: ${hwStats.cpu.current}% | RAM: ${hwStats.memory.current}% | GPU: ${hwStats.gpu.current}%`,
      data: { hwStats, sysInfo }
    });

    // ── Step 2: Diagnóstico do Sistema ──
    send(2, { status: 'active', detail: 'Executando 10 verificações...' });
    let diagResult;
    try {
      diagResult = await diagnostics.runFullDiagnostics((progress) => {
        send(2, { status: 'active', detail: progress.step, progress: progress.progress });
      });
    } catch (e) {
      diagResult = { success: false, issues: [], totalIssues: 0, severity: 'unknown' };
    }
    send(2, {
      status: 'completed',
      detail: `${diagResult.totalIssues || diagResult.issues.length} problemas detectados`,
      data: { issues: diagResult.issues, severity: diagResult.severity }
    });

    // ── Step 3: Predição ML ──
    send(3, { status: 'active', detail: 'Consultando modelo kNN...' });
    let mlPrediction;
    try {
      mlPrediction = mlEngine.predict(hwStats);
    } catch (e) {
      mlPrediction = { predictions: [], confidence: 0, message: 'Modelo indisponível' };
    }
    send(3, {
      status: 'completed',
      detail: mlPrediction.message || `${mlPrediction.predictions.length} predições geradas`,
      data: mlPrediction
    });

    // ── Step 4: Análise Gemini AI ──
    send(4, { status: 'active', detail: 'Consultando Gemini Pro...' });
    let aiRecommendations;
    const hwProfile = {
      cpuModel: sysInfo.cpuModel,
      cpuCores: sysInfo.cpuCores,
      totalMemory: parseFloat(sysInfo.totalMemory),
      gpuModel: 'GPU',
      os: 'Windows'
    };
    const history = db.getOptimizationHistory(10);

    try {
      aiRecommendations = await aiOptimizer.getSmartRecommendations(hwStats, hwProfile, history);
      // Persistir recomendações
      if (aiRecommendations.recommendations) {
        aiRecommendations.recommendations.forEach(rec => {
          db.recordAIRecommendation(hwProfile, JSON.stringify(rec), mapPriorityToNumber(rec.priority));
        });
      }
    } catch (e) {
      console.error('Gemini erro:', e.message);
      aiRecommendations = {
        recommendations: [],
        overallAssessment: 'Não foi possível conectar à API Gemini. Verifique sua chave de API.'
      };
    }
    send(4, {
      status: 'completed',
      detail: aiRecommendations.recommendations
        ? `${aiRecommendations.recommendations.length} recomendações geradas`
        : 'Análise concluída',
      data: aiRecommendations
    });

    // ── Resultado Final ──
    requestParams.logRequest('diagnostico', true);
    await trainML('diagnostico', true);

    const result = {
      success: true,
      hardware: { stats: hwStats, info: sysInfo },
      diagnostics: { issues: diagResult.issues, severity: diagResult.severity },
      ml: mlPrediction,
      ai: aiRecommendations,
      timestamp: new Date().toISOString()
    };

    return result;
  } catch (err) {
    requestParams.logRequest('diagnostico', false);
    return { success: false, error: String(err) };
  }
});

// ===== ML Engine =====
ipcMain.handle('ml:predict', async () => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const prediction = mlEngine.predict(stats);
    return { success: true, data: prediction };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('ml:get-model-stats', async () => {
  try {
    return { success: true, data: mlEngine.getModelStats() };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('ml:train-feedback', async (_, type, rating) => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const effectiveness = (rating - 1) / 4; // mapeia 1-5 → 0-1
    mlEngine.train(stats, type, effectiveness);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// ===== Apps com Ícones Reais =====
ipcMain.handle('apps:get-running-with-icons', async () => {
  try {
    const si = require('systeminformation');
    const processes = await si.processes();
    const procList = (processes && processes.list) || [];

    // Filtrar processos com janela visível (windowTitle) e agrupar por nome
    const seen = new Map();
    for (const p of procList) {
      const name = (p.name || '').replace(/\.exe$/i, '');
      if (!name || name.length < 2) continue;
      if (seen.has(name.toLowerCase())) {
        const existing = seen.get(name.toLowerCase());
        existing.cpu += (p.cpu || p.pcpu || 0);
        existing.mem += (p.mem || p.pmem || 0);
        continue;
      }
      const exePath = p.path || '';
      if (!exePath || exePath === '' || exePath === '-') continue;
      seen.set(name.toLowerCase(), {
        name,
        path: exePath,
        cpu: p.cpu || p.pcpu || 0,
        mem: p.mem || p.pmem || 0,
        pid: p.pid
      });
    }

    // Ordenar por uso de CPU (mais ativos primeiro) e pegar top 12
    const topApps = Array.from(seen.values())
      .filter(a => a.path && a.path.length > 3)
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 12);

    // Extrair ícones reais usando app.getFileIcon()
    const results = [];
    for (const appInfo of topApps) {
      try {
        const fs = require('fs');
        if (!fs.existsSync(appInfo.path)) continue;
        const nativeImage = await app.getFileIcon(appInfo.path, { size: 'large' });
        const iconDataUrl = nativeImage.toDataURL();
        results.push({
          name: appInfo.name,
          icon: iconDataUrl,
          cpu: appInfo.cpu.toFixed(1),
          mem: appInfo.mem.toFixed(1),
          path: appInfo.path
        });
      } catch (e) {
        // Se não conseguir extrair o ícone, pular
        results.push({
          name: appInfo.name,
          icon: null,
          cpu: appInfo.cpu.toFixed(1),
          mem: appInfo.mem.toFixed(1),
          path: appInfo.path
        });
      }
    }

    return { success: true, data: results };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// ===== Request Params =====
ipcMain.handle('req:get-usage', async () => {
  try {
    return { success: true, data: requestParams.getUsageStats() };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});
