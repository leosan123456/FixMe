const db = require('./database');

/**
 * Controla os parâmetros de cada tipo de requisição do usuário:
 *   - Cooldown entre execuções consecutivas do mesmo tipo
 *   - Limite diário por tipo
 *   - Log de cada execução com timestamp e resultado
 *
 * Todos os dados são persistidos via database.js para sobreviver
 * entre sessões da aplicação.
 */
class RequestParams {
  constructor() {
    // Cooldowns em milissegundos
    this.cooldowns = {
      'high_performance': 300000,   // 5 min
      'clear_ram': 60000,           // 1 min
      'process_priority': 30000,    // 30 s
      'game_optimization': 120000,  // 2 min
      'diagnostico': 180000         // 3 min
    };

    // Máximo de execuções por dia por tipo
    this.dailyLimits = {
      'high_performance': 10,
      'clear_ram': 50,
      'process_priority': 20,
      'game_optimization': 10,
      'diagnostico': 20
    };
  }

  // ── Verificar se o usuário pode executar essa ação agora ──
  canExecute(type) {
    const log = db.getRequestLog();
    const now = Date.now();
    const cooldown = this.cooldowns[type] || 0;
    const limit = this.dailyLimits[type] || 999;

    // Verificar cooldown
    const lastOfType = log
      .filter(r => r.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (lastOfType && (now - lastOfType.timestamp) < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastOfType.timestamp)) / 1000);
      return { allowed: false, reason: 'cooldown', remainingSeconds: remaining };
    }

    // Verificar limite diário
    const today = new Date().toDateString();
    const todayCount = log.filter(r =>
      r.type === type && new Date(r.timestamp).toDateString() === today
    ).length;

    if (todayCount >= limit) {
      return { allowed: false, reason: 'daily_limit', limit };
    }

    return { allowed: true, remaining: limit - todayCount };
  }

  // ── Registrar uma execução no log ──
  logRequest(type, success, details = {}) {
    db.recordRequestLog({
      type,
      timestamp: Date.now(),
      success,
      details
    });
  }

  // ── Estatísticas de uso para a UI ──
  getUsageStats() {
    const log = db.getRequestLog();
    const today = new Date().toDateString();
    const stats = {};

    for (const type of Object.keys(this.cooldowns)) {
      const todayRequests = log.filter(r =>
        r.type === type && new Date(r.timestamp).toDateString() === today
      );
      const allRequests = log.filter(r => r.type === type);

      stats[type] = {
        todayCount: todayRequests.length,
        totalCount: allRequests.length,
        limit: this.dailyLimits[type],
        successRate: allRequests.length > 0
          ? Math.round((allRequests.filter(r => r.success).length / allRequests.length) * 100)
          : 0,
        lastUsed: todayRequests.length > 0
          ? new Date(todayRequests[todayRequests.length - 1].timestamp).toLocaleTimeString('pt-BR')
          : 'Nunca'
      };
    }

    return stats;
  }
}

module.exports = RequestParams;
