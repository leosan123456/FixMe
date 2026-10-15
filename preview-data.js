// Loaded only by preview.js, after the production dashboard script.
// No Electron bridge is provided: all hardware values below are illustrative.
document.addEventListener('DOMContentLoaded', () => {
  if (window.fixme) return;

  Object.assign(hwState.cpu, { current: 18.4, name: 'AMD Ryzen 7 7800X3D', cores: 8 });
  Object.assign(hwState.memory, { current: 46, total: 32, used: 14.7 });
  Object.assign(hwState.gpu, { current: 8.2, name: 'NVIDIA GeForce RTX 4070', vram: 12288 });
  hwState.processCount = 142;
  lastApps = [
    { name: 'Steam', cpu: 2.1 },
    { name: 'Discord', cpu: 1.8 },
    { name: 'Microsoft Edge', cpu: 4.3 },
    { name: 'Spotify', cpu: 0.6 },
    { name: 'Visual Studio Code', cpu: 2.5 },
    { name: 'Windows Explorer', cpu: 0.4 },
  ];
  appsState = 'ready';
  modelStats = { totalSamples: 0, avgEffectiveness: null };
  usageStats = {
    high_performance: { todayCount: 0, limit: 10 },
    clear_ram: { todayCount: 0, limit: 10 },
    diagnostico: { todayCount: 0, limit: 10 },
  };
  updateHardwareUI();
  renderApps();
  renderMLCards();

  const note = document.createElement('p');
  note.id = 'previewNotice';
  note.setAttribute('role', 'note');
  note.style.cssText = 'margin:0 0 24px;padding:12px 16px;border:1px solid var(--border);border-radius:8px;color:var(--text-secondary);font-size:12px;line-height:1.6';
  document.querySelector('.page-heading').after(note);

  function labelPreview() {
    const english = currentLang === 'en';
    refreshKillCandidates();
    note.textContent = english
      ? 'VISUAL PREVIEW · Demonstration data · Windows actions disabled'
      : 'PRÉVIA VISUAL · Dados de demonstração · Ajustes do Windows desativados';
    document.title = 'FixMe — ' + (english ? 'Visual preview' : 'Prévia visual');
    document.querySelectorAll('[onclick]').forEach(button => {
      const action = button.getAttribute('onclick');
      if (/^(?:startAnalysis|applyWinOpt|runFullOptimization|loadRunningApps|refreshKillCandidates|boostGameProcess|runDeepAnalysis|showBottleneckMenu|refineDeepAnalysis|saveProfileForm)\(/.test(action)) {
        button.disabled = true;
        button.title = english ? 'Available in the desktop app' : 'Disponível no aplicativo desktop';
      }
    });
  }
  labelPreview();
  document.getElementById('langToggleBtn').addEventListener('click', labelPreview);
});
