@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   AGS Automation - Quick Update
echo ============================================
echo.

cd /d "%~dp0"

:: Check for Git
where git >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Git not found. Cannot update automatically.
    echo Please manually download the latest version from GitHub.
    pause
    exit /b 1
)

:: Check if this is a git repo
if not exist ".git" (
    echo [ERROR] Not a Git repository.
    echo Please run install.bat first or clone from GitHub:
    echo   git clone https://github.com/vtion001/ats-automation.git
    pause
    exit /b 1
)

echo Pulling latest changes from GitHub...
git pull origin main

if %errorLevel% neq 0 (
    echo [ERROR] Failed to pull updates.
    pause
    exit /b 1
)

echo.
echo Updating extension files...
set EXTENSION_DIR=%USERPROFILE%\AppData\Local\AGS Automation

:: Copy new files
xcopy /E /Y /Q "%~dp0chrome-extension" "%EXTENSION_DIR%\" >nul 2>&1

:: Reload Chrome extension
echo Reloading extension in Chrome...

:: Kill existing chrome with extension and restart
tasklist | findstr /i "chrome.exe" >nul
if %errorLevel% equ 0 (
    echo Closing Chrome...
    taskkill /F /IM chrome.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

:: Open Chrome with updated extension
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --load-extension="%EXTENSION_DIR%" --enable-aggregated-page-throttling

echo.
echo ============================================
echo   Update Complete!
echo ============================================
echo.

pause
