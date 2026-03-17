# ATS Automation - Windows Installation Script
# Run this in PowerShell as Administrator

Write-Host "Installing ATS Automation..." -ForegroundColor Cyan

# Clone the repository
$repoUrl = "https://github.com/vtion001/ats-automation.git"
$installPath = "$env:USERPROFILE\ats-automation"

Write-Host "Cloning repository to $installPath..." -ForegroundColor Yellow

# Remove existing if present
if (Test-Path $installPath) {
    Remove-Item -Recurse -Force $installPath
}

# Clone via git or download zip
try {
    git clone $repoUrl $installPath
    Write-Host "Repository cloned successfully!" -ForegroundColor Green
} catch {
    # Fallback: download zip
    $zipUrl = "https://github.com/vtion001/ats-automation/archive/refs/heads/main.zip"
    Invoke-WebRequest -Uri $zipUrl -OutFile "$env:TEMP\ats-automation.zip"
    Expand-Archive -Path "$env:TEMP\ats-automation.zip" -DestinationPath "$env:USERPROFILE"
    Rename-Item "$env:USERPROFILE\ats-automation-main" $installPath
    Write-Host "Repository downloaded successfully!" -ForegroundColor Green
}

# Install Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
Set-Location $installPath

if (Test-Path "requirements.txt") {
    pip install -r requirements.txt
}

if (Test-Path "requirements-server.txt") {
    pip install -r requirements-server.txt
}

# Create .env file from template
if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env file - please configure your API keys" -ForegroundColor Yellow
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
