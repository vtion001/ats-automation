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

# Create installation directory first
if (-not (Test-Path $INSTALL_DIR)) {
    New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
}

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

# Get Chrome preferences path
function Get-ChromePreferencesPath {
    $chromeVersion = (Get-Item $CHROME_PATH).VersionInfo.FileVersion
    $basePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default"
    return $basePath
}

# Install extension properly to Chrome
function Install-ExtensionToChrome {
    param([string]$ExtensionPath, [string]$ChromePath)
    
    Write-Color "[4/6] Installing extension to Chrome..." "Yellow"
    
    # Method 1: Use Chrome's preferences to load unpacked extension
    $prefsPath = Get-ChromePreferencesPath
    $extensionsPrefsFile = "$prefsPath\Extension Preferences"
    
    # Get extension ID from manifest (use path hash as ID)
    $manifestPath = Join-Path $ExtensionPath "manifest.json"
    if (-not (Test-Path $manifestPath)) {
        Write-Color "    Warning: manifest.json not found" "Yellow"
        return $false
    }
    
    # Create a simple extension loader via preferences
    # This tells Chrome to load the unpacked extension on startup
    
    # Method 2: Copy extension to Chrome's unpacked extensions folder
    $unpackedExtPath = "$prefsPath\Extensions"
    if (-not (Test-Path $unpackedExtPath)) {
        New-Item -ItemType Directory -Path $unpackedExtPath -Force | Out-Null
    }
    
    # Create a unique folder for our extension
    $ourExtPath = Join-Path $unpackedExtPath "ags_automation"
    if (Test-Path $ourExtPath) {
        Remove-Item $ourExtPath -Recurse -Force
    }
    
    # Copy extension files
    Copy-Item -Path $ExtensionPath -Destination $ourExtPath -Recurse -Force
    
    Write-Color "    Extension files copied to: $ourExtPath" "Green"
    
    # Method 3: Create a shortcut that loads extension (most reliable)
    # This is already handled in Start-Extension
    
    return $true
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
    
    # Remove existing extraction if any
    $existingExtracted = "$INSTALL_DIR\ats-automation-main"
    if (Test-Path $existingExtracted) {
        Remove-Item $existingExtracted -Recurse -Force
    }
    
    # Extract
    Expand-Archive -Path $zipPath -DestinationPath $INSTALL_DIR -Force
    
    # Fix: Find the actual chrome-extension folder
    $extractedRoot = "$INSTALL_DIR\ats-automation-main"
    
    # Verify structure and fix if needed
    $sourceChromeExt = "$extractedRoot\chrome-extension"
    $targetChromeExt = "$INSTALL_DIR\chrome-extension"
    
    if (Test-Path $sourceChromeExt) {
        # Remove target if exists
        if (Test-Path $targetChromeExt) {
            Remove-Item $targetChromeExt -Recurse -Force
        }
        # Move to correct location
        Move-Item -Path $sourceChromeExt -Destination $targetChromeExt
        Write-Color "    Extension files moved to: $targetChromeExt" "Green"
    } else {
        # Check if already at root level
        $altPath = "$INSTALL_DIR\chrome-extension"
        if (Test-Path $altPath) {
            Write-Color "    Extension already in correct location" "Green"
        } else {
            Write-Color "    [ERROR] chrome-extension folder not found!" "Red"
            Write-Color "    Extracted contents: $(Get-ChildItem $INSTALL_DIR | Select-Object -ExpandProperty Name)" "Yellow"
        }
    }
    
    # Also move other important folders
    $foldersToMove = @("clients", "config", "server")
    foreach ($folder in $foldersToMove) {
        $srcFolder = "$extractedRoot\$folder"
        $destFolder = "$INSTALL_DIR\$folder"
        if (Test-Path $srcFolder) {
            if (Test-Path $destFolder) {
                Remove-Item $destFolder -Recurse -Force
            }
            Move-Item -Path $srcFolder -Destination $destFolder
        }
    }
    
    # Remove the extracted root folder
    if (Test-Path $extractedRoot) {
        Remove-Item $extractedRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Verify manifest.json exists
    $manifestPath = "$INSTALL_DIR\chrome-extension\manifest.json"
    if (Test-Path $manifestPath) {
        Write-Color "    manifest.json verified!" "Green"
    } else {
        Write-Color "    [ERROR] manifest.json NOT FOUND at: $manifestPath" "Red"
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
        aiServerUrl = "https://ags-ai-server.azurewebsites.net"
        salesforceUrl = "https://flyland.my.salesforce.com"
        ctmUrl = "https://app.calltrackingmetrics.com"
    }
    
    # Convert to JSON and save
    $config | ConvertTo-Json | Out-File -FilePath "$INSTALL_DIR\config.json" -Encoding UTF8
    
    Write-Color "    Pre-configured for Flyland" "Green"
    Write-Color "    AI Server: $($config.aiServerUrl)" "Cyan"
    Write-Color "    Salesforce: $($config.salesforceUrl)" "Cyan"
}

# Load extension in Chrome - PROPER METHOD
function Start-Extension {
    Write-Color "[4/6] Loading extension in Chrome..." "Yellow"
    
    # Verify extension directory exists
    $extDir = "$INSTALL_DIR\chrome-extension"
    $manifestPath = "$extDir\manifest.json"
    
    if (-not (Test-Path $extDir)) {
        Write-Color "    [ERROR] Extension directory not found: $extDir" "Red"
        return
    }
    
    if (-not (Test-Path $manifestPath)) {
        Write-Color "    [ERROR] manifest.json not found: $manifestPath" "Red"
        Write-Color "    Directory contents: $(Get-ChildItem $extDir | Select-Object -ExpandProperty Name)" "Yellow"
        return
    }
    
    Write-Color "    Extension directory: $extDir" "Green"
    Write-Color "    manifest.json: FOUND" "Green"
    
    $chrome = Test-Chrome
    if (-not $chrome) {
        Write-Color "    Chrome not found. Please install Chrome first." "Red"
        return
    }
    
    # Kill any existing Chrome with extension (to refresh)
    Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    # Build extension path - use absolute path
    $extPath = (Resolve-Path $extDir).Path
    Write-Color "    Resolved path: $extPath" "Cyan"
    
    # Start Chrome with extension loaded - use --load-extension with absolute path
    $args = @(
        "--load-extension=$extPath",
        "--enable-aggregated-page-throttling",
        "--no-first-run",
        "--no-default-browser-check"
    )
    
    Start-Process -FilePath $chrome -ArgumentList $args -WindowStyle Normal
    
    Write-Color "    Chrome opened with extension!" "Green"
    Write-Color "    (Extension will load automatically on Chrome startup)" "Yellow"
}

# Create shortcuts
function New-Shortcuts {
    Write-Color "[5/6] Creating shortcuts..." "Yellow"
    
    # Get the resolved extension path
    $extPath = (Resolve-Path "$INSTALL_DIR\chrome-extension").Path
    $chromePath = Test-Chrome
    
    if (-not $chromePath) {
        Write-Color "    Chrome not found, skipping shortcuts" "Yellow"
        return
    }
    
    # Desktop shortcut
    $desktop = [Environment]::GetFolderPath("Desktop")
    $shortcut = "$desktop\AGS Automation.lnk"
    
    $shell = New-Object -ComObject WScript.Shell
    $short = $shell.CreateShortcut($shortcut)
    $short.TargetPath = $chromePath
    $short.Arguments = "--load-extension=`"$extPath`" --enable-aggregated-page-throttling --no-first-run --no-default-browser-check"
    $short.WorkingDirectory = $INSTALL_DIR
    $short.Description = "AGS Automation Tool - Click to open with extension loaded"
    $short.Save()
    
    Write-Color "    Desktop shortcut created" "Green"
    
    # Also create a "Open with Extension" shortcut
    $openShortcut = "$desktop\AGS - Open Chrome.lnk"
    $short2 = $shell.CreateShortcut($openShortcut)
    $short2.TargetPath = $chromePath
    $short2.Arguments = "--load-extension=`"$extPath`" --enable-aggregated-page-throttling --no-first-run --no-default-browser-check"
    $short2.WorkingDirectory = $INSTALL_DIR
    $short2.Description = "Open Chrome with AGS Extension"
    $short2.Save()
    
    Write-Color "    Chrome shortcut created" "Green"
}

# Setup auto-update
function Register-AutoUpdate {
    Write-Color "[6/6] Setting up auto-update..." "Yellow"
    
    # Get the resolved path for use in update script
    $installDirEscaped = $INSTALL_DIR -replace '\\', '\\\\'
    
    # Create update script
    $updateScript = @"
`$ErrorActionPreference = "Stop"
`$INSTALL_DIR = "$installDirEscaped"
`$REPO_URL = "https://github.com/vtion001/ats-automation"

Write-Host "Checking for updates..." -ForegroundColor Cyan

# Download latest
`$zipUrl = "`$REPO_URL/archive/refs/heads/main.zip"
`$zipPath = "`$env:TEMP\ags-update.zip"

Invoke-WebRequest -Uri `$zipUrl -OutFile `$zipPath -UseBasicParsing

# Extract
`$extractedDir = "`$INSTALL_DIR\ats-automation-main"
Expand-Archive -Path `$zipPath -DestinationPath `$INSTALL_DIR -Force

# Move chrome-extension folder if needed
`$sourceExt = "`$extractedDir\chrome-extension"
`$targetExt = "`$INSTALL_DIR\chrome-extension"
if (Test-Path `$sourceExt) {
    if (Test-Path `$targetExt) { Remove-Item `$targetExt -Recurse -Force }
    Move-Item -Path `$sourceExt -Destination `$targetExt
}

# Remove extracted root
if (Test-Path `$extractedDir) { Remove-Item `$extractedDir -Recurse -Force }
Remove-Item `$zipPath -Force

Write-Host "Update complete!" -ForegroundColor Green

# Restart Chrome with new extension (use resolved path)
`$chrome = Get-Process chrome -ErrorAction SilentlyContinue
if (`$chrome) {
    Stop-Process -Name chrome -Force
    Start-Sleep -Seconds 2
    
    `$extPath = (Resolve-Path "`$INSTALL_DIR\chrome-extension").Path
    `$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    Start-Process `$chromePath -ArgumentList "--load-extension=`"$extPath`" --enable-aggregated-page-throttling --no-first-run --no-default-browser-check"
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
    
    # Remove desktop shortcuts
    $desktop = [Environment]::GetFolderPath("Desktop")
    "$desktop\AGS Automation.lnk" | ForEach-Object { if (Test-Path $_) { Remove-Item $_ -Force } }
    "$desktop\AGS - Open Chrome.lnk" | ForEach-Object { if (Test-Path $_) { Remove-Item $_ -Force } }
    
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
    
    # Show final instructions
    Write-Color "`n========================================" "Green"
    Write-Color "  Installation Complete!" "Green"
    Write-Color "========================================" "Green"
    Write-Color "`nIf extension is not showing, follow these steps:" "Yellow"
    Write-Color "1. Click the desktop shortcut 'AGS - Open Chrome'" "White"
    Write-Color "   OR" "White"
    Write-Color "2. Go to: chrome://extensions/" "Cyan"
    Write-Color "3. Enable 'Developer mode' (top right toggle)" "Cyan"
    Write-Color "4. Click 'Load unpacked'" "Cyan"
    Write-Color "5. Select: $INSTALL_DIR\chrome-extension" "Cyan"
    Write-Color "`nPin the extension to your toolbar!" "White"
    Write-Color "`n========================================`n" "Green"
    
    Write-Log "Installation complete"
}

# Run
Start-Install
