@echo off
setlocal enabledelayedexpansion
title PIXELFORGE AI -- Launcher

echo ========================================================
echo           PIXELFORGE AI -- SYSTEM LAUNCHER
echo   Local GPU AI Video and Image Enhancement (RTX 5050)
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Clean previous lingering instances
echo [1/4] Checking ports and cleaning up old instances...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000.*LISTENING :8000.*LISTENING"') do taskkill /f /pid %%a >nul 2>&1

:: 2. Check Python Environment
echo [2/4] Verifying Python backend...
if not exist "backend\venv\Scripts\python.exe" (
    echo [ERROR] Python environment not found in backend\venv!
    pause
    exit /b 1
)

:: 3. Check Node.js
echo [3/4] Verifying Node.js frontend...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    pause
    exit /b 1
)

:: 4. Start Servers
echo [4/4] Starting services in background terminals...
start "PIXELFORGE Backend" cmd /k call "%~dp0scripts\run_backend.bat"
start "PIXELFORGE Frontend" cmd /k call "%~dp0scripts\run_frontend.bat"

echo.
echo Waiting for servers to initialize...
set /a retries=0
:wait_loop
set /a retries+=1
if !retries! gtr 30 (
    echo.
    echo [WARNING] Frontend took longer than expected to respond.
    echo Check the PIXELFORGE Frontend terminal window for messages.
    goto open_browser
)
ping 127.0.0.1 -n 2 >nul
curl.exe -s -o nul http://localhost:3000
if %errorlevel% neq 0 (
    echo   ... waiting for frontend: Next.js compiling ...
    goto wait_loop
)

:open_browser
echo.
echo ========================================================
echo   PIXELFORGE AI IS LIVE AND READY!
echo   ------------------------------------------------------
echo   Web Application: http://localhost:3000
echo   Backend API:     http://127.0.0.1:8000
echo   API Docs:        http://127.0.0.1:8000/docs
echo ========================================================
echo.
echo Opening browser to http://localhost:3000 ...
start http://localhost:3000

echo.
echo Servers are running in separate terminal windows.
echo Keep those windows open while using the application.
echo You may close this launcher window at any time.
echo.
pause