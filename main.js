const path0 = require('path');
const fs0   = require('fs');
const os0   = require('os');

// ── Crash logging (runs before anything else) ────────────────────────────────
const _crashLog = path0.join(os0.tmpdir(), 'fixme-crash.log');
function _log(tag, err) {
  try {
    const line = `[${new Date().toISOString()}] ${tag}: ${err && err.stack ? err.stack : String(err)}\n`;
    fs0.appendFileSync(_crashLog, line);
  } catch (_) {}
}
process.on('uncaughtException',  (err) => { _log('UNCAUGHT', err); });
process.on('unhandledRejection', (r)   => { _log('UNHANDLED', r); });

// ── .env loading ─────────────────────────────────────────────────────────────
function _loadEnv() {
  // 1. Project root (development)
  const local = path0.join(__dirname, '.env');
  if (fs0.existsSync(local)) return local;
  // 2. Optional user-provided configuration next to app.asar (never bundled).
  if (process.resourcesPath) {
    const res = path0.join(process.resourcesPath, '.env');
    if (fs0.existsSync(res)) return res;
  }
  return null;
}
const _envPath = _loadEnv();
if (_envPath) require('dotenv').config({ path: _envPath });

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const optim = require('./src/optimizations');
const HardwareMonitor = require('./src/hardware');
const SuggestionsEngine = require('./src/suggestions');
const db = require('./src/database');
const AIOptimizer = require('./src/ai-optimizer');
const AppsCollector = require('./src/apps-collector');
const SystemDiagnostics = require('./src/diagnostics');
const MLEngine = require('./src/ml-engine');
const RequestParams = require('./src/request-params');
const winOptimizerModule = require('./src/win-optimizer');
const DeepAI = require('./src/deep-ai');
const LocalMLHub = require('./src/local-ml');
const MonitoringLoop = require('./src/monitoring');
const OptimizationRunner = require('./src/optimization-runner');

let hwMonitor, suggestionsEngine, aiOptimizer, appsCollector, diagnostics, mlEngine, requestParams, deepAI, localML;
try { hwMonitor       = new HardwareMonitor();    } catch(e) { _log('INIT_HW', e);   hwMonitor       = { getHardwareStats: async () => ({ cpu:{current:null,available:false,cores:[],history:[]}, memory:{current:null,available:false,used:null,total:null,free:null,history:[]}, gpu:{current:null,available:false,source:'unavailable',history:[]}, topCpuProcesses:[], topMemoryProcesses:[], processCount:null, error:'Monitoramento indisponível' }), getSystemInfo: async () => ({}), getNativeCapabilities: () => ({ available:false, reason:'init_failed' }) }; }
try { suggestionsEngine = new SuggestionsEngine(); } catch(e) { _log('INIT_SUGG', e); suggestionsEngine = { getSuggestions: () => [] }; }
try { aiOptimizer     = new AIOptimizer();        } catch(e) { _log('INIT_AI', e);   aiOptimizer     = {}; }
try { appsCollector   = new AppsCollector();      } catch(e) { _log('INIT_APPS', e); appsCollector   = { getRunningApps: async () => [] }; }
try { diagnostics     = new SystemDiagnostics();  } catch(e) { _log('INIT_DIAG', e); diagnostics     = { runDiagnostics: async () => [] }; }
try { mlEngine        = new MLEngine();            } catch(e) { _log('INIT_ML', e);  mlEngine        = { train: () => {}, predict: () => [] }; }
try { requestParams   = new RequestParams();       } catch(e) { _log('INIT_RP', e);  requestParams   = { canExecute: () => ({allowed:true}), logRequest: () => {} }; }
try { deepAI          = new DeepAI();              } catch(e) { _log('INIT_DAI', e); deepAI          = { analyze: async () => ({}), recordPattern: () => {} }; }
try { localML         = new LocalMLHub();          } catch(e) { _log('INIT_LML', e); localML         = { tick: () => ({}), recordOutcome: () => {}, predict: () => null, getStats: () => ({}), reloadDeclaredProfile: () => {} }; }
const winOptimizer = winOptimizerModule;
const monitoring = new MonitoringLoop({
  collect: () => hwMonitor.getHardwareStats(),
  publish: (stats, sender) => {
    const suggestions = suggestionsEngine.getSuggestions(stats);
    const mlInsights = localML.tick(stats, stats.topCpuProcesses || []);
    deepAI.recordPattern(
      parseFloat(stats?.cpu?.current || 0),
      parseFloat(stats?.memory?.current || 0),
      parseFloat(stats?.gpu?.current || 0)
    );
    sender.send('hw:stats-update', { stats, suggestions, mlInsights });
  },
  onError: (err) => _log('MONITORING', err)
});
let mainWindow = null;
const optimizationRunner = new OptimizationRunner({
  getExecutionState: () => optim.getExecutionState?.() || {},
  publish: (state) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('optim:progress', state);
  }
});
optim.subscribeExecutionState?.(() => optimizationRunner.executionSettled());

function handleOptimization(channel, operation, handler) {
  ipcMain.handle(channel, (event, ...args) => optimizationRunner.run(operation, async report => {
    report({ phase: 'executing' });
    return handler(event, ...args);
  }));
}
ipcMain.handle('optim:get-state', () => ({ success: true, data: optimizationRunner.getState() }));


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    show: true,
    backgroundColor: '#11161d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged
    }
  });

  mainWindow.webContents.on('did-fail-load', (_, code, desc) => {
    _log('RENDERER_FAIL', `code=${code} desc=${desc}`);
  });

  mainWindow.webContents.on('render-process-gone', (_, details) => {
    _log('RENDERER_GONE', JSON.stringify(details));
  });

  mainWindow.loadFile(path.join(__dirname, 'dashboard.html'));

  if (!app.isPackaged && (process.env.FIXME_DEVTOOLS === '1' || process.argv.includes('--devtools'))) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // userData .env overrides the bundled one (user can add their own API key here)
  try {
    const userEnv = path0.join(app.getPath('userData'), '.env');
    if (fs0.existsSync(userEnv)) require('dotenv').config({ path: userEnv, override: true });
  } catch (e) { _log('ENV_LOAD', e); }

  try { db.initDatabase(); } catch (e) { _log('DB_INIT', e); }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(err => _log('APP_READY', err));

app.on('window-all-closed', function () {
  monitoring.stop();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => monitoring.stop());

// ── Helper: treinar ML após execução ──
async function trainML(type, success, statsBefore = null) {
  try {
    const statsAfter = hwMonitor.getCachedHardwareStats?.();
    if (!statsAfter || statsAfter.error) return; // Telemetry must never delay completion of a Windows action.
    if (statsBefore) {
      const beforeAt = Date.parse(statsBefore.timestamp), afterAt = Date.parse(statsAfter.timestamp);
      if (!Number.isFinite(beforeAt) || !Number.isFinite(afterAt) || afterAt <= beforeAt) return;
    }
    mlEngine.train(statsAfter, type, success ? 0.6 : 0.2);
    if (statsBefore) {
      localML.recordOutcome(type, statsBefore, statsAfter, success ? 4 : 2);
    }
  } catch (e) { /* silenciar */ }
}

// ── Helper: capturar stats antes de uma otimização ──
async function snapshotBefore() {
  try { return hwMonitor.getCachedHardwareStats?.() || null; } catch (e) { return null; }
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
handleOptimization('optim:set-high-performance', 'setHighPerformance', async () => {
  const check = requestParams.canExecute('high_performance');
  if (!check.allowed) return blockedResponse(check);
  try {
    const statsBefore = await snapshotBefore();
    const res = await optim.setHighPerformance();
    requestParams.logRequest('high_performance', true);
    await trainML('high_performance', true, statsBefore);
    return { success: true, out: res };
  } catch (err) {
    requestParams.logRequest('high_performance', false);
    return { success: false, error: String(err), code: err?.code };
  }
});

ipcMain.handle('optim:get-active-powerplan', async () => {
  try {
    const res = await optim.getActivePowerPlan();
    return { success: true, out: res };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

handleOptimization('optim:set-process-priority', 'setProcessPriority', async (_, processName, priority) => {
  const check = requestParams.canExecute('process_priority');
  if (!check.allowed) return blockedResponse(check);
  try {
    const statsBefore = await snapshotBefore();
    const res = await optim.setProcessPriority(processName, priority);
    requestParams.logRequest('process_priority', true);
    await trainML('process_priority', true, statsBefore);
    return { success: true, out: res };
  } catch (err) {
    requestParams.logRequest('process_priority', false);
    return { success: false, error: String(err), code: err?.code };
  }
});

handleOptimization('optim:clear-standby-list', 'clearStandbyList', async () => {
  const check = requestParams.canExecute('clear_ram');
  if (!check.allowed) return blockedResponse(check);
  try {
    const statsBefore = await snapshotBefore();
    const res = await optim.clearStandbyList();
    requestParams.logRequest('clear_ram', true);
    await trainML('clear_ram', true, statsBefore);
    return { success: true, out: res };
  } catch (err) {
    requestParams.logRequest('clear_ram', false);
    return { success: false, error: String(err), code: err?.code };
  }
});

// ===== Hardware =====
ipcMain.handle('hw:get-system-info', async () => {
  try {
    const info = await hwMonitor.getSystemInfo();
    return { success: true, data: info };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

ipcMain.handle('hw:get-stats', async () => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const suggestions = suggestionsEngine.getSuggestions(stats);
    return { success: true, data: { stats, suggestions } };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

ipcMain.handle('hw:start-monitoring', async (event, intervalMs = 2000) => {
  try {
    monitoring.start(event.sender, intervalMs);
    return { success: true, message: 'Monitoramento iniciado' };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

ipcMain.handle('hw:stop-monitoring', async () => {
  monitoring.stop();
  return { success: true, message: 'Monitoramento parado' };
});

ipcMain.handle('hw:native-capabilities', async () => {
  try {
    return { success: true, data: hwMonitor.getNativeCapabilities() };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

// ===== User Profile =====
const VALID_USAGE_TYPES = ['Gamer', 'Trabalho', 'Misto'];
const VALID_PRIORITIES = ['performance', 'balanced', 'quiet'];

ipcMain.handle('profile:get', async () => {
  try {
    return { success: true, data: db.getUserProfile() };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

ipcMain.handle('profile:save', async (_, profile) => {
  try {
    if (!profile || !VALID_USAGE_TYPES.includes(profile.usageType)) {
      return { success: false, error: 'usageType inválido' };
    }
    if (!VALID_PRIORITIES.includes(profile.priority)) {
      return { success: false, error: 'priority inválido' };
    }
    db.recordUserProfile(profile);
    localML.reloadDeclaredProfile();
    return { success: true, data: db.getUserProfile() };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
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
    return { success: false, error: String(err), code: err?.code };
  }
});

ipcMain.handle('ai:learn-from-feedback', async (_, optimizationId, rating, comment) => {
  try {
    await aiOptimizer.learnFromFeedback(optimizationId, rating, comment);
    return { success: true, message: 'Feedback registrado e aprendizado aplicado' };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
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
    return { success: false, error: String(err), code: err?.code };
  }
});

ipcMain.handle('ai:get-analytics', async () => {
  try {
    const analytics = db.getAnalytics();
    return { success: true, data: analytics };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

ipcMain.handle('optim:record-success', async (_, type, cpuUsage, memUsage, gpuUsage, notes) => {
  try {
    const sysInfo = await hwMonitor.getSystemInfo();
    db.recordOptimization(type, sysInfo, cpuUsage, memUsage, gpuUsage, true, notes);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

function mapPriorityToNumber(priority) {
  const map = { 'crítico': 4, 'alto': 3, 'médio': 2, 'baixo': 1 };
  return map[priority] || 1;
}

// ===== Apps =====
ipcMain.handle('apps:get-gallery', async () => {
  try { return { success: true, data: await appsCollector.collectAll() }; }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

ipcMain.handle('apps:get-recent', async () => {
  try { return { success: true, data: await appsCollector.getRecentApps() }; }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

ipcMain.handle('apps:get-games', async () => {
  try { return { success: true, data: await appsCollector.discoverGames() }; }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
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
    return { success: false, error: String(err), code: err?.code };
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
    const unavailableStats = { cpu: { current: null }, memory: { current: null, used: null, total: null }, gpu: { current: null, available: false, source: 'unavailable' }, processCount: null, topCpuProcesses: [], topMemoryProcesses: [] };
    const unknownSystem = { cpuModel: 'Desconhecido', cpuCores: null, totalMemory: null, gpuModel: null, os: 'Windows' };
    let hwStats, sysInfo;
    try {
      [hwStats, sysInfo] = await Promise.all([
        hwMonitor.getHardwareStats(),
        hwMonitor.getSystemInfo()
      ]);
    } catch (e) {
      hwStats = unavailableStats;
      sysInfo = unknownSystem;
    }
    hwStats = hwStats || unavailableStats;
    sysInfo = sysInfo || unknownSystem;
    send(1, {
      status: 'completed',
      detail: `CPU: ${hwStats.cpu.current === null ? 'indisponível' : hwStats.cpu.current + '%'} | RAM: ${hwStats.memory.current === null ? 'indisponível' : hwStats.memory.current + '%'} | GPU: ${hwStats.gpu.current === null ? 'indisponível' : hwStats.gpu.current + '%'}`,
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
      send(2, { status: 'error', detail: 'Não foi possível concluir o diagnóstico local' });
      throw new Error(`Não foi possível concluir o diagnóstico local: ${e.message || String(e)}`);
    }
    if (!diagResult || diagResult.success !== true || !Array.isArray(diagResult.issues)) {
      send(2, { status: 'error', detail: 'Não foi possível concluir o diagnóstico local' });
      throw new Error(`Não foi possível concluir o diagnóstico local: ${diagResult?.error || 'Resultado inválido'}`);
    }
    send(2, {
      status: 'completed',
      detail: `${diagResult.totalIssues || diagResult.issues.length} problemas detectados`,
      data: { success: true, source: 'local', issues: diagResult.issues, severity: diagResult.severity || 'unknown' }
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
      totalMemory: Number.isFinite(parseFloat(sysInfo.totalMemory)) ? parseFloat(sysInfo.totalMemory) : null,
      gpuModel: sysInfo.gpuModel || 'Desconhecida',
      os: sysInfo.os || 'Windows'
    };
    const history = db.getOptimizationHistory(10);

    try {
      aiRecommendations = await aiOptimizer.getSmartRecommendations(hwStats, hwProfile, history);
      if (!aiRecommendations || typeof aiRecommendations !== 'object') throw new Error('Resposta de IA inválida');
      aiRecommendations = {
        ...aiRecommendations,
        recommendations: Array.isArray(aiRecommendations.recommendations) ? aiRecommendations.recommendations : [],
        available: true,
        source: 'gemini'
      };
      // Persistir recomendações
      if (aiRecommendations.recommendations) {
        aiRecommendations.recommendations.forEach(rec => {
          db.recordAIRecommendation(hwProfile, JSON.stringify(rec), mapPriorityToNumber(rec.priority));
        });
      }
    } catch (e) {
      console.error('Gemini erro:', e.message);
      aiRecommendations = {
        available: false,
        source: 'unavailable',
        recommendations: [],
        overallAssessment: 'Diagnóstico local concluído. Recomendações por IA indisponíveis; verifique a conexão e a configuração do Gemini.'
      };
    }
    send(4, {
      status: 'completed',
      detail: aiRecommendations.available
        ? `${aiRecommendations.recommendations.length} recomendações geradas`
        : 'Diagnóstico local concluído; recomendações por IA indisponíveis',
      data: aiRecommendations
    });

    // ── Resultado Final ──
    requestParams.logRequest('diagnostico', true);
    await trainML('diagnostico', true);

    const result = {
      success: true,
      source: aiRecommendations.available ? 'local+gemini' : 'local',
      hardware: { stats: hwStats, info: sysInfo },
      diagnostics: { success: true, source: 'local', issues: diagResult.issues, severity: diagResult.severity || 'unknown' },
      ml: mlPrediction,
      ai: aiRecommendations,
      timestamp: new Date().toISOString()
    };

    return result;
  } catch (err) {
    requestParams.logRequest('diagnostico', false);
    return { success: false, error: String(err), code: err?.code };
  }
});

// ===== ML Engine =====
ipcMain.handle('ml:predict', async () => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const prediction = mlEngine.predict(stats);
    return { success: true, data: prediction };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

ipcMain.handle('ml:get-model-stats', async () => {
  try {
    return { success: true, data: mlEngine.getModelStats() };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

ipcMain.handle('ml:train-feedback', async (_, type, rating) => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const effectiveness = (rating - 1) / 4; // mapeia 1-5 → 0-1
    mlEngine.train(stats, type, effectiveness);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

// ===== Local ML Hub =====

// Retorna a snapshot de todos os 5 modelos locais
ipcMain.handle('localml:get-stats', async () => {
  try {
    return { success: true, data: localML.getFullStats() };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

// Prediz qual otimização aplicar agora
ipcMain.handle('localml:predict', async (_, trends) => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    return { success: true, data: localML.predictOptimization(stats, trends || {}) };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

// Executa um tick manual (para refresh da UI sem esperar o intervalo)
ipcMain.handle('localml:tick', async () => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const insights = localML.tick(stats, stats.topCpuProcesses || []);
    return { success: true, data: insights };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

// Registra o resultado de uma otimização (before/after) + rating opcional
ipcMain.handle('localml:record-outcome', async (_, type, statsBefore, statsAfter, userRating) => {
  try {
    localML.recordOutcome(type, statsBefore, statsAfter, userRating ?? null);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

// Treina o classificador de sessão com um rótulo manual
ipcMain.handle('localml:train-session', async (_, label) => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const cpu   = parseFloat(stats?.cpu?.current || 0);
    const mem   = parseFloat(stats?.memory?.current || 0);
    const gpu   = parseFloat(stats?.gpu?.current || 0);
    localML.trainSession(cpu, mem, gpu, stats.topCpuProcesses || [], label);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
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
    return { success: false, error: String(err), code: err?.code };
  }
});

// ===== Request Params =====
ipcMain.handle('req:get-usage', async () => {
  try {
    return { success: true, data: requestParams.getUsageStats() };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

// ===== Win Optimizer =====
function winOptimizationResponse(data) {
  return {
    success: data.success !== false,
    data,
    ...(data.success === false ? { error: 'Uma ou mais etapas não puderam ser concluídas' } : {})
  };
}

handleOptimization('winopt:visual-effects', 'winOptVisualEffects', async (_, enable) => {
  try {
    const res = enable === false ? await winOptimizer.revertVisualEffects() : await winOptimizer.optimizeVisualEffects();
    return winOptimizationResponse(res);
  } catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('winopt:disable-services', 'winOptDisableServices', async () => {
  try { return winOptimizationResponse(await winOptimizer.disableBloatServices()); }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('winopt:disable-telemetry', 'winOptDisableTelemetry', async () => {
  try { return winOptimizationResponse(await winOptimizer.disableTelemetry()); }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('winopt:power-plan', 'winOptPowerPlan', async (_, revert) => {
  try {
    const res = revert ? await winOptimizer.revertPowerPlan() : await winOptimizer.applyUltimatePerformance();
    return winOptimizationResponse(res);
  } catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('winopt:network', 'winOptNetwork', async () => {
  try { return winOptimizationResponse(await winOptimizer.optimizeNetwork()); }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('winopt:scheduler', 'winOptScheduler', async () => {
  try { return winOptimizationResponse(await winOptimizer.optimizeScheduler()); }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('winopt:remove-policies', 'winOptRemovePolicies', async () => {
  try { return winOptimizationResponse(await winOptimizer.removeJunkPolicies()); }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('winopt:optimize-gpu', 'winOptGPU', async () => {
  try { return winOptimizationResponse(await winOptimizer.optimizeGPU()); }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('winopt:optimize-memory', 'winOptMemory', async () => {
  try { return winOptimizationResponse(await winOptimizer.optimizeMemory()); }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('winopt:kill-background', 'winOptKillBackground', async () => {
  try {
    const candidates = await winOptimizer.getRunningKillCandidates();
    const res = candidates.length
      ? await winOptimizer.killBackgroundProcesses(candidates.map(c => c.exe))
      : { applied: 'kill_background', success: true, results: [] };
    return {
      success: res.success !== false,
      data: { candidates, results: res },
      ...(res.success === false ? { error: 'Um ou mais aplicativos não puderam ser encerrados' } : {})
    };
  } catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('apps:kill-process', 'killProcess', async (_, processName) => {
  try { return { success: true, data: await winOptimizer.killBackgroundProcess(processName) }; }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

ipcMain.handle('winopt:get-kill-candidates', async () => {
  try { return { success: true, data: await winOptimizer.getRunningKillCandidates() }; }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('winopt:boost-game', 'winOptBoostGame', async (_, processName) => {
  try { return { success: true, data: await winOptimizer.boostGameProcess(processName) }; }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

handleOptimization('winopt:full-optimization', 'winOptFullBundle', async (_, options) => {
  const check = requestParams.canExecute('full_optimization');
  if (!check.allowed) return blockedResponse(check);
  try {
    const statsBefore = await snapshotBefore();
    const res = await winOptimizer.runFullOptimization(options || {}, progress => optimizationRunner.update(progress));
    const success = res.success === true;
    requestParams.logRequest('full_optimization', success);
    await trainML('full_optimization', success, statsBefore);
    const stats = hwMonitor.getCachedHardwareStats?.() || {};
    db.recordOptimization('full_optimization', 'bundle', stats.cpu?.current ?? null, stats.memory?.current ?? null, stats.gpu?.current ?? null, success, JSON.stringify({ completed: res.completed || res.applied || [], errors: res.errors || [] }));
    return {
      success,
      data: res,
      code: res.code,
      ...(success ? {} : { error: res.code ? res.errors?.at(-1)?.error || 'O ajuste foi interrompido.' : 'A otimização terminou com falhas. Confira as etapas que não foram concluídas.' })
    };
  } catch (err) {
    requestParams.logRequest('full_optimization', false);
    return { success: false, error: String(err), code: err?.code };
  }
});

// ===== Deep AI =====
ipcMain.handle('deepai:analyze', async (_, userContext) => {
  const check = requestParams.canExecute('diagnostico');
  if (!check.allowed) return blockedResponse(check);
  try {
    const [hwStats, sysInfo] = await Promise.all([hwMonitor.getHardwareStats(), hwMonitor.getSystemInfo()]);
    const processStats = {
      count: hwStats.processCount || 0,
      topCpu: hwStats.topCpuProcesses || [],
      topMem: hwStats.topMemoryProcesses || []
    };
    const history = db.getOptimizationHistory(20);
    const fingerprint = deepAI.buildSystemFingerprint(
      { ...hwStats, cpuModel: sysInfo.cpuModel, cpuCores: sysInfo.cpuCores, memTotal: parseFloat(sysInfo.totalMemory), gpuModel: 'GPU' },
      processStats,
      history
    );
    const result = await deepAI.deepAnalyze(fingerprint, userContext || '');
    requestParams.logRequest('diagnostico', true);
    return { success: true, data: result, fingerprint };
  } catch (err) {
    return { success: false, error: String(err), code: err?.code };
  }
});

ipcMain.handle('deepai:refine', async (_, question) => {
  try {
    const result = await deepAI.refineAnalysis(question);
    return { success: true, data: result };
  } catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

ipcMain.handle('deepai:bottleneck', async (_, type) => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const sysInfo = await hwMonitor.getSystemInfo();
    const metrics = type === 'cpu'
      ? { usage: stats.cpu?.current || 0, cores: sysInfo.cpuCores, model: sysInfo.cpuModel, topProcesses: stats.topCpuProcesses || [] }
      : type === 'memory'
        ? { usagePercent: stats.memory?.current || 0, totalGb: parseFloat(sysInfo.totalMemory) }
        : { usage: stats.gpu?.current || 0, model: 'GPU' };
    const result = await deepAI.analyzeBottleneck(type, metrics);
    return { success: true, data: result };
  } catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

ipcMain.handle('deepai:analyze-processes', async () => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    const processes = (stats.topCpuProcesses || []).concat(stats.topMemoryProcesses || []);
    const result = await deepAI.analyzeProcessList(processes);
    return { success: true, data: result };
  } catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

ipcMain.handle('deepai:record-pattern', async () => {
  try {
    const stats = await hwMonitor.getHardwareStats();
    deepAI.recordPattern(stats.cpu?.current || 0, stats.memory?.current || 0, stats.gpu?.current || 0);
    return { success: true };
  } catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

ipcMain.handle('deepai:learn-outcome', async (_, optimizationId, before, after, rating) => {
  try {
    const lesson = await deepAI.learnFromOutcome(optimizationId, before, after, rating);
    return { success: true, data: lesson };
  } catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

ipcMain.handle('deepai:session-summary', async () => {
  try { return { success: true, data: deepAI.getSessionSummary() }; }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});

ipcMain.handle('deepai:clear-session', async () => {
  try { deepAI.clearSession(); return { success: true }; }
  catch (err) { return { success: false, error: String(err), code: err?.code }; }
});
