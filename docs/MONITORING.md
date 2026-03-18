# ATS Extension - Monitoring Guide

## Quick Reference

### 1. View Logs on CTM Page
```bash
# In Chrome DevTools Console on CTM page, filter by:
[ATS]

# Or use this in console:
console.log(`%c[ATS] Test log`, 'color: cyan')
```

### 2. Monitor Extension Logs (Real-Time)

**Install colorama for colored output:**
```bash
pip3 install colorama
```

**Run the monitor:**
```bash
# All logs
python3 /Users/archerterminez/Desktop/REPOSITORY/ats-automation/scripts/monitor_logs.py

# CTM only
python3 /Users/archerterminez/Desktop/REPOSITORY/ats-automation/scripts/monitor_logs.py --source ctm

# Errors only
python3 /Users/archerterminez/Desktop/REPOSITORY/ats-automation/scripts/monitor_logs.py --level error

# Specific client
python3 /Users/archerterminez/Desktop/REPOSITORY/ats-automation/scripts/monitor_logs.py --client flyland
```

### 3. Keep Extension Updated

```bash
# Pull latest changes
/Users/archerterminez/irm

# Then reload in Chrome:
# 1. Open chrome://extensions/
# 2. Click reload button on ATS Automation
```

### 4. Inspect Different Parts

| What | How |
|------|-----|
| CTM Page Logs | F12 on CTM → Console → Filter `[ATS]` |
| Popup UI | Right-click extension → Inspect Popup |
| Service Worker | chrome://extensions/ → ATS → Service Worker link |
| Content Script | F12 on CTM → Console (logs appear there) |

### 5. Remote Log Files

Logs are stored in `/tmp/ats_logs/` with format:
```
{client}_{YYYYMMDD}.json
```

Example: `flyland_20260318.json`

### 6. Useful DevTools Snippets

**Clear and filter logs:**
```javascript
// Clear console
console.clear()

// Filter for ATS logs
// In Console filter box: [ATS]
```

**Test remote logging:**
```javascript
// Open CTM page console and run:
fetch('https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io/api/logs/flyland', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        source: 'ctm',
        level: 'info',
        message: 'Test log from DevTools',
        timestamp: new Date().toISOString()
    })
})
```

## Troubleshooting

### No logs appearing?
1. Check if extension is loaded: `chrome://extensions/`
2. Reload extension
3. Refresh CTM page
4. Check Network tab for failed requests

### Popup not showing?
1. Open popup → Right-click → Inspect
2. Check Console for errors
3. Click "Test Existing Lead" to verify API connection

### Service Worker issues?
1. Go to `chrome://extensions/`
2. Find ATS Automation
3. Click "Service Worker" link
4. Check console there for errors

## Log Levels

| Level | Meaning | Color |
|-------|---------|-------|
| `log` | General info | White |
| `info` | Important info | Cyan |
| `warn` | Warning | Yellow |
| `error` | Error | Red |

## Client Codes

| Code | Client |
|------|--------|
| `flyland` | Flyland Recovery |
| `banyan` | Banyan |
| `element` | Element |
| `takami` | Takami Health |
| `tbt` | TBT |
| `legacy` | Legacy |
