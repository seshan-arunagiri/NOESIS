@echo off
REM Code Learning Extension - Quick Run (Batch version)

setlocal enabledelayedexpansion
cd /d %~dp0

echo.
echo ============================================================
echo   Code Learning Extension - Quick Run
echo ============================================================
echo.

REM Check setup
if not exist .env (
    echo [ERROR] Setup not complete
    echo Run: setup-and-run.bat
    pause
    exit /b 1
)

if not exist node_modules (
    echo [ERROR] Dependencies not installed
    echo Run: setup-and-run.bat
    pause
    exit /b 1
)

echo OK - Setup verified
echo.
echo Running health check...
node health-check.js >nul

echo.
echo Launching VS Code...
start code "file://%cd%"

echo.
echo OK - Extension ready
echo Press F5 in VS Code to restart
echo.
pause
