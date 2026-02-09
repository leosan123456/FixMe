const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let dbPath = null;
function getDbPath() {
  if (!dbPath) dbPath = path.join(app.getPath('userData'), 'fixme-data.json');
  return dbPath;
}

let database = {
  optimization_history: [],
  hardware_profile: null,
  ai_recommendations: [],
  user_feedback: [],
  ml_training_data: [],
  request_log: []
};

function initDatabase() {
  if (fs.existsSync(getDbPath())) {
    try {
      const data = fs.readFileSync(getDbPath(), 'utf8');
      database = JSON.parse(data);
      // Compatibilidade com versões anteriores
      if (!database.ml_training_data) database.ml_training_data = [];
      if (!database.request_log) database.request_log = [];
    } catch (err) {
      console.error('Erro ao carregar banco de dados:', err);
      database = {
        optimization_history: [],
        hardware_profile: null,
        ai_recommendations: [],
        user_feedback: [],
        ml_training_data: [],
        request_log: []
      };
    }
  } else {
    saveDatabase();
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(getDbPath(), JSON.stringify(database, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar banco de dados:', err);
  }
}

// ── Otimizações ──
function recordOptimization(type, hwProfile, cpuUsage, memUsage, gpuUsage, success, notes = '') {
  const record = {
    id: database.optimization_history.length + 1,
    timestamp: new Date().toISOString(),
    optimization_type: type,
    hardware_profile: typeof hwProfile === 'string' ? hwProfile : JSON.stringify(hwProfile),
    cpu_usage: cpuUsage,
    memory_usage: memUsage,
    gpu_usage: gpuUsage,
    success: success,
    notes: notes
  };
  database.optimization_history.push(record);
  saveDatabase();
  return record.id;
}

function getOptimizationHistory(limit = 50) {
  return database.optimization_history.slice(-limit).reverse();
}

// ── Hardware ──
function recordHardwareProfile(cpuModel, cpuCores, totalMemGb, gpuModel, osVersion) {
  database.hardware_profile = {
    timestamp: new Date().toISOString(),
    cpu_model: cpuModel,
    cpu_cores: cpuCores,
    total_memory_gb: totalMemGb,
    gpu_model: gpuModel,
    os_version: osVersion
  };
  saveDatabase();
  return true;
}

function getHardwareProfile() {
  return database.hardware_profile;
}

// ── AI ──
function recordAIRecommendation(hwProfile, recommendation, priority, effectivenessScore = 0) {
  database.ai_recommendations.push({
    id: database.ai_recommendations.length + 1,
    timestamp: new Date().toISOString(),
    hardware_profile: typeof hwProfile === 'string' ? hwProfile : JSON.stringify(hwProfile),
    recommendation: typeof recommendation === 'string' ? recommendation : JSON.stringify(recommendation),
    priority,
    applied: false,
    effectiveness_score: effectivenessScore
  });
  saveDatabase();
  return database.ai_recommendations.length;
}

function recordUserFeedback(optimizationId, rating, comment = '') {
  database.user_feedback.push({
    id: database.user_feedback.length + 1,
    timestamp: new Date().toISOString(),
    optimization_id: optimizationId,
    rating,
    comment
  });
  saveDatabase();
  return database.user_feedback.length;
}

function getSuccessRate(optimizationType = null) {
  let records = database.optimization_history;
  if (optimizationType) records = records.filter(r => r.optimization_type === optimizationType);
  if (records.length === 0) return 0;
  return (records.filter(r => r.success).length / records.length) * 100;
}

function getTopRecommendations(limit = 5) {
  return database.ai_recommendations
    .filter(r => !r.applied)
    .sort((a, b) => b.priority - a.priority || b.effectiveness_score - a.effectiveness_score)
    .slice(0, limit);
}

function markRecommendationApplied(recommId) {
  const rec = database.ai_recommendations.find(r => r.id === recommId);
  if (rec) { rec.applied = true; saveDatabase(); return true; }
  return false;
}

function getAnalytics() {
  return {
    totalOptimizations: database.optimization_history.length,
    successRate: getSuccessRate().toFixed(2),
    lastHardwareProfile: database.hardware_profile,
    topRecommendations: getTopRecommendations(3)
  };
}

// ── ML Training Data ──
function recordMLTrainingSample(sample) {
  database.ml_training_data.push(sample);
  saveDatabase();
}

function getMLTrainingData() {
  return database.ml_training_data || [];
}

// ── Request Log ──
function recordRequestLog(entry) {
  database.request_log.push(entry);
  // Limitar a 1000 entradas mais recentes
  if (database.request_log.length > 1000) {
    database.request_log = database.request_log.slice(-1000);
  }
  saveDatabase();
}

function getRequestLog() {
  return database.request_log || [];
}

module.exports = {
  initDatabase,
  recordOptimization,
  recordHardwareProfile,
  recordAIRecommendation,
  recordUserFeedback,
  getOptimizationHistory,
  getHardwareProfile,
  getSuccessRate,
  getTopRecommendations,
  markRecommendationApplied,
  getAnalytics,
  recordMLTrainingSample,
  getMLTrainingData,
  recordRequestLog,
  getRequestLog
};
