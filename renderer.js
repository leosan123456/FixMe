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

// Listener para atualizações de monitoramento
window.fixme.onStatsUpdate((data) => {
  updateCharts(data.stats);
  updateSuggestions(data.suggestions);
});

// Inicializar tudo
initCharts();
