# Fix PowerShell execution policy if needed
# Run as Administrator

Write-Host ""
Write-Host "============================================================"
Write-Host "  PowerShell Execution Policy"
Write-Host "============================================================"
Write-Host ""

$isAdmin = ([System.Security.Principal.WindowsIdentity]::GetCurrent().Groups -contains "S-1-5-32-544")

if (-not $isAdmin) {
    Write-Host "✗ Must run as Administrator!"
    Write-Host ""
    Write-Host "How to fix:"
    Write-Host "  1. Right-click PowerShell"
    Write-Host "  2. Select 'Run as administrator'"
    Write-Host "  3. Run: .\enable-scripts.ps1"
    Write-Host ""
    exit 1
}

Write-Host "Current policy: $(Get-ExecutionPolicy)"
Write-Host ""
Write-Host "Setting to RemoteSigned..."

try {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Write-Host "✓ Policy updated"
    Write-Host ""
    Write-Host "You can now run:"
    Write-Host "  - .\setup-and-run.ps1"
    Write-Host "  - .\run.ps1"
} catch {
    Write-Host "✗ Failed to update policy"
    Write-Host "Error: $_"
    exit 1
}

Write-Host ""
