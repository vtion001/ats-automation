# ATS Automation - Update Script
# Run this in PowerShell to pull latest changes
# 
# Usage:
#   irm https://raw.githubusercontent.com/vtion001/ats-automation/main/update.ps1 | iex
#   To set up auto-update: .\update.ps1 -AutoUpdate

param(
    [switch]$AutoUpdate,
    [string]$Schedule = "8:00"  # Default: 8:00 AM daily
)

Write-Host "ATS Automation Updater" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

$installPath = "$env:USERPROFILE\ats-automation"

if (-not (Test-Path $installPath)) {
    Write-Host "ATS Automation not found at $installPath" -ForegroundColor Red
    Write-Host "Please run install first:" -ForegroundColor Yellow
    Write-Host "  irm https://raw.githubusercontent.com/vtion001/ats-automation/main/install-windows.ps1 | iex" -ForegroundColor White
    exit 1
}

Set-Location $installPath

# Check if Git is installed
$gitCmd = $null
if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitCmd = "git"
} elseif (Get-Command "C:\Program Files\Git\cmd\git.exe" -ErrorAction SilentlyContinue) {
    $gitCmd = "C:\Program Files\Git\cmd\git.exe"
} elseif (Get-Command "C:\Program Files (x86)\Git\cmd\git.exe" -ErrorAction SilentlyContinue) {
    $gitCmd = "C:\Program Files (x86)\Git\cmd\git.exe"
}

if (-not $gitCmd) {
    Write-Host "ERROR: Git is not installed or not in PATH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Git for Windows:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://git-scm.com/download/win" -ForegroundColor White
    Write-Host "  2. Run the installer" -ForegroundColor White
    Write-Host "  3. Select 'Git Bash Here' and 'Git CMD'" -ForegroundColor White
    Write-Host "  4. Restart PowerShell and try again" -ForegroundColor White
    Write-Host ""
    Write-Host "Or install via Winget:" -ForegroundColor Yellow
    Write-Host "  winget install Git.Git" -ForegroundColor White
    exit 1
}

# Auto-update setup
if ($AutoUpdate) {
    Write-Host "Setting up automatic updates..." -ForegroundColor Cyan
    Write-Host ""
    
    # Create update script that runs silently
    $silentUpdateScript = @"
`$ErrorActionPreference = 'SilentlyContinue'
`$logFile = "`$env:USERPROFILE\ats-automation\update.log"
`$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Set-Location `$env:USERPROFILE\ats-automation

# Check for Git
`$gitPath = `$null
if (Get-Command git -ErrorAction SilentlyContinue) {
    `$gitPath = "git"
} elseif (Test-Path "C:\Program Files\Git\cmd\git.exe") {
    `$gitPath = "C:\Program Files\Git\cmd\git.exe"
}

if (`$gitPath) {
    # Stash local changes, pull, then pop stash
    & `$gitPath stash --quiet 2>`$null
    & `$gitPath pull origin main --quiet 2>`$null
    & `$gitPath stash pop --quiet 2>`$null
    
    `$result = "Success"
} else {
    `$result = "Git not found"
}

# Log result
`$logEntry = "`$timestamp - `$result - ATS update`n"
Add-Content -Path `$logFile -Value `$logEntry
"@
    
    $scriptPath = "$installPath\auto-update.ps1"
    $silentUpdateScript | Out-File -FilePath $scriptPath -Encoding UTF8
    Write-Host "Created: $scriptPath" -ForegroundColor Green
    
    # Create scheduled task
    $taskName = "ATS Automation Auto-Update"
    
    # Remove existing task
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    
    # Parse schedule time
    $hour, $minute = $Schedule -split ":"
    
    # Create action
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
    
    # Create trigger (daily at specified time)
    $trigger = New-ScheduledTaskTrigger -Daily -At $Schedule
    
    # Create settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    # Register task
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "ATS Automation auto-update from GitHub" | Out-Null
    
    Write-Host ""
    Write-Host "Auto-update scheduled at $Schedule daily" -ForegroundColor Green
    Write-Host ""
    Write-Host "To check status:" -ForegroundColor Yellow
    Write-Host "  Get-ScheduledTask -TaskName 'ATS Automation Auto-Update'" -ForegroundColor White
    Write-Host ""
    Write-Host "To disable:" -ForegroundColor Yellow
    Write-Host "  Unregister-ScheduledTask -TaskName 'ATS Automation Auto-Update'" -ForegroundColor White
    Write-Host ""
    Write-Host "To run manually now:" -ForegroundColor Yellow
    Write-Host "  Start-ScheduledTask -TaskName 'ATS Automation Auto-Update'" -ForegroundColor White
    exit 0
}

# Manual update
Write-Host "Pulling latest changes..." -ForegroundColor Yellow
& $gitCmd pull origin main

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
    & $gitCmd stash
    & $gitCmd pull origin main
}

Write-Host ""
Write-Host "Update complete!" -ForegroundColor Green

Write-Host ""
Write-Host "To set up automatic daily updates:" -ForegroundColor Yellow
Write-Host "  .\update.ps1 -AutoUpdate" -ForegroundColor White
Write-Host "  Or: .\update.ps1 -AutoUpdate -Schedule '9:00'" -ForegroundColor White
