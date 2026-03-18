# ATS Automation - Update Script
param(
    [switch]$AutoUpdate,
    [switch]$CheckOnly,
    [int]$IntervalMinutes=30
)

Write-Host "ATS Automation Updater"
Write-Host "========================"
Write-Host ""

$installPath = "$env:USERPROFILE\ats-automation"
if (-not (Test-Path $installPath)) {
    Write-Host "ATS Automation not found. Run install first." -Foreground Red
    exit 1
}

# Find Git
$gitCmd = $null
$gitPaths = @("git","C:\Program Files\Git\cmd\git.exe","C:\Program Files (x86)\Git\cmd\git.exe")
foreach ($g in $gitPaths) {
    try {
        $ver = & $g --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $gitCmd = $g
            break
        }
    } catch {}
}
if (-not $gitCmd) {
    Write-Host "Git not found!" -Foreground Red
    exit 1
}

# Get absolute path
if ($gitCmd -eq "git") {
    $gitFullPath = (Get-Command git).Source
} else {
    $gitFullPath = $gitCmd
}

# Auto-update setup
if ($AutoUpdate) {
    Write-Host "Setting up GitHub Auto-Sync..."
    
    # Create sync script
    $syncScript = @"
`$ErrorActionPreference = 'SilentlyContinue'
`$logFile = "`$env:USERPROFILE\ats-automation\update.log"
`$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
`$gitPath = "$gitFullPath"

Set-Location `$env:USERPROFILE\ats-automation

& `$gitPath fetch origin --quiet 2>`$null
`$localHash = & `$gitPath rev-parse HEAD 2>`$null
`$remoteHash = & `$gitPath rev-parse origin/main 2>`$null

if (`$localHash -ne `$remoteHash -and `$remoteHash) {
    & `$gitPath stash --quiet 2>`$null
    & `$gitPath pull origin main 2>`$null
    & `$gitPath stash pop --quiet 2>`$null
    
    `$python = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "python3" }
    if (`$python) { & `$python -m pip install -r requirements.txt --quiet 2>`$null }
    
    `$status = "Updated to " + `$remoteHash.Substring(0,7)
} else {
    `$status = "Up to date"
}

"`$timestamp - `$(`$status)" | Add-Content -Path `$logFile -Encoding UTF8
"@
    
    $syncPath = "$installPath\ats-sync.ps1"
    $syncScript | Out-File -FilePath $syncPath -Encoding UTF8
    
    # Remove old task
    Unregister-ScheduledTask -TaskName "ATS Automation GitHub Sync" -Confirm:`$false -ErrorAction SilentlyContinue
    
    # Create task
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$syncPath`""
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration ([TimeSpan]::MaxValue)
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
    $user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    Register-ScheduledTask -TaskName "ATS Automation GitHub Sync" -Action $action -Trigger $trigger -Settings $settings -Description "ATS Automation GitHub sync every $IntervalMinutes minutes" -User $user | Out-Null
    
    Write-Host "GitHub Auto-Sync Enabled!" -Foreground Green
    Write-Host "  Interval: Every $IntervalMinutes minutes"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  Status: Get-ScheduledTask -TaskName 'ATS Automation GitHub Sync'"
    Write-Host "  Run now: Start-ScheduledTask -TaskName 'ATS Automation GitHub Sync'"
    Write-Host "  Logs: Get-Content $installPath\update.log -Tail 10"
    Write-Host ""
    
    # Test run
    Write-Host "Running sync now..."
    Start-ScheduledTask -TaskName "ATS Automation GitHub Sync"
    exit 0
}

# Check mode
if ($CheckOnly) {
    Write-Host "Checking GitHub..."
    & $gitCmd fetch origin --quiet 2>$null
    $localHash = & $gitCmd rev-parse HEAD 2>$null
    $remoteHash = & $gitCmd rev-parse origin/main 2>$null
    if ($localHash -ne $remoteHash) {
        Write-Host "Updates available!" -Foreground Yellow
        Write-Host "  Local: $($localHash.Substring(0,7))"
        Write-Host "  Remote: $($remoteHash.Substring(0,7))"
        exit 1
    } else {
        Write-Host "You're up to date!" -Foreground Green
        exit 0
    }
}

# Manual update
Write-Host "Checking GitHub..."
& $gitCmd fetch origin --quiet 2>$null
$localHash = & $gitCmd rev-parse HEAD 2>$null
$remoteHash = & $gitCmd rev-parse origin/main 2>$null

if ($localHash -ne $remoteHash) {
    Write-Host "Updates found!" -Foreground Yellow
    Write-Host "  Local: $($localHash.Substring(0,7))"
    Write-Host "  Remote: $($remoteHash.Substring(0,7))"
    Write-Host "Pulling changes..."
    & $gitCmd stash --quiet 2>$null
    & $gitCmd pull origin main 2>$null
    & $gitCmd stash pop --quiet 2>$null
    Write-Host "Updated!" -Foreground Green
} else {
    Write-Host "You're up to date!" -Foreground Green
}
Write-Host ""
Write-Host "To enable auto-sync: .\update.ps1 -AutoUpdate"
