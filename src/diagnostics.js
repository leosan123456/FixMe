const { exec } = require('child_process');
const si = require('systeminformation');

class SystemDiagnostics {
  constructor() {
    this.issues = [];
    this.totalChecks = 0;
    this.completedChecks = 0;
  }

  async runFullDiagnostics(onProgress) {
    this.issues = [];
    this.totalChecks = 10;
    this.completedChecks = 0;

    try {
      // 1. Verificar Windows Updates
      await this.checkWindowsUpdates(onProgress);

      // 2. Verificar Espaço em Disco
      await this.checkDiskSpace(onProgress);

      // 3. Verificar Drivers
      await this.checkDrivers(onProgress);

      // 4. Verificar Processos Problemáticos
      await this.checkProblematicProcesses(onProgress);

      // 5. Verificar Temperatura CPU
      await this.checkCPUTemperature(onProgress);

      // 6. Verificar Memória
      await this.checkMemoryHealth(onProgress);

      // 7. Verificar Serviços Críticos
      await this.checkCriticalServices(onProgress);

      // 8. Verificar Fragmentação
      await this.checkFragmentation(onProgress);

      // 9. Verificar Rede
      await this.checkNetworkHealth(onProgress);

      // 10. Verificar Proteção do Windows
      await this.checkWindowsProtection(onProgress);

      return {
        success: true,
        issues: this.issues,
        totalIssues: this.issues.length,
        severity: this.calculateSeverity()
      };
    } catch (err) {
      console.error('Erro no diagnóstico:', err);
      return {
        success: false,
        error: String(err),
        issues: this.issues
      };
    }
  }

  async checkWindowsUpdates(onProgress) {
    this.completedChecks++;
    onProgress({ step: 'Verificando Windows Updates...', progress: (this.completedChecks / this.totalChecks) * 100 });

    return new Promise((resolve) => {
      const cmd = `powershell -Command "Get-WmiObject -Class Win32_QuickFixEngineering | Measure-Object"`;
      exec(cmd, (err, stdout) => {
        if (err || !stdout || stdout.includes('0')) {
          this.issues.push({
            severity: 'high',
            category: 'Windows Update',
            title: 'Nenhuma atualização recente instalada',
            description: 'Seu sistema pode estar vulnerável. Acesse Configurações > Atualização e Segurança.',
            solution: 'Verificar e instalar Windows Updates'
          });
        }
        resolve();
      });
    });
  }

  async checkDiskSpace(onProgress) {
    this.completedChecks++;
    onProgress({ step: 'Verificando espaço em disco...', progress: (this.completedChecks / this.totalChecks) * 100 });

    try {
      const disks = await si.fsSize();
      for (const disk of disks) {
        const usage = (disk.used / disk.size) * 100;
        if (usage > 95) {
          this.issues.push({
            severity: 'critical',
            category: 'Disco',
            title: `Disco ${disk.mount} quase cheio (${usage.toFixed(1)}%)`,
            description: `Apenas ${((disk.size - disk.used) / (1024 ** 3)).toFixed(2)} GB disponível.`,
            solution: 'Limpar arquivos desnecessários ou expandir espaço'
          });
        } else if (usage > 85) {
          this.issues.push({
            severity: 'high',
            category: 'Disco',
            title: `Disco ${disk.mount} com alto uso (${usage.toFixed(1)}%)`,
            description: `${((disk.size - disk.used) / (1024 ** 3)).toFixed(2)} GB disponível.`,
            solution: 'Liberar espaço em disco'
          });
        }
      }
    } catch (err) {
      console.error('Erro ao verificar disco:', err);
    }
  }

  async checkDrivers(onProgress) {
    this.completedChecks++;
    onProgress({ step: 'Verificando drivers...', progress: (this.completedChecks / this.totalChecks) * 100 });

    return new Promise((resolve) => {
      // Procurar por dispositivos com problemas no Device Manager
      const cmd = `powershell -Command "Get-WmiObject Win32_PnPDevice -Filter 'Status != \\'OK\\'\\'' | Measure-Object"`;
      exec(cmd, (err, stdout) => {
        if (!err && stdout && !stdout.includes('Count : 0')) {
          this.issues.push({
            severity: 'medium',
            category: 'Drivers',
            title: 'Possíveis problemas de driver detectados',
            description: 'Alguns dispositivos podem estar com drivers desatualizados ou problemáticos.',
            solution: 'Atualizar drivers via Device Manager ou fabricante'
          });
        }
        resolve();
      });
    });
  }

  async checkProblematicProcesses(onProgress) {
    this.completedChecks++;
    onProgress({ step: 'Verificando processos problemáticos...', progress: (this.completedChecks / this.totalChecks) * 100 });

    try {
      const processes = await si.processes();
      const problematicPatterns = ['malware', 'virus', 'crypto', 'miner'];
      
      for (const proc of processes.list.slice(0, 50)) {
        if (problematicPatterns.some(p => proc.name.toLowerCase().includes(p))) {
          this.issues.push({
            severity: 'critical',
            category: 'Segurança',
            title: `Processo suspeito detectado: ${proc.name}`,
            description: `Processo "${proc.name}" pode ser malicioso.`,
            solution: 'Executar antivírus ou investigar processo'
          });
        }
      }
    } catch (err) {
      console.error('Erro ao verificar processos:', err);
    }
  }

  async checkCPUTemperature(onProgress) {
    this.completedChecks++;
    onProgress({ step: 'Verificando temperatura da CPU...', progress: (this.completedChecks / this.totalChecks) * 100 });

    try {
      const temp = await si.cpuTemperature();
      if (temp.main && temp.main > 85) {
        this.issues.push({
          severity: 'high',
          category: 'Temperatura',
          title: `CPU aquecida (${temp.main.toFixed(1)}°C)`,
          description: 'Temperatura acima do ideal pode afetar performance e durabilidade.',
          solution: 'Limpar ventiladores, verificar pasta térmica, otimizar aplicações'
        });
      } else if (temp.main && temp.main > 75) {
        this.issues.push({
          severity: 'medium',
          category: 'Temperatura',
          title: `CPU com temperatura moderada (${temp.main.toFixed(1)}°C)`,
          description: 'Considere melhorar ventilação para melhor desempenho.',
          solution: 'Aumentar fluxo de ar, otimizar background apps'
        });
      }
    } catch (err) {
      console.error('Erro ao verificar temperatura:', err);
    }
  }

  async checkMemoryHealth(onProgress) {
    this.completedChecks++;
    onProgress({ step: 'Verificando saúde da memória...', progress: (this.completedChecks / this.totalChecks) * 100 });

    try {
      const mem = await si.mem();
      const memUsage = (mem.used / mem.total) * 100;

      if (memUsage > 90) {
        this.issues.push({
          severity: 'high',
          category: 'Memória',
          title: `RAM crítica (${memUsage.toFixed(1)}% em uso)`,
          description: 'Pouca memória disponível afeta a performance.',
          solution: 'Fechar aplicações, expandir RAM ou usar limpeza de memória'
        });
      } else if (memUsage > 80) {
        this.issues.push({
          severity: 'medium',
          category: 'Memória',
          title: `Uso alto de RAM (${memUsage.toFixed(1)}%)`,
          description: 'Considere gerenciar aplicações abertas.',
          solution: 'Monitorar processos, fechar abas do navegador'
        });
      }
    } catch (err) {
      console.error('Erro ao verificar memória:', err);
    }
  }

  async checkCriticalServices(onProgress) {
    this.completedChecks++;
    onProgress({ step: 'Verificando serviços críticos...', progress: (this.completedChecks / this.totalChecks) * 100 });

    return new Promise((resolve) => {
      const criticalServices = ['WinDefend', 'WdNisSvc', 'wscsvc', 'Wecsvc'];
      const cmd = `powershell -Command "Get-Service -Name ${criticalServices.join(',')}"`;
      
      exec(cmd, (err, stdout) => {
        if (err || !stdout) {
          this.issues.push({
            severity: 'medium',
            category: 'Serviços',
            title: 'Alguns serviços críticos podem estar desabilitados',
            description: 'Serviços de segurança e atualização podem estar parados.',
            solution: 'Verificar status de serviços no Services.msc'
          });
        }
        resolve();
      });
    });
  }

  async checkFragmentation(onProgress) {
    this.completedChecks++;
    onProgress({ step: 'Verificando fragmentação...', progress: (this.completedChecks / this.totalChecks) * 100 });

    // Windows 10/11 desfragmenta automaticamente, apenas avisar se desabilitado
    this.issues.push({
      severity: 'low',
      category: 'Otimização',
      title: 'Desfragmentação automática',
      description: 'Windows 10/11 faz desfragmentação automática. Verifique se está ativa.',
      solution: 'Acessar Ferramentas Administrativas > Desfragmentação'
    });
  }

  async checkNetworkHealth(onProgress) {
    this.completedChecks++;
    onProgress({ step: 'Verificando saúde da rede...', progress: (this.completedChecks / this.totalChecks) * 100 });

    try {
      const network = await si.networkStats();
      if (network && network.length > 0) {
        const totalErrors = network.reduce((sum, n) => sum + (n.rx_errors || 0) + (n.tx_errors || 0), 0);
        if (totalErrors > 100) {
          this.issues.push({
            severity: 'medium',
            category: 'Rede',
            title: `Erros de rede detectados (${totalErrors} erros)`,
            description: 'Podem indicar problemas de conexão ou hardware.',
            solution: 'Verificar driver de rede, reiniciar roteador'
          });
        }
      }
    } catch (err) {
      console.error('Erro ao verificar rede:', err);
    }
  }

  async checkWindowsProtection(onProgress) {
    this.completedChecks++;
    onProgress({ step: 'Verificando proteção do Windows...', progress: (this.completedChecks / this.totalChecks) * 100 });

    return new Promise((resolve) => {
      const cmd = `powershell -Command "Get-MpComputerStatus -ErrorAction SilentlyContinue | Select-Object RealTimeProtectionEnabled"`;
      exec(cmd, (err, stdout) => {
        if (err || !stdout || stdout.includes('False')) {
          this.issues.push({
            severity: 'critical',
            category: 'Segurança',
            title: 'Windows Defender desabilitado',
            description: 'Proteção em tempo real está desabilitada. Seu sistema está vulnerável.',
            solution: 'Abrir Windows Defender e ativar proteção em tempo real'
          });
        }
        resolve();
      });
    });
  }

  calculateSeverity() {
    let critical = this.issues.filter(i => i.severity === 'critical').length;
    let high = this.issues.filter(i => i.severity === 'high').length;
    
    if (critical > 0) return 'critical';
    if (high > 2) return 'high';
    if (high > 0) return 'medium';
    return 'low';
  }
}

module.exports = SystemDiagnostics;
