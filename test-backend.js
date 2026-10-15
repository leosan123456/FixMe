// Regression tests use fabricated telemetry and stub every privileged command.
// No Windows settings, processes, UAC prompts or user data are touched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const MonitoringLoop = require('./src/monitoring');
const OptimizationRunner = require('./src/optimization-runner');

function loadModule(filename, mocks, globals = {}) {
  const absolute = path.join(__dirname, filename);
  const module = { exports: {} };
  const context = { module, exports: module.exports, Buffer, console, __dirname: path.dirname(absolute), ...globals };
  context.require = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (['path', 'os'].includes(name)) return require(name);
    throw new Error(`Unmocked dependency: ${name}`);
  };
  vm.runInNewContext(fs.readFileSync(absolute, 'utf8'), context, { filename: absolute });
  return module.exports;
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function monitoringFixture(collect) {
  let nextId = 0;
  const timers = new Map();
  const published = [];
  const errors = [];
  const sender = new EventEmitter();
  sender.destroyed = false;
  sender.isDestroyed = () => sender.destroyed;
  const loop = new MonitoringLoop({
    collect,
    publish: (stats) => published.push(stats),
    onError: (err) => errors.push(err),
    schedule: (callback, delay) => { const id = ++nextId; timers.set(id, { callback, delay }); return id; },
    cancel: (id) => timers.delete(id)
  });
  const fire = () => {
    const [id, timer] = timers.entries().next().value;
    timers.delete(id);
    return timer.callback();
  };
  return { loop, sender, timers, published, errors, fire };
}

test('monitoring waits for a slow collection before scheduling another', async () => {
  const pending = deferred();
  let calls = 0;
  const f = monitoringFixture(() => { calls++; return pending.promise; });
  f.loop.start(f.sender, 2000);
  const poll = f.fire();
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(f.timers.size, 0);
  pending.resolve({ cpu: 42 });
  await poll;
  assert.deepEqual(f.published, [{ cpu: 42 }]);
  assert.equal(f.timers.size, 1);
  f.loop.stop();
});

test('monitoring discards a stopped collection and removes window listeners', async () => {
  const pending = deferred();
  const f = monitoringFixture(() => pending.promise);
  f.loop.start(f.sender);
  const poll = f.fire();
  f.loop.stop();
  pending.resolve({ stale: true });
  await poll;
  assert.equal(f.published.length, 0);
  assert.equal(f.timers.size, 0);
  assert.equal(f.sender.listenerCount('destroyed'), 0);
});

test('restarting monitoring never overlaps the previous collection', async () => {
  const old = deferred();
  let calls = 0;
  const f = monitoringFixture(() => ++calls === 1 ? old.promise : Promise.resolve({ fresh: true }));
  f.loop.start(f.sender);
  const oldPoll = f.fire();
  await Promise.resolve();
  f.loop.start(f.sender);
  const newPoll = f.fire();
  assert.equal(calls, 1);
  old.resolve({ stale: true });
  await Promise.all([oldPoll, newPoll]);
  assert.equal(calls, 2);
  assert.deepEqual(f.published, [{ fresh: true }]);
  assert.equal(f.timers.size, 1);
  f.loop.stop();
});

test('destroyed windows stop monitoring; invalid intervals cannot create a tight loop', () => {
  const f = monitoringFixture(async () => ({}));
  for (const interval of [NaN, Infinity, '10', {}, null]) {
    assert.throws(() => f.loop.start(f.sender, interval), /inválido/);
  }
  f.loop.start(f.sender, -50);
  assert.equal([...f.timers.values()][0].delay, 1000);
  f.sender.destroyed = true;
  f.sender.emit('destroyed');
  assert.equal(f.timers.size, 0);
  assert.equal(f.loop.session, null);
});

test('failed telemetry collection is recoverable and schedules another sample', async () => {
  const f = monitoringFixture(async () => { throw new Error('temporary failure'); });
  f.loop.start(f.sender);
  await f.fire();
  assert.equal(f.errors.length, 1);
  assert.equal(f.published.length, 0);
  assert.equal(f.timers.size, 1);
  f.loop.stop();
});

function hardwareFixture({ nativeGpu = null, controllers = [], failing = false } = {}) {
  const sensor = { gpu: nativeGpu, cpu: null };
  const graphics = { controllers };
  const HardwareMonitor = loadModule('src/hardware.js', {
    systeminformation: {
      currentLoad: async () => { if (failing) throw new Error('Sensor unavailable'); return { currentLoad: 25, cores: [] }; },
      mem: async () => ({ total: 16 * 1024 ** 3, used: 8 * 1024 ** 3, free: 8 * 1024 ** 3 }),
      graphics: async () => graphics,
      processes: async () => ({ list: [] }),
      osInfo: async () => ({ platform: 'win32', release: '10' }),
      cpu: async () => ({ brand: 'Test CPU', cores: 8 }),
      diskLayout: async () => []
    },
    './native-telemetry': class { getMetrics = async () => sensor; }
  }, { console: { error: () => {} } });
  return { monitor: new HardwareMonitor({ cacheTtlMs: 0 }), sensor, graphics };
}

test('VRAM allocation never appears as GPU utilization without a real sensor', async () => {
  const f = hardwareFixture({ controllers: [{ memoryTotal: 1000, memoryUsed: 990 }] });
  const stats = await f.monitor.getHardwareStats();
  assert.equal(stats.gpu.current, null);
  assert.equal(stats.gpu.available, false);
  assert.equal(stats.gpu.source, 'unavailable');
  assert.deepEqual(Array.from(stats.gpu.history), [null]);
  assert.equal(stats.cpu.current, '25.00');
});

test('a measured idle GPU remains a valid zero from native or graphics sensors', async () => {
  for (const config of [{ nativeGpu: 0 }, { controllers: [{ utilizationGpu: 0 }] }]) {
    const f = hardwareFixture(config);
    const stats = await f.monitor.getHardwareStats();
    assert.equal(stats.gpu.current, '0.00');
    assert.equal(stats.gpu.available, true);
    assert.equal(stats.gpu.source, config.nativeGpu === 0 ? 'native' : 'systeminformation');
  }
});

test('GPU fallback uses actual utilization and rejects invalid or missing sensor values', async () => {
  const f = hardwareFixture({ nativeGpu: NaN, controllers: [
    { utilizationGpu: -1 }, { utilizationGpu: '' }, { utilizationGpu: null },
    { utilizationGpu: Infinity }, { utilizationGpu: 35 }, { utilizationGpu: 72 }
  ] });
  const stats = await f.monitor.getHardwareStats();
  assert.equal(stats.gpu.current, '72.00');
  assert.equal(stats.gpu.source, 'systeminformation');
});

test('a lost GPU sensor produces a gap instead of stale utilization or zero', async () => {
  const f = hardwareFixture({ nativeGpu: 40 });
  const before = await f.monitor.getHardwareStats();
  f.sensor.gpu = null;
  const after = await f.monitor.getHardwareStats();
  assert.equal(after.gpu.current, null);
  assert.deepEqual(Array.from(after.gpu.history), [40, null]);
  assert.deepEqual(Array.from(before.gpu.history), [40]);
});

test('GPU system information includes the real model and VRAM in MB', async () => {
  const f = hardwareFixture({ controllers: [{ model: 'Test GPU', memoryTotal: 8192 }] });
  const info = await f.monitor.getSystemInfo();
  assert.equal(info.gpuModel, 'Test GPU');
  assert.equal(info.gpuVram, 8192);
});

test('failed hardware reads report unavailable values instead of healthy zero readings', async () => {
  const stats = await hardwareFixture({ failing: true }).monitor.getHardwareStats();
  assert.equal(stats.cpu.current, null);
  assert.equal(stats.memory.current, null);
  assert.equal(stats.gpu.current, null);
  assert.equal(stats.gpu.available, false);
  assert.match(stats.error, /Sensor unavailable/);
});

const processCommands = require('./src/process-command');
function decodeCommand(command) {
  assert.match(command, /^powershell .* -EncodedCommand [A-Za-z0-9+/=]+$/);
  return Buffer.from(command.split(' ').at(-1), 'base64').toString('utf16le');
}

function optimizationsFixture(error = null, query = async () => ({ stdout: '' })) {
  const commands = [];
  const optim = loadModule('src/optimizations.js', {
    './execution': {
      execElevated: async command => { commands.push(command); if (error) throw error; return { stdout: '', stderr: '' }; },
      execCommand: query
    },
    './process-command': processCommands
  });
  return { optim, commands };
}

test('process priorities reject command fragments, wildcard names and invalid priorities before UAC', async () => {
  const f = optimizationsFixture();
  for (const name of ['*', 'chrome[1]', 'a"; Stop-Process', '../chrome', '', null]) {
    await assert.rejects(f.optim.setProcessPriority(name), /inválido/);
  }
  await assert.rejects(f.optim.setProcessPriority('chrome', "High'; Stop-Process"), /inválida/);
  await assert.rejects(f.optim.setProcessPriority('chrome', 'RealTime'), /inválida/);
  assert.equal(f.commands.length, 0);
});

test('priority changes normalize executable suffixes and require an existing process', async () => {
  const f = optimizationsFixture();
  const result = await f.optim.setProcessPriority('Meu App.EXE', 'AboveNormal');
  assert.equal(result.process, 'Meu App');
  const script = decodeCommand(f.commands[0]);
  assert.match(script, /Get-Process -Name 'Meu App' -ErrorAction Stop/);
  assert.match(script, /\$ErrorActionPreference = 'Stop'/);
  assert.match(script, /PriorityClass = 'AboveNormal'/);
  const failing = optimizationsFixture(new Error('Process not found'));
  await assert.rejects(failing.optim.setProcessPriority('missing'), /Process not found/);
});

test('power plan changes do not force CPU minimum and maximum clocks', async () => {
  const f = optimizationsFixture(null, async () => ({ stdout: 'Balanced' }));
  assert.equal((await f.optim.setHighPerformance()).previous, 'Balanced');
  assert.equal(f.commands.length, 1);
  assert.match(f.commands[0], /^powercfg -setactive [\da-f-]+$/);
  assert.doesNotMatch(f.commands[0], /PROCTHROTTLEMIN|PROCTHROTTLEMAX|setacvalueindex/);
});

test('memory cleanup uses only the validated standby tool and never trims active processes', async () => {
  const f = optimizationsFixture(null, async command => {
    assert.equal(command, 'where EmptyStandbyList.exe');
    return { stdout: 'C:\\Tools\\EmptyStandbyList.exe\r\n' };
  });
  const result = await f.optim.clearStandbyList();
  assert.equal(result.mode, 'standbylist');
  assert.deepEqual(f.commands, ['"C:\\Tools\\EmptyStandbyList.exe" standbylist']);
  assert.doesNotMatch(f.commands[0], /workingsets|Get-Process|MinWorkingSet|Disable-MMAgent/);
});

test('missing or invalid memory tools never fall back to trimming application memory', async () => {
  const missing = optimizationsFixture(null, async () => { throw new Error('Tool not found'); });
  await assert.rejects(missing.optim.clearStandbyList(), /requer EmptyStandbyList/);
  assert.equal(missing.commands.length, 0);
  for (const binary of ['', 'EmptyStandbyList.exe', 'C:\\Tools\\other.exe', 'C:\\Tools&evil\\EmptyStandbyList.exe', 'C:\\%TEMP%\\EmptyStandbyList.exe']) {
    const f = optimizationsFixture(null, async () => ({ stdout: binary }));
    await assert.rejects(f.optim.clearStandbyList(), /ferramenta válida/);
    assert.equal(f.commands.length, 0);
  }
});

function winOptimizerFixture(execute = async () => ({ stdout: '' }), running = '[]', queryError = null) {
  const commands = [];
  const batches = [];
  const execution = {
    execElevated: async command => { commands.push(command); return execute(command); },
    clearStandbyList: async () => { await execution.execElevated('standby-only'); return { used: 'mock', mode: 'standbylist' }; },
    execCommand: async () => { if (queryError) throw queryError; return { stdout: running }; },
    runElevatedPowerShellBatch: async (scripts, options = {}) => {
      batches.push(scripts);
      const results = [];
      for (let index = 0; index < scripts.length; index++) {
        try {
          const command = processCommands.encodedPowerShell(`$ErrorActionPreference = 'Stop';\n${scripts[index]}`);
          const result = await execution.execElevated(command);
          results.push({ step: index + 1, success: true, stdout: result.stdout || '' });
        } catch (error) {
          if (execution.isFatalExecutionError(error)) throw error;
          results.push({ step: index + 1, success: false, error: error.message });
          if (options.continueOnError === false) break;
        }
      }
      return results;
    },
    isFatalExecutionError: error => error?.fatal === true || /^ELEVATION_(?:TIMEOUT|CANCELLED|BLOCKED|BUSY|RESULT_INVALID)$/.test(error?.code || '')
  };
  const optimizer = loadModule('src/win-optimizer.js', {
    child_process: { exec: (command, options, callback) => callback(queryError, running, '') },
    './optimizations': execution,
    './execution': execution,
    './process-command': processCommands
  });
  return { optimizer, commands, batches };
}

const noBundleSteps = {
  visualEffects: false, services: false, telemetry: false, power: false,
  network: false, scheduler: false, policies: false, gpu: false, memory: false
};

test('individual process termination targets exactly one allowed executable', async () => {
  const f = winOptimizerFixture();
  const result = await f.optimizer.killBackgroundProcess('Discord.exe');
  assert.equal(result.exe, 'Discord.exe');
  assert.equal(f.commands.length, 1);
  const script = decodeCommand(f.commands[0]);
  assert.match(script, /Get-Process -Name 'Discord' -ErrorAction Stop/);
  assert.match(script, /Stop-Process -Force -ErrorAction Stop/);
  await assert.rejects(f.optimizer.killBackgroundProcess('lsass.exe'), /lista de aplicativos/);
  await assert.rejects(f.optimizer.killBackgroundProcess('*'), /inválido/);
  assert.equal(f.commands.length, 1);
});

test('termination reports UAC/process failures instead of reporting a killed process', async () => {
  const f = winOptimizerFixture(async () => { throw new Error('UAC cancelled'); });
  await assert.rejects(f.optimizer.killBackgroundProcess('chrome.exe'), /UAC cancelled/);
  const batch = await f.optimizer.killBackgroundProcesses(['chrome.exe']);
  assert.equal(batch.success, false);
  assert.equal(batch.results[0].status, 'failed');
  assert.match(batch.results[0].error, /UAC cancelled/);
});

test('batch termination uses running executable names instead of display labels', async () => {
  const f = winOptimizerFixture(undefined, '["EpicWebHelper"]');
  const result = await f.optimizer.killBackgroundProcesses([]);
  assert.equal(result.success, true);
  assert.equal(result.results[0].exe, 'EpicWebHelper.exe');
  assert.match(decodeCommand(f.commands[0]), /Get-Process -Name 'EpicWebHelper'/);
});

test('an empty process scan succeeds without issuing a termination command', async () => {
  const f = winOptimizerFixture(undefined, '[]');
  assert.equal((await f.optimizer.getRunningKillCandidates()).length, 0);
  const result = await f.optimizer.killBackgroundProcesses([]);
  assert.equal(result.success, true);
  assert.equal(result.results.length, 0);
  assert.equal(f.commands.length, 0);
});

test('process query and malformed JSON failures propagate through batch and bundle', async () => {
  for (const [output, error] of [['[]', new Error('PowerShell failed')], ['', null], ['invalid JSON', null], ['null', null], ['{}', null], ['["lsass"]', null]]) {
    const f = winOptimizerFixture(undefined, output, error);
    await assert.rejects(f.optimizer.getRunningKillCandidates(), /Não foi possível consultar/);
    await assert.rejects(f.optimizer.killBackgroundProcesses([]), /Não foi possível consultar/);
    const bundle = await f.optimizer.runFullOptimization({ ...noBundleSteps, killProcesses: true });
    assert.equal(bundle.success, false);
    assert.equal(bundle.errors[0].step, 'kill_bg');
    assert.equal(bundle.completed.length, 0);
    assert.equal(f.commands.length, 0);
  }
});

test('missing services are explicit while denied service changes fail the group', async () => {
  const f = winOptimizerFixture(async (command) => {
    const script = decodeCommand(command);
    assert.doesNotMatch(script, /SilentlyContinue/);
    assert.match(script, /NoServiceFoundForGivenName/);
    assert.match(script, /Set-Service .* -ErrorAction Stop/);
    assert.match(script, /Stop-Service .* -ErrorAction Stop/);
    assert.doesNotMatch(script, /exit\s+0/);
    if (script.includes("Get-Service -Name 'DiagTrack'")) throw new Error('Access denied');
    return { stdout: script.includes("Get-Service -Name 'dmwappushservice'") ? 'disabled\r\n' : 'not_installed\r\n' };
  });
  const result = await f.optimizer.disableBloatServices();
  assert.equal(result.success, false);
  assert.equal(result.results.find(r => r.service === 'DiagTrack').status, 'failed');
  assert.equal(result.results.find(r => r.service === 'DiagTrack').error, 'Access denied');
  assert.equal(result.results.find(r => r.service === 'dmwappushservice').status, 'disabled');
  assert.equal(result.results.find(r => r.service === 'SysMain'), undefined);
  assert.equal(result.results.find(r => r.service === 'WSearch'), undefined);
  assert.equal(result.results.find(r => r.service === 'Fax').status, 'not_installed');
  assert.equal(f.batches.length, 1);
  assert.equal(f.batches[0].length, 15);
  assert.equal(f.commands.every(command => !/SysMain|WSearch/.test(decodeCommand(command))), true);
  const absent = await winOptimizerFixture(async () => ({ stdout: 'not_installed\r\n' })).optimizer.disableBloatServices();
  assert.equal(absent.success, true);
  assert.equal(absent.results.every(r => r.status === 'not_installed'), true);
});

test('service results without confirmation never count as disabled', async () => {
  const result = await winOptimizerFixture().optimizer.disableBloatServices();
  assert.equal(result.success, false);
  assert.equal(result.results.every(r => r.status === 'failed'), true);
});

test('bundles retain completed steps while exposing failed groups', async () => {
  const f = winOptimizerFixture(async (command) => {
    if (decodeCommand(command).includes('AllowTelemetry')) throw new Error('Access denied');
    return { stdout: '' };
  });
  const result = await f.optimizer.runFullOptimization({ ...noBundleSteps, visualEffects: true, telemetry: true });
  assert.equal(result.success, false);
  assert.deepEqual(Array.from(result.completed), ['visual_effects']);
  assert.deepEqual(Array.from(result.applied), ['visual_effects']);
  assert.equal(result.errors[0].step, 'telemetry');
  assert.equal(result.results.find(r => r.applied === 'telemetry').errors.length, 1);
});

test('fully failed elevated groups and game boosts never report success', async () => {
  const f = winOptimizerFixture(async () => { throw new Error('Registry write failed'); });
  const result = await f.optimizer.runFullOptimization({ ...noBundleSteps, memory: true, gpu: true });
  assert.equal(result.success, false);
  assert.equal(result.completed.length, 0);
  assert.equal(result.errors.length, 2);
  await assert.rejects(f.optimizer.boostGameProcess('missing.exe'), /Registry write failed/);
  await assert.rejects(f.optimizer.boostGameProcess('game*'), /inválido/);
});

test('the default bundle applies only visual effects and power, with progress for both', async () => {
  const progress = [];
  const f = winOptimizerFixture();
  const result = await f.optimizer.runFullOptimization({}, update => progress.push(update));
  assert.equal(result.success, true);
  assert.deepEqual(Array.from(result.completed), ['visual_effects', 'power_ultimate']);
  assert.equal(f.commands.length, 2);
  assert.match(decodeCommand(f.commands[0]), /VisualFXSetting/);
  assert.match(f.commands[1], /^powercfg -setactive /);
  assert.deepEqual(progress.map(update => update.label), ['visual_effects', 'visual_effects', 'power', 'power']);
  assert.equal(progress.at(-1).step, 2);
  assert.equal(progress.at(-1).total, 2);
});

test('memory optimization delegates standby cleanup without changing all processes or compression', async () => {
  const f = winOptimizerFixture();
  const result = await f.optimizer.optimizeMemory();
  assert.equal(result.success, true);
  assert.equal(result.result.mode, 'standbylist');
  assert.deepEqual(f.commands, ['standby-only']);
  assert.equal(f.batches.length, 0);
});

test('canceling an elevation stops the bundle before any remaining groups', async () => {
  const error = Object.assign(new Error('UAC canceled'), { code: 'ELEVATION_CANCELLED' });
  const f = winOptimizerFixture(async () => { throw error; });
  const result = await f.optimizer.runFullOptimization({ services: true, memory: true });
  assert.equal(result.success, false);
  assert.equal(result.code, 'ELEVATION_CANCELLED');
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].step, 'visual_effects');
  assert.equal(f.commands.length, 1);
});

test('canceling the power plan elevation never starts the fallback plan', async () => {
  const error = Object.assign(new Error('UAC canceled'), { code: 'ELEVATION_CANCELLED' });
  const f = winOptimizerFixture(async () => { throw error; });
  await assert.rejects(f.optimizer.applyUltimatePerformance(), error);
  assert.equal(f.commands.length, 1);
});

function mainFixture(bundleResult, actionOverrides = {}, winOverrides = {}, analysisOptions = {}) {
  const handlers = new Map();
  const logs = [], training = [], history = [], outcomes = [], killed = [], aiHistory = [];
  let sample = 0;
  const app = new EventEmitter();
  app.whenReady = () => new Promise(() => {});
  const stats = () => ({ timestamp: new Date(1700000000000 + ++sample * 1000).toISOString(), cpu: { current: sample }, memory: { current: 50 }, gpu: { current: 10 } });
  const win = {
    runFullOptimization: async () => bundleResult,
    optimizeGPU: async () => ({ success: false, errors: ['denied'] }),
    getRunningKillCandidates: async () => [{ name: 'EpicGames Helper', exe: 'EpicWebHelper.exe' }],
    killBackgroundProcesses: async (names) => { killed.push(names); return { success: true, results: [] }; },
    killBackgroundProcess: async (name) => ({ exe: name, status: 'killed' })
  };
  Object.assign(win, winOverrides);
  class Empty {}
  loadModule('main.js', {
    fs: { existsSync: () => false, appendFileSync: () => {} },
    electron: { app, BrowserWindow: Empty, ipcMain: { handle: (name, fn) => handlers.set(name, fn) } },
    './src/optimizations': actionOverrides,
    './src/hardware': class {
      getHardwareStats = analysisOptions.getStats || (async () => stats());
      getCachedHardwareStats = analysisOptions.getCachedStats || (() => stats());
      getSystemInfo = analysisOptions.getSystemInfo || (async () => ({ cpuModel: 'Test CPU', cpuCores: 8, totalMemory: '16' }));
    },
    './src/suggestions': Empty,
    './src/database': {
      recordOptimization: (...args) => history.push(args),
      getOptimizationHistory: () => [],
      recordAIRecommendation: (...args) => aiHistory.push(args)
    },
    './src/ai-optimizer': class {
      getSmartRecommendations = analysisOptions.getRecommendations || (async () => ({ recommendations: [], overallAssessment: 'Test assessment' }));
    },
    './src/apps-collector': Empty,
    './src/diagnostics': class {
      runFullDiagnostics = analysisOptions.diagnose || (async () => ({ success: true, issues: [], severity: 'low', totalIssues: 0 }));
    },
    './src/ml-engine': class {
      train = (...args) => training.push(args);
      predict = () => ({ predictions: [], confidence: 0, message: 'Test prediction' });
    },
    './src/request-params': class { canExecute = () => ({ allowed: true }); logRequest = (...args) => logs.push(args); },
    './src/win-optimizer': win,
    './src/deep-ai': Empty,
    './src/local-ml': class { recordOutcome = (...args) => outcomes.push(args); },
    './src/monitoring': MonitoringLoop,
    './src/optimization-runner': OptimizationRunner
  }, { process: { on: () => {}, platform: 'win32' }, setTimeout, clearTimeout, setInterval, clearInterval, console: { error: () => {} } });
  return { handlers, logs, training, history, outcomes, killed, aiHistory };
}

test('IPC preserves failed bundle status in history, usage and ML training', async () => {
  const result = { success: false, completed: ['visual_effects'], errors: [{ step: 'gpu', error: 'denied' }] };
  const f = mainFixture(result);
  const response = await f.handlers.get('winopt:full-optimization')({}, {});
  assert.equal(response.success, false);
  assert.equal(response.data, result);
  assert.equal(f.logs[0][1], false);
  assert.equal(f.training[0][2], 0.2);
  assert.equal(f.outcomes[0][3], 2);
  assert.equal(f.history[0][5], false);
  assert.deepEqual(JSON.parse(f.history[0][6]), { completed: result.completed, errors: result.errors });
});

test('IPC records successful bundles and propagates individual group failures', async () => {
  const f = mainFixture({ success: true, completed: ['gpu'], errors: [] });
  assert.equal((await f.handlers.get('winopt:full-optimization')({}, {})).success, true);
  assert.equal(f.logs[0][1], true);
  assert.equal(f.training[0][2], 0.6);
  assert.equal(f.history[0][5], true);
  assert.equal((await f.handlers.get('winopt:optimize-gpu')({})).success, false);
  await f.handlers.get('winopt:kill-background')({});
  assert.deepEqual(Array.from(f.killed[0]), ['EpicWebHelper.exe']);
});

test('IPC exposes query failures while an empty candidate list skips the batch', async () => {
  const failed = mainFixture({}, {}, { getRunningKillCandidates: async () => { throw new Error('PowerShell failed'); } });
  for (const channel of ['winopt:get-kill-candidates', 'winopt:kill-background']) {
    const response = await failed.handlers.get(channel)({});
    assert.equal(response.success, false);
    assert.match(response.error, /PowerShell failed/);
  }
  assert.equal(failed.killed.length, 0);
  const empty = mainFixture({}, {}, { getRunningKillCandidates: async () => [] });
  const response = await empty.handlers.get('winopt:kill-background')({});
  assert.equal(response.success, true);
  assert.equal(response.data.results.results.length, 0);
  assert.equal(empty.killed.length, 0);
});

test('full analysis rejects thrown and returned diagnostic failures without success training', async () => {
  const diagnoses = [
    async () => { throw new Error('Diagnostic process failed'); },
    async () => ({ success: false, issues: [], error: 'Diagnostic process failed' })
  ];
  for (const diagnose of diagnoses) {
    let aiCalls = 0;
    const progress = [];
    const f = mainFixture({}, {}, {}, {
      diagnose,
      getRecommendations: async () => { aiCalls++; return { recommendations: [] }; }
    });
    const response = await f.handlers.get('ai:full-analysis')({ sender: { send: (channel, data) => progress.push(data) } });
    assert.equal(response.success, false);
    assert.match(response.error, /Não foi possível concluir o diagnóstico local.*Diagnostic process failed/);
    assert.equal(f.logs.length, 1);
    assert.equal(f.logs[0][1], false);
    assert.equal(f.training.length, 0);
    assert.equal(aiCalls, 0);
    assert.equal(progress.some(p => p.step === 2 && p.status === 'error'), true);
    assert.equal(progress.some(p => p.step === 2 && p.status === 'completed'), false);
  }
});

test('malformed diagnostic results never become healthy analysis results', async () => {
  for (const result of [null, {}, { success: true }, { success: true, issues: null }]) {
    const f = mainFixture({}, {}, {}, { diagnose: async () => result });
    const response = await f.handlers.get('ai:full-analysis')({ sender: { send: () => {} } });
    assert.equal(response.success, false);
    assert.match(response.error, /diagnóstico local/);
    assert.equal(f.training.length, 0);
    assert.equal(f.logs[0][1], false);
  }
});

test('valid local diagnosis survives unavailable Gemini and null system information', async () => {
  const issues = [{ category: 'Memory', title: 'Memory pressure', severity: 'high' }];
  let requestedProfile;
  const f = mainFixture({}, {}, {}, {
    getSystemInfo: async () => null,
    diagnose: async () => ({ success: true, issues, severity: 'high', totalIssues: 1 }),
    getRecommendations: async (stats, profile) => { requestedProfile = profile; throw new Error('Gemini unavailable'); }
  });
  const response = await f.handlers.get('ai:full-analysis')({ sender: { send: () => {} } });
  assert.equal(response.success, true);
  assert.equal(response.source, 'local');
  assert.equal(response.diagnostics.success, true);
  assert.equal(response.diagnostics.source, 'local');
  assert.equal(response.diagnostics.issues, issues);
  assert.equal(response.diagnostics.severity, 'high');
  assert.equal(response.ai.available, false);
  assert.equal(response.ai.source, 'unavailable');
  assert.equal(response.ai.recommendations.length, 0);
  assert.match(response.ai.overallAssessment, /Diagnóstico local concluído.*indisponíveis/);
  assert.equal(response.hardware.info.cpuModel, 'Desconhecido');
  assert.equal(requestedProfile.totalMemory, null);
  assert.equal(f.logs[0][1], true);
  assert.equal(f.training.length, 1);
  assert.equal(f.aiHistory.length, 0);
});

test('full analysis identifies Gemini recommendations when local diagnosis is valid', async () => {
  const recommendations = [{ type: 'high_performance', description: 'Test recommendation', priority: 'médio' }];
  const f = mainFixture({}, {}, {}, {
    getSystemInfo: async () => null,
    getRecommendations: async () => ({ recommendations, overallAssessment: 'Test assessment' })
  });
  const response = await f.handlers.get('ai:full-analysis')({ sender: { send: () => {} } });
  assert.equal(response.success, true);
  assert.equal(response.source, 'local+gemini');
  assert.equal(response.ai.available, true);
  assert.equal(response.ai.source, 'gemini');
  assert.equal(response.ai.recommendations, recommendations);
  assert.equal(f.aiHistory.length, 1);
});

test('concurrent Windows actions are excluded globally and can run after the first finishes', async () => {
  const firstAction = deferred(), secondAction = deferred();
  let secondCalls = 0;
  const f = mainFixture({}, {
    setHighPerformance: () => firstAction.promise,
    clearStandbyList: () => { secondCalls++; return secondAction.promise; }
  });
  const first = f.handlers.get('optim:set-high-performance')({});
  await Promise.resolve();
  const second = await f.handlers.get('optim:clear-standby-list')({});
  assert.equal(second.success, false);
  assert.equal(second.code, 'OPTIMIZATION_BUSY');
  assert.equal(secondCalls, 0);
  firstAction.resolve({});
  assert.equal((await first).success, true);
  const next = f.handlers.get('optim:clear-standby-list')({});
  await Promise.resolve();
  secondAction.resolve({});
  assert.equal((await next).success, true);
  assert.equal(secondCalls, 1);
  assert.equal(f.outcomes.find(o => o[0] === 'high_performance')[1].cpu.current, 1);
  assert.equal(f.outcomes.find(o => o[0] === 'clear_ram')[1].cpu.current, 3);
});

test('Windows actions finish without collecting unavailable sensors or fabricating training samples', async () => {
  const f = mainFixture({ success: true, completed: ['visual_effects'], errors: [] }, {
    setHighPerformance: async () => ({ applied: 'high-performance' })
  }, {}, {
    getCachedStats: () => null,
    getStats: async () => { throw new Error('Windows actions must not wait for sensor collection'); }
  });
  assert.equal((await f.handlers.get('optim:set-high-performance')({})).success, true);
  assert.equal((await f.handlers.get('winopt:full-optimization')({}, {})).success, true);
  assert.equal(f.training.length, 0);
  assert.equal(f.outcomes.length, 0);
  assert.equal(f.history.length, 1);
  assert.equal(f.history[0][2], null);
  assert.equal(f.history[0][3], null);
  assert.equal(f.history[0][4], null);
});

test('unchanged cached telemetry never becomes a fabricated before and after training sample', async () => {
  const cached = { timestamp: '2026-10-14T12:00:00.000Z', cpu: { current: 25 }, memory: { current: 50 }, gpu: { current: 10 } };
  const f = mainFixture({ success: true, completed: ['visual_effects'], errors: [] }, {
    setHighPerformance: async () => ({ applied: 'high-performance' })
  }, {}, {
    getCachedStats: () => cached,
    getStats: async () => { throw new Error('Windows actions must not wait for sensor collection'); }
  });
  assert.equal((await f.handlers.get('optim:set-high-performance')({})).success, true);
  assert.equal((await f.handlers.get('winopt:full-optimization')({}, {})).success, true);
  assert.equal(f.training.length, 0);
  assert.equal(f.outcomes.length, 0);
});
