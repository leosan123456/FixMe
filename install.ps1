# ============================================================
# FixMe - Windows Game Optimizer  v1.0.2
# Instalador via PowerShell
#
# Uso:
#   irm https://raw.githubusercontent.com/leosan123456/FixMe/main/install.ps1 | iex
#
# Ou baixe e execute localmente:
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   .\install.ps1
# ============================================================

$ErrorActionPreference = 'Stop'
$repo      = 'leosan123456/FixMe'
$appName   = 'FixMe'
$exePath   = "$env:ProgramFiles\FixMe\FixMe.exe"
$crashLog  = "$env:TEMP\fixme-crash.log"

function Write-Header {
    Clear-Host
    Write-Host ''
    Write-Host '  ███████╗██╗██╗  ██╗███╗   ███╗███████╗' -ForegroundColor Cyan
    Write-Host '  ██╔════╝██║╚██╗██╔╝████╗ ████║██╔════╝' -ForegroundColor Cyan
    Write-Host '  █████╗  ██║ ╚███╔╝ ██╔████╔██║█████╗  ' -ForegroundColor Cyan
    Write-Host '  ██╔══╝  ██║ ██╔██╗ ██║╚██╔╝██║██╔══╝  ' -ForegroundColor Cyan
    Write-Host '  ██║     ██║██╔╝ ██╗██║ ╚═╝ ██║███████╗' -ForegroundColor Cyan
    Write-Host '  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  Windows Game Optimizer' -ForegroundColor White
    Write-Host '  github.com/leosan123456/FixMe' -ForegroundColor DarkGray
    Write-Host ''
}

function Show-CrashDiag {
    Write-Host ''
    Write-Host '  [DIAGNOSTICO] O app parece nao ter iniciado corretamente.' -ForegroundColor DarkYellow
    if (Test-Path $crashLog) {
        Write-Host "  Log de erros encontrado em: $crashLog" -ForegroundColor Yellow
        Write-Host ''
        Write-Host '  Ultimas linhas do log:' -ForegroundColor DarkGray
        Get-Content $crashLog | Select-Object -Last 20 | ForEach-Object {
            Write-Host "    $_" -ForegroundColor DarkRed
        }
        Write-Host ''
        $open = Read-Host '  Deseja abrir o log completo no Notepad? (s/N)'
        if ($open -match '^[sS]') {
            Start-Process notepad.exe $crashLog
        }
    } else {
        Write-Host '  Nenhum log de erro encontrado.' -ForegroundColor DarkGray
        Write-Host '  Verifique se o app esta instalado em: ' -NoNewline
        Write-Host $exePath -ForegroundColor Yellow
    }
    Write-Host ''
    Write-Host '  Solucoes comuns:' -ForegroundColor White
    Write-Host '  1. Execute o FixMe.exe como Administrador (clique direito > Executar como admin)' -ForegroundColor DarkGray
    Write-Host '  2. Verifique se o antivirus nao esta bloqueando o app' -ForegroundColor DarkGray
    Write-Host '  3. Reinstale o app: irm https://raw.githubusercontent.com/leosan123456/FixMe/main/install.ps1 | iex' -ForegroundColor DarkGray
    Write-Host "  4. Reporte o problema: https://github.com/$repo/issues" -ForegroundColor DarkGray
}

function Get-LatestRelease {
    $apiUrl  = "https://api.github.com/repos/$repo/releases/latest"
    $headers = @{ 'User-Agent' = 'FixMe-Installer/1.0'; 'Accept' = 'application/vnd.github.v3+json' }
    try {
        return Invoke-RestMethod -Uri $apiUrl -Headers $headers -TimeoutSec 20
    } catch {
        return Invoke-RestMethod -Uri $apiUrl -TimeoutSec 20
    }
}

function Install-FixMe {
    Write-Header

    # ── 1. Check OS ──────────────────────────────────────────────────────
    Write-Host '[1/5] Verificando sistema...' -ForegroundColor Yellow
    if (-not [System.Environment]::Is64BitOperatingSystem) {
        Write-Host 'ERRO: FixMe requer Windows 64-bit.' -ForegroundColor Red
        exit 1
    }
    $os = [System.Environment]::OSVersion.Version
    if ($os.Major -lt 10) {
        Write-Host 'AVISO: FixMe foi testado apenas no Windows 10/11.' -ForegroundColor DarkYellow
    }
    Write-Host "  OK - Windows $($os.Major).$($os.Minor) 64-bit" -ForegroundColor Green

    # Limpa log de crash anterior para diagnostico mais limpo
    if (Test-Path $crashLog) {
        Remove-Item $crashLog -Force -ErrorAction SilentlyContinue
        Write-Host '  Log de crash anterior removido.' -ForegroundColor DarkGray
    }

    # ── 2. Fetch latest release ──────────────────────────────────────────
    Write-Host '[2/5] Buscando ultima versao...' -ForegroundColor Yellow
    $release = Get-LatestRelease
    $asset   = $release.assets | Where-Object { $_.name -like '*Setup*.exe' -or $_.name -like '*-win*.exe' -or ($_.name -like '*.exe' -and $_.name -notlike '*.blockmap') } | Select-Object -First 1

    if (-not $asset) {
        Write-Host "ERRO: Nenhum instalador .exe encontrado na release $($release.tag_name)." -ForegroundColor Red
        Write-Host "Acesse manualmente: https://github.com/$repo/releases/latest" -ForegroundColor DarkYellow
        exit 1
    }

    Write-Host "  Versao: $($release.tag_name)" -ForegroundColor Green
    Write-Host "  Arquivo: $($asset.name) ($([math]::Round($asset.size / 1MB, 1)) MB)" -ForegroundColor Green

    # ── 3. Download ──────────────────────────────────────────────────────
    Write-Host '[3/5] Baixando instalador...' -ForegroundColor Yellow
    $installerPath = "$env:TEMP\$($asset.name)"

    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installerPath -UseBasicParsing
        $ProgressPreference = 'Continue'
    } catch {
        Write-Host "ERRO ao baixar: $_" -ForegroundColor Red
        exit 1
    }

    $sizeKb = [math]::Round((Get-Item $installerPath).Length / 1KB)
    Write-Host "  Download concluido ($sizeKb KB)" -ForegroundColor Green

    # ── 4. Run installer ─────────────────────────────────────────────────
    Write-Host '[4/5] Executando instalador...' -ForegroundColor Yellow
    Write-Host '  Siga as instrucoes na janela do instalador.' -ForegroundColor DarkGray
    Write-Host ''

    Start-Process -FilePath $installerPath -Wait -Verb RunAs

    Remove-Item $installerPath -ErrorAction SilentlyContinue

    # ── 5. Verify installation and start app ─────────────────────────────
    Write-Host '[5/5] Verificando instalacao...' -ForegroundColor Yellow

    Start-Sleep -Seconds 2

    if (-not (Test-Path $exePath)) {
        # Try alternate paths
        $altPath = "$env:LOCALAPPDATA\Programs\FixMe\FixMe.exe"
        if (Test-Path $altPath) {
            $exePath = $altPath
        }
    }

    if (Test-Path $exePath) {
        Write-Host "  Instalado em: $exePath" -ForegroundColor Green
    } else {
        Write-Host "  AVISO: Executavel nao encontrado no caminho esperado." -ForegroundColor DarkYellow
        Write-Host "  Procure FixMe no Menu Iniciar." -ForegroundColor DarkGray
    }

    # ── Post-install summary ──────────────────────────────────────────────
    Write-Host ''
    Write-Host '============================================' -ForegroundColor Cyan
    Write-Host "  $appName instalado com sucesso!" -ForegroundColor Green
    Write-Host '============================================' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  A chave Gemini AI ja esta configurada no app.' -ForegroundColor Green
    Write-Host '  Todas as funcionalidades de IA estao prontas para uso.' -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '  Para configurar uma chave Gemini propria (opcional):' -ForegroundColor White
    Write-Host "  Crie: $env:APPDATA\FixMe\.env" -ForegroundColor Yellow
    Write-Host '  Com:  GEMINI_API_KEY=sua_chave_aqui' -ForegroundColor DarkGray
    Write-Host ''

    # ── Launch app ───────────────────────────────────────────────────────
    if (Test-Path $exePath) {
        Write-Host '  Iniciando FixMe...' -ForegroundColor Cyan
        Start-Process $exePath

        # Aguarda 5 segundos e verifica se o processo ainda esta rodando
        Start-Sleep -Seconds 5
        $proc = Get-Process -Name 'FixMe' -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host '  FixMe iniciado com sucesso!' -ForegroundColor Green
        } else {
            Show-CrashDiag
        }
    } else {
        Write-Host '  Abra o FixMe pelo Menu Iniciar ou pelo atalho na area de trabalho.' -ForegroundColor Cyan
    }

    Write-Host ''
}

Install-FixMe
