# ATS Automation - Windows Installation Script
# Run this in PowerShell as Administrator

Write-Host "Installing ATS Automation..." -ForegroundColor Cyan

# Check for Git
$gitCmd = $null
if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitCmd = "git"
} elseif (Test-Path "C:\Program Files\Git\cmd\git.exe") {
    $gitCmd = "C:\Program Files\Git\cmd\git.exe"
} elseif (Test-Path "C:\Program Files (x86)\Git\cmd\git.exe") {
    $gitCmd = "C:\Program Files (x86)\Git\cmd\git.exe"
}

# Check for Python
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} elseif (Test-Path "C:\Python311\python.exe") {
    $pythonCmd = "C:\Python311\python.exe"
} elseif (Test-Path "C:\Python310\python.exe") {
    $pythonCmd = "C:\Python310\python.exe"
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe") {
    $pythonCmd = "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe") {
    $pythonCmd = "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe"
}

if (-not $pythonCmd) {
    Write-Host "ERROR: Python not found!" -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found Python: $pythonCmd" -ForegroundColor Green

if (-not $gitCmd) {
    Write-Host "WARNING: Git not found. Will download as ZIP instead." -ForegroundColor Yellow
}

# Clone the repository
$repoUrl = "https://github.com/vtion001/ats-automation.git"
$installPath = "$env:USERPROFILE\ats-automation"

Write-Host "Cloning repository to $installPath..." -ForegroundColor Yellow

# Handle existing folder - try to remove, if fails, use different name
if (Test-Path $installPath) {
    Write-Host "Removing existing installation..." -ForegroundColor Yellow
    try {
        # Try to remove with retries
        $removed = $false
        for ($i = 0; $i -lt 3; $i++) {
            try {
                Remove-Item -Recurse -Force $installPath -ErrorAction Stop
                $removed = $true
                break
            } catch {
                Start-Sleep -Seconds 2
            }
        }
        if (-not $removed) {
            # If can't remove, use temp name
            $installPath = "$env:TEMP\ats-automation-new"
            Write-Host "Using alternate path: $installPath" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Could not remove existing folder - continuing with existing installation" -ForegroundColor Yellow
    }
}

# Clone via git or download zip
$cloned = $false
if ($gitCmd) {
    try {
        & $gitCmd clone $repoUrl $installPath --quiet 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Repository cloned successfully!" -ForegroundColor Green
            $cloned = $true
        }
    } catch {
        # Fall through to ZIP download
    }
}

if (-not $cloned) {
    # Fallback: download zip
    Write-Host "Downloading repository as ZIP..." -ForegroundColor Yellow
    $zipUrl = "https://github.com/vtion001/ats-automation/archive/refs/heads/main.zip"
    $zipPath = "$env:TEMP\ats-automation.zip"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP" -Force
    $extractedPath = "$env:TEMP\ats-automation-main"
    if (Test-Path $extractedPath) {
        if (Test-Path $installPath) {
            Remove-Item -Recurse -Force $installPath -ErrorAction SilentlyContinue
        }
        Move-Item -Path $extractedPath -Destination $installPath -Force
        Write-Host "Repository downloaded successfully!" -ForegroundColor Green
    }
}

# Change to install directory
Set-Location $installPath -ErrorAction SilentlyContinue

# Install Python dependencies using python -m pip
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow

if (Test-Path "requirements.txt") {
    & $pythonCmd -m pip install -r requirements.txt 2>$null
    if ($LASTEXITCODE -ne 0) {
        # Try with --user flag
        & $pythonCmd -m pip install --user -r requirements.txt
    }
}

if (Test-Path "requirements-server.txt") {
    & $pythonCmd -m pip install -r requirements-server.txt 2>$null
    if ($LASTEXITCODE -ne 0) {
        & $pythonCmd -m pip install --user -r requirements-server.txt
    }
}

# Create .env file from template
if (Test-Path ".env.example") {
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env file - please configure your API keys" -ForegroundColor Yellow
    }
}

# Offer to set up auto-update
Write-Host ""
Write-Host "Auto-Update Setup:" -ForegroundColor Cyan
$autoUpdate = Read-Host "Would you like to set up automatic daily updates? (y/n)"
if ($autoUpdate -eq "y" -or $autoUpdate -eq "Y") {
    $schedule = Read-Host "What time (24h format, default: 8)?"
    if (-not $schedule) { $schedule = "8:00" }
    Write-Host "Setting up auto-update at $schedule..." -ForegroundColor Yellow
    & "$installPath\update.ps1" -AutoUpdate -Schedule $schedule
}

# Chrome Extension
Write-Host ""
Write-Host "Chrome Extension Installation:" -ForegroundColor Cyan
Write-Host "1. Open Chrome and navigate to chrome://extensions/" -ForegroundColor White
Write-Host "2. Enable 'Developer mode' (top right)" -ForegroundColor White  
Write-Host "3. Click 'Load unpacked'" -ForegroundColor White
Write-Host "4. Select: $installPath\chrome-extension" -ForegroundColor White

Write-Host ""
Write-Host "Server Installation:" -ForegroundColor Cyan
Write-Host "1. Configure .env with your OPENROUTER_API_KEY" -ForegroundColor White
Write-Host "2. Run: python server\main.py" -ForegroundColor White
Write-Host "3. Or deploy to Azure Container Apps" -ForegroundColor White

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
