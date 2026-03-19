# ATS Automation - Full Setup Script for Windows
# Run on Windows PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ATS Automation - Full Setup Wizard" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# ========================================
# STEP 1: Check Prerequisites
# ========================================
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

$hasChrome = $false
$hasEdge = $false

# Check Chrome
if (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe") {
    $hasChrome = $true
    Write-Host "  ✓ Google Chrome found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Google Chrome not found" -ForegroundColor Red
}

# Check Edge
if (Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") {
    $hasEdge = $true
    Write-Host "  ✓ Microsoft Edge found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Microsoft Edge not found" -ForegroundColor Red
}

if (-not $hasChrome -and -not $hasEdge) {
    Write-Host ""
    Write-Host "ERROR: Please install Google Chrome or Microsoft Edge first." -ForegroundColor Red
    Write-Host "Download Chrome: https://www.google.com/chrome/" -ForegroundColor Cyan
    exit 1
}

Write-Host ""

# ========================================
# STEP 2: Verify Azure Server Connection
# ========================================
Write-Host "[2/5] Verifying Azure server connection..." -ForegroundColor Yellow

$serverUrl = "https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io"

try {
    $response = Invoke-WebRequest -Uri "$serverUrl/health" -Method GET -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Azure server is ONLINE" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Server returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Could not connect to server (this is OK if running locally)" -ForegroundColor Yellow
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""

# ========================================
# STEP 3: Open Chrome Extensions
# ========================================
Write-Host "[3/5] Opening browser extensions page..." -ForegroundColor Yellow

if ($hasChrome) {
    Start-Process "chrome://extensions"
    Write-Host "  ✓ Opened Chrome extensions" -ForegroundColor Green
} else {
    Start-Process "edge://extensions"
    Write-Host "  ✓ Opened Edge extensions" -ForegroundColor Green
}

Write-Host ""

# ========================================
# STEP 4: Extension Path
# ========================================
Write-Host "[4/5] Extension location:" -ForegroundColor Yellow

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$extensionPath = Join-Path $scriptPath "chrome-extension"

Write-Host "  Path: $extensionPath" -ForegroundColor Cyan
Write-Host ""

# ========================================
# STEP 5: Instructions
# ========================================
Write-Host "[5/5] Installation Instructions" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTALLATION STEPS:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. In the Extensions page that opened:" -ForegroundColor White
Write-Host "   a) Toggle 'Developer mode' ON (top right)" -ForegroundColor Gray
Write-Host "   b) Click 'Load unpacked' (top left)" -ForegroundColor Gray
Write-Host "   c) Select this folder: $extensionPath" -ForegroundColor Gray
Write-Host "   d) Choose the 'chrome-extension' folder" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Pin the extension:" -ForegroundColor White
Write-Host "   a) Click puzzle piece icon in Chrome toolbar" -ForegroundColor Gray
Write-Host "   b) Find 'ATS Automation'" -ForegroundColor Gray
Write-Host "   c) Click the pin icon to keep it visible" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Click the extension icon and verify:" -ForegroundColor White
Write-Host "   - Should show 'Connected to server'" -ForegroundColor Gray
Write-Host "   - Status should be green" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TROUBLESHOOTING:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server URL: https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io" -ForegroundColor Cyan
Write-Host ""
Write-Host "If issues:" -ForegroundColor White
Write-Host "  1. Reload extension: chrome://extensions → Reload button" -ForegroundColor Gray
Write-Host "  2. Check errors: Right-click extension → Inspect popup" -ForegroundColor Gray
Write-Host "  3. Restart browser" -ForegroundColor Gray
Write-Host ""

Write-Host "Setup complete! Follow the steps above." -ForegroundColor Green
Write-Host ""
