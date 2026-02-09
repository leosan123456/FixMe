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
      const [cpuLoad, memory, gpu, processes] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.graphics().catch(() => ({ controllers: [] })),
        si.processes()
      ]);

      const cpuPercent = cpuLoad.currentLoad || 0;
      const memPercent = memory.total ? (memory.used / memory.total) * 100 : 0;
      const gpuPercent = gpu.controllers && gpu.controllers[0] && gpu.controllers[0].memoryTotal
        ? gpu.controllers[0].memoryUsed / gpu.controllers[0].memoryTotal * 100
        : 0;

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
      throw err;
    }
  }
}

module.exports = HardwareMonitor;
