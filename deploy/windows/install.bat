@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   AGS Automation Tool - Installer
echo ============================================
echo.

:: Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] Not running as Administrator
    echo Some features may not work properly
    echo.
)

:: Set working directory to script location
cd /d "%~dp0"

:: Check for Chrome
echo [1/5] Checking for Chrome...
where chrome >nul 2>&1
if %errorLevel% neq 0 (
    where "C:\Program Files\Google\Chrome\Application\chrome.exe" >nul 2>&1
    if %errorLevel% neq 0 (
        echo [ERROR] Chrome not found. Please install Chrome first.
        echo Download from: https://www.google.com/chrome/
        pause
        exit /b 1
    )
)
echo [OK] Chrome found

:: Check for Git
echo [2/5] Checking for Git...
where git >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] Git not found. Manual updates will be needed.
    echo Install from: https://git-scm.com/
    set HAS_GIT=0
) else (
    set HAS_GIT=1
    echo [OK] Git found
)

:: Create extension folder
echo [3/5] Setting up extension folder...
set EXTENSION_DIR=%USERPROFILE%\AppData\Local\AGS Automation
if not exist "%EXTENSION_DIR%" mkdir "%EXTENSION_DIR%"
echo [OK] Extension folder: %EXTENSION_DIR%

:: Copy extension files
echo [4/5] Copying extension files...
xcopy /E /Y /Q "%~dp0chrome-extension" "%EXTENSION_DIR%\" >nul 2>&1
xcopy /E /Y /Q /B "%~dp0config.json" "%EXTENSION_DIR%\" >nul 2>&1
echo [OK] Files copied

:: Load extension into Chrome
echo [5/5] Loading extension into Chrome...
powershell -ExecutionPolicy Bypass -File "%~dp0chrome-loader.ps1" -ExtensionPath "%EXTENSION_DIR%"

:: Create desktop shortcut
echo.
echo Creating desktop shortcut...
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%USERPROFILE%\Desktop\AGS Automation.lnk');$s.TargetPath='%USERPROFILE%\AppData\Local\Google\Chrome\Application\chrome.exe';$s.Arguments='--load-extension=%EXTENSION_DIR% --enable-aggregated-page-throttling';$s.WorkingDirectory='%USERPROFILE%\AppData\Local\Google\Chrome\Application';$s.Description='AGS Automation Tool';$s.Save()"

:: Create auto-start entry
echo Setting up auto-start...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "AGS Automation" /t REG_SZ /d "\"%USERPROFILE%\AppData\Local\Google\Chrome\Application\chrome.exe\" --load-extension=%EXTENSION_DIR% --enable-aggregated-page-throttling" /f >nul 2>&1

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo Extension installed to: %EXTENSION_DIR%
echo.
echo Next steps:
echo 1. Chrome should open with the extension loaded
echo 2. Pin the extension to your toolbar
echo 3. Click the extension icon to configure
echo.
echo To update later, just run: update.bat
echo.

:: Open Chrome with extension
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --load-extension="%EXTENSION_DIR%" --enable-aggregated-page-throttling

pause
