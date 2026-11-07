@echo off
setlocal enabledelayedexpansion
title PIXELFORGE AI -- Launcher

echo ========================================================
echo           PIXELFORGE AI -- SYSTEM LAUNCHER
echo   Local GPU AI Video and Image Enhancement (RTX 5050)
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Check Python Virtual Environment
echo [1/3] Checking Python backend environment...
if not exist "backend\venv\Scripts\python.exe" (
    echo [WARNING] Python virtual environment not found in backend\venv.
    echo Running automated setup first...
    powershell -ExecutionPolicy Bypass -File "scripts\setup.ps1"
    if %errorlevel% neq 0 (
        echo [ERROR] Setup failed. Please check the logs above.
        pause
        exit /b 1
    )
) else (
    echo       [OK] Python venv verified.
)

:: 2. Check Node.js
echo [2/3] Checking Node.js frontend environment...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
) else (
    echo       [OK] Node.js verified.
)

:: 3. Launch Backend and Frontend Services
echo [3/3] Starting PIXELFORGE AI Services...
echo.

echo Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "PIXELFORGE AI -- Backend Server" cmd /k ""%~dp0scripts\run_backend.bat""

echo Waiting for backend initialization...
ping 127.0.0.1 -n 3 >nul

echo Launching Next.js Frontend on http://localhost:3000 ...
start "PIXELFORGE AI -- Frontend App" cmd /k ""%~dp0scripts\run_frontend.bat""

echo Waiting for frontend initialization...
ping 127.0.0.1 -n 4 >nul

echo.
echo ========================================================
echo   PIXELFORGE AI IS RUNNING!
echo   ------------------------------------------------------
echo   Web Application: http://localhost:3000
echo   Backend API:     http://127.0.0.1:8000
echo   API Docs:        http://127.0.0.1:8000/docs
echo ========================================================
echo.
echo Opening browser to http://localhost:3000 ...
start http://localhost:3000

echo.
echo Both services are running in separate terminal windows.
echo Keep those windows open while using the application.
echo.
echo Press any key to close this launcher window...
pause >nul