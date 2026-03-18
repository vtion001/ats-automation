# ATS Remote Monitoring Guide

## Overview

Monitor Chrome extension logs **remotely** from your Mac while the extension runs on a Windows workstation.

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Windows   │  ──────► │   Server   │  ◄────── │    Mac     │
│  Workstation│   logs   │ (Your Mac)  │ viewing  │   Monitor  │
│  + CTM Ext │         │ remote_viewer│         │   Browser  │
└─────────────┘         └─────────────┘         └─────────────┘
```

---

## Setup Instructions

### Step 1: Start Remote Log Viewer on Your Mac

```bash
cd /Users/archerterminez/Desktop/REPOSITORY/ats-automation

# Run the remote log viewer
python3 scripts/remote_log_viewer.py
```

This starts a web server on your Mac (port 5000 or similar).

### Step 2: Get the Public URL

**Option A: With ngrok (recommended for external access)**
```bash
python3 scripts/remote_log_viewer.py --ngrok
```

This gives you a public URL like `https://abc123.ngrok.io` that the Windows computer can reach.

**Option B: Same network (local IP)**

Find your Mac's local IP:
```bash
ipconfig getifaddr en0
# Or on Mac:
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Example: `http://192.168.1.100:5000`

### Step 3: Configure Windows Extension

On the Windows workstation:

1. Go to the extension settings
2. Set **Remote Log URL** to your public/local URL
   - For ngrok: `https://abc123.ngrok.io`
   - For local: `http://192.168.1.100:5000`

Or edit the extension's config file directly:
```javascript
// In Chrome console on any page:
chrome.storage.local.set({
    remoteLogUrl: 'https://abc123.ngrok.io'
});
```

### Step 4: View Logs on Your Mac

1. Open browser to: `http://localhost:5000`
2. Or if using ngrok: `https://abc123.ngrok.io`

You'll see real-time logs streaming from the Windows workstation.

---

## Log Viewer Features

| Feature | Description |
|---------|-------------|
| **Auto-refresh** | Updates every 2 seconds |
| **Filter by source** | CTM, Extension, Server |
| **Filter by level** | Log, Info, Warning, Error |
| **Filter by client** | flyland, banyan, element, etc. |
| **Clear logs** | Button to clear log buffer |
| **Copy endpoint** | Share the URL with the agent |

---

## Troubleshooting

### Logs not appearing?

1. **Check extension is loaded:**
   - Windows: Go to `chrome://extensions/`
   - Ensure "ATS Automation" is enabled

2. **Check Remote Log URL is set:**
   - Open Chrome console on Windows
   - Run: `chrome.storage.local.get('remoteLogUrl', console.log)`

3. **Check network connectivity:**
   - Windows must be able to reach your Mac/ngrok URL
   - Try accessing the URL from Windows browser

4. **Check firewall:**
   - Mac: Allow incoming connections on the port
   - Ngrok: Should work through firewalls

### Port already in use?

```bash
# Find what's using port 5000
lsof -i :5000

# Kill it or use a different port
python3 scripts/remote_log_viewer.py --port 5001
```

---

## Quick Commands

```bash
# Start local monitoring (same network)
python3 scripts/remote_log_viewer.py

# Start with ngrok tunnel (external access)
python3 scripts/remote_log_viewer.py --ngrok

# Custom port
python3 scripts/remote_log_viewer.py --port 8080
```

---

## Remote Extension Config (Windows)

Add this to the extension on Windows:

```javascript
// In Chrome console (F12) on any page:
chrome.storage.local.set({
    remoteLogUrl: 'YOUR_MAC_URL_HERE',
    activeClient: 'flyland'  // or banyan, element, etc.
});
```

To check current config:
```javascript
chrome.storage.local.get(null, console.log);
```

---

## File Locations

| File | Purpose |
|------|---------|
| `scripts/remote_log_viewer.py` | Main log viewer server |
| `scripts/monitor_logs.py` | Local-only log monitor |
| `content-scripts/ctm-monitor.js` | Extension script that sends logs |

---

## Security Notes

- ngrok URLs are temporary and change each session
- Local network URLs only work within same network
- No authentication on the log endpoint (internal use only)
- Logs contain potentially sensitive call data - handle appropriately
