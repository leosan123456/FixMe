const statusEl = document.getElementById('status');

function setStatus(msg, ok = true) {
  statusEl.textContent = `Status: ${msg}`;
  statusEl.style.color = ok ? 'green' : 'red';
}

document.getElementById('btn-high').addEventListener('click', async () => {
  setStatus('Aplicando High Performance...');
  const res = await window.fixme.setHighPerformance();
  if (res.success) setStatus('High Performance aplicado ✅');
  else setStatus(`Erro: ${res.error}`, false);
});

document.getElementById('btn-clear-ram').addEventListener('click', async () => {
  setStatus('Limpando standby...');
  const res = await window.fixme.clearStandbyList();
  if (res.success) setStatus('Standby limpo ✅');
  else setStatus(`Erro: ${res.error}`, false);
});

document.getElementById('btn-set-prio').addEventListener('click', async () => {
  const name = (document.getElementById('proc-name').value || '').trim();
  const prio = document.getElementById('proc-prio').value;
  if (!name) return setStatus('Informe o nome do processo', false);
  setStatus(`Definindo prioridade ${prio} para ${name}...`);
  const res = await window.fixme.setProcessPriority(name, prio);
  if (res.success) setStatus(`Prioridade aplicada em ${name} ✅`);
  else setStatus(`Erro: ${res.error}`, false);
});

// show current power plan on load
(async function () {
  const res = await window.fixme.getActivePowerPlan();
  if (res.success) {
    setStatus(res.out || 'Pronto');
  }
})();
