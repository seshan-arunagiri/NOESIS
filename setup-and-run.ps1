# Code Learning Extension - Complete Setup and Launch
# This script sets up and runs the entire project

param([switch]$SkipVSCode = $false)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host ""
Write-Host "============================================================"
Write-Host "  Code Learning Extension - Setup and Launch"
Write-Host "============================================================"
Write-Host ""

# Step 1: Check Node.js
Write-Host "Step 1: Checking Node.js Installation..."
try {
    $nodeVersion = & node --version 2>$null
    if ($null -eq $nodeVersion) { throw "Not found" }
    Write-Host "✓ Node.js found: $nodeVersion"
} catch {
    Write-Host "✗ Node.js not installed!"
    Write-Host "Get it from: https://nodejs.org/"
    exit 1
}

try {
    $npmVersion = & npm --version 2>$null
    Write-Host "✓ npm found: $npmVersion"
} catch {
    Write-Host "✗ npm not installed!"
    exit 1
}

# Step 2: Setup .env
Write-Host ""
Write-Host "Step 2: Verifying .env Configuration..."
$envFile = Join-Path $ScriptDir ".env"
$envExampleFile = Join-Path $ScriptDir ".env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExampleFile) {
        Copy-Item $envExampleFile $envFile
        Write-Host "✓ Created .env from .env.example"
    }
}

$envContent = Get-Content $envFile
if ($envContent -match "YOUR_API_KEY") {
    Write-Host "⚠ API key is placeholder!"
    Write-Host "Update .env with key from: https://makersuite.google.com/app/apikey"
    Read-Host "Press Enter after updating"
} else {
    Write-Host "✓ .env configured"
}

# Step 3: Install dependencies
Write-Host ""
Write-Host "Step 3: Installing Dependencies..."
$nodeModulesPath = Join-Path $ScriptDir "node_modules"

if (-not (Test-Path $nodeModulesPath)) {
    & npm install | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed"
    } else {
        Write-Host "✗ npm install failed"
        exit 1
    }
} else {
    Write-Host "✓ Dependencies already installed"
}

# Step 4: Run tests
Write-Host ""
Write-Host "Step 4: Running Health Check..."
& node health-check.js | Out-Null

Write-Host ""
Write-Host "============================================================"
Write-Host "  Setup Complete!"
Write-Host "============================================================"
Write-Host ""

# Step 5: Launch VS Code
if (-not $SkipVSCode) {
    Write-Host "Launching VS Code..."
    try {
        & code "file://$ScriptDir" | Out-Null
        Write-Host "Done: VS Code launched"
    } catch {
        Write-Host "Warning: Could not launch VS Code"
        Write-Host "Launch manually with: code $ScriptDir"
    }
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Press F5 in VS Code to start extension"
Write-Host "  2. Open any code file"
Write-Host "  3. Right click and select command to generate questions"
Write-Host ""
