# ATS Automation - Update Script
# Run this to update to the latest version

$repoPath = "$env:USERPROFILE\ats-automation"

if (-not (Test-Path $repoPath)) {
    Write-Host "ATS Automation not found at $repoPath" -ForegroundColor Red
    Write-Host "Run the install script first:" -ForegroundColor Yellow
    Write-Host "  irm https://raw.githubusercontent.com/vtion001/ats-automation/main/install-windows.ps1 | iex" -ForegroundColor Cyan
    exit 1
}

Write-Host "Updating ATS Automation..." -ForegroundColor Cyan
Set-Location $repoPath

# Stash any local changes
$stashed = $false
if ((git status --porcelain) -ne "") {
    Write-Host "Stashing local changes..." -ForegroundColor Yellow
    git stash
    $stashed = $true
}

# Pull latest changes
Write-Host "Pulling latest changes..." -ForegroundColor Yellow
git pull origin main

# Update Python dependencies
Write-Host "Updating dependencies..." -ForegroundColor Yellow
if (Test-Path "requirements.txt") {
    pip install -r requirements.txt --upgrade
}

if (Test-Path "requirements-server.txt") {
    pip install -r requirements-server.txt --upgrade
}

# Restore stashed changes
if ($stashed) {
    Write-Host "Restoring local changes..." -ForegroundColor Yellow
    git stash pop
}

Write-Host ""
Write-Host "Update complete!" -ForegroundColor Green
Write-Host "Restart your server with: python server\main.py" -ForegroundColor Cyan
Write-Host "Or rebuild your Chrome extension in chrome://extensions/" -ForegroundColor Cyan
