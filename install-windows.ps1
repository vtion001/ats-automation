# ATS Automation - Simple Windows Installation
# Run in PowerShell: irm https://raw.githubusercontent.com/vtion001/ats-automation/main/install-windows.ps1 | iex

Write-Host "Installing ATS Automation..." -ForegroundColor Cyan

$installPath = "$env:USERPROFILE\ats-automation"

# Check if directory exists
if (Test-Path $installPath) {
    Write-Host "Directory already exists. Pulling updates..." -ForegroundColor Yellow
    Set-Location $installPath
    git pull
} else {
    Write-Host "Cloning repository..." -ForegroundColor Yellow
    git clone https://github.com/vtion001/ats-automation.git $installPath
    Set-Location $installPath
}

# Check Python
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $pythonCmd) {
    Write-Host "ERROR: Python not found" -ForegroundColor Red
    Write-Host "Install from: https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Installing Python packages..." -ForegroundColor Yellow

# Install dependencies
& python -m pip install --user -r requirements.txt 2>$null
& python -m pip install --user -r requirements-server.txt 2>$null

# Copy .env
if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env file - configure your API keys" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "Run: python server/main.py" -ForegroundColor Cyan
Read-Host "Press Enter to exit"
