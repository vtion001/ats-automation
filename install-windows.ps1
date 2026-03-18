# ATS Automation - Windows Installation Script
param(
    [switch]$SkipGitInstall,
    [string]$RemoteLogUrl=""
)

Write-Host "======================================"
Write-Host "ATS Automation - Installer"
Write-Host "======================================"
Write-Host ""

# Check Python
$pythonCmd = $null
$pythonPaths = @("python","python3","C:\Python311\python.exe","C:\Python310\python.exe","C:\Python39\python.exe")
foreach ($p in $pythonPaths) {
    try {
        $ver = & $p --version 2>&1
        if ($LASTEXITCODE -eq 0 -and $ver -match "Python 3") {
            $pythonCmd = $p
            break
        }
    } catch {}
}
if (-not $pythonCmd) {
    Write-Host "ERROR: Python 3.9+ not found!" -Foreground Red
    Write-Host "Install from: https://www.python.org/downloads/" -Foreground Yellow
    exit 1
}
Write-Host "Found Python: $pythonCmd"
$pythonVersion = & $pythonCmd --version 2>&1
Write-Host "Version: $pythonVersion"

# Check Git
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
    Write-Host "Git not found. Will download as ZIP." -Foreground Yellow
}

# Install
$repoUrl = "https://github.com/vtion001/ats-automation.git"
$installPath = "$env:USERPROFILE\ats-automation"
Write-Host "Installing to: $installPath"

if (Test-Path $installPath) {
    Write-Host "Removing existing installation..."
    Remove-Item -Recurse -Force $installPath -ErrorAction SilentlyContinue
}

if ($gitCmd) {
    Write-Host "Cloning repository..."
    & $gitCmd clone $repoUrl $installPath --quiet 2>$null
} else {
    Write-Host "Downloading from GitHub..."
    $zipUrl = "https://github.com/vtion001/ats-automation/archive/refs/heads/main.zip"
    $zipPath = "$env:TEMP\ats-automation.zip"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP" -Force
    Move-Item -Path "$env:TEMP\ats-automation-main" -Destination $installPath -Force
}
Write-Host "Installation complete!"

Set-Location $installPath

# Install dependencies
Write-Host "Installing Python dependencies..."
foreach ($req in @("requirements.txt","requirements-server.txt")) {
    if (Test-Path $req) {
        & $pythonCmd -m pip install -r $req --quiet 2>$null
    }
}
Write-Host "Dependencies installed!"

# Create .env if needed
if ((Test-Path ".env.example") -and (-not (Test-Path ".env"))) {
    Copy-Item ".env.example" ".env"
}

# Setup auto-update
if ($gitCmd) {
    Write-Host "Setting up GitHub Auto-Sync..."
    & "$installPath\update.ps1" -AutoUpdate -IntervalMinutes 30
    Write-Host "GitHub Auto-Sync enabled!" -Foreground Green
} else {
    Write-Host "GitHub Auto-Sync: DISABLED (Git not installed)" -Foreground Yellow
}

Write-Host ""
Write-Host "======================================"
Write-Host "Installation Complete!"
Write-Host "======================================"
Write-Host ""
Write-Host "Next Steps:"
Write-Host "  1. Load Chrome Extension:"
Write-Host "     - Open: chrome://extensions/"
Write-Host "     - Enable: Developer mode"
Write-Host "     - Click: Load unpacked"
Write-Host "     - Select: $installPath\chrome-extension"
Write-Host ""
Write-Host "  2. Azure AI Server is pre-configured!"
Write-Host ""
if ($gitCmd) {
    Write-Host "Auto-Sync active. Check updates with:"
    Write-Host "  .\update.ps1 -CheckOnly"
}
Write-Host ""
