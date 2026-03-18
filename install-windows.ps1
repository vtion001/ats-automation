# ATS Automation - Windows Installation Script
# Run this in PowerShell as Administrator
#
# Usage:
#   irm https://raw.githubusercontent.com/vtion001/ats-automation/main/install-windows.ps1 | iex

param(
    [switch]$SkipGitInstall
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "ATS Automation - Installer" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check for Python (verify it actually works, not just the MS Store shortcut)
function Test-PythonInstall {
    $pythonPaths = @(
        "python",
        "python3",
        "C:\Python311\python.exe",
        "C:\Python310\python.exe",
        "C:\Python39\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python39\python.exe",
        "C:\Program Files\Python311\python.exe",
        "C:\Program Files\Python310\python.exe"
    )
    
    foreach ($p in $pythonPaths) {
        try {
            $result = & $p --version 2>&1
            if ($LASTEXITCODE -eq 0 -and $result -match "Python 3\.(9|10|11|12|13)") {
                return $p
            }
        } catch {
            continue
        }
    }
    return $null
}

# Check for Git
function Test-GitInstall {
    $gitPaths = @(
        "git",
        "C:\Program Files\Git\cmd\git.exe",
        "C:\Program Files (x86)\Git\cmd\git.exe"
    )
    
    foreach ($g in $gitPaths) {
        try {
            $result = & $g --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                return $g
            }
        } catch {
            continue
        }
    }
    return $null
}

# Install Git using Winget
function Install-Git {
    Write-Host "Installing Git..." -ForegroundColor Yellow
    
    # Check if winget is available
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "Using Winget to install Git..." -ForegroundColor Cyan
        winget install Git.Git --accept-package-agreements --accept-source-agreements --silent
        if ($LASTEXITCODE -eq 0) {
            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            return $true
        }
    }
    
    Write-Host "Could not auto-install Git. Please install manually:" -ForegroundColor Yellow
    Write-Host "  Download: https://git-scm.com/download/win" -ForegroundColor White
    Write-Host "  Or run: winget install Git.Git" -ForegroundColor White
    return $false
}

# Check for Python
Write-Host "Checking Python..." -ForegroundColor Cyan
$pythonCmd = Test-PythonInstall

if (-not $pythonCmd) {
    Write-Host ""
    Write-Host "ERROR: Python 3.9+ not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://www.python.org/downloads/" -ForegroundColor White
    Write-Host "  2. Run installer" -ForegroundColor White
    Write-Host "  3. CHECK 'Add Python to PATH'" -ForegroundColor White
    Write-Host "  4. Restart PowerShell after installation" -ForegroundColor White
    Write-Host ""
    Write-Host "Or install via Winget:" -ForegroundColor Yellow
    Write-Host "  winget install Python.Python.3.11" -ForegroundColor White
    exit 1
}

Write-Host "Found Python: $pythonCmd" -ForegroundColor Green
$pythonVersion = & $pythonCmd --version 2>&1
Write-Host "Version: $pythonVersion" -ForegroundColor Gray

# Check for Git
Write-Host ""
Write-Host "Checking Git..." -ForegroundColor Cyan
$gitCmd = Test-GitInstall

if (-not $gitCmd) {
    Write-Host ""
    Write-Host "Git not found. Would you like to install it?" -ForegroundColor Yellow
    Write-Host "  (Required for auto-update functionality)" -ForegroundColor Gray
    
    if (-not $SkipGitInstall) {
        $response = Read-Host "Install Git now? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            if (Install-Git) {
                $gitCmd = Test-GitInstall
            }
        }
    }
}

if ($gitCmd) {
    Write-Host "Found Git: $gitCmd" -ForegroundColor Green
} else {
    Write-Host "Git not installed - will download as ZIP" -ForegroundColor Yellow
}

# Repository URL and install path
$repoUrl = "https://github.com/vtion001/ats-automation.git"
$installPath = "$env:USERPROFILE\ats-automation"

Write-Host ""
Write-Host "Installing to: $installPath" -ForegroundColor Cyan

# Handle existing folder
$needsMove = $false
if (Test-Path $installPath) {
    Write-Host "Removing existing installation..." -ForegroundColor Yellow
    try {
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
            Write-Host "Could not remove - will overwrite" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Could not remove existing folder" -ForegroundColor Yellow
    }
}

# Clone or download
$installed = $false
if ($gitCmd) {
    try {
        Write-Host "Cloning repository..." -ForegroundColor Yellow
        & $gitCmd clone $repoUrl $installPath --quiet 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Repository cloned!" -ForegroundColor Green
            $installed = $true
        }
    } catch {
        Write-Host "Clone failed, trying ZIP download..." -ForegroundColor Yellow
    }
}

if (-not $installed) {
    # Download as ZIP
    Write-Host "Downloading from GitHub..." -ForegroundColor Yellow
    $zipUrl = "https://github.com/vtion001/ats-automation/archive/refs/heads/main.zip"
    $zipPath = "$env:TEMP\ats-automation.zip"
    
    try {
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
        Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP" -Force
        $extractedPath = "$env:TEMP\ats-automation-main"
        
        if (Test-Path $extractedPath) {
            if (Test-Path $installPath) {
                Remove-Item -Recurse -Force $installPath -ErrorAction SilentlyContinue
            }
            Move-Item -Path $extractedPath -Destination $installPath -Force
            Write-Host "Repository downloaded!" -ForegroundColor Green
            $installed = $true
        }
    } catch {
        Write-Host "Download failed: $_" -ForegroundColor Red
        exit 1
    }
}

# Change to install directory
if (-not (Test-Path $installPath)) {
    Write-Host "ERROR: Installation failed - folder not found" -ForegroundColor Red
    exit 1
}

Set-Location $installPath
Write-Host ""
Write-Host "Installing in: $(Get-Location)" -ForegroundColor Cyan

# Install Python dependencies
Write-Host ""
Write-Host "Installing Python dependencies..." -ForegroundColor Cyan

$depsInstalled = $false
foreach ($reqFile in @("requirements.txt", "requirements-server.txt")) {
    if (Test-Path $reqFile) {
        Write-Host "  Installing from $reqFile..." -ForegroundColor Gray
        & $pythonCmd -m pip install -r $reqFile --quiet 2>$null
        if ($LASTEXITCODE -ne 0) {
            & $pythonCmd -m pip install --user -r $reqFile 2>$null
        }
        $depsInstalled = $true
    }
}

if ($depsInstalled) {
    Write-Host "Dependencies installed!" -ForegroundColor Green
}

# Create .env file
if (Test-Path ".env.example") {
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host ""
        Write-Host "IMPORTANT: Edit .env with your API keys!" -ForegroundColor Yellow
        Write-Host "  notepad.exe .env" -ForegroundColor White
    }
}

# Set up GitHub Auto-Sync
Write-Host ""
if ($gitCmd) {
    Write-Host "Setting up GitHub Auto-Sync..." -ForegroundColor Cyan
    & "$installPath\update.ps1" -AutoUpdate -IntervalMinutes 30
    Write-Host "GitHub Auto-Sync enabled!" -ForegroundColor Green
} else {
    Write-Host "GitHub Auto-Sync: DISABLED (Git not installed)" -ForegroundColor Yellow
    Write-Host "To enable: Install Git and run: .\update.ps1 -AutoUpdate" -ForegroundColor White
}

# Final summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Location: $installPath" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Edit .env with your OPENROUTER_API_KEY" -ForegroundColor White
Write-Host "  2. Load Chrome Extension:" -ForegroundColor White
Write-Host "     - Open: chrome://extensions/" -ForegroundColor White
Write-Host "     - Enable: Developer mode" -ForegroundColor White
Write-Host "     - Click: Load unpacked" -ForegroundColor White
Write-Host "     - Select: $installPath\chrome-extension" -ForegroundColor White
Write-Host "  3. Run server: python server\main.py" -ForegroundColor White
Write-Host ""

if ($gitCmd) {
    Write-Host "Auto-Sync:" -ForegroundColor Cyan
    Write-Host "  Check status: Get-ScheduledTask -TaskName 'ATS Automation GitHub Sync'" -ForegroundColor White
    Write-Host "  Check updates: .\update.ps1 -CheckOnly" -ForegroundColor White
} else {
    Write-Host "To enable Auto-Sync:" -ForegroundColor Yellow
    Write-Host "  winget install Git.Git" -ForegroundColor White
    Write-Host "  Restart PowerShell" -ForegroundColor White
    Write-Host "  .\update.ps1 -AutoUpdate" -ForegroundColor White
}
Write-Host ""
