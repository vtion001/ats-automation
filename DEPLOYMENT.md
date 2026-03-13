# ATS Automation - Deployment Guide

## Current Setup

**Update Server:** http://20.125.46.59 (Azure VM)

The extension is hosted on the Azure VM and can be accessed via HTTP.

---

## Installation on New Workstations

### Step 1: Get the Extension Files

**Option A: From GitHub Repository (Recommended)**
```batch
cd %USERPROFILE%\Desktop
git clone https://github.com/vtion001/ats-automation.git
```

**Option B: From Shared Network Location**
Copy the `ats-automation` folder to the workstation's Desktop.

### Step 2: Load Extension in Chrome
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder

### Step 3: Test
- Click the extension icon in Chrome
- Verify it loads correctly

---

## Updating Existing Workstations

### Method 1: Git Pull (Recommended)

If you have the repository cloned:
```batch
cd %USERPROFILE%\Desktop\repository\ats-automation
git pull
```

Then reload the extension:
1. Go to `chrome://extensions/`
2. Click "Reload" on ATS Automation

### Method 2: Using Update Script

Run the update script:
```batch
%USERPROFILE%\Desktop\repository\ats-automation\update-extension.bat
```

This will:
- Check for updates from the server
- Pull latest changes from GitHub
- Show instructions to reload

---

## Auto-Update Setup (For Multiple Workstations)

### Option 1: Chrome Web Store ($5 one-time)
1. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay $5 fee
3. Upload packaged extension
4. Published extensions auto-update

### Option 2: Group Policy (Enterprise)
Chrome Enterprise allows forced extensions via Group Policy.

### Option 3: Scheduled Task
Create a scheduled task on each workstation:
```batch
schtasks /create /tn "ATS Update" /tr "path\to\update-extension.bat" /sc daily
```

---

## Troubleshooting

### Extension Not Loading
- Ensure Developer mode is ON
- Check for errors in Chrome: `chrome://extensions/`
- Try removing and reloading

### Update Script Not Working
- Ensure Git is installed
- Verify network access to github.com

### Need Help?
Check `chrome-extension/popup/support.html` in the extension

---

## Extension ID
```
jncbpgnflmcfnehadjjgddmhgecbelkf
```

This ID is used for Chrome to identify the extension for updates.
