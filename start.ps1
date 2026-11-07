# PIXELFORGE AI -- PowerShell Launcher
$ErrorActionPreference = "Stop"
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "          PIXELFORGE AI -- SYSTEM LAUNCHER" -ForegroundColor Cyan
Write-Host "  Local GPU AI Video and Image Enhancement (RTX 5050)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host ""

Set-Location $PSScriptRoot

# 1. Clean old lingering instances
Write-Host "[1/4] Cleaning previous instances on ports 3000 & 8000..." -ForegroundColor Yellow
$conns = Get-NetTCPConnection -LocalPort 3000, 8000 -ErrorAction SilentlyContinue
if ($conns) {
    $conns.OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
}

# 2. Check Python
Write-Host "[2/4] Verifying Python backend environment..." -ForegroundColor Yellow
$pythonPath = Join-Path $PSScriptRoot "backend\venv\Scripts\python.exe"
if (-not (Test-Path $pythonPath)) {
    Write-Host "[ERROR] Python venv not found at $pythonPath" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "      [OK] Python verified." -ForegroundColor Green

# 3. Check Node
Write-Host "[3/4] Verifying Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found in PATH!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "      [OK] Node.js verified." -ForegroundColor Green

# 4. Start Services
Write-Host "[4/4] Starting backend and frontend in separate windows..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", ""$PSScriptRoot\scripts\run_backend.bat""
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", ""$PSScriptRoot\scripts\run_frontend.bat""

Write-Host ""
Write-Host "Waiting for servers to initialize..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($res.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        Write-Host "  ... waiting for Next.js compilation ..." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  PIXELFORGE AI IS LIVE AND READY!" -ForegroundColor Green
Write-Host "  ------------------------------------------------------" -ForegroundColor Green
Write-Host "  Web Application: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API:     http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  API Docs:        http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

Start-Process "http://localhost:3000"
Write-Host "Keep the server windows open while using the application." -ForegroundColor Yellow