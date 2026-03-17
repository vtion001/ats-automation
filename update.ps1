# ATS Automation - Update Script
# Run this in PowerShell to pull latest changes

Write-Host "Updating ATS Automation..." -ForegroundColor Cyan

$installPath = "$env:USERPROFILE\ats-automation"

if (-not (Test-Path $installPath)) {
    Write-Host "ATS Automation not found at $installPath" -ForegroundColor Red
    Write-Host "Please run install first:" -ForegroundColor Yellow
    Write-Host "  irm https://raw.githubusercontent.com/vtion001/ats-automation/main/install-windows.ps1 | iex" -ForegroundColor White
    exit 1
}

Set-Location $installPath

Write-Host "Pulling latest changes..." -ForegroundColor Yellow
git pull origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully updated!" -ForegroundColor Green
    
    # Check if requirements changed
    if (Test-Path "requirements.txt") {
        Write-Host "Checking for new dependencies..." -ForegroundColor Yellow
        $pythonCmd = "python"
        if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
            $pythonCmd = "python3"
        }
        & $pythonCmd -m pip install -r requirements.txt --quiet 2>$null
    }
    
    Write-Host ""
    Write-Host "Done! Restart Chrome extension if needed." -ForegroundColor Cyan
} else {
    Write-Host "Update failed. Trying to stash and pull..." -ForegroundColor Yellow
    git stash
    git pull origin main
}

Write-Host ""
Write-Host "Update complete!" -ForegroundColor Green
