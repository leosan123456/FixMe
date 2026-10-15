// Windows integration of the generated watchdog, with UAC replaced by a local
// child process. Only echo, Write-Output, throw and our own sleeping child run.
// No optimization commands, registry writes, services or external apps run.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs').promises;
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createExecutionRunner } = require('./src/execution');

const windows = { skip: process.platform !== 'win32', timeout: 30000 };
const temporaryRoot = path.join(__dirname, 'qa', 'execution-tests', 'paths with spaces');

async function runner() {
  await fs.mkdir(temporaryRoot, { recursive: true });
  return createExecutionRunner({
    temporaryRoot,
    // sudo-prompt captures output in files and observes completion separately.
    // An exec() pipe harness waits for inherited descendant handles even after
    // the watchdog exits; reproduce the actual file-based contract instead.
    elevate: (command, options, callback) => {
      void (async () => {
        const match = command.match(/^powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "([^"]+)"$/);
        if (!match) return callback(new Error('Unexpected test watchdog command'));
        const directory = await fs.mkdtemp(path.join(temporaryRoot, 'watchdog-capture-'));
        const stdoutPath = path.join(directory, 'stdout.log');
        const stderrPath = path.join(directory, 'stderr.log');
        const handles = await Promise.all([fs.open(stdoutPath, 'w'), fs.open(stderrPath, 'w')]);
        let finished = false;
        let timer;
        const finish = async (error, code, signal) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          try {
            await Promise.all(handles.map(handle => handle.close().catch(() => {})));
            const [stdout, stderr] = await Promise.all([fs.readFile(stdoutPath, 'utf8'), fs.readFile(stderrPath, 'utf8')]);
            if (!error && (code !== 0 || signal)) error = Object.assign(new Error(stderr || 'Test watchdog failed'), { code, signal });
            callback(error, stdout, stderr);
          } catch (readError) { callback(readError); }
          finally {
            // Only the exact capture directory returned by mkdtemp is removed.
            // A restricted descendant may still hold a file; keep it if so.
            await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
          }
        };
        const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', match[1]], {
          windowsHide: true, stdio: ['ignore', handles[0].fd, handles[1].fd]
        });
        timer = setTimeout(() => child.kill(), 25000);
        child.once('error', error => void finish(error));
        child.once('exit', (code, signal) => void finish(null, code, signal));
      })().catch(callback);
    }
  });
}

test('Windows watchdog returns harmless command output from a path containing spaces', windows, async () => {
  const f = await runner();
  const result = await f.execElevated('echo FixMe watchdog sample', { timeoutMs: 12000 });
  assert.equal(result.stdout.trim(), 'FixMe watchdog sample');
  assert.equal(f.getExecutionState().active, false);
});

test('Windows watchdog preserves a failed native command exit code', windows, async () => {
  const f = await runner();
  await assert.rejects(f.execElevated('echo expected-test-error 1>&2\r\nexit /b 7', { timeoutMs: 12000 }),
    error => error.code === 7 && /expected-test-error/.test(error.message));
  assert.equal(f.getExecutionState().active, false);
});

test('Windows batch confirms native and PowerShell success, failure and Portuguese output', windows, async () => {
  const f = await runner();
  const results = await f.runElevatedPowerShellBatch([
    "Write-Output 'validação de ação'",
    "throw 'expected PowerShell failure'",
    "cmd /d /c 'exit 7'",
    "Write-Output 'after failure'"
  ], { timeoutMs: 12000 });
  assert.deepEqual(results.map(result => result.success), [true, false, false, true]);
  assert.equal(results[0].stdout, 'validação de ação');
  assert.match(results[1].error, /expected PowerShell failure/);
  assert.match(results[2].error, /7/);
  assert.equal(results[3].stdout, 'after failure');
  assert.equal(f.getExecutionState().active, false);
});

test('Windows stop-on-error batch skips subsequent harmless commands', windows, async () => {
  const f = await runner();
  const results = await f.runElevatedPowerShellBatch([
    "throw 'expected stop'", "Write-Output 'must not execute'"
  ], { timeoutMs: 12000, continueOnError: false });
  assert.equal(results.length, 1);
  assert.equal(results[0].success, false);
});

test('Windows watchdog bounds its own child or explicitly retains the lock when termination is denied', windows, async t => {
  const f = await runner();
  const startedAt = Date.now();
  let failure;
  try {
    await f.runElevatedPowerShellBatch(["Start-Sleep -Seconds 20"], {
      timeoutMs: 20000, commandTimeoutMs: 1000
    });
  } catch (error) { failure = error; }
  assert.ok(failure, 'The sleeping test command must time out');
  assert.ok(['ELEVATION_TIMEOUT', 'ELEVATION_BLOCKED'].includes(failure.code), failure.message);
  assert.ok(Date.now() - startedAt < 18000, 'The watchdog must report before its caller deadline');
  const blocked = failure.code === 'ELEVATION_BLOCKED';
  assert.equal(f.getExecutionState().active, blocked);
  t.diagnostic(blocked
    ? 'Own-child termination was unconfirmed in this environment; the execution lock correctly remains active.'
    : 'Own-child termination was confirmed; the execution lock was released.');
});
