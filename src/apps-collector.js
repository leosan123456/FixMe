const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

class AppsCollector {
  constructor() {
    this.recentApps = [];
    this.commonGamePaths = [
      'C:\\Program Files (x86)\\Steam\\steamapps\\common',
      'C:\\Program Files\\Epic Games',
      'C:\\Games',
      'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local\\Programs',
      'C:\\Program Files',
      'C:\\Program Files (x86)'
    ];
  }

  // Coletar aplicativos recentes do Windows
  async getRecentApps() {
    try {
      // Usar PowerShell para obter aplicativos recentes do Shell Recent Items
      const psCommand = `Get-ChildItem -Path $env:APPDATA\\Microsoft\\Windows\\Recent -Filter *.lnk | Select-Object -First 20 | ForEach-Object { $_.FullName }`;
      
      return new Promise((resolve, reject) => {
        exec(`powershell -Command "${psCommand}"`, async (err, stdout) => {
          if (err || !stdout) {
            resolve([]);
            return;
          }

          const lnkFiles = stdout.trim().split('\n').filter(f => f);
          const apps = [];

          for (const lnkFile of lnkFiles) {
            try {
              const app = await this.parseLnkFile(lnkFile);
              if (app) apps.push(app);
            } catch (e) {
              // Ignorar erros de lnk inválidos
            }
          }

          resolve(apps);
        });
      });
    } catch (err) {
      console.error('Erro ao coletar apps recentes:', err);
      return [];
    }
  }

  // Parsear arquivo .lnk (atalho)
  async parseLnkFile(lnkPath) {
    return new Promise((resolve) => {
      try {
        const stats = fs.statSync(lnkPath);
        const fileName = path.basename(lnkPath, '.lnk');
        
        // Tentar ler o atalho usando PowerShell
        const psCmd = `
          $shell = New-Object -ComObject WScript.Shell
          $link = $shell.CreateShortCut('${lnkPath}')
          $link.TargetPath
        `;

        exec(`powershell -Command "${psCmd}"`, (err, stdout) => {
          if (err || !stdout) {
            resolve(null);
            return;
          }

          const targetPath = stdout.trim();
          if (!targetPath || !fs.existsSync(targetPath)) {
            resolve(null);
            return;
          }

          const app = {
            name: fileName,
            path: targetPath,
            icon: null,
            lastUsed: stats.atimeMs,
            type: this.detectAppType(targetPath)
          };

          // Extrair ícone
          this.extractIcon(targetPath).then(iconPath => {
            app.icon = iconPath;
            resolve(app);
          }).catch(() => resolve(app));
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Detectar tipo (jogo, app, ferramenta)
  detectAppType(exePath) {
    const path = exePath.toLowerCase();
    if (path.includes('steam') || path.includes('epic') || path.includes('game')) {
      return 'game';
    } else if (path.includes('system32') || path.includes('windows')) {
      return 'system';
    }
    return 'app';
  }

  // Extrair ícone do executável
  async extractIcon(exePath) {
    return new Promise((resolve) => {
      try {
        // Se o arquivo existe, usamos como base64 em uma abordagem simplificada
        if (!fs.existsSync(exePath)) {
          resolve(null);
          return;
        }

        // Para jogos/apps, usar a imagem padrão ou cache
        const iconCachePath = path.join(os.homedir(), '.fixme-cache');
        if (!fs.existsSync(iconCachePath)) {
          fs.mkdirSync(iconCachePath, { recursive: true });
        }

        // Usar ícone padrão baseado no tipo
        const ext = path.extname(exePath).toLowerCase();
        const defaultIcon = ext === '.exe' 
          ? this.getDefaultGameIcon()
          : this.getDefaultAppIcon();

        resolve(defaultIcon);
      } catch (err) {
        resolve(null);
      }
    });
  }

  getDefaultGameIcon() {
    // Retornar ícone SVG padrão para jogos
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#8b5cf6" width="100" height="100" rx="10"/><text x="50" y="50" font-size="40" fill="white" text-anchor="middle" dominant-baseline="central">🎮</text></svg>`;
  }

  getDefaultAppIcon() {
    // Retornar ícone SVG padrão para apps
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#3b82f6" width="100" height="100" rx="10"/><text x="50" y="50" font-size="40" fill="white" text-anchor="middle" dominant-baseline="central">📱</text></svg>`;
  }

  // Procurar jogos populares nos caminhos conhecidos
  async discoverGames() {
    const games = [];

    for (const basePath of this.commonGamePaths) {
      if (!fs.existsSync(basePath)) continue;

      try {
        const items = fs.readdirSync(basePath, { withFileTypes: true });

        for (const item of items) {
          if (!item.isDirectory() && !item.isFile()) continue;
          if (games.length >= 10) break;

          try {
            const fullPath = path.join(basePath, item.name);
            
            // Se é diretório, procurar .exe dentro
            if (item.isDirectory()) {
              const exeFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('.exe'));
              if (exeFiles.length > 0) {
                const exePath = path.join(fullPath, exeFiles[0]);
                const stats = fs.statSync(exePath);

                games.push({
                  name: item.name,
                  path: exePath,
                  icon: this.getDefaultGameIcon(),
                  type: 'game',
                  lastUsed: stats.atimeMs
                });
              }
            }
            // Se é .exe diretamente
            else if (item.name.endsWith('.exe')) {
              const stats = fs.statSync(fullPath);
              games.push({
                name: item.name.replace('.exe', ''),
                path: fullPath,
                icon: this.getDefaultGameIcon(),
                type: 'game',
                lastUsed: stats.atimeMs
              });
            }
          } catch (e) {
            // Ignorar erros de acesso a arquivos
          }
        }
      } catch (e) {
        // Ignorar erros de leitura de diretório
      }
    }

    return games.sort((a, b) => b.lastUsed - a.lastUsed).slice(0, 10);
  }

  // Obter aplicativos instalados via registro do Windows
  async getInstalledApps() {
    return new Promise((resolve) => {
      // Usar PowerShell para obter apps instalados do Registry
      const psCmd = `
        $apps = @()
        $regPaths = @(
          'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
          'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
          'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
        )
        foreach ($regPath in $regPaths) {
          if (Test-Path $regPath) {
            Get-ChildItem $regPath | ForEach-Object {
              $app = Get-ItemProperty $_.PSPath
              if ($app.DisplayName -and $app.DisplayIcon) {
                $apps += @{
                  Name = $app.DisplayName
                  Icon = $app.DisplayIcon
                  Publisher = $app.Publisher
                }
              }
            }
          }
        }
        $apps | ConvertTo-Json -Depth 2
      `;

      exec(`powershell -Command "${psCmd}"`, (err, stdout) => {
        try {
          if (err || !stdout) {
            resolve([]);
            return;
          }

          const apps = JSON.parse(stdout);
          const formattedApps = (Array.isArray(apps) ? apps : [apps])
            .slice(0, 15)
            .map(app => ({
              name: app.Name || 'Desconhecido',
              icon: this.getDefaultAppIcon(),
              type: 'app',
              publisher: app.Publisher
            }));

          resolve(formattedApps);
        } catch (e) {
          resolve([]);
        }
      });
    });
  }

  // Combinar todos os dados
  async collectAll() {
    try {
      const [recent, games, installed] = await Promise.all([
        this.getRecentApps(),
        this.discoverGames(),
        this.getInstalledApps()
      ]);

      // Remover duplicatas por nome
      const allApps = [...recent, ...games, ...installed];
      const seen = new Set();
      const unique = allApps.filter(app => {
        if (seen.has(app.name.toLowerCase())) return false;
        seen.add(app.name.toLowerCase());
        return true;
      });

      return unique.slice(0, 20);
    } catch (err) {
      console.error('Erro ao coletar apps:', err);
      return [];
    }
  }
}

module.exports = AppsCollector;
