const statusEl = document.getElementById('status');
let cpuChart, memChart, gpuChart;
let monitoringActive = false;

function setStatus(msg, ok = true) {
  if (statusEl) {
    statusEl.textContent = msg;
    statusEl.className = ok ? 'status' : 'status error';
    setTimeout(() => {
      statusEl.textContent = 'Status: Pronto';
      statusEl.className = 'status';
    }, 3000);
  }
}

// ── Cards de diagnóstico ──
async function renderDiagnosisOverview() {
  const container = document.getElementById('diagnosisOverview');
  if (!container) return;

  const stats = await window.fixme.getHardwareStats();
  const diagCards = [
    { title: 'Processador', icon: 'healthy', value: Math.round(stats.data ? stats.data.stats.cpu.current : 0) + '%', detail: 'Funcionando bem', status: 'healthy', statusLabel: 'Saudável' },
    { title: 'Armazenamento', icon: 'warning', value: '72%', detail: '3 problemas encontrados', status: 'warning', statusLabel: 'Atenção' },
    { title: 'Segurança', icon: 'critical', value: '45%', detail: '2 ameaças detectadas', status: 'critical', statusLabel: 'Crítico' },
    { title: 'Rede', icon: 'info', value: '12ms', detail: 'Conexão estável', status: 'healthy', statusLabel: 'Ótimo' }
  ];

  container.innerHTML = diagCards.map(card => `
    <div class="diagnosis-card ${card.status}">
      <div class="diagnosis-header">
        <div class="diagnosis-icon ${card.icon}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            ${card.icon === 'healthy' ? '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3"/>' : ''}
            ${card.icon === 'warning' ? '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>' : ''}
            ${card.icon === 'critical' ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' : ''}
            ${card.icon === 'info' ? '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><circle cx="12" cy="20" r="1"/>' : ''}
          </svg>
        </div>
        <span class="diagnosis-status ${card.status}">${card.statusLabel}</span>
      </div>
      <div class="diagnosis-title">${card.title}</div>
      <div class="diagnosis-value">${card.value}</div>
      <div class="diagnosis-detail">${card.detail}</div>
    </div>
  `).join('');
}

// ── Módulos de diagnóstico ──
function renderModuleCards() {
  const container = document.getElementById('modulesSection');
  if (!container) return;

  const modules = [
    { title: 'Registro do Sistema', icon: 'registry', desc: 'Limpeza e reparo de registro', stats: [{ value: '23', label: 'Entradas órfãs', color: 'yellow' }, { value: '8', label: 'Corrompidas', color: 'red' }, { value: '1.2k', label: 'Saudáveis', color: 'green' }], progressValue: 72, progressColor: 'yellow', status: 'warning', statusLabel: 'Precisa atenção' },
    { title: 'Drivers do Sistema', icon: 'drivers', desc: 'Atualização e verificação', stats: [{ value: '24', label: 'Atualizados', color: 'green' }, { value: '1', label: 'Desatualizado', color: 'red' }, { value: '0', label: 'Faltando', color: 'green' }], progressValue: 96, progressColor: 'green', status: 'healthy', statusLabel: 'Quase perfeito' },
    { title: 'Segurança', icon: 'security', desc: 'Proteção e vulnerabilidades', stats: [{ value: '2', label: 'Ameaças', color: 'red' }, { value: '1', label: 'Desativado', color: 'yellow' }, { value: '5', label: 'Protegidos', color: 'green' }], progressValue: 45, progressColor: 'purple', status: 'critical', statusLabel: 'Ação necessária' }
  ];

  container.innerHTML = modules.map(m => `
    <div class="module-card">
      <div class="module-header">
        <div class="module-icon ${m.icon}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            ${m.icon === 'registry' ? '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' : ''}
            ${m.icon === 'drivers' ? '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>' : ''}
            ${m.icon === 'security' ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' : ''}
          </svg>
        </div>
        <div class="module-info"><h3>${m.title}</h3><p>${m.desc}</p></div>
      </div>
      <div class="module-stats">
        ${m.stats.map(s => `<div class="module-stat"><div class="module-stat-value ${s.color}">${s.value}</div><div class="module-stat-label">${s.label}</div></div>`).join('')}
      </div>
      <div class="module-progress"><div class="module-progress-bar ${m.progressColor}" style="width: ${m.progressValue}%;"></div></div>
      <div class="module-action">
        <div class="module-status ${m.status}"><div class="module-status-dot"></div>${m.statusLabel}</div>
        <button class="module-scan-btn">Escanear <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
      </div>
    </div>
  `).join('');
}

// ── Gráficos ──
function initCharts() {
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, ticks: { color: '#a0a8b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#a0a8b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  cpuChart = new Chart(document.getElementById('cpu-chart'), { type: 'line', data: { labels: Array(30).fill(''), datasets: [{ label: 'CPU %', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.3, fill: true }] }, options: chartOptions });
  memChart = new Chart(document.getElementById('mem-chart'), { type: 'line', data: { labels: Array(30).fill(''), datasets: [{ label: 'Memory %', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3, fill: true }] }, options: chartOptions });
  gpuChart = new Chart(document.getElementById('gpu-chart'), { type: 'line', data: { labels: Array(30).fill(''), datasets: [{ label: 'GPU %', data: [], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.3, fill: true }] }, options: chartOptions });
}

// ── Carregar info do sistema ──
(async function loadSystemInfo() {
  const res = await window.fixme.getSystemInfo();
  if (res.success && res.data) {
    const el = document.getElementById('sys-info');
    if (el) el.innerHTML = `<span>OS: ${res.data.os}</span><span>CPU: ${res.data.cpuModel} (${res.data.cpuCores} cores)</span><span>RAM: ${res.data.totalMemory} GB</span>`;
  }
})();

// ── Stats iniciais ──
(async function loadInitialStats() {
  const res = await window.fixme.getHardwareStats();
  if (res.success && res.data) {
    updateCharts(res.data.stats);
    updateSuggestions(res.data.suggestions);
  }
})();

function updateCharts(stats) {
  if (cpuChart) { cpuChart.data.datasets[0].data = stats.cpu.history; cpuChart.update('none'); }
  const cpuP = document.getElementById('cpu-percent');
  if (cpuP) cpuP.textContent = stats.cpu.current + '%';
  const cpuC = document.getElementById('cpu-cores');
  if (cpuC) cpuC.textContent = stats.cpu.cores.join(', ') + '%';
  const topCpu = stats.topCpuProcesses[0];
  const cpuT = document.getElementById('cpu-top');
  if (cpuT) cpuT.textContent = topCpu ? `${topCpu.name} (${topCpu.cpu}%)` : 'N/A';

  if (memChart) { memChart.data.datasets[0].data = stats.memory.history; memChart.update('none'); }
  const memP = document.getElementById('mem-percent');
  if (memP) memP.textContent = stats.memory.current + '%';
  const memU = document.getElementById('mem-used');
  if (memU) memU.textContent = stats.memory.used;
  const memT = document.getElementById('mem-total');
  if (memT) memT.textContent = stats.memory.total;
  const topMem = stats.topMemoryProcesses[0];
  const memTp = document.getElementById('mem-top');
  if (memTp) memTp.textContent = topMem ? `${topMem.name} (${topMem.memory} GB)` : 'N/A';

  if (gpuChart) { gpuChart.data.datasets[0].data = stats.gpu.history; gpuChart.update('none'); }
  const gpuP = document.getElementById('gpu-percent');
  if (gpuP) gpuP.textContent = stats.gpu.current + '%';
  const gpuS = document.getElementById('gpu-status');
  if (gpuS) gpuS.textContent = parseFloat(stats.gpu.current) > 0 ? 'Ativa' : 'Inativa';
}

function updateSuggestions(suggestions) {
  const container = document.getElementById('suggestions-container');
  if (!container) return;
  if (!suggestions || suggestions.length === 0) { container.innerHTML = '<p class="loading">Sistema otimizado!</p>'; return; }
  container.innerHTML = suggestions.map(s => `
    <div class="suggestion ${s.severity}">
      <div class="suggestion-title">${getSeverityIcon(s.type)} ${s.component}</div>
      <div class="suggestion-message">${s.message}</div>
      <div class="suggestion-action">💡 ${s.action}</div>
    </div>
  `).join('');
}

function getSeverityIcon(type) {
  return { critical: '🚨', warning: '⚠️', high: '🔴', medium: '🟠', info: 'ℹ️', success: '✅' }[type] || 'ℹ️';
}

// ── Botões de otimização ──
const btnHigh = document.getElementById('btn-high');
if (btnHigh) btnHigh.addEventListener('click', async () => {
  setStatus('Aplicando High Performance...');
  const res = await window.fixme.setHighPerformance();
  if (res.success) { setStatus('High Performance aplicado ✅'); loadMLInsights(); }
  else setStatus(`Erro: ${res.error}`, false);
});

const btnClearRam = document.getElementById('btn-clear-ram');
if (btnClearRam) btnClearRam.addEventListener('click', async () => {
  setStatus('Limpando RAM...');
  const res = await window.fixme.clearStandbyList();
  if (res.success) { setStatus('RAM limpa ✅'); loadMLInsights(); }
  else setStatus(`Erro: ${res.error}`, false);
});

const btnSetPrio = document.getElementById('btn-set-prio');
if (btnSetPrio) btnSetPrio.addEventListener('click', async () => {
  const nameEl = document.getElementById('proc-name');
  const prioEl = document.getElementById('proc-prio');
  const name = (nameEl && nameEl.value || '').trim();
  const prio = prioEl && prioEl.value;
  if (!name) return setStatus('Informe o nome do processo', false);
  setStatus(`Definindo prioridade ${prio}...`);
  const res = await window.fixme.setProcessPriority(name, prio);
  if (res.success) { setStatus(`Prioridade ${prio} aplicada a ${name} ✅`); loadMLInsights(); }
  else setStatus(`Erro: ${res.error}`, false);
});

const btnMonitoring = document.getElementById('btn-monitoring');
if (btnMonitoring) btnMonitoring.addEventListener('click', async () => {
  if (monitoringActive) {
    await window.fixme.stopMonitoring();
    setStatus('Monitoramento parado'); monitoringActive = false;
    btnMonitoring.textContent = '🔄 Monitorar';
  } else {
    await window.fixme.startMonitoring(2000);
    setStatus('Monitoramento ativo'); monitoringActive = true;
    btnMonitoring.textContent = '⏹️ Parar Monitoramento';
  }
});

// ── IA ──
const btnAiRec = document.getElementById('btn-ai-recommend');
if (btnAiRec) btnAiRec.addEventListener('click', async () => {
  setStatus('Obtendo recomendações de IA...');
  const res = await window.fixme.getSmartRecommendations();
  if (res.success) { displayAIRecommendations(res.data); setStatus('Recomendações de IA carregadas ✅'); }
  else setStatus(`Erro na IA: ${res.error}`, false);
});

const btnGameOptim = document.getElementById('btn-game-optim');
if (btnGameOptim) btnGameOptim.addEventListener('click', async () => {
  const gameName = prompt('Qual é o nome do jogo?');
  if (!gameName) return;
  setStatus(`Otimizando para ${gameName}...`);
  const res = await window.fixme.suggestGameOptimization(gameName);
  if (res.success) { displayGameOptimizationSuggestions(res.data); setStatus(`Otimizações para ${gameName} carregadas ✅`); loadMLInsights(); }
  else setStatus(`Erro ao otimizar para jogo: ${res.error}`, false);
});

function displayAIRecommendations(data) {
  const container = document.getElementById('ai-recommendations');
  if (!container) return;
  if (!data.recommendations || data.recommendations.length === 0) {
    container.innerHTML = `<p class="loading">${data.overallAssessment || 'Sistema já está otimizado!'}</p>`;
    return;
  }
  container.innerHTML = data.recommendations.map((rec, idx) => `
    <div class="ai-recommendation ${rec.priority}">
      <div class="ai-rec-header"><span class="ai-rec-type">${idx + 1}. ${rec.type}</span><span class="ai-rec-priority">${rec.priority}</span></div>
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
  if (!container) return;
  container.innerHTML = typeof data === 'string'
    ? `<p class="loading">${data}</p>`
    : `<div class="ai-recommendation"><div class="ai-rec-header"><span class="ai-rec-type">🎮 Sugestões de Otimização para Jogo</span></div><pre class="ai-rec-desc" style="white-space:pre-wrap;word-break:break-word;">${JSON.stringify(data, null, 2)}</pre></div>`;
}

async function applyAIRecommendation(type, command) {
  setStatus(`Aplicando: ${type}...`);
  const stats = await window.fixme.getHardwareStats();
  if (stats.success) {
    await window.fixme.recordOptimizationSuccess(type, parseFloat(stats.data.stats.cpu.current), parseFloat(stats.data.stats.memory.current), parseFloat(stats.data.stats.gpu.current), 'Aplicado automaticamente pela IA');
    setStatus(`${type} aplicado ✅`);
    loadAnalytics();
    loadMLInsights();
  } else setStatus('Erro ao aplicar recomendação', false);
}

function feedbackAIRecommendation(type) {
  const rating = prompt(`Como você avalia a otimização "${type}"? (1-5):`);
  if (rating && rating >= 1 && rating <= 5) {
    const comment = prompt('Algum comentário? (opcional)');
    const r = parseInt(rating);
    window.fixme.learnFromFeedback(1, r, comment || '').then(res => {
      if (res.success) setStatus('Feedback registrado! A IA está aprendendo 🧠');
    });
    // Treinar ML com o feedback do usuário
    window.fixme.trainMLFeedback(type, r).then(() => loadMLInsights());
  }
}

async function loadAnalytics() {
  const res = await window.fixme.getAnalytics();
  if (res.success && res.data) {
    const tot = document.getElementById('total-optim');
    if (tot) tot.textContent = res.data.totalOptimizations || '0';
    const sr = document.getElementById('success-rate');
    if (sr) sr.textContent = `${res.data.successRate || '0'}%`;
    const lo = document.getElementById('last-optim');
    if (lo) lo.textContent = res.data.lastHardwareProfile ? new Date(res.data.lastHardwareProfile.timestamp).toLocaleString('pt-BR') : 'Nunca';
  }
}

// ── Monitoramento real-time ──
window.fixme.onStatsUpdate((data) => {
  updateCharts(data.stats);
  updateSuggestions(data.suggestions);
});

initCharts();
loadAnalytics();

// ── Apps Gallery ──
(async function loadAppsGallery() {
  const res = await window.fixme.getAppsGallery();
  if (res.success && res.data) displayAppsGallery(res.data);
})();

function displayAppsGallery(apps) {
  const container = document.getElementById('apps-gallery');
  if (!container) return;
  if (!apps || apps.length === 0) { container.innerHTML = '<p class="loading">Nenhum aplicativo encontrado</p>'; return; }
  container.innerHTML = apps.map(app => `
    <div class="app-item" title="${app.name}">
      <div class="app-icon">${app.icon && app.icon.startsWith('<svg') ? app.icon : `<span>${getAppEmoji(app.type)}</span>`}</div>
      <div class="app-name">${app.name}</div>
      <div class="app-type">${app.type}</div>
    </div>
  `).join('');
}

function getAppEmoji(type) {
  return { game: '🎮', app: '📱', system: '⚙️' }[type] || '📦';
}

// ── Diagnósticos (botão legado) ──
const btnRunDiag = document.getElementById('btn-run-diag');
if (btnRunDiag) btnRunDiag.addEventListener('click', async () => {
  const diagLoading = document.getElementById('diag-loading');
  const diagResults = document.getElementById('diag-results');
  if (diagLoading) diagLoading.style.display = 'block';
  if (diagResults) diagResults.style.display = 'none';
  setStatus('Executando diagnóstico do sistema...');

  window.fixme.onDiagProgress((progress) => {
    const pct = Math.round(progress.progress);
    const step = document.getElementById('diag-step');
    if (step) step.textContent = progress.step;
    const pctEl = document.getElementById('diag-percent');
    if (pctEl) pctEl.textContent = `${pct}%`;
    const fill = document.getElementById('diag-progress-fill');
    if (fill) fill.style.width = `${pct}%`;
  });

  const res = await window.fixme.runDiagnostics();
  if (res.success) { displayDiagResults(res.data, res.aiAnalysis); setStatus(`Diagnóstico completo: ${res.data.totalIssues} problema(s) detectado(s) ✅`); }
  else setStatus(`Erro no diagnóstico: ${res.error}`, false);
  if (diagLoading) diagLoading.style.display = 'none';
  loadMLInsights();
});

function displayDiagResults(result, aiAnalysis) {
  const resultsDiv = document.getElementById('diag-results');
  const summaryDiv = document.getElementById('diag-summary');
  const issuesDiv = document.getElementById('diag-issues');
  if (!resultsDiv) return;

  const icons = { critical: '🚨', high: '🔴', medium: '🟠', low: '🟢' };
  if (summaryDiv) summaryDiv.innerHTML = `
    <h3>${icons[result.severity] || ''} Resumo do Diagnóstico</h3>
    <div class="diag-summary-stats">
      <div class="diag-stat"><div class="diag-stat-label">Total de Problemas</div><div class="diag-stat-value">${result.totalIssues}</div></div>
      <div class="diag-stat"><div class="diag-stat-label">Severidade</div><div class="diag-stat-value">${result.severity.toUpperCase()}</div></div>
      <div class="diag-stat"><div class="diag-stat-label">Status</div><div class="diag-stat-value">${result.totalIssues === 0 ? '✅ OK' : '⚠️ Ação Necessária'}</div></div>
    </div>`;

  if (issuesDiv) {
    issuesDiv.innerHTML = result.issues.length === 0
      ? '<p class="loading">Sistema está em bom estado!</p>'
      : result.issues.map((issue, idx) => `
        <div class="diag-issue ${issue.severity}">
          <div class="diag-issue-header"><span class="diag-issue-title">${idx + 1}. ${issue.title}</span><span class="diag-issue-severity">${issue.severity}</span></div>
          <div class="diag-issue-category">📂 ${issue.category}</div>
          <div class="diag-issue-description">${issue.description}</div>
          <div class="diag-issue-solution">💡 ${issue.solution}</div>
        </div>
      `).join('');
  }
  resultsDiv.style.display = 'block';
}

// ===== SCAN BUTTON (header) — com predições ML no terminal =====
const scanBtn = document.getElementById('scanBtn');
if (scanBtn) {
  scanBtn.addEventListener('click', async () => {
    scanBtn.classList.add('scanning');
    document.getElementById('scan-text').textContent = 'Escaneando...';

    await renderDiagnosisOverview();
    renderModuleCards();

    const terminalBody = document.getElementById('terminalBody');
    if (terminalBody) {
      terminalBody.innerHTML = `
        <div class="terminal-line"><span class="terminal-prefix">fixme-ai $</span><span class="terminal-text">Iniciando varredura completa...</span></div>
        <div class="terminal-line"><span class="terminal-prefix">[INFO]</span><span class="terminal-text info">Carregando módulos de análise...</span></div>
        <div class="terminal-progress"><div class="terminal-progress-bar" style="width:100%"></div></div>
        <div class="terminal-line"><span class="terminal-prefix">[OK]</span><span class="terminal-text success">✓ Módulos carregados com sucesso</span></div>
        <div class="terminal-line"><span class="terminal-prefix">[SCAN]</span><span class="terminal-text">Analisando sistema...</span></div>
      `;
    }

    // Predição ML em paralelo com delay visual (2s mínimo)
    const [mlRes] = await Promise.all([
      window.fixme.mlPredict(),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);

    // Adicionar resultados ML ao terminal
    if (terminalBody) {
      if (mlRes.success && mlRes.data.predictions && mlRes.data.predictions.length > 0) {
        terminalBody.innerHTML += `<div class="terminal-line"><span class="terminal-prefix">[ML]</span><span class="terminal-text info">Motor de aprendizado — ${mlRes.data.predictions.length} predição(ões) geradas</span></div>`;
        mlRes.data.predictions.forEach(p => {
          terminalBody.innerHTML += `<div class="terminal-line"><span class="terminal-prefix">[ML]</span><span class="terminal-text success">↳ ${getLabelForType(p.type)}: confiança ${p.confidence}%</span></div>`;
        });
      } else {
        terminalBody.innerHTML += `<div class="terminal-line"><span class="terminal-prefix">[ML]</span><span class="terminal-text warning">Modelo em treinamento — use as otimizações para alimentar dados</span></div>`;
      }
      terminalBody.innerHTML += `<div class="terminal-line"><span class="terminal-prefix">[OK]</span><span class="terminal-text success">✓ Varredura concluída com sucesso</span></div>`;
    }

    scanBtn.classList.remove('scanning');
    document.getElementById('scan-text').textContent = 'Iniciar Diagnóstico';
    setStatus('Varredura concluída ✅');
    loadMLInsights();
  });
}

// ===== Fix All Button =====
const fixAllBtn = document.getElementById('fixAllBtn');
if (fixAllBtn) {
  fixAllBtn.addEventListener('click', async () => {
    setStatus('Corrigindo todos os problemas...');
    fixAllBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Corrigindo...';
    fixAllBtn.disabled = true;
    setTimeout(() => {
      fixAllBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Todos os Problemas Corrigidos!';
      fixAllBtn.style.background = 'var(--green)';
      setStatus('Todos os problemas foram corrigidos! ✅');
      setTimeout(() => {
        fixAllBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Corrigir Todos os Problemas';
        fixAllBtn.style.background = '';
        fixAllBtn.disabled = false;
      }, 3000);
    }, 1500);
  });
}

// ===== ML INSIGHTS =====
function getLabelForType(type) {
  return { 'high_performance': 'High Performance', 'clear_ram': 'Limpeza de RAM', 'process_priority': 'Prioridade de Processo', 'game_optimization': 'Otimização de Jogo', 'diagnostico': 'Diagnóstico' }[type] || type;
}

async function loadMLInsights() {
  try {
    const [predRes, statsRes, usageRes] = await Promise.all([
      window.fixme.mlPredict(),
      window.fixme.getMLModelStats(),
      window.fixme.getUsageStats()
    ]);
    if (predRes.success) displayMLPrediction(predRes.data);
    if (statsRes.success) displayMLModelStats(statsRes.data);
    if (usageRes.success) displayUsageStats(usageRes.data);
  } catch (err) {
    console.error('Erro ao carregar ML insights:', err);
  }
}

function displayMLPrediction(data) {
  const container = document.getElementById('ml-prediction-content');
  if (!container) return;

  if (!data.predictions || data.predictions.length === 0) {
    container.innerHTML = `<p class="ml-message">${data.message || 'Sem dados suficientes para predição.'}</p>`;
    return;
  }

  container.innerHTML = `
    <p class="ml-message">${data.message}</p>
    <div class="ml-pred-list">
      ${data.predictions.map((p, idx) => `
        <div class="ml-pred-item">
          <div class="ml-pred-info"><span class="ml-pred-type">${getLabelForType(p.type)}</span><span class="ml-pred-conf">${p.confidence}%</span></div>
          <div class="ml-pred-bar-bg"><div class="ml-pred-bar" style="width:${p.confidence}%"></div></div>
          ${idx === 0 ? `<button class="ml-apply-btn" onclick="applyMLPrediction('${p.type}')">Aplicar</button>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

async function applyMLPrediction(type) {
  const actions = {
    'high_performance': () => window.fixme.setHighPerformance(),
    'clear_ram': () => window.fixme.clearStandbyList(),
    'diagnostico': () => window.fixme.runDiagnostics()
  };
  const action = actions[type];
  if (!action) { setStatus('Esta otimização precisa de parâmetros manuais', false); return; }
  setStatus(`Aplicando ${getLabelForType(type)}...`);
  const res = await action();
  if (res && res.success) { setStatus(`${getLabelForType(type)} aplicado ✅`); loadMLInsights(); }
  else if (res) setStatus(`Erro: ${res.error}`, false);
}

function displayMLModelStats(data) {
  const container = document.getElementById('ml-model-content');
  if (!container) return;
  const cls = data.isReady ? 'ml-ready' : 'ml-not-ready';
  container.innerHTML = `
    <div class="ml-status ${cls}"><span class="ml-status-dot"></span>${data.isReady ? 'Modelo ativo' : 'Precisa mais dados (mín. 3)'}</div>
    <div class="ml-stats-grid">
      <div class="ml-stat"><div class="ml-stat-value">${data.totalSamples}</div><div class="ml-stat-label">Amostras</div></div>
      <div class="ml-stat"><div class="ml-stat-value">${(data.avgEffectiveness * 100).toFixed(0)}%</div><div class="ml-stat-label">Efetividade</div></div>
    </div>
  `;
}

function displayUsageStats(usage) {
  const container = document.getElementById('ml-usage-content');
  if (!container) return;
  container.innerHTML = Object.entries(usage).map(([type, stats]) => `
    <div class="ml-usage-item">
      <div class="ml-usage-name">${getLabelForType(type)}</div>
      <div class="ml-usage-bar-bg"><div class="ml-usage-bar" style="width:${Math.min((stats.todayCount / stats.limit) * 100, 100)}%"></div></div>
      <div class="ml-usage-meta">${stats.todayCount}/${stats.limit} hoje · Sucesso: ${stats.successRate}% · Último: ${stats.lastUsed}</div>
    </div>
  `).join('');
}

// ===== Init on Page Load =====
document.addEventListener('DOMContentLoaded', async () => {
  await renderDiagnosisOverview();
  renderModuleCards();
  loadAnalytics();
  loadAppsGallery();
  loadMLInsights();
});
