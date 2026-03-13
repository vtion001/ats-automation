@echo off
echo ========================================
echo ATS Automation - Extension Updater
echo ========================================
echo.

REM Check if git is available
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com
    pause
    exit /b 1
)

REM Get the directory where the script is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo Checking for updates...
git fetch origin main

REM Check if there are updates
git diff HEAD origin/main --quiet
if %errorlevel% neq 0 (
    echo.
    echo Updates found! Pulling latest changes...
    git pull origin main
    
    if %errorlevel% equ 0 (
        echo.
        echo ========================================
        echo Extension updated successfully!
        echo ========================================
        echo.
        echo Please reload the extension in Chrome:
        echo   1. Open Chrome
        echo   2. Go to chrome://extensions/
        echo   3. Click the reload button on ATS Automation
        echo.
    ) else (
        echo.
        echo ERROR: Failed to pull updates
        echo Please check your internet connection
        pause
        exit /b 1
    )
) else (
    echo.
    echo Already up to date!
)

echo.
pause
