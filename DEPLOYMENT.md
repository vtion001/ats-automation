# ATS Automation - Deployment Guide

## Current Issue
Unpacked extensions require manual reload after each update. This is causing issues when updating multiple workstations.

## Solutions

### Option 1: Chrome Web Store (Recommended for Production)

**Pros:**
- Automatic updates to all workstations
- No manual intervention needed
- Trusted by users

**Cons:**
- Requires $5 one-time developer fee
- Extension review process (can take days)

**Steps:**
1. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay one-time fee ($5)
3. Package extension: `zip -r ats-automation.zip chrome-extension/`
4. Upload as new item
5. Publish (can be unlisted for internal use)
6. All workstations will auto-update

---

### Option 2: Self-Hosted Update Server (For Internal Use)

**Pros:**
- No external fees
- Full control over updates
- Can use internal network

**Cons:**
- Requires hosting a server
- More setup required

**Implementation:**

1. **Host the CRX file** on a web server:
   ```
   https://your-internal-server.com/ats-automation.crx
   ```

2. **Create update XML** at `https://your-internal-server.com/update.xml`:
   ```xml
   <?xml version='1.0' encoding='UTF-8'?>
   <gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
     <app appid='YOUR_EXTENSION_ID'>
       <updatecheck codebase='https://your-internal-server.com/ats-automation.crx' version='2.1.0' />
     </app>
   </gupdate>
   ```

3. **Add to manifest.json:**
   ```json
   "update_url": "https://your-internal-server.com/update.xml"
   ```

---

### Option 3: Simplified Manual Update (Quick Fix)

**For immediate relief:**

1. Create a batch script that workstations can run:
   ```batch
   @echo off
   echo Updating ATS Automation...
   cd %USERPROFILE%\Documents\ats-automation
   git pull
   echo Extension folder updated!
   echo Please reload extension in Chrome: chrome://extensions/
   pause
   ```

2. Or use a startup script to auto-reload:

---

## Recommended Workflow

### For Development (Current)
- Use unpacked extension
- Manual reload after updates

### For Production

**Step 1: Package Extension**
```bash
cd ats-automation
zip -r ats-automation-v2.1.0.zip chrome-extension/
```

**Step 2: Choose Deployment Method**
- **Small team (< 5)**: Use Option 3 with notification script
- **Medium team (5-20)**: Use Option 2 (self-hosted)
- **Large team (20+)**: Use Option 1 (Chrome Web Store)

**Step 3: Automate**
- Set up GitHub Actions to auto-package on release
- Use a simple internal server for updates

---

## Quick Fix: Auto-Reload Script

Create `update-automation.bat`:
```batch
@echo off
cd /d "%USERPROFILE%\Desktop\repository\ats-automation"
git pull
echo.
echo ========================================
echo Extension updated! Reloading...
echo ========================================
echo.
echo To complete update:
echo 1. Open Chrome
echo 2. Go to chrome://extensions/
echo 3. Click reload on ATS Automation
echo.
pause
```

---

## Extension ID

Your current extension ID (for update configuration):
- **ID**: `jncbpgnflmcfnehadjjgddmhgecbelkf` (example)
- **Note**: ID changes when you repackage - keep the same .pem file

To find your extension ID:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. The ID is shown under the extension name
