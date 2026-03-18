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
    [int]$IntervalMinutes = 30
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

# Find Git executable
function Get-GitPath {
    $paths = @("git", "C:\Program Files\Git\cmd\git.exe", "C:\Program Files (x86)\Git\cmd\git.exe")
    foreach ($p in $paths) {
        try {
            $result = & $p --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                return $p
            }
        } catch { continue }
    }
    return $null
}

$gitCmd = Get-GitPath

if (-not $gitCmd) {
    Write-Host "ERROR: Git is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Git to enable auto-updates:" -ForegroundColor Yellow
    Write-Host "  winget install Git.Git" -ForegroundColor White
    Write-Host "  Restart PowerShell" -ForegroundColor White
    exit 1
}

# Auto-update setup
if ($AutoUpdate) {
    Write-Host "Setting up automatic GitHub sync..." -ForegroundColor Cyan
    Write-Host ""
    
    # Get absolute path to git
    $gitFullPath = $gitCmd
    if ($gitCmd -eq "git") {
        $gitFullPath = (Get-Command git).Source
    }
    
    # Create the sync script
    $syncScript = @"
# ATS Auto-Sync Script
# This runs every $IntervalMinutes minutes to check for updates

`$ErrorActionPreference = 'SilentlyContinue'
`$logFile = "`$env:USERPROFILE\ats-automation\update.log"
`$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
`$gitPath = "$gitFullPath"

Set-Location `$env:USERPROFILE\ats-automation

# Check for updates
& `$gitPath fetch origin --quiet 2>`$null
`$localHash = & `$gitPath rev-parse HEAD 2>`$null
`$remoteHash = & `$gitPath rev-parse origin/main 2>`$null

if (`$localHash -ne `$remoteHash -and `$remoteHash) {
    # Update available - pull
    & `$gitPath stash --quiet 2>`$null
    & `$gitPath pull origin main 2>`$null
    & `$gitPath stash pop --quiet 2>`$null
    
    # Install any new Python dependencies
    `$python = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "python3" }
    if (`$python) {
        & `$python -m pip install -r requirements.txt --quiet 2>`$null
    }
    
    `$status = "Updated to " + `$remoteHash.Substring(0,7)
} else {
    `$status = "Up to date"
}

# Log
"`$timestamp - `$(`$status)" | Add-Content -Path `$logFile -Encoding UTF8
"@

    # Save sync script
    $syncScriptPath = "$installPath\ats-sync.ps1"
    $syncScript | Out-File -FilePath $syncScriptPath -Encoding UTF8
    Write-Host "Created sync script: $syncScriptPath" -ForegroundColor Green
    
    # Remove existing scheduled tasks
    Unregister-ScheduledTask -TaskName "ATS Automation GitHub Sync" -Confirm:$false -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName "ATS Automation AutoUpdate" -Confirm:$false -ErrorAction SilentlyContinue
    
    # Create the scheduled task action
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$syncScriptPath`""
    
    # Create trigger - run every X minutes starting NOW
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration ([TimeSpan]::MaxValue)
    
    # Task settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
    
    # Register the task as the current user
    $user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    Register-ScheduledTask -TaskName "ATS Automation GitHub Sync" -Action $action -Trigger $trigger -Settings $settings -Description "Checks GitHub for ATS Automation updates every $IntervalMinutes minutes" -User $user | Out-Null
    
    Write-Host ""
    Write-Host "GitHub Auto-Sync Enabled!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Task Name: ATS Automation GitHub Sync"
    Write-Host "  Interval: Every $IntervalMinutes minutes"
    Write-Host "  Status: Active"
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  View status:  Get-ScheduledTask -TaskName 'ATS Automation GitHub Sync'" -ForegroundColor White
    Write-Host "  Run now:     Start-ScheduledTask -TaskName 'ATS Automation GitHub Sync'" -ForegroundColor White
    Write-Host "  View logs:   Get-Content `$env:USERPROFILE\ats-automation\update.log -Tail 10" -ForegroundColor White
    Write-Host "  Check updates: .\update.ps1 -CheckOnly" -ForegroundColor White
    Write-Host "  Disable:     Unregister-ScheduledTask -TaskName 'ATS Automation GitHub Sync'" -ForegroundColor White
    Write-Host ""
    
    # Run it now to test
    Write-Host "Running sync now..." -ForegroundColor Cyan
    Start-ScheduledTask -TaskName "ATS Automation GitHub Sync"
    Start-Sleep -Seconds 2
    
    exit 0
}

# Check-only mode
if ($CheckOnly) {
    Write-Host "Checking GitHub for updates..." -ForegroundColor Cyan
    & $gitCmd fetch origin --quiet 2>$null
    $localHash = & $gitCmd rev-parse HEAD 2>$null
    $remoteHash = & $gitCmd rev-parse origin/main 2>$null
    
    if ($localHash -ne $remoteHash) {
        Write-Host "Updates available!" -ForegroundColor Yellow
        Write-Host "  Local:  $($localHash.Substring(0,7))"
        Write-Host "  Remote: $($remoteHash.Substring(0,7))"
        Write-Host ""
        Write-Host "To update: .\update.ps1" -ForegroundColor White
        exit 1
    } else {
        Write-Host "You're up to date!" -ForegroundColor Green
        Write-Host "  Commit: $($localHash.Substring(0,7))"
        exit 0
    }
}

# Manual update
Write-Host "Checking GitHub for updates..." -ForegroundColor Cyan
& $gitCmd fetch origin --quiet 2>$null
$localHash = & $gitCmd rev-parse HEAD 2>$null
$remoteHash = & $gitCmd rev-parse origin/main 2>$null

if ($localHash -ne $remoteHash) {
    Write-Host "Updates found!" -ForegroundColor Yellow
    Write-Host "  Local:  $($localHash.Substring(0,7))"
    Write-Host "  Remote: $($remoteHash.Substring(0,7))"
    Write-Host ""
    Write-Host "Pulling changes..." -ForegroundColor Yellow
    & $gitCmd stash --quiet 2>$null
    & $gitCmd pull origin main 2>$null
    & $gitCmd stash pop --quiet 2>$null
    
    # Install new dependencies
    $python = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "python3" }
    if ($python) { & $python -m pip install -r requirements.txt --quiet 2>$null }
    
    Write-Host ""
    Write-Host "Updated!" -ForegroundColor Green
} else {
    Write-Host "You're up to date!" -ForegroundColor Green
}

Write-Host ""
Write-Host "To enable auto-sync:" -ForegroundColor Yellow
Write-Host "  .\update.ps1 -AutoUpdate" -ForegroundColor White
Write-Host ""
