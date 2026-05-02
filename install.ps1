# ============================================================
# FixMe - Windows Game Optimizer
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
$repo    = 'leosan123456/FixMe'
$appName = 'FixMe'

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

function Get-LatestRelease {
    $apiUrl  = "https://api.github.com/repos/$repo/releases/latest"
    $headers = @{ 'User-Agent' = 'FixMe-Installer/1.0'; 'Accept' = 'application/vnd.github.v3+json' }
    try {
        return Invoke-RestMethod -Uri $apiUrl -Headers $headers -TimeoutSec 15
    } catch {
        # Fallback: try unauthenticated
        return Invoke-RestMethod -Uri $apiUrl -TimeoutSec 15
    }
}

function Install-FixMe {
    Write-Header

    # ── 1. Check OS ──────────────────────────────────────────────────────
    Write-Host '[1/4] Verificando sistema...' -ForegroundColor Yellow
    if (-not [System.Environment]::Is64BitOperatingSystem) {
        Write-Host 'ERRO: FixMe requer Windows 64-bit.' -ForegroundColor Red
        exit 1
    }
    $os = [System.Environment]::OSVersion.Version
    if ($os.Major -lt 10) {
        Write-Host 'AVISO: FixMe foi testado apenas no Windows 10/11.' -ForegroundColor DarkYellow
    }
    Write-Host "  OK - Windows $($os.Major).$($os.Minor) 64-bit detectado" -ForegroundColor Green

    # ── 2. Fetch latest release ──────────────────────────────────────────
    Write-Host '[2/4] Buscando ultima versao...' -ForegroundColor Yellow
    $release = Get-LatestRelease
    $asset   = $release.assets | Where-Object { $_.name -like '*Setup*.exe' -or $_.name -like '*.exe' } | Select-Object -First 1

    if (-not $asset) {
        Write-Host "ERRO: Nenhum instalador encontrado na release $($release.tag_name)." -ForegroundColor Red
        Write-Host "Acesse manualmente: https://github.com/$repo/releases/latest" -ForegroundColor DarkYellow
        exit 1
    }

    Write-Host "  Versao: $($release.tag_name)" -ForegroundColor Green
    Write-Host "  Arquivo: $($asset.name) ($([math]::Round($asset.size / 1MB, 1)) MB)" -ForegroundColor Green

    # ── 3. Download ──────────────────────────────────────────────────────
    Write-Host '[3/4] Baixando instalador...' -ForegroundColor Yellow
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
    Write-Host '[4/4] Executando instalador (UAC solicitado)...' -ForegroundColor Yellow
    Write-Host '  Siga as instrucoes na janela do instalador.' -ForegroundColor DarkGray
    Write-Host ''

    Start-Process -FilePath $installerPath -Wait -Verb RunAs

    # ── Cleanup ──────────────────────────────────────────────────────────
    Remove-Item $installerPath -ErrorAction SilentlyContinue

    # ── Post-install instructions ─────────────────────────────────────────
    Write-Host ''
    Write-Host '============================================' -ForegroundColor Cyan
    Write-Host "  $appName instalado com sucesso!" -ForegroundColor Green
    Write-Host '============================================' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  CONFIGURACAO DA IA (opcional):' -ForegroundColor White
    Write-Host "  Para usar Gemini AI, crie o arquivo:" -ForegroundColor DarkGray
    Write-Host "  %APPDATA%\FixMe\.env" -ForegroundColor Yellow
    Write-Host ''
    Write-Host '  Com o conteudo:' -ForegroundColor DarkGray
    Write-Host '  GEMINI_API_KEY=sua_chave_aqui' -ForegroundColor Yellow
    Write-Host ''
    Write-Host '  Obtenha sua chave em: https://aistudio.google.com/apikey' -ForegroundColor DarkGray
    Write-Host ''

    # Offer to open API key setup
    $resp = Read-Host '  Deseja abrir o Google AI Studio para obter sua chave? (s/N)'
    if ($resp -match '^[sS]') {
        Start-Process 'https://aistudio.google.com/apikey'
    }

    Write-Host ''
    Write-Host '  Iniciando FixMe...' -ForegroundColor Cyan
    $exePath = "$env:ProgramFiles\FixMe\FixMe.exe"
    if (Test-Path $exePath) {
        Start-Process $exePath
    }
}

Install-FixMe
