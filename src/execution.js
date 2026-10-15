const childProcess = require('child_process');
const sudo = require('sudo-prompt');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const BATCH_MARKER = 'FIXME_BATCH_RESULT:';
const TIMEOUT_MARKER = 'FIXME_COMMAND_TIMEOUT';
const UNKNOWN_MARKER = 'FIXME_TERMINATION_UNCONFIRMED';

function executionError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  error.fatal = true;
  if (cause) error.cause = cause;
  return error;
}

function positiveTimeout(value, fallback) {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value < 1 || value > 600000) throw new Error('Tempo limite de execução inválido');
  return Math.floor(value);
}

function psLiteral(value) { return "'" + value.replace(/'/g, "''") + "'"; }

// sudo-prompt exposes no child handle. A watchdog running at the same privilege
// level bounds the command tree; the caller deadline also covers unanswered UAC.
function buildWatchdog(directory, deadline, commandTimeoutMs) {
  const commandPath = path.join(directory, 'command.cmd');
  const stdoutPath = path.join(directory, 'stdout.log');
  const stderrPath = path.join(directory, 'stderr.log');
  return `$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$exitCode = 1
$commandProcess = $null
try {
  $remaining = ${deadline} - [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  if ($remaining -le 0) { [Console]::Error.WriteLine('${TIMEOUT_MARKER}'); exit 124 }
  $duration = [int][Math]::Min(${commandTimeoutMs}, $remaining)
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $env:ComSpec
  $startInfo.Arguments = '/d /s /c ""' + ${psLiteral(commandPath)} + '" 1>"' + ${psLiteral(stdoutPath)} + '" 2>"' + ${psLiteral(stderrPath)} + '""'
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  # Private handles prevent an unresponsive descendant from keeping the
  # watchdog caller's stdout/stderr pipes open after it reports a timeout.
  # Command output itself goes to files, so these pipes cannot fill normally.
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  # cmd.exe writes directly to files. Start-Process's redirected stream reader
  # can wait for descendants before returning, defeating WaitForExit(timeout).
  $commandProcess = [System.Diagnostics.Process]::Start($startInfo)
  if (-not $commandProcess.WaitForExit($duration)) {
    [Console]::Error.WriteLine('${TIMEOUT_MARKER}')
    $killInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $killInfo.FileName = "$env:SystemRoot\\System32\\taskkill.exe"
    $killInfo.Arguments = "/PID $($commandProcess.Id) /T /F"
    $killInfo.UseShellExecute = $false
    $killInfo.CreateNoWindow = $true
    $killInfo.RedirectStandardOutput = $true
    $killInfo.RedirectStandardError = $true
    $killer = [System.Diagnostics.Process]::Start($killInfo)
    $killerFinished = $killer.WaitForExit(5000)
    if (-not $killerFinished) {
      # Do not leave a delayed taskkill request targeting a PID that could be reused.
      try { $killer.Kill(); $null = $killer.WaitForExit(1000) } catch {}
    }
    $commandFinished = $commandProcess.WaitForExit(5000)
    if (-not $killerFinished -or $killer.ExitCode -ne 0 -or -not $commandFinished) {
      [Console]::Error.WriteLine('${UNKNOWN_MARKER}')
    }
    $exitCode = 124
  } else { $exitCode = $commandProcess.ExitCode }
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  if ($null -ne $commandProcess -and -not $commandProcess.HasExited) {
    [Console]::Error.WriteLine('${UNKNOWN_MARKER}')
  }
} finally {
  foreach ($stream in @(@(${psLiteral(stdoutPath)}, $false), @(${psLiteral(stderrPath)}, $true))) {
    if (Test-Path -LiteralPath $stream[0]) {
      $reader = [System.IO.StreamReader]::new($stream[0])
      try {
        $buffer = New-Object char[] 1048576
        $count = $reader.ReadBlock($buffer, 0, $buffer.Length)
        $text = [string]::new($buffer, 0, $count)
        if ($stream[1]) { [Console]::Error.Write($text) } else { [Console]::Out.Write($text) }
        if ($reader.Peek() -ne -1) { [Console]::Error.WriteLine('FIXME_OUTPUT_LIMIT'); $exitCode = 126 }
      } finally { $reader.Dispose() }
    }
  }
}
exit $exitCode
`;
}

function buildBatchScript(commands, continueOnError) {
  const steps = commands.map((command, index) => `
if (-not $stopBatch) {
  try {
    $global:LASTEXITCODE = 0
    $output = @(& {
${command}
      if ($LASTEXITCODE -ne 0) { throw "Comando terminou com código $LASTEXITCODE" }
    } 2>&1 | Out-String).Trim()
    $results.Add([pscustomobject]@{ step = ${index + 1}; success = $true; stdout = $output })
  } catch {
    $results.Add([pscustomobject]@{ step = ${index + 1}; success = $false; error = $_.Exception.Message })
    ${continueOnError ? '' : '$stopBatch = $true'}
  }
}`).join('\n');
  return `$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$results = [System.Collections.Generic.List[object]]::new()
$stopBatch = $false
${steps}
[Console]::WriteLine('${BATCH_MARKER}' + (ConvertTo-Json -InputObject @($results.ToArray()) -Compress -Depth 5))
`;
}

function createExecutionRunner(dependencies = {}) {
  const exec = dependencies.exec || childProcess.exec;
  const elevate = dependencies.elevate || sudo.exec;
  const fileSystem = dependencies.fs || fs;
  const now = dependencies.now || Date.now;
  const schedule = dependencies.schedule || setTimeout;
  const cancel = dependencies.cancel || clearTimeout;
  const temporaryRoot = dependencies.temporaryRoot || os.tmpdir();
  let active = null;
  const subscribers = new Set();

  function getExecutionState() {
    return active
      ? { active: true, timedOut: active.timedOut, startedAt: active.startedAt }
      : { active: false, timedOut: false, startedAt: null };
  }

  function notifyState() {
    const state = getExecutionState();
    for (const subscriber of subscribers) {
      try { subscriber(state); } catch (_) { /* Observers cannot break cleanup. */ }
    }
  }

  function subscribeExecutionState(subscriber) {
    if (typeof subscriber !== 'function') throw new TypeError('Observador de execução inválido');
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  }

  function execCommand(command, options = {}) {
    const timeout = positiveTimeout(options.timeoutMs, 10000);
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = schedule(() => {
        if (settled) return;
        settled = true;
        reject(executionError('COMMAND_TIMEOUT', 'A consulta do Windows excedeu o tempo limite.'));
      }, timeout);
      const finish = (error, stdout, stderr) => {
        if (settled) return;
        settled = true;
        cancel(timer);
        if (error) {
          if (error.killed || error.code === 'ETIMEDOUT') {
            return reject(executionError('COMMAND_TIMEOUT', 'A consulta do Windows excedeu o tempo limite.', error));
          }
          return reject(error);
        }
        resolve({ stdout: stdout || '', stderr: stderr || '' });
      };
      // Queries only. Node bounds its child; our timer also handles a callback
      // delayed by an inherited output handle in a descendant process.
      try { exec(command, { timeout, windowsHide: true, maxBuffer: 1024 * 1024 }, finish); }
      catch (error) { finish(error); }
    });
  }

  function execElevated(command, options = {}) {
    if (typeof command !== 'string' || !command.trim()) return Promise.reject(new Error('Comando inválido'));
    if (active) {
      return Promise.reject(executionError(active.timedOut ? 'ELEVATION_BLOCKED' : 'ELEVATION_BUSY',
        active.timedOut
          ? 'A execução anterior ainda não confirmou o encerramento. Feche ou responda à solicitação do Windows antes de tentar novamente.'
          : 'Já existe um ajuste do Windows em execução. Aguarde a conclusão.'));
    }
    let timeoutMs, commandTimeoutMs;
    try {
      timeoutMs = positiveTimeout(options.timeoutMs, 120000);
      commandTimeoutMs = positiveTimeout(options.commandTimeoutMs, 60000);
    } catch (error) { return Promise.reject(error); }
    const request = { startedAt: now(), timedOut: false, directory: null, timer: null, settled: false };
    active = request;
    notifyState();

    return new Promise((resolve, reject) => {
      const settle = (error, result) => {
        if (request.settled) return;
        request.settled = true;
        if (error) reject(error); else resolve(result);
      };
      const cleanup = async () => {
        if (request.directory) {
          // This exact path is returned by mkdtemp for this request.
          try { await fileSystem.rm(request.directory, { recursive: true, force: true }); } catch (_) { /* Best effort. */ }
        }
      };
      const finish = (error, stdout = '', stderr = '') => {
        cancel(request.timer);
        if (String(stderr).includes(UNKNOWN_MARKER)) {
          request.timedOut = true;
          notifyState();
          settle(executionError('ELEVATION_BLOCKED', 'O Windows não confirmou o encerramento do ajuste. Verifique a tarefa no Gerenciador de Tarefas antes de reiniciar o FixMe.', error));
          return; // Keep the lock and files while a child may still be alive.
        }
        if (active === request) active = null;
        void cleanup();
        notifyState();
        if (String(stderr).includes(TIMEOUT_MARKER) || error?.code === 124) {
          settle(executionError('ELEVATION_TIMEOUT', 'O ajuste excedeu o tempo limite e foi interrompido. Algumas etapas podem ter sido aplicadas.', error));
        } else if (error) {
          if (/did not grant permission|cancel(?:led|ed)|denied|1223|negad|cancelad/i.test(error.message || '')) {
            settle(executionError('ELEVATION_CANCELLED', 'A autorização do Windows foi cancelada ou negada.', error));
          } else settle(error);
        } else settle(null, { stdout: stdout || '', stderr: stderr || '' });
      };

      request.timer = schedule(() => {
        request.timedOut = true;
        notifyState();
        settle(executionError('ELEVATION_TIMEOUT', 'A autorização ou o ajuste do Windows excedeu o tempo limite. A execução permanece bloqueada até o Windows confirmar o encerramento.'));
        // sudo-prompt cannot cancel an unanswered UAC. Only its callback can
        // confirm completion and release this lock after the caller deadline.
      }, timeoutMs);

      void (async () => {
        try {
          request.directory = await fileSystem.mkdtemp(path.join(temporaryRoot, 'fixme-exec-'));
          if (/["\r\n%]/.test(request.directory)) throw new Error('Caminho temporário inválido');
          let nativeCommand = command;
          const encodedMatch = command.match(/^powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ([A-Za-z0-9+/=]+)$/);
          if (encodedMatch) {
            const scriptPath = path.join(request.directory, 'command.ps1');
            await fileSystem.writeFile(scriptPath, '\ufeff' + Buffer.from(encodedMatch[1], 'base64').toString('utf16le'), { encoding: 'utf8', mode: 0o600 });
            nativeCommand = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`;
          }
          await fileSystem.writeFile(path.join(request.directory, 'command.cmd'), '@echo off\r\n' + nativeCommand + '\r\n', { encoding: 'utf8', mode: 0o600 });
          await fileSystem.writeFile(path.join(request.directory, 'watchdog.ps1'), '\ufeff' + buildWatchdog(request.directory, request.startedAt + timeoutMs, commandTimeoutMs), { encoding: 'utf8', mode: 0o600 });
          if (request.timedOut) return finish(executionError('ELEVATION_TIMEOUT', 'O ajuste excedeu o tempo limite antes de iniciar.'));
          const watchdogPath = path.join(request.directory, 'watchdog.ps1');
          elevate(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${watchdogPath}"`, { name: 'FixMe' }, finish);
        } catch (error) { finish(error); }
      })();
    });
  }

  async function runElevatedPowerShellBatch(commands, options = {}) {
    if (!Array.isArray(commands) || commands.some(command => typeof command !== 'string' || !command.trim())) throw new Error('Lista de comandos inválida');
    if (commands.length === 0) return [];
    const script = buildBatchScript(commands, options.continueOnError !== false);
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const result = await execElevated(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, options);
    const marker = result.stdout.lastIndexOf(BATCH_MARKER);
    let parsed;
    try {
      if (marker < 0) throw new Error('Missing result');
      parsed = JSON.parse(result.stdout.slice(marker + BATCH_MARKER.length).trim());
      if (!Array.isArray(parsed) || parsed.length > commands.length || parsed.some((item, index) =>
        item?.step !== index + 1 || typeof item.success !== 'boolean' ||
        (item.success ? typeof item.stdout !== 'string' : typeof item.error !== 'string')) ||
        (options.continueOnError !== false && parsed.length !== commands.length) ||
        (options.continueOnError === false && parsed.length !== commands.length && parsed.at(-1)?.success !== false)) throw new Error('Invalid result');
    } catch (error) {
      throw executionError('ELEVATION_RESULT_INVALID', 'O Windows não retornou a confirmação das etapas aplicadas.', error);
    }
    return parsed;
  }

  return { execCommand, execElevated, runElevatedPowerShellBatch, getExecutionState, subscribeExecutionState };
}

function isFatalExecutionError(error) {
  return error?.fatal === true || /^ELEVATION_(?:TIMEOUT|CANCELLED|BLOCKED|BUSY|RESULT_INVALID)$/.test(error?.code || '');
}

module.exports = { ...createExecutionRunner(), createExecutionRunner, isFatalExecutionError };
