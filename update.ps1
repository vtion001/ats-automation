# ATS Automation - Update Script
# Run this in PowerShell to pull latest changes
# 
# Usage:
#   irm https://raw.githubusercontent.com/vtion001/ats-automation/main/update.ps1 | iex
#   To set up auto-update: .\update.ps1 -AutoUpdate
#   To check for updates:  .\update.ps1 -CheckOnly

param(
    [switch]$AutoUpdate,
    [switch]$CheckOnly,
    [string]$Schedule = "8:00",
    [int]$IntervalMinutes = 30  # Check every 30 minutes
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
    Write-Host "  winget install Git.Git" -ForegroundColor White
    Write-Host "  Then restart PowerShell" -ForegroundColor White
    exit 1
}

# Check for updates function
function Test-GitHubUpdates {
    Write-Host "Checking GitHub for updates..." -ForegroundColor Cyan
    
    # Fetch latest refs
    & $gitCmd fetch origin --quiet 2>$null
    
    # Compare local HEAD with origin
    $localHash = & $gitCmd rev-parse HEAD 2>$null
    $remoteHash = & $gitCmd rev-parse origin/main 2>$null
    
    if ($LASTEXITCODE -ne 0 -or -not $localHash -or -not $remoteHash) {
        return @{ HasUpdate = $false; Local = ""; Remote = "" }
    }
    
    return @{
        HasUpdate = ($localHash -ne $remoteHash)
        Local = $localHash
        Remote = $remoteHash
    }
}

# Check-only mode
if ($CheckOnly) {
    $result = Test-GitHubUpdates
    if ($result.HasUpdate) {
        Write-Host "Updates available!" -ForegroundColor Green
        Write-Host "  Local:  $($result.Local.Substring(0,7))"
        Write-Host "  Remote: $($result.Remote.Substring(0,7))"
        Write-Host ""
        Write-Host "To update: .\update.ps1" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "You're up to date!" -ForegroundColor Green
        exit 0
    }
}

# Auto-update setup
if ($AutoUpdate) {
    Write-Host "Setting up automatic GitHub sync..." -ForegroundColor Cyan
    Write-Host ""
    
    # Create update script
    $silentUpdateScript = @"
`$ErrorActionPreference = 'SilentlyContinue'
`$logFile = "`$env:USERPROFILE\ats-automation\update.log"
`$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Set-Location `$env:USERPROFILE\ats-automation

`$gitPath = `$null
if (Get-Command git -ErrorAction SilentlyContinue) {
    `$gitPath = "git"
} elseif (Test-Path "C:\Program Files\Git\cmd\git.exe") {
    `$gitPath = "C:\Program Files\Git\cmd\git.exe"
}

if (`$gitPath) {
    # Fetch and check for updates
    & `$gitPath fetch origin --quiet 2>`$null
    
    `$localHash = & `$gitPath rev-parse HEAD 2>`$null
    `$remoteHash = & `$gitPath rev-parse origin/main 2>`$null
    
    if (`$localHash -ne `$remoteHash -and `$remoteHash) {
        # Updates available - pull them
        & `$gitPath stash --quiet 2>`$null
        & `$gitPath pull origin main --quiet 2>`$null
        & `$gitPath stash pop --quiet 2>`$null
        `$result = "Updated: `$(`$remoteHash.Substring(0,7))"
        
        # Check and install new dependencies
        if (Test-Path "requirements.txt") {
            `$pythonCmd = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "python3" }
            if (`$pythonCmd) { & `$pythonCmd -m pip install -r requirements.txt --quiet 2>`$null }
        }
    } else {
        `$result = "Up to date"
    }
} else {
    `$result = "Git not found"
}

Add-Content -Path `$logFile -Value "`$timestamp - `$(`$result)"
"@
    
    $scriptPath = "$installPath\auto-update.ps1"
    $silentUpdateScript | Out-File -FilePath $scriptPath -Encoding UTF8
    Write-Host "Created: $scriptPath" -ForegroundColor Green
    
    # Remove existing tasks
    Unregister-ScheduledTask -TaskName "ATS Automation Auto-Update" -Confirm:$false -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName "ATS Automation GitHub Sync" -Confirm:$false -ErrorAction SilentlyContinue
    
    # Create action
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
    
    # Create trigger - repeat every X minutes
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 9999)
    
    # Create settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
    
    # Register task
    Register-ScheduledTask -TaskName "ATS Automation GitHub Sync" -Action $action -Trigger $trigger -Settings $settings -Description "ATS Automation - Check GitHub for updates every $IntervalMinutes minutes" | Out-Null
    
    Write-Host ""
    Write-Host "GitHub Sync Active!" -ForegroundColor Green
    Write-Host "  Checks every $IntervalMinutes minutes for updates"
    Write-Host ""
    Write-Host "To check status:" -ForegroundColor Yellow
    Write-Host "  Get-ScheduledTask -TaskName 'ATS Automation GitHub Sync'" -ForegroundColor White
    Write-Host ""
    Write-Host "To disable:" -ForegroundColor Yellow
    Write-Host "  Unregister-ScheduledTask -TaskName 'ATS Automation GitHub Sync'" -ForegroundColor White
    Write-Host ""
    Write-Host "To check manually:" -ForegroundColor Yellow
    Write-Host "  .\update.ps1 -CheckOnly" -ForegroundColor White
    Write-Host ""
    Write-Host "Update log: $installPath\update.log" -ForegroundColor Cyan
    exit 0
}

# Manual update
Write-Host "Checking GitHub for updates..." -ForegroundColor Cyan
$result = Test-GitHubUpdates

if ($result.HasUpdate) {
    Write-Host "Updates found!" -ForegroundColor Yellow
    Write-Host "  Local:  $($result.Local.Substring(0,7))"
    Write-Host "  Remote: $($result.Remote.Substring(0,7))"
    Write-Host ""
    Write-Host "Pulling latest changes..." -ForegroundColor Yellow
    & $gitCmd stash --quiet 2>$null
    & $gitCmd pull origin main --quiet 2>$null
    & $gitCmd stash pop --quiet 2>$null
    
    # Check for new dependencies
    if (Test-Path "requirements.txt") {
        Write-Host "Checking for new dependencies..." -ForegroundColor Yellow
        $pythonCmd = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "python3" }
        if ($pythonCmd) { & $pythonCmd -m pip install -r requirements.txt --quiet 2>$null }
    }
    
    Write-Host ""
    Write-Host "Updated successfully!" -ForegroundColor Green
} else {
    Write-Host "You're up to date!" -ForegroundColor Green
}

Write-Host ""
Write-Host "To enable automatic GitHub sync:" -ForegroundColor Yellow
Write-Host "  .\update.ps1 -AutoUpdate" -ForegroundColor White
Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
