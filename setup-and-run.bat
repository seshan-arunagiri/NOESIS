@echo off
REM Code Learning Extension - Setup and Launch Script (Batch version)
REM This can be run directly without PowerShell issues

setlocal enabledelayedexpansion

cd /d %~dp0

echo.
echo ============================================================
echo   Code Learning Extension - Setup and Launch
echo ============================================================
echo.

REM Step 1: Check Node.js
echo Step 1: Checking Node.js Installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not installed!
    echo Get it from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo OK - Node.js found: %NODE_VER%

npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not installed!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo OK - npm found: %NPM_VER%

REM Step 2: Setup .env
echo.
echo Step 2: Verifying .env Configuration...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo OK - Created .env from .env.example
    )
)

findstr /m "YOUR_API_KEY" .env >nul
if errorlevel 0 (
    echo [WARNING] API key is placeholder!
    echo Update .env with key from: https://makersuite.google.com/app/apikey
    pause
) else (
    echo OK - .env configured
)

REM Step 3: Install dependencies
echo.
echo Step 3: Installing Dependencies...
if not exist node_modules (
    echo Running npm install...
    call npm install >nul
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
    echo OK - Dependencies installed
) else (
    echo OK - Dependencies already installed
)

REM Step 4: Health check
echo.
echo Step 4: Running Health Check...
node health-check.js >nul

echo.
echo ============================================================
echo   Setup Complete!
echo ============================================================
echo.
echo Next steps:
echo   1. Open VS Code
echo   2. File - Open Folder - Select this folder
echo   3. Press F5 to start the extension
echo   4. Open any code file
echo   5. Right-click and select command to generate questions
echo.
echo To launch VS Code now, type: code .
echo.
pause
