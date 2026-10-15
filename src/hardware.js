const si = require('systeminformation');

function measuredPercent(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

// Every caller receives its own snapshot, including when the sample is cached.
function copyStats(stats) {
  return {
    ...stats,
    cpu: { ...stats.cpu, cores: [...stats.cpu.cores], history: [...stats.cpu.history] },
    memory: { ...stats.memory, history: [...stats.memory.history] },
    gpu: { ...stats.gpu, history: [...stats.gpu.history] },
    topCpuProcesses: stats.topCpuProcesses.map(process => ({ ...process })),
    topMemoryProcesses: stats.topMemoryProcesses.map(process => ({ ...process }))
  };
}

class HardwareMonitor {
  constructor({ cacheTtlMs = 1000 } = {}) {
    this.lastCpuLoad = 0;
    this.lastMemory = 0;
    this.lastGpuLoad = 0;
    this.history = {
      cpu: [],
      memory: [],
      gpu: []
    };
    this.maxHistoryLength = 30; // últimos 30 pontos de dados
    this._statsCache = null;
    this._statsCacheAt = 0;
    this._statsInFlight = null;
    this._statsCacheTtlMs = cacheTtlMs;

    try {
      const NativeTelemetry = require('./native-telemetry');
      this.native = new NativeTelemetry();
    } catch (_) {
      this.native = { getMetrics: async () => ({ gpu: null, cpu: null }), getCapabilities: () => ({ available: false, reason: 'load_failed' }) };
    }
  }

  getNativeCapabilities() {
    return this.native.getCapabilities();
  }

  addToHistory(type, value) {
    if (!this.history[type]) this.history[type] = [];
    this.history[type].push(value);
    if (this.history[type].length > this.maxHistoryLength) {
      this.history[type].shift();
    }
  }

  async getSystemInfo() {
    try {
      const [osInfo, cpu, memory, gpu, diskLayout] = await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.mem(),
        si.graphics().catch(() => ({ controllers: [] })),
        si.diskLayout().catch(() => [])
      ]);

      const gpuController = (gpu.controllers || []).find(controller => controller.model) || {};
      return {
        os: `${osInfo.platform} ${osInfo.release}`,
        cpuModel: cpu.brand,
        cpuCores: cpu.cores,
        totalMemory: (memory.total / (1024 ** 3)).toFixed(2), // GB
        gpuModel: gpuController.model || null,
        gpuVram: gpuController.memoryTotal ?? gpuController.vram ?? null // MB
      };
    } catch (err) {
      console.error('Erro ao obter info do sistema:', err);
      return null;
    }
  }

  getCachedHardwareStats(maxAgeMs = 10000) {
    if (!this._statsCache || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0 ||
        Date.now() - this._statsCacheAt >= maxAgeMs) return null;
    return copyStats(this._statsCache);
  }

  async getHardwareStats() {
    const cached = this.getCachedHardwareStats(this._statsCacheTtlMs);
    if (cached) return cached;
    if (!this._statsInFlight) {
      // Main-process IPC reads, optimization snapshots and monitoring all share
      // this collection. Keep it owned until every sensor has settled.
      const collection = this._collectHardwareStats();
      this._statsInFlight = collection;
      collection.then(stats => {
        if (!stats.error) {
          this._statsCache = stats;
          this._statsCacheAt = Date.now();
        }
      }).finally(() => {
        if (this._statsInFlight === collection) this._statsInFlight = null;
      });
    }
    return copyStats(await this._statsInFlight);
  }

  async _collectHardwareStats() {
    try {
      // Do not release the single-flight lock on the first rejected sensor:
      // another sensor (including native PDH) may still be collecting.
      const readings = await Promise.allSettled([
        () => si.currentLoad(),
        () => si.mem(),
        () => si.graphics(),
        () => si.processes(),
        () => this.native.getMetrics()
      ].map(read => Promise.resolve().then(read)));
      for (const index of [0, 1, 3]) {
        if (readings[index].status === 'rejected') throw readings[index].reason;
      }
      const [cpuLoad, memory, gpu, processes, native] = readings.map((reading, index) =>
        reading.status === 'fulfilled' ? reading.value : index === 2 ? { controllers: [] } : { gpu: null, cpu: null }
      );

      // VRAM allocation is not GPU utilization. Use an actual load sensor or
      // report an unavailable reading, preserving zero only for measured idle.
      const cpuPercent = native.cpu !== null && native.cpu !== undefined ? native.cpu : (cpuLoad.currentLoad || 0);
      const memPercent = memory.total ? (memory.used / memory.total) * 100 : 0;
      const nativeGpuPercent = measuredPercent(native.gpu);
      const controllerLoads = (gpu.controllers || [])
        .map(controller => measuredPercent(controller.utilizationGpu))
        .filter(value => value !== null);
      const sensorGpuPercent = controllerLoads.length ? Math.max(...controllerLoads) : null;
      const gpuPercent = nativeGpuPercent ?? sensorGpuPercent;
      const gpuSource = nativeGpuPercent !== null ? 'native' : sensorGpuPercent !== null ? 'systeminformation' : 'unavailable';

      // Armazena histórico para gráficos
      this.addToHistory('cpu', cpuPercent);
      this.addToHistory('memory', memPercent);
      this.addToHistory('gpu', gpuPercent);

      // Top 3 processos por CPU
      const procList = (processes && processes.list) || [];
      const topCpu = [...procList]
        .sort((a, b) => (b.cpu || b.pcpu || 0) - (a.cpu || a.pcpu || 0))
        .slice(0, 3)
        .map(p => ({
          name: p.name,
          pid: p.pid,
          cpu: (p.cpu || p.pcpu || 0).toFixed(2),
          memory: (p.mem || p.pmem || 0).toFixed(2)
        }));

      // Top 3 processos por memória
      const topMemory = [...procList]
        .sort((a, b) => (b.mem || b.pmem || 0) - (a.mem || a.pmem || 0))
        .slice(0, 3)
        .map(p => ({
          name: p.name,
          pid: p.pid,
          memory: (p.mem || p.pmem || 0).toFixed(2)
        }));

      return {
        timestamp: new Date().toISOString(),
        cpu: {
          current: cpuPercent.toFixed(2),
          cores: (cpuLoad.cores || []).map(c => (c.load || 0).toFixed(2)),
          history: this.history.cpu.slice()
        },
        memory: {
          current: memPercent.toFixed(2),
          used: (memory.used / (1024 ** 3)).toFixed(2), // GB
          total: (memory.total / (1024 ** 3)).toFixed(2),
          free: (memory.free / (1024 ** 3)).toFixed(2),
          history: this.history.memory.slice()
        },
        gpu: {
          current: gpuPercent === null ? null : gpuPercent.toFixed(2),
          available: gpuPercent !== null,
          source: gpuSource,
          history: this.history.gpu.slice()
        },
        topCpuProcesses: topCpu,
        topMemoryProcesses: topMemory,
        processCount: procList.length
      };
    } catch (err) {
      console.error('Erro ao obter stats:', err);
      // Return safe defaults instead of throwing — prevents main-process crash
      return {
        timestamp: new Date().toISOString(),
        cpu:    { current: null, available: false, cores: [], history: [] },
        memory: { current: null, available: false, used: null, total: null, free: null, history: [] },
        gpu:    { current: null, available: false, source: 'unavailable', history: [] },
        topCpuProcesses: [],
        topMemoryProcesses: [],
        processCount: null,
        error: String(err)
      };
    }
  }
}

module.exports = HardwareMonitor;
