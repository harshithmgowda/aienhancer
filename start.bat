@echo off
setlocal enabledelayedexpansion
title PIXELFORGE AI — Launcher

echo ===================================================
echo           PIXELFORGE AI LAUNCHER
echo   Local GPU AI Video Enhancement (RTX 5050)
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Check Python
echo [1/4] Checking Python environment...
if not exist "backend\venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found in backend\venv.
    echo Running automated setup first...
    powershell -ExecutionPolicy Bypass -File "scripts\setup.ps1"
    if %errorlevel% neq 0 (
        echo [ERROR] Setup failed. Please check the logs.
        pause
        exit /b 1
    )
)

:: 2. Check Node.js
echo [2/4] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

:: 3. Check Tools & Engine
echo [3/4] Checking AI engine binaries...
if not exist "tools\video2x\video2x.exe" (
    echo [INFO] Video2X binary not found. Downloading dependencies...
    powershell -ExecutionPolicy Bypass -File "scripts\setup.ps1"
)

:: 4. Start Servers
echo [4/4] Starting PIXELFORGE AI Services...
echo.
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "PIXELFORGE AI - Backend Server" cmd /k "cd /d "%~dp0" && set PYTHONPATH=backend&& "backend\venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo Starting Next.js Frontend on http://localhost:3000 ...
start "PIXELFORGE AI - Frontend App" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ===================================================
echo   PIXELFORGE AI IS RUNNING!
echo   -------------------------------------------------
echo   Web Application: http://localhost:3000
echo   Backend API:     http://127.0.0.1:8000
echo   API Docs:        http://127.0.0.1:8000/docs
echo ===================================================
echo.
echo Keep this window open or close it when you want to stop.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:3000

