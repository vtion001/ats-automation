@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   AGS Automation - Package Creator
echo ============================================
echo.

:: Create distribution folder
set DIST_DIR=%~dp0dist
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"

:: Copy required files
echo Copying files...
xcopy /E /Y /Q "%~dp0install.bat" "%DIST_DIR%\" >nul
xcopy /E /Y /Q "%~dp0update.bat" "%DIST_DIR%\" >nul
xcopy /E /Y /Q "%~dp0chrome-loader.ps1" "%DIST_DIR%\" >nul
xcopy /E /Y /Q "%~dp0config.json" "%DIST_DIR%\" >nul
xcopy /E /Y /Q "%~dp0README.md" "%DIST_DIR%\" >nul
xcopy /E /Y /Q "%~dp0..\chrome-extension" "%DIST_DIR%chrome-extension\" >nul

:: Remove unnecessary files
echo Cleaning up...
del /q "%DIST_DIR%\chrome-extension\.DS_Store" >nul 2>&1
del /q "%DIST_DIR%\chrome-extension\*.log" >nul 2>&1

:: Create ZIP
echo Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%DIST_DIR%\*' -DestinationPath '%~dp0AGS-Automation-v1.0.0.zip' -Force"

echo.
echo ============================================
echo   Package Created!
echo ============================================
echo.
echo File: AGS-Automation-v1.0.0.zip
echo Location: %~dp0
echo.
echo Distribute this file to workstations!
echo.

pause
