# Automated environment setup script for PIXELFORGE AI on Windows 11
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PIXELFORGE AI — AUTOMATED SETUP SCRIPT  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# 1. Ensure Storage Directories
Write-Host "`n[1/5] Ensuring Storage Directories..." -ForegroundColor Yellow
$dirs = @("storage\uploads", "storage\outputs", "storage\thumbnails", "storage\temp", "storage\logs", "tools")
foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
    }
}
Write-Host "[OK] Storage directories ready." -ForegroundColor Green

# 2. Check Environment Configuration
Write-Host "`n[2/5] Checking Configuration (.env)..." -ForegroundColor Yellow
if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[OK] Created .env from .env.example." -ForegroundColor Green
} else {
    Write-Host "[OK] .env file present." -ForegroundColor Green
}

# 3. Setup Python Backend Virtual Environment
Write-Host "`n[3/5] Setting up Python Virtual Environment..." -ForegroundColor Yellow
if (-not (Test-Path "backend\venv")) {
    python -m venv "backend\venv"
    Write-Host "[OK] Created backend/venv." -ForegroundColor Green
}
& "backend\venv\Scripts\pip.exe" install -r "backend\requirements.txt"
Write-Host "[OK] Backend dependencies installed." -ForegroundColor Green

# 4. Setup Next.js Frontend Dependencies
Write-Host "`n[4/5] Setting up Frontend Dependencies..." -ForegroundColor Yellow
npm install --prefix frontend
Write-Host "[OK] Frontend packages installed." -ForegroundColor Green

# 5. Verify Video2X Engine
Write-Host "`n[5/5] Verifying Video2X Engine..." -ForegroundColor Yellow
if (-not (Test-Path "tools\video2x\video2x.exe")) {
    Write-Host "Downloading Video2X 6.4.0 official release..." -ForegroundColor Yellow
    $zipPath = "tools\video2x-windows-amd64.zip"
    curl.exe -L "https://github.com/k4yt3x/video2x/releases/download/6.4.0/video2x-windows-amd64.zip" -o $zipPath
    Expand-Archive -Path $zipPath -DestinationPath "tools\video2x" -Force
    Remove-Item $zipPath -Force
}
Write-Host "[OK] Video2X engine installed." -ForegroundColor Green

Write-Host "`nSetup successfully completed! Run start.bat to launch PIXELFORGE AI." -ForegroundColor Green

