@echo off
title PIXELFORGE AI ? Backend API Server
cd /d "%~dp0.."
echo ========================================================
echo   PIXELFORGE AI ? FastAPI Backend Server
echo   Host: http://127.0.0.1:8000
echo   Docs: http://127.0.0.1:8000/docs
echo ========================================================
echo.

if not exist "backend\venv\Scripts\python.exe" (
    echo [ERROR] Python venv not found at backend\venv\Scripts\python.exe
    pause
    exit /b 1
)

set PYTHONPATH=backend
echo Starting Uvicorn server on port 8000...
"backend\venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend crashed or stopped with code %errorlevel%.
    pause
)