# AGS Automation Tool - One-Line Installer
# Run this command in PowerShell:
# irm https://raw.githubusercontent.com/vtion001/ats-automation/main/deploy/windows/install.ps1 | iex

param(
    [switch]$AutoUpdate,
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

# Configuration
$REPO_URL = "https://github.com/vtion001/ats-automation"
$RAW_URL = "https://raw.githubusercontent.com/vtion001/ats-automation/main"
$INSTALL_DIR = "$env:LOCALAPPDATA\AGS Automation"
$EXTENSION_DIR = "$INSTALL_DIR\chrome-extension"
$CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$LOG_FILE = "$INSTALL_DIR\install.log"

# Colors
function Write-Color($Message, $Color = "White") {
    $colors = @{
        "Red" = [ConsoleColor]::Red
        "Green" = [ConsoleColor]::Green
        "Yellow" = [ConsoleColor]::Yellow
        "Cyan" = [ConsoleColor]::Cyan
        "White" = [ConsoleColor]::White
    }
    Write-Host $Message -ForegroundColor $colors[$Color]
}

# Logging
function Write-Log($Message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $LOG_FILE -Append -Encoding UTF8
}

# Banner
function Show-Banner {
    Write-Color "`n========================================" "Cyan"
    Write-Color "  AGS Automation Tool Installer" "Cyan"
    Write-Color "========================================`n" "Cyan"
}

# Check Chrome
function Test-Chrome {
    if (Test-Path $CHROME_PATH) {
        return $CHROME_PATH
    }
    $altPaths = @(
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
        "$env:PROGRAMFILES\Google\Chrome\Application\chrome.exe"
    )
    foreach ($path in $altPaths) {
        if (Test-Path $path) { return $path }
    }
    return $null
}

# Download and extract
function Invoke-Download {
    Write-Color "[1/6] Downloading extension..." "Yellow"
    
    $zipUrl = "$REPO_URL/archive/refs/heads/main.zip"
    $zipPath = "$env:TEMP\ags-automation.zip"
    
    try {
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    } catch {
        Write-Color "[ERROR] Failed to download: $_" "Red"
        exit 1
    }
    
    Write-Color "    Download complete!" "Green"
    return $zipPath
}

function Expand-Files($zipPath) {
    Write-Color "[2/6] Extracting files..." "Yellow"
    
    # Create install directory
    if (-not (Test-Path $INSTALL_DIR)) {
        New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
    }
    
    # Extract
    Expand-Archive -Path $zipPath -DestinationPath $INSTALL_DIR -Force
    
    # Move files to correct location
    $extractedDir = "$INSTALL_DIR\ats-automation-main"
    if (Test-Path $extractedDir) {
        Get-ChildItem -Path $extractedDir -File | Move-Item -Destination $INSTALL_DIR -Force
        Get-ChildItem -Path $extractedDir -Directory | ForEach-Object {
            Move-Item -Path $_.FullName -Destination "$INSTALL_DIR\$_" -Force
        }
        Remove-Item $extractedDir -Recurse -Force
    }
    
    Write-Color "    Files extracted to: $INSTALL_DIR" "Green"
}

# Pre-configure settings
function Set-PreConfig {
    Write-Color "[3/6] Pre-configuring settings..." "Yellow"
    
    # Default configuration (Flyland)
    $config = @{
        activeClient = "flyland"
        automationEnabled = $true
        autoSearchSF = $true
        transcriptionEnabled = $true
        aiAnalysisEnabled = $true
        saveMarkdown = $true
        aiServerUrl = "http://4.157.143.70:8000"
        salesforceUrl = "https://flyland.my.salesforce.com"
        ctmUrl = "https://app.calltrackingmetrics.com"
    }
    
    # Convert to JSON and save
    $config | ConvertTo-Json | Out-File -FilePath "$INSTALL_DIR\config.json" -Encoding UTF8
    
    Write-Color "    Pre-configured for Flyland" "Green"
    Write-Color "    AI Server: $($config.aiServerUrl)" "Cyan"
    Write-Color "    Salesforce: $($config.salesforceUrl)" "Cyan"
}

# Load extension in Chrome
function Start-Extension {
    Write-Color "[4/6] Loading extension in Chrome..." "Yellow"
    
    $chrome = Test-Chrome
    if (-not $chrome) {
        Write-Color "    Chrome not found. Extension files ready." "Yellow"
        return
    }
    
    # Close Chrome if running
    Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    # Start Chrome with extension
    $args = @(
        "--load-extension=`"$EXTENSION_DIR`"",
        "--enable-aggregated-page-throttling",
        "--no-first-run"
    )
    
    Start-Process -FilePath $chrome -ArgumentList $args -WindowStyle Hidden
    
    Write-Color "    Extension loaded in Chrome!" "Green"
}

# Create shortcuts
function New-Shortcuts {
    Write-Color "[5/6] Creating shortcuts..." "Yellow"
    
    # Desktop shortcut
    $desktop = [Environment]::GetFolderPath("Desktop")
    $shortcut = "$desktop\AGS Automation.lnk"
    
    $shell = New-Object -ComObject WScript.Shell
    $short = $shell.CreateShortcut($shortcut)
    $short.TargetPath = $CHROME_PATH
    $short.Arguments = "--load-extension=`"$EXTENSION_DIR`" --enable-aggregated-page-throttling"
    $short.WorkingDirectory = $INSTALL_DIR
    $short.Description = "AGS Automation Tool"
    $short.Save()
    
    Write-Color "    Desktop shortcut created" "Green"
}

# Setup auto-update
function Register-AutoUpdate {
    Write-Color "[6/6] Setting up auto-update..." "Yellow"
    
    # Create update script
    $updateScript = @"
`$ErrorActionPreference = "Stop"
`$INSTALL_DIR = "$INSTALL_DIR"
`$REPO_URL = "https://github.com/vtion001/ats-automation"

# Download latest
`$zipUrl = "`$REPO_URL/archive/refs/heads/main.zip"
`$zipPath = "`$env:TEMP\ags-update.zip"

Write-Host "Checking for updates..." -ForegroundColor Cyan
Invoke-WebRequest -Uri `$zipUrl -OutFile `$zipPath -UseBasicParsing

# Extract
`$extractedDir = "`$INSTALL_DIR\ats-automation-main"
Expand-Archive -Path `$zipPath -DestinationPath `$INSTALL_DIR -Force

# Copy new files
Get-ChildItem -Path `$extractedDir -File | ForEach-Object {
    Copy-Item `$_.FullName -Destination `$INSTALL_DIR -Force
}

# Cleanup
Remove-Item `$extractedDir -Recurse -Force
Remove-Item `$zipPath -Force

Write-Host "Update complete!" -ForegroundColor Green

# Restart Chrome with new extension
`$chrome = Get-Process chrome -ErrorAction SilentlyContinue
if (`$chrome) {
    Stop-Process -Name chrome -Force
    Start-Sleep -Seconds 1
    Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--load-extension=`"$INSTALL_DIR\chrome-extension`" --enable-aggregated-page-throttling"
}
"@
    
    $updateScript | Out-File -FilePath "$INSTALL_DIR\update.ps1" -Encoding UTF8
    
    # Create scheduled task (weekly)
    $taskName = "AGS Automation Update"
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$INSTALL_DIR\update.ps1`""
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 9am
    
    # Check if task exists, remove if so
    Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
    
    # Register new task
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description "AGS Automation weekly update" -Force | Out-Null
    
    Write-Color "    Auto-update scheduled (Weekly on Sunday 9am)" "Green"
}

# Uninstall
function Uninstall-AGS {
    Write-Color "Uninstalling AGS Automation..." "Yellow"
    
    # Remove scheduled task
    Get-ScheduledTask -TaskName "AGS Automation Update" -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
    
    # Remove files
    if (Test-Path $INSTALL_DIR) {
        Remove-Item $INSTALL_DIR -Recurse -Force
    }
    
    # Remove desktop shortcut
    $desktop = [Environment]::GetFolderPath("Desktop")
    $shortcut = "$desktop\AGS Automation.lnk"
    if (Test-Path $shortcut) {
        Remove-Item $shortcut -Force
    }
    
    Write-Color "Uninstall complete!" "Green"
}

# Main
function Start-Install {
    Show-Banner
    
    # Check for uninstall
    if ($Uninstall) {
        Uninstall-AGS
        return
    }
    
    # Check for update only
    if ($AutoUpdate) {
        Write-Log "Auto-update triggered"
        $updateScript = "$INSTALL_DIR\update.ps1"
        if (Test-Path $updateScript) {
            & $updateScript
        } else {
            Write-Color "Run full install first: install.ps1" "Yellow"
        }
        return
    }
    
    # Fresh install
    Write-Log "Starting installation"
    
    # Download
    $zipPath = Invoke-Download
    
    # Extract
    Expand-Files $zipPath
    
    # Pre-configure
    Set-PreConfig
    
    # Load extension
    Start-Extension
    
    # Shortcuts
    New-Shortcuts
    
    # Auto-update
    Register-AutoUpdate
    
    # Cleanup
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    
    # Done
    Write-Color "`n========================================" "Green"
    Write-Color "  Installation Complete!" "Green"
    Write-Color "========================================" "Green"
    Write-Color "`nTo use:" "White"
    Write-Color "  1. Pin AGS extension to Chrome toolbar" "Cyan"
    Write-Color "  2. Click to open - ready to use!" "Cyan"
    Write-Color "`nTo update later, run:" "White"
    Write-Color "  powershell -Command `"& '$INSTALL_DIR\update.ps1'`"" "Cyan"
    Write-Color "`n========================================`n" "Green"
    
    Write-Log "Installation complete"
}

# Run
Start-Install
