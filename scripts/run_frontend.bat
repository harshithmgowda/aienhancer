@echo off
title PIXELFORGE AI ? Next.js Frontend
cd /d "%~dp0..\frontend"
echo ========================================================
echo   PIXELFORGE AI ? Next.js Web Application
echo   URL: http://localhost:3000
echo ========================================================
echo.

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm not found in system PATH!
    pause
    exit /b 1
)

echo Starting Next.js Dev Server on port 3000...
call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend stopped with code %errorlevel%.
    pause
)