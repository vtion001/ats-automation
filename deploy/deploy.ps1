# ATS Automation - Deploy Script (Windows PowerShell)

Write-Host "🚀 ATS Automation - Deploy Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Check Python version
Write-Host -NoNewline "Checking Python version... "
$pythonVersion = python --version 2>&1
if ($pythonVersion -match "Python 3\.1[0-4]") {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "ERROR" -ForegroundColor Red
    Write-Host "Python 3.10+ required" -ForegroundColor Red
    exit 1
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Create virtual environment
Write-Host -NoNewline "Creating virtual environment... "
if (-not (Test-Path "venv")) {
    python -m venv venv
}
Write-Host "OK" -ForegroundColor Green

# Activate virtual environment
Write-Host -NoNewline "Activating virtual environment... "
& "$scriptDir\venv\Scripts\Activate.ps1"
Write-Host "OK" -ForegroundColor Green

# Install dependencies
Write-Host -NoNewline "Installing dependencies... "
pip install --upgrade pip -q
pip install -r requirements.txt -q
Write-Host "OK" -ForegroundColor Green

# Install Playwright browsers
Write-Host -NoNewline "Installing Playwright browsers... "
playwright install chromium --with-deps 2>$null
Write-Host "OK" -ForegroundColor Green

# Create directories
Write-Host -NoNewline "Creating directories... "
New-Item -ItemType Directory -Force -Path "logs\flyland","logs\legacy","logs\tbt","logs\banyan","logs\takami","logs\element","data" | Out-Null
Write-Host "OK" -ForegroundColor Green

# Copy env file
if (-not (Test-Path ".env")) {
    Write-Host -NoNewline "Creating .env file... "
    "ATS_SERVER_URL=http://localhost:8000" | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "OK" -ForegroundColor Green
    Write-Host "⚠ Please edit .env with your server configuration" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Edit .env with your configuration"
Write-Host "  2. Load the Chrome Extension:"
Write-Host "     - Open chrome://extensions/"
Write-Host "     - Enable Developer mode"
Write-Host "     - Load: $scriptDir\chrome-extension"
Write-Host "  3. Start automation:"
Write-Host "     python main.py start --client flyland"
Write-Host ""
