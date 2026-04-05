@echo off
REM Quick setup guide for the project

cls
echo.
echo ============================================================
echo   Code Learning Extension - Quick Start
echo ============================================================
echo.
echo This project requires:
echo   - Node.js (https://nodejs.org)
echo   - VS Code (https://code.visualstudio.com)
echo   - Google Gemini API key (free from Google)
echo.
echo STEP 1: Get API Key
echo --------
echo  1. Visit: https://makersuite.google.com/app/apikey
echo  2. Click "Create API key"
echo  3. Copy your API key
echo.
echo STEP 2: Configure .env
echo --------
echo  1. Edit the .env file in this folder
echo  2. Replace YOUR_API_KEY with your actual key
echo  3. Save the file
echo.
echo STEP 3: Run Setup
echo --------
echo  Option A (Batch):
echo    - Double-click: setup-and-run.bat
echo.
echo  Option B (PowerShell):
echo    - Right-click PowerShell -> Run as Administrator
echo    - Run: .\enable-scripts.ps1
echo    - Run: .\setup-and-run.ps1
echo.
echo That's it! The extension will launch in VS Code.
echo.
echo USAGE:
echo  - Open any code file
echo  - Right-click and select command to generate questions
echo  - Answer questions and learn!
echo.
echo Documentation: Read README.md or POWERSHELL-GUIDE.md
echo.
pause
