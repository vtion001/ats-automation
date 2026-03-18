# ATS Automation System

> **MIGRATED**: Most automations now use CTM Triggers + Salesforce Flow instead of Python/Playwright.
> CTM-native automations live in `chrome-extension/clients/[client]/automations/`.

## Overview

Automation for 6 BPO client companies using CTM native features + Salesforce Flow + AI analysis.

## Quick Start

### 1. Install Chrome Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder

### 2. Configure Extension

- Click the ATS Automation icon in Chrome toolbar
- Open **Config** → set your AI Server URL, Salesforce URL, active client

### 3. Start Call Log Server (optional)

```bash
python3 call-log-server.py &
open ~/Desktop/ats-call-logs
```

Saves all calls and AI analysis to `~/Desktop/ats-call-logs/call-log-YYYY-MM-DD.md`.

### 4. Auto-Update

```powershell
# Windows
.\update.ps1 -AutoUpdate

# macOS/Linux
./auto-update.sh --install
```

## Clients

| Client | Industry | Automations |
|--------|----------|-------------|
| Flyland | Addiction Counseling | SF auto-access, auto notes |
| Legacy | BPO Services | History pull, wrapup sync |
| TBT | BPO Services | Lead pull, pruning |
| Banyan | Addiction Counseling | SF popup, auto-tracking |
| Takahami | Medical Billing | Appeal routing, auto fax |
| Element | Medical Billing | PDF filler, portal lookup |

## Project Structure

```
ats-automation/
├── chrome-extension/        # Chrome extension (Manifest V3)
│   ├── content-scripts/   # CTM monitor, overlay, tab capture
│   ├── src/              # Source modules (services, managers, UI)
│   ├── popup/             # Extension popup
│   ├── background/         # Service worker
│   └── clients/           # Client-specific configs & automations
├── server/                # Azure AI server (FastAPI)
├── core/                  # Shared Python modules (config, logging)
├── deploy/                # Deployment scripts
├── call-log-server.py     # Local markdown call logger
├── install-windows.ps1     # Windows installer
├── auto-update.sh         # macOS/Linux auto-updater
└── update.ps1             # Windows auto-updater
```

## Documentation

| Doc | Description |
|-----|-------------|
| `COORDINATION.md` | Full system overview, architecture, workflow |
| `README-INSTALL.md` | Installation guide |
| `DOCUMENTATION.md` | System documentation |
| `DEPLOYMENT.md` | Azure deployment guide |
| `AZURE-SETUP.md` | Azure setup guide |

## Auto-Update (GitHub Live Sync)

The system continuously monitors GitHub and automatically updates when changes are pushed.

### Windows

```powershell
.\update.ps1 -AutoUpdate            # Enable (every 30 min)
.\update.ps1 -AutoUpdate -IntervalMinutes 15  # Custom interval
.\update.ps1 -CheckOnly            # Check without updating
```

### macOS / Linux

```bash
./auto-update.sh --install          # Enable (every 30 min)
./auto-update.sh --install 15      # Custom interval
./auto-update.sh --check           # Check without updating
./auto-update.sh --status           # Status
./auto-update.sh --uninstall        # Disable
```

## Security

- All automation runs on local agent machines
- No credentials stored - works on existing sessions
- Optional central server with API key auth
- HIPAA-compliant design (no external data transmission)

## License

Internal use only - Confidential
