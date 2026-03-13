@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   ATS Automation - Extension Updater
echo ========================================
echo.

REM Configuration
set SERVER_URL=http://20.125.46.59
set EXTENSION_DIR=%USERPROFILE%\AppData\Local\Google\Chrome\User Data\Default\Extensions\jncbpgnflmcfnehadjjgddmhgecbelkf
set REPO_DIR=%USERPROFILE%\Desktop\repository\ats-automation

echo Checking for updates from server...
echo.

REM Check if server is reachable
curl -s -o nul -w "%%{http_code}" %SERVER_URL% -o nul 2>nul
if errorlevel 1 (
    echo ERROR: Cannot reach update server (%SERVER_URL%)
    echo Please check your internet connection
    pause
    exit /b 1
)

echo Server is reachable.
echo.

REM Option 1: Pull from local repo if exists
if exist "%REPO_DIR%" (
    echo Found local repository at %REPO_DIR%
    cd /d "%REPO_DIR%"
    
    echo.
    echo Checking for updates...
    git fetch origin main 2>nul
    git diff HEAD origin/main --quiet
    if errorlevel 1 (
        echo Updates found! Pulling...
        git pull origin main
        echo.
        echo ========================================
        echo Extension updated successfully!
        echo ========================================
    ) else (
        echo Already up to date.
    )
) else (
    echo Local repository not found.
    echo Using server files instead...
    echo.
    echo NOTE: For best experience, keep the repository at:
    echo   %REPO_DIR%
)

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Open Chrome
echo 2. Go to: chrome://extensions/
echo 3. Enable "Developer mode" (top right)
echo 4. Click "Reload" on ATS Automation
echo.
echo For auto-reload, you can use:
echo   Chrome extension: "Extension Reloader" 
echo.

pause
