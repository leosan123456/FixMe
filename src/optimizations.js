const execution = require('./execution');
const { execElevated, execCommand } = execution;
const { normalizeProcessName, encodedPowerShell } = require('./process-command');

async function getActivePowerPlan() {
  const { stdout } = await execCommand('powercfg /getactivescheme', { timeoutMs: 10000 });
  return stdout.trim();
}

async function setHighPerformance() {
  // backup current plan
  const current = await getActivePowerPlan();
  // GUID for High Performance / Ultimate Performance on Windows 10/11
  const guid = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';
  // Do not force every CPU to maintain its maximum clock while idle.
  const cmd = `powercfg -setactive ${guid}`;
  await execElevated(cmd);
  return { previous: current, applied: 'high-performance' };
}

async function setProcessPriority(processName, priority = 'High') {
  const name = normalizeProcessName(processName);
  const priorities = ['Idle', 'BelowNormal', 'Normal', 'AboveNormal', 'High'];
  if (!priorities.includes(priority)) throw new Error('Prioridade de processo inválida');
  const psCmd = `$ErrorActionPreference = 'Stop'; ` +
    `$processes = @(Get-Process -Name '${name}' -ErrorAction Stop); ` +
    `$processes | ForEach-Object { $_.PriorityClass = '${priority}' }`;
  await execElevated(encodedPowerShell(psCmd));
  return { process: name, priority };
}
async function clearStandbyList() {
  let output;
  try {
    output = await execCommand('where EmptyStandbyList.exe', { timeoutMs: 10000 });
  } catch (error) {
    if (error.code === 'COMMAND_TIMEOUT') throw error;
    throw new Error('A limpeza de memória em espera requer EmptyStandbyList.exe. Nenhum processo teve sua memória reduzida.');
  }
  const binary = output.stdout.split(/\r?\n/).map(line => line.trim()).find(Boolean);
  if (!binary || !/^(?:[A-Za-z]:\\|\\\\)/.test(binary) || /["\r\n%&|<>^!]/.test(binary) || !/\\EmptyStandbyList\.exe$/i.test(binary)) {
    throw new Error('Não foi possível localizar uma ferramenta válida para limpar a memória em espera.');
  }
  // `workingsets` evicts pages from every running app, including Electron,
  // causing hard page faults and freezes. Only reclaim unused standby pages.
  await execElevated(`"${binary}" standbylist`, { commandTimeoutMs: 30000 });
  return { used: 'EmptyStandbyList', mode: 'standbylist' };
}

module.exports = {
  ...execution,
  setHighPerformance,
  getActivePowerPlan,
  setProcessPriority,
  clearStandbyList
};
