# Complete End-to-End Pipeline Smoke Test for PIXELFORGE AI
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PIXELFORGE AI — END-TO-END SMOKE TEST   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Locate FFmpeg
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
    $matches = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue
    if ($matches) { $ffmpeg = $matches[0].FullName }
}
$ffprobe = Get-Command ffprobe -ErrorAction SilentlyContinue
if (-not $ffprobe) {
    $matches = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "ffprobe.exe" -ErrorAction SilentlyContinue
    if ($matches) { $ffprobe = $matches[0].FullName }
}

$v2x = "tools\video2x\video2x.exe"
if (-not (Test-Path $v2x)) {
    Write-Host "[FAIL] Video2X binary not found at $v2x" -ForegroundColor Red
    exit 1
}

# 1. Create Synthetic Input Video
$testIn = "storage\temp\smoke_test_in.mp4"
$testOut = "storage\temp\smoke_test_out.mp4"
if (Test-Path $testIn) { Remove-Item $testIn -Force }
if (Test-Path $testOut) { Remove-Item $testOut -Force }

Write-Host "`n[1/4] Generating synthetic test video (320x180, 24fps, audio)..." -ForegroundColor Yellow
& $ffmpeg -y -f lavfi -i "testsrc=duration=1:size=320x180:rate=24" -f lavfi -i "sine=frequency=440:duration=1" -c:v libx264 -pix_fmt yuv420p -c:a aac $testIn
Write-Host "[OK] Test video generated: $testIn" -ForegroundColor Green

# 2. Run Video2X AI Upscaling
Write-Host "`n[2/4] Executing Real-ESRGAN super-resolution on RTX 5050 GPU..." -ForegroundColor Yellow
$sw = [System.Diagnostics.Stopwatch]::StartNew()

& $v2x -i $testIn -o $testOut -d 0 -p realesrgan --realesrgan-model realesr-animevideov3 -s 2

$sw.Stop()
$elapsedSec = [Math]::Round($sw.Elapsed.TotalSeconds, 2)
Write-Host "[OK] Video2X finished in $elapsedSec seconds." -ForegroundColor Green

# 3. Validate Output
Write-Host "`n[3/4] Validating enhanced video stream with FFprobe..." -ForegroundColor Yellow
if (-not (Test-Path $testOut)) {
    Write-Host "[FAIL] Output file was not created!" -ForegroundColor Red
    exit 1
}

$probeJson = & $ffprobe -v error -show_format -show_streams -print_format json $testOut | ConvertFrom-Json
$vStream = $probeJson.streams | Where-Object { $_.codec_type -eq "video" }
$aStream = $probeJson.streams | Where-Object { $_.codec_type -eq "audio" }

$outWidth = $vStream.width
$outHeight = $vStream.height
$hasAudio = ($null -ne $aStream)

Write-Host "Output Resolution: $outWidth x $outHeight" -ForegroundColor Cyan
Write-Host "Audio Stream Preserved: $hasAudio" -ForegroundColor Cyan
Write-Host "Duration: $($probeJson.format.duration) s" -ForegroundColor Cyan

if ($outWidth -eq 640 -and $outHeight -eq 360 -and $hasAudio) {
    Write-Host "`n[4/4] SMOKE TEST PASSED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Input Resolution:   320 x 180" -ForegroundColor White
    Write-Host "Output Resolution:  $outWidth x $outHeight" -ForegroundColor White
    Write-Host "AI Model:           realesr-animevideov3 (Real-ESRGAN)" -ForegroundColor White
    Write-Host "Acceleration:       NVIDIA RTX 5050 Laptop GPU (Vulkan Device 0)" -ForegroundColor White
    Write-Host "Processing Time:    $elapsedSec seconds" -ForegroundColor White
    Write-Host "Audio Preserved:    Yes ($($aStream.codec_name))" -ForegroundColor White
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host "`n[FAIL] Output did not match expected criteria." -ForegroundColor Red
    exit 1
}

