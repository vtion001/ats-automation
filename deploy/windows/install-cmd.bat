@echo off
REM AGS Automation Tool - CMD Installer
REM Works from Command Prompt or can be run as .bat file

echo ============================================
echo   AGS Automation Tool - Installer
echo ============================================
echo.

REM Check if running in CMD
echo Running installer...

REM Create temp PowerShell script
echo Creating temporary script...

REM Download and run via PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$script = Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/vtion001/ats-automation/main/deploy/windows/install.ps1' -UseBasicParsing; ^
Invoke-Expression $script.Content"

if %errorLevel% neq 0 (
    echo.
    echo Installation failed. Try running in PowerShell directly:
    echo 1. Press Win+X, select Windows PowerShell
    echo 2. Paste: irm https://raw.githubusercontent.com/vtion001/ats-automation/main/deploy/windows/install.ps1 ^| iex
    pause
    exit /b 1
)

echo.
echo Installation complete!
pause
