# Dependency check script for PIXELFORGE AI
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PIXELFORGE AI — DEPENDENCY AUDIT        " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Python
Write-Host "`n[1/5] Checking Python..." -ForegroundColor Yellow
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pyVer = python --version
    Write-Host "[OK] $pyVer" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Python is missing. Please install Python 3.10+." -ForegroundColor Red
}

# 2. Node & NPM
Write-Host "`n[2/5] Checking Node.js and npm..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node --version
    $npmVer = npm --version
    Write-Host "[OK] Node $nodeVer, npm $npmVer" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Node.js is missing. Please install Node.js 18+." -ForegroundColor Red
}

# 3. FFmpeg and FFprobe
Write-Host "`n[3/5] Checking FFmpeg & FFprobe..." -ForegroundColor Yellow
$ffmpegCmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpegCmd) {
    $matches = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue
    if ($matches) { $ffmpegCmd = $matches[0].FullName }
}
if ($ffmpegCmd) {
    Write-Host "[OK] FFmpeg found: $ffmpegCmd" -ForegroundColor Green
} else {
    Write-Host "[FAIL] FFmpeg is missing." -ForegroundColor Red
}

# 4. Video2X
Write-Host "`n[4/5] Checking Video2X Engine..." -ForegroundColor Yellow
$v2x = "tools\video2x\video2x.exe"
if (Test-Path $v2x) {
    $v2xVer = & $v2x -V
    Write-Host "[OK] Video2X available: $v2xVer" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Video2X binary missing at $v2x." -ForegroundColor Red
}

# 5. NVENC acceleration
Write-Host "`n[5/5] Checking NVENC Hardware Acceleration..." -ForegroundColor Yellow
if ($ffmpegCmd) {
    $nvenc = & $ffmpegCmd -hide_banner -encoders | Select-String "h264_nvenc"
    if ($nvenc) {
        Write-Host "[OK] NVENC hardware encoder active: $nvenc" -ForegroundColor Green
    } else {
        Write-Host "[INFO] NVENC not found in FFmpeg build. Falling back to libx264." -ForegroundColor Yellow
    }
}

