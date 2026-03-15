param(
    [Parameter(Mandatory=$false)]
    [string]$ExtensionPath
)

$ErrorActionPreference = "Stop"

function Get-ChromePath {
    $paths = @(
        "C:\Program Files\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
        "$env:PROGRAMFILES\Google\Chrome\Application\chrome.exe"
    )
    
    foreach ($path in $paths) {
        if (Test-Path $path) {
            return $path
        }
    }
    
    return $null
}

Write-Host "Loading AGS Extension into Chrome..." -ForegroundColor Cyan

# Check if Chrome is running
$chrome = Get-Process chrome -ErrorAction SilentlyContinue
if ($chrome) {
    Write-Host "Closing Chrome..." -ForegroundColor Yellow
    Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

$chromePath = Get-ChromePath
if (-not $chromePath) {
    Write-Host "Chrome not found!" -ForegroundColor Red
    exit 1
}

# Build extension path if not provided
if (-not $ExtensionPath) {
    $ExtensionPath = "$env:USERPROFILE\AppData\Local\AGS Automation\chrome-extension"
}

if (-not (Test-Path $ExtensionPath)) {
    Write-Host "Extension path not found: $ExtensionPath" -ForegroundColor Red
    Write-Host "Please run install.bat first!" -ForegroundColor Red
    exit 1
}

Write-Host "Starting Chrome with extension..." -ForegroundColor Green

# Start Chrome with extension loaded
$process = Start-Process -FilePath $chromePath -ArgumentList "--load-extension=`"$ExtensionPath`"", "--enable-aggregated-page-throttling" -PassThru

Start-Sleep -Seconds 3

if ($process.HasExited) {
    Write-Host "Chrome failed to start!" -ForegroundColor Red
    exit 1
}

Write-Host "Extension loaded successfully!" -ForegroundColor Green
Write-Host "Chrome PID: $($process.Id)" -ForegroundColor Gray
