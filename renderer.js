const statusEl = document.getElementById('status');
let cpuChart, memChart, gpuChart;
let monitoringActive = false;

function setStatus(msg, ok = true) {
  statusEl.textContent = msg;
  statusEl.className = ok ? 'status' : 'status error';
  setTimeout(() => {
    statusEl.textContent = 'Status: Pronto';
    statusEl.className = 'status';
  }, 3000);
}

// Inicializar gráficos
function initCharts() {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#a0a8b8' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      x: {
        ticks: { color: '#a0a8b8' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      }
    }
  };

  cpuChart = new Chart(document.getElementById('cpu-chart'), {
    type: 'line',
    data: {
      labels: Array(30).fill(''),
      datasets: [{
        label: 'CPU %',
        data: [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: chartOptions
  });

  memChart = new Chart(document.getElementById('mem-chart'), {
    type: 'line',
    data: {
      labels: Array(30).fill(''),
      datasets: [{
        label: 'Memory %',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: chartOptions
  });

  gpuChart = new Chart(document.getElementById('gpu-chart'), {
    type: 'line',
    data: {
      labels: Array(30).fill(''),
      datasets: [{
        label: 'GPU %',
        data: [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: chartOptions
  });
}

// Carregar informações do sistema
(async function loadSystemInfo() {
  const res = await window.fixme.getSystemInfo();
  if (res.success && res.data) {
    document.getElementById('sys-info').innerHTML = `
      <span>OS: ${res.data.os}</span>
      <span>CPU: ${res.data.cpuModel} (${res.data.cpuCores} cores)</span>
      <span>RAM: ${res.data.totalMemory} GB</span>
    `;
  }
})();

// Carregar primeira vez
(async function loadInitialStats() {
  const res = await window.fixme.getHardwareStats();
  if (res.success && res.data) {
    updateCharts(res.data.stats);
    updateSuggestions(res.data.suggestions);
  }
})();

// Atualizar gráficos
function updateCharts(stats) {
  cpuChart.data.datasets[0].data = stats.cpu.history;
  cpuChart.update('none');
  document.getElementById('cpu-percent').textContent = stats.cpu.current + '%';
  document.getElementById('cpu-cores').textContent = stats.cpu.cores.join(', ') + '%';
  const topCpuProc = stats.topCpuProcesses[0];
  document.getElementById('cpu-top').textContent = topCpuProc 
    ? `${topCpuProc.name} (${topCpuProc.cpu}%)`
    : 'N/A';

  memChart.data.datasets[0].data = stats.memory.history;
  memChart.update('none');
  document.getElementById('mem-percent').textContent = stats.memory.current + '%';
  document.getElementById('mem-used').textContent = stats.memory.used;
  document.getElementById('mem-total').textContent = stats.memory.total;
  const topMemProc = stats.topMemoryProcesses[0];
  document.getElementById('mem-top').textContent = topMemProc
    ? `${topMemProc.name} (${topMemProc.memory} GB)`
    : 'N/A';

  gpuChart.data.datasets[0].data = stats.gpu.history;
  gpuChart.update('none');
  document.getElementById('gpu-percent').textContent = stats.gpu.current + '%';
  document.getElementById('gpu-status').textContent = 
    parseFloat(stats.gpu.current) > 0 ? 'Ativa' : 'Inativa';
}

// Atualizar sugestões
function updateSuggestions(suggestions) {
  const container = document.getElementById('suggestions-container');
  if (!suggestions || suggestions.length === 0) {
    container.innerHTML = '<p class="loading">Sistema otimizado! ✅</p>';
    return;
  }

  container.innerHTML = suggestions.map(s => `
    <div class="suggestion ${s.severity}">
      <div class="suggestion-title">
        ${getSeverityIcon(s.type)} ${s.component}
      </div>
      <div class="suggestion-message">${s.message}</div>
      <div class="suggestion-action">💡 ${s.action}</div>
    </div>
  `).join('');
}

function getSeverityIcon(type) {
  const icons = {
    critical: '🚨',
    warning: '⚠️',
    high: '🔴',
    medium: '🟠',
    info: 'ℹ️',
    success: '✅'
  };
  return icons[type] || 'ℹ️';
}

// Event listeners
document.getElementById('btn-high').addEventListener('click', async () => {
  setStatus('Aplicando High Performance...');
  const res = await window.fixme.setHighPerformance();
  if (res.success) setStatus('High Performance aplicado ✅');
  else setStatus(`Erro: ${res.error}`, false);
});

document.getElementById('btn-clear-ram').addEventListener('click', async () => {
  setStatus('Limpando RAM...');
  const res = await window.fixme.clearStandbyList();
  if (res.success) setStatus('RAM limpa ✅');
  else setStatus(`Erro: ${res.error}`, false);
});

document.getElementById('btn-set-prio').addEventListener('click', async () => {
  const name = (document.getElementById('proc-name').value || '').trim();
  const prio = document.getElementById('proc-prio').value;
  if (!name) return setStatus('Informe o nome do processo', false);
  setStatus(`Definindo prioridade ${prio}...`);
  const res = await window.fixme.setProcessPriority(name, prio);
  if (res.success) setStatus(`Prioridade ${prio} aplicada a ${name} ✅`);
  else setStatus(`Erro: ${res.error}`, false);
});

document.getElementById('btn-monitoring').addEventListener('click', async () => {
  if (monitoringActive) {
    await window.fixme.stopMonitoring();
    setStatus('Monitoramento parado');
    monitoringActive = false;
    document.getElementById('btn-monitoring').textContent = '🔄 Monitorar';
  } else {
    await window.fixme.startMonitoring(2000);
    setStatus('Monitoramento ativo');
    monitoringActive = true;
    document.getElementById('btn-monitoring').textContent = '⏹️ Parar Monitoramento';
  }
});

// Botões de IA
document.getElementById('btn-ai-recommend').addEventListener('click', async () => {
  setStatus('Obtendo recomendações de IA...');
  const res = await window.fixme.getSmartRecommendations();
  if (res.success) {
    displayAIRecommendations(res.data);
    setStatus('Recomendações de IA carregadas ✅');
  } else {
    setStatus(`Erro na IA: ${res.error}`, false);
  }
});

document.getElementById('btn-game-optim').addEventListener('click', async () => {
  const gameName = prompt('Qual é o nome do jogo?');
  if (!gameName) return;
  
  setStatus(`Otimizando para ${gameName}...`);
  const res = await window.fixme.suggestGameOptimization(gameName);
  if (res.success) {
    displayGameOptimizationSuggestions(res.data);
    setStatus(`Otimizações para ${gameName} carregadas ✅`);
  } else {
    setStatus(`Erro ao otimizar para jogo: ${res.error}`, false);
  }
});

function displayAIRecommendations(data) {
  const container = document.getElementById('ai-recommendations');
  
  if (!data.recommendations || data.recommendations.length === 0) {
    container.innerHTML = `<p class="loading">${data.overallAssessment || 'Sistema já está otimizado! ✅'}</p>`;
    return;
  }

  container.innerHTML = data.recommendations.map((rec, idx) => `
    <div class="ai-recommendation ${rec.priority}">
      <div class="ai-rec-header">
        <span class="ai-rec-type">${idx + 1}. ${rec.type}</span>
        <span class="ai-rec-priority">${rec.priority}</span>
      </div>
      <div class="ai-rec-desc">${rec.description}</div>
      <div class="ai-rec-improvement">📈 Melhoria esperada: ${rec.expectedImprovement || 'N/A'}</div>
      <div class="ai-rec-actions">
        <button class="ai-rec-btn" onclick="applyAIRecommendation('${rec.type}', '${rec.command || ''}')">Aplicar</button>
        <button class="ai-rec-btn" onclick="feedbackAIRecommendation('${rec.type}')">Feedback</button>
      </div>
    </div>
  `).join('');
}

function displayGameOptimizationSuggestions(data) {
  const container = document.getElementById('ai-recommendations');
  
  if (typeof data === 'string') {
    container.innerHTML = `<p class="loading">${data}</p>`;
  } else {
    container.innerHTML = `
      <div class="ai-recommendation">
        <div class="ai-rec-header">
          <span class="ai-rec-type">🎮 Sugestões de Otimização para Jogo</span>
        </div>
        <pre class="ai-rec-desc" style="white-space: pre-wrap; word-break: break-word;">${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;
  }
}

async function applyAIRecommendation(type, command) {
  setStatus(`Aplicando: ${type}...`);
  
  const stats = await window.fixme.getHardwareStats();
  if (stats.success) {
    await window.fixme.recordOptimizationSuccess(
      type,
      parseFloat(stats.data.stats.cpu.current),
      parseFloat(stats.data.stats.memory.current),
      parseFloat(stats.data.stats.gpu.current),
      `Aplicado automaticamente pela IA`
    );
    setStatus(`${type} aplicado ✅`);
    loadAnalytics();
  } else {
    setStatus('Erro ao aplicar recomendação', false);
  }
}

function feedbackAIRecommendation(type) {
  const rating = prompt(`Como você avalia a otimização "${type}"? (1-5):`);
  if (rating && (rating >= 1 && rating <= 5)) {
    const comment = prompt('Algum comentário? (opcional)');
    window.fixme.learnFromFeedback(1, parseInt(rating), comment || '').then(res => {
      if (res.success) {
        setStatus('Feedback registrado! A IA está aprendendo 🧠');
      }
    });
  }
}

async function loadAnalytics() {
  const res = await window.fixme.getAnalytics();
  if (res.success && res.data) {
    document.getElementById('total-optim').textContent = res.data.totalOptimizations || '0';
    document.getElementById('success-rate').textContent = `${res.data.successRate || '0'}%`;
    document.getElementById('last-optim').textContent = res.data.lastHardwareProfile 
      ? new Date(res.data.lastHardwareProfile.timestamp).toLocaleString('pt-BR')
      : 'Nunca';
  }
}

// Listener para atualizações de monitoramento
window.fixme.onStatsUpdate((data) => {
  updateCharts(data.stats);
  updateSuggestions(data.suggestions);
});

// Inicializar tudo
initCharts();
loadAnalytics();

// Carregar galeria de apps
(async function loadAppsGallery() {
  const res = await window.fixme.getAppsGallery();
  if (res.success && res.data) {
    displayAppsGallery(res.data);
  }
})();

function displayAppsGallery(apps) {
  const container = document.getElementById('apps-gallery');
  
  if (!apps || apps.length === 0) {
    container.innerHTML = '<p class="loading">Nenhum aplicativo encontrado</p>';
    return;
  }

  container.innerHTML = apps.map(app => `
    <div class="app-item" title="${app.name}">
      <div class="app-icon">
        ${app.icon && app.icon.startsWith('<svg') ? app.icon : `<span>${getAppEmoji(app.type)}</span>`}
      </div>
      <div class="app-name">${app.name}</div>
      <div class="app-type">${app.type}</div>
    </div>
  `).join('');
}

function getAppEmoji(type) {
  const emojis = {
    game: '🎮',
    app: '📱',
    system: '⚙️'
  };
  return emojis[type] || '📦';
}
