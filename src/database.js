const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'fixme-data.json');

let database = {
  optimization_history: [],
  hardware_profile: null,
  ai_recommendations: [],
  user_feedback: []
};

function initDatabase() {
  // Carregar dados existentes se houver
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf8');
      database = JSON.parse(data);
    } catch (err) {
      console.error('Erro ao carregar banco de dados:', err);
      database = {
        optimization_history: [],
        hardware_profile: null,
        ai_recommendations: [],
        user_feedback: []
      };
    }
  } else {
    saveDatabase();
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(database, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar banco de dados:', err);
  }
}

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

function recordHardwareProfile(cpuModel, cpuCores, totalMemGb, gpuModel, osVersion) {
  const profile = {
    timestamp: new Date().toISOString(),
    cpu_model: cpuModel,
    cpu_cores: cpuCores,
    total_memory_gb: totalMemGb,
    gpu_model: gpuModel,
    os_version: osVersion
  };
  database.hardware_profile = profile;
  saveDatabase();
  return true;
}

function recordAIRecommendation(hwProfile, recommendation, priority, effectivenessScore = 0) {
  const record = {
    id: database.ai_recommendations.length + 1,
    timestamp: new Date().toISOString(),
    hardware_profile: typeof hwProfile === 'string' ? hwProfile : JSON.stringify(hwProfile),
    recommendation: typeof recommendation === 'string' ? recommendation : JSON.stringify(recommendation),
    priority: priority,
    applied: false,
    effectiveness_score: effectivenessScore
  };
  database.ai_recommendations.push(record);
  saveDatabase();
  return record.id;
}

function recordUserFeedback(optimizationId, rating, comment = '') {
  const feedback = {
    id: database.user_feedback.length + 1,
    timestamp: new Date().toISOString(),
    optimization_id: optimizationId,
    rating: rating,
    comment: comment
  };
  database.user_feedback.push(feedback);
  saveDatabase();
  return feedback.id;
}

function getOptimizationHistory(limit = 50) {
  return database.optimization_history.slice(-limit).reverse();
}

function getHardwareProfile() {
  return database.hardware_profile;
}

function getSuccessRate(optimizationType = null) {
  let records = database.optimization_history;
  
  if (optimizationType) {
    records = records.filter(r => r.optimization_type === optimizationType);
  }
  
  if (records.length === 0) return 0;
  
  const successful = records.filter(r => r.success).length;
  return (successful / records.length) * 100;
}

function getTopRecommendations(limit = 5) {
  return database.ai_recommendations
    .filter(r => !r.applied)
    .sort((a, b) => b.priority - a.priority || b.effectiveness_score - a.effectiveness_score)
    .slice(0, limit);
}

function markRecommendationApplied(recommId) {
  const rec = database.ai_recommendations.find(r => r.id === recommId);
  if (rec) {
    rec.applied = true;
    saveDatabase();
    return true;
  }
  return false;
}

function getAnalytics() {
  const totalOptimizations = database.optimization_history.length;
  const successRate = getSuccessRate();
  const lastHwProfile = database.hardware_profile;
  const topRecommendations = getTopRecommendations(3);

  return {
    totalOptimizations,
    successRate: successRate.toFixed(2),
    lastHardwareProfile: lastHwProfile,
    topRecommendations
  };
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
  getAnalytics
};
