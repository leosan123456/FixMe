const sudo = require('sudo-prompt');
const { exec } = require('child_process');
const options = { name: 'FixMe' };

function execElevated(cmd) {
  return new Promise((resolve, reject) => {
    sudo.exec(cmd, options, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function getActivePowerPlan() {
  return new Promise((resolve, reject) => {
    exec('powercfg /getactivescheme', (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

async function setHighPerformance() {
  // backup current plan
  const current = await getActivePowerPlan();
  // GUID for High Performance / Ultimate Performance on Windows 10/11
  const guid = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';
  const cmd = `powercfg -setactive ${guid} && powercfg /setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN 100 && powercfg /setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMAX 100 && powercfg -S SCHEME_CURRENT`;
  await execElevated(cmd);
  return { previous: current, applied: 'high-performance' };
}

async function setProcessPriority(processName, priority = 'High') {
  // priority: Idle, BelowNormal, Normal, AboveNormal, High, RealTime
  const psCmd = `Get-Process -Name \"${processName}\" -ErrorAction SilentlyContinue | ForEach-Object { $_.PriorityClass = '${priority}' }`;
  const cmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psCmd}"`;
  await execElevated(cmd);
  return { process: processName, priority };
}

async function clearStandbyList() {
  // Try to call EmptyStandbyList.exe if present, else use built-in method to trim working set
  const cmdCheck = 'where EmptyStandbyList.exe';
  return new Promise((resolve, reject) => {
    exec(cmdCheck, async (err, stdout) => {
      if (!err && stdout && stdout.trim()) {
        // Found binary, execute it elevated
        try {
          await execElevated('EmptyStandbyList.exe workingsets');
          resolve({ used: 'EmptyStandbyList' });
        } catch (e) {
          reject(e);
        }
      } else {
        // Fallback: iterate processes and call MinWorkingSet
        const fallback = "powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command \"Get-Process | Where-Object { $_.ProcessName -notin \"System\",\"Idle\" } | ForEach-Object { try { $_.MinWorkingSet = $_.MinWorkingSet; $_.MaxWorkingSet = $_.MaxWorkingSet } catch {} }\"";
        try {
          await execElevated(fallback);
          resolve({ used: 'fallback-working-set-trim' });
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

module.exports = {
  execElevated,
  setHighPerformance,
  getActivePowerPlan,
  setProcessPriority,
  clearStandbyList
};
