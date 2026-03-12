@echo off
REM ===========================================
REM ATS Automation - Quick Setup Script
REM Run this on the test workstation
REM ===========================================

echo ========================================
echo   ATS Automation Setup
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

echo [1/4] Creating virtual environment...
if not exist "venv" (
    python -m venv venv
)
echo [OK] Virtual environment ready

echo.
echo [2/4] Installing dependencies...
call venv\Scripts\activate.bat
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo [OK] Dependencies installed

echo.
echo [3/4] Starting AI Server...
start "ATS AI Server" cmd /k "venv\Scripts\activate.bat && python server\ai_server.py"

echo.
echo [4/4] Opening Chrome Extensions page...
start chrome "chrome://extensions/"

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo NEXT STEPS:
echo 1. In Chrome, click "Load unpacked"
echo 2. Select this folder
echo 3. Click ATS icon -^> Open Config
echo 4. Enter your Salesforce URL
echo 5. Save and test!
echo.
pause
