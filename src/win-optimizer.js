/**
 * win-optimizer.js
 * Deep Windows system optimization: policies, services, registry, visual effects,
 * network stack, scheduler, and targeted process management.
 * All privileged operations go through execElevated (UAC prompt).
 */

const { exec } = require('child_process');
const { execElevated, clearStandbyList, runElevatedPowerShellBatch, isFatalExecutionError } = require('./optimizations');
const { normalizeProcessName, encodedPowerShell } = require('./process-command');

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

function ps(command) {
  return new Promise((resolve, reject) => {
    const full = encodedPowerShell(command);
    exec(full, { timeout: 10000, windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

function psElevated(command) {
  return execElevated(encodedPowerShell(`$ErrorActionPreference = 'Stop';\n${command}`));
}

function reg(args) {
  return execElevated(`reg ${args}`);
}

async function runElevatedCommands(commands) {
  const results = await runElevatedPowerShellBatch(commands, { continueOnError: true });
  return results.filter(result => !result.success).map(result => ({ step: result.step, error: result.error, code: result.code }));
}

// ─────────────────────────────────────────────
// 1. VISUAL EFFECTS — disable animations for snappier UI
// ─────────────────────────────────────────────

async function optimizeVisualEffects() {
  // SystemParametersInfo flags for best performance
  const cmd = `
    Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 2 -Force
    $path = "HKCU:\\Control Panel\\Desktop"
    Set-ItemProperty -Path $path -Name "UserPreferencesMask" -Value ([byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00)) -Force
    Set-ItemProperty -Path $path -Name "MenuShowDelay" -Value "0" -Force
    Set-ItemProperty -Path $path -Name "DragFullWindows" -Value "0" -Force
    Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\DWM" -Name "EnableAeroPeek" -Value 0 -Force
    Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "TaskbarAnimations" -Value 0 -Force
    Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "ListviewAlphaSelect" -Value 0 -Force
    Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "ListviewShadow" -Value 0 -Force
  `;
  await psElevated(cmd);
  return { applied: 'visual_effects', detail: 'Animations, shadows and peek disabled' };
}

// ─────────────────────────────────────────────
// 2. UNNECESSARY SERVICES — stop and disable bloat services
// ─────────────────────────────────────────────

const BLOAT_SERVICES = [
  'DiagTrack',            // Connected User Experiences and Telemetry
  'dmwappushservice',     // WAP Push Message Routing Service
  'WSearch',              // Windows Search indexer (high disk I/O)
  'SysMain',              // Superfetch — conflicts with SSDs
  'RetailDemo',           // Retail Demo Service
  'MapsBroker',           // Downloaded Maps Manager
  'PhoneSvc',             // Phone Service
  'TabletInputService',   // Touch Keyboard and Handwriting
  'WMPNetworkSvc',        // Windows Media Player Network
  'XblAuthManager',       // Xbox Live Auth Manager
  'XblGameSave',          // Xbox Live Game Save
  'XboxNetApiSvc',        // Xbox Live Networking
  'xbgm',                 // Xbox Game Monitoring
  'WerSvc',               // Windows Error Reporting
  'Fax',                  // Fax Service
  'lfsvc',                // Geolocation Service
  'wisvc',                // Windows Insider Service
];

const SAFE_TO_STOP_SERVICES = [
  'DiagTrack', 'dmwappushservice', 'RetailDemo', 'MapsBroker',
  'PhoneSvc', 'TabletInputService', 'WMPNetworkSvc',
  'XblAuthManager', 'XblGameSave', 'XboxNetApiSvc', 'xbgm',
  'WerSvc', 'Fax', 'lfsvc', 'wisvc',
];

async function disableBloatServices() {
  // Keep Windows Search and SysMain intact. One elevation handles this group.
  const commands = SAFE_TO_STOP_SERVICES.map(svc =>
    `$s = $null; try { $s = Get-Service -Name '${svc}' -ErrorAction Stop } ` +
    `catch { if ($_.FullyQualifiedErrorId -notlike 'NoServiceFoundForGivenName*') { throw } }; ` +
    `if ($null -eq $s) { Write-Output 'not_installed' } else { ` +
    `Set-Service -Name '${svc}' -StartupType Disabled -ErrorAction Stop; ` +
    `if ($s.Status -ne 'Stopped') { Stop-Service -Name '${svc}' -Force -ErrorAction Stop }; Write-Output 'disabled' }`
  );
  const batch = await runElevatedPowerShellBatch(commands, { continueOnError: true });
  const results = batch.map((result, index) => {
    const status = String(result.stdout || '').trim().split(/\r?\n/).at(-1);
    return result.success && ['disabled', 'not_installed'].includes(status)
      ? { service: SAFE_TO_STOP_SERVICES[index], status }
      : { service: SAFE_TO_STOP_SERVICES[index], status: 'failed', error: result.error || 'Não foi possível confirmar o estado do serviço' };
  });
  return { applied: 'bloat_services', success: results.every(result => result.status !== 'failed'), results };
}

async function disableTelemetry() {
  const cmds = [
    // Disable telemetry data collection level
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" -Name "AllowTelemetry" -Value 0 -Force`,
    // Disable Customer Experience Improvement Program
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows" -Name "CEIPEnable" -Value 0 -Force`,
    // Disable advertising ID
    `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" -Name "Enabled" -Value 0 -Force`,
    // Disable app diagnostics
    `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy" -Name "TailoredExperiencesWithDiagnosticDataEnabled" -Value 0 -Force`,
    // Disable activity history
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" -Name "EnableActivityFeed" -Value 0 -Force`,
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" -Name "PublishUserActivities" -Value 0 -Force`,
    // Disable scheduled telemetry tasks
    `Disable-ScheduledTask -TaskName "Microsoft Compatibility Appraiser" -TaskPath "\\Microsoft\\Windows\\Application Experience\\" -ErrorAction SilentlyContinue`,
    `Disable-ScheduledTask -TaskName "ProgramDataUpdater" -TaskPath "\\Microsoft\\Windows\\Application Experience\\" -ErrorAction SilentlyContinue`,
    `Disable-ScheduledTask -TaskName "Consolidator" -TaskPath "\\Microsoft\\Windows\\Customer Experience Improvement Program\\" -ErrorAction SilentlyContinue`,
  ];
  const errors = await runElevatedCommands(cmds);
  return { applied: 'telemetry', success: errors.length === 0, errors, detail: 'Telemetry, CEIP and activity history disabled' };
}

// ─────────────────────────────────────────────
// 3. POWER PLAN — Ultimate Performance (create if missing)
// ─────────────────────────────────────────────

async function applyUltimatePerformance() {
  // Try to activate built-in Ultimate Performance GUID first
  const ultimateGuid = 'e9a42b02-d5df-448d-aa00-03f14749eb61';
  const highGuid     = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';

  try {
    await execElevated(`powercfg -setactive ${ultimateGuid}`);
    return { applied: 'power_ultimate', guid: ultimateGuid };
  } catch (error) {
    if (isFatalExecutionError(error)) throw error;
    // Try the existing High Performance plan without forcing idle CPU clocks.
    await execElevated(`powercfg -setactive ${highGuid}`);
    return { applied: 'power_high', guid: highGuid };
  }
}

// ─────────────────────────────────────────────
// 4. NETWORK STACK OPTIMIZATIONS
// ─────────────────────────────────────────────

async function optimizeNetwork() {
  const cmds = [
    // Disable Nagle algorithm (reduces latency for games)
    `$adapters = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces"
     foreach ($a in $adapters) {
       Set-ItemProperty -Path $a.PSPath -Name "TcpAckFrequency" -Value 1 -Force -ErrorAction SilentlyContinue
       Set-ItemProperty -Path $a.PSPath -Name "TCPNoDelay" -Value 1 -Force -ErrorAction SilentlyContinue
     }`,
    // Network throttling index — disable throttling for real-time apps
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NetworkThrottlingIndex" -Value 0xFFFFFFFF -Force`,
    // Increase system responsiveness for games
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "SystemResponsiveness" -Value 0 -Force`,
    // Disable auto-tuning (can hurt on some setups — safe to revert)
    `netsh int tcp set global autotuninglevel=normal`,
    // Enable RSS (Receive Side Scaling)
    `netsh int tcp set global rss=enabled`,
    // Enable Chimney offload
    `netsh int tcp set global chimney=enabled`,
    // Disable network adapter power management
    `Get-NetAdapter | Set-NetAdapterPowerManagement -WakeOnMagicPacket Disabled -ErrorAction SilentlyContinue`,
  ];

  const errors = await runElevatedCommands(cmds);
  return { applied: 'network', success: errors.length === 0, errors };
}

// ─────────────────────────────────────────────
// 5. SCHEDULER & TIMER RESOLUTION
// ─────────────────────────────────────────────

async function optimizeScheduler() {
  const cmds = [
    // Prioritise games in the multimedia class scheduler
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" -Name "Affinity" -Value 0 -Force`,
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" -Name "Background Only" -Value "False" -Force`,
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" -Name "Clock Rate" -Value 10000 -Force`,
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" -Name "GPU Priority" -Value 8 -Force`,
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" -Name "Priority" -Value 6 -Force`,
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" -Name "Scheduling Category" -Value "High" -Force`,
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" -Name "SFIO Priority" -Value "High" -Force`,
    // Disable HPET if present (use TSC/ACPI instead — lower latency)
    `bcdedit /set useplatformclock false`,
    `bcdedit /set disabledynamictick yes`,
  ];
  const errors = await runElevatedCommands(cmds);
  return { applied: 'scheduler', success: errors.length === 0, errors, detail: 'MMCSS game profile and timer resolution optimised' };
}

// ─────────────────────────────────────────────
// 6. REGISTRY POLICIES — remove performance-hurting policies
// ─────────────────────────────────────────────

async function removeJunkPolicies() {
  // Policies that exist by default and slow things down
  const removals = [
    `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" -Name "NoAutoUpdate" -ErrorAction SilentlyContinue`,
    // Remove startup delay
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" -Name "StartupDelayInMSec" -Value 0 -Force`,
    // Disable boot animation (faster POST→desktop)
    `bcdedit /set quietboot yes`,
    // Disable automatic maintenance during gaming sessions
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" -Name "MaintenanceDisabled" -Value 1 -Force`,
    // Disable prefetch for SSDs (unnecessary on NVMe)
    `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" -Name "EnablePrefetcher" -Value 0 -Force`,
    `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" -Name "EnableSuperfetch" -Value 0 -Force`,
    // Disable Windows tips and suggestions
    `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" -Name "DisableSoftLanding" -Value 1 -Force`,
    `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" -Name "SubscribedContent-338389Enabled" -Value 0 -Force`,
    // Large system cache (kernel mode) — benefit servers, hurt games
    `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "LargeSystemCache" -Value 0 -Force`,
    // Faster shutdown
    `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control" -Name "WaitToKillServiceTimeout" -Value "2000" -Force`,
    `Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "WaitToKillAppTimeout" -Value "2000" -Force`,
    `Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "HungAppTimeout" -Value "1000" -Force`,
  ];
  const errors = await runElevatedCommands(removals);
  return { applied: 'registry_policies', success: errors.length === 0, errors, detail: 'Startup delay, prefetch, maintenance and tips policies removed' };
}

// ─────────────────────────────────────────────
// 7. BACKGROUND PROCESS KILL — safe list of non-critical processes
// ─────────────────────────────────────────────

const BACKGROUND_KILL_LIST = [
  // Common resource hogs that aren't needed during gaming
  { name: 'OneDrive',         exe: 'OneDrive.exe',        reason: 'Cloud sync background activity' },
  { name: 'Teams',            exe: 'Teams.exe',           reason: 'High CPU/RAM background updates' },
  { name: 'Discord',          exe: 'Discord.exe',         reason: 'Optional — overlay & updates' },
  { name: 'Spotify',          exe: 'Spotify.exe',         reason: 'CPU/RAM when minimised' },
  { name: 'Cortana',          exe: 'SearchUI.exe',        reason: 'Search indexing CPU spikes' },
  { name: 'GameBar',          exe: 'GameBarPresenceWriter.exe', reason: 'Xbox overlay overhead' },
  { name: 'Xbox Identity',    exe: 'XboxIdpApp.exe',      reason: 'Xbox background service' },
  { name: 'Edge Updater',     exe: 'MicrosoftEdgeUpdate.exe', reason: 'Background update checks' },
  { name: 'Chrome Helper',    exe: 'chrome.exe',          reason: 'Only if not in use' },
  { name: 'Adobe Updater',    exe: 'AdobeUpdateService.exe', reason: 'Silent update daemon' },
  { name: 'CCleaner',         exe: 'CCleaner64.exe',      reason: 'Monitoring daemon' },
  { name: 'EpicGames Helper', exe: 'EpicWebHelper.exe',   reason: 'Background web helper' },
  { name: 'Steam WebHelper',  exe: 'steamwebhelper.exe',  reason: 'Steam browser engine' },
];

async function killBackgroundProcesses(targets) {
  // An empty batch means the currently running optional apps, never arbitrary
  // process names supplied by the renderer.
  const toKill = Array.isArray(targets) && targets.length > 0
    ? targets
    : (await getRunningKillCandidates()).map(p => p.exe);

  const results = [];
  for (const exe of toKill) {
    try {
      const result = await killBackgroundProcess(exe);
      results.push({ exe: result.exe, status: 'killed' });
    } catch (err) {
      if (isFatalExecutionError(err)) throw err;
      results.push({ exe, status: 'failed', error: err.message });
    }
  }
  return { applied: 'kill_background', success: results.every(r => r.status === 'killed'), results };
}

async function killBackgroundProcess(processName) {
  const name = normalizeProcessName(processName);
  const candidate = BACKGROUND_KILL_LIST.find(p => p.exe.toLowerCase() === `${name}.exe`.toLowerCase());
  if (!candidate) throw new Error('Este processo não está na lista de aplicativos opcionais que podem ser encerrados');
  // -ErrorAction Stop makes a missing process or a denied operation a failure,
  // rather than reporting a successful termination without changing anything.
  await psElevated(`$processes = @(Get-Process -Name '${name}' -ErrorAction Stop); ` +
    `$processes | Stop-Process -Force -ErrorAction Stop`);
  return { applied: 'kill_process', exe: candidate.exe, status: 'killed' };
}

async function getRunningKillCandidates() {
  const names = BACKGROUND_KILL_LIST.map(p => p.exe.replace('.exe', '')).join("','");
  try {
    // Enumerating once avoids missing-name errors while preserving actual query
    // failures. ConvertTo-Json -InputObject emits [] for a successful empty scan.
    const out = await ps(`$ErrorActionPreference = 'Stop'; $names = @('${names}'); ` +
      `$running = @(Get-Process -ErrorAction Stop | Where-Object { $_.ProcessName -in $names } | ` +
      `Select-Object -ExpandProperty ProcessName | Sort-Object -Unique); ` +
      `ConvertTo-Json -InputObject $running -Compress`);
    const running = JSON.parse(out);
    const arr = Array.isArray(running) ? running : [running];
    return arr.map(n => {
      if (typeof n !== 'string') throw new Error('Resposta inválida ao consultar processos');
      const entry = BACKGROUND_KILL_LIST.find(p => p.exe.replace('.exe', '').toLowerCase() === n.toLowerCase());
      if (!entry) throw new Error('Resposta inválida ao consultar processos');
      return { name: entry.name, exe: entry.exe, reason: entry.reason };
    });
  } catch (err) {
    throw new Error(`Não foi possível consultar os aplicativos em execução: ${err.message}`);
  }
}

// ─────────────────────────────────────────────
// 8. GPU OPTIMIZATIONS
// ─────────────────────────────────────────────

async function optimizeGPU() {
  const cmds = [
    // Hardware-accelerated GPU scheduling (Windows 10 2004+)
    `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "HwSchMode" -Value 2 -Force`,
    // Disable NVIDIA power management throttling (via registry — NVIDIA only)
    `$nvidiaPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Video"
     Get-ChildItem -Path $nvidiaPath -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.GetValue("Device Description") -like "*NVIDIA*" } | ForEach-Object {
       Set-ItemProperty -Path $_.PSPath -Name "PowerMizerEnable" -Value 0 -Force -ErrorAction SilentlyContinue
       Set-ItemProperty -Path $_.PSPath -Name "PowerMizerLevel" -Value 1 -Force -ErrorAction SilentlyContinue
     }`,
    // Disable fullscreen optimisations globally (reduces input lag)
    `Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_Enabled" -Value 0 -Force`,
    `Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_FSEBehaviorMode" -Value 2 -Force`,
    `Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_HonorUserFSEBehaviorMode" -Value 1 -Force`,
    `Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_DXGIHonorFSEWindowsCompatible" -Value 1 -Force`,
    // Enable Game Mode
    `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AllowAutoGameMode" -Value 1 -Force`,
    `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AutoGameModeEnabled" -Value 1 -Force`,
  ];
  const errors = await runElevatedCommands(cmds);
  return { applied: 'gpu', success: errors.length === 0, errors, detail: 'HAGS, Game Mode, GameDVR and power throttling configured' };
}

// ─────────────────────────────────────────────
// 9. MEMORY MANAGEMENT
// ─────────────────────────────────────────────

async function optimizeMemory() {
  // Never trim every process or disable Windows memory compression.
  const result = await clearStandbyList();
  return { applied: 'memory', success: true, detail: 'Somente a lista de memória em espera foi limpa', result };
}

// ─────────────────────────────────────────────
// 10. GAME-SPECIFIC PROCESS BOOST
// ─────────────────────────────────────────────

async function boostGameProcess(processName) {
  const safe = normalizeProcessName(processName);

  const cmd = `
    $proc = Get-Process -Name '${safe}' -ErrorAction Stop
    if ($proc) {
      $proc | ForEach-Object {
        $_.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High
        # Pin to performance cores (cores 0-N/2) if hyperthreading detected
        $coreCount = (Get-WmiObject -Class Win32_Processor).NumberOfCores
        if ($coreCount -gt 4) {
          $mask = [Math]::Pow(2, [Math]::Floor($coreCount / 2)) - 1
          $_.ProcessorAffinity = [IntPtr][long]$mask
        }
      }
      Write-Output "boosted:$($proc.Count)"
    } else { Write-Output "not_found" }
  `;
  const result = await psElevated(cmd);
  return { applied: 'game_boost', process: safe, result: result.stdout || result };
}

// ─────────────────────────────────────────────
// 11. FULL OPTIMIZATION BUNDLE
// ─────────────────────────────────────────────

async function runFullOptimization(options = {}, onProgress = () => {}) {
  const {
    visualEffects = true, power = true,
    services = false, telemetry = false, network = false, scheduler = false,
    policies = false, gpu = false, memory = false, killProcesses = false
  } = options;
  const steps = [
    [visualEffects, 'visual_effects', optimizeVisualEffects],
    [power, 'power', applyUltimatePerformance],
    [services, 'services', disableBloatServices],
    [telemetry, 'telemetry', disableTelemetry],
    [network, 'network', optimizeNetwork],
    [scheduler, 'scheduler', optimizeScheduler],
    [policies, 'policies', removeJunkPolicies],
    [gpu, 'gpu', optimizeGPU],
    [memory, 'memory', optimizeMemory],
    [killProcesses, 'kill_bg', () => killBackgroundProcesses([])]
  ].filter(([enabled]) => enabled === true);
  const results = [], errors = [];
  let fatalCode;
  for (const [index, [, name, execute]] of steps.entries()) {
    onProgress({ phase: 'executing', step: index, total: steps.length, label: name });
    try {
      const result = await execute();
      results.push(result);
      if (result.success === false) errors.push({ step: name, error: 'Uma ou mais etapas não puderam ser concluídas' });
    } catch (error) {
      errors.push({ step: name, error: error.message, code: error.code });
      if (isFatalExecutionError(error)) { fatalCode = error.code; break; }
    }
    onProgress({ phase: 'executing', step: index + 1, total: steps.length, label: name });
  }
  const completed = results.filter(result => result.success !== false).map(result => result.applied);
  return { success: errors.length === 0, code: fatalCode, applied: completed, completed, results, errors, timestamp: new Date().toISOString() };
}

// ─────────────────────────────────────────────
// 12. REVERT HELPERS (safety net)
// ─────────────────────────────────────────────

async function revertVisualEffects() {
  await psElevated(`Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 0 -Force`);
  return { reverted: 'visual_effects' };
}

async function revertPowerPlan() {
  // Restore Balanced plan
  await execElevated('powercfg -setactive 381b4222-f694-41f0-9685-ff5bb260df2e');
  return { reverted: 'power_plan' };
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

module.exports = {
  // Individual optimizations
  optimizeVisualEffects,
  disableBloatServices,
  disableTelemetry,
  applyUltimatePerformance,
  optimizeNetwork,
  optimizeScheduler,
  removeJunkPolicies,
  optimizeGPU,
  optimizeMemory,
  killBackgroundProcesses,
  killBackgroundProcess,
  getRunningKillCandidates,
  boostGameProcess,

  // Bundles
  runFullOptimization,

  // Revert
  revertVisualEffects,
  revertPowerPlan,

  // Metadata
  BLOAT_SERVICES,
  BACKGROUND_KILL_LIST,
};
