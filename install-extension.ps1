# ATS Automation - Chrome Extension Installation Script
# Run this on Windows PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ATS Automation - Extension Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Open Chrome Extensions page
Write-Host "[Step 1] Opening Chrome Extensions page..." -ForegroundColor Yellow
Start-Process "chrome://extensions"
Write-Host "✓ Please enable 'Developer mode' in the top right corner" -ForegroundColor Green
Write-Host ""

# Step 2: Get extension path
$extensionPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "[Step 2] Extension Path: $extensionPath" -ForegroundColor Yellow
Write-Host ""

# Step 3: Instructions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MANUAL STEPS:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. In Chrome extensions page:" -ForegroundColor White
Write-Host "   - Toggle 'Developer mode' ON (top right)" -ForegroundColor Gray
Write-Host "   - Click 'Load unpacked'" -ForegroundColor Gray
Write-Host "   - Navigate to this folder:" -ForegroundColor Gray
Write-Host "     $extensionPath" -ForegroundColor Gray
Write-Host "   - Select the 'chrome-extension' folder" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Pin the extension for easy access" -ForegroundColor White
Write-Host "   - Click the puzzle piece icon in Chrome toolbar" -ForegroundColor Gray
Write-Host "   - Click the pin icon next to 'ATS Automation'" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configure the extension" -ForegroundColor White
Write-Host "   - Click the extension icon" -ForegroundColor Gray
Write-Host "   - Set Server URL if needed:" -ForegroundColor Gray
Write-Host "     https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io" -ForegroundColor Cyan
Write-Host ""

# Step 4: Open the extension page
Write-Host "[Step 4] Opening extension..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Write-Host "Done! Follow the manual steps above." -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TROUBLESHOOTING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If extension doesn't work:" -ForegroundColor White
Write-Host "1. Check if server is running:" -ForegroundColor Gray
Write-Host "   https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Reload extension:" -ForegroundColor Gray
Write-Host "   chrome://extensions → Find ATS Automation → Click Reload" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Check console for errors:" -ForegroundColor Gray
Write-Host "   Right-click extension → Inspect popup → Console tab" -ForegroundColor Gray
Write-Host ""

Write-Host "Installation complete!" -ForegroundColor Green
