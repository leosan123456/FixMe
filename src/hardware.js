const si = require('systeminformation');

class HardwareMonitor {
  constructor() {
    this.lastCpuLoad = 0;
    this.lastMemory = 0;
    this.lastGpuLoad = 0;
    this.history = {
      cpu: [],
      memory: [],
      gpu: []
    };
    this.maxHistoryLength = 30; // últimos 30 pontos de dados

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

      return {
        os: `${osInfo.platform} ${osInfo.release}`,
        cpuModel: cpu.brand,
        cpuCores: cpu.cores,
        totalMemory: (memory.total / (1024 ** 3)).toFixed(2) // GB
      };
    } catch (err) {
      console.error('Erro ao obter info do sistema:', err);
      return null;
    }
  }

  async getHardwareStats() {
    try {
      const [cpuLoad, memory, gpu, processes, native] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.graphics().catch(() => ({ controllers: [] })),
        si.processes(),
        this.native.getMetrics().catch(() => ({ gpu: null, cpu: null }))
      ]);

      // Prefer real PDH-based readings (native.js, via koffi) when available.
      // Fallback: CPU from systeminformation's currentLoad; GPU from the VRAM
      // usage ratio, which is a proxy for load, not real GPU utilization.
      const cpuPercent = native.cpu !== null && native.cpu !== undefined ? native.cpu : (cpuLoad.currentLoad || 0);
      const memPercent = memory.total ? (memory.used / memory.total) * 100 : 0;
      const vramGpuPercent = gpu.controllers && gpu.controllers[0] && gpu.controllers[0].memoryTotal
        ? gpu.controllers[0].memoryUsed / gpu.controllers[0].memoryTotal * 100
        : 0;
      const gpuPercent = native.gpu !== null && native.gpu !== undefined ? native.gpu : vramGpuPercent;

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
          history: this.history.cpu
        },
        memory: {
          current: memPercent.toFixed(2),
          used: (memory.used / (1024 ** 3)).toFixed(2), // GB
          total: (memory.total / (1024 ** 3)).toFixed(2),
          free: (memory.free / (1024 ** 3)).toFixed(2),
          history: this.history.memory
        },
        gpu: {
          current: gpuPercent.toFixed(2),
          history: this.history.gpu
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
        cpu:    { current: 0, cores: [], history: [] },
        memory: { current: 0, used: 0, total: 0, free: 0, history: [] },
        gpu:    { current: 0, history: [] },
        topCpuProcesses: [],
        topMemoryProcesses: [],
        processCount: 0,
        error: String(err)
      };
    }
  }
}

module.exports = HardwareMonitor;
