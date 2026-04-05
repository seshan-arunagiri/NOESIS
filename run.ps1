# Code Learning Extension - Quick Run
# Quickly launch the extension (assumes setup is done)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host ""
Write-Host "============================================================"
Write-Host "  Code Learning Extension - Quick Run"
Write-Host "============================================================"
Write-Host ""

# Verify setup
Write-Host "Checking setup..."
$envFile = Join-Path $ScriptDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "✗ Setup not complete"
    Write-Host "Run: .\setup-and-run.ps1"
    exit 1
}

$nodeModulesPath = Join-Path $ScriptDir "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "✗ Dependencies not installed"
    Write-Host "Run: .\setup-and-run.ps1"
    exit 1
}

Write-Host "✓ Setup verified"

# Quick health check
Write-Host ""
Write-Host "Running health check..."
& node health-check.js | Out-Null

# Launch
Write-Host ""
Write-Host "Launching VS Code..."
& code "file://$ScriptDir" | Out-Null

Write-Host "✓ Extension ready"
Write-Host ""
Write-Host "Press F5 in VS Code to restart"
Write-Host ""
