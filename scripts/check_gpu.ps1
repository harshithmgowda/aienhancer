# Check NVIDIA GPU and Vulkan acceleration capabilities for PIXELFORGE AI
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PIXELFORGE AI — GPU & VULKAN AUDIT     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check nvidia-smi
Write-Host "`n[1/3] Checking NVIDIA GPU Status..." -ForegroundColor Yellow
if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
    & nvidia-smi --query-gpu=name,driver_version,memory.total,memory.free,utilization.gpu,temperature.gpu --format=csv
    Write-Host "[OK] NVIDIA GPU detected." -ForegroundColor Green
} else {
    Write-Host "[FAIL] nvidia-smi not found in PATH." -ForegroundColor Red
}

# 2. Check Vulkan devices
Write-Host "`n[2/3] Checking Vulkan Devices..." -ForegroundColor Yellow
if (Get-Command vulkaninfo -ErrorAction SilentlyContinue) {
    & vulkaninfo --summary
    Write-Host "[OK] Vulkan runtime active." -ForegroundColor Green
} else {
    Write-Host "[FAIL] vulkaninfo not found." -ForegroundColor Red
}

# 3. Check Video2X GPU listing
Write-Host "`n[3/3] Checking Video2X GPU Enumeration..." -ForegroundColor Yellow
$v2xPath = "tools\video2x\video2x.exe"
if (Test-Path $v2xPath) {
    & $v2xPath -l
    Write-Host "[OK] Video2X GPU enumeration complete." -ForegroundColor Green
} else {
    Write-Host "[INFO] Video2X binary not found at $v2xPath." -ForegroundColor Yellow
}
