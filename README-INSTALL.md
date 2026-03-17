# ATS Automation - Quick Install (PowerShell)
# Run this single command in PowerShell:

irm https://raw.githubusercontent.com/vtion001/ats-automation/main/install-windows.ps1 | iex

# OR use git directly:

git clone https://github.com/vtion001/ats-automation.git $env:USERPROFILE\ats-automation
cd $env:USERPROFILE\ats-automation
pip install -r requirements.txt
pip install -r requirements-server.txt
