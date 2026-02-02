class SuggestionsEngine {
  constructor() {
    this.history = [];
    this.maxHistory = 10;
  }

  addSample(stats) {
    this.history.push(stats);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  analyze(stats) {
    const suggestions = [];

    const cpuCurrent = parseFloat(stats.cpu.current);
    const memCurrent = parseFloat(stats.memory.current);
    const gpuCurrent = parseFloat(stats.gpu.current);

    // Análise de CPU
    if (cpuCurrent > 80) {
      suggestions.push({
        type: 'warning',
        component: 'CPU',
        message: 'CPU acima de 80%. Considere fechar aplicações desnecessárias.',
        severity: 'high',
        action: 'Finalize processos em background'
      });
    } else if (cpuCurrent > 60) {
      suggestions.push({
        type: 'info',
        component: 'CPU',
        message: 'CPU em uso moderado. Monitore aplicações pesadas.',
        severity: 'medium',
        action: 'Monitore uso de CPU'
      });
    }

    // Análise de Memória
    if (memCurrent > 85) {
      suggestions.push({
        type: 'critical',
        component: 'Memória',
        message: 'Memória crítica (>85%). Recomenda-se limpar standby list ou adicionar RAM.',
        severity: 'critical',
        action: 'Limpar RAM (Standby List) ou reiniciar sistema'
      });
    } else if (memCurrent > 75) {
      suggestions.push({
        type: 'warning',
        component: 'Memória',
        message: 'Memória em uso intenso. Considere limpar recursos desnecessários.',
        severity: 'high',
        action: 'Limpar RAM ou fechar aplicações'
      });
    } else if (memCurrent > 60) {
      suggestions.push({
        type: 'info',
        component: 'Memória',
        message: 'Memória em uso moderado. Tudo normal para jogos.',
        severity: 'low',
        action: 'Tudo normal'
      });
    }

    // Análise de GPU (se disponível)
    if (gpuCurrent > 0) {
      if (gpuCurrent > 95) {
        suggestions.push({
          type: 'warning',
          component: 'GPU',
          message: 'GPU em carga máxima. Reduzir configurações gráficas se necessário.',
          severity: 'high',
          action: 'Reduzir qualidade dos gráficos'
        });
      }
    }

    // Análise de processos pesados
    const heavyProcesses = stats.topCpuProcesses.filter(p => parseFloat(p.cpu) > 20);
    if (heavyProcesses.length > 0) {
      const processList = heavyProcesses.map(p => p.name).join(', ');
      suggestions.push({
        type: 'info',
        component: 'Processos',
        message: `Processos pesados detectados: ${processList}. Considere finalizá-los se não estiverem em uso.`,
        severity: 'medium',
        action: 'Gerenciar processos'
      });
    }

    // Recomendação geral (se em jogo/carga)
    if (cpuCurrent > 40 || memCurrent > 50) {
      suggestions.push({
        type: 'success',
        component: 'Geral',
        message: 'Seu sistema está otimizado para jogos. Considere ativar o plano High Performance para melhor desempenho.',
        severity: 'info',
        action: 'Aplicar High Performance'
      });
    }

    // Remover duplicatas por componente
    const uniqueSuggestions = [];
    const seen = new Set();
    for (const sug of suggestions) {
      const key = `${sug.component}-${sug.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSuggestions.push(sug);
      }
    }

    return uniqueSuggestions;
  }

  getSuggestions(stats) {
    this.addSample(stats);
    return this.analyze(stats);
  }
}

module.exports = SuggestionsEngine;
