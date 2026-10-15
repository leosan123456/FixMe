// These tests stub both child execution and sudo. They never change Windows.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createExecutionRunner, isFatalExecutionError } = require('./src/execution');

function fixture(overrides = {}) {
  let sequence = 0;
  const files = new Map(), timers = new Map(), elevations = [], queries = [], removed = [];
  const runner = createExecutionRunner({
    fs: {
      mkdtemp: async prefix => prefix + ++sequence,
      writeFile: async (filename, content) => files.set(filename, content),
      rm: async filename => removed.push(filename)
    },
    exec: (command, options, callback) => queries.push({ command, options, callback }),
    elevate: (command, options, callback) => elevations.push({ command, options, callback }),
    temporaryRoot: 'C:\\Users\\Test User\\AppData\\Local\\Temp',
    now: () => 1000,
    schedule: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    cancel: id => timers.delete(id),
    ...overrides
  });
  const ready = () => new Promise(resolve => setImmediate(resolve));
  const fire = () => {
    const [id, timer] = timers.entries().next().value;
    timers.delete(id);
    timer.callback();
  };
  const file = suffix => [...files].find(([filename]) => filename.endsWith(suffix))?.[1];
  return { ...runner, files, file, removed, elevations, queries, timers, fire, ready };
}

test('elevation rejects concurrent requests and clears its lock only at confirmed completion', async () => {
  const f = fixture(), states = [];
  const unsubscribe = f.subscribeExecutionState(state => states.push(state));
  const first = f.execElevated('echo test');
  assert.equal(f.getExecutionState().active, true);
  await assert.rejects(f.execElevated('echo overlap'), error => error.code === 'ELEVATION_BUSY' && error.fatal);
  await f.ready();
  assert.equal(f.elevations.length, 1);
  assert.equal(f.timers.values().next().value.delay, 120000);
  f.elevations[0].callback(null, 'actual output', 'actual warning');
  assert.deepEqual(await first, { stdout: 'actual output', stderr: 'actual warning' });
  assert.equal(f.getExecutionState().active, false);
  assert.equal(f.timers.size, 0);
  assert.equal(f.removed.length, 1);
  assert.deepEqual(states.map(state => state.active), [true, false]);
  unsubscribe();
  f.subscribeExecutionState(() => { throw new Error('broken observer'); });
  const next = f.execElevated('echo next');
  await f.ready();
  f.elevations[1].callback(null);
  await next;
  assert.equal(states.length, 2);
});

test('an unanswered UAC times out visibly but remains locked until the late callback', async () => {
  const f = fixture();
  const pending = f.execElevated('echo test', { timeoutMs: 5000 });
  const rejected = assert.rejects(pending, error => error.code === 'ELEVATION_TIMEOUT' && isFatalExecutionError(error));
  await f.ready();
  f.fire();
  await rejected;
  assert.equal(f.getExecutionState().active, true);
  assert.equal(f.getExecutionState().timedOut, true);
  assert.equal(f.removed.length, 0);
  await assert.rejects(f.execElevated('echo new'), { code: 'ELEVATION_BLOCKED' });
  assert.equal(f.elevations.length, 1);
  f.elevations[0].callback(new Error('User did not grant permission.'));
  assert.equal(f.getExecutionState().active, false);
  assert.equal(f.removed.length, 1);
});

test('preparation finishing after its deadline never presents UAC or starts a command', async () => {
  let completeDirectory;
  const f = fixture({ fs: {
    mkdtemp: () => new Promise(resolve => { completeDirectory = resolve; }),
    writeFile: async () => {}, rm: async () => {}
  } });
  const pending = f.execElevated('echo test');
  const rejected = assert.rejects(pending, { code: 'ELEVATION_TIMEOUT' });
  f.fire();
  await rejected;
  completeDirectory('C:\\Temp\\fixme-only-this-request');
  await f.ready();
  assert.equal(f.elevations.length, 0);
  assert.equal(f.getExecutionState().active, false);
});

test('the elevated watchdog checks expiry, bounds the command tree and bounds output', async () => {
  const f = fixture();
  const pending = f.execElevated('echo test', { timeoutMs: 4000, commandTimeoutMs: 3000 });
  await f.ready();
  const script = f.file('watchdog.ps1');
  assert.match(script, /5000 - \[DateTimeOffset\]::UtcNow\.ToUnixTimeMilliseconds\(\)/);
  assert.ok(script.indexOf('$remaining -le 0') < script.indexOf('$commandProcess = [System.Diagnostics.Process]::Start'));
  assert.match(script, /\[Math\]::Min\(3000, \$remaining\)/);
  assert.match(script, /WaitForExit\(\$duration\)/);
  assert.match(script, /taskkill\.exe/);
  assert.match(script, /\/PID \$\(\$commandProcess\.Id\) \/T \/F/);
  assert.match(script, /FIXME_TERMINATION_UNCONFIRMED/);
  assert.match(script, /ReadBlock\(\$buffer, 0, \$buffer\.Length\)/);
  assert.match(script, /1048576/);
  assert.match(script, /\$startInfo\.UseShellExecute = \$false/);
  assert.match(script, /\$startInfo\.CreateNoWindow = \$true/);
  assert.doesNotMatch(script, /-RedirectStandardOutput|-RedirectStandardError/);
  assert.doesNotMatch(script, /\/IM|Stop-Process -Name/);
  assert.match(f.elevations[0].command, /-File ".+watchdog\.ps1"$/);
  f.elevations[0].callback(null);
  await pending;
});

test('confirmed watchdog timeout unlocks while an unconfirmed termination stays blocked', async () => {
  for (const unknown of [false, true]) {
    const f = fixture();
    const pending = f.execElevated('echo test');
    const rejected = assert.rejects(pending, { code: unknown ? 'ELEVATION_BLOCKED' : 'ELEVATION_TIMEOUT' });
    await f.ready();
    f.elevations[0].callback(Object.assign(new Error('command failed'), { code: 124 }), '',
      'FIXME_COMMAND_TIMEOUT' + (unknown ? '\nFIXME_TERMINATION_UNCONFIRMED' : ''));
    await rejected;
    assert.equal(f.getExecutionState().active, unknown);
    assert.equal(f.removed.length, unknown ? 0 : 1);
  }
});

test('cancelled UAC is fatal and does not leave an idle operation locked', async () => {
  const f = fixture();
  const pending = f.execElevated('echo test');
  const rejected = assert.rejects(pending, error => error.code === 'ELEVATION_CANCELLED' && error.fatal);
  await f.ready();
  f.elevations[0].callback(new Error('User did not grant permission.'));
  await rejected;
  assert.equal(f.getExecutionState().active, false);
});

test('synchronous UAC errors and failed script preparation release the execution state', async () => {
  for (const overrides of [
    { elevate: () => { throw new Error('UAC launcher failed'); } },
    { fs: { mkdtemp: async () => { throw new Error('disk unavailable'); } } }
  ]) {
    const f = fixture(overrides);
    await assert.rejects(f.execElevated('echo test'), /failed|unavailable/);
    assert.equal(f.getExecutionState().active, false);
    assert.equal(f.timers.size, 0);
  }
});

test('invalid requests fail before an elevation can be created', async () => {
  const f = fixture();
  await assert.rejects(f.execElevated(''), /inválido/);
  for (const timeoutMs of [-1, Infinity, NaN, '100', 600001]) {
    await assert.rejects(f.execElevated('echo test', { timeoutMs }), /inválido/);
  }
  assert.equal(f.elevations.length, 0);
  assert.equal(f.getExecutionState().active, false);
});

test('read-only queries use Node timeouts and settle even if their callback never arrives', async () => {
  const f = fixture();
  const pending = f.execCommand('powercfg /getactivescheme', { timeoutMs: 7000 });
  const rejected = assert.rejects(pending, { code: 'COMMAND_TIMEOUT' });
  assert.equal(f.queries[0].options.timeout, 7000);
  assert.equal(f.queries[0].options.windowsHide, true);
  assert.equal(f.queries[0].options.maxBuffer, 1024 * 1024);
  f.fire();
  await rejected;
  // A delayed callback cannot change the settled result or create an elevation.
  f.queries[0].callback(null, 'late');
  assert.equal(f.elevations.length, 0);
});

test('queries preserve errors and results and cancel their deadline when complete', async () => {
  const f = fixture();
  const success = f.execCommand('query');
  f.queries[0].callback(null, 'result', 'warning');
  assert.deepEqual(await success, { stdout: 'result', stderr: 'warning' });
  assert.equal(f.timers.size, 0);
  const failed = f.execCommand('bad query');
  const rejected = assert.rejects(failed, /No such query/);
  f.queries[1].callback(new Error('No such query'));
  await rejected;
  const killed = f.execCommand('slow query');
  const timedOut = assert.rejects(killed, { code: 'COMMAND_TIMEOUT' });
  f.queries[2].callback(Object.assign(new Error('killed'), { killed: true }));
  await timedOut;
});

test('a PowerShell command is loaded from a script file instead of a long cmd.exe argument', async () => {
  const f = fixture();
  const source = "Write-Output 'sample'\n".repeat(1000);
  const encoded = Buffer.from(source, 'utf16le').toString('base64');
  const pending = f.execElevated('powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ' + encoded);
  await f.ready();
  assert.equal(f.file('command.ps1'), '\ufeff' + source);
  assert.ok(f.file('command.cmd').length < 1024);
  assert.ok(f.elevations[0].command.length < 1024);
  f.elevations[0].callback(null);
  await pending;
});

test('PowerShell batches use one UAC and retain successful and failed step results', async () => {
  const f = fixture();
  const pending = f.runElevatedPowerShellBatch(["Write-Output 'first'", "throw 'denied'"]);
  await f.ready();
  assert.equal(f.elevations.length, 1);
  const script = f.file('command.ps1');
  assert.match(script, /Write-Output 'first'/);
  assert.match(script, /throw 'denied'/);
  assert.match(script, /if \(\$LASTEXITCODE -ne 0\)/);
  assert.match(script, /FIXME_BATCH_RESULT:/);
  const results = [{ step: 1, success: true, stdout: 'first' }, { step: 2, success: false, error: 'denied' }];
  f.elevations[0].callback(null, 'FIXME_BATCH_RESULT:' + JSON.stringify(results));
  assert.deepEqual(await pending, results);
});

test('missing, malformed and incomplete batch confirmations never report applied steps', async () => {
  const invalidOutputs = ['', 'FIXME_BATCH_RESULT:not json', 'FIXME_BATCH_RESULT:[]',
    'FIXME_BATCH_RESULT:' + JSON.stringify([{ step: 2, success: true, stdout: '' }]),
    'FIXME_BATCH_RESULT:' + JSON.stringify([{ step: 1, success: true }])];
  for (const output of invalidOutputs) {
    const f = fixture();
    const pending = f.runElevatedPowerShellBatch(['echo sample']);
    const rejected = assert.rejects(pending, error => error.code === 'ELEVATION_RESULT_INVALID' && error.fatal);
    await f.ready();
    f.elevations[0].callback(null, output);
    await rejected;
  }
});

test('stop-on-error batches accept a confirmed failed prefix and empty batches do nothing', async () => {
  const f = fixture();
  assert.deepEqual(await f.runElevatedPowerShellBatch([]), []);
  const pending = f.runElevatedPowerShellBatch(['throw sample', 'echo later'], { continueOnError: false });
  await f.ready();
  assert.match(f.file('command.ps1'), /\$stopBatch = \$true/);
  const result = [{ step: 1, success: false, error: 'sample' }];
  f.elevations[0].callback(null, 'FIXME_BATCH_RESULT:' + JSON.stringify(result));
  assert.deepEqual(await pending, result);
  assert.equal(f.elevations.length, 1);
});

test('unsafe temporary paths fail before UAC and cleanup is scoped to the created directory', async () => {
  const f = fixture({ temporaryRoot: 'C:\\Temp\\%unsafe%' });
  await assert.rejects(f.execElevated('echo test'), /temporário inválido/);
  assert.equal(f.elevations.length, 0);
  assert.equal(f.removed.length, 1);
  assert.ok(f.removed[0].startsWith(path.join('C:\\Temp\\%unsafe%', 'fixme-exec-')));
});
