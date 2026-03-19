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
    Write-Host "  ✗ Microsoft Edge found" -ForegroundColor Red
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
# STEP 4: Get User's Download Location
# ========================================
Write-Host "[4/5] Extension location:" -ForegroundColor Yellow

# Try to detect user's Downloads folder
$downloadPath = ""
if ($env:USERPROFILE) {
    $downloadPath = Join-Path $env:USERPROFILE "Downloads"
    if (Test-Path $downloadPath) {
        Write-Host "  Detected Downloads folder: $downloadPath" -ForegroundColor Cyan
    } else {
        $downloadPath = ""
    }
}

Write-Host ""
Write-Host "IMPORTANT: You need the ats-automation folder on your computer." -ForegroundColor Yellow
Write-Host ""
Write-Host "If you haven't downloaded it yet:" -ForegroundColor White
Write-Host "  1. Go to: https://github.com/vtion001/ats-automation" -ForegroundColor Cyan
Write-Host "  2. Click the green 'Code' button" -ForegroundColor Gray
Write-Host "  3. Click 'Download ZIP'" -ForegroundColor Gray
Write-Host "  4. Extract the ZIP to your Desktop or Downloads" -ForegroundColor Gray
Write-Host ""
Write-Host "The folder structure should be:" -ForegroundColor White
Write-Host "  Desktop/" -ForegroundColor Gray
Write-Host "    ats-automation/" -ForegroundColor Gray
Write-Host "      chrome-extension/  <-- SELECT THIS FOLDER" -ForegroundColor Cyan
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
Write-Host "   c) Navigate to: Desktop > ats-automation > chrome-extension" -ForegroundColor Gray
Write-Host "   d) Click 'Select Folder' or 'OK'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Pin the extension:" -ForegroundColor White
Write-Host "   a) Click puzzle piece icon in Chrome toolbar" -ForegroundColor Gray
Write-Host "   b) Find 'ATS Automation' in the list" -ForegroundColor Gray
Write-Host "   c) Click the pin icon to keep it visible" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configure the extension:" -ForegroundColor White
Write-Host "   a) Click the 'ATS Automation' icon in toolbar" -ForegroundColor Gray
Write-Host "   b) Server URL should auto-populate:" -ForegroundColor Gray
Write-Host "      $serverUrl" -ForegroundColor Cyan
Write-Host "   c) Status should show 'Connected to server'" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HOW IT WORKS (Automatic):" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Call comes in on CTM phone system" -ForegroundColor White
Write-Host "2. Azure server automatically detects & analyzes it" -ForegroundColor Gray
Write-Host "3. Results appear on Chrome extension popup" -ForegroundColor Gray
Write-Host "4. No clicking required - it's fully automatic!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TROUBLESHOOTING:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server URL: $serverUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "If extension shows 'Not connected':" -ForegroundColor White
Write-Host "  1. Reload: chrome://extensions → Find ATS → Click Reload" -ForegroundColor Gray
Write-Host "  2. Restart browser" -ForegroundColor Gray
Write-Host "  3. Click extension icon again" -ForegroundColor Gray
Write-Host ""
Write-Host "If issues persist:" -ForegroundColor White
Write-Host "  - Right-click extension → Inspect Popup → Console tab" -ForegroundColor Gray
Write-Host "  - Take a screenshot and send to your IT support" -ForegroundColor Gray
Write-Host ""

Write-Host "Setup complete! Follow the steps above." -ForegroundColor Green
Write-Host ""
