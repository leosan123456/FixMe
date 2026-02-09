const db = require('./database');

/**
 * Motor de Machine Learning local com algoritmo k-Nearest Neighbors (kNN).
 * Aprende com cada execução de otimização e prediz qual otimização
 * terá maior efetividade baseado no estado atual do sistema.
 *
 * Vetor de características por amostra:
 *   [cpu%, mem%, gpu%, hora_do_dia, dia_da_semana, quantidade_processos]
 * Alvo: effectiveness (0–1), alimentado por feedback do usuário ou por padrão.
 */
class MLEngine {
  constructor() {
    this.k = 5;
    this.trainingData = [];
  }

  // ── Carregar dados de treino persistidos no banco ──
  loadTrainingData() {
    this.trainingData = db.getMLTrainingData();
  }

  // ── Extrair vetor de características a partir dos stats do hardware ──
  extractFeatures(stats) {
    const now = new Date();
    return [
      parseFloat((stats && stats.cpu && stats.cpu.current) || 0) / 100,
      parseFloat((stats && stats.memory && stats.memory.current) || 0) / 100,
      parseFloat((stats && stats.gpu && stats.gpu.current) || 0) / 100,
      now.getHours() / 24,
      now.getDay() / 7,
      ((stats && stats.processCount) || 0) / 500
    ];
  }

  // ── Distância euclidiana entre dois vetores ──
  distance(a, b) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - (b[i] || 0), 2), 0));
  }

  // ── Predizer melhor otimização para o estado atual ──
  predict(stats) {
    this.loadTrainingData();

    if (this.trainingData.length < 3) {
      return {
        predictions: [],
        confidence: 0,
        message: 'Dados insuficientes para predição. Continue usando as otimizações para alimentar o modelo.'
      };
    }

    const features = this.extractFeatures(stats);

    // Calcular distância para cada amostra de treino
    const distances = this.trainingData.map((sample) => ({
      dist: this.distance(features, sample.features),
      effectiveness: sample.effectiveness,
      type: sample.optimization_type
    }));

    distances.sort((a, b) => a.dist - b.dist);
    const kNearest = distances.slice(0, Math.min(this.k, distances.length));

    // Agrupar por tipo e calcular efetividade ponderada (inverse-distance weighting)
    const typeScores = {};
    for (const neighbor of kNearest) {
      if (!typeScores[neighbor.type]) {
        typeScores[neighbor.type] = { total: 0, weightSum: 0, count: 0 };
      }
      const weight = 1 / (neighbor.dist + 0.001);
      typeScores[neighbor.type].total += neighbor.effectiveness * weight;
      typeScores[neighbor.type].weightSum += weight;
      typeScores[neighbor.type].count++;
    }

    // Ordenar por score descendente
    const predictions = Object.entries(typeScores).map(([type, scores]) => ({
      type,
      score: Math.round((scores.total / scores.weightSum) * 100) / 100,
      confidence: Math.round(Math.min(scores.count / this.k, 1) * 100)
    })).sort((a, b) => b.score - a.score);

    return {
      predictions,
      confidence: predictions.length > 0 ? predictions[0].confidence : 0,
      message: predictions.length > 0
        ? `ML recomenda: ${this.getTypeLabel(predictions[0].type)} (confiança ${predictions[0].confidence}%)`
        : 'Sem predição disponível'
    };
  }

  // ── Adicionar nova amostra de treino ──
  train(stats, optimizationType, effectiveness) {
    const sample = {
      features: this.extractFeatures(stats),
      optimization_type: optimizationType,
      effectiveness: Math.max(0, Math.min(1, effectiveness)),
      timestamp: new Date().toISOString()
    };
    db.recordMLTrainingSample(sample);
    this.trainingData.push(sample);
    return sample;
  }

  // ── Estatísticas do modelo para exibição na UI ──
  getModelStats() {
    this.loadTrainingData();

    const typeCounts = {};
    for (const sample of this.trainingData) {
      typeCounts[sample.optimization_type] = (typeCounts[sample.optimization_type] || 0) + 1;
    }

    const avgEffectiveness = this.trainingData.length > 0
      ? this.trainingData.reduce((sum, s) => sum + s.effectiveness, 0) / this.trainingData.length
      : 0;

    return {
      totalSamples: this.trainingData.length,
      typeCounts,
      avgEffectiveness: Math.round(avgEffectiveness * 100) / 100,
      isReady: this.trainingData.length >= 3
    };
  }

  getTypeLabel(type) {
    const labels = {
      'high_performance': 'Plano High Performance',
      'clear_ram': 'Limpeza de RAM',
      'process_priority': 'Prioridade de Processo',
      'game_optimization': 'Otimização de Jogo',
      'diagnostico': 'Diagnóstico do Sistema'
    };
    return labels[type] || type;
  }
}

module.exports = MLEngine;
